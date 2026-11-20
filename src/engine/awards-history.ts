// One awards history per save (the owner's v8 package, decision 7 and 10 "Precedence and world history"; A18; from
// November 14, 2026). Until then an edition showed two results side by side: the game's simulated one among the work it
// follows, and the recorded one in a card of its own. Now each category shows one outcome:
// - Where the record has this category's result, published by today, it is this save's history too: the real nominees
//   and winners, unless your own work changed it. Your nominated work takes the place of the last-listed recorded nominee
//   (a simulation choice: the record doesn't say who would have been left out), and your win replaces the recorded win.
// - Elsewhere, the save's own decided result (awards-results.ts publicResult), stored or reproduced from the seed.
// Nothing is shown before its date: the record's publication date, or the edition's announcement. Completed results
// stored in a save are never rewritten: the merge happens as it is read, so a reload shows the same.
import { recordedResults } from './history';
import { keyProject, type Category } from './awards';
import { keyTitle, publicResult, type ShownResult } from './awards-results';
import type { Edition, GameState } from './types';

// Names compared without case, punctuation or a leading "Best" (the BAFTA record says "Supporting Actor").
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/^best /, '');
export const sameCategory = (a: string, b: string) => norm(a) === norm(b);

export interface SavedResult extends ShownResult {
  /** Where the outcome comes from: the record, the record changed by your work, or this story's own decision. */
  from: 'record' | 'record-changed' | 'story';
  /** The record here rests on a secondary report or an undated page (history.ts status 'reported'), not a confirmation. */
  reported?: boolean;
}

export function savedResult(state: GameState, ed: Edition, cat: Category, today: string): SavedResult | null {
  const recorded = recordedResults(ed.institutionId, ed.year, today).filter((o) => sameCategory(o.categoryName, cat.name));
  const own = publicResult(state, ed, cat);
  if (!recorded.length) return own ? { ...own, from: 'story' } : null;
  const stored = ed.results[cat.id];
  const mine = stored?.revealed ? stored.projectIds.filter((k) => state.projects.some((p) => p.id === keyProject(k))) : [];
  const myTitles = mine.map((k) => keyTitle(state, ed, k)).filter((x): x is string => !!x);
  const myWin = stored?.revealed && stored.winner && mine.includes(stored.winner) ? keyTitle(state, ed, stored.winner) : undefined;
  const nomObs = recorded.find((o) => o.kind === 'nominees');
  // Every recorded winner of the category, in the data's order: a festival can give an honorary prize twice in an
  // edition (Venice's two lifetime Golden Lions of 2026, on different days). Until November 20, 2026 only the first was
  // shown.
  let field = nomObs ? [...nomObs.subjects] : [];
  if (myTitles.length) field = field.length ? [...field.slice(0, Math.max(0, field.length - myTitles.length)), ...myTitles] : myTitles;
  const recordedWinners = recorded.filter((o) => o.kind === 'winner').map((o) => `${o.subjects.join(' and ')}${o.work ? `, for ${o.work}` : ''}`);
  const winners = myWin ? [myWin] : recordedWinners;
  return {
    stage: winners.length ? 'winner' : 'nomination', field, winners, about: [],
    from: myTitles.length ? 'record-changed' : 'record',
    ...(recorded.some((o) => o.status === 'reported') ? { reported: true } : {}),
  };
}

/** Recorded results published by today whose category the game doesn't hold: listed with the sources, never lost. */
export function unplacedRecorded(ed: Edition, categories: Category[], today: string) {
  return recordedResults(ed.institutionId, ed.year, today).filter((o) => !categories.some((c) => sameCategory(o.categoryName, c.name)));
}
