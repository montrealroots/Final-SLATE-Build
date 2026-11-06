# Architecture

## Layers

- `src/engine`: the simulation. It is plain TypeScript with no DOM, and every module mutates one `GameState` (`types.ts`).
  - `state.ts`: new game, IDs, the log, the event queue and `processUntil`, the single time rule shared by ticking, Advance and Sleep. Also birthdays, plans, sleep and travel.
  - `time.ts`: instants (UTC milliseconds), zone conversion through `Intl`, gap and overlap handling, calendar arithmetic and age.
  - `weather.ts`: sunrise equation, modeled weather and forecasts. `holidays.ts`: holiday rules.
  - `projects.ts`: project axes, characters, scenes, drafts, readiness, revision passes and breakdown.
  - `genres.ts`: the 149 records mapped to mechanic modules and convention questions.
  - `people.ts`: roles, role combining, the deterministic candidate pool and availability. `hiring.ts`: offers and responses, casting, staffing proposals.
  - `budget.ts`: the reserve, commit, settle and cancel ledger. Settlements are keyed so the same cost can't be paid twice.
  - `production.ts`: task graphs per medium, shoot days, daily work, weather and daylight, stop-motion stage and puppet limits, render capacity, design-change impact.
  - `finish.ts`: editing, picture lock, delivery, credits, the quality model, release and distribution. `documentary.ts`: consent.
  - `awards.ts`: institutions, editions, eligibility, submission, judging and honors.
  - `save.ts`: verified writes, migrations and the one-tab lock. `clock.ts`: measured 1:1 time.
- `src/ui`: the React interface. `store.ts` owns the open game, the clock driver, autosave, the tab lock and navigation. Views only call engine functions through `store.act`, which reports errors beside the control that caused them.

## Time

`processUntil(state, target, mode)` runs due events in (time, priority, id) order, exactly once (processed IDs are remembered). Advance and Sleep stop at events whose attention is `interrupt`; normal ticking never stops. Production runs on chained `work-day` events and on shoot-day call, wrap and weather-check events, so a month-long Advance and a month of 1:1 play produce the same results.

## Determinism

Every random choice comes from `stream(seed, domain, ...keys)`, so the same save and inputs give the same results. Presentation variety never uses the simulation streams. Festival and award results are written into the edition once and never recomputed.

## Extending

- Add fields with a save migration (`MIGRATIONS` in `save.ts`).
- Add genres by extending `SPEC` in `genres.ts`; the tests require every entry to reach a consumer.
- Add institutions to `INSTITUTIONS` with their own categories, rules and provenance.
