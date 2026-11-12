// The whole catalog's pictures in the game (November 12, 2026; docs/DATA-PACKS.md, "Pictures For The Whole Catalog"; the
// v3 package, 03). The owner's server lists a pack for each shard of each kind of picture (/mods/pictures/index.json).
// This is what downloads them: one shard at a time, each checked against its listed SHA-256 before it is installed,
// each installed whole or not at all (packs.ts installPack), so stopping anywhere leaves what was already installed in
// use and nothing half-written. A shard holds a record's picture by the record's own identity, so a person credited
// at five studios is downloaded once.
//
// Nothing here is in a saved game. Removing pictures deletes pictures and nothing else.
import { STORAGE_MARGIN, installOffered, installedPacks, isShard, removePack, storageRoom, type InstalledPack, type PackKind, type PictureKind } from './packs';

export interface PictureShard { part: string; file: string; pictures: number; bytes: number; sha256: string }
export interface PictureKindListing { name: string; size: string; pictures: number; bytes: number; shards: PictureShard[] }
export interface PictureListing {
  version: 1;
  builtAt: string;
  retrieved: { from: string; to: string; maxAgeDays: number };
  rights: string;
  kinds: Partial<Record<PictureKind, PictureKindListing>>;
}
/** One kind of picture, or every kind. */
export type Scope = PictureKind | 'all';
export const KIND_ORDER: PictureKind[] = ['profile', 'poster', 'backdrop', 'season-poster', 'still', 'logo'];

const BASE = `${import.meta.env.BASE_URL}mods/pictures/`;

/** What the game's server offers, or null: nothing gathered, six months passed, or not the owner asking. */
export async function offeredPictures(): Promise<PictureListing | null> {
  try {
    const r = await fetch(`${BASE}index.json`, { cache: 'no-cache' });
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
    const body = (await r.json()) as PictureListing;
    return body?.version === 1 && body.kinds && Object.keys(body.kinds).length ? body : null;
  } catch {
    return null;
  }
}

export interface Run {
  scope: Scope;
  /** Shards this run set out to install, and how many are done. */
  total: number;
  done: number;
  bytesTotal: number;
  bytesDone: number;
  /** The shard being downloaded or installed now, and how far. */
  current: { part: string; name: string; phase: 'download' | 'install'; done: number; total: number } | null;
  paused: boolean;
}
export interface LibraryState {
  listing: PictureListing | null;
  /** Installed shards by part ("profile-07"), with the build each came from. */
  installed: Map<string, InstalledPack>;
  run: Run | null;
  /** Shards that failed in the last run, with why, in the player's words. */
  failed: Map<string, string>;
}

