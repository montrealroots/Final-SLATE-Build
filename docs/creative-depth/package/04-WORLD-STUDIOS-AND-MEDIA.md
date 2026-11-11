# Worldwide Places, Studios And Visual Identity

## Places: where the story happens versus where it is filmed
Provide Country/Territory → Region → City/Area → Destination/Site with map and searchable lists. Use the existing geographic registry and its classifications; do not relabel all roughly 252 entries as sovereign countries. Preserve historic/nonplayable records and aliases. Browse every playable entry, not just wealthy film markets. Coverage is recorded per country and subdivision.

A real destination record includes source ID, names/aliases, coordinates, country/region, site type, relevant dates and precision, source/license and verification status. Start with existing GeoNames coverage and link Wikidata/official tourism or film-commission records where justified. Examples of site types: streets, neighborhoods, coastlines, forests, mountains, deserts, rail stations, ports, historic districts, civic spaces, markets, soundstages and backlots. These are categories, not claims every city contains all of them.

A known place is not necessarily bookable or open. Distinguish public geographic facts, researched filming information and a simulated scouting offer. Do not invent exact addresses, permission, real rental rates, open hours, accessibility or capacity. Where source coverage is absent, show a named real geographic area plus a clearly fictional candidate site; never pass off an invented venue as real. Every country gets an honest browse/fallback path, not fake equal venue counts.

Scouting loop: scene requirements → candidate places → scout date/travel → assessments → permits/owner inquiry → site offer → feasibility → booking → weather/daylight and holiday plan → backup → shoot → reset/return → invoice/credit. Evaluate space, visual fit, sound, crew access, power, accommodation/travel needs only to the extent modeled. Keep taxes/visa systems outside this scope. Regulatory facts require current local sources; uncertain permits become explicitly modeled lead times rather than legal guidance.

Integrate existing three-way real/stage/stand-in choice with actual candidate records; do not preserve a generic same-price template as the only location depth. Stage sets may avoid outdoor weather but still need construction, facility availability and power. A stand-in changes travel, dressing and possible continuity requirements. Never promise a stage can never fail.

Locations across several countries must produce distinct travel and production calendars. Separate story geography from shoot geography: a studio can portray a foreign place with appropriate design work. Fictional towns can exist inside a sourced region without overwriting its real map.

## Remaining studios and complete relationship graphs
Preserve Disney and NBCUniversal. Next scope: Warner Bros., Sony Pictures and Paramount families, including film labels, relevant TV producers and linked networks/services. These are discovery targets, not a frozen assertion of current parent ownership. Verify current and historical names, acquisitions, closures and corporate changes at implementation time from official sources. Expand international and independent groups through a coverage ledger after the major-five scope; never label five Hollywood groups as the whole world.

For every group resolve production-company IDs, aliases, historical labels, corporate parent and effective dates. Trace actual title production/distribution relationships; availability on a streaming service does not prove production or ownership. Include movie and series records, shorts and video formats where documented and appropriate; do not accidentally omit them through discovery defaults. Record selected filters and exclusions. Adult-content discovery should respect the project's existing content policy rather than silently changing it to boost counts.

Import all accessible credits for declared scope. Continue pagination, reconcile totals, deduplicate, resume failures and audit historical company aliases. People credited across titles are shared globally. Gather person details lazily or in resumable shards; don't claim full biographies for records containing only names. Show independent official-catalog reconciliation separately from API completeness. Refresh fields without silently altering in-progress careers.

Leadership: role, person, company/division, exact title, start/end/announcement dates and source precision. Known and incoming leaders differ; unknown effective dates stay unknown. Connect leadership to decision offices only when job responsibilities are sourced or game-modeled explicitly. No fabricated personal preference attributed to a real executive.

## Distinct studio behavior
Each simulated studio needs a versioned strategy profile: project families, genre/medium history, audience positioning, budget bands (modeled unless sourced), geographic reach, production/distribution roles, slate capacity, acquisition appetite, release windows and franchise/standalone balance. Documentary uncertainty and sparse data do not become zero interest.

Pitch → mandate/eligibility fit → available slot → materials → review → notes/pass/option → development → revisions → financing/greenlight → production oversight → delivery → territory/window plan → release → receipts and backer settlement → next slate decision.

Offers should read actual project fit, delivery readiness, rights, language, territories, track record and slate capacity. Do not select a company solely by how many titles it released. Preserve a credible path for first-time filmmakers and independent/self-funded productions; an impressive logline alone cannot guarantee a studio deal. Choosing an animation studio for an incompatible job should yield a useful explanation or an appropriate partner route.

Release plans vary by country and channel with staggered dates, distribution rights, dubbing/subtitles, delivery readiness, local calendars, competition and marketing lead time. A film need not open everywhere. Dates and windows are game decisions unless sourced. Only generate demand in territories actually reached. Cinema coverage must not stand in for national market size. Venue-level simulated bookings and modeled aggregate theatrical demand must reconcile without double-counting receipts.

Competition uses coherent fictional works with medium/format/runtime, credits and eligible release history. Category eligibility is evaluated through the same rule engine as the player's work where supported; do not send every generated film into every award. News, calendars, company pages and awards display the same entity. Do not create unrelated copies with different release dates.

## Photos, portraits, posters and logos
User requests real profile pictures and title artwork from TMDB where available and permitted, through optional mod packs. Implement the plumbing and loading even if particular assets lack clearance. The pack must not magically convert access into ownership of every image.

Use documented image configuration plus returned profile/poster/backdrop paths. Choose appropriately sized assets; don't fetch original-resolution photos for every list card. Prefer neutral placeholders for missing/unavailable images. Never generate a fake photograph of a real credited person and call it sourced.

Store image identity, subject ID, provider, retrieval/expiry, rights/attribution status, dimensions, locale, URL/path and cache policy. Keep permitted attribution in About/Credits and asset details. Facts and image permissions have different licenses; Wikidata CC0 does not make every linked Commons photograph CC0. Check each image's license where required. Respect existing owner-only TMDB policy; do not distribute private packs in the public repo or enable public use by changing a label.

Optional image pack is separate from metadata: selected studios/people, size tiers, projected download/storage amount, progress, cancel/resume, removal and refresh. Load thumbnails only for visible rows, use fixed aspect ratios and lazy decoding, support reduced data, and avoid layout shifts. Mod install and removal do not change world outcomes. A photograph itself is informational, not an ability bonus.

Never place private authentication in image URLs, generated HTML or client requests. Do not broaden a TMDB API bearer credential to unrelated hosts. Support expiry and purge across disk, HTTP cache, IndexedDB and in-memory caches. Long-open pages must not keep an expired pack indefinitely. Verify owner routes directly, not only through a hidden UI button.

## Save and storage constraints
Existing packs already occupy over 100 MB in browser storage; adding hundreds of thousands of photos unconditionally is unacceptable. Measure quotas, offer uninstall controls, retain core saves when packs are removed, and keep minimum immutable simulation state sufficient to continue a career under the chosen retention policy. Catch quota failures before replacing a working pack. Atomic installation must preserve the old usable version on interruption.
