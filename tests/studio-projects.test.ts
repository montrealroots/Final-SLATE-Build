// Studio projects (src/engine/studio-projects.ts; the owner, November 18, 2026): a studio asks you to direct or write its
// own next picture, the next entry in a franchise it owns where it has one. Every studio and franchise here is a labelled
// fixture; the fee is the guild minimum times the game's multiple. Each test changes an input and checks the outcome moves.
import { describe, expect, it } from 'vitest';
import { DAY, createProject, processUntil, setFinanceTarget } from './engine-api';
import { acceptFirstLook, offerFirstLook, scheduleFirstLookCheck } from '../src/engine/first-look';
import { acceptJob, acceptRefusal } from '../src/engine/jobs';
import { franchiseName, studioPitch, studioProjectOffer, studioScale, STUDIO_FEES } from '../src/engine/studio-projects';
import { personalPostings } from '../src/engine/personal';
import { DGA_HIGH_BUDGET_WEEK, WGA_SCREENPLAY } from '../src/engine/union';
import { dateKey } from '../src/engine/time';
import type { StudioProfile } from '../src/engine/studios';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife, writePitch } from './helpers';

const EVEN = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const FAST: StudioProfile = { c: 'company:fixture-fast', name: 'Overdrive Pictures (Fixture)', n: 6, g: [['Action', 10], ['Drama', 6], ['Thriller', 6]], m: EVEN, ann: {}, fr: [{ name: 'The Long Road (Fixture) Collection', entries: 9, last: '2026-06-01', budget: 340_000_000, budgetOf: 'Long Road X (2023)' }], mb: 30_000_000 };
const PLAIN: StudioProfile = { c: 'company:fixture-plain', name: 'Quiet Rooms (Fixture)', n: 4, g: [['Drama', 10], ['Romance', 4]], m: EVEN, ann: {} };
const BIG: StudioProfile = { c: 'company:fixture-big', name: 'Meridian (Fixture)', n: 12, g: [['Drama', 6], ['Action', 6]], m: EVEN, ann: {}, fr: [{ name: 'Northern Lights Collection', entries: 3, last: '2025-03-01' }] };

