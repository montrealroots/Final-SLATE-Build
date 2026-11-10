// Durable saves. "Saved" is only reported after the new data has been written, read back and
// verified. Writes go to a temporary key first; the previous good save is kept as a backup
// until the new one verifies, so an interrupted write never destroys the last good save.

import { hashString } from './rng';
import { findPlace, isCatalogPlace, registerPlace, type Place } from '../data/places';
import type { CreationDraft, GameState } from './types';
import { SAVE_VERSION } from './types';
import { SaveValidationError, validateGameState } from './validate';
import { adoptPublishedRules, migrateV2toV3, migrateV3toV4 } from './awards';
import { normalizeDraft } from './state';
import { migrateV4toV5 } from './finance';
import { knownAs, migrateV5toV6, migrateV6toV7 } from './identity';
import { migrateV7toV8 } from './songs';
import { migrateV8toV9 } from './episode-releases';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

export function browserStore(): KeyValueStore {
  return {
    getItem: (k) => window.localStorage.getItem(k),
    setItem: (k, v) => window.localStorage.setItem(k, v),
    removeItem: (k) => window.localStorage.removeItem(k),
    keys: () => Object.keys(window.localStorage),
  };
}

/**
 * An in-memory store that counts space the way Chromium and WebKit count localStorage: key plus value characters,
 * 5,242,880 per site (measured November 6, 2026), with a replaced value charged only the difference. `peak` is the most
 * ever in use, for measuring how much room saving needs.
 */
export function memoryStore(capacity = Infinity) {
  const data = new Map<string, string>();
  let used = 0;
  const store = {
    data,
    failWrites: false,
    capacity,
    peak: 0,
    used: () => used,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (store.failWrites) throw quotaError();
      const old = data.get(k);
      const delta = old === undefined ? k.length + v.length : v.length - old.length;
      if (used + delta > store.capacity) throw quotaError();
      data.set(k, v);
      used += delta;
      store.peak = Math.max(store.peak, used);
    },
    removeItem: (k: string) => {
      const old = data.get(k);
      if (old === undefined) return;
      data.delete(k);
      used -= k.length + old.length;
    },
    keys: () => [...data.keys()],
  };
  return store;
}

/** What browsers allow a site in localStorage, in characters (Chromium and WebKit, measured November 6, 2026). */
export const BROWSER_STORAGE_CHARS = 5_242_880;

function quotaError(): Error {
  const e = new Error('The browser storage for this site is full.');
  e.name = 'QuotaExceededError';
  return e;
}

/** True for the error a browser throws when localStorage is full. */
export function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error) && !(typeof e === 'object' && e !== null)) return false;
  const x = e as { name?: string; code?: number; message?: string };
  return x.name === 'QuotaExceededError' || x.name === 'NS_ERROR_DOM_QUOTA_REACHED' || x.code === 22 || x.code === 1014 || /quota/i.test(x.message ?? '');
}

const PREFIX = 'slate.v1.';
const INDEX = `${PREFIX}index`;
const DRAFT = `${PREFIX}creationDraft`;
const mainKey = (id: string) => `${PREFIX}save.${id}`;
const tmpKey = (id: string) => `${PREFIX}save.${id}.tmp`;
const bakKey = (id: string) => `${PREFIX}save.${id}.bak`;

export interface SaveSummary {
  saveId: string;
  saveName: string;
  characterName: string;
  locationId: string;
  gameNow: number;
  savedAtReal: number;
  /** When the game was begun, in real time (0 for a damaged save). */
  startedAtReal: number;
}

interface Envelope {
  format: 'slate-save';
  version: number;
  checksum: number;
  data: string;
}

export function serialize(state: GameState): string {
  const data = JSON.stringify(state);
  const env: Envelope = { format: 'slate-save', version: state.version, checksum: hashString(data), data };
  return JSON.stringify(env);
}

