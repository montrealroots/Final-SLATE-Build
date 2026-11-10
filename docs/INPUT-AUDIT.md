# Input Audit: Every Saved Field Is Read

The owner asked on November 9, 2026 for an audit of every player input: what completes its loop and has downstream
effects, and what doesn't. Their follow-up: "Everything that doesn't read needs to read perfectly."

## How It Was Measured

The saved game is `src/engine/types.ts`. Every property was traced with the TypeScript language service, so a name
shared by several types (`title`, `status`) counts only for its own field. Each reference was then sorted as one of:

- a write;
- a read by a rule;
- a read by a screen;
- validation or migration only.

The language service can't follow keyed reads (`p.story[k]`), spreads or look-alike types. So every field it flagged
was read again by hand before deciding.

The result was 61 fields that nothing read, and 4 player inputs that changed nothing.

`e2e/readers.spec.ts` shows a setting abroad, a note about a scene, a draft's date and a project's updates in the browser; `e2e/auditions.spec.ts` shows callbacks only for the shortlist.

`tests/model-readers.test.ts` now runs the same measurement on every check. It fails on any field of the saved game
that nothing reads, by a rule or a screen. Validation and migrations don't count as readers.

## The Four Inputs That Changed Nothing

| Input | Before | Now |
|---|---|---|
| Genre **Primary/Secondary** | Kept to one primary; nothing read it. Any comedy genre made a project compete as comedy. | The primary genres decide comedy or drama (`script-effects.ts` `competesAs`). A comic secondary genre leaves a drama a drama. |
| **Where The Story Is Set** place | Stored, then never shown or used. | Shown and editable in the Story panel, and on the Overview. A setting in another country than the base adds **Setting Research** (3 researcher days) before design and costumes, as a period does (`projects.ts`, `production/tasks.ts`). There is still no travel, as the review of November 7, 2026 decided. |
| **Shortlist** (auditions) | Ordered the table only. | Callbacks are for the shortlist (`casting-calls.ts` `callBack`), as in casting. The table says so. |
| A thread's **characters** | Shown only. | A structure note when a character the thread follows is in none of its scenes (`structure.ts`). |

## Records Now Read

| Field | Its reader |
|---|---|
| `Plan.remindMin`, `kind`, `projectId` | The reminder names the day when it comes a day ahead. A project's plan leads to the project, and the calendar names the project and the reminder. "Plan To Attend" had pushed its plan by hand, so its day-before reminder never fired. It goes through `addPlan` now. |
| `LogEntry.projectId` | Project Overview, Recent Updates. |
| `Draft.savedAt` | The drafts list. |
| `RevisionNote.sceneId` | The notes list names the scene; a note can be added about a scene. |
| `CastAssignment.note` | Written when a part is cast (after a callback, after an audition, on an offer alone, or yourself) and shown in the cast list. |
| `Hire.offeredAt`, `FinanceDeal.askedAt`, `counter.askedAt` | Offer, approach and counteroffer dates. |
| `estimateAtApproval.at`, `.total` | Estimate Against Spending: when, and how much in all. |
| `Obligation.postings` | Each budget line's How It Moved: held, agreed, paid and released, with dates. |
| `CompetitionResult.scores` | The judges' scores under each episode's result. |
| `UnscriptedSetup.redactions[].episode`, `.sceneIds` | What is being cut of a withdrawn contributor, per episode. |
| `ScreenTime.sceneMinutes`, `.at` | A record is stale when the scene's length has changed since it was recorded, longer or shorter; until now only a shorter scene made it stale. The record shows its date. |
| `Song.createdAt`, `EditState.lockedAt`, `EditState.versions[].at` | The songs list, the picture lock and the cut versions show their dates. |
| `ReleaseRecord.note`, `DistributionOffer.broadcastEdit` | The release says it is in a late slot or carries a broadcast edit, or what its cancellation returned. |
| `Project.createdAt`, `revisionPasses`, `renewal.decidedAt` | Overview. |
| `Project.changeOrders` | Production tab, Design Changes. Each order lists the tasks it sent back; until now that list was always empty and its cost always 0. The cost field was removed: a design change costs time, not a separate payment. |
| `PersonState.history[].projectId`, `.at` | People You've Worked With: the project, opened from there, and the date. |
| `EditionEntry.submittedAt`, `.fee`, `EntrySnapshot` recipients and song | As Entered: when, the fee, each person's credit, the song's writers, and anyone or any song since removed. |
| `RivalFilm.people`, `.medium`, `.runtimeMin` | Results: About The Other Works. |
| `Opportunity.projectId` | Overview: who proposed the project, after which work. |
| `GameState.createdAtReal` | Saved Games: when each was begun. |
| `GameState.sleep.since` | The wake message says how long you slept. |
| `CharacterIdentity.middleName`, `GenrePick.emphasis` | Already read, through look-alike types. Now typed against the model. |

