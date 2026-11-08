// Starting a continuation (continuation.ts says what carries over and why). Kept apart from the renewal decision so it
// loads with the Projects page, not at startup: the startup JavaScript budget is 700 kB.
import { canContinue } from './continuation';
import { openOffer } from './negotiation';
import { approvedCharacters, createProject } from './projects';
import { addLog, newId } from './state';
import type { FinanceDeal, GameState, Project } from './types';

const BUILD_KINDS = new Set(['sm:armature', 'sm:puppet', 'sm:costume', 'anim:model', 'anim:rig']);

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
    delete deal.counter;
    next.finance = { estimate: next.finance?.estimate ?? 0, target: next.finance?.target ?? 0, deals: [deal] };
    openOffer(state, next, deal);
  }
  next.history.push({ at: state.now, text: `Continues ${p.title}.` });
  addLog(state, `You started ${next.title}, continuing ${p.title}. Its characters and world carry over; ask back the people you want.`, 'project', { projectId: next.id, route: { view: 'project', projectId: next.id, tab: 'overview' } });
  return next;
}
