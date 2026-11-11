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

## Not Done Yet

- Pages: cinemas by country and place, open or closed on the save's date.
- A part in theatrical releases.
- Serving `.cinemas/` to the game.
