# Resume Here

Read this first. It lists what is finished, what the Gap Completion Package still needs, and the order to do it in. There is no need to reread the package or redo finished work.

## Standing Rule

At every stopping point, open a pull request into `main` and merge it (see `CLAUDE.md`, certified by the user on November 6, 2026). Never merge red checks.

## State

- **Branch:** `claude/clever-archimedes-x0r26v`, pushed to https://github.com/montrealroots/Final-SLATE-Build. After each merge the branch restarts from `main`.
- **Merged checkpoints:** montrealroots/Final-SLATE-Build#1 (base build), #2, #3 (gap fixes before the package), #4 (M1), #5 (M2), #6 (M3 and M4), #7 (M5), #8 (M6), #9 (M7), #10 (repair screen, Export Save), #11 (Move the Shoot, keyboard map markers, category audit), #12 (save recovery and validation, dates, processing rollback, ledger checks), #13 (production module split, CI budgets and balance), #14 (cross-save reliability fixes, CI browser-install resilience; merged as `7c7d15e`), #15 (faster rollback snapshots, smaller startup files; `2633269`), #16 (two-copy saving, recovery copies, full-storage handling; `19b513f`), #17 (organizer rulebooks, save version 3, CI in the Playwright image; `36da91f`), #19 (long-career storage: IndexedDB save vault, save version 4; `1c5f802`), #20 (rulebooks for Annecy, Venice, Berlinale, Golden Globes, Emmys; `4fa5d27`), #21 (country classifications, Suriname holidays, English names, climate source; `cb23eca`), #22 (deterministic journeys, production-build runs, browser diagnostics; `3a84bf3`), #23 (production-build suite in CI; `b2d7b31`), #24 (character creation fixes, Import Save; `e26d71d`), #25 (financing: money from backers, save version 5), #26 (screenwriting audit, dated motion-capture sessions, replacement credits, San Sebastián rules), #27 (the 1221 layout), #28 (1221's creation suite), #29 and #30 (pronouns settle the billing), #31 (backgrounds: kept holidays, casting information, languages), #32 (language suggestions for every background but Assyrian), #33 (script field effects), #34 (script rules review; `6e2abf0`), #35 (input loss, startup size, connected journey; `c00c261`), #36 (atomic genre catalog, careers, reload lock; `5e142f4`), #37 (micro-budget tuning; `fddd6b6`), #38 (budget-size wording; `b025147`), #39 to #41 (screen review, identity, depth stages 1 to 4), #42 (depth stages 5 to 8; `cfe7d71`), #43 and #44 (action previews audit, remaining browser journeys; `37123f5`). `main` was at `3845c2d` when the Gap Completion Package was applied.
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

### Newest Request (November 10, 2026, after #59): the Original Song loop, episode release edges, rolling delivery, UI evidence

What was done:

1. **Original Song, played through.** `e2e/journey-c.spec.ts` (seed 8) plays the whole loop with no award state written:
   - songs written, commissioned, licensed and placed, with a Distribution Cut swapping one song;
   - delivered, then a real US theatrical offer accepted and released;
   - entered once entries open: the licensed song is refused, three songs are entered and a fourth is refused by the
     limit of three;
   - the score's composer is never credited for a song;
   - at most two nominations, then the results;
   - snapshots identical after Save And Exit and Continue.
