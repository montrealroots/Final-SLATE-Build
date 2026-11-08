// Showing a contributor with approval the locked cut (documentary.ts says how conditions on use work and why). Loaded
// with the Edit page, not at startup; their answer is handled at startup, in documentary.ts.
import { getPlace } from '../data/places';
import { CUT_REVIEW_DAYS } from './documentary';
import { addLog, schedule } from './state';
import { DAY, dateKey, formatDateKey } from './time';
import type { GameState, Project } from './types';

/** Show a contributor with approval the locked cut. They answer in a few days. */
export function showCut(state: GameState, p: Project, contributorId: string): void {
  const c = p.contributors.find((x) => x.id === contributorId);
  if (!c?.restrictions?.includes('approval')) throw new Error('They have no approval over the cut.');
  if (!p.edit.pictureLocked) throw new Error('Lock picture first: they approve the cut as it will be delivered.');
  if (c.cutApproval?.status === 'shown' || c.cutApproval?.status === 'approved') throw new Error(c.cutApproval.status === 'shown' ? 'They are reviewing it.' : 'They approved it already.');
  c.cutApproval = { status: 'shown', answerAt: state.now + CUT_REVIEW_DAYS * DAY };
  schedule(state, c.cutApproval.answerAt, 'contributor-cut', { projectId: p.id, contributorId: c.id }, { attention: 'notify', priority: 36 });
  addLog(state, `You showed ${c.name} the cut of ${p.title}. Their answer is due ${formatDateKey(dateKey(c.cutApproval.answerAt, getPlace(p.axes.basePlaceId).zone))}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'edit' } });
}
