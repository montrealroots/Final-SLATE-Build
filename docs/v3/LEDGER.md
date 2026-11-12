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
| 1 | Audit of HEAD; package and brief in the repository; this ledger | in progress | this file |
| 2 | Schemas, IDs, migrations, validation; the full character editor; one film and one series blueprint | not started | |
| 3 | Blueprint preview, apply and undo; the 11 structural fields; the 149-genre libraries; mixed genres | not started | counts below |
| 4 | People and department loops; source catalog and adaptation; international companies | not started | |
| 5 | Schedule, location and distribution gaps; box office, history books, weekly audiences | not started | |
| 6 | The whole catalog's pictures: inventory, manifest, fetch | in progress | `docs/PICTURE-COVERAGE.md` |
| 6 | Pictures in the game: scoped packs, download all, pause, resume, retry, storage | not started | |
| 7 | Audits, journeys, performance and UI checks on the final tree | not started | |
| UI | Phone overhaul and whole-game cleanup: inventory, coverage matrix, foundation, parity tests | not started | `docs/v3/UI-COVERAGE.md` |

## Content Counts

Printed by `node tools/v3/counts.mjs` (not written yet). Until it exists every count is 0.

| What | Required | Authored | Reviewed |
| --- | --- | --- | --- |
| Blueprints with a primary genre, all 149 genres | 14,900 (100 each: 50 film, 50 TV) | 0 | 0 |
| Genres at quota | 149 | 0 | 0 |
| Mixed-genre pairings with 10 blueprints | every genre in 3 pairings | 0 | 0 |
| Source-material records | 500 | 0 | 0 |

## Acceptance Suites

T01 to T12 of `04-INTEGRATION-AND-ACCEPTANCE.md`. None has passed. Each is marked here when its tests exist and pass,
with the test files named.

## Decisions

- **Pictures first in time, sixth in order.** The fetch for the whole catalog takes hours of waiting and none of
  attention, so its tool was written first and it runs while the rest is built. Nothing else was reordered.
- **One primary picture a record, small.** `w185` portraits, posters, season posters and stills, `w300` backdrops,
  `w154` logos: TMDB's own sizes from its `/configuration`, read November 12, 2026. Larger and alternate pictures would
  be another tier; it is not built and nothing claims it.
- **Records TMDB marks adult are listed and excluded,** with that reason in the manifest. Nothing is fetched for them.
