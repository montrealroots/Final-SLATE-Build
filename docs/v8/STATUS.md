# The v8 Overhaul: Where Each Step Stands

The owner's v8 package is `docs/v8/package` (copied whole on November 14, 2026; 46 files, hashes matching its
manifest). Its order of work is `07-IMPLEMENTATION-AND-ACCEPTANCE.md`. This file says where each step and acceptance case
stands. Each status below is one of:

- **Implemented and tested**: built, and a test the CI runs changes an input and reads the outcome.
- **Partly**: the named part is built and tested. The row says what isn't.
- **Not started**.

Nothing here is a human play-through. The package asks for pacing checks and a physical-phone test. Neither has been done.

## Steps

| Step | Status | What is built | What isn't |
|---|---|---|---|
| 1 Baseline | Implemented and tested | `main` at `84775c7` equals the package's snapshot (no diff). The package's Python reference tests pass 12 of 12, run from a copy of its own layout. | |
| 2 Canonical money | Partly | `src/engine/cash/money.ts`: currencies with ISO exponents 0, 2 and 3; `parseAmount`; exact rational FX; `monthlyDue`. `src/engine/cash/journal.ts`: balanced lines per currency, idempotency keys, validation before any write, holds, pending, settled and failed states, linked reversals, and exchange with its quote, fee and rounding kept. Your account and the company's are now views of the journal (save version 10; `cash/migrate.ts` reconciles to the cent or refuses). | Projects keep their own obligation ledgers (`budget.ts`) in whole dollars. They meet the journal through the outside `projects` account and aren't migrated into it. The game's money is US dollars only, so there is no FX screen yet. |
| 3 Inheritance at 19 | Implemented and tested | You start at exactly 19. Identity refuses a birth date that 19 can't reach in 2026–2050. Starting Point refuses a date that changes the age, and says which dates keep it 19. One `opening:inheritance` transaction comes from the estate, with its source kept: $25,000,000 by default, editable on Starting Point, checked as typed, capped at $1,000,000,000. The family menus are gone, and a saved draft loses its family choices. Old saves keep their family contracts, which still run. | |
| 4 Banks and documents | Partly | Banks: `tools/v8/import_banks.py` imports 251 products in 230 markets into `src/data/banks.json` (246 legacy-unreverified, 3 reported with sources, 2 primary-observed business products), and 155 ISO currencies into `src/data/currencies.json`. A missing fee is unknown, never zero. `src/engine/banking.ts` covers the lifecycle: apply (pending), the bank's decision three business days on (refused if you moved away), monthly or periodic fees anchored on the opening day with waivers read from the account's own lines, transfers held at once and settled the next business day, statements, and closing only when nothing is stranded. `src/ui/Banking.tsx` shows it on Profile. | Documents: passports, visits and work permits are step 8. Not simulated, and said where it shows: bank holidays, interest, overdrafts, card and cash-machine fees, and an application's documents. There is no exchange between currencies: the game has no researched rates, so a transfer between currencies is refused with that reason. |
| 5 Custom budgets and liquidity | Partly | A project's planned budget is an amount you type: blank means unknown, and 0 is an unfunded draft. It is kept exactly in cents, with every revision and its reason (`project-budget.ts`). At $1,000 or more it sets the financing target, and it never moves money. The Budget page's Plan And Money card reads the ten figures apart. The package's dated forecast is ported (`cash/forecast.ts`) and fed from the project's own money: funded overall and payable on time are two answers. Feasibility adds Paying On Time, so money due on delivery can't pay for work before it. | The way of working (the old size) still sets day costs and the estimate's floor: it is relabelled, not removed. There are no budget lines with quantities, suppliers, quotes and payment dates, so remaining spending is dated today (the safe assumption). Series per-episode allocations and project currencies other than dollars aren't built. |
| 6 Company versus banner | Not started | A company could already be formed (v5). Formation is still instant. | Banner, jurisdiction, pending and rejected states. |
| 7 Deal types | Not started | | |
| 8 Paperwork and story setting | Not started | | |
| 9 Awards single timeline | Not started | | |
| 10 Phone overhaul | Not started | | |
| 11 Journeys, economy runs, matrix | Not started | | |

