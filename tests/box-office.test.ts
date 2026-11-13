// Weeks in cinemas and the record book (the v3 package, 02; requirements V3-B01 and V3-B02): a month's report is the sum
// of its weeks, a correction is kept visible, every other figure follows from the rental, and the money is what it was.
import { describe, expect, it } from 'vitest';
import { DAY, DISTRIBUTOR_FEE, REPORT_MONTHS, acceptDistribution, processUntil, reportedGross } from './engine-api';
import { COMPETITION_MAX, EXPAND_BAR, HOLD_BAR, RENTAL_SHARE, SCREENS_BOUNDS, TICKET_PRICE, WEEKS_PER_REPORT, WEEK_WEIGHTS, holdover, monthOfWeek, openingScreens, provisionalRental, recordBook, recordWeek, screenShare, screensAfter, settleMonth, weekDates, weekMoney } from '../src/engine/box-office';
import { deserialize, serialize } from '../src/engine/save';
import type { BoxOfficeWeek, DistributionOffer, GameState, Project } from '../src/engine/types';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';

const deal = (route: DistributionOffer['route'] = 'theatrical'): DistributionOffer => ({ id: 'o1', distributor: 'Fixture Films', route, minimumGuarantee: 1000, territories: ['GB'], releaseWindowDays: 20, expiresAt: 0, status: 'accepted' });
const sum = (ws: BoxOfficeWeek[]) => ws.reduce((n, w) => n + w.rental, 0);

function delivered(tag: string, title = 'Tidewater'): { s: GameState; p: Project } {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title, format: 'short', medium: 'live-action', scenario: 'micro' }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Pier', intExt: 'INT', chars: ['Ada'], minutes: 2 }]);
  approve(s, p);
  castAll(s, p); staffAll(s, p);
  for (let i = 0; i < 6; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
  startProduction(s, p, 5);
  runDays(s, p, 200);
  p.offers = [];
  return { s, p };
}
/** An accepted cinema deal on a delivered film (a labelled fixture: the offer and the film's reception are set here), released by the game. */
function inCinemas(s: GameState, p: Project, id: string, reception = 80): DistributionOffer {
  const o: DistributionOffer = { id, distributor: `Distributor ${id}`, route: 'theatrical', minimumGuarantee: 1000, territories: ['GB'], releaseWindowDays: 20, expiresAt: s.now + 30 * DAY, status: 'open', exclusive: true };
  p.offers.push(o);
  p.quality = { ...(p.quality ?? {}), reception } as Record<string, number>;
  acceptDistribution(s, p, o.id);
  processUntil(s, s.now + (o.releaseWindowDays + 1) * DAY, 'tick', 200000);
  return o;
}

