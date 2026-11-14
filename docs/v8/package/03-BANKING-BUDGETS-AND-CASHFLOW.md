# Banking and user-defined budgets

## Canonical money
Represent currency plus integer minor units; use decimal strings/BigInt-safe serialization when values exceed JavaScript safe integers. Never use binary floating point for money postings. Currency exponents vary; zero-decimal and three-decimal cases need fixtures. Rates are dated decimal rationals, not PPP indicators masquerading as exchange rates. Persist quote, fees, rounding and source/target amounts on each FX transaction. A later rate update does not rewrite past receipts.

One transaction journal links all internal transfers. Accounts are assets/liabilities/equity/income/expense according to owner and purpose. Use balanced postings per currency with explicit FX clearing. The UI balance derives from this journal; do not maintain a second mutable number in each screen. Every command has an idempotency key and atomic validation/persistence. A rejected payment changes no balances. Retry cannot double debit or pay interest twice.

## Bank lifecycle
Discover eligible institutions/products → compare published terms and coverage → prepare identity/address/residence/source-of-funds documents → submit/open → fund → transfer/pay/receive → reconcile statement → fees/interest → amend or close. Application acceptance is not guaranteed by merely selecting a bank. Product age, residence, individual/business ownership and geography are independent constraints.

Account state: draft, pending, open, restricted, closing, closed. Transaction state: drafted, quoted, confirmed, pending, settled, failed, reversed. A hold reduces available funds without becoming a paid expense. Keep posted balance, holds, available balance, restricted balance and liabilities distinct. Transaction status transitions have dates and reason codes.

Domestic and international transfers retain sender, recipient, currency, channel, fee, quoted delivery date and bank calendar. Pending inbound funds cannot be spent. Reversal has a linked compensating entry, never deletes history. Account closure cannot strand holds or obligations. Savings interest is product-specific and date-effective; do not make a universal interest model from one account's convention. Overdraft is only available where explicitly contracted, not an unlimited wealth privilege.

Product records need provider/legal entity, product name, market, supported holder type, currency, valid-from/to, observed date, opening rules, fee events/waivers, transfer limits and timing, interest basis, overdraft rules, source per field and evidence status. Unknown terms are not zero. Current prices cannot silently be backdated to January 2026. Where history is missing, preserve a marked simulation assumption and return the precise research question.

## Budget creation
Replace forced tiers with Budget Currency + Planned Budget amount. Accept examples 20000, 20,000 and 2,000,000 in a clearly identified input locale. Preview the normalized amount before committing. Reject negatives, infinity, exponents, excess decimals, overflow and ambiguous mixed locale formatting. A blank amount is unknown; zero means an explicitly unfunded draft, not free production. Optional shortcuts can suggest amounts but never constrain choices.

Project header always shows: planned budget, current estimate, approved ceiling, funding committed, funding received, cash available, reserved commitments, paid costs, forecast final cost and funding gap. For series show season total and per-episode allocations separately; never multiply a season total by episode count again. Project currency is chosen once; changing it after transactions requires an explicit conversion/reporting migration, not relabeling numbers.

Budget labels are descriptive and contextual, not quality modifiers or legal wage categories. A $2m film is not universally a large film; the comparison depends on format, length, territory and production approach. Use plain phrasing such as “$2,000,000 planned” as authoritative. If comparative labels appear, identify the internal comparison group. Legal/guild thresholds require separate sourced rules.

## Breakdown and spending choices
Development/rights; writing; cast; crew; locations/permits; art/sets; costumes/makeup; cameras/light/sound; transport/accommodation; animation/puppets/rigging/rendering; post/edit/VFX; score and licensed music; insurance/legal support; delivery/accessibility; publicity/festivals; distribution; merchandising; contingency. Apply only categories relevant to the project. Animation has its own labor/assets and render/stage constraints, not a live-action shoot with renamed labels.

Each line: quantity, unit, rate, currency, supplier, quote validity, owner, estimated/quoted/contracted status, deposit, milestone payments, due dates, committed, paid, refundable amount and forecast remaining cost. Distinguish a hired supplier quote from a researched public price and from a simulated negotiated rate. The player can change quantities, choose suppliers, buy/rent, defer optional work or approve a scope change. Necessary work cannot become complete by setting its allocation to zero.

Budget edits: preview scope and financial effect → authorize revised ceiling → choose actual funding source → move/secure cash → update commitments/schedule. Raising the target never credits cash; reducing it never cancels signed obligations. Record revisions and reasons, preserve actual costs. Warn before overspend; stop only the affected action when payment/approval is missing. Offer fund/revise/defer/cancel alternatives with their costs.

## Liquidity and readiness
Calculate balance over dated cash events, not just total promises. Start from spendable cash net of existing holds. Add eligible secured inflows when available; subtract each remaining outflow once. Carry restricted funds separately by allowed use. Hold creation and later settlement must not subtract the same principal twice. Report first deficit date and maximum additional funding required. Uncertain receipts belong in a separate scenario, not guaranteed liquidity. Payment on delivery cannot finance pre-delivery deposits without a distinct bridge facility.

Readiness has two answers: “Is the budget funded overall?” and “Can you pay the next commitments on time?” Then combine with cast/crew, permissions, designs and schedule. Forecast scenarios: secured only, expected, delayed payment and cost overrun. These are planning scenarios, not exact predictions.

Example: project has $20,000 cash, $30,000 deposit tomorrow, and $100,000 payable on delivery. Total backing exceeds costs but tomorrow's deficit is $10,000. A $10,000 settled owner transfer resolves it. Changing Planned Budget to $2m does not.

## Month and year processing
Use civil calendar months for monthly bank/deal obligations, with explicit last-day policy (Jan 31 → Feb last day → Mar 31 anchored). Bank business days and project working days are different calendars. Record per-obligation period IDs. Advance and sleep must process due charges, settlements and warnings chronologically. Save/reload preserves pending transfers and never pays a monthly installment twice.
