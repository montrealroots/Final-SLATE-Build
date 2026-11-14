# Research findings

Checked November 13, 2026. Findings below are paraphrases; decisions are proposed game behavior, not external industry formulas. Source limits and unknowns are retained.

## TM01 — TMDB daily ID exports

Evidence: primary; retrieval: retrieved.

Daily compressed files contain line-delimited ID records, not complete details. Exports cover movies, series, people, collections, networks, keywords and production companies. Files are normally available by 08:00 UTC and retained for three months.

**SLATE decision:** Use exports for inventory; fetch details separately. A current inventory cannot reconstruct the January catalog.

Source: https://developer.themoviedb.org/docs/daily-id-exports

## TM02 — TMDB change tracking

Evidence: primary; retrieval: retrieved.

Movie, person and TV changed-ID lists default to the preceding day and can cover up to fourteen days. Individual changes provide field-level information.

**SLATE decision:** Checkpoint updates; a longer outage requires reconciliation. Do not claim an unlimited historical archive.

Source: https://developer.themoviedb.org/docs/tracking-content-changes

## TM03 — TMDB API FAQ

Evidence: primary; retrieval: retrieved.

Noncommercial API use requires attribution. Commercial use requires contacting TMDB. Approved logo and a non-endorsement notice belong in an About or Credits section. No service-level guarantee is provided.

**SLATE decision:** Provide Settings → Credits, approved logo and required notice; API access does not grant every underlying media right.

Source: https://developer.themoviedb.org/docs/faq

## TM04 — TMDB rate limiting

Evidence: primary; retrieval: retrieved.

The former ten-second limit was removed. Current protective limits are roughly forty requests per second and may change; clients must honor HTTP 429.

**SLATE decision:** Default to a conservative bounded request rate; retry/backoff is mandatory, not permission to scrape aggressively.

Source: https://developer.themoviedb.org/docs/rate-limiting

## TM05 — TMDB movie watch providers

Evidence: primary; retrieval: retrieved.

The endpoint supplies country-specific provider availability using JustWatch data, requires JustWatch attribution, and does not supply full content deep links.

**SLATE decision:** Keep availability distinct from ownership, commissioning and historical window evidence; retain provided TMDB link.

Source: https://developer.themoviedb.org/reference/movie-watch-providers

## TM06 — TMDB image URL construction

Evidence: primary; retrieval: retrieved.

Image URLs combine configured base URL, supported size and record path. Company/network SVG logos use original size; PNG alternatives are supported.

**SLATE decision:** Cache configuration, deduplicate paths and use measured pack sizes. Do not assume all people have portraits.

Source: https://developer.themoviedb.org/docs/image-basics

## TM07 — Movie details

Evidence: primary; retrieval: retrieved.

Movie detail supports append_to_response with up to twenty appended endpoints.

**SLATE decision:** Documented API path: /movie/{movie_id}. Store stable IDs and versioned retrieval dates; no authenticated catalog call was made here.

Source: https://developer.themoviedb.org/reference/movie-details

## TM08 — Series details

Evidence: primary; retrieval: retrieved.

Series detail supports append_to_response.

**SLATE decision:** Documented API path: /tv/{series_id}. Store stable IDs and versioned retrieval dates; no authenticated catalog call was made here.

Source: https://developer.themoviedb.org/reference/tv-series-details

## TM09 — Aggregate series credits

Evidence: primary; retrieval: retrieved.

Aggregate credits cover cast and crew across episodes, rather than only the newest season.

**SLATE decision:** Documented API path: /tv/{series_id}/aggregate_credits. Store stable IDs and versioned retrieval dates; no authenticated catalog call was made here.

Source: https://developer.themoviedb.org/reference/tv-series-aggregate-credits

## TM10 — Person combined credits

Evidence: primary; retrieval: retrieved.

Combined credits cover a person’s movie and television work.

