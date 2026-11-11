# Simulation Assumptions

Every number here is a game calibration value. None is a quoted real-world rate or official rule. The constants are named in the code so they can be changed in one place.

| Area | Assumption | Where |
| --- | --- | --- |
| Starting time | Working default 08:00, editable at creation | `state.ts` |
| Starting date (the owner's rule, November 8, 2026) | Any day from 2026, the default, to 2050, so a 50-year career stays within the dated holiday rules (to 2100). Other productions' bookings, which make people unavailable, fall within about two and a half years of the January your story begins. | `state.ts`, `people.ts` |
| Minimum starting age (the owner's rule, November 8, 2026) | 19 on the starting date (16 until then), maximum 100. Identity says the latest birth date that allows for the chosen start. | `validateDraft`, `latestBirthDate` |
| Names (from 1221, November 8, 2026) | A first and a last name are required, a middle name optional; the legal name (first, middle, last) is what credits carry. A preferred name, blank for first and last, is what Home's greeting, the rail, Profile and the Saved Games list call you. | `identity.ts` |
| Citizenship (from 1221) | The place of birth's country, not asked; a territory gives its sovereign state's citizenship (1221's table, e.g. Puerto Rico gives the United States). With where you live (where your story began), your home countries. Travel and work permits don't read it. | `identity.ts` |
| Ethnicity and nationality (November 8, 2026) | Asked apart, at least one of each. Ethnicity is a people (the backgrounds list without words that are only a nationality, such as Nigerian or American) or one of 1221's broad groups, or your own words. Nationality is any inhabited country or territory: where you and your family come from, not your citizenship, and with no legal effect. A nationality brings what its word did as a background: suggested holidays and languages, and a shared background in casting. Saves from before (version 6) and drafts turn nationality words into countries; with none, the nationality is the citizenship. Script characters are written with both, and performers carry both, split from the same draws: a nationality word, else the country they're based in. Casting matches each with its own kind. Every country's languages (`country-languages.ts`) are written from general knowledge of language laws and censuses, unchecked against a source. | `data/identity.ts`, `identity.ts` |
| Public screen funds | The Screen Arts Fund Grant is the public fund of the country where the project is based, and supports its citizens and residents: a project based elsewhere can't apply. A simplification of rules such as the BFI's (UK residents) or Telefilm's (Canadian citizens and permanent residents), not any one fund's rule. | `finance.ts` `fundClosedTo` |
| Headshot (from 1221) | Any photo a browser can decode, cropped to 4:5 and re-encoded as a 512 by 640 JPEG kept in the save (at most 400,000 characters); shown on Review, Profile and beside your credits. The game never reads what's in it. | `ui/PortraitPicker.tsx`, `identity.ts` |
| Leap-day birthdays | Observed February 28 in common years. Age is measured in the birthplace zone, so travel never changes it. | `time.ts`, `state.ts` |
| Month advance | Wall time kept. Month end clamps (January 31 plus one month is the last day of February). | `addLocal` |
| Lifecycle | Time runs only while the game is open and visible. No offline catch-up. One tab runs a save at a time. | `clock.ts`, `ui/store.ts` |
| Weather | Seasonal curve from warm and cold highs; smoothed temperature anomalies; wet-day persistence 0.45; snow below a 1 °C daily mean; forecast certainty falls by about 13% per day of lead time, with a floor | `weather.ts` |
| Travel | Under 300 km: 80 km/h. Otherwise 800 km/h plus 3 hours. No travel cost. | `state.ts` |
| Funding scenarios (budget sizes) | The least each estimate can be: Micro $40,000; Low $400,000; Mid $4,000,000 (co-production, casting approval); Commissioned $15,000,000 (needs a delivered project; casting and picture approval) | `projects.ts` |
| Budget estimate | Before a script is approved, the budget size's amount. After, what that script needs at its size: required crew and cast at the lowest experienced rates (combining roles on a micro budget), materials, shoot days, studio and render time, money already spent or held, plus a tenth for contingency; never below the size's amount. The financing target follows it unless the player set their own (November 7, 2026). | `estimate.ts` |
| Co-production | Adds 50% of the fund once, with lead-casting approval and a partner credit | `budget.ts` |
| Day rates | Base rates per role; candidates ask 0.62 + 0.2 × experience times the base, plus or minus 10% | `people.ts` |
| People's ages (November 10, 2026) | Everyone the game invents has a date of birth from the save's seed, drawn after their other details, so nobody else about them changed and no save needed upgrading. Their age turns on their birthday, by the player's rule (`time.ts`). A performer's age when your story begins sits a little above the middle of the range they played then. Anyone else's follows experience: about 24 when new to the role, about 48 when leading in it, never under 19 or over 72. The ages a performer plays follow their own age. A child plays within two years of it either way. An adult plays a range as wide as the one they had at the start, placed around their age as that one was, and never under 16. Until this change the range never moved, so a performer kept playing 25 to 35 for a whole career. Casting notes and the candidate list read today's range. | `people.ts`, `hiring.ts` |
| Offer responses | Accept at or above the asking rate, or at 90% or more with 60% probability; counter between 70% and 90%; decline below 70% or when busy | `hiring.ts` |
| Role combining | For example the editor can also grade, caption and QC, and the DP can also light. One task per person per day. On a micro budget, staffing proposals offer the covering role first so one person takes both. | `people.ts`, `hiring.ts` |
| Staffing proposals | The cheapest available people with some experience, for required roles only. They hire a crew the money can pay, or no one, and say what the crew costs against what is uncommitted. | `hiring.ts` |
| Live-action throughput | 4 screen minutes per shoot day, reduced for stunts, crowds over 20, animals, water, night, a song performed on screen and dance; interviews are faster | `production.ts` |
| Song work | Writing the music about 4 days, the lyrics about 2 (you, or a hired songwriter and lyricist), recording a day with a music producer; a song performed on screen is recorded before its scene is shot | `songs.ts` |
| Episode assessment | A hired episode writer or director moves that episode's script or direction by a quarter of their capability's distance from 50; your own work is the baseline. Each episode reads only its own scenes, captures, days, cast and crew; reception carries the season's margin | `finish.ts` |
| Shoot-day fees | Location $1,200 and equipment $1,500 per day, scaled 0.3 for micro, 1 for low, 2 for mid and 3 for commissioned; background performers $180 each | `production.ts` |
| Holiday work | Off by default; 1.5× day rate when chosen | `production.ts` |
| Animation throughput (finished seconds per artist per day: limited / TV / feature) | Drawn 2D 6 / 2.5 / 1; rigged 2D 15 / 8 / 4; 3D 6 / 3 / 0.8; stop motion 3 / 1.5 / 0.8 | `production.ts` |
| Render | 0.25 / 0.5 / 1.5 node-hours per frame; 24 frames per second; $35 per node day | `production.ts` |
| Stop motion | One shot uses one stage, one animator and one copy of each puppet; about 4% chance per active stage day that a puppet needs repair | `production.ts` |
| Materials | Per-unit costs for design, costumes, creatures, puppets, sets, archive items ($2,500) and song clearances ($8,000 per licensed song, cleared once however many scenes use it) | `production.ts` |
| Revision passes | 2 hours per accepted note, minimum 4 hours | `projects.ts` |
| Documentary consent | About 80% of contributors agree, after 2 to 6 days | `documentary.ts` |
| Quality model | Weighted, inspectable facts: script structure, crew and performer capability, capture conditions, rehearsal, cut passes. Reception adds audience variance. Genre, budget size and identity never add points. | `finish.ts` |
| Judging | Noise by model: programmers 7, jury 9, members 5 plus up to 8 points of season visibility, audience 6. Rival strength depends on each event's prestige setting. | `awards.ts` |
| Distribution | Zero to three fictional offers depending on reception and festival exposure; the minimum guarantee goes to project income | `finish.ts` |
| Runtime classes | In this game, features run more than 40 minutes and shorts 40 or fewer | `awards.ts` |
| Motion capture | One capture session per scene for each captured character; $1,500 stage cost per session; captured shots need 60% of the keyframe work | `production.ts` |
| Unscripted TV | 1.5 days of footage logging and 1 day of story producing per segment; segments need a dedicated camera operator | `production.ts` |
| Festival screenings | Two public screenings per selection, on day 2 at 7 PM and day 4 at 2 PM local time; audience response follows the reception assessment | `awards.ts` |
| Rival slate | 120 simulated works per season (features, documentaries, shorts, series); strength N(62, 11) with role offsets N(0, 6); generated fill-ins only when the slate lacks eligible work | `awards.ts` |
| Climate station range | A station further than 400 km isn't treated as evidence for a place; that normal is modeled from latitude and height (warmest month around July in the north and January in the south) | `world/climate.ts` |
| Weather around station normals | Daily departure spread is 0.3 × the day's normal range (1 to 4 °C), with spells correlated over about 4 days; wet days run 2 °C cooler by day and 1 °C warmer at night; sunnier months give more clear days | `engine/weather.ts` |

## Child Performers (November 11, 2026)

A performer is a child under the rules of the place the production is based (`minors.ts`). England's rules stop at 16,
when compulsory school age ends; California's and New York's stop at 18. The figures come from the official texts:

| | England | California | New York |
| --- | --- | --- | --- |
| Source | The Children (Performances and Activities) (England) Regulations 2014, regs 4, 13, 15, 21 to 26 | 8 CCR §11760, §11755.2; Family Code §6752; the Entertainment Work Permit | 12 NYCRR Part 186; the Department of Labor's chart LS 559 (09/18) |
| Hours of work a day, school day (no school) | under 5: 2; 5 to 8: 3; 9 to 15: 5 (no more without school) | babies to 6 months: 20 minutes; to 2: 2; 2 to 5: 3; 6 to 8: 4 (6); 9 to 15: 5 (7); 16 and 17: 6 (8) | the same, but 16 and 17: 6 (9) |
| Hours at the place of work | 5, 8, 9.5 | 2, 4, 6, 8, 9, 10 | 2, 4, 6, 8, 9, 10 |
| Who must be with them | a licensed chaperone, up to 12 children each; a tutor on school days, 3 hours, up to 6 each | a studio teacher on every call under 16, one per 10 (20 without school); a nurse under 6 months | a responsible person under 16 (the game hires a chaperone); teaching 3 hours a school day; a nurse under 6 months |
| Before the first day | a licence, asked for 21 days ahead (reg 4(2)) | an Entertainment Work Permit (a 10-day permit is issued at once) and a permit to employ minors | a Child Performer Permit, and the employer's notice of use 2 business days ahead |
| Night work | the licensing authority's permission (reg 28) | the Labor Commissioner's approval, asked for 48 hours ahead | a variance |
| Between calls | 12 hours (reg 24) | 12 hours | 12 hours |
| Trust set-aside | none | 15% of gross pay | 15% of gross pay |

Six more sets were added the same day, when the owner asked for child performers across the whole map. What was read
for each, and how the game reads what the texts leave to an authority, is in `docs/child-rules/RESEARCH.md`:

| | British Columbia | Ontario | Ireland | Germany | France (partly read) | New South Wales |
| --- | --- | --- | --- | --- | --- | --- |
| Source | Employment Standards Regulation, Part 7.1, Division 2 | the Protecting Child Performers Act, 2015, as passed | the Workplace Relations Commission's film and TV licence note | Jugendarbeitsschutzgesetz §§ 2, 5, 6, 8 | the audiovisual industry's 2025 agreement on minors, restating the Code du travail | the Office of the Children's Guardian's requirements by age |
| Covers | under 15, from 15 days old | under 18, from 15 days old | under 16 | under 18; none of 3 or under | under 16 | under 16 |
| Hours of work a day | 8 hours from reporting under 12, 10 from 12, less the camera breaks: under 3: 3.4; 3 to 5: 5.3; 6 to 11: 6.5; 12 to 14: 8.6 | 4 under 2 and 8 from 2, less the same camera breaks: 1.7, 3.4, 5.3, 6.5, 6.9, 7.4 at 16 and 17 | under 7: 2; 7 to 12: 3; 13 to 15: 4 | over 3 to 6: 2; 6 to 15: 3; 16 and 17: 8 | England's, standing in for the hours the commission sets child by child | under 3: 4; 3 to 7: 6; 8 to 15: 8; at most 4 on a school day |
| Days a week | 5 | 5 (48 hours free a week) | 5 | the game's own six | the game's own six | under 6 months: 1; to 3: 2; 3 to 7: 4; 8 to 15: 5 |
| Who must be with them | a chaperone, one each under 6, one per 3 to 12, one per 5 to 15; no tutoring rule | a parent, guardian or chaperone for each child under 16 (the game hires one each); time for tutoring | a chaperone per 12; teaching if away from school more than a week (not modelled) | care and supervision (the game: one per child under 6, then one per 3) | a children's supervisor (the game: one per 5) | a supervisor (the game: one per 5), and a nurse under 3 |
| Before the first day | consent and the hire (the game allows a day) | the same; 48 hours' notice of a call after 7 p.m. | a licence from the Minister, applied for 21 days ahead | the authority's written approval (the game allows 14 days) | the prefect's authorisation, within a month (30 days) | the Children's Guardian's authority (the game allows 7 days) |
| Between calls | 12 hours | 12 hours | none set (England's 12 stand in) | 14 hours | 12 hours | 12 hours |
| Trust set-aside | 25% of earnings over $2,000 on a production | 25% of all the earnings on a production once they pass $2,000 | none: the earnings go to an account in the child's name | none | none fixed: the commission sets the share child by child | none stated |

What follows in the game:
- **Shoot days.** A shoot day stands for ten hours (game calibration). A child's scenes fill no more of a day than their
  hours of work allow, so a script with children takes more days, at more location and equipment cost. The schedule
  plans school-day hours, the stricter case. On the day, a day without school allows more where the rules do.
- **Who must be with them.** The chaperone, studio teacher, tutor or nurse is crew the production hires. They are paid
  for each day a child works, on set or at a voice or capture session. A child's scenes aren't shot without them.
- **The licence.** It is asked for when the shoot is scheduled. A child's days go after it is granted, and the days
  without children go first.
- **Night scenes.** A child's night scenes need night work approved. The day call after a child's night shoot moves a
  working day on.
- **Days a week.** Where the rules set the days a week (New South Wales, British Columbia, Ontario, Ireland), a child's scenes
  wait once they have worked that many days, Monday to Sunday.
- **Trust set-aside.** Where the rules require it, the share of each payment to a child is recorded as set aside in
  trust: 15% in California and New York; in British Columbia 25% of what they earn past $2,000 on the production; in
  Ontario 25% of all they earn on it, once it passes $2,000. It
  is part of their pay, not a further cost.
- **Other places.** Places whose rules aren't recorded use the nearest recorded set and say so:
  - the rest of the United States uses California's;
  - the rest of Canada uses British Columbia's (Ontario has its own);
  - the rest of Australia, and New Zealand, use New South Wales's;
  - the rest of the European Union, the EEA and Switzerland use Germany's (Ireland has its own);
  - everywhere else uses England's, including Scotland, Wales and Northern Ireland, whose own rules are close to
    England's but weren't read.

  `docs/child-rules/COVERAGE.md` lists the set every playable country uses.
- **School days.** A school day is a weekday that isn't a public holiday or in a typical long break:
  - England: July 22 to September 3;
  - the United States: June 15 to August 20;
  - elsewhere north of the equator: July and August;
  - south of it: December 15 to January 31;
  - and in the north, December 22 to January 2.

  It isn't a school calendar.
- **The pool.** It has 14 child performers and 6 child voice performers per country, from a month to fifteen years old when
  your story begins. Their experience can't run ahead of their years.
- **Not modelled.** Not modelled:
  - England's limit of six consecutive days, which the game's schedule already keeps, since it never works Sundays;
  - England's rules for 16- and 17-year-olds under employment law;
  - twins cast to share a baby's part;
  - a parent acting as chaperone;
  - working hours at a voice or capture session, beyond the licence and the people with them;
  - the hours of the day a child may work (Germany's 08:00 to 17:00 under 6, New South Wales' 06:00 to 18:00 under 3),
    as the game's shoot days are day or night, not hours on a clock;
  - weekly limits on hours (Germany's 40 for young people, New South Wales' 50 of work and schooling) and British
    Columbia's 48 hours free a week;
  - a baby under 12 weeks in New South Wales needing a variation and a nurse's report.
- **Rates.** Studio teachers, chaperones, tutors and set nurses are paid at game calibration, not union scale.

## World Places (M2)

- A GeoNames place with no recorded height is treated as being at sea level for its record; its weather comes from station normals, which are corrected to the station's own height, so the effect is limited to the modeled fallback.
- World places have no coastline record; nothing in the simulation reads one.
- The summary climate fields of a world place (warmest and coldest month highs, wet-day share, wet season) are derived from its monthly normals; a place with fewer than 20 wet days a year counts as arid.
- The world map is an equirectangular picture for pointing at places. Travel time comes from great-circle distance between coordinates, using the existing travel rule.

## Reliability (November 6, 2026)

- Each call that processes due events snapshots the game first and restores it if a handler fails, so a batch is all-or-nothing. The cost is one copy per batch with due events: about 1.7 ms for a 1.1 MB save (plain-data copy, `src/engine/copy.ts`; `structuredClone` took 6.9 ms). Balance runs that process every day of hundreds of productions take about 37 seconds (98 with `structuredClone`, about 13 with no rollback); in play it is one copy per Advance step or per clock tick with events due. See `docs/PERFORMANCE.md`.
- A budget line that is paid in full or cancelled takes no further payments. Overruns on an open line are still recorded (the line's amount grows), never hidden.
- Each save keeps its previous sound version as a backup, which roughly doubles the storage a save uses.
