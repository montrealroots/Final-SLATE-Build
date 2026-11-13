// Data packs (November 11, 2026, the owner: "make them like a mod you can install in the game, and after I install they
// show"; docs/DATA-PACKS.md). A pack is one file holding the film catalog or the cinemas, written by tools/pack.mjs. The
// player installs it in Settings; it is kept in this browser's storage, each record still compressed, and the catalog
// loader (load.ts) reads from it before asking the server. So any copy of the game can show the catalog, with no server
// that holds one.
//
// TMDB's terms travel with the film pack: one older than six months from its oldest response is refused, and one that
// ages past that while installed is deleted the next time the game reads it (1.C). Remove deletes every record (1.D).
//
// From November 11, 2026 (the Creative Depth package, milestone G): a pack is installed beside the one it replaces and
// takes its place in a single step, so an install that is cut short, or runs out of room, leaves the old pack in use;
// the browser's free space is asked before anything is written; and a third kind of pack holds pictures (profile
// photos and posters), which is optional, never needed by the catalog, and kept under the same six months.

/** A shard of the whole catalog's pictures is a kind of its own, `pictures.profile-07`, so each installs, replaces and expires by itself. */
export type PictureShardKind = `pictures.${string}`;
export type PackKind = 'catalog' | 'cinemas' | 'images' | PictureShardKind;
export const isShard = (kind: string): kind is PictureShardKind => kind.startsWith('pictures.');
export interface PackMeta {
  kind: PackKind;
  name: string;
  source: string;
  builtAt: string;
  /** The film pack's or the picture pack's TMDB retrieval window, which sets when it must go. */
  retrieved?: { from: string; to: string; maxAgeDays: number };
}
/** `gen` is which copy of the pack's records is in use (see installPack); a pack installed before generations has none. */
export interface InstalledPack extends PackMeta { files: number; bytes: number; installedAt: string; gen?: number }

const MAGIC = 'SLATEPACK1\n';
const DAY = 86_400_000;
/** TMDB's limit, as the server keeps it (server/catalog-handler.mjs MAX_AGE_DAYS). */
const MAX_AGE_DAYS = 180;

/** When a pack must be withdrawn, or null for one with no such limit (the cinemas, from Wikidata, CC0). */
export function packExpires(meta: PackMeta): number | null {
  if (meta.kind !== 'catalog' && meta.kind !== 'images' && !isShard(meta.kind)) return null;
  return Date.parse(meta.retrieved!.from) + Math.min(meta.retrieved!.maxAgeDays ?? MAX_AGE_DAYS, MAX_AGE_DAYS) * DAY;
}

/** Reads a pack's header and slices its records out of the file without unpacking them. Throws a message for the player. */
export async function parsePack(file: Blob): Promise<{ meta: PackMeta; records: [string, Blob][] }> {
  const head = new Uint8Array(await file.slice(0, MAGIC.length + 4).arrayBuffer());
  if (new TextDecoder().decode(head.slice(0, MAGIC.length)) !== MAGIC) throw new Error("This file isn't a SLATE data pack.");
  const len = new DataView(head.buffer).getUint32(MAGIC.length, true);
  const start = MAGIC.length + 4 + len;
  let h: Omit<PackMeta, 'kind'> & { kind: string; part?: string; format: number; entries: [string, number, number][] };
  try {
    h = JSON.parse(await file.slice(MAGIC.length + 4, start).text());
  } catch {
    throw new Error('This data pack is damaged: its contents list can\'t be read.');
  }
  if (h.format !== 1) throw new Error('This data pack was made for a newer version of SLATE.');
  if ((h.kind !== 'catalog' && h.kind !== 'cinemas' && h.kind !== 'images' && h.kind !== 'pictures') || !Array.isArray(h.entries) || typeof h.builtAt !== 'string') throw new Error('This data pack is damaged: its contents list is incomplete.');
  if (h.kind === 'pictures' && (!/^[a-z-]+-\d\d$/.test(h.part ?? '') || !h.retrieved?.from)) throw new Error("This picture pack doesn't say which part it is or when its pictures were gathered. It wasn't installed.");
  if (h.kind === 'catalog' && !h.retrieved?.from) throw new Error("This film pack doesn't say when its data was gathered, so TMDB's six months can't be kept. It wasn't installed.");
  if (h.kind === 'images' && !h.retrieved?.from) throw new Error("This picture pack doesn't say when its pictures were gathered, so TMDB's six months can't be kept. It wasn't installed.");
  if (start + h.entries.reduce((n, e) => Math.max(n, e[1] + e[2]), 0) > file.size) throw new Error('This data pack is incomplete: the file was cut short.');
  // Every record belongs to the pack's own kind, so one pack can never replace the other's files.
  const kind: PackKind = h.kind === 'pictures' ? `pictures.${h.part}` : (h.kind as PackKind);
  if (h.entries.some(([p]) => kindOf(p) !== kind)) throw new Error('This data pack is damaged: it holds files of another kind.');
  const { name, source, builtAt, retrieved } = h;
  return { meta: { kind, name, source, builtAt, ...(retrieved ? { retrieved } : {}) }, records: h.entries.map(([p, o, n]) => [p, file.slice(start + o, start + o + n)]) };
}