2. **Episode release edges.** `tests/episode-release-edges.test.ts` covers airings that no longer depend on record
   order, calendar ids, the 9 AM rule, repeated edits, provisional to judged, v8 saves, and territory codes. See
   `docs/RELEASE-SCHEDULES.md` (Changed After #59).
3. **Rolling episode delivery.** `src/engine/episode-delivery.ts`, and the Edit tab's "Delivering Episode By Episode"
   card. An undelivered episode on its day is held back, says so, and waits for a new date. The season is still
   delivered whole with Deliver Project. Evidence: `tests/episode-delivery.test.ts` and `e2e/rolling-delivery.spec.ts`
   (desktop, phone).
4. **UI evidence.** 55 to 73 of 132 decisions have a browser journey (`e2e/decisions.spec.ts`; `docs/INPUT-AUDIT.md`).
   `CONTROLS.csv` now says whether each is targeted or a playthrough, and what it proves.
5. **WebKit:** no new failure since #59, so no new evidence. Still open; the diagnostics stay on.
6. **Performance:** startup 671 / 214 kB; Continue 390 ms, New Game 1,113 ms (`QA-REPORT.md`).

Next:
- 59 decisions are still engine-only, listed in `docs/INPUT-AUDIT.md`. The largest groups are script detail fields (36)
  and production capacity, whose consequences need weeks of production to show.
- Rolling delivery: credits and the assessment are still settled at season delivery, not per episode. An episode's
  award entry before the season is delivered uses the episode's airing, but credits come from the season.
- Journey C checks the song snapshots across a reload, not after an edit, because a delivered film's songs can't be
  edited. `tests/songs.test.ts` "an entry keeps the song as it was entered" covers both: the edits are refused, and a
  record changed directly doesn't reach the snapshot. It was mutation-checked: storing the song itself fails it.

### Earlier Request (November 10, 2026, after #58): gameplay connectivity, release schedules, WebKit title, startup, journeys

The owner asked for six things in order. What was done:

1. **Every control classed, and each decision compared.**
   - `docs/input-audit/CONTROLS.csv` holds 221 controls, guarded by `tests/input-audit.test.ts`.
   - `tests/decision-effects.test.ts` changes one choice at a time.
   - `docs/INPUT-AUDIT.md` has a trace for each area the owner listed. No broken link was found.
2. **Episode release schedules.**
   - Presets you edit, a schedule for each release, planned against released, and events with no duplicates.
   - They reach the calendar, exclusive windows, the airing rule and each episode entry's window.
   - Entries keep the dates they were entered with, and a change is previewed before it is made.
   - Save version 9 marks the dates of older saves as assumed. See `docs/RELEASE-SCHEDULES.md`.
3. **WebKit title loss: still open.** No cause found and nothing in the app changed for it. `e2e/title-input.spec.ts`
   passed 123 times this session. The attempts are in `QA-REPORT.md` (Open). The WebKit focus-and-input log stays on.
4. **Startup.**
   - 694 kB / 222 kB gzipped down to 667 / 213: the place search now loads with the screens that search for a place.
   - `main` was at 685 / 219; the budget is unchanged.
   - What a browser fetches before first use is in `docs/PERFORMANCE.md` (`scripts/perf-first-use.mjs`).
5. **Journeys.**
   - A: `journey-a.spec.ts`, from the script to a festival result and a reload.
   - B: `release-schedule.spec.ts`.
   - C: `journey-c.spec.ts`, songs played through production.
   - D: `journey-d.spec.ts`, one choice compared through the UI.
   - E: `journey-e.spec.ts` with `careers.spec.ts` and `failures.spec.ts`, refusals and their recovery.

Next:
- 77 of the 132 decision controls have unit evidence only. Their rows in `CONTROLS.csv` have no journey. Add journeys
  where a player would notice the choice.
- The release schedule doesn't model a territory holding another back, or episodes airing out of order.
- When the next CI run fails on WebKit with an empty title, read its `focus-and-input.txt` first.

### Newest Request (November 9, 2026, after #55): every saved field is read

The owner asked for an input audit, then: "Everything that doesn't read needs to read perfectly."

- Done: every field of the saved game has a reader, held by `tests/model-readers.test.ts`.
  - The four inputs that changed nothing now do: primary genre, setting place, shortlist, thread characters.
  - Records are shown where the player would look for them.
  - Nine copies and dead fields were removed.
  - See `docs/INPUT-AUDIT.md`.
- Next, when adding a field to the saved game: give it a reader in the same change, or the check fails.
- Open: the intermittent WebKit loss of a working title (`QA-REPORT.md`, Open). From after #56, a failing WebKit journey
  attaches `focus-and-input.txt` (focus, `focus()` callers and input events): read it from CI's `playwright-results`
  artifact the next time it happens.

### Newest Request (November 9, 2026, merged as #55): the owner's recovered awards and festival sources

Ten organizers' sources, recovered by the owner's research pass, read again here where this environment could reach them,
and applied rule by rule (`src/engine/rulebook-data.ts`, the "Recovered sources" section; tests in
`tests/recovered-rules.test.ts`; journeys in `e2e/awards.spec.ts`, the last three). `docs/awards/RULES.csv` is the
rule-by-rule record (organizer, edition, categories, rule, status, the rule in brief, source, URL, read date, code line,
tests), generated from the data by `tests/rule-records.test.ts`; `docs/world/RULEBOOK-AUDIT.md` "Recovered Sources" says,
organizer by organizer, what was applied and what wasn't and why.

- **International Emmys** (`@2` for 2026; 2027 projected): the 2026 Rules & Regulations PDF, which corrects "no
  eligibility period published". Hanging episodes use SLATE's airing model (`awards-rules.ts` `episodeAirDates`: a
  broadcast weekly, streaming all at once), as releases have one date. The 2026 edition used to open after its deadline.