## Removed, Not Read

A stored copy of something the game already holds can only disagree with it. These were removed instead of given a
reader:

- `ProjectAxes.basis`, which repeated the format;
- `productionModel`, which repeated the budget size;
- `distributionIntent`, which was always "Festival Then Distribution";
- `Project.requirementsVersion`, which repeated the approved draft;
- `Project.playerActing`, which repeated the cast list (shoot days keep their own flag, which is read);
- `Project.workEventScheduled`, which nothing used;
- `StoryCharacter.groupSize`, which was never written (scenes count their crowd);
- `Scene.songs`, superseded by songs as works in save version 8 (only the v7→v8 migration knows the old shape);
- `Settings.reducedMotion` and `largeText`, which are the device's: Larger Text is stored in the browser and motion follows the system setting, the same for every saved game.

Old saves keep these keys, and nothing reads them.

## Does Each Choice Change Play? (November 10, 2026)

A field that has a reader doesn't prove that a choice has consequences: a screen that shows it is a reader too. So on
November 10, 2026 the owner asked for every player input to be classed by what it does, and for each gameplay decision
to be followed from the control to its effect, and then compared: the same world from the same seed, one choice
changed, the intended difference seen and the unrelated outcomes left exactly as they were.

### Every labelled control, classed

`docs/input-audit/CONTROLS.csv` lists all 221 labelled controls in `src/ui` (text, select, number, check, place,
language and genre fields), each with its class, the saved state it writes, the code that reads it, the effect, a unit
test and, where there is one, a browser journey. `tools/input-audit/controls.py` writes it and holds the classification.
`tests/input-audit.test.ts` fails when a control is added or removed without a row, when a decision has no reader, no
effect or no test, or when a cited test no longer exists.