**SLATE decision:** Documented API path: /person/{person_id}/combined_credits. Store stable IDs and versioned retrieval dates; no authenticated catalog call was made here.

Source: https://developer.themoviedb.org/reference/person-combined-credits

## TM11 — Movie release dates

Evidence: primary; retrieval: retrieved.

Release types are premiere=1, limited theatrical=2, theatrical=3, digital=4, physical=5, TV=6.

**SLATE decision:** Documented API path: /movie/{movie_id}/release_dates. Store stable IDs and versioned retrieval dates; no authenticated catalog call was made here.

Source: https://developer.themoviedb.org/reference/movie-release-dates

## TM12 — Season details

Evidence: primary; retrieval: retrieved.

Season detail is separately addressable by series and season number.

**SLATE decision:** Documented API path: /tv/{series_id}/season/{season_number}. Store stable IDs and versioned retrieval dates; no authenticated catalog call was made here.

Source: https://developer.themoviedb.org/reference/tv-season-details

## MET01 — Nielsen public Top Ten

Evidence: primary; retrieval: retrieved.

The retrieved streaming chart reports U.S. television viewing for persons aged two and older, ranked by minutes. Its visible period was October 26–November 1, 2026.

**SLATE decision:** Preserve geography, device scope and units. Never equate minutes with unique people or Netflix views.

Source: https://www.nielsen.com/data-center/top-ten/

## MET02 — Netflix Top Ten methodology update

Evidence: primary; retrieval: retrieved.

The June 2023 update ranks by views computed from hours divided by runtime and extends most-popular measurement to 91 days. Weekly periods run Monday–Sunday and results publish Tuesday; seasons are measured separately. Older text on the same page describes superseded metrics.

**SLATE decision:** Version methodology by effective date. Do not apply the older hours ranking or 28-day window to current records.

Source: https://about.netflix.com/en/news/top-10-things-about-netflix-top-10

## MET03 — Netflix current weekly chart

Evidence: primary; retrieval: retrieved.

The retrieved English-language global film chart covers November 2–8, 2026 and displays rounded millions of views.

**SLATE decision:** Included values preserve display precision. Publication availability is inferred from MET02 and marked accordingly, not claimed observed.

Source: https://www.netflix.com/tudum/top10

## MET04 — Netflix most-popular film chart

Evidence: primary; retrieval: retrieved.

The retrieved chart describes first-91-day views rather than unlimited lifetime viewing.

**SLATE decision:** Do not label this a lifetime total or mix it with annual television audience rankings.

Source: https://www.netflix.com/tudum/top10/most-popular

## BOX01 — The Numbers data access

Evidence: primary; retrieval: retrieved.

OpusData is a subscription-based structured data service covering dated box-office measures. The public site permits personal reference but reserves systematic copying, scraping and redistribution for licensed customers.

**SLATE decision:** No bulk box-office scrape is included. Accept a licensed import or separately authorized data. Full 2026 box-office replay remains a data-access gap.

Source: https://www.the-numbers.com/data-services

## REL01 — Netflix pitch policy

Evidence: primary; retrieval: retrieved.

Netflix does not accept unsolicited material directly. Pitches require an appropriate representative with an existing relationship; acquisition can also occur through festivals and other established venues.

**SLATE decision:** Expose represented pitch and acquisition routes, not guaranteed direct upload; keep acceptance uncertain.

Source: https://help.netflix.com/en/node/100386

## REL02 — Prime Video Direct landing

Evidence: primary; retrieval: retrieved.

Prime Video Direct describes rent/buy distribution with no setup or recurring submission-management charge.

**SLATE decision:** Submission fee zero does not imply zero delivery costs or guaranteed publication.

Source: https://videodirect.amazon.com/home/landing/

## REL03 — Prime licensing and review

Evidence: primary; retrieval: retrieved.

Prime distinguishes rent/buy consideration from solicited subscription licensing. Publication is discretionary; eligibility does not guarantee acceptance or a date. Performance reviews can remove titles.

