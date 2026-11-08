# SLATE Complete Gameplay Depth Specification

Prepared for Final-SLATE-Build. Planning snapshot: 2026-11-07 (America/Chicago).

This is the full 20-area scope agreed in this conversation, decomposed into 100 traceable feature groups. It is a design and acceptance specification, not a claim that these features are implemented or that every conceivable industry process is enumerated. Each group must be expanded into its concrete controls and transitions during repository reconciliation; no group may be silently omitted. The last reviewed repository checkpoint was b025147 / PR #38. Fetch the current repository before applying it.

## Governing rules

- One coding agent only. No subagents, delegated agent workflows or parallel agents. Ordinary tests and CI remain allowed.
- Extend the current game; do not rebuild from scratch, replace its visual identity, or discard existing working behavior.
- Screenwriter, producer, director and actor/actress are all available from the beginning. Actual contributions determine project credits; acting is optional.
- Preserve chosen pronouns and acting title. Multiple ethnicities and languages are supported. Never infer skills, personality or language ability from ethnicity.
- Real-time clock: 1 real second = 1 game second while the defined session is active. No offline progression; retain advance and sleep. No manual play/pause button. Necessary decision or error holds are explicit.
- Player may start on a valid date in 2026. World dates, timezone, seasons, holidays, weather and events share one authoritative timeline. Repetition that is true to reality is allowed; do not randomize dates or weather merely to force novelty.
- Keep the current world's country/territory distinctions; do not call 252 catalog entries 252 sovereign countries. Preserve the imported geography and its provenance. Do not invent missing places or official dates.
- No new tutorial, personal housing, banking, taxes, visas, or attribute-progression system in this package. Project finance, necessary production logistics and supported contractual obligations are in scope. Do not reintroduce discarded systems.
- UI mirrors desktop capability in mobile form, not a shrunken desktop layout. Target iPhone 15 Plus and 15 Pro Max and larger screens, while preventing failures on narrower supported viewports. Existing 1221-derived layout and established title-case rules are the reference, not permission to import absent systems.
- Every mechanic must have justified effects. Creative text and identity may serve persistent expressive purposes without numerical bonuses. Do not award quality for typing, clicking revisions, or choosing a demographic identity.
- No invented semantic evaluation of prose. Structured declarations drive deterministic rules; written content remains the player's work. This package does not authorize paid model APIs or an in-game LLM dependency.
- Research supports implementation; sources and technical audit statuses belong in developer records, not cluttered gameplay screens. Players still need honest wording for modeled estimates and uncertain planning dates.
- Do not promise unlimited physical capacity, universal real-world completeness, perfect balance or zero defects. Provide extensible data models, grounded choices and evidence.

## Contract for every leaf

Expand each feature group into child IDs such as SLATE-06-05.01. For each child record: entry point; actor; prerequisites; visible information; inputs; validation; state before/after; cost; time; reservation and ownership rules; upstream references; downstream invalidation; cancellation; failure; recovery; persistence; copy; accessibility; research status; engine test and browser evidence. Mark inapplicable fields with a reason. A field with no mechanical effect may be an expressive record; say so explicitly.

Each commitment must be atomic or explicitly staged. Stable IDs connect characters, drafts, scenes, assets, participants, deals, events, versions, submissions and payments. Do not store display names as primary keys. Significant revisions preview affected work before confirmation. Keep historical snapshots instead of mutating submitted or released versions.


## 01. Identity And Creation

### SLATE-01-01 — Identity

- **Inner loop:** Enter name, pronouns and acting title; preview; edit; confirm.
- **Downstream effects:** Names and wording propagate into dialogue labels, contracts, credits and history.
- **Failure and recovery:** Invalid or unsupported input stays editable without clearing other entries.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-01-02 — Background And Languages

- **Inner loop:** Select multiple ethnicities; select primary and additional languages with proficiency; review custom entries.
- **Downstream effects:** Chosen language proficiency informs appropriate communication and casting requirements; heritage remains identity, never an automatic ability bonus.
- **Failure and recovery:** Duplicates and unsupported entries get a clear correction path; suggestions never silently select fluency.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-01-03 — Starting Circumstances

- **Inner loop:** Choose birthplace, starting place, birthday and valid 2026 date/time; preview local context.
- **Downstream effects:** Initial timezone, calendar, weather and birthdays use the selected place and date.
- **Failure and recovery:** Invalid dates and unavailable location data prevent confirmation with retry or editing.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-01-04 — Four Professions

