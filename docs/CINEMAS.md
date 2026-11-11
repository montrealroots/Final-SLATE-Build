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

## Which Cinemas Show Films

Having no closure recorded isn't enough: many cinemas closed long ago and nobody recorded it. London's Jacey Leicester
Square, for example, was booking 2026 films before this rule. So a cinema shows films only if Wikidata also records a
sign it is trading: an official website or an operator. The importer gathers websites in a light pass of its own.

Others say "no closure recorded, and no sign it still shows films", and show nothing. The sign is imperfect:
- a former cinema that is a music venue now may have a website (KOKO);
- one that closed may still list its chain's website (Odeon West End, closed in 2015, lists odeon.co.uk).

It cut Britain's cinemas with no closure recorded from 3,337 to 970 that show films.

## What They Show (November 11, 2026)

The owner: "those theaters will hold what movies will release." The rules are in `src/world/programme.ts`.

- **The catalog's films.**
  - A film plays in a country's cinemas from the day TMDB records it opening there: its first theatrical (type 3) or
    limited (type 2) release by country. The catalog build writes these as `theatrical.json`: 1,910 openings of 79
    films from October 2024 on.
  - These are only the films Disney's companies are credited with, and the page says so.
- **The player's films.** A theatrical release plays in each of its territories from its date. A cancelled release, or
  another route, doesn't.
- **How long.** TMDB records openings, not closings, so a run is game calibration: 8 weeks wide, 4 limited.
- **Which cinemas.** Which cinemas booked which film isn't recorded, so each cinema that shows films books each film by
  a fixed draw: the same on every visit. A wide release is booked at about 60% of them and a limited one at about 8%.
  The player's film is booked by reception, from 4% to 60%: a film received well gets more screens. A cinema shows at
  most 8 films, the player's first. All of this is game calibration.
- **Where it shows.**
  - A place page's card lists:
    - the films in their run in the country, each with how many nearby cinemas show it;
    - the catalog's films opening in the next two weeks;
    - each nearby cinema's programme.
  - A theatrical release on the player's Release page says, for each territory, how many of the country's cinemas
    that show films are showing it, or will open it, or showed it, and names a few.
- **Money.** It doesn't touch money: a release's earnings come from its distributor's reports as before
  (`distribution.ts`).

## Not Done Yet

- Bookings shaping earnings. Wikidata's counts are too uneven between countries (31,376 in the United States, a handful in
  many) for the number of cinemas to stand for a market's size.
- A page listing a country's cinemas apart from a place.
