# QA Report

## Revision And Environment

- Branch `claude/clever-archimedes-x0r26v` at the commit that updates this report, merged into `main` by checkpoint pull request. Repository remote: https://github.com/montrealroots/Final-SLATE-Build.
- Linux cloud container; Node 22.23.4; npm 10.9.9; TypeScript 6.0.2; Vite 8.3.6; React 19.3.1; Vitest 5.1.0; Playwright 1.63.0 with its bundled Chromium.
- Seeds: the engine journeys use fixed save tags; the balance runs use `seed1` to `seed30`.

## Commands And Results

| Command | Exit | Result |
| --- | --- | --- |
| `npm run world:check` | 0 | 252 entries (246 playable), 3,865 regions, 246 shards, 171,750 rows with 171,750 unique IDs, 175 outlines, 218 holiday entries, 11,459 stations; 0 problems. |
| `npm run typecheck` | 0 | No type errors (strict mode). |
| `npm test` | 0 | 51 tests passed (adds `tests/migration.test.ts`). |
| `npm run build` | 0 | Built with no warnings. Main chunk 387 kB (the 66 legacy-place climate records add 71 kB), React 219 kB; project screens load on demand (90 kB). |
| `npm run balance` | 0 | 1 test passed; 180 family runs plus 120 sensitivity runs. |
| `npm run e2e -- --trace off` | 1, then 0 | M1 run: 22 passed, 1 failed, 16 skipped. The failure was the documentary test matching "Cast" inside a generated name ("Bruno Castillo"); the assertion now checks for cast credit rows, and the test passed on rerun. Earlier full run: 23 passed, 16 skipped, across 5 projects: desktop, phone (Chromium 390×844), WebKit iPhone 15 Plus, iPhone 15 Pro Max, and iPhone 15 Pro Max landscape. The skips are tests that run on one project only by design. |

Counts at M1: 74 automated checks passed after the test fix (51 unit and engine tests, 23 browser tests), 16 skipped by design. Earlier base count: 72 automated checks passed, 0 failed, 16 skipped by design.

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
| Low | Documentary test treated a name containing "Cast" as a cast credit | Assertion checks credit rows | Documentary e2e |
| Medium | Toronto precipitation fell back to the model because only 1991-2020 stations were searched | Tiered station search: own country recent, own country any period, then anywhere | Legacy migration report (all 66 from stations) |
| Low | China's computed holidays were wrong for 2026 | Official 2026 arrangement used, with make-up working days | Lunar holiday test |

## Acceptance Status

**Pending.** All required automated checks pass on this revision. Still open (see `RESUME-HERE.md`):

- No physical iPhone or real Safari verification. WebKit emulation passed, but the on-screen keyboard can't be emulated.
- Lunar holidays exist for 2026 only.
- The 66 legacy places are matched to GeoNames (64 high confidence, 2 reviewed by hand); the world search and pickers are not built yet (M2).
- Festival and award rules are simulated.

This base is not claimed to be finished, bug-free or fully realistic.
