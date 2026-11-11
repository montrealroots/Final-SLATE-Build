# QA Report

## Revision And Environment

- Branch `claude/clever-archimedes-x0r26v` at the commit that updates this report, merged into `main` by checkpoint pull request. Repository remote: https://github.com/montrealroots/Final-SLATE-Build.
- Linux cloud container; Node 22.23.4; npm 10.9.9; TypeScript 6.0.2; Vite 8.3.6; React 19.3.1; Vitest 5.1.0; Playwright 1.63.0 with its bundled Chromium and the installed WebKit build. All browser testing is emulation: Chromium at desktop and phone sizes, WebKit with Playwright's iPhone 15 Plus and 15 Pro Max profiles. No physical device or real Safari was used.
- Seeds: the engine journeys use fixed save tags; the balance runs use `seed1` to `seed30`.

## Commands And Results

### Current: Creative Depth Package, Milestone C (November 11, 2026)

Camera, light, sound and score as engines; looks by scene; 409 ideas and 68 genre routes
(`docs/creative-depth/LEDGER.md`, "Milestone C").

| Command | Failures | Notes |
| --- | --- | --- |
| `npm run check` | 0 | 894 tests (867 before). Startup 306 kB, 98 kB gzipped; budgets unchanged (700 and 220 kB). The idea library is its own on-demand file, 149 kB. World check 0 problems. |
| `npm run balance` | 0 | 2 files. |
| `tests/craft.test.ts` | 0 | 11 tests: each rig, light, sound choice and score against time, crew, rented kit, tests before the shoot and post work, one input changed at a time. |
| `tests/states.test.ts`, `tests/scene-ideas.test.ts`, `tests/routes.test.ts` | 0 | 16 tests: named looks by scene; ideas for fifteen more fields; 68 routes, with the same work assessed the same whichever route was chosen. |
| `e2e/craft.spec.ts` | 0 | New: desktop, phone and WebKit (iPhone 15 Pro Max). A route from the picker, the light, sound and score changed on the page, looks named and assigned, a scene on a dolly with its rent set aside, a reload, and delivery. |
| `npx playwright test`, whole suite, dev build | 2, both under load | 332 passed, 59 skipped by design, 2 failed, in 60 minutes. Both failures were on the iPhone 15 Plus WebKit profile while a catalog import, three other browser runs and the unit suite shared the machine's four cores: `awards.spec.ts` "European Film Awards" timed out on a click, and `creation.spec.ts` "editing from Review" didn't find an element in 10 seconds. Run alone afterwards, both passed in 21.6 seconds. Nothing was changed for them. |

Not run locally: the production-build browser suite, which CI runs on the pull request.

### Earlier: Creative Depth Package, Milestone D (November 11, 2026)

Real people from the film catalog through the game's own hiring, and the work of hired writers and directors
(`docs/creative-depth/LEDGER.md`, "Milestone D"). Every person in these tests is a made-up fixture.

| Command | Failures | Notes |
| --- | --- | --- |
| `npm run check` | 0 | 867 tests (832 before). Startup 306 kB, 98 kB gzipped; budgets unchanged (700 and 220 kB). World check 0 problems. |
| `npm run balance` | 0 | 2 files. A hired director is now paid for shoot days; the balance runs' results held. |
| `tests/guests.test.ts` | 0 | 11 tests: one identity; recorded and made-up kept apart; jobs only from credits; nothing guessed; unknown age; death; the list for a part; six months, renewal and a name brought back. |
| `tests/real-hiring.test.ts` | 0 | 12 tests: considered, read once, countered, contracted, booked elsewhere and refused, shot with, paid, credited, reloaded; a director; a voice part; release and replacement; dates they can't do; death. |
| `tests/writing-jobs.test.ts` | 0 | 12 tests: terms shown first; money refused when short; days worked and paid once each; delivery; revision and its limit; acceptance, credit and assessment; brief and notes unread; scope weight; a pass stopped; a project from before; a director paid for each day directed. |
| Mutations | 1 or more for each | Eleven were made and each failed a test. Real people: the shared diary, death, unknown age, record expiry. Writers and directors: a day worked and not paid (4 tests failed); a delivered pass counted before acceptance; an episode handed over without accepted work (3 failed); the director unpaid; the writer counted by level instead of the pass; scope not weighing the work; revisions unlimited. |
| `e2e/real-people.spec.ts` | 0 | New, journeys J04 and J05: 6 passed on desktop, phone and WebKit (iPhone 15 Pro Max), in 2.7 minutes. |
| `e2e/journeys.spec.ts`, "TV limited series" | 0 | Changed for the writer rule: the hired writer can't be given the episode until a rewrite of it is commissioned, delivered and accepted. |
| `npx playwright test`, whole suite, dev build | PENDING | PENDING |

Found and fixed on the way:

- A hired episode writer, co-writer, script editor or episode director worked no days and was paid nothing, while
  taking a credit and moving the assessment. No page offered the co-writer's or script editor's job.
- Nobody could be hired to write or direct a single film.
- A person considered for a job the script doesn't call for had nowhere to be offered it.
- A Producer or Casting credit was offered a job nothing in the game reads. It is now offered nothing, and the page
  says why.
- The startup budget check failed on a chunk's name with not a byte more loaded: the base registry of 66 places, which
  the start screen has always read, became a chunk the bundler named "places". The check now allows that registry by
  what it is and holds it to its measured size (36 kB, ceiling 40).

Not run locally: the production-build browser suite, which CI runs on the pull request.

### Earlier: Creative Depth Package, Milestone B (November 11, 2026)

The idea picker, the idea library, the looks engine and the zombie example (`docs/creative-depth/LEDGER.md`).

| Command | Failures | Notes |
| --- | --- | --- |
| `npm run check` | 0 | 832 tests (776 before). Startup 304 kB, 97 kB gzipped; budgets unchanged (700 and 220 kB). The idea library is its own on-demand file, 102 kB. World check 0 problems. |
| `tests/looks.test.ts` | 0 | 21 tests: each makeup method, costume source, appearance state, crowd choice and story year against the schedule, the shoot day, the estimate and the call sheet, one input changed at a time. |
| `tests/brief.test.ts`, `tests/ideas.test.ts` | 0 | 25 tests: every one of the 187 ideas previews what it sets and applies exactly that; one pick for a field; custom text kept; the logline builder's 26,880 raw combinations and its refusals. |
| `tests/zombie.test.ts` | 0 | 6 tests: the package's 1986 zombie example built from ideas, compared three ways (appliances, digital, masks) and delivered. |
| `tests/creative-depth-audit.test.ts` | 0 | The field inventory (247 controls) and the effect coverage table (188 rows) are written from the code and compared with the committed files. |
| Mutations | 1 or more for each | Two were made and each failed a new test: makeup time no longer read by the shoot day (2 tests failed); a creature look charged twice (1 failed). |
| `npx playwright test`, whole suite, dev build | 2, both explained | 327 passed, 55 skipped by design, 2 failed. `viewports.spec.ts` "every main screen fits": this machine has the owner's film catalog installed, and the dev server put its releases on the calendar; the journey now answers catalog requests as a server with none does, and passes (9 of 9 in that file). `catalog.spec.ts` on WebKit timed out at Start My Story while a second browser run shared the machine; alone it passes in 4.7 s. |
| `e2e/creative-ideas.spec.ts` | 0 | New, journey J01: desktop, phone and WebKit (iPhone 15 Pro Max). A film from a chosen idea through the picker, the zombie brief, makeup and costume, the shoot and delivery; the phone sheet's screenshot was looked at. |

Not run locally: the production-build browser suite, which CI runs on the pull request.

### Earlier: Creative Depth Package, Milestone A (November 11, 2026)

Owner-data access and frozen world profiles (`docs/creative-depth/LEDGER.md`).

| Command | Failures | Notes |
| --- | --- | --- |
| `npm run check` | 0 | 776 tests (766 before). Startup 304 kB, 97 kB gzipped; budgets unchanged (700 and 220 kB). World check 0 problems. |
| `tests/catalog-server.test.ts` | 0 | 11 tests, 5 new under "who gets the owner's data": direct requests from this machine, from another name, through a proxy and with made-up cookies; sign-in, sign-out, twelve-hour expiry, lockout; a server that isn't the owner's; start-up refusals. |
| `tests/industry.test.ts` | 0 | 19 tests, 5 new: decisions unchanged by a catalog changed in every field they used to read; the frozen profile's contents; a save begun before profiles; expiry at 180 days; opt-in refresh. |
| Mutations | 1 or more for each | Five were made, and each failed a new test: the gate letting every request through; forwarded requests counted as local; the catalog read again at each decision (4 tests failed); source copies never expiring; a refresh rewriting decided series. |
| `npx playwright test` on five specs, dev build | 0 | 44 passed, 6 skipped by design (the mod-server journeys, which need the production servers). `e2e/world-refresh.spec.ts` is new: 2 journeys, desktop and phone. |
| `SLATE_E2E_PROD=1 npx playwright test` on five specs, production build | 0 | 28 passed. `e2e/owner-access.spec.ts` is new: 2 journeys on desktop and phone against the owner's server with a passphrase, reached as a visitor from elsewhere. |

Not run locally: the whole of both browser suites, which CI runs on the pull request.

Found and fixed on the way: the input audit's generator had fallen eleven rows behind its table.

### Earlier: NBCUniversal After #65 (November 11, 2026)

| Command | Failures | Notes |
| --- | --- | --- |
| CI on `d557c88`, run 43023046390 | 0 | Every CI step, including both browser suites, on #65's final commit. #65 then squash-merged as `a192119`. |
| `npm run screen-catalog:import` (NBCUniversal added) | 0 | 10,008 titles, 4,840 seasons, 139 networks, 279,842 people; 0 retries, 0 rate-limited, 0 not found. `docs/CATALOG-COVERAGE.md` regenerated from it. |
| `npm run check` | 0 | 766 tests. New in `tests/catalog.test.ts`: NBCUniversal's leaders count from November 11, the day they were read; Cavanagh's role, which waits on the undated separation, stays Announced, Not Yet Begun. Startup 303 kB, 97 kB gzipped, budgets unchanged. |
| Mutations | 1 for each | Two were made and each failed the new test: the undated rule removed from `standingAt`; NBCUniversal's group taken out of `checkedFor`. |
| The real packs with NBCUniversal, installed from a file and as a mod, Chromium and WebKit (iPhone 15 Pro Max) | 0 | Storage used: film pack 120.1 MB in Chromium and 110.8 MB in WebKit; cinemas 1.5 MB in each. The same both ways of installing. Film pack in 9.3 s and 10.4 s in Chromium, 6.1 s and 7.2 s in WebKit. |
| Browser spot-check on the owner's server (port 8080, `--owner`) | 0 | Universal's companies, grouped by owner; Jurassic Park reads "Released before the acquisition (January 28, 2011)". |

Found and fixed: before this, Cavanagh showed as NBCUniversal's current chief executive from the registry's check date
on, though the separation he is to lead after has no date.

### Earlier: Every Stand-In Place, TMDB For The Owner Only, And The World's Studios (November 11, 2026)

