# Performance

Measured November 6, 2026, in the Linux cloud container (Node 22.23.4, Playwright 1.63.0 Chromium). Before and after
use the same machine, seeds and workloads. Raw results are in `docs/perf/`.

## How To Measure

```bash
PERF_LABEL=after PERF_SAVE_DIR=/some/dir npm run perf:engine
```

```bash
npx vite build --outDir /some/dist && node scripts/perf-browser.mjs after /some/dist /some/dir 9
```

`npm run perf:engine` builds three saves from fixed seeds and times the engine on each:

- **Fresh:** a new life, 93 kB saved.
- **Medium:** one low-budget feature 20 days into its shoot, 296 kB.
- **Long:** three features made to delivery and a further year, 1,100 kB.

`scripts/perf-browser.mjs` serves a production build (not the dev server) and times startup and Advance in Chromium.

## Rollback Copying

Every call that runs events first copies the whole game, so that a failing event can put everything back (no event
skipped, run twice or half-applied). That copy was `structuredClone`. Game state is plain data (it is saved as JSON), so
it is now copied by `copyPlain` (`src/engine/copy.ts`), which falls back to `structuredClone` for anything that isn't a
plain object or array. Rollback is unchanged: the same snapshot is taken at the same moment and restored the same way.

| Workload | Before | After | Change |
| --- | --- | --- | --- |
| One snapshot, long save | 6.9 ms, 1,714 kB heap | 1.7 ms, 975 kB heap | 4× faster, 43% less memory |
| One snapshot, medium save | 1.8 ms, 502 kB | 0.32 ms, 330 kB | 5.7× faster |
| Ticking a game week at 15-minute steps (672 calls), medium | 46.5 ms | 11.0 ms | 4.2× faster |
| Ticking a game week, long | 46.4 ms | 9.3 ms | 5× faster |
| Advance 30 days (continuing past stops), medium, 90 events | 47.5 ms | 14.5 ms | 3.3× faster |
| Sleep 8 hours, long | 8.3 ms | 1.9 ms | 4.3× faster |
| `npm run balance` (330 runs, one snapshot per game day) | 98 s | 37 s | 2.7× faster |

The engine "after" numbers are from `docs/perf/engine-after.json`; "before" from `docs/perf/engine-before.json` (the
balance "before" was timed by temporarily restoring `structuredClone` on the same checkout).

**Determinism and exactly-once:** the state after each workload hashes to the same value before and after
(`resultHash` in both files), and `npm run balance` wrote byte-identical `docs/balance-results.json` and
`docs/balance-heldout.json`. `tests/processing.test.ts` checks that a failure after deep changes to projects, ledgers,
the log and the event queue restores the game exactly, and that the copy is exact and shares nothing with the original.

**Tradeoff:** unlike `structuredClone`, a value referenced from two places is copied twice. Saved games never share
references (they are JSON), so this changes nothing for them.

## Startup JavaScript, November 7, 2026 (current)

Measured with `npm run build` then `npm run budget`, on the files `dist/index.html` loads before anything else.

| Measure | Before | After |
| --- | --- | --- |
| Startup JavaScript, bytes | 718,078 | 676,736 |
| Startup JavaScript (`npm run budget`) | 701 kB, 217 kB gzipped (over the 700 kB budget) | 661 kB, 205 kB gzipped |

The genre catalog (27.7 kB) and the equinox and solstice table (14.3 kB) left the startup files. Neither is read
before a game opens. They are fetched in the background from startup, beside the holiday rules, and every game waits
for them before it opens (`src/ui/store.ts` `enter`). A catalog that fails to load stops the game with the reason and
Try Again (`e2e/failures.spec.ts`). They are fetched rather than imported, because a browser keeps a failed dynamic
import failed. The budget is unchanged. What remains is React (218,747 bytes), the game engine, and the start screen
and shell. The next candidates, each needing the same wait-before-a-game treatment, are the 66 legacy places' climate
(28.6 kB) and the award and festival rules (`awards.ts` and `rulebooks.ts`, the largest engine modules).

