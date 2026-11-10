// Types for tmdb.mjs, so the tests can call it with checking.
export const API: string;
export const CACHE: string;
export const MAX_AGE_DAYS: number;
export function cached(path: string): { path: string; status: number; retrievedAt: string; body: unknown } | null;
export function fresh(at: string, now?: number): boolean;
export function failures(): { path: string; error: string; at: string }[];
export function saveFailures(): void;
export const stats: { network: number; cache: number; retries: number; rateLimited: number; missing: number };
export function useTransport(f: (url: string) => Promise<Response>, s?: (ms: number) => Promise<void>): void;
export function get(path: string): Promise<unknown>;
export function pool<T, R>(items: T[], n: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]>;