- **Inner loop:** Make screenwriting, producing, directing and acting available immediately; choose participation per project.
- **Downstream effects:** Actual work creates credits; simultaneous roles create scheduling and responsibility constraints.
- **Failure and recovery:** Leaving a role requires a replacement or a clear blocked dependency, not lost authorship.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-01-05 — Review And Draft

- **Inner loop:** Save creation draft; inspect each field; edit from Review; return; start.
- **Downstream effects:** One authoritative creation record becomes the save; draft survives interruption.
- **Failure and recovery:** Validation preserves input; recovery never opens the wrong step or creates duplicate lives.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 02. World And Time

### SLATE-02-01 — Active Clock

- **Inner loop:** Run at one real second per game second during the defined active session; save time; close and reopen.
- **Downstream effects:** Every engine reads one authoritative instant and derives local time.
- **Failure and recovery:** No offline catch-up; no double counting from duplicate tabs; define hidden-tab and device-suspension behavior explicitly.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-02-02 — Advance And Sleep

- **Inner loop:** Choose duration or destination; preview intervening commitments; process events in order; stop at required decisions.
- **Downstream effects:** Deadlines, work, weather, fatigue if explicitly in scope, and calendar updates share elapsed time.
- **Failure and recovery:** Rollback failed event batches; resume safely without repeating payments or losing events; no manual play/pause control.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-02-03 — Geography And Travel

- **Inner loop:** Find country or territory, region and city; inspect production relevance; arrange necessary travel.
- **Downstream effects:** Location affects timezone, weather, daylight, holidays and arrival feasibility.
- **Failure and recovery:** Unavailable geography is identified; impossible arrival blocks attendance with reschedule options; no unrelated tourism or housing system.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-02-04 — Weather And Daylight

- **Inner loop:** Inspect forecast; schedule work; encounter conditions; move indoors, protect work or postpone.
- **Downstream effects:** Outdoor work, continuity, available daylight and production costs reflect conditions.
- **Failure and recovery:** Forecast uncertainty is visible; no identical weather everywhere; postponed work retains reservations and history correctly.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-02-05 — Calendar And Commitments

- **Inner loop:** Create or receive event; inspect; accept; get reminder; attend, decline, cancel or reschedule.
- **Downstream effects:** Birthdays, meetings, shoots, recordings, screenings and deadlines link to their actual activity.
- **Failure and recovery:** Conflicts name the affected commitments; meaningful event-specific buttons replace generic Go or Stand There.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 03. Project Conception

### SLATE-03-01 — Format And Medium

- **Inner loop:** Choose format, story approach, medium and technique as separate dimensions; inspect compatible combinations.
- **Downstream effects:** Feature, short, series, special, fiction, documentary, animation, live action and hybrid route into appropriate production.
- **Failure and recovery:** Unsupported combinations explain the constraint; do not silently convert the project.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-03-02 — Creative Identity

- **Inner loop:** Set title, multiple genres, tone, setting, audience and languages.
- **Downstream effects:** Genre conventions create relevant questions and explicit requirements; identity follows all project documents.
- **Failure and recovery:** No genre selection alone grants prestige or quality; preserve custom creative text.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-03-03 — Scope

- **Inner loop:** Set runtime, cast scale, locations and technical ambition; preview resource drivers.
- **Downstream effects:** Scenes and assets determine estimates, staffing and capacity.
- **Failure and recovery:** Overambitious scope remains editable; give concrete cost-reduction options.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-03-04 — Project Workspace

- **Inner loop:** Create concept; save; reopen; compare current state; archive or cancel deliberately.
- **Downstream effects:** Stable project ID connects documents, deals, participants, schedules and history.
- **Failure and recovery:** Cancellation settles commitments rather than deleting them; duplicate titles remain distinguishable.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-03-05 — Compatibility Review

- **Inner loop:** Explain applicable stages and conditional requirements before development.
- **Downstream effects:** A shared project model supports distinct medium pipelines.
- **Failure and recovery:** Every unsupported branch has an explicit status; never show an inert control as implemented.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 04. Story Development

### SLATE-04-01 — Concept And Intent

- **Inner loop:** Write premise, logline, question, stakes, themes and intended experience; revise.
- **Downstream effects:** Documents and creative reference use exact player text.
- **Failure and recovery:** Completeness can be checked; the engine must not pretend it understands prose quality.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-04-02 — Structure And Threads

