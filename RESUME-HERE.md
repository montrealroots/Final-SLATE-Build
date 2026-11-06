# Resume Here

The base build is implemented and every automated check passes on this branch (see `QA-REPORT.md`). Acceptance is **pending** on the items below. Pick up from this list; there is no need to reread the package or redo finished work.

## Standing Rule

At every stopping point, open a pull request into `main` and merge it (see `CLAUDE.md`, certified by the user on November 6, 2026).

## State

- **Branch:** `claude/clever-archimedes-x0r26v`, pushed to https://github.com/montrealroots/Final-SLATE-Build. Checkpoints are merged into `main` by pull request (montrealroots/Final-SLATE-Build#1, #2 and later).
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

## Done Since The First Checkpoint

- WebKit iPhone 15 Plus and 15 Pro Max emulation (portrait and landscape) runs the live-action journey and a phone layout spec. This is emulation, not a physical device.
- Browser journeys to delivery for every production method: live action, 2D (with a digital release and an Annie Awards entry through the ceremony), 3D with motion capture, stop motion, hybrid, documentary, unscripted series, TV limited series and web series (`e2e/live-action.spec.ts`, `e2e/journeys.spec.ts`).
- Motion-capture sessions, an unscripted TV pipeline, festival screenings, a per-season rival slate, and sourced 2026 lunar holidays (China official, Korea, expected Eid dates).
- Place catalog consistency checks (`tests/places.test.ts`).

## Remaining Work, In Suggested Order

1. **Physical device checks:** iPhone 15 Plus and iPhone 15 Pro Max in real Safari, including the on-screen keyboard, safe areas and landscape. This needs a person with the devices.
2. **Lunar holidays beyond 2026:** add each year's table only once official or reliable dates are published (`src/engine/holidays.ts`, with sources in `docs/DATA-PROVENANCE.md`). China's 2027 notice wasn't published as of November 6, 2026; its 2026 notice came out November 4, 2025.
3. **Place coordinates:** check each record against GeoNames (only consistency checks exist now).
4. **Festival and award rules:** research each institution's edition rules and replace the simulated rules where a rulebook is available.
5. **Balance questions** in `BALANCE-REPORT.md`, which need human playtesting.
6. **Bundle size:** code-split (the build warns at about 708 kB).

## Known Limits That Are Deliberate In This Base

- No tutorial, taxes, housing, banking, visas or attribute progression.
- Rules are simulated and labeled as such.
- Saves are local to the browser.
