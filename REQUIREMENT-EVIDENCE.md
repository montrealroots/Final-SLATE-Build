# Requirement Evidence

Status key:
- **Tested** means an automated behavioral test or browser journey exercises it.
- **Implemented** means it is built and reachable in the UI but not directly tested.
- **Modeled** means it rests on a documented simulation assumption.
- **Partial** or **Not Built** are stated as such.

Tests: `F` = `tests/foundation.test.ts`, `J` = `tests/journeys.test.ts`, `M` = `tests/media.test.ts`, `G` = `tests/genres.test.ts`, `B` = balance, `E1` = `e2e/live-action.spec.ts`, `E2` = `e2e/media.spec.ts`, `E3` = `e2e/viewports.spec.ts`.

| Requirement | Input | Consumer | Persistent Consequence | Player Feedback | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Startup copy and actions (1221): "Your next story starts here.", New Game, Continue only with a save, Saved Games, Settings | First launch, saves | `Startup.tsx` | Index of saves | Continue details, delete and start-over confirmations | E1, E3 | Tested |
| Creation in the 1221 order (Your Name to Review), "Which language do you use most?", Start My Story | Creation | `Creation.tsx`, `validateDraft` | Draft | Errors on the right section | E1 (`createCharacter`), `e2e/world.spec.ts` | Tested |
| One route registry for sidebar, drawer, active state; Saved Games and Settings in a game | Navigation | `routes.ts`, `Shell.tsx` | — | Playing Now marker; the current game can't be deleted | E3 ("in-game Saved Games and Settings") | Tested |
| Save error: "Your game couldn't be saved. Keep this window open and try again." with Try Again | Failed write | Top bar alert, Save And Exit | Stays in the game | Alert | Code path; failed-write UI journey is M7 | Implemented |
| Load failure keeps the save | Corrupt data | `readSave`, load-error screen | File untouched | "Couldn't Open This Save" | F (corrupt and newer-version cases) | Tested (engine); screen built |
| Verified saves; Saving, Saved, Couldn't Save | Any change | `writeSave` | Validated before writing; previous sound save kept as `.bak`; replace; read back; index. "Saved" only when every step succeeded. Needs room for two copies, not three (`docs/STORAGE.md`) | Save indicator; storage-full message with Free Up Space | F, `tests/save-recovery.test.ts` (failures at the backup, replace and index steps, three times in a row; running out of space at each step with a real-limit store; no room to keep a damaged copy; a newer-version save is never replaced), `e2e/storage.spec.ts` | Tested |
| Recovery copies kept and never deleted by the game; storage use shown; export and delete each copy | Saved Games | `listRecoveryCopies`, `deleteRecoveryCopy`, `storageUse` | Copies stay until the player deletes them | Storage panel, Recovery Copies list | `tests/save-recovery.test.ts`, `e2e/storage.spec.ts` | Tested |
| Save recovery: corrupt, truncated or invalid main save; interrupted write; damaged index; newer-version saves refused | Opening a save | `openSave`, `listSaves` | Damaged copy kept as `.damaged-…`; never overwritten | "Opened The Last Good Copy" notice naming the copy's save time, kept while holiday rules load; specific load error | `tests/save-recovery.test.ts`, `e2e/failures.spec.ts`, `e2e/reliability.spec.ts` | Tested |
| A failure while time passes in one save doesn't pause the next save opened | Switching saves | `store.enterNow` | — | Paused banner only for the save that failed | `e2e/reliability.spec.ts` | Tested |
| Runtime save validation (character, settings, places, projects, budgets, tasks, hires, events, editions; finite numbers, enums, references, invariants) | Opening a save | `validateGameState` | — | "This save is damaged (where: what)." | `tests/save-recovery.test.ts` (12 malformed cases) | Tested |
| Real calendar dates only (month lengths, leap years) for birth, start, production start and release dates | Creation, schedule, release | `isDateKey` | — | Field errors | `tests/dates.test.ts` | Tested |
| Time processing failures roll back and pause | Advance, Sleep, the running clock | `processUntil` (all-or-nothing per call), store `halt` | State restored; event stays queued | "Time is paused. …" with Try Again and Export Save | `tests/processing.test.ts`, `e2e/failures.spec.ts` | Tested |
| Ledger input checks | Commit, settle, spend | `checkAmount`, closed lines take no payments | — | — | `tests/ledger.test.ts` | Tested |
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
| Script: scenes, dialogue, drafts, compare, restore, approve, undo; scheduled revisions; re-approval keeps unchanged work | Script tab | Breakdown, captures, tasks | Drafts, carried-forward footage | "Your second draft is saved. …", Approve This Draft confirmation listing redone work | J, E1, `tests/writing.test.ts` | Tested (engine); undo is UI-only and not directly tested |
| Revision passes take time | Accepted notes | Scheduled event | Notes addressed, quality model | Completion notice | Code | Implemented; not tested |
| Character dimensions independent | Character form | Breakdown, casting, credits, award routing | Characters | Character cards | J, M (lead vs antagonist, nonhuman co-lead, voice vs on-camera) | Tested |
| Breakdown links to scenes; scene-driven needs | Approved draft | Tasks, hiring needs, costs | Requirements | Approval notice with changes | J, G | Tested |
| Budget ledger with no double payment; actionable shortfalls | Offers, work, costs | Ledger | Obligations | Budget tab; shortfall messages | J, M, B | Tested |
| Casting and crew loop; player in any or no role | Offers | Response events | Hires, cast, bookings | Accept, counter and decline messages | J, E1 | Tested |
| Role combining; specialists required by scenes | Staffing | Coverage | Hires | "Covered By Your …" | B, E1 | Tested |
| Live-action production (weather, daylight, staffing, presence, holidays, pickups) | Schedule | Shoot days | Captures | Day results | J, B, E1 | Tested |
| Weather: Move the Shoot, Film an Interior Scene | Schedule tab weather actions | `moveShootDay`, `swapWithInteriorDay` | Day date, bookings extended, events moved; costs unchanged | "Rain is expected during your exterior shoot." | `tests/schedule.test.ts` | Tested (engine) |
| Keyboard-operable map markers | Tab, Enter | World map | — | "Open {place}" buttons | `e2e/world.spec.ts` | Tested |
| Category audit | Institution data | `categoriesFor` | Category year ranges | — | `tests/awards-audit.test.ts`, `docs/world/CATEGORY-AUDIT.md` | 9 corrected and 2 confirmed with sources; 130 not re-fetched |
| 2D, 3D, stop motion, hybrid pipelines | Technique | Task graphs | Tasks, assets | Production tab | M, E2 | Tested |
| Stop-motion puppet and stage limits; design-change impact | Copies, stages, design edits | Daily work | Tasks reset | "affects N shots…", "armature is ready, but its costume still needs fitting" | M | Tested |
| Finite render capacity | Render nodes | Render tasks | Render costs | Blocked reason | M, B | Tested |
| Documentary: consent, facts, archive, no dialogue | Contributors, facts | Shoot days, delivery gate | Consent records | Consent notices | M, E2 | Tested |
| TV: episodes, episode credits, shared sets, showrunner | Episodes | Tasks per episode, credits | Credits | Release tab | M | Tested |
| Unscripted families (talk, observational, competition, factual, studio variety), competition rounds, withdrawal and redaction | Show Format panel, contestants, Record Withdrawal | `unscripted.ts`, script issues, daily results, delivery blockers | Stored results, redaction tasks | Family rules as script issues, results list, redaction notice | `tests/unscripted.test.ts` (each family; deterministic competition; withdrawn release), `e2e/journeys.spec.ts` (unscripted series) | Tested |
| Motion capture: book, calibrate, capture takes, retakes, approved take, cleanup and retargeting, then animation; cancellation fee and release | Production tab Motion Capture panel | `mocap.ts`, daily work | Booking line, takes, approved take, invalidated work | Book Capture Stage, Request A Retake, Approve This Take (with confirmation), Cancel Booking with stated terms | `tests/lunar-mocap.test.ts`, `e2e/journeys.spec.ts` (3D with motion capture to delivery and credit) | Tested |
| Edit, lock, pickups, delivery gate | Edit tab | Post tasks | Edit state | Lock and delivery blockers | J, E1 | Tested |
| Credits from actual contributions | Delivery | Credits | Locked credits | Release tab, Profile | J, M, E1 | Tested |
| Release routes, distribution contracts, cancellation | Offers, Plan Release, Cancel Release | `acceptDistribution`, `cancelRelease`, release events | Delivery-materials line, guarantee, release history | Contract cost on offers; terms in the cancel confirmation | `tests/release.test.ts`, `e2e/journeys.spec.ts` (2D: release, a cancelled plan) | Tested |
| Festival and award editions, eligibility, submission, screenings, results once, credited recipients, season rivals | Submissions | Editions | Entries, results, screenings | Event detail, Calendar, Profile honors | J, G, E1, `e2e/journeys.spec.ts` (Annie Awards through the ceremony), `tests/season.test.ts` | Tested |
| Premiere status affects other festivals | Releases, premieres | `checkEligibility` | — | Reasons listed | Code | Implemented; not tested |
| Official versus planning dates labelled; organizer-announced 2026-2027 editions | Edition data with sources | Event detail | — | "Dates haven't been announced. Planning dates are shown."; planning deadline noted | `docs/world/INSTITUTION-AUDIT.md`, unit tests | Source-verified (dates only); rules simulated |
| Screening invitations: reply deadline, travel in time, schedule conflicts, 30-minute reminder, attendance; declining keeps selection | Screenings panel | `rsvpScreening`, `screeningTravel`, `screeningConflicts`, reminder event | Invitation status, attendance | "Your screening starts in 30 minutes.", Attend Screening, Accept Invitation, Travel to the Venue, View Schedule, Decline Invitation | `tests/season.test.ts`, `e2e/screenings.spec.ts` | Tested |
| Desktop and mobile parity, no overflow | Viewports | CSS, components | — | — | E1 (phone), E3 (10 sizes), `e2e/devices.spec.ts` (WebKit iPhone 15 Plus and Pro Max) | Tested in emulation only |
| Title Case labels, sentence-case prose, no jargon or IDs | All copy | — | — | — | E3 content check, review | Partly tested |
| No tutorial or excluded systems | — | — | — | — | E3 | Tested |
| Accessibility: labels, focus, Escape, skip link; names on every control, unique ids, one h1, reduced motion, 200% text | Keyboard, all main screens | Modal, drawer, every screen | — | — | E3, `e2e/accessibility.spec.ts` (desktop and phone) | Tested (automated); screen reader not tested by a person |
| Failure paths: failed save, version-1 save, data that fails to load | Storage refusing writes, an old save, blocked fetches | Store, save migration, World and Place views | Save kept; backup-v1 key | Save error with Try Again; "Places couldn't be loaded."; map and holiday messages with Try Again | `e2e/failures.spec.ts`, `e2e/world.spec.ts` | Tested |
| Places a save can't resolve: repair screen; Export Save | Damaged place reference; Export Save buttons | `missingPlaces`, `repairSave`, `exportSave` | `backup-repair` copy; a downloaded save file | "Choose Missing Places", where each place was used; Export Save beside a failed save | `tests/migration.test.ts`, `e2e/failures.spec.ts` | Tested |
| Performance budgets | Build output, largest shard | `npm run budget`, `e2e/performance.spec.ts` | — | — | Measured: 675 kB startup JS (200 kB gzipped); dev-server startup 527 ms, US shard 314 ms, search 118 ms | Tested (budgets) |