/** One record, decompressed. */
export async function decodeRecord(blob: Blob): Promise<unknown> {
  return new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).json();
}

// ---------- storage: IndexedDB "slate-packs", records keyed "<kind>:<path>" ----------

const kindOf = (path: string): PackKind => (path.startsWith('cinemas/') ? 'cinemas' : path.startsWith('images/') ? 'images' : path.startsWith('pictures/') ? `pictures.${path.split('/')[1]}` : 'catalog');
/**
 * A record's key. Each install writes its records under a generation of their own ("catalog@3:titles/..."), so the
 * records in use are never touched while their replacement is being written. Packs installed before November 11, 2026
 * have no generation ("catalog:titles/...").
 */
const key = (kind: PackKind, gen: number | undefined, path: string) => (gen ? `${kind}@${gen}:${path}` : `${kind}:${path}`);
const range = (kind: PackKind, gen: number | undefined) => IDBKeyRange.bound(key(kind, gen, ''), key(kind, gen, '\uffff'));
/** Every record of a kind, whatever its generation. */
const allOf = (kind: PackKind) => [IDBKeyRange.bound(`${kind}:`, `${kind}:\uffff`), IDBKeyRange.bound(`${kind}@`, `${kind}@\uffff`)];
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
    // Once a session: clear what an unfinished install or a replaced pack left behind.
    if (!swept) { swept = true; for (const kind of new Set<PackKind>(['catalog', 'cinemas', 'images', ...out.keys()])) await sweep(kind, out.get(kind)?.gen, out.has(kind)).catch(() => undefined); }
    return out;
  })().catch(() => { packs = null; return new Map(); }));
}
let swept = false;
/** Packs deleted this session because TMDB's six months had passed, so the pages can say why the catalog went. */
const withdrawn = new Set<PackKind>();
export const packWithdrawn = (kind: PackKind) => withdrawn.has(kind);

async function deleteKind(kind: PackKind): Promise<void> {
  const tx = (await db()).transaction(['packs', 'files'], 'readwrite');
  tx.objectStore('packs').delete(kind);
  for (const r of allOf(kind)) tx.objectStore('files').delete(r);
  await done(tx);
  forgetImages();
}

/**
 * Records left by an install that never finished, or by a pack since replaced: every generation of a kind but the one
 * in use. Run when the packs are first read, so a tab closed mid-install leaves nothing behind for long.
 */
async function sweep(kind: PackKind, keep: number | undefined, listed: boolean): Promise<void> {
  const d = await db();
  const tx = d.transaction('files', 'readwrite');
  const store = tx.objectStore('files');
  if (!listed) { for (const r of allOf(kind)) store.delete(r); await done(tx); return; }
  if (keep) store.delete(allOf(kind)[0]); // the unnumbered copy from before generations
  const cursor = store.openKeyCursor(allOf(kind)[1]);
  cursor.onsuccess = () => {
    const c = cursor.result;
    if (!c) return;
    // The generation follows the kind's own name, which for a shard of pictures has a dot, a dash and digits in it.
    const g = Number(/^@(\d+):/.exec(String(c.key).slice(kind.length))?.[1]);
    if (!Number.isFinite(g)) { c.continue(); return; }
    if (g === keep) c.continue(key(kind, g, '\uffff')); // skip the generation in use in one step
    else { store.delete(range(kind, g)); c.continue(key(kind, g, '\uffff')); }
  };
  await done(tx);
}

