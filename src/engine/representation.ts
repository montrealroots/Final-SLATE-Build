// Representation (the v3 package, 02: "Representation requires actual agent search, mandate, submissions, negotiation,
// commission accounting, conflicts, renewal and termination, not a decorative agent name"). Until November 12, 2026 the
// game had no agents at all.
//
// What an agent is here. The player makes films and series, and raises their money from backers (finance.ts). An agent
// takes one of those jobs off the player, for a share of what it brings:
// - Search. Four agents, each saying what they need to see before they take someone on, and each wrong for someone. An
//   approach is answered in a few days, from the player's record as it stands: scripts approved, projects delivered,
//   how they were received, prizes. There is no chance in the answer.
// - Mandate. What they offer is written out before it is signed: the commission, the twelve months, which backers they
//   submit to, where they stand aside, the notice, and that commission follows the deals they brought.
// - Submissions. The agent submits a project to a backer. It is the same approach the player could make (the same
//   documents, the same wait, the same odds), with two differences: a commissioner reads a submission from an agent
//   before the player has delivered anything, and an offer that comes of it is theirs to negotiate.
// - Negotiation. Asking for a better term on an offer they brought counts their weight with the player's own leverage
//   (negotiation.ts), while they still represent the player.
// - Commission. Their share of each payment a deal they submitted makes, taken as the money arrives, on the project's
//   own ledger (finance.ts payCommission). The statement here is those postings added up, never a number kept apart.
// - Conflicts. One agent at a time. And each stands aside from one kind of backer, for a reason they give before
//   signing; the player approaches that backer themselves, and no commission is due.
// - Renewal. A month before the term ends they say whether they would renew, and why: they do when the term brought
//   them commission or the player delivered a project in it. The player renews or lets it run out.
// - Ending it. Thirty days' notice. No new submissions in that time; what they already submitted stays theirs.
//
// The agents are fictional, and so are their agencies. Rates, terms and weights are game calibration.
import type { AgentApproach, FinanceDeal, GameState, Project } from './types';
import { BACKERS, approachBacker, backerOptions, deals, trackRecord } from './finance';
import { money } from './budget';
import { addLog, registerHandler, schedule } from './state';
import { DAY } from './time';

/** The kinds of backer an agent can be asked to submit to. Grants and your own money are never theirs. */
export type PlacedKind = 'investor' | 'co-producer' | 'commissioner';
export const PLACED: PlacedKind[] = ['investor', 'co-producer', 'commissioner'];

export interface Agent {
  id: string;
  name: string;
  agency: string;
  /** Their share of what a deal they submitted pays in. */
  rate: number;
  /** What they need to see before they take someone on. */
  needs: { scripts?: number; delivered?: number; reception?: number; winsInstead?: number };
  /** The needs in words, as they would say them. */
  takesOn: string;
  /** Added to the player's leverage when they negotiate an offer they brought (negotiation.ts). */
  weight: number;
  /** The backer they stand aside from, and why. */
  standsAside: { kind: PlacedKind; why: string } | null;
}

export const AGENTS: Agent[] = [
  {
    id: 'vale', name: 'Imogen Vale', agency: 'Vale Okafor Associates', rate: 0.15, weight: 0.1,
    needs: { scripts: 1 }, takesOn: 'New filmmakers with an approved script to show.',
    standsAside: { kind: 'co-producer', why: 'Her agency also represents co-production companies, so she doesn\'t bring her own clients\' projects to them.' },
  },
  {
    id: 'montoya', name: 'Rafael Montoya', agency: 'Meridian Screen Agency', rate: 0.1, weight: 0.15,
    needs: { delivered: 1 }, takesOn: 'Filmmakers who have delivered a project.',
    standsAside: { kind: 'investor', why: 'He holds a stake in a film fund, so he doesn\'t ask private investors for money on a client\'s behalf.' },
  },
  {
    id: 'adeyemi', name: 'Folake Adeyemi', agency: 'Adeyemi Lindqvist', rate: 0.1, weight: 0.2,
    needs: { delivered: 1, reception: 60 }, takesOn: 'Filmmakers with a delivered project that was well received.',
    standsAside: null,
  },
  {
    id: 'brandt', name: 'Karl Brandt', agency: 'Northlight Management', rate: 0.12, weight: 0.25,
    needs: { delivered: 2, winsInstead: 1 }, takesOn: 'Filmmakers with two delivered projects, or a prize.',
    standsAside: { kind: 'commissioner', why: 'He sits on a broadcaster\'s advisory board, so he doesn\'t submit to commissioners.' },
  },
];
export const agentById = (id: string): Agent => {
  const a = AGENTS.find((x) => x.id === id);
  if (!a) throw new Error('Unknown agent.');
  return a;
};

