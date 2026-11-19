// Your studio pictures in the world (src/engine/your-films.ts; the owner, November 18, 2026: "Release my picture into the
// world with box office and awards"). Labelled fixtures: a finished studio picture written into the save as jobs.ts leaves
// it, and delivered films of yours as tests/studio-projects.test.ts makes them. Each test changes an input and checks the
// outcome moves.
import { describe, expect, it } from 'vitest';
import { createProject, processUntil, setFinanceTarget, DAY } from './engine-api';
import { roleCraft, honoursIn } from '../src/engine/reputation';
import { lifetimeGross, pictureCredits, pictureEligible, pictureQuality, yourBoxOffice, yourFilmId, yourWorldFilms } from '../src/engine/your-films';
import { addDaysToKey, dateKey } from '../src/engine/time';
import { schedule } from '../src/engine/state';
import type { OutsideJob } from '../src/engine/jobs';
import type { Category, Institution } from '../src/engine/awards';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife, writePitch } from './helpers';

function film(s: GameState, score: number, title: string): Project {
  const p = createProject(s, { title, scenarioId: 'low', axes: { format: 'feature', medium: 'live-action', targetRuntimeMin: 100 } });
  const q = buildProject(s, { title: 'tmp', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
  p.characters = q.characters; p.scenes = q.scenes; writePitch(p);
  s.projects = s.projects.filter((x) => x.id !== q.id);
  approve(s, p); setFinanceTarget(p, 400_000);
  p.delivered = { at: s.now, runtimeMin: 100 }; p.phase = 'delivered'; p.quality = { reception: score, script: score, direction: score } as Project['quality'];
  return p;
}
/** A Toho picture you directed, finished, out on `released` (labelled fixture). */
function picture(s: GameState, released: string, quality: number, over: Partial<NonNullable<OutsideJob['studio']>> = {}): OutsideJob {
  s.industry = { horizon: '2026-11-10', builtAt: '2026-11-10T00:00:00Z', series: {}, studios: [{ c: 'company:toho', name: 'TOHO', n: 20, g: [['Drama', 5]], m: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], ann: {} }] };
  const j = {
    id: 'made', role: 'directing', production: 'Untitled Godzilla Film', company: 'TOHO', part: 'Directing the picture', material: '', requirement: '', dayRate: 0,
    days: ['2026-02-02'], placeId: s.locationId, zone: 'Asia/Tokyo', status: 'done', offeredAt: s.now, answerBy: s.now, attended: ['2026-02-02'], missed: [],
    studio: { fee: 450_000, franchise: 'Godzilla', genre: 'Drama', genres: ['Science Fiction', 'Action'], budget: 15_000_000, title: 'Godzilla: Retribution', released, quality, ...over },
  } as OutsideJob;
  (s.jobs ??= []).push(j);
  return j;
}
const cat = (over: Partial<Category>): Category => ({ id: 'x', name: 'X', recipient: 'director', formats: ['feature'], judging: 'jury', slots: 5, competitive: true, fee: 0, ...over } as Category);
const AWARD = { id: 'a', kind: 'award' } as Institution;

describe('your studio pictures in the world', () => {
  it('is as good as your craft in the role, give or take a picture\'s luck', () => {
    const s = startLife('yf-quality');
    film(s, 60, 'One'); film(s, 62, 'Two');
    const j = picture(s, '2026-06-01', 0);
    const low = pictureQuality(s, j);
    const t = startLife('yf-quality');
    film(t, 90, 'One'); film(t, 92, 'Two');
    expect(pictureQuality(t, picture(t, '2026-06-01', 0))).toBeGreaterThan(low);
    expect(Math.abs(low - 61)).toBeLessThanOrEqual(30);
  });

  it('plays fourteen weeks from its opening, grossing more the better it is; nothing before it opens', () => {
    const s = startLife('yf-box');
    const j = picture(s, dateKey(s.now + 10 * DAY, 'UTC'), 76);
    expect(yourBoxOffice(s, j).weeks).toEqual([]);
    s.now += 40 * DAY;
    const bo = yourBoxOffice(s, j);
    expect(bo.weeks.length).toBe(4);
    expect(bo.weeks[0].gross).toBeGreaterThan(bo.weeks[1].gross);
    expect(bo.running).toBe(true);
    s.now += 200 * DAY;
    const all = yourBoxOffice(s, j);
    expect([all.weeks.length, all.running, all.total]).toEqual([14, false, all.lifetime]);
    // Better made, more taken; and a franchise's following lifts it.
    expect(lifetimeGross({ ...j, studio: { ...j.studio!, quality: 90 } })).toBeGreaterThan(lifetimeGross(j));
    expect(lifetimeGross(j)).toBeGreaterThan(lifetimeGross({ ...j, studio: { ...j.studio!, franchise: undefined } }));
  });

  it("is held to a category's rules: no festivals, no debuts, its studio's country and language, a sequel's screenplay adapted", () => {
    const s = startLife('yf-rules');
    const j = picture(s, '2026-06-01', 76);
    const ok = (c: Partial<Category>, inst = AWARD) => pictureEligible(s, j, inst, cat(c), 120);
    expect(ok({})).toBe(true);
    expect(ok({}, { id: 'f', kind: 'festival' } as Institution)).toBe(false);
    expect(ok({ kind: 'section' })).toBe(false);
    expect(ok({ need: ['debut'] })).toBe(false);
    expect(ok({ need: ['indie'] })).toBe(false);
    expect(ok({ need: ['non-english'] })).toBe(true); // TOHO is Japanese
    expect(ok({ need: ['jp'] })).toBe(true);
    expect(ok({ need: ['non-jp'] })).toBe(false);
    expect(ok({ need: ['europe'] })).toBe(false);
    expect(ok({ need: ['fantasy'] })).toBe(true);
    expect(ok({ material: 'adapted' })).toBe(true);
    expect(ok({ material: 'original' })).toBe(false);
    expect(pictureEligible(s, { ...j, studio: { ...j.studio!, franchise: undefined } }, AWARD, cat({ material: 'original' }), 120)).toBe(true);
  });

  it('counts in your craft and honours in the role once it is out, and is one of the world\'s films in its window', () => {
    const s = startLife('yf-rep');
    film(s, 70, 'One'); film(s, 72, 'Two');
    const j = picture(s, dateKey(s.now + 30 * DAY, 'UTC'), 88);
    const before = roleCraft(s, 'directing').works.length;
    expect(yourWorldFilms(s, '2026-01-01', '2027-12-31').map((f) => f.id)).toEqual([yourFilmId(j)]);
    s.now += 31 * DAY;
    expect(roleCraft(s, 'directing').works.map((w) => w.title)).toContain('Godzilla: Retribution');
    expect(roleCraft(s, 'directing').works.length).toBe(before + 1);
    expect(roleCraft(s, 'writing').works.map((w) => w.title)).not.toContain('Godzilla: Retribution');
    j.studio!.honours = [{ status: 'won', category: 'Best Director', recipient: 'director', event: 'An Awards 2027', at: s.now }, { status: 'nominated', category: 'Visual Effects', recipient: 'craft', event: 'An Awards 2027', at: s.now }];
    expect(honoursIn(s, 'directing').map((h) => [h.status, h.category])).toEqual([['won', 'Best Director']]); // a craft award isn't the director's
  });

  it('has its people: you in your role, the rest invented until it is cast (your-film-cast.test.ts)', () => {
    const s = startLife('yf-people');
    const j = picture(s, '2026-06-01', 76);
    const { cast, crew } = pictureCredits(s, j);
    expect(cast).toHaveLength(8);
    expect(crew.find((c) => c.job === 'Director')!.name).toBe(s.character.name);
    expect(crew.find((c) => c.job === 'Screenplay')!.name).not.toBe(s.character.name);
  });

  it('opens on its day with the news of its first week, once the work is done', () => {
    const s = startLife('yf-open');
    const j = picture(s, addDaysToKey(dateKey(s.now, 'Asia/Tokyo'), 20), 76);
    // As jobs.ts schedules it when the last day is worked.
    const [y, m, d] = j.studio!.released!.split('-').map(Number);
    schedule(s, Date.UTC(y, m - 1, d, 1), 'your-film-release', { jobId: 'made' }, { attention: 'notify', priority: 55, id: 'your-film-release:made' });
    processUntil(s, s.now + 25 * DAY, 'tick', 1_000_000);
    const news = s.log.find((l) => l.text.includes('opens today'))!;
    expect(news.text.startsWith('Godzilla: Retribution, which you directed for TOHO, opens today.')).toBe(true);
    expect(news.text).toContain('in its first week (simulated).');
    expect(news.route).toEqual({ view: 'title', ref: yourFilmId(j) });
  });
});
