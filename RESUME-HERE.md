# Resume Here

The base build is implemented and every automated check passes on this branch (see `QA-REPORT.md`). Acceptance is **pending** on the items below. Pick up from this list; there is no need to reread the package or redo finished work.

## Standing Rule

At every stopping point, open a pull request into `main` and merge it (see `CLAUDE.md`, certified by the user on November 6, 2026).

## State

- **Branch:** `claude/clever-archimedes-x0r26v`, pushed to https://github.com/montrealroots/Final-SLATE-Build. Nothing has been merged into `main`.
- **Environment setup:** the setup script lives on branch `claude/gallant-euler-c8ilh2` and was not touched.
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

## Remaining Work, In Suggested Order

1. **Physical device checks:** iPhone 15 Plus and iPhone 15 Pro Max in Safari, including the on-screen keyboard over form fields, safe areas and landscape. Record the results separately from emulation.
2. **Browser journeys still missing:** deliver a 2D, stop-motion, hybrid, documentary and TV project through the UI (the engine journeys already pass); an award nomination and ceremony; accepting a distribution offer and a release; a short-form web series.
3. **Motion-capture sessions:** characters with the motion-capture method should create capture tasks that feed animation and pay the capture performer.
4. **Unscripted TV:** format rules, segments and participants as their own pipeline instead of reusing the documentary one.
5. **Festival screenings:** separate screening appointments within a festival's dates, and invitations that create calendar commitments.
6. **Season visibility:** feed festival results into later awards more richly; add an opposing project pipeline across years.
7. **Data:** check place coordinates against GeoNames; add lunar holiday tables with sources; research edition rules for each institution and update `docs/DATA-PROVENANCE.md`.
8. **Balance questions** in `BALANCE-REPORT.md`, which need human playtesting.
9. **Bundle size:** code-split the genre registry (the build warns at 708 kB).

## Known Limits That Are Deliberate In This Base

- No tutorial, taxes, housing, banking, visas or attribute progression.
- Rules are simulated and labeled as such.
- Saves are local to the browser.