**SLATE decision:** Separate TVOD submission, SVOD invitation, review and removal states. No automatic subscription listing on upload.

Source: https://videocentral.amazon.com/support/delivery-experience/licensing-rights-and-avails/self-publishing-contracts

## REL04 — Apple approved delivery partners

Evidence: primary; retrieval: retrieved.

Aggregators can deliver and manage transactional titles and receive Apple payments before paying owners. Direct delivery requires an agreement; approved encoding houses handle delivery.

**SLATE decision:** Model Apple transactional delivery separately from Apple subscription commissioning. Track aggregator receivable and settlement.

Source: https://itunespartner.apple.com/tv-movies/support/5407-encoding-houses-aggregators

## REL05 — Apple territory language requirements

Evidence: primary; retrieval: retrieved.

Transactional delivery requirements depend on storefront language assets for the full film and preview. Noncompliance is surfaced in title and rights/pricing details.

**SLATE decision:** A territory release requires applicable language delivery; subtitle choices have costs and eligibility effects.

Source: https://itunespartner.apple.com/tv-movies/support/5344-movies-minimum-storefront-requirements

## REL06 — Vimeo On Demand seller instructions

Evidence: primary; retrieval: retrieved.

The retrieved page announces closure on November 20, 2026, and says new subscriptions/renewals are disabled after September 21, 2026. It points new sellers toward Vimeo OTT.

**SLATE decision:** Treat this as a dated winding-down service, not an evergreen route. Announcement date is not established here; do not expose the notice in January by guessing.

Source: https://help.vimeo.com/hc/en-us/articles/12427367616913-How-to-start-selling-with-Vimeo-On-Demand

## REL07 — Vimeo On Demand charges

Evidence: primary; retrieval: retrieved.

The seller share is ninety percent after transaction costs, not ninety percent of every gross purchase without deductions.

**SLATE decision:** Use separate cost and share bases. This is a reference fact, not authorization to add a full tax engine.

Source: https://help.vimeo.com/hc/en-us/articles/12427353166865-Fees-and-taxes-on-Vimeo-on-Demand

## REL08 — YouTube Partner Program

Evidence: primary; retrieval: retrieved.

The retrieved page lists 1,000 subscribers plus either 4,000 qualifying annual watch hours or ten million qualifying Shorts views in ninety days, with review and policy requirements. It also announces a 2027 terms change.

**SLATE decision:** Uploading alone does not earn ad revenue. Preserve current and announced-future policy versions; no guaranteed RPM or revenue.

Source: https://support.google.com/youtube/answer/72851?product=sales

## DEAL01 — WB Shyamalan announcement

Evidence: primary; retrieval: retrieved.

On February 16, 2023, Warner announced a multi-year directing/producing first-look arrangement involving M. Night Shyamalan and Blinding Edge Pictures, for Warner Bros. Pictures and New Line projects.

**SLATE decision:** Use as a historical film-deal precedent, not proof it remains active in 2026 or a source of exact financial terms. Discard the page’s implausible box-office typo.

Source: https://press.wbd.com/na/media-release/warner-bros-pictures/warner-bros-pictures-seals-multi-year-first-look-pact-oscar-nominated-filmmaker-m

## DEAL02 — WBTV Paul Feig announcement

Evidence: primary; retrieval: retrieved.

On April 22, 2025, WBTV announced a multi-year first-look television agreement with Paul Feig and Laura Fischer through Feigco, covering multiple production forms and platforms. Financial terms were undisclosed.

**SLATE decision:** TV scope may span scripted, unscripted and animation. Retain unknown term expiry and money; simulated offers must say their numbers are modeled.

Source: https://press.wbd.com/ca/media-release/paul-feig-signs-first-look-deal-warner-bros-television-group?language_content_entity=en

## DEAL03 — Sony Appian Way announcement

