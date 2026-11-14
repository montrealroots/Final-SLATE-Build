# Banking And Papers By Country (Step 7 Of The Owner's Command Of November 14, 2026)

There is one row for each of the 252 entries in the game's own gazetteer (`src/world/gazetteer/index.json`). No alias is
counted as a country. Each row holds seven capabilities, each in one of the owner's six classes. The full matrix, with
the reason for each cell, is `docs/v9/coverage.json`. `tests/v9-coverage.test.ts` writes it and holds both files to the
code.

## The Counts

| Capability | Class | Countries |
|---|---|---|
| bank | implemented/tested | 26 |
| bank | inherited-unverified | 213 |
| bank | missing | 7 |
| bank | not applicable | 6 |
| exchange rate | inherited-unverified | 230 |
| exchange rate | not applicable | 22 |
| passport application | implemented/tested | 1 |
| passport application | inherited-unverified | 115 |
| passport application | missing | 130 |
| passport application | not applicable | 6 |
| visiting rules | inherited-unverified | 246 |
| visiting rules | not applicable | 6 |
| visitor visa application | implemented/tested | 1 |
| visitor visa application | inherited-unverified | 4 |
| visitor visa application | missing | 241 |
| visitor visa application | not applicable | 6 |
| work rules | inherited-unverified | 232 |
| work rules | missing | 14 |
| work rules | not applicable | 6 |
| work permit application | missing | 246 |
| work permit application | not applicable | 6 |

## What This Says

- **Nothing is "verified".** No fact was checked again against its source in this work. Everything brought over is
  1221's or SLATE-REBUILD's research, as it was.
- **"Implemented/tested"** means a test here runs that capability for that country. The banks of 26 countries are named
  by the ported 1221 tests or the new journeys. One visitor visa route is tested end to end: a Brazilian visiting the
  United States. One passport from SLATE-REBUILD's records is tested end to end: a Swede's, applied for in Stockholm.
- **What is missing, precisely.**
  - Passport applications: 1221's 15 passport offices, plus SLATE-REBUILD's records, which are taken wherever a route's
    fee and its time are both recorded. That covers 101 more citizenships, applied for at home, and from abroad where
    recorded. For the other 130, no route has both its fee and its time recorded, and the screen says which is missing.
  - Visitor visas: a fee and a decision time are recorded for nine passport and destination pairs only (1221's
    `content/visas.ts`).
  - Work permits: no route's fee or decision time is recorded anywhere, so none can be applied for in the game. The
    short engagement's days do work where recorded: in 42 countries for every passport without a right there, and in 2
    more for some passports.
  - Seven countries have no bank on record. Fourteen countries' work rules were blocked in SLATE-REBUILD's research.
- **Modeled.**
  - No cell is classed as modeled. The game's one modelled rule here applies to every country, so it isn't a cell: where
    your story is lived is taken as where you may live and work, said as an assumption wherever it is shown.
  - Past 2026-10-30, the last exchange rate is held and marked stale (`docs/v9/FX.md`).
