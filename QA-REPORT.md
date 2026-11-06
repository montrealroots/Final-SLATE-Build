# QA Report

## Revision And Environment

- Branch `claude/clever-archimedes-x0r26v` at the commit that updates this report, merged into `main` by checkpoint pull request. Repository remote: https://github.com/montrealroots/Final-SLATE-Build.
- Linux cloud container; Node 22.23.4; npm 10.9.9; TypeScript 6.0.2; Vite 8.3.6; React 19.3.1; Vitest 5.1.0; Playwright 1.63.0 with its bundled Chromium.
- Seeds: the engine journeys use fixed save tags; the balance runs use `seed1` to `seed30`.

## Commands And Results

Latest full run: November 6, 2026, checkpoint A of the rulebook, performance and storage request (cross-save reliability fixes), local Linux container. The browser suite first ran 56 passed, 2 failed, 17 skipped: the two failures were an older test expecting the previous recovery wording, which now also names the copy's save time. After updating that locator, `e2e/failures.spec.ts` passed 14 of 14 on desktop and phone. Balance is unchanged by this checkpoint and runs in CI; the numbers below are from the previous local run.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run world:check` | 0 | 252 entries (246 playable), 3,865 regions, 246 shards, 171,750 rows with 171,750 unique IDs, 175 outlines, 218 holiday entries, 11,459 stations; 0 problems. |
| `npm run typecheck` | 0 | No type errors (strict mode). |
| `npm test` | 0 | 20 files, 117 tests passed, 0 skipped. |
| `npm run build` | 0 | Built with no warnings. |
| `npm run budget` | 0 | Startup JavaScript 691 kB raw, 205 kB gzipped, in 4 files including React (budgets 700 and 220 kB). World data is never in the startup files; the largest on-demand file is the station table, 3,216 kB. |
| `npm run balance` | 0 | 2 tests passed: 180 family runs, 120 sensitivity runs, determinism check, and 30 held-out combination runs. Results identical to the previous run. Took about 100 seconds (see `docs/ASSUMPTIONS.md`, Reliability). |
| `npm run e2e -- --trace off` | 0 after fix | 58 passed (56 in the full run plus the 2 fixed, rerun in their file), 17 skipped, 0 failed, across 5 projects: desktop, phone (Chromium 390×844), WebKit iPhone 15 Plus, iPhone 15 Pro Max and iPhone 15 Pro Max landscape. |

### Why 17 Browser Tests Are Skipped

Skipped tests did not run and are not counted as passed. Each is skipped on purpose for the project named:

- **1 on desktop:** the phone device test runs only on the iPhone emulation projects.
- **16 on phone (Chromium 390×844):** journeys that run once, at desktop width (2D, hybrid, documentary, TV, web series, 3D with motion capture, stop motion, unscripted, the two media checks), the performance measurement, and four lifecycle and layout checks that set their own viewports or tabs (every-viewport sweep, keyboard, clock while hidden, second tab).
- WebKit iPhone projects only run `live-action` and `devices` specs (configured in `playwright.config.ts`), so other specs are not listed for them at all.

### Not Automated

- No physical iPhone or real Safari: WebKit emulation only.
- No screen-reader pass by a person; the accessibility checks are automated.
- No human playtesting for enjoyment or balance.

## Also Checked During Development

- Playwright MCP was used directly in this session to load the app, check startup copy and creation validation, and inspect the phone drawer.
- The Impeccable deterministic design detector ran on each UI file through its hook and reported no issues. That is not a design approval.
- Security Guidance flagged a `new Function` call in a test helper. It was replaced with a safe read.

## Defects Found And Fixed

