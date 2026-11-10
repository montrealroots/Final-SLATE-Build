# Episode Release Schedules

Written November 10, 2026, when episode dates became something the player chooses.

## What It Replaced

Until then a series' episode dates weren't stored. `awards-rules.ts` `episodeAirDates` assumed them from the first
release on television or online:

- a broadcast aired one episode a week from its release date;
- anything else put every episode out on that day.

A season that broke for the holidays, or one split across two years, couldn't be released, and the airing rules (the
International Emmys' majority and hanging episodes) judged a schedule nobody had chosen.

## The Model

Each release of a series on television, streaming or digital keeps its episodes (`ReleaseRecord.episodes`).

- Each episode has a stable id, `<release id>-e<number>`.
- Each has its own date and a status: `planned` until its day comes, then `released`.
- A released episode is never moved again.
- The release's own date is its first episode's.

`ReleaseRecord.pattern` says how the dates were chosen:

- a preset: all at once, weekly, or several on the premiere and then weekly;
- `custom`, your own dates;
- `assumed`, for a release rebuilt from an older save.

The presets only produce dates to start from. The player edits each one before planning (`finish.ts` `planRelease`),
and can change any date still to come later (`episode-releases.ts` `setEpisodeDates`).

Each release keeps its own schedule. A season can come out weekly on British television and all at once on an American
streaming service. The rules read the earliest date for each episode (`airings`).

## What It Is Connected To

| Connection | Where | Evidence |
|---|---|---|
| Events | `syncReleaseEvents`: the release's first day, then one event for each later day an episode comes out. Every change rebuilds them from the dates, so a moved date replaces its event and none is doubled. Cancelling a release removes them all. | `tests/episode-releases.test.ts` "one event per day, replaced when dates move, never doubled"; "cancelling removes every event" |
| Episodes coming out | The release handler (`finish.ts`) marks the first day's episodes out. `episode-release` events mark the rest, each with a log line and a history entry. | Same test; journey B |
| Distribution | Moving a premiere that is still to come moves the release's date, and an exclusive window counts from the new day. A distributor's earnings still start when the release comes out (`onDealReleased`). | "a premiere still to come moves the release day and an exclusive window with it" |
| Delivery | A release is planned only after delivery, as before. A delay is a change to dates still to come. | `planRelease` |
| Calendar | Each day episodes come out is on the calendar under My Schedule, marked Out once it has happened and Assumed Date where it was rebuilt. | "the calendar shows each day episodes come out, and which have" |
| Award windows | The International Emmys' majority and hanging-episode rule reads the stored dates. An entry for one episode (the Emmys' directing and writing) qualifies by that episode's own date. Until November 10, 2026 it used the release's first day. | "a split season across the year end"; "an episode entered on its own qualifies by its own date" |
| Planned is not proof | An entry that counts episodes still to come is provisional, and names how many are still to come. Until November 10, 2026 only a planned first airing made it provisional. Entries are checked again when reviewed and before judging. The re-check now includes the entry's episode and song; until then an episode's entry was checked as the season. | "a delay before entries are reviewed gets the entry turned down"; "is disqualified before judging when they move out of the window" |
| Snapshots | An entry keeps each episode's date and status as it stood (`EntrySnapshot.airing`), shown under As Entered. | "a split season across the year end" |
| Before you confirm | `release-schedule.ts` `scheduleChangeEffects` tries the change on a copy of the game. It lists each episode that moves, what has already come out, whether the release day and an exclusive window move, and every unjudged entry whose qualification would change. | "a split season across the year end"; journey B |
| Save and reload | Save version 9 (`migrateV8toV9`). | "a version 8 save gets the dates the rules assumed" |

## Older Saves

A version 8 save's series releases are given the dates the game assumed then, so nothing it was judged by changes.

- Every episode is marked `assumed`, and the release `pattern: 'assumed'`.
- The Release tab says these are dates the game assumed, not dates recorded at the time.
- Episodes dated before the save's own day, in a release that had happened, count as out.
- Later ones are still to come, with their events added.
- Entries, their stored snapshots, results and reasons are left exactly as they were.

A release written without episode dates by a test fixture is read by the same assumption (`airings`), marked assumed.

## Evidence

- `tests/episode-releases.test.ts`: 11 tests.
- `e2e/release-schedule.spec.ts` (journey B), desktop. It plays a series made, staffed and shot in the browser:
  - a hired director on episode 2;
  - delivered, then released weekly from December 20 with a break, so one of three episodes falls in 2026;
  - the International Emmys refusing it with the reason;
  - episode 2 brought back to December 27, the change previewed and confirmed;
  - entered provisionally, then reloaded;
  - two episodes out on their days.

## Not Modeled

- Episodes are numbered in the order they air. An episode can't air before the one before it.
- One territory's release can't hold back another's, and nothing stops a later release from airing an episode first.
- The International Emmys' advance approval for a US-first airing is still refused, as before.
