# Production Estimates: What Is Sourced And What Is Modeled (SLATE-03-03, 08-01, 08-05, 11-05)

Research record for the estimates change of November 8, 2026 (`src/engine/estimate.ts`, `src/engine/cost-cuts.ts`,
`src/engine/production/schedule.ts`).

## Sourced

Nothing new. **No primary source was consulted for the estimating process in this change.** The order the game follows
(script breakdown, then a schedule of shoot days, then a budget priced from the days, people and builds) is the
game's model of how a production is costed. It is written here as a model, not as a cited practice.

## Modeled

- **One rule for estimate and schedule.** `groupShootDays` groups the approved scenes by unit, place, interior or
  exterior, and day or night, then fills each day to its time using each scene's shot plan. The estimate counts these
  days; `planShootDays` dates the same groups. So the estimate and the schedule can't disagree about how many days the
  script needs (`tests/estimates.test.ts`).
- **Money by certainty.** Spent, agreed and held come from the ledger's postings. Only work with no posting is priced
  as still to come, so nothing is counted twice. Contingency is 10% (`CONTINGENCY`).
- **Unknowns are never free.** A role or part nobody can take is priced at the lowest available rate and shown as
  uncertain, with how to resolve it.
- **Scope changes are previewed by doing them on a copy.** `approvalScope` approves the draft on a copy of the game and
  compares the two breakdowns. The preview is therefore what approval does. Agreements that stay are named.
- **Estimate against spending.** The estimate by area is stored at approval. Spending is compared with it, and the
  differences are named (lost days, extra work, missed capture sessions, counteroffers). The two are not expected to match.

## Figures

Every rate and duration is game calibration, listed in `docs/depth/PRODUCTION-SOURCES.md`. No figure is a quoted
industry rate, and none applies to a real country, union or year. Personal taxes and banking stay out of the game.

## Limitations

- Booking terms beyond those already modeled (motion-capture cancellation) are not priced.
- Concurrency between departments is modeled only through the schedule and the work queue, not as a separate constraint
  on the estimate.
