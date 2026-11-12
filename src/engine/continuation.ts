// Another season of a series, or a sequel to a film (SLATE-07-05.02 and 18-04, November 8, 2026). A continuation is a new
// project that carries what the story established, and nothing it didn't earn:
// - Characters keep their IDs (so they are the same people), with their designs, world rules and relationships.
//   Threads left unresolved or open carry over, with no scenes yet, as does the last season's arc, to build on.
// - Finished builds of returning characters (puppets, models, rigs) carry over as finished work. They cost nothing to
//   build again, unless a design changes, when planning rebuilds them as always.
// - Nobody returns automatically. The previous cast are listed as people to ask back, at their last rate, and asking
//   is an ordinary offer: they may be busy, may counter, and are paid again.
// - No money carries over. A commissioner who renews a season makes an offer for it, which has to be accepted; one who
//   doesn't renew won't fund it. A self-financed series or film can always continue, and raises its money again.
// - A commissioner decides once the season has been shown, from its audience, when it is going out on television or a
//   streaming service (November 12, 2026; audiences.ts seasonAudience). Thirty days after delivery they look; if it is
//   still to air they wait, a week at a time, for up to a year. A season with no such release is decided at thirty
//   days on how it turned out, as every season was before.
// The renewal decision lives here, registered at startup for saves with one pending; starting the continuation itself is
// in sequel.ts, loaded with the Projects page (the startup JavaScript budget).
import { airingDeal, seasonAudience } from './audiences';
import { addLog, registerHandler, schedule } from './state';
import { DAY } from './time';
import type { GameState, Project } from './types';

/** How long after a commissioned season is delivered the commissioner decides on another. Game calibration. */
export const RENEWAL_DECISION_DAYS = 30;
/** How long after delivery a commissioner will wait for a season to be shown before deciding without the rest of it. Game calibration. */
export const RENEWAL_WAIT_DAYS = 365;

/** While a commissioner is waiting to decide: what they are waiting for, and what has been reported so far. Null once decided, or when nobody is deciding. */
export function renewalStanding(state: GameState, p: Project): string | null {
  if (p.renewal || !state.events.some((e) => e.kind === 'season-decision' && e.payload.projectId === p.id)) return null;
  const deal = airingDeal(p);
  if (!deal) return 'The commissioner is deciding on another season.';
  const read = seasonAudience(p, deal);
  return `The commissioner will decide on another season once this one has been shown on ${deal.distributor}.${read ? ` So far: ${read.says.charAt(0).toLowerCase()}${read.says.slice(1)}` : ''}`;
}

export function canContinue(p: Project): string | null {
  if (!p.delivered) return 'Deliver it first.';
  if (p.continuedBy) return 'It already has a continuation.';
  return null;
}

/** The commissioner's decision is scheduled on delivery, for a season they paid for. */
export function scheduleRenewal(state: GameState, p: Project): void {
  if (p.episodes.length < 2 || !(p.finance?.deals ?? []).some((d) => d.kind === 'commissioner' && d.status === 'accepted')) return;
  schedule(state, state.now + RENEWAL_DECISION_DAYS * DAY, 'season-decision', { projectId: p.id }, { attention: 'notify', priority: 45 });
}

registerHandler('season-decision', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  if (!p || p.renewal) return;
  // A season going out on television or a streaming service is decided on its audience, once it has been shown.
  const deal = airingDeal(p);
  const read = deal ? seasonAudience(p, deal) : null;
  if (deal && !read?.complete && state.now < (p.delivered?.at ?? state.now) + RENEWAL_WAIT_DAYS * DAY) {
    if (!ev.payload.waiting) addLog(state, `The commissioner will decide on another season of ${p.title} once this one has been shown on ${deal.distributor}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'overview' } });
    schedule(state, state.now + 7 * DAY, 'season-decision', { projectId: p.id, waiting: true }, { attention: 'silent', priority: 45 });
    return;
  }
  // Otherwise on how the season turned out (the game's assessment at delivery). Never on chance.
  const renewed = read ? read.renew : (p.quality?.overall ?? 0) >= 60;
  const verdict = renewed ? `The commissioner renewed ${p.title}: they will offer to fund another season.` : `The commissioner won't make another season of ${p.title}. Their agreement for this one is settled.`;
  p.renewal = { decidedAt: state.now, outcome: renewed ? 'renewed' : 'cancelled', reason: read ? `${verdict} ${read.says} Audience figures are simulated.` : verdict };
  addLog(state, p.renewal.reason, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'overview' } });
});
