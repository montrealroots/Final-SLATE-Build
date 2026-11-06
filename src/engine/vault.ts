// Durable save storage for long careers. Saves live in a backend that can hold far more than localStorage's roughly
// 5 MB (IndexedDB, compressed, in the browser: src/ui/idb.ts). Every operation loads only the records it needs, runs the
// same save functions as before (save.ts) on them, then commits all changes in one atomic transaction: a save, its
// backup and the index are written together or not at all. Measurements and limits: docs/STORAGE.md.

import { deserialize, listSaves, recordMeta, recoveryCopyOf, sortCopies, writeSave, type KeyValueStore, type RecoveryCopy, type SaveSummary, type StorageUse, BROWSER_STORAGE_CHARS } from './save';

export interface RecordMeta {
  /** Characters of the stored text. */
  chars: number;
  /** Bytes actually stored (compressed), when the backend knows. */
  bytes?: number;
  savedAtReal: number | null;
  version: number | null;
}

export interface Backend {
  /** What kind of storage this is, for messages and measurements. */
  readonly kind: 'indexeddb' | 'localstorage' | 'memory';
  /** Every key with its metadata, without reading values. */
  list(): Promise<Map<string, RecordMeta>>;
  read(keys: string[]): Promise<Map<string, string>>;
  /** Apply every put and delete in one transaction, or none. Rejects with the browser's error (QuotaExceededError when full). */
  commit(puts: Map<string, string>, deletes: string[]): Promise<Map<string, RecordMeta>>;
  /** Bytes in use and available, when the browser says. */
  estimate(): Promise<{ usage: number; quota: number } | null>;
}

/** Keys that belong in the vault: saves and their copies, and the index. Locks, drafts and settings stay in localStorage. */
export const isVaultKey = (k: string) => k === 'slate.v1.index' || k.startsWith('slate.v1.save.');
const saveKeys = (id: string) => (k: string) => k === `slate.v1.save.${id}` || k.startsWith(`slate.v1.save.${id}.`) || k === 'slate.v1.index';

export interface WorkResult<T> {
  value?: T;
  /** The engine function threw (its partial changes were still committed, as they would have been in localStorage). */
  error?: unknown;
  /** The commit failed; nothing from this operation was stored. */
  commitError?: unknown;
}

export class Vault {
  private chain: Promise<unknown> = Promise.resolve();

  private constructor(readonly backend: Backend, public meta: Map<string, RecordMeta>) {}

  static async open(backend: Backend): Promise<Vault> {
    return new Vault(backend, await backend.list());
  }

  /**
   * Load the records `want` selects, run `fn` on them as an ordinary key-value store, then commit what it changed in
   * one transaction. Operations run one at a time, in order. Reading a record that wasn't loaded is a programming error.
   */
  work<T>(want: (key: string) => boolean, fn: (kv: KeyValueStore) => T): Promise<WorkResult<T>> {
    return this.serial(() => this.run(want, fn));
  }

  /**
   * Run on one save's records (its save, backup and copies) and the index, plus any save the index doesn't list (the
   * index is rebuilt from those, exactly as on localStorage).
   */
  forSave<T>(saveId: string, fn: (kv: KeyValueStore) => T): Promise<WorkResult<T>> {
    return this.serial(async () => {
      const gaps = await this.indexGaps();
      return this.run((k) => saveKeys(saveId)(k) || gaps.some((g) => saveKeys(g)(k)), fn);
    });
  }

  /**
   * Like forSave, for writeSave: it reads the stored save (to keep it as the backup) and damaged copies (so a damaged
   * save is kept once), never the backup's or other copies' contents, so those aren't loaded and decompressed.
   */
  forWrite<T>(saveId: string, fn: (kv: KeyValueStore) => T): Promise<WorkResult<T>> {
    const main = `slate.v1.save.${saveId}`;
    return this.serial(async () => {
      const gaps = await this.indexGaps();
      return this.run((k) => k === main || k === 'slate.v1.index' || k.startsWith(`${main}.damaged-`) || gaps.some((g) => saveKeys(g)(k)), fn);
    });
  }

