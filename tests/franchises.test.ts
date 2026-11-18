// tools/screen-catalog/franchises.mjs: what counts toward a studio's live franchises. Shorts and documentaries don't (Toho's
// Godzilla Fest shorts, Ghibli's making-of films read as franchises before November 18, 2026), and a collection named
// without Latin letters is called by its first film's English title.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
// @ts-expect-error: a plain .mjs tool, untyped
import { addFranchises } from '../tools/screen-catalog/franchises.mjs';

const dir = mkdtempSync(join(tmpdir(), 'slate-franchises-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('addFranchises', () => {
  it('counts feature films only and names a non-Latin collection by its first film', () => {
    mkdirSync(join(dir, 'titles'));
    const film = (id: number, title: string, date: string, collection: string, runtime: number, genres: string[], budget?: number) =>
      writeFileSync(join(dir, 'titles', `movie-${id}.json`), JSON.stringify({ title, date, runtime, genres, budget, collection: { name: collection }, companies: [{ name: 'Toho' }] }));
    film(1, 'Godzilla Minus One', '2023-11-03', 'Godzilla Minus Collection', 125, ['Science Fiction'], 15_000_000);
    film(2, 'Godzilla Fest 5', '2024-11-03', 'Godzilla Fest Short Film Collection', 13, ['Action'], 13_103);
    film(3, 'Godzilla Fest 6', '2025-11-03', 'Godzilla Fest Short Film Collection', 12, ['Action']);
    film(4, 'The Making Of A Monster', '2025-06-01', 'Making Of Collection', 120, ['Documentary']);
    film(5, 'Till We Meet Again on the Lily Hill', '2023-12-08', 'あの花シリーズ', 127, ['Drama']);
    film(6, 'Till We Meet Again on the Starry Hill', '2025-12-05', 'あの花シリーズ', 128, ['Drama']);
    writeFileSync(join(dir, 'world.json'), JSON.stringify({ horizon: '2026-11-18', studios: [{ c: 'company:toho', name: 'Toho' }] }));
    addFranchises(dir);
    const toho = JSON.parse(readFileSync(join(dir, 'world.json'), 'utf8')).studios[0];
    expect(toho.fr.map((f: { name: string }) => f.name)).toEqual(['Till We Meet Again on the Lily Hill', 'Godzilla Minus Collection']);
    expect(toho.fr[1]).toMatchObject({ budget: 15_000_000, budgetOf: 'Godzilla Minus One (2023)' });
  });
});
