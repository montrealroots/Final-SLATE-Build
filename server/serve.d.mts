// Types for serve.mjs, for the tests.
import type { Server } from 'node:http';
export declare function createSlateServer(o: { dist: string; catalogDir: string; cinemasDir: string; packsDir?: string | null; films?: boolean; ownerSecret?: string | null; now?: () => number }): Server;
/** Where a server binds and what guards it, from its options; `error` when the combination can't be served safely. */
export declare function ownerPlan(o: { films: boolean; host?: string | null; secretFile?: string | null }, read?: (file: string) => string): { host: string | undefined; secret: string | null; error?: string };
