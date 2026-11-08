# QA Report

## Revision And Environment

- Branch `claude/clever-archimedes-x0r26v` at the commit that updates this report, merged into `main` by checkpoint pull request. Repository remote: https://github.com/montrealroots/Final-SLATE-Build.
- Linux cloud container; Node 22.23.4; npm 10.9.9; TypeScript 6.0.2; Vite 8.3.6; React 19.3.1; Vitest 5.1.0; Playwright 1.63.0 with its bundled Chromium and the installed WebKit build. All browser testing is emulation: Chromium at desktop and phone sizes, WebKit with Playwright's iPhone 15 Plus and 15 Pro Max profiles. No physical device or real Safari was used.
- Seeds: the engine journeys use fixed save tags; the balance runs use `seed1` to `seed30`.

## Commands And Results

### Current: Estimates That Follow The Work, Contextual Directing (November 8, 2026, after #44)

Tested revision: the branch's commits `2f4f0fa` (estimates), `3eadff8` (directing), `b9a9766` (journeys, ledger,
research) and `a2d6bb5` (resume notes) on top of `main` at `37123f5`. The browser suite and checks below ran on `a2d6bb5`.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 63 files, 439 tests passed (`tests/estimates.test.ts` 11, `tests/directing.test.ts` 11 new); build passed; startup JavaScript 689 kB, 218 kB gzipped (budgets 700 and 220), 0 problems. |
| `npm run balance`, `npm run perf:engine` | 0 | 2 and 2 tests passed. Balance moved: the low-budget live-action feature now averages 74.4 days (was 82.2) and spends 48.3% of its fund (was 54.6), because the default shot plan covers what each scene needs instead of master and singles everywhere; the micro short 33.5 days (34.6). Delivered rate unchanged (1) in every family; the held-out mean overall moved 60.8 to 60.9. |
| `SLATE_E2E_PROD=1 npx playwright test --trace retain-on-failure` | 0 | Production build, the complete suite: 192 passed, 31 skipped, 0 failed, in 18.0 minutes. |
| `npx playwright test e2e/live-action.spec.ts` (all four projects) and `e2e/careers.spec.ts` (desktop) | 0 | Run while writing the journeys: live-action passed on desktop, phone, iPhone 15 Plus and iPhone 15 Pro Max; the TV season passed. |

Comparison tests, each on more than one seed or scenario: same runtime with different complexity (three world seeds);
same script by different methods; an unavailable role against an available one; reused against new builds; a smaller
draft before and after commitments, and after filming; estimate against spending, with the reasons, through a save;
take rules over 40 seeds (a usable first take ends the usual rule; more takes cost time and are sometimes no better);
covering what each scene needs against the most of everything under the same resources, over three tags; missing,
needed and surplus coverage; a restrained one-shot scene; review fixes, a pickup refused for lack of money then booked;
accepting a gap through a save; an old save keeping its rules.

Defects found on the way and fixed:
- Offers out were counted twice: as held money and as work to come.
- An unavailable role was priced at nothing.
- The schedule and the estimate used different day rules.
- Capture-stage cost was missing until booked.
- The Dailies card first dropped the Takes card's free choice of take (restored).
- Its fix buttons were sentence case, against `docs/COPY-GUIDE.md` (now Title Case, with the cost beside each).
- `PRODUCTION-SOURCES.md` and the ledger's 20-02 row said no source was ever used. That was true until this change and is now in the past tense.

Screenshots inspected: What It Costs and the scope-change dialog (desktop), the Dailies card (desktop and WebKit iPhone 15 Pro Max).

### Previous: Screen Review, Identity From 1221 (November 8, 2026, after #38)

The owner's screen-by-screen review (start screen, then Identity) led to fixes to the place picker and to bringing over
what 1221's Identity had: a legal name in parts and a preferred name, citizenship that decides public-fund
eligibility, and a headshot (save version 6).

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 34 files, 292 tests passed (`tests/identity.test.ts` 8, `tests/portrait.test.ts` 22 ported from 1221); build passed; startup JavaScript 668 kB raw (684,029 bytes), 206 kB gzipped, 0 problems. |
| `npm run balance`, `npm run perf:engine` | 0 | 2 and 2 tests passed; balance results unchanged. |
| `SLATE_E2E_PROD=1 npm run e2e -- --trace retain-on-failure` | 0 | Production build, the complete suite: 147 passed, 27 skipped, 0 failed, in 14.4 minutes. |
| Old code against new | | The fund rule's test fails when the rule is removed; the picker tests failed on the old picker (country list said Featured Cities after Nairobi). |

