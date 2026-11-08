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
import { approvedCharacters } from './projects';
import { createProject } from './projects';
import { addLog, newId, registerHandler, schedule } from './state';
import { DAY } from './time';
import type { FinanceDeal, GameState, Project } from './types';

const BUILD_KINDS = new Set(['sm:armature', 'sm:puppet', 'sm:costume', 'anim:model', 'anim:rig']);

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

/** Start the next season of a series, or a sequel. Returns the new project. */
export function continueProject(state: GameState, p: Project, title?: string): Project {
  const why = canContinue(p);
  if (why) throw new Error(why);
  const series = p.episodes.length > 1;
  const number = (p.continues?.number ?? 1) + 1;
  const next = createProject(state, {
    title: (title ?? (series ? `${p.title}: Season ${number}` : `${p.title} ${number}`)).trim(),
    scenarioId: p.funding.scenarioId === 'commissioned' && p.renewal?.outcome !== 'renewed' ? 'mid' : p.funding.scenarioId,
    axes: { ...p.axes, genres: p.axes.genres.map((g) => ({ ...g })) },
  });
  next.axes = JSON.parse(JSON.stringify(p.axes));
  next.characters = JSON.parse(JSON.stringify(approvedCharacters(p).length ? approvedCharacters(p) : p.characters));
  for (const c of next.characters) delete c.beats; // a new season writes its own arcs
  next.worldRules = (JSON.parse(JSON.stringify(p.worldRules)) as typeof p.worldRules).map((r) => ({ ...r, sceneIds: [] }));
  next.relationships = JSON.parse(JSON.stringify(p.relationships));
  next.threads = (p.threads ?? []).filter((t) => t.resolution === 'open' || !t.resolvedIn).map((t) => ({ ...t, sceneIds: [], resolvedIn: null }));
  next.story = { ...p.story };
  // Builds already finished for these characters, at the design they were built to.
  next.tasks = p.tasks.filter((t) => BUILD_KINDS.has(t.kind) && t.status === 'done' && next.characters.some((c) => c.id === t.assetRef && c.designVersion === (t.needsVersion ?? c.designVersion)))
    .map((t) => ({ ...t, workedDays: 0 }));
  next.continues = {
    from: p.id, number, ...(p.seasonArc?.trim() ? { previousArc: p.seasonArc.trim() } : {}),
    returning: p.cast.filter((a) => a.performer !== 'player').map((a) => ({
      characterId: a.characterId, personId: a.performer, method: a.method,
      rate: p.hires.find((h) => h.id === a.hireId)?.dayRate ?? 0,
    })),
  };
  p.continuedBy = next.id;
  // A renewal is an offer to fund the next season, which the player still has to accept.
  const old = (p.finance?.deals ?? []).find((d) => d.kind === 'commissioner' && d.status === 'accepted');
  if (p.renewal?.outcome === 'renewed' && old) {
    const deal: FinanceDeal = { ...JSON.parse(JSON.stringify(old)), id: newId(state, 'fd'), status: 'offered', askedAt: state.now, received: 0, repaid: 0, reason: 'They renewed the series and offer to fund this season on the same terms.' };
    delete deal.sent;
    delete deal.sentCopy;
    next.finance = { estimate: next.finance?.estimate ?? 0, target: next.finance?.target ?? 0, deals: [deal] };
  }
  next.history.push({ at: state.now, text: `Continues ${p.title}.` });
  addLog(state, `You started ${next.title}, continuing ${p.title}. Its characters and world carry over; ask back the people you want.`, 'project', { projectId: next.id, route: { view: 'project', projectId: next.id, tab: 'overview' } });
  return next;
}
