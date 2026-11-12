// Weekly audiences (the v3 package, 02; requirement V3-T01): each measure for what it is and never turned into another,
// figures that follow from what is out and how it was received, recorded once, and nothing paid by them.
import { describe, expect, it } from 'vitest';
import { DAY, RENEWAL_DECISION_DAYS, RENEWAL_WAIT_DAYS, acceptDistribution, processUntil, renewalStanding, scheduleRenewal } from './engine-api';
import {
  AUDIENCE_TAIL_WEEKS, BROADCAST_BASE, KEEP_BAR, METRICS, OPENING_BAR, STREAMING_BAR, STREAMING_BASE, STREAMING_DECAY, STREAMING_WEEKS_COUNTED, airingDeal, appeal, seasonAudience, audienceSummary, audienceWeekDates, lastAudienceWeek, observeWeek, recordAudienceWeek, retention, routeMetrics, showingsOf, weekOf, type Showing,
} from '../src/engine/audiences';
import { deserialize, serialize } from '../src/engine/save';
import type { AudienceObservation, DistributionOffer, GameState, Project } from '../src/engine/types';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';

const offer = (route: DistributionOffer['route']): DistributionOffer => ({ id: 'o1', distributor: 'Fixture Network', route, minimumGuarantee: 1000, territories: ['GB'], releaseWindowDays: 20, expiresAt: 0, status: 'accepted' });
const ep = (number: number, date: string, reception = 70, runtimeMin = 30): Showing => ({ number, date, reception, runtimeMin });
const see = (route: DistributionOffer['route'], week: number, showings: Showing[], territories = 1, seed = 7) => observeWeek(seed, 'p1', offer(route), week, '2027-01-04', showings, territories);

describe('the measures', () => {
  it('are three, each said for what it is, and each kind of release reports only its own', () => {
    expect(routeMetrics('broadcast')).toEqual(['viewers']);
    expect(routeMetrics('streaming')).toEqual(['hours', 'views']);
    expect(routeMetrics('digital')).toEqual([]);
    expect(routeMetrics('theatrical')).toEqual([]);
    expect(METRICS.viewers.says).toContain('People watching');
    expect(METRICS.views.says).toContain('It is not a number of people.');
    // A broadcast week never carries hours or views, and a streaming week never carries people.
    const shows = [ep(1, '2027-01-04'), ep(2, '2027-01-11')];
    expect(see('broadcast', 1, shows).map((x) => x.metric)).toEqual(['viewers']);
    expect(see('streaming', 1, shows).map((x) => x.metric)).toEqual(['hours', 'views']);
    expect(see('digital', 1, shows)).toEqual([]);
    expect(see('theatrical', 1, shows)).toEqual([]);
  });

  it('weeks count from the day it opened, seven days each', () => {
    expect([weekOf('2027-01-04', '2027-01-04'), weekOf('2027-01-04', '2027-01-10'), weekOf('2027-01-04', '2027-01-11'), weekOf('2027-01-04', '2027-03-01')]).toEqual([1, 1, 2, 9]);
    expect(audienceWeekDates('2027-01-04', 2)).toEqual({ from: '2027-01-11', to: '2027-01-17' });
  });
});