Defects found on the way: the ported headshot picker re-saved without end under a parent that passes a new callback
each render (fixed in the picker); with a country chosen, typing "Paris" found a British place, never Paris, France
(featured cities in other countries are now offered); New Script's two country lists shared one name for screen
readers (each is named for its picker). Screenshots of Review and Profile (desktop and phone) were inspected.

### Previous: Budget-Size Wording (November 8, 2026, after #37)

The owner asked for the naming question to be decided.
- **Kept:** the size names, since "micro-budget" is the industry's word for this scale.
- **Changed:** the New Script picker. It now says "from $40,000" instead of "about $40,000", because the size's amount is
  the least an estimate can be. Each size describes how it works. The intro says the approved script sets the estimate.
  `docs/ASSUMPTIONS.md` matches.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | 32 files, 262 tests passed; startup JavaScript 664 kB raw (679,537 bytes), 206 kB gzipped, 0 problems. |
| `SLATE_E2E_PROD=1 npx playwright test e2e/first-project.spec.ts e2e/live-action.spec.ts e2e/careers.spec.ts` (desktop, phone) | 0 | 9 passed, 3 skipped by design. |
| `SLATE_E2E_PROD=1 npm run e2e -- --trace retain-on-failure` | 0 | Production build, the complete suite: 141 passed, 27 skipped, 0 failed, in 14.0 minutes. |

The picker was screenshotted at phone width and reads without clipping.

### Previous: Micro-Budget Tuning (November 7, 2026, after #36)

