// Vitest runs in Node, where the app's asset URLs ("/src/...") are files in this repository: serve them from disk.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (!url.startsWith('/')) return realFetch(input, init);
  try {
    return new Response(await readFile(root + url.slice(1).split('?')[0], 'utf8'));
  } catch {
    return new Response('Not found', { status: 404 });
  }
}) as typeof fetch;

// The genre catalog loads before any game opens in the app (ui/store.ts); engine tests start from that state.
const { loadGenreCatalog } = await import('../src/engine/genres');
await loadGenreCatalog();
