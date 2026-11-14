// Awards and festivals: entering a finished film, and taking an entry back.
import type { Probe } from '../probe';
import { categoriesFor, checkEligibility, institution } from '../../../src/engine/awards';
import { submitEntry, withdrawEntry } from '../../../src/engine/awards-actions';
import type { GameState } from '../../../src/engine/types';

/** Once a week (as a player looks at the Festivals page), every delivered project of the player's is entered in each open edition's first category it is eligible for. */
const lastLook = new WeakMap<GameState, number>();
export function enterEverything(s: GameState): void {
  if (s.now - (lastLook.get(s) ?? -Infinity) < 7 * 86_400_000) return;
  lastLook.set(s, s.now);
  for (const p of s.projects.filter((x) => x.delivered && !x.shelved)) {
    for (const ed of s.editions.filter((e) => e.status === 'open' && e.deadline > s.now)) {
      if (ed.entries.some((e) => e.projectId === p.id)) continue;
      const inst = institution(ed.institutionId);
      for (const cat of categoriesFor(inst, ed.year)) {
        if (!checkEligibility(s, p, ed, cat).eligible) continue;
        try { submitEntry(s, p, ed.id, cat.id); break; } catch { /* its fee or form: the next category */ }
      }
    }
  }
}

/** Enters as above, then takes back each entry a week after it is sent. */
function enterThenWithdraw(s: GameState): void {
  enterEverything(s);
  // Withdrawals are looked at every day; entering, weekly.
  for (const ed of s.editions) for (const e of ed.entries.filter((x) => x.status === 'submitted' && s.now - x.submittedAt > 7 * 86_400_000)) {
    try { withdrawEntry(s, ed.id, e.id); } catch { /* past withdrawing */ }
  }
}

const measure = (s: GameState) => {
  const mine = s.editions.flatMap((ed) => ed.entries.filter((e) => s.projects.some((p) => p.id === e.projectId)));
  return {
    entries: mine.filter((e) => e.status !== 'withdrawn').length,
    withdrawn: mine.filter((e) => e.status === 'withdrawn').length,
    selected: mine.filter((e) => ['selected', 'nominated', 'won', 'mention'].includes(e.status)).length,
    won: mine.filter((e) => e.status === 'won').length,
  };
};

export const PROBES: Probe[] = [
  {
    id: 'enter-awards',
    features: ['action:awards-actions.submitEntry'],
    decision: 'Enter your finished films in the festivals and awards they qualify for',
    reads: ['src/engine/awards-actions.ts#submitEntry', 'src/engine/awards.ts#checkEligibility'],
    base: { years: 3 },
    variant: { years: 3, daily: enterEverything },
    measure,
    bites: ['entries'],
    downstream: ['spent', 'selected', 'money', 'jobsOffered', 'offeredDayRate'],
  },
  {
    id: 'withdraw-entry',
    features: ['action:awards-actions.withdrawEntry'],
    decision: 'Take your entries back a week after sending them',
    reads: ['src/engine/awards-actions.ts#withdrawEntry'],
    base: { years: 3, daily: enterEverything },
    variant: { years: 3, daily: enterThenWithdraw },
    measure,
    bites: ['withdrawn'],
    downstream: ['selected', 'money', 'spent'],
  },
];