## Festival And Award Rules (November 6, 2026)

| Requirement | Trigger | Engine | Persistence | Player-facing | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Organizer rules applied per edition, versioned | Edition created; save migration | `rulebooks.ts`, `applyRulebook`, `checkEligibility`, `categoryDeadline` | `Edition.rulesId`, `defaultDeadline`; save version 3 with backup | Official Rules / Projected Rules chips, category deadlines, "How These Rules Apply" | `tests/rulebooks.test.ts` (33) | Tested for 47 verified + 2 projected categories; 93 simulated |
| Runtime, completion, premiere, prior showing, online, origin, re-entry, theatrical-first, qualifying release or festival win | Entry and deadline recheck | `checkEligibility` | Entries keep their status and reason | Reasons in plain words | `tests/rulebooks.test.ts` | Tested |
| Deadlines in the organizer's time zone, by category and completion date | Entry | `categoryDeadline` | Deadline events moved on migration | Local and player times | `tests/rulebooks.test.ts` | Tested |
| Recipients named by the organizer (producers, at most three; director) | Entry | `categoryRecipients` | Entry recipients | Submission dialog | `tests/rulebooks.test.ts` | Tested |
| Duplicates, withdrawals, one fee per category | Entry | `submitEntry`, `withdrawEntry` | Unique entry IDs; fee key | Entry list | `tests/rulebooks.test.ts`, `e2e/journeys.spec.ts` | Tested |
| History preserved; competing films stored once | Save migration | `migrateV2toV3` | `GameState.rivalFilms` | Results unchanged | `tests/rulebooks.test.ts` | Tested |

