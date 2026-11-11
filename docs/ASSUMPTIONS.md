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

Six more sets were added the same day (and Georgia's, described in the research log), when the owner asked for child performers across the whole map. What was read
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
  - the rest of the United States uses California's (Georgia has its own, read from its Department of Labor's rules and
    Schedule of Hours of Performance: `docs/child-rules/RESEARCH.md`);
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

## How People Look On Screen (November 11, 2026)

`src/engine/looks.ts`. Every figure here is game calibration, chosen by judgement so the choices differ the way the work
differs. None is an industry rate, a union rule or a quote. No choice here raises or lowers a quality score.

- **A shooting day** has 600 working minutes. Makeup may start up to 120 minutes before the unit's call, and removal may
  run 30 minutes after wrap, at no cost to the day. What either takes beyond that comes out of the day, down to a
  quarter of it at the least.
- **Chairs.** Everyone hired who does hair and makeup or prosthetics, or whose job covers one of them on a small crew,
  applies makeup at once. The queue is the day's chair minutes divided by that number. With nobody hired the plan
  counts one chair, and the scenes that need makeup wait for someone to be hired.
- **Makeup methods** (ten): minutes in the chair and to remove, test days, build days and their materials, materials
  used each day worn, and effects days per scene for a look finished in post. The table is in the file.
- **A background performer** takes a share of a principal's chair time and materials, set per method (a quarter for full
  appliances, six tenths for wounds).
- **Appearance states.** Each state is its own build where appliances are built, and its own costume copy. At most six.
- **Costume sources** (four): designer's days, materials and fittings per copy. A costume is made twice when a scene
  its wearer is in has a stunt or water.
- **The story's year.** Within eight years of the year the project is made: the present day. Up to thirty: the recent
  past, a quarter more costume and design work. Up to eighty: a period, half as much again. Older: twice. More than
  eight years ahead: the future, half as much again. A declared year decides it; without one, the older rule (a period
  genre and the era's wording) still applies, so earlier projects are unchanged.
- **Clothes that aren't of the period** (bought, or from stock) are altered to pass, at the period's extra work. A
  costume house's and a built costume aren't.
- **A crowd extended in post** puts a quarter of it on set, never fewer than eight, shoots about 15% longer for plates
  and tracking, and takes three days of effects work per scene after the picture is locked. Eight people or fewer are
  simply there.
- **The look a project borrows** (`styleEra`) is a note. It changes no work and no date.

## Writers' Passes (November 11, 2026)

Game calibration, not industry rates or guild terms. All in `src/engine/writing-jobs.ts`.

| What | Figure | Why |
| --- | --- | --- |
| A draft of their own | A day for each 4 minutes of the approved script, 3 days at least | The longest pass: the episode written afresh |
| A rewrite | A day for each 8 minutes, 2 days at least | Half a draft's days |
| A polish | A day for each 15 minutes, 1 day at least | About a quarter of a draft's days |
| A revision | Two fifths of the first pass's days, 1 day at least | Less than the pass it revises |
| Revisions in a contract | 2 | A third is a new commission |
| How far a first pass stands from the writer's level | About 10 points either way (one standard deviation) | Wide enough that the delivered pass matters |
| How far a revision stands from it | About 5 points | A revision is steadier than a first pass; it is not always better |
| How much of the script the work counts for | Draft 1, rewrite 0.6, polish 0.3 | The assessment moves by the pass's distance from 50, times this |

A real person's level for a job comes from the credits the installed catalog holds for it, and their rate from the
game's base rate for that job at that level (`src/engine/guests.ts`). Neither is a fact about them, and each is shown as
the story's figure.

## Camera, Light And Sound (November 11, 2026)

Game calibration, not rental prices, union terms or measurements. All in `src/engine/craft.ts`. No choice here is a
quality bonus: each trades time, crew, money or work in post, and several cost something for nothing but the look.

| Rig, scene by scene | Setup reset | Take runs | Takes vary | Needs | Rented, a shoot day | Rehearsal |
| --- | --- | --- | --- | --- | --- | --- |
| On a tripod | 1 | 1 | 1 | | | |
| Handheld | 0.75 | 1 | 1.4 | | | |
| On a dolly | 1.4 | 1 | 0.85 | A key grip | $600 | |
| Long moving takes | 1.2 | 1.5 | 1.5 | | $450 | A day for every three scenes |
| Through a character's eyes | 1.1 | 1 | 1.2 | Video assist | | A day for every four scenes |

Without the crew a rig needs, every setup on it takes 1.3 times a tripod's reset (or the rig's own, if slower).
"Takes vary" widens or narrows the technical side of each take around what the crew can do; it never moves the centre.

| Light, for the film | Reset on interiors and nights | Planned takes | Gaffer for interiors | Tests before the shoot | Grade | Stop-motion frames a day |
| --- | --- | --- | --- | --- | --- | --- |
| Lit as usual | 1 | as the rule | Yes | | 1 | 1 |
| Practical and available light | 0.8 | one more a setup | No (night exteriors still) | 1 day | 1 | 1 |
| High contrast | 1.25 | as the rule | Yes | 2 days | 1.5 | 1 |
| Macro on miniatures (stop motion) | 1 | as the rule | Yes | 2 stage days | 1 | 0.9 |

| Sound choice | What it asks |
| --- | --- |
| Natural location texture | A recording day for every three locations before the shoot; effects editing at 0.7 |
| Dialogue clarity | A boom operator; dialogue scenes reset at 1.05; a compromised day's dialogue still holds |
| Sparse soundscape | Foley at 1.5, the score at 0.6, the mix at 1.2 |
| Heightened creature Foley | Two Foley days for each creature in the script |
| Layered crowd sound | A loop-group session for every two crowd scenes, $1,800 each; the mix at 1.1 |

