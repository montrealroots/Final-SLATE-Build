# QA Report

## Revision And Environment

- Branch `claude/clever-archimedes-x0r26v` at the commit that updates this report, merged into `main` by checkpoint pull request. Repository remote: https://github.com/montrealroots/Final-SLATE-Build.
- Linux cloud container; Node 22.23.4; npm 10.9.9; TypeScript 6.0.2; Vite 8.3.6; React 19.3.1; Vitest 5.1.0; Playwright 1.63.0 with its bundled Chromium.
- Seeds: the engine journeys use fixed save tags; the balance runs use `seed1` to `seed30`.

## Commands And Results

Latest full run: November 6-7, 2026, screenwriting, motion-capture and replacement checkpoint (after montrealroots/Final-SLATE-Build#25), local Linux container.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run world:check` | 0 | 252 entries (246 playable), 3,865 regions, 246 shards, 171,750 rows with 171,750 unique IDs, 175 outlines, 219 holiday entries, 11,459 stations; 0 problems. Ledger classifications resolved (`docs/world/COUNTRY-DETAIL-AUDIT.md`). |
| `npm run typecheck` | 0 | No type errors (strict mode). |
| `npm test` | 0 | 30 files, 219 tests passed, 0 skipped (new this request: `tests/finance.test.ts` 10, `tests/import.test.ts` 7, `tests/screenwriting.test.ts` 5, `tests/creation.test.ts` 4, `tests/mocap-calendar.test.ts` 4). |
| `npm run build` | 0 | Built. One existing Vite notice (Startup is imported both statically and dynamically), present before this checkpoint. |
| `npm run budget` | 0 | Startup JavaScript 687 kB raw, 212 kB gzipped, in 4 files including React (budgets 700 and 220 kB). It reached 702 kB with this checkpoint's engine code; the Calendar, Place and Profile screens now load on first use instead of raising the budget. The largest on-demand file is the station table, 3,216 kB. |
| `npm run balance` | 0 | 2 tests passed: 180 family runs, 120 sensitivity runs, determinism check, and 30 held-out combination runs. Took 34 seconds on this checkpoint (98 seconds before the snapshot change, same machine). |
| `npm run perf:engine` | 0 | Fresh, medium and long saves; see `docs/PERFORMANCE.md`. |
| `npm run e2e -- --trace off` | 0 | Dev server: 106 passed, 23 skipped, 0 failed, with console, page-error and failed-request checks on every test. (An earlier run failed one journey because a source file was edited mid-run and the dev server reloaded the page; the clean rerun is the result given.) |
| `SLATE_E2E_PROD=1 npm run e2e -- --trace retain-on-failure` | 0 | Production build, the complete suite: 106 passed, 23 skipped, 0 failed, in 8.0 minutes. |

### Acceptance Journeys (This Request)

| Journey | Test |
| --- | --- |
| Creation, Review edits, Start My Story | `e2e/creation.spec.ts` (desktop, phone, WebKit), `e2e/first-project.spec.ts` |
| Script, budget, funding refused and secured, casting and crew, schedule, production, finishing, release | `e2e/first-project.spec.ts` |
| A second project with the first one's history intact | `e2e/first-project.spec.ts` |
| Export, import into a fresh browser, open, play, save, reload; duplicates; refusals; two tabs | `e2e/backup.spec.ts` |
| Recovery copies, full storage, failed saves | `e2e/storage.spec.ts`, `e2e/failures.spec.ts` |
| Insufficient funds | `e2e/first-project.spec.ts` (an offer refused: "only $0 is uncommitted") |
| Schedule conflicts | `e2e/screenings.spec.ts` (screening conflicts), `e2e/live-action.spec.ts` (weather), `tests/mocap-calendar.test.ts` (capture sessions) |
| Revisions | `tests/writing.test.ts`, `tests/screenwriting.test.ts` (engine; not yet a browser journey) |
| Screenshots | Desktop and phone screenshots of the financing screens and terms dialog were inspected; traces are kept on failure |

### Why 23 Browser Tests Are Skipped

Skipped tests did not run and are not counted as passed. Each is skipped on purpose for the project named, by an explicit `test.skip(project…)`; no test skips itself on an outcome any more:

- **1 on desktop:** the phone device test runs only on the iPhone emulation projects.
- **22 on phone (Chromium 390×844):** the first-project journey, the two-tab import check, and journeys that run once, at desktop width (2D, hybrid, documentary and its decline, TV, web series, 3D with motion capture, stop motion, unscripted and its withdrawal, the two media checks), the performance measurement, the two-tab storage check, and four lifecycle and layout checks that set their own viewports or tabs (every-viewport sweep, keyboard, clock while hidden, second tab).
- WebKit iPhone projects only run `live-action` and `devices` specs (configured in `playwright.config.ts`), so other specs are not listed for them at all.

### Not Automated

- No physical iPhone or real Safari: WebKit emulation only.
- No screen-reader pass by a person; the accessibility checks are automated.
- No human playtesting for enjoyment or balance.
- The WebKit typing loss noted at the last checkpoint is explained and fixed (focus timing; see Defects). The test-side wait was removed.

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
| Medium | Entering again after withdrawing reused the withdrawn entry's ID, so the new entry couldn't be withdrawn, and recorded a fee that wasn't charged | Each entry gets its own ID; the fee is charged and recorded once per category | `tests/rulebooks.test.ts` |
| Low | A cancelled release counted as a prior showing against premiere rules | Cancelled releases are ignored | `tests/rulebooks.test.ts` |
| Medium | A performer replaced after contributing lost their credit even when their work stayed in the film | Captures and takes record their performers; released performers whose work remains are credited | `tests/mocap-calendar.test.ts` |
| Medium | Motion-capture sessions had no dates: not on the calendar, no check against the performer's shoot days or the stage | Dated sessions with conflict checks, on the calendar; missed sessions rebooked | `tests/mocap-calendar.test.ts`, `tests/media.test.ts` (hybrid) |
| Low | Startup JavaScript went over its 700 kB budget (702 kB) with this checkpoint's engine code | Calendar, Place and Profile screens load on first use (687 kB); the budget was not raised | `npm run budget` |
| Medium | Modeled script quality could be raised by filling text fields with anything and by repeating revision passes (up to about 84 of 100 alone) | Presence of free text weighs little; passes and your own notes add nothing; readiness notes count once resolved | `tests/screenwriting.test.ts` |
| High | Choosing a budget size put its whole amount into the project at once (for example $4,000,000 for Mid Budget), so money never had to be raised | A budget size is now an estimate and a target; money arrives only from backers' accepted deals, with terms enforced; existing projects keep their money (save version 5) | `tests/finance.test.ts`, `e2e/first-project.spec.ts` |
| Medium | Several Review edit buttons in character creation opened the wrong screen ("Edit Birth Date And Birthplace" opened Pronouns) | One step registry; one edit per row, each to its own screen; Save And Return To Review | `tests/creation.test.ts`, `e2e/creation.spec.ts` |
| Medium | WebKit: text typed into a field right after Next was lost (focus moved to the heading a frame later) | Focus moves in the same commit | `e2e/creation.spec.ts` (fails with the old code in WebKit) |
| Low | Start My Story with something missing jumped to the screen but cleared its message | The message is kept | `e2e/creation.spec.ts` |
| Low | Two buttons were named "Continue {save}" after an import | The import's is "Open Imported Save" | `e2e/backup.spec.ts` |
| High | Recording an unscripted participant's withdrawal before the shoot left the game unable to save ("Your game couldn't be saved"): a redaction task was added for footage not yet shot, depending on work that didn't exist | Nothing filmed, nothing to redact: the withdrawal is recorded and the dialog says so; a withdrawal refused because the picture is locked now changes nothing | `tests/unscripted.test.ts`, `e2e/journeys.spec.ts` (found by the new withdrawal journey) |
| Medium | WebKit: a save written while the page unloaded raised an uncaught error ("… due to access control checks") because compression read a Blob through a blob URL | Compression streams straight from a Response, without a Blob | `e2e/test.ts` diagnostics on the WebKit projects, production build |
| Low (tests) | Documentary and unscripted journeys skipped themselves when contributors declined; route patterns missed the production build's hashed file names | Seeded fixtures (`seededLife`); patterns accept hashed names | `e2e/journeys.spec.ts`, `e2e/world.spec.ts`, `e2e/failures.spec.ts` |
| Medium | Saves grew 0.6 MB per game year because every edition stored full copies of competing films | Save version 3 stores each film once (long save 1,100 to 859 kB) | `tests/rulebooks.test.ts` |
| High | Long careers outgrew localStorage: a single career stopped saving after about 5 game years (50 years measured at 19.8 MB) | Save version 4 compacts finished editions; saves live in IndexedDB, compressed, through the save vault | `tests/vault.test.ts`, `e2e/storage.spec.ts`, `tests/perf/career.perf.ts` |
| High | (Found while moving to IndexedDB) WebKit refuses Blobs in IndexedDB in private sessions, so the first save never stored | Compressed saves are stored as ArrayBuffers; opening the vault checks a test write and falls back to localStorage | WebKit iPhone projects in the browser suite |
| Medium | (Found while moving to IndexedDB) A reload right after an action could lose it, because an asynchronous write may not finish as a page closes | A closing-page journal in localStorage, applied on the next start | `tests/vault.test.ts`, `e2e/world.spec.ts` |
| High | Saving needed room for three copies of a game, so a long game with two recovery copies (5.5 MB at peak) could not save in a browser | Saving no longer writes a temporary copy; peak is two copies | `tests/save-recovery.test.ts` (real-limit store) |
| Medium | Deleting a save left its damaged copies in storage, unlisted, forever | Deleting a save removes all its copies after a confirmation that counts them; recovery copies are listed with Export and Delete | `tests/save-recovery.test.ts`, `e2e/storage.spec.ts` |
| Medium | A full browser storage gave the same message as any other failed save, with no way to free space | Storage-full message with Free Up Space; Saved Games shows storage use | `e2e/storage.spec.ts`, `e2e/failures.spec.ts` |
| Low | A save whose only good copy was a backup taken before an update was not listed, and a stale interrupted copy could be opened over a newer backup | Saves are found by any openable copy; the newest sound copy opens | `tests/save-recovery.test.ts`, `e2e/storage.spec.ts` |
| High | An older build could replace a save written by a newer version, pushing it into the backup where the next save overwrote it | Writing refuses to replace a newer-version save and says why | `tests/save-recovery.test.ts` |
| Medium | Time paused after a failure in one save stayed paused in the next save opened | Opening a save clears the pause | `e2e/reliability.spec.ts` |
| Medium | The "last good copy" message was lost when opening waited for holiday rules, and didn't say which copy was opened | The message travels with the opened game and names the copy's save time | `e2e/reliability.spec.ts`, `e2e/failures.spec.ts` |
| Low | CI failed when the browser install stalled or crawled on the Ubuntu package mirror (three times); a timed-out attempt left apt holding the package lock | CI runs in Microsoft's Playwright image for the locked version, so nothing is installed | CI run for #17: 63 passed, 18 skipped in 7.3 minutes |
| Low | China's computed holidays were wrong for 2026 | Official 2026 arrangement used, with make-up working days | Lunar holiday test |

## Acceptance Status

**Pending.** All required automated checks pass on this revision. Still open (see `RESUME-HERE.md`):

- No physical iPhone or real Safari verification. WebKit emulation passed, but the on-screen keyboard can't be emulated.
- Lunar holidays exist for 2026 only.
- The 66 legacy places are matched to GeoNames (64 high confidence, 2 reviewed by hand); the world search and pickers are not built yet (M2).
- Festival and award rules: 47 of 142 categories use organizer rules read for an edition in play and 2 use projected rules (`docs/world/RULEBOOK-AUDIT.md`); the other 93 are simulated and labelled. TIFF and BAFTA could not be read (HTTP 403).

This base is not claimed to be finished, bug-free or fully realistic.
