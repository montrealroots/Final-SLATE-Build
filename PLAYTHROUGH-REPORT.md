# Playthrough Report

Browser journeys use the real interface through Playwright 1.63.0 and Chromium (desktop 1280×720, plus a 390×844 touch viewport emulated in Chromium). Engine journeys call the same engine functions the interface calls, for cases that would take too long to click through. **No physical iPhone or Safari testing was done.** Screenshots are written to `test-results/` when the tests run; that folder is not committed.

## Browser Journeys (`npm run e2e`, Exit 0: 10 Passed, 6 Skipped By Design)

### 1. Live-Action Short: Write, Produce, Direct And Act (Desktop And Phone)

`e2e/live-action.spec.ts`

1. Started from empty storage. Saw "SLATE", "Write your stories. Bring them to the screen." and "No Saved Games".
2. Created Amaranta Okonkwo-Villaseñor de la Cruz (she/her, Actress by default), born in Lagos, with backgrounds Igbo, Mexican and a self-described "Afro-Mexican from Costa Chica", English plus Spanish and Igbo, starting in Toronto at 08:00 on March 2, 2026.
3. Home showed "It's 8:00 AM on Monday, March 2, 2026. You're in Toronto.", a weather and daylight sentence, and the three empty states word for word.
4. New Script: "The Last Ferry To Wolfe Island", a short with Drama and Mystery (the Clues tool appeared). Added Odile (lead, protagonist) and The Ferryman, two scenes and a clue planted in scene 1 that pays off in scene 2. Saved and approved the draft.
5. Cast herself as Odile, offered The Ferryman to a performer, and staffed every department through the reviewed proposals.
6. Built the schedule, then advanced by weeks. Rain days, counteroffers and declines were handled by re-staffing, followed by a cut pass, picture lock and delivery.
7. **Result:** delivered. Credits show Written By, Directed By and Produced By for the player, plus Cast "as Odile". The performer is credited "as The Ferryman" and the crew under their roles.
8. Entered the Venice International Film Festival 2026 (Horizons) through Prepare Submission, then advanced eight months. The entry moved to a final state; in the recorded desktop run it was **Not Selected**, with the other events listing specific eligibility reasons.
9. Save And Exit, Resume: the project is still delivered and appears on Profile.

**Player notes:** about 25 clicks from a blank project to scheduled production felt reasonable. Re-staffing after declines is the most repetitive step.

### 2. 3D Animation (Desktop)

`e2e/media.spec.ts`

- Created "Gearheart" (3D CG short, limited finish) with Tilly and Cog. The Cast section offered only voice roles. The player voiced Tilly.
- The schedule showed Render Nodes and correctly said there are no live-action shoot days.
- The Production tab listed Model And Surfacing, Rigging, Layout, Animate and Render tasks. Before the start date each said "Production starts on …". Three weeks in, Animate was "Waiting for Layout" and Render "Waiting for Lighting", each with its stated reason.

### 3. Documentary (Desktop)

`e2e/media.spec.ts`

- Created "Canal Keepers" (documentary short). The Script tab shows Subject And Approach, Facts And Contributors, and "Add Sequence", with no dialogue editor.
- Added contributor Joost de Vries and a fact, and requested consent. Two weeks later consent was answered (given or declined, deterministic per save).
- Crew lists Researcher and Fact Checker.

### 4. Layout, Keyboard And Lifecycle (Desktop)

`e2e/viewports.spec.ts`

- **Layout:** 16 screens (Home, Calendar, Profile, Projects, Place, and all 11 project sections) at 360×800, 390×844, 430×932, 440×956, 768×1024, 1024×768, 1280×720, 1440×900, 1920×1080 and 844×390 landscape. The test used a long name, a long anthology title, five genres and long scene names, and found no sideways page scrolling and no controls pushed off screen. The Advance dialog's actions stayed visible at every size.
- **Keyboard:** the skip link is first in tab order, dialogs take focus, and Escape closes them and returns focus. The light theme and Larger Text apply without overflow.
- **Content:** no tutorial, tax, rent, bank, visa, URL or raw ID text on screen. Tromsø in December says "the sun won't rise today".
- **Clock:** advanced 4 to 6 game seconds in 5 real seconds, and 2 or fewer after 4 seconds hidden (no catch-up).
- **Second tab:** opens read-only, takes over, and the first tab then shows the read-only banner.

**Bugs found and fixed while doing this:** phone calendar entry counts were hidden by CSS order; the drawer didn't move focus; waiting tasks gave no reason; the native rename prompt was replaced with a dialog; status chips weren't in Title Case.

### 5. Media Journeys To Delivery (Desktop, `e2e/journeys.spec.ts`)

Each journey uses shared helpers that play a project the way a player would:
- Cast through Find Performers, trying the next person when an offer is refused.
- Staff each department from reviewed proposals.
- Build the schedule, then advance week by week, re-offering declined roles.
- Mark facts as checked once research is done.
- Cut, lock picture and deliver.

