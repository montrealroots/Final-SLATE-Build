// Real films' recorded box office (src/engine/box-office-recorded.ts, from Wikidata, CC0; docs/BOX-OFFICE-RECORDED.md):
// the shipped figures, read as known on a save's date, ranked without converting, and studios reading a franchise's
// last film by the twice-budget rule.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadRecorded, placeAmong, recordedFilm, recordedFor, recordedMeta, setRecorded, worldwideAsOf, worldwideRanking, PROFIT_MULTIPLE } from '../src/engine/box-office-recorded';
import { lastResult, studioProjectOffer, studioScale } from '../src/engine/studio-projects';
import { createProject, setFinanceTarget } from './engine-api';
import { approve, buildProject, startLife, writePitch } from './helpers';
import shipped from '../src/data/box-office/wikidata.json';
import type { StudioProfile } from '../src/engine/studios';
import type { GameState, Project } from '../src/engine/types';

describe('the shipped figures', () => {
  beforeAll(async () => { await loadRecorded(); });

  it('are Wikidata\'s, CC0, each dated, in a currency, and never known before the day they run through', () => {
    const meta = recordedMeta()!;
    expect(meta.source).toBe('Wikidata');
    expect(meta.licence).toBe('CC0 1.0');
    expect(meta.counts.kept).toBeGreaterThan(4_000);
    expect(meta.counts.undated).toBeGreaterThan(0); // left out, and counted
    for (const f of Object.values(shipped.films)) for (const [amount, cur, , through, known] of f.f as [number, string, string, string, string][]) {
      expect(amount).toBeGreaterThan(0);
      expect(cur).toMatch(/^[A-Z]{3}$/);
      expect(known >= through, `${f.t}: known ${known}, through ${through}`).toBe(true);
    }
  });

  it('each carry a title, never their Wikidata ID (582 did before the multilingual label was read)', () => {
    expect(Object.entries(shipped.films).filter(([q, f]) => f.t === q || /^Q\d+$/.test(f.t)).map(([q]) => q)).toEqual([]);
    expect((shipped.films as Record<string, { t: string }>).Q24871.t).toBe('Avatar');
  });

  it('show Cars\' worldwide gross only from the day it was recorded', () => {
    // A labelled fixture of the real data: Cars (TMDB 920), its worldwide gross as Box Office Mojo reported it, recorded March 7, 2019.
    expect(worldwideAsOf('2019-03-06', 920)).toBeNull();
    const cars = worldwideAsOf('2019-03-07', 920)!;
    expect(cars).toMatchObject({ amount: 461_991_867, currency: 'USD', where: 'WORLD', source: 'Box Office Mojo' });
  });

  it('rank in US dollars only, and place a sum among them', () => {
    const top = worldwideRanking('2026-11-22');
    expect(top.length).toBeGreaterThan(1_000);
    expect(top.every((r) => r.figure.currency === 'USD' && r.figure.where === 'WORLD')).toBe(true);
    expect(top.every((r, i) => i === 0 || top[i - 1].figure.amount >= r.figure.amount)).toBe(true);
    expect(placeAmong(top, top[0].figure.amount + 1)).toBe(1);
    expect(placeAmong(top, 0)).toBe(top.length + 1);
    // Fewer were recorded by an earlier day.
    expect(worldwideRanking('2015-01-01').length).toBeLessThan(top.length);
  });
});

describe('a film\'s figures on a day (made-up data)', () => {
  afterAll(async () => { setRecorded(null); });
  const raw = {
    source: 'Wikidata', licence: 'CC0 1.0', retrieved: '2026-11-22', counts: { kept: 4 }, sources: ['Box Office Mojo'],
    films: { Q1: { t: 'Fixture Film', y: '2010-05-01', tmdb: 1, f: [
      [100, 'USD', 'WORLD', '2010-06-01', '2010-06-03', 0], [250, 'USD', 'WORLD', '2010-09-01', '2011-01-05', 0],
      [80, 'USD', 'US', '2010-09-01', '2010-09-02', 0], [900, 'JPY', 'JP', '2010-09-01', '2010-09-02', -1],
    ] } },
  } as Parameters<typeof setRecorded>[0];

  it('give each territory\'s latest recorded by then, the world first, nothing converted', () => {
    setRecorded(raw);
    const film = recordedFilm(1);
    expect(recordedFor('2010-06-02', film)).toEqual([]);
    expect(recordedFor('2010-12-31', film).map((f) => [f.where, f.amount, f.currency])).toEqual([['WORLD', 100, 'USD'], ['JP', 900, 'JPY'], ['US', 80, 'USD']]);
    expect(recordedFor('2011-01-05', film)[0].amount).toBe(250);
    expect(recordedFor('2011-01-05', film).find((f) => f.where === 'JP')!.source).toBeNull();
  });
});

