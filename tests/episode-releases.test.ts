// Episode release schedules (November 10, 2026): presets that make editable dates, stable ids, planned against
// released, events replaced without duplicates, the calendar, a schedule per release, the airing and per-episode award
// rules, snapshots, and the v8 -> v9 migration. Fixtures are labelled: the series is built directly as delivered.
import { describe, expect, it } from 'vitest';
import {
  DAY, announceEdition, checkEligibility, institution, planRelease, processUntil, upcomingCommitments,
} from '../src/engine';
import { airings, episodeDateProblem, orderNotes, presetDates, setEpisodeDates } from '../src/engine/episode-releases';
import { scheduleChangeEffects } from '../src/engine/release-schedule';
import { submitEntry } from '../src/engine/awards-actions';
import { episodeAirDates } from '../src/engine/awards-rules';
import { cancelRelease } from '../src/engine/finish';
import { deserialize, migrate, serialize } from '../src/engine/save';
import { formatDateKey, localToInstant } from '../src/engine/time';
import type { Credit, Edition, GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

const at = (zone: string, date: string, hh = 9) => { const [y, m, d] = date.split('-').map(Number); return localToInstant(zone, y, m, d, hh).instant; };
const ed = (s: GameState, id: string): Edition => s.editions.find((e) => e.id === id)!;
const cat = (e: Edition, id: string) => institution(e.institutionId).categories.find((c) => c.id === id)!;
const credit = (id: string, contribution: string, roleId: string, episodes: number[] | 'all' = 'all', person = `p-${id}`): Credit => ({ id, person, personName: `Person ${id}`, contribution, roleId, episodes, billing: 1 });

/** A delivered six-episode drama based in London (labelled fixture: delivery and credits set directly). */
function series(s: GameState, base = 'gb-london', episodes = 6): Project {
  const p = buildProject(s, { title: 'Tidal Ward', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'A', patch: { roleSize: 'lead' } }], [{ place: 'Ward', chars: ['A'], minutes: 2 }]);
  approve(s, p);
  p.axes.format = 'series';
  p.axes.episodeCount = episodes;
  p.axes.basePlaceId = base;
  p.delivered = { at: s.now - DAY, runtimeMin: 50 * episodes };
  p.credits = [credit('d1', 'Directed By', 'director', [1, 2, 3]), credit('d2', 'Directed By', 'director', [4, 5, 6]), credit('pr', 'Produced By', 'producer')];
  return p;
}
const dates = (p: Project, i = 0) => p.releases[i].episodes!.map((e) => e.date);
const events = (s: GameState, releaseId: string) => s.events.filter((e) => (e.kind === 'release' || e.kind === 'episode-release') && e.payload.releaseId === releaseId).map((e) => `${e.kind}:${String(e.payload.date ?? '')}`).sort();

