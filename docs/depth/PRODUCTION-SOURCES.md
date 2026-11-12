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
| `BROADCAST_BASE`, `STREAMING_BASE`, `STREAMING_DECAY`, `AUDIENCE_TAIL_WEEKS` | `src/engine/audiences.ts` | a first showing draws 250,000 people at full appeal in one territory, and a streamed title 120,000 viewers' worth of its running time in its first week; reach grows with the square root of territories; appeal is nothing at a reception of 30 and the whole base at 80 (`appeal`); the next episode keeps 80% to 98% of the audience (`retention`); a streamed episode keeps 55% of its hours each week after; reports run 8 weeks past the last episode | V3-T01 | Modeled assumption | None |
| `CONSENT_RATE`, `RESTRICTION_RATE`, `CUT_REVIEW_DAYS` | `src/engine/documentary.ts` | 0.8 of contributors agree; the share who set a condition; 3 days to review the cut | 14-02 | Modeled assumption | None |
| `EFFECTS_REVISION_GAIN`, `REVOICE_GAIN` | `src/engine/revisions.ts` | +5 capture, +4 performance | 15-03 | Modeled assumption | None |
| `EXCLUSIVE_DAYS` | `src/engine/finish.ts` | 365 days | 16-01 | Modeled assumption | None |
| `STUDIO_LEAD_DAYS`, `STAGGER_DAYS`, `STAGGER_GROUP` | `src/engine/finish.ts` | A studio first opens a film it backed at least 60 days after delivery, at home; then four more territories every 14 days | Creative Depth F | Modeled assumption | None |
| `DELIVERY_MATERIALS` | `src/engine/finish.ts` | $6,000 theatrical, $4,000 streaming, $3,000 broadcast, $1,500 digital | 16-02 | Modeled assumption | None |
| `REPORT_MONTHS`, `DISTRIBUTOR_FEE`, `LATER_WINDOW_DAYS` | `src/engine/distribution.ts` | 6 reports; 35% fee; 120 days | 16-04, 16-05 | Modeled assumption | None |
| `OPPORTUNITY_DELAY_DAYS`, `OPPORTUNITY_OPEN_DAYS`, `OPPORTUNITY_DELIVER_DAYS` | `src/engine/opportunities.ts` | 45, 30 and 540 days | 18-03 | Modeled assumption | None |