export class SaveFormatError extends Error {}
/** A save written by a newer version of SLATE. It is left exactly as it is and never replaced by an older copy. */
export class SaveTooNewError extends SaveFormatError {}

export function deserialize(text: string): GameState {
  let env: Envelope;
  try {
    env = JSON.parse(text);
  } catch {
    throw new SaveFormatError('The save file is not readable.');
  }
  if (!env || env.format !== 'slate-save' || typeof env.data !== 'string') throw new SaveFormatError('This is not a SLATE save.');
  if (hashString(env.data) !== env.checksum) throw new SaveFormatError('The save file is incomplete or damaged.');
  let raw: unknown;
  try {
    raw = JSON.parse(env.data);
  } catch {
    throw new SaveFormatError('The save file is not readable.');
  }
  return migrate(raw);
}

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;
/** Migrations keyed by the version they upgrade FROM. Add one per schema change. Each must be idempotent. */
export const MIGRATIONS: Record<number, Migration> = {
  // v1 -> v2: a registry of world-catalog places. Version-1 saves only used the 66 catalog places, whose IDs stay
  // valid (each is now aliased to its GeoNames record), so nothing else changes.
  1: (raw) => ({ ...raw, places: (raw.places as Record<string, unknown> | undefined) ?? {} }),
  // v2 -> v3: competing films stored once; each edition records the rules it is judged by (awards.ts).
  2: migrateV2toV3,
  // v3 -> v4: finished editions keep results and titles but not competing works' judging strengths (awards.ts).
  3: migrateV3toV4,
  // v4 -> v5: financing. Money a project had is kept, recorded as funding agreed before financing existed (finance.ts).
  4: migrateV4toV5,
  // v5 -> v6: a legal name in parts, a preferred name, where you live and room for a headshot (identity.ts).
  5: migrateV5toV6,
  // v6 -> v7: backgrounds asked as ethnicity and nationality; nationality words become countries (identity.ts).
  6: migrateV6toV7,
  // v7 -> v8: songs become works with writers, rights and uses; what old saves didn't record stays unknown (songs.ts).
  7: migrateV7toV8,
  // v8 -> v9: a series' releases keep each episode's date; older ones get the dates the rules assumed, marked assumed (episode-releases.ts).
  8: migrateV8toV9,
};

export function migrate(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') throw new SaveFormatError('The save file is not readable.');
  let obj = raw as Record<string, unknown>;
  let v = Number(obj.version);
  if (!Number.isInteger(v) || v < 1) throw new SaveFormatError('This save has an unknown version.');
  if (v > SAVE_VERSION) throw new SaveTooNewError('This save was made by a newer version of SLATE. Open it there; this version leaves it unchanged.');
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new SaveFormatError(`No upgrade path from save version ${v}.`);
    obj = m(obj);
    v += 1;
    obj.version = v;
  }
  try {
    validateGameState(obj);
  } catch (e) {
    if (e instanceof SaveValidationError) throw new SaveFormatError(`This save is damaged (${e.message}).`);
    throw e;
  }
  const s = obj as unknown as GameState;
  for (const place of Object.values(s.places ?? {})) registerPlace(place);
  adoptPublishedRules(s);
  return s;
}

/** The version a stored save was written with, without migrating it. */
export function storedVersion(text: string): number | null {
  try {
    const env = JSON.parse(text);
    return Number(JSON.parse(env.data).version) || null;
  } catch {
    return null;
  }
}

function summaryOf(state: GameState, savedAtReal: number): SaveSummary {
  return { saveId: state.saveId, saveName: state.saveName, characterName: knownAs(state.character), locationId: state.locationId, gameNow: state.now, savedAtReal, startedAtReal: state.createdAtReal };
}

/**
 * Every save in storage, newest first. The index is a convenience: a save missing from it (an index write that failed,
 * or a damaged index) is found by its key and listed from its own contents.
 */