| Score | Composer's days | Sessions |
| --- | --- | --- |
| Left to the composer, or electronic | 1 | None |
| A small ensemble | 1 | One for every 20 minutes, $4,000 each; the mix waits |
| Percussion to picture | 1.2 | One for every 40 minutes, $2,500 each; the mix waits |

Looks, scene by scene (`src/engine/looks.ts`): a change of look inside a shooting day takes 15 minutes for the costume
and half the makeup's chair time again, out of the day. Once any scene says which look a character is in, only the
looks that appear are made.

## Filming Somewhere Else (November 11, 2026)

Game calibration, not quotes, rates, permit rules or legal guidance. All in `src/engine/destinations.ts`. The place a
location is filmed in is a real entry of the world registry: its name, country, coordinates, climate and public
holidays are what the registry has. The site is a candidate the game makes up, of the kind chosen, and is labelled so
wherever it is named.

| Kind of site | Share of the location fee | Permit days before the first day | Dialogue spoiled by noise | Rain stops it |
| --- | --- | --- | --- | --- |
| A street | 100% | 3 | 25% of days | Yes |
| A neighbourhood | 90% | 2 | 15% | Yes |
| A coastline | 70% | 2 | 30% | Yes |
| A forest | 60% | 2 | 5% | Yes |
| A mountain | 60% | 3 | 10% | Yes |
| A desert | 60% | 3 | 5% | Yes |
| A rail station | 140% | 6 | 40% | Yes |
| A port | 130% | 6 | 40% | Yes |
| A historic district | 130% | 5 | 20% | Yes |
| A civic space | 120% | 5 | 15% | Yes |
| A market | 110% | 4 | 45% | Yes |
| A soundstage | 160% | 1 | Never | No |
| A backlot | 140% | 1 | 5% | Yes |

| Away from the base | Figure |
| --- | --- |
| How far counts as away | 80 km or more from the production's base |
| Housing the unit for a shooting day away | 60% of the budget size's day fees (location and equipment) |
| Moving the unit there and back, once for a place | Half the equipment day fee, and as much again for each 1,000 km, up to four times it |

Nothing here models taxes, visas, customs or incentives. A permit time is a modeled lead time, not a statement about
any authority.

Under a roof means a soundstage, or the stage set built to match that scouting offers (`locations.ts` `roofed`): rain,
snow and short daylight don't stop an exterior written there, and no rain warning is sent for it. Until November 11,
2026 the stage set cost more and never fell through, but the weather still stopped it.


## How A Studio Reads A Pitch (November 11, 2026)

Game calibration, in `src/engine/strategy.ts`, `finance.ts` and `finish.ts`. A studio's strategy is derived from the
pace its save froze when the story's world began: films a year, genre credits, release months. Nothing reads TMDB's
ratings, popularity, budgets or box office. What that record can't say is modeled, and the page says which.

| What | Figure | Kind |
| --- | --- | --- |
| The slate a studio can carry | Half as many films again as its recorded pace, rounded up; never fewer than 2 | Modeled |
| Room on the slate for a year | What it can carry, less the films it has dated or releases that year in this save's world, less films of yours it backs for that year | Modeled |
| A thin record | Under 2 films a year, or fewer than 6 genre credits: the genre then counts neither for nor against | Modeled |
| An animation house | Animation is its largest genre and a quarter or more of its genre credits (a film carries about three genres) | Modeled |
| Almost no animation | Under 5% of its genre credits | Modeled |
| Its release month | The one month it opens films in more than any other; none where no month stands out | From its record |
| How far it releases a film | 8 or more films a year: home and twelve large markets; 3 or more: home and four; fewer: home only | Modeled; no source says where a studio releases |

The read of a pitch has no chance in it. In order: a film studio takes feature films; its medium can rule the pitch
out; its slate for the year the film would come out must have room; then points, out of 100:

| Part | Points |
| --- | --- |
| Its genre credits in the project's families | Up to 40, in full at a 30% share |
| The medium | 15 where it is what the studio mostly makes, 5 otherwise |
| The script, as backers read it | Up to 20; open notes on it lower it |
| What you have delivered | 8 for one film, 12 for more; up to 8 either way for how it was received; 5 an award, up to 10 |
| Your history with this studio | 8 for each film it backed that you delivered, up to 10; less 15 for one not delivered in time |

At 60 or more it wants the film: an offer for the whole of what is still to raise if you have delivered a film, an
option if you haven't. From 40 it gives notes, and reads the project again only with a newer approved draft. Below
that it passes, for good.

| Deal | Terms |
| --- | --- |
| An offer | All that is still to raise; repaid first; 60% of income after that; casting and picture approval; "Presented By" |
| An option | 15% of the target, at least $10,000; repaid first; 25% of income after that; picture approval; "In Association With" |
| Both | Deliver within 720 days or repay; it releases the film in its territories and holds them for a year; it answers in 14 days |

On delivery it sets the release: at home at least 60 days on, in its month if it has one, then four more territories
every 14 days. Each opening is a release of its own. A distributor's reports count a territory only once the film has
opened there. Where the territory's language isn't one the dialogue is in, the film is subtitled at the studio's cost,
or dubbed at yours: $140 a finished minute for each language, and a dubbed territory counts for 1.5 in the reports
against 1.

Not modeled: budgets a studio spends, franchises, who at a studio decides, and anything said to be a real studio's
taste. A real executive is never given a preference.
