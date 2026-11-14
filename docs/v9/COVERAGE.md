# Banking And Papers By Country (Step 7 Of The Owner's Command Of November 14, 2026)

There is one row for each of the 252 entries in the game's own gazetteer (`src/world/gazetteer/index.json`). No alias is
counted as a country. Each row holds seven capabilities, each in one of the owner's six classes. The full matrix, with
the reason for each cell, is `docs/v9/coverage.json`. `tests/v9-coverage.test.ts` writes it and holds both files to the
code.

Later on November 14, 2026 the owner asked for everything that wasn't possible to be made possible, choosing "research,
then estimate". Since then no capability is missing anywhere: a figure is researched, or it is the game's estimate and
the screen says so.

## The Counts

| Capability | Class | Countries |
|---|---|---|
| bank | verified | 2 |
| bank | implemented/tested | 23 |
| bank | inherited-unverified | 216 |
| bank | modeled | 5 |
| bank | not applicable | 6 |
| exchange rate | inherited-unverified | 230 |
| exchange rate | not applicable | 22 |
| passport application | implemented/tested | 1 |
| passport application | inherited-unverified | 115 |
| passport application | modeled | 130 |
| passport application | not applicable | 6 |
| visiting rules | inherited-unverified | 246 |
| visiting rules | not applicable | 6 |
| visitor visa application | verified | 32 |
| visitor visa application | implemented/tested | 1 |
| visitor visa application | inherited-unverified | 2 |
| visitor visa application | modeled | 211 |
| visitor visa application | not applicable | 6 |
| work rules | inherited-unverified | 232 |
| work rules | modeled | 14 |
| work rules | not applicable | 6 |
| work permit application | verified | 7 |
| work permit application | implemented/tested | 1 |
| work permit application | modeled | 238 |
| work permit application | not applicable | 6 |

## What This Says

- **Verified** means checked against its source in this work, on November 14, 2026:
  - the work permit fees and decision times of eight countries (`src/data/papers/terms.json`): the United States, the
    United Kingdom, Canada, Australia, New Zealand, Ireland, France and Germany. Each entry names its source and whether
    it is the government's own page (official) or another publication (secondary); the United States' is the
    implemented/tested one;
  - the visitor visas of 32 destinations (`terms.json` visas): the Schengen visa for its 29 countries, the United
    Kingdom, Canada and Australia;
  - the banks of Nauru and Niue (`banks-world.ts`).
- **Implemented/tested** means a test that runs counts for that country. A test that only looks a bank up by name, or one
  that's switched off, doesn't count (from November 14, 2026, when the owner asked what "run by a test" meant: until
  then South Africa, Brazil and the Netherlands counted on a lookup alone). The banks of 23 countries are used by the
  ported 1221 tests or the journeys. One visitor visa route is tested end to end, a Brazilian visiting the United States;
  one passport from SLATE-REBUILD's records, a Swede's; and one work permit, the United States' O-1.
- **Modeled** is the game's own figure or rule, said as one wherever it shows:
  - **Work permits** and **visitor visas** no research covers yet: the fee and the
    decision time are the middle of the researched ones on the same continent (all of them, where none is on it), in
    dollars at the day's rate (`src/engine/papers-terms.ts`). Directing, producing and writing abroad take the
    performer's route the records name, at the same terms: also an assumption, said as one.
  - **Passports** (130 citizenships): whatever SLATE-REBUILD's record lacks, the fee, the time or the validity, is the
    middle of the continent's recorded offices; a citizenship with no record gets all three that way.
  - **Banks** (5 places with no bank of their own: the British Indian Ocean Territory, the French Southern Territories,
    South Georgia, Pitcairn and Tokelau): a life there banks with the administering country's banks.
  - **Work rules** (14 countries whose research was blocked): anyone who isn't a citizen needs a permit, with the free
    movement of ECOWAS (Guinea-Bissau), New Zealand citizens in Niue, Gulf citizens in Qatar as in the Emirates, and
    Morocco's rule in Western Sahara.
  - Where your story is lived is taken as where you may live and work, said as an assumption wherever it is shown.
  - Past 2026-10-30, the last exchange rate is held and marked stale (`docs/v9/FX.md`).
- **The research queue.** Every modeled figure is listed by `tests/v10-papers-terms.test.ts`; their number may fall and
  may not rise. Research replaces them biggest film markets first.
