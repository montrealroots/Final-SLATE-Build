# Visa And Permit Fees, Scoped By Route (November 20, 2026)

The research recovery package supplied 45 fee components for 14 destinations (`docs/recovery/package/data/scoped-immigration-fees.json`). They are now kept in `src/data/papers/route-evidence.json`. Each record either **applies** to a named application, under named conditions, or is **held** with its reason. `src/engine/papers-scoped.ts` reads them, and `tests/papers-scoped.test.ts` tests them.

Before November 20, 2026, a destination had one set of terms for everyone, and every fee was charged in one payment when you applied. A consulate's price list could only have replaced the whole country's price, which the package rules out, and Colombia's two-part fee couldn't be modeled at all.

## What Changed In Play

- **Where you live is where you apply.** The game has no consulates, so this is a game convention, not a rule read anywhere. Under it, Washington's price lists (Serbia, the Philippines) apply to applicants who live in the United States. Colombia's euro schedule applies to applicants who live in a euro country; everyone else pays its dollar schedule.
- **A fee can come in parts.** Colombia's study fee is paid on applying. Its issuance fee is paid only if the visa is issued. A refusal costs only the study fee. The issuance fee is posted once, keyed to the application, so a reload or a retry can't charge it twice. If the bank can't pay it, the visa isn't issued, and the player is told why.
- **Working days count as working days.** Botswana's 14 working days skip weekends, and its public holidays where the game holds them. The player sees "14 working days (about 20 days)". This is a published service target, not a promised decision date.
- **A route-scoped fee makes the fee researched.** The decision time stays the game's estimate, and is said to be one, unless the record gives a time (only Botswana's does).

## The 45 Records

| Destination | Applied to | Held, and why |
|---|---|---|
| Colombia | Visitor visa (route V): study fee on applying and issuance fee on issue, in dollars or euros by where you live, from April 1, 2026 (Resolution 03969) | Routes M and R: a migrant or resident route's code doesn't say acting or filming is allowed on it |
| Serbia | Visitor visa (C), adult, for applicants who live in the United States: 96 USD | The child fee (a story starts at 19); the long-stay D visa (whether it allows work is assessed apart) |
| Philippines | 9A single entry, for applicants who live in the United States: 40 USD, or 25 USD on a Chinese passport | Multiple-entry 9A visas (an application in the game is for one entry); the prices for visa-free passports (the game asks for this visa only of passports that need it) |
| Fiji | Work permit, application charge: 650.05 FJD | The issuance fee, which depends on a permit class not known for an actor |
| Jamaica | Work permit, nonrefundable processing fee: 17,250 JMD | — (the issuance fee has no schedule here) |
| Botswana | Work permit: 1,500 BWP, decision in 14 working days | — |
| Malawi | — | Two official pages give different single-entry fees (75 and 50 USD). Neither is chosen, and they aren't averaged. |
| Turkey | — | The general tariff, not the eVisa price, which differs by nationality |
| Sri Lanka | — | Its ETA is already recorded from the government's own page. The free scheme for 40 nationalities (May 25 to November 24, 2026) doesn't list them, and after November 24 it needs a successor policy |
| Cyprus | — | Read only as search-index text; the visa stays the game's estimate |
| Malaysia | — | The Professional Visit Pass and its endorsement are not the route for foreign artists filming (PUSPAL) |
| United Arab Emirates | — | The temporary work permit, not the mission permit, and its page says two different things about how long it lasts |
| Cayman Islands | — | An enacted schedule whose start isn't confirmed; never charged on an invented date |
| Namibia | — | An official schedule with no date |

That makes 10 records applied and 35 held. A test fails if any conflicting, undated or not-yet-in-force record is applied, or if a record is neither applied nor held.

## The Gap Ledger

None of the package's 322 tracked rows was closed when the package was applied, and the 106 visa and 170 permit estimates stood. Batch 6 (later on November 20, `docs/v10/papers-research/fees-without-times.md`) closed one row in full, the Solomon Islands' tourist visa, and settled the fee of five more (Uruguay's visa; Uganda's, Rwanda's, Zimbabwe's and Mauritius' permits): Batch 7 closed Belize's permit in full, and batch 8 Greenland's. The owner's six-destination research settled Cyprus's, Ukraine's, Nepal's and Papua New Guinea's visas and Iceland's permit. 102 visa and 164 permit estimates remain, with 34 visas and 14 permits whose decision time is still the game's estimate. A record covers one route for one kind of applicant. It doesn't settle the country's terms for everyone, or its decision time. The changes:

- **Colombia's visitor visa.** The fee is researched for every applicant from April 1, 2026, in their schedule's currency. The decision time is still estimated.
- **Serbia's and the Philippines' visitor visas.** The fee is researched for applicants who live in the United States. For everyone else it is still estimated.
- **Fiji's and Jamaica's work permits.** The application fee is researched. The rest of the cost and the decision time are not.
- **Botswana's work permit.** The fee and a published service target are researched. It stays open because the target isn't a guaranteed decision date.
