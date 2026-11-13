// What a released film earns after its guarantee, and the windows that open later (SLATE-16-04.02 and 16-05, November 8,
// 2026). A distribution deal paid its minimum guarantee on signing and nothing more, and a film had one release per offer.
// Now:
// - Each released deal sends monthly reports for six months: the gross it says the film earned, less its fee, recoups the
//   guarantee first; only what it reports beyond the guarantee reaches you, as an overage. Reported earnings and money
//   received are kept apart, so the Release page can show both.
// - A few months after a release, distributors make offers for later windows (a streamer after a theatrical run, and so
//   on), for the territories no exclusive deal still holds; a territory held exclusively opens once the exclusivity ends.
// Earnings curves, the fee and the timing are game calibration.
import { receiveIncome } from './finance';
import { countryLanguage } from './people';
import { DUBBED_REACH } from './script-effects';
import { stream } from './rng';
import { WEEKS_PER_REPORT, monthOfWeek, recordWeek, screenShare, settleMonth, weekMoney } from './box-office';
import { money } from './budget';
import { lastAudienceWeek, observeWeek, recordAudienceWeek, routeMetrics, showingsOf } from './audiences';
import { addLog, registerHandler, schedule } from './state';
import { DAY } from './time';
import type { DistributionOffer, GameState, Project } from './types';

export const REPORT_MONTHS = 6;
/** The distributor's fee: its share of gross before anything recoups the guarantee. Simulation assumption. */
export const DISTRIBUTOR_FEE = 0.35;
/** When the offers for later windows come, after a release. Simulation assumption. */
export const LATER_WINDOW_DAYS = 120;

/** On release: the deal's reports begin, and later windows are offered some months on. */
export function onDealReleased(state: GameState, p: Project, offerId: string): void {
  for (let m = 1; m <= REPORT_MONTHS; m++) schedule(state, state.now + m * 30 * DAY, 'distribution-report', { projectId: p.id, offerId, month: m }, { attention: 'silent', priority: 60 });
  // A broadcast or streaming release reports its audience week by week (audiences.ts): each week asks for the next.
  if (routeMetrics(p.offers.find((x) => x.id === offerId)?.route ?? 'digital').length) schedule(state, state.now + 7 * DAY, 'audience-week', { projectId: p.id, offerId, week: 1 }, { attention: 'silent', priority: 59 });
  // A cinema run is also reported week by week, each week the day it ends (box-office.ts); the monthly report settles them.
  if (p.offers.find((x) => x.id === offerId)?.route === 'theatrical') {
    for (let w = 1; w <= REPORT_MONTHS * WEEKS_PER_REPORT; w++) schedule(state, state.now + w * 7 * DAY, 'box-office-week', { projectId: p.id, offerId, week: w }, { attention: 'silent', priority: 59 });
  }
  schedule(state, state.now + LATER_WINDOW_DAYS * DAY, 'distribution-offer', { projectId: p.id, wave: `window:${offerId}` }, { attention: 'notify', priority: 55 });
}

/**
 * How many territories a deal's film has reached: each one it has opened in counts once, or DUBBED_REACH where the
 * language isn't the film's and it is shown dubbed. A deal with one release for all its territories (every deal until
 * November 11, 2026) has opened in all of them once that release is out, so its reports are what they were. A studio's
 * release opens territory by territory (finish.ts 'studio-release'), and earns nothing where it hasn't opened yet.
 */
export function territoriesReached(p: Project, o: DistributionOffer): number {
  const out = p.releases.filter((r) => r.offerId === o.id && r.status === 'released');
  if (!out.length) return o.territories.length; // a report can only follow a release; a deal recorded without one counts as before
  const spoken = new Set(p.axes.dialogueLanguages);
  return out.reduce((a, r) => a + r.territories.reduce((b, c) => b + (r.version === 'dubbed' && spoken.size > 0 && !spoken.has(countryLanguage(c)) ? DUBBED_REACH : 1), 0), 0);
}

/** The gross a deal reports for a month: reception, route, the territories it has opened in, and a curve that falls off. Deterministic. */
export function reportedGross(seed: number, p: Project, o: DistributionOffer, month: number): number {
  const reception = p.quality?.reception ?? 50;
  const routeScale = { theatrical: 1.3, streaming: 1, digital: 0.6, broadcast: 0.8 }[o.route];
  const curve = Math.pow(0.6, month - 1);
  const noise = 0.8 + stream(seed, 'report', p.id, o.id, String(month))() * 0.4;
  // A cinema run's later months follow the screens the cinemas kept it on (box-office.ts screenShare).
  const screens = o.route === 'theatrical' ? screenShare(o, month) : 1;
  return Math.round((Math.max(0, reception - 35) * 1500 * routeScale * Math.sqrt(territoriesReached(p, o)) * curve * noise * screens) / 100) * 100;
}

