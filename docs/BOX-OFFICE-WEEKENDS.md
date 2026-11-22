# 2026's Real Weekends At The Box Office (November 22, 2026)

The owner asked for the year's weekly box office to move as it did in real life up to November 22, 2026, and be
simulated from there.

## The Data

- **Source.** Wikipedia's "List of 2026 box office number-one films in the United States", read on November 22, 2026:
  each weekend's end date, its number-one film and that film's weekend gross, 46 of 47 cited to Box Office Mojo and the
  last to The Numbers. That last one, $120,000,000 for *The Hunger Games: Sunrise on the Reaping* on November 22, is
  the Sunday estimate.
- **Licence.** Wikipedia's text is CC BY-SA 4.0. The weekends ship in the build
  (`src/data/box-office/weekends-us-2026.json`, 47 weekends) with the page, the licence and the day it was read, and
  the game names Wikipedia, the licence and the reporter wherever they show.
- **Built by.** `node tools/box-office/weekends.mjs`, which reads the page's source (cached in `.box-office-cache/`)
  and its first table; a film that topped several weekends is written once with a rowspan and carried to each.
- **Not free to use, and not used:** the BFI's UK weekend sheets (their site terms forbid copying), and Box Office Mojo
  and The Numbers themselves (their terms reserve copying to licensed customers). Wikipedia's list is the free record of
  what they reported.

## What It Changes

- **Your films' weeks in cinemas** (`src/engine/box-office.ts recordWeek`). Each week, the cinemas decide whether to
  expand, hold, cut or withdraw your film from its takings a screen, less what the week's other wide releases took.
  Until November 22, 2026 that competition, 0 to 4 releases, was drawn at random every week. Now a week whose weekend is
  one of 2026's recorded ones meets that weekend's: its number-one film's gross placed among the year's 47, in five
  equal bands (`src/engine/box-office-weekends.ts competitionOf`), so the year's own spread decides it. A week after the
  last recorded weekend meets the game's own, drawn as before.
- **The week's row** (a film's Release page, Weeks In Cinemas) names the real weekend it met: its end date, its number
  one and the gross.
- **Box Office Records** lists the latest five 2026 weekends that had ended by the day chosen, and says the weekends
  after November 22, 2026 are the game's own.

Your films' takings stay the game's simulation; a real weekend changes the competition they meet, never their figures.

## Tests

- `tests/box-office-weekends.test.ts`: the shipped weekends (Sundays, a week apart, January 4 to November 22, The Super
  Mario Galaxy Movie's $131,703,340 on April 5), the parser carrying a film across weekends, the competition bands, a
  week meeting Mario's weekend whatever the seed, and a week after the last meeting the drawn competition. Switching the
  real weekends off fails it.

## To Bring It Up To Date

Delete the cached page in `.box-office-cache/`, run `node tools/box-office/weekends.mjs`, and check the new weekends:
the last one is usually the Sunday estimate, which the next reading corrects.