- **European Film Awards, 39th** (`european-film-awards-2026@1`): corrects "no dates". First screening window, two
  submission periods by first screening, European directors and recipients, 13 of 21 European points (from credits and
  base), a selection or three countries, documentary 70 and animation 60 minutes, shorts on their own scheme.
- **BAFTA 2027, TIFF 2026, SXSW 2027 (`@2`), Busan 2026, DGA documentary (`@5`), FESPACO 2027, AMAA 2026**: see the audit.
  Busan and SXSW now hold their organizers' dates (`RuleBook.held`).
- **Unresolved, recorded and not applied** (`RuleBook.unresolved`, `GAPS`): FESPACO's dates and deadline (source
  conflict); AMAA's release wording (ambiguous) and edition; Blue Dragon and Locarno (unavailable). BAFTA's and SXSW's
  pages, the DGA documentary preview page and AMAA's FilmFreeway page refuse this environment: their rules come from
  search excerpts of the organizers' own pages and the owner's pass, with that provenance in the source titles.
- **UI**: category rows read the chosen project's own deadline (the EFA's second period was hidden); "Rules Not Read"
  shows only where the game's rules apply; the "How These Rules Apply" notes are shown without the documents' section
  numbers and with the game named as the game.
- **Evidence**: `npm run check` at `f7c8073` (580 tests); `tests/recovered-rules.test.ts` and 12 mutants; the full
  production-build suite at `091cb21` (241 passed, 32 skipped by project, 0 failed). CI on the PR's final head decides the
  merge. Open: the intermittent WebKit title loss (`QA-REPORT.md`, Open).


### Newest Request (November 9, 2026, after #54): screen time from the cut, episode assessment, songs as works

All three are implemented, tested in the engine and in the browser (desktop and WebKit), and documented. What each does:

1. **Screen time from the finished edit** (`src/engine/screen-time.ts`; Edit tab, Screen Time). The player records each
   cast part's minutes on screen and heard only, per scene of the cut (the game has no footage to measure). A record is
   at most the scene; several parts may share minutes; heard-only is kept apart and never counts toward time on screen.
   An unrecorded scene is unknown, a range from nothing to the whole scene; a record a later script change made too long
   counts as unknown. The Emmys' 5% rule (`emmys-2026@4` `screenShare`) now reads it: per episode (the entry's, or the
   part's best) or for the whole cut entered, versions included; met, missed, or open with what to record. Prepare
   Submission shows the calculation. Tests: `tests/screen-time.test.ts`.