/** How many territories a deal's film is out in: a count, where territoriesReached weighs a dubbed one more. */
const territoriesOpen = (p: Project, o: DistributionOffer): number => new Set(p.releases.filter((r) => r.offerId === o.id && r.status === 'released').flatMap((r) => r.territories)).size || o.territories.length;
/** The day a deal's film first opened: its earliest release that is out. */
const openedOn = (p: Project, o: DistributionOffer): string | null => p.releases.filter((r) => r.offerId === o.id && r.status === 'released').map((r) => r.date).sort()[0] ?? null;

registerHandler('audience-week', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const o = p?.offers.find((x) => x.id === ev.payload.offerId);
  const opened = p && o ? openedOn(p, o) : null;
  if (!p || !o || o.status !== 'accepted' || !opened) return { suppressInterrupt: true };
  const week = ev.payload.week as number;
  const fresh = recordAudienceWeek(o, observeWeek(state.seed, p.id, o, week, opened, showingsOf(p, o), territoriesOpen(p, o)));
  if (week === 1 && fresh.length) {
    const said = fresh.map((x) => (x.metric === 'viewers' ? `an average audience of ${x.value.toLocaleString('en-US')}${x.episode ? ` for episode ${x.episode}` : ''}` : x.metric === 'hours' ? `${x.value.toLocaleString('en-US')} hours viewed` : `${x.value.toLocaleString('en-US')} views`));
    addLog(state, `${o.distributor} reported ${p.title}'s first week: ${said.join(', ')}. Simulated.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  }
  // The reports go on until some weeks after the last episode is out, and never past two years.
  if (week < lastAudienceWeek(p, o, opened) && week < 104) schedule(state, state.now + 7 * DAY, 'audience-week', { projectId: p.id, offerId: o.id, week: week + 1 }, { attention: 'silent', priority: 59 });
  return { suppressInterrupt: true };
});

registerHandler('box-office-week', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const o = p?.offers.find((x) => x.id === ev.payload.offerId);
  const opened = p && o ? openedOn(p, o) : null;
  if (!p || !o || o.status !== 'accepted' || !opened) return { suppressInterrupt: true };
  const week = ev.payload.week as number;
  const w = recordWeek(o, week, opened, territoriesOpen(p, o), reportedGross(state.seed, p, o, monthOfWeek(week)), state.seed);
  if (w && week === 1) {
    const m = weekMoney(w, DISTRIBUTOR_FEE);
    addLog(state, `${p.title} took ${money(m.gross)} in its first week in cinemas, from ${m.admissions.toLocaleString('en-US')} admissions. Simulated; provisional until ${o.distributor} reports the month.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  }
  return { suppressInterrupt: true };
});

registerHandler('distribution-report', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const o = p?.offers.find((x) => x.id === ev.payload.offerId);
  if (!p || !o || o.status !== 'accepted') return { suppressInterrupt: true };
  const gross = reportedGross(state.seed, p, o, ev.payload.month as number);
  // A cinema run's month is its four weeks, made to add up to this report (box-office.ts).
  const opened = o.route === 'theatrical' ? openedOn(p, o) : null;
  if (opened) settleMonth(o, ev.payload.month as number, gross, opened, territoriesOpen(p, o));
  const rep = (o.reported ??= { gross: 0, net: 0, overagePaid: 0 });
  rep.gross += gross;
  rep.net += Math.round(gross * (1 - DISTRIBUTOR_FEE));
  const due = Math.max(0, rep.net - o.minimumGuarantee) - rep.overagePaid;
  if (due > 0) {
    rep.overagePaid += due;
    p.revenue += receiveIncome(state, p, due, o.distributor);
  }
  const text = `${o.distributor} reported ${p.title}'s earnings for month ${ev.payload.month}.${due > 0 ? ' It has earned past the guarantee, and the overage was paid.' : ''}`;
  addLog(state, text, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  return { suppressInterrupt: true };
});

/** Territories of `territories` an accepted exclusive deal still holds on `today`. */
export function heldTerritories(p: Project, territories: string[], today: string): string[] {
  return territories.filter((c) => p.offers.some((x) => x.status === 'accepted' && x.exclusive && x.exclusiveUntil && today < x.exclusiveUntil && x.territories.includes(c)));
}

/** For a later window: drop territories still held and routes already released there. Empty means no offer. */
export function laterWindowTerritories(p: Project, route: DistributionOffer['route'], territories: string[], today: string): string[] {
  const held = new Set(heldTerritories(p, territories, today));
  const released = new Set(p.releases.filter((r) => r.status !== 'cancelled' && r.route === route).flatMap((r) => r.territories));
  return territories.filter((c) => !held.has(c) && !released.has(c));
}

