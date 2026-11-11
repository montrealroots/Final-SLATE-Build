// How the game loads catalog files (src/catalog/load.ts): every record waits on the catalog's index, so a server with no
// catalog, or an expired or unreadable one, is never asked for records it doesn't have; a failure is retried afresh.
import { beforeEach, describe, expect, it } from 'vitest';
import { forgetCatalog, loadFile } from '../src/catalog/load';

const reply = (status: number, body: unknown) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
function server(answers: Record<string, () => Response>) {
  const asked: string[] = [];
  const impl = (async (url: string) => {
    const path = String(url).replace(/^.*\/screen-catalog\//, '');
    asked.push(path);
    const a = answers[path];
    return a ? a() : reply(404, null);
  }) as typeof fetch;
  return { impl, asked };
}

beforeEach(() => forgetCatalog());

describe('loading the catalog', () => {
  it('asks for nothing else when the index says there is no catalog, and says why', async () => {
    const s = server({ 'index.json': () => reply(200, { installed: false, reason: 'expired' }) });
    expect(await loadFile('titles/movie-1.json', s.impl)).toEqual({ status: 'missing', reason: 'expired' });
    expect(await loadFile('world.json', s.impl)).toEqual({ status: 'missing', reason: 'expired' });
    expect(s.asked).toEqual(['index.json']);
  });

  it('fetches a record once the index is there, and keeps it', async () => {
    const s = server({ 'index.json': () => reply(200, { version: 1 }), 'titles/movie-1.json': () => reply(200, { title: 'Fixture' }) });
    expect(await loadFile('titles/movie-1.json', s.impl)).toEqual({ status: 'ready', data: { title: 'Fixture' } });
    await loadFile('titles/movie-1.json', s.impl);
    expect(s.asked).toEqual(['index.json', 'titles/movie-1.json']);
  });

  it('fails a record when the index fails, and asks for both afresh the next time', async () => {
    let down = true;
    const s = server({ 'index.json': () => (down ? reply(503, null) : reply(200, { version: 1 })), 'titles/movie-1.json': () => reply(200, { title: 'Fixture' }) });
    expect(await loadFile('titles/movie-1.json', s.impl)).toEqual({ status: 'failed', message: 'The catalog answered 503.' });
    down = false;
    expect(await loadFile('titles/movie-1.json', s.impl)).toMatchObject({ status: 'ready' });
    expect(s.asked).toEqual(['index.json', 'index.json', 'titles/movie-1.json']);
  });

  it('takes no index at all (a 404) as no catalog', async () => {
    const s = server({});
    expect(await loadFile('titles/movie-1.json', s.impl)).toEqual({ status: 'missing', reason: 'missing' });
    expect(s.asked).toEqual(['index.json']);
  });

  it('reads the cinemas without the catalog: they are a separate data set', async () => {
    const s = server({ 'index.json': () => reply(200, { installed: false, reason: 'missing' }), 'cinemas/GB.json': () => reply(200, [{ id: 'Q1' }]) });
    expect(await loadFile('cinemas/GB.json', s.impl)).toEqual({ status: 'ready', data: [{ id: 'Q1' }] });
    expect(s.asked).toEqual(['cinemas/GB.json']);
  });

  it('treats an unreadable record as failed, not as data', async () => {
    const s = server({ 'index.json': () => reply(200, { version: 1 }), 'titles/movie-1.json': () => new Response('{"title":', { status: 200, headers: { 'content-type': 'application/json' } }) });
    expect(await loadFile('titles/movie-1.json', s.impl)).toMatchObject({ status: 'failed' });
  });
});