Evidence: primary; retrieval: retrieved.

Sony announced a multi-picture, multi-year scripted-feature first-look agreement with Appian Way on August 13, 2020.

**SLATE decision:** Historical precedent only; do not set a current agreement, expiry or fee from this announcement.

Source: https://www.sonypictures.com/corp/press_releases/2020/0813

## DEAL04 — Sony–Netflix window agreement

Evidence: primary; retrieval: retrieved.

The 2021 announcement describes a U.S. pay-one window after theatrical/home-entertainment releases beginning with the 2022 slate, plus a direct-streaming first look.

**SLATE decision:** Distinct territory, window and agreement scope are necessary; this announcement does not establish all current global rights.

Source: https://www.sonypictures.com/corp/press_releases/2021/0408

## AW01 — 98th Oscars results

Evidence: primary; retrieval: retrieved.

The ceremony took place March 15, 2026 and honored 2025 releases. Included reference records transcribe the four acting categories only.

**SLATE decision:** Nomination and win are separate events. Four complete acting categories are not the full Oscars roster.

Source: https://www.oscars.org/oscars/ceremonies/2026

## AW02 — 98th nominations announcement

Evidence: primary; retrieval: retrieved.

Nominations were announced January 22, 2026; the ceremony was scheduled for March 15.

**SLATE decision:** Gate nominee visibility from January 22 and winner visibility from ceremony date; exact result timestamps are not supplied.

Source: https://press.oscars.org/news/98th-oscarsr-nominations-announced

## AW03 — 98th general and Best Picture eligibility

Evidence: primary; retrieval: retrieved.

General-entry features exceed forty minutes and require a qualifying seven-day theatrical run in a listed U.S. metro during 2025. Best Picture has additional representation/inclusion and expanded-release requirements.

**SLATE decision:** Do not equate general-entry eligibility with Best Picture eligibility or apply 2025 windows to 2026 productions.

Source: https://press.oscars.org/news/317-feature-films-contention-98th-academy-awardsr

## AW04 — 98th complete rules

Evidence: primary; retrieval: retrieved.

Animated-feature rules specify more than forty minutes and animation of primary subjects for at least seventy-five percent of runtime excluding credits. Multiple qualification routes exist.

**SLATE decision:** Animation is not a binary tag sufficient to qualify. The included rule extract is partial; missing rule branches remain unknown.

Source: https://www.oscars.org/sites/oscars/files/2025-04/98th_aa_complete_rules.pdf

## AW05 — 78th Emmy calendar

Evidence: primary; retrieval: retrieved.

Eligibility runs June 1, 2025–May 31, 2026. Entries close May 7; general nominations July 8; some panel nominations July 15; Creative Arts September 5–6; telecast September 14.

**SLATE decision:** Use distinct edition/calendar events. Version one is the retrieved document, not proof of no later amendments.

Source: https://www.televisionacademy.com/files/assets/Downloads/2026-rules-procedures-v1.pdf

## AW06 — International Emmy 2026 checklist

Evidence: primary; retrieval: retrieved.

The checklist identifies first broadcast/screening/streaming during January–December 2025, primarily non-U.S. production and initial non-U.S. or simultaneous release; entry deadline January 31, 2026.

**SLATE decision:** This resolves the earlier missing eligibility-period issue. Checklist is not a complete category rulebook.

Source: https://www.iemmys.tv/wp-content/uploads/2026/01/2026-Entry-Materials-Checklist.pdf

## AW07 — 78th Emmy comedy series results

Evidence: primary; retrieval: retrieved.

The retrieved category page identifies Widow’s Bay, Apple TV, as winner.

**SLATE decision:** Program result only in this package; do not assign all listed producers awards without importing the full recipient record.

Source: https://www.televisionacademy.com/awards/nominees-winners/2026/outstanding-comedy-series

## AW08 — 78th Emmy drama series results

