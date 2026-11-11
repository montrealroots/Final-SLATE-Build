// Types for catalog-handler.mjs, for vite.config.ts and the tests.
import type { IncomingMessage, ServerResponse } from 'node:http';
export declare const MAX_AGE_DAYS: number;
export type CatalogState = { state: 'missing' | 'malformed' } | { state: 'ready' | 'expired'; expires: number };
export declare function catalogState(dir: string, now?: number, cache?: Record<string, unknown>): CatalogState;
export declare function createCatalogHandler(o: { catalogDir: string; cinemasDir: string; now?: () => number }): (req: IncomingMessage, res: ServerResponse, next: () => void) => void;