describe('a broadcast', () => {
  it('reports one figure an episode, in the week of its first showing, and none in a week without one', () => {
    const shows = [ep(1, '2027-01-04'), ep(2, '2027-01-11'), ep(3, '2027-01-25')];
    expect(see('broadcast', 1, shows)).toMatchObject([{ week: 1, from: '2027-01-04', to: '2027-01-10', metric: 'viewers', scope: 'episode', episode: 1, territories: 1 }]);
    expect(see('broadcast', 2, shows).map((x) => x.episode)).toEqual([2]);
    expect(see('broadcast', 3, shows)).toEqual([]);
    expect(see('broadcast', 4, shows).map((x) => x.episode)).toEqual([3]);
    // Two episodes shown in one week are two figures.
    expect(see('broadcast', 1, [ep(1, '2027-01-04'), ep(2, '2027-01-06')]).map((x) => x.episode)).toEqual([1, 2]);
    // A film shown once is one figure, of the title.
    expect(see('broadcast', 1, [{ number: null, date: '2027-01-04', reception: 70, runtimeMin: 95 }])).toMatchObject([{ scope: 'title', metric: 'viewers' }]);
  });

  it('draws by how the episode was received, reaches further in more territories, and keeps less after a weaker episode', () => {
    const one = (reception: number, territories = 1) => see('broadcast', 1, [ep(1, '2027-01-04', reception)], territories)[0].value;
    expect(one(30)).toBe(0);
    expect(one(55)).toBeGreaterThan(0);
    expect(one(80)).toBeGreaterThan(one(55));
    // Within the 5% either way the week's draw allows, and in whole thousands.
    expect(one(80)).toBeGreaterThanOrEqual(BROADCAST_BASE * 0.95 - 500);
    expect(one(80)).toBeLessThanOrEqual(BROADCAST_BASE * 1.05 + 500);
    expect(one(80) % 1000).toBe(0);
    expect(one(80, 4) / one(80)).toBeCloseTo(2, 1);
    expect([appeal(30), appeal(80), appeal(100)]).toEqual([0, 1, 1.4]);
    // The second episode keeps what the first one earned it: more after a strong opener than a weak one.
    const second = (first: number) => see('broadcast', 2, [ep(1, '2027-01-04', first), ep(2, '2027-01-11', 70)])[0].value;
    expect(second(90)).toBeGreaterThan(second(40));
    expect([retention(0), retention(50), retention(98), retention(100)]).toEqual([0.8, 0.86, 0.98, 0.98]);
  });

  it('is the same figure every time for the same world and week, and another world draws its own', () => {
    const shows = [ep(1, '2027-01-04')];
    expect(see('broadcast', 1, shows)).toEqual(see('broadcast', 1, shows));
    const worlds = new Set(Array.from({ length: 12 }, (_, i) => see('broadcast', 1, shows, 1, i + 1)[0].value));
    expect(worlds.size).toBeGreaterThan(1);
  });
});

describe('a streaming release', () => {
  it('reports hours for everything available and views as those hours over its running time, never people', () => {
    const all = [ep(1, '2027-01-04'), ep(2, '2027-01-04'), ep(3, '2027-01-04')];
    const [hours, views] = see('streaming', 1, all);
    expect(hours).toMatchObject({ metric: 'hours', scope: 'title' });
    expect(views).toMatchObject({ metric: 'views', scope: 'title' });
    // Three half-hour episodes are an hour and a half: views are hours over that, to the hundred.
    expect(views.value).toBe(Math.round(hours.value / 1.5 / 100) * 100);
    expect(hours.value % 1000).toBe(0);
  });

  it('all at once falls week by week; weekly, the hours come as the episodes do', () => {
    const atOnce = [1, 2, 3, 4].map((n) => ep(n, '2027-01-04'));
    const w = [1, 2, 3].map((week) => see('streaming', week, atOnce)[0].value);
    expect(w[1]).toBeLessThan(w[0]);
    expect(w[2]).toBeLessThan(w[1]);
    expect(w[1] / w[0]).toBeGreaterThan(STREAMING_DECAY * 0.9);
    expect(w[1] / w[0]).toBeLessThan(STREAMING_DECAY * 1.12);
    const weekly = [ep(1, '2027-01-04'), ep(2, '2027-01-11'), ep(3, '2027-01-18'), ep(4, '2027-01-25')];
    const first = see('streaming', 1, weekly)[0].value;
    // One episode is out in the first week, against four: about a quarter of the hours.
    expect(first / w[0]).toBeGreaterThan(0.2);
    expect(first / w[0]).toBeLessThan(0.3);
    // In its second week a new episode arrives while the first fades, so the week holds up better than all-at-once does.
    expect(see('streaming', 2, weekly)[0].value / first).toBeGreaterThan(w[1] / w[0]);
    // Before anything is out there is nothing to report.
    expect(see('streaming', 1, [ep(1, '2027-02-01')])).toEqual([]);
  });
});

