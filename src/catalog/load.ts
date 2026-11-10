// Loads the built screen catalog on demand, never at startup and never into a save (docs/CATALOG.md). The game never
// calls TMDB: it reads files the importer built, so it works the same with TMDB unreachable, and holds no credential.
import { useEffect, useState } from 'react';

export const CATALOG_BASE = `${import.meta.env.BASE_URL}screen-catalog/`;

export type Loaded<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'missing' } | { status: 'failed'; message: string };

const memo = new Map<string, Promise<Loaded<unknown>>>();

/** One catalog file. A file that isn't there is 'missing'; a network or server failure is 'failed' and is retried next time. */
export function loadFile<T>(path: string, fetchImpl: typeof fetch = fetch): Promise<Loaded<T>> {
  const hit = memo.get(path);
  if (hit) return hit as Promise<Loaded<T>>;
  const p: Promise<Loaded<T>> = fetchImpl(CATALOG_BASE + path)
    .then(async (r): Promise<Loaded<T>> => {
      if (r.status === 404) return { status: 'missing' };
      if (!r.ok) throw new Error(`The catalog answered ${r.status}.`);
      // A server that answers every path with the game's page (a missing file in some setups) isn't catalog data.
      if (!(r.headers.get('content-type') ?? '').includes('json')) return { status: 'missing' };
      const data = (await r.json()) as T & { installed?: boolean };
      return data?.installed === false ? { status: 'missing' } : { status: 'ready', data };
    })
    .catch((e: Error) => { memo.delete(path); return { status: 'failed', message: e.message }; });
  memo.set(path, p);
  return p;
}

// Try Again: every page still showing a failure asks again (a failed file is never kept, so it is fetched afresh).
const retries = new Set<() => void>();
export const retryCatalog = () => retries.forEach((f) => f());

export function useCatalogFile<T>(path: string | null): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const again = () => setAttempt((n) => n + 1);
    retries.add(again);
    return () => { retries.delete(again); };
  }, []);
  useEffect(() => {
    if (!path) { setState({ status: 'missing' }); return; }
    let live = true;
    setState({ status: 'loading' });
    void loadFile<T>(path).then((x) => { if (live) setState(x); });
    return () => { live = false; };
  }, [path, attempt]);
  return state;
}

/** For tests: forget what was loaded. */
export const forgetCatalog = () => memo.clear();