describe('a studio reading its franchise\'s last film', () => {
  const EVEN = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  // Fixtures: two franchises whose last films are made-up records. "Sinking" is the more recent, so offered first
  // unless its record says it lost money.
  const fr = (name: string, tmdb: number, title: string, last: string) => ({ name, entries: 3, last, budget: 100_000_000, budgetOf: title, films: [{ r: `movie:${tmdb}`, t: title, d: last, g: ['Action'] }] });
  const STUDIO: StudioProfile = { c: 'company:fixture-fast', name: 'Overdrive Pictures (Fixture)', n: 6, g: [['Action', 10], ['Drama', 6]], m: EVEN, ann: {}, fr: [fr('Sinking Collection', 11, 'Sinking (2025)', '2025-06-01'), fr('Soaring Collection', 12, 'Soaring (2024)', '2024-06-01')], mb: 30_000_000 };
  const data = (sinking: number) => ({
    source: 'Wikidata', licence: 'CC0 1.0', retrieved: '2026-11-22', counts: { kept: 2 }, sources: ['Box Office Mojo'],
    films: {
      Q11: { t: 'Sinking', tmdb: 11, f: [[sinking, 'USD', 'WORLD', '2025-09-01', '2025-09-02', 0]] },
      Q12: { t: 'Soaring', tmdb: 12, f: [[350_000_000, 'USD', 'WORLD', '2024-09-01', '2024-09-02', 0]] },
    },
  }) as Parameters<typeof setRecorded>[0];
  afterAll(() => { setRecorded(null); });

  /** A Leading record (as tests/studio-projects.test.ts builds it): ten delivered films scored 100. */
  function leading(tag: string): GameState {
    const s = startLife(tag, 'gb-london', { savings: 2_000 });
    s.industry = { horizon: '2026-11-10', builtAt: '2026-11-10T00:00:00Z', series: {}, studios: [STUDIO] };
    for (let i = 0; i < 10; i++) {
      const p = createProject(s, { title: `Film ${i + 1}`, scenarioId: 'low', axes: { format: 'feature', medium: 'live-action', targetRuntimeMin: 90 } });
      const q = buildProject(s, { title: 'tmp', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
      p.characters = q.characters; p.scenes = q.scenes; writePitch(p);
      s.projects = s.projects.filter((x) => x.id !== q.id);
      p.axes.genres = [{ id: 'drama', emphasis: 'primary' }, { id: 'action', emphasis: 'secondary' }];
      approve(s, p); setFinanceTarget(p, 400_000);
      p.delivered = { at: s.now, runtimeMin: 90 }; p.phase = 'delivered'; p.quality = { reception: 100, script: 100, direction: 100 } as Project['quality'];
    }
    return s;
  }

  it('reads the last film by the twice-budget rule, only against that film\'s own budget, once recorded', () => {
    setRecorded(data(150_000_000));
    expect(PROFIT_MULTIPLE).toBe(2);
    expect(lastResult(STUDIO.fr![0], '2026-01-01')).toMatchObject({ title: 'Sinking (2025)', gross: 150_000_000, profit: false });
    expect(lastResult(STUDIO.fr![1], '2026-01-01')).toMatchObject({ profit: true });
    expect(lastResult(STUDIO.fr![0], '2025-09-01')).toBeNull(); // not recorded yet
    expect(lastResult({ ...STUDIO.fr![1], budgetOf: 'Another Film (2020)' }, '2026-01-01')).toBeNull(); // the budget isn't that film's
  });

  it('passes over a franchise whose last film lost money; when that film made twice its budget, offers it and says so', () => {
    setRecorded(data(150_000_000)); // Sinking took 1.5 times its budget
    const lost = studioProjectOffer(leading('bo-lost'))!;
    expect(lost.studio!.franchise).toBe('Soaring');
    expect(lost.studio!.last).toEqual({ title: 'Soaring (2024)', gross: 350_000_000, known: '2024-09-02', source: 'Box Office Mojo' });
    expect(studioScale(lost)).toContain('Its last film, Soaring (2024), took $350,000,000 worldwide, as Box Office Mojo reported it (recorded September 2, 2024), at least twice what it cost');
    setRecorded(data(250_000_000)); // the same film, recorded at 2.5 times: its franchise is offered again
    expect(studioProjectOffer(leading('bo-made'))!.studio!.franchise).toBe('Sinking');
    // With no record at all, the most recent franchise is offered as before, and nothing is said of its takings.
    setRecorded(null);
    const none = studioProjectOffer(leading('bo-none'))!;
    expect([none.studio!.franchise, none.studio!.last]).toEqual(['Sinking', undefined]);
  });
});
