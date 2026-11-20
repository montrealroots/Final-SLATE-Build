# SLATE — Research Recovery and Implementation Handoff

Research cutoff: November 19, 2026, America/Chicago. Repository inspected: `montrealroots/Final-SLATE-Build`, commit `b9a9e5ca7d4e5d1881cb88344172721fad33211b`. This is a research handoff, not a game patch or a claim that the repository now passes its tests.

## What this supplies

* 167 selected award observations, including recovered BAFTA, SXSW and IDFA results; attributed secondary results for Locarno and TIFF; selected European Film Awards results and Blue Dragon nominations.
* 45 scoped immigration fee records across 14 destinations. These are components and conditional routes, not 45 fully researched countries. Conflicting, undated and commencement-dependent records are explicitly marked.
* 42 source records with URLs and access qualifications.
* The exact repository inventory of 106 estimated visitor-visa records, 170 estimated work-permit records and 46 additional processing-time gaps: 322 tracked rows. None is silently marked closed.
* A detailed implementation specification, one continuous player journey, browser/device validation requirements, box-office sourcing options and a copy-and-paste Claude instruction.
* A runnable offline validator for this package, plus coverage and integration requirements for Claude's code.

## What is not complete

This is a substantial recovery of missing evidence, **not a complete worldwide immigration database or an exhaustive awards archive**. Full nominee rosters, individual craft recipients and internal category mappings remain in places. Locarno and TIFF material recovered here is secondary; an inaccessible organizer page is not falsely called directly verified. IDFA's announcement was accessible through indexed official text, not through a successful direct download.

The unresolved country inventory is preserved so Claude cannot hide remaining gaps by deleting rows or converting estimates into facts. Fee evidence does not verify processing times, eligibility, work rights or stay lengths. Research cannot create future winners, obtain a commercial data licence without agreement, or replace testing on a physical phone.

## Read and implement in this order

1. `docs/01-FINDINGS.md`: what changed and what remains.
2. `docs/02-AWARDS-INTEGRATION.md`: edition/date logic, identity mapping and simulated competition.
3. `docs/03-PAPERS-INTEGRATION.md`: route-specific fees, effective dates, permissions and bank effects.
4. `docs/04-JOURNEYS-AND-SAFARI.md`: continuous gameplay and truthful testing.
5. `docs/05-BOX-OFFICE.md`: available sources, licensed ingestion and simulation boundaries.
6. Run `python3 validate_package.py` from this folder.
7. Give Claude this entire folder or ZIP and `CLAUDE-COMMAND.md`.

## Data conventions

Every observation names a source ID from `data/sources.json`. Category labels are readable mappings, not guaranteed exact official typography. Person and title IDs are deliberately unassigned until matched to the repository; title recipients must not be mistaken for the individual professionals receiving a craft award. Dates have day precision; no exact announcement hour has been established. `publishedDate` is used conservatively as the game visibility boundary and must never be inferred from a website upload directory.

`data/scoped-immigration-fees.json` contains evidence candidates. Unknown start dates are null, not a claim that a fee has applied since January 1. Amounts are in the named currency; store money in integer minor units in the game. A zero amount is allowed only where an actual waiver is supported. These records need the eligibility resolver described in the papers document before use.

No full copyrighted rulebooks, paid datasets, credentials, commercial licences or third-party source code are included. Keep research/provenance in Settings → Credits & Sources, with any additional required attribution where the relevant licence requires it. Keep gameplay clear about material unknowns and simulated outcomes.
