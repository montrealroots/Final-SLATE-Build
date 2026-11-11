// Data packs (November 11, 2026, the owner: "make them like a mod you can install in the game, and after I install they
// show"; docs/DATA-PACKS.md). A pack is one file holding the film catalog or the cinemas, written by tools/pack.mjs. The
// player installs it in Settings; it is kept in this browser's storage, each record still compressed, and the catalog
// loader (load.ts) reads from it before asking the server. So any copy of the game can show the catalog, with no server
// that holds one.
//
// TMDB's terms travel with the film pack: one older than six months from its oldest response is refused, and one that
// ages past that while installed is deleted the next time the game reads it (1.C). Remove deletes every record (1.D).

export type PackKind = 'catalog' | 'cinemas';
export interface PackMeta {
  kind: PackKind;
  name: string;
  source: string;
  builtAt: string;
  /** The film pack's TMDB retrieval window, which sets when it must go. */
  retrieved?: { from: string; to: string; maxAgeDays: number };
}
export interface InstalledPack extends PackMeta { files: number; bytes: number; installedAt: string }

const MAGIC = 'SLATEPACK1\n';
const DAY = 86_400_000;
/** TMDB's limit, as the server keeps it (server/catalog-handler.mjs MAX_AGE_DAYS). */
const MAX_AGE_DAYS = 180;

/** When a pack must be withdrawn, or null for one with no such limit (the cinemas, from Wikidata, CC0). */
export function packExpires(meta: PackMeta): number | null {
  if (meta.kind !== 'catalog') return null;
  return Date.parse(meta.retrieved!.from) + Math.min(meta.retrieved!.maxAgeDays ?? MAX_AGE_DAYS, MAX_AGE_DAYS) * DAY;
}

/** Reads a pack's header and slices its records out of the file without unpacking them. Throws a message for the player. */
export async function parsePack(file: Blob): Promise<{ meta: PackMeta; records: [string, Blob][] }> {
  const head = new Uint8Array(await file.slice(0, MAGIC.length + 4).arrayBuffer());
  if (new TextDecoder().decode(head.slice(0, MAGIC.length)) !== MAGIC) throw new Error("This file isn't a SLATE data pack.");
  const len = new DataView(head.buffer).getUint32(MAGIC.length, true);
  const start = MAGIC.length + 4 + len;
  let h: PackMeta & { format: number; entries: [string, number, number][] };
  try {
    h = JSON.parse(await file.slice(MAGIC.length + 4, start).text());
  } catch {
    throw new Error('This data pack is damaged: its contents list can\'t be read.');
  }
  if (h.format !== 1) throw new Error('This data pack was made for a newer version of SLATE.');
  if ((h.kind !== 'catalog' && h.kind !== 'cinemas') || !Array.isArray(h.entries) || typeof h.builtAt !== 'string') throw new Error('This data pack is damaged: its contents list is incomplete.');
  if (h.kind === 'catalog' && !h.retrieved?.from) throw new Error("This film pack doesn't say when its data was gathered, so TMDB's six months can't be kept. It wasn't installed.");
  if (start + h.entries.reduce((n, e) => Math.max(n, e[1] + e[2]), 0) > file.size) throw new Error('This data pack is incomplete: the file was cut short.');
  // Every record belongs to the pack's own kind, so one pack can never replace the other's files.
  if (h.entries.some(([p]) => p.startsWith('cinemas/') !== (h.kind === 'cinemas'))) throw new Error('This data pack is damaged: it holds files of another kind.');
  const { kind, name, source, builtAt, retrieved } = h;
  return { meta: { kind, name, source, builtAt, ...(retrieved ? { retrieved } : {}) }, records: h.entries.map(([p, o, n]) => [p, file.slice(start + o, start + o + n)]) };
}

/** One record, decompressed. */
export async function decodeRecord(blob: Blob): Promise<unknown> {
  return new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).json();
}

// ---------- storage: IndexedDB "slate-packs", records keyed "<kind>:<path>" ----------

const kindOf = (path: string): PackKind => (path.startsWith('cinemas/') ? 'cinemas' : 'catalog');
const range = (kind: PackKind) => IDBKeyRange.bound(`${kind}:`, `${kind}:￿`);
const req = <T>(r: IDBRequest<T>) => new Promise<T>((ok, fail) => { r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); });
const done = (tx: IDBTransaction) => new Promise<void>((ok, fail) => { tx.oncomplete = () => ok(); tx.onerror = () => fail(tx.error); tx.onabort = () => fail(tx.error ?? new Error('aborted')); });