- **Inner loop:** Create acts or sequences; establish turns; connect threads to scenes and characters; resolve or deliberately leave open.
- **Downstream effects:** Structure guides revision and editing dependencies.
- **Failure and recovery:** Broken links identify exact scenes; intentional unresolved threads remain valid choices.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-04-03 — Setups And Payoffs

- **Inner loop:** Declare setup, planting scene and payoff scene; inspect connection; change or remove.
- **Downstream effects:** Cutting or rewriting linked scenes creates specific editorial warnings.
- **Failure and recovery:** Restore a scene, relocate setup/payoff or explicitly revise the dependency.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-04-04 — Research And References

- **Inner loop:** Record factual questions and production references; attach notes; mark reviewed or uncertain.
- **Downstream effects:** Research informs explicit setting and production choices; provenance remains in developer records.
- **Failure and recovery:** Unverified claims remain unverified; blocked sources lead to alternate public primary sources, never invented verification.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-04-05 — Documents And Submissions

- **Inner loop:** Build outline, treatment, pitch and statement; review required fields; explicitly submit snapshot.
- **Downstream effects:** Backers and institutions receive the correct version with timestamp and requirements.
- **Failure and recovery:** Later edits do not rewrite previously sent documents; missing material names exact fields.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 05. Characters And Relationships

### SLATE-05-01 — Character Definition

- **Inner loop:** Create name, aliases, pronouns, age range, description and background; edit.
- **Downstream effects:** Stable character identity links scenes, casts, assets, episode appearances and credits.
- **Failure and recovery:** Renaming updates displays without breaking IDs or erasing history.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-05-02 — Size And Function

- **Inner loop:** Choose role size independently from narrative functions; allow multiple functions; choose award placement where applicable.
- **Downstream effects:** Billing, participation and category entries remain separate from protagonist or antagonist status.
- **Failure and recovery:** Supporting antagonist stays supporting unless placement changes; organizer-specific restrictions override generic defaults.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-05-03 — Type And Performance

- **Inner loop:** Choose human, animal, creature or other supported type; select on-camera, voice, capture, puppetry or combined methods.
- **Downstream effects:** Costume, makeup, creature assets, performers, stunts and recording work derive from explicit needs.
- **Failure and recovery:** Unsupported methods explain why; one method must not falsely fulfill another.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-05-04 — Arcs And Relationships

- **Inner loop:** Define objectives, obstacles and changes; establish directed relationships; connect beats to scenes.
- **Downstream effects:** Scene continuity and series development track declared changes.
- **Failure and recovery:** Deleting a character previews dependent relationships and scenes; remap or deliberately remove.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-05-05 — Appearance Breakdown

- **Inner loop:** Assign scenes and episodes; review screen participation and requirements.
- **Downstream effects:** Casting days, regular/guest commitments, costume continuity and credits reflect actual work.
- **Failure and recovery:** A character with no production participation must not generate unexplained fees or credits.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 06. Scenes And Drafts

### SLATE-06-01 — Scene Setup

- **Inner loop:** Choose episode, sequence, location, interior/exterior, day/night, participants and duration.
- **Downstream effects:** Breakdown, schedules, cast bookings, runtime and daylight requirements.
- **Failure and recovery:** Impossible or missing combinations are actionable validation messages.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-06-02 — Action And Dialogue

- **Inner loop:** Write action and dialogue; assign speakers and languages; save.
- **Downstream effects:** Player text persists into screenplay and creative reference; explicit language choices drive recording/localization needs.
- **Failure and recovery:** Text length is not a quality score; unsupported speaker references require repair.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-06-03 — Production Breakdown

- **Inner loop:** Declare props, crowds, animals, stunts, intimacy, music, vehicles and effects; review linked tasks.
- **Downstream effects:** Required resources, specialist crew, preparation, costs and dependencies.
- **Failure and recovery:** Remove a requirement only with a preview of cancelled bookings or stranded assets.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-06-04 — Scene Organization

- **Inner loop:** Insert, reorder, duplicate, split, combine, cut and restore.
- **Downstream effects:** Order and IDs preserve links across threads, assets and editing.
- **Failure and recovery:** Copies receive new IDs; split/combine operations explicitly remap links rather than guessing.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-06-05 — Draft Approval And Revision

- **Inner loop:** Save version; compare; review notes; approve; revise approved material with impact preview.
- **Downstream effects:** Unchanged filmed work survives; changed work creates precise reshoot, asset or schedule consequences.
- **Failure and recovery:** Confirm costly revisions; preserve old versions and explain incompatible footage; no reward for repeatedly clicking revise.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 07. Television And Episodes

