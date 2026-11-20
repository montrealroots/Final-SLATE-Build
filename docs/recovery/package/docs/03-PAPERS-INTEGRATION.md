# Visas, permission to work and banking

## Required data model

Resolve by destination authority, nationality/passport, residence, place of application, purpose/activity, employer/sponsor, age, dates, route and channel. A territory may share a parent's immigration authority without sharing every fee or exemption. Preserve territorial IDs from the repository; do not collapse all of them into sovereign-country rows.

Every policy should have a source, evidence type, retrieval date, effective interval if known, fee components, currency, payment timing, refundability, tax/service-charge treatment, required documents, allowed activities, maximum stay, visa validity, entry count, processing range and day unit. Unknown fields stay unknown. Do not interpret null as zero, free, instant or unrestricted.

Country-level gap records and route-level evidence are different units. The 45 rows here cannot close 45 country records automatically. Match only applicable records. In particular, evidence for a worker route does not automatically resolve a visitor-visa gap from the same destination.

## Rules for the supplied evidence

* Colombia: study and issuance are different cash events. Date the new schedule; keep reciprocity/exemptions and currency applicability. Neither route code alone proves permission for acting or filming.
* Serbia and Philippines: Washington-post pricing cannot overwrite all other posts. Visa validity does not equal permitted stay. Tourist/visitor status does not imply paid-work permission.
* Malawi: preserve both official values and a conflict flag. Do not average them or pick whichever makes the test pass.
* Turkey: general tariff and nationality-specific eVisa pricing require separate routes. Do not charge the general tariff to every eVisa applicant.
* Sri Lanka: check nationality eligibility and date range. A fee waiver does not remove the ETA requirement. After the supported end date, require a successor policy or explicit simulated fallback.
* Fiji: application and issuance components must be matched to the actual class. Do not assume one includes the other.
* Malaysia: the ESD pass fee, endorsement, tax and any nationality visa charge are separate. Do not treat this evidence as the entertainment/filming approval schedule.
* UAE: temporary work and mission permits are distinct; do not transplant fees and times. The supplied temporary-route page has inconsistent validity wording, so this field remains unresolved.
* Jamaica: processing evidence does not establish the issuance charge.
* Cayman: the regulation's commencement remains unconfirmed here. Application charge and occupation-based grant fee are different. Do not activate an undated legal schedule on an invented date.
* Botswana: working days require the authority's work calendar; published processing targets are not a guaranteed decision date.
* Namibia: official but undated candidate values stay candidates until currency is established.

## Player lifecycle

Choose activity/location/dates → check citizenship/residence and entry status → identify relevant route(s) → show documents and quoted costs → collect documents/sponsor → apply → debit the applicable component → processing → request more evidence, approve or refuse → debit issuance when required → activate permission → track use, allowed activity and expiry → renew/extend/change status/leave.

Events connect to the calendar, budget and location engine. A request for documents may pause or restart a route's processing clock only if supported by its rules or explicitly simulated. Missing permission prevents the affected work, not unrelated screenplay work elsewhere. Filming-location permits, work authorization and immigration entry are separate permissions.

Document identity includes nationality, issuer, issue/expiry dates and relevant route/application ID. Prevent impossible chronological states, duplicate submissions and duplicate debits. Show practical choices: “Prepare Documents,” “Apply for a Work Permit,” “Application Under Review,” “Permission Expires on …”.

Bank transactions should retain original currency/amount, exchange-rate source/date, converted account amount, explicit conversion fees and rounding. Do not invent an official exchange rate where none is available. Acceptance tests use known fixture rates identified as fixtures. Refunds link to original payments and follow component refund rules.

## Dealing with unavailable policy facts

The game may support a separately labelled simulation policy for an unresolved route. It must never promote the simulated amount to verified legal data. Keep estimates distinguishable in development coverage and materially uncertain quotes understandable to the player. Do not disable the entire world because one fee is unknown, but do not silently promise an exact real fee either.

Track remaining work in `data/gap-ledger.json`. A country gap closes only after the applicable scope, fee and required processing facts are verified and mapped. Additional research should use the destination's immigration authority, consulate for the relevant post, labour department and official gazette; a travel site's summary is a lead, not final authority. Conflicting authorities require scope/effective-date reconciliation.

## Acceptance tests

1. Different nationalities at the same destination resolve differently when required.
2. Same nationality at two consular posts does not silently inherit the wrong currency.
3. A fee component is debited once, even on retry, reload or an interrupted save.
4. A nonrefundable application payment remains spent after refusal; uncharged issuance is not spent.
5. Working-day processing skips applicable weekends/holidays; stay duration is not used as processing time.
6. Exemption start/end boundaries and birthdays changing age brackets resolve correctly.
7. A visitor can enter yet still lack permission to work; a work permit alone may still require entry clearance.
8. Conflict/unknown records cannot pass a verified-data coverage test.
9. Migration preserves existing balances, active applications, documents and ledger IDs.
10. Snapshot tests cover scope and date decisions, not merely that a price string appears in the UI.
