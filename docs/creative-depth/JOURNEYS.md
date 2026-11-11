# The Package's Twelve Journeys, And Where Each Is

The Creative Depth package (`package/06-TESTING-AND-DELIVERY.md`) names twelve connected browser journeys. This table
says which Playwright test is each one, on which browsers it runs, what in the package's wording it does not do, and
what is fixture. A journey is listed as covered only for the steps a test performs through visible controls.

Statuses are the package's own. "Browser verified" means the named test passed on the browsers listed, in the run
recorded in `QA-REPORT.md` for its milestone.

| Journey | Test | Browsers | Status | Not done, or fixture |
| --- | --- | --- | --- | --- |
| J01 Zombie film from a chosen premise to delivery | `e2e/creative-ideas.spec.ts`, "from a chosen idea to a delivered film" | Desktop, phone, WebKit (iPhone 15 Pro Max) | Implemented, browser verified | Ends at delivery. Release, receipts and the next project are in `e2e/connected.spec.ts` and `e2e/earnings.spec.ts`, on other films, not this one. The world seed is fixed. |
| J02 The same premise as stop motion | `e2e/creative-ideas.spec.ts`, "J02"; repair in `e2e/journeys.spec.ts`, "a puppet damaged on set holds its shots until it is repaired" | Desktop, WebKit | Implemented, browser verified | A puppet's face method is not a choice the game has. Repair is a separate journey with its own fixed seed, not the zombie film. |
| J03 Horror and comedy mixed | `e2e/awards.spec.ts`, "J03"; `e2e/decisions.spec.ts`, "genre emphasis and dialogue languages" | All browser profiles the awards journeys run on | Implemented, browser verified | The film is delivered and released by a labelled fixture so the award page can be read; nothing is entered or judged in J03 itself. Audience declarations are in `e2e/script-rules.spec.ts`, "a mature project". |
| J04 A real performer through hiring, work and credit | `e2e/real-people.spec.ts`, "J04" | Desktop, phone, WebKit | Implemented, browser verified | Every person is a made-up fixture in the catalog's format. |
| J05 A real writer and director by job | `e2e/real-people.spec.ts`, "J05" | Desktop, phone, WebKit | Implemented, browser verified | The same fixture. A writer's notes are kept and shown back, never read. |
| J06 A series through seasons, rolling delivery, release and renewal | `e2e/season.spec.ts`; `e2e/rolling-delivery.spec.ts`; `e2e/release-schedule.spec.ts`; `e2e/journeys.spec.ts`, "TV limited series" (which starts the next season); `e2e/careers.spec.ts`, "a TV season" | Desktop; some on phone and WebKit | Implemented, browser verified, across five tests | No single test does the whole of J06 in one career. Returning cast is carried into the next season by the game; the player isn't offered a choice of who returns. |
| J07 A real destination, scouted, rained on, with a backup | `e2e/destinations.spec.ts`, both tests | Desktop, phone, WebKit | Implemented, browser verified | One base and one place abroad in a browser; other regions and seasons in engine tests. The site is always a candidate the game made up. |
| J08 Two studios, two answers, a deal and a staggered release | `e2e/studio-pitch.spec.ts`, "J08" | Desktop, WebKit | Implemented, browser verified | Both studios are made-up fixtures. The films opening the same week are shown for information and assert nothing. |
| J09 Films and optional pictures: installed, interrupted, expired, removed | `e2e/data-packs.spec.ts`, "J09"; owner-only data in `e2e/owner-access.spec.ts` (production servers) | Desktop, phone, WebKit | Implemented, browser verified | The pictures are a one-pixel fixture. A full disk is simulated by a labelled fixture. Owner access runs only with the production servers (`SLATE_E2E_PROD=1`), as CI does. |
| J10 A refreshed pack changes nothing a save decided | `e2e/world-refresh.spec.ts`, both tests | Desktop, phone | Implemented, browser verified | From milestone A. Changed credits are covered by `e2e/real-people.spec.ts` and `tests/guests.test.ts` (a record renewed or withdrawn), not by this journey. |
| J11 A child performer | `e2e/children.spec.ts`, both tests | Desktop, WebKit | Implemented, browser verified | A birthday during production moving a child to the next age band is tested in the engine (`tests/minors.test.ts`), not in a browser. The rules are the researched sets in `docs/child-rules/`, with their gaps listed there; no claim of legal certification. |
| J12 Missing data and failed loads | `e2e/failures.spec.ts`, ten tests; `e2e/catalog.spec.ts`, "a failed load says so and can be retried"; `e2e/data-packs.spec.ts` J09 (no picture: a placeholder); `e2e/title-input.spec.ts` and `e2e/focus.spec.ts` (typed text kept) | Desktop, phone, WebKit | Implemented, browser verified, across those tests | No test takes the whole network away mid-game. A location record that is missing is covered for places (`failures.spec.ts`, "a save that mentions a place the game can't find"), not for a filmed-at choice. |

## What No Journey Does

- A physical device. Every phone result is an emulation in Chromium or WebKit. The manual checklist is `docs/DEVICE-CHECKLIST.md` where one exists; none was run in this package.
- One career that passes through all twelve.
- The live catalog: journeys use the made-up fixture. `e2e/catalog-live.spec.ts` reads the owner's real catalog only when it is installed.