/** How much room this browser says is left, or null where it doesn't say. */
export async function storageRoom(): Promise<{ free: number; used: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    if (!e || typeof e.quota !== 'number' || typeof e.usage !== 'number') return null;
    return { free: Math.max(0, e.quota - e.usage), used: e.usage, quota: e.quota };
  } catch { return null; }
}
/** Room asked for beyond a pack's own size: the database's own overhead. Measured at about a tenth; a fifth is asked. */
export const STORAGE_MARGIN = 1.2;

/**
 * Install a pack, replacing one of its kind. The new records are written beside the old ones, under a generation of
 * their own; only when every one is stored does the pack's listing change to point at them, in one step, and only then
 * are the old records deleted. So an install that is cut short, fails, or runs out of room leaves the pack that was
 * installed exactly as it was, still in use. Until November 11, 2026 the old pack was deleted first.
 *
 * Before anything is written, the browser is asked how much room it has. If it says there isn't enough for the new
 * pack beside the old one, nothing is written and the message says how much is needed.
 */
export async function installPack(file: Blob, progress?: (stored: number, total: number) => void, signal?: AbortSignal): Promise<InstalledPack> {
  const { meta, records } = await parsePack(file);
  const ends = packExpires(meta);
  const what = meta.kind === 'images' || isShard(meta.kind) ? 'picture pack' : 'film pack';
  if (ends !== null && Date.now() >= ends) throw new Error(`This ${what} was gathered more than six months ago (from ${meta.retrieved!.from.slice(0, 10)}), the longest TMDB allows its data to be kept, so it can't be installed. A newer one is needed.`);
  const bytes = records.reduce((n, [, b]) => n + b.size, 0);
  const before = (await installedPacks()).get(meta.kind);
  const room = await storageRoom();
  if (room && room.free < bytes * STORAGE_MARGIN) {
    const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;
    throw new Error(`There isn't room in this browser's storage for ${meta.name}: it needs about ${mb(bytes * STORAGE_MARGIN)} and ${mb(room.free)} is free. Nothing was changed${before ? `, and ${before.name} is still installed. Removing it first would free about ${mb(before.bytes)}` : ''}.`);
  }
  const d = await db();
  const gen = (before?.gen ?? 0) + 1;
  const stop = () => { if (signal?.aborted) throw new DOMException('cancelled', 'AbortError'); };
  try {
    // A generation number is reused after a failed install, so clear it first.
    { const tx = d.transaction('files', 'readwrite'); tx.objectStore('files').delete(range(meta.kind, gen)); await done(tx); }
    for (let i = 0; i < records.length; i += 400) {
      stop();
      // Bytes, not the file's slices: WebKit can't keep a Blob in IndexedDB in a private window (found November 11, 2026,
      // in Playwright's WebKit), and the bytes are read before the transaction, which would close while waiting.
      const batch = await Promise.all(records.slice(i, i + 400).map(async ([path, blob]) => [path, await blob.arrayBuffer()] as const));
      const tx = d.transaction('files', 'readwrite');
      for (const [path, buf] of batch) tx.objectStore('files').put(buf, key(meta.kind, gen, path));
      await done(tx);
      progress?.(Math.min(i + 400, records.length), records.length);
    }
    stop();
    const installed: InstalledPack = { ...meta, files: records.length, bytes, installedAt: new Date().toISOString(), gen };
    // The one step that changes which pack is in use.
    const tx = d.transaction('packs', 'readwrite');
    tx.objectStore('packs').put(installed);
    await done(tx);
    packs = null;
    withdrawn.delete(meta.kind);
    forgetImages();
    // The old records go last. If this is cut short they are swept the next time the packs are read.
    await sweep(meta.kind, gen, true).catch(() => undefined);
    return installed;
  } catch (e) {
    // The new, unfinished records are removed; the pack that was installed is untouched.
    await (async () => { const tx = d.transaction('files', 'readwrite'); tx.objectStore('files').delete(range(meta.kind, gen)); await done(tx); })().catch(() => undefined);
    const kept = before ? ` ${before.name} is still installed, as it was.` : '';
    if ((e as DOMException)?.name === 'AbortError') throw new Error(`Installing ${meta.name} was cancelled. Nothing was changed.${kept}`);
    throw new Error(((e as DOMException)?.name === 'QuotaExceededError' ? `There isn't room in this browser's storage for ${meta.name}. Free some space and try again.` : `${meta.name} couldn't be stored in this browser.`) + kept);
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
  const gen = (await installedPacks()).get(kind)?.gen;
  const bytes = await req((await db()).transaction('files').objectStore('files').get(key(kind, gen, path)) as IDBRequest<ArrayBuffer | undefined>);
  return bytes ? { data: await decodeRecord(new Blob([bytes])) } : 'gone';
}

// ---------- pictures (the optional picture pack) ----------

/** What the picture pack says about one picture: where it came from and what is known of it. Never a claim of rights. */
export interface PictureRecord {
  /** TMDB's own path for the picture, its identity there. */
  p: string;
  w: number;
  h: number;
  /** The day it was fetched. */
  at: string;
  /** The language TMDB records for it, where it records one (posters); null where it doesn't. */
  loc: string | null;
}
export interface PictureIndex {
  version: 1;
  provider: 'TMDB';
  /** The size each kind of picture was fetched at, as TMDB names its sizes. */
  sizes: { profile: string; poster: string };
  /** What is and isn't known about rights, shown wherever a picture's details are. */
  rights: string;
  /** By subject: "person:31", "movie:13", "tv:1399". */
  entries: Record<string, PictureRecord>;
}

let pictureIndex: Promise<PictureIndex | null> | null = null;
const pictureUrls = new Map<string, string>();
/** Drop every picture held in memory: after a pack comes, goes or is replaced, and when the picture pack expires. */
export function forgetImages(): void {
  pictureIndex = null;
  shardIndexes.clear();
  for (const u of pictureUrls.values()) URL.revokeObjectURL(u);
  pictureUrls.clear();
  // Every picture on a page looks again: its pack has come, gone, been replaced or expired.
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('slate-packs'));
}