describe('a week in cinemas', () => {
  it('four provisional weeks add up to the month they are in, heaviest first, in hundreds', () => {
    expect(WEEK_WEIGHTS.reduce((a, b) => a + b, 0)).toBe(1000);
    expect([...WEEK_WEIGHTS]).toEqual([...WEEK_WEIGHTS].sort((a, b) => b - a));
    const o = deal();
    for (let w = 1; w <= 4; w++) recordWeek(o, w, '2026-03-06', 1, 45_700);
    expect(o.weeks!.map((w) => w.rental)).toEqual([13_700, 12_100, 10_600, 9_300]);
    expect(sum(o.weeks!)).toBe(45_700);
    expect(o.weeks!.every((w) => w.status === 'provisional' && w.rental % 100 === 0)).toBe(true);
    expect([1, 4, 5, 8, 24].map(monthOfWeek)).toEqual([1, 1, 2, 2, 6]);
    expect(weekDates('2026-03-06', 1)).toEqual({ from: '2026-03-06', to: '2026-03-12' });
    expect(weekDates('2026-03-06', 5)).toEqual({ from: '2026-04-03', to: '2026-04-09' });
    // A week is recorded once.
    expect(recordWeek(o, 2, '2026-03-06', 1, 99_900)).toBeNull();
    expect(o.weeks![1].rental).toBe(12_100);
  });

  it('settled by a report that agrees, the weeks are final and unmoved', () => {
    const o = deal();
    for (let w = 1; w <= 4; w++) recordWeek(o, w, '2026-03-06', 1, 45_700);
    settleMonth(o, 1, 45_700, '2026-03-06', 1);
    expect(o.weeks!.map((w) => [w.rental, w.status, w.first])).toEqual([[13_700, 'final', undefined], [12_100, 'final', undefined], [10_600, 'final', undefined], [9_300, 'final', undefined]]);
  });

  it('settled by a report that differs, they add up to it exactly and each keeps what it first said', () => {
    const o = deal();
    // The film opened in a second country after its third week: the last week was reported on more than the first three.
    for (let w = 1; w <= 3; w++) recordWeek(o, w, '2026-03-06', 1, 40_000);
    recordWeek(o, 4, '2026-03-06', 2, 56_600);
    const first = o.weeks!.map((w) => w.rental);
    // Each week is its own share of the month as it stood: the last is not swollen by what the first three lacked.
    expect(first).toEqual([12_000, 10_600, 9_300, 11_600]);
    settleMonth(o, 1, 52_300, '2026-03-06', 2);
    expect(o.weeks!.map((w) => w.rental)).toEqual([14_400, 12_700, 11_200, 14_000]);
    expect(sum(o.weeks!)).toBe(52_300);
    expect(o.weeks!.every((w) => w.status === 'final' && w.rental % 100 === 0)).toBe(true);
    expect(o.weeks!.map((w) => w.first)).toEqual(first);
    // In the proportions they were reported in, to the hundred.
    o.weeks!.slice(0, 3).forEach((w, i) => expect(w.rental).toBe(Math.round((52_300 * first[i]) / 43_500 / 100) * 100));
  });

  it('a month with no weeks recorded gets them when its report comes, marked late and with no first figure', () => {
    const o = deal();
    settleMonth(o, 2, 20_000, '2026-03-06', 1);
    expect(o.weeks!.map((w) => [w.week, w.rental, w.status, w.late, w.first])).toEqual([[5, 6_000, 'final', true, undefined], [6, 5_300, 'final', true, undefined], [7, 4_600, 'final', true, undefined], [8, 4_100, 'final', true, undefined]]);
    expect(provisionalRental(9, 10_000)).toBe(3_000);
    expect([9, 10, 11, 12].map((w) => provisionalRental(w, 10_050)).reduce((a, b) => a + b, 0)).toBe(10_050);
  });

  it('everything else about a week follows from its rental, and the parts add up', () => {
    const w: BoxOfficeWeek = { week: 1, from: '2026-03-06', to: '2026-03-12', territories: 1, rental: 13_700, status: 'final' };
    const m = weekMoney(w, DISTRIBUTOR_FEE);
    expect(m).toEqual({ gross: 27_400, admissions: 2_740, cinemas: 13_700, rental: 13_700, fee: 4_795, net: 8_905 });
    expect(m.gross).toBe(m.rental / RENTAL_SHARE);
    expect(m.admissions * TICKET_PRICE).toBe(m.gross);
    expect(m.cinemas + m.rental).toBe(m.gross);
    expect(m.fee + m.net).toBe(m.rental);
  });
});

