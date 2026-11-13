# Data integration instructions

## Readable schemas
sources.json is the provenance authority. Every source_id resolves there. Entities use local packet IDs only; tmdb_id remains null until resolved. Match by known title/person plus disambiguating work/year/context, not name alone. Merge the title capitalization alias for One Battle after Another. Do not overwrite better repository IDs.

Award rows are events: a nominee event does not reveal winner status. Winner events occur separately. person_id null means work-level evidence only, not that no individual received an award. Use recipient_coverage to prevent an award being assigned to every cast member. Enrich complete credited recipients before assigning personal career credit. Included category keys are internal packet keys, not canonical organizer wording; preserve official display names through the existing category map.

Audience records use million_views_display_rounded. Do not render 8.6 million as an exact unrounded 8,600,000 people. This is neither unique viewers nor Nielsen minutes. Keep original display precision when deriving a range or formatted value. The snapshot covers a single chart/week, not a year.

Equipment records distinguish manufacturer claims from prices. Null price is not free. Scope current specs to model/version; historical availability requires its own evidence. Distribution routes are observed policy descriptions, not contracts that automatically entitle a release.

## TMDB execution handoff
The offline queue in reference/tmdb_inventory.py ingests line-delimited .json or .json.gz ID exports into SQLite, validates positive IDs, and keeps pending items resumable by type. It prints counts only. It is not a complete downloader, authentication helper or game database migration.

Use the existing cloud proxy authentication in Claude for api.themoviedb.org. Do not search for or print credentials. Start with an allowed test request and report only status/title. Integrate pending jobs with the existing importer; fetch documented details/credits/releases/images; mark completed only after successful normalization and storage. On 429 use backoff; 401/403 stop the affected feed; 404 record a tombstone for review; network errors stay retryable. Keep stale-but-valid installed catalog usable.

IDs from exports are inventory, not detail completeness. Add seasons/episodes from series records and verified endpoint contracts. Incremental change windows cannot heal an unlimited history gap. Schedule full inventory reconciliation after extended downtime. Current provider availability cannot be backdated to January without evidence.

## Merge policy
Stage → validate → preview count/diff → publish snapshot → migrate references atomically. Preserve player edits, saved timelines and settled money. A changed source fact may create an informational correction, never a silent duplicate nomination or repayment. Raw source bodies remain outside shipped content unless redistribution is allowed.

## Research attribution
TMDB's FAQ requires its approved logo and notice. Required notice: “This product uses the TMDB API but is not endorsed or certified by TMDB.” JustWatch attribution is also required for provider data. Keep actual provider requirements ahead of the preference to move all source marks to Credits. No third-party logos or photos are included in this ZIP.
