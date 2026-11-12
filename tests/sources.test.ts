import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { MEDIUM_LABELS, applySources, rightsLine, rightsStanding, searchSources, type SourceMedium, type SourceWork } from '../src/engine/sources';
import { GENRE_MAP } from '../tools/sources/genre-map.mjs';
import { CLASSES, toRecord } from '../tools/sources/import.mjs';

/**
 * The source-material catalog (the v3 package, 02; acceptance T05). The counts here are counted from the file; with
 * V3_WRITE=1 they are written to docs/v3/SOURCE-COVERAGE.md, so that report is never typed by hand.
 */
const catalog = applySources(JSON.parse(readFileSync('src/data/sources.json', 'utf8')));
const genres = (JSON.parse(readFileSync('src/data/genre-catalog.json', 'utf8')) as { records: { id: string; name: string }[] }).records;
const works = catalog.records;

describe('the source-material catalog', () => {
  it('holds at least 500 distinct works, each one work and not an edition, with books, games and online stories among them', () => {
    expect(works.length).toBeGreaterThanOrEqual(500);
    expect(new Set(works.map((w) => w.id)).size).toBe(works.length);
    // No two records are the same title by the same people in the same medium: an edition does not count twice.
    const same = works.map((w) => `${w.medium}|${w.title.toLowerCase()}|${w.creators.map((c) => c.id).sort().join(',')}`);
    expect(same.filter((k, i) => same.indexOf(k) !== i)).toEqual([]);
    const by = (m: SourceMedium) => works.filter((w) => w.medium === m).length;
    expect(by('novel') + by('short-story')).toBeGreaterThanOrEqual(150);
    expect(by('video-game')).toBeGreaterThanOrEqual(50);
    expect(by('online')).toBeGreaterThanOrEqual(50);
    for (const w of works) expect(Object.keys(MEDIUM_LABELS), w.id).toContain(w.medium);
  });

  it('says where every record came from and writes nothing the record does not have', () => {
    for (const w of works) {
      expect(w.id, w.title).toMatch(/^wd:Q\d+$/);
      expect(w.link).toBe(`https://www.wikidata.org/wiki/${w.id.slice(3)}`);
      expect(w.provenance).toEqual({ source: 'Wikidata', licence: 'CC0', retrieved: catalog.retrieved });
      expect(w.title.length, w.id).toBeGreaterThan(0);
      expect(w.title, w.id).not.toMatch(/^Q\d+$/);
      expect(w).not.toHaveProperty('synopsis');
      for (const c of w.creators) expect(c.name, w.id).not.toMatch(/^Q\d+$/);
      if (w.article) expect(w.article).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
    }
  });

  it("gives a work one of the game's genres only through the reviewed table, with the reason", () => {
    const ids = new Set(genres.map((g) => g.id));
    for (const [wd, [game]] of Object.entries(GENRE_MAP as Record<string, [string, string]>)) expect(ids.has(game), `${wd} maps to ${game}`).toBe(true);
    for (const w of works) for (const g of w.genres) {
      const from = w.recordedGenres.filter((r) => (GENRE_MAP as Record<string, [string, string]>)[r.id]?.[0] === g.genre);
      expect(from.length, `${w.title}: ${g.genre}`).toBeGreaterThan(0);
      // The reason names a recorded genre that the table maps to this one (two can: "fairy tale" and "literary fairy tale").
      expect(from.some((f) => g.because === `Wikidata records its genre as "${f.label}"`), `${w.title}: ${g.because}`).toBe(true);
    }
    // A recorded genre that is not in the table gives no genre of the game's.
    const unmapped = works.find((w) => w.recordedGenres.length > 0 && w.recordedGenres.every((r) => !(r.id in GENRE_MAP)));
    expect(unmapped?.genres ?? []).toEqual([]);
  });

  it('says about rights only what is recorded: public domain where stated, with the place; copyrighted where stated; otherwise unknown', () => {
    const w = (copyright: SourceWork['copyright']) => ({ ...works[0], copyright });
    expect(rightsStanding(w([]))).toBe('not-recorded');
    expect(rightsLine(w([]))).toBe('Wikidata records no copyright status for it. Its rights are unknown to the game.');
    expect(rightsStanding(w([{ status: 'public domain', where: 'United States' }]))).toBe('public-domain-recorded');
    expect(rightsLine(w([{ status: 'public domain', where: 'United States' }]))).toBe('Wikidata records: public domain (United States). That is a record, not advice, and it may be wrong or apply only where it says.');
    // Where the record says both, the work is not treated as free to use.
    expect(rightsStanding(w([{ status: 'public domain', where: 'United States' }, { status: 'copyrighted' }]))).toBe('copyrighted-recorded');
    // An author's year of death is kept as a fact and decides nothing.
    const old = works.find((x) => x.creators.some((c) => c.died && c.died < 1800) && x.copyright.length === 0);
    if (old) expect(rightsStanding(old)).toBe('not-recorded');
  });

  it('finds works by title, creator, recorded genre, medium, game genre and recorded rights', () => {
    const quixote = searchSources(catalog, { text: 'quixote' });
    expect(quixote[0]?.title).toBe('Don Quixote');
    expect(searchSources(catalog, { text: 'cervantes' }).map((x) => x.title)).toContain('Don Quixote');
    expect(searchSources(catalog, { medium: 'video-game' }).every((x) => x.medium === 'video-game')).toBe(true);
    expect(searchSources(catalog, { genre: 'detective' }).every((x) => x.genres.some((g) => g.genre === 'detective'))).toBe(true);
    expect(searchSources(catalog, { standing: 'public-domain-recorded' }).every((x) => rightsStanding(x) === 'public-domain-recorded')).toBe(true);
    expect(searchSources(catalog, { text: 'zzzz no such work' })).toEqual([]);
  });

  it('leaves out an edition, a translation, a franchise and a record with no English title', () => {
    const raw = (kinds: [string, string][], title = 'A Title') => ({ id: 'Q1', title, description: null, article: null, creators: new Map(), genres: new Map(), languages: new Map(), countries: new Map(), dates: [], series: null, copyright: [], kinds: new Map(kinds) });
    expect(toRecord(raw([['Q3331189', 'version, edition or translation']]), 'novel', '2026-11-12')).toEqual({ skip: 'an edition, a translation, a franchise or a series, not a work' });
    expect(toRecord(raw([['Q196600', 'media franchise']]), 'video-game', '2026-11-12')).toHaveProperty('skip');
    expect(toRecord(raw([['Q7725634', 'literary work']], 'Q12345'), 'novel', '2026-11-12')).toEqual({ skip: 'no English title recorded' });
    expect(toRecord(raw([['Q7725634', 'literary work']]), 'novel', '2026-11-12')).toMatchObject({ id: 'wd:Q1', title: 'A Title', medium: 'novel', genres: [], copyright: [], year: null });
    expect(CLASSES.map((c) => c.medium).sort()).toEqual(Object.keys(MEDIUM_LABELS).sort());
  });

  it('counts itself for the coverage report', () => {
    const n = (x: number) => x.toLocaleString('en-US');
    const media = (Object.keys(MEDIUM_LABELS) as SourceMedium[]).map((m) => [m, works.filter((w) => w.medium === m)] as const);
    const standing = (ws: SourceWork[], s: string) => ws.filter((w) => rightsStanding(w) === s).length;
    const byGenre = genres.map((g) => ({ g, ws: works.filter((w) => w.genres.some((x) => x.genre === g.id)) }));
    const recorded = new Map<string, number>();
    for (const w of works) for (const g of w.recordedGenres) if (!(g.id in GENRE_MAP)) recorded.set(g.label, (recorded.get(g.label) ?? 0) + 1);
    const md = [
      '# Source-Material Coverage', '',
      'Written by `V3_WRITE=1 npx vitest run tests/sources.test.ts` from `src/data/sources.json`. Nothing here is typed by hand.', '',
      `The catalog holds **${n(works.length)} distinct works**, read from Wikidata (CC0) on ${catalog.retrieved} by \`tools/sources/import.mjs\`. Each is a work, not an edition or a translation of one, a franchise or a series of separate books. They were chosen by how many language editions of Wikipedia have an article on them, most first, within each medium: a measure of being widely written about, and not a judgement of worth. It leans towards older, European and Japanese works for that reason, and says so here rather than claiming balance.`, '',
      '## By Medium', '',
      '| Medium | Works | With a creator recorded | With a year recorded | Recorded as public domain somewhere | Recorded as copyrighted | No copyright status recorded | With one of the game\'s genres |', '| --- | --- | --- | --- | --- | --- | --- | --- |',
      ...media.map(([m, ws]) => `| ${MEDIUM_LABELS[m]} | ${ws.length} | ${ws.filter((w) => w.creators.length).length} | ${ws.filter((w) => w.year !== null).length} | ${standing(ws, 'public-domain-recorded')} | ${standing(ws, 'copyrighted-recorded')} | ${standing(ws, 'not-recorded')} | ${ws.filter((w) => w.genres.length).length} |`),
      `| **All** | ${works.length} | ${works.filter((w) => w.creators.length).length} | ${works.filter((w) => w.year !== null).length} | ${standing(works, 'public-domain-recorded')} | ${standing(works, 'copyrighted-recorded')} | ${standing(works, 'not-recorded')} | ${works.filter((w) => w.genres.length).length} |`, '',
      'A copyright status is one Wikidata states, with the place it applies to. The game works none out. "Recorded as public domain somewhere" is not a statement that a work is free to use where you are.', '',
      "## By The Game's Genres", '',
      `A work has one of the game's genres only where the reviewed table (\`tools/sources/genre-map.mjs\`, ${Object.keys(GENRE_MAP).length} entries) says a genre Wikidata records is that genre. ${byGenre.filter((x) => x.ws.length).length} of the game's ${genres.length} genres have at least one work; ${byGenre.filter((x) => !x.ws.length).length} have none, and no work was pushed into one to change that.`, '',
      '| Genre | Works | Of those, recorded as public domain somewhere |', '| --- | --- | --- |',
      ...byGenre.filter((x) => x.ws.length).sort((a, b) => b.ws.length - a.ws.length || a.g.name.localeCompare(b.g.name)).map((x) => `| ${x.g.name} | ${x.ws.length} | ${standing(x.ws, 'public-domain-recorded')} |`), '',
      `**Genres with no work:** ${byGenre.filter((x) => !x.ws.length).map((x) => x.g.name).join(', ')}.`, '',
      '## Recorded Genres Left Unmapped', '',
      `${recorded.size} genres Wikidata records on these works are not one of the game's and map to nothing: how a game is played, a readership, or a mode with no one genre here. The most used: ${[...recorded].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([l, c]) => `${l} (${c})`).join(', ')}.`, '',
      '## What Is Not Here', '',
      '- A synopsis: Wikidata has none and none is written. A work\'s one-line description is Wikidata\'s.',
      '- Rights beyond the recorded statements: no territory-by-territory status, no chain of title, no adaptation rights. Nothing in the game grants a right to a real work.',
      '- Fan fiction, and web serials Wikidata does not class as web fiction, webcomics or webtoons: "online" here is those three classes.',
      '- Fictional works invented for the game: none yet; they would be counted separately.', '',
    ].join('\n');
    if (process.env.V3_WRITE) writeFileSync('docs/v3/SOURCE-COVERAGE.md', md);
    else expect(readFileSync('docs/v3/SOURCE-COVERAGE.md', 'utf8')).toBe(md);
  });
});
