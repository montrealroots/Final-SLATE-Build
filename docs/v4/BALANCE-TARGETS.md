# Balance Targets And The v4 Spread

The targets were written down before the run, in `tests/balance/v4-spread.bal.ts`, and the run checks them. They are this
game's targets for a playable career, not industry figures. `npm run balance` writes `docs/v4/SPREAD-RESULTS.json` and
`docs/v4/EVENT-FREQUENCY.md`; this page reads them as of November 13, 2026.

## Targets

- Every run keeps its books: no negative cash, and no payment settled twice.
- At least 80% of runs in each cell deliver within 500 days; a micro budget delivers in every run.
- The mean overall quality of what is delivered falls between 40 and 80.
- No run spends past the money raised for it.

## The Spread

Six formats and methods, each at a resource level, in four places (budgets, holidays, weather, child rules and languages
differ by place), ten seeds each: 240 runs. Misses: none.

| Format And Method | Resource Level | Place | Runs | Delivered | Mean Overall | Books Kept | Most Spent Of The Money Raised |
| --- | --- | --- | --- | --- | --- | --- | --- |
| live-action short | micro | gb-london | 10 | 100% | 59.2 | Yes | 71.0% |
| live-action short | micro | us-los-angeles | 10 | 100% | 59 | Yes | 78.0% |
| live-action short | micro | ng-lagos | 10 | 100% | 58.9 | Yes | 73.4% |
| live-action short | micro | jp-tokyo | 10 | 100% | 59.1 | Yes | 81.3% |
| live-action feature | low | gb-london | 10 | 100% | 57.7 | Yes | 20.1% |
| live-action feature | low | us-los-angeles | 10 | 100% | 57.8 | Yes | 17.8% |
| live-action feature | low | ng-lagos | 10 | 100% | 58.1 | Yes | 16.4% |
| live-action feature | low | jp-tokyo | 10 | 100% | 59.3 | Yes | 19.4% |
| live-action limited series | mid | gb-london | 10 | 100% | 60 | Yes | 1.3% |
| live-action limited series | mid | us-los-angeles | 10 | 100% | 58.7 | Yes | 1.1% |
| live-action limited series | mid | ng-lagos | 10 | 100% | 59.2 | Yes | 1.1% |
| live-action limited series | mid | jp-tokyo | 10 | 100% | 57.9 | Yes | 1.5% |
| 2D drawn short | low | gb-london | 10 | 100% | 60.9 | Yes | 22.5% |
| 2D drawn short | low | us-los-angeles | 10 | 100% | 60.4 | Yes | 19.9% |
| 2D drawn short | low | ng-lagos | 10 | 100% | 60.8 | Yes | 22.1% |
| 2D drawn short | low | jp-tokyo | 10 | 100% | 61.9 | Yes | 21.5% |
| 3D CG short | micro | gb-london | 10 | 100% | 61.1 | Yes | 79.1% |
| 3D CG short | micro | us-los-angeles | 10 | 100% | 60.7 | Yes | 79.2% |
| 3D CG short | micro | ng-lagos | 10 | 100% | 61.1 | Yes | 79.0% |
| 3D CG short | micro | jp-tokyo | 10 | 100% | 60.8 | Yes | 79.6% |
| stop-motion short | micro | gb-london | 10 | 100% | 60.8 | Yes | 81.0% |
| stop-motion short | micro | us-los-angeles | 10 | 100% | 61.2 | Yes | 80.3% |
| stop-motion short | micro | ng-lagos | 10 | 100% | 61.2 | Yes | 81.3% |
| stop-motion short | micro | jp-tokyo | 10 | 100% | 61.4 | Yes | 80.6% |

## What It Does Not Show

- Ten seeds a cell is a spread, not a distribution: `docs/balance-results.json` (thirty seeds a family, in London, with
  single-variable sensitivity) is the deeper run.
- The runs make one project each, with a fixed hiring policy (`tests/helpers.ts castAll`, `staffAll`): they don't play a
  career's later decisions (releases, festivals, renewals).
- The limited series spends little of its mid-level budget because it is two short episodes; the level sets the money
  raised, not what the script costs.