let dbp: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  return (dbp ??= new Promise((ok, fail) => {
    const r = indexedDB.open('slate-packs', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('packs', { keyPath: 'kind' }); r.result.createObjectStore('files'); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => { dbp = null; fail(r.error); };
  }));
}

let packs: Promise<Map<PackKind, InstalledPack>> | null = null;
/** The packs installed in this browser. A film pack past TMDB's six months is deleted here, and not listed. */
export function installedPacks(): Promise<Map<PackKind, InstalledPack>> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(new Map());
  return (packs ??= (async () => {
    const all = await req((await db()).transaction('packs').objectStore('packs').getAll() as IDBRequest<InstalledPack[]>);
    const out = new Map<PackKind, InstalledPack>();
    for (const p of all) {
      const ends = packExpires(p);
      if (ends !== null && Date.now() >= ends) { await deleteKind(p.kind); withdrawn.add(p.kind); } else out.set(p.kind, p);
    }
    return out;
  })().catch(() => { packs = null; return new Map(); }));
}
/** Packs deleted this session because TMDB's six months had passed, so the pages can say why the catalog went. */
const withdrawn = new Set<PackKind>();
export const packWithdrawn = (kind: PackKind) => withdrawn.has(kind);

async function deleteKind(kind: PackKind): Promise<void> {
  const tx = (await db()).transaction(['packs', 'files'], 'readwrite');
  tx.objectStore('packs').delete(kind);
  tx.objectStore('files').delete(range(kind));
  await done(tx);
}

/**
 * Install a pack, replacing one of its kind. Nothing is used until every record is stored and the pack is listed, so an
 * install cut short leaves the game as it was (its records are deleted, and the old pack is gone, as the player chose to
 * replace it).
 */
export async function installPack(file: Blob, progress?: (stored: number, total: number) => void): Promise<InstalledPack> {
  const { meta, records } = await parsePack(file);
  const ends = packExpires(meta);
  if (ends !== null && Date.now() >= ends) throw new Error(`This film pack was gathered more than six months ago (from ${meta.retrieved!.from.slice(0, 10)}), the longest TMDB allows its data to be kept, so it can't be installed. Ask for a newer one.`);
  packs = null;
  await deleteKind(meta.kind);
  const d = await db();
  try {
    for (let i = 0; i < records.length; i += 400) {
      // Bytes, not the file's slices: WebKit can't keep a Blob in IndexedDB in a private window (found November 11, 2026,
      // in Playwright's WebKit), and the bytes are read before the transaction, which would close while waiting.
      const batch = await Promise.all(records.slice(i, i + 400).map(async ([path, blob]) => [path, await blob.arrayBuffer()] as const));
      const tx = d.transaction('files', 'readwrite');
      for (const [path, bytes] of batch) tx.objectStore('files').put(bytes, `${meta.kind}:${path}`);
      await done(tx);
      progress?.(Math.min(i + 400, records.length), records.length);
    }
    const installed: InstalledPack = { ...meta, files: records.length, bytes: records.reduce((n, [, b]) => n + b.size, 0), installedAt: new Date().toISOString() };
    const tx = d.transaction('packs', 'readwrite');
    tx.objectStore('packs').put(installed);
    await done(tx);
    withdrawn.delete(meta.kind);
    return installed;
  } catch (e) {
    await deleteKind(meta.kind).catch(() => undefined);
    throw new Error((e as DOMException)?.name === 'QuotaExceededError' ? "There isn't room in this browser's storage for this pack. Free some space and try again." : "The pack couldn't be stored in this browser.");
  } finally {
    packs = null;
  }
}

/** Remove a pack and every record it held. */
export async function removePack(kind: PackKind): Promise<void> {
  packs = null;
  await deleteKind(kind);
  packs = null;
}

/**
 * A catalog file from an installed pack: its data, 'gone' if the pack doesn't have it, or 'withdrawn' for a film pack
 * deleted for its age. Undefined when no pack of that kind is installed, so the loader asks the server as before.
 */
export async function packFile(path: string): Promise<{ data: unknown } | 'gone' | 'withdrawn' | undefined> {
  const kind = kindOf(path);
  if (!(await installedPacks()).has(kind)) return packWithdrawn(kind) ? 'withdrawn' : undefined;
  const bytes = await req((await db()).transaction('files').objectStore('files').get(`${kind}:${path}`) as IDBRequest<ArrayBuffer | undefined>);
  return bytes ? { data: await decodeRecord(new Blob([bytes])) } : 'gone';
}
