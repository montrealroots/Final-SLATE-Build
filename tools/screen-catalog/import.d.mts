// Types for import.mjs, so the tests can call it with checking.
export function discover(type: 'movie' | 'tv', companyId: number): Promise<{ type: string; companyId: number; total: number | null; pages: number; ids: number[]; split: boolean; failedPages: (number | string)[] }>;
export const PEOPLE_CAST: number;
export const PEOPLE_JOBS: Set<string>;
export const WATCHED_VOTES: number;
export function discoverWatched(type: 'movie' | 'tv', minVotes?: number, years?: [number, number]): Promise<{ type: string; companyId: null; watched: number; total: number; pages: null; ids: number[]; split: true; failedPages: string[] }>;
