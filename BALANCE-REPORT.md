# Balance Report

Revision: the commit that adds this file, on branch `claude/clever-archimedes-x0r26v`. Command: `npm run balance` (exit 0). Raw results: `docs/balance-results.json`.

These are **automated simulation runs**, not human playtests. A management autopilot (`tests/helpers.ts`) plays the producer:
- It offers roles to the cheapest available experienced candidates, staffs required roles and accepts counteroffers.
- It runs cut passes, then locks picture and delivers.
- When money runs out, it brings in a co-producer once and rebuilds the schedule.

A real player can make different choices.

## Design Targets

- Distinct production methods have distinct time and cost profiles.
- Completion is reachable on every supported route, and tight budgets create real tradeoffs.
- More money does not by itself raise quality.
- Preparation choices have small, positive, bounded effects.
- No negative cash, no double payment, and identical results for identical seeds.

## Method

30 fixed seeds (`seed1` to `seed30`) per scenario family, each a fresh life in London starting January 5, 2026. Sensitivity runs use 15 seeds and change one input. Ranges are 10th to 90th percentiles. This is a diagnostic sample, not a statistical guarantee.

## Results (30 Seeds Each)

| Family | Delivered | Needed Extra Funding | Days From Schedule To Delivery, Median | Share Of Fund Spent (%), Median | Lost Shoot Days, Mean | Overall Assessment, Mean ± SD | Reception, Mean ± SD |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Live-action short, micro budget | 100% | 40% | 28 (27 to 43) | 68.6 (53.1 to 74.7) | 1.3 | 59.4 ± 2.2 | 59.7 ± 6.9 |
| Live-action feature, low budget | 100% | 0% | 78 (76 to 90) | 53.4 (49.8 to 57.8) | 4.0 | 59.1 ± 1.9 | 58.2 ± 7.8 |
| 2D drawn short | 100% | 0% | 203 (203 to 203) | 19.5 (18.6 to 20.9) | 0 | 62.6 ± 1.0 | 63.8 ± 6.8 |
| 3D CG short | 100% | 0% | 142 (142 to 142) | 17.0 (16.1 to 18.0) | 0 | 62.6 ± 1.1 | 64.0 ± 4.6 |
| Stop-motion short | 100% | 0% | 237 (232 to 239) | 28.6 (27.7 to 31.3) | 0 | 62.3 ± 1.4 | 64.0 ± 7.2 |
| TV limited series, 2 episodes | 100% | 0% | 27 (27 to 28) | 8.6 (8.3 to 10.1) | 0.5 | 60.2 ± 1.5 | 56.6 ± 7.9 |

Integrity across all 180 runs: 0 negative cash balances and 0 duplicate settlements. Two runs of the same seed produced identical output.

## Sensitivity (15 Seeds, One Change Each)

| Change | Result |
| --- | --- |
| Feature: 0 vs 8 rehearsal days | Mean assessment 57.5 vs 58.9. Small and positive, as intended. |
| Feature: low vs mid budget, same hiring policy | Assessment 59.1 vs 59.1. Median spend $207,590 vs $264,290 (mid shoot days cost more). Money alone buys nothing. |
| Stop motion: 1 vs 2 copies of each puppet | Mean 236 vs 230 days. Duplicates let shots run in parallel but cost more to build. |
| 3D: 4 vs 40 render nodes | Mean 152 vs 141 days. Render capacity is a real bottleneck. |

## Changes Made Because Of These Runs

1. **Shoot days could overspend the fund.** Rained-out days paid past the agreed amounts without a funds check, and micro-budget runs ended with negative cash. Shoot days and task wages now check uncommitted funds before paying anything beyond what was agreed. If the money isn't there, the day doesn't run and the player is told what to do.
2. **Schedules now reserve their costs.** Location, equipment, crowd and material costs are reserved when a schedule is built. A shortfall is refused with the exact amount and the options.
3. **Staffing proposals cover required roles only,** and compatible roles can be combined at small scale (DESIGN section 9). Before this, micro budgets could not finish at all.
4. **The gaffer is required when a script has interiors or night scenes,** matching the shoot rules.
5. **Location and equipment fees scale with the funding scenario** (micro 0.3×). This is a calibration assumption: micro shoots usually use borrowed gear and free locations.
6. **A stop-motion shot uses one animator and one stage.** Previously one shot could absorb every animator.

## Exploit Checks

- **Repeated rewards and rerolls:** settlements are keyed; festival and award results are written once (`tests/journeys.test.ts` reprocesses after results and checks they don't change).
- **Free quality from repetition:** cut passes add at most 10 assessment points, and revision passes and addressed notes add at most 12. Revisions take scheduled time.
- **Refund loops:** withdrawing a festival entry does not refund the fee, and released hires keep only what was already paid.
- **Time skipping:** Advance and Sleep use the same event processing as 1:1 time.

## Open Questions For Human Feedback

- Overall assessments cluster tightly (SD about 1 to 2) because they average crew capability. Reception adds more spread (SD about 5 to 8). Is that enough variety between projects?
- Animation timelines barely vary between seeds, because nothing like weather affects them. Should they carry more risk, such as staff illness or retakes?
- A 4- to 5-minute animated short takes about five to eight months with one artist per role. Hiring more artists shortens that. Does it feel right in play?
- Animation shorts spend only 17 to 29% of a $400,000 fund. Should the scenarios be cheaper, or should animation cost more?
