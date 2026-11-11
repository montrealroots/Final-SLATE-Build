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

These are game calibration, chosen by judgement so that new series are riskier than established ones and outlets keep
their own calendars. No renewal rates were measured or sourced, and the game doesn't claim the numbers are the
industry's. (Until November 11, 2026 this said they came "from how renewals usually go", which implied a source there
isn't.) `tests/industry.test.ts` checks forty seeds over ten years for coherence, not for realism of the rates.

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
- **In Your Story.** A series' page has this card. It shows what the save's world has decided, a line for each
  simulated season that opens its page, and who returns, told once. It is labelled as simulated, and the recorded
  history above it doesn't change. The series' Seasons list carries the simulated seasons after the recorded ones,
  marked Simulated. A season TMDB listed without dates that the save's world has since dated is listed once, as the
  simulated one.
- **A simulated season's page.** It opens from the card, the Seasons list, Home and the calendar, and has:
  - **About This Season:**
    - its status at the save's date and its network;
    - when it was announced, and whether as the final season;
    - its premiere and finale, with weekdays;
    - its episode count and how many have aired;
    - its release pattern and nights, and how many breaks it has;
    - its run in weeks;
    - the recorded season it is patterned on;
    - what came after it: renewal, cancellation or the series ending. If nothing has been decided, it says when the
      outlet usually decides, never the date the save has scheduled.
  - **Episodes:** every episode's date and weekday, with the premiere, the finale, a return from a break and two episodes
    on one night marked.
  - **Breaks:** each stretch without a new episode, and its length.
  - **Returning Cast:** the recorded regulars, each with their age at the premiere where TMDB records a birth date. A
    regular the records say died before the premiere is listed as not returning, and nobody is cast in their place. The
    real catalog has seven, among them *General Hospital*'s Tyler Christopher and Michelle Trachtenberg, whose recorded
    seasons still listed them.
  - **Other Seasons:** the seasons before and after it, recorded or simulated.

  Episode titles and stories aren't recorded or simulated, so the page gives none. Nothing here is stored beyond the
  decisions the save already keeps.
- **Without the catalog.** If the catalog isn't installed, nothing starts. If it goes missing later, the engine waits
  rather than deciding blind.

## Each Save's World, Held Steady (November 11, 2026)

The owner's foundation brief asked that loading late, reloading, switching saves, refreshing the data or losing it never
change what a save's world has decided. What holds it, with the test for each:

- **The source version.** A save's world starts once, from the first catalog it sees, and records that build
  (`state.industry.builtAt`) and the records' end (`horizon`). It keeps both whatever catalog is installed later.
- **The start.** Decisions are dated from the records' end, never earlier. A save made before a catalog was installed
  starts its world when one arrives, and makes the decisions that fall between in date order, dated as they would have
  been.
- **Late or missing data.** A decision that falls due while the catalog's world file isn't loaded waits, and keeps the day
  it was due (`due`). Until November 11, 2026 it was decided on the day the wait ended, so a slow or missing catalog
  changed the save's world. Nothing is erased while it waits. Test: a catalog gone for 19 months and back decides exactly
  what one there all along does (`tests/industry.test.ts`).
- **A refreshed catalog.** (Extended the same day: see "What A Save Keeps" below, which freezes every other input too.)
  Each simulated series records the last season its save began with (`rec`). A later catalog
  may correct what was recorded up to then. It never adds seasons the save has made its own, nor a recorded ending, to
  the series' page, its seasons and episodes, Home or the calendar. A season page for one of those says it isn't in this
  story. Decisions already made are never rewritten. A save begun before `rec` was kept takes it from the first catalog
  that decides for it. Tests: a refresh after and before the first decision; no season number told twice.
- **Reloads and two saves.** The world is kept in the save and decided by its seed, so a reload partway, or another save
  played in between, ends where one played straight through does. Tests: the unit test above, and
  `e2e/foundation.spec.ts` in the browser (two saves, one past the records, switched with Saved Games).
- **What it isn't.** The renewal odds and timing are judgement, not data (above), and forty seeds over ten years are
  checked for coherence, not realism: dated after the records, numbered in order, announced before they air, starting
  after the last season ends, and closed for good.

## What A Save Keeps (November 11, 2026)

The Creative Depth package's first milestone found that keeping `rec` wasn't enough. Every decision still read the
installed catalog for the rest: which networks a series is on (so what kind of outlet, so when and how it is decided),
whether it is a limited series or a pilot, its genres, how many seasons it has had, the season new ones copy, and who
returns. A refreshed catalog that changed any of those changed what an old save decided next.

Now each simulated series has a frozen profile in the save (`SimSeries.p`, `FrozenSeries` in `src/engine/industry.ts`),
taken once when the save's world starts. Decisions read it and nothing else. It holds two kinds of thing, kept apart
because they last differently:

| Kept | What | How long |
| --- | --- | --- |
| The game's own classes | The rules version (`v`), the kind of outlet, limited series or pilot, animated or not, seasons aired counted to six (the rules read no finer), the number of the season it is patterned on, a daily programme's anchor date, and the returning regulars' person IDs | For the life of the save |
| A copy of recorded facts | `last` and `model`: the last recorded season, and the one new seasons copy (episode count, spacing, dates, breaks) | Until the save makes its own first season for that series, when they are deleted; and never past TMDB's six months |

- **No names.** A save holds no title, network name or person's name from the catalog: those are read from the installed
  catalog when a page is shown. A test fails if a fixture's names appear in a save.
- **The rules version.** `INDUSTRY_RULES` is 1. A later change to the odds or timing takes a new number, and a save
  keeps deciding under the one it froze.