/**
 * Looks again at what is installed, so a film or picture pack that has passed TMDB's six months while the game stayed
 * open is deleted now rather than at the next visit. Returns the kinds withdrawn by this look. Run every hour (App.tsx).
 */
export async function expirePacks(): Promise<PackKind[]> {
  const before = new Set(withdrawn);
  packs = null;
  await installedPacks();
  const gone = [...withdrawn].filter((k) => !before.has(k));
  if (gone.some((k) => k === 'images' || isShard(k))) forgetImages();
  return gone;
}
/** The installed picture pack's index, or null when none is installed (or it has been withdrawn for its age). */
export function pictures(): Promise<PictureIndex | null> {
  return (pictureIndex ??= (async () => {
    const f = await packFile('images/index.json');
    return f && typeof f === 'object' ? (f.data as PictureIndex) : null;
  })().catch(() => null));
}
// ---------- the whole catalog's pictures, in shards (tools/screen-catalog/pictures.mjs pack) ----------

export type PictureKind = 'profile' | 'poster' | 'backdrop' | 'season-poster' | 'still' | 'logo';
/** Which of a kind's 64 shards a record is in: the gathering tool's own sum (`bucketOf`), so the game needs no map of them. */
export const shardOf = (kind: PictureKind, entity: string): string => {
  let h = 0;
  for (const c of entity) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `${kind}-${String(h % 64).padStart(2, '0')}`;
};
/** A page's name for a record as the picture manifest names it: a season is `season:<series>:<n>`, an episode `episode:<series>:<s>:<e>`. */
export const pictureEntity = (ref: string): string => {
  const ep = /^tv:(\d+):s:(\d+):e:(\d+)$/.exec(ref);
  if (ep) return `episode:${ep[1]}:${ep[2]}:${ep[3]}`;
  const season = /^tv:(\d+):s:(\d+)$/.exec(ref);
  return season ? `season:${season[1]}:${season[2]}` : ref;
};
interface ShardIndex { version: 1; kind: PictureKind; size: string; rights: string; entries: Record<string, { p: string; w: number; h: number; at: string }> }
const shardIndexes = new Map<string, Promise<ShardIndex | null>>();
const shardIndex = (part: string): Promise<ShardIndex | null> => {
  let hit = shardIndexes.get(part);
  if (!hit) {
    hit = (async () => { const f = await packFile(`pictures/${part}/index.json`); return f && typeof f === 'object' ? (f.data as ShardIndex) : null; })().catch(() => null);
    shardIndexes.set(part, hit);
  }
  return hit;
};
/** What an installed shard records about one picture, with the pack's statement about rights; null when it has none. */
export async function shardPicture(kind: PictureKind, ref: string): Promise<{ part: string; entity: string; record: PictureRecord; rights: string; size: string } | null> {
  const entity = pictureEntity(ref);
  const part = shardOf(kind, entity);
  if (!(await installedPacks()).has(`pictures.${part}`)) return null;
  const index = await shardIndex(part);
  const e = index?.entries[entity];
  return e && index ? { part, entity, record: { ...e, loc: null }, rights: index.rights, size: index.size } : null;
}
const gunzipUrl = async (bytes: ArrayBuffer): Promise<string> => URL.createObjectURL(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).blob());

