# Creative Depth And Living Industry: Implementation Ledger

The owner's package of November 11, 2026, "SLATE Creative Depth & Living Industry Expansion", version 2. Its files are
in `docs/creative-depth/package/`, unchanged. This ledger says what is built, what proves it and what is left, so a new
session can go on without rereading the package. `DECISIONS.md` beside it records what was decided and why.

The package's last-reviewed `main` was `8a60369` (#66). Work began from exactly that commit.

## How To Read The Statuses

The package's own six, from `06-TESTING-AND-DELIVERY.md`:

| Status | Meaning |
| --- | --- |
| Engine verified | Implemented, with a unit test that compares outcomes |
| Browser verified | Implemented, with a Playwright journey through the interface |
| Reference only | Shown for information by design; changes nothing |
| Awaiting source | Needs research or data that isn't in hand |
| Awaiting configuration | Needs something only the owner can set up |
| Not implemented | Not built yet |

Nothing is called complete because a control exists or a field saves.

## Milestones

| | Milestone | State | Merged |
| --- | --- | --- | --- |
| A | Baseline audit, owner-data access, frozen world profiles | Built and tested; see below | With the first checkpoint of this package |
| B | Shared picker, option records, starter libraries, field inventory, the zombie example | Built and tested; see below | With the second checkpoint |
| C | Every creative input expanded; medium pipelines; controlled comparisons | Built and tested, with the limits below | |
| D | Real people: identity, availability, auditions, hiring, contracts, pay, credits | Built and tested, with the limits below. Done before C: see `DECISIONS.md` | With the third checkpoint |
| E | Real destinations, scouting, geography-aware production | Built and tested, with the limits below | |
| F | Studio strategy, Warner Bros., Sony and Paramount, territorial releases, competition | Under way: see "Milestone F, So Far" below | |
| G | Optional portraits and posters, pack refresh and storage controls | Under way: see "Milestone G, So Far" below | |
| H | Connected playthroughs, performance, accessibility, migration, final coverage | Not started | |

Do them in this order. Each is a vertical slice: interface, engine, save, failure behaviour and proof.

## Milestone A

### What Was Asked

`01-MASTER-BUILD-SPEC.md` section 2, and `00-START-HERE.md`'s review targets: owner mode had no authentication and no
local-only binding; series profiles still read the installed catalog.

### What Was Found

| Target | Found in the code at `8a60369` |
| --- | --- |
| Owner mode | Confirmed. `--owner` set one boolean; `server.listen(port)` bound every interface; any request got TMDB's data. Vite's dev and preview servers passed `films: true` the same way. |
| Series profiles | Confirmed. Only `rec`, the last recorded season number, was kept. `decide`, `plan`, `decisionDate`, `nextPremiere` and `renewalOdds` read the installed catalog's networks, type, status, genres, seasons aired, model season and regulars at every decision. |
| Worldwide simultaneous releases | Not checked yet: milestone F. |
| Studio chosen by pace | Confirmed in `studios.ts` `careerStudio`: a studio is picked by films a year alone. Milestone F. |
| Earned money shortcut | Not reopened: `tests/earnings.test.ts` still guards it. |

### What Was Built

| Piece | Where | Status | Evidence |
| --- | --- | --- | --- |
| A gate on every film route: this machine, or a signed-in session | `server/catalog-handler.mjs` `createOwnerGate`, `isLocalRequest` | Engine verified | `tests/catalog-server.test.ts`, "who gets the owner's data", 5 tests; two mutations fail them |
| The owner's server listens on this machine alone; another address needs a passphrase file, or it won't start | `server/serve.mjs` `ownerPlan` | Engine verified | Same file, "starts on this machine alone" |
| Sign-in route, twelve-hour session cookie, lockout after five wrong tries, private caching | `server/catalog-handler.mjs` | Engine verified | Same file |
| Owner Passphrase in Settings, Mods, shown only where the server offers it | `src/ui/DataPacks.tsx` `OwnerSignIn`, `src/catalog/packs.ts` | Browser verified | `e2e/owner-access.spec.ts`, desktop and phone, production build, port 4180 |
| A frozen profile per simulated series; decisions read only it | `src/engine/industry.ts` `FrozenSeries`, `freezeSeries` | Engine verified | `tests/industry.test.ts`, "decides from what the save froze"; a mutation fails it |
| Copies of recorded seasons deleted after the first simulated season, and at TMDB's six months | `expireIndustrySources`, `src/ui/App.tsx` `expireSources` | Engine verified | "deletes its copies of recorded seasons"; a mutation fails it. The hourly check in the app is not browser-tested. |
| Newer records only when asked, previewed, with a copy of the save kept first | `worldRefreshPreview`, `applyWorldRefresh`, `store.takeNewerRecords`, `keepBeforeWorldRefresh`, Settings "Your Story's World" | Browser verified | `tests/industry.test.ts`, "takes newer records only when asked"; `e2e/world-refresh.spec.ts`, desktop and phone; a mutation fails the unit test |
| The pages read the frozen outlet, pattern season and cast | `src/catalog/world.ts`, `src/catalog/simseason.ts`, `src/ui/Catalog.tsx` | Browser verified | `e2e/world-refresh.spec.ts`, `e2e/living-world.spec.ts` |

