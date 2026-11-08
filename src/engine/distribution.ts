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
import { stream } from './rng';
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
  schedule(state, state.now + LATER_WINDOW_DAYS * DAY, 'distribution-offer', { projectId: p.id, wave: `window:${offerId}` }, { attention: 'notify', priority: 55 });
}

/** The gross a deal reports for a month: reception, route, territories, and a curve that falls off. Deterministic. */
export function reportedGross(seed: number, p: Project, o: DistributionOffer, month: number): number {
  const reception = p.quality?.reception ?? 50;
  const routeScale = { theatrical: 1.3, streaming: 1, digital: 0.6, broadcast: 0.8 }[o.route];
  const curve = Math.pow(0.6, month - 1);
  const noise = 0.8 + stream(seed, 'report', p.id, o.id, String(month))() * 0.4;
  return Math.round((Math.max(0, reception - 35) * 1500 * routeScale * Math.sqrt(o.territories.length) * curve * noise) / 100) * 100;
}

registerHandler('distribution-report', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const o = p?.offers.find((x) => x.id === ev.payload.offerId);
  if (!p || !o || o.status !== 'accepted') return { suppressInterrupt: true };
  const gross = reportedGross(state.seed, p, o, ev.payload.month as number);
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

