# Cinemas

Begun November 11, 2026, when the owner asked for "a worldwide coverage of movie theaters".

## Source

- **Wikidata**, through its query service (query.wikidata.org). Its data is CC0, in the public domain, so it may be used
  without permission or attribution. The game still names its source: "cinemas recorded in Wikidata".
- **Selection:** anything that is an instance of a movie theater (Q41253), or of a kind of one, with coordinates and a
  country.
- **Details:** the name in English or the multilingual label, coordinates, opening (P1619, or inception P571), closing
  (P3999, or dissolution P576), state of use, seats, operator, and the place it is in.
- **Not used:**
  - OpenStreetMap. Its Overpass and Geofabrik servers refused this environment's connections. OSM's data would also
    come under the ODbL's share-alike terms.
  - TMDB, which has no cinemas.

## Building

```bash
node tools/cinemas/import.mjs
```

- **Passes:** two, to stay inside the service's 60-second limit: each country's cinemas, then their details in batches of
  200, a second apart.
- **Storage:** responses are cached in `.cinemas-cache/` and the built files written to `.cinemas/`
  (`index.json` and one file per country). Git ignores both.
- **Reruns:** a rerun asks only for what isn't cached.
- **Why their own directories:** the screen catalog's build clears `.screen-catalog/`, which took the first run's output
  with it.

## What It Holds

The first build, November 11, 2026: 51,331 cinemas in 152 countries.

| Country | Cinemas |
| --- | --- |
| United States | 31,376 |
| United Kingdom | 6,119 |
| Germany | 2,335 |
| Australia | 1,770 |
| Brazil | 1,348 |
| Canada | 1,303 |
| Sweden | 1,004 |
| France | 930 |

Wikidata's coverage is uneven:
- some countries hold every historic cinema;
- others hold only a few landmarks;
- many cinemas have no opening date;
- fewer have a closing date.

The game says what is recorded and doesn't fill gaps with invented cinemas.

## Dates

Wikidata records a date as a day, a month or a year, and writes a year as January 1 of it. The first build read every
date as a day, so a cinema "opened 1901-01-01" had only a year recorded. The importer now keeps each date at the
precision it was recorded (`1901`, `1932-05`, `1937-05-07`).

## In The Game

A place page has **Cinemas Nearby** (`src/ui/Cinemas.tsx`, rules in `src/world/cinemas.ts`). It shows:
- the cinemas recorded within 25 km, nearest first, with the fifteen nearest listed and the rest a button away;
- how many of those have no closure recorded;
- the country's total.

Each listed cinema shows where it is, when it opened, how it stood on the save's date, its seats and who runs it, where
recorded.

- **Never "open".** Wikidata lists former cinemas as well as working ones, and many former cinemas are something else
  now: London's KOKO is a music venue. A cinema is said to have "no closure recorded", never to be open.
- **At the save's date.**
  - A cinema whose recorded opening is later isn't counted.
  - A closing date counts from its day, or once its month or year is over, so a part-known date never shows the future.
  - A cinema Wikidata records as closed or demolished with no date says so: "recorded as closed; when isn't recorded". It
    is shown that way at any date, because most such closures are decades old.
- **Serving.** The dev and preview servers serve `.cinemas/` beside the screen catalog (`vite.config.ts`). Without it, the
  card says the list isn't installed.

## Not Done Yet

- A part in theatrical releases. Wikidata's counts are too uneven between countries to set how many screens a release
  gets: the United States records 31,376, mostly historic, and many countries a handful. Using them would make a
  record's gaps look like a market's size.
- A page listing a country's cinemas apart from a place.