## Startup Headroom, November 10, 2026

Measured before changing anything:

- `main` at `bc0f070`: 685 kB, 219 kB gzipped (`npm run budget`).
- With the episode release schedules (`docs/RELEASE-SCHEDULES.md`), 694 kB, 222 kB gzipped. That was over the 220 kB budget.

Source maps of the startup files (`vite build --sourcemap`, bytes attributed to each source module) showed two kinds of
code that no part of opening a game needs:

- **The place search**, in the entry file and the engine file:
  - the URL of each of the 246 country place files;
  - the region and station loaders;
  - the search ranking;
  - the place picker (`WorldPicker.tsx`) and the map credits.

  The start screen needs a place search only to repair a save that names a place the game can't find. The engine
  needs only country names. `src/world/gazetteer/gazetteer.ts` now holds the country index, and `search.ts` the rest.
  The start screen loads the picker when the repair screen is shown, as the app's routes already did, with a loading line.
- **The schedule change preview** (`release-schedule.ts`), which only the Release tab asks for. It left the engine's
  index and is imported by `FinishViews.tsx`, which already loads with a project.

Nothing moved into a file fetched right after startup, and the engine is unchanged. The budget is unchanged.

| Measure (production build) | `main` (`bc0f070`) | Before (this branch) | After |
| --- | --- | --- | --- |
| Startup JavaScript (`npm run budget`) | 685 kB, 219 kB gzipped | 694 kB, 222 kB gzipped | 667 kB, 213 kB gzipped |

What a browser fetches before each first use is measured by `scripts/perf-first-use.mjs`:

- Each path starts from a fresh page with nothing cached, until the screen is usable and the network is idle.
- Bytes are as served, with gzip -9 of each body as the estimate of what a compressing server sends.
- Times are the median of 5 runs on this machine, without CPU slowdown.

| Path | `main` JS | `main` data | `main` time | After JS | After data | After time |
| --- | --- | --- | --- | --- | --- | --- |
| Start screen | 844 kB (263 gz) | 1,158 kB (128 gz) | 287 ms | 826 kB (256 gz) | 1,158 kB (128 gz) | 280 ms |
| Continue into a medium save until the game is open | 844 kB (263 gz) | 1,158 kB (128 gz) | 389 ms | 826 kB (256 gz) | 1,158 kB (128 gz) | 396 ms |
| New Game until creation's first field takes typing | 882 kB (276 gz) | 1,291 kB (178 gz) | 1,122 ms | 890 kB (279 gz) | 1,291 kB (178 gz) | 1,038 ms |

The start screen and Continue fetch 18 kB less JavaScript (7 kB gzipped) than `main`, though the release schedules
added about 9 kB to the engine. The new-game path fetches 8 kB more:

- creation needs the place search anyway, so it gains nothing there;
- it pays for the schedule engine;
- the picker is now its own file.

The times differ by less than their run-to-run spread. They show no regression, and no gain either.

The background JavaScript (the award and festival rules, `awards-rules` and `awards-results`, about 160 kB) and the
data are fetched before a game opens because the engine reads them while time passes. They are unchanged.

Headroom under the budget is now 33 kB raw and 7 kB gzipped.

The next candidates are in the engine file (314 kB). Every engine module is imported by another engine module, so
moving any of them out would change the engine's structure, not only its loading. They are left as they are.

## What A Browser Downloads, November 7, 2026

Moving data out of the startup JavaScript didn't remove its download: the files are still fetched, only later and beside
the start screen instead of before it. Measured on the production build that `SLATE_E2E_PROD=1` serves (`vite build`). Bytes
are the files as built; gzipped is `gzip -9` of each file, an estimate of what a compressing server sends.

