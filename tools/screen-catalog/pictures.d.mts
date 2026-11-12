export const STATUSES: string[];
export const RENDITION: Record<string, string>;
export const KINDS: string[];
export const MAX_AGE_DAYS: number;
export const IMAGE_BASE: string;
export function storePath(size: string, path: string): string;
export interface InventoryRow { entity: string; kind: string; path: string | null; excluded?: string; uncached?: boolean }
export function inventory(o: { manifest: { titles: { key: string }[]; seasons: string[]; people: number[] }; read: (path: string) => any; companies?: { id: string; tmdb: number }[]; networks?: number[] }): Generator<InventoryRow>;
export interface Row { provider: string; entity: string; kind: string; path: string | null; size: string; status: string; note?: string; file?: string; hash?: string; bytes?: number; w?: number; h?: number; at?: string; reused?: boolean }
export class Manifest { constructor(dir: string); get(entity: string, kind: string): Row | undefined; set(r: Row): void; flush(): void; rows(): Generator<Row> }
export function reconcile(man: Manifest, rows: Iterable<InventoryRow>, o: { store: string; now?: number; exists?: (f: string) => boolean }): { added: number; kept: number; stale: number; dropped: number };
export function fetchPictures(man: Manifest, o: { store: string; kinds?: string[]; limit?: number; rate?: number; workers?: number; transport?: (url: string) => Promise<any>; sleep?: (ms: number) => Promise<void>; now?: () => number; stop?: () => boolean; log?: (s: string) => void; flushEvery?: number }): Promise<{ wanted: number; fetched: number; reused: number; failed: number; bytes: number; stopped: boolean }>;
export function coverage(man: Manifest): Record<string, Record<string, number>>;
export function coverageMarkdown(by: Record<string, Record<string, number>>, o: { at: string; catalog: string }): string;
export const KIND_NAMES: Record<string, string>;
export function bucketOf(entity: string): string;
export interface PictureShard { part: string; file: string; pictures: number; bytes: number; sha256: string }
export interface PictureListing { version: 1; provider: 'TMDB'; builtAt: string; retrieved: { from: string; to: string; maxAgeDays: number }; rights: string; kinds: Record<string, { name: string; size: string; pictures: number; bytes: number; shards: PictureShard[] }> }
export function packShards(man: Manifest, o: { store: string; out: string; now?: () => number; log?: (line: string) => void }): { index: PictureListing; missing: number };