2. **Episode-specific assessment** (`finish.ts` `assessQuality(state, p, episode)`, `assessEpisodes`). Delivery locks
   each episode's own assessment: its scenes, captures, shoot days, setups it plants or pays, writer, director, crew
   hired for it, and the cast in it; season-wide work counts for every episode; no random draw (reception carries the
   season's margin). New for season and episode alike: a hired episode writer or director moves that episode's script or
   direction by (capability - 50) / 4; your own work is the baseline, so films and player-made seasons are unchanged
   (balance suite unchanged). Entries naming an episode are judged on it; projects delivered earlier fall back to the
   season and say so. Tests: `tests/episode-assessment.test.ts`.
3. **Songs as works** (`src/engine/songs.ts`, `song-actions.ts`; Production tab, Songs; the script's Songs In This
   Scene; the Versions card). Title, origin (written, commissioned, existing, or not recorded for old saves), rights
   (production, public domain, licensed with its holder), writers (music and lyrics apart, credited to whoever did the
   writing task), performers (cast parts or named artists), uses per scene with placement and minutes, and per-version
   removal or replacement. Writing (you or a hired songwriter and lyricist), recording (a music producer; before the
   shoot when performed on screen) and one clearance per licensed song are tasks. Credits: "Song Music By" / "Lyrics
   By" / "Written By" and "Performed By", apart from the score composer. Original song awards take one song written for
   the work, to its writers; Oscars Rule Nineteen applied (`oscars-2027@4`: up to three writers, October 14 deadline).
   Save version 8 migrates old scene songs to songs with unknown origin and writers. Tests: `tests/songs.test.ts`.
4. **Entries keep what they were entered with** (`EditionEntry.snapshot`, shown as As Entered): runtime, score, how
   it was judged, recipients, screen-time calculation, song. Judging reads the snapshot's score. Re-entry after a
   withdrawal records `revises`.

The Limits listed when #55 was opened were then worked through ("Continue the rule research while CI runs while fixing
the things in Limits", November 9):
- **Several songs per song category:** entries compete as `projectId~songId` (`awards.ts` `entryKey`, `keyProject`), so each
  song has its own selection, nomination and result; the Oscars cap three songs per film entered and two nominated
  (`maxSongs`, `maxNominatedPerWork`); the CSA two per film and one per team of writers (`oneEntryPerTeam`). The entry
  dialog marks songs already entered.
- **End-credit order and "essentially equal":** end-credit uses carry a cue (`SongUse.cue`; Play It First under Songs); the
  Oscars take only the first new cue (`endCredits: 'first-cue'`), the CSA none (`'never'`). Writing days are recorded per
  writer on song tasks (`Task.workerDays`, `SongCredit.days`); a writer with under half the main writer's days is a
  partial contributor (`essentiallyEqual`, SLATE's measure), and the Emmys drop writers under 20% (`minShare`).
- **Other organizers' song rules:** the Globes (`golden-globes-2027@5`), Emmys (`emmys-2026@5`), Goyas (`goya-2027@3`: 30
  seconds at once or 60 in all), CSA (`canadian-screen-2026@2`) and AACTA (`aacta-2027@2`: 15 seconds, no TV title theme).
- **Rules by format** (`CategoryRules.byFormat`, `categoryRules(ed, cat, p)`): the WGA's Paul Selvin (`wga-2027@3`), the
  Spirit Awards' Redford (`spirit-2027@3`) and the AACTA's shared categories (song; then `aacta-2027@3` soundtrack, hair and
  makeup, visual effects, with the soundtrack's five songs heard five seconds each and the music supervisor as recipient).
- **More rules read:** the DGA's Michael Apted first-time feature award (`dga-2027@3`), the AACTA's online series
  (`aacta-2027@4`), Series Mania 2027's four competitive sections (`series-mania-2027@1`). Rule counts: 541 verified, 11
  projected, 254 simulated (`tests/rulebooks.test.ts`).
- **CI on #55 (run 131) failed** in the festival journey (`e2e/journeys.spec.ts`): it set the quality fixture after the
  entry, and judging now reads the entry's snapshot. The fixture moved before the entry.

Still not modeled: screen time is the player's record, not a measurement (the game has no footage). Blocked research,
tried again on November 9: TIFF, BAFTA and SXSW eligibility (HTTP 403); the International Emmys (no eligibility period
published on their pages); Locarno 2027 (not published; the festival may move to July); the DGA's Documentary Film page
(HTTP 404); Busan, FESPACO, Blue Dragon and AMAA (not found); the European Film Awards (no dates). The queue is in
`docs/awards/STATUS.md`.

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
  - Stage 12, under way. Every IMPLEMENTED UNVERIFIED child but the two `19-03` audits now has a test of its rule
    (`tests/depth-gaps.test.ts`, `tests/depth-gaps-production.test.ts`, `tests/relationships.test.ts`,
    `tests/stages.test.ts`, `e2e/career.spec.ts`, `e2e/connected.spec.ts`). Seven were repairs, not only tests:
    - `08-01`: a role or part no one available could take was priced at nothing. `projectedCost(...).uncertain` names
      them, and the Financing card says the estimate can't price them.
    - `09-03`: an unanswered counteroffer held the part and its money for good. It now lapses after 7 days
      (`hiring.ts COUNTER_OPEN_DAYS`, `counter-lapse`); letting it lapse isn't recorded as turning them down.
    - `13-05`: a pickup in a hybrid project left finished plate integration on the old plate. It now restarts the
      episode's integration (`finish.ts pickupIntegration`, in `edit-actions.ts` since November 8, 2026), and the Coverage card previews the compositor days.
    - `03-05`: nothing explained a project's stages before it began. The New Script form lists them
      (`src/engine/stages.ts`).
    - `03-04`: same-title projects looked identical in the lists. They now show when each was started, and which of
      that title it is when two share a day.
    - `10-02`: staffing said "no available candidate fits the remaining budget" when no one was free at all. It now
      tells the two apart.
    - `19-03` (disabled actions): seven controls gave no reason; each now says, and `tests/disabled-reasons.test.ts`
      lists every disabled control with where its reason shows, failing a new one until recorded.
    - `20-02`: `docs/depth/PRODUCTION-SOURCES.md` records every production, money and career calibration per feature
      as a labelled model (no primary source was used for any), ratcheted by `tests/production-sources.test.ts`.
    - `20-04`: the package's features have browser journeys (negotiation, auditions, season, shot plan and takes,
      proposals, earnings); versions, territories and later windows are unit-tested only.
    - Playthrough families: `docs/depth/PLAYTHROUGHS.md` maps the package's fifteen to the journeys that run them and
      names what none runs. Mapping it found that a documentary contributor couldn't withdraw after filming; that is
      now modeled (`unscripted.ts withdrawRelease`, `doc:redact`), unit-tested in `tests/restrictions.test.ts`.
  - Ledger now: 149 verified existing, 77 verified, 1 implemented unverified, 2 external blockers, 0 missing.
  - After #43 (November 8, 2026):
    - `19-03` previews: an audit of every engine action the interface calls (read with the TypeScript parser, so
      helpers count) found eight that spent money or time with no preview; each now has one, and
      `tests/action-previews.test.ts` records every spending action with where its preview and outcome show.
    - The six behaviours that only unit tests covered now run in the browser: rain stopping an exterior day
      (`journeys.spec.ts`, pinned seed 2), a damaged puppet repaired (seed 2), a capture session missed and rebooked
      (the clash is a labelled save fixture), a documentary contributor withdrawing after filming, festival withdrawal
      and resubmission (the fee paid once), and an exclusive offer ending a competing one (`connected.spec.ts`).
  - Ledger: 149 verified existing, 78 verified, 2 external blockers; nothing unverified or missing.
- **Next:** nothing from the package is left but the owner's acceptance and real-device checks (`19-05.03`, `20-05`).
  Versions entered at festivals (`15-05.03`), later distribution windows (`16-05`) and plate integration restarted by a
  pickup (`13-05`) were unit-tested only until after #45; each now has a browser journey (below).

### Newest Request (November 8, 2026, after #44): estimates that follow the work, contextual directing

- **Estimates** (`estimate.ts`, `cost-cuts.ts`, `production/schedule.ts`; notes in `docs/depth/ESTIMATES-RESEARCH.md`):
  - One rule (`groupShootDays`) makes the days the estimate counts and the days the schedule plans.
  - What It Costs on the Budget page splits money into spent, agreed, held, still to come and contingency, each
    counted once. It lists what makes it expensive and every line with its driver, what is uncertain and how to
    resolve it, and what the contingency is for.
  - Unavailable people are priced at the lowest rate, never as free.
  - Approving a changed draft first shows the estimate and shoot days before and after, and the agreements that stay
    (`approvalScope`, run on a copy of the game).
  - Ways To Cost Less gives shoot days too.
  - The estimate by area is stored at approval (`finance.estimateAtApproval`) and compared with spending, with the
    reasons for each difference.
- **Directing** (`takes.ts` v2, `directing.ts`, `edit-actions.ts`; notes in `docs/depth/DIRECTING-RESEARCH.md`):
  - New projects carry `directing: 2`; older ones keep the earlier rules and footage.
  - What a scene needs comes from its facts and the emphasis. Missing coverage costs the edit; surplus costs only time.
  - Takes follow a rule (one; until one is usable; five). They can show a performance, camera or sound problem.
  - The Edit page's Dailies card offers fixes with their costs: another take, replaced lines, a targeted pickup
    (refused without the money), or accept.
  - The edit-room actions moved into a page module to keep startup JavaScript in budget (689 kB, 218 kB gzipped).
- **Ledger:** 250 children (149 verified existing, 99 verified, 2 external blockers). The new ones carry a detail record:
  player control, prerequisites, rule, cost, downstream, failure, save, research.
  `tests/depth-ledger.test.ts` fails a detail record with a part left empty.
- **Journeys:** `e2e/live-action.spec.ts` runs on desktop, phone and both WebKit iPhones. It covers the estimate,
  alternatives, a scope preview kept back, spending against the estimate, a lighter plan, the dailies, and a save
  and reopen. In `e2e/careers.spec.ts` the player's own heavier plan now makes the day overrun.
- **Limits:**
  - The browser journey took only the accept route in the dailies until after #45; it now books a pickup too (below).
  - No primary source was found for the estimating process.
  - Rest between shoot days is not modeled.

### Newest Request (November 9, 2026, after #47): finish the awards expansion; resolve the motion-capture CI failure

The owner's eight parts, in order. Statuses are kept apart in `docs/awards/STATUS.md` (generated with
`docs/awards/LEDGER.csv` by `tests/awards-ledger.test.ts`; regenerate with `LEDGER_WRITE=1 npx vitest run
tests/awards-ledger.test.ts`).

