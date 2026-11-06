# QA Report

## Revision And Environment

- Branch `claude/clever-archimedes-x0r26v`, the commit that adds this report (code last changed at the preceding commit). Repository remote: https://github.com/montrealroots/Final-SLATE-Build.
- Linux cloud container; Node 22.23.4; npm 10.9.9; TypeScript 6.0.2; Vite 8.3.6; React 19.3.1; Vitest 5.1.0; Playwright 1.63.0 with its bundled Chromium.
- Seeds: the engine journeys use fixed save tags; the balance runs use `seed1` to `seed30`.

## Commands And Results

| Command | Exit | Result |
| --- | --- | --- |
| `npm run typecheck` | 0 | No type errors (strict mode). |
| `npm test` | 0 | 4 files, 37 tests passed. |
| `npm run build` | 0 | Built. Warning: the main bundle is 708 kB (184 kB gzipped). Not code-split. |
| `npm run balance` | 0 | 1 test passed; 180 family runs plus 120 sensitivity runs. |
| `npm run e2e -- --trace off` | 0 | 10 passed, 6 skipped. The skips are the desktop-only lifecycle, keyboard and media journeys, which don't run a second time on the phone project. |

Counts: 47 automated checks passed, 0 failed, 6 skipped by design.

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

## Acceptance Status

**Pending.** All required automated checks pass on this revision. The testing specification's acceptance gate still has open items, listed in `RESUME-HERE.md`:

- No physical iPhone or Safari verification.
- Not every production method has been played to delivery through the browser.
- Award nomination and ceremony flows have no browser coverage.
- Mid-session on-screen keyboard behavior is unverified.
- Some specified features are only partly modeled: motion-capture sessions, unscripted TV formats, festival screenings as separate appointments.

This base is not claimed to be finished, bug-free or fully realistic.