export function listSaves(store: KeyValueStore): SaveSummary[] {
  let list: SaveSummary[] = [];
  try {
    const raw = store.getItem(INDEX);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) list = parsed.filter((x) => x && typeof x.saveId === 'string');
  } catch {
    list = [];
  }
  const known = new Set(list.map((x) => x.saveId));
  const keys = store.keys();
  for (const k of keys) {
    const m = OPENABLE.exec(k);
    if (!m || known.has(m[1])) continue;
    known.add(m[1]);
    const sound = openableKeys(keys, m[1]).map((key) => readQuietly(store.getItem(key))).find((x) => x !== null);
    list.push(sound ? summaryOf(sound, sound.updatedAtReal) : { saveId: m[1], saveName: 'Damaged save', characterName: '', locationId: '', gameNow: 0, savedAtReal: 0, startedAtReal: 0 });
  }
  return list.filter((s) => openableKeys(keys, s.saveId).length > 0).sort((a, b) => b.savedAtReal - a.savedAtReal);
}

/** Keys that hold a copy of a save the game can open: the save, its backup, an interrupted write, a migration backup. */
const OPENABLE = /^slate\.v1\.save\.([^.]+)(?:\.(?:bak|tmp|backup-v\d+))?$/;

function openableKeys(keys: string[], id: string): string[] {
  const main = mainKey(id);
  const own = keys.filter((k) => k === main || (k.startsWith(`${main}.`) && OPENABLE.test(k)));
  return own.sort((a, b) => (a === main ? -1 : b === main ? 1 : 0));
}

function readQuietly(text: string | null): GameState | null {
  if (text === null) return null;
  try {
    return deserialize(text);
  } catch {
    return null;
  }
}

export type SaveResult = { ok: true; savedAtReal: number } | { ok: false; error: string; storageFull?: boolean };

/**
 * Write a save durably: validate it, keep the current save as the backup (only if it is itself sound; a damaged one is
 * preserved under its own key instead), replace the save, read it back, then update the index. "Saved" (ok: true) is
 * returned only when every step succeeded. Browsers replace a stored value in one step and charge only the difference
 * in size, so the save is replaced in place: at every moment the previous good save is still stored (as the save, the
 * backup, or both), and saving needs room for about two copies, not three (docs/STORAGE.md).
 */