/** How long an agent takes to answer an approach, how long their offer stays open, the term, the warning before it ends, and the notice. */
export const AGENT_ANSWER_DAYS = 3;
export const MANDATE_OPEN_DAYS = 14;
export const MANDATE_DAYS = 365;
export const RENEWAL_WARNING_DAYS = 30;
export const NOTICE_DAYS = 30;

const rep = (state: GameState) => (state.representation ??= { approaches: [], past: [] });
/** The agent who represents the player now, with the mandate, or null. */
export function representedBy(state: GameState): { agent: Agent; signedAt: number; until: number; noticeUntil?: number } | null {
  const c = state.representation?.current;
  return c ? { agent: agentById(c.agentId), signedAt: c.signedAt, until: c.until, noticeUntil: c.noticeUntil } : null;
}

/** The player's record as an agent reads it. */
export function recordFor(state: GameState): { scripts: number; delivered: number; best: number | null; wins: number } {
  const works = state.projects.filter((p) => p.delivered && p.quality);
  return {
    scripts: state.projects.filter((p) => p.approvedDraft !== null).length,
    delivered: state.projects.filter((p) => p.delivered).length,
    best: works.length ? Math.max(...works.map((p) => p.quality!.reception)) : null,
    wins: trackRecord(state).wins,
  };
}

/** Whether this agent would take the player on today, and the reason either way, from the record alone. */
export function agentRead(state: GameState, agent: Agent): { takes: boolean; reason: string } {
  const r = recordFor(state);
  const n = agent.needs;
  const word = (x: number) => ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][x] ?? String(x);
  const count = (x: number, one: string, many: string) => (x === 0 ? 'none' : x === 1 ? `one ${one}` : `${word(x)} ${many}`);
  if (n.winsInstead && r.wins >= n.winsInstead) return { takes: true, reason: `Your work has won ${count(r.wins, 'prize', 'prizes')}, which is what they look for.` };
  if (n.scripts && r.scripts < n.scripts) return { takes: false, reason: 'They want to read an approved script first, and you have none yet.' };
  if (n.delivered && r.delivered < n.delivered) {
    return { takes: false, reason: `They take on filmmakers with ${n.delivered === 1 ? 'a delivered project' : `${word(n.delivered)} delivered projects`}${n.winsInstead ? ' or a prize' : ''}; you have ${count(r.delivered, 'delivered project', 'delivered projects')}${n.winsInstead ? ' and no prize' : ''}.` };
  }
  if (n.reception && (r.best ?? 0) < n.reception) return { takes: false, reason: `They want a delivered project that was well received. Your best so far was received at ${r.best ?? 0} of 100; they look for ${n.reception}.` };
  if (n.reception) return { takes: true, reason: `Your delivered work was received at ${r.best} of 100, which is what they look for.` };
  if (n.delivered) return { takes: true, reason: `You have ${count(r.delivered, 'delivered project', 'delivered projects')}, which is what they look for.` };
  return { takes: true, reason: 'You have an approved script for them to read, which is what they look for.' };
}

/** The mandate an agent offers, in the terms the player signs. */
export function mandateTerms(agent: Agent): string[] {
  const pct = `${Math.round(agent.rate * 1000) / 10}%`;
  const places = PLACED.filter((k) => k !== agent.standsAside?.kind).map((k) => BACKERS[k].name.toLowerCase());
  return [
    `Commission: ${pct} of the money a backer pays into a project on a deal ${agent.name} submitted, taken as each payment arrives.`,
    'No commission on money you raise yourself: grants, your own money, a studio you pitched, or any backer you approached without them.',
    `They submit to: ${places.length === 2 ? `${places[0]}s and ${places[1]}s` : `${places[0]}s, ${places[1]}s and ${places[2]}s`}. A commissioner reads a submission from an agent before you have delivered a project.`,
    agent.standsAside ? `They stand aside from ${BACKERS[agent.standsAside.kind].name.toLowerCase()}s. ${agent.standsAside.why} You approach those yourself, and no commission is due.` : 'They declare no conflict with any backer.',
    'One agent at a time: while they represent you, no other agent will.',
    'Twelve months. A month before it ends they say whether they would renew; renewing is yours to choose.',
    `Either of you can end it with ${NOTICE_DAYS} days' notice. They make no new submissions in that time. Deals they already submitted stay theirs, and their commission on those is due whenever the money arrives.`,
  ];
}