1. **CI failure: done.** montrealroots/Final-SLATE-Build#48 merged (`507096c`): the journey had asserted a state half the
   worlds never show; engine invariants hold across seeds (`tests/mocap-progress.test.ts`). The failing run's seed and
   trace weren't available. QA-REPORT.md has the analysis.
2. **Qualifying routes: done** (this branch). `QUALIFYING_LISTS` in `src/engine/qualifying-lists.ts`: the Academy's
   99th shorts, documentary feature and International Feature lists, award by award, with window, source section and
   what SLATE doesn't hold. `oscars-2027@2`; committee one film per country; documentary route 3; later years projected.
   Tests: `tests/qualifying-routes.test.ts`; journeys in `e2e/awards.spec.ts` (an Annecy audience award that doesn't
   qualify, then the Cristal; International Feature by a Silver Bear that doesn't and a Golden Lion that does, one film
   per country). No other qualifying-prize route exists in the game (audited: Spirit, Gotham, AMAA and the European Film
   Awards count a festival premiere as a release, a screening route, not a prize).
3. **Rule research: in progress.** Rulebook data loads with the catalog (`src/engine/rulebook-data.ts`), so startup
   stays at 214 kB gzipped. Read on November 9 (after #47): the Emmys' general eligibility for every entered category,
   the Berlinale's five other sections (projected; European-premiere rule), Cannes' four feature sections (projected),
   Annecy's other four, Venice's Out of Competition, Spotlight and the Giornate degli Autori, San Sebastián's six other
   sections, the Golden Globes' other 19, the Annies' other 20, Clermont's Lab and National, Sitges (6), IDFA (5), Hot Docs
   (with its 2027 dates), the Canadian Screen Awards (115), the Goyas' 23 feature categories and the Césars' 25.
   After #50: the Spirit Awards (20), the Actor Awards (13), the DGA's feature award, the WGA (16), the Gothams' ten
   film categories and the PGA's two film awards. Organizer's rules for at least one edition: 457 of 806 categories, 11
   projected only, 338 on SLATE's rules (the four categories the nonplayable review entered: Outstanding Narrator read,
   the other three on terms not readable from here). Refused or unavailable here: TIFF and SXSW (HTTP 403), Venice's Critics' Week (HTTP 503 until it answered later on
   November 9 and was read: `venice-2026@4`) and
   AACTA's entries page (HTTP 503), the International Emmys' rules page and the DGA's other guideline pages (HTTP 404), no
   current Series Mania competition rules, and the rosters recorded as blocked (Busan, Locarno, FESPACO, BAFTA, AMAA, Blue
   Dragon). The European Film Awards' regulations were read but have no dates and test things SLATE doesn't record
   (European-elements points, release in three countries); see the audit. **Resume at the first id of the research queue
   in `docs/awards/STATUS.md`**: what is left is mostly those blocked or undated organizers, the Japan Academy (its
   rules weren't found; only a press release), the Goyas' European, Ibero-American and short awards (their own Bases),
   the WGA's Documentary Screenplay and Selvin pages, the PGA's documentary and television rules, and the Emmy and
   Gotham honorary-or-mixed categories. Each read adds a new rulebook version and a test in `tests/rulebooks.test.ts`,
   and the audit count there moves.
4. **Nonplayable entries: reviewed.** `docs/awards/NONPLAYABLE-REVIEW.md` (generated from the rosters; a test fails an
   entry it doesn't list) groups all of them with what each recognizes, whether SLATE has it, what is missing and the
   decision. Four reasons were false. Entered: the Emmys' Outstanding Narrator, SXSW's Music Video Competition and its jury
   award, and the International Emmys' Sports Documentary (806 categories). Corrected and still out: the Television Academy
   Honors (call for entries unread), the Ustinov award, the Annie anime category. 123 remain out, each with a reason.
   Within reach once read: the Honors' call for entries (the Social Issues subject exists), the Ustinov terms (needs an
   entry path for an unproduced script), the Annie anime definition.
5. **Recipients and work-specific rules: in progress.** `docs/awards/RECIPIENT-RULES.md` lists every rule with its status.
   Applied after #50: narrators out of the Emmy performer categories, the guest and short form episode shares
   (`emmys-2026@3`), the dialogue share for International Feature and the Globes' Non-English Language (`oscars-2027@3`,
   `golden-globes-2027@3`), and a fix: a co-production partner signed in Financing now counts. Tests:
   `tests/recipient-rules.test.ts`. After #51: directing and writing entered for one episode (`emmys-2026@4`), with the
   entry's episode stored (`EditionEntry.episode`, declared since the first engine commit and read by nothing until now).
   The limited series' part or whole, Guest Performer Eligibility, the 5% screen-time minimums and the Globes' box-office
   threshold are applied too (`emmys-2026@4`, `golden-globes-2027@4`). What remains Not modeled in
   `docs/awards/RECIPIENT-RULES.md` needs something SLATE doesn't record (dialects, a co-production partner's country, a
   head writer's choice, streaming viewership). Part 3 since: Critics' Week (`venice-2026@4`), SXSW's deadline
   (`sxsw-2027@1`), the Goyas' specific Bases (`goya-2027@2`): 463 of 806. After #51: the PGA's documentary award, the
   WGA's Documentary Screenplay, the DGA's television awards, the AACTA (31), the Japan Academy (17) and the International
   Emmys' deadline: 520 of 806. While #53's CI ran: the PGA's nine television awards (`pga-2027@3`), from the 2027
   rules found by search after the guessed URLs had returned 404, with a new rule for the average episode's running time
   (`episodeRuntime`); it fixed the Spirit Awards' and Actor Awards' episode floors, which version 1 of each held against
   the whole series and so never refused one (`spirit-2027@2`, `actor-awards-2027@2`): 529 of 806. SXSW's policy pages
   still refuse this environment (403). **Next:** the research queue in `docs/awards/STATUS.md`; what remains is mostly refused
   or unpublished (TIFF and BAFTA 403; Busan, Locarno, FESPACO, Blue Dragon, AMAA not found; the European Film Awards'
   regulations have no dates).