describe('presets make dates you can edit', () => {
  it('all at once, weekly, and several on the premiere then weekly; each episode has a stable id', () => {
    expect(presetDates('all', '2026-12-01', 4)).toEqual(['2026-12-01', '2026-12-01', '2026-12-01', '2026-12-01']);
    expect(presetDates('weekly', '2026-12-01', 4)).toEqual(['2026-12-01', '2026-12-08', '2026-12-15', '2026-12-22']);
    expect(presetDates('premiere-weekly', '2026-12-01', 5, 3)).toEqual(['2026-12-01', '2026-12-01', '2026-12-01', '2026-12-08', '2026-12-15']);
    const s = startLife('er-preset');
    s.now = at('Europe/London', '2026-11-20');
    const p = series(s);
    const r = planRelease(s, p, { route: 'streaming', date: '2026-12-01', territories: ['GB'], pattern: 'premiere-weekly', onPremiere: 2 });
    expect(r.pattern).toBe('premiere-weekly');
    expect(r.episodes!.map((e) => `${e.id}:${e.date}:${e.status}`)).toEqual([
      `${r.id}-e1:2026-12-01:planned`, `${r.id}-e2:2026-12-01:planned`, `${r.id}-e3:2026-12-08:planned`,
      `${r.id}-e4:2026-12-15:planned`, `${r.id}-e5:2026-12-22:planned`, `${r.id}-e6:2026-12-29:planned`,
    ]);
    // A release without a schedule comes out as before: weekly on television, all at once online.
    const tv = planRelease(s, series(s), { route: 'broadcast', date: '2026-12-02', territories: ['GB'], distributor: 'Channel' });
    expect([tv.pattern, tv.episodes![5].date]).toEqual(['weekly', '2027-01-06']);
  });

  it('custom dates with a break make a split season; dates in the past or not on the release date are refused, and story order is advised', () => {
    const s = startLife('er-custom');
    s.now = at('Europe/London', '2026-11-20');
    const p = series(s);
    const split = ['2026-12-01', '2026-12-08', '2026-12-15', '2027-03-02', '2027-03-09', '2027-03-16'];
    const r = planRelease(s, p, { route: 'streaming', date: '2026-12-01', territories: ['GB'], episodeDates: split });
    expect([r.pattern, dates(p)]).toEqual(['custom', split]);
    expect(() => planRelease(s, series(s), { route: 'streaming', date: '2026-12-01', territories: ['GB'], episodeDates: ['2026-12-02', ...split.slice(1)] })).toThrow('The release date is the day its earliest episode comes out.');
    // Story order is advice since November 10, 2026 (after #59): episode 3 before episode 2 is allowed, and said.
    expect(episodeDateProblem(s, p, r.id, ['2026-12-01', '2026-12-08', '2026-12-01', ...split.slice(3)])).toBeNull();
    expect(orderNotes(['2026-12-01', '2026-12-08', '2026-12-01'])).toEqual(['Episode 3 would come out before episode 2: viewers meet them out of story order. That suits episodes that stand alone; a serial story may confuse.']);
    expect(episodeDateProblem(s, p, r.id, ['2026-11-01', ...split.slice(1)])).toBe("Episode 1 can't come out before today.");
    expect(episodeDateProblem(s, p, r.id, ['2026-12-01', '2026-02-30', ...split.slice(2)])).toBe('Choose a real date for episode 2.');
    expect(episodeDateProblem(s, p, r.id, split.slice(1))).toBe('Give a date for each of the 6 episodes.');
    expect(s.projects.filter((x) => x.title === 'Tidal Ward').flatMap((x) => x.releases).length).toBe(1); // the refused plan left nothing behind
  });
});

describe('planned and released', () => {
  it('each episode comes out on its day; one event per day, replaced when dates move, never doubled', () => {
    const s = startLife('er-events');
    s.now = at('Europe/London', '2026-11-20');
    const p = series(s);
    const r = planRelease(s, p, { route: 'streaming', date: '2026-12-01', territories: ['GB'], pattern: 'premiere-weekly', onPremiere: 2 });
    expect(events(s, r.id)).toEqual(['episode-release:2026-12-08', 'episode-release:2026-12-15', 'episode-release:2026-12-22', 'episode-release:2026-12-29', 'release:']);
    processUntil(s, at('Europe/London', '2026-12-09'), 'tick', 100_000);
    expect(r.episodes!.map((e) => e.status)).toEqual(['released', 'released', 'released', 'planned', 'planned', 'planned']);
    expect(r.status).toBe('released');
    expect(s.log.some((l) => l.text === 'Episode 3 of Tidal Ward is out today on streaming.')).toBe(true);
    // A delay moves what is still to come. What came out stays, and moving it is refused.
    const later = ['2026-12-01', '2026-12-01', '2026-12-08', '2027-01-05', '2027-01-12', '2027-01-12'];
    expect(() => setEpisodeDates(s, p, r.id, ['2026-12-01', '2026-12-01', '2026-12-10', ...later.slice(3)])).toThrow('Episode 3 came out on December 8, 2026. A release that has happened stays as it was.');
    setEpisodeDates(s, p, r.id, later);
    expect(dates(p)).toEqual(later);
    expect(r.date).toBe('2026-12-01');
    expect(events(s, r.id)).toEqual(['episode-release:2027-01-05', 'episode-release:2027-01-12']);
    setEpisodeDates(s, p, r.id, later); // the same dates again: nothing to change, nothing added
    expect(events(s, r.id)).toEqual(['episode-release:2027-01-05', 'episode-release:2027-01-12']);
    processUntil(s, at('Europe/London', '2027-01-13'), 'tick', 100_000);
    expect(r.episodes!.every((e) => e.status === 'released')).toBe(true);
    expect(s.log.filter((l) => l.text === 'Episodes 5 to 6 of Tidal Ward are out today on streaming.').length).toBe(1);
  });

  it('a premiere still to come moves the release day and an exclusive window with it; cancelling removes every event', () => {
    const s = startLife('er-premiere');
    s.now = at('Europe/London', '2026-11-20');
    const p = series(s);
    const r = planRelease(s, p, { route: 'streaming', date: '2026-12-01', territories: ['GB'], pattern: 'weekly' });
    p.offers.push({ id: 'o1', distributor: 'Northlight', route: 'streaming', minimumGuarantee: 0, territories: ['GB'], releaseWindowDays: 10, expiresAt: 0, status: 'accepted', exclusive: true, exclusiveUntil: '2027-12-01' } as Project['offers'][number]);
    r.offerId = 'o1'; // labelled fixture: an exclusive contract behind this release
    setEpisodeDates(s, p, r.id, presetDates('weekly', '2026-12-15', 6));
    expect(r.date).toBe('2026-12-15');
    expect(p.offers[0].exclusiveUntil).toBe('2027-12-15');
    expect(events(s, r.id)[0]).toBe('episode-release:2026-12-22');
    expect(events(s, r.id)).toContain('release:');
    expect(events(s, r.id).length).toBe(6);
    r.offerId = undefined;
    cancelRelease(s, p, r.id);
    expect(events(s, r.id)).toEqual([]);
  });

  it('the calendar shows each day episodes come out, and which have', () => {
    const s = startLife('er-calendar');
    s.now = at('Europe/London', '2026-11-20');
    const p = series(s, 'gb-london', 3);
    planRelease(s, p, { route: 'broadcast', date: '2026-12-01', territories: ['GB'], distributor: 'Channel', pattern: 'premiere-weekly', onPremiere: 2 });
    const cal = () => upcomingCommitments(s, at('Europe/London', '2026-11-30'), at('Europe/London', '2026-12-31')).filter((c) => c.label.startsWith('Tidal Ward')).map((c) => c.label);
    expect(cal()).toEqual(['Tidal Ward: Episodes 1 to 2 on television in GB', 'Tidal Ward: Episode 3 on television in GB']);
    processUntil(s, at('Europe/London', '2026-12-02'), 'tick', 100_000);
    expect(cal()).toEqual(['Tidal Ward: Episodes 1 to 2 on television in GB (Out)', 'Tidal Ward: Episode 3 on television in GB']);
  });
});