/** Why this agent can't be approached now, or null. */
export function approachRefusal(state: GameState, agentId: string): string | null {
  const agent = agentById(agentId);
  const r = state.representation;
  const cur = representedBy(state);
  if (cur) return cur.agent.id === agentId ? `${agent.name} represents you already.` : `${cur.agent.name} represents you, and an agent takes on nobody who has one. End that first, with ${NOTICE_DAYS} days' notice.`;
  const open = r?.approaches.find((a) => a.status === 'asked' || a.status === 'offered');
  if (open) return open.agentId === agentId ? (open.status === 'asked' ? `${agent.name} hasn't answered yet.` : `${agent.name} has offered to represent you. Sign or decline first.`) : `You are waiting on ${agentById(open.agentId).name}. One approach at a time.`;
  // Someone who said no reads the record again only once it has changed.
  const last = [...(r?.approaches ?? [])].reverse().find((a) => a.agentId === agentId && a.status === 'declined');
  const now = recordFor(state);
  if (last && last.record === `${now.scripts}/${now.delivered}/${now.best ?? '-'}/${now.wins}`) return `${agent.name} said no, and your record is as it was then. ${last.reason}`;
  return null;
}

/** Approach an agent. They answer in AGENT_ANSWER_DAYS, from the record as it stands on that day. */
export function approachAgent(state: GameState, agentId: string): AgentApproach {
  const why = approachRefusal(state, agentId);
  if (why) throw new Error(why);
  const agent = agentById(agentId);
  const a: AgentApproach = { agentId, at: state.now, answerAt: state.now + AGENT_ANSWER_DAYS * DAY, status: 'asked', reason: '', record: '' };
  rep(state).approaches.push(a);
  schedule(state, a.answerAt, 'agent-answer', { agentId, at: a.at }, { attention: 'notify', priority: 45 });
  addLog(state, `You asked ${agent.name} of ${agent.agency} to represent you. They will answer in about ${AGENT_ANSWER_DAYS} days.`, 'personal', { route: { view: 'profile' } });
  return a;
}

registerHandler('agent-answer', (state, ev) => {
  const a = state.representation?.approaches.find((x) => x.agentId === ev.payload.agentId && x.at === ev.payload.at);
  if (!a || a.status !== 'asked') return { suppressInterrupt: true };
  const agent = agentById(a.agentId);
  const read = agentRead(state, agent);
  const r = recordFor(state);
  a.record = `${r.scripts}/${r.delivered}/${r.best ?? '-'}/${r.wins}`;
  a.reason = read.reason;
  if (!read.takes) {
    a.status = 'declined';
    const text = `${agent.name} won't represent you yet. ${read.reason}`;
    addLog(state, text, 'personal', { route: { view: 'profile' } });
    return { message: text };
  }
  a.status = 'offered';
  a.openUntil = state.now + MANDATE_OPEN_DAYS * DAY;
  schedule(state, a.openUntil, 'agent-offer-lapse', { agentId: a.agentId, at: a.at }, { attention: 'notify', priority: 45 });
  const text = `${agent.name} of ${agent.agency} offers to represent you. ${read.reason} The offer is open for ${MANDATE_OPEN_DAYS} days; read its terms before you sign.`;
  addLog(state, text, 'personal', { route: { view: 'profile' } });
  return { message: text };
});

registerHandler('agent-offer-lapse', (state, ev) => {
  const a = state.representation?.approaches.find((x) => x.agentId === ev.payload.agentId && x.at === ev.payload.at);
  if (!a || a.status !== 'offered') return { suppressInterrupt: true };
  a.status = 'lapsed';
  const text = `${agentById(a.agentId).name}'s offer to represent you lapsed unanswered.`;
  addLog(state, text, 'personal', { route: { view: 'profile' } });
  return { message: text };
});

const openOffer = (state: GameState, agentId: string) => state.representation?.approaches.find((a) => a.agentId === agentId && a.status === 'offered' && (a.openUntil === undefined || state.now < a.openUntil));

/** Sign the mandate an agent offered. */
export function signWith(state: GameState, agentId: string): void {
  const a = openOffer(state, agentId);
  if (!a) throw new Error('That offer is no longer open.');
  if (representedBy(state)) throw new Error('You are represented already.');
  const agent = agentById(agentId);
  a.status = 'signed';
  const until = state.now + MANDATE_DAYS * DAY;
  rep(state).current = { agentId, signedAt: state.now, until, renewed: 0 };
  scheduleTerm(state, agentId, until);
  // They look for work for you every few weeks while they represent you (jobs.ts).
  schedule(state, state.now + 21 * DAY, 'job-offer', { via: agentId }, { attention: 'silent', priority: 70, id: `job-offer:${agentId}:${state.now}` });
  addLog(state, `${agent.name} of ${agent.agency} represents you, for twelve months.`, 'personal', { route: { view: 'profile' } });
}

