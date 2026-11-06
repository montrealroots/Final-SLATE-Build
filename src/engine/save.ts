// Durable saves. "Saved" is only reported after the new data has been written, read back and
// verified. Writes go to a temporary key first; the previous good save is kept as a backup
// until the new one verifies, so an interrupted write never destroys the last good save.

import { hashString } from './rng';
import { findPlace, isCatalogPlace, registerPlace, type Place } from '../data/places';
import type { CreationDraft, GameState } from './types';
import { SAVE_VERSION } from './types';
import { SaveValidationError, validateGameState } from './validate';

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

export function memoryStore(): KeyValueStore & { failWrites: boolean; data: Map<string, string> } {
  const data = new Map<string, string>();
  const store = {
    data,
    failWrites: false,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (store.failWrites) throw new Error('QuotaExceededError');
      data.set(k, v);
    },
    removeItem: (k: string) => void data.delete(k),
    keys: () => [...data.keys()],
  };
  return store;
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
  return { saveId: state.saveId, saveName: state.saveName, characterName: state.character.name, locationId: state.locationId, gameNow: state.now, savedAtReal };
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
  for (const k of store.keys()) {
    const m = /^slate\.v1\.save\.([^.]+)$/.exec(k);
    if (!m || known.has(m[1])) continue;
    try {
      const st = deserialize(store.getItem(k)!);
      list.push(summaryOf(st, st.updatedAtReal));
    } catch {
      list.push({ saveId: m[1], saveName: 'Damaged save', characterName: '', locationId: '', gameNow: 0, savedAtReal: 0 });
    }
    known.add(m[1]);
  }
  return list.filter((s) => store.getItem(mainKey(s.saveId)) !== null || store.getItem(bakKey(s.saveId)) !== null).sort((a, b) => b.savedAtReal - a.savedAtReal);
}

export type SaveResult = { ok: true; savedAtReal: number } | { ok: false; error: string };

/**
 * Write a save durably: validate it, write a temporary copy and read it back, keep the current save as the backup
 * (only if it is itself sound; a damaged one is preserved under its own key instead), replace, verify, then update the
 * index. "Saved" (ok: true) is returned only when every step succeeded.
 */
export function writeSave(store: KeyValueStore, state: GameState, realNow: number): SaveResult {
  try {
    state.updatedAtReal = realNow;
    const text = serialize(state);
    deserialize(text); // never write a save this build couldn't open
    const current = store.getItem(mainKey(state.saveId));
    // Another tab or a newer build may have saved in a format this build can't read; never replace or demote it.
    if (current !== null && (storedVersion(current) ?? 0) > SAVE_VERSION) throw new Error('This save was made by a newer version of the game, so it was not replaced.');
    store.setItem(tmpKey(state.saveId), text);
    const back = store.getItem(tmpKey(state.saveId));
    if (back !== text) throw new Error('Verification failed');
    const previous = store.getItem(mainKey(state.saveId));
    if (previous !== null && previous !== text) {
      if (isSound(previous)) store.setItem(bakKey(state.saveId), previous);
      else if (!damagedCopies(store, state.saveId).some((k) => store.getItem(k) === previous)) store.setItem(`${mainKey(state.saveId)}.damaged-${realNow}`, previous);
    }
    store.setItem(mainKey(state.saveId), text);
    if (store.getItem(mainKey(state.saveId)) !== text) throw new Error('Verification failed');
    store.removeItem(tmpKey(state.saveId));
    const index = listSaves(store).filter((s) => s.saveId !== state.saveId);
    index.push(summaryOf(state, realNow));
    store.setItem(INDEX, JSON.stringify(index));
    return { ok: true, savedAtReal: realNow };
  } catch (e) {
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
  source: 'backup' | 'interrupted-write';
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
  for (const [source, key] of [['interrupted-write', tmpKey(saveId)], ['backup', bakKey(saveId)]] as const) {
    const copy = store.getItem(key);
    if (copy === null) continue;
    let state: GameState;
    try {
      state = deserialize(copy);
    } catch {
      continue;
    }
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
    const missing = missingPlaces(state);
    if (missing.length) throw new MissingPlacesError(saveId, missing, missingPlaceUses(state));
    return { state, recovery: { source, damagedKey, problem } };
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

export function deleteSave(store: KeyValueStore, saveId: string): void {
  for (const k of store.keys()) if (k.startsWith(`${PREFIX}save.${saveId}.backup-`)) store.removeItem(k);
  store.removeItem(mainKey(saveId));
  store.removeItem(tmpKey(saveId));
  store.removeItem(bakKey(saveId));
  const index = listSaves(store).filter((s) => s.saveId !== saveId);
  store.setItem(INDEX, JSON.stringify(index));
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
    return raw ? (JSON.parse(raw) as CreationDraft) : null;
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
