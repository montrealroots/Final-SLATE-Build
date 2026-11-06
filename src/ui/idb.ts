// The browser side of the save vault (src/engine/vault.ts): IndexedDB, with each record gzip-compressed, and the
// one-time move of saves out of localStorage under a lock shared by every tab.

import { browserStore, type KeyValueStore } from '../engine';
import { recordMeta } from '../engine/save';
import { LocalBackend, Vault, applyJournal, migrateFromLocal, type Backend, type RecordMeta } from '../engine/vault';

const DB = 'slate-saves';

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error ?? new DOMException('The save was not written.', 'AbortError'));
  });
}

// Compressed bytes are stored as an ArrayBuffer: WebKit refuses Blobs in IndexedDB in private (ephemeral) sessions.
type Stored = { data: ArrayBuffer | string; gz: boolean };

const canGzip = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

async function pack(text: string): Promise<Stored> {
  if (!canGzip) return { data: text, gz: false };
  // Streams straight from a Response, not a Blob: WebKit reads a Blob through a blob URL, which it refuses while the page
  // unloads ("... due to access control checks"), and the save then fails with an uncaught error.
  const bytes = await new Response(new Response(text).body!.pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  return { data: bytes, gz: true };
}

async function unpack(s: Stored): Promise<string> {
  if (!s.gz) return s.data as string;
  return new Response(new Response(s.data as ArrayBuffer).body!.pipeThrough(new DecompressionStream('gzip'))).text();
}

export class IdbBackend implements Backend {
  readonly kind = 'indexeddb' as const;
  private constructor(private db: IDBDatabase) {}

  static async open(): Promise<IdbBackend> {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('data');
      r.result.createObjectStore('meta');
    };
    const db = await req(r);
    // Another tab upgrading or deleting the database must not wait on this one; writes then fail and say so.
    db.onversionchange = () => db.close();
    return new IdbBackend(db);
  }

  async list(): Promise<Map<string, RecordMeta>> {
    const tx = this.db.transaction('meta');
    const store = tx.objectStore('meta');
    const [keys, values] = await Promise.all([req(store.getAllKeys()), req(store.getAll())]);
    return new Map(keys.map((k, i) => [String(k), values[i] as RecordMeta]));
  }

  async read(keys: string[]): Promise<Map<string, string>> {
    if (!keys.length) return new Map();
    const store = this.db.transaction('data').objectStore('data');
    const got = await Promise.all(keys.map((k) => req(store.get(k) as IDBRequest<Stored | undefined>)));
    const out = new Map<string, string>();
    await Promise.all(keys.map(async (k, i) => { if (got[i]) out.set(k, await unpack(got[i]!)); }));
    return out;
  }

  async commit(puts: Map<string, string>, deletes: string[]): Promise<Map<string, RecordMeta>> {
    // Compress first: a transaction closes as soon as it has nothing to do, so no waiting may happen inside it.
    const packed = await Promise.all([...puts].map(async ([k, v]) => [k, v, await pack(v)] as const));
    const tx = this.db.transaction(['data', 'meta'], 'readwrite');
    const data = tx.objectStore('data');
    const meta = tx.objectStore('meta');
    const written = new Map<string, RecordMeta>();
    const finished = done(tx);
    try {
      for (const k of deletes) {
        data.delete(k);
        meta.delete(k);
      }
      for (const [k, text, stored] of packed) {
        const m: RecordMeta = { chars: text.length, bytes: k.length + (stored.gz ? (stored.data as ArrayBuffer).byteLength : text.length * 2), ...recordMeta(text) };
        data.put(stored, k);
        meta.put(m, k);
        written.set(k, m);
      }
    } catch (e) {
      // Nothing from a failed commit may land, not even the deletes already queued.
      tx.abort();
      finished.catch(() => undefined);
      throw e;
    }
    await finished;
    return written;
  }

  async estimate(): Promise<{ usage: number; quota: number } | null> {
    try {
      const e = await navigator.storage.estimate();
      return e.quota ? { usage: e.usage ?? 0, quota: e.quota } : null;
    } catch {
      return null;
    }
  }
}

/** Run `fn` while holding a lock every tab of this site respects (Web Locks), or just run it where that isn't available. */
async function exclusively<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  return locks ? locks.request(name, fn) : fn();
}

/**
 * Open the vault: IndexedDB when the browser allows it, otherwise localStorage as before. Saves still in localStorage
 * (from earlier versions, or another tab running one) are moved in, under a lock so two tabs never move them at once.
 */
export async function openVault(local: KeyValueStore = browserStore()): Promise<{ vault: Vault; moved: number; kept: number }> {
  let backend: Backend;
  try {
    backend = await IdbBackend.open();
    // Some browsers open IndexedDB but refuse to store in it (private modes): check with a tiny record first.
    await backend.commit(new Map([['slate.v1.probe', 'ok']]), []);
    await backend.commit(new Map(), ['slate.v1.probe']);
  } catch {
    const vault = await Vault.open(new LocalBackend(local));
    await applyJournal(local, vault, Date.now());
    return { vault, moved: 0, kept: 0 };
  }
  const vault = await Vault.open(backend);
  const report = await exclusively('slate-vault-migration', async () => {
    vault.meta = await backend.list(); // another tab may have moved saves while this one waited for the lock
    const moved = await migrateFromLocal(local, vault, Date.now());
    await applyJournal(local, vault, Date.now());
    return moved;
  });
  return { vault, moved: report.moved.length, kept: report.kept.length };
}