  private serial<T>(task: () => Promise<T>): Promise<T> {
    const p = this.chain.then(task, task);
    this.chain = p.catch(() => undefined);
    return p;
  }

  /** Saves that have records but no entry in the index. */
  private async indexGaps(): Promise<string[]> {
    const ids = new Set([...this.meta.keys()].map((k) => /^slate\.v1\.save\.([^.]+)/.exec(k)?.[1]).filter((x): x is string => !!x));
    let listed = new Set<string>();
    try {
      const idx = await this.backend.read(['slate.v1.index'].filter((k) => this.meta.has(k)));
      listed = new Set((JSON.parse(idx.get('slate.v1.index') ?? '[]') as SaveSummary[]).map((x) => x.saveId));
    } catch {
      /* a damaged index lists nothing */
    }
    return [...ids].filter((id) => !listed.has(id));
  }

  private async run<T>(want: (key: string) => boolean, fn: (kv: KeyValueStore) => T): Promise<WorkResult<T>> {
    const loaded = await this.backend.read([...this.meta.keys()].filter(want));
    const current = new Map(loaded);
    const removed = new Set<string>();
    const kv: KeyValueStore = {
      getItem: (k) => {
        if (current.has(k)) return current.get(k)!;
        if (this.meta.has(k) && !removed.has(k) && !loaded.has(k)) throw new Error(`Storage record ${k} was not loaded for this operation.`);
        return null;
      },
      setItem: (k, v) => { current.set(k, v); removed.delete(k); },
      removeItem: (k) => { current.delete(k); if (this.meta.has(k) || loaded.has(k)) removed.add(k); },
      keys: () => [...new Set([...this.meta.keys(), ...current.keys()])].filter((k) => !removed.has(k)),
    };
    const out: WorkResult<T> = {};
    try {
      out.value = fn(kv);
    } catch (e) {
      out.error = e;
    }
    const puts = new Map([...current].filter(([k, v]) => loaded.get(k) !== v));
    const deletes = [...removed];
    if (puts.size || deletes.length) {
      try {
        const written = await this.backend.commit(puts, deletes);
        for (const k of deletes) this.meta.delete(k);
        for (const [k, m] of written) this.meta.set(k, m);
      } catch (e) {
        out.commitError = e;
        // A backend that can't roll back (localStorage) may have stored part of it: re-read what is there.
        this.meta = await this.backend.list().catch(() => this.meta);
      }
    }
    return out;
  }

  /** Every save, from the index, reading a save itself only when the index doesn't list it. */
  async saves(): Promise<SaveSummary[]> {
    const r = await this.serial(async () => {
      const gaps = await this.indexGaps();
      return this.run((k) => k === 'slate.v1.index' || gaps.some((g) => saveKeys(g)(k)), (kv) => listSaves(kv));
    });
    return r.value ?? [];
  }

  recoveryCopies(): RecoveryCopy[] {
    return sortCopies([...this.meta].map(([k, m]) => recoveryCopyOf(k, m.bytes ?? k.length + m.chars, m)).filter((x): x is RecoveryCopy => !!x));
  }

  async storageUse(): Promise<StorageUse & { backend: Backend['kind']; quotaKnown: boolean }> {
    const bySave: StorageUse['bySave'] = {};
    let used = 0;
    for (const [k, m] of this.meta) {
      const size = m.bytes ?? k.length + m.chars;
      used += size;
      const id = /^slate\.v1\.save\.([^.]+)/.exec(k)?.[1];
      if (!id) continue;
      const row = (bySave[id] ??= { saveChars: 0, recoveryChars: 0 });
      if (recoveryCopyOf(k, 0, m)) row.recoveryChars += size;
      else row.saveChars += size;
    }
    const est = await this.backend.estimate();
    return { usedChars: used, limitChars: est ? est.quota : BROWSER_STORAGE_CHARS, bySave, backend: this.backend.kind, quotaKnown: !!est };
  }

