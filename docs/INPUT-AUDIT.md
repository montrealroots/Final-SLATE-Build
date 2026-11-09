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