| Severity | Defect | Fix | Regression Check |
| --- | --- | --- | --- |
| High | Shoot days could pay past the fund (negative cash) | Funds checked before any payment beyond agreed amounts; schedules reserve their costs | Balance integrity assertion |
| High | Micro budgets could never finish | Required-only staffing proposals, role combining, scaled day fees | Balance results |
| High | Gaffer optional, so interiors were never shot | Required when the script has interiors or night scenes | Live-action e2e |
| Medium | One performer offered two characters in the same scene | Offer refused with the reason | Engine journeys |
| Medium | Shoot planner overfilled days | Planner matches daily capacity; long scenes span several days | Engine journeys |
| Medium | A partly shot day was reported as "lost" | Reported as "Partly Shot" | Engine journeys |
| Medium | A 13-minute "feature" counted as a feature | Runtime gate for categories; script note | Genre routing test |
| Medium | A stop-motion shot used every animator | One animator and one stage per shot | Stop-motion test |
| Medium | Shoot-day flags and warnings lived only in memory | Stored in the save | Save round-trip |
| Low | Phone calendar hid day entry counts | CSS order fixed | Viewport test checks December 25 |
| Low | Drawer didn't move or trap focus | Focus moved in, trapped and returned | Keyboard test |
| Low | Waiting tasks gave no reason | Reason shown for every waiting task | 3D e2e |
| Medium | Voice sessions created spurious design assets | Only real builds become assets | Motion-capture test |
| Medium | A motion-capture casting counted as a voice casting | Voice sessions check for a voice casting | Motion-capture test |
| High | A corrupted main save had no backup to recover from (the backup was deleted after every write) | Previous sound save kept; recovery with the damaged copy preserved | `tests/save-recovery.test.ts`, `e2e/failures.spec.ts` |
| High | An exception while time passed left the game busy, the clock stopped, and the event half-applied and gone | All-or-nothing processing per call; time pauses with an explanation | `tests/processing.test.ts`, `e2e/failures.spec.ts` |
| Medium | Impossible dates such as 31 February were accepted | Real-date checks | `tests/dates.test.ts` |
| Medium | `commit` and `settle` accepted NaN, Infinity and negative amounts; closed lines could take payments | Same checks as reservations | `tests/ledger.test.ts` |
| Medium | Saves were only shallowly validated | Deep validation with readable errors | `tests/save-recovery.test.ts` |
| Low | A failed index write could hide a save from the list | The list is rebuilt from the saves | `tests/save-recovery.test.ts` |
| Medium | A screening whose project couldn't be found never finished | The screening completes and logs "Your film" | `e2e/screenings.spec.ts` |
| Low | The Save And Exit error banner stayed after a later successful save | It clears once the game is saved | `e2e/failures.spec.ts` |
| High | Approving a new draft after filming made every scene's footage stale, not just the changed ones | Unchanged scenes carry their captures forward; changed scenes' work resets after a confirmation | `tests/writing.test.ts` |
| Medium | Capture-stage cost was only paid when the player directed | Stage sessions are paid from the booking whoever directs | `tests/lunar-mocap.test.ts` |
| Low | Documentary test treated a name containing "Cast" as a cast credit | Assertion checks credit rows | Documentary e2e |
| Medium | Toronto precipitation fell back to the model because only 1991-2020 stations were searched | Tiered station search: own country recent, own country any period, then anywhere | Legacy migration report (all 66 from stations) |
| High | An older build could replace a save written by a newer version, pushing it into the backup where the next save overwrote it | Writing refuses to replace a newer-version save and says why | `tests/save-recovery.test.ts` |
| Medium | Time paused after a failure in one save stayed paused in the next save opened | Opening a save clears the pause | `e2e/reliability.spec.ts` |
| Medium | The "last good copy" message was lost when opening waited for holiday rules, and didn't say which copy was opened | The message travels with the opened game and names the copy's save time | `e2e/reliability.spec.ts`, `e2e/failures.spec.ts` |
| Low | CI failed when the browser install stalled on the package mirror | Browsers cached by Playwright version; install retried within a time limit | CI runs |
| Low | China's computed holidays were wrong for 2026 | Official 2026 arrangement used, with make-up working days | Lunar holiday test |

## Acceptance Status

**Pending.** All required automated checks pass on this revision. Still open (see `RESUME-HERE.md`):

- No physical iPhone or real Safari verification. WebKit emulation passed, but the on-screen keyboard can't be emulated.
- Lunar holidays exist for 2026 only.
- The 66 legacy places are matched to GeoNames (64 high confidence, 2 reviewed by hand); the world search and pickers are not built yet (M2).
- Festival and award rules are simulated apart from the announced dates and categories listed in `docs/world/INSTITUTION-AUDIT.md` and `docs/world/CATEGORY-AUDIT.md`.

This base is not claimed to be finished, bug-free or fully realistic.
