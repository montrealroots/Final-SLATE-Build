# Every Feature, Proven By Played Careers (The Owner's Command Of November 14, 2026)

The owner asked for "a full coverage matrix of my entire game from beginning to end covering all features making sure
each reads, bites, has downstream effects, and powerful engines/systems behind them", with Monte Carlo proof, and for
anything that fails to be fixed.

## The Pieces

| Piece | What it is |
|---|---|
| `tests/proof/register.ts` | Every feature, read from the code: each engine function a screen calls inside a change (the TypeScript compiler follows each call), each bank command, each kind of event the engine runs as time passes, and each labelled control in `docs/input-audit/CONTROLS.csv`. |
| `tests/proof/career.ts` | A played career, seeded: a short a year, raised from the player's own money and backers, cast, staffed, shot, cut, delivered, sold or released, outside work taken, money taken home. No fixture money and nothing marked done by hand. A policy holds each choice, so a probe changes one and keeps the rest. |
| `tests/proof/probe.ts` | The proof: the same seeds played twice, one decision changed (or one system switched off). A feature **bites** when its direct measure moves with a 95% interval clear of zero, and has a **downstream** effect when a later measure in another system does too. Each result is written to `docs/v10/proof/<id>.json` with the hash of every file it reads. |
| `tests/proof/probes/*.ts` | The probes, by area: the career's loop, production, release, awards, the bank, and the scheduled systems. |
| `tests/v10-features.test.ts` | The matrix. It joins the register to the results; a result older than the code it reads is stale. It writes `FEATURES.md` and lets the unproven count fall and never rise (`ratchet.json`). |
| `docs/v10/census.json` | Which kinds of event played careers run, and how often. |

Run the proofs with `npm run proof` (`PROBES=id,id` for some, `SEEDS=n` to change the default of 40). They aren't in
`npm run check`: a full run takes hours. The matrix test is.

## What The Proofs Found And What Was Fixed

- **No SLATE player could ever borrow.** The bank counts wages from transactions marked `salary`, and SLATE posts its
  pay as `slate:paid-work`. So no bank would lend, and every income test failed. Fixed: `isWages` in
  `bankworld/core/ledger.ts` counts outside work's pay and a first-look deal's overhead (`tests/v10-wages.test.ts`).
- **Festival and awards honours reached nothing.** A selection, a nomination or a win changed no offer, rate or grade.
  Fixed: each honour of the player's own work is an event in the standing of the role its category honours, worth a work
  scored 70 (selected or mentioned), 80 (nominated) or 95 (won), game calibration (`reputation.ts` `HONOUR_SCORE`); it is
  never a completed work, so no grade's count is met by prizes alone (`tests/v10-honours.test.ts`).
- **Night shoots cost what days did,** though the Time Of Day control was said to set the day's fees. Fixed: everyone on
  set is paid a quarter more on a night day, priced in the estimate and said on the call sheet (`rates.ts`
  `NIGHT_PREMIUM`, game calibration).
- **Costs don't depend on where you shoot.** Basing a production in Los Angeles rather than London changed its weather,
  not its prices. Open.
- **Cash has no use.** Cash taken out of a machine is spent only on food in 1221's spending, which SLATE left out. Not
  fixed yet: the matrix shows it as "no downstream effect".
- **The harness's own faults**, found and fixed before any result was kept: the backer kind was misnamed; a run-once flag
  was shared across seeds; the test helper's fixture money was taken out of played careers.

## Honest Limits

- A feature is proven only where a played career reaches it. The census shows which event kinds the careers reach; the
  ones they don't (agents, series releases, first-look terms, travel, papers decisions) need careers that do, and stay
  "not yet proven" until then.
- Identity fields (a character's name) are carried into credits, logs and records, not into outcomes. They will be proven
  carried, not biting, and the matrix will say which.
