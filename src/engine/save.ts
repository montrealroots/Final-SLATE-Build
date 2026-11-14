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
import { migrateV9toV10 } from './cash/migrate';
import { migrateV10toV11, openBankFromJournal } from './cash/migrate11';
// The storage primitives that need no migration (key-value stores, the save index, recovery copies, locks, drafts) are in
// save-store.ts since November 11, 2026, so the start screen can list saves without loading the engine. Re-exported here.
import { DRAFT, INDEX, PREFIX, bakKey, finishList, indexedSaves, isQuotaError, mainKey, openableKeys, tmpKey, type KeyValueStore, type SaveSummary } from './save-store';
export * from './save-store';

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
  // v9 -> v10: the personal and company accounts move into one journal in cents, reconciled or refused (cash/migrate.ts).
  9: migrateV9toV10,
  // v10 -> v11: your money moves from the v8 journal to your bank, reconciled; the company is inventoried (cash/migrate11.ts).
  10: migrateV10toV11,
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
    try {
      obj = m(obj);
    } catch (e) {
      // A migration that can't finish opens nothing: the stored save, and the copy kept before the upgrade, stay as they were.
      throw e instanceof SaveFormatError ? e : new SaveFormatError(`This save couldn't be updated (${(e as Error).message}). It was left as it was.`);
    }
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
  openBankFromJournal(s);
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
 * or a damaged index) is found by its key and listed from its own contents, which only this module can read (it holds the
 * migrations), so the light half is in save-store.ts.
 */
export function listSaves(store: KeyValueStore): SaveSummary[] {
  const { list, unindexed } = indexedSaves(store);
  const keys = store.keys();
  for (const id of unindexed) {
    const sound = openableKeys(keys, id).map((key) => readQuietly(store.getItem(key))).find((x) => x !== null);
    list.push(sound ? summaryOf(sound, sound.updatedAtReal) : { saveId: id, saveName: 'Damaged save', characterName: '', locationId: '', gameNow: 0, savedAtReal: 0, startedAtReal: 0 });
  }
  return finishList(store, list);
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

/**
 * Keeps the stored save as a recovery copy before the player takes newer records for its world (industry.ts
 * applyWorldRefresh; docs/WORLD.md, "Taking Newer Records"). One copy is kept, of the save as it was before the latest
 * such change. Throws when there is no stored save to copy.
 */
export function keepBeforeWorldRefresh(store: KeyValueStore, saveId: string): void {
  const text = store.getItem(mainKey(saveId));
  if (text === null) throw new SaveFormatError('This save could not be found.');
  store.setItem(`${mainKey(saveId)}.backup-world`, text);
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
