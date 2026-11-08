// Approving a design before it is built (SLATE-11-03.02, November 8, 2026). Puppets, models and rigs used to start as
// soon as the visual development finished: whatever was drawn was built. Now each character's design waits for the
// producer once the designs are done. Approving it lets its builds start; asking for changes reopens the visual
// development for another day of the artist's paid work, and every build waits for it, so a change costs time and
// money before anything is fabricated rather than after. A design changed later on the Characters page needs approving
// again (its version moves on), as its builds are redone. Projects started before this keep building without it
// (designReview unset), so no production already under way stops.
import type { Project, Task } from './types';

const GATED = new Set(['sm:armature', 'anim:model', 'anim:rig']);

export const visdev = (p: Project) => p.tasks.find((t) => t.kind === 'anim:visdev');

export type DesignStatus = 'designing' | 'awaiting' | 'approved' | 'changes';

/** Characters whose builds wait on a design approval, in the order the tasks list them. */
export function designsToReview(p: Project): string[] {
  if (!p.designReview) return [];
  return [...new Set(p.tasks.filter((t) => GATED.has(t.kind) && t.assetRef).map((t) => t.assetRef!))];
}

export function designStatus(p: Project, characterId: string): DesignStatus {
  const c = p.characters.find((x) => x.id === characterId);
  const a = p.designApprovals?.[characterId];
  if (a?.status === 'approved' && a.version === c?.designVersion) return 'approved';
  if (visdev(p)?.status !== 'done') return a?.status === 'changes' ? 'changes' : 'designing';
  return 'awaiting';
}

/** Why a build can't start for want of an approved design (workday.ts depsMet), or null. */
export function designGate(p: Project, task: Task): string | null {
  if (!p.designReview || !GATED.has(task.kind) || !task.assetRef) return null;
  const s = designStatus(p, task.assetRef);
  if (s === 'approved' || s === 'designing' || s === 'changes') return null; // the visual development task still gates it
  const name = p.characters.find((c) => c.id === task.assetRef)?.name;
  return name ? `Waiting for you to approve ${name}'s design.` : 'Waiting for you to approve the design.';
}

