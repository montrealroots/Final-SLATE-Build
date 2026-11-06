# Resume Here

Read this first. It lists what is finished, what the Gap Completion Package still needs, and the order to do it in. There is no need to reread the package or redo finished work.

## Standing Rule

At every stopping point, open a pull request into `main` and merge it (see `CLAUDE.md`, certified by the user on November 6, 2026). Never merge red checks.

## State

- **Branch:** `claude/clever-archimedes-x0r26v`, pushed to https://github.com/montrealroots/Final-SLATE-Build. After each merge the branch restarts from `main`.
- **Merged checkpoints:** montrealroots/Final-SLATE-Build#1 (base build), #2, #3 (gap fixes before the package), #4 (M1), #5 (M2), #6 (M3 and M4), #7 (M5), #8 (M6), #9 (M7), #10 (repair screen, Export Save), #11 (Move the Shoot, keyboard map markers, category audit), #12 (save recovery and validation, dates, processing rollback, ledger checks), #13 (production module split, CI budgets and balance), #14 (cross-save reliability fixes, CI browser-install resilience). `main` was at `3845c2d` when the Gap Completion Package was applied.
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
- **Checkpoint A of the rulebook/performance/storage request:** CI run 17 on `main` failed because the apt mirror stalled while installing browsers (infrastructure, not code); CI now caches browsers by Playwright version and retries the install twice within a bounded time. Reliability fixes verified across switching saves and reloading, with three defects fixed and covered: a paused clock from one save carried into the next save opened; a recovery message was dropped when opening waited for holiday rules to load, and didn't say which copy was opened; an older build could replace a save written by a newer version (and push it into the backup, where the next save would overwrite it). New: `e2e/reliability.spec.ts`; `tests/save-recovery.test.ts` covers a write failing at each stage three times in a row, no room to keep a damaged copy, repeated opens of a damaged save, and refusing to replace a newer save.

## Remaining Work, In Order

### This Request, In Order (started November 6, 2026)

1. Checkpoint A (above): done.
2. Performance: profile rollback copying on fresh, medium and long saves (tick, event-heavy advance, sleep, memory, balance); optimize while keeping rollback, determinism and exactly-once; reduce startup JavaScript by measured lazy loading.
3. Storage: measure peak storage during a save (main, temporary copy, backup, migration backups, damaged copies); documented retention with export and cleanup choices; exhaustion at every save stage.
4. Festival and award rulebooks: recount institutions and entries; verify edition-specific rules with sources; versioned rule data wired to projects, releases, screenings, credits, submissions and the calendar; boundary tests; a full browser journey from submission to results with save and reload.

### Coding Gaps

1. **M2 follow-ups:** none open. Map markers are keyboard buttons ("Open {place}"); the repair screen for unresolvable places is done.
2. **M3 follow-ups:** holiday names for countries without curated rules are in the official language (for example Chinese, Russian, Korean for later years); an English display name table would help players. Holidays are national or first-level-regional only; local (city) holidays are not included.
3. **M4 follow-ups:** Export Save is offered for every saved game and next to a failed save. The weather warning now uses "Rain is expected during your exterior shoot." and offers "Film an Interior Scene" only when an interior day is scheduled; "Move the Shoot" moves the day to the first free working day after the shoot, if everyone on set is free.
4. **M5 follow-ups:** capture sessions aren't placed on the calendar as fixed appointments (they run on working days once booked), so performer conflicts with shoot days are shown as task blocks, not calendar clashes; facial and body capture are one contribution; credits after replacing a performer mid-production are not separately tested.
5. **M6 follow-ups:** none open in code. The category audit (`docs/world/CATEGORY-AUDIT.md`) corrected the Emmys drama/comedy split and Gotham's Breakthrough Series; 130 of 141 entries match the organizers' published names but were not re-fetched (research, below).
6. **M7 follow-ups:** a manual screen-reader pass (automated checks only so far); production timings (budgets are measured on the dev server).

### Research Still To Do

- Festival and award rulebooks: 130 of 141 categories are marked "Matches published name" without a fresh source; reading each current rulebook (eligibility, entry limits, premiere rules) remains. European Film Awards eligibility differs slightly (see the audit). Dates were checked on November 6, 2026; see `docs/world/INSTITUTION-AUDIT.md` for which are still planning dates (Annecy 2027 has only tourism listings; BAFTA 2027 is unannounced; WGA, Series Mania and Hot Docs 2027 not found).

### External Or Manual (never blocks other work or future years)

- **Physical devices:** iPhone 15 Plus and 15 Pro Max in real Safari. Emulation runs in CI; a person with the devices must do the rest.
- **Human enjoyment and balance feedback:** the questions in `BALANCE-REPORT.md`.
- **Unpublished official information:** China's 2027 holiday notice (not out as of November 6, 2026), future Islamic announcements, future festival dates. The game uses projected dates, labelled, until these exist.

## Known Limits That Are Deliberate

- No tutorial, taxes, housing, banking, visas or attribute progression.
- Rules are simulated and labelled as such.
- Saves are local to the browser.
