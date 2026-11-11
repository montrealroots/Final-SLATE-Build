// Types for serve.mjs, for the tests.
import type { Server } from 'node:http';
export declare function createSlateServer(o: { dist: string; catalogDir: string; cinemasDir: string; now?: () => number }): Server;