## Acceptance Cases

| Case | Status | Evidence |
|---|---|---|
| A01 | Implemented and tested | `tests/v8-inheritance.test.ts` (one posting; a reload, a year of advancing and forming a company each post none); `e2e/money.spec.ts` (Review, Profile). |
| A02 | Implemented and tested | `tests/v8-money.test.ts` "moves conserve what is yours": a move between you and your company is one transaction, nothing reaches an income account, and the formation fee is the only loss. |
| A05 | Implemented and tested | `tests/v8-money.test.ts` A05 cases; `e2e/money.spec.ts` (refused as typed on Starting Point). |
| A04 | Implemented and tested | `tests/v8-budget.test.ts`: 20,000 and 2,000,000 kept to the cent through a reload, each revision recorded, nothing moved in the project, your account or the journal. |
| A06 | Implemented and tested | `tests/v8-forecast.test.ts` (the package's example: funded overall and $10,000 short tomorrow; a settled owner transfer fixes it, a bigger plan doesn't); `tests/feasibility.test.ts` (a project promised in full on delivery is held at Paying On Time until money is in). |
| A07 | Implemented and tested | Journal holds (`tests/v8-money.test.ts`); the forecast skips a held outflow, because its hold is already off the opening figure (`tests/v8-forecast.test.ts`). |
| A08 | Partly | Journal exchange: `tests/v8-money.test.ts`. No screen, and no second currency in play. |
| A09 | Implemented and tested | `tests/v8-banking.test.ts`: a fee anchored on January 31 falls on February 29, 2028 and March 31, each once, through a duplicated event and a reload; `e2e/v8-banking.spec.ts` (desktop, phone, iPhone 15 Pro Max). |
| A13 | Partly | `tests/v8-inheritance.test.ts`: the same world with $25,000,000 and with nothing has the same standing and reputation. Deal eligibility is step 7. |
| A21 | Partly | Money: `tests/v8-money.test.ts` (a version 9 save keeps every posting to the cent, and a migration that can't reconcile opens nothing and leaves the stored copy and its pre-upgrade backup). A family loan still runs: `tests/v8-inheritance.test.ts`. Deals and awards are later steps. |
| A10 | Implemented and tested | `tests/v8-banking.test.ts`: "Account fee not recorded" for a record without one; personal products only where you live; business products only with a company. |
| A03, A11, A12, A14–A20, A22 | Not started | |

## What Changed With The Age Rule

Until November 14, 2026 you had to be at least 19. Fixtures were older, and every world's seed hashes the birth date, so
every fixture world changed. Tests that leaned on one draw were fixed one by one, and each fix says why:

- **Picking people who are free for the dates.** `tests/relationships.test.ts` and the coordinator in
  `tests/estimates.test.ts`.
- **Re-choosing worlds where the claim holds, with the old tag named.**
  - `fin-cop-4` in `tests/finance.test.ts`.
  - `terr-report-2` in `tests/territories.test.ts`.
  - `vs-actual-7` in `tests/estimates.test.ts`.
  - `destinations-roof-6` in `tests/destinations.test.ts`.
  - `real-hire-2` in `tests/real-hiring.test.ts`.
  - The motion-capture seeds in `tests/mocap-progress.test.ts`.
- **Five worlds instead of one.** `tests/grades.test.ts`.
- **Counting subtitles.** `tests/script-effects.test.ts`.
- **Regenerated files.** The production golden file and the offer-concentration audit, both regenerated for this change.

The browser journeys' birth dates were moved so each player is 19 on its start date. The quick character is born on
May 20.
