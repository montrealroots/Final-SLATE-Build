# SLATE — Six-destination papers research

Researched November 20, 2026. Purpose: resolve the specific official-source questions Claude asked the owner to research. This is a game-data handoff, not a certification of every immigration route in these destinations. Repository gap notes and existing terms were read from main during this research. No repository changes or game tests were performed.

## Evidence handling

The official search index exposed substantial page text even where direct retrieval returned 403/418 or no readable body. Label this `official_indexed_text`, not a successful direct document download. URLs below identify the original authorities. Where dates are unknown, retain a null effective-from date; do not pretend today's fee applied throughout 2026. Preserve historical observations and older source conflicts.

Distinguish a published service target, historical average, maximum with exceptions, arrival-desk procedure and simulated waiting time. A target need not be a guaranteed decision date to count as researched. Do not close an entire country merely because one route was settled.

## 1. Cyprus — Category C visitor visa

**Recovered official facts:** general adult Category C fee EUR90; ages6–12 EUR45; under6 free. The central government page says decisions usually take15 days and may extend to45. It does not explicitly qualify those processing days as working days in the retrieved wording. Retain the unit as unspecified until established; do not silently convert to working days. The Washington embassy gives the same15/45 decision figures and charges local currency at the Treasury's monthly conversion rate. Fee exemptions/reductions remain applicable.

Sources:
- https://www.gov.cy/en/information/visas/
- https://www.gov.cy/mfa-embassywashington/en/consular-services/visa-information/
- Official fee receipt form: https://www.gov.cy/media/sites/42/2026/01/%CE%93%CE%9B292_final.pdf

The receipt form also gives EUR35 facilitation pricing for named nationalities, with biometric-passport exemption footnotes, and Cabo Verde adult/child rates of EUR67.50/EUR33.75. Implement nationality/passport-type reductions only after mapping that form's exact scope; the general EUR90 is not universal.

**Conflict found:** an official PDF at https://www.gov.cy/media/sites/145/2025/12/Information-on-visas.pdf says10 calendar days, extendable30, and urgent2 working days. Its applicable mission/policy date was not established. Keep that discrepancy in the ledger. Prefer the current central-page15/45 wording for a provisional scoped central-policy record, with the conflict noted; do not report all Cyprus timing conflicts eliminated. Application lead time and decision time are separate.

## 2. Peru — distinguish tourism from the artist route

The blocked game route was SOL-ART, so a tourist-visa fee cannot resolve it.

**Artist route: historical official evidence recovered.** Migraciones' February29,2024 release states PEN105.60, an administrative maximum of30 working days, and a90-day artistic status. The applicant/entourage is outside Peru when applying; the process includes the artistic contract and supporting documentation and proceeds to consular visa issuance after approval.

Source: https://www.gob.pe/institucion/migraciones/noticias/913112-mas-de-mil-tramites-de-calidad-migratoria-para-artistas-aprobo-migraciones-en-el-presente-ano

**Do not activate PEN105.60 as an unqualified current2026 fee.** A newer2025 consolidated TUPA exists; its artist row must be read to establish the current charge and changes. The official registry was discoverable but direct retrieval remained blocked:
- https://www.gob.pe/institucion/migraciones/informes-publicaciones/2770424-texto-unico-de-procedimientos-administrativos-tupa
- https://www.gob.pe/institucion/mininter/normas-legales/7217412-008-2025-in

Lookup key: `Solicitud de Calidad Migratoria Artística Temporal`, procedure `PA35004761`. A secondary copy surfaced but was not used to certify the new fee. Do not confuse this with a sporting procedure, worker status change, or the separate consular issuance fee. Mapping a public-performance route to a particular film shoot also needs the activity scope checked.

**Tourist lead, not a national replacement:** the official child page https://www.gob.pe/36240-solicitar-visa-de-turista-para-ingresar-al-peru?child=114184 states USD30 and evaluation up to2 weeks. The precise consular post was not established in retrieved text, so hold it as a scoped candidate rather than apply it worldwide. The Dallas child page (`?child=110547`) says a visa may be delivered the interview day after a favourable evaluation; that is not total processing time.

## 3. Ukraine — the existing eVisa timing gap

**Recovered route-specific authority:** the MFA eVisa page explicitly describes changed registration terms: regular3 working days; urgent1 working day. Single-entry USD20; double-entry USD30; urgent fees double to USD40/USD60.

Source: https://mfa.gov.ua/en/consular-affairs/entry-and-stay-foreigners-ukraine/e-visa

The general MFA visa page still says eVisas take9 working days. The specialized eVisa page explicitly announces changed terms; use it as the preferred current route-specific source and retain the older conflicting text in provenance. Exact policy commencement was not recovered, so do not backdate the change arbitrarily.

General page: https://mfa.gov.ua/en/consular-affairs/entry-and-stay-foreigners-ukraine/visa-information

The same general page gives consular regular service up to10 working days, extendable30, expedited up to5; basic USD65, doubled for expedited service, with reciprocity exceptions. These are consular facts, not eVisa timing. Keep routes separate. Eligibility and whether the online route is operational for a particular applicant are separate checks. This research does not resolve Ukraine's blanket work-rights flag.

## 4. Iceland — work-based residence application

**Fee confirmed directly from official indexed text:** D-107 first work-based residence application ISK80,000. The official December22,2025 announcement makes the fee effective for submissions on/after January1,2026. The processing payment is nonrefundable after submission. Do not relabel this as the fee for every standalone work authorization.

Sources:
- https://island.is/en/o/directorate-of-immigration/fees
- https://island.is/en/news/increase-in-fees-for-residence-permit-and-citizenship-applications

