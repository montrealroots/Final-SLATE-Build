# The World Behind The Game

Begun November 10, 2026. The screen catalog (`docs/CATALOG.md`) is the real industry around the player. This document
says what each phase makes of it, what is real, what will be simulated, and what decides each.

## The Rule Across Every Phase

- **Real records stay facts.** A real record is shown on its recorded date and is never rewritten.
- **Real history plays first.** Until the records end (the catalog's retrieval date, November 10, 2026 for the current
  build), the world is the recorded one. A save that starts in January 2026 sees 2026 unfold as it did.
- **Simulation starts where the records end.** It is decided by the save's seed, kept in the save and labelled as
  simulated wherever it appears. Two saves can diverge without touching a real record.
- **What the records don't say isn't invented.** Where a record lacks a date, as with when a cancellation was
  announced, the game says that rather than making one up.
- **No catalog, no change.** A copy without the catalog plays exactly as before.

## Phase 1: The World's Clock (November 10, 2026)

The build writes `.screen-catalog/world.json` (`tools/screen-catalog/build.mjs`), which holds every dated event from
October 1, 2025 on:

- **Film releases.** A film credited to a company the catalog follows comes out on TMDB's primary release date.
- **Season premieres.** A season's premiere is its first dated episode, and a series' first season is its premiere.
- **Episodes and finales.** Every episode airs on its air date. A season's last episode counts as its finale only when
  the season is known to be finished: every episode is dated, and a later season exists or the series has ended. A
  running season lists only the episodes known so far, so its last one listed isn't a finale. This was found on the real
  catalog, where it had called the latest listed *Jimmy Kimmel Live!* episode a finale.