### Limits Of Milestone A

- The owner sign-in journey runs on Chromium only. The session cookie is marked `Secure`, and of the test browsers only
  Chromium keeps a `Secure` cookie on plain-HTTP `localhost`. The rules themselves are tested request by request.
- Remote owner use needs HTTPS in front of the server. None is set up; a host is the owner's choice.
- A preview shown through a cloud proxy counts as "from elsewhere", since the proxy forwards the request. Seeing TMDB's
  data there needs a passphrase file.
- The hourly source-expiry check in the open game has a unit test for the rule and none in the browser.

## Milestone B

### What Was Asked

`01-MASTER-BUILD-SPEC.md` sections 3, 5 and 6; `02-CREATIVE-LIBRARIES.md`, the option record and the worked example;
`example-project.json`. A shared picker, typed option records checked at build, the starter library bound to the
engine, the field inventory, and the 1986 zombie film proved through delivery with its three comparisons.

### What Was Found

- Makeup was a crew role and nothing else. Every costume was one unit of one shared task. A creature was three build
  days whatever it was. Nothing chosen about a look changed a day or a cost.
- A period was decided by a genre and the wording of a free-text era. A year couldn't be declared.
- A crowd was always everyone on set.
- The package's starter options have placeholder patches and all say "proposed, not implemented". Each needed a real
  one, or an honest statement that it is a note.

### What Was Built

| Piece | Where | Status | Evidence |
| --- | --- | --- | --- |
| Makeup methods, costume sources, appearance states, crowd makeup, a crowd extended in post, the story's year | `src/engine/looks.ts`, read by `projects.ts`, `production/tasks.ts`, `schedule.ts`, `shoot.ts`, `estimate.ts`, `hiring.ts`, `callsheet.ts` | Browser verified | `tests/looks.test.ts`, 21 controlled comparisons; three mutations fail them; `e2e/creative-ideas.spec.ts` |
| One command path for every idea, with a pure preview | `src/engine/brief.ts` | Browser verified | `tests/brief.test.ts`, 15 tests, including every idea applied and forty random ideas twelve times over |
| The library: 187 ideas and the logline builder's 52 parts | `src/ideas/` | Engine verified | `tests/ideas.test.ts`, 10 contract tests |
| The picker: Recommended, Browse All, Saved, Build A Logline; preview; Apply; a sheet on a phone | `src/ui/IdeaPicker.tsx` | Browser verified | `e2e/creative-ideas.spec.ts` on desktop, phone and WebKit (iPhone 15 Pro Max) |
| Choose Ideas on 30 fields; the look controls on characters and scenes; the Creative Brief | `src/ui/ScriptViews.tsx` | Browser verified | Same journey |
| The worked example, built from ideas, compared and delivered | `tests/zombie.test.ts` | Engine verified | 6 tests: the brief, the work, the call sheet, delivery with every cost paid once, the three comparisons |
| Journey J01 | `e2e/creative-ideas.spec.ts` | Browser verified | A chosen premise made the player's own, scenes ticked, genres, 1986, creature makeup, a built costume, approval, backing, cast, crew, the schedule's call sheet, save and reload, the shoot and delivery |
| The two audit tables | `docs/creative-depth/FIELD-INVENTORY.csv`, `EFFECT-COVERAGE.csv` | Engine verified | `tests/creative-depth-audit.test.ts` rewrites and checks both |

