# Deploying SLATE And Its Data

Written November 11, 2026. This covers how the game reaches its data in production, what has been tested, and what
still needs a decision before players can use the film catalog.

## What The Game Needs

SLATE is a single-page game: `npm run build` writes `dist/`, and saves live in the player's browser (IndexedDB). Most of
its data ships in the build:
- the company and leadership registry (`src/catalog/registry.ts`, the game's own research);
- places, climate stations, holidays and maps (`src/world/`, fetched on demand as hashed assets).

Three sets of data don't ship in the build, and are fetched one file at a time from `/screen-catalog/` when a page needs
them:

| Data | Source | Built by | Kept in | May it be in the repository? |
| --- | --- | --- | --- | --- |
| Films, series, seasons, episodes, people, networks, the industry's dated events (`world.json`), cinema openings (`theatrical.json`) | TMDB, plus Wikidata for network owners | `npm run screen-catalog:import`, `node tools/screen-catalog/networks.mjs`, `npm run screen-catalog:build` | `.screen-catalog/` | No: TMDB's terms (below) |
| Cinemas | Wikidata (CC0) | `node tools/cinemas/import.mjs` | `.cinemas/` | Allowed by its licence, but kept out as a raw research export, and rebuilt instead |

## The Production Server

`server/serve.mjs` (Node 22, no dependencies) is the production path:

```bash
npm run build
```

```bash
npm run serve
```

- **What it serves.** The built game from `dist/`, with any other path answered with the game's page. Data files come
  from `.screen-catalog/` and `.cinemas/`, or the directories given by `--catalog` and `--cinemas` (or `SLATE_CATALOG_DIR`
  and `SLATE_CINEMAS_DIR`).
- **No Vite.** The dev and preview servers use the same data handler (`server/catalog-handler.mjs`), so what is tested
  is what ships.
- **No credential.** The server holds no credential and calls no outside service. TMDB's credential exists only where
  the catalog is gathered, injected by the network proxy into the importer's requests. It is never in the source, a
  build, a log or a browser request (`tests/catalog-server.test.ts`, `tests/catalog.test.ts`).
- **On demand.** A file is answered when it is asked for. There is no listing and no bulk download.
- **Caching.** A record may be kept an hour, and never past the catalog's expiry. The files that say whether a catalog
  is there are never kept. The game's built assets are kept for a year, as their names change with their content.
- **TMDB's six months.** The index records when the oldest response in the build was fetched. From six months after
  that, the server answers as though no catalog were installed, and the game says the copy has been withdrawn until it
  is gathered again.
- **Unavailable, unreadable or half-written data.**
  - No index, or an index that isn't the build's JSON, is answered as no catalog, with the reason.
  - The build writes into `.screen-catalog.building/` and swaps the finished catalog in at once, so a build cut short is
    never served.
  - A record that is missing is a 404. A record that isn't readable JSON shows "couldn't be loaded", with Try Again.
  - The game asks for no record while the index says there is no catalog (`src/catalog/load.ts`).
- **Deletion.** `npm run screen-catalog:purge` deletes every copy of TMDB's content on the machine: the cache, the
  catalog and any half-done build. TMDB's terms (1.D) require it when use ends; it is also how a catalog is withdrawn.
- **The game without data.** With no catalog, or with the server failing, every page that reads one says so, and
  the rest of the game plays as before. Saves never hold catalog data.

## What TMDB's Terms Allow

Read November 11, 2026 (https://www.themoviedb.org/api-terms-of-use, last updated October 20, 2023).

**Explicit restrictions:**
- no caching for more than six months (1.C);
- purge everything on termination (1.D);
- no selling, leasing or sublicensing of the API or its content (1.C);
- no derivatives (1.C);
- no commercial use without a separate written agreement (2.A);
- no cached data sets for machine learning (2.A);
- not an image host (1.C);
- the TMDB logo and the notice are required (3).

**Not addressed by the terms:**
- whether an application may serve cached content from its own server to its players;
- whether a reformatted catalog counts as a derivative.

The licence is to use TMDB's content in an application, attributed. A non-commercial game showing it to players within
six months is not barred by any explicit clause. That isn't a written permission, and SLATE doesn't claim one.

## What Has Been Tested

| Where | What | Result |
| --- | --- | --- |
| Unit (`tests/catalog-server.test.ts`) | The production server on made-up files: records on request, 404s, the page fallback, immutable compressed assets, a ready, missing, unreadable and expired catalog, path traversal, methods, and no credential or outside call | Passes |
| Unit (`tests/catalog-load.test.ts`) | The game's loader: nothing asked for while the index says there is no catalog, the reason kept, a failed index retried with its record, cinemas read without the catalog | Passes |
| Browser, production build through the production server (`SLATE_E2E_PROD=1`, `e2e/serve-prod.ts`) | The whole browser suite runs against `server/serve.mjs` on port 4175 with no catalog, as CI has none. `e2e/production-data.spec.ts` runs a made-up catalog through the server on 4176, with no request intercepted: company, film, cast member, series, network, a place's cinemas. It also runs an expired copy on 4177: withdrawn, the reason shown, the game going on | Passes on desktop and phone |
| Development | The same handler inside Vite's dev and preview servers, with the real catalog on this machine | Used throughout |

## What Is Not Done, And What It Needs

**Hosting.** No host for SLATE is set up or named in this repository. `server/serve.mjs` runs on any machine with
Node 22, but it needs the catalog and cinema directories on that machine. Those are gathered there, or copied from the
machine that gathered them, and rebuilt within every six months. A purely static host (pages without a server) would
need the catalog copied into its files, with the same expiry and purge kept by hand. That is a hosting decision.

**Permission.** Before the film catalog is published for players, the owner must decide:
- whether SLATE is commercial: charging for it, or earning from it, needs a written agreement with TMDB (2.A);
- whether to ask TMDB in writing about serving a reformatted catalog to players, since "derivatives" isn't defined.

Until then the catalog stays where it was gathered, and nothing here is a deployment. The cinemas (CC0) need no
permission.