/**
 * One picture as an address the page can show, or null when nothing installed has one for the subject. A shard of the
 * whole catalog's pictures is looked in first, then the older single picture pack. The picture's bytes are read from
 * this browser's storage only when asked, and the address is forgotten with the pack.
 */
export async function pictureUrl(subject: string, kind?: PictureKind): Promise<string | null> {
  const want: PictureKind = kind ?? (subject.startsWith('person:') ? 'profile' : 'poster');
  const cacheKey = `${want}|${subject}`;
  const held = pictureUrls.get(cacheKey);
  if (held) return held;
  const shard = await shardPicture(want, subject);
  if (shard) {
    const k: PackKind = `pictures.${shard.part}`;
    const bytes = await req((await db()).transaction('files').objectStore('files').get(key(k, (await installedPacks()).get(k)?.gen, `pictures/${shard.part}/${shard.entity}`)) as IDBRequest<ArrayBuffer | undefined>);
    if (bytes) { const url = await gunzipUrl(bytes); pictureUrls.set(cacheKey, url); return url; }
  }
  if (kind && kind !== 'profile' && kind !== 'poster') return null;
  const index = await pictures();
  if (!index?.entries[subject]) return null;
  const hit = pictureUrls.get(subject);
  if (hit) return hit;
  const gen = (await installedPacks()).get('images')?.gen;
  const bytes = await req((await db()).transaction('files').objectStore('files').get(key('images', gen, `images/${subject.replace(':', '/')}`)) as IDBRequest<ArrayBuffer | undefined>);
  if (!bytes) return null;
  const raw = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).blob();
  const url = URL.createObjectURL(new Blob([raw], { type: 'image/jpeg' }));
  pictureUrls.set(subject, url);
  return url;
}

// ---------- mods the game offers (server/catalog-handler.mjs, /mods/) ----------

export interface OfferedMod extends PackMeta { file: string; files: number; bytes: number; /** The file's SHA-256, where the listing gives one: checked before anything is installed. */ sha256?: string }
const MODS_BASE = `${import.meta.env.BASE_URL}mods/`;

/** The mods this copy of the game offers; none when the server offers none or can't be reached. */
export async function offeredMods(): Promise<OfferedMod[]> {
  try {
    const r = await fetch(`${MODS_BASE}index.json`, { cache: 'no-cache' });
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return [];
    const body = (await r.json()) as { mods?: OfferedMod[] };
    return Array.isArray(body.mods) ? body.mods : [];
  } catch {
    return [];
  }
}

/** What has come of a download that was cut off or cancelled, kept for this session so it can go on from there. */
const partial = new Map<string, { parts: Uint8Array[]; got: number }>();
const partKey = (mod: OfferedMod) => `${mod.file}|${mod.builtAt}|${mod.bytes}`;
/** How much of a mod's download this session already holds. */
export const downloadedSoFar = (mod: OfferedMod): number => partial.get(partKey(mod))?.got ?? 0;