- **Seasons released all at once.** When every episode of a season has the same date, the season is one event ("All 8
  episodes of Season 2 came out"), not a premiere and a finale on the same day.
- **Continuous programmes.** Talk shows, soaps and news, and any series with a season of 100 or more episodes (such as
  syndicated game and court shows), run continuously. Their TMDB seasons are years, so they get no premiere or finale
  news and no calendar entry per episode. Their pages still list every episode.
- **Endings.** A series TMDB records as Ended or Cancelled, with its last episode on or after October 1, 2025, is told
  at the records' end. The news says when its last episode aired, and that when the ending was announced isn't
  recorded.

The current build holds 2,134 events:
- 77 film releases;
- 103 seasons, 29 of them released all at once;
- 1,932 episodes, with 35 finales;
- 22 endings.

758 of those events belong to the 7 continuous programmes.

Dates after the records' end were TMDB's schedule when they were taken. They play on those dates and say they may
change.

### What The Player Sees

- **Home, In The Industry.** What happened in the last 14 days and what is due in the next 14. That covers releases,
  premieres, finales and endings, told in the past or future tense at the save's date. Each line opens its film,
  season or episode.
- **Calendar, Film And Television.** A filter, on by default in new games, that shows releases, premieres and every
  episode, each opening its page.
- **Endings that are already history.** An ending is told only if the series' last episode aired after the save
  began. One that ended earlier is history, not news.

### How It Is Stored

Nothing in Phase 1 is stored in a save. Real events follow from the catalog and the save's date, so they are worked out
when shown (`src/catalog/world.ts`), and they never fill the game's log. The log keeps 400 entries for the player's own
history.

## Phase 2: Series Continue Or End (November 10, 2026)

`src/engine/industry.ts` continues every series that was still running when the records ended: 143 in the current
build. A series counts as running if TMDB lists it as Returning, In Production, Planned or Pilot.

The build writes a profile of each one into `world.json`:
- its network;
- its TMDB type, such as Miniseries;
- its genres;
- whether it is a daily programme;
- its last three recorded seasons;
- its recorded regulars, the last season's top-billed cast.

### What Decides

Each decision is a scheduled engine event, stored in the save with its date. It is decided by the save's seed, so it
holds across reloads and is the same for a seed. No decision is dated before the records end.

**The outlet.** It sets the timing:

| Outlet | When the decision comes | When a new season opens |
| --- | --- | --- |
| Broadcast (ABC, FOX, CBS, NBC, The CW) | At the May upfronts, for a season that ran September to May. A summer series hears 30 to 75 days after its finale. | A fall show returns in late September or early October. A midseason show returns around its usual month. |
| Cable (FX, FXX and others) | 30 to 90 days after the finale | 12 to 16 months after the last premiere |
| Streaming (Hulu, Disney+ and others) | 30 to 120 days after the finale | 14 to 25 months after the last premiere |
| Kids' channels (Disney Junior, Disney Channel and others) | 30 to 150 days after the finale | 11 to 16 months after the last premiere |
| Daily programmes | Each year rolls into the next, a month before the year is up | Near the same date the next year, on the same weekday |

**The odds of renewal.** They come from how many seasons the series has run and its outlet. They never come from TMDB
ratings or popularity:
- **New series are riskiest.** A first season is renewed 45% of the time on broadcast, 55% on cable, 50% on streaming
  and 75% on kids' channels.
- **Long runners mostly continue.** A long-running broadcast animated comedy is renewed 93% of the time.
- **Final seasons.** A series in its later years may be renewed for a final season, announced with the renewal. That
  is 15% for broadcast, 30% elsewhere, and 3% for a long-running broadcast animation.
- **Limited series** conclude after their season. They and final seasons end on their finale's date, not at a later
  decision.
- **A daily programme that isn't renewed** is cancelled while its last year still airs.
- **Pilots** are ordered to series or passed on.
- **Series announced with no aired season** are given a premiere date.

These are game calibration from how renewals usually go, not industry statistics.

**Already renewed.** A series still listed as running whose last season had ended before the records' end has already
been renewed, so its next season is given a date rather than decided again. A broadcast show past the fall slot goes
to midseason.

**What a new season copies.** It takes these from the last complete season:
- its episode count;
- its release pattern (weekly, daily or all at once);
- its spacing, where every episode is dated: each episode keeps its day in the season, so the season's breaks come
  with it, such as a broadcast comedy's holiday weeks or a talk show's summer;
- its night: a new season opens on the weekday the season it copies opened on.

A season still airing when the records end lists only the episodes known so far, so it isn't used.

**Who returns.** The recorded regulars return in a simulated season, and nobody else is cast (the owner's rule).

### What Running It On The Real Series Changed

Five simulated years on the real series turned up these problems:
- **Partial episode counts.** New seasons had copied the partial count of a season still airing: 9 episodes for
  *Abbott Elementary* and 1 for *Only Murders in the Building*. They now copy the last complete season, which gives 22
  and 10.
- **Final seasons too often.** Final seasons came too often for evergreen animation: *The Simpsons* was given a final
  season in 2027. Long-running broadcast animation now gets a final season 3% of the time.
- **Calendar drift.** A daily programme's year drifted by a day across leap years.
- **No breaks.** A season copied only its usual gap between episodes, so *Abbott Elementary*'s 22 episodes ran straight
  from October to March. Its real seasons pause over the holidays and run into April.
- **Wrong night.** A season could open on any day of the week, so Abbott opened on a Thursday. It now opens on a
  Wednesday, like its recorded seasons.
- **Endings dated late.** Final seasons were told as ending at the next May upfronts, two months after their finale.
- **Weekend episodes.** Daily programmes aired every calendar day, weekends included. Copying the recorded spacing
  fixed that, but only once a programme's year is anchored to the same recorded season its spacing comes from.
  Anchoring to the newer season had put *General Hospital* on Saturdays.

After the fixes, five years of two seeds had no weekend episodes for the daily programmes, and every ending fell on its
finale. *Abbott Elementary* opens on Wednesdays in late September or October and ends in April; *The Simpsons* opens on
Sundays.

### What The Player Sees

- **Simulated news.** Decisions and simulated premieres and finales appear in Home's In The Industry, marked
  Simulated. A daily programme's yearly renewal isn't news.
- **Simulated calendar entries.** Simulated premieres and episodes appear on the calendar, marked (Simulated).
- **In Your Story.** A series' page has this card. It shows what the save's world has decided, each simulated season's
  dates and pattern, and who returns. It is labelled as simulated, and the recorded history above it doesn't change.
- **Without the catalog.** If the catalog isn't installed, nothing starts. If it goes missing later, the engine waits
  rather than deciding blind.

## Next Phases

1. **Studios keep releasing.** New titles follow each studio's recorded pace and genres, with invented titles and
   invented people.
2. **Competition.** Studios' titles enter festivals, awards, distribution and commissions alongside the player's.
3. **Careers.** The studios commission, distribute and hire the player through the game's existing systems.


## Tests

- `tests/world.test.ts` covers spans, what counts as news, endings inside the story, and tense at the save's date.
- `tests/catalog.test.ts` checks that the build writes the world file.
- `e2e/catalog.spec.ts`, "the industry on Home and the calendar", runs on desktop and phone with a made-up world.
- `tests/industry.test.ts` covers the engine:
  - it starts only with the catalog;
  - nothing is dated before the records end;
  - timing follows each outlet;
  - already-renewed series are dated;
  - limited series conclude;
  - pilots are decided;
  - renewed seasons follow their pattern;
  - a season keeps its night and its recorded breaks, and a final season ends at its finale;
  - every series runs until it ends;
  - it is the same for a seed and survives a reload;
  - it waits without the catalog;
  - it doesn't read ratings.
- `e2e/living-world.spec.ts` checks a save that passes the records' end: the decision is kept in the save, shown on the
  series' page as simulated with its returning regulars, and kept after a reload.