6-8. Reports are updated at each checkpoint; journeys still owed: supporting/guest TV performance, episode-specific
   writing or directing, songs if implemented, honorary outside submissions (exists), a historical result across an
   edition change (exists for the Annies), all on desktop and WebKit.

### Newest Request (November 9, 2026, after #46): complete awards and festival coverage (done)

The owner asked for every institution already in the game (37: 16 festivals, 21 award bodies; 142 categories before)
to get its complete official roster, edition rules and connected gameplay. Done in dependency order:

1. **Research** (`docs/awards/roster/<id>.txt`, format in its README): 37 roster files, each with its edition and the
   official pages read (URL, retrieval date). Five organizers' sites were blocked here and are recorded as blocked, not
   bypassed: BAFTA (film and television), AMAA, Blue Dragon, Busan and Locarno (and FESPACO's domain no longer serves
   the festival). `UNVERIFIED:` notes mark what wasn't read.
2. **Catalog** (`tools/awards/build.py` → `src/data/institutions.json`, `docs/awards/INVENTORY.md`, `COVERAGE.csv`):
   802 playable categories (660 new, 60 renamed to their official names, every earlier ID kept), 125 official
   categories recorded as not playable with the reason. CI runs `python3 tools/awards/build.py --check`.
3. **Engine** (`docs/awards/DESIGN.md`): category kinds (award, area, juried, section, prize, audience, partner,
   honorary); requirements read from the project (competes as, source, story era, subjects, origin, debut, runtime,
   budget, release); recipients only from credits (crafts by role, songs, guests, hosts, the director for a national
   entry); per-craft quality at delivery; results stored only where the player is involved and computed when shown
   otherwise; prizes decided among a section's selection; one, several or no winners for area and juried awards;
   special mentions; honorary awards from a career; national committees; disqualification. `awards-rules.ts` and
   `awards-results.ts` load with the catalog, keeping startup JavaScript at 686 kB (219 kB gzipped).