function world(tag: string, studios: StudioProfile[]): GameState {
  const s = startLife(tag, 'gb-london', { savings: 2_000 });
  s.industry = { horizon: '2026-11-10', builtAt: '2026-11-10T00:00:00Z', series: {}, studios };
  return s;
}
/** A delivered drama of yours (labelled fixture), received as given. */
function record(s: GameState, reception: number, title: string): Project {
  const p = createProject(s, { title, scenarioId: 'low', axes: { format: 'feature', medium: 'live-action', targetRuntimeMin: 90 } });
  const q = buildProject(s, { title: 'tmp', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
  p.characters = q.characters; p.scenes = q.scenes; writePitch(p);
  s.projects = s.projects.filter((x) => x.id !== q.id);
  p.axes.genres = [{ id: 'drama', emphasis: 'primary' }, { id: 'action', emphasis: 'secondary' }];
  approve(s, p); setFinanceTarget(p, 400_000);
  // A delivery records how its script and direction were judged too (reputation.ts reads them): the same score here.
  p.delivered = { at: s.now, runtimeMin: 90 }; p.phase = 'delivered'; p.quality = { reception, script: reception, direction: reception } as Project['quality'];
  return p;
}
const proven = (tag: string, studios: StudioProfile[]) => { const s = world(tag, studios); record(s, 66, 'An Earlier Film'); record(s, 72, 'A Second Film'); return s; };
const inForce = (t: [string, number][], d: string) => [...t].reverse().find(([f]) => f <= d)![1];

describe('a studio project', () => {
  it("names a franchise as people say it", () => {
    expect(['The Batman Collection', 'Superman (DCU) Collection', 'The Fast and the Furious Collection', 'Days of Thunder Colletion', 'Heart Eyes - Collection', 'Minecraft Movie Collection', 'The Lego Movie Collection', 'Scary Movie Collection'].map(franchiseName))
      .toEqual(['Batman', 'Superman', 'Fast and the Furious', 'Days of Thunder', 'Heart Eyes', 'Minecraft', 'Lego', 'Scary Movie']);
  });

  it("is the next entry in the best-fitting studio's own franchise, paid what the trade reports, placed by the franchise's real budget", () => {
    const s = proven('sp-franchise', [FAST, PLAIN]);
    const j = studioProjectOffer(s)!;
    expect([j.company, j.role, j.production, j.studio?.franchise]).toEqual([FAST.name, 'directing', 'Untitled Long Road Film', 'Long Road']);
    // A $340M franchise is at the top of the scale: the top of a first studio feature's range ($450,000 to $750,000).
    expect([j.studio!.fee, j.studio!.budget, j.studio!.first]).toEqual([STUDIO_FEES.directing.first[1], 340_000_000, true]);
    // A tentpole's shoot: 18 weeks, paid by the day.
    expect(j.days).toHaveLength(90);
    expect(j.dayRate).toBe(Math.round(750_000 / 90));
    expect(studioPitch(j)).toMatch(/^Overdrive Pictures \(Fixture\) wants you to direct the next Long Road film: \$750,000 for 18 weeks of shooting, from /);
    expect(j.material).toBe("The Long Road films so far, and the studio's notes for the next one.");
    expect(studioScale(j)).toBe("A picture of about $340,000,000, as Long Road X (2023) cost. The fee is what studios pay for a director's first studio picture, as the trade reports it, before any share of the profits.");
  });

  it("pays more for a second studio picture, in your record's range, and less for a smaller budget", () => {
    const s = proven('sp-second', [FAST]);
    const first = studioProjectOffer(s)!;
    (s.jobs ??= []).push({ ...first, id: 'done-before', status: 'done', offeredAt: s.now - 200 * DAY });
    const second = studioProjectOffer(s)!;
    // A record past its start (proven): $1M to $2M, at the top for a $340M picture.
    expect([second.studio!.first, second.studio!.fee]).toEqual([false, STUDIO_FEES.directing.proven[1]]);
    // A $40M franchise: a quarter of the way up, on a log scale from $20M to $300M; and eight weeks of shooting.
    const t = proven('sp-small', [{ ...FAST, fr: [{ ...FAST.fr![0], budget: 40_000_000 }] }]);
    const small = studioProjectOffer(t)!;
    expect(small.studio!.fee).toBe(Math.round((450_000 + 300_000 * (Math.log(2) / Math.log(15))) / 1000) * 1000);
    expect(small.days).toHaveLength(40);
    // A franchise of one film so far is said as one.
    const one = studioProjectOffer(proven('sp-one', [{ ...FAST, fr: [{ ...FAST.fr![0], entries: 1 }] }]))!;
    expect(one.material).toBe("The Long Road film, and the studio's notes for the next one.");
  });

  it("is an original in the genre the studio makes most where it has no live franchise; with no budget recorded, the middle of the range", () => {
    const s = proven('sp-original', [PLAIN]);
    const j = studioProjectOffer(s)!;
    expect([j.company, j.production, j.studio?.franchise, j.studio?.budget]).toEqual([PLAIN.name, 'Untitled Quiet Rooms (Fixture) Drama Picture', undefined, undefined]);
    expect(studioPitch(j)).toContain('wants you to direct its next drama picture');
    expect(j.studio!.fee).toBe(600_000);
    expect(studioScale(j)).toMatch(/^Its budget isn't recorded\./);
  });

  it('never pays under the guild minimum', () => {
    // The survey's first-timer screenplay range ($75,000 to $100,000) is under the WGA's screenplay minimum, which governs;
    // DGA's ten guaranteed weeks are under a first studio feature's range, which governs.
    const day = dateKey(Date.now(), 'UTC');
    expect(inForce(WGA_SCREENPLAY, day)).toBeGreaterThan(STUDIO_FEES.writing.first[1]);
    expect(inForce(DGA_HIGH_BUDGET_WEEK, day) * 10).toBeLessThan(STUDIO_FEES.directing.first[0]);
  });

  it('never comes to a record just starting, nor twice in six months', () => {
    const start = world('sp-start', [FAST]);
    record(start, 66, 'An Earlier Film');
    expect(studioProjectOffer(start)).toBeNull();
    const s = proven('sp-gap', [FAST]);
    (s.jobs ??= []).push(studioProjectOffer(s)!);
    expect(studioProjectOffer(s)).toBeNull();
    processUntil(s, s.now + 181 * DAY, 'tick', 1_000_000);
    expect(studioProjectOffer(s)).not.toBeNull();
  });

  it("comes from the studio of your overall deal, whose work you may take while it has your services", () => {
    const s = proven('sp-overall', [FAST, BIG]);
    const deal = offerFirstLook(s)!;
    const ours = [deal, ...(s.firstLooks ?? []).filter((x) => x.id !== deal.id)].find((x) => x.terms.overall)!;
    acceptFirstLook(s, ours.id);
    const j = studioProjectOffer(s)!;
    expect(j.company).toBe(ours.name);
    expect(j.studio?.franchise).toBe('Northern Lights');
    s.jobs = [j];
    expect(acceptRefusal(s, j.id)).toBeNull();
  });

  it('arrives by itself after a delivery, and once taken is worked, paid and credited like any job', () => {
    const s = proven('sp-arrives', [FAST]);
    scheduleFirstLookCheck(s, s.projects[0]);
    processUntil(s, s.now + 31 * DAY, 'tick', 1_000_000);
    const j = (s.jobs ?? []).find((x) => x.studio)!;
    expect(j.status).toBe('offered');
    expect(s.log.some((x) => x.text.startsWith(`${FAST.name} wants you to`))).toBe(true);
    acceptJob(s, j.id);
    processUntil(s, s.now + 220 * DAY, 'tick', 5_000_000); // eight weeks out, then eighteen weeks of shooting
    expect(j.status).toBe('done');
    const paid = personalPostings(s).filter((x) => x.kind === 'paid-work' && x.key === `job:${j.id}`).reduce((a, x) => a + x.amount, 0);
    // The fee itself, for the days worked: never a rounded day rate times the days.
    expect(paid).toBe(Math.round((j.studio!.fee * j.attended.length) / j.days.length));
    if (j.attended.length === j.days.length) expect(paid).toBe(j.studio!.fee);
    expect(j.attended.length).toBeGreaterThan(0);
  });
});