| Command | Failures | Notes |
| --- | --- | --- |
| `npm run check` | 0 | 765 tests. New: `tests/studios.test.ts` (pace, genres, months, announced films, seeds, the save's snapshot, an older save, no catalog) and `tests/competition.test.ts` (an award's field in its window, the same field each call, cinemas, studios' offers). The awards ledger lists the new test. |
| `npx playwright test e2e/living-world.spec.ts e2e/catalog.spec.ts e2e/foundation.spec.ts e2e/cinemas.spec.ts`, desktop and phone | 0 | 28 passed, including a studio's simulated film from its company page to its own page, kept after a reload. |
| `SLATE_E2E_PROD=1 npx playwright test e2e/data-packs.spec.ts`, desktop, phone, WebKit | 0 | 12 passed, including port 4179, which isn't the owner's: no TMDB data, cinemas only. |
| `npx playwright test e2e/children.spec.ts -g "a shoot with a child"`, desktop | 0 after two fixes | A Los Angeles short with a ten-year-old shot to delivery: licence granted before her days, studio teacher hired, $196 in her Coogan trust. |
| WebKit stress, 101 runs | 0 | The Continue Creation flake didn't recur (Open, below, now closed). |

### Earlier: Child Rules For The Rest Of The UK, India, Japan, South Korea And Mexico (November 11, 2026)

Seven more sets of child performer rules (Scotland, Wales, Northern Ireland, India, Japan, South Korea, Mexico), each
read from its official text; Ontario's corrected from its consolidated text; and every set's date in force and latest
change found recorded (`docs/child-rules/RESEARCH.md`).

| Command | Failures | Notes |
| --- | --- | --- |
| `npm run check` at `90714fe` | 0 | 93 files, 751 tests. Startup unchanged at 302 kB, 97 kB gzipped. New in `tests/minors.test.ts`: the UK nations' figures; India's, Japan's, South Korea's and Mexico's; a Tokyo shoot whose child's night scene isn't shot; South Korea's night work refused under 15 and allowed at 15; every set's dates present, none changed in 2026 or later. |
| Mutations | 1 or more for each | Four were made and each failed a test: a set's latest change moved into 2026; a set's dates removed; Japan's night ban removed; the night refusal removed from the licence check. |
| `npx playwright test e2e/children.spec.ts e2e/focus.spec.ts`, desktop | 0 | 3 passed. |
| Ontario | — | The Act as amended in 2017 allows 8 hours at every age; the game had 4 under 2 from the 2015 text. Corrected. |

### Earlier: Data Packs (November 11, 2026)

| Command | Failures | Notes |
| --- | --- | --- |
| `npm run check` | 0 | 93 files, 747 tests. New: `tests/packs.test.ts` (round trip, the six-month date and its cap, five refusals). Startup 302 kB, 97 kB gzipped. |
| `npx playwright test e2e/data-packs.spec.ts`, desktop, phone, WebKit (iPhone 15 Pro Max) | 0 after a fix | 6 passed. WebKit first refused to store the records ("The pack couldn't be stored"): it can't keep a Blob in IndexedDB in a private window, which Playwright's are. Records are stored as bytes now. |
| `npx playwright test --workers=1` (dev server, every project, as CI runs it), at `b0ce7c0` | 0 | 317 passed, 45 skipped by design, in 39.7 minutes on this machine. CI's 45-minute step had been cut at tests 337 and 324 of 353 on two commits, none failing; CI's machine is slower than this one, so each browser step now has 60 minutes (`c41554f`). |
| The real packs, production build with no catalog on the server | — | Film pack (69.7 MB, 9,510 files) installed in 5.8 s in Chromium (77 MB used) and 4.0 s in WebKit with iPhone emulation (71 MB). Cinemas in about 0.1 s. |

### Earlier: The World Foundation (November 11, 2026)

| Command | Failures | Notes |
| --- | --- | --- |
| `npm run check` at `bb628e7` | 0 | 92 files, 744 tests. Startup JavaScript 302 kB, 96 kB gzipped (was 685 and 219); budgets unchanged. New:<br>- `tests/industry.test.ts`: a catalog late or gone and back decides the same; a reload partway and another save in between end the same; a refresh never rewrites decisions or adds seasons, before or after the first decision; a save from before `rec` takes it once; forty seeds over ten years stay coherent.<br>- `tests/minors.test.ts`: age bands change on the birthday, day by day for 17 years, 8 birth dates (two of them February 29) and 4 rule sets; read status matches the research log.<br>- `tests/programme.test.ts`: only a released theatrical release plays, for its run; nothing in the engine reads cinemas.<br>- `tests/catalog.test.ts`: Lucasfilm's transition is Leaving and Announced until the registry's check. |
| Mutations | 1 or more for each | Eleven were made and each failed a test:<br>- deciding on the day a wait ended (two ways);<br>- no profile clipping, no event filter, a recorded ending kept;<br>- no `rec` at the start (this one survived until a test refreshed the catalog before the first decision);<br>- no `rec` for an older save;<br>- a premiere before its decision;<br>- a cancelled series left open;<br>- the old day-count ages;<br>- France recorded as read in full. |
| `npx playwright test e2e/foundation.spec.ts`, desktop | 0 | 3 passed, fixture data. |
| The catalog, child and foundation journeys, WebKit (iPhone 15 Pro Max) | 1 flake | 10 of 11 passed with two workers; the one that failed, a Continue Creation that didn't open creation, passed 3 of 3 alone (Open). |
| `e2e/backup.spec.ts`, `e2e/storage.spec.ts`, desktop | 0 after the fix | Failed first: lazy Shell and Home kept "Loading…" up for React's 300 ms reveal delay while the clock ran, so a save read at once had moved on. They now draw from the store. Passed on the code before the change, in a temporary worktree. |
| Startup measured, 3 runs each build | — | `docs/PERFORMANCE.md`. The first runs timed New Game until any top heading, which the start screen already had, and were discarded. |
| `SLATE_E2E_PROD=1 npx playwright test`, all projects, at `0e00a82` | 0 | 315 passed, 38 skipped by design, in 13.5 minutes: the production build through `server/serve.mjs`, desktop, phone and the three WebKit iPhone projects, with the foundation journeys and the catalog and child journeys on WebKit. The first attempt at `bb628e7` was lost to a container restart partway, with no failures up to then. An earlier run on a build from before the fixes failed 9: two on the old acquisition wording, seven on WebKit from fetches a test's reload cut off (the helpers now let the start screen finish loading first). |

### Earlier: What The Cinemas Show (November 11, 2026)

| Command | Failures | Notes |
| --- | --- | --- |
| `npm run check` | 0 | 90 files, 725 tests. New:<br>- `tests/programme.test.ts`: runs by country and date; your release only in its territories and never when cancelled; bookings at about their share and stable; a closed cinema, or one with no sign of trading, showing nothing; screens capped with yours first;<br>- `tests/cinemas.test.ts`: which cinemas show films;<br>- `tests/catalog.test.ts`: the build's `theatrical.json`, which takes a limited release over a digital one.<br>Startup is 683 kB, 219 kB gzipped. |
| Mutations | 1 for each | Three were made, and each failed a test:<br>- digital releases counted as cinema openings;<br>- closed cinemas booking films;<br>- your film's bookings ignoring its reception. |
| `npx playwright test e2e/cinemas.spec.ts e2e/catalog.spec.ts`, desktop and phone | 0 | 18 passed. The new journey checks, on fixture data:<br>- your theatrical release, marked released in the save, is in British cinemas beside a catalog film in its run;<br>- one whose eight weeks are over, and one that opened only in France, aren't;<br>- one opening soon is listed;<br>- a closed cinema shows nothing, and an unclosed one with no website or operator says so;<br>- your film's Release page counts the cinemas showing it. |
| `npx playwright test e2e/awards.spec.ts`, desktop | 0 | 16 passed. Its release pages now carry the cinema bookings. The first run died with the worker restart (exit 137) when it ran together with the other specs; run alone, it passed. |
| CI on `3c12731` | 9 failed | Every place-page journey in `world.spec.ts`, and the viewports check, failed on a 404. CI has no catalog, and the place page asked for `theatrical.json`, which the server didn't answer as "not installed" as it does the catalog index. The failure reproduced locally with `.screen-catalog` and `.cinemas` moved aside. With the fix, `world.spec.ts` and `viewports.spec.ts` passed 23, with 5 skipped by design, on desktop and phone. |
| Real data, by eye | — | London on May 4, 2026 showed The Devil Wears Prada 2 (opened May 1) and Ready or Not: Here I Come (opened March 20, in week seven of eight). Hoppers, whose run had ended, didn't show. Jacey Leicester Square, long closed with no closure recorded, was booking films until websites were required. |

### Earlier: Cinemas On Place Pages, And Georgia's Child Rules (November 11, 2026)

| Command | Failures | Notes |
| --- | --- | --- |
| `npm run check` | 0 | 89 files, 718 tests. New:<br>- `tests/cinemas.test.ts` (4): openings and closings at their recorded precision, undated closures, distance;<br>- `tests/minors.test.ts`: Georgia's hours, coordinator and studio teacher per ten, nurse, and no trust.<br>Startup is 683 kB, 219 kB gzipped. |
| `npx playwright test e2e/cinemas.spec.ts e2e/catalog.spec.ts e2e/children.spec.ts`, desktop and phone | 0 | 18 passed. The cinema journey checks London's card on fixture data: the counts, a closing date, an undated closure, a cinema not yet open, and one too far away. |
| `e2e/world.spec.ts`, `e2e/failures.spec.ts`, desktop and phone | 0 | 30 passed, with the card on every place page. |
| A dev server without `.cinemas/` | — | The index answers `{"installed":false}` (no console error), and a country's file answers 404. |
| Real data, by eye | — | London's card at November 11, 2026 lists the West End's cinemas. The first import had read year-only dates as January 1. The importer now keeps each date's precision: in Britain, 203 openings by year, 9 by month and 77 by day. |

### Earlier: Networks And Streaming Services (November 11, 2026)

| Command | Failures | Notes |
| --- | --- | --- |
| `npx vitest run tests/catalog.test.ts tests/industry.test.ts` | 0 | New tests cover:<br>- the build's network pages, `networkIds` and outlet kinds;<br>- Wikidata's kinds, website matching and date precision;<br>- owners at a date, including year and month precision;<br>- cable networks making a series cable. |
| Mutations | 1 for each kept | Five were made one at a time:<br>- the engine ignoring network kinds;<br>- the build dropping them;<br>- dates without their precision;<br>- year-precision ends compared as text.<br>Each failed a test. The fifth, a start compared as text, survived because plain comparison is already right for a start, so the helper was simplified to it. |
| `npx playwright test e2e/catalog.spec.ts`, desktop and phone | 0 | 14 passed, including the new journey: Companies, then the networks list, then a network's owners at the save's date (earlier, current, undated, and a later owner not shown), its series aired and announced, a series, and back. |
| Real catalog, by eye | — | CBS, HBO and Hulu were captured at November 11, 2026. A current owner's end date showed in the fixture ("until June 30, 2027", the story's future) and was removed. Year-precision owners had read as January 1; they now read as years. |

### Earlier: Child Rules Across The Map (November 11, 2026)

Six more sets of child performer rules, a coverage ledger for every playable country, and startup room made for them.
What was read is in `docs/child-rules/RESEARCH.md`, and the set each country uses is in `docs/child-rules/COVERAGE.md`.

| Command | Failures | Notes |
| --- | --- | --- |
| `npm run check` | 0 | 88 files, 710 tests: `tests/minors.test.ts` went from 13 to 23. Startup is 682 kB, 219 kB gzipped, under the 220 kB budget, which wasn't raised. With the new sets it measured 220.60 kB first. The saved games list, Import Save, Storage and the settings now load when they're opened (`src/ui/SavedGames.tsx`), which brought it to 218 kB before Ontario and Ireland were added. |
| Mutations of the new rules | 1 for each | Eight were made one at a time, and each failed a test:<br>- days a week off by one;<br>- no days-a-week check;<br>- no set-aside threshold;<br>- no chaperones by age;<br>- no school-day cap;<br>- the shoot not counting earlier pay toward the threshold;<br>- Ontario's share taken only of the excess;<br>- Ontario's share counted again once already past the threshold. |
| `SLATE_E2E_PROD=1 npx playwright test` on accessibility, backup, reliability, storage, viewports, children and live-action, desktop and phone | 0 | 39 passed, 7 skipped by design (two-tab checks run once, on desktop). The first run used the dev server. Its accessibility check failed: the Saved Games page stayed on Loading… because the server had run out of file watchers watching the catalog cache's 150,000 files. `vite.config.ts` no longer watches the catalog's or the cinemas' directories. |

### Earlier: Child Performers, Character Ages And People Who Age (November 11, 2026)

The rules and their sources are in `docs/ASSUMPTIONS.md`, Child Performers.

| Command | Exit | Result |
| --- | --- | --- |
| Research | n/a | Read from the official texts:<br>**England:** SI 2014/3309, regulations 4, 13, 15, 21 to 26.<br>**California:** 8 CCR §11760 and §11755.2; Family Code §6752; the Entertainment Work Permit page.<br>**New York:** the Department of Labor's LS 559 chart (its text, from the PDF) and its pages on employer duties. |
| `npm run check` | 0 | 88 files, 700 tests. New: `tests/minors.test.ts` (13) and `tests/people-ages.test.ts` (7). Startup is 687 kB, 219.75 kB gzipped, under the 220 kB budget, which wasn't raised. The child rules put it at 224 kB first. Three modules no longer load at startup:<br>- the living world's engine (`industry.ts`), which now loads with the world file; state.ts holds its decisions until then;<br>- the cost estimate (`estimate.ts`), which now loads with the plan pages;<br>- the casting notes (`casting-notes.ts`, moved out of hiring.ts), which now load with the casting page. |
| Mutations of the child rules | 1 for each | Seven were put back one at a time, and each failed a test:<br>- no child cap in planning;<br>- no check for who must be on set;<br>- no trust set-aside;<br>- no rest after a night shoot;<br>- no wait for the licence;<br>- no ageing between seasons;<br>- no cap on a child's hours on the day.<br>The last survived at first, because the plan already keeps a child's day within their hours. The test now gives one day more of the child's work than they may do. |
| Golden production outcomes (`tests/production-golden.test.ts`) | 0 | Unchanged. The test helper casts a part's age, or an adult for a part with no age, since the pool now has children. |
| `children`, `living-world`, `catalog`, `careers`, `first-project`, `script-rules`, `accessibility`, `decisions` on desktop and phone | 0 | 34 passed, 4 skipped by design. The new `children` journey: a part's age written as numbers; England's rules on the Cast page; the chaperone and tutor required in Crew; and the performers who play the part's age listed first, each child with what casting them brings. |

### Previous: The Living World, Phase 2: Series Continue Or End (November 10, 2026, in #64 with Phase 1)

The rules are in `docs/WORLD.md`, under Phase 2.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run screen-catalog:build` | 0 | `world.json` is now 419 kB. It holds the same 2,134 events plus profiles of the 143 series still running when the records end. 78 of them carry each fully dated season's episode spacing. |
| Five simulated years on the real profiles (a probe script, not kept) | 0 | Three problems found and fixed: partial episode counts copied from a season still airing, too many final seasons for evergreen animation, and a daily programme's year drifting across leap years. After the fixes: *Abbott Elementary* gets 22 episodes a season, premiering in late September or early October. *Only Murders in the Building* gets 10. Broadcast decisions cluster in May. About 31 of the 143 series are still running after five years. |
| A second probe, made after looking at the In Your Story card | 0 | Four more problems found and fixed. Seasons had no breaks: Abbott ran straight from October to March. Seasons opened on any weekday. Final seasons were said to end at the next upfronts, after their finale. Daily programmes aired on weekends. With two seeds over five years, the daily programmes had no weekend episodes and every ending fell on its finale. Abbott opens on Wednesdays and ends in April, and *The Simpsons* opens on Sundays. |
| `npm run check` | 0 | 85 files, 673 tests, including the new `tests/industry.test.ts` (8). Putting back any of the four fixes fails a test in it. Startup is 685 kB, 219 kB gzipped (budgets 700 and 220), up from 679 and 217 because the engine loads with the game. The budget was not raised. |
| `catalog`, `living-world`, `world`, `accessibility`, `viewports`, `focus`, `readers`, `devices`, `first-project`, `journey-a`, `catalog-live` on desktop and phone | 0 | 53 passed, 9 skipped by design. The new `living-world` test plays a save past the records' end and checks the decision, the In Your Story card, the returning regulars, and that all of it survives a reload. |
| `catalog`, `living-world`, `catalog-live`, `world` on desktop and phone, after the second probe | 0 | 28 passed. |
| Simulated season pages: `npm run screen-catalog:build`, then `npm run check` | 0 | `world.json` is 432 kB. It now records the regulars' birth and death dates: 608 of 686 regulars have a birth date, and 7 died. Those include *General Hospital*'s Tyler Christopher and Michelle Trachtenberg, whom the recorded season casts still listed, and who are now shown as not returning. 86 files, 680 tests, including the new `tests/simseason.test.ts` (7). Startup is unchanged at 685 kB, 219 kB gzipped: the page loads with the catalog's pages. |
| `catalog`, `living-world`, `catalog-live`, `world`, `accessibility`, `readers` on desktop and phone | 0 | 32 passed. `living-world` now opens the simulated season's page. It checks the dates, nights, breaks, two episodes on one night, the returning and not returning cast, the seasons around it, and the series' Seasons list. |
| Ages: `npm run check`, then `catalog` and `living-world` on desktop and phone | 0 | 86 files, 680 tests. The season pages had their own age arithmetic, which counted a February 29 birthday on March 1. They now use the engine's rule, February 28 in other years, and `tests/simseason.test.ts` checks it. Person pages give the age at the save's date, or the age at death, with `ageAt` checked in `tests/catalog.test.ts`. 14 browser tests passed. A capture at November 1, 2026 shows Sheryl Lee Ralph as 69, and Paul Newman as died September 26, 2008, aged 83. |
| Captures of the real *Abbott Elementary* Seasons 7 and 8, at November 1, 2028 (temporary spec, deleted) | 0 | Each season copies Season 5's three four-week breaks: early November, the holidays and February. Each opens on a Wednesday and ends in late April. The cast's ages are those at each premiere. |

### Previous: The Living World, Phase 1: The World's Clock (November 10, 2026, after #63)

The rules are in `docs/WORLD.md`.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run screen-catalog:build` | 0 | `world.json` written: 2,134 events, 306 kB. That is 77 films; 103 seasons, 29 released all at once; 1,932 episodes with 35 finales; and 22 endings. 758 events belong to 7 continuous programmes. Two rules came from reading the real Home: finales only for seasons known to be finished, and continuous programmes kept out of the news. |
| `npm run check` | 0 | 84 files, 665 tests, including the new `tests/world.test.ts` (5) and the world file check in `tests/catalog.test.ts`. Startup is unchanged at 679 kB, 217 kB gzipped. |
| `e2e/catalog.spec.ts` and `e2e/catalog-live.spec.ts` on desktop and phone | 0 | 16 passed, including the new Home and calendar test. |
| `accessibility`, `viewports`, `focus`, `readers`, `devices`, `first-project`, `journey-a`, `screenings`, `catalog-live` on desktop and phone | 0 | 33 passed, 9 skipped by design. Run before the finale and continuous-programme rules, which change only the catalog's own build. |

### Previous: The Disney Screen Catalog And Company Leadership (November 10, 2026, after #62)

