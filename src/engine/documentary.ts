// Documentary access: contributors answer consent requests after a delay on the shared clock.
// Interviews with a contributor cannot be filmed, and the film cannot be delivered, without consent.
// Agreement can come with conditions on use (SLATE-14-02.02, November 8, 2026), decided from the world seed and recorded
// with the agreement: their face hidden (blurring work in post, before delivery), their name withheld (the credit says
// so), or approval of how they appear (they see the locked cut; a refusal means their scenes are cut before delivery).
// The shares of each condition are simulation assumptions.

import { isNonfiction } from './projects';
import { t } from './production/tasks';
import { stream } from './rng';
import { addLog, newId, registerHandler, schedule } from './state';
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

// ---------------- A plan proposed from a subject (the v4 package, 01; ledger V4-004.03; November 12, 2026) ----------------
// A documentary starts from what the player wants to find out. The game proposes questions to answer and the kinds of
// people to approach, and says how access and consent work here. It invents nothing found and nobody: the questions go
// to Research as open, no fact is added to Evidence, and no contributor is created until the player names a real one.

export type DocSubjectKind = 'person' | 'event' | 'place' | 'practice';
export interface DocPlan { subject: string; kind: DocSubjectKind; approach: string[]; at: number }

export const DOC_SUBJECTS: Record<DocSubjectKind, { label: string; questions: (s: string) => string[]; approach: string[]; access: string }> = {
  person: {
    label: 'A Person',
    questions: (s) => [`What is on the record about ${s}, and who recorded it?`, `Where do accounts of ${s} disagree?`, `Who knew ${s} at each stage, and who will speak?`, `What did ${s} say in their own words, and where is it kept?`, `What is still unknown about ${s}?`],
    approach: ['Someone close to them', 'Someone who worked with them', 'Someone who has written about them', 'Someone who remembers them differently'],
    access: 'Letters, recordings and photographs are held by families, archives and publishers; each archive item used is paid for in Archive Research.',
  },
  event: {
    label: 'An Event',
    questions: (s) => [`What happened at ${s}, in order, by the record?`, `Who was there, and who has spoken about it on the record?`, `What footage, photographs or documents of ${s} exist, and who holds them?`, `Where do the accounts of ${s} contradict each other?`, `What changed because of ${s}?`],
    approach: ['Someone who was there', 'Someone who reported on it', 'Someone who has studied it', 'Someone affected by it'],
    access: 'News libraries and public records hold most of it; each archive item used is paid for in Archive Research.',
  },
  place: {
    label: 'A Place',
    questions: (s) => [`What is ${s} like now, and how has it changed?`, `Who lives or works in ${s}, and what do they want said?`, `What archives hold the past of ${s}?`, `What would filming in ${s} need: permission, seasons, access?`],
    approach: ['Someone who lives there', 'Someone who works there', 'A local historian', 'Someone who left'],
    access: 'Filming there needs the places themselves: set the place on the Script page, and its permits and weather apply to the shoot.',
  },
  practice: {
    label: 'A Practice Or Issue',
    questions: (s) => [`How does ${s} work, step by step, as the people who do it describe it?`, `Who does ${s}, who is affected by it, and who studies it?`, `What do the figures on ${s} say, and who collected them?`, `What is disputed about ${s}?`],
    approach: ['Someone who does it', 'Someone affected by it', 'Someone who studies it', 'Someone who opposes it'],
    access: 'Published studies and official figures are the record; each archive item used is paid for in Archive Research.',
  },
};

/** How consent works in this game, said once with the plan: true of every documentary, whatever its subject. */
export const CONSENT_PLAN = 'Each person is asked for consent and answers in two to six days; they may agree on condition that their face is hidden, their name withheld, or that they approve how they appear. Nobody is filmed, and the film is not delivered, without it.';

/** Proposes the plan: open questions in Research, and the kinds of people to approach. Nothing found, nobody named. */
export function proposeDocumentaryPlan(state: GameState, p: Project, subject: string, kind: DocSubjectKind): DocPlan {
  if (!isNonfiction(p.axes.format)) throw new Error('Only a documentary or unscripted show has a documentary plan.');
  if (p.delivered) throw new Error('This project has been delivered.');
  const s = subject.trim().slice(0, 120);
  if (!s) throw new Error('Say what the film is about.');
  const def = DOC_SUBJECTS[kind];
  if (!def) throw new Error('Choose what kind of subject it is.');
  const have = new Set((p.research ?? []).map((n) => n.question));
  for (const q of def.questions(s)) if (!have.has(q)) (p.research ??= []).push({ id: newId(state, 'rn'), question: q, reference: '', status: 'open', sceneIds: [] });
  p.docPlan = { subject: s, kind, approach: [...def.approach], at: state.now };
  return p.docPlan;
}
