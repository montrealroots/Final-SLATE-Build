# Dated box-office journeys

## Sources found

| Provider | Useful coverage | What still must be obtained |
|---|---|---|
| The Numbers / OpusData | Licensed API/data services for box-office reporting | Subscription/licence, dataset fields and allowed in-game redistribution |
| Comscore | Global theatrical reporting product | Commercial access, historical coverage and permitted storage/display |
| BFI | Public UK weekend spreadsheet reports | Suitable download, explicit reuse terms, original publication timing and limitations |

See source IDs `numbers`, `comscore` and `bfi`. No purchase or licence agreement was made. No protected dataset is included. Public access does not establish a right to redistribute a whole catalog in a public GitHub repository. BFI's regional weekly reports cannot close a worldwide daily-history requirement.

## Vendor-ready requirements

Ask for title IDs, territory definitions, original currency, daily/weekend/weekly/cumulative amounts, local release dates, reported period start/end, original publication timestamp, corrections/revisions and provenance. Confirm domestic/international/worldwide definitions, previews, reissues, territory overlap, exchange-rate policy and original versus revised totals.

The licence must cover intended in-game use, cached/offline use, client downloads, screenshots/display, attribution and update cadence. Obtain explicit permission before including any licensed raw data in the public repository. Pricing is quote-dependent; no invented vendor fee belongs in the game or implementation budget.

## Adapter contract

Store provider/title/territory IDs, period type and dates, amount and currency, cumulative flag, publication time, revision ID, superseded revision, source URL or provider reference, licence reference and retrieval time. Require a release/version key for reproducible saves.

An as-of query returns only reports published by the game's date. A later corrected cumulative figure must not silently appear in January. If a provider supplies only current final totals, it cannot reproduce the exact historical information available each day; document that limitation.

Never sum daily, weekend and cumulative reports together. Reconcile overlapping territories explicitly. Keep nominal historical totals separate from inflation-adjusted records and currency conversions. Rankings must specify scope and measure: domestic lifetime, worldwide lifetime, opening weekend, annual or another supported metric.

## Integration and fallback

Build the ingestion/validation adapter now with a small clearly synthetic fixture. When an authorized real dataset becomes available, switch through the same contract without changing engine logic. Tests using synthetic fixtures verify software only, not real historical coverage.

For the living alternate-history world, sourced baseline reports and player-simulation earnings must remain distinguishable internally. A player's success may change the save's simulated market, but do not rewrite original provider observations. The game's credits can explain the fantasy world; that does not replace dataset licence requirements.

After the historical evidence horizon, continue through the simulation engine, not invented supposedly sourced future reports. Use deterministic seeded variation, release schedules and available competition data. No frozen annual results and no guaranteed repetitive rankings.

## Acceptance cases

* Publication-date boundary and corrected-report visibility.
* Same report imported twice does not duplicate earnings or rankings.
* Daily and cumulative rows do not double-count.
* Territory/currency mismatches are rejected rather than guessed.
* Historical records and alternate-game records remain independently inspectable.
* Missing licensed feed reports a precise status while fixture-based software tests still run.
* Save/reload preserves the dataset revision and deterministic simulated outcomes.