### SLATE-07-01 — Series Bible

- **Inner loop:** Define series premise, format, continuing world, characters and continuity rules.
- **Downstream effects:** Shared reference governs season and episode planning.
- **Failure and recovery:** Changing shared facts previews affected episodes instead of silently rewriting history.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-07-02 — Season And Episode Planning

- **Inner loop:** Create season arc; order episodes; set durations; allocate stories, scenes and locations.
- **Downstream effects:** Season budget aggregates episode work without treating one episode as the whole season.
- **Failure and recovery:** Missing episodes or unresolved delivery obligations remain visible.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-07-03 — Regulars Guests And Credits

- **Inner loop:** Choose recurring participation; book actual episode work; assign episode-specific crew.
- **Downstream effects:** Contracts, availability, fees and credits reflect appearances and contributed work.
- **Failure and recovery:** Guest spanning episodes prompts contract review; regular status does not create footage or earned credit automatically.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-07-04 — Showrunning And Production

- **Inner loop:** Assign creative oversight; writing and directing responsibilities; choose supported block scheduling.
- **Downstream effects:** Shared sets and locations can be reused with explicit continuity and booking constraints.
- **Failure and recovery:** Responsibility conflicts require delegation or rescheduling; available professions do not imply unlimited time.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-07-05 — Delivery And Continuation

- **Inner loop:** Deliver episodes; finish season; receive commissioning, renewal or cancellation decisions.
- **Downstream effects:** Returning cast, assets, unresolved stories and agreements feed the next season.
- **Failure and recovery:** Cancellation settles existing work; renewal never silently resets contracts or creates funding.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 08. Financing And Producing

### SLATE-08-01 — Estimate And Assumptions

- **Inner loop:** Break down development, cast, crew, production, facilities, post and delivery; inspect contingency.
- **Downstream effects:** Approved scope creates estimate and an explicit financing target, not cash.
- **Failure and recovery:** Unknown prices or unavailable candidates must not be estimated as free; expose uncertain lines.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-08-02 — Funding Applications

- **Inner loop:** Choose eligible backer; prepare documents; send; await decision.
- **Downstream effects:** Calendar deadlines and submitted snapshots connect to funding pipeline.
- **Failure and recovery:** Refusal offers understandable next options without guaranteed acceptance.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-08-03 — Offers And Terms

- **Inner loop:** Review amount, payment timing, obligations, supported rights and revenue terms; negotiate where supported; accept or reject.
- **Downstream effects:** Accepted deals create receivables and obligations; received payments increase available funds.
- **Failure and recovery:** Expired or incompatible offers cannot be accepted; cancellation preserves liabilities.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-08-04 — Ledger And Payments

- **Inner loop:** Track promised, received, reserved, committed, spent and distributable amounts.
- **Downstream effects:** Hiring, bookings, production and revenue share one ledger.
- **Failure and recovery:** Finite nonnegative money; no duplicate settlement; failed action must not partially charge.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-08-05 — Shortfalls And Closure

- **Inner loop:** Compare scope reductions, postponement and additional funding; settle final obligations.
- **Downstream effects:** Creative revisions change remaining cost; revenues follow agreed repayment order.
- **Failure and recovery:** No unexplained bailout; show exact shortage and recovery; do not introduce personal tax or banking systems.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 09. Casting

### SLATE-09-01 — Role Brief And Search

- **Inner loop:** Create brief from character and dates; filter candidates; inspect availability and rates.
- **Downstream effects:** Search reflects performance method, language requirements and actual work.
- **Failure and recovery:** Unavailable candidate is not a zero-cost placeholder; identify booking conflicts.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-09-02 — Auditions And Callbacks

- **Inner loop:** Invite; schedule; review performance evidence; shortlist; callback or chemistry read when relevant.
- **Downstream effects:** Selection gives a reasoned comparison rather than a single universal best score.
- **Failure and recovery:** Declines and missed auditions allow alternatives; background casting can use a simpler appropriate flow.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-09-03 — Offers And Booking

- **Inner loop:** Offer terms; handle acceptance, refusal, counteroffer and expiry; reserve dates.
- **Downstream effects:** Project ledger and participant calendar update together.
- **Failure and recovery:** Cannot double-book or double-charge; cancellation and changes use explicit terms.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-09-04 — Self Casting And Recasting