`docs/creative-depth/IDEAS.md` explains the picker and the library. The calibration figures are in
`docs/ASSUMPTIONS.md`, "How People Look On Screen".

### The Example's Required Effects

| The example asks for | Where it is |
| --- | --- |
| Period wardrobe sourcing and fittings | A costume task and a fittings task per sourced character, after period research |
| Creature appliance tests, application capacity and continuity | Build and test tasks; chair time out of each day worked; a build per appearance state |
| Extras only in selected creature scenes | The crowd is on the one scene given it, made up head by head |
| Local night and daylight, and weather | Already in the shoot day and call sheet; the example's night exterior is called at 5:00 PM with sunrise and sunset |
| Original score commissioning | The score task every project has; the synth palette is a note for the composer |
| No universal quality bonus | A test fails if the quality, takes, directing or awards code reads any look, method, source or year |
| Set in 2026 instead | Period research goes; costume work shrinks; the creature's makeup is unchanged |
| A digital crowd | Fewer people on set, plates on the day, a crowd-extension task after the lock; the other scenes unchanged |
| Stop motion | Puppets, armatures, sets and animators; voices kept; no chair, fitting, appliance or location work |

### Limits Of Milestone B

- **Notes that could be mechanics.** Sixteen of the starter options are notes because no engine reads them yet: four
  camera treatments, nine sound treatments, two puppet finishes and a stylized anachronism. Camera, lighting and sound
  engines are milestone C.
- **38 creative fields have no ideas yet**, listed in the field inventory as "Not yet". Milestone C.
- **The logline builder's sentences are combinations.** 52 parts were written; the thousand-plus sentences are what
  they make.
- **Appearance states are a count**, not named states assigned to scenes. Scene-by-scene continuity states are
  milestone C.
- **A change after approval** goes through the existing draft approval, which previews cost and days and names
  affected work. There is no separate change-order record for a look yet.
- **WebKit** ran the main journey. The shorter second journey runs on Chromium only.

## Found On The Way, For Later Milestones

