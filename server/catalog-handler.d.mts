// Types for catalog-handler.mjs, for vite.config.ts and the tests.
import type { IncomingMessage, ServerResponse } from 'node:http';
export declare const MAX_AGE_DAYS: number;
export type CatalogState = { state: 'missing' | 'malformed' } | { state: 'ready' | 'expired'; expires: number };
export declare function catalogState(dir: string, now?: number, cache?: Record<string, unknown>): CatalogState;
export type OfferedMod = { file: string; kind: 'catalog' | 'cinemas'; name: string; source: string; builtAt: string; retrieved?: { from: string; to: string; maxAgeDays: number }; files: number; bytes: number };
export declare function readPackHeader(file: string): Record<string, unknown> | null;
export declare function offeredMods(packsDir: string | null, now?: number, films?: boolean): OfferedMod[];
export declare const MIN_SECRET: number;
export declare function isLoopback(address: string | undefined): boolean;
export declare function isLocalRequest(req: IncomingMessage): boolean;
export type SignIn = { ok: true; id: string } | { ok: false; reason: 'unavailable' | 'locked' | 'wrong'; retryAfter?: number };
export declare function createOwnerGate(o?: { films?: boolean; secret?: string | null; now?: () => number }): { allows(req: IncomingMessage): boolean; status(req: IncomingMessage): { owner: boolean; signIn: boolean }; signIn(presented: unknown): SignIn; signOut(req: IncomingMessage): void; cookie(id: string): string; expiredCookie: string };
export declare function createCatalogHandler(o: { catalogDir: string; cinemasDir: string; packsDir?: string | null; films?: boolean; ownerSecret?: string | null; now?: () => number }): (req: IncomingMessage, res: ServerResponse, next: () => void) => void;