describe('the calendar with releases in several countries on one day', () => {
  it('each is its own entry, named by where it opens (CI run 151 found two the same, so the list repeated a key)', () => {
    const s = startLife('er-two-countries');
    s.now = at('Europe/London', '2026-11-20');
    const p = series(s);
    p.axes.format = 'feature';
    p.axes.episodeCount = 1;
    for (const t of ['FR', 'DE']) p.releases.push({ id: `r-${t}`, route: 'theatrical', date: '2026-12-02', territories: [t], distributor: 'D', note: '', status: 'planned' });
    const labels = upcomingCommitments(s, at('Europe/London', '2026-12-01'), at('Europe/London', '2026-12-03')).filter((c) => c.label.startsWith('Tidal Ward')).map((c) => c.label);
    expect(labels).toEqual(['Tidal Ward: Release in cinemas in FR', 'Tidal Ward: Release in cinemas in DE']);
  });
});

describe('a schedule for each release', () => {
  it('each territory and platform keeps its own dates; the rules read the earliest for each episode', () => {
    const s = startLife('er-territories');
    s.now = at('Europe/London', '2026-11-20');
    const p = series(s, 'gb-london', 4);
    planRelease(s, p, { route: 'broadcast', date: '2026-12-01', territories: ['GB'], distributor: 'Channel', pattern: 'weekly' });
    planRelease(s, p, { route: 'streaming', date: '2026-12-10', territories: ['US'], pattern: 'all' });
    expect(dates(p, 0)).toEqual(['2026-12-01', '2026-12-08', '2026-12-15', '2026-12-22']);
    expect(dates(p, 1)).toEqual(['2026-12-10', '2026-12-10', '2026-12-10', '2026-12-10']);
    expect(airings(p).map((a) => `${a.number}:${a.date}:${a.countries.join('')}`)).toEqual(['1:2026-12-01:GB', '2:2026-12-08:GB', '3:2026-12-10:US', '4:2026-12-10:US']);
    expect(episodeAirDates(p).every((a) => a.planned)).toBe(true);
  });
});

