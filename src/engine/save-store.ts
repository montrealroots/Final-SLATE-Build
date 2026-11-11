// Storage primitives that need no part of the engine (November 11, 2026): key-value stores, the save index, recovery
// copies, storage use, locks and the creation draft. Moved out of save.ts, which holds the migrations and with them most
// of the engine, so the start screen can list saved games before the engine loads (docs/PERFORMANCE.md). save.ts
// re-exports everything here, and reading a save's contents stays there.
import type { CreationDraft } from './types';

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

export const PREFIX = 'slate.v1.';
export const INDEX = `${PREFIX}index`;
export const DRAFT = `${PREFIX}creationDraft`;
export const mainKey = (id: string) => `${PREFIX}save.${id}`;
export const tmpKey = (id: string) => `${PREFIX}save.${id}.tmp`;
export const bakKey = (id: string) => `${PREFIX}save.${id}.bak`;

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

/**
 * The light half of listing saves: those the index lists, and the ids of openable saves it doesn't (an index write that
 * failed, or a damaged index). Reading those needs the migrations, so save.ts listSaves does it; when there are none,
 * finishList(store, list) is the whole answer.
 */
export function indexedSaves(store: KeyValueStore): { list: SaveSummary[]; unindexed: string[] } {
  let list: SaveSummary[] = [];
  try {
    const raw = store.getItem(INDEX);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) list = parsed.filter((x) => x && typeof x.saveId === 'string');
  } catch {
    list = [];
  }
  const known = new Set(list.map((x) => x.saveId));
  const unindexed: string[] = [];
  for (const k of store.keys()) {
    const m = OPENABLE.exec(k);
    if (!m || known.has(m[1])) continue;
    known.add(m[1]);
    unindexed.push(m[1]);
  }
  return { list, unindexed };
}

/** Keeps the saves that still have a copy the game can open, newest first. */
export function finishList(store: KeyValueStore, list: SaveSummary[]): SaveSummary[] {
  const keys = store.keys();
  return list.filter((s) => openableKeys(keys, s.saveId).length > 0).sort((a, b) => b.savedAtReal - a.savedAtReal);
}

/** Keys that hold a copy of a save the game can open: the save, its backup, an interrupted write, a migration backup. */
const OPENABLE = /^slate\.v1\.save\.([^.]+)(?:\.(?:bak|tmp|backup-v\d+))?$/;

export function openableKeys(keys: string[], id: string): string[] {
  const main = mainKey(id);
  const own = keys.filter((k) => k === main || (k.startsWith(`${main}.`) && OPENABLE.test(k)));
  return own.sort((a, b) => (a === main ? -1 : b === main ? 1 : 0));
}

/** Whether there is a creation draft to offer, read without the engine; save.ts readDraft gives the draft itself. */
export function hasDraft(store: KeyValueStore): boolean {
  try {
    return !!store.getItem(DRAFT);
  } catch {
    return false;
  }
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