**Time:** the immigration directorate reports an average of2 months in2025 for approved first-time work-based residence applications. It expressly says individual completion cannot be predicted and expedited processing cannot be requested. This is a measured historical average, not a maximum or guaranteed60-day deadline. Working Holiday/Youth Mobility is a separate category.

Source: https://island.is/en/o/directorate-of-immigration/have-applied-work

Implement `timeBasis: historical_average`, `observationYear: 2025`, `value: 2`, `unit: months`. Any conversion into game days or variation is a simulation rule. A specific permit or exemption for a short artistic engagement needs its own eligibility mapping; do not apply D-107 automatically to all performers.

## 5. Nepal — tourist visa on arrival

**Fee authority recovered:**15days USD30;30days USD50;90days USD125. Official procedure: submit arrival/online form, pay, then present documents at the immigration desk for issuance. The online submission receipt's15-day validity is not visa processing time. Free categories and nationality exclusions need to be respected.

Source: https://immigration.gov.np/visa-information

The official payment guide says approximately5 minutes to complete the application and obtain a payment receipt. That is not an approval SLA; a visa sticker is issued at the immigration desk.

Source: https://immigration.gov.np/user-manual-for-visa-fee-payment

The tourism authority warns of queues and names nationalities requiring a visa before arrival. Keep those applicants on a consular route rather than letting every passport use arrival issuance.

Source: https://ntb.gov.np/en/plan-your-trip/before-you-come/tourist-visa

Implement an arrival event with document/payment checks and no invented multi-day preapproval delay. Waiting in a queue may be simulated, clearly distinct from an official processing target. The airport FAQ says visas are usually obtained in less than an hour, with delays possible; treat this as operational guidance, not a guaranteed deadline: https://tiairport.com.np/public/index.php/faq/en

This resolves the official fee source and explains the timing model; it does not research Nepal's separate work permit.

## 6. Papua New Guinea — tourist eVisa

**The apparent fee conflict is resolved:** tourist and visiting-relative visa classes have a zero visa fee, but an online eVisa application has a separate USD50 eVisa charge. Do not change the total online cost to zero. The official FAQ says charges are not refunded if the application fails.

The authority's published target is10 working days when all requirements are met, identified as current at June2025. Some eVisas may issue almost immediately; that does not make every application instant. Preserve the target's date and do not label it a guarantee.

Sources:
- https://icsa.gov.pg/faqs
- https://icsa.gov.pg/explore-visa/visit/visitor
- https://ica.gov.pg/uploads/media/post_file_3195072-visa-information-booklet-2025.pdf

The booklet's fee table separates `Fees` from `eVisa Fee`. Tourist tour-package and own-itinerary rows have nil base fee and USD50 eVisa fee. Easy Visitor30/60-day classes are separate. The visitor page lists a single entry and maximum60-day stay; resolve the chosen class and nationality rather than assigning60days to everyone. Extension USD150 and late-extension USD700 belong to applicable extension events, not initial application cost.

## Implementation command — paste with this document

Continue on the latest Final-SLATE-Build branch as one agent. Apply this document as a focused six-destination research update. Compare existing changes first; do not duplicate later batches.

1. Upgrade the Nepal and Iceland fee citations from secondary sources to the supplied official evidence. Preserve effective dates and scope.
2. Represent PNG's zero base fee and USD50 online fee as components charged once, with its dated10-working-day service target. Do not declare the application free.
3. Resolve Ukraine eVisa timing using the specialized MFA page's3-working-day regular and1-working-day urgent procedures. Retain the stale9-day source as a documented conflict with the reason for precedence. Do not mix consular and electronic routes or invent the effective date.
4. Add Cyprus's scoped fee evidence and central15/45-day wording, with the official-PDF conflict and unspecified day unit recorded. Do not erase nationality reductions or claim all timing questions solved.
5. Record Iceland's2025 two-month average as historical evidence, not an exact deadline. Separate residence and work permission.
6. Model Nepal's arrival issuance correctly. Application-form completion time and submission-receipt validity must not become approval time. Preserve passport-based arrival restrictions.
7. Keep Peru's2024 artist fee historical until the latest official TUPA artist row PA35004761 is recovered. Record the30-working-day historical procedure and current-source blocker. Do not substitute a tourist fee or silently certify an old amount for2026.
8. Keep evidence type and access method honest: official indexed text is not a successful direct PDF download. Re-fetch only if needed for a missing field; preserve retrieved findings rather than repeating the whole research loop.
9. Add regression tests for component totals, duplicate payments after reload, working-day handling, nationality exceptions, average-versus-deadline labels, route differences and date boundaries. Update the coverage ledger by field; researched targets may be verified without guaranteed outcomes. Do not force every result into a single exact day count.
10. Run relevant checks, commit/push the coherent change, and merge only when required CI passes. Report actual before/after counts, unresolved scope/effective dates and test results. Do not claim all six countries' immigration systems are now complete.

## Acceptance checklist

- PNG online tourist total is50USD, not0 or100.
- Ukraine eVisa and consular processing remain different; urgent fees double only on the chosen route.
- Iceland shows an observed average and no guaranteed decision date.
- Nepal's15-day receipt validity is never used as a15-day processing delay.
- Cyprus fee reductions remain available; conflicting timing sources remain traceable.
- Peru's historic fee cannot silently overwrite current terms.
- Every factual field links to its source; estimates and engine conventions stay distinguishable.

No licences, credentials or full third-party documents are bundled. No additional API key is needed to use this handoff. Some official pages remain directly inaccessible; the remaining Peru TUPA verification is explicitly unresolved.