Evidence: primary; retrieval: retrieved.

The retrieved category page identifies The Pitt, HBO Max, as winner.

**SLATE decision:** Preserve category and service label as recorded; do not infer ownership from the service.

Source: https://www.televisionacademy.com/awards/nominees-winners/2026/outstanding-drama-series

## AW09 — 78th Emmy limited/anthology results

Evidence: primary; retrieval: retrieved.

The retrieved category page identifies DTF St. Louis, HBO Max, as winner.

**SLATE decision:** Keep limited/anthology category distinct from drama series. Included data is not all Emmys competitions.

Source: https://www.televisionacademy.com/awards/nominees-winners/2026/outstanding-limited-or-anthology-series

## AW10 — BAFTA 2026 announcement

Evidence: primary; retrieval: retrieved.

BAFTA announced film winners on February 22, 2026. One Battle After Another won Best Film; performance winners include Jessie Buckley, Robert Aramayo, Sean Penn and Wunmi Mosaku.

**SLATE decision:** Separate Best Film and acting recognition; only included verified records count as imported.

Source: https://www.bafta.org/media-centre/press-releases/winners-announced-2026-film-awards/

## AW11 — BAFTA 2026 category results

Evidence: primary; retrieval: retrieved.

The score nominees identify Ludwig Göransson/Sinners, Jerskin Fendrix/Bugonia, Alexandre Desplat/Frankenstein, Max Richter/Hamnet and Jonny Greenwood/One Battle After Another.

**SLATE decision:** These support real composer identities and work credits, not fees, availability or skill ratings.

Source: https://www.bafta.org/awards/film/?award-year=2026

## FEST01 — Cannes 2026 results

Evidence: primary; retrieval: retrieved.

The May 23 results include Fjord for the Palme d’Or and Minotaure for the Grand Prix. Best Director is shared between La Bola Negra’s directors and Fatherland’s director.

**SLATE decision:** Allow multiple recipients and tied winning works; not one winner per category in all cases.

Source: https://www.festival-cannes.com/en/press/press-releases/the-79th-festival-de-cannes-winners-list/

## FEST02 — Cannes feature rules 2026

Evidence: primary; retrieval: retrieved.

Selection criteria include production in the preceding twelve months, restrictions on international festival/foreign/Internet exhibition, and a French theatrical-release commitment for Competition features.

**SLATE decision:** Check premiere history and section-specific obligations before submission. Eligible does not mean selected.

Source: https://www.festival-cannes.com/en/take-part/submit-a-film/feature-films-in-official-selection/

## FEST03 — Cannes short rules 2026

Evidence: primary; retrieval: retrieved.

Competition shorts cannot exceed fifteen minutes including credits and have prior-exhibition restrictions.

**SLATE decision:** Do not apply the feature or Oscars runtime definition to Cannes shorts; boundaries differ by edition/section.

Source: https://cdn.festival-cannes.com/media/uploads/2025/11/reglement_courts-metrages_2026-en.pdf

## FEST04 — Venice 83 official results

Evidence: primary; retrieval: retrieved.

The September 12, 2026 announcement awards the Golden Lion to Woman Unknown and Grand Jury Prize to Possible Love.

**SLATE decision:** Included result records are selected examples, not full sections or all festival nominations.

Source: https://www.labiennale.org/en/news/official-awards-83rd-venice-international-film-festival

## FEST05 — Sundance 2026 awards announcement

Evidence: primary; retrieval: retrieved.

January 30 results identify Josephine, Nuisance Bear, Shame and Money and To Hold a Mountain as the four competition grand-jury winners.

**SLATE decision:** Separate four competition identities and retain announcement date.

Source: https://www.sundance.org/blogs/2026-sundance-film-festival-announces-award-winners

## FEST06 — SXSW 2026 jury awards

Evidence: primary; retrieval: retrieved.