4. **UI**: the event page groups categories under the organizer's headings with Project, Show, Format and search
   filters; rows say how each is decided and who receives it; statuses In Competition, Selected, Nominated, Winner,
   Special Mention, Did Not Win, Withdrawn, Disqualified, and Honorary in the Profile; the Story panel declares Source
   Material, When It Is Set and What It's About.
5. **Ledger and tests**: `docs/awards/LEDGER.csv` (one row per category: roster, rules, engine, recipients, UI, save,
   evidence, gaps) is checked by `tests/awards-ledger.test.ts`; `tests/awards-catalog.test.ts` covers the engine;
   `e2e/awards.spec.ts` has six journeys on desktop, phone and WebKit iPhone 15 Plus.

What is left (none of it blocks other work):
- Read the blocked organizers' rules when their sites can be reached from here (BAFTA, AMAA, Blue Dragon, Busan,
  Locarno, FESPACO), and the pages marked `UNVERIFIED:` in the rosters (97 categories in play).
- (Done after #47:) the Academy's qualifying lists are read award by award; FESPACO's and IDFA's listed short awards
  aren't in SLATE's rosters, so they can't qualify a short (`QUALIFYING_LISTS` names them under `notInGame`).
- Basque productions aren't recorded, so San Sebastián's Irizar Basque Film Award can't be won.
- Do not edit source files while a dev-server browser run is going: the dev server reloads the page to the start
  screen and the journey fails (this caused the intermittent failures seen while writing `e2e/awards.spec.ts`).

### Newest Request (November 8, 2026, after #45): browser journeys for the last unit-only behaviours

- **Versions** (`15-05.03`): Your Entries now names the cut entered, and the live-action journey enters the Festival Cut.
- **Later windows** (`16-05`):
  - Later-window offers were indistinguishable from first offers. They are now marked (`DistributionOffer.laterWindow`)
    and say so on the Release page.
  - When earlier deals' rights leave nothing to offer, the log now says so. Before, it read "No distributors have made an
    offer yet", as though no one was interested.
  - The connected journey waits for it weekly, because offers stay open three weeks.
- **Plate integration** (`13-05`): a new hybrid journey in `e2e/journeys.spec.ts`. A live scene changed after
  integration is picked up; the restart is said first, logged, and done again before delivery.
- **Dailies pickup** (`12-05`): the live-action journey books the dock's inserts on a pickup day and accepts the
  wheelhouse's gap. All of it survives a save and reopen.
- **Next:** nothing from the package is left but the owner's acceptance and real-device checks (`19-05.03`, `20-05`).
  The research items below (rulebooks, holiday names) and the manual items remain.

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
5. **M6 follow-ups:** none open in code. The category audit (`docs/world/CATEGORY-AUDIT.md`) marked 48 categories Rules verified and 2 Rules projected; from November 9, 2026 it was 66 and 2 of 802, and after the rule research that day 224 and 11 (`docs/world/RULEBOOK-AUDIT.md`, `docs/awards/LEDGER.csv`).
6. **M7 follow-ups:** a manual screen-reader pass (automated checks only so far); production timings (budgets are measured on the dev server).

### Research Still To Do

- Festival and award rulebooks: 567 of 802 categories use the game's rules (734 before the research after #47; 92 of 142 until the rosters of November 9, 2026; the blocked organizers and `UNVERIFIED:` pages are listed under that request above). TIFF and BAFTA Film need their organizers' documents read from a network that can reach tiff.net and bafta.org; then the rest listed in `docs/world/RULEBOOK-AUDIT.md`. Each needs its organizer's document for the edition in play; add a new rulebook version, never edit one an edition already uses. European Film Awards eligibility differs slightly (see the category audit). Dates: Annecy 2027, BAFTA 2027, WGA, Series Mania and Hot Docs 2027 are still planning dates.

### External Or Manual (never blocks other work or future years)

- **Physical devices:** iPhone 15 Plus and 15 Pro Max in real Safari. Emulation runs in CI; a person with the devices must do the rest.
- **Human enjoyment and balance feedback:** the questions in `BALANCE-REPORT.md`.
- **Unpublished official information:** China's 2027 holiday notice (not out as of November 6, 2026), future Islamic announcements, future festival dates. The game uses projected dates, labelled, until these exist.

## Known Limits That Are Deliberate

- No tutorial, taxes, housing, banking, visas or attribute progression.
- Rules are simulated and labelled as such, except where `docs/world/RULEBOOK-AUDIT.md` lists organizer rules.
- Festival and award judging is a game model: rival works come from a simulated season, the standard for area and
  juried awards, special mentions, honorary selection and national committees are assumptions (`docs/awards/DESIGN.md`).
- Saves are local to the browser (IndexedDB, or localStorage where it isn't available). Export Save is the copy outside it; Import Save brings one back (`docs/STORAGE.md`).