| What | When | Bytes | Gzipped |
| --- | --- | --- | --- |
| Startup JavaScript (4 files: entry, React, runtime) | Before the start screen | 676,736 (679,394 after the budget estimate, November 7) | 205 kB (206 kB after) |
| Stylesheet | Before the start screen | 60,606 | 12,270 |
| Holiday rules (`countries.json`) | Fetched from startup, before a game opens | 662,994 | 62,518 |
| Calendars (`calendars.json`) | Fetched from startup, before a game opens | 119,863 | 31,642 |
| Genre catalog (`genre-catalog.json`) | Fetched from startup, before a game opens | 29,121 | 5,942 |
| Equinoxes and solstices (`seasons.json`) | Fetched from startup, before a game opens | 14,282 | 6,400 |
| Background data fetched from startup, total | | 826,260 | 106,502 |
| Climate for the 66 legacy places (`climate.js`) | When first needed | 374,180 | 117,248 |
| Project views (`Projects`, `FinishViews`) | When a project opens | 124,223 | 33,523 |
| World map (`world-map.json`) | When a map is shown | 135,896 | 51,587 |
| Regions (`regions.json`) | When places are searched | 158,117 | 35,989 |
| Weather stations (`stations.json`) | When a catalog place's weather is needed | 3,292,995 | 1,151,024 |
| Place shards (246 `.tsv` files, one per country) | One country at a time, when searched | 12,011,972 in all | 4,161,411 in all |

So a player who opens a game downloads about 1.56 MB before it opens (about 330 kB gzipped). The budget estimate (`src/engine/estimate.ts`, later on November 7) added 2,658 bytes of engine code to the startup files: 663 kB, 206 kB gzipped by `npm run budget`. The budget (700 kB,
220 kB gzipped) covers only the startup JavaScript, and that is unchanged.

## Startup JavaScript, earlier pass (montrealroots/Final-SLATE-Build#15, historical)

| Measure | Before | After |
| --- | --- | --- |
| Startup JavaScript (`npm run budget`) | 691 kB, 205 kB gzipped | 634 kB, 196 kB gzipped |
| JavaScript transferred before the start screen (browser) | 691 kB | 634 kB |
| Start screen ready, production build, median of 9 | 136 ms | 133 ms |
| Start screen ready at 4× CPU slowdown, median of 9 | 503 ms | 483 ms |

What was removed from the startup files (both were data the game never reads):

- **Climate provenance for the 66 catalog places** (which station supplied each monthly value, 46 kB). The game uses
  the monthly normals and the kind of source; the station details moved to `docs/world/legacy-place-climate.json`,
  written by `npm run world:legacy`, which reproduces both files byte for byte.
- **Research mechanic specifications for the 149 genres** (14 kB of text). The game's mechanics are the module mapping
  in `src/engine/genres.ts`; the full text stays in `src/data/genre-registry.json`.

Later, the festival and award rulebooks (`src/engine/rulebooks.ts`, rulebook checkpoint) added 15 kB: startup is now
654 kB, 202 kB gzipped. They stay in the startup files because new games create editions with their rules synchronously.

Route views (projects, world, saved games, settings, event details) were already loaded on demand with a loading state.
The engine itself is still in the startup files: the start screen lists saves, which needs save reading and validation,
and loading the engine later would delay Continue. The budget (700 kB, 220 kB gzipped) was not raised.

## Advance In The Browser (Production Build)

One Advance press on each save, median of 5, from the click until processing ends or stops for the player:

| Save | One Week before | after | One Month before | after |
| --- | --- | --- | --- | --- |
| Fresh | 73 ms | 72 ms | 79 ms | 77 ms |
| Medium | 81 ms | 78 ms | 97 ms | 77 ms |
| Long | 162 ms | 133 ms | 142 ms | 132 ms |

Each press stops at the first event that needs the player, so few events run, and screen updates dominate. The engine
gain shows most on long saves and in long unattended runs (ticking at speed, sleeping, balance).

## Not Measured

- Real phones. CPU slowdown in Chromium is an approximation, not an iPhone.
- Saves older than three years of play. Snapshot time grows with save size (about 1.5 ms per MB after the change).
