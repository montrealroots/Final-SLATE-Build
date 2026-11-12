// The line producer's work (the v3 package, 02: "Add producer and casting-director responsibilities before allowing
// those hires: scoped mandate, delegated tasks, costs, decisions requiring player approval, accountability, credit and
// termination"). Until November 12, 2026 the role was in the table of jobs and no production could hire one.
//
// The mandate is one negotiation of one counteroffer. Someone asked for more than they were offered; the line producer
// spends a day on it and brings back what they got: a lower rate, or the same one. It costs that day, paid on their own
// budget line and counted as a day worked, which is what credits them. What stays the player's: accepting the
// counteroffer or declining it, as before. A counteroffer is negotiated once. If the line producer leaves the
// production, what they negotiated stands, what they were paid stays paid, and their credit stays.
//
// The outcome reads the line producer's experience and nothing about the person across the table: someone from the film
// catalog has no bargaining skill on record, and none is made up for them.
import type { GameState, Hire, Project } from './types';
import { payDelegatedDays } from './hiring';
import { personById, roleLabel } from './people';
import { money } from './budget';
import { addLog } from './state';
import { stream } from './rng';
import { characterName } from './projects';

/** The line producer working on this production now, if there is one. */
export const lineProducer = (p: Project): Hire | null => p.hires.find((h) => h.roleId === 'line-producer' && h.status === 'accepted') ?? null;

/** A negotiation is one of their days. */
export const NEGOTIATION_DAYS = 1;
export const negotiationFee = (lp: Hire): number => lp.dayRate * NEGOTIATION_DAYS;
/** How often the other side moves at all: more often for an experienced line producer, never certain. A modeled assumption. */
export const movesChance = (experience: number): number => Math.min(85, 35 + 10 * experience) / 100;
/** How much of the gap between the offer and the ask comes off when they do move: at most three fifths. A modeled assumption. */
export const gapClosed = (experience: number): number => Math.min(60, 15 * Math.max(1, experience)) / 100;

const jobOf = (p: Project, h: Hire) => (h.characterId ? `the role of ${characterName(p, h.characterId)}` : `the ${roleLabel(h.roleId).toLowerCase()} job`);

/** Why this counteroffer can't be negotiated now, or null. */
export function negotiationRefusal(p: Project, hireId: string): string | null {
  if (p.delivered) return 'This project has been delivered.';
  if (p.shelved) return 'This project is shelved. Take it up again to make changes.';
  const h = p.hires.find((x) => x.id === hireId);
  if (!h || h.status !== 'countered' || !h.counterRate) return 'There is no counteroffer to negotiate.';
  if (!lineProducer(p)) return 'Hire a line producer first (Crew, Producing).';
  if (h.negotiated) return `${h.negotiated.byName} has already negotiated this counteroffer. It is yours to accept or decline.`;
  if (h.counterRate <= h.dayRate) return 'They ask no more than you offered, so there is nothing to negotiate.';
  return null;
}

/** What asking would do, said before it is asked: who negotiates, what it costs, and how much is in question. */
export function negotiationPreview(state: GameState, p: Project, hireId: string): { by: string; fee: number; asks: number; offered: number; days: number; inQuestion: number } | null {
  const lp = lineProducer(p);
  const h = p.hires.find((x) => x.id === hireId);
  if (!lp || !h || !h.counterRate) return null;
  return { by: personById(state, lp.personId, 'line-producer').name, fee: negotiationFee(lp), asks: h.counterRate, offered: h.dayRate, days: h.estDays, inQuestion: (h.counterRate - h.dayRate) * h.estDays };
}

/**
 * Ask the line producer to negotiate a counteroffer. They are paid for the day first. Then the other side either comes
 * down part of the way towards the offer or holds their rate; either way the counteroffer is still open, for as long as
 * it was, and still the player's to accept or decline.
 */
export function negotiate(state: GameState, p: Project, hireId: string): string {
  const why = negotiationRefusal(p, hireId);
  if (why) throw new Error(why);
  const lp = lineProducer(p)!;
  const h = p.hires.find((x) => x.id === hireId)!;
  const who = personById(state, lp.personId, 'line-producer');
  const them = personById(state, h.personId, h.roleId);
  const fee = payDelegatedDays(state, p, lp, NEGOTIATION_DAYS, `negotiation:${h.id}`, 'negotiation');
  const from = h.counterRate!;
  const moved = stream(state.seed, 'negotiate', p.id, h.id)() < movesChance(who.experience);
  // Rounded to five, as rates are quoted, and never below the offer or to no change at all.
  const off = moved ? Math.max(5, Math.round(((from - h.dayRate) * gapClosed(who.experience)) / 5) * 5) : 0;
  const to = Math.max(h.dayRate, from - off);
  h.counterRate = to;
  h.negotiated = { by: lp.personId, byName: who.name, at: state.now, fee, from, to };
  const text = to < from
    ? `${who.name} negotiated with ${them.name} over ${jobOf(p, h)}: ${money(to)} a day instead of ${money(from)}, which is ${money((from - to) * h.estDays)} less over about ${h.estDays} ${h.estDays === 1 ? 'day' : 'days'}. Accepting it is yours.`
    : `${who.name} negotiated with ${them.name} over ${jobOf(p, h)}, and ${them.name} held at ${money(from)} a day. Accepting it is yours.`;
  addLog(state, text, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: h.kind === 'cast' ? 'cast' : 'crew' } });
  return text;
}

/** What a negotiation did, for the row of the person it was with. */
export function negotiationLine(h: Hire, date: (at: number) => string): string | null {
  const n = h.negotiated;
  if (!n) return null;
  return n.to < n.from
    ? `${n.byName} negotiated this on ${date(n.at)} for ${money(n.fee)}: down from ${money(n.from)} to ${money(n.to)} a day.`
    : `${n.byName} negotiated this on ${date(n.at)} for ${money(n.fee)}: they held at ${money(n.from)} a day.`;
}

/**
 * The line producer's account, for their own row: what their negotiations cost, and what the ones that ended in an
 * agreement at the negotiated rate save over those people's days. A rate that came down and was then declined, or
 * lapsed, saved nothing and is counted as nothing.
 */
export function producerAccount(p: Project, lp: Hire): { negotiated: number; cameDown: number; cost: number; saved: number } {
  const theirs = p.hires.filter((h) => h.negotiated?.by === lp.personId);
  return {
    negotiated: theirs.length,
    cameDown: theirs.filter((h) => h.negotiated!.to < h.negotiated!.from).length,
    cost: theirs.reduce((n, h) => n + h.negotiated!.fee, 0),
    saved: theirs.filter((h) => (h.status === 'accepted' || h.status === 'released') && h.dayRate === h.negotiated!.to).reduce((n, h) => n + (h.negotiated!.from - h.negotiated!.to) * h.estDays, 0),
  };
}
export function producerAccountLine(p: Project, lp: Hire): string | null {
  const a = producerAccount(p, lp);
  if (!a.negotiated) return null;
  return `Negotiated ${a.negotiated} ${a.negotiated === 1 ? 'counteroffer' : 'counteroffers'} for ${money(a.cost)}: ${a.cameDown} came down${a.saved ? `, and those you accepted save ${money(a.saved)} over their days` : ''}.`;
}
