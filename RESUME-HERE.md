# Resume Here

Read this first. It lists what is finished, what the Gap Completion Package still needs, and the order to do it in. There is no need to reread the package or redo finished work.

## Standing Rule

At every stopping point, open a pull request into `main` and merge it (see `CLAUDE.md`, certified by the user on November 6, 2026). Never merge red checks.

## State

- **Branch:** `claude/clever-archimedes-x0r26v`, pushed to https://github.com/montrealroots/Final-SLATE-Build. After each merge the branch restarts from `main`.
- **Merged checkpoints:** montrealroots/Final-SLATE-Build#1 (base build), #2, #3 (gap fixes before the package), #4 (M1, merge `2f488bb`). `main` was at `3845c2d` when the Gap Completion Package was applied.
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
- **M7 failure paths, screenings in the UI, held-out balance, budgets, accessibility:** local `npm run check` passed (79 tests, budget within limits), `npm run balance` passed, e2e 44 passed, 17 skipped by design, 0 failed; checkpoint pull request follows.

## Remaining Work, In Order

### Coding Gaps

1. **M2 follow-ups (small):** a repair screen when a save references a place that can't be found (package: "Invalid/unavailable place references give a repair screen"); today such a save shows the load error and is left untouched. Map markers are pointer-only; the list is the keyboard and screen-reader path.
2. **M3 follow-ups:** holiday names for countries without curated rules are in the official language (for example Chinese, Russian, Korean for later years); an English display name table would help players. Holidays are national or first-level-regional only; local (city) holidays are not included.
3. **M4 follow-ups:** "Export Save" is not offered (no export exists yet). The weather warning now uses "Rain is expected during your exterior shoot." and offers "Film an Interior Scene" only when an interior day is scheduled; "Move the Shoot" (to another date) isn't a separate action yet.
4. **M5 follow-ups:** capture sessions aren't placed on the calendar as fixed appointments (they run on working days once booked), so performer conflicts with shoot days are shown as task blocks, not calendar clashes; facial and body capture are one contribution; credits after replacing a performer mid-production are not separately tested.
5. **M6 follow-ups:** the 137 sections and categories are not yet audited against each rulebook (research, below).
6. **M7 follow-ups:** the repair screen above; a manual screen-reader pass (automated checks only so far); production timings (budgets are measured on the dev server).

### Research Still To Do

- Festival and award rulebooks: read each institution's current rules and compare its sections and categories, eligibility and premiere rules (137 entries). Dates were checked on November 6, 2026; see `docs/world/INSTITUTION-AUDIT.md` for which are still planning dates (Annecy 2027 has only tourism listings; BAFTA 2027 is unannounced; WGA, Series Mania and Hot Docs 2027 not found).

### External Or Manual (never blocks other work or future years)

- **Physical devices:** iPhone 15 Plus and 15 Pro Max in real Safari. Emulation runs in CI; a person with the devices must do the rest.
- **Human enjoyment and balance feedback:** the questions in `BALANCE-REPORT.md`.
- **Unpublished official information:** China's 2027 holiday notice (not out as of November 6, 2026), future Islamic announcements, future festival dates. The game uses projected dates, labelled, until these exist.

## Known Limits That Are Deliberate

- No tutorial, taxes, housing, banking, visas or attribute progression.
- Rules are simulated and labelled as such.
- Saves are local to the browser.