/** Turn an agent's offer down. They can be approached again once the record has changed. */
export function declineMandate(state: GameState, agentId: string): void {
  const a = openOffer(state, agentId);
  if (!a) throw new Error('That offer is no longer open.');
  a.status = 'refused';
  addLog(state, `You turned down ${agentById(agentId).name}'s offer to represent you.`, 'personal', { route: { view: 'profile' } });
}

function scheduleTerm(state: GameState, agentId: string, until: number): void {
  schedule(state, until - RENEWAL_WARNING_DAYS * DAY, 'agent-renewal', { agentId, until }, { attention: 'notify', priority: 45 });
  schedule(state, until, 'agent-term-end', { agentId, until }, { attention: 'notify', priority: 45 });
}

// ---------------- Submissions ----------------

/** Every deal an agent submitted, on any project, newest first. */
export function submissions(state: GameState, agentId?: string): { p: Project; d: FinanceDeal }[] {
  return state.projects.flatMap((p) => deals(p).filter((d) => d.via && (!agentId || d.via.agentId === agentId)).map((d) => ({ p, d }))).sort((a, b) => b.d.askedAt - a.d.askedAt);
}

/** Why the player's agent can't submit this project to this kind of backer now, or null. */
export function submitRefusal(state: GameState, p: Project, kind: PlacedKind): string | null {
  const cur = representedBy(state);
  if (!cur) return 'Nobody represents you. Find an agent from your profile.';
  const { agent } = cur;
  if (cur.noticeUntil) return `${agent.name} is working out their notice and makes no new submissions.`;
  if (agent.standsAside?.kind === kind) return `${agent.name} stands aside from ${BACKERS[kind].name.toLowerCase()}s. ${agent.standsAside.why} You can approach one yourself, and no commission is due.`;
  const opt = backerOptions(state, p, true).find((o) => o.kind === kind);
  if (!opt) return 'That backer is not available for this project.';
  return opt.ready ? null : opt.needs;
}

/** Ask the agent to submit this project to a backer. The deal is theirs: commission is due on what it pays in. */
export function submitThrough(state: GameState, p: Project, kind: PlacedKind): FinanceDeal {
  const why = submitRefusal(state, p, kind);
  if (why) throw new Error(why);
  const { agent } = representedBy(state)!;
  const d = approachBacker(state, p, kind, { agentId: agent.id, name: agent.name, rate: agent.rate });
  return d;
}

/** The weight an agent adds when a better term is asked on an offer they brought, while they represent the player. */
export function agentWeight(state: GameState, d: FinanceDeal): number {
  const cur = state.representation?.current;
  return d.via && cur?.agentId === d.via.agentId ? agentById(cur.agentId).weight : 0;
}

// ---------------- Commission: the ledgers' postings, added up ----------------

