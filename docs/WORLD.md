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

## Next Phases

1. **Series continue or end.** When a season's finale has aired, its network decides on renewal at a set point
   afterwards. A renewed series gets a dated new season, and its recorded regulars return. The odds come from the
   series' own record, not from TMDB ratings or popularity.
2. **Studios keep releasing.** New titles follow each studio's recorded pace and genres, with invented titles and
   invented people.
3. **Competition.** Studios' titles enter festivals, awards, distribution and commissions alongside the player's.
4. **Careers.** The studios commission, distribute and hire the player through the game's existing systems.

From Phase 2 on, decisions are scheduled engine events stored in the save, so they hold across reloads and stay the
same for a seed.

## Tests

- `tests/world.test.ts` covers spans, what counts as news, endings inside the story, and tense at the save's date.
- `tests/catalog.test.ts` checks that the build writes the world file.
- `e2e/catalog.spec.ts`, "the industry on Home and the calendar", runs on desktop and phone with a made-up world.