| Journey | What Was Checked | Outcome |
| --- | --- | --- |
| 2D drawn short "Paper Kite" (Los Angeles) | Voice cast credits; digital self-release, then released; Annie Awards 2027 entry for Best Short Subject meets the rules; nominations; winner shown after the ceremony | Delivered and released. In the recorded run the entry was **Not Nominated**, and the category winner was public after the February 28, 2027 ceremony. |
| Hybrid short "Bramblewood" (London) | A live-action Kitchen scene is shot on scheduled days; the 3D Burrow scene is animated and plate-integrated, never "shot"; the CG character has a voice credit | Delivered |
| Documentary short "Lock Keepers" (Amsterdam) | Three consent requests, then a sequence with a consenting contributor; Researcher credited; no Cast credits | Delivered (the test skips if all three decline, about 1 in 100 worlds) |
| TV limited series "Night Ward" (Atlanta) | Episode Writers And Directors panel; showrunner credit; Marcus credited for episode 1 only, Dr. Ines Park for episodes 1 and 2 | Delivered |
| Web series "Tiny Flat" (Sydney) | One assembly edit per episode; the player stayed behind the camera, so has no Cast credit | Delivered |
| 3D short "Iron Orchard" with motion capture (Vancouver) | The Golem has a performance-capture role on the Cast tab; Motion Capture and Render tasks; credits for Performance Capture as The Golem and Voice Cast as Wren | Delivered |
| Stop-motion short "Button Moon" (London) | Puppet copies setting; Armature, Puppet Fabrication, Costume Fitting, Miniature Sets and Stage setup tasks; the puppet reaches "Ready for the stage." | Delivered |
| Unscripted series "Bake Or Break" (London) | The Format Rules panel and its required-rule message; hosts and participants with consent; Story Producer and Camera Operator required; Footage Logging and Story Producing per episode; Story Producer credited | Delivered (skips if fewer than two contributors agree) |

**Bugs found and fixed:**
- The award test first stopped at "Not Nominated", before the ceremony; it now waits for the results.
- The helpers reused stale button lists and left a refused offer's dialog open; they now re-query after every click and close the dialog.

### 6. WebKit iPhone Emulation (`iphone-15-plus`, `iphone-15-pro-max`, `iphone-15-pro-max-landscape`)

Playwright's WebKit iPhone 15 Plus and 15 Pro Max profiles (430×739 portrait, 814×380 landscape) ran with the WebKit build installed in this environment. On both portrait profiles:
- The full live-action journey passed.
- Tap navigation through the drawer worked.
- No screen or project section scrolls sideways.
- A focused field lower on the New Script form stays in view.

**This is WebKit emulation, not Safari on a physical iPhone.** The on-screen keyboard can't be emulated.

## Engine Journeys (`npm test`, Exit 0: 37 Passed)

| Journey | File | Outcome |
| --- | --- | --- |
| Live-action feature, player in all four roles | `tests/journeys.test.ts` | Delivered. Animal, stunt, crowd and creature requirements come only from the scenes that use them. The player acts and directs the same days. Credits are correct. Saves round-trip. |
| Live action, player behind the camera only | `tests/journeys.test.ts` | Delivered. No acting credit for the player. Festival entry results don't change after reprocessing. |
| 2D drawn short | `tests/media.test.ts` | Boards, animatic and voice gate animation; no render or location work. Delivered with two voice credits. |
| 3D CG short | `tests/media.test.ts` | No animation progress before rigs exist. Render capacity limited to 1 node, then raised. Render costs posted. Delivered. |
| Stop motion | `tests/media.test.ts` | With 1 copy, only one of two shots can run ("The puppets it needs are on another stage"); with 2 copies both run. A design change rebuilds only that character's assets and reports "affects 2 shots that haven't been animated". |
| Hybrid | `tests/media.test.ts` | Live scenes shot, animated scene animated and integrated, no duplicate charges. Delivered. |
| Documentary | `tests/media.test.ts` | Interview, consent, fact-check and archive requirements; no dialogue; delivery blocked until facts are verified and consent given. |
| TV limited series, 2 episodes | `tests/media.test.ts` | One shared location requirement; a guest character credited for episode 1 only, the lead for 1 and 2; showrunner credit; one assembly per episode. |
| Failure and recovery | balance runs | Micro-budget live-action shorts funded at $40,000 run out of money in 23% of seeds (40% before the weather change, 27% before the staffing change of November 7, 2026). Adding a co-producer and rebuilding the schedule recovers all of them. Micro-budget animation is funded to its script's estimate and delivers in every seed (`BALANCE-REPORT.md`). |

## Not Played Through The Browser

- Accepting a distribution offer is exercised only when a distributor makes one in that world; the engine path is tested.
- Physical devices and real Safari.
