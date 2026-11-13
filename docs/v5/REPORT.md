# The v5 Brief: Final Report

This report covers the owner's brief of November 13, 2026 (`docs/v5/00-OWNER-BRIEF.md`). The work is in pull request
https://github.com/montrealroots/Final-SLATE-Build/pull/86, on the branch `claude/clever-archimedes-x0r26v`.

The other v5 documents:

- `docs/v5/LEDGER.md` says where each section stands.
- `docs/v5/JOURNEYS.md` says where each of the ten journeys stands.
- `docs/v5/FIRST-LOOK.md`, `docs/v5/RELEASE-PLAN.md` and `docs/v5/MUSIC.md` hold the research.

The brief asked for "100% perfect completion". This report claims less than that. It sets out what was built, what was
verified and how, what the data limits, and what isn't done.

## Implemented And Verified

Each item is stored in the save, read by its engine, visible on screen, and survives a reload. Each has unit tests,
and a journey played through the interface.

| § | What | Commit | Unit tests | Journeys |
|---|---|---|---|---|
| 1 | The story read as developments; the whole brief from the story; Guide Me for writing | `80c9263`, `9667af3`, `196ea76` | `story-structure`, `proposal`, `guide-me` | `v5-source-to-release`, `adapt`, J03, `guide-me` |
| 2 | A schedule preview; work by format; quality isn't bought | `0ee69e2` | `production-tailored`, the regenerated goldens | J01 to J07, J09 |
| 3 | A real music catalog (Wikidata, CC0); recordings licensed; composers under one identity | `e36f62a`, `aedbce7` | `music-catalog` | `v5-music-catalog` (two tests) |
| 4 | Music briefs and cues from the project, not its genre | `c1b286d` | `cues` | `music` |
| 5 | First-look deals | `60f4737` | `first-look` (11 tests) | `v5-first-look` |
| 6 | The Release Plan | `80b40dc` | `release-plan` (9 tests) | `v5-release-plan`, `v5-series-release` |
| 7 | Productions that persist, outside work on them, entry by evidence, delays and cancellations | `e1da03f`, `2a2524a` | `productions`, `jobs` | J10, `jobs` |
| 8 | A TV week's slot, season and competition; the record book's money kept apart; grades for people | `b22b30c` | `audiences`, `box-office`, `grades` | J03, `earnings`, `studio-pitch` |
| 9 | Kit shortages wait for approval; a company account | `04b3b79`, `e1b7ea1` | `equipment`, `company` | `v5-money-equipment` |
| 10 | Phone parity for the v5 screens | `aedbce7` | n/a | The v5 journeys on phone and iPhone WebKit; a layout sweep of 101 screens |

Today's commits listed above, and others, also fixed problems the work turned up:

- A duplicate event name had silently broken music licences. `tests/handlers-unique.test.ts` now fails any second
  registration of the same event.
- A scratch test had been committed by mistake.
- J06 relied on the old automatic kit hire.
- Three journeys read the save before it was written.
- J03 recorded one seeded outcome. It now checks the renewal rule itself.
- A real record was named as the film catalog's when it came from the music catalog.
- Grand Theft Auto III was proposed as an adventure because it is a video game. 220 works with no recorded genre that
  maps were given one by medium. 94 are now read from their story; 126 have too little story and still fall back to
  their medium, and say so (`docs/v5/GENRES.md`).

**Checks.** `npm run check` exits 0, with 142 test files and 1,204 tests, the typecheck, the build and the size budget.

**CI.** It runs on every head of the PR. The last heads to pass `checks` and all six journey runs are named in
`RESUME-HERE.md`, and the PR is merged only on a green head.

## Data-Limited

These limits are stated in the game wherever they apply.

- **Box office and audience figures.** No recorded figures are imported. The TMDB catalog has no weekly figures, and
  none is invented. Every figure in the game is simulated and labelled.
- **First-look deals.** A studio's real terms aren't public. Terms are game calibration by the studio's recorded scale.
- **Platform names and fees.** Real platform names and fees aren't used. The research on access, such as what a
  selective streaming service accepts, comes from public explainers. Some of those are old or are sellers' blogs.
- **Wikidata's own errors.** The music catalog keeps them as recorded, with links to each record.
- **Stories.** 126 of 643 works have no story section in their article. Their outlines are the game's own, and say so.

## Not Done

- **No physical phone test.** All phone testing is Chromium at phone size and iPhone 15 Pro Max WebKit emulation.
- **Productions are local.** Other people's productions exist only where the player is.
- **Two journeys are not fully pinned.**
  - In the pinned world, the first-look journey's outside studio gives its own answer, and the journey handles either
    answer.
  - In the release-plan journey the licence income went to repaying the backers, so taking income home is played in
    J01 instead.
- **Earlier v4 open items** stay as `RESUME-HERE.md` lists them.