| Class | Controls | What it means | Evidence |
|---|---|---|---|
| Decision | 132 | Changes a rule, an action, work, the schedule, a cost, eligibility, an assessment or an outcome | Every one cites a unit test (132); 73 also cite a browser journey that makes the choice in the UI (55 until the pass after #59) |
| Identity or creative expression | 57 | What you chose, kept and used where it belongs: names, descriptions, pronouns, backgrounds | Shown where it belongs. 24 cite a unit test where it is used (credits carry the legal name, casting shows a shared background) |
| Historical record | 16 | A name or a note about something that happened, shown back as written | Shown. Nothing scores it |
| View | 15 | Search, filter or sort on a screen; not game state | None needed |
| Component | 1 | A shared component's own definition | None needed |

Buttons that act (Call Back, Cast, Approach, Submit, Release) aren't labelled fields. Each is a command with a preview and
a refusal, checked by `tests/action-previews.test.ts`; the trace below follows the ones in the owner's list.

Names, identity, descriptions and dates were not given scores. A character's thread list, for example, is creative
expression with one consistency check: a structure note, advisory, so it weighs on nothing (`projects.ts` marks it, and
`finance.ts` `scriptScore` skips advisory notes).

### Displayed, affects play, verified on a journey

"Displayed" is the reader guard above (`tests/model-readers.test.ts`). "Affects gameplay" is a decision with a unit
test that shows the difference. "Verified through a full journey" is a browser journey that makes the choice and sees
its effect in the UI. Of the 132 decisions, all affect gameplay by a unit test; 73 are also on a journey (55 until the
pass after #59, November 10, 2026). The other 59 are verified in the engine only. A journey counts only when it makes the choice in the UI. Nine
citations were dropped on November 10, 2026 because their journey never did: it set the value with a labelled fixture
(each episode's writer and director, the genres, the dialogue languages) or never reached the control (proficiency, a
release date, what to capture, a day rate, stop-motion stages). Two were moved to the journey that does make the choice
(Route, Change Financing Target).

#### The pass after #59 (November 10, 2026)

The counts above were recalculated from the table, not carried over: 132 decisions, 55 with a journey, 77 without.
Eighteen were then given browser evidence. Each citation in `CONTROLS.csv` now has `journey_kind` and `journey_proves`:

- `journey_kind` is `targeted` or `playthrough`. A targeted interaction journey stops once the decision has done what
  it does. A full playthrough makes the project in the browser through production.
- `journey_proves` says what the test shows: the consequence on the screen, the refusal or limit met, and whether the
  choice was read back after Save And Exit and Continue.

Rows cited before this pass take their kind from their spec file and have no `journey_proves`; their effect column says
what they show. Of the 73, 50 are targeted and 23 come from playthroughs.

| Journey | Decisions | Profiles |
|---|---|---|
| `e2e/decisions.spec.ts` "work schedule and staffing rates" | Rehearsal Days, Six-Day Weeks, Work On Public Holidays, a performer's Day Rate | Desktop, phone, iPhone 15 Pro Max (WebKit) |
| `e2e/decisions.spec.ts` "release settings" | Episodes On The Premiere, Territory Code | Desktop, phone, iPhone 15 Pro Max |
| `e2e/decisions.spec.ts` "genre emphasis and dialogue languages" | Genres and which is primary, dialogue languages, Competes As (Story panel), Speaks | Desktop, phone, iPhone 15 Pro Max |
| `e2e/journeys.spec.ts` "TV limited series" (playthrough) | Writer For Episode | Desktop |
| Existing journeys whose consequences were already asserted, now cited | Emphasis, Coverage and Takes For a scene, Site For a place, Awards Placement, Essential To The Story, Source Material | As each runs |

The release settings journey labels one fixture: the series is marked delivered in the save. Making one is the work of
`rolling-delivery.spec.ts` and journey B. Every choice it tests is made in the browser. The other new journeys set
nothing in the save but the pinned world seed.

Still engine-only (59):

- Script detail on the Script and Characters pages (36): scene heading, minutes, needs, setups, claims, character
  entity, realization, age, involvement, functions and methods, competition rules and content. Several are used by
  journeys (Estimated Minutes, Role Size, Planted In) whose assertions don't read that control's own consequence, so
  they are not cited.
- Clock and sleep (Shell, Startup and Places, 9). Production capacity (stop-motion stages, render nodes, puppet copies,
  blocks) and a backup site (5): their consequences show only after weeks of production. Creation's start time and
  proficiency (2). A pickup's scenes, and what to capture (2). Animation Finish, Intended Audience, Competes As on New
  Script, and Story Era (4). Minutes a song plays (1).

### Controlled comparisons

`tests/decision-effects.test.ts` changes one decision in an otherwise identical world. Each comparison was checked by
breaking the rule it relies on; each break failed it.

| Decision | What changes | What stays the same | Rule broken to check it |
|---|---|---|---|
| Which genre is primary | Comedy or drama in the awards that split them | Work, checks | `competesAs` reading emphasis |
| Where the story is set, abroad | Setting Research, 3 days, before design and costumes | Shoot, edit, delivery, cast, checks | The setting-research task |
| A thread's characters | An advisory structure note | Work; backers don't read it | The structure note |
| When the story is set (`storyTime`) | Period and present-day categories accept or refuse it | Work, checks. Period research follows the era written (`axes.storyEra`), not this | `awards-rules.ts` `period` case |
| Animation finish | Render time is three times as long; animation work grows | Frames, other work, every cost not for animation or rendering | `RENDER_HOURS_PER_FRAME.feature` |
| Your language proficiency, and the language a part speaks | A part in a language you speak only at Basic needs a dialect coach | The rest of the crew, the work | `language.ts` proficiency and part language |
| Six-day weeks | The same days end sooner, with Saturdays worked | The days, their scenes, their count | `isWorkingDay` on Saturdays |
| Financing target | What is still to raise; whether a backer can be asked | The estimate, the work | `financeSummary` reading the target |

### The owner's list, traced

Each row goes input → saved state → engine consumer → result → what the player is told → after a reload.

| Area | Input → state | Consumer → result | The player sees | Unit evidence | Journey | Reload |
|---|---|---|---|---|---|---|
| Screenwriting | Scenes, places, interior or exterior, characters → `scenes`, `characters` | `projects.ts` `deriveRequirements`, `production/tasks.ts` `buildTasks` → work and its order | The breakdown and the estimate | `estimates.test.ts` "a cut says what it saves" | `journeys.spec.ts` | `script-effects.test.ts` "survive save and load" |
| Genres | Genres and which is primary → `axes.genres[].emphasis` | `script-effects.ts` `competesAs`; genre modules → checks and work | The Golden Globes drama category turns a comedy-led feature away, and says why | `decision-effects.test.ts` | `decisions.spec.ts` "genre emphasis and dialogue languages" | Read back after Save And Exit |
| Setting and research | Where it is set → `axes.settingPlaceId` | `projects.ts`, `production/tasks.ts` → Setting Research | Story panel, Overview, the work list | `decision-effects.test.ts` | `readers.spec.ts` "a setting abroad" | Saved with the project |
| Characters and threads | A thread's characters → `threads[].characterIds` | `structure.ts` → advisory note | Script notes | `decision-effects.test.ts` | `structure.spec.ts` keeps a thread, not its characters | Saved with the project |
| Casting and callbacks | Shortlist → `auditions[].shortlisted`; Call Back | `casting-calls.ts` `callBack` refuses anyone not shortlisted; a callback narrows the read | The audition table, the refusal | `auditions.test.ts` "a callback narrows it" | `auditions.spec.ts` | `auditions.test.ts` "a shortlist and a pending callback survive a save" |
| Episode assignments | Each episode's writer and director → `episodes[].writer`, `.director` | `production/schedule.ts` (directors never share a day; blocks); `episode-assessment.ts` | Schedule, credits, each episode's result | `episodes.test.ts`, `episode-assessment.test.ts` | `release-schedule.spec.ts` (a hired director on episode 2, credited on it alone); `journeys.spec.ts` "TV limited series" (a hired writer on episode 2) | Saved with the project |
| Production choices | Six-day weeks, holidays, blocks, stages, render nodes → `schedule.*` | `production/schedule.ts` `isWorkingDay`, `workday.ts` | The schedule and the costs | `decision-effects.test.ts`, `media.test.ts`, `heritage.test.ts` | `decisions.spec.ts` "work schedule and staffing rates" (six-day weeks, holidays, rehearsal); stages, render nodes, puppet copies and blocks have none | Read back after Save And Exit |
| Edits | Cut a scene, accept a gap, lock picture, a version's scenes | `cost-cuts.ts`, `edit.ts`, `versions.ts` → savings, cancelled days, the version's runtime | Each cut's saving before it is made | `cost-cuts.test.ts`, `script-effects.test.ts`, `versions.test.ts` | `awards.spec.ts` "Emmys guest" (a shorter version) | `directing.test.ts` "the choice survives a save" |
| Songs | Origin, lyrics, performers, scenes, a version's song | `songs.ts` `songTasks`, `songCredits`; `awards-rules.ts` `songProblems` | Songs card; As Entered names the song | `songs.test.ts` | `awards.spec.ts` "Songs" | Migrated from v7 (`songs.ts` `migrateV7toV8`) |
| Financing | Target, backer approaches, offers | `finance.ts` `financeSummary`, `decide` | Still to raise; the offer and its terms | `decision-effects.test.ts`, `finance.test.ts` | `careers.spec.ts` "stop motion: refused for lack of money" | `connected.spec.ts` reloads |
| Releases | Route, territories, date, each episode's date → `releases[]`, `releases[].episodes` | `awards-rules.ts` qualifying routes, airing, `firstShown`; `episode-releases.ts` | The release, its episode dates, eligibility reasons, a preview before a change | `qualifying-routes.test.ts`, `recipient-rules.test.ts`, `episode-releases.test.ts` | `journeys.spec.ts` "2D animation: deliver, release digitally"; `decisions.spec.ts` "release settings"; `rolling-delivery.spec.ts` | Read back after Save And Exit |
| Award submissions | Category, version, recipients → `entries[]` with a snapshot | `awards-rules.ts` `requirementProblems`, judging | Eligible or why not; As Entered | `awards-catalog.test.ts` | `awards.spec.ts` | `awards-catalog.test.ts` "survive a save and reload unchanged" |

No broken link was found in these areas: every decision listed reached a rule, and each comparison showed its
difference. The episode air dates were an assumption, not a choice: broadcast meant weekly and streaming meant every
episode at once, with no way to choose. They became a choice on November 10, 2026 (`docs/RELEASE-SCHEDULES.md`).

## Cycles That Stopped Short (November 10, 2026, after #60)

The owner asked that everything in the game have a complete cycle and downstream effects. Inputs were already traced
above; this pass traced outcomes: each thing the game produces, and what reads it next. It ran three ways:

- **Saved fields.** Every property in `types.ts` was checked for an engine read that isn't an assignment. 27 are read
  only by the screens. All are records or identity by design: timestamps, names, your own story text, reasons shown back.
  The few that sound like play reach play another way. Puppet copies drive build time through `schedule.puppetCopies`,
  and revision passes count notes marked addressed, which the script's score reads.
- **Scheduled events.** Every handler (37) was checked for a change of state beyond its log line. One wasn't: the
  festival screening.
- **The career loop.** Each step from delivery to the next project was traced by hand.

Four cycles stopped short. Each is closed now, with a test that compares the same world with one input changed
(`tests/cycles.test.ts`):

| What happened | What read it next, before | Now |
|---|---|---|
| How delivered work was received, and the awards it won | Nothing in funding: backers counted delivered projects only, so a flop and a prize-winner opened the same doors. Proposals read reception, not wins. | `finance.ts` `trackRecord`: the grant panel, investors and commissioners weigh average reception (up to ten points either way) and wins (five each, up to ten), and say so in their answer. A proposal counts a project's wins. |
| The money a finished project kept: what was left of its budget and its share of income | Nothing. It stayed in that project's budget for good. | A backer of your own, Your Earnings: it puts what your delivered projects kept into a new one, moved through both ledgers as a payment, with no repayment, share or approval rights. If less is kept by the time you accept, it is refused and nothing moves. |
| Attending your festival screening | A line in the log. | A wave of distributors' attention two days later, a third as strong as a win's (`awards-results.ts` `screeningHappens`). |
| Your own credited, delivered work | Nothing in your craft: your writing and directing were the baseline on every film, your acting 58 before rehearsal. | `finish.ts` `playerExperience`: each earlier delivered project with your credit in the role adds a step. That is a point as writer or director, up to 5 (a hire moves it -12 to +12), and two as a performer, up to 12. |

Browser evidence for the earnings cycle: `e2e/decisions.spec.ts` "what a finished film kept goes into the next", on
desktop, phone and iPhone 15 Pro Max. It labels one fixture: the earlier film is marked delivered with money left in its
budget. The other three closures have engine tests only. Their consequences show after a delivery, an award or a
festival run, which the existing playthroughs reach but don't assert on.

Not changed, on purpose: personal money outside projects, housing and taxes (`docs/FIRST-PROJECT-JOURNEY.md`, Not
Modeled). Your earnings stay with your projects and move between them.
