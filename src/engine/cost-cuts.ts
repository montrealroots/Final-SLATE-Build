// Ways to make the approved script cost less (estimate.ts says how the estimate is made). Loaded with the Budget page,
// not at startup (the startup JavaScript budget).
import { projectedCost } from './estimate';
import { approvedScenes, deriveRequirements, fundingScenario } from './projects';
import type { GameState, Project } from './types';

/**
 * Ways to make the approved script cost less (SLATE-03-03.02 and 08-05.03, November 8, 2026), each with what the estimate
 * would save. Each is the same projection made without that thing, so the saving is the engine's own figure, not a guess.
 * They are choices, not advice: cutting a scene changes the film, and only the player decides that. Essential scenes
 * aren't offered, since the story doesn't work without them.
 */
export interface CostCut { label: string; saving: number; how: string }

export function costCuts(state: GameState, p: Project, limit = 5): CostCut[] {
  if (p.approvedDraft === null) return [];
  const draftIndex = p.drafts.findIndex((d) => d.number === p.approvedDraft);
  const base = projectedCost(state, p).total;
  const variant = (change: (q: Project) => void): number => {
    const q: Project = JSON.parse(JSON.stringify(p));
    q.tasks = [];
    change(q);
    // As approval would leave it: the breakdown derived from the changed draft.
    q.requirements = deriveRequirements(q, q.drafts[draftIndex].scenes, q.drafts[draftIndex].characters);
    return base - projectedCost(state, q).total;
  };
  const out: CostCut[] = [];
  const scenes = approvedScenes(p);
  for (const s of scenes.slice(0, 40)) {
    if (s.essential || scenes.filter((x) => x.episode === s.episode).length < 2) continue;
    // The working copy too: day estimates read it, so the option is the script as it would be once the cut is made.
    const saving = variant((q) => { q.drafts[draftIndex].scenes = q.drafts[draftIndex].scenes.filter((x) => x.id !== s.id); q.scenes = q.scenes.filter((x) => x.id !== s.id); });
    out.push({ label: `Cut ${s.heading.place || 'an untitled scene'} (${s.estMinutes} min)`, saving, how: 'Remove the scene in the Script and approve a new draft.' });
    if (s.crowd >= 10) {
      const crowd = variant((q) => { for (const x of [...q.drafts[draftIndex].scenes, ...q.scenes]) if (x.id === s.id) x.crowd = Math.floor(s.crowd / 2); });
      out.push({ label: `Halve the crowd in ${s.heading.place || 'that scene'} (${s.crowd} to ${Math.floor(s.crowd / 2)})`, saving: crowd, how: 'Lower the crowd size in the scene and approve a new draft.' });
    }
  }
  const sizes = ['micro', 'low', 'mid', 'commissioned'];
  const smaller = sizes[sizes.indexOf(p.funding.scenarioId) - 1];
  if (smaller) out.push({ label: `Make it at the ${fundingScenario(smaller).label.toLowerCase()} size`, saving: variant((q) => { q.funding.scenarioId = smaller; }), how: 'A smaller size pays less a day for locations and gear, with people covering more than one job.' });
  const quality = ['limited', 'tv', 'feature'] as const;
  const simpler = quality[quality.indexOf(p.axes.animationQuality) - 1];
  if (p.axes.medium !== 'live-action' && simpler) out.push({ label: `Animate to a ${simpler === 'limited' ? 'limited' : 'television'} standard`, saving: variant((q) => { q.axes.animationQuality = simpler; }), how: 'Fewer drawings or frames to render for each second.' });
  return out.filter((c) => c.saving >= 1000).map((c) => ({ ...c, saving: Math.round(c.saving / 1000) * 1000 })).sort((a, b) => b.saving - a.saving).slice(0, limit);
}
