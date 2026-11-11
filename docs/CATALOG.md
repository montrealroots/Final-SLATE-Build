# The Screen Catalog: Disney's And NBCUniversal's Companies, Films And Series

Written November 10, 2026. The catalog is reference material inside SLATE. It covers The Walt Disney Company's studios
and labels and their leadership, and the films and series TMDB credits to them, with their cast, crew, seasons, episodes
and people. Nothing in it changes the simulation. The coverage figures from the gathering run are in
`docs/CATALOG-COVERAGE.md`.

## NBCUniversal (November 11, 2026)

The owner asked for Universal once the foundation was done. The registry (`src/catalog/registry.ts`) now holds Comcast,
NBCUniversal, ten of its studios and four of its networks.

- **TMDB records.** Each company was found by TMDB's company search and checked against its TMDB details that day:

  | Company | TMDB ID |
  | --- | --- |
  | Universal Pictures | 33 |
  | Focus Features | 10146 |
  | Illumination | 6704 |
  | DreamWorks Animation | 521 |
  | Working Title | 10163 |
  | Universal Animation Studios | 5556 |
  | Universal Television | 26727 |
  | UCP | 7938 |
  | Universal International Studios | 87455 |
  | DreamWorks Animation Television | 42141 |
- **Ownership.**
  - Comcast took control of NBCUniversal on January 28, 2011, and bought GE's remaining 49% on March 19, 2013 (Comcast's
    timeline).
  - NBCUniversal acquired DreamWorks Animation on August 22, 2016 (Comcast's 10-Q).
  - Most cable networks left for Versant Media on January 2, 2026.
  - Comcast announced on June 29, 2026 that it would separate NBCUniversal, expected in mid-2027 (its 8-K).
  - Illumination's and Working Title's ownership had no official source, so neither is placed under NBCUniversal. Each
    is noted as released by Universal.
- **Before the group.** A title is marked as released before the acquisition by the latest acquisition along its
  company's chain (`registry.ts` `joinedGroup`). Universal Pictures' films before January 28, 2011 came out before Comcast
  owned NBCUniversal.
- **Leadership.** From NBCUniversal's own leadership page and its CinemaCon 2026 article. Universal Pictures, Focus
  Features, DreamWorks Animation and Working Title list none: no current official source named their heads.
- **The data.** TMDB's data, gathered as Disney's is. It is the owner's alone, as decided (`docs/DEPLOYMENT.md`).

## What TMDB's Terms Allow, And What That Decided

TMDB's API Terms Of Use were last updated October 20, 2023 and read November 10, 2026
(https://www.themoviedb.org/api-terms-of-use). They say:

- **Caching.** Section 1.C forbids caching anything from TMDB for longer than six months.
- **Termination.** Section 1.D says cached content must be purged when use ends.
- **No sublicensing or derivatives.** The terms forbid selling, leasing or sublicensing TMDB content or access to it
  (1.C) and making derivatives of it (1.C). They also forbid supplying archived or cached data sets to anyone for
  training (2.A).
- **No commercial use.** The license excludes commercial use without a separate written agreement (2.A).
- **Attribution.** The TMDB logo must be shown with the notice that the product uses TMDB but isn't endorsed by it
  (Section 3, and https://www.themoviedb.org/about/logos-attribution).

That decided these points:

- **No TMDB content is in the repository.** Git keeps history for good, and history may not be rewritten here, so a
  committed copy could never be purged.
- **Where the data lives.** The importer's responses go to `.screen-catalog-cache/` and the built catalog to
  `.screen-catalog/`. Both are ignored by git and stay on the machine that gathered them.
- **Six-month limit.** Every cached response records when it was retrieved. One older than 180 days is fetched again,
  and the build leaves out anything that is still too old.
- **Not in builds.** The catalog is never copied into a production build. Since November 11, 2026 it is served by the
  production server (`server/serve.mjs`) as well as the development and preview servers, all through one handler that
  answers one file at a time and withdraws a catalog past six months (`docs/DEPLOYMENT.md`).
- **Deployment is not settled.** Whether imported data may be deployed for players to use is a question for the
  owner, and for TMDB if the game is ever commercial. Until it is settled, nothing is published. What the terms say,
  and what remains to decide, is in `docs/DEPLOYMENT.md`.
- **What is committed.** Only our own research: the company and leadership registry (`src/catalog/registry.ts`), the
  importer, the build, the pages, the tests and a made-up fixture.
- **Attribution.** The TMDB logo and the notice are shown on the Companies page and in Settings, under Film And
  Television Data. The logo file came from TMDB's logos page.
- **No artwork.** No posters or photographs are shown. Image rights belong to their holders, and the terms don't
  settle them, so every page is text.

### The Credential

- **Where it lives.** The session's cloud proxy adds the TMDB credential to requests for `api.themoviedb.org`. The
  importer sends none, reads none and writes none.
- **The game.** It never calls TMDB. It reads the built files, so it works the same when TMDB is down.
- **Tests that hold this.** `tests/catalog.test.ts` scans the importer, the build's output and `src/catalog` for
  credential patterns. `e2e/catalog.spec.ts` fails if the page makes any request to TMDB.

## The Companies

`src/catalog/registry.ts` lists 38 companies:

- **32 production companies with verified TMDB records.** Titles are gathered for these.
- **5 networks and streaming services.** These are Disney+, Hulu, ABC, Disney Channel and FX. They are kept apart
  because where a title airs isn't who made it, so no titles are gathered for them.
- **The Walt Disney Company itself.** It is the parent, and TMDB credits no titles to it.

### How The Records Were Chosen

Each TMDB ID was found through TMDB's company search, then checked against the company's TMDB details: name, country
and headquarters. None was guessed.

A company that changed its name keeps its records apart, because TMDB credits a title to the name the company had
then. For example, 20th Century Fox (25) and 20th Century Studios (127928) are two records, as are Fox Searchlight
Pictures (43) and Searchlight Pictures (127929). A title keeps the name it was credited under.

### Ownership

Ownership is recorded with a date only where an official source gives one:

| Acquisition | Date | Source |
| --- | --- | --- |
| Pixar | May 5, 2006 | Disney's completion release |
| Marvel Entertainment | December 31, 2009 | Disney's completion release |
| Lucasfilm | December 21, 2012 | Disney's fiscal 2013 Form 10-K |
| 21st Century Fox's studios and television businesses | 12:02 a.m. Eastern Time, March 20, 2019 | Disney's closing release |

A title credited to an acquired company before its acquisition date says so on its page: "Made before The Walt Disney
Company owned it." Titles made under earlier owners are not counted as Disney productions.

### Left Out, With The Reason

- **Fox Television Studios (6529).** It closed before the acquisition.
- **The second Touchstone Television record (141822) and the older 20th Television record (21659).** Which companies
  they stand for isn't settled here.
- **Rename and closure dates.** The dates of the 2020 renames, Walt Disney Productions' change of name and Blue Sky's
  closure are not recorded, because no official source was checked for them.

## Leadership

### Where It Comes From

Executives come from the companies' own pages and announcements, never from screen credits:

- Disney's leadership page;
- the chief executive announcement of February 3, 2026;
- the Disney Entertainment leadership release of March 16, 2026;
- the Lucasfilm leadership page, and its announcement of January 15, 2026;
- Pixar's leaders page;
- Disney's Walt Disney Animation Studios announcement of September 19, 2024;
- a Disney article of July 25, 2024 naming Kevin Feige.

Each role keeps:
- the position as written;
- the company;
- its start, end and announcement dates as the source gives them;
- its source links;
- the date it was checked.

### How A Role Is Shown At A Save's Date

`catalog/model.ts` `standingAt` decides:

- **Current.** The role has begun and not yet ended.
- **Former.** The role has ended.
- **Incoming.** The role begins on a recorded date still to come. For example, Josh D'Amaro as chief executive between
  February 3 and March 18, 2026.
- **Announced** and **Leaving.** An appointment or a departure announced with no effective date. Until the registry was
  checked (November 10, 2026), when its sources showed the change made, the new holder is Announced and the old one
  Leaving: Lucasfilm's January 15, 2026 announcement makes Dave Filoni and Lynwen Brennan Announced and Kathleen Kennedy
  Leaving until then. Until November 11, 2026 the announcement made the new leaders current and Kennedy former at once,
  which put the change into effect on a date no source gives.
- **Hidden.** The role was announced after the save's date. For example, Debra OConnell's role, named March 16, 2026,
  doesn't appear in a January save.
- **Listed.** A source checked after the save's date names someone in a role with no start date, so whether they held
  it yet isn't known. The page says exactly that rather than calling them current.

### Not Listed

- **20th Century Studios.** Official sources named different people at its head, and none was recent enough to settle
  it.
- **Searchlight Pictures and Walt Disney Pictures.** No current official source was found for either.
- **Jonathan Garson as Pixar's next president.** News reports in November 2026 said he would become president
  effective January 4, 2027. No official Disney or Pixar announcement was found, and Pixar's page still lists him as
  General Manager, so that is all the game shows.

A leadership position is shown as a position. It says nothing about availability, hiring or terms.

## Gathering The Catalog

To gather it, run these in a session whose proxy has the TMDB network secret:

```bash
npm run screen-catalog:import
```

```bash
npm run screen-catalog:build
```

### Discovery

Each of the 32 companies is queried for both films and series (`discover/movie` and `discover/tv`, `with_companies`,
`include_adult=false`). Every page is read.

- **The page cap.** TMDB serves at most 500 pages of a query. A query past that would be split into five-year slices
  of release date. No query in this run reached it: the largest, 20th Century Fox's films, had 83 pages.
- **Titles that move.** Popularity order can shift while pages are read, so when a query finds fewer titles than it
  reports, it is read again in date order.
- **Deduplication.** Titles are kept once by media type and TMDB ID, so a film and a series with the same number are
  two titles. Every company a title was found for is kept with it.

### Details

- **Films** come with their credits, external IDs and release classifications.
- **Series** come with their aggregate and current credits, external IDs and content ratings.
- **Seasons.** Every season of every series is fetched, with each episode's crew and guest stars and the season's
  regular cast.
- **People's details** (birth, death, place, biography) are fetched for each title's top ten billed cast or series
  cast, its creators, and the crew credited as Director, Screenplay, Writer, Story, Producer, Executive Producer,
  Original Music Composer, Director of Photography or Editor. Everyone else credited has a page built from their credits
  in the catalog, which says their details weren't gathered.
- **What isn't fetched.** Nothing is fetched recursively: no filmographies outside the catalog, and no further
  companies.

### Requests

- **Pace.** About 30 a second, under TMDB's stated range of about 40.
- **Rate limits.** A 429 waits for Retry-After.
- **Other errors.** A server or network error is retried with backoff, up to five times, and then joins the failed
  queue (`.screen-catalog-cache/failed.json`). The next run asks for it again, and the build reports how many remain.
- **Missing records.** A 404 is an answer, cached as a missing record.
- **A refused credential.** A 401 or 403 stops the run and names the network secret.
- **Resuming.** Fresh responses come from the cache, so a rerun resumes where it stopped.

### Unknown Values Stay Unknown

TMDB uses 0 where a budget, revenue or runtime wasn't entered, so those are written as not recorded, never as $0. A
rating with no votes is written as no rating. TMDB ratings are labelled as TMDB ratings, with their retrieval date, and
never as IMDb ratings or audience scores.

## What The Pages Do

The pages are Companies, then a company (About, Leadership, Films And Series), then a film or series, then cast and
crew, then a person.

- **A series** leads on to its seasons, each season to its episodes, and each episode to its own crew and guest cast.
- **A title** links to its credited companies.
- **Search.** Titles can be searched across the catalog, and people by the start of their name.
- **Filmographies** can be searched, shown as films or series, and ordered newest, oldest or by title. They are
  paged 50 at a time.
- **Long cast and crew lists** show their first 40 with a button to show all. Nothing is cut short.

### Networks And Streaming Services (November 11, 2026)

The owner asked for the networks and streaming services the catalog's series are on.

- **Where they come from.** The importer fetches TMDB's details for every network a series in the catalog lists:
  105 networks. TMDB gives a name, country, headquarters and homepage. It records no owners.
- **Owners, from Wikidata (CC0).** `node tools/screen-catalog/networks.mjs`, run after the importer, matches each
  network to a Wikidata entry, and records which of three ways matched it:
  - the entry names the network's TMDB record (7);
  - the entry's official website is TMDB's homepage (46);
  - the entry is the only broadcaster or streaming service of that name in that country (29).

  Matches were read by eye on November 11, 2026, and 23 networks aren't matched. Their pages say their owners aren't
  recorded.
- **Dates keep their precision.** Wikidata writes an owner from "2025" as January 1, 2025. The tool keeps a year as a
  year and a month as a month, so a page says "since 2026", not a day nobody recorded.
- **At the save's date** (`ownersAt` in `src/catalog/model.ts`):
  - The page shows the owner at the save's date with when it began, never when it ends: that would be the story's
    future.
  - It shows earlier owners with their spans. Owners whose time hasn't begun aren't shown.
  - Owners Wikidata gives without dates are listed apart, as owners at an unknown time.
  - In a year in which ownership changed, at year precision, both owners are shown.
- **The pages.** Companies links to Networks And Streaming Services, a list of every network with its number of series.
  A network's page has About, Who Owns It, and the catalog's series on it, split into those that had premiered and those
  announced. A series' Network row links to its networks.
- **The engine.** A series on a network Wikidata records as a cable channel (cable, specialty, subscription or premium)
  now counts as cable in the living world's engine, so it is decided months after its finale, as cable is. Until then
  every series not on a named list counted as streaming: HBO's, Showtime's and USA Network's among them.
  - Broadcast isn't taken from Wikidata. It gives NBC, CBS and FOX only "television network", which it also gives
    premium cable channels, and it files MGM+ as a television station. The engine's own list of broadcast networks grew
    instead.

### Series Credits

Series credits are TMDB's totals across episodes, with the episode count. The page says plainly that this isn't a claim
of every episode. Each episode's page has its own credits.

### At The Save's Date

- **Titles.** A filmography shows titles released by the save's date, with a checkbox to include later and undated
  ones. A later title is labelled "Not released by …: due …, as announced", and its rating, budget and revenue aren't
  shown.
- **Episodes.** An episode after the save's date is "not aired yet".
- **People.** A death after the save's date isn't shown. A person's page gives their age on the save's date, or the
  age they died at once their death has happened. Ages turn on the birthday by the game's own rule: a February 29
  birthday is observed on February 28 in other years, as the player's own age is.
- **Ownership.** A company acquired after the save's date says it isn't part of The Walt Disney Company yet. A title
  credited to an acquired company is marked "Released before the acquisition" when its release date is earlier. Until
  November 11, 2026 it said "made before", which the records can't tell: they hold release dates, not when a film was made
  or paid for.
- **Status.** TMDB's status for a title (Ended, Released, In Production) is what it said on the day the records were
  taken. Before that day in the story it would tell what happens later, so the page says when it was recorded and waits.
- **Simulated series.** A series this save continues shows only the recorded seasons it began with (`docs/WORLD.md`,
  "Each Save's World, Held Steady").

### Missing And Failed Records

- **Nothing installed.** If the catalog isn't installed, the Companies page says so, and companies and leadership are
  still shown.
- **A missing record** says it isn't in this copy of the catalog, with Go Back.
- **A failed load** says so, adds that the game is unaffected, and offers Try Again and Go Back.
- **A credited company the catalog doesn't follow** opens a page that says so.

## How It Joins The Game

**It is a reference catalog.** No system in the simulation reads it:

- **No hiring or availability.** A historical credit doesn't make anyone available for hire, alive, employed by a
  company today or skilled.
- **No game values from TMDB.** TMDB's popularity, ratings, budgets and revenue don't become salaries, odds, studio
  money or ability.
- **Your own work stays yours.** Your projects keep their own credits and companies, and don't pretend to be TMDB
  records.

**What it shares with the game:**

- **The save's date.** Every page reads the save's date.
- **Saves.** Saves hold only a screen's place, as a stable reference (`Route.ref`, such as `movie:862`, `tv:4194:s:1:e:1`,
  `person:31`, `company:pixar` or `exec:josh-damaro`). The catalog's records never go into a save.
- **Stable references for later systems.** These references are what future company, casting, distribution and career
  systems would use for the same entities. None of those systems is built.
- **Loading.** The catalog loads on demand, separately from startup.

## Tests

- **Unit tests.** `tests/catalog.test.ts` covers:
  - the registry's identities and distinctions;
  - leadership at dates either side of each announcement;
  - date-aware records;
  - acquisitions;
  - filmography filters;
  - reference collisions between films and series;
  - the importer's rate limits, retries, failed queue, 404s, refused credential, cache reuse and six-month limit;
  - discovery's pagination, moved titles and page-cap split;
  - the build's unknown values, deduplication, and series versus episode credits;
  - the credential scan.
- **Browser tests with a fixture.** `e2e/catalog.spec.ts` runs on desktop and phone with a made-up fixture
  (`e2e/catalog-fixture.ts`). It browses company → film → cast member → another credit, and company → series → season →
  episode → credits. It also checks:
  - leadership at the save's date;
  - a failed load and its retry;
  - the catalog missing;
  - no horizontal scroll;
  - no request to TMDB;
  - the save unchanged.
- **Live smoke test.** `e2e/catalog-live.spec.ts` runs the same journeys on the real catalog, where it is installed.
