// Durable saves. "Saved" is only reported after the new data has been written, read back and
// verified. Writes go to a temporary key first; the previous good save is kept as a backup
// until the new one verifies, so an interrupted write never destroys the last good save.

import { hashString } from './rng';
import { findPlace, isCatalogPlace, registerPlace, type Place } from '../data/places';
import type { CreationDraft, GameState } from './types';
import { SAVE_VERSION } from './types';

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
  if (v > SAVE_VERSION) throw new SaveFormatError('This save was made by a newer version of SLATE.');
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new SaveFormatError(`No upgrade path from save version ${v}.`);
    obj = m(obj);
    v += 1;
    obj.version = v;
  }
  const s = obj as unknown as GameState;
  validateState(s);
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

function validateState(s: GameState): void {
  const ok =
    typeof s.saveId === 'string' && typeof s.now === 'number' && Number.isFinite(s.now) && s.character && typeof s.character.name === 'string' &&
    Array.isArray(s.events) && Array.isArray(s.projects) && Array.isArray(s.log) && Array.isArray(s.editions) && typeof s.seed === 'number';
  if (!ok) throw new SaveFormatError('The save file is missing required information.');
}

export function listSaves(store: KeyValueStore): SaveSummary[] {
  try {
    const raw = store.getItem(INDEX);
    const list: SaveSummary[] = raw ? JSON.parse(raw) : [];
    return list.filter((s) => store.getItem(mainKey(s.saveId)) !== null).sort((a, b) => b.savedAtReal - a.savedAtReal);
  } catch {
    return [];
  }
}

export type SaveResult = { ok: true; savedAtReal: number } | { ok: false; error: string };

export function writeSave(store: KeyValueStore, state: GameState, realNow: number): SaveResult {
  try {
    state.updatedAtReal = realNow;
    const text = serialize(state);
    store.setItem(tmpKey(state.saveId), text);
    // Verify the temporary copy before it replaces anything.
    const back = store.getItem(tmpKey(state.saveId));
    if (back !== text) throw new Error('Verification failed');
    deserialize(back);
    const previous = store.getItem(mainKey(state.saveId));
    if (previous !== null) store.setItem(bakKey(state.saveId), previous);
    store.setItem(mainKey(state.saveId), text);
    if (store.getItem(mainKey(state.saveId)) !== text) throw new Error('Verification failed');
    store.removeItem(tmpKey(state.saveId));
    store.removeItem(bakKey(state.saveId));
    const index = listSaves(store).filter((s) => s.saveId !== state.saveId);
    index.push({
      saveId: state.saveId,
      saveName: state.saveName,
      characterName: state.character.name,
      locationId: state.locationId,
      gameNow: state.now,
      savedAtReal: realNow,
    });
    store.setItem(INDEX, JSON.stringify(index));
    return { ok: true, savedAtReal: realNow };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export const backupKey = (id: string, version: number) => `${PREFIX}save.${id}.backup-v${version}`;

export function readSave(store: KeyValueStore, saveId: string): GameState {
  const text = store.getItem(mainKey(saveId));
  // Keep an untouched copy of an older save before it is migrated; if that can't be written, don't migrate.
  if (text !== null) {
    const v = storedVersion(text);
    if (v !== null && v < SAVE_VERSION && store.getItem(backupKey(saveId, v)) === null) {
      try {
        store.setItem(backupKey(saveId, v), text);
      } catch {
        throw new SaveFormatError('This save needs an update, and there is no room to keep a backup first. Free some browser storage and try again.');
      }
    }
  }
  if (text === null) {
    // A crash between backup and replacement leaves only the backup: recover it.
    const bak = store.getItem(bakKey(saveId));
    if (bak) return deserialize(bak);
    throw new SaveFormatError('This save could not be found.');
  }
  const state = deserialize(text);
  const missing = missingPlaces(state);
  if (missing.length) throw new MissingPlacesError(saveId, missing, missingPlaceUses(state));
  return state;
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
