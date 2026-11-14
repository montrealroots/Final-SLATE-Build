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
- **Rehearsal only helped the player.** Any rehearsal added the same six points on the day, and only the player's own
  performance improved with more days. Fixed: two points a day on set, up to ten, and every hired performer three points
  worse with none and up to five better with eight days (`shoot.ts`, `finish.ts`; the default three days unchanged).
- **A part's size changes nothing but awards placement.** A lead and a supporting part ask the same and cost the same.
  Open: fixing it moves every offer's price, so it waits for its own change.
- **Costs don't depend on where you shoot.** Basing a production in Los Angeles rather than London changed its weather,
  not its prices. Open.
- **Cash and credit cards have no use.** 1221's everyday spending (food, the day's purchases) is what cash and cards pay
  for, and SLATE left it out, so a card is never used and cash withdrawn is never spent. Open: the matrix shows both as
  "no downstream effect".
- **Every bank kept dollars,** so a life in Paris banked at BNP Paribas in dollars. Fixed: a new life's bank keeps
  the money of the country it starts in, and SLATE's dollars meet it at the day's rate (`bank.ts`,
  `tests/v10-bank-currency.test.ts`). A family repayment read cents it couldn't post (SLATE posts whole dollars), so it
  takes whole dollars.
- **Visas were never refused, needed no sponsor, and a life could never move** (the owner's "Not done" list). Fixed:
  a visitor visa is refused at the published rate for the passport applying (the State Department's B-visa table for the
  United States, the Commission's figures for Schengen, both quoted by named secondary sources as the table itself refused
  download; elsewhere the game's estimate, said as one); a work visa's chance is anchored to the O-1's published 90%
  approval and moved by the record. A work visa needs a sponsor: an agent where one may petition (the O-1), an outside job
  there, or a project of yours made there (`src/data/papers/sponsors.json`, eight countries researched). A life can move
  to another country with the right to live there; travel now asks your papers. Tests: `tests/v10-living-abroad.test.ts`.
- **Moving abroad could lose all your money.** 1221's bank closed a home account held from abroad and sent its balance to
  an account where you live; with none, the account closed with the money in it. Fixed: moving opens an account where
  you now live, and a bank never closes an account holding money with nowhere to send it.
- **A plan over a shoot call changed nothing** but a line on the call sheet. Fixed: you're at your plan, and the day
  starts without you (`production/shoot.ts`).
- **The budget estimate didn't follow the shot plan.** Full coverage raised what the old plan cost, the crew couldn't be
  hired and the production lost every day for months. Fixed: the estimate, and the target that follows it, are worked
  out again when the shot plan changes (`estimate.ts followPlan`, `tests/v10-estimate-follows.test.ts`).
- **The target runtime did nothing once scenes were written.** Fixed: scenes a quarter off it are a readiness note, which
  costs the script (`projects.ts RUNTIME_SLACK`, game calibration).
- **By design, not fixed:** notes you write yourself change no assessment (`finish.ts`: quality can't be manufactured by
  writing notes); they're for your own process.
- **The harness's own faults**, found and fixed before any result was kept: the backer kind was misnamed; a run-once flag
  was shared across seeds; the test helper's fixture money was taken out of played careers.

## Honest Limits

- **Seeds diverge.** Paired seeds share a world, but anything a decision adds (a card, an entry) can shift the draws that
  follow, so a broad measure such as money can move for reasons that aren't the decision's. Each probe's later measures
  are ones the feature feeds; where one moved without a cause in the code (a credit card and money), the measure was
  taken out and the result says so.

- A feature is proven only where a played career reaches it. The census shows which event kinds the careers reach; the
  ones they don't (agents, series releases, first-look terms, travel, papers decisions) need careers that do, and stay
  "not yet proven" until then.
- Identity fields (a character's name) are carried into credits, logs and records, not into outcomes. They will be proven
  carried, not biting, and the matrix will say which.