  async readText(key: string): Promise<string | null> {
    return (await this.backend.read([key])).get(key) ?? null;
  }
}

// ---------------- Moving saves out of localStorage ----------------

export interface MigrationReport {
  moved: string[];
  /** Records that differed between localStorage and the vault: the vault keeps both, the older as a conflict copy. */
  conflicts: string[];
  /** Left in localStorage because the vault couldn't take them or didn't read back the same. */
  kept: string[];
}

/**
 * Move every save record from localStorage into the vault, one save at a time. Each save is committed in one transaction,
 * read back and compared, and only then removed from localStorage. Safe to run again after an interruption at any point:
 * a record already in the vault with the same text is just removed from localStorage. Where the two differ (another tab
 * kept writing to localStorage), nothing is lost: the newer becomes the save and the other is kept as a conflict copy.
 * Callers hold a cross-tab lock while this runs (src/ui/vault-browser.ts).
 */
export async function migrateFromLocal(local: KeyValueStore, vault: Vault, realNow: number): Promise<MigrationReport> {
  const report: MigrationReport = { moved: [], conflicts: [], kept: [] };
  const keys = local.keys().filter((k) => k.startsWith('slate.v1.save.'));
  const ids = [...new Set(keys.map((k) => /^slate\.v1\.save\.([^.]+)/.exec(k)![1]))];
  for (const id of ids) {
    const mine = keys.filter((k) => saveKeys(id)(k));
    const source = new Map(mine.map((k) => [k, local.getItem(k)]).filter((x): x is [string, string] => x[1] !== null));
    let n = 0;
    const r = await vault.forSave(id, (kv) => {
      const planned: string[] = [];
      for (const [k, text] of source) {
        const there = kv.getItem(k);
        if (there === null || there === text) {
          if (there === null) kv.setItem(k, text);
          continue;
        }
        if (kv.keys().some((x) => x !== 'slate.v1.index' && saveKeys(id)(x) && kv.getItem(x) === text)) continue; // already kept
        // Both changed: the newer save stays the save; the other is kept.
        const main = k === `slate.v1.save.${id}`;
        const newer = main && (recordMeta(text).savedAtReal ?? 0) > (recordMeta(there).savedAtReal ?? 0);
        const conflictKey = `slate.v1.save.${id}.conflict-${realNow + n++}`;
        if (newer) {
          kv.setItem(conflictKey, there);
          kv.setItem(k, text);
        } else {
          kv.setItem(conflictKey, text);
        }
        planned.push(conflictKey);
      }
      return planned;
    });
    if (r.commitError || r.error) {
      report.kept.push(...source.keys());
      continue;
    }
    report.conflicts.push(...(r.value ?? []));
    // Verify before removing the source: every source text must now be in the vault, under its key or a conflict copy.
    const stored = await vault.backend.read([...vault.meta.keys()].filter(saveKeys(id)));
    const all = new Set(stored.values());
    for (const [k, text] of source) {
      if (stored.get(k) === text || all.has(text)) {
        local.removeItem(k);
        report.moved.push(k);
      } else {
        report.kept.push(k);
      }
    }
  }
  // The index is rebuilt from the saves; the localStorage copy is no longer needed once every save has moved.
  if (!report.kept.length && local.getItem('slate.v1.index') !== null) {
    await vault.saves().then((list) => vault.work((k) => k === 'slate.v1.index', (kv) => kv.setItem('slate.v1.index', JSON.stringify(list))));
    local.removeItem('slate.v1.index');
  }
  return report;
}

// ---------------- Backends without a browser ----------------

