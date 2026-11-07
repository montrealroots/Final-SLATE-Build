# Resume Here

Read this first. It lists what is finished, what the Gap Completion Package still needs, and the order to do it in. There is no need to reread the package or redo finished work.

## Standing Rule

At every stopping point, open a pull request into `main` and merge it (see `CLAUDE.md`, certified by the user on November 6, 2026). Never merge red checks.

## State

- **Branch:** `claude/clever-archimedes-x0r26v`, pushed to https://github.com/montrealroots/Final-SLATE-Build. After each merge the branch restarts from `main`.
- **Merged checkpoints:** montrealroots/Final-SLATE-Build#1 (base build), #2, #3 (gap fixes before the package), #4 (M1), #5 (M2), #6 (M3 and M4), #7 (M5), #8 (M6), #9 (M7), #10 (repair screen, Export Save), #11 (Move the Shoot, keyboard map markers, category audit), #12 (save recovery and validation, dates, processing rollback, ledger checks), #13 (production module split, CI budgets and balance), #14 (cross-save reliability fixes, CI browser-install resilience; merged as `7c7d15e`), #15 (faster rollback snapshots, smaller startup files; `2633269`), #16 (two-copy saving, recovery copies, full-storage handling; `19b513f`), #17 (organizer rulebooks, save version 3, CI in the Playwright image; `36da91f`), #19 (long-career storage: IndexedDB save vault, save version 4; `1c5f802`), #20 (rulebooks for Annecy, Venice, Berlinale, Golden Globes, Emmys; `4fa5d27`), #21 (country classifications, Suriname holidays, English names, climate source; `cb23eca`), #22 (deterministic journeys, production-build runs, browser diagnostics; `3a84bf3`), #23 (production-build suite in CI; `b2d7b31`), #24 (character creation fixes, Import Save; `e26d71d`). `main` was at `3845c2d` when the Gap Completion Package was applied.
- **Package:** "SLATE Gap Completion Package" (predates #2 and #3). Its references are not committed; the imported data is under `src/world/` and `docs/world/`.
- **Run first:**

  ```bash
  npm ci
  ```

  ```bash
  npm run check
  ```

  ```bash
  npm run e2e -- --trace off
  ```

## Package Reconciliation

| Package area | Already in the base before the package | Added by this phase |
| --- | --- | --- |
| World import (GeoNames, regions, zones) | 66 hand-made places | M1: 252 entries, 3,865 regions, 171,750 places validated by `npm run world:check`; 66 legacy IDs aliased to GeoNames |
| Climate (WMO normals) | Hand-written climate per place | M1: nearest-station normals with height correction; modeled fallback beyond 400 km, labelled |
| Save migration | Save version 1, verified writes | M1: save version 2, backup before migrating, refusal when no backup can be kept |
| Search and map, world pickers | Catalog search of 66 cities | M2: lazily fetched country shards, accent-insensitive ranked search, region filter, World route with list and outline map, world places in creation, travel and production bases, kept in saves |
| Holidays worldwide | Hand rules for the 66 places' countries, sourced 2026 lunar dates | M3: donor engine for 218 entries (2026-2100), curated rules kept authoritative, later lunar years projected or expected, coverage notes instead of silent ordinary days; production applies holidays through each project's holiday policy |
| 1221 UI adaptation | Shell, tokens and startup already on the 1221 palette | M4: startup copy and actions (New Game, Continue, Saved Games, Settings), eight creation sections ending in Start My Story, one route registry (`src/ui/routes.ts`) with in-game Saved Games and Settings, save-error copy with Try Again, 16px fields on phones, widths 360-1920 checked, `docs/COPY-GUIDE.md` |
| Motion capture, unscripted families, release, writing | Capture sessions, one unscripted pipeline, offers and releases, drafts | M5: capture booking, calibration, takes, retakes, approved take, cleanup and retargeting with cancellation terms; talk, observational, competition (stored deterministic rounds), factual and studio variety with withdrawal and redaction; distribution contracts with delivery materials and release cancellation; re-approval keeps unchanged scenes' work |
| Screenings, festival and award rules, competing projects | Screenings, simulated rules, stored season rival slates | M6: invitations with reply deadlines, travel-in-time checks, schedule conflicts, a 30-minute reminder and attendance; 19 of 37 institutions on organizer-announced dates (sources in `docs/world/INSTITUTION-AUDIT.md`), planning dates labelled for the rest |
| Failure-path journeys, balance, performance, accessibility | Happy-path journeys, balance runs | M7: failed save, version-1 save and data-load failures through the UI; screening journeys; held-out seeds on feature combinations; measured size and interaction budgets; automated accessibility checks |

## Milestone Log

- **M1 world data and climate:** implemented and tested. `npm run check` passed (51 tests, world check 0 problems); e2e 23 passed, 16 skipped by design after a test-only fix; GitHub Actions CI passed. Merged as montrealroots/Final-SLATE-Build#4 (`2f488bb`).
- **M2 world search and map:** merged as montrealroots/Final-SLATE-Build#5 (`d171f95`); CI passed.
- **M3 worldwide holidays and M4 1221 UI adaptation:** merged as montrealroots/Final-SLATE-Build#6 (`2d9ebbc`). The first CI run hung installing browsers and was cancelled; CI steps now have timeouts; the second run passed.
- **M5 motion capture, unscripted families, release contracts, writing regression:** merged as montrealroots/Final-SLATE-Build#7 (`e1d4964`).
- **M6 screening invitations and announced edition dates:** merged as montrealroots/Final-SLATE-Build#8 (`a979714`).
- **M7 failure paths, screenings in the UI, held-out balance, budgets, accessibility:** merged as montrealroots/Final-SLATE-Build#9 (`24f0cff`); CI passed.
- **Repair screen for unresolvable places and Export Save:** local `npm run check` passed (80 tests, startup JavaScript 679 kB, 201 kB gzipped, within budget), e2e 46 passed, 17 skipped by design, 0 failed. Final checkpoint of this package.
- **Coding gaps (Move the Shoot, keyboard markers, category audit):** merged as montrealroots/Final-SLATE-Build#11.
- **Reliability pass (concerns 1-5):** montrealroots/Final-SLATE-Build#12.
- **Production module split, CI balance and budgets, report reconciliation (concerns 6-7):** montrealroots/Final-SLATE-Build#13; local results in `QA-REPORT.md`.
- **CI runs inside `mcr.microsoft.com/playwright:v1.63.0-noble`** (since #17): the Ubuntu package mirror stalled or crawled during browser installs three times, so CI no longer installs packages. When `@playwright/test` is upgraded, change the image tag in `.github/workflows/ci.yml` to match; a CI step fails until they agree.
- **Checkpoint A of the rulebook/performance/storage request:** CI run 17 on `main` failed because the apt mirror stalled while installing browsers (infrastructure, not code); CI now caches browsers by Playwright version and retries the install twice within a bounded time. Reliability fixes verified across switching saves and reloading, with three defects fixed and covered: a paused clock from one save carried into the next save opened; a recovery message was dropped when opening waited for holiday rules to load, and didn't say which copy was opened; an older build could replace a save written by a newer version (and push it into the backup, where the next save would overwrite it). New: `e2e/reliability.spec.ts`; `tests/save-recovery.test.ts` covers a write failing at each stage three times in a row, no room to keep a damaged copy, repeated opens of a damaged save, and refusing to replace a newer save.

## Remaining Work, In Order

### Newest Request (November 7, 2026, later): 1221's creation suite, done in this checkpoint

"I need that whole creation suite ... what's not there then don't add it." Creation now follows 1221's
`CharacterCreation.tsx`: Identity, Background & Languages, Starting Point, Review, keeping only what the engine
stores (see the table in `docs/UI-1221-LAYOUT.md`). `CREATION_STEPS` has four ids (`identity`, `background`,
`starting-point`, `review`); drafts saved with the eight-step ids or numbers reopen on the step that now holds those
fields. The place pickers show the world map (loaded with the World screen's file); creation itself now loads on first
use, so startup JavaScript went down to 687 kB. Browser helpers: `createCharacter` and `fillBirthDate` follow the new
steps; `e2e/creation.spec.ts` was rewritten for them (Review edits per step, invalid edits, a missing field at Start My
Story, Billed As following pronouns until chosen, the WebKit typing case, keyboard focus, reload, I Still Live Where I
Was Born). Local results: `npm run check` 220 tests, 0 problems; dev-server and production-build suites each 114 passed,
23 skipped by project design, 0 failed.

### Earlier Request (November 7, 2026): the 1221 layout, done

The user asked for the screens to be set up exactly like the `montrealroots/1221` repository and, asked to choose, picked
"look and layout": 1221's design, keeping Final SLATE's own game and engines, adding none of 1221's features (it is an
actor's life simulator with a school, a bank and tax papers). See `docs/UI-1221-LAYOUT.md`. 1221 was read, never
changed. `src/ui/app.css` is 1221's stylesheet whole, plus a short section for Final SLATE's own elements;
`tokens.css` is gone (1221's file holds the same tokens). The shell, the grouped rail and drawer, Home, page heads,
tab bars, dialogs, the start screen and creation follow 1221's markup. Browser-test helpers follow it too: `nav()`
uses the rail's buttons and reaches the calendar through Home's Open Calendar; `pressSaveAndExit()` opens the drawer
where needed; Home's heading is the greeting. Startup JavaScript is 697 kB of the 700 kB budget.
Two 1221 stylesheet faults were fixed here rather than copied: its drawer opened at a fixed 56px, over the second row
of a phone's bar, and its drawer shade was hidden by a later rule. Local results on the final code: `npm run check`
219 tests, 0 problems; dev-server suite 106 passed, 23 skipped by project design, 0 failed; production-build suite
106 passed, 23 skipped, 0 failed (run just before the drawer fix). Not checked: real phones, a person's judgment of
the look against 1221 beyond the side-by-side captures.

### Latest Request (November 6, 2026, night): done

1. Verification: CI green through #23; full dev and production-build suites 96 passed, 21 skipped (project exclusions), 0 failed with the creation changes.
2. **Character creation: done** (merged in #24). Step registry `CREATION_STEPS` (`src/engine/state.ts`); drafts store a step id (older numeric and partial drafts are normalized by `normalizeDraft`); Review has one edit action per row, each to its own screen, and "Save And Return To Review"; Start My Story now keeps the messages on the screen it jumps to. WebKit input loss: the cause was focus moved to the heading one animation frame after a step change, taking focus from a field already chosen; focus now moves in the same commit (`e2e/creation.spec.ts` fails with the old code in WebKit, passes now). The test-side wait was removed.
3. **Import Save: done** (merged in #24), see `docs/STORAGE.md`.
4. **First-project journey and funding: done** (this checkpoint), see `docs/FIRST-PROJECT-JOURNEY.md`. A budget size is an estimate and a target, not money; backers (`src/engine/finance.ts`) decide over days, some refuse, terms are shown before acceptance and enforced after. Save version 5 keeps every existing project's money as an accepted "agreed before financing" deal with its approval rights. Engine test fixtures fund projects through a labelled `agreedFunding` helper (`tests/helpers.ts`); browser journeys fund through the Budget screen. `e2e/first-project.spec.ts` plays creation to a second project. Startup JavaScript is 695 kB of the 700 kB budget: little room left.
5. **Screenwriting connections: done** (this checkpoint), see `docs/SCREENWRITING-AUDIT.md`. Each customization is classified (creative description, structured choice, readiness check, modeled quality). Script quality can no longer be manufactured: free-text presence weighs little, revision passes and your own notes add nothing, readiness notes count only once resolved in the script ("Add To Revision Notes" now connects Readiness to revision notes). Fixed-seed golden results changed only in quality (script 5-9 points lower). The Story, World Rules, Readiness and Revision Notes panels say what SLATE does and doesn't read.
6. **Integration gaps: done for what was in reach** (this checkpoint).
   - Motion capture: booking dates every session (`MocapSession`), passing over dates when the performer is shooting (in any project), has another capture session, or the stage is taken for another character; sessions are on the shared calendar, run only on their dates, and a session the performer can't make is recorded as missed and rebooked. Body, face or both is chosen at booking: facial capture adds a rig cost per session and a facial solve before the character's animation, and is credited "Facial Capture", "Motion Capture" or "Performance Capture". Bookings from before this keep their price and run as before (no dates).
   - Replacements: captures and takes record who performed them; a performer released after contributing keeps their pay to date, is paid nothing more, and is still credited while their work stays in the film (`tests/mocap-calendar.test.ts`).
   - Rulebooks: San Sebastián 74th edition read and applied (2027 projected): 48 verified, 2 projected, 92 simulated of 142.
   - Holidays: Eswatini's Public Holidays Act found but its schedule is behind a bot check (not bypassed); recorded.
   - Startup files were over budget (702 kB): the Calendar, Place and Profile screens now load on first use (687 kB).
7. Next: acceptance journeys (part 7) beyond those already added (`e2e/first-project.spec.ts`, `e2e/backup.spec.ts`, `e2e/creation.spec.ts`).

### Current Request, In Order (started November 6, 2026, evening)

1. **Long-career storage: done** (this checkpoint), see `docs/STORAGE.md`. Measured 1-50-year engine careers (`tests/perf/career.perf.ts`): 19.8 MB at 50 years before. Save version 4 compacts finished editions (12.4 MB at 50 years). Saves now live in IndexedDB, gzip-compressed (1.3 MB per copy at 50 years), through the save vault (`src/engine/vault.ts`, `src/ui/idb.ts`): atomic commits, verified move out of localStorage under a Web Lock with conflict copies, a closing-page journal, localStorage fallback. Still open: competing films and projects keep growing (about 0.25 MB raw a year); real Safari/Firefox quotas unmeasured.
2. **Festival and award rules: done for what was readable** (this checkpoint). Recount: 37 institutions, 142 categories (the Emmys' Outstanding Movie replaced Outstanding Television Movie from 2026). 47 verified, 2 projected, 93 simulated. New rulebooks: Annecy 2026 (2027 projected), Venice 2026 (2027 projected), Berlinale 2027 competition (projected: undated page), Golden Globes 2027, Emmys 2026 (2027 projected). Untouched future editions in existing saves adopt published rules on load. TIFF and BAFTA refused this environment (HTTP 403) twice and stay simulated; see `docs/world/RULEBOOK-AUDIT.md`.
3. **Country and holiday detail: done for what was readable** (this checkpoint), see `docs/world/COUNTRY-DETAIL-AUDIT.md`. Every entry classified (193 UN members, 2 observer states, 2 limited recognition, 1 disputed territory, 51 territories with their sovereign, 2 historical). Suriname's holidays added from its Staatsblad (219 entries with rules; 27 playable without, each listed with what blocked it). Official English names shown beside original names where an official English list exists (Cyprus). The place screen says where its climate comes from (9 entries borrow or model it).
4. **Deterministic required journeys: done** (this checkpoint). No journey skips itself any more: `seededLife` (`e2e/helpers.ts`) fixes the world seed of a game made through the UI, so the documentary and unscripted journeys run with everyone agreeing (seed 2) and fail if anyone doesn't. Declines and withdrawals have their own journeys (seed 3: one documentary contributor declines; an unscripted participant withdraws before the shoot) and unit tests (`tests/media.test.ts`, `tests/unscripted.test.ts`). The game still draws every answer by chance. Remaining project exclusions are explicit `test.skip(project…)` lines.
5. **Production build and diagnostics: done** (this checkpoint). `SLATE_E2E_PROD=1 npm run e2e` runs every journey on `vite build` + `vite preview`. Every test now records console errors, page errors and failed requests (`e2e/test.ts`) and fails on any, except tests that inject failures (`expectErrors`). CI runs the suite on both the dev server and the production build. Still open: real devices and human feedback (below).

### Previous Request (done)

- Checkpoint A, montrealroots/Final-SLATE-Build#14; performance, #15 (`docs/PERFORMANCE.md`); storage, #16; rulebooks and save version 3, #17 (`docs/world/RULEBOOK-AUDIT.md`).

### Coding Gaps

1. **M2 follow-ups:** none open. Map markers are keyboard buttons ("Open {place}"); the repair screen for unresolvable places is done.
2. **M3 follow-ups:** holiday names stay in the official language unless an official English source gives one (field `en`, so far Cyprus); 32 more countries with non-Latin names need such a source (China, Korea and Georgia were tried; see `docs/world/COUNTRY-DETAIL-AUDIT.md`). Holidays are national or first-level-regional only; local (city) holidays are not included.
3. **M4 follow-ups:** Export Save is offered for every saved game and next to a failed save. The weather warning now uses "Rain is expected during your exterior shoot." and offers "Film an Interior Scene" only when an interior day is scheduled; "Move the Shoot" moves the day to the first free working day after the shoot, if everyone on set is free.
4. **M5 follow-ups:** capture sessions aren't placed on the calendar as fixed appointments (they run on working days once booked), so performer conflicts with shoot days are shown as task blocks, not calendar clashes; facial and body capture are one contribution; credits after replacing a performer mid-production are not separately tested.
5. **M6 follow-ups:** none open in code. The category audit (`docs/world/CATEGORY-AUDIT.md`) marks 47 categories Rules verified and 2 Rules projected; the rest still only match published names (research, below).
6. **M7 follow-ups:** a manual screen-reader pass (automated checks only so far); production timings (budgets are measured on the dev server).

### Research Still To Do

- Festival and award rulebooks: 93 of 142 categories still use simulated rules. TIFF and BAFTA Film need their organizers' documents read from a network that can reach tiff.net and bafta.org; then the rest listed in `docs/world/RULEBOOK-AUDIT.md`. Each needs its organizer's document for the edition in play; add a new rulebook version, never edit one an edition already uses. European Film Awards eligibility differs slightly (see the category audit). Dates: Annecy 2027, BAFTA 2027, WGA, Series Mania and Hot Docs 2027 are still planning dates.

### External Or Manual (never blocks other work or future years)

- **Physical devices:** iPhone 15 Plus and 15 Pro Max in real Safari. Emulation runs in CI; a person with the devices must do the rest.
- **Human enjoyment and balance feedback:** the questions in `BALANCE-REPORT.md`.
- **Unpublished official information:** China's 2027 holiday notice (not out as of November 6, 2026), future Islamic announcements, future festival dates. The game uses projected dates, labelled, until these exist.

## Known Limits That Are Deliberate

- No tutorial, taxes, housing, banking, visas or attribute progression.
- Rules are simulated and labelled as such, except where `docs/world/RULEBOOK-AUDIT.md` lists organizer rules.
- Saves are local to the browser (IndexedDB, or localStorage where it isn't available). Export Save is the copy outside it; Import Save brings one back (`docs/STORAGE.md`).