export interface CommissionLine { at: number; projectId: string; title: string; dealId: string; backer: string; amount: number }
/** Each commission taken, from the projects' own ledgers (finance.ts payCommission), newest first. */
export function commissionStatement(state: GameState, agentId?: string): CommissionLine[] {
  const out: CommissionLine[] = [];
  for (const p of state.projects) {
    for (const o of p.obligations) {
      const m = /^commission:([^:]+):(.+)$/.exec(o.ref ?? '');
      if (!m || (agentId && m[1] !== agentId)) continue;
      const d = deals(p).find((x) => x.id === m[2]);
      for (const x of o.postings.filter((q) => q.kind === 'settle')) out.push({ at: x.at, projectId: p.id, title: p.title, dealId: m[2], backer: d?.backer ?? 'A backer', amount: x.amount });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}
export const commissionTotal = (state: GameState, agentId?: string, since = 0): number => commissionStatement(state, agentId).filter((x) => x.at >= since).reduce((n, x) => n + x.amount, 0);

// ---------------- Renewal and ending ----------------

/** Whether the agent would renew, and why: the term must have brought them commission, or the player a delivered project. */
export function renewalRead(state: GameState): { willing: boolean; reason: string } | null {
  const c = state.representation?.current;
  if (!c) return null;
  const agent = agentById(c.agentId);
  const from = c.until - MANDATE_DAYS * DAY;
  const earned = commissionTotal(state, c.agentId, from);
  const delivered = state.projects.filter((p) => p.delivered && p.delivered.at >= from).length;
  if (earned > 0) return { willing: true, reason: `${agent.name} would renew: this term brought them ${money(earned)} in commission.` };
  if (delivered > 0) return { willing: true, reason: `${agent.name} would renew: nothing they submitted was signed this term, but you delivered ${delivered === 1 ? 'a project' : `${delivered} projects`} in it.` };
  return { willing: false, reason: `${agent.name} won't renew: nothing they submitted was signed this term, and you delivered nothing in it.` };
}

registerHandler('agent-renewal', (state, ev) => {
  const c = state.representation?.current;
  if (!c || c.agentId !== ev.payload.agentId || c.until !== ev.payload.until || c.noticeUntil) return { suppressInterrupt: true };
  const read = renewalRead(state)!;
  c.renewal = { at: state.now, willing: read.willing, reason: read.reason };
  const text = `Your twelve months with ${agentById(c.agentId).name} end in ${RENEWAL_WARNING_DAYS} days. ${read.reason}${read.willing ? ' Renewing is yours to choose, from your profile.' : ''}`;
  addLog(state, text, 'personal', { route: { view: 'profile' } });
  return { message: text };
});

/** Why the mandate can't be renewed now, or null. */
export function renewRefusal(state: GameState): string | null {
  const c = state.representation?.current;
  if (!c) return 'Nobody represents you.';
  if (c.noticeUntil) return 'Notice has been given, so there is nothing to renew.';
  if (!c.renewal) return `They say whether they would renew ${RENEWAL_WARNING_DAYS} days before the term ends.`;
  return c.renewal.willing ? null : c.renewal.reason;
}
/** Renew for another twelve months from the end of this term. */
export function renewMandate(state: GameState): void {
  const why = renewRefusal(state);
  if (why) throw new Error(why);
  const c = state.representation!.current!;
  c.until += MANDATE_DAYS * DAY;
  c.renewed += 1;
  delete c.renewal;
  scheduleTerm(state, c.agentId, c.until);
  addLog(state, `You renewed with ${agentById(c.agentId).name} for another twelve months.`, 'personal', { route: { view: 'profile' } });
}

function end(state: GameState, how: 'notice' | 'lapsed'): string {
  const r = state.representation!;
  const c = r.current!;
  const agent = agentById(c.agentId);
  r.past.push({ agentId: c.agentId, from: c.signedAt, to: state.now, how });
  delete r.current;
  const open = submissions(state, agent.id).filter(({ d }) => ['considering', 'offered', 'accepted'].includes(d.status) && d.received < d.amount).length;
  const text = `${agent.name} no longer represents you${how === 'lapsed' ? ': the twelve months ran out and were not renewed' : ''}.${open ? ` ${open === 1 ? 'One deal' : `${open} deals`} they submitted ${open === 1 ? 'is' : 'are'} still theirs: commission is due as ${open === 1 ? 'its' : 'their'} money arrives.` : ''}`;
  addLog(state, text, 'personal', { route: { view: 'profile' } });
  return text;
}

registerHandler('agent-term-end', (state, ev) => {
  const c = state.representation?.current;
  // A renewed term has a later end, and a notice has its own.
  if (!c || c.agentId !== ev.payload.agentId || c.until !== ev.payload.until || c.noticeUntil) return { suppressInterrupt: true };
  return { message: end(state, 'lapsed') };
});

/** Give notice. The mandate ends NOTICE_DAYS on, or when its term does if that is sooner. */
export function giveNotice(state: GameState): void {
  const c = state.representation?.current;
  if (!c) throw new Error('Nobody represents you.');
  if (c.noticeUntil) throw new Error('Notice has been given already.');
  c.noticeUntil = Math.min(c.until, state.now + NOTICE_DAYS * DAY);
  schedule(state, c.noticeUntil, 'agent-notice-end', { agentId: c.agentId, at: c.noticeUntil }, { attention: 'notify', priority: 45 });
  addLog(state, `You gave ${agentById(c.agentId).name} notice. They represent you for ${Math.round((c.noticeUntil - state.now) / DAY)} more days and make no new submissions.`, 'personal', { route: { view: 'profile' } });
}

registerHandler('agent-notice-end', (state, ev) => {
  const c = state.representation?.current;
  if (!c || c.agentId !== ev.payload.agentId || c.noticeUntil !== ev.payload.at) return { suppressInterrupt: true };
  return { message: end(state, 'notice') };
});

