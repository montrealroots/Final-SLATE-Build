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
| C | Every creative input expanded; medium pipelines; controlled comparisons | Not started | |
| D | Real people: identity, availability, auditions, hiring, contracts, pay, credits | Not started | |
| E | Real destinations, scouting, geography-aware production | Not started | |
| F | Studio strategy, Warner Bros., Sony and Paramount, territorial releases, competition | Not started | |
| G | Optional portraits and posters, pack refresh and storage controls | Not started | |
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

## Plan For Milestone D, Worked Out But Not Built

Read from the code on November 11, 2026, so the next session can start building.

- **Identity.** TMDB's person ID is already global: the catalog keys people by it and gathers their credits across every
  company. A real person in a save is `tp_<id>` in a new `state.real` record, made when the player first considers or
  approaches them, never before.
- **Two parts, kept apart.** A copy of what is recorded (name, birth and death dates, a count of credits by job, with
  the date it was gathered), and what the game makes up for this save (experience level from the count and span of
  credits, a capability drawn around it, an asking rate from the role's base rate, other work that keeps them busy).
  Everything made up is labelled as this story's, never as fact.
- **Where they plug in.** `people.ts` `personById` resolves only generated IDs today and throws otherwise;
  `hiring.ts` `makeOffer` requires `person.roleId` to equal the job. Both need a branch for `tp_` IDs, with jobs taken
  from credit evidence (a cast credit for acting; Director, Screenplay or Writer, Producer and the craft jobs for
  theirs). After that the existing offer, counteroffer, booking, audition, callback, pay, credit and relationship code
  works on them as on anyone: bookings are already kept per person across projects in `state.people`.
- **Rules the package sets.** No approach after a recorded death. With no recorded birth date, no hiring until the
  player marks them as an adult for this story, said to be simulated. A recorded child is under the child-performer
  rules like anyone. No languages, background or pronouns are guessed: languages show as not recorded, and a dialect
  coach is offered, not required.
- **TMDB's six months.** The repository's reading is that nothing from TMDB is kept longer. So at six months from the
  day a person's record was gathered, an installed catalog renews the copy; with none installed, the name and dates are
  removed from the save and from the log lines and credits that carry them, and shown as withdrawn until a catalog is
  back. What the save decided (contracts, pay, work) stays.
- **Pages.** The catalog's person page gets Consider For A Role and Approach As…, each saying what stands in the way.
  The Cast and Crew candidate lists show people being considered beside the generated ones. A person's page lists their
  work in this story in its own section, apart from their recorded credits.
- **Proof.** Journeys J04 and J05; a fixture person credited under two companies; a second project that finds them
  booked; a counteroffer; cancellation; a missing age; expiry.

## The Audit Artifacts

| File | State |
| --- | --- |
| `docs/input-audit/CONTROLS.csv` | Exists from the November 10 connectivity pass: 230 labelled controls, each classed, with its consumer and tests. The base for the field inventory. |
| `docs/creative-depth/FIELD-INVENTORY.csv` | Written from the code: 247 controls, each with a decision. |
| `docs/creative-depth/EFFECT-COVERAGE.csv` | Written from the code: 188 rows. Grows with each milestone's options. |

## Checks Run For Each Checkpoint

Recorded in `QA-REPORT.md`, newest first, with exact counts.
