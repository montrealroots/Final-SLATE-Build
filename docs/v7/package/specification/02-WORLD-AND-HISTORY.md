# World and historical playback

## A. Event-time data
Every observation carries entity IDs, event date/time, timezone or date precision, publication time where known, import time, territory, reporting period, source locator, evidence status and revision. Unknown dates stay uncertain. An import date is not an original announcement date.

At a January 1 start, show only already available knowledge. Announced future projects can appear as upcoming; future earnings, winners and renewals cannot. An event on January 10 with a January 12 publication becomes reportable January 12. Distinguish release calendar availability from performance reporting.

Each dataset has its own historical coverage boundary. The requested November 13 endpoint does not justify inventing observations through that day. After coverage ends, simulation can continue with provenance. Corrected historical data is versioned; existing saves must not unexpectedly rewrite settled player earnings.

## B. Box Office
Provide domestic, international, worldwide and supported market views, with date/period selectors. Rows link to titles, credited people and companies. Show period gross, cumulative gross, release age, opening, rank change, screens/theaters where evidenced, rollout and rereleases. Maintain the source definition of domestic, not the player's residence.

Subcycle: release booking → screen allocation → audience demand → admissions/ticket gross → exhibitor/distributor allocation → report → payment due → ledger settlement → recoupment → distributable income → career record. Recorded historical gross and simulated player cash are separate inputs to this cycle.

Never distribute lifetime gross evenly across days. Missing daily values remain absent. A cumulative series cannot decrease without a recorded correction; corrections must be explainable. Daily, weekend, calendar-year and release-year views need compatible intervals and clear labels. International subtraction is valid only for compatible dates, coverage and currency.

## C. Box Office Records
Use exact navigation title “Box Office Records.” Include all-time and annual domestic/international/worldwide rankings, opening records when supported, as-of history, original/rerelease treatment and links to releases. Distinguish calendar-year earnings from lifetime earnings of releases originating that year. Nominal figures are default. Inflation adjustment requires a documented method and supported inputs, never an unexplained toggle.

Historical view ranks verified observations; playable view includes player films and alternate events. Unknown gross is not zero. Ties and provisional figures are explicit. Record-breaking events create career/publicity consequences only for eligible player work and only once.

## D. Television and streaming
Entity hierarchy: work → series → season → episode/special → release by territory/service → audience report. Support weekly, batch, split-season, simulcast, delayed and irregular schedules. Each episode has its own availability and optional performers/credits; seasons can have production overlap without impossible actor bookings.

Store original commissioner, broadcaster, distributor and availability provider as separate relationships. A streaming availability listing is not proof of ownership or commissioning. Preserve dated network/service names and ownership when verified. An announced renewal is distinct from financing, production start and eventual premiere.

Reporting: retain viewers, households, demographic rating/share, minutes, hours, provider-defined views and chart rank in their original units. Do not compare incompatible series or turn popularity votes into audience figures. Chart rank alone cannot produce revenue. Territory and measurement window are mandatory for meaningful comparisons.

Simulation: initial reach → release cadence → audience acquisition → retention → word of mouth/competition → weekly report → season economics → renewal/cancellation/ending decision → next season agreement. Planned limited-series endings are not cancellations. Renewal must consider costs, availability, strategy and expectations, not just one rating threshold. Historical announcement timing remains factual; simulated decisions use the model.

## E. Awards and festivals
Organization → edition → section/category → eligible work/person/episode → submission → screening/judging → nomination → ceremony → recipient credit. Import actual selections, nominations and winners with their announcement dates; use official edition-specific evidence. Festival attendance, market participation, selection, screening and award winning are different events.

Honorary recognition, juried prizes and audience awards use distinct decision mechanisms. Historical nominees cannot be guessed from winners. Awards may honor prior-year releases; edition year is not eligibility year. Preserve exact credited recipients and joint awards. Player selection affects calendar, travel, publicity, potential sales and future consideration, never automatic profitability.

Eligibility consumes runtime, production/release dates, format, premiere status, territory, language and applicable submission details. Changing a release can invalidate premiere eligibility; warn before committing and re-evaluate. Festivals cannot simultaneously claim mutually exclusive premieres. Research each supported edition rather than installing universal rules.

## F. Whole-catalog ambition
Target comprehensive accessible TMDB film/TV/person/company/network metadata, not a hand-picked starter list declared complete. First document provider discovery/export limits and permitted access. Build resumable imports, pagination, checkpoints, rate-limit/backoff, deletion/tombstone handling and deterministic deduplication. No guessed endpoint or completeness claims.

Count discovered, fetched, valid, published, installed and unresolved records separately by entity type. Audit dangling IDs, duplicate people, translations and alternate titles. Connect portraits, posters, backdrops, seasons and episodes to stable identities. Image variants are not unique entities.

Catalog scale must not become startup scale: indexed search, on-demand detail and scoped offline packs. Show download size, storage capacity, progress, pause/resume, retry/update/remove. Failed images get stable fallbacks. Every real person need not be currently hireable: dates, role, location and simulated availability govern participation. Do not book historical deceased people in present-day productions as if alive; archive appearances require a distinct modeled route.

## G. Geography as a working system
Country/territory → locality → timezone → season/daylight/weather → calendar → facility/location → transport → schedule. Named destinations need location evidence, not repeated city-center coordinates. Distinguish a scene's fictional setting from its filming location. Location affects crew travel, daylight, weather exposure, local availability and delivery dates. Keep currencies and costs modeled consistently; no automatic ethnicity-to-market-success bonuses.

When only climatic normals are available, call generated conditions simulated weather, not recorded weather for a past date. Unknown future weather is a forecast with uncertainty. Daylight and local midnight depend on location and date. A global time advance must not skip a deadline in another timezone.