describe('recorded once', () => {
  it('a week already recorded is left as it was, and the summary reads what is there', () => {
    const o = offer('broadcast');
    const first = see('broadcast', 1, [ep(1, '2027-01-04', 80)]);
    expect(recordAudienceWeek(o, first)).toHaveLength(1);
    const again: AudienceObservation[] = [{ ...first[0], value: 1 }];
    expect(recordAudienceWeek(o, again)).toEqual([]);
    expect(o.audience).toEqual(first);
    expect(audienceSummary(o)).toBe(`Its first showing drew an average audience of ${first[0].value.toLocaleString('en-US')}.`);
    recordAudienceWeek(o, see('broadcast', 2, [ep(1, '2027-01-04', 80), ep(2, '2027-01-11', 60)]));
    expect(audienceSummary(o)).toMatch(/^Its first showing drew an average audience of [\d,]+; its latest, [\d,]+, which is \d+% of that\.$/);
    expect(audienceSummary(offer('streaming'))).toBeNull();
  });
});

describe('a release in the game', () => {
  function delivered(tag: string): { s: GameState; p: Project } {
    const s = startLife(tag, 'gb-london');
    const p = buildProject(s, { title: 'Tidewater', format: 'short', medium: 'live-action', scenario: 'micro' }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Pier', intExt: 'INT', chars: ['Ada'], minutes: 2 }]);
    approve(s, p);
    castAll(s, p); staffAll(s, p);
    for (let i = 0; i < 6; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
    startProduction(s, p, 5);
    runDays(s, p, 200);
    p.offers = [];
    return { s, p };
  }
  /** An accepted deal on a delivered film (a labelled fixture: the offer and the film's reception are set here), released by the game. */
  function out(s: GameState, p: Project, route: DistributionOffer['route']): DistributionOffer {
    const o: DistributionOffer = { id: route, distributor: `Distributor ${route}`, route, minimumGuarantee: 1000, territories: ['GB'], releaseWindowDays: 20, expiresAt: s.now + 30 * DAY, status: 'open' };
    p.offers.push(o);
    p.quality = { ...(p.quality ?? {}), reception: 80 } as Record<string, number>;
    acceptDistribution(s, p, o.id);
    processUntil(s, s.now + (o.releaseWindowDays + 1) * DAY, 'tick', 200000);
    return o;
  }

  it('streamed: a figure of each measure every week until the tail runs out, and what it is paid is untouched by them', () => {
    const { s, p } = delivered('aud-stream');
    const o = out(s, p, 'streaming');
    expect(showingsOf(p, o)).toMatchObject([{ number: null, reception: 80 }]);
    const opened = showingsOf(p, o)[0].date;
    expect(lastAudienceWeek(p, o, opened)).toBe(1 + AUDIENCE_TAIL_WEEKS);
    processUntil(s, s.now + 7 * DAY, 'tick', 200000);
    expect(o.audience!.map((x) => [x.week, x.metric])).toEqual([[1, 'hours'], [1, 'views']]);
    expect(s.log.some((l) => /^Distributor streaming reported Tidewater's first week: [\d,]+ hours viewed, [\d,]+ views\. Simulated\.$/.test(l.text))).toBe(true);
    const paidBefore = p.revenue;
    processUntil(s, s.now + 20 * 7 * DAY, 'tick', 400000);
    const weeks = [...new Set(o.audience!.map((x) => x.week))];
    expect(weeks).toEqual(Array.from({ length: 1 + AUDIENCE_TAIL_WEEKS }, (_, i) => i + 1));
    expect(o.audience!.filter((x) => x.metric === 'hours')).toHaveLength(weeks.length);
    expect(o.audience!.every((x) => x.metric !== 'viewers' && x.territories === 1)).toBe(true);
    // Nothing more is asked for once the tail is over.
    expect(s.events.some((e) => e.kind === 'audience-week')).toBe(false);
    // Money came only from the distributor's reports, as before: the same game without an audience recorded earns the same.
    const twin = delivered('aud-stream');
    const t = out(twin.s, twin.p, 'streaming');
    twin.s.events = twin.s.events.filter((e) => e.kind !== 'audience-week'); // labelled fixture: the audience reports never come
    processUntil(twin.s, twin.s.now + (7 + 20 * 7) * DAY, 'tick', 400000);
    expect(t.audience).toBeUndefined();
    expect(twin.p.revenue).toBe(p.revenue);
    expect(p.revenue).toBeGreaterThanOrEqual(paidBefore);
    expect(deserialize(serialize(s)).projects.find((x) => x.id === p.id)!.offers[0].audience).toEqual(o.audience);
  }, 120000);

  it('broadcast: one figure, for its showing; bought or rented digitally: none', () => {
    const { s, p } = delivered('aud-air');
    const o = out(s, p, 'broadcast');
    processUntil(s, s.now + 5 * 7 * DAY, 'tick', 300000);
    expect(o.audience!.map((x) => [x.week, x.metric, x.scope])).toEqual([[1, 'viewers', 'title']]);
    const other = delivered('aud-digital');
    const d = out(other.s, other.p, 'digital');
    processUntil(other.s, other.s.now + 5 * 7 * DAY, 'tick', 300000);
    expect(d.audience).toBeUndefined();
    expect(other.s.events.some((e) => e.kind === 'audience-week')).toBe(false);
  }, 120000);
});

// What reads an audience (November 12, 2026): a commissioner deciding on another season.
describe('a commissioner reads a season', () => {
  const monday = (n: number) => new Date(Date.parse('2027-01-04T00:00:00Z') + n * 7 * 86_400_000).toISOString().slice(0, 10);
  /** A season of weekly episodes under one deal, each received as given, with every week so far recorded (labelled fixture). */
  function season(route: 'broadcast' | 'streaming', receptions: number[], opts: { weeks?: number; territories?: number; atOnce?: boolean; total?: number } = {}): { p: Project; o: DistributionOffer } {
    const o = offer(route);
    const shows = receptions.map((r, i) => ep(i + 1, opts.atOnce ? monday(0) : monday(i), r));
    const p = {
      id: 'p1', episodes: Array.from({ length: opts.total ?? receptions.length }, (_, i) => ({ number: i + 1 })), offers: [o], axes: { targetRuntimeMin: 30 },
      releases: [{ offerId: o.id, status: 'released', date: monday(0), territories: ['GB'], episodes: shows.map((x) => ({ number: x.number, date: x.date, status: 'released' })) }],
      episodeQuality: Object.fromEntries(shows.map((x) => [String(x.number), { reception: x.reception }])),
    } as unknown as Project;
    for (let w = 1; w <= (opts.weeks ?? receptions.length); w++) recordAudienceWeek(o, observeWeek(7, 'p1', o, w, monday(0), shows, opts.territories ?? 1));
    return { p, o };
  }

  it('a broadcast is renewed when it opened well enough and kept its audience, and the sentence gives both figures and both bars', () => {
    const good = season('broadcast', [75, 75, 75, 75, 75, 75]);
    const read = seasonAudience(good.p, good.o)!;
    expect(read).toMatchObject({ distributor: 'Fixture Network', complete: true, renew: true });
    expect(read.says).toMatch(/^Its first showing on Fixture Network drew an average audience of [\d,]+, against the 100,000 a commissioner looks for in one territory, and it kept \d+% of its audience from one episode to the next, against 88%\.$/);
    expect(OPENING_BAR * BROADCAST_BASE).toBe(100_000);
    // A weak opening is not renewed however well it holds.
    expect(seasonAudience(...Object.values(season('broadcast', [45, 90, 90, 90])) as [Project, DistributionOffer])!.renew).toBe(false);
    // A strong opening that loses its audience episode by episode is not renewed either: it is the keeping that fails.
    const leaky = season('broadcast', [80, 35, 35, 35, 35, 35]);
    const leak = seasonAudience(leaky.p, leaky.o)!;
    expect(leak.renew).toBe(false);
    expect(Number(/kept (\d+)%/.exec(leak.says)![1])).toBeLessThan(KEEP_BAR * 100);
    // The bar rises with the territories it is shown in, by the same reach the audience does.
    const wide = season('broadcast', [75, 75], { territories: 4 });
    expect(seasonAudience(wide.p, wide.o)!.says).toContain('against the 200,000 a commissioner looks for in 4 territories');
  });

  it('is not complete until every episode has been shown, and says nothing before the first figure', () => {
    const none = season('broadcast', [75, 75, 75], { weeks: 0 });
    expect(seasonAudience(none.p, none.o)).toBeNull();
    const part = season('broadcast', [75, 75, 75], { weeks: 2 });
    expect(seasonAudience(part.p, part.o)).toMatchObject({ complete: false, renew: true });
    // Three shown of a season of six is not the season.
    const half = season('broadcast', [75, 75, 75], { total: 6 });
    expect(seasonAudience(half.p, half.o)!.complete).toBe(false);
    // One episode has nothing to keep: only its opening is read.
    const one = season('broadcast', [75], { total: 2 });
    expect(seasonAudience(one.p, one.o)!.says).not.toContain('kept');
  });

  it('a streamed season is read in views over the weeks counted, never in people', () => {
    const good = season('streaming', [75, 75, 75, 75], { atOnce: true, weeks: STREAMING_WEEKS_COUNTED });
    const read = seasonAudience(good.p, good.o)!;
    expect(read).toMatchObject({ complete: true, renew: true });
    expect(read.says).toMatch(/^On Fixture Network it was watched for [\d,]+ hours in 4 weeks, which the service counts as [\d,]+ views of what is out, against the 144,000 a commissioner looks for in one territory\.$/);
    expect(STREAMING_BAR * STREAMING_BASE).toBe(144_000);
    expect(read.says).not.toMatch(/audience of|people/);
    const weak = season('streaming', [50, 50, 50, 50], { atOnce: true, weeks: STREAMING_WEEKS_COUNTED });
    expect(seasonAudience(weak.p, weak.o)).toMatchObject({ complete: true, renew: false });
    // A week short of the weeks counted, or an episode still to come, and it is not yet the season.
    const early = season('streaming', [75, 75, 75, 75], { atOnce: true, weeks: STREAMING_WEEKS_COUNTED - 1 });
    expect(seasonAudience(early.p, early.o)!.complete).toBe(false);
    const weekly = season('streaming', [75, 75, 75, 75], { weeks: 4 });
    expect(seasonAudience(weekly.p, weekly.o)!.complete).toBe(false);
    const weeklyDone = season('streaming', [75, 75, 75, 75], { weeks: 4 + STREAMING_WEEKS_COUNTED - 1 });
    expect(seasonAudience(weeklyDone.p, weeklyDone.o)).toMatchObject({ complete: true, renew: true });
  });

  it('only a release that reports an audience is waited for', () => {
    expect(airingDeal({ offers: [{ ...offer('theatrical') }, { ...offer('digital') }] } as unknown as Project)).toBeNull();
    expect(airingDeal({ offers: [{ ...offer('broadcast'), status: 'open' }] } as unknown as Project)).toBeNull();
    expect(airingDeal({ offers: [offer('digital'), { ...offer('streaming'), id: 'o2' }] } as unknown as Project)!.id).toBe('o2');
  });

  /** A delivered, commissioned season in a game (labelled fixture: the commissioner's agreement and the assessment are set here). */
  function commissioned(tag: string, overall: number): { s: GameState; p: Project } {
    const s = startLife(tag);
    const p = buildProject(s, { title: 'Tidewater', format: 'limited-series', medium: 'live-action', episodes: 2, runtime: 20 }, [{ name: 'Mara' }],
      [{ place: 'Pier', chars: ['Mara'], minutes: 2, extra: { episode: 1 } }, { place: 'Pier', chars: ['Mara'], minutes: 2, extra: { episode: 2 } }]);
    approve(s, p);
    p.finance = { estimate: 1, target: 1, deals: [{ id: 'fd1', kind: 'commissioner', backer: 'A Broadcaster', amount: 900_000, status: 'accepted', askedAt: 0, reason: '', received: 900_000, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null } }] };
    p.quality = { overall } as Record<string, number>;
    p.delivered = { at: s.now, runtimeMin: 40 };
    scheduleRenewal(s, p);
    return { s, p };
  }
  const air = (p: Project, receptions: number[] | null) => {
    const o = offer('broadcast');
    p.offers = [o];
    if (receptions) for (let w = 1; w <= receptions.length; w++) recordAudienceWeek(o, observeWeek(7, p.id, o, w, monday(0), receptions.map((r, i) => ep(i + 1, monday(i), r)), 1));
    return o;
  };

  it('waits for a season that is going out, then decides on its audience and not on how it turned out', () => {
    // The same season, assessed the same, with two different audiences: the audience decides.
    for (const [receptions, outcome] of [[[78, 78], 'renewed'], [[42, 42], 'cancelled']] as const) {
      const { s, p } = commissioned(`aud-renew-${outcome}`, 72);
      const o = air(p, null);
      processUntil(s, s.now + (RENEWAL_DECISION_DAYS + 1) * DAY, 'tick', 100000);
      expect(p.renewal).toBeUndefined();
      expect(s.log.filter((l) => l.text === 'The commissioner will decide on another season of Tidewater once this one has been shown on Fixture Network.')).toHaveLength(1);
      expect(renewalStanding(s, p)).toBe('The commissioner will decide on another season once this one has been shown on Fixture Network.');
      // A fortnight on, still nothing shown: still waiting, and it is said once, not every week.
      processUntil(s, s.now + 14 * DAY, 'tick', 100000);
      expect(p.renewal).toBeUndefined();
      expect(s.log.filter((l) => l.text.startsWith('The commissioner will decide'))).toHaveLength(1);
      // The first episode is shown: the standing says what has been reported so far.
      recordAudienceWeek(o, observeWeek(7, p.id, o, 1, monday(0), [ep(1, monday(0), receptions[0])], 1));
      expect(renewalStanding(s, p)).toMatch(/^The commissioner will decide on another season once this one has been shown on Fixture Network\. So far: its first showing on Fixture Network drew an average audience of [\d,]+, against the 100,000 a commissioner looks for in one territory\.$/);
      processUntil(s, s.now + 7 * DAY, 'tick', 100000);
      expect(p.renewal).toBeUndefined();
      // The second and last: within a week it is decided.
      recordAudienceWeek(o, observeWeek(7, p.id, o, 2, monday(0), receptions.map((r, i) => ep(i + 1, monday(i), r)), 1));
      processUntil(s, s.now + 7 * DAY, 'tick', 100000);
      expect(p.renewal?.outcome).toBe(outcome);
      expect(p.renewal!.reason).toMatch(outcome === 'renewed'
        ? /^The commissioner renewed Tidewater: they will offer to fund another season\. Its first showing on Fixture Network drew .* Audience figures are simulated\.$/
        : /^The commissioner won't make another season of Tidewater\. Their agreement for this one is settled\. Its first showing on Fixture Network drew .* Audience figures are simulated\.$/);
      expect(renewalStanding(s, p)).toBeNull();
      expect(s.events.some((e) => e.kind === 'season-decision')).toBe(false);
    }
    // And the other way about: a season assessed poorly that found its audience is renewed.
    const { s, p } = commissioned('aud-renew-poor', 41);
    air(p, [78, 78]);
    processUntil(s, s.now + (RENEWAL_DECISION_DAYS + 1) * DAY, 'tick', 100000);
    expect(p.renewal?.outcome).toBe('renewed');
  });

  it('with no such release it is decided at thirty days on how it turned out; one never shown is decided so after a year', () => {
    const plain = commissioned('aud-renew-none', 72);
    expect(renewalStanding(plain.s, plain.p)).toBe('The commissioner is deciding on another season.');
    processUntil(plain.s, plain.s.now + (RENEWAL_DECISION_DAYS + 1) * DAY, 'tick', 100000);
    expect(plain.p.renewal).toMatchObject({ outcome: 'renewed', reason: 'The commissioner renewed Tidewater: they will offer to fund another season.' });
    const { s, p } = commissioned('aud-renew-never', 41);
    air(p, null);
    processUntil(s, s.now + (RENEWAL_WAIT_DAYS - 1) * DAY, 'tick', 400000);
    expect(p.renewal).toBeUndefined();
    processUntil(s, s.now + 9 * DAY, 'tick', 100000);
    expect(p.renewal).toMatchObject({ outcome: 'cancelled', reason: "The commissioner won't make another season of Tidewater. Their agreement for this one is settled." });
    // A deal that falls through stops the wait: the next look decides.
    const gone = commissioned('aud-renew-gone', 72);
    const o = air(gone.p, null);
    processUntil(gone.s, gone.s.now + (RENEWAL_DECISION_DAYS + 1) * DAY, 'tick', 100000);
    o.status = 'cancelled';
    processUntil(gone.s, gone.s.now + 8 * DAY, 'tick', 100000);
    expect(gone.p.renewal?.outcome).toBe('renewed');
  });
});