Local Linux container, branch `claude/clever-archimedes-x0r26v` from `main` at `5e142f4` (#36). The commands ran on the
branch's final source; the commit after the runs changes only these reports. See the PR for CI.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 32 files, 262 tests passed (`tests/tight-budget.test.ts` 6); build passed; startup JavaScript 663 kB raw (679,394 bytes), 206 kB gzipped, budgets 700 and 220 kB, 0 problems. |
| `npm run balance` | 0 | 2 tests passed; 240 family runs. Two new families, stop motion and 3D CG at micro budget, deliver in 30 of 30 seeds, and the harness now fails if any micro family doesn't. The live-action micro row moved (staffing change); every low-budget row is unchanged (`BALANCE-REPORT.md`). |
| `npm run perf:engine` | 0 | 2 tests passed. |
| `SLATE_E2E_PROD=1 npm run e2e -- --trace retain-on-failure` | 0 | Production build, the complete suite: 141 passed, 27 skipped, 0 failed, in 14.0 minutes. |
| `npm run e2e -- --trace retain-on-failure` | 0 | Development server, the complete suite: 141 passed, 27 skipped, 0 failed, in 17.4 minutes. |
| Old code against new | | Each new unit test fails on the old code or a mutation: the studio fee (the day threw), combining order, all-or-nothing staffing, the estimate's floor at the budget size, and a target the player set. |

**Measured before the change** (engine, 8 seeds each, Micro Budget at $40,000, the game's own staffing proposals): stop
motion delivered in 0 of 8 at 1, 2 and 4 minutes; 3D CG in 0 of 8 at 2 minutes; 2D drawn in 6 of 8; live action and 2D
rigged in 8 of 8. **After**, funded by the starting backing up to the script's estimate: 8 of 8 in every case. Estimates:
stop motion $68,000 (1 minute), $80,000 (2 minutes), $151,000 (4 minutes at TV quality); 3D CG $57,000; 2D drawn $43,000;
live action and 2D rigged stay $40,000. Spending lands at 79% to 85% of the estimate.

### Previous: Genre Catalog Loading And More Connected Careers (November 7, 2026, after #35)

Local Linux container, branch `claude/clever-archimedes-x0r26v` from `main` at `c00c261` (#35). The commands ran on the
branch's final source; the commit after the runs changes only these reports. See the PR for CI.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 31 files, 256 tests passed (`tests/genre-catalog.test.ts` 6, three of which fail on the old loader); build passed; startup JavaScript 661 kB raw (676,736 bytes), 205 kB gzipped, budgets 700 and 220 kB, 0 problems. |
| `npm run balance` | 0 | 2 tests passed; `docs/balance-results.json` and `docs/balance-heldout.json` unchanged. |
| `npm run perf:engine` | 0 | 2 tests passed. |
| `SLATE_E2E_PROD=1 npm run e2e -- --trace retain-on-failure` | 0 | Production build, the complete suite: 141 passed, 27 skipped, 0 failed, in 14.3 minutes. |
| `npm run e2e -- --trace retain-on-failure` | 0 | Development server, the complete suite: 141 passed, 27 skipped, 0 failed, in 17.4 minutes. |
| `e2e/viewports.spec.ts` reload test, old code against new | | Failed on the old code (the game opened read-only after a reload); passes with the fix, and the two-tab test still passes. |

168 browser tests are listed: 70 on desktop, 70 on phone, 13 on `iphone-15-plus`, 14 on `iphone-15-pro-max`, 1 on
`iphone-15-pro-max-landscape` (`npx playwright test --list`).

**What a browser downloads** (`docs/PERFORMANCE.md`): the startup JavaScript (676,736 bytes, 205 kB gzipped) is what the
budget covers. The holiday rules, calendars, genre catalog and seasons table are fetched in the background from startup
and must arrive before a game opens. That's another 826,260 bytes, about 107 kB gzipped. Moving data out of the
JavaScript moved when it downloads, not whether.

### Previous: Input Loss, Startup And Connected Journeys (November 7, 2026, after #34)

Local Linux container, branch `claude/clever-archimedes-x0r26v` from `main` at `6e2abf0` (#34). The commands ran on the
branch's final source; the commits after the runs change only these reports. See the PR for CI.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 30 files, 250 tests passed; build passed; startup JavaScript 661 kB raw (676,736 bytes), 205 kB gzipped, budgets 700 and 220 kB, 0 problems. Before this pass it was 701 kB (718,078 bytes), over budget (`docs/PERFORMANCE.md`). |
| `npm run balance` | 0 | 2 tests passed; `docs/balance-results.json` and `docs/balance-heldout.json` unchanged. |
| `npm run perf:engine` | 0 | 2 tests passed. |
| `npm run e2e -- --trace retain-on-failure` | 0 | Development server, the complete suite: 134 passed, 24 skipped, 0 failed, in 16.8 minutes. |
| `SLATE_E2E_PROD=1 npm run e2e -- --trace retain-on-failure` | 0 | Production build, the complete suite: 134 passed, 24 skipped, 0 failed, in 12.7 minutes. |
| `e2e/focus.spec.ts`, old code against new | | With the old code: the typing test failed 8 of 8 runs (desktop and `iphone-15-plus`), the map test every run. With the fix: 24 of 24 passed (desktop, phone, both iPhone projects, three runs each). |

158 browser tests are listed: 65 on desktop, 65 on phone, 13 on `iphone-15-plus`, 14 on `iphone-15-pro-max`, 1 on
`iphone-15-pro-max-landscape` (`npx playwright test --list`). Every test also fails on any console error, page error or
failed request, unless it injects that failure on purpose (`e2e/test.ts`).

### Previous: Script Rules Review (November 7, 2026, #34)

Local Linux container, branch `claude/clever-archimedes-x0r26v` after `main` at `4e9e484` (#33). The commands ran on the
branch's final source (the commits that follow change only these reports). See the PR for CI.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 30 files, 250 tests passed (`tests/script-effects.test.ts` 23); build passed; startup JavaScript 700 kB raw, 216 kB gzipped (budgets 700 and 220 kB, 0 problems). It reached 703 kB with the review's engine code; explanations only the project screens use moved to `src/engine/script-explain.ts`, loaded with those screens, instead of raising the budget. |
| `npm run balance` | 0 | 2 tests passed. Family means within half a point of before after the script base went from 40 to 42; two held-out combinations fell about 2 overall (see `docs/SCREENWRITING-AUDIT.md`). |
| `npx playwright test e2e/script-rules.spec.ts` (production build, desktop and phone) | 0 | 3 passed, 1 skipped (the mature-project journey runs at desktop width only). Screenshots inspected: supporting antagonist placement, incomplete pitch (desktop and phone), treatment sent, content declared, cut dialog, pickup, late-slot broadcast offers. They led to three copy fixes (see Defects). |
| `npm run e2e -- --trace off` | 1 | Development server: 120 passed, 24 skipped, 1 failed: `e2e/live-action.spec.ts` on `iphone-15-pro-max` (WebKit; explained and fixed after #34, see Defects), where the typed working title was gone when Create Project was pressed ("Enter a working title."). The same spec repeated 6 times on that project passed 6 times, and a minimal fill-and-check repeated 30 times on both iPhone projects passed 30 times. It is recorded as an open intermittent WebKit fault together with CI run 63's (see Open below), not as a pass. |
| `SLATE_E2E_PROD=1 npm run e2e -- --trace retain-on-failure` | 0 | Production build, the complete suite: 121 passed, 24 skipped, 0 failed, in 9.7 minutes, with console, page-error and failed-request checks on every test. The 24 skips are the 23 listed below plus the mature-project playthrough on phone (desktop only, by design). |

### Earlier: November 6-7, 2026

Screenwriting, motion-capture and replacement checkpoint (after montrealroots/Final-SLATE-Build#25), local Linux container.

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

### Acceptance Journeys (current)

| Journey | Test | Where it runs |
| --- | --- | --- |
| One connected career: creation with two Review edits; naming characters with a supporting antagonist; script choices (an essential scene, a clue planted and paid off, declared strong content); the grant blocked on missing documents, then the documents written and sent; casting; crew; the schedule; an essential scene cut, restored and picked up; production; the edit; delivery; a late-slot broadcast offer taken with a broadcast edit; Save & Exit and Continue mid-production and at the end, checking every choice survived | `e2e/connected.spec.ts` | desktop, phone, `iphone-15-pro-max` |
| A TV season (3 episodes): a regular and a guest; the approved script changed after the first scene was filmed, re-approved with the refilm named, the scene picked up; delivered at 9 minutes with the guest credited for their episode; self-released and reloaded | `e2e/careers.spec.ts` (seed 11) | desktop |
| Stop motion: an offer refused with no money; the schedule refused with its shortfall; the target raised and an investor's offer accepted; reopened while the genre catalog and holiday rules fail to load, then Try Again with progress unchanged; puppets, sets, delivery, credits, release | `e2e/careers.spec.ts` (seed 23) | desktop |
| Writing, producing and directing without acting: a performer booked elsewhere turns the part down (Cast table and Home say so); recast; credits behind the camera only, unchanged after a reload | `e2e/careers.spec.ts` (seed 31) | desktop, phone |
| A damaged genre catalog publishes nothing; Try Again with a good one opens the game with all 149 entries | `e2e/failures.spec.ts` | desktop, phone |
| Supporting-antagonist placement, an incomplete pitch, a revised treatment; a mature project with a cut and picked-up essential scene and the late slot | `e2e/script-rules.spec.ts` | desktop and phone; the mature journey on desktop |
| Creation, every Review edit, invalid edits, Start My Story with something missing, keyboard and reload | `e2e/creation.spec.ts` | desktop, phone, both iPhone projects |
| Typing straight after a screen change; Save And Return To Review while the map arrives | `e2e/focus.spec.ts` | desktop, phone, both iPhone projects |
| First project: write, approve, a grant refused, the agreed backing, production, release, a second project with history intact | `e2e/first-project.spec.ts` | desktop; financing screens on phone |
| Media journeys: 2D, hybrid, documentary and a decline, TV, web series, 3D with motion capture, stop motion, unscripted and a withdrawal, festivals and awards to the ceremony | `e2e/journeys.spec.ts`, `e2e/media.spec.ts` | desktop |
| Export, import into a fresh browser, duplicates, refusals, two tabs; recovery copies, full storage, failed saves, missing data | `e2e/backup.spec.ts`, `e2e/storage.spec.ts`, `e2e/failures.spec.ts`, `e2e/reliability.spec.ts` | desktop and phone |
| Revisions | `tests/writing.test.ts`, `tests/screenwriting.test.ts` | engine only; not a browser journey |

Screenshots of the connected journey (desktop, phone and `iphone-15-pro-max`), the three careers, the script-rules
journeys and the focus tests were inspected; traces are kept for any failure. Nothing overlapped, clipped or became
unreadable. Two things were noted and not changed. On the phone, the scrolling tab bar's arrows cover the first letters
of the edge tabs ("‹roduction"); that is the existing scroll affordance. A section scrolled into view sits partly
under the sticky header on the iPhone; in the screenshot, the Distribution Offers heading was cut off.

### Why 27 Browser Tests Are Skipped

Skipped tests did not run and are not counted as passed. Each is skipped on purpose for the project named, by an
explicit `test.skip(project…)`; no test skips itself on an outcome:

- **1 on desktop:** the phone device test runs only on the iPhone projects.
- **26 on phone (Chromium 390×844):** the device test (iPhone projects only), and the journeys and checks that run once,
  at desktop width: the TV and stop-motion careers (2), the reload lifecycle check (1), the first-project journey (1), the two-tab import and storage checks (2), the 11 journeys in
  `e2e/journeys.spec.ts` (2D, hybrid, documentary and its decline, TV, web series, 3D with motion capture, stop motion,
  unscripted and its withdrawal, festival under official rules), the two media checks (2), the performance measurement
  (1), the mature-project script-rules journey (1), and four layout and lifecycle checks that set their own viewports or
  tabs (4).
- The WebKit iPhone projects list only the specs they run (`playwright.config.ts`): `iphone-15-plus` runs creation,
  focus, live-action and devices; `iphone-15-pro-max` the same plus the connected journey; the landscape project runs
  devices. Specs they don't list aren't counted for them at all.

### Not Automated

- No physical iPhone or real Safari: WebKit emulation only, and the on-screen keyboard can't be emulated.
- No screen-reader pass by a person; the accessibility checks are automated.
- No human playtesting for enjoyment or balance.

## Also Checked During Development

- Playwright MCP was used directly in this session to load the app, check startup copy and creation validation, and inspect the phone drawer.
- The Impeccable deterministic design detector ran on each UI file through its hook and reported no issues. That is not a design approval.
- Security Guidance flagged a `new Function` call in a test helper. It was replaced with a safe read.

## Defects Found And Fixed

| Severity | Defect | Fix | Regression Check |
| --- | --- | --- | --- |
| High | (Found measuring micro budgets, after #36) A voice session the production could no longer pay the studio for threw an error: the whole day rolled back and time paused with "Something went wrong while time passed" | The session waits with the reason, as render time and wages already did | `tests/tight-budget.test.ts` (threw on the old code) |
| High | (After #36) Micro-budget stop motion and 3D could never finish: staffing proposals went department by department in alphabetical order and spent the money before reaching the animator or the storyboard artist | Proposals hire a required crew the money can pay, or no one, and name the shortfall | `tests/tight-budget.test.ts`, `e2e/careers.spec.ts` stop motion |
| Medium | (After #36) Role combining rarely happened: the colorist and re-recording mixer were hired before the editor and sound designer who cover them | On a micro budget, covering roles are proposed first | `tests/tight-budget.test.ts`, `tests/production-golden.test.ts` (regenerated for this intended change) |
| Medium | (After #36) A project's Budget Estimate was its size's fixed amount whatever the script, so the agreed starting backing was asked for too little | After approval, the estimate is what the script needs at its size, with a tenth for contingency, never below the size; the target follows it unless the player set one | `tests/tight-budget.test.ts`, `e2e/careers.spec.ts` |
| Low | (Found in a screenshot) The staffing dialog said "Every role here already has someone or an offer out" beside a shortfall that had stopped every offer | The line shows only when it's true | `e2e/careers.spec.ts` |
| High | (Found by the stop-motion career, after #35) A reload followed by Continue within six seconds opened the game read-only ("This game is open in another tab") with no other tab: the closed page's lock was still fresh | A page that goes away releases its lock; a hidden tab keeps it | `e2e/viewports.spec.ts` (failed on the old code) |
| Medium | (After #35) A genre catalog with a bad record halfway through left the records before it published and the catalog counted as loaded; a later load added them again | The whole catalog is built and checked before anything is published; a valid catalog survives a bad one | `tests/genre-catalog.test.ts` (three tests fail on the old loader), `e2e/failures.spec.ts` |
| High | (The intermittent WebKit failure in New Script, after #34) Text typed right after a screen change was lost: `store.go` moved focus to the screen one animation frame later, and on a busy device that frame arrived mid-typing ("The Last Ferry" became "Th"). Not WebKit-specific: reproduced on Chromium too once frames were made late | Focus moves in a layout effect in the commit that shows the screen | `e2e/focus.spec.ts` (failed 8 of 8 on the old code) |
| Medium | (The CI run 63 failure in creation) The world map drew a one-line placeholder, then grew 364 px on desktop and 195 px on an iPhone a moment later, pushing Save And Return To Review down after it was drawn; a click or tap aimed at it landed elsewhere | The placeholder is the map's own box with its credit line | `e2e/focus.spec.ts` (failed on every run on the old code) |
| Medium | (Found moving the genre catalog out of startup) A catalog that failed to load could never be retried: browsers keep a failed dynamic import failed | Fetched instead of imported; a failure stops the game opening with the reason and Try Again | `e2e/failures.spec.ts` |
| Low | Startup JavaScript was over its 700 kB budget (701 kB) | The genre catalog and seasons table load in the background before a game opens (661 kB); the budget unchanged | `npm run budget` |
| High | (Found by the mature-project playthrough) A pickup asked for before or during the shoot was booked three days out, ahead of prep: the day was lost but still paid fees and crew, and the project could no longer afford the reshoot or deliver | Pickups are booked after the last scheduled shoot day | `tests/script-effects.test.ts` ("a pickup asked for before the shoot"), `e2e/script-rules.spec.ts` |
| High | A scene cut from the edit still held up the assembly edit, which waited for every approved scene's footage | The capture milestone skips scenes cut from the edit | `tests/script-effects.test.ts` ("a shoot day left empty by a cut") |
| Medium | Rules merged in #33 rewarded filling boxes or were arbitrary: story functions forced leading placement; an "18+" rating inferred from one checkbox barred broadcast; text presence bought time (a week, a day) and design work; the turning-point penalty could never apply; a shared background scored performances | Replaced or removed as traced in `docs/SCREENWRITING-AUDIT.md` | `tests/script-effects.test.ts`, `tests/heritage.test.ts`, `tests/genres.test.ts` |
| Medium | Text-presence prompts (objective, genre questions and others) cost script quality and lowered backers' odds while open, so any text raised both | Prompts are advisory: shown, never counted, and resolving one earns nothing | `tests/script-effects.test.ts` |
| Low | The setups ledger appeared only for genres with clue or setup conventions, so other projects couldn't declare the dependencies the edit plan reads | Offered to every scripted project | `e2e/script-rules.spec.ts` |
| Low | (Found in playthrough screenshots) The Backgrounds panel still said a shared background counts toward the performance; a blocked backer listed its documents twice; the Coverage card called scenes waiting for their shoot day short of material | Copy corrected | `e2e/script-rules.spec.ts` |
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

## Open

- No code fault is open from this pass. Physical devices, a person's screen-reader pass and human playtesting remain
  outside what was tested.
- The micro-budget balance question recorded at #36 was worked through after it (see Current and `BALANCE-REPORT.md`).
  The naming question it left was decided on November 8, 2026: the names stay ("micro-budget" is the industry's word
  for the scale), and the picker says "from $40,000" with what the size means in practice. The balance runs are an
  autopilot, not human play.
- On the iPhone, a section scrolled into view can sit partly under the sticky header (see Acceptance Journeys).

## Acceptance Status

**Pending owner acceptance.** On the final source of this pass every required automated check passed: `npm run check`,
the balance and engine performance tests, and both complete browser suites (141 passed, 27 skipped by design, 0 failed). Still open (see `RESUME-HERE.md`):

- No physical iPhone or real Safari verification; WebKit emulation only.
- Holidays: dated from 2026 to 2100 by the worldwide rules, with lunar and announced holidays beyond their published
  years labelled projected or expected, and some not dated until their country announces them.
- Festival and award rules: 48 of 142 categories use organizer rules read for an edition in play and 2 use projected
  rules (`docs/world/RULEBOOK-AUDIT.md`); the other 92 are simulated and labelled. TIFF and BAFTA couldn't be read
  (HTTP 403).

This base is not claimed to be finished, bug-free or fully realistic.