const state: LibraryState = { listing: null, installed: new Map(), run: null, failed: new Map() };
const listeners = new Set<() => void>();
let version = 0;
const emit = () => { version++; for (const l of listeners) l(); };
export const subscribeLibrary = (l: () => void): (() => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const libraryVersion = (): number => version;
export const libraryState = (): LibraryState => state;

/** Reads what is offered and what is installed. */
export async function refreshLibrary(): Promise<void> {
  const [listing, packs] = await Promise.all([offeredPictures(), installedPacks()]);
  state.listing = listing;
  state.installed = new Map([...packs].filter(([k]) => isShard(k)).map(([k, v]) => [k.slice('pictures.'.length), v]));
  emit();
}

const shardsOf = (listing: PictureListing, scope: Scope): { kind: PictureKind; shard: PictureShard }[] =>
  KIND_ORDER.filter((k) => scope === 'all' || scope === k).flatMap((kind) => (listing.kinds[kind]?.shards ?? []).map((shard) => ({ kind, shard })));

/** A shard is owed when it isn't installed, or what is installed came from an earlier gathering. */
const owed = (listing: PictureListing, scope: Scope) => shardsOf(listing, scope).filter(({ shard }) => state.installed.get(shard.part)?.builtAt !== listing.builtAt);

export interface Plan {
  scope: Scope;
  shards: number;
  pictures: number;
  bytes: number;
  /** Of those, how many replace an older copy of the same shard. */
  updates: number;
  /** What the browser says it has, where it says. */
  free: number | null;
  /** The room asked for: the download and the database's own overhead. */
  needs: number;
  enough: boolean;
}
/** What downloading a scope would take, worked out before anything is fetched. */
export async function planDownload(scope: Scope): Promise<Plan | null> {
  const listing = state.listing;
  if (!listing) return null;
  const todo = owed(listing, scope);
  const bytes = todo.reduce((n, x) => n + x.shard.bytes, 0);
  const room = await storageRoom();
  const needs = Math.ceil(bytes * STORAGE_MARGIN);
  return { scope, shards: todo.length, pictures: todo.reduce((n, x) => n + x.shard.pictures, 0), bytes, updates: todo.filter((x) => state.installed.has(x.shard.part)).length, free: room?.free ?? null, needs, enough: !room || room.free >= needs };
}

let abort: AbortController | null = null;

/**
 * Download and install every owed shard of a scope, one after another. A shard that fails is noted and the run goes on
 * to the next; pausing stops after nothing is half-installed, and what had come of the shard in hand is kept for this
 * session so going on asks the server only for the rest.
 */
export async function downloadPictures(scope: Scope, only?: string[]): Promise<void> {
  const listing = state.listing;
  if (!listing || (state.run && !state.run.paused)) return;
  const todo = owed(listing, scope).filter((x) => !only || only.includes(x.shard.part));
  const run: Run = { scope, total: todo.length, done: 0, bytesTotal: todo.reduce((n, x) => n + x.shard.bytes, 0), bytesDone: 0, current: null, paused: false };
  state.run = run;
  for (const x of todo) state.failed.delete(x.shard.part);
  emit();
  abort = new AbortController();
  const signal = abort.signal;
  for (const { kind, shard } of todo) {
    if (signal.aborted) break;
    const name = `${listing.kinds[kind]!.name}, part ${Number(shard.part.slice(-2)) + 1} of ${listing.kinds[kind]!.shards.length}`;
    run.current = { part: shard.part, name, phase: 'download', done: 0, total: shard.bytes };
    emit();
    try {
      const p = await installOffered(
        { kind: `pictures.${shard.part}` as PackKind, name, source: 'TMDB', builtAt: listing.builtAt, retrieved: listing.retrieved, file: `pictures/${shard.file}`, files: shard.pictures + 1, bytes: shard.bytes, sha256: shard.sha256 },
        (phase, done, total) => { run.current = { part: shard.part, name, phase, done, total }; emit(); },
        signal,
      );
      state.installed.set(shard.part, p);
      run.done++;
      run.bytesDone += shard.bytes;
    } catch (e) {
      if (signal.aborted) break;
      state.failed.set(shard.part, e instanceof Error ? e.message : String(e));
      // Out of room: every shard after this one would fail the same way, so the run stops and says so once.
      if (/isn't room/.test(state.failed.get(shard.part)!)) break;
    }
    emit();
  }
  run.current = null;
  if (signal.aborted) run.paused = true; else state.run = null;
  abort = null;
  emit();
}
/** Stop after the shard in hand is abandoned; nothing installed is touched. */
export function pausePictures(): void { abort?.abort(); }
/** Go on with what a paused run still owes. */
export function resumePictures(): Promise<void> { const scope = state.run?.scope ?? 'all'; if (state.run) state.run.paused = true; return downloadPictures(scope); }
/** Try again the shards the last run could not install. */
export function retryFailedPictures(): Promise<void> { const parts = [...state.failed.keys()]; return downloadPictures('all', parts); }

/** Delete a scope's pictures from this browser. Saves, people, credits and contracts are not pictures and are not touched. */
export async function removePictures(scope: Scope): Promise<number> {
  pausePictures();
  state.run = null;
  let n = 0;
  for (const part of [...state.installed.keys()]) {
    if (scope !== 'all' && !part.startsWith(`${scope}-`)) continue;
    // "poster-07" must not match "season-poster-07": a part is its kind, a dash and two digits.
    if (scope !== 'all' && part.length !== scope.length + 3) continue;
    await removePack(`pictures.${part}`);
    state.installed.delete(part);
    n++;
  }
  for (const part of [...state.failed.keys()]) if (scope === 'all' || (part.startsWith(`${scope}-`) && part.length === scope.length + 3)) state.failed.delete(part);
  emit();
  return n;
}

/** How much of each kind is installed, for the list. */
export function kindProgress(kind: PictureKind): { shards: number; installed: number; current: number; pictures: number; bytes: number; installedBytes: number } {
  const k = state.listing?.kinds[kind];
  const mine = [...state.installed].filter(([part]) => part.startsWith(`${kind}-`) && part.length === kind.length + 3);
  return {
    shards: k?.shards.length ?? 0,
    installed: mine.length,
    current: mine.filter(([, p]) => p.builtAt === state.listing?.builtAt).length,
    pictures: k?.pictures ?? 0,
    bytes: k?.bytes ?? 0,
    installedBytes: mine.reduce((n, [, p]) => n + p.bytes, 0),
  };
}