describe('a film in cinemas', () => {
  it('reports a week as it ends, settles each month to the distributor\'s report, and earns exactly what it did before weeks were kept', () => {
    const { s, p } = delivered('bo-run');
    const before = p.revenue;
    const o = inCinemas(s, p, 'run');
    expect(o.weeks).toBeUndefined();
    // The first week, the day it ends: provisional, and in Recent Updates as a simulated figure.
    processUntil(s, s.now + 7 * DAY, 'tick', 200000);
    expect(o.weeks).toHaveLength(1);
    expect(o.weeks![0]).toMatchObject({ week: 1, status: 'provisional', territories: 1 });
    expect(o.weeks![0].rental).toBe(Math.round((reportedGross(s.seed, p, o, 1) * WEEK_WEIGHTS[0]) / 1000 / 100) * 100);
    const m1 = weekMoney(o.weeks![0], DISTRIBUTOR_FEE);
    expect(s.log.some((l) => l.text === `Tidewater took $${m1.gross.toLocaleString('en-US')} in its first week in cinemas, from ${m1.admissions.toLocaleString('en-US')} admissions. Simulated; provisional until Distributor run reports the month.`)).toBe(true);
    expect(o.reported).toBeUndefined();
    // The month's report settles its four weeks to itself.
    processUntil(s, s.now + 24 * DAY, 'tick', 200000);
    expect(o.weeks!.slice(0, 4).every((w) => w.status === 'final')).toBe(true);
    expect(sum(o.weeks!.slice(0, 4))).toBe(reportedGross(s.seed, p, o, 1));
    expect(o.reported!.gross).toBe(sum(o.weeks!.filter((w) => w.status === 'final')));
    // The whole run: twenty-four weeks, every month the sum of its weeks, and the money as it always was.
    processUntil(s, s.now + (REPORT_MONTHS * 31) * DAY, 'tick', 400000);
    expect(o.weeks).toHaveLength(REPORT_MONTHS * WEEKS_PER_REPORT);
    expect(o.weeks!.every((w) => w.status === 'final')).toBe(true);
    // Nothing about this film changed during its run, so no week was corrected.
    expect(o.weeks!.some((w) => w.first !== undefined || w.late)).toBe(false);
    for (let m = 1; m <= REPORT_MONTHS; m++) expect(sum(o.weeks!.filter((w) => monthOfWeek(w.week) === m)), `month ${m}`).toBe(reportedGross(s.seed, p, o, m));
    const gross = Array.from({ length: REPORT_MONTHS }, (_, i) => reportedGross(s.seed, p, o, i + 1)).reduce((a, b) => a + b, 0);
    expect(o.reported!.gross).toBe(gross);
    expect(sum(o.weeks!)).toBe(gross);
    expect(o.weeks!.reduce((n, w) => n + weekMoney(w, DISTRIBUTOR_FEE).net, 0)).toBe(o.reported!.net);
    expect(p.revenue - before).toBe(1000 + Math.max(0, o.reported!.net - 1000));
    expect(deserialize(serialize(s)).projects.find((x) => x.id === p.id)!.offers[0].weeks).toEqual(o.weeks);
  }, 90000);

  it('keeps no weeks for a release that is not in cinemas', () => {
    const { s, p } = delivered('bo-stream');
    const o: DistributionOffer = { id: 'st', distributor: 'Distributor st', route: 'streaming', minimumGuarantee: 1000, territories: ['GB'], releaseWindowDays: 20, expiresAt: s.now + 30 * DAY, status: 'open' };
    p.offers.push(o);
    p.quality = { ...(p.quality ?? {}), reception: 80 } as Record<string, number>;
    acceptDistribution(s, p, o.id);
    processUntil(s, s.now + (o.releaseWindowDays + 70) * DAY, 'tick', 200000);
    expect(o.reported!.gross).toBeGreaterThan(0);
    expect(o.weeks).toBeUndefined();
    expect(recordBook(s)).toEqual([]);
  }, 90000);
});

