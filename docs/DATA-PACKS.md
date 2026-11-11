# Data Packs

Added November 11, 2026, at the owner's request: "make them like a mod you can install in the game, and after I install
they show". A data pack is one file that adds the film catalog or the cinemas to a game, on any copy of SLATE, with no
server that holds them.

## For The Player

Settings, **Mods** (renamed from Data Packs the same day, at the owner's request: "put that package in game under 'Mods'
and once installed boom"):
- **The game's own mods.** The server offers the packs in its `packs/` folder (`server/serve.mjs --packs`, default
  `packs`; the dev server reads the same folder). Each is listed with what it adds, its source, when it was gathered
  and its size, and **Install** downloads and installs it with one press, showing progress, then says where to look:
  Companies for the films and series, a place in World for its cinemas. A newer pack on the server shows **Update**.
- **Install From A File** takes a `.slatepack` the game doesn't offer.
- **What's installed** is listed with its source, when it was gathered, its size, and for the film pack the day it is
  withdrawn, with TMDB's notice.
- **Remove** deletes every record the pack held from this browser.

A pack is kept in this browser's storage only. Saves never hold it, so an exported save carries no catalog, and a save
opened where no pack is installed plays on with its world waiting (`docs/WORLD.md`).

## The Two Packs

| Pack | Built from | Size, November 11, 2026 | Kept in the browser |
| --- | --- | --- | --- |
| Films And Series | `.screen-catalog/` (TMDB, with Wikidata network owners) | 69.7 MB, 9,510 files | About 77 MB |
| Cinemas | `.cinemas/` (Wikidata, CC0) | 1.5 MB, 153 files | A few MB |

Build them with:

```bash
node tools/pack.mjs
```

They are written to `packs/`, which is kept out of the repository, as are all `*.slatepack` files.

## How It Works

- **Offered** (`server/catalog-handler.mjs`): `/mods/index.json` lists every pack in the folder from its header, and
  `/mods/<file>` serves only a file the list offers. A film pack past six months is neither listed nor served.

- **The file** (`tools/pack-format.mjs`): the bytes `SLATEPACK1`, a header listing each record's path and position, then
  each record gzipped. Reading the header is enough to slice out every record without unpacking any.
- **Installing** (`src/catalog/packs.ts`): the header is checked, then each record's compressed bytes are stored in
  IndexedDB (`slate-packs`), 400 to a transaction. The pack is listed only once every record is stored, so an install
  cut short is never used. Bytes are stored, not file slices: WebKit can't keep a Blob in IndexedDB in a private window.
- **Reading** (`src/catalog/load.ts`): a catalog file comes from an installed pack of its kind first, decompressed when a
  page asks for it; with no pack of that kind, from the server as before. Pack code loads with the first catalog request,
  not at startup.
- **Installed in a game.** The open game's living world starts from the new pack at once; removing the film pack pauses
  it, its decisions keeping their dates.

## TMDB's Terms, Kept In The Game

- **Six months (1.C).** A film pack gathered more than six months ago (from its oldest response) is refused. One that
  passes six months while installed is deleted the next time the game reads it, and the pages say it was withdrawn.
- **Deletion (1.D).** Remove deletes every record.
- **Attribution (3).** TMDB's notice shows with the installed pack, and on the catalog's pages as before.
- **Who gets a pack.** The film pack is TMDB's content. Giving one to the owner, for the owner's own game, is like the
  owner gathering it. Giving it to other players is distribution, and waits on the same decisions as hosting it:
  commercial use and the derivatives question (`docs/DEPLOYMENT.md`). The cinema pack is CC0 and may be shared.

## Tests

- `tests/packs.test.ts`:
  - a round trip, with each record still compressed;
  - the six-month date, capped at TMDB's limit;
  - refusal of a file that isn't a pack, one cut short, one holding another kind's files, a film pack with no gathering
    date, and a newer format.
- `tests/catalog-server.test.ts`: the mods listing from headers, only listed files served, an expired film pack, a file
  that isn't a pack, and anything else in the folder never reachable.
- `e2e/data-packs.spec.ts`, on desktop, phone and WebKit (iPhone 15 Pro Max), with fixture packs:
  - on the production build, a server with no data and the two fixture mods: one press installs each, and the catalog
    and a place's cinemas show;
  - both packs installed in Settings;
  - the catalog and a place's cinemas shown from them, and kept after a reload;
  - the film pack removed, with every record gone;
  - a pack past six months, and a file that isn't one, refused.
- **The real packs, offered as mods:** one press installed the film pack in 3.9 seconds in WebKit with iPhone emulation,
  download included, and the cinemas in 0.2.
- **The real packs, from files:** installed in Chromium in 5.8 seconds (77 MB used) and in WebKit with iPhone emulation in 4.0 seconds
  (71 MB), on this machine. A phone will be slower.
