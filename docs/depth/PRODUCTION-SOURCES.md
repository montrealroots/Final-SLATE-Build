# Production Rates: Sources By Feature (SLATE-20-02)

The package asks for a source register for production processes. This is that register for every rate, fee and
calibration the production, money and career engines read. `tests/production-sources.test.ts` fails a constant the
code exports from these files that this table doesn't name, and a row whose constant is gone.

**None of these is a sourced fact.** Each one is a game model: chosen so that productions of each kind take a believable
number of days and cost amounts that sit in a believable order against each other, then tuned against the balance
runs (`npm run balance`, `docs/balance-results.json`). Until November 8, 2026 no primary source was consulted for any of them; since then one row (`TAKE_RULES` and its neighbours) cites a primary source for the process it models, never for its figures. Where the package says a
public figure exists (union minimums, studio rate cards), those vary by country, union, year and production, and none
is applied here: the people pool's day rates come from the world seed and experience, not from a rate card. If a
sourced figure replaces one of these, its row gets the source ID, URL, publisher, edition, retrieval date and
applicability, and its status becomes "verified fact".

| Constant | Where | Value | Feature IDs | Status | Source |
|---|---|---|---|---|---|
| `ANIM_RATE` | `src/engine/production/rates.ts` | finished seconds per artist per day, by technique and finish | 13-01, 13-02, 13-03 | Modeled assumption | None |
| `RENDER_HOURS_PER_FRAME` | `src/engine/production/rates.ts` | 0.25 / 0.5 / 1.5 node-hours per frame | 13-02 | Modeled assumption | None |
| `OUTPUT_FPS` | `src/engine/production/rates.ts` | 24 | 13-01, 13-02, 13-03 | Convention (24 frames a second for film) | None recorded |
| `RENDER_NODE_DAY_COST` | `src/engine/production/rates.ts` | $35 a node a day | 13-02, 08-01 | Modeled assumption | None |
| `BASE_MINUTES_PER_SHOOT_DAY` | `src/engine/production/rates.ts` | 4 screen minutes | 12-02, 11-05 | Modeled assumption | None |
| `HOLIDAY_PREMIUM` | `src/engine/production/rates.ts` | 1.5 times the day rate | 11-05, 12-01 | Modeled assumption | None |
| `NIGHT_PREMIUM` | `src/engine/production/rates.ts` | 1.25 times the day rate on a night shoot day, for everyone on set | 2026-11-14 feature proofs | Modeled assumption | None |
| `CROWD_DAY_RATE` | `src/engine/production/rates.ts` | $180 a background performer a day | 12-02, 08-01 | Modeled assumption | None |
| `MATERIAL_COST` | `src/engine/production/rates.ts` | per build or prep task | 11-03, 13-03, 08-01 | Modeled assumption | None |
| `LOCATION_FEE_PER_DAY` | `src/engine/production/rates.ts` | $1,200 | 11-02, 12-02 | Modeled assumption | None |
| `EQUIPMENT_PER_DAY` | `src/engine/production/rates.ts` | $1,500 | 12-02 | Modeled assumption | None |
| `DAY_COST_SCALE` | `src/engine/production/rates.ts` | 0.3 / 1 / 2 / 3 by budget size | 08-01, 12-02 | Modeled assumption | None |
| `VOICE_SESSION_STUDIO` | `src/engine/production/rates.ts` | $400 a session | 13-04 | Modeled assumption | None |
| `MOCAP_ANIMATION_FACTOR` | `src/engine/production/rates.ts` | 0.6 of keyframe work left | 13-04 | Modeled assumption | None |
| `SITES` | `src/engine/locations.ts` | stage 1.6 times the fee, never falls through; stand-in 0.6, 15% risk; real place 5% risk | 11-02 | Modeled assumption | None |
| `COVERAGE`, `TAKES`, `TAKE_CENTRE` | `src/engine/takes.ts` | time factors and take counts per plan | 12-02, 12-03 | Modeled assumption | None |
| `TAKE_RULES`, `SETUP_RESET`, `TAKE_RUN`, `ISSUE_GAP` | `src/engine/takes.ts` | directing 2: takes allowed and planned per rule (1, up to 4, 5); a setup's reset 0.2 and a take's run 0.15 of a scene's standard load; a side 8 below what the crew and cast can do is an issue | 12-02, 12-03 | Modeled assumption; that set-ups and takes are what a shoot day's time goes on, and that a script supervisor records coverage and pickup shots, is from IATSE Local 634's job description (docs/depth/DIRECTING-RESEARCH.md) | IATSE Local 634, Script Department Positions And Descriptions (2025) |
| `AUDITION_NOTICE_DAYS`, `FIRST_SPREAD`, `CALLBACK_SPREAD` | `src/engine/auditions.ts` | 3 days; ranges 22 and 8 wide | 09-02 | Modeled assumption | None |
| `OFFER_OPEN_DAYS`, `COUNTER_DAYS` | `src/engine/negotiation.ts` | 21 and 5 days | 08-03 | Modeled assumption | None |
| `COUNTER_OPEN_DAYS` | `src/engine/hiring.ts` | 7 days | 09-03 | Modeled assumption | None |
| `CASTING_SEARCH_DAYS` | `src/engine/hiring.ts` | 2 days: one to prepare the list, one for the session | V3-L01 | Modeled assumption | None |
| `SEARCH_DAYS` | `src/engine/casting-director.ts` | the same 2 days, under the name its own file uses; a search brings 3 to 6 performers (`searchSize`: 2 and the casting director's experience) and advises up to 3 | V3-L01 | Modeled assumption | None |
| `NEGOTIATION_DAYS` | `src/engine/line-producer.ts` | 1 day; the other side moves 45% to 85% of the time (`movesChance`: 35% and 10 points for each level of the line producer's experience) and then gives up 15% to 60% of the gap between offer and ask (`gapClosed`: 15 points a level) | V3-L02 | Modeled assumption | None |
| `AGENTS`, `PLACED` | `src/engine/representation.ts` | four fictional agents: commission 10%, 10%, 12% and 15%; weight added to leverage 0.10 to 0.25; what each needs to see (an approved script; a delivered project; one received at 60 or more; two, or a prize); the one kind of backer each stands aside from; the three kinds they submit to | V3-L03 | Modeled assumption | None |
| `AGENT_ANSWER_DAYS`, `MANDATE_OPEN_DAYS`, `MANDATE_DAYS`, `RENEWAL_WARNING_DAYS`, `NOTICE_DAYS` | `src/engine/representation.ts` | 3 days to answer; an offer open 14 days; a term of 365 days; their word on renewing 30 days before it ends; 30 days' notice | V3-L03 | Modeled assumption | None |
| `WEEKS_PER_REPORT`, `WEEK_WEIGHTS`, `RENTAL_SHARE`, `TICKET_PRICE` | `src/engine/box-office.ts` | 4 weeks to a distributor's report; a month's takings fall 30.0%, 26.4%, 23.2% and 20.4% across them (the monthly curve's two fifths, a week at a time); cinemas pass on 50% of ticket sales as rental; a ticket is $10 everywhere | V3-B01 | Modeled assumption | None |
| `GUARANTEE_PER_SCREEN`, `SCREENS_BOUNDS`, `HOLD_BAR`, `EXPAND_BAR`, `CUT_SHARE`, `EXPAND_SHARE`, `WITHDRAW_BELOW`, `COMPETITION_MAX`, `COMPETITION_COST`, `SCREEN_SHARE_MAX` | `src/engine/box-office.ts` | a cinema run opens on a screen for each $400 of guarantee, times the square root of its territories, from 10 to 4,000; 900 admissions a screen a week expands it by a quarter, 250 holds it, less cuts it to three fifths, and under 5 screens withdraws it; each of up to four other wide releases (a seeded count) takes 8% of its takings a screen; a month's report is scaled by the screens it ends the month before on, against the opening, up to 1.5 | V4-028.02 | Modeled assumption | None |
| `BROADCAST_BASE`, `STREAMING_BASE`, `STREAMING_DECAY`, `AUDIENCE_TAIL_WEEKS` | `src/engine/audiences.ts` | a first showing draws 250,000 people at full appeal in one territory, and a streamed title 120,000 viewers' worth of its running time in its first week; reach grows with the square root of territories; appeal is nothing at a reception of 30 and the whole base at 80 (`appeal`); the next episode keeps 80% of the audience at worst and grows by up to 5% past a reception of 85 (`retention`; capped at 98% until November 13, 2026); a streamed episode keeps 55% of its hours each week after; reports run 8 weeks past the last episode | V3-T01 | Modeled assumption | None |
| `STRIP_HABIT`, `BREAK_LOSS` | `src/engine/audiences.ts` | first showings a day apart keep 3% more of the audience that comes back; after a break of more than two weeks 8% less of it returns (`gapEffect`); weekly is the measure | V4-029.04 | Modeled assumption | None |
| `LATE_SLOT_AUDIENCE` | `src/engine/audiences.ts` | a late slot keeps 60% of the audience an earlier one gets; summer weeks (June to August) 88% and winter weeks (December to February) 108% (`seasonFactor`); each calendar week's competition from 85% to 115%, the same for every show that week (`weekCompetition`) | v5-8 | Modeled assumption | None: not measured ratings |
| `OPENING_BAR`, `KEEP_BAR`, `STREAMING_BAR`, `STREAMING_WEEKS_COUNTED` | `src/engine/audiences.ts` | what a commissioner looks for before paying for another season: a first showing drawing two fifths of one at full appeal in the same territories, and 88% of the audience kept from one episode to the next; for a streamed season, 1.2 times the views of a week at full appeal, counted over the four weeks from its last episode. With `RENEWAL_WAIT_DAYS` in `continuation.ts` (they wait up to a year for it to be shown). Raised by a quarter for a season more than a tenth over budget and by 0.15 when the commissioner renewed another of your series in the past year (`OVERRUN_RAISE`, `SLATE_RAISE` in `continuation.ts`) | V3-T01 | Modeled assumption | None: not measured renewal rates |
| `CONSENT_RATE`, `RESTRICTION_RATE`, `CUT_REVIEW_DAYS` | `src/engine/documentary.ts` | 0.8 of contributors agree; the share who set a condition; 3 days to review the cut | 14-02 | Modeled assumption | None |
| `EFFECTS_REVISION_GAIN`, `REVOICE_GAIN` | `src/engine/revisions.ts` | +5 capture, +4 performance | 15-03 | Modeled assumption | None |
| `EXCLUSIVE_DAYS` | `src/engine/finish.ts` | 365 days | 16-01 | Modeled assumption | None |
| `STUDIO_LEAD_DAYS`, `STAGGER_DAYS`, `STAGGER_GROUP` | `src/engine/finish.ts` | A studio first opens a film it backed at least 60 days after delivery, at home; then four more territories every 14 days | Creative Depth F | Modeled assumption | None |
| `DELIVERY_MATERIALS` | `src/engine/finish.ts` | $6,000 theatrical, $4,000 streaming, $3,000 broadcast, $1,500 digital | 16-02 | Modeled assumption | None |
| `REPORT_MONTHS`, `DISTRIBUTOR_FEE`, `LATER_WINDOW_DAYS` | `src/engine/distribution.ts` | 6 reports; 35% fee; 120 days | 16-04, 16-05 | Modeled assumption | None |
| `SELF_REACH` | `src/engine/distribution.ts` | A route you run yourself reaches 80% (a booking partner), 55% (the stores) or 30% (your own storefront) of a distributor's, before promotion widens it | v5-6 | Modeled assumption | docs/v5/RELEASE-PLAN.md |
| `AGENT_SHARE` | `src/engine/release-plan.ts` | A sales agent takes 20% of a streaming licence fee | v5-6 | Modeled assumption | docs/v5/RELEASE-PLAN.md (agents' commissions as explainers describe them; no fixed rate is cited) |
| `BUYER_BAR`, `ANSWER_DAYS` | `src/engine/release-plan.ts` | Reception 50, 55 or 65 by kind of buyer; 21 or 28 days to answer | v5-6 | Modeled assumption | None |
| `AGGREGATOR_FEE` | `src/engine/release-plan.ts` | $1,300 to reach the stores through an aggregator | v5-6 | Modeled assumption | docs/v5/RELEASE-PLAN.md (reported flat fees around $1,000 to $1,300; current prices differ) |
| `PARTNER_FEE`, `SCREEN_RENTAL` | `src/engine/release-plan.ts` | $5,000 to a booking partner; $7,000 a territory in screen rental | v5-6 | Modeled assumption | docs/v5/RELEASE-PLAN.md (one cinema's reported package price, $7,000; unverified) |
| `SELF_SHARE` | `src/engine/release-plan.ts` | The partner keeps 10%, the stores 30%, your storefront 10% | v5-6 | Modeled assumption | docs/v5/RELEASE-PLAN.md (a storefront's 90/10 split, as its seller FAQ states) |
| `FIRST_LOOK_OPEN_DAYS`, `FIRST_LOOK_COUNTER_DAYS`, `FIRST_LOOK_NOTICE_DAYS` | `src/engine/first-look.ts` | An offer open 30 days; 7 days to answer a request for more; checked 45 days after a delivery | v5-5 | Modeled assumption | None |
| `FIRST_LOOK_RECEPTION`, `FIRST_LOOK_FIT` | `src/engine/first-look.ts` | Work received at 60, or a win; a genre fit of 0.1 with the studio's record | v5-5 | Modeled assumption | docs/v5/FIRST-LOOK.md |
| `TIER_MONTHS` | `src/engine/first-look.ts` | A first-look deal's term by track record: 12, 24, 36 or 60 months; yearly overhead ranges from `src/data/deal-model.json` | v8-7 | Modeled assumption (the package's own calibration, "not published company rates") | docs/v8/package/04-FIRST-LOOK-AND-STUDIO-DEALS.md |
| `DISTRIBUTORS` | `src/engine/finish.ts` | Eight fictional distributors, offering and proposed to | 16-01, v5-6 | Convention | Fictional names, labelled in the game |
| `OPPORTUNITY_DELAY_DAYS`, `OPPORTUNITY_OPEN_DAYS`, `OPPORTUNITY_DELIVER_DAYS` | `src/engine/opportunities.ts` | 45, 30 and 540 days | 18-03 | Modeled assumption | None |
| `FACE_METHODS` | `src/engine/production/rates.ts` | Replacement faces: 4 build days and half a day a scene, animation at 0.9; mechanical head: 3 armature days a copy, animation at 1.15 | v4 V4-014.02 | Modeled assumption | None |
