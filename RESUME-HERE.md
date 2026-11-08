# Resume Here

Read this first. It lists what is finished, what the Gap Completion Package still needs, and the order to do it in. There is no need to reread the package or redo finished work.

## Standing Rule

At every stopping point, open a pull request into `main` and merge it (see `CLAUDE.md`, certified by the user on November 6, 2026). Never merge red checks.

## State

- **Branch:** `claude/clever-archimedes-x0r26v`, pushed to https://github.com/montrealroots/Final-SLATE-Build. After each merge the branch restarts from `main`.
- **Merged checkpoints:** montrealroots/Final-SLATE-Build#1 (base build), #2, #3 (gap fixes before the package), #4 (M1), #5 (M2), #6 (M3 and M4), #7 (M5), #8 (M6), #9 (M7), #10 (repair screen, Export Save), #11 (Move the Shoot, keyboard map markers, category audit), #12 (save recovery and validation, dates, processing rollback, ledger checks), #13 (production module split, CI budgets and balance), #14 (cross-save reliability fixes, CI browser-install resilience; merged as `7c7d15e`), #15 (faster rollback snapshots, smaller startup files; `2633269`), #16 (two-copy saving, recovery copies, full-storage handling; `19b513f`), #17 (organizer rulebooks, save version 3, CI in the Playwright image; `36da91f`), #19 (long-career storage: IndexedDB save vault, save version 4; `1c5f802`), #20 (rulebooks for Annecy, Venice, Berlinale, Golden Globes, Emmys; `4fa5d27`), #21 (country classifications, Suriname holidays, English names, climate source; `cb23eca`), #22 (deterministic journeys, production-build runs, browser diagnostics; `3a84bf3`), #23 (production-build suite in CI; `b2d7b31`), #24 (character creation fixes, Import Save; `e26d71d`), #25 (financing: money from backers, save version 5), #26 (screenwriting audit, dated motion-capture sessions, replacement credits, San Sebastián rules), #27 (the 1221 layout), #28 (1221's creation suite), #29 and #30 (pronouns settle the billing), #31 (backgrounds: kept holidays, casting information, languages), #32 (language suggestions for every background but Assyrian), #33 (script field effects), #34 (script rules review; `6e2abf0`), #35 (input loss, startup size, connected journey; `c00c261`), #36 (atomic genre catalog, careers, reload lock; `5e142f4`), #37 (micro-budget tuning; `fddd6b6`), #38 (budget-size wording; `b025147`), #39 to #41 (screen review, identity, depth stages 1 to 4), #42 (depth stages 5 to 8; `cfe7d71`). `main` was at `3845c2d` when the Gap Completion Package was applied.
- **Package:** "SLATE Gap Completion Package" (predates #2 and #3). Its references are not committed; the imported data is under `src/world/` and `docs/world/`.
- **Run first:**

  ```bash
  npm ci
  ```

  ```bash
  npm run check
  ```

  ```bash
  npm run e2e -- --trace off
  ```

## Package Reconciliation

| Package area | Already in the base before the package | Added by this phase |
| --- | --- | --- |
| World import (GeoNames, regions, zones) | 66 hand-made places | M1: 252 entries, 3,865 regions, 171,750 places validated by `npm run world:check`; 66 legacy IDs aliased to GeoNames |
| Climate (WMO normals) | Hand-written climate per place | M1: nearest-station normals with height correction; modeled fallback beyond 400 km, labelled |
| Save migration | Save version 1, verified writes | M1: save version 2, backup before migrating, refusal when no backup can be kept |
| Search and map, world pickers | Catalog search of 66 cities | M2: lazily fetched country shards, accent-insensitive ranked search, region filter, World route with list and outline map, world places in creation, travel and production bases, kept in saves |
| Holidays worldwide | Hand rules for the 66 places' countries, sourced 2026 lunar dates | M3: donor engine for 218 entries (2026-2100), curated rules kept authoritative, later lunar years projected or expected, coverage notes instead of silent ordinary days; production applies holidays through each project's holiday policy |
| 1221 UI adaptation | Shell, tokens and startup already on the 1221 palette | M4: startup copy and actions (New Game, Continue, Saved Games, Settings), eight creation sections ending in Start My Story, one route registry (`src/ui/routes.ts`) with in-game Saved Games and Settings, save-error copy with Try Again, 16px fields on phones, widths 360-1920 checked, `docs/COPY-GUIDE.md` |
| Motion capture, unscripted families, release, writing | Capture sessions, one unscripted pipeline, offers and releases, drafts | M5: capture booking, calibration, takes, retakes, approved take, cleanup and retargeting with cancellation terms; talk, observational, competition (stored deterministic rounds), factual and studio variety with withdrawal and redaction; distribution contracts with delivery materials and release cancellation; re-approval keeps unchanged scenes' work |
| Screenings, festival and award rules, competing projects | Screenings, simulated rules, stored season rival slates | M6: invitations with reply deadlines, travel-in-time checks, schedule conflicts, a 30-minute reminder and attendance; 19 of 37 institutions on organizer-announced dates (sources in `docs/world/INSTITUTION-AUDIT.md`), planning dates labelled for the rest |
| Failure-path journeys, balance, performance, accessibility | Happy-path journeys, balance runs | M7: failed save, version-1 save and data-load failures through the UI; screening journeys; held-out seeds on feature combinations; measured size and interaction budgets; automated accessibility checks |

## Milestone Log

- **M1 world data and climate:** implemented and tested. `npm run check` passed (51 tests, world check 0 problems); e2e 23 passed, 16 skipped by design after a test-only fix; GitHub Actions CI passed. Merged as montrealroots/Final-SLATE-Build#4 (`2f488bb`).
- **M2 world search and map:** merged as montrealroots/Final-SLATE-Build#5 (`d171f95`); CI passed.
- **M3 worldwide holidays and M4 1221 UI adaptation:** merged as montrealroots/Final-SLATE-Build#6 (`2d9ebbc`). The first CI run hung installing browsers and was cancelled; CI steps now have timeouts; the second run passed.
- **M5 motion capture, unscripted families, release contracts, writing regression:** merged as montrealroots/Final-SLATE-Build#7 (`e1d4964`).
- **M6 screening invitations and announced edition dates:** merged as montrealroots/Final-SLATE-Build#8 (`a979714`).
- **M7 failure paths, screenings in the UI, held-out balance, budgets, accessibility:** merged as montrealroots/Final-SLATE-Build#9 (`24f0cff`); CI passed.
- **Repair screen for unresolvable places and Export Save:** local `npm run check` passed (80 tests, startup JavaScript 679 kB, 201 kB gzipped, within budget), e2e 46 passed, 17 skipped by design, 0 failed. Final checkpoint of this package.
- **Coding gaps (Move the Shoot, keyboard markers, category audit):** merged as montrealroots/Final-SLATE-Build#11.
- **Reliability pass (concerns 1-5):** montrealroots/Final-SLATE-Build#12.
- **Production module split, CI balance and budgets, report reconciliation (concerns 6-7):** montrealroots/Final-SLATE-Build#13; local results in `QA-REPORT.md`.
- **CI runs inside `mcr.microsoft.com/playwright:v1.63.0-noble`** (since #17): the Ubuntu package mirror stalled or crawled during browser installs three times, so CI no longer installs packages. When `@playwright/test` is upgraded, change the image tag in `.github/workflows/ci.yml` to match; a CI step fails until they agree.
- **Checkpoint A of the rulebook/performance/storage request:** CI run 17 on `main` failed because the apt mirror stalled while installing browsers (infrastructure, not code); CI now caches browsers by Playwright version and retries the install twice within a bounded time. Reliability fixes verified across switching saves and reloading, with three defects fixed and covered: a paused clock from one save carried into the next save opened; a recovery message was dropped when opening waited for holiday rules to load, and didn't say which copy was opened; an older build could replace a save written by a newer version (and push it into the backup, where the next save would overwrite it). New: `e2e/reliability.spec.ts`; `tests/save-recovery.test.ts` covers a write failing at each stage three times in a row, no room to keep a damaged copy, repeated opens of a damaged save, and refusing to replace a newer save.

## Remaining Work, In Order

### Newest Request (November 8, 2026): the SLATE Complete Gameplay Depth Package

The owner's package is in `docs/depth/package/` (20 areas, 100 groups, `SLATE-01-01` to `SLATE-20-05`). Read
`docs/depth/README.md` first.

- **Ledger:** `docs/depth/COVERAGE-LEDGER.csv` (the 100 groups) and `docs/depth/CHILDREN.csv` (their child requirements).
  - They are generated by `python3 tools/depth/gen_ledger.py` from `tools/depth/ledger_data.py`.
  - To record progress, edit the data file and regenerate. `tests/depth-ledger.test.ts` fails a status not backed by its
    evidence.
- **Done:**
  - Stage 1: reconciled every group, built the ledger and its checker.
  - Stage 2, everything below now VERIFIED:
    - `01-02.03` ethnicity in your own words, blank or repeated, refused;
    - `01-04.04` days you act on are marked;
    - `01-04.05` handing an episode's writing or directing to someone else keeps the credit for work done (`assignEpisodeRole`);
    - `01-05.04` a double press of Start My Story makes one life (store guard);
    - `02-02.04` Advance lists what it will pass;
    - `02-02.05` no pause control;
    - `02-04.03` weather swap and shoot anyway;
    - `02-04.05` polar-night daylight;
    - `19-02.03` nothing hides under the top bar (it sits outside the scroll area, so the package's sticky-header issue
      isn't present here).
  - Found and fixed on the way: the map note "The place you chose is the solid dot." arrived with the map and moved
    Save And Return To Review down 17 px (`e2e/focus.spec.ts`). It now shows in the loading placeholder too.
  - Stage 3, project and story, everything below now VERIFIED:
    - ways to cost less, with the engine's own savings (`03-03.02`, `08-05.03`, `estimate.ts costCuts`);
    - shelving a project and taking it up again (`03-04.02`, `18-05.03`, `shelve.ts`);
    - acts and story threads (`04-02.02`, `.03`, `structure.ts`);
    - fiction research notes (`04-04.02`, `research.ts`);
    - documents kept as sent (`04-05.02`, `FinanceDeal.sentCopy`);
    - aliases and renaming (`05-01.02`, `.03`);
    - arc beats (`05-04.02`);
    - the character removal preview (`05-04.03`);
    - the requirement removal preview (`06-03.02`);
    - duplicating, splitting and combining scenes (`06-04.02`).
  - Browser test: `e2e/structure.spec.ts` (desktop and phone).
  - Stage 4, episodes, everything below now VERIFIED:
    - the series bible (`07-01.01`, `.02`, `season.ts`): a world rule names the scenes that rely on it; changing or
      removing a rule or a relationship lists the episodes and scenes it touches first, and recorded scenes stay as shot;
    - the season plan (`07-02.02`): a season arc, episode titles and a line on what each moves (advice notes only), and
      episodes reordered with their scenes in every draft until anything is planned, hired or recorded;
    - episode writers and directors (`07-04.01`), and block scheduling by director (`07-04.02`, `schedule.blockEpisodes`);
    - renewal and the next season or a sequel (`07-05.02`, `18-04.01`, `.02`, `continuation.ts`): the commissioner
      decides 30 days after delivery on the delivery assessment (60 or more renews, game calibration); continuity and
      finished builds carry over; the previous cast are asked back at their last rate as ordinary offers; no money
      carries over, and a renewal is an offer to accept.
  - Browser tests: `e2e/season.spec.ts` (desktop, phone, WebKit iPhone 15 Plus); the TV journey in
    `e2e/journeys.spec.ts` now plans the season, shoots in blocks, starts season 2 and asks back whoever played Marcus, which is refused with
    the exact shortfall until season 2 raises its own money.
  - Ledger after stage 4: parents 54 VERIFIED EXISTING, 4 VERIFIED, 22 IMPLEMENTED UNVERIFIED, 13 NEEDS REPAIR,
    5 MISSING, 2 EXTERNAL BLOCKER; children 148 / 32 / 26 / 0 / 21 MISSING / 2.
  - Stage 5, money and people, everything below now VERIFIED:
    - offers lapse (`08-03.02`, `negotiation.ts`): a backer's offer is open 21 days, then lapses and that backer isn't
      asked again for the project; offers from older saves have no lapse date and stay open;
    - asking for better terms (`08-03.03`): once per offer, one term the backer has (a smaller income share, less to
      repay first, more on signing, no casting approval). They answer in 5 days; leverage (open script notes, delivered
      work, another open offer) sets the odds and the world seed settles it: agree, keep their terms, or take it back.
      Grants and the starting backing aren't negotiable;
    - auditions (`09-02`, `auditions.ts`, `casting-calls.ts`): invite performers to read (3 days' notice, on the
      calendar); a booked performer declines saying so, some miss it; a read shows their real capability as a range in
      words; a callback narrows it and can be a chemistry read with someone cast or seen in the same scenes. Chemistry
      is a modeled pair property that now moves shared-scene performances by half its value (finish.ts), read or not.
      The comparison sits side by side, never one score; background parts aren't auditioned.
  - Browser tests: `e2e/negotiation.spec.ts`, `e2e/auditions.spec.ts` (desktop, phone; world seed 11).
  - Ledger after stage 5: parents 55 VERIFIED EXISTING, 5 VERIFIED, 22 IMPLEMENTED UNVERIFIED, 12 NEEDS REPAIR,
    4 MISSING, 2 EXTERNAL BLOCKER; children 148 / 37 / 25 / 0 / 17 MISSING / 2.
  - Startup JavaScript budget: page-only engine code now loads with its page (`season.ts`, `sequel.ts`, `shelve.ts`,
    `structure-edit.ts`, `casting-calls.ts`, `cost-cuts.ts`, `negotiation-actions.ts`, `awards-actions.ts`,
    `callsheet.ts`, `takes-actions.ts`, `designs-actions.ts`, `locations-actions.ts`, `documentary-actions.ts`).
    After stage 8 startup was 698.1 kB of 700; the festival and awards calendar then became data
    (`src/data/institutions.json`, fetched at startup like the genre catalog, every game waiting for it, Try Again on
    failure), and startup is 670.5 kB. Measure what each source adds with a
    sourcemap build (`npx vite build --outDir <dir> --sourcemap`, then sum each source's mapped bytes in the store
    chunk with `source-map-js`).
  - Stage 6, preparation, everything below now VERIFIED:
    - call sheets (`11-05.03`, `callsheet.ts`), VERIFIED: each scheduled shoot day has one, derived from what the day runs
      on (call 7 AM or 5 PM for night, wrap, who is paid on set, uncast parts, crew, crowd, holiday premium, daylight for
      an exterior, the forecast once there is one); browser check in `e2e/live-action.spec.ts`;
    - design approval (`11-03.02`, `designs.ts`), VERIFIED: once visual development is done, each character's design
      waits for the producer; Approve lets its builds start, Ask For Changes adds a day of visual development that every
      build waits for; a later design change needs approving again. Projects started before keep building without it
      (`designReview` unset). The test helpers (`tests/helpers.ts manage`, `e2e/helpers.ts runToDelivery`) approve finished
      designs as a producer would; the production golden's payment hashes were regenerated for that one-day wait (days,
      quality and credits unchanged);
    - location sites (`11-02.02`, `locations.ts`): once scouting is done each place offers the real place, a stage set
      (1.6 times the day fee, never falls through) and a cheaper stand-in (0.6 times, falls through more often). A
      chosen site can fall through on the shoot morning: to the backup if there is one, else the day is lost, its
      scenes move later and the place needs a new choice. No choice keeps the old behaviour (real place, old fee, no
      risk). Browser check in `e2e/live-action.spec.ts`. Limitation: the Budget Estimate still prices days at the
      base fee, whatever site is chosen.
  - Stage 7, live action, everything below now VERIFIED:
    - shot plans (`12-02.02`, `takes.ts`): each live-action scene of a new project is shot to a coverage (a master only,
      master and singles, full coverage) and a takes policy (one, a few, keep going). Both scale the scene's share of the
      day (master 0.7, full 1.4; one take 0.85, many 1.3), so richer plans need more shoot days. Coverage moves the
      editing score (master -6, full +5). Set on each day's call sheet;
    - takes (`12-03`): each take has a performance and a technical quality drawn from the world seed, centred 4 below
      the old single result so the default few takes match it on average (diminishing returns, never perfection). The
      cut uses the best balanced take; on the Edit page another can be used until picture is locked: the performance
      side feeds the performances, the technical side the direction. Projects from before keep one result per scene
      (`takesModel` unset). The production golden was regenerated: live-action and TV quality figures moved by a few
      points, with days unchanged;
    - browser checks in `e2e/live-action.spec.ts` (desktop, phone, WebKit iPhone).
  - Stage 8, documentary, VERIFIED: contributors' conditions on use (`14-02.02`, `documentary.ts`). An agreement can come
    with conditions drawn from the world seed (face not shown 25%, name not used 20%, approval of how they appear 20%;
    simulation assumptions), recorded and shown with the consent. A hidden face adds blurring work after lock that
    delivery waits for (`post:blur`); a withheld name is credited as such (documentary contributors are now credited
    "Featuring"); approval means showing them the locked cut (3 days), and a refusal holds delivery until their scenes
    are cut; unlocking picture means showing them again. Test helpers (`manage`, `contributorApprovals`) do what a
    producer would.
  - Stage 9, post, everything below now VERIFIED:
    - ADR and Foley (`15-04.02`), VERIFIED: new projects edit dialogue, record Foley and cut effects as three tasks
      (the units of the old single sound pass; a day or two longer for short works); the mix waits for all three.
      Dialogue is replaced (ADR) when there was no sound mixer or, on new projects, when weather spoiled a scene
      (`needsDialogueReplacement`); the dialogue edit waits for it. Production golden regenerated (days +1 to +3).
    - versions (`15-05.03`, `versions.ts`), VERIFIED: after lock and before delivery, a Festival Cut or Distribution Cut
      leaves chosen scenes out; it is a day of the editor's work that delivery waits for, has its own runtime (festival
      runtime rules read the version entered; the submission dialog offers it) and its own credits (people whose scenes
      it leaves out aren't credited on it).
    - additional work (`15-03.02`, `revisions.ts`): before lock, Revise Effects (the effects artist's days, the grade
      waits) or Re-Record Lines (a sound designer's day plus the performer's day rate, paid when booked; the sound waits).
      Once done, the assessment counts the scene's capture +5 or the performance +4, once (game calibration).
  - Stage 10, release, everything below now VERIFIED:
    - territories and exclusivity (`16-01.02`, `finish.ts offerScope/offerConflicts/exclusiveHolder`): offers cover the
      home country, a few large markets, or worldwide (streaming and digital); theatrical deals and wide streaming deals
      are exclusive; each extra territory adds a quarter to the guarantee (up to 2.5 times), and subtitles cost more. An
      offer says what accepting it ends; an accepted exclusive deal holds its territories for 365 days after release.
      Drawn from a separate seed stream, so the offers a film got before keep their distributor, route and window;
    - reported vs received (`16-04.02`, `distribution.ts`): six monthly reports after release; the 35% fee comes off
      first, the rest recoups the guarantee, and only the overage is paid. The Release page shows reported, after fee,
      recouped and received apart;
    - later windows (`16-05`): 120 days after a release, a new wave of offers for territories no exclusive deal holds
      and this route hasn't released.
  - Stage 11, career, VERIFIED (unit tests; `e2e/career.spec.ts` drives Proposals on desktop, phone and WebKit, and
    `e2e/connected.spec.ts` checks People You've Worked With after delivery):
    - relationships (`18-02`, `relationships.ts`): each person keeps a history with you (completed a project, let go,
      turned down their counteroffer). Someone who saw a project through takes 90% of their rate without haggling;
      someone let go once asks 115%, twice refuses; someone whose counter you declined won't go below their rate. No
      history keeps the old acceptance rule, so saves from before play as they did. Profile lists People You've Worked
      With; the hiring list says why someone will or won't.
    - opportunities (`18-03`, `opportunities.ts`): 45 days after a delivery received at 60 or more, a commissioner may
      propose to fund a new project of the same kind (half the time at 65, nearly always at 85; seed-decided; at most one
      per project; never from a project that itself came from a proposal). Open 30 days on Home (Proposals); accepting
      names and starts a project funded by a commissioner deal (85% income share, picture approval, 20% on delivery,
      deliver within 540 days, enforced by the existing finance deadline); declining closes it. Calibration is game
      calibration.
  - Stage 12, under way (`tests/depth-gaps.test.ts`): `03-01`, `06-02`, `07-02`, `10-01`, `15-04` now have tests of the
    rule. `08-01` was NEEDS REPAIR in practice: a role or part no available person could take was priced at nothing.
    `projectedCost(...).uncertain` now names them and the Financing card says the estimate can't price them.
- **Next:** the remaining IMPLEMENTED UNVERIFIED children (19: `03-04`, `03-05`, `05-03`, `05-04`, `05-05`, `09-03`,
  `10-02`, `10-04`, `10-05`, `11-03`/`13-03` puppet repair, `11-04`, `12-01`, `12-04`, `13-04`, `13-05`, `18-01`,
  `19-03` x2), then the package's playthroughs (`docs/depth/package/05-PLAYTHROUGHS-AND-ACCEPTANCE.md`). Missing:
  `20-02` (a per-feature source register for production rates) and `20-04` (journeys, added per stage).

### Newest Request (November 8, 2026, after #38): screen-by-screen review, then Identity from 1221

The owner is reviewing every screen in order with full-page captures (`docs`: none; captures are made per request and
kept out of the repository). The whole creation suite is done: screens 1 (start), 2 (Identity), 3 (Background &
Languages), 4 (Starting Point) and 5 (Review). The owner sends the big gameplay update next.

- **Starting Point fixes from the review:**
  - The When It Begins note no longer says "Any date in 2026."
  - The search field is "Town Or City" under the Where You Live heading, so the heading isn't said twice.
  - Featured cities are listed A to Z.
  - Choosing a place empties the search and settles the list (Place Of Birth does the same).
  - Map markers that would overlap a larger place's aren't drawn. The chosen place is a solid dot on the map.
  - The place is named once, in the "Chosen:" note.
  - The date and time boxes sit level, and the start is said in words.
- **Review fixes:**
  - The cards follow the steps' order.
  - Starts On reads like Starting Point: "Monday, January 5, 2026, at 8:00 AM GMT".
  - Each card has an Edit button whose name keeps the step.

- **Background & Languages fixes from the review:**
  - What you've chosen sits under the search, and describing your own comes last.
  - Adding a background or a language empties its search. Before, the chosen name stayed, over "Nothing matches".
  - Holidays are listed in the order they fall in your starting year.
  - The holiday copy says what the engine does: your projects don't work on them, not only don't shoot.
  - The Remove button for a language sits level with its proficiency box.
- **Jewish holidays (the owner's ask):**
  - Each holiday now keeps every day of no work, as kept outside Israel:
    - Pesach: its first two and last two days.
    - Rosh Hashanah: two days.
    - Shavuot and Sukkot (new): two days each.
    - Yom Kippur: one day.
  - The code is `spans` and `observanceDates` in `src/engine/observances.ts`. Every day reaches the calendar, Home and a project's working days.
  - Beta Israel is a new background. It suggests these holidays, and Hebrew and Amharic.
  - Shemini Atzeret was left out by decision: nothing beyond what was asked.
- **Results (screen 3):** `npm run check` (295 unit tests, startup 669 kB, within budget) and the complete production-build browser suite (151 passed, 27 skipped by design, 0 failed).

- **Identity fixes from the review:**
  - the place picker follows the chosen place (country list, map zoom and highlight);
  - "Place Of Birth" is said once;
  - the spacing under the country row;
  - a chosen place doesn't reload a list that pushes buttons down.
- **What 1221's Identity had, brought over with its effects** (`src/engine/identity.ts`, save version 6):
  - legal name in parts, which credits carry;
  - preferred name, used by Home, the rail, Profile and Saved Games;
  - citizenship from the place of birth, which decides public-fund eligibility with where you live;
  - headshot (Review, Profile, beside your credits);
  - 1221's picker copy.
  - Left out by decision: 1221's Race Or Ethnicity list (Background & Languages already does this with effects).
- **Found on the way and fixed:**
  - typing a city with another country chosen now also offers featured cities elsewhere;
  - New Script's two country lists have distinct screen-reader names;
  - the ported headshot picker re-saved without end under a parent that passes a new callback each render.
- **Results:** `npm run check` (292 unit tests, startup 668 kB, within budget), balance and perf, and the complete production-build browser suite (147 passed, 27 skipped by design, 0 failed).
- **Ethnicity and nationality (the owner's ask, after #40):**
  - Backgrounds mixed peoples (Yoruba, Ashkenazi Jewish) with nationalities (Nigerian, American). They're now asked apart, and you need at least one of each.
  - Ethnicity: peoples, plus 1221's broad groups listed first, or your own words. Words that are only a nationality left this list (`NATIONALITY_ONLY`).
  - Nationality: any inhabited country or territory, with your citizenship offered first. It isn't your citizenship and changes nothing legal.
  - Through `NATIONAL_LABEL`, a nationality brings what its word did: suggested holidays and languages, and a shared background in casting.
  - Save version 7. `migrateV6toV7` and old drafts turn nationality words into countries; with none, the nationality is the citizenship.
  - Then, at the owner's ask:
    - Ethnicity, Nationality and Languages are each one A to Z list. The broad groups sit among the peoples, and the citizenship is marked where it falls.
    - Every country and territory on the map has its own languages (`src/data/country-languages.ts`). 46 languages were added for them.
    - A nationality suggests its country's languages. Performers based in a country the pool had no entry for speak its first language, not English.
    - Script characters are written with an ethnicity and a nationality ("a Cuban woman": Afro-Latino, Cuba).
    - Performers carry both, split from the same draws, so no performer changed. Casting matches ethnicity to ethnicity and nationality to nationality.
    - `migrateV6toV7` converts script characters' nationality words too.
  - The language you use most empties its search once chosen, as every picker on the page does.
- **Results (ethnicity and nationality):** `npm run check` (303 unit tests, startup 678 kB, within budget) and the complete production-build browser suite (155 passed, 27 skipped by design, 0 failed).
- **Next:** the big gameplay update (the owner sends it), then the input audit (the owner's order).

### Earlier Request (November 8, 2026, after #37): decide the budget-size naming

- **Decided:** keep "Micro Budget" and the other names. It's the industry term for the scale, not a fixed sum.
- **Changed:** the New Script picker says "from $40,000" and describes each size's way of working (`projects.ts`,
  `Projects.tsx`).
- **Results:** the complete production-build suite: 141 passed, 27 skipped by design, 0 failed.

### Earlier Request (November 7, 2026, after #36): tune the micro budget

- **Measured first** (engine, 8 seeds each): at $40,000, micro stop motion delivered 0 of 8 at any length, 3D CG 0 of 8,
  and 2D drawn 6 of 8. Live action and 2D rigged delivered 8 of 8.
- **Four causes fixed:**
  - a studio fee that stopped time (`workday.ts`);
  - staffing that spent the animator's money first, now all or nothing (`hiring.ts`);
  - role combining that rarely happened (`hiring.ts`);
  - a Budget Estimate that ignored the script (`src/engine/estimate.ts`).
- Rates and material costs were not lowered.
- **After:** every micro case delivers 8 of 8 when funded to its estimate, and the two new balance families 30 of 30.
  Low-budget results are unchanged.
- **Results:** both complete browser suites: 141 passed, 27 skipped by design, 0 failed.
- **Naming:** decided on November 8 (above).

### Earlier Request (November 7, 2026, after #35): atomic genre catalog, more connected careers

- **Genre catalog loading** (`src/engine/genres.ts`): the whole catalog is built and checked before anything is
  published. A failed load leaves nothing half-loaded, a valid catalog survives a bad one, callers at the same time
  share one load, and a failure can be retried without duplicates. Tests: `tests/genre-catalog.test.ts` and
  `e2e/failures.spec.ts` (the damaged catalog, then Try Again).
- **Careers** (`e2e/careers.spec.ts`, seeds 11, 23 and 31, pinned and not changed to pass):
  - a TV season with a scene changed after filming and picked up;
  - stop motion refused for money, funded by an investor, then reopened through a data-load failure;
  - writing, producing and directing without acting, with a busy performer's refusal.
- **Defect found by the careers and fixed:** a reload followed by Continue opened the game read-only for up to six
  seconds (`src/ui/store.ts`, pagehide releases the lock).
- **Downloads:** reported separately in `docs/PERFORMANCE.md`. Startup JavaScript is 676,736 bytes; the background data
  fetched before a game opens is 826,260 bytes, about 107 kB gzipped.
- **Balance question for the owner:** a micro budget couldn't pay for a fully staffed stop-motion short. This was worked
  through after #36 (above).
- **Results:** both complete browser suites: 141 passed, 27 skipped by design, 0 failed.

### Earlier Request (November 7, 2026, after #34): input loss, startup size, connected journeys

- **WebKit input loss: found and fixed.** There were two causes, neither specific to WebKit:
  - **New Script:** focus moved a frame after the screen changed, so text typed in that frame was lost. Focus now
    moves in the same commit (`Shell.tsx`).
  - **Creation:** the world map grew after it was drawn and pushed Save And Return To Review away from a click. The
    placeholder is now the map's own box. Tests: `e2e/focus.spec.ts`.
- **Startup JavaScript:** 718,078 bytes became 676,736. The genre catalog and the seasons table now load in the
  background before a game opens, and a failed catalog shows Try Again. Details: `docs/PERFORMANCE.md`.
- **Connected career journey:** `e2e/connected.spec.ts` runs on desktop, phone and `iphone-15-pro-max`, all in
  emulation.
- **Reports reconciled:** this file, `QA-REPORT.md` and `docs/PERFORMANCE.md` now match the code and this pass's
  results. Both complete browser suites: 134 passed, 24 skipped by design, 0 failed.
- **Next startup candidates:** the legacy places' climate and the award rules, as `docs/PERFORMANCE.md` says.

### Earlier Request (November 7, 2026, review): believable, connected script rules

"Every field has an effect" wasn't enough: the review replaced the arbitrary effects merged in #33 (and some older
ones). `docs/SCREENWRITING-AUDIT.md` traces every recent field effect from input to outcome, says where the player is
told, and classes it as a real constraint, a labelled simulation assumption, a creative description, or a corrected
shortcut. In short:
- **Awards:** the producer places a part (Awards Placement, else role size), and story functions never do.
- **Content:** declared by issue and level, never a rating. Strong content gets late-slot broadcast offers or the full
  guarantee with a broadcast edit; GB and US watershed rules are cited.
- **Documents:** Pitch, Treatment and Statement Of Intent are explicit submissions, and anything missing names the
  empty fields. Text never buys time or quality, and presence-only checks are advisory prompts.
- **Structure:** Essential To The Story and the setups ledger (now on every scripted project) drive the Coverage card's
  choices: pickup, or Cut It From The Edit and Restore It.
- **Other:** shared backgrounds don't score; pronoun ordering is optional; the setting place adds no trip.

Two engine faults were found and fixed along the way:
- A scene cut from the edit held up assembly.
- A pickup asked for before the shoot was booked ahead of prep, was lost but still paid, and the project couldn't deliver.

Pickups now follow main photography. The script base is 42, calibrated to the balance suite, and saves need no
migration. Tests: `tests/script-effects.test.ts`, `e2e/script-rules.spec.ts`. Results: `QA-REPORT.md`. The WebKit
creation test that failed once on `main` after #32 (CI run 63) was explained and fixed in the next request.

### Earlier Request (November 7, 2026, final): every script field has an effect

Superseded in part by the review above: the effects listed here that the audit marks as corrected shortcuts were removed.

"Build all of them, and give the prose fields effects too." The audit had found script fields nothing read. Each now
drives something (`src/engine/script-effects.ts`; `docs/SCREENWRITING-AUDIT.md` has the full table):
story functions place a part in the leading acting categories, and a narrator records narration before the mix;
regulars are booked for and credited in every episode, and a guest written into two episodes gets a note (new
characters default to recurring); a new "Competes As" choice (or the genres) decides comedy or drama at awards;
the intended audience and the scenes set an age rating (18+ gets no TV offers; a family project can't approve an
intimate scene); a story setting place chosen at creation adds a scouting trip there; character pronouns are a choice,
and casting lists matching performers first; a turning point the shoot never captured costs the edit 6.
Prose is still never read for meaning: backers, festival entries and distribution need a logline and premise, a grant
also stakes and theme; a missing casting breakdown makes an offer's answer a day later; dialogue longer than its scene,
and a script far longer than its runtime, are notes; subtitling is priced by foreign-language dialogue words.
The rest of the prose counts by presence too: the conflict, point of view and ending
make a treatment (backers answer a week sooner), the tone or intended experience is the composer's brief and the story
setting the design brief (each missing brief adds a unit of that work), and a nonfiction grant asks for the central
question. Tone and story setting are now editable in the Story panel. Browser helpers write all of it
(`writePitch` in `e2e/helpers.ts`) before approving. Not built: editing the register
or the setting place after creation. Startup JavaScript went 194 bytes over the 700 kB budget; dropping `zoneMatches` (read by
nothing in the game; the migration report in `docs/world/` keeps it) from `src/data/legacy-places.json` brought it to
699 kB. The next startup growth has to be lazy-loaded or the budget reconsidered. Tests: `tests/script-effects.test.ts`.

### Earlier Request (November 7, 2026, last): every creation choice has an engine behind it

Backgrounds were the one creation choice nothing read. Asked, the user chose effects for them, "all that fits": holidays
you keep (`src/engine/observances.ts`: 27 observances, 29 since November 8, 2026, dated from existing holiday rules, suggested by backgrounds,
open to anyone; on the calendar and Home; copied into each new project's schedule, whose shoot days skip them),
authentic casting (performers in the pool have backgrounds, drawn last so no earlier field changed; script characters
can be written with backgrounds; a shared one adds 6 to that performance, never a penalty), and language suggestions
(`src/data/heritage-languages.ts`, loaded with creation). Holidays you keep are fixed after creation (Profile shows them;
editing them in game isn't built). Tests: `tests/heritage.test.ts`, `e2e/creation.spec.ts`. See `docs/UI-1221-LAYOUT.md`.

### Earlier Request (November 7, 2026, latest): pronouns settle the billing, as 1221's do

"The automatic actor/actress engine when choosing pronoun isn't there." It is now: `settledTitle` (`src/data/identity.ts`)
bills He/Him as Actor and She/Her as Actress with nothing to pick, and They/Them chooses (cleared when the pronouns
change, so a pick can't survive behind He/Him). `validateDraft` asks for a title only under They/Them, `newGame` takes
the settled title over anything stored, and `normalizeDraft` corrects older drafts. Games already started keep their
title. The award categories split by title (Best Actor, Best Actress) read it. Tests: `tests/creation.test.ts`,
`e2e/creation.spec.ts`.

### Earlier Request (November 7, 2026, later): 1221's creation suite, done

"I need that whole creation suite ... what's not there then don't add it." Creation now follows 1221's
`CharacterCreation.tsx`: Identity, Background & Languages, Starting Point, Review, keeping only what the engine
stores (see the table in `docs/UI-1221-LAYOUT.md`). `CREATION_STEPS` has four ids (`identity`, `background`,
`starting-point`, `review`); drafts saved with the eight-step ids or numbers reopen on the step that now holds those
fields. The place pickers show the world map (loaded with the World screen's file); creation itself now loads on first
use, so startup JavaScript went down to 687 kB. Browser helpers: `createCharacter` and `fillBirthDate` follow the new
steps; `e2e/creation.spec.ts` was rewritten for them (Review edits per step, invalid edits, a missing field at Start My
Story, Billed As following pronouns until chosen, the WebKit typing case, keyboard focus, reload, I Still Live Where I
Was Born). Local results: `npm run check` 220 tests, 0 problems; dev-server and production-build suites each 114 passed,
23 skipped by project design, 0 failed.

### Earlier Request (November 7, 2026): the 1221 layout, done

The user asked for the screens to be set up exactly like the `montrealroots/1221` repository and, asked to choose, picked
"look and layout": 1221's design, keeping Final SLATE's own game and engines, adding none of 1221's features (it is an
actor's life simulator with a school, a bank and tax papers). See `docs/UI-1221-LAYOUT.md`. 1221 was read, never
changed. `src/ui/app.css` is 1221's stylesheet whole, plus a short section for Final SLATE's own elements;
`tokens.css` is gone (1221's file holds the same tokens). The shell, the grouped rail and drawer, Home, page heads,
tab bars, dialogs, the start screen and creation follow 1221's markup. Browser-test helpers follow it too: `nav()`
uses the rail's buttons and reaches the calendar through Home's Open Calendar; `pressSaveAndExit()` opens the drawer
where needed; Home's heading is the greeting. Startup JavaScript is 697 kB of the 700 kB budget.
Two 1221 stylesheet faults were fixed here rather than copied: its drawer opened at a fixed 56px, over the second row
of a phone's bar, and its drawer shade was hidden by a later rule. Local results on the final code: `npm run check`
219 tests, 0 problems; dev-server suite 106 passed, 23 skipped by project design, 0 failed; production-build suite
106 passed, 23 skipped, 0 failed (run just before the drawer fix). Not checked: real phones, a person's judgment of
the look against 1221 beyond the side-by-side captures.

### Earlier Request (November 6, 2026, night): done

1. Verification: CI green through #23; full dev and production-build suites 96 passed, 21 skipped (project exclusions), 0 failed with the creation changes.
2. **Character creation: done** (merged in #24). Step registry `CREATION_STEPS` (`src/engine/state.ts`); drafts store a step id (older numeric and partial drafts are normalized by `normalizeDraft`); Review has one edit action per row, each to its own screen, and "Save And Return To Review"; Start My Story now keeps the messages on the screen it jumps to. WebKit input loss: the cause was focus moved to the heading one animation frame after a step change, taking focus from a field already chosen; focus now moves in the same commit (`e2e/creation.spec.ts` fails with the old code in WebKit, passes now). The test-side wait was removed.
3. **Import Save: done** (merged in #24), see `docs/STORAGE.md`.
4. **First-project journey and funding: done** (this checkpoint), see `docs/FIRST-PROJECT-JOURNEY.md`. A budget size is an estimate and a target, not money; backers (`src/engine/finance.ts`) decide over days, some refuse, terms are shown before acceptance and enforced after. Save version 5 keeps every existing project's money as an accepted "agreed before financing" deal with its approval rights. Engine test fixtures fund projects through a labelled `agreedFunding` helper (`tests/helpers.ts`); browser journeys fund through the Budget screen. `e2e/first-project.spec.ts` plays creation to a second project. Startup JavaScript is 695 kB of the 700 kB budget: little room left.
5. **Screenwriting connections: done** (this checkpoint), see `docs/SCREENWRITING-AUDIT.md`. Each customization is classified (creative description, structured choice, readiness check, modeled quality). Script quality can no longer be manufactured: free-text presence weighs little, revision passes and your own notes add nothing, readiness notes count only once resolved in the script ("Add To Revision Notes" now connects Readiness to revision notes). Fixed-seed golden results changed only in quality (script 5-9 points lower). The Story, World Rules, Readiness and Revision Notes panels say what SLATE does and doesn't read.
6. **Integration gaps: done for what was in reach** (this checkpoint).
   - Motion capture: booking dates every session (`MocapSession`), passing over dates when the performer is shooting (in any project), has another capture session, or the stage is taken for another character; sessions are on the shared calendar, run only on their dates, and a session the performer can't make is recorded as missed and rebooked. Body, face or both is chosen at booking: facial capture adds a rig cost per session and a facial solve before the character's animation, and is credited "Facial Capture", "Motion Capture" or "Performance Capture". Bookings from before this keep their price and run as before (no dates).
   - Replacements: captures and takes record who performed them; a performer released after contributing keeps their pay to date, is paid nothing more, and is still credited while their work stays in the film (`tests/mocap-calendar.test.ts`).
   - Rulebooks: San Sebastián 74th edition read and applied (2027 projected): 48 verified, 2 projected, 92 simulated of 142.
   - Holidays: Eswatini's Public Holidays Act found but its schedule is behind a bot check (not bypassed); recorded.
   - Startup files were over budget (702 kB): the Calendar, Place and Profile screens now load on first use (687 kB).
7. Acceptance journeys (part 7): done in later checkpoints (`e2e/first-project.spec.ts`, `e2e/script-rules.spec.ts`, `e2e/connected.spec.ts`).

### Earlier Request (November 6, 2026, evening): done

1. **Long-career storage: done** (this checkpoint), see `docs/STORAGE.md`. Measured 1-50-year engine careers (`tests/perf/career.perf.ts`): 19.8 MB at 50 years before. Save version 4 compacts finished editions (12.4 MB at 50 years). Saves now live in IndexedDB, gzip-compressed (1.3 MB per copy at 50 years), through the save vault (`src/engine/vault.ts`, `src/ui/idb.ts`): atomic commits, verified move out of localStorage under a Web Lock with conflict copies, a closing-page journal, localStorage fallback. Still open: competing films and projects keep growing (about 0.25 MB raw a year); real Safari/Firefox quotas unmeasured.
2. **Festival and award rules: done for what was readable** (this checkpoint). Recount: 37 institutions, 142 categories (the Emmys' Outstanding Movie replaced Outstanding Television Movie from 2026). 47 verified, 2 projected, 93 simulated (48, 2 and 92 after San Sebastián in #26). New rulebooks: Annecy 2026 (2027 projected), Venice 2026 (2027 projected), Berlinale 2027 competition (projected: undated page), Golden Globes 2027, Emmys 2026 (2027 projected). Untouched future editions in existing saves adopt published rules on load. TIFF and BAFTA refused this environment (HTTP 403) twice and stay simulated; see `docs/world/RULEBOOK-AUDIT.md`.
3. **Country and holiday detail: done for what was readable** (this checkpoint), see `docs/world/COUNTRY-DETAIL-AUDIT.md`. Every entry classified (193 UN members, 2 observer states, 2 limited recognition, 1 disputed territory, 51 territories with their sovereign, 2 historical). Suriname's holidays added from its Staatsblad (219 entries with rules; 27 playable without, each listed with what blocked it). Official English names shown beside original names where an official English list exists (Cyprus). The place screen says where its climate comes from (9 entries borrow or model it).
4. **Deterministic required journeys: done** (this checkpoint). No journey skips itself any more: `seededLife` (`e2e/helpers.ts`) fixes the world seed of a game made through the UI, so the documentary and unscripted journeys run with everyone agreeing (seed 2) and fail if anyone doesn't. Declines and withdrawals have their own journeys (seed 3: one documentary contributor declines; an unscripted participant withdraws before the shoot) and unit tests (`tests/media.test.ts`, `tests/unscripted.test.ts`). The game still draws every answer by chance. Remaining project exclusions are explicit `test.skip(project…)` lines.
5. **Production build and diagnostics: done** (this checkpoint). `SLATE_E2E_PROD=1 npm run e2e` runs every journey on `vite build` + `vite preview`. Every test now records console errors, page errors and failed requests (`e2e/test.ts`) and fails on any, except tests that inject failures (`expectErrors`). CI runs the suite on both the dev server and the production build. Still open: real devices and human feedback (below).

### Previous Request (done)

- Checkpoint A, montrealroots/Final-SLATE-Build#14; performance, #15 (`docs/PERFORMANCE.md`); storage, #16; rulebooks and save version 3, #17 (`docs/world/RULEBOOK-AUDIT.md`).

### Coding Gaps

1. **M2 follow-ups:** none open. Map markers are keyboard buttons ("Open {place}"); the repair screen for unresolvable places is done.
2. **M3 follow-ups:** holiday names stay in the official language unless an official English source gives one (field `en`, so far Cyprus); 32 more countries with non-Latin names need such a source (China, Korea and Georgia were tried; see `docs/world/COUNTRY-DETAIL-AUDIT.md`). Holidays are national or first-level-regional only; local (city) holidays are not included.
3. **M4 follow-ups:** Export Save is offered for every saved game and next to a failed save. The weather warning now uses "Rain is expected during your exterior shoot." and offers "Film an Interior Scene" only when an interior day is scheduled; "Move the Shoot" moves the day to the first free working day after the shoot, if everyone on set is free.
4. **M5 follow-ups:** none open in code. Since #26 capture sessions are dated and on the calendar, pass over the performer's shoot days, and are rebooked when missed; body, face or both is chosen at booking; a replaced performer keeps the credit while their work stays (`tests/mocap-calendar.test.ts`).
5. **M6 follow-ups:** none open in code. The category audit (`docs/world/CATEGORY-AUDIT.md`) marks 48 categories Rules verified and 2 Rules projected; the rest still only match published names (research, below).
6. **M7 follow-ups:** a manual screen-reader pass (automated checks only so far); production timings (budgets are measured on the dev server).

### Research Still To Do

- Festival and award rulebooks: 92 of 142 categories still use simulated rules. TIFF and BAFTA Film need their organizers' documents read from a network that can reach tiff.net and bafta.org; then the rest listed in `docs/world/RULEBOOK-AUDIT.md`. Each needs its organizer's document for the edition in play; add a new rulebook version, never edit one an edition already uses. European Film Awards eligibility differs slightly (see the category audit). Dates: Annecy 2027, BAFTA 2027, WGA, Series Mania and Hot Docs 2027 are still planning dates.

### External Or Manual (never blocks other work or future years)

- **Physical devices:** iPhone 15 Plus and 15 Pro Max in real Safari. Emulation runs in CI; a person with the devices must do the rest.
- **Human enjoyment and balance feedback:** the questions in `BALANCE-REPORT.md`.
- **Unpublished official information:** China's 2027 holiday notice (not out as of November 6, 2026), future Islamic announcements, future festival dates. The game uses projected dates, labelled, until these exist.

## Known Limits That Are Deliberate

- No tutorial, taxes, housing, banking, visas or attribute progression.
- Rules are simulated and labelled as such, except where `docs/world/RULEBOOK-AUDIT.md` lists organizer rules.
- Saves are local to the browser (IndexedDB, or localStorage where it isn't available). Export Save is the copy outside it; Import Save brings one back (`docs/STORAGE.md`).
