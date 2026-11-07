# Balance Report

Revision: the commit that adds this file, on branch `claude/clever-archimedes-x0r26v`. Command: `npm run balance` (exit 0). Raw results: `docs/balance-results.json`.

These are **automated simulation runs**, not human playtests. A management autopilot (`tests/helpers.ts`) plays the producer:
- It offers roles to the cheapest available experienced candidates, staffs required roles and accepts counteroffers.
- It runs cut passes, then locks picture and delivers.
- When money runs out, it brings in a co-producer once and rebuilds the schedule.
- For the micro-budget animation families, the starting backing pays the target once the script is approved, as it does for a player. The target follows the script's estimate (`src/engine/estimate.ts`).

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
| Live-action short, micro budget | 100% | 23% | 29 (29 to 47) | 67.1 (64.2 to 74) | 1.2 | 58 ± 2.2 | 58.3 ± 7.1 |
| Live-action feature, low budget | 100% | 0% | 78 (76 to 91) | 54.6 (49.8 to 59.5) | 4.5 | 57.9 ± 1.8 | 57 ± 7.9 |
| 2D drawn short, low budget | 100% | 0% | 203 (203 to 203) | 19.5 (18.6 to 20.9) | 0 | 60.9 ± 1 | 62 ± 6.6 |
| 3D CG short, low budget | 100% | 0% | 142 (142 to 142) | 17 (16.1 to 18) | 0 | 60.9 ± 1 | 62.4 ± 4.7 |
| Stop-motion short, low budget | 100% | 0% | 237 (232 to 239) | 28.6 (27.7 to 31.3) | 0 | 61 ± 1.2 | 62.8 ± 7.2 |
| Stop-motion short (2 minutes), micro budget | 100% | 0% | 105 (103 to 106) | 79.1 (77.8 to 80) | 0 | 60.9 ± 1 | 62 ± 7.3 |
| 3D CG short (2 minutes), micro budget | 100% | 0% | 97 (97 to 97) | 78.1 (77.5 to 78.7) | 0 | 61.1 ± 1.2 | 59.3 ± 8.1 |
| TV limited series, 2 episodes | 100% | 0% | 27 (27 to 29) | 8.6 (8.3 to 10.1) | 0.6 | 59 ± 1.9 | 55.4 ± 8 |

Rerun on November 6, 2026 after the Gap Completion Package's M1, which drives London's weather from WMO station normals instead of hand-written climate: the live-action and TV rows changed slightly (fewer micro shorts needed extra funding, 27% instead of 40%); the animation rows did not change.

Regenerated from `docs/balance-results.json` on November 7, 2026. The assessment columns had fallen behind the raw results after the script rules review (#34) lowered the script base. The live-action micro row also moved with this pass's staffing change (below). The low-budget rows' days, spend and funding are unchanged.

Integrity across all 240 runs: 0 negative cash balances and 0 duplicate settlements. Two runs of the same seed produced identical output.

## Held-Out Seeds And Feature Combinations

Ten seeds never used for tuning (`holdout1` to `holdout10`), on combinations of features added by the Gap Completion Package. Raw results: `docs/balance-heldout.json`.

| Combination | Delivered | Days To Delivery, Median | Overall Assessment, Mean | Integrity |
| --- | --- | --- | --- | --- |
| Motion capture + a world place (Kraków) | 100% | 62 | 60.8 | 0 negative cash, 0 duplicate settlements |
| Live action + a world place with worldwide holidays (Valparaíso) | 100% | 27 | 60.7 | 0 negative cash, 0 duplicate settlements |
| Unscripted competition + a world place (Galway) + a withdrawal before delivery (all 10 runs) | 100% | 41 | 53.3 | 0 negative cash, 0 duplicate settlements |

These are diagnostics, not targets: they show the combined systems finish and keep the money consistent on unseen seeds. They don't show the experience is enjoyable; that needs human play.

## Sensitivity (15 Seeds, One Change Each)

| Change | Result |
| --- | --- |
| Feature: 0 vs 8 rehearsal days | Mean assessment 56.4 vs 57.7. Small and positive, as intended. |
| Feature: low vs mid budget, same hiring policy | Assessment 57.8 vs 57.8. Median spend $211,220 vs $270,620 (mid shoot days cost more). Money alone buys nothing. |
| Stop motion: 1 vs 2 copies of each puppet | Mean 236.1 vs 230 days. Duplicates let shots run in parallel but cost more to build. |
| 3D: 4 vs 40 render nodes | Mean 152 vs 141 days. Render capacity is a real bottleneck. |

## Changes Made Because Of These Runs

1. **Shoot days could overspend the fund.** Rained-out days paid past the agreed amounts without a funds check, and micro-budget runs ended with negative cash. Shoot days and task wages now check uncommitted funds before paying anything beyond what was agreed. If the money isn't there, the day doesn't run and the player is told what to do.
2. **Schedules now reserve their costs.** Location, equipment, crowd and material costs are reserved when a schedule is built. A shortfall is refused with the exact amount and the options.
3. **Staffing proposals cover required roles only,** and compatible roles can be combined at small scale (DESIGN section 9). Before this, micro budgets could not finish at all.
4. **The gaffer is required when a script has interiors or night scenes,** matching the shoot rules.
5. **Location and equipment fees scale with the funding scenario** (micro 0.3×). This is a calibration assumption: micro shoots usually use borrowed gear and free locations.
6. **A stop-motion shot uses one animator and one stage.** Previously one shot could absorb every animator.
7. **Micro-budget animation could not finish (November 7, 2026).** Measured before the fix, 8 seeds each at $40,000: stop motion (1, 2 or 4 minutes) delivered in 0 of 8, 3D CG (2 minutes) in 0 of 8, 2D drawn in 6 of 8. Live action and 2D rigged delivered in 8 of 8. Four causes, four changes:
   - **Staffing spent the animator's money first.** Proposals went department by department in alphabetical order, so the composer and the puppet makers were hired and the stop-motion animator never was. Now proposals hire a required crew the money can pay, or no one, and say what the crew costs against what is uncommitted.
   - **Role combining rarely happened.** Proposals went alphabetically, so the colorist and the re-recording mixer were hired before the editor and sound designer who cover them. On a micro budget, covering roles now come first. This is why the live-action micro row moved: about $500 less spent, 2 more days, no change in assessment.
   - **The estimate ignored the script.** Every micro project was "estimated" at $40,000. Once a script is approved, the estimate is now what it needs at its budget size, with a tenth for contingency, and never below the size's amount. The financing target follows it unless the player set their own. A 2-minute micro stop-motion short is estimated at about $80,000. The agreed starting backing covers up to the low-budget size, so it now pays what the film needs.
   - **A studio fee could stop time.** A voice session the production could no longer pay the studio for threw an error, which rolled the whole day back and paused the game. It now waits with the reason, as render time and wages already did.

   Day rates and material costs were not lowered: about 40 animator days for 2 minutes of limited stop motion is in line with real throughput. After the changes, with the starting backing paying the target, every micro case above delivered in 8 of 8. The two micro animation families above deliver in 30 of 30, and the harness now fails if any micro family doesn't.

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
- A micro-budget animated short's estimate can be about twice the size's $40,000 (the script decides). Is a "Micro Budget" label still the right word for that, or should the sizes describe crew scale rather than money?
