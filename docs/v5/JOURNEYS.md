# The Brief's Ten Journeys: Where Each Stands

This page covers the owner's v5 brief, section 11. Each journey is played through the interface unless a row says
otherwise. Fixtures are named where they are used: a pinned world seed, a made-up studio, or money added to a fixture.
Nothing here was inserted into a save and then called played.

This page was written on November 13, 2026. The local runs are on desktop Chromium, phone Chromium (390 by 844) and
iPhone 15 Pro Max WebKit emulation. WebKit emulation is not a physical phone, and no physical phone has been tested.

## The Journeys

| # | Journey (the brief's words) | Where | Status |
|---|---|---|---|
| 1 | Source selection through populated brief, delegated writing, casting, production and release | `v5-source-to-release.spec`: Don Quixote chosen, its brief proposed from its article's story and credited, the writing handed to Guide Me within a ceiling and worked by the writers it hires, the film cast, shot and delivered, and released through the player's own storefront on a Release Plan. J03 does the same for a series, without delegated writing. | **Played, in one run.** Desktop. |
| 2 | Real-composer consideration and simulated hiring through delivered score and credits | `v5-music-catalog.spec`, second test: Hans Zimmer is found in the music catalog (Wikidata), considered, offered the job, hired, scores the film, which is delivered, and is credited as composer. | **Played.** Desktop. His answer and fee are the game's simulation, labelled on screen. |
| 3 | A song request refused, replaced and cleared for the chosen release | `music.spec` (v4): a licence asked, refused, the song replaced from the library and cleared. | **Played.** |
| 4 | A first-look offer accepted, one project submitted, a pass received and an outside release pursued | `v5-first-look.spec`, on desktop, phone and iPhone: | **Played up to the outside pitch.** The second studio's own answer, offer or pass, is whatever its read gives, and the journey handles both. A burdened turnaround on an outside offer is engine-tested (`tests/first-look.test.ts`). |
| | | - a horror short is delivered; | |
| | | - the horror studio offers a deal; | |
| | | - the player asks for more overhead, then accepts; | |
| | | - a family film is submitted first, with development money in; | |
| | | - another studio is blocked until the pass; | |
| | | - the pass comes, and the family studio is pitched. | |
| 5 | An independent film and series choosing and completing different release routes | `v5-release-plan.spec`, a film: | **The film is played; the series isn't.** A series' routes are engine-tested (`tests/release-plan.test.ts`), and series release schedules are played in `release-schedule.spec` (v4). |
| | | - a festival hold; | |
| | | - a broadcast licence turned down for its price, then accepted and signed; | |
| | | - the stores release booked. | |
| 6 | A paid outside job leading to a relevant future opportunity | J10 and `jobs.spec`: an agent's offer on a production that persists, worked, paid and credited; another offer follows, for work the record supports. | **Played.** That a production's reception weighs on later offers is engine-tested (`tests/productions.test.ts`). |
| 7 | Renewal or cancellation with actual downstream obligations | J03: the decision follows from the reported audience against the commissioner's bar. A renewal brings the commissioner's offer for season two; a cancellation shuts their door. | **Played.** The journey checks the rule, not one recorded outcome. |
| 8 | Equipment shortage requiring approval | `v5-money-equipment.spec`: a kit with no lights, the day postponed with nothing paid, the shortage shown with priced fixes, and approved by renting what's missing. | **Played.** Desktop. |
| 9 | Company-account transfers and settled player earnings | Company: `v5-money-equipment.spec`, on desktop, phone and iPhone: formed, money moved both ways, put into a project it then produces. Earnings: J01, where income is taken home. | **Played, in two journeys.** |
| 10 | Phone picture installation and complete mobile project management | Pictures: `owner-access.spec` (the real sign-in and server path). Mobile management: the v5 journeys on phone and iPhone, and the layout sweep. | **Played in emulation.** No physical phone tested. |

## The Phone Layout Sweep

`SLATE_UI_SWEEP` covered the four v5 journeys on phone and iPhone 15 Pro Max: 101 screens and dialogs.

It found one defect: in the Release Plan a button touched the note below it, because the new components used a CSS
class the stylesheet doesn't have. It is fixed.

Screenshots of the Release Plan and the composer hiring were inspected. They showed that a music catalog record was
named as the film catalog's. That is fixed, and the tests check the wording.