/** An in-memory backend with an optional byte quota, for tests and measurements. `failNext` makes the next commit fail. */
export class MemoryBackend implements Backend {
  readonly kind = 'memory' as const;
  data = new Map<string, string>();
  failNext: Error | null = null;
  commits = 0;
  constructor(public quota = Infinity) {}
  async list() {
    return new Map([...this.data].map(([k, v]) => [k, { chars: v.length, ...recordMeta(v) }]));
  }
  async read(keys: string[]) {
    return new Map(keys.filter((k) => this.data.has(k)).map((k) => [k, this.data.get(k)!]));
  }
  async commit(puts: Map<string, string>, deletes: string[]) {
    if (this.failNext) {
      const e = this.failNext;
      this.failNext = null;
      throw e;
    }
    const next = new Map(this.data);
    for (const k of deletes) next.delete(k);
    for (const [k, v] of puts) next.set(k, v);
    const used = [...next].reduce((n, [k, v]) => n + k.length + v.length, 0);
    if (used > this.quota) {
      const e = new Error('The browser storage for this site is full.');
      e.name = 'QuotaExceededError';
      throw e;
    }
    this.data = next;
    this.commits += 1;
    return new Map([...puts].map(([k, v]) => [k, { chars: v.length, ...recordMeta(v) }]));
  }
  async estimate() {
    return Number.isFinite(this.quota) ? { usage: [...this.data].reduce((n, [k, v]) => n + k.length + v.length, 0), quota: this.quota } : null;
  }
}

/** localStorage as a backend: used where IndexedDB can't be opened. Commits aren't atomic there, as before. */
export class LocalBackend implements Backend {
  readonly kind = 'localstorage' as const;
  constructor(private local: KeyValueStore) {}
  async list() {
    return new Map(this.local.keys().filter(isVaultKey).map((k) => { const v = this.local.getItem(k) ?? ''; return [k, { chars: v.length, ...recordMeta(v) }]; }));
  }
  async read(keys: string[]) {
    return new Map(keys.map((k) => [k, this.local.getItem(k)]).filter((x): x is [string, string] => x[1] !== null));
  }
  async commit(puts: Map<string, string>, deletes: string[]) {
    // Same order writeSave used directly on localStorage: the backup and copies first, the save, then the index.
    const order = [...puts.keys()].sort((a, b) => rank(a) - rank(b));
    for (const k of order) this.local.setItem(k, puts.get(k)!);
    for (const k of deletes) this.local.removeItem(k);
    return new Map([...puts].map(([k, v]) => [k, { chars: v.length, ...recordMeta(v) }]));
  }
  async estimate() {
    return null;
  }
}

function rank(k: string): number {
  if (k === 'slate.v1.index') return 2;
  return /^slate\.v1\.save\.[^.]+$/.test(k) ? 1 : 0;
}

// ---------------- The journal written as a page closes ----------------

export const journalKey = (id: string) => `slate.v1.pending.${id}`;

/**
 * A page that is closing can't wait for IndexedDB, so the game it was running is written synchronously to localStorage
 * (when it fits) as a journal entry. On the next start, an entry newer than the stored save is saved through the vault the
 * normal way (the stored save becomes its backup); an older one is superseded and removed; one that can't be read is kept
 * in the vault as a damaged copy. Nothing is dropped without being stored somewhere first.
 */
export async function applyJournal(local: KeyValueStore, vault: Vault, realNow: number): Promise<{ applied: string[] }> {
  const applied: string[] = [];
  for (const k of local.keys().filter((x) => x.startsWith('slate.v1.pending.'))) {
    const id = k.slice('slate.v1.pending.'.length);
    const text = local.getItem(k);
    if (text === null) continue;
    const stored = vault.meta.get(`slate.v1.save.${id}`);
    const mine = recordMeta(text);
    if (stored && (mine.savedAtReal ?? 0) <= (stored.savedAtReal ?? 0)) {
      local.removeItem(k);
      continue;
    }
    const r = await vault.forSave(id, (kv) => {
      try {
        return writeSave(kv, deserialize(text), realNow);
      } catch {
        kv.setItem(`slate.v1.save.${id}.damaged-${realNow}`, text);
        return { ok: true as const, savedAtReal: realNow };
      }
    });
    if (!r.commitError && !r.error && r.value?.ok) {
      local.removeItem(k);
      applied.push(id);
    }
  }
  return { applied };
}