- **Inner loop:** Choose own role or no role; replace performer when necessary; review affected work.
- **Downstream effects:** Directing/acting conflicts and reshoots are visible; used former-performer work retains credit.
- **Failure and recovery:** Replacement cannot erase contributions or grant unearned work to successor.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-09-05 — Billing And Award Entry

- **Inner loop:** Review character credits, methods, episode participation, billing and category placement.
- **Downstream effects:** Delivered versions and eligibility use the actual contributors.
- **Failure and recovery:** Story function never substitutes for size or organizer rules; prevent duplicate or missing credits.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 10. Crew And Collaboration

### SLATE-10-01 — Department Breakdown

- **Inner loop:** Derive required and optional roles from project; inspect why each is needed.
- **Downstream effects:** Departments cover production tasks and readiness.
- **Failure and recovery:** Unfilled required work remains blocked and explained.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-10-02 — Candidate Comparison

- **Inner loop:** Inspect experience relevant to task, rate, availability and existing commitments.
- **Downstream effects:** Hiring tradeoffs affect capacity and cost without inherited identity bonuses.
- **Failure and recovery:** No available candidate remains an explicit feasibility gap.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-10-03 — Offers And Work Assignment

- **Inner loop:** Negotiate supported terms; book; assign responsibility and dates.
- **Downstream effects:** Task ownership, contracts, costs and calendars stay aligned.
- **Failure and recovery:** Declines and expiry release only appropriate reservations.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-10-04 — Role Combining And Capacity

- **Inner loop:** Combine compatible roles at suitable scale; inspect workload and concurrency.
- **Downstream effects:** Savings come with genuine capacity limits; no free simultaneous work.
- **Failure and recovery:** Do not combine incompatible work or overwhelm one worker; split roles when scope expands.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-10-05 — Replacement And History

- **Inner loop:** Handle absence, handover, cancellation and additional staffing.
- **Downstream effects:** Preserve work already done, credit and relationship history.
- **Failure and recovery:** Replacing a person must not reset completed tasks or avoid owed pay.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 11. Pre Production

### SLATE-11-01 — Breakdown And Readiness

- **Inner loop:** Convert approved scenes to resource list; assign owners; inspect missing dependencies.
- **Downstream effects:** One readiness view links directly to unresolved work.
- **Failure and recovery:** No generic Ready label while required resources remain unavailable.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-11-02 — Locations And Logistics

- **Inner loop:** Search, scout, compare, book, establish access and backup locations.
- **Downstream effects:** Travel, daylight, weather exposure, costs and scheduling.
- **Failure and recovery:** Location loss triggers alternatives and affected-scene review.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-11-03 — Design And Builds

- **Inner loop:** Request concepts; approve; build or acquire props, costumes, sets and creatures; inspect.
- **Downstream effects:** Assets have versions, readiness, costs and reuse constraints.
- **Failure and recovery:** Rejected design revises affected work; lost or damaged assets require repair or replacement.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-11-04 — Rehearsal And Planning

- **Inner loop:** Schedule table reads, blocking, stunt preparation, storyboards, shots and animatics.
- **Downstream effects:** Preparation addresses explicit production needs and discovers conflicts.
- **Failure and recovery:** Preparation has bounded effects, never infinite quality through repetition.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-11-05 — Scheduling

- **Inner loop:** Order work by dependencies and availability; reserve resources; publish call sheets.
- **Downstream effects:** Cross-department schedules include holidays, travel, daylight and contingency.
- **Failure and recovery:** Explain conflicts; reschedule without double charging; capacity assumptions remain visible.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 12. Live Action

### SLATE-12-01 — Daily Readiness

- **Inner loop:** Check call sheet, attendance, location, equipment and scene requirements.
- **Downstream effects:** Only feasible work starts; attendance and booking history persist.
- **Failure and recovery:** Missing resources prompt switch of scene, delay or cancellation with costs.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-12-02 — Scene And Setup Work

- **Inner loop:** Block; rehearse; light; check sound; choose coverage; record takes.
- **Downstream effects:** Each setup consumes time and produces distinct available material.
- **Failure and recovery:** No material created when required people or equipment are absent.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-12-03 — Directorial Choices

- **Inner loop:** Review take; request adjustment; choose another take or move on.
- **Downstream effects:** Recorded choices constrain edit options and remaining daily capacity.
- **Failure and recovery:** Additional takes have costs and diminishing opportunity, not automatic perfection.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-12-04 — Disruptions And Wrap

