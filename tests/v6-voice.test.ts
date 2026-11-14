// The v6 package's exact voice examples (docs/v6/package/05-UI-AND-PLAYER-VOICE.md; V6-044): each is said where the
// game says it, with its numbers, dates and names from state. This pins the words to the place; the journeys named in
// the ledger see them on screen. "Review the invitation" isn't an action: the invitation is shown in full where it is,
// so a button for it would lead nowhere (decided November 14, 2026).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const EXAMPLES: [string, string][] = [
  ['Choose a source', 'src/ui/AdaptWork.tsx'],
  ['Adapt This Work', 'src/ui/AdaptWork.tsx'],
  ['Review Your Adaptation', 'src/ui/AdaptWork.tsx'],
  ["This story doesn't identify another character. You can add one or continue.", 'src/engine/proposal.ts'],
  ['Your changes affect {plural(n, \'scene\')}. Review the revised schedule before confirming', 'src/ui/PlanViews.tsx'],
  ['is full: it carries about', 'src/engine/strategy.ts'],
  ['earned revenue, but the proceeds are still repaying its backers', 'src/ui/FinishViews.tsx'],
  ['The offer expires on', 'src/ui/PlanViews.tsx'],
  ['The screening starts in', 'src/ui/FinishViews.tsx'],
  ['Travel To The Screening', 'src/ui/FinishViews.tsx'],
  ['Decline Invitation', 'src/ui/FinishViews.tsx'],
  ['Recorded results through', 'src/ui/RecordedResults.tsx'],
  ['Simulated results from', 'src/ui/FinishViews.tsx'],
  ['No audience figures are available for this reporting period.', 'src/ui/FinishViews.tsx'],
  ['available after existing commitments', 'src/ui/PlanViews.tsx'],
];

describe('the v6 voice examples', () => {
  it('are each said where the game says them', () => {
    expect(EXAMPLES.filter(([words, file]) => !readFileSync(file, 'utf8').includes(words)).map(([w]) => w)).toEqual([]);
  });
});
