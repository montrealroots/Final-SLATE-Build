# Requirement Evidence

Status key:
- **Tested** means an automated behavioral test or browser journey exercises it.
- **Implemented** means it is built and reachable in the UI but not directly tested.
- **Modeled** means it rests on a documented simulation assumption.
- **Partial** or **Not Built** are stated as such.

Tests: `F` = `tests/foundation.test.ts`, `J` = `tests/journeys.test.ts`, `M` = `tests/media.test.ts`, `G` = `tests/genres.test.ts`, `B` = balance, `E1` = `e2e/live-action.spec.ts`, `E2` = `e2e/media.spec.ts`, `E3` = `e2e/viewports.spec.ts`.

| Requirement | Input | Consumer | Persistent Consequence | Player Feedback | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Exact startup copy and save browser | First launch, saves | `Startup.tsx` | Index of saves | Resume details, delete and start-over confirmations | E1, E3 | Tested |
| Load failure keeps the save | Corrupt data | `readSave`, load-error screen | File untouched | "Couldn't Open This Save" | F (corrupt and newer-version cases) | Tested (engine); screen built |
| Verified saves; Saving, Saved, Couldn't Save | Any change | `writeSave` | Temporary write, read back, then replace | Save indicator | F (round trip, failed write keeps the old save) | Tested |
| Save And Exit doesn't exit on failure | Exit | `store.saveAndExit` | Stays in game | Banner with Try Saving Again | Code path | Implemented |
| Creation draft persists | Each field change | `writeDraft` | Draft key | "Continue Creating Your Character" | E3 (seeded draft continues) | Tested |
| Creation fields and validation against start date | Creation pages | `validateDraft` | Character identity | Errors beside fields | F, E1 | Tested |
| Four professions from day one; acting title convention | Pronouns, title | Identity, credits | Character | Professions shown on review and Profile | E1 | Tested |
| Multiple heritages and self-description | Search, free text | Profile (representation only) | Character | Profile | E1 | Tested; no mechanical effect, by design |
| Languages and proficiency | Main and other languages | Casting language fit, coaching requirement | Character | Fit notes, coaching alert | Code (`personLanguagesFit`) | Implemented; no dedicated test |
| 1:1 clock, no Pause, no catch-up, hidden pause | Real time | `ActiveClock`, `store.tick` | `state.now` | Live clock | F, E3 | Tested |
| One tab per save | Second tab | Save lock | Lock key | Read-only banner, Take Over Here | F, E3 | Tested |
| Advance and Sleep share event rules; exact-once events | Advance, Sleep | `processUntil` | Events consumed once | Stop notices, wake message, snooze | F | Tested |
| Time zones, gaps, overlaps, month-end clamp, leap days, age | Dates | `time.ts` | Instants | Local dates everywhere | F | Tested |
| Holidays with observed rules, worldwide | Country and region (curated or gazetteer key) | `placeHolidays`: Calendar, production working days, holiday premium, China make-up working days | Schedule dates | Calendar, Home, Place; expected and projected dates labelled; notes when dates aren't loaded, aren't kept, or the year is outside 2026-2100 | F, E3 (December 25 in Norway), `tests/lunar-mocap.test.ts`, `tests/world-holidays.test.ts`, `e2e/world.spec.ts` (China 2027 projected) | Tested; 2026-2100; projected after each government's last announcement |
| Daylight and polar conditions | Coordinates | Home, Place, exterior shoot check | Shoot outcome | "The sun won't rise today" | F, E3 | Tested |
| Weather, forecasts, certainty | Place, date, seed | Home, Place, weather warning, exterior shoot result | Lost or compromised scenes | Warnings with Swap or Keep choices | F, J | Tested, modeled |
| World gazetteer import (252 entries, 3,865 regions, 171,750 places) | GeoNames-derived data | `npm run world:check` | `src/world/gazetteer/index.json`, `docs/world/world-coverage.json` | — | `scripts/world-import.mjs` (0 problems) | Tested (data) |
| World search: country shards fetched on demand, retry after failure, accent-insensitive ranked search, region filter, bounded results | Country, region, query | `useWorldSearch`, `search` | — | "No places match '{query}'. Try a city, region, or country.", "Places couldn't be loaded." with Try Again | `tests/gazetteer.test.ts`, `e2e/world.spec.ts` (failed load then Try Again) | Tested |
| World route with list and outline map | World navigation | `WorldView` | — | Markers for listed places, your location ringed | `e2e/world.spec.ts` (desktop and phone) | Tested |
| Start, be born, travel and base a production anywhere | World place pickers, Travel Here, Production Base | `adoptPlace`, `travelTo`, `createProject` | `state.places` in the save | Profile birthplace, "You've arrived in Turku." | `tests/gazetteer.test.ts`, `e2e/world.spec.ts` (reload keeps Turku) | Tested |
| Climate from WMO station normals, modeled fallback labelled | Place coordinates and height | `climateFor`, `weatherOn` | Weather days | Provenance per normal | F (seasonal and determinism), `tests/migration.test.ts` | Tested, source-verified data |
| Legacy places aliased to GeoNames | 66 catalog IDs | `getPlace`, saves | Same IDs | — | `docs/world/legacy-place-migration.json`, `tests/migration.test.ts` | Tested |
| Save version 2 migration with backup first | Version-1 save | `readSave`, `migrate` | `…backup-v1` key, migrated save | "This save needs an update, and there is no room to keep a backup first…" | `tests/migration.test.ts` | Tested (engine); no browser journey yet (M7) |
| Birthdays and leap-day policy | Birth date | Event queue | Log | "Today is your birthday" | F | Tested |
| Personal plans and reminders | Add Plan | Events, schedule conflicts | Plans | Reminders, missed-plan notice | F | Tested |
| Travel and location | Travel Here | Location; presence on set | Location | Arrival notice; late call if away | Code | Implemented; not tested |
| Independent project axes | New Script form | Tasks, eligibility, readiness | Project | Overview | J, M, G | Tested |
| All 149 catalog entries reach consumers | Genre picks | Modules, readiness questions, breakdown, routing | Requirements, issues | Genre Conventions panel | G (every entry) | Tested |
| No stacking of combined genres | Multiple genres | `composeGenres` | Single module set | One note per tool | G | Tested |
| Script: scenes, dialogue, drafts, compare, restore, approve, undo | Script tab | Breakdown | Drafts | "Your second draft is saved. …" | J, E1 | Tested (core); compare and undo not directly tested |
| Revision passes take time | Accepted notes | Scheduled event | Notes addressed, quality model | Completion notice | Code | Implemented; not tested |
| Character dimensions independent | Character form | Breakdown, casting, credits, award routing | Characters | Character cards | J, M (lead vs antagonist, nonhuman co-lead, voice vs on-camera) | Tested |
| Breakdown links to scenes; scene-driven needs | Approved draft | Tasks, hiring needs, costs | Requirements | Approval notice with changes | J, G | Tested |
| Budget ledger with no double payment; actionable shortfalls | Offers, work, costs | Ledger | Obligations | Budget tab; shortfall messages | J, M, B | Tested |
| Casting and crew loop; player in any or no role | Offers | Response events | Hires, cast, bookings | Accept, counter and decline messages | J, E1 | Tested |
| Role combining; specialists required by scenes | Staffing | Coverage | Hires | "Covered By Your …" | B, E1 | Tested |
| Live-action production (weather, daylight, staffing, presence, holidays, pickups) | Schedule | Shoot days | Captures | Day results | J, B, E1 | Tested |
| 2D, 3D, stop motion, hybrid pipelines | Technique | Task graphs | Tasks, assets | Production tab | M, E2 | Tested |
| Stop-motion puppet and stage limits; design-change impact | Copies, stages, design edits | Daily work | Tasks reset | "affects N shots…", "armature is ready, but its costume still needs fitting" | M | Tested |
| Finite render capacity | Render nodes | Render tasks | Render costs | Blocked reason | M, B | Tested |
| Documentary: consent, facts, archive, no dialogue | Contributors, facts | Shoot days, delivery gate | Consent records | Consent notices | M, E2 | Tested |
| TV: episodes, episode credits, shared sets, showrunner | Episodes | Tasks per episode, credits | Credits | Release tab | M | Tested |
| Unscripted TV format rules | Format rules, hosts, participants, segments | Readiness, multi-camera shoot rule, logging and story tasks | Tasks, credits | Format Rules panel, blocked reasons | `tests/unscripted.test.ts` | Tested (engine); no browser journey |
| Motion-capture sessions | Performance method | Capture tasks gate animation | Capture costs, Performance Capture credit | Production tab | `tests/lunar-mocap.test.ts` | Tested (engine) |
| Edit, lock, pickups, delivery gate | Edit tab | Post tasks | Edit state | Lock and delivery blockers | J, E1 | Tested |
| Credits from actual contributions | Delivery | Credits | Locked credits | Release tab, Profile | J, M, E1 | Tested |
| Release routes and distributors | Release form, offers | Release events, eligibility | Releases, premiere | Release tab | Code | Implemented; release routes not e2e-tested |
| Festival and award editions, eligibility, submission, screenings, results once, credited recipients, season rivals | Submissions | Editions | Entries, results, screenings | Event detail, Calendar, Profile honors | J, G, E1, `e2e/journeys.spec.ts` (Annie Awards through the ceremony), `tests/season.test.ts` | Tested |
| Premiere status affects other festivals | Releases, premieres | `checkEligibility` | — | Reasons listed | Code | Implemented; not tested |
| Official versus simulated dates labeled | Edition data | Event detail | — | Provenance line | Code | Implemented |
| Desktop and mobile parity, no overflow | Viewports | CSS, components | — | — | E1 (phone), E3 (10 sizes), `e2e/devices.spec.ts` (WebKit iPhone 15 Plus and Pro Max) | Tested in emulation only |
| Title Case labels, sentence-case prose, no jargon or IDs | All copy | — | — | — | E3 content check, review | Partly tested |
| No tutorial or excluded systems | — | — | — | — | E3 | Tested |
| Accessibility basics (labels, focus, Escape, skip link) | Keyboard | Modal, drawer | — | — | E3 | Tested (keyboard); screen reader not tested |
