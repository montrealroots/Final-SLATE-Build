# V3 Ledger: Complete Stories, Characters And Living Industry

The owner's package, version 3, is in `docs/v3/package/` (start with `00-START-HERE.md`; the command is
`05-CLAUDE-COMMAND.txt`). With it came the owner's own brief for a phone overhaul and a whole-game UI cleanup, kept in
`docs/v3/UI-BRIEF.md`. This file says where each part stands. It is corrected whenever the tree and it disagree.

Statuses, the only ones used: **done and verified** (built, with the test named), **built, not verified** (code is
there; the named check hasn't run), **in progress**, **not started**, **blocked** (with what unblocks it),
**waiting on a person** (a check only a human or a device can make).

Counts are what a command printed, never an estimate, and say which command.

## Build Order And State

| Step | What | State | Evidence |
| --- | --- | --- | --- |
| 1 | Audit of HEAD; package and brief in the repository; this ledger; `requirements.csv` and `input-effects.csv` | done | this folder |
| 2 | Schemas, IDs, validation; the character lifecycle; one film and one series blueprint | done and verified, except age stages, doubles and per-episode performers (V3-C12) | `tests/blueprints.test.ts` (12), `tests/characters.test.ts` (8), `e2e/stories.spec.ts`, `e2e/characters.spec.ts` on desktop, phone and WebKit |
| 3 | Blueprint preview, apply and undo | done and verified, except shuffle (V3-S07) | as step 2 |
| 3 | The 11 structural fields; the 149-genre libraries; mixed genres | in progress: 64 of 14,900 stories, in 64 of 149 genres, and 1 mixed-genre story; no genre is near its hundred; the ideas for the structural fields are not started | `docs/v3/CONTENT-COUNTS.md` |
| 4 | People and department work loops; source material and adaptation; more companies | in progress. **Done and verified:** the source-material catalog, 576 distinct real works from Wikidata (CC0) across eight media, with a coverage report; finding a work, reading what is recorded about it and its rights, and declaring a script adapted from it, with undo; the option on a work not recorded as public domain (fee, eighteen months, one renewal, expiry, the price on exercise, the credit agreed), which production waits for; the casting director's mandate (an optional hire; a search for one part with its cost said first, paid on their own budget line; who they brought and left out, and why; advice once everyone has read; the shortlist, callbacks and offers still the player's; credit for a search run; release); the line producer's mandate (an optional hire; a negotiation of one counteroffer with its cost said first, paid on their own budget line; a lower rate or the same one brought back, not certain; accepting still the player's; an account of what their negotiations cost and saved; credit; release); representation (four agents who answer from the player's record; a mandate; submissions that open the commissioner's door; commission on the project's ledger; a declared conflict each; renewal; notice). The adaptation loop is finished as far as V3-A06 says (approach, declared changes, the rights holder's approval, widening, their share with statements, a sequel's own agreement). **Not started:** more companies; an agent finding the player work as a hired writer, director or performer, since the game has no such jobs yet | `docs/v3/SOURCE-COVERAGE.md`, `tests/sources.test.ts` (7), `tests/adaptation.test.ts` (11), `tests/casting-director.test.ts` (5), `tests/line-producer.test.ts` (7), `tests/representation.test.ts` (15), `e2e/sources.spec.ts`, `e2e/casting-director.spec.ts`, `e2e/line-producer.spec.ts` and `e2e/representation.spec.ts` on desktop, phone and WebKit |
| 5 | Schedule, location and distribution gaps; box office, history books, weekly audiences | in progress. **Done and verified:** a cinema run reported week by week and settled by its monthly report, with ticket sales, admissions and each share apart, and a record book of the career's films worked out from those weeks; the money a film earns is unchanged. A broadcast or streaming release reports a weekly audience in its own measures (`engine/audiences.ts`). **Not started:** screens, bookings and holdovers, publicity and competition, territory-by-territory results, adjusted currency, recorded historical results; receipts by audience (renewal now reads one); the schedule and location carry-forwards | `tests/box-office.test.ts` (9), `e2e/studio-pitch.spec.ts` on desktop and WebKit |
| 6 | The whole catalog's pictures: inventory, manifest, fetch, and installing them in the game | done and verified: all 313,671 published pictures are downloaded in the build container (3,577 MB, none failed) and packed in 383 parts; the game installs them a kind at a time or all, with the size and room said first, pause, going on, retry, update and remove; they show on people, titles, seasons, episodes, companies and networks. Not built: larger or alternate pictures; resuming a half-downloaded part after the game is closed | `docs/PICTURE-COVERAGE.md`, `docs/DATA-PACKS.md`, `tests/pictures.test.ts` (11), `tests/catalog-server.test.ts`, `e2e/picture-library.spec.ts` |
| 6 | Pictures in the game: scoped packs, download all, pause, resume, retry, storage | not started | |
| 7 | Audits, journeys, performance and UI checks on the final tree | not started | |
| UI | Phone overhaul and whole-game cleanup: inventory, coverage matrix, foundation, parity tests | in progress: the foundation, the audit, the walk (59 screens, four profiles, desktop against phone) and the journey sweep are built; rows the matrix lists as not visited, and the limits it lists, are owed | `docs/v3/UI-COVERAGE.md`, `docs/v3/ui-inventory.json`, `e2e/ui-audit.ts`, `e2e/ui-coverage.spec.ts`, `tests/stylesheet.test.ts`, `tools/v3/ui-coverage.mjs` |

## Content Counts

Until November 12, 2026 `docs/v3/CONTENT-COUNTS.md` counted the story files against a quota of 14,900, written by
`tests/v3-content.test.ts`. The owner's v4 package retired the generated story presets and both quotas that day; the
count, the similarity report and the test were removed (`docs/v4/requirements.csv`, V4-001). 64 stories with one
primary genre and 1 mixed-genre story had been written.

## Acceptance Suites

| Suite | State | Tests |
| --- | --- | --- |
| T01 Content | retired by the v4 package on November 12, 2026, at 64 of 14,900 | |
| T02 Genre variety | retired by the v4 package on November 12, 2026, at 1 mixed-genre story | |
| T03 Blueprint editing | passes for a film and a series, with shuffle; ideas for the former 11 gap fields are not built | `e2e/stories.spec.ts` |
| T04 Character lifecycle | passes, except age stages, doubles and per-episode performers (V3-C12) | `e2e/characters.spec.ts`, `tests/characters.test.ts` |
| T05 People | in progress: a casting director and a line producer do paid work with observable results, and representation is built (V3-L01 to L03). Not built: contrasting profiles deciding differently beyond the agents; one person in several roles with shared commitments tested as such; hired work for the player | `tests/casting-director.test.ts`, `tests/line-producer.test.ts`, `tests/representation.test.ts` and their journeys |
| T06 Adaptation | passes for what is built: the catalog, a work's recorded rights, declaring an adaptation; the option, renewal, expiry and exercise; how closely the script follows the work and what it is declared to change; the rights holder's approval of a draft, refused with its reason and given again after a change or a wider agreement; their share of income with statements; a sequel needing its own agreement. Not built: a written brief beyond the approach and declared changes; 45 of 149 genres have a source work | `tests/sources.test.ts` (7), `tests/adaptation.test.ts` (18), `e2e/sources.spec.ts` on desktop, phone and WebKit |
| T07 World | not started: more companies, and nothing new in the living world, were built for this package | |
| T08 Finance and release | in progress: a cinema run's weeks, settled by its monthly report, with each share apart and the money unchanged; a record book (V3-B01, B02, both partial). Not built: screens, bookings, holdovers, publicity, competition, territory results, recorded history | `tests/box-office.test.ts`, `e2e/studio-pitch.spec.ts` |
| T09 Audiences | in progress: a broadcast or streaming release reports its audience week by week, each measure apart, labelled simulated, recorded once, and a commissioner decides on another season from it once the season has been shown (V3-T01, partial). No agreement pays by audience, the browser journey for the decision uses a commissioner and a broadcast written into the save, and no recorded figures are imported (V3-T02, not started) | `tests/audiences.test.ts` (16), `e2e/script-rules.spec.ts`, `e2e/renewal.spec.ts` |
| T10 Media | passes for what is built: every published picture gathered, packed and installable in the game by kind or all, with pause, retry, update and remove. One kind has been installed in a browser from the real packs; the whole 3.5 GB has not | `tests/pictures.test.ts`, `e2e/picture-library.spec.ts`, `docs/PICTURE-COVERAGE.md` |
| T11 UI | in progress: `e2e/ui-coverage.spec.ts` fails on any defect or desktop-and-phone difference on the screens it walks (69 of 82 rows); the sweep measures the rest in journeys without failing them; no real phone | `docs/v3/UI-COVERAGE.md` |
| T12 Career | not started as its own suite: the existing film and series career journeys pass in CI on every merge, and none was written for this package end to end | CI `journeys` |

## Decisions

- **Pictures first in time, sixth in order.** The fetch for the whole catalog takes hours of waiting and none of
  attention, so its tool was written first and it runs while the rest is built. Nothing else was reordered.
- **One primary picture a record, small.** `w185` portraits, posters, season posters and stills, `w300` backdrops,
  `w154` logos: TMDB's own sizes from its `/configuration`, read November 12, 2026. Larger and alternate pictures would
  be another tier; it is not built and nothing claims it.
- **Records TMDB marks adult are listed and excluded,** with that reason in the manifest. Nothing is fetched for them.
- **A story is a text file, not code or JSON.** One line a field, `{key}` where it names someone. It is written and
  read by a person at volume, diffs cleanly, and is parsed in the browser only when the picker opens
  (`docs/v3/BLUEPRINT-FORMAT.md`).
- **A full story is for a script still being written.** After a draft is approved the picker refuses and says why:
  from then on a change is a revision, with its costs, and is made field by field.
- **Setting aside never touches money.** A character with a contract, an offer or filmed work behind the part can't be
  removed, only set aside, and the contract stays until the player ends it by name in Cast. Until November 12, 2026
  removing a character dropped its cast assignment without a word.
- **Undo takes back all of one change.** The Script page's snapshot now holds every field a story, an idea or a
  character edit can write. Before, a change to the title, tone, year, genres or season was only partly undone.