describe('the record book', () => {
  const week = (n: number, rental: number, from: string, status: BoxOfficeWeek['status'] = 'final'): BoxOfficeWeek => ({ week: n, ...weekDates(from, n), territories: 1, rental, status });
  const film = (s: GameState, title: string, runs: BoxOfficeWeek[][]): Project => {
    const p = buildProject(s, { title, format: 'short', medium: 'live-action', scenario: 'micro' }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Pier', intExt: 'INT', chars: ['Ada'], minutes: 2 }]);
    p.offers = runs.map((weeks, i) => ({ ...deal(), id: `${title}-${i}`, weeks })); // labelled fixture: weeks as the game records them
    return p;
  };

  it('is one row a film from its weeks: opening, best week, lifetime, admissions, years, and places with ties shared', () => {
    const s = startLife('bo-book');
    const a = film(s, 'Alder', [[week(1, 10_000, '2026-12-18'), week(2, 6_000, '2026-12-18'), week(3, 4_000, '2026-12-18')]]);
    const b = film(s, 'Birch', [[week(1, 8_000, '2027-03-05'), week(2, 12_000, '2027-03-05')]]);
    const c = film(s, 'Cedar', [[week(1, 10_000, '2027-06-04'), week(2, 0, '2027-06-04')]]);
    film(s, 'Never Released', []);
    const book = recordBook(s);
    expect(book.map((r) => r.title)).toEqual(['Alder', 'Birch', 'Cedar']);
    expect(book[0]).toMatchObject({ projectId: a.id, opened: '2026-12-18', opening: 20_000, best: { gross: 20_000, week: 1 }, lifetime: 40_000, admissions: 4_000, weeks: 3, runs: 1, settled: true });
    // Its weeks ended on December 24 and 31, 2026 and January 7, 2027: a year is the year a week ended in.
    expect(book[0].byYear).toEqual({ 2026: 32_000, 2027: 8_000 });
    expect(book[1]).toMatchObject({ projectId: b.id, opening: 16_000, best: { gross: 24_000, week: 2 }, lifetime: 40_000 });
    expect(book[2]).toMatchObject({ projectId: c.id, opening: 20_000, lifetime: 20_000, weeks: 1 });
    // Alder and Birch took the same in all and share first place, the earlier opening listed first; Alder and Cedar opened the same.
    expect(book.map((r) => r.rank)).toEqual([{ opening: 1, lifetime: 1 }, { opening: 3, lifetime: 1 }, { opening: 1, lifetime: 3 }]);
  });

  it('a later run adds to the lifetime and is never the opening; a provisional week marks the row as able to move', () => {
    const s = startLife('bo-rerun');
    film(s, 'Alder', [[week(1, 10_000, '2026-12-18')], [week(1, 30_000, '2028-02-04'), week(2, 5_000, '2028-02-04', 'provisional')]]);
    const [row] = recordBook(s);
    expect(row).toMatchObject({ opened: '2026-12-18', opening: 20_000, best: { gross: 60_000, week: 1 }, lifetime: 90_000, runs: 2, settled: false });
    // Change a week and the book changes: it is worked out from the weeks, with no copy of its own.
    s.projects[0].offers[1].weeks![1].rental = 6_000;
    expect(recordBook(s)[0].lifetime).toBe(92_000);
  });
});

describe('the record book\'s money', () => {
  it('keeps ticket sales, rental, the project\'s income, cost, profit and what came to you apart, each from the ledger', () => {
    const s = startLife('bo-money');
    const p = buildProject(s, { title: 'Alder', format: 'short', medium: 'live-action', scenario: 'micro' }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Pier', intExt: 'INT', chars: ['Ada'], minutes: 2 }]);
    p.offers = [{ ...deal(), id: 'run', weeks: [{ week: 1, ...weekDates('2026-12-18', 1), territories: 1, rental: 10_000, status: 'final' }] }];
    // Labelled fixtures: what the ledger would hold after the shoot, a backer repaid, and income taken home.
    p.revenue = 30_000;
    p.obligations.push(
      { id: 'o1', label: 'Crew', category: 'crew', amount: 12_000, state: 'settled', settled: 12_000, postings: [] },
      { id: 'o2', label: 'Repaid To A Backer', category: 'finance', amount: 5_000, state: 'settled', settled: 5_000, postings: [] },
      { id: 'o3', label: 'Taken Home', category: 'finance', amount: 4_000, state: 'settled', settled: 4_000, ref: 'transfer:home-th1:earnings', postings: [] },
      { id: 'o4', label: 'Taken Home', category: 'finance', amount: 1_000, state: 'settled', settled: 1_000, ref: 'transfer:home-th2:capital', postings: [] },
    );
    const [row] = recordBook(s);
    expect(row.lifetime).toBe(20_000); // ticket sales: the rental is half of them
    expect(row.money).toEqual({ rental: 10_000, income: 30_000, cost: 12_000, profit: 18_000, yours: 4_000 }); // your own unspent money back isn't earnings
  });
});

describe('screens and holdovers', () => {
  it('a run opens on the screens its guarantee pays for, wider in more territories, within bounds', () => {
    expect(openingScreens(40_000, 1)).toBe(100);
    expect(openingScreens(40_000, 4)).toBe(200);
    expect(openingScreens(0, 1)).toBe(SCREENS_BOUNDS[0]);
    expect(openingScreens(1e9, 9)).toBe(SCREENS_BOUNDS[1]);
  });

  it('the cinemas expand, hold, cut or withdraw it by its takings a screen, and competition takes from them', () => {
    expect(holdover(100 * EXPAND_BAR, 100, 0).next).toBe('expanded');
    expect(holdover(100 * HOLD_BAR, 100, 0).next).toBe('held');
    expect(holdover(100 * HOLD_BAR, 100, 4).next).toBe('cut'); // the same takings, against four wide releases
    expect(holdover(10, 100, 0)).toEqual({ next: 'cut', screens: 60 });
    expect(holdover(10, 8, 0)).toEqual({ next: 'withdrawn', screens: 0 });
    expect([screensAfter(100, 'expanded'), screensAfter(100, 'held'), screensAfter(100, 'cut'), screensAfter(100, 'withdrawn')]).toEqual([125, 100, 60, 0]);
  });

  it('each week records its screens, its competition and the decision; the next week plays on what was decided', () => {
    const o = { ...deal(), minimumGuarantee: 40_000 };
    for (let w = 1; w <= 4; w++) recordWeek(o, w, '2026-03-06', 1, 45_700, 7);
    const ws = o.weeks!;
    expect(ws[0].screens).toBe(100);
    for (let k = 1; k < 4; k++) expect(ws[k].screens).toBe(screensAfter(ws[k - 1].screens!, ws[k - 1].next!));
    expect(ws.every((w) => w.competitors! >= 0 && w.competitors! <= COMPETITION_MAX)).toBe(true);
    // Recorded again with the same world, the same; weeks recorded without screens leave the report as it was.
    const again = { ...deal(), minimumGuarantee: 40_000 };
    for (let w = 1; w <= 4; w++) recordWeek(again, w, '2026-03-06', 1, 45_700, 7);
    expect(again.weeks).toEqual(ws);
    const old = deal();
    for (let w = 1; w <= 4; w++) recordWeek(old, w, '2026-03-06', 1, 45_700);
    expect(screenShare(old, 2)).toBe(1);
  });

  it('the next month\'s report follows the screens it was kept on: cut earns less, expanded more, withdrawn nothing', () => {
    const { s, p } = delivered('bo-screens');
    const o = inCinemas(s, p, 'oS', 80);
    const month2 = (next: NonNullable<BoxOfficeWeek['next']>) => {
      o.weeks = [{ week: 1, from: 'a', to: 'b', territories: 1, rental: 1000, status: 'final', screens: 100, competitors: 0, next: 'held' },
        { week: 4, from: 'a', to: 'b', territories: 1, rental: 1000, status: 'final', screens: 100, competitors: 0, next }]; // labelled fixture
      return reportedGross(s.seed, p, o, 2);
    };
    const held = month2('held');
    expect(month2('cut')).toBeLessThan(held);
    expect(month2('expanded')).toBeGreaterThan(held);
    expect(month2('withdrawn')).toBe(0);
    expect(screenShare(o, 1)).toBe(1);
  });
});