- **Inner loop:** Respond to weather, continuity or resource trouble; log completed and unfinished work.
- **Downstream effects:** Update money, footage, reports and next-day schedule together.
- **Failure and recovery:** A failed event rolls back consistently; partial completed work is explicitly retained.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-12-05 — Pickups And Reshoots

- **Inner loop:** Identify missing work; estimate; book participants; schedule after prerequisites; capture.
- **Downstream effects:** New material supplements or replaces correct scenes and versions.
- **Failure and recovery:** Do not book pickups before feasible prep or primary work; preserve existing footage and credits.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 13. Animation Stop Motion And Hybrid

### SLATE-13-01 — 2D Pipeline

- **Inner loop:** Design; storyboard; animatic; layout; animate; clean up; colour; composite.
- **Downstream effects:** Approved assets and shot dependencies determine tasks, capacity and revisions.
- **Failure and recovery:** Late animatic or design changes identify rework rather than restarting everything.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-13-02 — 3D Pipeline

- **Inner loop:** Model; rig; layout; animate; simulate; light; render; composite.
- **Downstream effects:** Rig readiness, render capacity and asset versions govern completion.
- **Failure and recovery:** Failed or changed assets invalidate only dependent work; render expansion costs money.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-13-03 — Stop Motion Pipeline

- **Inner loop:** Design puppets and sets; fabricate; rig; test lighting; capture frames; repair; clean up.
- **Downstream effects:** Puppet copies, stage access, continuity and animator capacity determine throughput.
- **Failure and recovery:** Damage or unavailable stages have repair/rebook paths; duplicates cost resources and enable only feasible concurrency.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-13-04 — Voice And Capture

- **Inner loop:** Cast; book; record voice or calibrate capture; select takes; retake; clean; retarget; integrate.
- **Downstream effects:** Voice and body/face capture remain distinct work with dated sessions and used-performer credits.
- **Failure and recovery:** Insufficient studio funds block cleanly; missed sessions rebook; one performance method cannot impersonate another.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-13-05 — Hybrid Integration

- **Inner loop:** Plan plates, tracking, practical and digital assets; approve integration; finish shots.
- **Downstream effects:** Cross-medium dependencies link filmed work to effects and final composite.
- **Failure and recovery:** Changed plates or camera work flag specific downstream tasks and revised costs.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 14. Documentary And Unscripted

### SLATE-14-01 — Research And Access

- **Inner loop:** Define questions; identify contributors, locations and archives; arrange access.
- **Downstream effects:** Available factual material and access shape the project.
- **Failure and recovery:** Refused access prompts editorial alternatives; do not fabricate factual verification.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-14-02 — Contributors And Restrictions

- **Inner loop:** Invite; record agreement and use restrictions; schedule; handle withdrawal.
- **Downstream effects:** Footage use, redaction, credits and delivery respect recorded restrictions.
- **Failure and recovery:** Withdrawal before filming creates no phantom redaction work; later withdrawal shows affected material.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-14-03 — Documentary Capture

- **Inner loop:** Plan interviews and observations; record opportunities; log coverage and factual claims.
- **Downstream effects:** Editing uses actual recorded material and research status.
- **Failure and recovery:** Missing material leads to additional interviews, archive work or a revised structure.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-14-04 — Unscripted Format

- **Inner loop:** Define segments or competition rules; schedule participants; record progression.
- **Downstream effects:** Episode results and participant continuity persist deterministically.
- **Failure and recovery:** Format-specific rules govern outcomes; do not force every format into a scripted fiction workflow.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-14-05 — Editorial Assembly

- **Inner loop:** Review material; verify claims; assemble; resolve restrictions; deliver.
- **Downstream effects:** Clearances and factual issues gate affected uses and deliverables.
- **Failure and recovery:** Unresolved issues remain explicit; alternatives include replacement, omission or revised delivery.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 15. Editing And Post

### SLATE-15-01 — Material Review And Assembly

- **Inner loop:** Inspect footage, takes, recordings and technical gaps; select; order scenes.
- **Downstream effects:** Available material constrains what can be edited.
- **Failure and recovery:** No selecting footage that was never captured; identify stale or incompatible versions.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-15-02 — Structural Revision

- **Inner loop:** Adjust pacing and runtime; cut, restore or rearrange; review setups and payoffs.
- **Downstream effects:** Declared essential scenes and dependencies provide specific warnings.
- **Failure and recovery:** Allow intentional choices; restore or revise dependency; no penalty based merely on prose presence.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-15-03 — Additional Work

