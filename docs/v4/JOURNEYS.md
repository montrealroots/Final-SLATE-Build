# The v4 Journeys, J01 To J13

The package's journeys (`docs/v4/package/05-IMPLEMENTATION-AND-VERIFICATION.md`), each step with the browser evidence
that plays it today. A journey counts as a whole run only when one spec plays every step in order in one game; the
others are proven step by step across specs, which is not the same thing, and the table says which. As of November 13,
2026.

| Journey | Whole Run | Steps And Where They Are Played |
| --- | --- | --- |
| J01 Family gift, book, live-action short, kit, release, reinvest, birthday, reload | Yes: `e2e/j01.spec.ts` | One game: a gift chosen on Review; Don Quixote adapted as a live-action short; a character added; a camera, lens, card and tripod bought from the gift and put in the kit; you cast as Teresa, crew staffed, shot and delivered; a distributor's offer accepted and its receipts settled (backers repaid first); income taken home where the project kept any; your own money put into the next project; the birthday at 36 lived to; a reload. A self-release with no distributor earns nothing, so the run takes an offer. |
| J02 Family loan, feature, rented kit, location change, overrun approval, repayments | No | Loan terms and monthly repayments (`tests/personal.test.ts`; creation in `money.spec`); a rented item in the kit (`equipment.spec`); a location changed with its travel days (`destinations.spec`); an overrun returned for approval (`decisions.spec`, Guide Me in `guide-me.spec`). Not one run. |
| J03 Game adaptation, 2D series, platform, weekly audience, renewal or cancellation, season two | No | A series adapted from a work (`adapt.spec`); 2D delivery and release (`journeys.spec`); a broadcast season's weekly audience and the renewal decided on it, the next season from the offer (`renewal.spec`). Not one run, and not from a game. |
| J04 3D asset, rig, render, one revision | Partly | `live-action.spec` (3D through the UI: modeling and rigging before animation, render capacity), `journeys.spec` (3D to delivery with capture). A revision affecting only its dependents: `tests/revisions.test.ts`. |
| J05 Stop motion, face choice, fabrication, stages, capture, repair | Partly | `journeys.spec` (stop motion to delivery; a damaged puppet repaired); the face choice in the character editor (`characters.spec`). Not compared side by side in one run. |
| J06 Hybrid, shared people and assets, no double billing or booking | Partly | `journeys.spec` (a live and a 3D scene in one production; a changed live scene re-integrated); no double day pay (`tests/parts.test.ts`), one kit item never on two shoots (`tests/equipment.test.ts`). |
| J07 Original project, era and genres; an old preset save unchanged | Partly | `first-project.spec` (an original, written to release); `adapt.spec` (a project from a retired story opens as it was); era and genres in `creation.spec` and `script-rules.spec`. |
| J08 Song refusal, substitute, scope, cue sheet, release gate, uncovered territory, expiry, paid once | Partly | `music.spec` (refused, asked for less, agreed, renewed, paid once; refused and replaced with library music); `journey-c.spec` (a release outside the grant refused). Expiry in the browser: not played; `tests/music.test.ts`. Trailer: the game has no trailers. |
| J09 Commissioned score, delegated cue plan, revision, recording, changed cut, stems, payment | Partly | `music.spec` (themes noted, revised, approved; delivered with stems); `guide-me.spec` (brief, cue plan and composer by Guide Me within a ceiling). A changed cut's conform: `tests/cues.test.ts`. |
| J10 Outside offer, agent, schedule, paid work, credit and reputation, new offer, conflicts | Mostly | `jobs.spec` (an agent finds work; taken, worked on the calendar, paid less commission, credited; Your Reputation). A clash with the player's own shoot: `tests/jobs.test.ts`. |
| J11 Historical boundary, weekly reports, holdovers, renewal, record book | Partly | `catalog.spec` (records to their date, Announced and Simulated); `studio-pitch.spec` (24 weeks in cinemas with screens and decisions, the record book); `renewal.spec`. |
| J12 Picture install, interruption, resume, refusal, retry, update, remove | Yes, across two specs | `picture-library.spec` (a kind at a time, then all; paused and gone on with; a damaged part refused and retried; removed); `data-packs.spec` (an update cancelled and one refused for room, the installed pack kept). |
| J13 All screens at desktop, phone and landscape | Yes | `ui-coverage.spec` at four sizes, read by `tools/v3/ui-coverage.mjs` into `docs/v3/UI-COVERAGE.md`; `phone-layout.spec` for the phone showing the desktop layout. |

The ledger (`docs/v4/requirements.csv`, V4-038) keeps each journey requested until it is one run.
