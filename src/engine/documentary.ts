// Documentary access: contributors answer consent requests after a delay on the shared clock.
// Interviews with a contributor cannot be filmed, and the film cannot be delivered, without consent.
// Agreement can come with conditions on use (SLATE-14-02.02, November 8, 2026), decided from the world seed and recorded
// with the agreement: their face hidden (blurring work in post, before delivery), their name withheld (the credit says
// so), or approval of how they appear (they see the locked cut; a refusal means their scenes are cut before delivery).
// The shares of each condition are simulation assumptions.

import { t } from './production/tasks';
import { stream } from './rng';
import { addLog, registerHandler, schedule } from './state';
import { DAY } from './time';
import type { GameState, Project } from './types';

/** Simulation assumption: about four in five contributors agree to take part. */
export const CONSENT_RATE = 0.8;
/** Simulation assumption: how often an agreement comes with each condition. */
export const RESTRICTION_RATE = { face: 0.25, name: 0.2, approval: 0.2 } as const;
export const RESTRICTION_WORDS = { face: 'their face is not shown', name: 'their name is not used', approval: 'they approve how they appear' } as const;
export const CUT_REVIEW_DAYS = 3;

/** Scenes with each contributor whose face must be hidden get blurring work after picture lock. Kept with the plan. */
export function ensureBlurTasks(p: Project): void {
  if (!p.tasks.length) return;
  for (const c of p.contributors.filter((x) => x.consent === 'given' && x.restrictions?.includes('face'))) {
    const scenes = p.scenes.filter((s) => s.contributorIds.includes(c.id));
    if (!scenes.length || p.tasks.some((x) => x.id === `post:blur:${c.id}`)) continue;
    p.tasks.push(t('post:blur', c.id, `Hide ${c.name}'s Face`, 'Post Production', 'editor', Math.max(1, scenes.length * 0.5), 'days', ['milestone:lock:1'], { sceneIds: scenes.map((s) => s.id) }));
  }
}

registerHandler('contributor-cut', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const c = p?.contributors.find((x) => x.id === ev.payload.contributorId);
  if (!p || !c || c.cutApproval?.status !== 'shown') return { suppressInterrupt: true };
  const ok = stream(state.seed, 'cut-approval', p.id, c.id, String(c.cutApproval.answerAt))() < 0.8;
  c.cutApproval.status = ok ? 'approved' : 'refused';
  const text = ok ? `${c.name} approved how they appear in ${p.title}.` : `${c.name} didn't approve how they appear in ${p.title}. Cut their scenes to deliver it.`;
  addLog(state, text, ok ? 'project' : 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'edit' } });
  return { message: text };
});

export function requestConsent(state: GameState, p: Project, contributorId: string): void {
  const c = p.contributors.find((x) => x.id === contributorId);
  if (!c) throw new Error('That contributor is no longer in the project.');
  if (c.consent !== 'not-asked') throw new Error(`You've already asked ${c.name}.`);
  c.consent = 'requested';
  const r = stream(state.seed, 'consent-delay', p.id, c.id)();
  schedule(state, state.now + Math.round((2 + r * 4) * DAY), 'consent-response', { projectId: p.id, contributorId: c.id }, { attention: 'notify', priority: 36 });
}

registerHandler('consent-response', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const c = p?.contributors.find((x) => x.id === ev.payload.contributorId);
  if (!p || !c || c.consent !== 'requested') return { suppressInterrupt: true };
  const yes = stream(state.seed, 'consent', p.id, c.id)() < CONSENT_RATE;
  c.consent = yes ? 'given' : 'declined';
  if (yes) {
    const r = stream(state.seed, 'restrictions', p.id, c.id);
    const asked = (['face', 'name', 'approval'] as const).filter((k) => r() < RESTRICTION_RATE[k]);
    if (asked.length) c.restrictions = [...asked];
    ensureBlurTasks(p);
  }
  const text = yes
    ? `${c.name} agreed to take part in ${p.title}${c.restrictions?.length ? `, on condition: ${c.restrictions.map((k) => RESTRICTION_WORDS[k]).join('; ')}` : ''}.`
    : `${c.name} declined to take part in ${p.title}. Scenes with ${c.name} can't be filmed; you can remove them or find another contributor.`;
  addLog(state, text, yes ? 'project' : 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'script' } });
  return { message: text };
});