March 18 announcement identifies Wishful Thinking as narrative feature jury winner and states audience voting/results follow a distinct schedule.

**SLATE decision:** Do not assign audience recognition on the jury announcement date.

Source: https://sxsw.com/wp-content/uploads/2026/03/2026-FTV-Jury-Special-Awards.pdf

## FEST07 — TIFF 2026 reporting

Evidence: secondary; retrieval: retrieved.

Trade reporting identifies La Bola Negra as People’s Choice winner and distinguishes runners-up and other prizes. An official TIFF result page was not obtained in this pass.

**SLATE decision:** Secondary evidence only; keep in research ledger, not verified-primary event seeds.

Source: https://www.thewrap.com/industry-news/awards/la-bola-negra-wins-tiff-peoples-choice-award/

## PROD01 — ScreenSkills animation model maker

Evidence: primary; retrieval: retrieved.

Stop-motion model makers construct physical characters and objects; CG modellers create digital assets that can be rigged. Size, materials, timing and budget constrain designs.

**SLATE decision:** Build separate physical fabrication and digital model/rig tasks. Shared asset IDs propagate revisions into dependent shots.

Source: https://www.screenskills.com/job-profiles/browse/animation/pre-production/modeller-model-maker/

## PROD02 — ScreenSkills production manager

Evidence: primary; retrieval: retrieved.

Production managers organize schedules/budgets, breakdowns and resources; duties vary with production scale and genre.

**SLATE decision:** A hire changes scheduling capacity and delegated tasks, not a universal quality bonus.

Source: https://www.screenskills.com/skills-checklists/scripted-film-and-tv/production-department/production-manager-skills/

## PROD03 — ScreenSkills VFX animator

Evidence: primary; retrieval: retrieved.

VFX animation integrates with live-action plates and camera positions. Motion capture transfers performance into character animation.

**SLATE decision:** Plate/version/capture dependencies differ from voice casting and ordinary live-action acting.

Source: https://www.screenskills.com/job-profiles/browse/visual-effects-vfx/computer-generated/animator-visual-effects-vfx/

## PROD04 — ScreenSkills line producer

Evidence: primary; retrieval: retrieved.

Line production includes crew, money and shoot completion, followed by handoff to post-production supervision.

**SLATE decision:** Keep hiring, resource control, wrap and finishing responsibilities explicit.

Source: https://www.screenskills.com/job-profiles/browse/film-and-tv-drama/production-management/line-producer-film-and-tv-drama/

## MUS01 — Copyright Office audiovisual music explanation

Evidence: primary; retrieval: retrieved.

Composition synchronization and recording master-use permissions are separate. Audiovisual synchronization does not use the mechanical compulsory-license route.

**SLATE decision:** Metadata selection is not permission to distribute audio. Simulated clearance gameplay and actual package media rights are separate.

Source: https://www.copyright.gov/music-modernization/educational-materials/musicians-income.pdf?loclr=blogcop

## MUS02 — CMRRA synchronization FAQ

Evidence: primary; retrieval: retrieved.

Synchronization permissions are individually negotiated with the publisher or copyright owner; CMRRA does not currently provide that service.

**SLATE decision:** Do not install universal artist pay rates or a guaranteed one-price clearance button.

Source: https://www.cmrra.org/faq/synchronization-licensing/

## MUS03 — Decca Hamnet soundtrack

Evidence: primary; retrieval: retrieved.

The label identifies Max Richter’s Hamnet score and lists a January 9, 2026 product release date.

**SLATE decision:** This is a soundtrack-product date, not automatically the film premiere or first availability of every recording.

Source: https://maxrichter.decca.com/collections/all-music/products/hamnet-original-motion-picture-soundtrack

## MUS04 — Recording Academy Sinners album

Evidence: primary; retrieval: retrieved.

The Recording Academy identifies Ludwig Göransson and Sinners as a 2026 score-soundtrack winner.

