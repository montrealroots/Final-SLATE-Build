# Recorded History: Coverage

The owner's v6 package asks for each dataset's coverage in fixed fields (10-DELIVERY-AND-COVERAGE.md). This is that
report for what the game holds as recorded history. A field marked unknown has an unknown denominator: it is not 100%.

| Field | Award results 2026 (`src/data/history/awards-2026.json` and `awards-2026-reference.json`) | Box office | Television audiences (`audience-2026-reference.json`) |
|---|---|---|---|
| Dataset / entity type | Award nominations and winners | Dated grosses | Weekly audience reports |
| Requested window | January 1 to November 13, 2026 | January 1 to November 13, 2026 | January 1 to November 13, 2026 |
| Observed window | December 8, 2025 (the Golden Globes' nominations) to September 14, 2026 | None | One week, November 2 to 8, 2026 (Netflix's English-language film chart) |
| Territories | The organizers' own ceremonies and festivals (United States, United Kingdom, France, Italy) | None | Global, as Netflix reports it |
| Discovered | 13 editions; 433 observations read for this game (from November 19, 2026, the 98th Academy Awards, the 83rd Golden Globe Awards, the 2026 Emmys and the 32nd Actor Awards whole, every category's nominees and winner, the 78th DGA, 78th Writers Guild and 37th PGA Awards; until then 11), 26 grouped from the v7 package's 44 award events | 0 | 10 chart rows |
| Fetched | 143 source pages (the Emmys' 120 category pages parsed from their structured data; three PDFs, their text read directly) | 0 | 0 |
| Validated | 459 (`tests/history.test.ts`) | 0 | 10 |
| Published | 459, each from its own publication date | 0 | 0 in strict playback: their publication is inferred (Netflix's Tuesday rule), so they show only in a playback that opts into inference |
| Installed | Built into the game (2 KB) | 0 | 0 |
| Missing values | Every other 2026 ceremony and festival beyond the reference set (the Oscars' 23 competitive categories and the Golden Globes' 28 are all there; the Emmys' 120, nominees from July 8 and winners from each category's night; the Actor Awards' 15; the DGA's 11 categories but Commercials, every winner but Comedy Series, which its release words as nominees; the WGA's 15 the game holds; the PGA's 12; BAFTA's site refuses the fetching tool, so it stays at five winners) | All | All |
| Conflicts | None found. The Golden Globes' night article named The Pitt and The Studio as series winners without saying which won which; the Globes' nominations page says (The Pitt, Drama; The Studio, Musical or Comedy), and both are recorded from November 19, 2026 | n/a | n/a |
| Sources / terms | Organizer pages, read for this game, cited per observation; NBC News for the Oscar nominations' date | No authorized dated dataset found yet; Box Office Mojo and The Numbers forbid automated collection | Nielsen publishes no free weekly dataset; streaming services' own reports are not imported |
| Latest import | November 19, 2026 (the Oscars', the Golden Globes' and the Emmys' remaining categories, the Actor Awards, the DGA, the WGA, the PGA) | n/a | n/a |
| Historical / simulated boundary | Recorded from December 8, 2025 through September 14, 2026 for these four ceremonies; the game's own competition from the 2027 editions is simulated | The player's own releases are simulated and labelled | The player's own series' audiences are simulated and labelled |
| Next resumable checkpoint | Add editions one at a time from organizer pages, each observation with its source and publication date | Find an authorized dataset first | Find an authorized dataset first |

## How It Behaves

- **Not before it was published.** An observation is reportable from its published date, in the player's own calendar (src/engine/history.ts `reportable`, the v7 package's rule; until November 13, 2026 it waited until that day had ended where it was announced). An unknown publication date is never reported. A January 1 start sees the Golden Globes' nominees (announced December 8, 2025) and no 2026 winner.
- **Corrections.** A correction is a later revision of the same observation, with its own publication date; the earlier revision stays and applies before it (tests/history.test.ts).
- **Not in the save.** What a save shows follows from the data and the save's clock: a reload can't duplicate a result, and a later import can't rewrite what a save already settled.
- **Separate from the game's competition.** An edition's page shows the recorded results in their own card, with their source; the game's own entries and results stay under Your Entries.
- **Edition dates.** The 2026 Golden Globes (January 11), DGA Awards (February 7), PGA Awards (February 28), Actor Awards (March 1) and Writers Guild Awards (March 8; all four from November 19, 2026) and Oscars (March 15) take their organizers' dates. Until November 13, 2026 the Golden Globes' 2026 date was simulated (January 18 in Los Angeles). Saves made before then keep the dates they were made with.

## Verified By

- `tests/history.test.ts`: publication gating at the exact minute, corrections, sources and categories, the 98th Academy Awards whole (every competitive category's nominees from January 22 and winner from March 15, the Live Action Short tie as two winners), the 83rd Golden Globe Awards whole (28 categories' nominees from December 8, 2025 and winners from January 11, The Pitt and The Studio each in its own category), the 2026 Emmys whole (117 fields from July 8; 49, 101 and 120 categories' winners after each of the three nights; a show nominated twice told apart by its episode), the 32nd Actor Awards whole (nominees from January 7 and the stunt ensembles from February 26, recipients from March 1), the 78th DGA Awards (no winner the release doesn't state), the 78th Writers Guild Awards' 15 held categories, the 37th PGA Awards (documentary nominees a month before the rest), and nothing in the save.
- `e2e/v6-history.spec.ts` (J01), on desktop, phone and the iPhone 15 Pro Max emulation: a January 1 start with the Golden Globes' nominees and no winner, the Golden Globes' winners after January 11, the Oscars' nominees and no winner after January 22, and one of each after a reload.
