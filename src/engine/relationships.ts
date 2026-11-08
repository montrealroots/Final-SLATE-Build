// Working relationships (SLATE-18-02, November 8, 2026). People answered every offer on the offer alone, as if they had
// never met you. Now each person keeps a record of what happened when they worked with you, written at the moment it
// happened: work seen through to delivery, being let go before it, a counteroffer you turned down. Only that person's own record changes how they answer you (hiring.ts resolveOffer), and only for offers
// from you: someone you saw through a project takes your offer at a fair rate without haggling; someone whose
// counteroffer you turned down won't take less than their asking rate; someone you let go asks for more, and after
// twice won't work with you. Nothing anyone else saw counts, so there is no global reputation.
import type { GameState, Project } from './types';

export type HistoryKind = 'completed' | 'let-go' | 'counter-declined';
export interface HistoryEntry { projectId: string; title: string; role: string; kind: HistoryKind; at: number }

export function recordHistory(state: GameState, personId: string, p: Project, role: string, kind: HistoryKind): void {
  const ps = (state.people[personId] ??= { bookings: [] });
  (ps.history ??= []).push({ projectId: p.id, title: p.title, role, kind, at: state.now });
}

export function historyWith(state: GameState, personId: string): HistoryEntry[] {
  return state.people[personId]?.history ?? [];
}

/** How their history moves their answer to a new offer: the rate they need, as a share of their asking rate. */
/** `minRatio` null means no history: they answer as anyone would. */
export function willingness(state: GameState, personId: string): { minRatio: number | null; refuses: boolean; reason: string | null } {
  const h = historyWith(state, personId);
  const done = h.filter((x) => x.kind === 'completed').length;
  const letGo = h.filter((x) => x.kind === 'let-go').length;
  const declined = h.filter((x) => x.kind === 'counter-declined');
  if (letGo >= 2) return { minRatio: Infinity, refuses: true, reason: `You let them go twice (${h.filter((x) => x.kind === 'let-go').map((x) => x.title).join(', ')}).` };
  if (letGo === 1) return { minRatio: 1.15, refuses: false, reason: `You let them go from ${h.find((x) => x.kind === 'let-go')!.title}, so they ask for more.` };
  if (done > 0) return { minRatio: 0.9, refuses: false, reason: `They worked with you on ${h.filter((x) => x.kind === 'completed').map((x) => x.title).slice(0, 2).join(' and ')}.` };
  if (declined.length) return { minRatio: 1, refuses: false, reason: `You turned down their counteroffer on ${declined[0].title}, so they won't take less than their rate.` };
  return { minRatio: null, refuses: false, reason: null };
}
