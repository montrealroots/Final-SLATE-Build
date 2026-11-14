# Dated Exchange (Step 3 Of The Owner's Command Of November 14, 2026)

## The Records

- **Where they come from.** The rates are SLATE-REBUILD's, from `88256bfc234cf6f4912b3d53632ca0fdd76720c2`. Each was
  copied unchanged:
  - `src/money/rates/rates.json` → `src/engine/bankworld/data/rates/rates.json`
  - `research/sources/money/rates/*.json` → `src/engine/bankworld/data/rates/sources/`
  - `coverage/rates-countries.json` → `src/engine/bankworld/data/rates/rates-countries.json`
- **Recounted on November 14, 2026.** There are 152 currency series and 622 observations. That matches the owner's
  count, so nothing changed. `tests/v9-fx.test.ts` holds both numbers.
  - The observations run from 2025-12-31 to 2026-10-30.
  - 137 series have four quarterly observations. Eight have five, four have six, one has eight, and two have one.
  - Country coverage has 252 rows: 230 researched and 22 proven.
- **What they are.** Mostly the US Treasury's quarterly Reporting Rates of Exchange. A few are a central bank's
  official rate or a stated fixed parity. Each source file names its source.
  - These are quarterly reference observations. They are never presented as daily prices or as a bank's price.
- **The dates.**
  - The records give one date per observation: the day it takes effect (`from`). Read as the observation date too.
  - Publication dates aren't in the records. A rate is treated as available from its effective date, and nothing
    earlier. This is a recorded gap. Recording publication dates means reading each source's release notes.
- **1221's fixed table.** It covered 112 currencies. It no longer converts anything: `exchange` reads only the dated
  records. The one currency it had that the records don't is BGN. Bulgaria adopted the euro on 1 January 2026, so no
  dated BGN rate is wanted.

## The Rules (`src/engine/bankworld/content/currency.ts`)

- **The day.** A rate is read on the bank's own day.
  - It is set every time the bank's day turns over, before anything of the day runs, and before every command.
    (`index.ts` `readRatesOn` does this.)
  - The rate in force is the last observation whose effective date is on or before that day. A rate that takes effect
    later is never used: no future knowledge. `tests/v9-fx.test.ts` checks this for every observation of every series.
- **Missing rates.**
  - Before a currency's first observation there is no rate. A conversion then gives nothing, and a payment abroad is
    refused, with that reason.
  - Until this change, 1221's conversion helpers fell back to one to one where a rate was missing.
- **Past the records** (the documented policy). The last observation is held, never extended, interpolated or
  invented.
  - A rate more than 99 days past its effective date (one quarter and a week) is stale. Every quote made with one says
    so: "These are the newest recorded, and more than a quarter old."
  - SLATE stories may start as late as 2050, so most of a long story will run on held rates. That is said, not hidden.
- **Arithmetic.** Through the dollar, minor units in and minor units out, rounded once. 1221's `exchangeHeld` rounds
  money without minor units (yen, won, króna) to whole units.
- **Reference rate versus execution price.**
  - The reference rate is what the records say. The price a payment gets is the reference rate less the sending bank's
    margin (1221's researched margin, or its stated assumption where a bank publishes none). The sending bank's fee and
    the receiving bank's fee are charged on top.
  - The quote shows each part.

## A Payment Abroad (1221's `systems/abroad.ts`, With The Rates Kept)

The flow is 1221's.
1. Choose the accounts.
2. Enter the amount, in the sending account's own money.
3. Read the quote: sending fee, margin, receiving fee, what arrives and on which day.
4. Move It: what is sent and its fee leave the account at once, into Money In Transit.
5. On the quoted day the payment arrives, less the margin and the receiving fee. The margin is posted to "Exchange
   Margin" and the fee to "Bank Fees".
6. The notice is the receipt.

What this step adds:
- **The rates on the quote** (`AbroadQuote.rates`): each side's reference rate, its effective date and whether it is
  stale. They are said in the quote's words, and kept on the scheduled arrival with what it posts. The arrival posts
  the quoted amounts, so a rate that changes while the money is on its way changes nothing. Shown by the test that sends
  on 30 March and settles after the 31 March rate.
- **Refusal without a rate.** A quote is refused where either money, or the save's reporting currency, has no rate in
  force.

### What Prevents Double Settlement, Rewrites And Exploits

- **Each arrival is one scheduled item, run once.** A reload in transit settles it once (tested).
- **Settled postings are never rewritten.** A later rate reads only new quotes.
- **No free money from a rate change.** A quote is fixed when it is sent, and the margin and both fees come off every
  payment. There is no reversing a payment in transit.

## Not Yet Done

- **Exchanging inside one bank.** 1221 has no such product, so it isn't offered.
- **Exchange in Your Bank's screen.** Move Money shows the quote's words. A journey through a payment abroad on screen
  needs an account at a bank abroad, which SLATE's start doesn't give. The engine path is tested; the screen path isn't
  yet.
- **Publication dates.** See above.
