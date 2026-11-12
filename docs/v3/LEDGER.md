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
| 3 | The 11 structural fields; the 149-genre libraries; mixed genres | not started (2 of 14,900 stories) | `docs/v3/CONTENT-COUNTS.md` |
| 4 | People and department work loops; source material and adaptation; more companies | in progress. **Done and verified:** the source-material catalog, 576 distinct real works from Wikidata (CC0) across eight media, with a coverage report; finding a work, reading what is recorded about it and its rights, and declaring a script adapted from it, with undo; the option on a work not recorded as public domain (fee, eighteen months, one renewal, expiry, the price on exercise, the credit agreed), which production waits for; the casting director's mandate (an optional hire; a search for one part with its cost said first, paid on their own budget line; who they brought and left out, and why; advice once everyone has read; the shortlist, callbacks and offers still the player's; credit for a search run; release); the line producer's mandate (an optional hire; a negotiation of one counteroffer with its cost said first, paid on their own budget line; a lower rate or the same one brought back, not certain; accepting still the player's; an account of what their negotiations cost and saved; credit; release). **Not started:** the adaptation's development brief, the rights holder's approvals, compensation beyond the price, reporting and future rights; representation's loop; more companies | `docs/v3/SOURCE-COVERAGE.md`, `tests/sources.test.ts` (7), `tests/adaptation.test.ts` (11), `tests/casting-director.test.ts` (5), `tests/line-producer.test.ts` (7), `e2e/sources.spec.ts`, `e2e/casting-director.spec.ts` and `e2e/line-producer.spec.ts` on desktop, phone and WebKit |
| 5 | Schedule, location and distribution gaps; box office, history books, weekly audiences | not started | |
| 6 | The whole catalog's pictures: inventory, manifest, fetch, and installing them in the game | done and verified: all 313,671 published pictures are downloaded in the build container (3,577 MB, none failed) and packed in 383 parts; the game installs them a kind at a time or all, with the size and room said first, pause, going on, retry, update and remove; they show on people, titles, seasons, episodes, companies and networks. Not built: larger or alternate pictures; resuming a half-downloaded part after the game is closed | `docs/PICTURE-COVERAGE.md`, `docs/DATA-PACKS.md`, `tests/pictures.test.ts` (11), `tests/catalog-server.test.ts`, `e2e/picture-library.spec.ts` |
| 6 | Pictures in the game: scoped packs, download all, pause, resume, retry, storage | not started | |
| 7 | Audits, journeys, performance and UI checks on the final tree | not started | |
| UI | Phone overhaul and whole-game cleanup: inventory, coverage matrix, foundation, parity tests | in progress: the foundation, the audit, the walk (59 screens, four profiles, desktop against phone) and the journey sweep are built; rows the matrix lists as not visited, and the limits it lists, are owed | `docs/v3/UI-COVERAGE.md`, `docs/v3/ui-inventory.json`, `e2e/ui-audit.ts`, `e2e/ui-coverage.spec.ts`, `tests/stylesheet.test.ts`, `tools/v3/ui-coverage.mjs` |

## Content Counts

`docs/v3/CONTENT-COUNTS.md`, written by `V3_WRITE=1 npx vitest run tests/v3-content.test.ts` from the story files. It is
the only place the counts are kept; this ledger does not repeat them, so they cannot drift apart.

## Acceptance Suites

| Suite | State | Tests |
| --- | --- | --- |
| T01 Content | in progress: the checks exist and pass on 2 stories; the quota is 14,900 | `tests/v3-content.test.ts`, `tests/blueprints.test.ts` |
| T02 Genre variety | not started: no mixed story is written | `tests/v3-content.test.ts` counts pairings |
| T03 Blueprint editing | passes for a film and a series, except the former 11 gap fields and shuffle | `e2e/stories.spec.ts` |
| T04 Character lifecycle | passes, except age stages, doubles and per-episode performers | `e2e/characters.spec.ts`, `tests/characters.test.ts` |
| T05 People | not started | |
| T06 Adaptation | not started | |
| T07 World | not started | |
| T08 Finance and release | not started | |
| T09 Audiences | not started | |
| T10 Media | in progress: fixture tests pass; the real fetch is running; nothing in the game yet | `tests/pictures.test.ts` |
| T11 UI | in progress: `e2e/ui-coverage.spec.ts` fails on any defect or desktop-and-phone difference on the screens it walks; the sweep measures the rest in journeys without failing them | `docs/v3/UI-COVERAGE.md` |
| T12 Career | not started | |

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
