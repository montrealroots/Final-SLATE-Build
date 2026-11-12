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
| Films And Series | `.screen-catalog/` (TMDB, with Wikidata network owners) | 110.6 MB, 15,561 files, with NBCUniversal's companies | 120.1 MB in Chromium, 110.8 MB in WebKit |
| Cinemas | `.cinemas/` (Wikidata, CC0) | 1.5 MB, 153 files | 1.5 MB |

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
  IndexedDB (`slate-packs`), 400 to a transaction. Bytes are stored, not file slices: WebKit can't keep a Blob in
  IndexedDB in a private window.
- **Replacing a pack, from November 11, 2026.** The new records are written beside the old ones, under a number of
  their own (`catalog@2:titles/...`). Only when every one is stored does the pack's listing change to point at them,
  in one step; the old records are deleted after that. An install that is cancelled, cut short or out of room leaves
  the pack that was installed whole and in use. Until then the old pack was deleted first, so a failed update left
  nothing. Records an unfinished install left behind are cleared the next time the packs are read.
- **Room, asked first.** Before anything is written the browser is asked how much room it has. If it reports less than
  the pack's size and a fifth more, nothing is written, and the message says how much is needed, how much is free, and
  how much removing the installed pack would free. Settings shows what the browser reports and what the mods hold.
- **Cancel, and going on.** Cancel stops a download or an install with nothing changed. What had been downloaded is
  kept until the game is closed, and the next try asks the server for the rest (`Range: bytes=N-`).
- **Reading** (`src/catalog/load.ts`): a catalog file comes from an installed pack of its kind first, decompressed when a
  page asks for it; with no pack of that kind, from the server as before. Pack code loads with the first catalog request,
  not at startup.
- **Installed in a game.** The open game's living world starts from the new pack at once; removing the film pack pauses
  it, its decisions keeping their dates.

## The Picture Pack

Optional, added November 11, 2026 (the Creative Depth package, milestone G). It holds profile photos and posters for
the companies the owner chooses. The game is the same without it: no engine reads a picture and none changes an
outcome.

- **Choosing and sizing.** `npm run screen-catalog:images -- --companies=company:pixar,company:lucasfilm --plan` prints
  how many posters and photos the choice comes to and about how many megabytes, and fetches nothing. Without `--plan`
  it fetches them. `--tier=small` (TMDB's `w185` photos and `w154` posters, about 13 kB each) or `--tier=medium`
  (`h632` and `w342`); never the original size. `--people=8` is how many top-billed cast a title contributes, with its
  directors and creators. Then `node tools/pack.mjs images` writes the pack.
- **Where the pictures come from.** Each title's and person's picture path is read from the film catalog's own cache.
  The picture is fetched from TMDB's image host, which needs no credential; none is read, held or sent. Measured on
  November 11, 2026: Pixar's 155 titles came to 152 posters and 303 photos, 5.8 MB, in 23 seconds.
- **What is kept about each picture** (`images/index.json` in the pack): the subject (`person:31`, `movie:13`), TMDB's
  own path for it, its width and height as read from the file, the day it was fetched, and the language TMDB records
  for it where it records one. The pack carries one statement about rights, shown with every picture's details: the
  rights belong to each picture's owner, and nothing clears it for any use beyond the owner's own copy of the game.
  That statement is not a licence and the game doesn't claim one.
- **Showing them** (`src/ui/Picture.tsx`): a title's page, a person's page and the cast list. Every picture sits in a
  box of fixed shape, so nothing moves when one arrives. A picture is read from storage only when its box comes near
  the screen. With no pack, no picture for the subject, pictures switched off in Settings, or a device that asks its
  browser for less data, the box is a plain placeholder. The game never draws a face for a real person.
- **Six months.** The pack is under the same limit as the films: refused if older, and deleted once it passes. A game
  left open is checked every hour (`packs.ts` `expirePacks`), for the film pack too, so a long-open page doesn't go on
  showing what should be gone. `npm run screen-catalog:purge` deletes the gathered pictures with the rest.
- **Who gets it.** The owner alone, as with the films: a server that isn't the owner's neither lists nor serves it.

Not built: choosing people one by one, a progress bar for the gathering tool beyond its log lines, backdrops and
logos, and a check of each picture's own licence. The pack must not be shared.

## TMDB's Terms, Kept In The Game

- **Six months (1.C).** A film pack gathered more than six months ago (from its oldest response) is refused. One that
  passes six months while installed is deleted the next time the game reads it, and the pages say it was withdrawn.
- **Deletion (1.D).** Remove deletes every record.
- **Attribution (3).** TMDB's notice shows with the installed pack, and on the catalog's pages as before.
- **Who gets a pack.** The film pack is TMDB's content, and goes to the owner alone: the owner decided on November 11,
  2026 not to offer it to any other player. A server offers it only when run as the owner's own (`--owner`,
  `docs/DEPLOYMENT.md`); any other offers the cinemas alone, and the game doesn't point its players to a film mod. The
  cinema pack is CC0 and may be shared.

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
- **The real packs, with NBCUniversal (November 11, 2026):** each was installed in a fresh browser profile, from a file and
  then by one press as a mod. The storage the browser reports (`navigator.storage.estimate()`) grew by the same amount
  both ways:

  | Browser | Film pack | Then the cinemas | Altogether |
  | --- | --- | --- | --- |
  | Chromium, desktop | 120.1 MB; 9.3 s from a file, 10.4 s as a mod | 1.5 MB; 0.2 s, 0.3 s | 121.7 MB |
  | WebKit, iPhone 15 Pro Max emulation | 110.8 MB; 6.1 s, 7.2 s | 1.5 MB; 0.1 s, 0.3 s | 112.3 MB |

  These times were measured on this machine, and a phone will be slower. Before NBCUniversal, the film pack was 69.7 MB
  in 9,510 files, and both packs together used 77 MB in Chromium and 71 MB in WebKit.