**SLATE decision:** Can substantiate composer/work link; ceremony date and full category roster are not imported here.

Source: https://www.grammy.com/albums/sinners-2/

## BOOK01 — Macmillan Elantris

Evidence: primary; retrieval: retrieved.

Publisher description identifies Raoden, Sarene and Hrathen, with Elantris/Kae in Arelon central to the story.

**SLATE decision:** Replace Hoid-only autofill with a structured multi-viewpoint correction; never infer sole lead from name count.

Source: https://us.macmillan.com/books/9780765350374/elantris/

## BOOK02 — Sanderson standalone overview

Evidence: primary; retrieval: retrieved.

The author describes Elantris through three interweaving viewpoints: Raoden, Sarene and Hrathen.

**SLATE decision:** The source itself supports an ensemble approach; antagonist/ally labels are interpretive and remain editable.

Source: https://www.brandonsanderson.com/pages/standalones-cosmere

## BOOK03 — Sanderson Warbreaker annotation

Evidence: primary; retrieval: retrieved.

The author contrasts Vivenna’s disruptive character change with Siri’s more gradual development.

**SLATE decision:** A single global pacing label cannot fully describe multiple arcs; keep character-level progression separate.

Source: https://www.brandonsanderson.com/blogs/blog/annotation-warbreaker-chapter-forty-three

## CAM01 — ARRI ALEXA 35 technical page

Evidence: primary; retrieval: retrieved.

The manufacturer specifies a Super 35 sensor with 4608×3164 photosites and seventeen stops; supported maximum rates depend on recording mode/media.

**SLATE decision:** Store mode-specific constraints. Do not combine maximum resolution and maximum frame rate into a nonexistent mode.

Source: https://www.arri.com/en/cine-systems/cine-cameras/legacy-cine-cameras/alexa-35

## CAM02 — Sony FX3 launch

Evidence: primary; retrieval: retrieved.

Sony describes the FX3 as a compact full-frame camera supporting up to 4K120p and an XLR handle.

**SLATE decision:** Use for mobility/capture choices; no manufacturer evidence of automatic creative-quality points.

Source: https://sony.mediaroom.com/2021-02-23-Sony-Electronics-Launches-FX3-Full-Frame-Camera-for-Cinematic-Look-and-Enhanced-Operability-for-Creators

## CAM03 — Blackmagic 6K Pro specifications

Evidence: primary; retrieval: retrieved.

6K Pro specifies active EF mount, Super 35 sensor, thirteen stops and 6144×3456 up to fifty fps. Higher frame rates use different formats.

**SLATE decision:** Lens compatibility and mode restrictions are real; current advertised prices are not historical prices.

Source: https://www.blackmagicdesign.com/products/blackmagicpocketcinemacamera/techspecs

## CAM04 — Netflix camera requirements relocation

Evidence: primary; retrieval: content_not_retrieved.

The previous camera-documentation URL redirects to a JavaScript application whose requirements were not readable in this retrieval.

**SLATE decision:** Do not certify every listed camera as Netflix-approved or apply branded production requirements to all acquisitions.

Source: https://studiopartner.netflix.net/studio/branded-cameras-and-image-capture

## UI01 — W3C minimum target-size explanation

Evidence: primary; retrieval: retrieved.

WCAG 2.2 minimum target guidance uses twenty-four by twenty-four CSS pixels with defined exceptions. User zoom alone does not satisfy target-size requirements.

**SLATE decision:** Audit controls at rendered scale; choose a larger comfortable touch design target without mislabeling it a mandatory standard.

Source: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum

## UI02 — W3C reflow explanation

Evidence: primary; retrieval: retrieved.

Reflow guidance discusses vertically scrolling content at 320 CSS pixels, with applicable exceptions for inherently two-dimensional content.

**SLATE decision:** Keep desktop-like hierarchy on phones but test reflow and contained tables; shrinking everything is not proof of accessibility.

Source: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
