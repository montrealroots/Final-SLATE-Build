# Final Slate Build

SLATE is a text-based simulation of making screen work. You play one person who is an actor or actress, screenwriter, producer and director from the start, and you take projects from a blank page through writing, casting, crew, scheduling, production, editing, delivery, release, festivals and awards, all on one shared clock.

This repository is the continuing base for the game. It is a working, tested base build, not a finished or complete game. See **Current Limitations** below and `RESUME-HERE.md` for what remains.

## What Works Now

- **Startup and saves:** New Game, Continue, Saved Games (continue, rename, export, delete with confirmation), Settings, a saved creation draft, loading, load-failure and repair screens, and Save And Exit. "Saved" appears only after every step of the save, including the save list, has succeeded.
- **Character creation:** name, pronouns and acting title; birth date and birthplace; multiple heritages, including your own description; main and other languages with proficiency; starting place, date (2026) and local time; review. All four professions are part of the character from the start.
- **One world, one clock:** 1:1 time while the game is open and visible. No Pause button and no offline catch-up. Advance (to the next event, tomorrow, a week, a month or a chosen time) and Sleep (wake time, alarm, snooze) use the same event rules as normal ticking.
- **Places, time and weather:** 66 cities in 33 countries with real IANA time zones; sunrise and sunset, including polar day and night; modeled seasonal weather with forecasts that get less certain further ahead; public holidays for every country in the catalog; birthdays, including leap-day birthdays; travel between places.
- **Calendar:** month view with filters for birthdays, holidays, festivals, awards, deadlines and your schedule; personal plans with reminders.
- **Projects:**
  - Independent axes for format, medium, technique, narrative basis, genres, audience, era, setting, languages, runtime and budget size (an estimate and a financing target, not money).
  - All 149 catalog genres, searchable and multi-select. Each maps to shared mechanic tools and its own convention questions.
- **Script:** story fields; structured scenes with stable IDs; dialogue; setups, clues and reveals; world rules; relationships; documentary facts and contributors; readiness checks; drafts (save, compare, restore, rename, approve); revision notes and passes that take scheduled time; undo.
- **Characters:** role size, story function, entity, performance method and realization are recorded independently.
- **Planning:** a breakdown derived from the approved draft, where every requirement links back to its scenes.
- **Casting and crew:**
  - Search, offers, counteroffers and declines on the shared clock; release; cast yourself in any role or none; fit notes for age, skills and language.
  - Department staffing proposals you review before sending, compatible role combining, and episode writers and directors.
- **Money:** a ledger that reserves, commits, settles and cancels, so nothing is paid twice. A schedule reserves its shoot-day and material costs, and shortfalls are explained with what to do next. Projects are financed by backers (`docs/FIRST-PROJECT-JOURNEY.md`): the agreed starting backing for a first project, an arts grant, a private investor, a co-producer and, after a delivered project, a commissioner. Each decides on its own terms, some say no, and every term shown before you accept is enforced afterwards (repayment and share of income, approval rights, credits, a delivery deadline). Saves can be exported and imported again (`docs/STORAGE.md`).
- **Production by medium:**
  - Live action uses shoot days grouped by location, with weather, daylight, staffing, safety specialists, presence on set and holiday rules.
  - Drawn and rigged 2D, 3D CG (models, rigs, layout, animation, effects, lighting, finite render capacity) and stop motion (armatures, puppets, costume fitting, miniature sets, stages, the rule that a puppet can be on only one stage at a time, repairs).
  - Hybrid, documentary (contributors, consent, fact checks, archive licensing), TV episodes, motion-capture sessions, and unscripted TV (format rules, hosts and participants, multi-camera segments, footage logging, story producing).
- **Finishing:** assembly, cut passes, coverage gaps and pickups, picture lock (with commissioner approval where agreed), sound, score, color, captions, quality control, then delivery.
- **After delivery:**
  - Credits based on actual contributions, including per-episode credits.
  - Fictional distribution offers and release planning.
  - 16 festivals and 21 award events with their official rosters (802 sections, categories, prizes and honorary awards; `docs/awards/INVENTORY.md`): eligibility read from the project, recipients from credits, submission, selection or nomination, prizes decided among a section's selection, honorary awards from a career, screenings, results, and honors that go to the credited people. Rival work comes from a consistent slate each season.

## Current Limitations