- `installPack` deletes the installed pack before storing the new one (`src/catalog/packs.ts`). An install cut short
  leaves no pack. The package asks for the old one to survive (`04-WORLD-STUDIOS-AND-MEDIA.md`, "Save and storage
  constraints"). Milestone G.
- The input audit's generator (`tools/input-audit/controls.py`) had fallen behind its table by eleven rows, corrected
  by hand at some point. They were carried back into the generator, which now writes the table as it stood plus the new
  row.

## Milestone D

Built before milestone C, because the owner named it as essential and nothing in it waits on C (`DECISIONS.md`,
"Milestone D Before C").

### What Was Asked

`03-PEOPLE-CASTING-AND-HIRING.md`: people from the film catalog can be considered, invited to read, offered parts and
approached for jobs through the game's own casting and hiring, with one identity however they were found; what is
recorded about them stays apart from what the game makes up; nobody's languages, background, health or character is
guessed; an unknown age is never silently an adult's; nobody is approached after a recorded death; and their work in a
save is listed apart from their recorded credits.

### What Was Found

- **Nobody from the catalog could be hired.** `people.ts` `personById` knew only the game's own people and threw for
  anyone else.
- **Nobody could be hired to write or direct a single film.** The Crew page showed its writer and director table for
  series only, though a film keeps one episode record and the shoot reads its director.
- **Hired writers and directors did no work and were paid nothing.** An episode writer, a co-writer, a script editor or
  an episode director was hired, credited and counted in the assessment without a day worked or a day paid. No page
  offered the co-writer's or the script editor's job at all.
- **Two jobs nothing reads.** The line producer and the casting director can be named, and nothing in the engine reads
  either. A recorded Producer or Casting credit is therefore offered no job, and the person's page says so.
- **A job the script doesn't call for had no place to be offered.** Someone considered for one now has a row on the Crew
  page under Jobs You Are Considering Someone For.

### What Was Built

| Piece | Where | Status | Evidence |
| --- | --- | --- | --- |
| One identity, `tp_<TMDB ID>`, made only when the player considers someone | `src/engine/guests.ts` `considerPerson`, `realId` | Browser verified | `tests/guests.test.ts` "makes one person of one ID"; journey J04 |
| What is recorded kept apart from what the game makes up, each labelled | `guests.ts` `RealPerson` (`rec`, `sim`); `src/ui/PersonWork.tsx` | Browser verified | `tests/guests.test.ts`, 11 tests; J04 reads the save and finds only the name, two dates, the credit counts and the day gathered |
| Jobs only from recorded credits; nothing supposed | `guests.ts` `evidenceOf`, `jobsOf`, `canApproach` | Browser verified | `tests/guests.test.ts` "for the jobs the record shows"; J05 |
| No languages, background, nationality or pronouns guessed | `people.ts`, `casting-notes.ts`, `production/language.ts`, `PlanViews.tsx` `CandidateList` | Browser verified | `tests/guests.test.ts` "nothing guessed"; J04 |
| Unknown age blocks every offer until the player marks them an adult in this story | `guests.ts` `canApproach`, `treatAsAdult`; `minors.ts` | Browser verified | `tests/guests.test.ts` "with no recorded birth date"; a mutation fails it; J05 |
| Nobody approached after a recorded death; someone contracted before it is unavailable from that day | `guests.ts` `canApproach`; `people.ts` `isAvailable` | Engine verified | `tests/real-hiring.test.ts` "nobody is approached after a recorded death"; a mutation fails it |
| Considered people on the part's or job's own list, first, marked as from the catalog | `hiring.ts` `candidatesFor`; `PlanViews.tsx` | Browser verified | `tests/real-hiring.test.ts` "is one person however they were found"; J04, J05 |
| Audition, counteroffer, contract, one diary across projects, refusal for a clash, free after a reschedule | existing `casting-calls.ts`, `hiring.ts`, `people.ts`, now resolving real people | Browser verified | `tests/real-hiring.test.ts`, 12 tests; a mutation on the shared diary fails one; J04 |
| Shoot, pay for each day once, credit by name, and their work in the story on their own page | existing `production/shoot.ts`, `finish.ts`; `guests.ts` `storyCredits` | Browser verified | `tests/real-hiring.test.ts` "is shot with, paid"; J04, including a reload |
| Release, replacement, and what they ask next time | existing `hiring.ts` `releaseHire`, `relationships.ts` | Engine verified | `tests/real-hiring.test.ts` "released before the work is done" |
| A voice part recorded in a session | existing animation pipeline | Engine verified | `tests/real-hiring.test.ts` "a voice part is a voice part" |
| TMDB's six months for each copied record: renewed from a newer catalog, or the name withdrawn from what the game wrote | `guests.ts` `expireRecords`, `restoreNames`; `src/ui/App.tsx` `expirePeople` | Engine verified | `tests/guests.test.ts`, 3 tests; a mutation fails them. The hourly check in the open game has no browser test |
| A writer and a director for a single film | `PlanViews.tsx` `EpisodeAssignments`; `guests.ts` `jobLabel` | Browser verified | J05 |
| Writers commissioned by the pass: scope, days and cost shown first, paid by the day, delivered, accepted or revised | `src/engine/writing-jobs.ts`; `src/ui/WritingWork.tsx` | Browser verified | `tests/writing-jobs.test.ts`, 11 tests; seven mutations fail them; J05 and the series journey in `e2e/journeys.spec.ts` |
| Only accepted work is credited or counted, weighed by its scope | `writing-jobs.ts` `acceptedRead`; `finish.ts` `assessQuality`, `computeCredits`; `projects.ts` `assignEpisodeRole` | Engine verified | `tests/writing-jobs.test.ts` "accepted, the episode is theirs", "a polish counts for less" |
| The brief and the notes kept as written, shown back, never read | `WritingJob.brief`, `WritingPass.text`; `WritingWork.tsx` | Browser verified | `tests/writing-jobs.test.ts` "the brief and the notes are kept as written and change nothing"; J05 reads them from the save |
| A hired director on set and paid for each day they direct | `production/shoot.ts`; `hiring.ts` `estimateDays` | Browser verified | `tests/writing-jobs.test.ts` "is paid once for each day they direct"; a mutation fails it; J05 |
| Two jobs for one person on one project, each its own contract and pay | existing `hiring.ts` | Browser verified | J05 (director and editor) |

### Limits Of Milestone D

- **A hired writer's pass doesn't change the script.** The scenes the player wrote are what is shot. A pass changes who
  is credited, what it costs, how long it takes, and how the script is assessed. Nothing reads the words of a brief or a
  note.
- **Not implemented: a producer's job, and a casting director's.** Recorded credits of those kinds are shown and
  offered nothing. Not implemented either: agents or representatives, and an offer's scope beyond the job and its days.
- **Not tested with a real person:** motion capture, a child from the catalog under the child-performer rules, and
  awards naming a real person. The code paths are the game's own, which have their tests.
- **The audition comparison, callbacks and chemistry reads** work for real people through the same code; the browser
  journey covers the first read, the shortlist and the offer, not a callback.
- **The hourly six-month check** in the open game is tested by rule, not in the browser.
- **A live catalog was not used** in any test: every person in the tests and journeys is a made-up fixture. Identity
  against TMDB's real data is not separately verified here.
- **Availability is bookings, not holds.** A person is busy for the weeks of a contract in this save and for the other
  work the save made up for them. An inquiry hold, with its own expiry, is not implemented.
- **The made-up level has one recorded input:** how many credits the installed catalog holds for the job, in bands. It
  is a game figure and is labelled so; it is not a measure of anyone's ability.
- **Earlier projects keep their rules.** A project begun before this has no `writing` list, and its hired writers are
  credited and counted as they were. Its hired director is paid for shoot days from now on.

## Milestone C, So Far

Being built on the branch `c-work`, after milestone D. Not yet a checkpoint.

| Piece | Where | Status | Evidence |
| --- | --- | --- | --- |
| Camera rigs scene by scene: reset and running time, how takes vary, the crew each needs, rented kit, rehearsal | `src/engine/craft.ts`; `takes.ts`, `hiring.ts`, `production/tasks.ts`, `shoot.ts`, `schedule.ts`, `estimate.ts` | Engine verified | `tests/craft.test.ts`, 5 tests under "how the camera moves" |
| The light for the film: available, high contrast, macro on miniatures | `craft.ts` `LIGHTS` | Engine verified | `tests/craft.test.ts`, 3 tests under "the light" |
| Sound choices held together, and the score's palette with its sessions | `craft.ts` `SOUNDS`, `SCORES` | Engine verified | `tests/craft.test.ts`, 3 tests under "the sound and the score" |
| The package's camera and sound options made mechanical: 12 that were notes now set these | `tools/ideas/from-starter.py`, `src/ideas/starter.ts` | Engine verified | `tests/brief.test.ts`, `tests/ideas.test.ts`; 4 starter options remain notes (two puppet finishes, a stylized anachronism, source music) |
| Looks with names, assigned scene by scene; only the looks that appear are made; a change inside a day costs time | `src/engine/looks.ts` `stateNames`, `stateIn`, `statesUsed`, `changeMinutes` | Engine verified | `tests/states.test.ts`, 4 tests |
| 154 ideas for fifteen more fields; props, animals, vehicles and effects chosen from ideas make their work | `src/ideas/scenes.ts`; `brief.ts` ops `scene`, `needs`, `season` | Engine verified | `tests/scene-ideas.test.ts`, 6 tests |
| 68 routes through the genre families: four for each of 17 families, so every one of the 149 genres is offered at least four. Each is a tone, a light, sound choices, a score and three scenes offered | `src/ideas/routes.ts`; picker button Routes Through Its Genre | Engine verified | `tests/routes.test.ts`, 6 tests, including that the same work is assessed the same whichever route was chosen |
| Controls for all of the above | `src/ui/ScriptViews.tsx` (Light, Sound And Score; looks' names; a scene's look), `PlanViews.tsx` (Camera For each scene) | Not implemented in a browser journey yet | Unit tests only; no Playwright journey has used them |

Counts, from the code: 409 ideas written (188 change the work, 207 are words, 14 are references); 263 labelled
controls, of which 52 have ideas, 190 have none by design with the reason given, and 11 have none yet. The 68 routes are
written entries, not combinations: no route is counted more than once for the genres it is offered to.

Already in the engine before this package, and left as it was: animation and stop-motion work counted once for each
character and each place (models, rigs, puppets, environments, miniature sets), so scenes that share them share the
work; a design changed after its work began sends only the work built on it back; a stage set built to match as a site
choice for any location; documentary, unscripted and television pipelines with their own tasks. Their tests are the
ones they had.

Still to do in C: a browser journey through the new controls (written as `e2e/craft.spec.ts`, not yet run); ideas for
the 11 fields that have none (the genre questions, what each episode moves, acts, threads, setups, relationships and
arcs). Not implemented, and not
planned as part of this pass: a puppet's face method for stop motion; painted backgrounds as their own task in 2D; a
series bible and standing sets as records of their own.

## Milestone E

Built on the branch `e-work`, after milestones D and C. Engine and browser checks below were run there on November 11,
2026; the whole-suite run for its checkpoint is recorded in `QA-REPORT.md` when it is made.

| Piece | Where | Status | Evidence |
| --- | --- | --- | --- |
| Each place in the script can be filmed in any real place of the world registry, apart from where the story is set | `src/engine/destinations.ts` `setFilmedAt`, `filmPlace`, `dayPlace`; `src/ui/FilmedAt.tsx` | Implemented, browser verified | `e2e/destinations.spec.ts` (J07) on desktop, phone and WebKit: Bergen chosen through the place picker, kept across a reload. `tests/destinations.test.ts`, 8 tests |
| What the choice asks is shown before it is chosen: distance, whose weather and clock, fee share, permit days, noise, the move and the housing | `destinations.ts` `filmedAtPreview`; `FilmedAt.tsx` | Implemented, browser verified | J07 reads each line in the dialog before pressing Film It There |
| The day has that place's weather, daylight, public holidays and clock, and the player has to be there | `production/shoot.ts`, `production/schedule.ts` `scheduleShootDay`, `callsheet.ts`, the Schedule page's forecast | Implemented, browser verified | J07: rain in Bergen stops the first Harbour day; the call sheet reads "Filmed in Bergen, Norway, on Bergen's clock: be there for the call"; the Kitchen day at the base starts late without the player, who is in Bergen, and no Bergen day does |
| A unit away from base is moved once and housed each day it is called; near the base nobody is | `destinations.ts` `awayCosts`, `moveCost`, `awayDayCost`; `estimate.ts`; `shoot.ts` | Implemented, browser verified | J07: the estimate line "Filming in Bergen: Harbour"; one move posting and one housing posting for each of the two days called there. The soundstage journey: no move or housing posting in the same city |
| Thirteen kinds of site: fee share, permit days, noise, cover | `destinations.ts` `SITE_KINDS`; `production/tasks.ts` (`prep:permit`) | Implemented, browser verified for a coastline and a soundstage; the other eleven engine verified | J07: the task "Permits And Arrangements: Harbour, In Bergen" is done before the shoot. `tests/destinations.test.ts` for the rest |
| A site under a roof (a soundstage, or the stage set built to match) is not stopped by rain, snow or short days, and gets no rain warning | `locations.ts` `roofed`; `shoot.ts`; `callsheet.ts`; the Schedule page | Implemented, browser verified | `tests/destinations.test.ts` "a roof over an exterior": the same film and seed in Tromsø, in the open, on a soundstage and on a stage set (mutation checked). The soundstage journey against the wet-October journey in `e2e/journeys.spec.ts`: same base, month, seed and streets, no day lost to rain |
| Scouting's three sites are found in the filmed place, the first is "The Candidate Site" and never called real, and a backup takes over when it falls through | `locations.ts` `siteName`, `siteNote`, `siteOnTheDay`; the Locations card | Implemented, browser verified | J07: the candidate site falls through, the shoot goes to the stage set, and under its roof both scenes are shot |
| Rain expected: the interior day is filmed instead | `shoot.ts` `swapWithInteriorDay` (already there), now on the filmed place's forecast | Implemented, browser verified | J07: Film an Interior Scene swaps October 27 and 28 |
| The candidate site is made up and says so; no venue, address, owner, rate or permission is stated | `destinations.ts` `candidateSite`, `filmedAtPreview`; `FilmedAt.tsx` | Implemented, browser verified | J07 reads the sentence on the card and the "game's figures, not quotes, rates or legal guidance" line |

Not implemented in E, each a limit a player can meet:

- The schedule is built on the base's working days and public holidays. A day that falls on a public holiday of the
  filmed place is still scheduled, and pays that place's holiday premium.
- Child-performer rules follow the production's base, not the place a day is filmed in.
- A backup place (as against a backup site in the same place), the unit's travel days on the calendar, and the crew's
  own travel time are not modeled. The move is a cost paid once.
- Real venues, film-commission or tourism records, addresses, opening hours, real permit rules, taxes, visas, customs
  and incentives: reference-only by design. Nothing is imported and nothing is claimed.
- Places come from the world registry as it is. A country with few registry places offers few; no coverage note is
  shown beside the picker.
- J07 ran from one base (London) to one place abroad (Bergen, October) and one soundstage in the base's own city.
  Other seasons and regions are covered in the engine tests (Tromsø in January), not in a browser.

## Milestone F, So Far

Being built on the branch `f-work`, after milestone E. Not yet a checkpoint.

| Piece | Where | Status | Evidence |
| --- | --- | --- | --- |
| Skydance (Paramount and Warner Bros.) and Sony in the company registry: 50 more companies with titles gathered, 12 networks and services, 18 leadership roles, each ownership date from an official source or left out | `src/catalog/registry.ts`; `docs/CATALOG.md` | Implemented, engine verified | `tests/catalog.test.ts`, 28 tests: acquisition dates, groups, leaders hidden before October 6, 2026 |
| Their films, series, seasons, episodes and people gathered from TMDB into the owner's local catalog | `tools/screen-catalog/import.mjs` | Under way: the gathering run was started on November 11, 2026 and takes hours; its counts go in `docs/CATALOG-COVERAGE.md` when it ends | Not yet reported |
| A studio's strategy from the pace its save froze: genres, animation and documentary shares, release month, slate, reach (modeled and said so) | `src/engine/strategy.ts` `strategyOf`, `slateRoom`, `strategyWords` | Implemented, browser verified | `tests/strategy.test.ts`; J08 reads "What Night Shift Pictures Makes" |
| A pitch is read by fit, room, script and record, with no chance in it; two studios answer one film differently and say why | `strategy.ts` `pitchRead`; `finance.ts` `studioOption`, `pitchToStudio` | Implemented, browser verified | `tests/strategy.test.ts`, 10 tests, 6 mutations caught; `e2e/studio-pitch.spec.ts` (J08) on desktop and WebKit |
| An offer for a proven filmmaker, an option for a first film, notes read again only with a newer draft, a pass that is final | `finance.ts` (kind `studio`) | Implemented, engine verified; the option is browser verified | `tests/strategy.test.ts`; J08 |
| Which followed studio makes a distribution or commission offer is decided by fit, not by films a year | `studios.ts` `careerStudio`; `strategy.ts` `fitWeight` | Implemented, engine verified | `tests/competition.test.ts`: the busiest studio makes none of the offers for a film it wouldn't make |
| On delivery the studio opens the film at home, then four territories every two weeks, each a release of its own | `finish.ts` `'studio-release'`, `windowDate` | Implemented, browser verified | J08: US, then GB, FR, DE and ES fourteen days later |
| Reports count only territories the film has opened in; one set of reports for the deal | `distribution.ts` `territoriesReached`; `finish.ts` release handler | Implemented, browser verified | `tests/strategy.test.ts`; J08: the studio is repaid from what it reports |
| Subtitled at the distributor's cost or dubbed at yours, with the cost and the effect stated first | `finish.ts` `setReleaseVersion`, `dubbingCost`; the Release page | Implemented, browser verified | J08: $37,800 set aside and paid on the day it opens abroad |
| Backers named properly in sentences ("Night Shift Pictures offered", not "the night shift pictures offered") | `src/engine/backer-words.ts` | Implemented, browser verified | J08 checks the log; this also fixes commissions from a named studio, which read wrongly before |

Not implemented in F so far, each a limit a player can meet:

- A studio is pitched feature films only. Television labels have no slate of their own to pitch a series to.
- A distributor's own offer for several territories still opens them all on one day; only a studio's release is
  staggered. The player's own releases can already be planned territory by territory with their own dates.
- The films opening the same week are shown on the Release page for information. They change no figure.
- Local holidays in a territory, marketing spend, and screens booked are not part of an opening.
- Budget bands, franchises and who at a studio decides are not modeled. No real executive is given a preference.
- Sony's ownership dates are not recorded: its own pages refuse automated readers.
- International and independent groups beyond these four are not covered. Four Hollywood groups are not the whole world.

## Milestone G, So Far

Being built on the branch `g-work`, after milestone F. Not yet a checkpoint.

| Piece | Where | Status | Evidence |
| --- | --- | --- | --- |
| A pack is installed beside the one it replaces and takes its place in one step; cancelled, cut short or out of room, the installed pack stays whole and in use | `src/catalog/packs.ts` `installPack`, `sweep` | Implemented, browser verified | `e2e/data-packs.spec.ts` J09 on desktop, phone and WebKit: an update cancelled part-way leaves every record of the installed pack as it was |
| The browser's free room is asked before anything is written, and a refusal says what is needed and what removing the installed pack would free | `packs.ts` `storageRoom`, `STORAGE_MARGIN` | Implemented, browser verified | J09, with the browser made to report almost no room (labelled fixture) |
| Settings shows what the browser reports free and what the mods hold; Cancel stops a download or an install | `src/ui/DataPacks.tsx` | Implemented, browser verified | J09 |
| A download cut off goes on from where it stopped | `packs.ts` `installOffered`; `server/catalog-handler.mjs` (`Range`) | Implemented, engine verified on the server side; the browser side is not exercised by a journey | `tests/catalog-server.test.ts`: a 206 with the rest of the file, a 416 past its end |
| The optional picture pack: its format, its index of what is known about each picture, and the same six months | `packs.ts` (kind `images`, `pictures`, `pictureUrl`); `tools/pack-format.mjs`, `tools/pack.mjs` | Implemented, browser verified | `tests/packs.test.ts`; J09 installs one and reads its details |
| Gathering it: a plan with counts and megabytes before anything is fetched, two sizes, never the original, no credential | `tools/screen-catalog/images.mjs` | Implemented, engine verified; run for real once | `tests/packs.test.ts` "the picture gatherer"; a real run for Pixar on November 11, 2026: 455 pictures, 5.8 MB |
| Pictures on a title's page, a person's page and the cast list, in boxes of fixed shape, read only near the screen, with a plain placeholder otherwise and a switch on the device | `src/ui/Picture.tsx`, `Catalog.tsx` | Implemented, browser verified | J09: the box is the same size before and after; the picture is a decoded image; off and on again |
| A film or picture pack that passes six months while the game stays open is deleted within the hour | `packs.ts` `expirePacks`; `src/ui/App.tsx` | Implemented, browser verified | J09 moves the page's clock an hour on |
| The picture pack is offered and served to the owner alone | `server/catalog-handler.mjs` `offeredMods` | Implemented, engine verified | `tests/catalog-server.test.ts` |
| Removing a pack never touches saved games; the open game goes on and opens again after a reload | `packs.ts` `removePack` | Implemented, browser verified | J09 |

Not implemented in G, each a limit:

- People can't be chosen one by one for the picture pack: the choice is by company, and by how many top-billed cast.
- Backdrops, logos and episode stills are not gathered.
- Each picture's own licence is not checked. The pack states that rights belong to each owner and claims nothing more.
- The picture pack built here covers one studio (Pixar), as a real test of the tool. Larger ones are the owner's choice.
- Going on with a cut-off download is tested on the server; no browser journey cuts a download off.
- J10 (a refreshed pack changes nothing a save has decided) is `e2e/world-refresh.spec.ts`, from milestone A; it was
  not extended here.

## The Audit Artifacts

| File | State |
| --- | --- |
| `docs/input-audit/CONTROLS.csv` | From the November 10 connectivity pass, kept in step since: 257 labelled controls, each classed, with its consumer and tests. The base for the field inventory. |
| `docs/creative-depth/FIELD-INVENTORY.csv` | Written from the code: 257 controls, each with a decision. |
| `docs/creative-depth/EFFECT-COVERAGE.csv` | Written from the code: 188 rows. Grows with each milestone's options. |

## Checks Run For Each Checkpoint

Recorded in `QA-REPORT.md`, newest first, with exact counts.