describe('awards read the schedule', () => {
  it('a split season across the year end: which episodes count, provisional until they air, and disqualified if a delay moves them out', () => {
    const s = startLife('er-iemmy');
    s.now = at('America/New_York', '2026-12-09'); // entries opened December 8
    const e27 = ed(s, 'international-emmys-2027'); // episodes aired January 1 to December 31, 2026
    const p = series(s);
    const r = planRelease(s, p, { route: 'streaming', date: '2026-12-10', territories: ['GB'], episodeDates: ['2026-12-10', '2026-12-14', '2026-12-17', '2026-12-22', '2027-03-02', '2027-03-09'] });
    let el = checkEligibility(s, p, e27, cat(e27, 'drama'));
    expect([el.eligible, el.provisional, el.provisionalNote]).toEqual([true, true, 'Entered provisionally: 4 of the 4 episodes it counts between January 1, 2026 and December 31, 2026 are still to come out.']);
    // A break after three makes it a hanging season: three and three.
    const hanging = ['2026-12-10', '2026-12-14', '2026-12-17', '2027-03-02', '2027-03-09', '2027-03-16'];
    expect(scheduleChangeEffects(s, p, r.id, hanging)).toContain('Episode 4 moves from December 22, 2026 to March 2, 2027.');
    const entry = submitEntry(s, p, e27.id, 'drama');
    expect(entry.snapshot!.airing!.map((a) => `${a.number}:${a.date}:${a.status}`)).toEqual(['1:2026-12-10:planned', '2:2026-12-14:planned', '3:2026-12-17:planned', '4:2026-12-22:planned', '5:2027-03-02:planned', '6:2027-03-09:planned']);
    // Delaying episodes 2 to 4 into 2027 leaves one of six in 2026: the preview says so before anything changes.
    const delayed = ['2026-12-10', '2027-01-05', '2027-01-12', '2027-01-19', '2027-03-02', '2027-03-09'];
    const effects = scheduleChangeEffects(s, p, r.id, delayed);
    expect(effects).toEqual([
      'Episode 2 moves from December 14, 2026 to January 5, 2027.', 'Episode 3 moves from December 17, 2026 to January 12, 2027.', 'Episode 4 moves from December 22, 2026 to January 19, 2027.',
      'Your calendar shows the new days, and each episode comes out on its own day.',
      "Your entry for Drama Series at the International Emmy Awards 2027 would no longer qualify: 1 of its 6 episodes air between January 1, 2026 and December 31, 2026; a season counts in the year most of its episodes aired. It would be turned down when entries are reviewed, and the fee isn't refunded.",
    ]);
    expect(dates(p)).toEqual(['2026-12-10', '2026-12-14', '2026-12-17', '2026-12-22', '2027-03-02', '2027-03-09']); // the preview changed nothing
    // Once four have aired, the entry rests on aired episodes, not plans.
    processUntil(s, at('America/New_York', '2026-12-23'), 'tick', 100_000);
    el = checkEligibility(s, p, e27, cat(e27, 'drama'));
    expect([el.eligible, el.provisional]).toEqual([true, false]);
    expect(entry.snapshot!.airing![0].status).toBe('planned'); // what it was entered with stays
  });

  it('a delay before entries are reviewed gets the entry turned down with the reason; the same season on its dates is accepted', () => {
    const run = (delay: boolean) => {
      const s = startLife('er-review');
      s.now = at('America/New_York', '2026-12-09');
      const e27 = ed(s, 'international-emmys-2027');
      const p = series(s);
      const r = planRelease(s, p, { route: 'streaming', date: '2026-12-10', territories: ['GB'], pattern: 'weekly' }); // December 10 to 31: four of six in 2026
      const entry = submitEntry(s, p, e27.id, 'drama');
      expect(entry.reason).toBe('Entered provisionally: 4 of the 4 episodes it counts between January 1, 2026 and December 31, 2026 are still to come out.');
      processUntil(s, at('America/New_York', '2026-12-11'), 'tick', 100_000);
      if (delay) setEpisodeDates(s, p, r.id, ['2026-12-10', '2027-01-05', '2027-01-12', '2027-01-19', '2027-01-26', '2027-02-02']);
      processUntil(s, e27.deadline + 1, 'tick', 100_000);
      return entry;
    };
    const kept = run(false);
    const moved = run(true);
    expect(kept.status).toBe('accepted');
    expect([moved.status, moved.reason]).toEqual(['rejected', '1 of its 6 episodes air between January 1, 2026 and December 31, 2026; a season counts in the year most of its episodes aired.']);
  });

  it('an entry accepted on episodes still to come is disqualified before judging when they move out of the window', () => {
    const s = startLife('er-dq');
    s.now = at('America/New_York', '2026-12-09');
    const e27 = ed(s, 'international-emmys-2027');
    const p = series(s);
    const r = planRelease(s, p, { route: 'streaming', date: '2026-12-10', territories: ['GB'], pattern: 'weekly' });
    const entry = submitEntry(s, p, e27.id, 'drama');
    // Labelled fixture: the review is run now, as the deadline would, so the entry is accepted while its episodes are still to come.
    entry.status = 'accepted';
    setEpisodeDates(s, p, r.id, ['2026-12-10', '2027-01-05', '2027-01-12', '2027-01-19', '2027-01-26', '2027-02-02']);
    announceEdition(s, e27);
    expect(entry.status).toBe('disqualified');
    expect(entry.reason).toBe("Disqualified: 1 of its 6 episodes air between January 1, 2026 and December 31, 2026; a season counts in the year most of its episodes aired. The entry fee isn't refunded.");
  });

  it('an episode entered on its own qualifies by its own date: episode 2 in the window, episode 5 after it', () => {
    const s = startLife('er-episode', 'us-los-angeles');
    const e27 = ed(s, 'emmys-2027');
    const { to } = e27.eligibility;
    const day = (k: string, n: number) => { const d = new Date(`${k}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    s.now = at('America/Los_Angeles', day(to, -30));
    const p = series(s, 'us-los-angeles');
    const split = [day(to, -21), day(to, -14), day(to, -7), day(to, 30), day(to, 37), day(to, 44)];
    planRelease(s, p, { route: 'streaming', date: split[0], territories: ['US'], episodeDates: split });
    const directing = cat(e27, 'directing');
    const two = checkEligibility(s, p, e27, directing, undefined, undefined, 2);
    const five = checkEligibility(s, p, e27, directing, undefined, undefined, 5);
    expect([two.eligible, two.provisional]).toEqual([true, true]);
    expect(five.eligible).toBe(false);
    expect(five.reasons).toEqual([`Episode 5 comes out in the United States on ${formatDateKey(split[4])}; it needs to come out between June 1, 2026 and May 31, 2027.`]);
  });
});

describe('older saves', () => {
  it('a version 8 save gets the dates the rules assumed, marked assumed: out where they had passed, still to come with their events', () => {
    const s = startLife('er-migrate');
    s.now = at('Europe/London', '2026-12-16');
    const p = series(s);
    p.releases.push({ id: 'r-old', route: 'broadcast', date: '2026-12-01', territories: ['GB'], distributor: 'Channel', note: '', status: 'released' });
    p.releases.push({ id: 'r-gone', route: 'streaming', date: '2026-12-20', territories: ['US'], distributor: null, note: '', status: 'cancelled' });
    const e27 = ed(s, 'international-emmys-2027');
    e27.entries.push({ id: 'old-entry', projectId: p.id, categoryId: 'drama', submittedAt: s.now, status: 'accepted', recipients: [], fee: 0, reason: 'Entered provisionally: its first airing, on December 1, 2026, is still planned.' });
    const raw = JSON.parse(serialize(s)) as { version: number; state?: unknown };
    const v8 = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    v8.version = 8;
    const m = migrate(v8);
    const q = m.projects.find((x) => x.id === p.id)!;
    const old = q.releases.find((x) => x.id === 'r-old')!;
    expect(old.pattern).toBe('assumed');
    expect(old.episodes!.map((e) => `${e.id}:${e.date}:${e.status}:${e.assumed}`)).toEqual([
      'r-old-e1:2026-12-01:released:true', 'r-old-e2:2026-12-08:released:true', 'r-old-e3:2026-12-15:released:true',
      'r-old-e4:2026-12-22:planned:true', 'r-old-e5:2026-12-29:planned:true', 'r-old-e6:2027-01-05:planned:true',
    ]);
    expect(m.events.filter((e) => e.kind === 'episode-release' && e.payload.releaseId === 'r-old').map((e) => e.payload.date)).toEqual(['2026-12-22', '2026-12-29', '2027-01-05']);
    expect(q.releases.find((x) => x.id === 'r-gone')!.episodes!.every((e) => e.status === 'planned')).toBe(true);
    expect(m.events.some((e) => e.payload.releaseId === 'r-gone')).toBe(false);
    // The entry, its reason and its status are as they were.
    expect(m.editions.find((x) => x.id === e27.id)!.entries.find((x) => x.id === 'old-entry')).toEqual(e27.entries.find((x) => x.id === 'old-entry'));
    // Saved and opened again, it is the same.
    expect(deserialize(serialize(m)).projects.find((x) => x.id === p.id)!.releases).toEqual(q.releases);
    expect(raw.version).toBeDefined();
  });
});