The catalog's rules are in `docs/CATALOG.md`, and the counts from the gathering run are in `docs/CATALOG-COVERAGE.md`.

**Gathering run:**
- **The run:** 42,436 TMDB requests through the session proxy, with no retries, rate limits, failures or missing
  records.
- **Gathered:** 4,781 films, 1,064 series, 2,996 seasons, 65,780 episodes, and 190,751 people, 33,036 of them with
  details.
- **Where it is:** none of it is in the repository or in builds (TMDB's terms).

| Command | Exit | Result |
| --- | --- | --- |
| `curl` of `api.themoviedb.org/3/movie/550` through the proxy | 0 | HTTP 200, "Fight Club". |
| `npm run check` | 0 | 83 files, 660 tests, including the new `tests/catalog.test.ts` (21). Startup 679 kB, 217 kB gzipped (budgets 700 and 220). The build has no catalog data and no credential. |
| `catalog`, `catalog-live` on desktop and phone (dev server) | 0 | 10 fixture tests passed, then 4 live tests on the real catalog. |
| `catalog`, `catalog-live` on desktop and phone (`SLATE_E2E_PROD=1`) | 0 | 14 passed. |
| `accessibility`, `viewports`, `focus`, `readers`, `devices`, `first-project`, `decisions`, `earnings` on desktop and phone | 0 | 32 passed, 8 skipped by design. |
| CI on the pull request | See the pull request | The full browser suite and the production-build suite. Without a catalog installed, `catalog-live` skips there. |

### Previous: Your Earnings Is Only Your Money (November 10, 2026, after #61)

The cycle fix in #61 offered a delivered project's whole uncommitted balance as Your Earnings, unspent grant and investor
money included. That was replaced by the rules in `docs/EARNINGS.md`.

| Command | Exit | Result |
| --- | --- | --- |
| `npx vitest run` (inside `npm run check`) | 0 | 82 files, 639 tests. New `tests/earnings.test.ts` has 13 tests. `tests/cycles.test.ts` and `tests/finance.test.ts` were changed to the new rule and terms. Seven hand mutations of `finance.ts` were tried. Six failed tests at once. The seventh, dropping the cap at uncommitted money, failed only after the test of income taken back was added. |
| `npm run balance` | 0 | 2 files passed. |
| `npm run check` | 0 | Startup 678 kB, 216 kB gzipped (budgets 700 and 220). |
| `earnings`, `decisions`, `negotiation`, `first-project`, `careers` on desktop and phone | 0 | 17 passed, 3 skipped by design. `earnings` was run again after its capture changed: 2 passed. |
| `decisions`, `connected` on `iphone-15-pro-max` (WebKit) | 0 | 4 passed. |

The injected test in `e2e/decisions.spec.ts` was removed. It wrote $50,000 into a save. `e2e/earnings.spec.ts` replaces it,
with no fixture but the pinned world seed (3).

### Previous: Screens Lined Up, And Every Cycle Followed Through (November 10, 2026, after #60)

Commits `44e2a77` (alignment and capitals across the screens) and the commit that adds this section (cycles).

| Command | Exit | Result |
| --- | --- | --- |
| Every screen after creation captured at desktop and phone width, and scanned for text starting lowercase | 0 | Before: 75 captures with misaligned list names, a checkbox below its label, crammed text after buttons, touching chips, a clipped forecast, a tab arrow over its tab and lowercase labels. After: re-captured and re-scanned; the two left are deliberate (credits' "as Odile", sentence-case calendar labels). |
| `npx vitest run` | 0 | 81 files, 627 tests; new `tests/cycles.test.ts` (6). The track-record comparison failed when the new bonus was set to 0 (a mutation check), then passed restored. |
| `npm run balance` | 0 | 2 files passed; `docs/balance-results.json` unchanged. |
| `npm run check` | 0 | Startup 673 kB, 215 kB gzipped (budgets 700 and 220). |
| Ten specs, desktop and phone (after the alignment fixes) | 0 | 77 passed, 5 skipped by design. |
| `decisions`, `first-project`, `career`, `careers`, `connected`, `journey-a`, `screenings` on desktop, phone and `iphone-15-pro-max` (after the cycle fixes) | 0 | 31 passed, 4 skipped by design. |
| CI run 155 on `main` at `5a020aa` (#60) | See the pull request | Checked when it finishes. |

The cycle audit and what it closed are in `docs/INPUT-AUDIT.md` (Cycles That Stopped Short).

### Previous: The Original Song Loop, Episode Release Edges, Rolling Episode Delivery, Decisions In The Browser (November 10, 2026, after #59)

Commits `68844cd` (release edges), `1a6fee5` (journey C), `4beae57` (rolling delivery), `e202b2c` (decisions, territory
codes) and the commit that updates this report. CI on the pull request is the full-suite run for the final revision;
its result is recorded in the pull request, not here, because it runs after this commit.

| Command | Exit | Result |
| --- | --- | --- |
| `npx vitest run` at `e202b2c` | 0 | 80 files, 620 tests. New: `tests/episode-release-edges.test.ts` (9), `tests/episode-delivery.test.ts` (3). Each defect's test failed on the old code first. |
| `npx vitest run` with the song snapshot test | 0 | 80 files, 621 tests. The new test failed when the snapshot was made to hold the song itself (a mutation check), then passed with the copy restored. |
| `npm run check` at `e202b2c` | 0 | World check, typecheck, vitest, build, budget. Startup 671 kB, 214 kB gzipped (budgets 700 and 220; 667 and 213 after #59). |
| `node scripts/perf-first-use.mjs` on this branch, the medium save, median of 5 | 0 | Start 293 ms; Continue 390 ms, 829 kB of JavaScript (257 gzipped); New Game 1,113 ms, 894 kB (280). After #59: Continue 396 ms, 826 kB; New Game 1,038 ms, 890 kB. The time difference is within this machine's run-to-run spread. |
| `SONG_SEED=n npx playwright test e2e/journey-c.spec.ts --project=desktop`, seeds 5 to 8 | Seeds 5 to 7 stopped; seed 8: 0 | Seeds 5 to 7 brought no theatrical offer, so there was no qualifying release and the journey couldn't go on. Seed 8 passes: a US theatrical offer accepted, released, entered, nominated, judged and reloaded. Seed 8 is the default. The search only chose the world seed; the release, entries and results are the game's own. |
| `npx playwright test e2e/rolling-delivery.spec.ts`, desktop and phone (dev) | 0 | Passed (1.4 and 1.8 minutes). On phone, no sideways scroll and each episode row fits. A resized desktop page was tried first; its screenshot showed the desktop navigation over the card, so it was dropped for the real phone profile. |
| `npx playwright test e2e/decisions.spec.ts`, desktop, phone and `iphone-15-pro-max` (dev) | 1, 1, then 0 | Failures, test-side: the saved state lags the screen until Save And Exit, and the shoot starts after about nine working days of preparation, so the dates were wrong. Then 9 passed. |
| `npx playwright test e2e/journeys.spec.ts -g "TV limited series" --project=desktop` | 1, then 0 | The credits were read from the save before it was written; now read from the screen. Then passed. |
| `npx playwright test e2e/journey-e.spec.ts e2e/release-schedule.spec.ts e2e/season.spec.ts`, desktop and phone (dev) | 0 | Passed. Journey E's step that expected story order to be refused now checks for the advice, and for an episode dated before the release day being refused. |
| `SLATE_E2E_PROD=1 npx playwright test decisions rolling-delivery journey-e release-schedule journey-c`, desktop, phone, `iphone-15-pro-max` | 0 | 16 passed, 2 skipped (journey C and journey B run at desktop only), 5.4 minutes. |
| CI run 153 on `main` at `a062923` (#59) | 0 | Success: checks, balance, browser journeys on the dev server and on the production build. No WebKit failure, so no new evidence on the title loss. |

**Defects found and fixed in this pass**, each with a test that failed on the old code:

- `airings()` took the first record for a day: its countries alone, and its status. A planned release listed before a
  released one made an aired episode read as still to come, and the entry provisional. It now takes every release's
  countries and the earliest live day, in any order.
- Two identical streaming releases gave two calendar entries the same key. Entries now carry ids.
- A release or episode dated today could be planned after 9 in the morning had passed, and its event fell in the past.
  It is now refused with a reason; before 9 it is accepted.
- A release could name a territory that is no country (blank, "G", "XX"). It is now refused, naming the code.
- Story order was enforced where broadcasters don't enforce it. It is advice now. Journey E's old refusal step changed
  with it.
- A series couldn't release a finished episode until every episode was finished. See `docs/RELEASE-SCHEDULES.md` and
  `src/engine/episode-delivery.ts`.

### Previous: Gameplay Connectivity, Episode Release Schedules, Startup Headroom, Journeys A To E (November 10, 2026, after #58)

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` at `db2318e` (control audit and comparisons) | 0 | 77 files, 596 tests; startup 685 kB, 219 kB gzipped. |
| Mutation checks on the new comparisons | 1 each, as intended | Each rule the new comparisons rely on was broken once, and each break failed its test: render hours for feature quality, the period category, proficiency, and the part's language. |
| `npx playwright test e2e/release-schedule.spec.ts --project=desktop` (dev) | 1, 1, 1, 1, then 0 | Failures, all test-side: the hire dialog closes itself after an offer; offers are answered in two or three days, not one; the credits are on the Release tab; Short-Form Series doesn't take the Series format. Then passed (47 s). |
| `npm run check` at `54a7923` | 0 | 78 files, 607 tests; startup 667 kB, 213 kB gzipped (was 694 / 222 with the schedules, over budget). |
| `SLATE_E2E_PROD=1 npx playwright test failures creation world release-schedule --project=desktop` | 0 | 31 passed. |
| `node scripts/perf-first-use.mjs` on `main` (`bc0f070`) and on this branch, a medium save, median of 5 | 0 | See `docs/PERFORMANCE.md`. Start and Continue: 844 kB of JavaScript to 826 (263 to 256 gzipped). New Game: 882 to 890. |
| CI run 151 on #59 (`54a7923`) | 1 | 242 passed, 33 skipped, 3 failed. The European Film Awards journey (desktop, phone, `iphone-15-plus`) logged duplicate React keys. Two cinema releases of one film on the same day got the same calendar entry, because entries didn't say where. **A defect of this change, fixed:** entries now name their territories, with a unit test for the case. |
| `SLATE_E2E_PROD=1 npx playwright test` the four new journeys with `release-schedule`, `title-input`, `awards`, `readers`, `connected`, `failures`, `creation`, `world`, `auditions` on desktop, phone, `iphone-15-plus` and `iphone-15-pro-max` | 0 | 157 passed, 4 skipped (the projects each spec doesn't run on), 14.5 minutes. React's production build doesn't warn about duplicate keys, so this run couldn't show run 151's failure. |
| `npx playwright test e2e/awards.spec.ts -g "European Film Awards" --project=desktop --project=phone --project=iphone-15-plus` (dev server), after the calendar fix | 0 | 3 passed: the journey CI run 151 failed. |
| `e2e/title-input.spec.ts` on desktop and both iPhones; then 20 repeats on each iPhone profile, on dev, on production, and on production under CPU load | 0 each | 123 passed. The working-title loss was not reproduced (see Open). |
| `e2e/journey-a.spec.ts`, desktop (dev) | 1, 1, 1, 1, then 0 | Failures, all test-side: the institution's id is `clermont`; entries open April 27, so the journey now waits for that date; "Accepted For Consideration" and "In Competition" are the statuses before the result. Then passed. |
| `e2e/journey-c.spec.ts`, desktop (dev) | 1, 1, 1, then 0 | Failures, all test-side: the shoot was never scheduled; delivery waits for the version's conform day; the Add Song form keeps the last lyrics choice, so "Lantern" had a hired lyricist. The game was right each time. Then passed. |
| `e2e/journey-d.spec.ts`, desktop (dev) | 1, 1, then 0 | Failures, test-side: the estimate needs an approved script; the second game needs a browser context of its own. Then passed. |
| `e2e/journey-e.spec.ts`, desktop, phone and `iphone-15-pro-max` (dev) | 1, then 0 | The refusal is the page's alert, not inside the Songs card. Then 3 passed. |

**Journeys added**, all through visible controls. Fixtures are labelled in each file.

- **A**, `journey-a.spec.ts`, desktop. Pinned seed 11. The steps:
  - a script with named characters, approved and backed;
  - three performers read for a part; one is shortlisted, called back to read with you, offered the part and accepts;
  - production, the edit, delivery and a digital release;
  - entered at Clermont-Ferrand, selected for the International Competition and carried through the festival;
  - Save And Exit, then Continue: the result, the cast and the release are kept.
- **B**, `release-schedule.spec.ts`, desktop. A series made, staffed (a hired director on episode 2) and shot, then:
  - released across the International Emmys' year end, which refuses it with the count;
  - episode 2 moved after a preview;
  - entered provisionally, then reloaded;
  - episodes come out on their own days.
- **C**, `journey-c.spec.ts`, desktop. Three songs (commissioned, licensed, your own), written, recorded and cleared as
  production work, then:
  - a Distribution Cut swaps the licensed song after picture lock;
  - on the Oscars' Original Song entry: the commissioned song goes to its hired songwriter and lyricist; yours to you;
    the licensed one is refused.
  - Not covered: the entry itself. The film has no theatrical run (no distributor offered), and this journey doesn't
    claim one.
- **D**, `journey-d.spec.ts`, desktop. The same life, seed and film twice, set at home or in Paris. The estimate's
  lines are identical except one researcher line.
- **E**, `journey-e.spec.ts`, desktop, phone and `iphone-15-pro-max`. Each refused with its reason, then recovered:
  - a licensed song without a rights holder;
  - Lock Picture before the work is done;
  - a release date in the past, and an episode before the one it follows;
  - a date change into the past, refused at review.

  The recovered dates are kept after a reload.
- **Title**, `title-input.spec.ts`, desktop and both iPhones. A working title typed, edited, cleared, pasted and
  submitted while the game runs.

**Screenshots inspected:**
- Journey B (desktop): the planned schedule and the change preview.
- Journey E: the review dialog on the iPhone 15 Pro Max and the reloaded Release tab on the phone. They fit, nothing is
  clipped, and focus stays in the dialog.
- The episode-dates fieldset showed the browser's white border at first. It now uses the app's borderless fieldset.

### The Last New Screens In Journeys; The Game, Not "SLATE", When It Describes Itself (November 9, 2026, after #57)

| Command | Exit | Result |
| --- | --- | --- |
| `npx playwright test e2e/career.spec.ts e2e/careers.spec.ts e2e/connected.spec.ts e2e/awards.spec.ts e2e/script-rules.spec.ts --project=desktop` | 1, then 0 | 22 passed, 2 failed. Both failures were mistakes in the new checks themselves. The awards journey opened About The Other Works before keeping the row's text, which its reload then compares; the check moved after that. The proposal fixture's earlier work (`p-earlier`) isn't a project in its save, so the Overview says "after your earlier work"; the check now expects that. Then 2 of 2 passed. |
| The same proposal, Oscars and Songs journeys on `iphone-15-plus` | 0 | 3 passed. |
| After #57 merged, on its tree: `npm run check`; `career`, `careers`, `connected`, `awards`, `script-rules` on desktop; `career` and `awards` on `iphone-15-plus` | 0, 0, 0 | 75 files, 585 tests, startup JavaScript 219 kB gzipped; 24 passed on desktop; 18 passed on `iphone-15-plus`. |

- **Now covered by journeys:**
  - Proposed By (`career.spec.ts`);
  - an offer's date (`careers.spec.ts`);
  - a backer's approach date, the picture lock date, each cut version's date and a budget line's postings (`connected.spec.ts`);
  - rival works described in a result, and a song's date (`awards.spec.ts`).
- **Text:** where the game says what it reads, scores, records or simulates, it says "the game", not "SLATE". That covers the Script, Characters, Structure, Season and Research panels, the content declaration, the place's weather note, the portrait picker and the backers' sent documents. `docs/COPY-GUIDE.md` has the rule. "SLATE" stays the product's name: the wordmark, saved files, browser storage, versions.

### Browser Evidence For The New Readers, And WebKit Input Logging (November 9, 2026, #57)

| Command | Exit | Result |
| --- | --- | --- |
| `npx playwright test e2e/readers.spec.ts e2e/auditions.spec.ts --project=desktop` | 1, 1, then 0 | Two test-side mistakes fixed: two place pickers on New Script, so the helper's "Chosen:" check matched both; and a new project opens on its Script tab, not its Overview. Then both passed. |
| `npx playwright test e2e/readers.spec.ts --project=phone --project=iphone-15-plus` | 0 | 2 passed. |
| The journey with Setting Research switched off | 1 | Failed at "Researcher: $", as it should. The source was restored. |
| After #56 merged, on its tree: `npm run check`, then `npx playwright test e2e/readers.spec.ts e2e/auditions.spec.ts --project=desktop --project=phone --project=iphone-15-plus` | 0, 0 | 75 files, 585 tests; startup JavaScript 219 kB gzipped. 5 passed: the new journey on desktop, phone and `iphone-15-plus`, and the auditions journey on desktop and phone. |
| CI on #57 (`88d5b54`, run 42714804488) | 1 | 243 passed, 1 failed: `readers.spec.ts` on `iphone-15-plus`, production build. "Researcher: $2,050" was on the Budget tab twice, in What Makes It Expensive as well as in Everything Still To Come, because that world's rates ranked the researcher among the costliest items. The game was right; the check matched both. Reproduced locally on the production build, 1 failure in 8 runs. The check now reads inside Everything Still To Come: 18 of 18 passed on desktop, phone and `iphone-15-plus`. |
| A throwaway WebKit test that fails on purpose after typing a title | 1 | `focus-and-input.txt` in its `test-results` folder held every focus, focus() caller, beforeinput and input event, through the typed title. |

- `e2e/readers.spec.ts` (desktop, phone, `iphone-15-plus`) covers:
  - a setting abroad, shown on the Overview and explained in the Story panel, then researched (a Researcher appears in the estimate);
  - a revision note about a scene;
  - a draft's saved date;
  - the project's own Recent Updates.
- `e2e/auditions.spec.ts` shows the rule "callbacks are for the shortlist": there's no Call Back before shortlisting.
- `e2e/test.ts`: on WebKit, every journey keeps a bounded log of focus and input events, with who called `focus()`. A failing test writes it to `focus-and-input.txt`, which CI uploads with `test-results/`. The next time a working title is lost, the evidence comes with it.

### Every Saved Field Is Read (November 9, 2026, #56)

The input audit and its follow-up ("everything that doesn't read needs to read perfectly"). `docs/INPUT-AUDIT.md` says
field by field what each one became. `tests/model-readers.test.ts` holds it: it fails on any field of the saved game
that nothing reads, by a rule or a screen.

| Command | Exit | Result |
| --- | --- | --- |
| `npx vitest run tests/model-readers.test.ts` before the work | 1 | 61 fields with no reader. |
| `npm run check` | 0 | 75 files, 585 tests passed, including the reader guard with no unread field. Startup JavaScript 685 kB, 219 kB gzipped (budgets 700 and 220 kB); 0 problems. |
| `npx playwright test e2e/auditions.spec.ts e2e/negotiation.spec.ts e2e/awards.spec.ts --project=desktop --project=iphone-15-plus` | 1, then 0 | 30 passed, 4 failed on the journeys' own expected text: As Entered's new credit wording, and the screen-time line's date. The wording was changed to read better ("Name, credit; Name, credit"); the screen-time line keeps "Recorded:" first. Run again: 6 of 6 passed. |
| `SLATE_E2E_PROD=1 npx playwright test --trace off` (every project, production build) at `27c8999` | 1, then 0 | 238 passed, 32 skipped by project, 3 failed: the connected journey on desktop, phone and `iphone-15-pro-max` expected a working-relationship entry to end at "worked through to delivery)", and it now ends with its date. The expectation now requires the date: `e2e/connected.spec.ts` alone passed 3 of 3 on the production build. |

- **Implemented and tested (engine):**
  - the primary genre decides comedy or drama;
  - Setting Research for a setting abroad;
  - callbacks come from the shortlist;
  - a thread's characters are checked against its scenes;
  - project plans and their reminders;
  - how each part was cast;
  - change orders list the work they sent back;
  - screen time goes stale when a scene changes length either way;
  - the wake message says how long you slept.
- **Defect fixed:** "Plan To Attend" never scheduled its day-before reminder, because it pushed its plan by hand.
- **Shown on screen, not covered by a browser journey at #56:** the dated records (drafts, offers, approaches, budget-line postings, versions, picture lock, songs, saved games), Recent Updates, rival descriptions, Proposed By, people's dated history. After #56, `e2e/readers.spec.ts` covered drafts' dates and Recent Updates; after #57, the journeys covered the rest except the saved games' Begun date, the people history's project links and the judges' scores.
- **Removed:** nine stored copies and dead fields (`docs/INPUT-AUDIT.md`, Removed). Old saves keep the keys and nothing reads them.

### The Owner's Recovered Awards Sources (November 9, 2026, merged as #55)

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` at `9a93aba` | 1, then 0 | The coverage ledger hadn't been regenerated for the new journeys (2 ledger tests); regenerated in `f7c8073`, then 74 files, 580 tests passed. Startup JavaScript 683 kB, 219 kB gzipped (budgets 700 and 220 kB). |
| `npx vitest run tests/recovered-rules.test.ts` | 0 | 15 tests: every organizer's boundaries (the day before, the day and the day after), local deadlines, the EFA's two submission periods, hanging episodes and an equal split entered once, a first airing in the US, exclusions, one entry per director, European recipients and a craft group at half, FESPACO's conflict and AMAA's ambiguity left unapplied, Blue Dragon and Locarno unavailable. |
| Mutants of the new logic (12) | | Each fails a test; a control mutant on an untested data detail (Kids categories' running time) survives, as expected. |
| `npx playwright test e2e/awards.spec.ts -g "Busan 2026\|European Film Awards:\|International Emmys: hanging" --project=desktop --project=iphone-15-plus` | 1, then 0 | 5 of 6 passed; Busan on WebKit failed with "Importing a module script failed" at the moment `npm run check` (a build) was started beside the dev server; run again alone: passed. The earlier desktop runs failed on test-side mistakes (a start date after the shorts' deadline; two entries with the same category name), fixed. |
| `SLATE_E2E_PROD=1 npx playwright test --trace off` at `091cb21` (every project, production build) | 0 | 241 passed, 32 skipped by project (specs that run at one width only), 0 failed, 21.6 minutes. The code is unchanged since; only this report moved after it. |

Implemented and tested (engine and browser): the International Emmys' 2026 rules and the 2027 projection; the European Film
Awards' 39th; BAFTA 2027; TIFF 2026; SXSW 2027 features; Busan 2026 with its dates; the DGA documentary; FESPACO's format,
age and release rules; AMAA's call dates. UI: each row reads the chosen project's own deadline; "Rules Not Read" only
where the game's rules apply; rule notes shown in plain words; the eligibility period and dates shown are the rules'.

Recorded and not applied: FESPACO's dates and deadline (source conflict); AMAA's release wording (ambiguous) and edition;
Blue Dragon and Locarno (unavailable). Read through search excerpts or the owner's pass, not directly here: BAFTA's pages,
SXSW's feature policy, the DGA documentary rules (a public preview subdomain), AMAA's FilmFreeway listing.
Modeled, not sourced: episode air dates (a broadcast weekly, streaming all at once); "major festival" as any festival in
the calendar; a European passport read from hired people's nationalities; DGA Agreement coverage assumed.

### Previous: The Limits Of #55 And More Rule Research (November 9, 2026)

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` at `67cbff8` | 0 | 72 files, 561 tests passed; startup JavaScript 681 kB, 218 kB gzipped (budgets 700 and 220), 0 problems. |
| `SLATE_E2E_PROD=1 npx playwright test --trace off` (every project, against `vite build` + `vite preview`) | 0 | 232 passed, 32 skipped, 0 failed, in 20.8 minutes. Built from `56fa0ca` (the Limits fixes and the festival journey's fix); the rule data added after it is covered by the unit suite. The 32 skips are the specs that run on one project only by design (31 on phone, 1 on desktop: `test.skip` by project name). |
| The dev-server suite (`npx playwright test`) | stopped | Stopped after 21 passes when it was clear it would take hours at this machine's pace; CI runs it on every push. |
| `npx playwright test e2e/journeys.spec.ts:562` (the festival journey that failed CI run 131) | 0 | 1 passed once its quality fixture was set before the entry. |

Implemented and tested:
- **Several songs per song category** (`tests/songs.test.ts`, "the organizers' own song rules", 6 tests; the Songs journey
  enters a second song). Entries compete as `projectId~songId` with their own results; Oscars three per film, two
  nominated at most; CSA two per film, one per team of writers.
- **End-credit cue order, "essentially equal" and minimum shares**: the Oscars' first new cue, the CSA's none; writing
  days per writer; under half the main writer's days is a partial contributor (SLATE's measure); the Emmys' 20%.
- **Song length and title themes**: the Goyas' 30 seconds at once or 60 in all, the Emmys' and AACTA's 15 seconds and
  series title theme.
- **Rules by format**: the WGA's Paul Selvin, the Spirit Awards' Redford, the AACTA's song, soundtrack, hair and makeup,
  and visual effects. The AACTA soundtrack's five songs heard five seconds each; its recipient is the music supervisor.
- **Rules read**: the DGA's first-time feature (`dga-2027@3`), the AACTA's online series (`aacta-2027@4`), Series Mania
  2027 (`series-mania-2027@1`). 541 categories verified, 11 projected, 254 simulated.
- **Mutation-tested**: four mutants of the soundtrack check and three of the Series Mania rules each fail a test; earlier
  in this work, the longest-versus-total length, the Emmys' share and the title theme.
- **Fixed**: CI run 131's festival journey edited quality after entering, which the entry's snapshot (rightly) ignores.

Modeled, not sourced: screen time is the player's record; "essentially equal" as half the main writer's days. Sourced and
not modeled at first, then added (below): visual effects wholly made in Australia; Series Mania's first seasons. Still not modeled: Series Mania's programmers' choice of
section. Blocked: TIFF, BAFTA, SXSW (HTTP 403), the International Emmys' eligibility period, Locarno 2027, the DGA's
Documentary Film page (HTTP 404), Busan, FESPACO, Blue Dragon, AMAA, the European Film Awards' dates.

### Previous: Screen Time, Episode Assessment And Songs (November 9, 2026, after #54)

Tested revision: the working branch at the commit that updates this report.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | 72 files, 552 tests passed (553 with the old-song test added after it); startup JavaScript 681 kB, 218 kB gzipped (budgets 700 and 220), 0 problems. |
| `npx playwright test e2e/awards.spec.ts e2e/screenwriting.spec.ts e2e/script-rules.spec.ts --project=desktop --project=iphone-15-plus --trace off` | 0 | 28 passed in 4.5 minutes (WebKit is the `iphone-15-plus` project): the three new journeys and every existing awards, screenwriting and script-rules journey. The Songs and Screen Time cards were inspected from their screenshots on both. |
| GitHub Actions CI for #54 (`bdf1b67`, run 129) and on `main` after #53 (`a0dcc3b`, run 128) | success | #54 was merged as `b798655`. |

Implemented and tested, engine and browser:
- **Screen time from the cut** (`tests/screen-time.test.ts`, 7 tests; journey "Emmys guest: the 5% rule reads screen time
  recorded from the cut"). Unknown stays a range; two parts share minutes; heard-only is apart and doesn't count; a
  record longer than its scene is refused; a cut or a shorter version changes the share; cut scenes count for nothing; a
  submitted entry keeps its calculation through a later record and a reload.
- **Episode assessment** (`tests/episode-assessment.test.ts`, 6 tests; journey "Emmys directing: each episode is
  entered with its own director"). A stronger and a weaker episode differ by their footage only (30 points of footage
  is 21 of direction); a hired episode director or writer moves only their episode; crew hired for one episode counts
  only there, season crew for both; a revised episode changes alone; identical inputs give identical scores; whole-season
  categories read the season; an older delivery is judged on the season and says so.
- **Songs as works** (`tests/songs.test.ts`, 6 tests; journey "Songs: made in the Production tab"). Played through the
  production loop to delivery: a songwriter and a lyricist (different people) credited for music and lyrics, your own
  song credited to you, a licensed song credited to its writers and refused for Original Song, the composer credited for
  the score only; writing, recording before the performed scene's shoot, one clearance per licensed song; a version
  drops or swaps a song while the main cut keeps it; the Oscars' three-writer limit; v7 to v8 migration keeps titles and
  uses and leaves origin, writers and minutes unknown.
- **Mutation-tested**: recorded time alone meets the rule, heard-only doesn't count, a part must be in the scene, crew
  count only for their episodes, an old song's origin decides however its writers were named later, an entry's snapshot
  score is what is judged, and writers read music first: each mutant fails a test.
- **Fixed**: the Oscar for Original Song went to the score composer of any project with a song not marked licensed;
  the Emmys' 5% rule read the approved script (every listed scene counted whole) against the target episode length.

Modeled, not sourced: screen time is the player's record (no footage exists to measure); the episode assessment and the
episode writer/director adjustment are SLATE's model; other organizers' song rules weren't read. Sourced: Oscars Rule
Nineteen (`oscars-2027@4`).

### Previous: Rule Research After #51 (November 9, 2026)

Tested revision: the working branch at the commit that updates this report.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | 69 files, 534 tests passed; startup JavaScript 674 kB, 216 kB gzipped, 0 problems. |
| `npx playwright test e2e/awards.spec.ts --project=desktop --project=iphone-15-plus --trace off` | 0 | 18 passed in 2.6 minutes (WebKit is the `iphone-15-plus` project). |
| GitHub Actions CI on `main` after #51 (`70d7105`, run 124) | success | Every step, including the browser journeys on the development and production builds. #52 passed CI on `3c79f3f` and was merged as `28fb30f`. |
| GitHub Actions CI on `main` after #52 (`28fb30f`, run 126) | success | Every step. Afterwards: the Golden Globes' Non-English Language journey, which passed on desktop and WebKit. |

Source-verified and applied, each with a test in `tests/rulebooks.test.ts`: the PGA's documentary award (`pga-2027@2`),
the WGA's Documentary Screenplay (`wga-2027@2`), the DGA's seven television awards from the Entry Forms index
(`dga-2027@2`), the AACTA's 31 film, television, documentary and short categories (`aacta-2027@1`), the Japan Academy's
17 (`japan-academy-2027@1`), and the International Emmys' deadline only (`international-emmys-2026@1`, eligibility stays
SLATE's). Counts: organizer's rules 520 of 806, projected only 11, SLATE's 275. Still refused or not found: TIFF and BAFTA
(403), Busan, Locarno, FESPACO, Blue Dragon, AMAA, the International Emmys' Rules & Regulations, the DGA's documentary film
and first-time feature guidelines, the PGA's television rules (found later the same day: see below).

Since, while #53's CI ran: the PGA's nine television awards (`pga-2027@3`), read from the Television Series and Specials,
Limited or Anthology Series, Televised or Streamed Motion Pictures and Television Specialty Categories rules (all July 20,
2026), tested in `tests/rulebooks.test.ts`; a new rule for the average episode's running time (`episodeRuntime`), which
**fixed** the Spirit Awards' 18-minute and the Actor Awards' 20-minute episode floors (version 1 of each read the whole
series' running time, so no series was ever refused; `spirit-2027@2` and `actor-awards-2027@2` refuse two 12-minute or
six 15-minute episodes). Mutation-tested: dropping the episode check, the series-only episode count, the never-in-cinemas
check or the any-country match each fails a test. Counts: organizer's rules 529 of 806, projected only 11, SLATE's 266.

### Previous: Recipient Rules, Continued (November 9, 2026, after #51 was opened)

Tested revision: the working branch at the commit that updates this report.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | 69 files, 528 tests passed; startup JavaScript 674 kB, 216 kB gzipped (215.86 kB measured after the rule helpers moved to the catalog chunk), 0 problems. |
| `npx playwright test e2e/awards.spec.ts --project=desktop --project=iphone-15-plus --trace off` | 0 | 18 passed in 2.7 minutes, on the commit with the Goyas' specific Bases; the narrator journey also enters Directing for episode 4 and finds that episode's director named. |

Implemented and tested (engine): directing and writing entered for one episode, with the two-director cap
(`emmys-2026@4`); a limited series entered whole or as one part; Guest Performer Eligibility after an earlier season's
nomination; the 5% screen-time minimums; the Globes' $150 million box-office threshold (`golden-globes-2027@4`).
Mutation-tested: the cap, the episode filter, the stored episode, the whole-series rule, the nomination rule and its
statuses, the screen-time boundary and denominator, and the box office's domestic split and window each fail a test.
Fixed while writing them: the recipient reasons named only one rule; they now list every rule that rules a part out.
`EditionEntry.episode` had been declared since the first engine commit and read by nothing; entries now store it.

Rule research, continued: Venice's Critics' Week (its site answered after a 503), SXSW's deadline and fees (its
submissions page answered; its eligibility FAQ still returns 403, so a deadline-only book counts as SLATE's eligibility),
and the Goyas' European, Ibero-American and short film awards (`goya-2027@2`). TIFF and BAFTA still return 403.
Two eligibility defects the reading found, each with a test that fails without its fix: a festival premiere counted as a
release outside cinemas (ruling festival films out of every theatrical-first rule); and categories for work from
elsewhere (the Goyas' European and Ibero-American, the Césars' and the Japan Academy's foreign films) were held to the
event's own countries, so they took nothing. Counts: organizer's rules 463 of 806, projected only 11, SLATE's 332.

### Previous: Nonplayable Review And Recipient Rules (November 9, 2026, after #50 was opened)

Tested revision: the working branch at the commit that updates this report.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 69 files, 516 tests passed; startup JavaScript 672 kB, 215 kB gzipped, 0 problems. |
| `python3 tools/awards/build.py --check` | 0 | Catalog current: 806 categories. |
| `npx playwright test e2e/awards.spec.ts --project=desktop --project=iphone-15-plus --trace off` | 0 | 18 passed in 2.7 minutes (WebKit is the `iphone-15-plus` project), with two new journeys: Outstanding Narrator entered for a documentary's narrator while a series' narrator and a guest in three of six episodes are kept out of Supporting and Guest Actress with their reasons; and a music video entered at SXSW, where the Short Film Competition refuses it. |

Implemented and tested (engine): the Emmys' Outstanding Narrator, from a documentary short played to delivery with a cast
Narrator (`tests/nonplayable-review.test.ts`); SXSW's Music Video Competition, from a delivered music video; the
International Emmys' Sports Documentary, from the Sports genre; narrators kept out of the Emmy performer categories; the
guest and short form episode shares; the Oscars' and Globes' dialogue share counted from the script; co-production
partners signed in Financing (`tests/recipient-rules.test.ts`). Mutation-tested: each of the narrator rule's three
conditions, the narrator filter, both episode-share boundaries and both dialogue-share mutants fail a test. The first
"no narration" fixture passed against a mutant, because a narrator in no scene is never cast; it was rewritten.
Source-verified: the 78th Emmy rules (Category 76, Performer Awards, Category 110) and the 84th Golden Globes rules
(A.3.c.i-ii), read November 9, 2026. The narrator journey found that the narration sequence was read from the working
script while the part came from the approved one; both now come from the approved script. Not browser-tested: the Sports
Documentary, the dialogue share and co-production (engine tests only).
Counts: organizer's rules 457 of 806, projected only 11, SLATE's 338; 123 entries remain out of play, each reviewed.

### Previous: Rule Research, Continued (November 9, 2026, after #49)

Tested revision: the working branch at the commit that updates this report.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 67 files, 496 tests passed (a rulebook test for each organizer read: Giornate degli Autori, IDFA, Hot Docs, the Canadian Screen Awards, the Goyas, the Césars); startup JavaScript 669 kB, 214 kB gzipped, 0 problems. |
| `python3 tools/awards/build.py --check` | 0 | Catalog current (Hot Docs' 2027 dates added). |
| `npx playwright test e2e/awards.spec.ts e2e/live-action.spec.ts` (desktop, `iphone-15-plus`) | 0 | 16 passed in 3.2 minutes. |

Counts (from `docs/awards/STATUS.md`): organizer's eligibility rules for an edition 394 of 802, projected only 11, SLATE's
397. New rules SLATE checks: `unreleased` (no release of any kind before a festival). Reason text names countries with a
lowercase "the" in mid-sentence. The 149-genre consumer test now has a 30-second timeout: it takes about 4.7 seconds alone
and timed out at the 5-second default in one full run; its assertions are unchanged.

### Previous: Qualifying Routes And Rule Research (November 9, 2026, after #47 and #48)

Tested revision `db911e8` (the working branch with `main` at `507096c` merged in).

| Command | Exit | Result |
| --- | --- | --- |
| CI on PR montrealroots/Final-SLATE-Build#48 (`8a75e64`) | 0 | Every step, including the dev-server and production-build browser journeys (the motion-capture journey among them). Merged as `507096c`. |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 67 files, 490 tests passed (new: `tests/qualifying-routes.test.ts` 12, `tests/mocap-progress.test.ts` 4 from #48, eleven rulebook tests); build passed; startup JavaScript 669 kB, 214 kB gzipped (686 and 219 before: the rulebooks and qualifying lists now load with the catalog), 0 problems. |
| `python3 tools/awards/build.py --check` | 0 | Catalog, inventory and coverage current. |
| `npm run balance` | 0 | Passed. |
| `npx playwright test e2e/awards.spec.ts` (desktop, `iphone-15-plus`) | 0 | 14 passed in 2.6 minutes, including the new International Feature journey and the shorts journey with an unlisted prize. Screenshot inspected: `awards-international-iphone-15-plus.png` shows the Golden Lion winner accepted without the committee, La Digue chosen by France's committee, Les Dunes not selected ("a country submits one film"). |
| `npx playwright test e2e/journeys.spec.ts -g "2D animation|festival under official rules"`, `e2e/live-action.spec.ts` (desktop) | 0 | 3 passed: the Annie, Sundance and live-action festival entries under the new rulebook versions. |
| CI on `main` after #49 (`43af105`, run 119) | 0 | Every step, both browser-journey steps included. The WebKit title loss seen after #48 didn't recur (still open below: its cause isn't known). |
| Mutations (`tests/qualifying-routes.test.ts`) | n/a | Each of six was caught: any entry status counts as a win; no window; no one-film-per-country; no festival exemption from theatrical-first; any award at a listed festival; no national-first ordering at the deadline (killed after a weaker mutant that only reversed the order survived). |

By evidence:
- **Implemented and tested:** explicit qualifying lists per Academy edition (shorts 20 awards held in SLATE, documentary
  feature 2, International Feature 6 incl. Sundance's two World Cinema prizes as SLATE's reading); wins counted only on
  the exact award, entry status won, result out, closing day in the window; International Feature rules (outside-US
  release, no nontheatrical first, September 30); one film per country; documentary route 3; later years projected.
- **Source-verified:** the Academy's three lists and Rule Sixteen; the Emmys' Eligibility rules 1-17 and 11c; the
  Berlinale's five section pages; Cannes' 2026 feature regulations; Annecy's 2026 terms and TV regulations; Venice's
  Article 3; San Sebastián's section II; the Golden Globes' A.1, A.3 and C; the Annies' call; Clermont's national
  regulations; Sitges' 2026 regulations and rules. Exact sections are in `docs/world/RULEBOOK-AUDIT.md`.
- **Modeled, not verifiable:** every judging outcome (juries, votes, committees).
- **Unverified or blocked:** TIFF (HTTP 403, third pass), the rest of the research queue in `docs/awards/STATUS.md`.

Counts at this revision (from `docs/awards/STATUS.md`): playable 802; roster read 705, unverified 69, blocked 28;
organizer's eligibility rules for an edition 224, projected only 11, SLATE's 567; recipients by an organizer's rule 28;
judging modeled 802; edition dates announced 333; deadlines from the rules 218; categories a unit test names 126, a browser journey 32; not playable 125 (not yet reviewed).

### Previous: Complete Awards And Festival Coverage (November 9, 2026, after #46)

Tested revisions `015dae7` to `8a43a9c` on top of `main` at `4f4dc2d`.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 65 files, 463 tests passed (`tests/awards-catalog.test.ts` 21 and `tests/awards-ledger.test.ts` 2 new; rulebook, season, institution and golden tests updated for the expanded catalog); build passed; startup JavaScript 686 kB, 219 kB gzipped (budgets 700 and 220), 0 problems. |
| `python3 tools/awards/build.py --check` | 0 | The catalog, inventory and coverage are what the rosters make (now a CI step). |
| `npm run balance`, `npm run perf:engine` | 0 | 2 and 2 tests passed; the balance results files are unchanged. |
| `npx playwright test e2e/awards.spec.ts` (desktop, phone, `iphone-15-plus`) | 1 | 17 passed, 1 failed: the desktop Venice journey, because a source file was edited during the run and the dev server reloaded the page to the start screen. It passed on phone and WebKit in that run, and on desktop in the six runs before (`--repeat-each 6`) and in the production run below. |
| `SLATE_E2E_PROD=1 npx playwright test --trace retain-on-failure` on `9eb4a9d` | 1 | Production build, the complete suite: 207 passed, 32 skipped (by project, as before), 4 failed in 21.5 minutes: the live-action journey on all four projects, at its festival entry. Large rosters start with their headings closed, so the Venice page it arrived at from the project's "Open To You" row showed no Prepare Submission button. Fixed in `8a43a9c`: an event opened from a project's tab preselects that project, which opens every heading. CI on `0492333` failed the same way. |
| `SLATE_E2E_PROD=1 npx playwright test e2e/live-action.spec.ts e2e/journeys.spec.ts e2e/awards.spec.ts` on `8a43a9c` | 0 | Production build: 38 passed, 16 skipped (the media journeys run at desktop width only), 0 failed, in 8.8 minutes: live-action on desktop, phone and both iPhone projects; the 16 media journeys, including the Annie and Sundance festival journeys; the six awards journeys on desktop, phone and `iphone-15-plus`. The rest of the suite passed on `9eb4a9d` above and touches no festival page. |
| CI on `51b5266` | 1 | 210 passed, 32 skipped, 1 failed: the live-action journey on `iphone-15-pro-max` didn't reach delivery in its 24 weeks (it passed on the other three projects, and 4 of 4 times on that project locally). The journey drew a new world seed every run, so how long production took was chance. It now fixes its seed after the character is made (`pinSeed`, as the other journeys do), and passed on all four projects on the production build. The failing run's world wasn't reproduced, so fixing the seed makes the journey repeatable without proving what that world met; the long-delivery path is unexamined. |
| CI on `main` after the merge (`f1a3043`) | 1 | 210 passed, 1 failed: the motion-capture journey on desktop, which waited up to 60 days to see the capture calibration "waiting for its session" (it had passed in the pull request's CI on the same code). The run's world seed and trace weren't available (the seed isn't recorded; the 22.9 MB artifact can't be downloaded with this session's tools), so the exact world wasn't reproduced. What was established instead, on the engine across 40 seeds: in 20 of them the calibration runs on the day its animatic is done and is never seen waiting, so the journey's 60 days pass with the work already done, which is how it failed. In all 40 the calibration ran only after its prerequisite, only on a booked session, and sessions passed while waiting were moved, not used up; no deadlock, delay past a deadline, funding gap or browser failure was found. The journey now waits (bounded) for the work to be ready for either its calibration or its capture session, deals weekly with what can hold it up (casting, crew, counteroffers, designs), and builds the clash on whichever session is next; it passed 6 of 6 with random seeds and 3 of 3 with its fixed seed (kept for reproducibility, not as the fix). `tests/mocap-progress.test.ts` covers five documented seeds of both kinds, a storyboard artist released before the boards are done, and a missed session in two seeds; switching off session rebooking fails it. |

What was built, by evidence:
- **Researched (source-verified):** 37 roster files in `docs/awards/roster/`, each naming the edition and the official
  pages read, with retrieval dates. 802 categories are playable (660 new, 60 renamed to their official names, every
  earlier ID kept); 125 official categories are recorded as not playable, each with its reason. 97 playable categories
  are marked unverified (their criteria page wasn't read). Six organizers' sites were blocked here and are recorded as
  blocked, not bypassed: BAFTA (film and television), AMAA, Blue Dragon, Busan, Locarno; FESPACO's domain no longer
  serves the festival.
- **Implemented and unit-tested:** category kinds (503 awards, 72 sections, 117 prizes, 22 audience and 16 partner
  awards, 27 area and 16 juried awards, 29 honorary); requirements read from the project; recipients only from credits;
  per-craft quality; results stored only where you're involved and computed otherwise, identical after a reload; prizes
  among a section's selection; several winners or none; special mentions; honorary awards from a career; national
  committees; disqualification of an entry whose planned release was cancelled; exposure after a prize; older saves
  unchanged. Mutation checks: removing a prize's own requirement and removing the cancelled-release check each failed
  their test.
- **Browser-tested:** the six journeys in `e2e/awards.spec.ts` (listed under Acceptance Journeys).
- **Modeled, not organizer figures:** the standard for area and juried awards (78), special mentions, honorary
  selection, the national committee and its rival film, and rival works from the simulated season
  (`docs/awards/DESIGN.md`).
- **Loaded in the background, not at startup** (measured on the production build): the catalog
  (`institutions.json`) is 358 kB, 26 kB gzipped (69 kB and 7 kB before), and parses in 1.1 ms in Node (best of 20);
  the two engine files that load with it are 8.6 kB (3.3 kB gzipped) and 17.0 kB (6.0 kB gzipped). Every game already
  waits for the catalog before opening, and a failed load is tried again (`tests/institutions-load.test.ts`).
- **Rules:** 66 categories follow official rules for at least one edition, 2 projected rules, 734 the game's rules
  (`tests/rulebooks.test.ts`). The Oscars' craft and adapted-screenplay categories, Sundance's World Cinema
  competitions, Orizzonti Corti and the Annies' four TV categories joined the read rules.

Defects found and fixed while doing it:
- The comedy/drama split had silently stopped working when the catalog became JSON (November 8): a reference
  comparison against the genre list never matched. It is now the category's class, read from where the project says it
  competes.
- The Golden Globes 2027 entry deadline (December 3) fell after their simulated nominations (November 26), so entries
  made in between were never judged. An organizer's later deadline now moves the announcement after it.
- The ledger's reachability check found IDFA's FIPRESCI award decided among another prize, and the Emmys' title and
  motion design naming a crew role the game doesn't have; both fixed.
- The Calendar's event search only looked at the next 40 editions, so the 54th Annie Awards couldn't be found.
- Startup JavaScript went to 705 kB with the new rules; the rules and judging now load with the catalog (686 kB).

### Previous: Browser Journeys For The Last Unit-Only Behaviours (November 8, 2026, after #45)

Tested revision `543e3bf` on top of `main` at `c61c1ea`.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 63 files, 440 tests passed (a later-window test added to `tests/territories.test.ts`); build passed; startup JavaScript 689 kB, 218 kB gzipped, 0 problems. |
| `npx playwright test e2e/live-action.spec.ts e2e/connected.spec.ts` (every project each runs on) | 0 | 7 passed: live-action on desktop, phone, iPhone 15 Plus and iPhone 15 Pro Max; connected on desktop, phone and iPhone 15 Pro Max. |
| `SLATE_E2E_PROD=1 npx playwright test --trace retain-on-failure` | 0 | Production build, the complete suite: 193 passed, 32 skipped (the new hybrid journey is desktop-only like the rest of `journeys.spec.ts`; see Why 32 Browser Tests Are Skipped), 0 failed, in 19.6 minutes. |

What the new steps check, and the defect found:
- **Versions:** the Festival Cut is entered at a festival, and Your Entries names it.
- **Later windows:** the connected journey's later window found everything it would offer held by Kestrel's exclusive
  deal. The log said "No distributors have made an offer for Hard Water yet", the first wave's line, so the window looked
  like no interest at all.
  - Fixed: later-window offers are marked and say so on the Release page, and the log names the held rights.
  - Unit-tested both ways: offers made and marked, and offers all held.
- **Plate integration:** in a hybrid, a live scene changed after its plate was integrated is picked up. The Coverage card
  says the integration will be worked again, Home logs the restart, and it is done again before delivery.
- **Dailies pickup:** the dock's missing inserts are shot on a pickup day, and Lock Picture waits for the day. The
  wheelhouse's gap is accepted. The take, the inserts and the acceptance survive a save and reopen.

### Previous: Estimates That Follow The Work, Contextual Directing (November 8, 2026, after #44)

Tested revision: the branch's commits `2f4f0fa` (estimates), `3eadff8` (directing), `b9a9766` (journeys, ledger,
research) and `a2d6bb5` (resume notes) on top of `main` at `37123f5`. The browser suite and checks below ran on `a2d6bb5`.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 63 files, 439 tests passed (`tests/estimates.test.ts` 11, `tests/directing.test.ts` 11 new); build passed; startup JavaScript 689 kB, 218 kB gzipped (budgets 700 and 220), 0 problems. |
| `npm run balance`, `npm run perf:engine` | 0 | 2 and 2 tests passed. Balance moved: the low-budget live-action feature now averages 74.4 days (was 82.2) and spends 48.3% of its fund (was 54.6), because the default shot plan covers what each scene needs instead of master and singles everywhere; the micro short 33.5 days (34.6). Delivered rate unchanged (1) in every family; the held-out mean overall moved 60.8 to 60.9. |
| `SLATE_E2E_PROD=1 npx playwright test --trace retain-on-failure` | 0 | Production build, the complete suite: 192 passed, 31 skipped (all by project; listed under Why 31 Browser Tests Are Skipped at the time), 0 failed, in 18.0 minutes. |
| `npx playwright test e2e/live-action.spec.ts` (all four projects) and `e2e/careers.spec.ts` (desktop) | 0 | Run while writing the journeys: live-action passed on desktop, phone, iPhone 15 Plus and iPhone 15 Pro Max; the TV season passed. |

Comparison tests, each on more than one seed or scenario: same runtime with different complexity (three world seeds);
same script by different methods; an unavailable role against an available one; reused against new builds; a smaller
draft before and after commitments, and after filming; estimate against spending, with the reasons, through a save;
take rules over 40 seeds (a usable first take ends the usual rule; more takes cost time and are sometimes no better);
covering what each scene needs against the most of everything under the same resources, over three tags; missing,
needed and surplus coverage; a restrained one-shot scene; review fixes, a pickup refused for lack of money then booked;
accepting a gap through a save; an old save keeping its rules.

Defects found on the way and fixed:
- Offers out were counted twice: as held money and as work to come.
- An unavailable role was priced at nothing.
- The schedule and the estimate used different day rules.
- Capture-stage cost was missing until booked.
- The Dailies card first dropped the Takes card's free choice of take (restored).
- Its fix buttons were sentence case, against `docs/COPY-GUIDE.md` (now Title Case, with the cost beside each).
- `PRODUCTION-SOURCES.md` and the ledger's 20-02 row said no source was ever used. That was true until this change and is now in the past tense.

Screenshots inspected: What It Costs and the scope-change dialog (desktop), the Dailies card (desktop and WebKit iPhone 15 Pro Max).

### Previous: Screen Review, Identity From 1221 (November 8, 2026, after #38)

The owner's screen-by-screen review (start screen, then Identity) led to fixes to the place picker and to bringing over
what 1221's Identity had: a legal name in parts and a preferred name, citizenship that decides public-fund
eligibility, and a headshot (save version 6).

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 34 files, 292 tests passed (`tests/identity.test.ts` 8, `tests/portrait.test.ts` 22 ported from 1221); build passed; startup JavaScript 668 kB raw (684,029 bytes), 206 kB gzipped, 0 problems. |
| `npm run balance`, `npm run perf:engine` | 0 | 2 and 2 tests passed; balance results unchanged. |
| `SLATE_E2E_PROD=1 npm run e2e -- --trace retain-on-failure` | 0 | Production build, the complete suite: 147 passed, 27 skipped, 0 failed, in 14.4 minutes. |
| Old code against new | | The fund rule's test fails when the rule is removed; the picker tests failed on the old picker (country list said Featured Cities after Nairobi). |

Defects found on the way: the ported headshot picker re-saved without end under a parent that passes a new callback
each render (fixed in the picker); with a country chosen, typing "Paris" found a British place, never Paris, France
(featured cities in other countries are now offered); New Script's two country lists shared one name for screen
readers (each is named for its picker). Screenshots of Review and Profile (desktop and phone) were inspected.

### Previous: Budget-Size Wording (November 8, 2026, after #37)

The owner asked for the naming question to be decided.
- **Kept:** the size names, since "micro-budget" is the industry's word for this scale.
- **Changed:** the New Script picker. It now says "from $40,000" instead of "about $40,000", because the size's amount is
  the least an estimate can be. Each size describes how it works. The intro says the approved script sets the estimate.
  `docs/ASSUMPTIONS.md` matches.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | 32 files, 262 tests passed; startup JavaScript 664 kB raw (679,537 bytes), 206 kB gzipped, 0 problems. |
| `SLATE_E2E_PROD=1 npx playwright test e2e/first-project.spec.ts e2e/live-action.spec.ts e2e/careers.spec.ts` (desktop, phone) | 0 | 9 passed, 3 skipped by design. |
| `SLATE_E2E_PROD=1 npm run e2e -- --trace retain-on-failure` | 0 | Production build, the complete suite: 141 passed, 27 skipped, 0 failed, in 14.0 minutes. |

The picker was screenshotted at phone width and reads without clipping.

### Previous: Micro-Budget Tuning (November 7, 2026, after #36)

Local Linux container, branch `claude/clever-archimedes-x0r26v` from `main` at `5e142f4` (#36). The commands ran on the
branch's final source; the commit after the runs changes only these reports. See the PR for CI.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 32 files, 262 tests passed (`tests/tight-budget.test.ts` 6); build passed; startup JavaScript 663 kB raw (679,394 bytes), 206 kB gzipped, budgets 700 and 220 kB, 0 problems. |
| `npm run balance` | 0 | 2 tests passed; 240 family runs. Two new families, stop motion and 3D CG at micro budget, deliver in 30 of 30 seeds, and the harness now fails if any micro family doesn't. The live-action micro row moved (staffing change); every low-budget row is unchanged (`BALANCE-REPORT.md`). |
| `npm run perf:engine` | 0 | 2 tests passed. |
| `SLATE_E2E_PROD=1 npm run e2e -- --trace retain-on-failure` | 0 | Production build, the complete suite: 141 passed, 27 skipped, 0 failed, in 14.0 minutes. |
| `npm run e2e -- --trace retain-on-failure` | 0 | Development server, the complete suite: 141 passed, 27 skipped, 0 failed, in 17.4 minutes. |
| Old code against new | | Each new unit test fails on the old code or a mutation: the studio fee (the day threw), combining order, all-or-nothing staffing, the estimate's floor at the budget size, and a target the player set. |

**Measured before the change** (engine, 8 seeds each, Micro Budget at $40,000, the game's own staffing proposals): stop
motion delivered in 0 of 8 at 1, 2 and 4 minutes; 3D CG in 0 of 8 at 2 minutes; 2D drawn in 6 of 8; live action and 2D
rigged in 8 of 8. **After**, funded by the starting backing up to the script's estimate: 8 of 8 in every case. Estimates:
stop motion $68,000 (1 minute), $80,000 (2 minutes), $151,000 (4 minutes at TV quality); 3D CG $57,000; 2D drawn $43,000;
live action and 2D rigged stay $40,000. Spending lands at 79% to 85% of the estimate.

### Previous: Genre Catalog Loading And More Connected Careers (November 7, 2026, after #35)

Local Linux container, branch `claude/clever-archimedes-x0r26v` from `main` at `c00c261` (#35). The commands ran on the
branch's final source; the commit after the runs changes only these reports. See the PR for CI.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 31 files, 256 tests passed (`tests/genre-catalog.test.ts` 6, three of which fail on the old loader); build passed; startup JavaScript 661 kB raw (676,736 bytes), 205 kB gzipped, budgets 700 and 220 kB, 0 problems. |
| `npm run balance` | 0 | 2 tests passed; `docs/balance-results.json` and `docs/balance-heldout.json` unchanged. |
| `npm run perf:engine` | 0 | 2 tests passed. |
| `SLATE_E2E_PROD=1 npm run e2e -- --trace retain-on-failure` | 0 | Production build, the complete suite: 141 passed, 27 skipped, 0 failed, in 14.3 minutes. |
| `npm run e2e -- --trace retain-on-failure` | 0 | Development server, the complete suite: 141 passed, 27 skipped, 0 failed, in 17.4 minutes. |
| `e2e/viewports.spec.ts` reload test, old code against new | | Failed on the old code (the game opened read-only after a reload); passes with the fix, and the two-tab test still passes. |

168 browser tests are listed: 70 on desktop, 70 on phone, 13 on `iphone-15-plus`, 14 on `iphone-15-pro-max`, 1 on
`iphone-15-pro-max-landscape` (`npx playwright test --list`).

**What a browser downloads** (`docs/PERFORMANCE.md`): the startup JavaScript (676,736 bytes, 205 kB gzipped) is what the
budget covers. The holiday rules, calendars, genre catalog and seasons table are fetched in the background from startup
and must arrive before a game opens. That's another 826,260 bytes, about 107 kB gzipped. Moving data out of the
JavaScript moved when it downloads, not whether.

### Previous: Input Loss, Startup And Connected Journeys (November 7, 2026, after #34)

Local Linux container, branch `claude/clever-archimedes-x0r26v` from `main` at `6e2abf0` (#34). The commands ran on the
branch's final source; the commits after the runs change only these reports. See the PR for CI.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 30 files, 250 tests passed; build passed; startup JavaScript 661 kB raw (676,736 bytes), 205 kB gzipped, budgets 700 and 220 kB, 0 problems. Before this pass it was 701 kB (718,078 bytes), over budget (`docs/PERFORMANCE.md`). |
| `npm run balance` | 0 | 2 tests passed; `docs/balance-results.json` and `docs/balance-heldout.json` unchanged. |
| `npm run perf:engine` | 0 | 2 tests passed. |
| `npm run e2e -- --trace retain-on-failure` | 0 | Development server, the complete suite: 134 passed, 24 skipped, 0 failed, in 16.8 minutes. |
| `SLATE_E2E_PROD=1 npm run e2e -- --trace retain-on-failure` | 0 | Production build, the complete suite: 134 passed, 24 skipped, 0 failed, in 12.7 minutes. |
| `e2e/focus.spec.ts`, old code against new | | With the old code: the typing test failed 8 of 8 runs (desktop and `iphone-15-plus`), the map test every run. With the fix: 24 of 24 passed (desktop, phone, both iPhone projects, three runs each). |

158 browser tests are listed: 65 on desktop, 65 on phone, 13 on `iphone-15-plus`, 14 on `iphone-15-pro-max`, 1 on
`iphone-15-pro-max-landscape` (`npx playwright test --list`). Every test also fails on any console error, page error or
failed request, unless it injects that failure on purpose (`e2e/test.ts`).

### Previous: Script Rules Review (November 7, 2026, #34)

Local Linux container, branch `claude/clever-archimedes-x0r26v` after `main` at `4e9e484` (#33). The commands ran on the
branch's final source (the commits that follow change only these reports). See the PR for CI.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run check` | 0 | World check 0 problems; typecheck clean; 30 files, 250 tests passed (`tests/script-effects.test.ts` 23); build passed; startup JavaScript 700 kB raw, 216 kB gzipped (budgets 700 and 220 kB, 0 problems). It reached 703 kB with the review's engine code; explanations only the project screens use moved to `src/engine/script-explain.ts`, loaded with those screens, instead of raising the budget. |
| `npm run balance` | 0 | 2 tests passed. Family means within half a point of before after the script base went from 40 to 42; two held-out combinations fell about 2 overall (see `docs/SCREENWRITING-AUDIT.md`). |
| `npx playwright test e2e/script-rules.spec.ts` (production build, desktop and phone) | 0 | 3 passed, 1 skipped (the mature-project journey runs at desktop width only). Screenshots inspected: supporting antagonist placement, incomplete pitch (desktop and phone), treatment sent, content declared, cut dialog, pickup, late-slot broadcast offers. They led to three copy fixes (see Defects). |
| `npm run e2e -- --trace off` | 1 | Development server: 120 passed, 24 skipped, 1 failed: `e2e/live-action.spec.ts` on `iphone-15-pro-max` (WebKit; explained and fixed after #34, see Defects), where the typed working title was gone when Create Project was pressed ("Enter a working title."). The same spec repeated 6 times on that project passed 6 times, and a minimal fill-and-check repeated 30 times on both iPhone projects passed 30 times. It is recorded as an open intermittent WebKit fault together with CI run 63's (see Open below), not as a pass. |
| `SLATE_E2E_PROD=1 npm run e2e -- --trace retain-on-failure` | 0 | Production build, the complete suite: 121 passed, 24 skipped, 0 failed, in 9.7 minutes, with console, page-error and failed-request checks on every test. The 24 skips are the 23 listed below plus the mature-project playthrough on phone (desktop only, by design). |

### Earlier: November 6-7, 2026

Screenwriting, motion-capture and replacement checkpoint (after montrealroots/Final-SLATE-Build#25), local Linux container.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run world:check` | 0 | 252 entries (246 playable), 3,865 regions, 246 shards, 171,750 rows with 171,750 unique IDs, 175 outlines, 219 holiday entries, 11,459 stations; 0 problems. Ledger classifications resolved (`docs/world/COUNTRY-DETAIL-AUDIT.md`). |
| `npm run typecheck` | 0 | No type errors (strict mode). |
| `npm test` | 0 | 30 files, 219 tests passed, 0 skipped (new this request: `tests/finance.test.ts` 10, `tests/import.test.ts` 7, `tests/screenwriting.test.ts` 5, `tests/creation.test.ts` 4, `tests/mocap-calendar.test.ts` 4). |
| `npm run build` | 0 | Built. One existing Vite notice (Startup is imported both statically and dynamically), present before this checkpoint. |
| `npm run budget` | 0 | Startup JavaScript 687 kB raw, 212 kB gzipped, in 4 files including React (budgets 700 and 220 kB). It reached 702 kB with this checkpoint's engine code; the Calendar, Place and Profile screens now load on first use instead of raising the budget. The largest on-demand file is the station table, 3,216 kB. |
| `npm run balance` | 0 | 2 tests passed: 180 family runs, 120 sensitivity runs, determinism check, and 30 held-out combination runs. Took 34 seconds on this checkpoint (98 seconds before the snapshot change, same machine). |
| `npm run perf:engine` | 0 | Fresh, medium and long saves; see `docs/PERFORMANCE.md`. |
| `npm run e2e -- --trace off` | 0 | Dev server: 106 passed, 23 skipped, 0 failed, with console, page-error and failed-request checks on every test. (An earlier run failed one journey because a source file was edited mid-run and the dev server reloaded the page; the clean rerun is the result given.) |
| `SLATE_E2E_PROD=1 npm run e2e -- --trace retain-on-failure` | 0 | Production build, the complete suite: 106 passed, 23 skipped, 0 failed, in 8.0 minutes. |

### Acceptance Journeys (current)

| Journey | Test | Where it runs |
| --- | --- | --- |
| One connected career: creation with two Review edits; naming characters with a supporting antagonist; script choices (an essential scene, a clue planted and paid off, declared strong content); the grant blocked on missing documents, then the documents written and sent; casting; crew; the schedule; an essential scene cut, restored and picked up; production; the edit; delivery; a late-slot broadcast offer taken with a broadcast edit; Save & Exit and Continue mid-production and at the end, checking every choice survived | `e2e/connected.spec.ts` | desktop, phone, `iphone-15-pro-max` |
| A TV season (3 episodes): a regular and a guest; the approved script changed after the first scene was filmed, re-approved with the refilm named, the scene picked up; delivered at 9 minutes with the guest credited for their episode; self-released and reloaded | `e2e/careers.spec.ts` (seed 11) | desktop |
| Stop motion: an offer refused with no money; the schedule refused with its shortfall; the target raised and an investor's offer accepted; reopened while the genre catalog and holiday rules fail to load, then Try Again with progress unchanged; puppets, sets, delivery, credits, release | `e2e/careers.spec.ts` (seed 23) | desktop |
| Writing, producing and directing without acting: a performer booked elsewhere turns the part down (Cast table and Home say so); recast; credits behind the camera only, unchanged after a reload | `e2e/careers.spec.ts` (seed 31) | desktop, phone |
| A damaged genre catalog publishes nothing; Try Again with a good one opens the game with all 149 entries | `e2e/failures.spec.ts` | desktop, phone |
| Supporting-antagonist placement, an incomplete pitch, a revised treatment; a mature project with a cut and picked-up essential scene and the late slot | `e2e/script-rules.spec.ts` | desktop and phone; the mature journey on desktop |
| Creation, every Review edit, invalid edits, Start My Story with something missing, keyboard and reload | `e2e/creation.spec.ts` | desktop, phone, both iPhone projects |
| Typing straight after a screen change; Save And Return To Review while the map arrives | `e2e/focus.spec.ts` | desktop, phone, both iPhone projects |
| First project: write, approve, a grant refused, the agreed backing, production, release, a second project with history intact | `e2e/first-project.spec.ts` | desktop; financing screens on phone |
| Media journeys: 2D, hybrid, documentary and a decline, TV, web series, 3D with motion capture, stop motion, unscripted and a withdrawal, festivals and awards to the ceremony | `e2e/journeys.spec.ts`, `e2e/media.spec.ts` | desktop |
| Export, import into a fresh browser, duplicates, refusals, two tabs; recovery copies, full storage, failed saves, missing data | `e2e/backup.spec.ts`, `e2e/storage.spec.ts`, `e2e/failures.spec.ts`, `e2e/reliability.spec.ts` | desktop and phone |
| Awards: the Oscars with four categories and four sets of credited recipients, an ineligible entry corrected in the Story panel before the deadline, a withdrawal and re-entry, nominations and results unchanged after a reload | `e2e/awards.spec.ts` | desktop, phone, `iphone-15-plus` |
| Awards: a drama series at the Emmys as a program and for lead acting, writing, directing and casting; comedy and actor categories explain why they're closed | `e2e/awards.spec.ts` | desktop, phone, `iphone-15-plus` |
| Awards: an animated short qualifying for the Oscars through a festival prize (the Annecy win is a labelled fixture), the Annies' short subject, a documentary feature | `e2e/awards.spec.ts` | desktop, phone, `iphone-15-plus` |
| Awards: Venice's Competition entered, withdrawn and entered again (one fee), In Competition, then Selected with the Golden Lion decided among the selection | `e2e/awards.spec.ts` | desktop, phone, `iphone-15-plus` |
| Awards: the Annies' TV category retired after 2026 and its four successors from 2027; an honorary award from a long career (a labelled fixture), with no entry and no fee | `e2e/awards.spec.ts` | desktop, phone, `iphone-15-plus` |
| Revisions | `tests/writing.test.ts`, `tests/screenwriting.test.ts` | engine only; not a browser journey |

Screenshots of the connected journey (desktop, phone and `iphone-15-pro-max`), the three careers, the script-rules
journeys and the focus tests were inspected; traces are kept for any failure. Nothing overlapped, clipped or became
unreadable. Two things were noted and not changed. On the phone, the scrolling tab bar's arrows cover the first letters
of the edge tabs ("‹roduction"); that is the existing scroll affordance. A section scrolled into view sits partly
under the sticky header on the iPhone; in the screenshot, the Distribution Offers heading was cut off.

### Why 32 Browser Tests Are Skipped

Skipped tests did not run and are not counted as passed. Each is skipped on purpose for the project named, by an
explicit `test.skip(project…)`; no test skips itself on an outcome. The list was taken from a run on November 8, 2026
(after #44) with a reporter that prints every skipped test; after #45 the new hybrid journey added one on phone:

- **1 on desktop:** the phone device test runs only on the iPhone projects.
- **31 on phone (Chromium 390×844):** the device test (iPhone projects only), and the journeys and checks that run once,
  at desktop width: the 16 journeys in `e2e/journeys.spec.ts`, the TV and stop-motion careers (2), the first-project
  journey (1), the two media journeys (2), the mature-project script-rules journey (1), the performance measurement (1),
  the two-tab import and storage checks (2), and five layout, keyboard and lifecycle checks in `e2e/viewports.spec.ts`
  that set their own viewports or tabs (5).
- The WebKit iPhone projects list only the specs they run (`playwright.config.ts`): `iphone-15-plus` runs creation,
  focus, live-action, devices, season, career and (from November 9, 2026) awards; `iphone-15-pro-max` the same plus the connected journey; the landscape project runs
  devices. Specs they don't list aren't counted for them at all.

### Not Automated

- No physical iPhone or real Safari: WebKit emulation only, and the on-screen keyboard can't be emulated.
- No screen-reader pass by a person; the accessibility checks are automated.
- No human playtesting for enjoyment or balance.

## Also Checked During Development

- Playwright MCP was used directly in this session to load the app, check startup copy and creation validation, and inspect the phone drawer.
- The Impeccable deterministic design detector ran on each UI file through its hook and reported no issues. That is not a design approval.
- Security Guidance flagged a `new Function` call in a test helper. It was replaced with a safe read.

## Defects Found And Fixed

| Severity | Defect | Fix | Regression Check |
| --- | --- | --- | --- |
| High | (Foundation pass, November 11, 2026) A living-world decision due while the catalog wasn't loaded was decided on the day the wait ended, so a slow or missing catalog changed the save's world | The wait keeps the day it was due | `tests/industry.test.ts`, "a catalog that loads late" |
| High | (Same) A newer catalog would have told a simulated series' seasons twice, its recorded ones beside the save's own, and contradicted them with a recorded ending | Each simulated series records the seasons its save began with | `tests/industry.test.ts`, "a later catalog corrects the records" |
| Medium | (Same, found by `e2e/foundation.spec.ts`) Renaming the game you were playing was undone by the next save | The open game is renamed in memory and saved whole | `e2e/foundation.spec.ts`, two saves |
| Medium | (Same) A child moved into the next age band a day before or after the birthday that made them that age | Bands count whole years from birthdays | `tests/minors.test.ts`, "moves a child into the next age band" |
| Low | (Same) Titles were "made before" an acquisition on their release date; an announced departure made an executive former at once; TMDB's status showed before the day it was recorded; cinemas were said to "show films" on a website alone | Each says only what the records do | `tests/catalog.test.ts`, `e2e/cinemas.spec.ts`, `e2e/catalog-live.spec.ts` |
| High | (Found measuring micro budgets, after #36) A voice session the production could no longer pay the studio for threw an error: the whole day rolled back and time paused with "Something went wrong while time passed" | The session waits with the reason, as render time and wages already did | `tests/tight-budget.test.ts` (threw on the old code) |
| High | (After #36) Micro-budget stop motion and 3D could never finish: staffing proposals went department by department in alphabetical order and spent the money before reaching the animator or the storyboard artist | Proposals hire a required crew the money can pay, or no one, and name the shortfall | `tests/tight-budget.test.ts`, `e2e/careers.spec.ts` stop motion |
| Medium | (After #36) Role combining rarely happened: the colorist and re-recording mixer were hired before the editor and sound designer who cover them | On a micro budget, covering roles are proposed first | `tests/tight-budget.test.ts`, `tests/production-golden.test.ts` (regenerated for this intended change) |
| Medium | (After #36) A project's Budget Estimate was its size's fixed amount whatever the script, so the agreed starting backing was asked for too little | After approval, the estimate is what the script needs at its size, with a tenth for contingency, never below the size; the target follows it unless the player set one | `tests/tight-budget.test.ts`, `e2e/careers.spec.ts` |
| Low | (Found in a screenshot) The staffing dialog said "Every role here already has someone or an offer out" beside a shortfall that had stopped every offer | The line shows only when it's true | `e2e/careers.spec.ts` |
| High | (Found by the stop-motion career, after #35) A reload followed by Continue within six seconds opened the game read-only ("This game is open in another tab") with no other tab: the closed page's lock was still fresh | A page that goes away releases its lock; a hidden tab keeps it | `e2e/viewports.spec.ts` (failed on the old code) |
| Medium | (After #35) A genre catalog with a bad record halfway through left the records before it published and the catalog counted as loaded; a later load added them again | The whole catalog is built and checked before anything is published; a valid catalog survives a bad one | `tests/genre-catalog.test.ts` (three tests fail on the old loader), `e2e/failures.spec.ts` |
| High | (The intermittent WebKit failure in New Script, after #34) Text typed right after a screen change was lost: `store.go` moved focus to the screen one animation frame later, and on a busy device that frame arrived mid-typing ("The Last Ferry" became "Th"). Not WebKit-specific: reproduced on Chromium too once frames were made late | Focus moves in a layout effect in the commit that shows the screen | `e2e/focus.spec.ts` (failed 8 of 8 on the old code) |
| Medium | (The CI run 63 failure in creation) The world map drew a one-line placeholder, then grew 364 px on desktop and 195 px on an iPhone a moment later, pushing Save And Return To Review down after it was drawn; a click or tap aimed at it landed elsewhere | The placeholder is the map's own box with its credit line | `e2e/focus.spec.ts` (failed on every run on the old code) |
| Medium | (Found moving the genre catalog out of startup) A catalog that failed to load could never be retried: browsers keep a failed dynamic import failed | Fetched instead of imported; a failure stops the game opening with the reason and Try Again | `e2e/failures.spec.ts` |
| Low | Startup JavaScript was over its 700 kB budget (701 kB) | The genre catalog and seasons table load in the background before a game opens (661 kB); the budget unchanged | `npm run budget` |
| High | (Found by the mature-project playthrough) A pickup asked for before or during the shoot was booked three days out, ahead of prep: the day was lost but still paid fees and crew, and the project could no longer afford the reshoot or deliver | Pickups are booked after the last scheduled shoot day | `tests/script-effects.test.ts` ("a pickup asked for before the shoot"), `e2e/script-rules.spec.ts` |
| High | A scene cut from the edit still held up the assembly edit, which waited for every approved scene's footage | The capture milestone skips scenes cut from the edit | `tests/script-effects.test.ts` ("a shoot day left empty by a cut") |
| Medium | Rules merged in #33 rewarded filling boxes or were arbitrary: story functions forced leading placement; an "18+" rating inferred from one checkbox barred broadcast; text presence bought time (a week, a day) and design work; the turning-point penalty could never apply; a shared background scored performances | Replaced or removed as traced in `docs/SCREENWRITING-AUDIT.md` | `tests/script-effects.test.ts`, `tests/heritage.test.ts`, `tests/genres.test.ts` |
| Medium | Text-presence prompts (objective, genre questions and others) cost script quality and lowered backers' odds while open, so any text raised both | Prompts are advisory: shown, never counted, and resolving one earns nothing | `tests/script-effects.test.ts` |
| Low | The setups ledger appeared only for genres with clue or setup conventions, so other projects couldn't declare the dependencies the edit plan reads | Offered to every scripted project | `e2e/script-rules.spec.ts` |
| Low | (Found in playthrough screenshots) The Backgrounds panel still said a shared background counts toward the performance; a blocked backer listed its documents twice; the Coverage card called scenes waiting for their shoot day short of material | Copy corrected | `e2e/script-rules.spec.ts` |
| High | Shoot days could pay past the fund (negative cash) | Funds checked before any payment beyond agreed amounts; schedules reserve their costs | Balance integrity assertion |
| High | Micro budgets could never finish | Required-only staffing proposals, role combining, scaled day fees | Balance results |
| High | Gaffer optional, so interiors were never shot | Required when the script has interiors or night scenes | Live-action e2e |
| Medium | One performer offered two characters in the same scene | Offer refused with the reason | Engine journeys |
| Medium | Shoot planner overfilled days | Planner matches daily capacity; long scenes span several days | Engine journeys |
| Medium | A partly shot day was reported as "lost" | Reported as "Partly Shot" | Engine journeys |
| Medium | A 13-minute "feature" counted as a feature | Runtime gate for categories; script note | Genre routing test |
| Medium | A stop-motion shot used every animator | One animator and one stage per shot | Stop-motion test |
| Medium | Shoot-day flags and warnings lived only in memory | Stored in the save | Save round-trip |
| Low | Phone calendar hid day entry counts | CSS order fixed | Viewport test checks December 25 |
| Low | Drawer didn't move or trap focus | Focus moved in, trapped and returned | Keyboard test |
| Low | Waiting tasks gave no reason | Reason shown for every waiting task | 3D e2e |
| Medium | Voice sessions created spurious design assets | Only real builds become assets | Motion-capture test |
| Medium | A motion-capture casting counted as a voice casting | Voice sessions check for a voice casting | Motion-capture test |
| High | A corrupted main save had no backup to recover from (the backup was deleted after every write) | Previous sound save kept; recovery with the damaged copy preserved | `tests/save-recovery.test.ts`, `e2e/failures.spec.ts` |
| High | An exception while time passed left the game busy, the clock stopped, and the event half-applied and gone | All-or-nothing processing per call; time pauses with an explanation | `tests/processing.test.ts`, `e2e/failures.spec.ts` |
| Medium | Impossible dates such as 31 February were accepted | Real-date checks | `tests/dates.test.ts` |
| Medium | `commit` and `settle` accepted NaN, Infinity and negative amounts; closed lines could take payments | Same checks as reservations | `tests/ledger.test.ts` |
| Medium | Saves were only shallowly validated | Deep validation with readable errors | `tests/save-recovery.test.ts` |
| Low | A failed index write could hide a save from the list | The list is rebuilt from the saves | `tests/save-recovery.test.ts` |
| Medium | A screening whose project couldn't be found never finished | The screening completes and logs "Your film" | `e2e/screenings.spec.ts` |
| Low | The Save And Exit error banner stayed after a later successful save | It clears once the game is saved | `e2e/failures.spec.ts` |
| High | Approving a new draft after filming made every scene's footage stale, not just the changed ones | Unchanged scenes carry their captures forward; changed scenes' work resets after a confirmation | `tests/writing.test.ts` |
| Medium | Capture-stage cost was only paid when the player directed | Stage sessions are paid from the booking whoever directs | `tests/lunar-mocap.test.ts` |
| Low | Documentary test treated a name containing "Cast" as a cast credit | Assertion checks credit rows | Documentary e2e |
| Medium | Toronto precipitation fell back to the model because only 1991-2020 stations were searched | Tiered station search: own country recent, own country any period, then anywhere | Legacy migration report (all 66 from stations) |
| Medium | Entering again after withdrawing reused the withdrawn entry's ID, so the new entry couldn't be withdrawn, and recorded a fee that wasn't charged | Each entry gets its own ID; the fee is charged and recorded once per category | `tests/rulebooks.test.ts` |
| Low | A cancelled release counted as a prior showing against premiere rules | Cancelled releases are ignored | `tests/rulebooks.test.ts` |
| Medium | A performer replaced after contributing lost their credit even when their work stayed in the film | Captures and takes record their performers; released performers whose work remains are credited | `tests/mocap-calendar.test.ts` |
| Medium | Motion-capture sessions had no dates: not on the calendar, no check against the performer's shoot days or the stage | Dated sessions with conflict checks, on the calendar; missed sessions rebooked | `tests/mocap-calendar.test.ts`, `tests/media.test.ts` (hybrid) |
| Low | Startup JavaScript went over its 700 kB budget (702 kB) with this checkpoint's engine code | Calendar, Place and Profile screens load on first use (687 kB); the budget was not raised | `npm run budget` |
| Medium | Modeled script quality could be raised by filling text fields with anything and by repeating revision passes (up to about 84 of 100 alone) | Presence of free text weighs little; passes and your own notes add nothing; readiness notes count once resolved | `tests/screenwriting.test.ts` |
| High | Choosing a budget size put its whole amount into the project at once (for example $4,000,000 for Mid Budget), so money never had to be raised | A budget size is now an estimate and a target; money arrives only from backers' accepted deals, with terms enforced; existing projects keep their money (save version 5) | `tests/finance.test.ts`, `e2e/first-project.spec.ts` |
| Medium | Several Review edit buttons in character creation opened the wrong screen ("Edit Birth Date And Birthplace" opened Pronouns) | One step registry; one edit per row, each to its own screen; Save And Return To Review | `tests/creation.test.ts`, `e2e/creation.spec.ts` |
| Medium | WebKit: text typed into a field right after Next was lost (focus moved to the heading a frame later) | Focus moves in the same commit | `e2e/creation.spec.ts` (fails with the old code in WebKit) |
| Low | Start My Story with something missing jumped to the screen but cleared its message | The message is kept | `e2e/creation.spec.ts` |
| Low | Two buttons were named "Continue {save}" after an import | The import's is "Open Imported Save" | `e2e/backup.spec.ts` |
| High | Recording an unscripted participant's withdrawal before the shoot left the game unable to save ("Your game couldn't be saved"): a redaction task was added for footage not yet shot, depending on work that didn't exist | Nothing filmed, nothing to redact: the withdrawal is recorded and the dialog says so; a withdrawal refused because the picture is locked now changes nothing | `tests/unscripted.test.ts`, `e2e/journeys.spec.ts` (found by the new withdrawal journey) |
| Medium | WebKit: a save written while the page unloaded raised an uncaught error ("… due to access control checks") because compression read a Blob through a blob URL | Compression streams straight from a Response, without a Blob | `e2e/test.ts` diagnostics on the WebKit projects, production build |
| Low (tests) | Documentary and unscripted journeys skipped themselves when contributors declined; route patterns missed the production build's hashed file names | Seeded fixtures (`seededLife`); patterns accept hashed names | `e2e/journeys.spec.ts`, `e2e/world.spec.ts`, `e2e/failures.spec.ts` |
| Medium | Saves grew 0.6 MB per game year because every edition stored full copies of competing films | Save version 3 stores each film once (long save 1,100 to 859 kB) | `tests/rulebooks.test.ts` |
| High | Long careers outgrew localStorage: a single career stopped saving after about 5 game years (50 years measured at 19.8 MB) | Save version 4 compacts finished editions; saves live in IndexedDB, compressed, through the save vault | `tests/vault.test.ts`, `e2e/storage.spec.ts`, `tests/perf/career.perf.ts` |
| High | (Found while moving to IndexedDB) WebKit refuses Blobs in IndexedDB in private sessions, so the first save never stored | Compressed saves are stored as ArrayBuffers; opening the vault checks a test write and falls back to localStorage | WebKit iPhone projects in the browser suite |
| Medium | (Found while moving to IndexedDB) A reload right after an action could lose it, because an asynchronous write may not finish as a page closes | A closing-page journal in localStorage, applied on the next start | `tests/vault.test.ts`, `e2e/world.spec.ts` |
| High | Saving needed room for three copies of a game, so a long game with two recovery copies (5.5 MB at peak) could not save in a browser | Saving no longer writes a temporary copy; peak is two copies | `tests/save-recovery.test.ts` (real-limit store) |
| Medium | Deleting a save left its damaged copies in storage, unlisted, forever | Deleting a save removes all its copies after a confirmation that counts them; recovery copies are listed with Export and Delete | `tests/save-recovery.test.ts`, `e2e/storage.spec.ts` |
| Medium | A full browser storage gave the same message as any other failed save, with no way to free space | Storage-full message with Free Up Space; Saved Games shows storage use | `e2e/storage.spec.ts`, `e2e/failures.spec.ts` |
| Low | A save whose only good copy was a backup taken before an update was not listed, and a stale interrupted copy could be opened over a newer backup | Saves are found by any openable copy; the newest sound copy opens | `tests/save-recovery.test.ts`, `e2e/storage.spec.ts` |
| High | An older build could replace a save written by a newer version, pushing it into the backup where the next save overwrote it | Writing refuses to replace a newer-version save and says why | `tests/save-recovery.test.ts` |
| Medium | Time paused after a failure in one save stayed paused in the next save opened | Opening a save clears the pause | `e2e/reliability.spec.ts` |
| Medium | The "last good copy" message was lost when opening waited for holiday rules, and didn't say which copy was opened | The message travels with the opened game and names the copy's save time | `e2e/reliability.spec.ts`, `e2e/failures.spec.ts` |
| Low | CI failed when the browser install stalled or crawled on the Ubuntu package mirror (three times); a timed-out attempt left apt holding the package lock | CI runs in Microsoft's Playwright image for the locked version, so nothing is installed | CI run for #17: 63 passed, 18 skipped in 7.3 minutes |
| Low | China's computed holidays were wrong for 2026 | Official 2026 arrangement used, with make-up working days | Lunar holiday test |

## Open

- **Not reproduced, closed (November 11, 2026): Continue Creation didn't open creation on WebKit.** Seen once, with two
  WebKit workers running the catalog, child and foundation journeys: a test's setup pressed Continue Creation and the
  start screen stayed, the button focused, for four minutes.

  Run again under load, it never recurred in 101 runs of those journeys on WebKit (iPhone 15 Pro Max), none failing:
  - 36 with three CPU cores kept busy and two workers;
  - 65 on the production build with four cores busy, three workers and five repeats each.

  A run on the dev server failed 4, all from the dev server hot-reloading files being edited during it, and it is not
  counted. The start screen has, since the first sighting, waited for the engine before any test reloads (`openStart`)
  and said so while it waits. No cause was found; if it is seen again, it reopens.

- **Unexplained, open (November 9, 2026): a working title lost on WebKit.** CI on `main` after #48 (`507096c`, run 117):
  the Emmys journey on `iphone-15-plus` (dev server) filled the New Script title right after a new game opened; the fill
  completed, yet the field stayed empty and Create Project refused it. From its trace: the same input element (`_r_6_`)
  before and after the fill (read then as proof the form wasn't remounted; see below); the field focused and empty in the frame after the fill; the
  later fields (format, episodes, minutes) kept their values. The same journey passed in #48's CI on the same code and
  8 of 8 times locally on WebKit, and 27 of 27 times with the Projects chunk delayed 0 to 800 ms and typing straight
  after the screen appeared. No cause found yet; it isn't the earlier focus fault (focus now moves in the commit that
  shows the loading placeholder). Next: a WebKit run with React's input handling logged, under CPU load.
  **Second occurrence (November 9, 2026, PR #55, CI run 138 at `c41fbef`, production build, `iphone-15-plus`):** the SXSW
  journey's New Script title was empty after the fill and Create Project said "Enter a working title." From its trace:
  the field appeared 224 ms after New Script was pressed (the screen's chunk loading), the fill took 264 ms, and the
  field's value was already empty in the snapshot taken right after the fill, before the next action: the text never
  landed, rather than being cleared later. The earlier reading, "the same input element (`_r_6_`) before and after, so
  the form wasn't remounted", doesn't hold: React's `useId` gives the same id to a component remounted at the same place.
  Not reproduced: 25 of 25 passes locally on the production build with four CPU-bound processes running. The same test
  passed in runs 132 to 137. Candidates still open: focus taken from the field between Playwright's focus and its text
  insertion (Shell's focus on `<main>` is the only focus mover on this path), or a remount of the form.
  **Investigation (November 9, 2026, while CI ran on `78e3fde`):** an instrumented probe (focus, input and DOM events,
  every `focus()` call with its caller, the field's value each frame) ran New Script's fill on `iphone-15-plus` against
  the production build about 420 times: from London and from Los Angeles, with and without a pause before New Script
  (CI's run clicked it 60 ms after Home appeared), on 4 to 6 workers, and on 2 CPUs. The title landed every time. The
  only focus move on the path was the shell's, to `<main>`, about 90 to 230 ms before the form appeared; nothing removed
  or replaced the field. Ruled out by reading the code: a route reset, a suspension inside the form (its one lazy child,
  the map, has its own boundary), and the shell moving its children. Still open: focus taken between Playwright's focus
  and its text insertion, or React not seeing the input event, neither seen here. Next: the browser fixture records these
  events on the WebKit projects, so the next occurrence in CI carries its own evidence.
  **Still open (November 10, 2026).** There has been no occurrence in CI since the fixture began logging (runs 139 to 151;
  run 146 failed on the known Researcher match). So there is no new trace to read.

  The input's path was read again:
  - **Remounts:** nothing above the form changes shape or key while a game is open. The only resets are entering a game
    and leaving it.
  - **Focus:** the only focus movers on the path are the shell's move to `<main>`, in the commit that shows the screen,
    and the modals the player opens. No modal opens by itself.
  - **The form:** it keeps its own state, and nothing in it suspends.
  - **Updates while typing:** a new game schedules no event in its first hour. The updates a player meets while
    typing are the clock (every 250 ms) and the first save (which marks the save state "Saving", then "Saved").

  `e2e/title-input.spec.ts` was added to recreate that moment. A new game has just opened and its first save is being
  written while the title is:
  - filled;
  - typed key by key over many clock ticks;
  - shortened by deleting backwards;
  - cleared;
  - inserted at once, as a paste is;
  - submitted.

  Each step reads the field back, and the project is checked under that name. It runs on desktop and both WebKit
  iPhone profiles. Attempts, all passed:
  - once on each of the three profiles;
  - 40 on the development server and 40 on the production build (both iPhone profiles, 20 each, 4 workers);
  - 40 on the production build with four CPU-bound processes running and 6 workers.

  That is 123 passes this session, beside about 420 before. Passing repetitions don't prove a cause is gone, and none was
  found, so nothing in the app was changed for it. Both explanations remain open and unobserved:
  - focus was taken between Playwright's focus and its text insertion;
  - the input event was never delivered to React.

  The fixture's focus-and-input log stays on the WebKit projects, and CI uploads it with `test-results/`.
- No other code fault is open from this pass. Physical devices, a person's screen-reader pass and human playtesting remain
  outside what was tested.
- The micro-budget balance question recorded at #36 was worked through after it (see Current and `BALANCE-REPORT.md`).
  The naming question it left was decided on November 8, 2026: the names stay ("micro-budget" is the industry's word
  for the scale), and the picker says "from $40,000" with what the size means in practice. The balance runs are an
  autopilot, not human play.
- On the iPhone, a section scrolled into view can sit partly under the sticky header (see Acceptance Journeys).

## Acceptance Status

**Pending owner acceptance.** On the final source of this pass every required automated check passed: `npm run check`,
the balance and engine performance tests, and both complete browser suites (141 passed, 27 skipped by design, 0 failed). Still open (see `RESUME-HERE.md`):

- No physical iPhone or real Safari verification; WebKit emulation only.
- Holidays: dated from 2026 to 2100 by the worldwide rules, with lunar and announced holidays beyond their published
  years labelled projected or expected, and some not dated until their country announces them.
- Festival and award rules: 48 of 142 categories use organizer rules read for an edition in play and 2 use projected
  rules (`docs/world/RULEBOOK-AUDIT.md`); the other 92 are simulated and labelled. TIFF and BAFTA couldn't be read
  (HTTP 403).

This base is not claimed to be finished, bug-free or fully realistic.
