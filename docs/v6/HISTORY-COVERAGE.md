# Recorded History: Coverage

The owner's v6 package asks for each dataset's coverage in fixed fields (10-DELIVERY-AND-COVERAGE.md). This is that
report for what the game holds as recorded history. A field marked unknown has an unknown denominator: it is not 100%.

| Field | Award results 2026 (`src/data/history/awards-2026.json` and `awards-2026-reference.json`) | Box office | Television audiences (`audience-2026-reference.json`) |
|---|---|---|---|
| Dataset / entity type | Award nominations and winners | Dated grosses | Weekly audience reports |
| Requested window | January 1 to November 13, 2026 | January 1 to November 13, 2026 | January 1 to November 13, 2026 |
| Observed window | January 11 to September 14, 2026 | None | One week, November 2 to 8, 2026 (Netflix's English-language film chart) |
| Territories | The organizers' own ceremonies and festivals (United States, United Kingdom, France, Italy) | None | Global, as Netflix reports it |
| Discovered | 9 editions; 11 observations read for this game, 26 grouped from the v7 package's 44 award events | 0 | 10 chart rows |
| Fetched | 3 source pages | 0 | 0 |
| Validated | 37 (`tests/history.test.ts`) | 0 | 10 |
| Published | 37, each from its own publication date | 0 | 0 in strict playback: their publication is inferred (Netflix's Tuesday rule), so they show only in a playback that opts into inference |
| Installed | Built into the game (2 KB) | 0 | 0 |
| Missing values | Every other 2026 ceremony and festival; every category of these two not listed in the file | All | All |
| Conflicts | None found. The Golden Globes article names The Pitt and The Studio as series winners without saying which won which category: neither is recorded | n/a | n/a |
| Sources / terms | Organizer pages, read for this game, cited per observation; NBC News for the Oscar nominations' date | No authorized dated dataset found yet; Box Office Mojo and The Numbers forbid automated collection | Nielsen publishes no free weekly dataset; streaming services' own reports are not imported |
| Latest import | November 13, 2026 | n/a | n/a |
| Historical / simulated boundary | Recorded through March 15, 2026 for these categories; the game's own competition from the 2027 editions is simulated | The player's own releases are simulated and labelled | The player's own series' audiences are simulated and labelled |
| Next resumable checkpoint | Add editions one at a time from organizer pages, each observation with its source and publication date | Find an authorized dataset first | Find an authorized dataset first |

## How It Behaves

- **Not before it was published.** An observation is reportable from its published date, in the player's own calendar (src/engine/history.ts `reportable`, the v7 package's rule; until November 13, 2026 it waited until that day had ended where it was announced). An unknown publication date is never reported. A January 1 start sees no 2026 result.
- **Corrections.** A correction is a later revision of the same observation, with its own publication date; the earlier revision stays and applies before it (tests/history.test.ts).
- **Not in the save.** What a save shows follows from the data and the save's clock: a reload can't duplicate a result, and a later import can't rewrite what a save already settled.
- **Separate from the game's competition.** An edition's page shows the recorded results in their own card, with their source; the game's own entries and results stay under Your Entries.
- **Edition dates.** The 2026 Golden Globes (January 11) and Oscars (March 15) take their organizers' dates. Until November 13, 2026 the Golden Globes' 2026 date was simulated (January 18 in Los Angeles). Saves made before then keep the dates they were made with.

## Verified By

- `tests/history.test.ts`: publication gating at the exact minute, corrections, sources and categories, and nothing in the save.
- `e2e/v6-history.spec.ts` (J01), on desktop, phone and the iPhone 15 Pro Max emulation: a January 1 start, the Golden Globes' winners after January 11, the Oscars' nominees and no winner after January 22, and one of each after a reload.
