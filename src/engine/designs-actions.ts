// Approving a design or asking for changes (designs.ts says how design approval works and why). Loaded with the
// Production page, not at startup.
import { designStatus, designsToReview, visdev } from './designs';
import { assertEditable } from './projects';
import type { Project } from './types';

export function approveDesign(p: Project, characterId: string): void {
  assertEditable(p);
  const c = p.characters.find((x) => x.id === characterId);
  if (!c || !designsToReview(p).includes(characterId)) throw new Error('That character has nothing to build.');
  if (designStatus(p, characterId) !== 'awaiting') throw new Error(designStatus(p, characterId) === 'approved' ? 'That design is approved already.' : "The designs aren't finished yet.");
  (p.designApprovals ??= {})[characterId] = { version: c.designVersion, status: 'approved' };
}

/** Send a design back: another day of visual development, and every build waits for it. Refused once building began. */
export function askForDesignChanges(p: Project, characterId: string): void {
  assertEditable(p);
  const c = p.characters.find((x) => x.id === characterId);
  const v = visdev(p);
  if (!c || !v || !designsToReview(p).includes(characterId)) throw new Error('That character has nothing to build.');
  if (designStatus(p, characterId) !== 'awaiting') throw new Error("You can ask for changes once the designs are finished, before you approve one.");
  v.units += 1;
  v.status = 'waiting';
  (p.designApprovals ??= {})[characterId] = { version: c.designVersion, status: 'changes' };
}