/**
 * Download a mod, saying how much has come, then install it. A download that is cancelled or cut off keeps what came,
 * for this session, and the next try asks the server for the rest; a server that can't send a part sends it all again.
 */
export async function installOffered(mod: OfferedMod, progress: (phase: 'download' | 'install', done: number, total: number) => void, signal?: AbortSignal): Promise<InstalledPack> {
  const k = partKey(mod);
  let have = partial.get(k) ?? { parts: [], got: 0 };
  let r: Response;
  try {
    r = await fetch(MODS_BASE + mod.file, { signal, ...(have.got ? { headers: { range: `bytes=${have.got}-` } } : {}) });
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') throw new Error(`The download of ${mod.name} was cancelled. Nothing was changed.`);
    throw new Error(`${mod.name} couldn't be downloaded. Check your connection and try again.`);
  }
  if (r.status === 200 && have.got) have = { parts: [], got: 0 }; // the whole file again
  else if (r.status === 416) { partial.delete(k); throw new Error(`${mod.name} changed on the game's server while it was downloading. Try again.`); }
  if ((r.status !== 200 && r.status !== 206) || !r.body) throw new Error(`${mod.name} couldn't be downloaded (the game's server answered ${r.status}). Try again.`);
  partial.set(k, have);
  const reader = r.body.getReader();
  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try { chunk = await reader.read(); } catch (e) {
      const kept = have.got ? ` ${(have.got / 1048576).toFixed(1)} MB of it is kept until you close the game, so trying again goes on from there.` : '';
      throw new Error(((e as DOMException)?.name === 'AbortError' || signal?.aborted ? `The download of ${mod.name} was cancelled. Nothing was changed.` : `The download of ${mod.name} was cut off.`) + kept);
    }
    if (chunk.done) break;
    have.parts.push(chunk.value);
    have.got += chunk.value.length;
    progress('download', have.got, mod.bytes);
  }
  const file = new Blob(have.parts as BlobPart[]);
  // What arrived is what the listing promised, or nothing is installed and nothing kept (where the browser can check:
  // it can on the owner's own machine and over HTTPS).
  if (mod.sha256 && globalThis.crypto?.subtle) {
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (digest !== mod.sha256) { partial.delete(k); throw new Error(`${mod.name} arrived damaged: it isn't the file the game's server listed. Nothing was changed. Try again.`); }
  }
  const out = await installPack(file, (n, total) => progress('install', n, total), signal);
  partial.delete(k);
  return out;
}

// ---------- the owner's sign-in (server/catalog-handler.mjs, /owner/session; docs/DEPLOYMENT.md) ----------

/** Whether this browser is being answered as the owner, and whether the game's server offers sign-in at all. */
/** `elsewhere`: the owner's own server, reached from another device, with no passphrase to sign in with. */
export interface OwnerSession { owner: boolean; signIn: boolean; elsewhere?: boolean }
const SESSION_URL = `${import.meta.env.BASE_URL}owner/session`;
const NOBODY: OwnerSession = { owner: false, signIn: false };

async function session(init?: RequestInit): Promise<{ status: number; body: OwnerSession }> {
  const r = await fetch(SESSION_URL, { cache: 'no-store', credentials: 'same-origin', ...init });
  const json = (r.headers.get('content-type') ?? '').includes('json');
  return { status: r.status, body: json ? ({ ...NOBODY, ...((await r.json()) as Partial<OwnerSession>) }) : NOBODY };
}
/** Asks the game's server. A copy with no such server (a plain file host, a dev build) offers no sign-in. */
export async function ownerSession(): Promise<OwnerSession> {
  try { const r = await session(); return r.status === 200 ? r.body : NOBODY; } catch { return NOBODY; }
}
/** Presents the owner's passphrase. It is sent to the game's own server and kept nowhere in the browser. */
export async function ownerSignIn(passphrase: string): Promise<'ok' | 'wrong' | 'locked' | 'failed'> {
  try {
    const r = await session({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passphrase }) });
    return r.status === 200 && r.body.owner ? 'ok' : r.status === 401 ? 'wrong' : r.status === 429 ? 'locked' : 'failed';
  } catch { return 'failed'; }
}
export async function ownerSignOut(): Promise<void> {
  await session({ method: 'DELETE' }).catch(() => undefined);
}
