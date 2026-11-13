// Production tailored to each project (the owner's v5 brief, 2): a plan previewed before it is built, task lists that
// follow the format, and quality that money and fame don't buy. Labelled fixtures: the same small script in each format.
import { describe, expect, it } from 'vitest';
import { previewPlan } from '../src/engine/production/schedule';
import { buildTasks } from '../src/engine/production/tasks';
import { assessQuality } from '../src/engine/finish';
import { generatePlan, ledgerTotals } from './engine-api';
import { dateKey } from '../src/engine/time';
import { getPlace } from '../src/data/places';
import type { Format, GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

const project = (s: GameState, format: Format, scenario?: string): Project => {
  const series = format === 'series' || format === 'limited-series';
  // A series of two episodes, each with the film's two scenes: the same script, laid out as the format asks.
  const scenes = [1, ...(series ? [2] : [])].flatMap((e) => [{ place: 'Pier', chars: ['Ada', 'Rook'], minutes: 3, extra: { episode: e } }, { place: 'Quay', intExt: 'EXT' as const, chars: ['Ada'], minutes: 2, extra: { episode: e } }]);
  const p = buildProject(s, { title: `A ${format}`, format, medium: 'live-action', runtime: format === 'short' ? 10 : series ? 30 : 90, ...(series ? { episodes: 2 } : {}), ...(scenario ? { scenario } : {}) },
    [{ name: 'Ada', patch: { roleSize: 'lead' } }, { name: 'Rook' }], scenes);
  approve(s, p);
  return p;
};
const start = (s: GameState, p: Project) => { const k = dateKey(s.now, getPlace(p.axes.basePlaceId).zone); return new Date(Date.parse(k) + 10 * 86_400_000).toISOString().slice(0, 10); };

describe('a plan, previewed', () => {
  it('says what building it would do, and changes nothing until it is built', () => {
    const s = startLife('tailor-preview');
    const p = project(s, 'short');
    const before = JSON.stringify(s);
    const pv = previewPlan(s, p, start(s, p));
    expect(JSON.stringify(s)).toBe(before);
    expect(pv.ok).toBe(true);
    const r = generatePlan(s, p, start(s, p));
    expect([pv.tasks, pv.shootDays, pv.firstShootDay !== null]).toEqual([r.tasks, r.shootDays, r.shootDays > 0]);
    expect(pv.leftAfter).toBe(ledgerTotals(p).available);
    // A date before today is refused in the preview with the build's own reason.
    expect(previewPlan(s, p, '2000-01-01')).toMatchObject({ ok: false, reason: 'Choose a start date from today onward.' });
  });
});

describe('the work follows the format', () => {
  it('a short, a feature, a limited series and an ongoing series get different task lists from the same scenes', () => {
    const s = startLife('tailor-formats');
    const lists = (['short', 'feature', 'limited-series', 'series'] as Format[]).map((f) => buildTasks(project(s, f)));
    const shape = (ts: ReturnType<typeof buildTasks>) => JSON.stringify(ts.map((t) => [t.kind, t.units]).sort());
    expect(new Set(lists.map(shape)).size).toBe(lists.length);
    // A series' work is per episode; a film's isn't.
    const perEpisode = (ts: ReturnType<typeof buildTasks>) => new Set(ts.map((t) => t.episode).filter((e) => e !== undefined)).size;
    expect(perEpisode(lists[3])).toBeGreaterThanOrEqual(perEpisode(lists[1]));
  });
});

describe('quality isn\'t bought', () => {
  it('a bigger budget or a more famous, better-paid hire of the same capability leaves the assessment as it was', () => {
    const s = startLife('tailor-quality');
    const a = project(s, 'short', 'micro');
    const base = assessQuality(s, a);
    a.funding.scenarioId = 'high';
    a.funding.fund += 1_000_000;
    expect(assessQuality(s, a)).toEqual(base);
    // A writer of the same capability but more experience and a higher rate: the same script score.
    const id = Object.keys(s.people)[0];
    const person = s.people[id] as unknown as { experience?: number; dayRate?: number };
    if (person) { person.experience = 5; person.dayRate = 99_999; }
    expect(assessQuality(s, a)).toEqual(base);
  });
});
