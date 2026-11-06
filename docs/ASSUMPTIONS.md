# Simulation Assumptions

Every number here is a game calibration value. None is a quoted real-world rate or official rule. The constants are named in the code so they can be changed in one place.

| Area | Assumption | Where |
| --- | --- | --- |
| Starting time | Working default 08:00, editable at creation | `state.ts` |
| Minimum starting age | 16 on the starting date, maximum 100 | `validateDraft` |
| Leap-day birthdays | Observed February 28 in common years. Age is measured in the birthplace zone, so travel never changes it. | `time.ts`, `state.ts` |
| Month advance | Wall time kept. Month end clamps (January 31 plus one month is the last day of February). | `addLocal` |
| Lifecycle | Time runs only while the game is open and visible. No offline catch-up. One tab runs a save at a time. | `clock.ts`, `ui/store.ts` |
| Weather | Seasonal curve from warm and cold highs; smoothed temperature anomalies; wet-day persistence 0.45; snow below a 1 °C daily mean; forecast certainty falls by about 13% per day of lead time, with a floor | `weather.ts` |
| Travel | Under 300 km: 80 km/h. Otherwise 800 km/h plus 3 hours. No travel cost. | `state.ts` |
| Funding scenarios | Micro $40,000; Low $400,000; Mid $4,000,000 (co-production, casting approval); Commissioned $15,000,000 (needs a delivered project; casting and picture approval) | `projects.ts` |
| Co-production | Adds 50% of the fund once, with lead-casting approval and a partner credit | `budget.ts` |
| Day rates | Base rates per role; candidates ask 0.62 + 0.2 × experience times the base, plus or minus 10% | `people.ts` |
| Offer responses | Accept at or above the asking rate, or at 90% or more with 60% probability; counter between 70% and 90%; decline below 70% or when busy | `hiring.ts` |
| Role combining | For example the editor can also grade, caption and QC, and the DP can also light. One task per person per day. | `people.ts` |
| Live-action throughput | 4 screen minutes per shoot day, reduced for stunts, crowds over 20, animals, water, night, songs and dance; interviews are faster | `production.ts` |
| Shoot-day fees | Location $1,200 and equipment $1,500 per day, scaled 0.3 for micro, 1 for low, 2 for mid and 3 for commissioned; background performers $180 each | `production.ts` |
| Holiday work | Off by default; 1.5× day rate when chosen | `production.ts` |
| Animation throughput (finished seconds per artist per day: limited / TV / feature) | Drawn 2D 6 / 2.5 / 1; rigged 2D 15 / 8 / 4; 3D 6 / 3 / 0.8; stop motion 3 / 1.5 / 0.8 | `production.ts` |
| Render | 0.25 / 0.5 / 1.5 node-hours per frame; 24 frames per second; $35 per node day | `production.ts` |
| Stop motion | One shot uses one stage, one animator and one copy of each puppet; about 4% chance per active stage day that a puppet needs repair | `production.ts` |
| Materials | Per-unit costs for design, costumes, creatures, puppets, sets, archive items ($2,500) and song clearances ($8,000) | `production.ts` |
| Revision passes | 2 hours per accepted note, minimum 4 hours | `projects.ts` |
| Documentary consent | About 80% of contributors agree, after 2 to 6 days | `documentary.ts` |
| Quality model | Weighted, inspectable facts: script structure, crew and performer capability, capture conditions, rehearsal, cut passes. Reception adds audience variance. Genre, budget size and identity never add points. | `finish.ts` |
| Judging | Noise by model: programmers 7, jury 9, members 5 plus up to 8 points of season visibility, audience 6. Rival strength depends on each event's prestige setting. | `awards.ts` |
| Distribution | Zero to three fictional offers depending on reception and festival exposure; the minimum guarantee goes to project income | `finish.ts` |
| Runtime classes | In this game, features run more than 40 minutes and shorts 40 or fewer | `awards.ts` |
