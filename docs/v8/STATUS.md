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
| 6 Company versus banner | Partly | A banner is a credit name: "A … Production", which opens no account and moves nothing. A company is applied for where you live. The fee is paid, the application is pending, and the registry decides five business days on: it refuses a name a studio already has (the fee stays paid, and you can apply again), or registers it. Capital moves only after registration. A draw returns your capital first, then pays out earnings, and says which is which. | The fee is the game's figure: no country's registry is researched. There are no employees, no closure process and no business bank accounts per country: business products exist only where the data has them (US). Draws made before November 14, 2026 read as capital returned. |
| 7 Deal types | Partly | A first-look offer is set by your track record: emerging, proven, established or elite, read from delivered work, its reception and its wins, never from money. Each tier has its yearly overhead range from the package's calibration (`src/data/deal-model.json`), placed by the studio's scale and paid a twelfth a month (never multiplied twice), and its term: 12, 24, 36 or 60 months. The terms say the yearly figure, the tier, and that it pays for an office and development, not you. Deals signed before keep their terms. Film and television scope, expiry and renewal are as built in v5 and v6. | Overall deals (A14) aren't built. Competing offers don't change terms yet, and there is still one request for more. Matching or resubmission rights aren't modelled. |
| 8 Paperwork and story setting | Partly | Work rights: `src/data/work-rights.json` (232 countries, imported from the old line and labelled unverified). `papers.ts` reads citizenship, where you live (a simulation choice: you may work where you live), a passport's treaty or shared-market right, and the permit route for everyone else. A permit is applied for and decided after its recorded time (30 days where none is recorded). It lasts a year and lets you do nothing before it is granted or after it expires. On a day filmed where you may not work, the call starts without you, even if you are there. Feasibility checks Papers. A Your Papers card is on Profile. The story's setting and the filming place are separate fields, and changing one leaves the other. | Visits and passports data (the 800 KB visit table) aren't imported. Travel isn't refused for a missing visa. Fees aren't charged, because there are no exchange rates. Permits aren't refused, since the game models no grounds. Minors' work rules abroad are as before. |
| 9 Awards single timeline | Partly | One history per save (`awards-history.ts`). Each category shows one outcome: the record's, where it has this category published by today, standing unless your own work changed it (your nominated work takes the last recorded nominee's place, your win the recorded win); elsewhere the save's own decided result. The separate Recorded Results card now says where the record comes from, and lists any recorded result whose category the game names differently, so nothing is lost. The merge is read, never written: a reload shows the same, and nothing recorded enters the save. | The judging still draws its field from the game's own followed work, not from the recorded nominees: a recorded category is replaced only where you entered. The package's full lifecycle (campaigns, screeners, shortlists, attendance, effects by institution) stays as built in v3–v6. There is no reconciliation preview for old saves, because none has a conflicting stored result: results were never stored over the record. |
| 10 Phone overhaul | Partly | A phone now opens in its own responsive layout by default (`layout-mode.ts`): the device's width, a drawer for the sections, one column and larger controls. The desktop layout shrunk to fit, the default from November 13 to 14, 2026, is now only a choice in Settings. The v8 screens (inheritance, banks, budget plan, company and banner, papers, results) are run on phone and iPhone WebKit by the banking, money and creation journeys, and by the viewport sweep. | No screen-by-screen phone audit of every changed screen beyond the journeys and the sweep. No physical-phone test. |
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
| A13 | Partly | `tests/v8-inheritance.test.ts` (the same standing and reputation with $25,000,000 and with nothing); `tests/first-look.test.ts` A13 (a rich novice gets no offer and stays emerging; two well-received works make the next offer proven, 24 months). Competing offers don't change terms yet. |
| A21 | Partly | Money: `tests/v8-money.test.ts` (a version 9 save keeps every posting to the cent, and a migration that can't reconcile opens nothing and leaves the stored copy and its pre-upgrade backup). A family loan still runs: `tests/v8-inheritance.test.ts`. Deals and awards are later steps. |
| A10 | Implemented and tested | `tests/v8-banking.test.ts`: "Account fee not recorded" for a record without one; personal products only where you live; business products only with a company. |
| A03 | Implemented and tested | `tests/v8-company.test.ts`: a banner credits your work and adds no account, transaction or company. |
| A11 | Partly | `tests/v8-company.test.ts`: a draw is capital returned first, then earnings paid out, never more than the company holds. Restricted funds and liabilities aren't modelled on the company yet. |
| A12 | Implemented and tested (v6) | `tests/first-look.test.ts` and `e2e/v6-first-look-tv.spec.ts`: a film deal leaves television free and the reverse. Matching rights aren't modelled, so none is enforced. |
| A15 | Partly (v5) | `tests/first-look.test.ts`: the term ending stops overhead and keeps development money owed. A renewal keeps its terms. |
| A16 | Implemented and tested | `tests/v8-papers.test.ts`: citizenship, residence, treaty right and permit route read; a pending permit lets you do nothing, a granted one a year; a day filmed where you may not work starts without you even when you are there. |
| A17 | Implemented and tested | `tests/v8-papers.test.ts`: the story's setting and where a place is filmed change independently. |
| A18 | Partly | `tests/v8-awards-history.test.ts`: no recorded result before its date; the record as the save's own after it; a win the save decided replaces the recorded win; the same after a reload, nothing stored. `e2e/v6-history.spec.ts` and `e2e/awards.spec.ts` (Venice) through the screens. Stage-by-stage replacement within the recorded field isn't simulated. |
| A20 | Partly | `e2e/phone-layout.spec.ts` (no scaled canvas by default, on phone, iPhone and landscape); `e2e/v8-banking.spec.ts` and `e2e/money.spec.ts` on phone with $25,000,000 values; `e2e/viewports.spec.ts`. Keyboard and save recovery on phone are covered by older journeys, not rerun for v8. |
| A14, A19, A22 | Not started | |

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