## Long-Career Storage (November 6, 2026)

| Requirement | Trigger | Engine | Persistence | Player-facing | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Careers of 50 years keep saving | Every save | `compactEdition`, save version 4 | IndexedDB, gzip, one transaction per save (`Vault`, `IdbBackend`) | "Saved" after the commit; storage use with the browser's quota | `tests/perf/career.perf.ts` (measured), `tests/vault.test.ts`, `e2e/storage.spec.ts` | Measured and tested |
| Budget size is an estimate; money only from accepted backers | Project creation; Budget | `createProject`, `finance.ts` (`approachBacker`, `acceptDeal`) | `Project.finance` (estimate, target, deals); save version 5 | Financing panel: estimate, target, promised, received, still to raise; Next Step | `tests/finance.test.ts`, `e2e/first-project.spec.ts` | Tested |
| Backers' terms enforced | Income, delivery, deadlines, casting and picture approval, credits | `receiveIncome`, `onProjectDelivered`, `finance-deadline`, `approvalRights`, `computeCredits` | Deal `received`, `repaid`, `status` | Terms dialog before accepting; Backers list | `tests/finance.test.ts` | Tested |
| Existing funded projects keep their money | Save migration | `migrateV4toV5` | Accepted "agreed before financing" deal | Backers list | `tests/finance.test.ts` | Tested |
| Import Save | Saved Games | `readImport`, `importSave`, `Vault.forImport` | Copy or confirmed replacement; backup kept | Import Save, conflict and replace dialogs | `tests/import.test.ts`, `e2e/backup.spec.ts` | Tested |
| Character creation step registry and Review edits | Creation | `CREATION_STEPS`, `normalizeDraft` | Draft step ids | Review rows with edit actions; Save And Return To Review | `tests/creation.test.ts`, `e2e/creation.spec.ts` (desktop, phone, WebKit) | Tested |
| Saves move out of localStorage safely | First start | `migrateFromLocal` | Verified before removal; conflict copies; Web Lock | "Copy saved by another tab" recovery copies; a note if a save couldn't move | `tests/vault.test.ts`, `e2e/storage.spec.ts` (two tabs, interrupted, conflict) | Tested |
| Progress survives closing the page | Page hidden or closed | `applyJournal` | localStorage journal | — | `tests/vault.test.ts`, `e2e/world.spec.ts` | Tested |

