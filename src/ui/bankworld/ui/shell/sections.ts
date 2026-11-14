/**
 * SLATE — the sections inside a screen, its tabs, said once (from 2026-10-08).
 *
 * The screen draws its tabs from here, so a section is named the same
 * wherever it's offered. Which tab is showing is kept by `tabKey`, so a
 * screen keeps its tab while the player is elsewhere.
 *
 * The career's, the industry's and the homes' went with them in the scope
 * reset of 2026-10-09, and so did Papers' Driving with the cars; Papers'
 * Passport And Travel is Passport And ID, the journeys gone. The Career came
 * back on 2026-10-20 (brief 19) with two tabs, Overview and Portfolio, and
 * Representation came on 2026-10-21 with the agent's system, Work, its
 * engagements, pay and unions, with the pay's (`ui/career/WorkPane.tsx`), and
 * Opportunities with the work loop's; its others come with the systems they
 * show, never before.
 */

export interface Section { id: string; label: string }

export const SECTIONS: Readonly<Record<string, readonly Section[]>> = {
  '/workspace/school': [
    { id: 'standing', label: 'Standing And Craft' }, { id: 'classes', label: 'Classes' }, { id: 'coursework', label: 'Coursework' },
    { id: 'casting', label: 'Casting' }, { id: 'work', label: 'Shifts And Pay' }, { id: 'terms', label: 'Terms And Award' },
  ],
  '/workspace/bank': [
    { id: 'accounts', label: 'Accounts' }, { id: 'cards', label: 'Cards' }, { id: 'payments', label: 'Payments And Cash' },
    { id: 'borrowing', label: 'Borrowing' }, { id: 'statements', label: 'Statements' },
  ],
  '/workspace/career': [
    { id: 'overview', label: 'Overview' }, { id: 'portfolio', label: 'Portfolio' },
    { id: 'representation', label: 'Representation' },
    { id: 'opportunities', label: 'Opportunities' },
    { id: 'work', label: 'Work' },
  ],
  '/workspace/papers': [
    { id: 'returns', label: 'Tax Returns' }, { id: 'health', label: 'Health Cover' }, { id: 'benefits', label: 'Unemployment' },
    { id: 'passport', label: 'Passport And ID' }, { id: 'work', label: 'Permission To Work' },
  ],
};

/** Where a screen's showing tab is kept (`ui/kept.ts`). */
export const tabKey = (route: string) => `tab:${route}`;