- **Inner loop:** Request pickups, replacement voice, effects revisions or missing assets.
- **Downstream effects:** Tasks require funding, participants and schedule capacity.
- **Failure and recovery:** Explain delay and cost; preserve previously approved usable material.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-15-04 — Sound And Picture Finish

- **Inner loop:** Edit dialogue; record ADR and Foley; add music; mix; colour; finish effects; titles and credits.
- **Downstream effects:** Dependencies and versions determine picture/sound readiness.
- **Failure and recovery:** Changing locked picture shows affected sound, captions, effects and delivery work.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-15-05 — Versions And Delivery

- **Inner loop:** Create festival, distribution and broadcast cuts; captions, subtitles and required materials; review; lock; submit.
- **Downstream effects:** Each version has runtime, credits, content and eligibility history.
- **Failure and recovery:** Failed delivery identifies corrections; reopening a lock creates revision work rather than silently overwriting accepted files.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 16. Distribution And Audiences

### SLATE-16-01 — Release Strategy

- **Inner loop:** Choose supported territories, languages, methods and windows; compare commitments.
- **Downstream effects:** Premiere eligibility, localization, audience access and deals interact.
- **Failure and recovery:** Conflicts and exclusivity appear before acceptance.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-16-02 — Offers And Delivery

- **Inner loop:** Inspect supported terms and requirements; accept or refuse; supply correct version; receive acceptance.
- **Downstream effects:** Contracts create schedule, delivery and payment obligations.
- **Failure and recovery:** Missed materials and rejected deliveries have correction paths.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-16-03 — Content And Versions

- **Inner loop:** Declare content; inspect outlet-specific modeled conditions; choose supported alternate edit.
- **Downstream effects:** A restriction affects the relevant outlet or territory, not all TV globally.
- **Failure and recovery:** No universal mature-content ban; clearly separate simulation assumptions from classification authority.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-16-04 — Audience And Revenue

- **Inner loop:** Release; observe exposure, audience fit, reception and accounting.
- **Downstream effects:** Reported earnings, received funds and contractual shares remain distinct.
- **Failure and recovery:** No guarantee of success; no duplicate revenue when events replay.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-16-05 — Later Windows

- **Inner loop:** Consider new territories, licensing or later releases; preserve release history.
- **Downstream effects:** Earlier releases constrain later deals and festival entry.
- **Failure and recovery:** Cancelled releases must not count as completed showings; agreement changes preserve obligations.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 17. Festivals And Awards

### SLATE-17-01 — Edition Calendar

- **Inner loop:** Track institution, edition, submissions, deadlines, nominations, screenings and ceremony.
- **Downstream effects:** Each year has its own data and status; scheduled events connect to attendance.
- **Failure and recovery:** Future unknown dates remain projections, not invented confirmed dates; same date in two years is allowed if correct.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-17-02 — Eligibility And Categories

- **Inner loop:** Evaluate format, runtime, territory, release history, premiere status, credits and edition-specific rules.
- **Downstream effects:** Explain eligible and ineligible categories with evidence.
- **Failure and recovery:** Simulated rules stay labeled; official facts override generic assumptions for that edition.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-17-03 — Submission

- **Inner loop:** Choose version and category; attach materials; review fee; submit snapshot.
- **Downstream effects:** Ledger, deadline, eligibility and entry status update together.
- **Failure and recovery:** Withdraw and resubmit with unique entries and correct charges; prevent duplicate accidental submissions.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-17-04 — Selection And Attendance

- **Inner loop:** Receive result; accept invitation; resolve travel and conflicts; attend screening or ceremony.
- **Downstream effects:** Calendar, expenses, exposure and relationship history connect.
- **Failure and recovery:** Declining or missing events has proportionate consequences; award outcomes are not guaranteed.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-17-05 — Results And History

- **Inner loop:** Record nomination, win, rejection or disqualification; propagate correct credits.
- **Downstream effects:** Filmography and relevant future opportunities reflect actual results.
- **Failure and recovery:** No invented verified rulebooks; organizer changes apply to correct editions without rewriting past outcomes.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 18. Career Continuity

### SLATE-18-01 — Credits And Filmography

- **Inner loop:** Review projects, versions, episodes, roles and collaborators.
- **Downstream effects:** Persistent portfolio supports future pitches and opportunities.
- **Failure and recovery:** Only earned contributions receive credit; historical records remain stable.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-18-02 — Professional Relationships

- **Inner loop:** Record specific collaboration, fulfilled promises and relevant disputes.
- **Downstream effects:** Future availability and willingness may reflect relevant history.
- **Failure and recovery:** No arbitrary global relationship penalty from unrelated decisions.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-18-03 — Opportunities

