# Box Office History: The Contract Without A Dataset (November 20, 2026)

The research recovery package (`docs/recovery/package/docs/05-BOX-OFFICE.md`) found three possible sources of dated box-office history:

| Source | What it offers | What it still needs |
|---|---|---|
| The Numbers / OpusData | A licensed API or data service | A licence |
| Comscore | Global theatrical reporting | Commercial access |
| BFI | Public spreadsheets of UK weekend figures | Its reuse terms confirmed. It is also one territory's weekends, which can't stand in for worldwide daily history. |

No licence has been agreed, and no price has been invented. No protected data is in the repository, and nothing was scraped.

## What Was Built

`src/engine/box-office-feed.ts` is the contract a licensed dataset would come in through:

- **Publication dates.** A query on a date sees only the reports published by then.
- **Corrections.** A correction is a later revision of the same report, published on its own date. The earlier revision stays readable before that date.
- **Duplicates.** Importing the same revision twice adds nothing.
- **Refusals.** The contract refuses a revision whose figures differ from the copy already held, a correction to a revision it doesn't hold, and a currency the territory doesn't report in. Nothing is converted.
- **No mixed sums.** Daily, weekend, weekly and cumulative figures are never added together. A total is the latest cumulative figure or a sum of one period type, and it says which.
- **Releases.** Every report keeps the dataset release it came in, so a save can name the edition it read.

`FEED` says no licensed dataset is installed. Only the tests read the contract, using `tests/fixtures/box-office-synthetic.json`, a fixture labelled SYNTHETIC on its first line. Those tests (`tests/box-office-feed.test.ts`) check the software. They say nothing about real coverage.

## Real Figures From Wikidata (November 22, 2026)

The owner chose Wikidata (CC0) while a licence is sought: real films' recorded totals, dated by when they were recorded,
on film pages, in Box Office Records and in studio offers (`docs/BOX-OFFICE-RECORDED.md`). They are totals, not dated
weekend reports, so they don't come in through this contract, and J01 and J21 stay parked.

To buy a licence: The Numbers' terms send licence enquiries to OpusData (sales@opusdata.com); pricing is on request.
Comscore's Box Office Essentials is sold by subscription through its sales team.

## What Stays As It Was

The box office the game shows (`src/engine/box-office.ts`) is still the game's own simulation, labelled so wherever it appears. A player's success changes the save's simulated market and never an observation from a provider. Journeys J01 and J21 stay parked: they need a licensed dataset, with publication dates and a recorded correction, and none is held.

## To Switch On A Real Dataset

1. Agree a licence that covers use in the game, offline caching, downloads to players' devices, display, attribution and update cadence.
2. Load the provider's reports through `ingest`, keeping their release and licence references.
3. Set `FEED` from the dataset's manifest.
4. Read `asOf` and `totalAsOf` where the game shows history.

The engine's logic doesn't change.
