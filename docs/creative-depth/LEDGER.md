# Creative Depth And Living Industry: Implementation Ledger

The owner's package of November 11, 2026, "SLATE Creative Depth & Living Industry Expansion", version 2. Its files are
in `docs/creative-depth/package/`, unchanged. This ledger says what is built, what proves it and what is left, so a new
session can go on without rereading the package. `DECISIONS.md` beside it records what was decided and why.

The package's last-reviewed `main` was `8a60369` (#66). Work began from exactly that commit.

## How To Read The Statuses

The package's own six, from `06-TESTING-AND-DELIVERY.md`:

| Status | Meaning |
| --- | --- |
| Engine verified | Implemented, with a unit test that compares outcomes |
| Browser verified | Implemented, with a Playwright journey through the interface |
| Reference only | Shown for information by design; changes nothing |
| Awaiting source | Needs research or data that isn't in hand |
| Awaiting configuration | Needs something only the owner can set up |
| Not implemented | Not built yet |

Nothing is called complete because a control exists or a field saves.

## Milestones

| | Milestone | State | Merged |
| --- | --- | --- | --- |
| A | Baseline audit, owner-data access, frozen world profiles | Built and tested; see below | With the first checkpoint of this package |
| B | Shared picker, option records, starter libraries, field inventory, the zombie example | Not started | |
| C | Every creative input expanded; medium pipelines; controlled comparisons | Not started | |
| D | Real people: identity, availability, auditions, hiring, contracts, pay, credits | Not started | |
| E | Real destinations, scouting, geography-aware production | Not started | |
| F | Studio strategy, Warner Bros., Sony and Paramount, territorial releases, competition | Not started | |
| G | Optional portraits and posters, pack refresh and storage controls | Not started | |
| H | Connected playthroughs, performance, accessibility, migration, final coverage | Not started | |

Do them in this order. Each is a vertical slice: interface, engine, save, failure behaviour and proof.

## Milestone A

### What Was Asked

`01-MASTER-BUILD-SPEC.md` section 2, and `00-START-HERE.md`'s review targets: owner mode had no authentication and no
local-only binding; series profiles still read the installed catalog.

### What Was Found

| Target | Found in the code at `8a60369` |
| --- | --- |
| Owner mode | Confirmed. `--owner` set one boolean; `server.listen(port)` bound every interface; any request got TMDB's data. Vite's dev and preview servers passed `films: true` the same way. |
| Series profiles | Confirmed. Only `rec`, the last recorded season number, was kept. `decide`, `plan`, `decisionDate`, `nextPremiere` and `renewalOdds` read the installed catalog's networks, type, status, genres, seasons aired, model season and regulars at every decision. |
| Worldwide simultaneous releases | Not checked yet: milestone F. |
| Studio chosen by pace | Confirmed in `studios.ts` `careerStudio`: a studio is picked by films a year alone. Milestone F. |
| Earned money shortcut | Not reopened: `tests/earnings.test.ts` still guards it. |

### What Was Built

| Piece | Where | Status | Evidence |
| --- | --- | --- | --- |
| A gate on every film route: this machine, or a signed-in session | `server/catalog-handler.mjs` `createOwnerGate`, `isLocalRequest` | Engine verified | `tests/catalog-server.test.ts`, "who gets the owner's data", 5 tests; two mutations fail them |
| The owner's server listens on this machine alone; another address needs a passphrase file, or it won't start | `server/serve.mjs` `ownerPlan` | Engine verified | Same file, "starts on this machine alone" |
| Sign-in route, twelve-hour session cookie, lockout after five wrong tries, private caching | `server/catalog-handler.mjs` | Engine verified | Same file |
| Owner Passphrase in Settings, Mods, shown only where the server offers it | `src/ui/DataPacks.tsx` `OwnerSignIn`, `src/catalog/packs.ts` | Browser verified | `e2e/owner-access.spec.ts`, desktop and phone, production build, port 4180 |
| A frozen profile per simulated series; decisions read only it | `src/engine/industry.ts` `FrozenSeries`, `freezeSeries` | Engine verified | `tests/industry.test.ts`, "decides from what the save froze"; a mutation fails it |
| Copies of recorded seasons deleted after the first simulated season, and at TMDB's six months | `expireIndustrySources`, `src/ui/App.tsx` `expireSources` | Engine verified | "deletes its copies of recorded seasons"; a mutation fails it. The hourly check in the app is not browser-tested. |
| Newer records only when asked, previewed, with a copy of the save kept first | `worldRefreshPreview`, `applyWorldRefresh`, `store.takeNewerRecords`, `keepBeforeWorldRefresh`, Settings "Your Story's World" | Browser verified | `tests/industry.test.ts`, "takes newer records only when asked"; `e2e/world-refresh.spec.ts`, desktop and phone; a mutation fails the unit test |
| The pages read the frozen outlet, pattern season and cast | `src/catalog/world.ts`, `src/catalog/simseason.ts`, `src/ui/Catalog.tsx` | Browser verified | `e2e/world-refresh.spec.ts`, `e2e/living-world.spec.ts` |

### Limits Of Milestone A

- The owner sign-in journey runs on Chromium only. The session cookie is marked `Secure`, and of the test browsers only
  Chromium keeps a `Secure` cookie on plain-HTTP `localhost`. The rules themselves are tested request by request.
- Remote owner use needs HTTPS in front of the server. None is set up; a host is the owner's choice.
- A preview shown through a cloud proxy counts as "from elsewhere", since the proxy forwards the request. Seeing TMDB's
  data there needs a passphrase file.
- The hourly source-expiry check in the open game has a unit test for the rule and none in the browser.

## Found On The Way, For Later Milestones

- `installPack` deletes the installed pack before storing the new one (`src/catalog/packs.ts`). An install cut short
  leaves no pack. The package asks for the old one to survive (`04-WORLD-STUDIOS-AND-MEDIA.md`, "Save and storage
  constraints"). Milestone G.
- The input audit's generator (`tools/input-audit/controls.py`) had fallen behind its table by eleven rows, corrected
  by hand at some point. They were carried back into the generator, which now writes the table as it stood plus the new
  row.

## The Audit Artifacts

| File | State |
| --- | --- |
| `docs/input-audit/CONTROLS.csv` | Exists from the November 10 connectivity pass: 230 labelled controls, each classed, with its consumer and tests. The base for the field inventory. |
| `docs/creative-depth/FIELD-INVENTORY.csv` | Not written yet. Milestone B. |
| `docs/creative-depth/EFFECT-COVERAGE.csv` | Not written yet. Milestone B onward. |

## Checks Run For Each Checkpoint

Recorded in `QA-REPORT.md`, newest first, with exact counts.