- **TMDB's six months.** The copies of recorded seasons count from when the catalog's oldest record was gathered
  (`IndustryState.from`, from the catalog's index). When six months have passed by the real clock, the open game deletes
  them (`expireIndustrySources`; checked when a game opens and every hour while it stays open). Nothing the save decided
  is touched. A series nothing had been decided for is marked, waits while no catalog is installed, and takes its
  pattern again, up to the seasons the save began with, from the catalog installed when its decision comes due. That is
  the one case where a later catalog's record of an old season reaches an old save, and it is the price of not keeping
  TMDB's records past their time.
- **Who returns.** The returning cast is the frozen IDs, less anyone the installed records say died before the
  premiere. A death is a fact the game won't contradict, so that one reading stays live.
- **A save begun before this.** It freezes its profiles from the first catalog that loads, limited to the seasons it
  began with (`rec`), and keeps them.
- **Studios.** Their pace was already kept (`IndustryState.studios`): films a year, genre and month counts. Those are
  totals the build worked out, not TMDB's records, and stay.

Tests (`tests/industry.test.ts`): a catalog changed in every field a decision used to read leaves ten years of
decisions identical, straight through and across a reload; the profile's keys and the absence of names; the copies gone
after the first simulated season; expiry at exactly 180 days, with decisions kept and an undecided series waiting, then
resuming. Three mutations each fail one of them: reading the catalog again at each decision, never expiring, and
refreshing series already decided. In the browser: `e2e/world-refresh.spec.ts`.

## Taking Newer Records (November 11, 2026)

A save keeps the records it began with. When the installed films and series were gathered later, Settings says so
under Your Story's World, and the player may take them, for series nothing has been decided for yet.

- **See first.** See What Would Change lists each such series and what differs (the kind of outlet, the pattern, a
  longer record, the cast), and any series the newer records follow that the save doesn't. Looking changes nothing.
- **A copy first.** Take The Newer Records saves the game and keeps that save as a recovery copy ("Copy from before
  newer records were taken", in Saved Games). If either can't be done, nothing changes.
- **What changes.** Only the listed series: each is frozen again from the newer records, and its pending decision
  planned again, never dated before today. New series join, decided from today on.
- **What never changes.** Any series something has been decided for, every decision and season already made, the
  records' end (`horizon`), the build the world started from, and the studios' pace, so no film this save has seen
  moves. Each opt-in is recorded in `IndustryState.refreshes`.

## Phase 3: Studios Keep Releasing (November 11, 2026)

After the records end, each studio the catalog follows goes on releasing films (`src/engine/studios.ts`).

- **The pace.** The build writes each studio's recorded pace into `world.json`:
  - films a year over the five years before the records end;
  - their genres and release months, by count;
  - the films already dated in each year from the records' end on;
  - its name.

  A save keeps this snapshot when its world starts (`IndustryState.studios`), so a later catalog never changes films the
  save has already seen. A save whose world began earlier takes it from the first catalog that has it.
- **The films.** Each year, a count is drawn around the studio's pace, less the films the records already date in that
  year, which play as recorded. In the records' last year, only the part after they end counts. Each film gets:
  - a date in one of the studio's recorded months, never on or before the records' end;
  - one or two of its recorded genres, by weight;
  - an invented title, an invented director, writer and lead, and a running time.

  The films follow from the save's seed and the snapshot, so they are the same on every reload, and are not stored.
- **Where they show.** Each is labelled Simulated:
  - Home's In The Industry;
  - the calendar;
  - the studio's page, under After The Records, with those due in the next year;
  - its own film page.
- **What decides nothing.** TMDB's ratings, popularity, budgets and box office are never read.

Running it on the real catalog (19 studios, the records ending November 11, 2026) gives Walt Disney Pictures about 7.6
films a year and Pixar about 3.8, less what each already has dated.

## Phase 4: Competition (November 11, 2026)

- **Awards and festivals.** A studio's films released in an edition's eligibility window enter it alongside the
  player's work and the season's other films (`awards-results.ts` `rivalsFor`). They enter only where the category takes
  their format, medium and genre. Each one's strength is drawn from the seed for that film, as the season slate's is.
  Results name the studio and say the film is simulated.
- **Cinemas.** They take screens alongside the recorded films and the player's: wide, on their date, in every country
  (`src/world/programme.ts` `simulatedOpenings`). Where each would really open isn't recorded for films that don't exist;
  that is game calibration.

## Phase 5: Careers (November 11, 2026)

The studios make offers through the game's existing systems:
- **Commissions** (`opportunities.ts`): a well-received project's follow-up proposal comes from a followed studio about
  half the time.
- **Distribution** (`finish.ts`): an offer for a cinema release comes from one about half the time.

The studio is chosen by weight of its pace, from studios releasing at least one film a year. It is drawn from a stream of
its own, so every other part of an offer is as before. The amounts are the game's, never anything read from TMDB.

Hiring the player as a performer or crew member isn't a system the game has; careers come through commissions and
distribution, as the brief puts it ("through the game's existing systems").


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
- `tests/simseason.test.ts` covers the simulated season's page:
  - nights and breaks;
  - ages;
  - regulars who died before the premiere;
  - decisions known only once the save reaches them;
  - the outlet's usual timing;
  - where each simulated item opens.
  - every series runs until it ends;
  - it is the same for a seed and survives a reload;
  - it waits without the catalog;
  - it doesn't read ratings.
- `e2e/living-world.spec.ts` checks a save that passes the records' end:
  - the decision is kept in the save, and kept after a reload;
  - the series' page shows it as simulated, with its returning regulars;
  - the season's own page shows its dates, breaks and nights, who returns and who doesn't, and the seasons around it;
  - the series' Seasons list carries it.