- **Inner loop:** Receive a proposal tied to prior work; inspect terms; accept or decline.
- **Downstream effects:** New work inherits actual resource and scheduling constraints.
- **Failure and recovery:** Explain why opportunity appeared; avoid guaranteed endless offers.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-18-04 — Sequels And Returning Seasons

- **Inner loop:** Reuse explicit story continuity and eligible assets; negotiate returning participants.
- **Downstream effects:** Reuse can save work but requires availability, permissions and version compatibility.
- **Failure and recovery:** Do not carry over expired agreements or assume returning cast is free.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-18-05 — Obligations And Portfolio

- **Inner loop:** Manage concurrent projects, remaining repayments and delivery duties.
- **Downstream effects:** One person's time and shared resources are finite across projects.
- **Failure and recovery:** New project cannot erase old debts or commitments; cancel or delegate explicitly.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 19. Player Experience And Persistence

### SLATE-19-01 — Navigation And Voice

- **Inner loop:** Show current situation, meaningful choices, next action and relevant history.
- **Downstream effects:** Natural event-specific language; consistent established title-case rules.
- **Failure and recovery:** No robotic generic headings, unexplained numbers or dead-end screens; do not invent absent donor rules.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-19-02 — Responsive Interface

- **Inner loop:** Provide equivalent controls on desktop and mobile; handle drawer, safe areas, keyboard, scrolling and focus.
- **Downstream effects:** No overlap, clipped actions, lost input or sticky-header-covered destinations.
- **Failure and recovery:** Recover focus after dialogs; reserve loading space; preserve input through rerender and navigation.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-19-03 — Decisions And Feedback

- **Inner loop:** Preview cost, time and effects; commit once; show outcome and next options.
- **Downstream effects:** Every action links to meaningful state or a legitimate creative record.
- **Failure and recovery:** Disabled actions name why and how to resolve; no decorative unimplemented features.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-19-04 — Save Export Import

- **Inner loop:** Persist full state; reopen; export/import; distinguish duplicate lives and newer versions.
- **Downstream effects:** Documents, IDs, RNG state, events, ledger and history survive consistently.
- **Failure and recovery:** Atomic writes, sound backups, quota handling, migrations and multi-tab ownership protect progress.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-19-05 — Recovery And Accessibility

- **Inner loop:** Retry failed loads; recover damaged save; navigate by keyboard and assistive technology.
- **Downstream effects:** Errors preserve work and explain recovery; screen-reader labels match actions.
- **Failure and recovery:** No silent reset or fake success; physical-device and human accessibility checks remain separately recorded.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

## 20. Evidence And Completion

### SLATE-20-01 — Feature Ledger

- **Inner loop:** Give every leaf an ID; map UI, engine, dependencies, outcomes, tests and source status.
- **Downstream effects:** An auditable coverage matrix distinguishes planned from implemented and verified.
- **Failure and recovery:** No feature marked complete because a screen or helper exists.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-20-02 — Research Ledger

- **Inner loop:** Record source, edition, retrieval date, applicability and verified/modelled/projected status.
- **Downstream effects:** Real rules and calibrated game assumptions stay distinguishable.
- **Failure and recovery:** Unavailable evidence triggers alternate public primary research or an honest gap, never invented certainty.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-20-03 — Engine Verification

- **Inner loop:** Test state transitions, boundaries, failure paths, determinism and migration.
- **Downstream effects:** Money, time, identities, dependencies and history remain internally consistent.
- **Failure and recovery:** Meaningful tests fail on old defects; no tests that merely echo the implementation.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-20-04 — Browser Journeys

- **Inner loop:** Exercise real decisions from creation through next project on desktop and mobile.
- **Downstream effects:** Screenshots, traces, state assertions and reload checks prove connected behavior.
- **Failure and recovery:** Do not conceal failure with arbitrary sleeps, forced clicks, retries or skips; label fixtures.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.

### SLATE-20-05 — Human Acceptance

- **Inner loop:** Play varied careers; assess clarity, agency, pacing and variety; inspect real devices.
- **Downstream effects:** Feedback informs tuning without claiming automated tests measure enjoyment.
- **Failure and recovery:** Record remaining limitations; no assertion of perfection or universal coverage from finite samples.
- **Completion:** apply the per-leaf contract, implement meaningful player control, preserve state through save/reload, and link evidence in the coverage ledger.
