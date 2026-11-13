# Architecture, research and data contracts

These are required behaviors, not an instruction to replace the working stack. Reuse existing state, events, ledgers and indexes.

## Entity relationships
Stable internal IDs plus provider IDs. Work, adaptation, project, release, person, character, role assignment, credit, company, network, provider, place, award edition, category, nomination, observation, contract and ledger posting remain distinct. A person can perform several roles and a company can perform several functions without duplicate identities.

A release belongs to a project/work and territory/window, not simply to a movie name. A cast assignment connects person + character + performance kind + dates/episodes. A historical observation connects entity + period + metric + unit + territory + source. Prevent orphan IDs and ambiguous title-only joins.

## Event envelope
Use existing equivalents for: event ID; type; aggregate ID; occurredAt; availableAt; scheduledAt; source/provenance; model version; causal parent ID; idempotency key; payload version. Store date precision when exact time is unavailable. Handler ordering must be deterministic, with a documented tie-breaker. Event replay cannot re-award money or reputation.

Examples: ScriptRevisionApproved causes BreakdownRecomputed and ScheduleReviewRequired; ReleaseConfirmed causes CalendarEntryCreated and WindowReserved; AudienceReportPublished causes RenewalReviewEligible; PaymentSettled causes RecoupmentApplied; ProjectDelivered causes TrackRecordUpdated; FirstLookAccepted causes OverheadScheduled. Each handler validates prerequisites and writes atomically or rolls back affected state.

## Historical model
Keep an append-only versioned observation store with source and corrections. Playable state references a dataset snapshot/version. Importing a later correction cannot silently rewrite the player's settled ledger. Provide an explicit migration policy and compare before/after. User saves should remain reproducible from their seed, model version and historical snapshot.

## Catalog infrastructure
Discover IDs → fetch detail → normalize → validate relationships → stage → publish consistent snapshot → update index → make pack available. Page through all supported results, checkpoint cursors, and respect rate limits. Do not expose credentials in browser bundles or logs. Use existing protected authentication instead of adding unnecessary keys.

Separate giant catalog from mutable save state. Keep cached images and optional data packs outside the essential save. Indexed queries and bounded page sizes; lazy detail; background work with cancellation and progress. Time ticks scan due events, not the entire world catalog. Rollback copies affected aggregates, not every imported record. Audit this before introducing a new database or worker layer.

## Save and migration
Version schemas and migrations; back up safely; validate before replacing; retain identity references and historical version. Test interrupted writes, old saves, insufficient storage, missing packs and restored backups. Imports must not erase player edits. Missing optional catalog records degrade to cached labels and IDs rather than preventing the save from opening.

## Research assignment
This package supplies research tasks, not newly verified external facts. For each source used, record exact URL/document title, organizer/provider, edition, retrieval date, relevant field/section and access/attribution conditions.

Candidate source families to evaluate:
- TMDB official developer documentation and authorized catalog access: identities, credits, imagery and provider metadata within documented coverage.
- Official studio/network/service pressrooms: announcements, commissioning, release schedules and corporate changes.
- Official awards/festival organizers and edition rulebooks: eligibility, categories, dates, selections and results.
- Public distributor/exhibitor reports and authorized box-office datasets: dated grosses and theater counts with definitions.
- Nielsen public releases, official platform engagement reports and national measurement organizations: audience metrics with original methodology.
- Publisher/author/developer pages, library catalogs, Wikidata and permitted summaries: source-work metadata and contextual descriptions.
- Manufacturers and rental/service providers: equipment capabilities and dated public prices where usable.
- Official artist/composer credits and permitted music metadata: identities and recordings, not assumed licensing rights.

Verify access, current terms and actual fields before relying on any candidate. Do not scrape around authentication restrictions or invent missing API capabilities. A blocked URL requires trying authorized alternative primary evidence, then recording the specific gap. Do not call a proxy estimate a verified observation. Exportable datasets may have different terms from browsable pages.

## Data quality gates
Coverage denominator must be explicit. Run duplicate, orphan, impossible-date, incompatible-unit, negative-money and contradictory-recipient checks. Sampling finds errors but does not certify all rows. Manually reviewed roles need provenance and editable interpretation. A minimum number of characters is not a quality measure. Keep the audit ledger synchronized with actual code and evidence.
