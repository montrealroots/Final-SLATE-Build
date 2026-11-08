# Playthrough Families Against The Browser Journeys (November 8, 2026)

The package's `05-PLAYTHROUGHS-AND-ACCEPTANCE.md` lists fifteen scenario families. This maps each one to the journeys
that run it through the real interface (`e2e/`, run on desktop and phone Chromium and, where `playwright.config.ts`
says so, WebKit with iPhone 15 Plus or 15 Pro Max emulation), and names what no journey runs yet. Some parts are
covered by unit tests instead; those are named as such and are not browser evidence. The last full production-build
run of the suite is in `RESUME-HERE.md` with its commit.

| # | Family | Journeys that run it | Not run in the browser yet |
|---|---|---|---|
| 1 | Live-action short | `connected.spec.ts` (creation with Review edits, characters, pitch, funding, casting, crew, a scene cut and picked up, delivery, a broadcast deal, earnings, two save-and-reloads; WebKit on 15 Pro Max); `live-action.spec.ts` (cast yourself, call sheet, sites, shot plan, takes, re-recorded lines, credits; WebKit on both iPhones); `first-project.spec.ts` (refusal, agreed backing, release, a second project with history) | Weather loss on a chosen day (unit: `depth-gaps-production.test.ts`) |
| 2 | Behind the camera | `careers.spec.ts` "writing, producing and directing without acting" (an offer to a booked performer is turned down, then recast) | Credits and payments for a performer let go after work (unit: `relationships.test.ts`) |
| 3 | Episodic | `careers.spec.ts` "a TV season" (regular and guest, a scene changed after filming, a pickup, per-episode credits); `journeys.spec.ts` TV limited series, web series and the TV journey's second season; `season.spec.ts` (reordering, shared facts) | None named |
| 4 | Stop motion | `careers.spec.ts` "stop motion" (refused for lack of money, backed for less, funded, delivered and released); `journeys.spec.ts` "stop motion to delivery" | Puppet damage and repair (unit: `depth-gaps-production.test.ts`) |
| 5 | 2D | `journeys.spec.ts` "2D animation" (to delivery, digital release, the Annie Awards); `media.spec.ts` design approval | A late change revising only affected work (unit: `designs.test.ts`) |
| 6 | 3D | `media.spec.ts` "3D animation through the UI" (voice cast, modeling and rigging first, render capacity); `journeys.spec.ts` "3D animation to delivery, with a motion-capture performance" | Unavailable required crew (unit: `depth-gaps.test.ts` "no candidate") |
| 7 | Hybrid and capture | `journeys.spec.ts` "hybrid" and the motion-capture journey | A missed capture session and its rebooking (unit: `depth-gaps-production.test.ts`); plate integration restarted by a pickup (unit) |
| 8 | Documentary | `journeys.spec.ts` documentary journeys (consent and fact checks gate delivery; a contributor who declines; the face condition and blurring); `media.spec.ts` documentary | Withdrawal after filming, in the browser. It was an engine gap until November 8, 2026 (only unscripted shows modeled it); a documentary's filmed scenes with them are now redacted before delivery (unit: `restrictions.test.ts`) |
| 9 | Unscripted | `journeys.spec.ts` unscripted series (format rules, hosts and participants, story producing; a participant who withdraws) | A separate journey per format family (unit: `unscripted.test.ts`) |
| 10 | Festival route | `journeys.spec.ts` "festival under official rules"; `screenings.spec.ts` (invitation, travel, reminder, attendance; declining) | Withdrawal and resubmission, invalid entries (unit: `rulebooks.test.ts`); versions entered (unit: `versions.test.ts`) |
| 11 | Distribution | `script-rules.spec.ts` "a mature project" (declared content, broadcaster's options); `connected.spec.ts` (a late slot or broadcast edit, earnings reported against received) | Territory and exclusivity conflicts, later windows (unit: `territories.test.ts`) |
| 12 | Persistence and recovery | `failures.spec.ts`, `backup.spec.ts`, `storage.spec.ts`, `reliability.spec.ts`, `viewports.spec.ts` (second tab, reload lock) | None named |
| 13 | Calendar | `viewports.spec.ts` (clock 1:1, no catch-up; Advance lists plans); `creation.spec.ts` (kept holidays); `world.spec.ts` (projected holidays) | Leap years, DST and year rollover are unit-tested only (`dates.test.ts`, `foundation.test.ts`, `world-holidays.test.ts`) |
| 14 | Scope revision | `structure.spec.ts` (duplicate, split, combine; acts, threads; shelve and take up again); `careers.spec.ts` (a scene changed after filming) | None named |
| 15 | Multi-project career | `first-project.spec.ts` (a second project keeps the first one's history); `career.spec.ts` (a proposal starts a funded project; same-title projects); `connected.spec.ts` (people you've worked with, credits on Profile); `journeys.spec.ts` (a TV season's renewal and second season) | Outstanding repayment carried into a second project (unit: `finance.test.ts`) |

Physical iPhones and real Safari were not used: WebKit emulation is not device verification (`20-05`, with the owner).
