// Types for import.mjs, so the tests can call it with checking.
export function discover(type: 'movie' | 'tv', companyId: number): Promise<{ type: string; companyId: number; total: number | null; pages: number; ids: number[]; split: boolean; failedPages: (number | string)[] }>;
export const PEOPLE_CAST: number;
export const PEOPLE_JOBS: Set<string>;
