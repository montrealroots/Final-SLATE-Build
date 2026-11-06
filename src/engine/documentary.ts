// Documentary access: contributors answer consent requests after a delay on the shared clock.
// Interviews with a contributor cannot be filmed, and the film cannot be delivered, without consent.

import { stream } from './rng';
import { addLog, registerHandler, schedule } from './state';
import { DAY } from './time';
import type { GameState, Project } from './types';

/** Simulation assumption: about four in five contributors agree to take part. */
export const CONSENT_RATE = 0.8;

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
  const text = yes
    ? `${c.name} agreed to take part in ${p.title}.`
    : `${c.name} declined to take part in ${p.title}. Scenes with ${c.name} can't be filmed; you can remove them or find another contributor.`;
  addLog(state, text, yes ? 'project' : 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'script' } });
  return { message: text };
});
