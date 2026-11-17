# Homes And Property: What Is Covered, And How Well

Written November 17, 2026, at the end of the owner's Homes & Property package (SLATE-Homes-Property-Research-v2,
prepared November 16). The requirement-by-requirement checklist is `docs/homes/features.csv` (153 rows). This page says
what the game knows, where it knows it from, what it makes up and says so, and what isn't there.

## The checklist in one table

| Status | Rows |
|---|---|
| Implemented and tested | 97 |
| Implemented, modeled (the game's own figure, said as such) | 6 |
| Implemented, not tested by a dedicated test | 11 |
| Partial | 17 |
| Not implemented | 20 |
| Excluded by the owner (household members, which need family selection) | 2 |

## What was imported, and how

`node tools/homes/import.mjs <package>` validates the package's tables and writes lazy packs to `src/data/homes`
(25 MB, loaded by `fetch` when a place, a town or an appliance category is opened; nothing is in the start-up script or
in a save). Its counts are in `docs/homes/IMPORT-REPORT.json`; it reported no problems.

| Data | Rows | Kept as | Read by |
|---|---|---|---|
| HUD Fair Market Rents FY2026 (US) | 4,764 areas in each version; 51,895 ZIP rows; 56 states and territories | `hud/<state>.json`: revised and original rents by bedrooms, ZIP small-area rents | `market.ts marketEvidence`: rents in US places |
| HDB resale transactions (Singapore) | 244,773 in 26 towns | `sg/<town>.json`: month, flat type, block and street, storey band, area, model, lease, price | Singapore flats and nearby sales, only sales up to the game's month |
| DVF 2025 sales (France) | 242,378 single-home sales | `fr/<department>.json`: median price a square metre by commune for flats and houses, counts, centre point. **No address and no single sale** (19,797 communes in 97 departments) | Sale prices in French places |
| ENERGY STAR (EPA) | refrigerators 4,942; washers 421; dryers 706; dishwashers 753; room air conditioners 608 | `appliances/<category>.json`: brand, model, markets, date on market, sizes, certified test energy and water | Appliance catalog, fit checks, bills |
| Benchmarks | ONS private rents (UK, Sept 2026, provisional); NAHB 2024 new-home costs; EIA 2025 state electricity prices; the package's worked examples | `benchmarks.json` | UK rents, US sale prices and land, build cost plans, US electricity |
| Scoped rules | 19 | `rules.json` with each rule's scope and source | Deposits, permissions, ownership routes |
| Sources | 46 | `sources.json` | Evidence wording; Settings, Credits And Data Sources |
| Coverage | 252 jurisdictions, 171,750 archived places, **0 verified listings** | `coverage.json` | This report |

Distinctions kept: a recorded sale is never shown as for sale now; a benchmark is never shown as a quote; a ZIP isn't an
address; the HDB's "4 ROOM" is the source's label, not a bedroom count; an EPA record has sizes and test energy but no
price, stock or clearance; a rule applies only in its own scope (England's deposit cap is not applied in Scotland).

## Where prices come from, by place

| Place | Rents | Prices to buy | Land and building | Electricity |
|---|---|---|---|---|
| United States | HUD Fair Market Rent for the area, by bedrooms (a 40th-percentile gross rent, not an asking rent) | NAHB's national new-home average a square foot: **national, not local**, said with each home | NAHB lot cost spread over 900 m² (an assumption, said); NAHB cost shares for the build | EIA's 2025 state average |
| United Kingdom | ONS average private rent for the nation (England 1,466 GBP), spread by size by the game | The game's placeholder | Placeholder | Placeholder |
| France | The game's placeholder | DVF 2025 median for the commune (Paris flats: 13,109 EUR a square metre) | Placeholder | Placeholder |
| Singapore | Placeholder | HDB resales in the town in the year to the game's month | Placeholder | Placeholder |
| Everywhere else | **The game's placeholder**, said on the page: no housing records cover the place | Placeholder | Placeholder | Placeholder |

Each home lists its evidence with a chip: Benchmark, Recorded Sales or Game Estimate. The homes themselves are the
game's: twelve a place a month (six to rent, five to buy, one plot), none at a real address, and the page says so.

## What is simulated, and said to be

- The landlord's decision (money for the move-in and three months' rent, and the right to live in the country), the
  seller's answer (97% accepted, from 90% a counter halfway), the lender's (up to 80% at 6.5%), the building authority's
  (no rule researched outside Cape Town's pool), a buyer's offer and a tenant's application.
- Wear and damage in a rented home: a year lived in wears the floors and walls (never charged); a 2% chance a month of an
  accident that is the tenant's to put right. A dispute halves charges for damage.
- Prices of work, repairs, furniture, appliances, insurance, stays and an empty home's standing charges: the game's
  estimates in dollars, converted at the day's rate.
- Construction: eight stages by NAHB's shares, a wet day (8 mm) delaying an outside stage, a 15% chance an inspected
  stage fails and is reworked, snags put right in a 180-day defects period.

## The exterior picture

There is **no AI image provider in this environment**, and none was invented. The provider interface
(`illustration.ts IllustrationProvider`) has one provider: the game's own drawing of the design record, labelled on
every picture "Illustration drawn by the game from the design record. Not a photograph, not an AI image, and not a
depiction of any real address." The same design record drives gameplay (cost plans, permissions, garden space) and the
picture. Every visible feature (floors, roof and its material and colour, walls, every window, door, balconies, garage,
driveway, garden, pool, porch, terrace, fence) is drawn and checked against the record; a picture that doesn't match is
drawn once more and, failing again, not shown. Accepted pictures are kept per revision and design hash in the save and
reused; a finished outside change makes a new revision and a new picture. No reference photos or plans are used, so
nothing is presented as a real home. Housing works without any picture.

## Tests and proofs

- `tests/homes.test.ts` (18) and `tests/homes-choices.test.ts` (12): each cycle in the engine, each rule's scope, the
  money in the bank's books, the picture, reloads and old saves; each choice the screens offer compared.
- `e2e/homes.spec.ts` (6 journeys, desktop and phone): renting in London to the deposit back; buying in Los Angeles with
  a mortgage, a new exterior and a sale; land in Austin to moving in; letting in Los Angeles to the deposit settled; not
  enough money; a lapsed approval, a refused permission, a stale favourite, a withdrawn purchase and an old save.
- `tests/proof/probes/homes.ts` (41 probes): each housing action and decision played over a career's seeds with and
  without it, proven when the housing result and the career's money both move (docs/v10/FEATURES.md).

## Not done

The `not implemented` and `partial` rows of `docs/homes/features.csv` say each gap. The largest: no verified listings
anywhere (the package has none); no market movement over time; UK, French and Singapore rents and most places' prices
are placeholders; ONS, HUD, NAHB and EIA figures are used whatever the game's date, even before they were published; no
lease renewal, rent review or service contracts; one builder and no construction loan; no AI image generation.