export function writeSave(store: KeyValueStore, state: GameState, realNow: number): SaveResult {
  try {
    state.updatedAtReal = realNow;
    const text = serialize(state);
    deserialize(text); // never write a save this build couldn't open
    const previous = store.getItem(mainKey(state.saveId));
    // Another tab or a newer build may have saved in a format this build can't read; never replace or demote it.
    if (previous !== null && (storedVersion(previous) ?? 0) > SAVE_VERSION) throw new Error('This save was made by a newer version of the game, so it was not replaced.');
    if (previous !== null && previous !== text) {
      if (isSound(previous)) store.setItem(bakKey(state.saveId), previous);
      else if (!damagedCopies(store, state.saveId).some((k) => store.getItem(k) === previous)) store.setItem(`${mainKey(state.saveId)}.damaged-${realNow}`, previous);
    }
    store.setItem(mainKey(state.saveId), text);
    if (store.getItem(mainKey(state.saveId)) !== text) throw new Error('Verification failed');
    const index = listSaves(store).filter((s) => s.saveId !== state.saveId);
    index.push(summaryOf(state, realNow));
    store.setItem(INDEX, JSON.stringify(index));
    return { ok: true, savedAtReal: realNow };
  } catch (e) {
    if (isQuotaError(e)) return { ok: false, storageFull: true, error: 'The browser storage for SLATE is full.' };
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function isSound(text: string): boolean {
  try {
    deserialize(text);
    return true;
  } catch (e) {
    return e instanceof SaveTooNewError; // never demote a newer save to "damaged"
  }
}

const damagedCopies = (store: KeyValueStore, id: string) => store.keys().filter((k) => k.startsWith(`${mainKey(id)}.damaged-`));

export const backupKey = (id: string, version: number) => `${PREFIX}save.${id}.backup-v${version}`;

export interface Recovery {
  source: 'backup' | 'interrupted-write' | 'migration-backup';
  /** The copy that was opened. */
  key: string;
  /** Where the damaged save was kept (never deleted by the game). */
  damagedKey?: string;
  problem: string;
}

/**
 * Open a save. A main save that is missing, unreadable or fails validation is replaced by the newest sound copy
 * (a complete temporary copy from an interrupted write, then the backup), after the damaged one is preserved.
 * A save from a newer version is refused without falling back. Unresolvable places are reported for repair.
 */
export function openSave(store: KeyValueStore, saveId: string, realNow = Date.now()): { state: GameState; recovery?: Recovery } {
  const text = store.getItem(mainKey(saveId));
  let problem = 'The save could not be found.';
  if (text !== null) {
    try {
      const state = readCurrent(store, saveId, text);
      return { state };
    } catch (e) {
      if (e instanceof SaveTooNewError || e instanceof MissingPlacesError || e instanceof BackupRequiredError) throw e;
      problem = e instanceof Error ? e.message : String(e);
    }
  }
  // The newest sound copy wins: a complete copy from an interrupted write, the backup, or a migration backup.
  const candidates: { source: Recovery['source']; key: string; state: GameState }[] = [];
  const sources: [Recovery['source'], string][] = [['interrupted-write', tmpKey(saveId)], ['backup', bakKey(saveId)],
    ...store.keys().filter((k) => /\.backup-v\d+$/.test(k) && k.startsWith(`${mainKey(saveId)}.`)).sort().reverse().map((k) => ['migration-backup', k] as [Recovery['source'], string])];
  for (const [source, key] of sources) {
    const state = readQuietly(store.getItem(key));
    if (state) candidates.push({ source, key, state });
  }
  candidates.sort((x, y) => y.state.updatedAtReal - x.state.updatedAtReal);
  const pick = candidates[0];
  if (pick) {
    let damagedKey: string | undefined;
    if (text !== null) {
      damagedKey = damagedCopies(store, saveId).find((k) => store.getItem(k) === text);
      if (!damagedKey) {
        damagedKey = `${mainKey(saveId)}.damaged-${realNow}`;
        try {
          store.setItem(damagedKey, text);
        } catch {
          throw new SaveFormatError(`${problem} A good copy exists, but there is no room to keep the damaged one first. Free some browser storage and try again.`);
        }
      }
    }
    const missing = missingPlaces(pick.state);
    if (missing.length) throw new MissingPlacesError(saveId, missing, missingPlaceUses(pick.state));
    return { state: pick.state, recovery: { source: pick.source, key: pick.key, damagedKey, problem } };
  }
  throw new SaveFormatError(text === null ? 'This save could not be found.' : `${problem} No good copy was found to open instead.`);
}

/** The main save as stored, migrated (after keeping an untouched copy of an older version) and checked. */
function readCurrent(store: KeyValueStore, saveId: string, text: string): GameState {
  const v = storedVersion(text);
  if (v !== null && v < SAVE_VERSION && store.getItem(backupKey(saveId, v)) === null) {
    try {
      store.setItem(backupKey(saveId, v), text);
    } catch {
      throw new BackupRequiredError('This save needs an update, and there is no room to keep a backup first. Free some browser storage and try again.');
    }
  }
  const state = deserialize(text);
  const missing = missingPlaces(state);
  if (missing.length) throw new MissingPlacesError(saveId, missing, missingPlaceUses(state));
  return state;
}

/** Not a damaged save: an update that can't keep its backup. Surfaced as-is rather than recovered around. */
class BackupRequiredError extends SaveFormatError {}

export function readSave(store: KeyValueStore, saveId: string): GameState {
  return openSave(store, saveId).state;
}

/** Deletes a save with its backup and every recovery copy kept for it (the player confirms, seeing how many). */
export function deleteSave(store: KeyValueStore, saveId: string): void {
  for (const k of store.keys()) if (k === mainKey(saveId) || k.startsWith(`${mainKey(saveId)}.`)) store.removeItem(k);
  const index = listSaves(store).filter((s) => s.saveId !== saveId);
  store.setItem(INDEX, JSON.stringify(index));
}

// ---------------- Recovery copies and storage use ----------------

export type RecoveryKind = 'interrupted' | 'migration' | 'repair' | 'damaged' | 'conflict';

export interface RecoveryCopy {
  key: string;
  saveId: string;
  kind: RecoveryKind;
  /** Characters, as browsers count storage. */
  chars: number;
  /** When the game kept it (damaged copies), if known. */
  keptAtReal: number | null;
  /** When the game in it was last saved, if it can be read. */
  savedAtReal: number | null;
  /** The game version it was written by, if it can be read. */
  version: number | null;
}

const RECOVERY = /^slate\.v1\.save\.([^.]+)\.(tmp|backup-v\d+|backup-repair|damaged-(\d+)|conflict-(\d+))$/;

/**
 * Copies the game keeps so progress can be recovered: an interrupted write's copy, backups taken before a save was
 * updated or repaired, and damaged saves. The game never deletes these by itself; the player can export or delete them.
 * (The backup of the previous save, `.bak`, is not listed: it is part of every save and replaced as the game saves.)
 */
export function listRecoveryCopies(store: KeyValueStore): RecoveryCopy[] {
  const out: RecoveryCopy[] = [];
  for (const key of store.keys()) {
    if (!RECOVERY.test(key)) continue;
    const text = store.getItem(key) ?? '';
    out.push(recoveryCopyOf(key, key.length + text.length, recordMeta(text))!);
  }
  return sortCopies(out);
}

export function sortCopies(out: RecoveryCopy[]): RecoveryCopy[] {
  return out.sort((a, b) => (b.keptAtReal ?? b.savedAtReal ?? 0) - (a.keptAtReal ?? a.savedAtReal ?? 0));
}

/** A stored record's version and save time, read from its text without parsing a possibly large save. */
export function recordMeta(text: string): { savedAtReal: number | null; version: number | null } {
  const v = /^\{"format":"slate-save","version":(\d+)/.exec(text);
  const t = /\\"updatedAtReal\\":(\d+)/.exec(text);
  return { version: v ? Number(v[1]) : null, savedAtReal: t ? Number(t[1]) : null };
}

/** Describes a recovery copy from its key and metadata; null when the key isn't one. */
export function recoveryCopyOf(key: string, chars: number, meta: { savedAtReal: number | null; version: number | null }): RecoveryCopy | null {
  const m = RECOVERY.exec(key);
  if (!m) return null;
  const kind: RecoveryKind = m[2] === 'tmp' ? 'interrupted' : m[2] === 'backup-repair' ? 'repair' : m[2].startsWith('damaged-') ? 'damaged' : m[2].startsWith('conflict-') ? 'conflict' : 'migration';
  const kept = m[3] ?? m[4];
  return { key, saveId: m[1], kind, chars, keptAtReal: kept ? Number(kept) : null, savedAtReal: meta.savedAtReal, version: meta.version };
}

/** Deletes one recovery copy the player chose. Refuses any key that isn't a recovery copy. */
export function deleteRecoveryCopy(store: KeyValueStore, key: string): boolean {
  if (!RECOVERY.test(key)) return false;
  store.removeItem(key);
  return true;
}

export interface StorageUse {
  /** Everything this site keeps in browser storage, in characters as browsers count it. */
  usedChars: number;
  limitChars: number;
  /** Per save: the save and its backup, and its recovery copies. */
  bySave: Record<string, { saveChars: number; recoveryChars: number }>;
}

export function storageUse(store: KeyValueStore): StorageUse {
  let usedChars = 0;
  const bySave: StorageUse['bySave'] = {};
  for (const key of store.keys()) {
    const chars = key.length + (store.getItem(key)?.length ?? 0);
    usedChars += chars;
    const m = /^slate\.v1\.save\.([^.]+)(\..+)?$/.exec(key);
    if (!m) continue;
    const row = (bySave[m[1]] ??= { saveChars: 0, recoveryChars: 0 });
    if (RECOVERY.test(key)) row.recoveryChars += chars;
    else row.saveChars += chars;
  }
  return { usedChars, limitChars: BROWSER_STORAGE_CHARS, bySave };
}

export function renameSave(store: KeyValueStore, saveId: string, name: string): SaveResult {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Enter a name.' };
  const state = readSave(store, saveId);
  state.saveName = trimmed.slice(0, 80);
  return writeSave(store, state, Date.now());
}

export function readDraft(store: KeyValueStore): CreationDraft | null {
  try {
    const raw = store.getItem(DRAFT);
    return raw ? normalizeDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeDraft(store: KeyValueStore, draft: CreationDraft): boolean {
  try {
    store.setItem(DRAFT, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(store: KeyValueStore): void {
  store.removeItem(DRAFT);
}

// ---------- One authoritative tab per save ----------

export interface LockInfo {
  tabId: string;
  beat: number;
}
const lockKey = (id: string) => `${PREFIX}lock.${id}`;
export const LOCK_STALE_MS = 6000;

export function readLock(store: KeyValueStore, saveId: string): LockInfo | null {
  try {
    const raw = store.getItem(lockKey(saveId));
    return raw ? (JSON.parse(raw) as LockInfo) : null;
  } catch {
    return null;
  }
}

/** True when this tab may run the save (no other live tab holds it). */
export function canTakeLock(store: KeyValueStore, saveId: string, tabId: string, realNow: number): boolean {
  const lock = readLock(store, saveId);
  return !lock || lock.tabId === tabId || realNow - lock.beat > LOCK_STALE_MS;
}

export function takeLock(store: KeyValueStore, saveId: string, tabId: string, realNow: number): void {
  store.setItem(lockKey(saveId), JSON.stringify({ tabId, beat: realNow }));
}

export function releaseLock(store: KeyValueStore, saveId: string, tabId: string): void {
  const lock = readLock(store, saveId);
  if (lock?.tabId === tabId) store.removeItem(lockKey(saveId));
}

// ---------- Place references a save can't resolve ----------

/** Place IDs a save refers to that neither the catalog nor the save's own records know. */
export function missingPlaces(s: GameState): string[] {
  const refs = [s.locationId, s.character.birthplaceId, s.travel?.from, s.travel?.to, ...s.projects.map((p) => p.axes.basePlaceId)];
  return [...new Set(refs.filter((id): id is string => !!id && !findPlace(id)))];
}

/** Where each missing place is used, in the player's words. */
export function missingPlaceUses(s: GameState): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const add = (id: string | undefined, use: string) => {
    if (id && !findPlace(id)) (out[id] ??= []).push(use);
  };
  add(s.locationId, 'Where you are');
  add(s.character.birthplaceId, 'Your birthplace');
  add(s.travel?.from, 'Where your trip started');
  add(s.travel?.to, 'Where your trip is going');
  for (const p of s.projects) add(p.axes.basePlaceId, `Production base of ${p.title}`);
  return out;
}

export class MissingPlacesError extends SaveFormatError {
  constructor(public saveId: string, public ids: string[], public uses: Record<string, string[]> = {}) {
    super(ids.length === 1 ? 'This save mentions a place the game can’t find.' : `This save mentions ${ids.length} places the game can’t find.`);
  }
}

/**
 * Replace unresolvable place IDs with chosen places, after keeping an untouched copy of the save
 * (`…backup-repair`). Nothing else in the save changes.
 */
export function repairSave(store: KeyValueStore, saveId: string, replacements: Record<string, Place>, realNow: number): GameState {
  const text = store.getItem(mainKey(saveId));
  if (text === null) throw new SaveFormatError('This save could not be found.');
  const s = deserialize(text);
  const missing = missingPlaces(s);
  if (missing.some((id) => !replacements[id])) throw new Error('Choose a place for each missing one.');
  if (store.getItem(`${mainKey(saveId)}.backup-repair`) === null) store.setItem(`${mainKey(saveId)}.backup-repair`, text);
  const swap = (id: string) => replacements[id]?.id ?? id;
  for (const pl of Object.values(replacements)) {
    registerPlace(pl);
    if (!isCatalogPlace(pl.id)) (s.places ??= {})[pl.id] = pl;
  }
  s.locationId = swap(s.locationId);
  s.character.birthplaceId = swap(s.character.birthplaceId);
  if (s.travel) s.travel = { ...s.travel, from: swap(s.travel.from), to: swap(s.travel.to) };
  for (const p of s.projects) p.axes.basePlaceId = swap(p.axes.basePlaceId);
  const res = writeSave(store, s, realNow);
  if (!res.ok) throw new SaveFormatError('The repaired save could not be written. Free some browser storage and try again.');
  return s;
}

// ---------------- Import ----------------

/** Bigger than any save the game writes (a 50-year career is about 12 MB); larger files are refused before parsing. */
export const IMPORT_LIMIT_CHARS = 64 * 1024 * 1024;

/**
 * Read a file the player chose to import: an exported save (any version this build can upgrade). It is checked,
 * upgraded and validated in memory; nothing is stored. Throws SaveTooNewError for a newer version and
 * SaveFormatError, with a message for the player, for anything else it can't use.
 */
export function readImport(text: string): GameState {
  if (text.length > IMPORT_LIMIT_CHARS) throw new SaveFormatError('This file is too large to be a SLATE save.');
  if (!text.trim()) throw new SaveFormatError('This file is empty.');
  const state = deserialize(text);
  const missing = missingPlaces(state);
  if (missing.length) throw new SaveFormatError('This save mentions places this version of SLATE can’t find, so it can’t be imported.');
  return state;
}

/** How an imported save is stored when one with its ID exists: never decided by the game. */
export type ImportMode = 'new' | 'copy' | 'replace';

export class ImportConflictError extends Error {
  constructor(readonly existing: SaveSummary) {
    super('A save with this ID is already here.');
  }
}

/** The save already stored under an imported save's ID, if any. */
export function existingSave(store: KeyValueStore, saveId: string): SaveSummary | null {
  return listSaves(store).find((x) => x.saveId === saveId) ?? null;
}

/**
 * Store an imported save. 'new' refuses (ImportConflictError) if its ID is taken; 'copy' stores it under a new ID and
 * name, leaving the existing save alone; 'replace' writes it over the existing save, which writeSave keeps as the
 * backup when it is sound (and never replaces a save from a newer version). Returns the stored save's ID.
 */
export function importSave(store: KeyValueStore, imported: GameState, mode: ImportMode, realNow: number): { saveId: string; result: SaveResult } {
  const state = JSON.parse(JSON.stringify(imported)) as GameState; // the caller's copy stays as read from the file
  const existing = existingSave(store, state.saveId) ?? (store.getItem(mainKey(state.saveId)) !== null ? { saveId: state.saveId } as SaveSummary : null);
  if (mode === 'new' && existing) throw new ImportConflictError(existing);
  if (mode === 'copy') {
    let id = `${state.saveId}-c${realNow.toString(36)}`;
    for (let n = 2; store.getItem(mainKey(id)) !== null || existingSave(store, id); n++) id = `${state.saveId}-c${realNow.toString(36)}${n}`;
    state.saveId = id;
    state.saveName = `${state.saveName} (Imported Copy)`.slice(0, 80);
  }
  return { saveId: state.saveId, result: writeSave(store, state, realNow) };
}
