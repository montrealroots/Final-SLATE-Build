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
// The renewal decision lives here, registered at startup for saves with one pending; starting the continuation itself is
// in sequel.ts, loaded with the Projects page (the startup JavaScript budget).
import { addLog, registerHandler, schedule } from './state';
import { DAY } from './time';
import type { GameState, Project } from './types';

/** How long after a commissioned season is delivered the commissioner decides on another. Game calibration. */
export const RENEWAL_DECISION_DAYS = 30;

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
  // Renewed on how the season turned out (the game's assessment at delivery), never on chance.
  const overall = p.quality?.overall ?? 0;
  const renewed = overall >= 60;
  p.renewal = {
    decidedAt: state.now, outcome: renewed ? 'renewed' : 'cancelled',
    reason: renewed ? `The commissioner renewed ${p.title}: they will offer to fund another season.` : `The commissioner won't make another season of ${p.title}. Their agreement for this one is settled.`,
  };
  addLog(state, p.renewal.reason, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'overview' } });
});
