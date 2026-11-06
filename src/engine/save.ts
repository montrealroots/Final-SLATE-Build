// Durable saves. "Saved" is only reported after the new data has been written, read back and
// verified. Writes go to a temporary key first; the previous good save is kept as a backup
// until the new one verifies, so an interrupted write never destroys the last good save.

import { hashString } from './rng';
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
/** Migrations keyed by the version they upgrade FROM. Add one per schema change. */
export const MIGRATIONS: Record<number, Migration> = {};

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
  return s;
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

export function readSave(store: KeyValueStore, saveId: string): GameState {
  const text = store.getItem(mainKey(saveId));
  if (text === null) {
    // A crash between backup and replacement leaves only the backup: recover it.
    const bak = store.getItem(bakKey(saveId));
    if (bak) return deserialize(bak);
    throw new SaveFormatError('This save could not be found.');
  }
  return deserialize(text);
}

export function deleteSave(store: KeyValueStore, saveId: string): void {
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