- Festival and award rules: 66 of 802 categories (Academy Awards 99th, Sundance 2027, Clermont-Ferrand 2027, Annie Awards 54th, Annecy 2026, Venice 2026, Golden Globes 84th, Emmys 78th) follow the organizers' published rules, and Cannes short films and the Berlinale competition use projected rules; the rest are **simulated** and labelled so in the game (`docs/world/RULEBOOK-AUDIT.md`). Dates are organizer-announced for 19 of 37 institutions and planning dates otherwise (`docs/world/INSTITUTION-AUDIT.md`).
- Weather is **modeled** from station climate normals (or a labelled model where no station is near), not observed data. Places come from a 171,750-place GeoNames catalog, not every settlement.
- Lunar-calendar holidays use official dates for 2026; later years are projected and labelled (see `docs/world/` holiday notes).
- Rates, fees, throughput and quality assessments are **simulation assumptions** (`docs/ASSUMPTIONS.md`), not real salaries or measures of artistic merit.
- Not modeled yet: personal finances, reputation, and offers from other producers.
- Saves live in this browser's local storage. Clearing site data deletes them.
- Browser testing used Chromium at emulated sizes and WebKit with iPhone 15 Plus and 15 Pro Max profiles. No physical iPhone or real Safari testing has been done.
- There is no tutorial. One will be designed separately.

## Requirements

- Node.js 22.12 or later (developed on 22.23.4) and npm 10.
- For browser tests: Playwright 1.63.0 with its Chromium build (`@playwright/test` is pinned to match).

## Commands

```bash
npm ci
```

```bash
npm run dev
```

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run e2e
```

```bash
npm run balance
```

```bash
npm run build
```

- `npm run dev` starts the game at http://localhost:5173.
- `npm test` runs the unit and engine journey tests (Vitest).
- `npm run e2e` runs the browser journeys, layout checks and WebKit iPhone emulation (Playwright; it starts its own dev server on port 5174). In this cloud environment the WebKit projects use the installed WebKit build; set `SLATE_WEBKIT_PATH` to change it.
- `npm run catalog` regenerates the runtime genre catalog from the full registry.
- `npm run balance` runs the 30-seed balance experiments and the held-out combinations, writing `docs/balance-results.json` and `docs/balance-heldout.json` (about 100 seconds).
- `npm run budget` checks build sizes after `npm run build`.
- `npm run check` runs the world data check, typecheck, unit tests, build and size budgets together. CI also runs balance and the browser journeys.

## Saves

- Saves live in IndexedDB, gzip-compressed, through a save vault that commits a save, its backup and the index in one transaction, and reports "Saved" only after it lands (`docs/STORAGE.md`). Each save is validated and the previous sound save kept as its backup. Where IndexedDB isn't available, localStorage is used as before. A failed write keeps the last good save and says so, including when storage is full.
- Opening a save validates it in depth. A missing, damaged or invalid save opens the newest sound copy (the backup, an interrupted write's copy from an earlier build, or a backup taken before an update) after the damaged one is kept; the player is told which copy opened. Saved Games lists every recovery copy with Export and Delete; the game never deletes them by itself. A save from a newer version is refused and left unchanged. A save naming unknown places asks for replacements.
- If something fails while time passes, the game is returned to how it was before that step, time pauses, and the player is told.
- Saves carry a schema version. `src/engine/save.ts` holds the migration table; add one migration per schema change and never reset player progress to add a feature.
- Only one browser tab runs a save at a time. Another tab opens it read-only and can take over.
- Closing or hiding the game stops time. Reopening resumes at the saved time with no catch-up.

## How It Is Built

`src/engine` is the simulation: plain TypeScript with no DOM, deterministic per save seed. `src/ui` is a React interface that reads the same state. See `docs/ARCHITECTURE.md`.

## Reports

- `QA-REPORT.md`: commands, results and acceptance status.
- `REQUIREMENT-EVIDENCE.md`: each requirement and the evidence for it.
- `PLAYTHROUGH-REPORT.md`: the browser and engine journeys that were run.
- `BALANCE-REPORT.md`: balance assumptions and seeded results.
- `RESUME-HERE.md`: remaining work and next actions.

## Build Policy

This base was built by one primary coding agent, with no sub-agents, parallel agents or delegation. The development environment's documentation lookup (Context7) runs anonymously, and the code-graph tool runs without a model backend. No API keys are used by the game or its build.

No license has been chosen for this repository yet. Inherited genre references and data sources are listed in `docs/DATA-PROVENANCE.md`.
