# Resume Here

Read this first. It lists what is finished, what the Gap Completion Package still needs, and the order to do it in. There is no need to reread the package or redo finished work.

## Standing Rule

At every stopping point, open a pull request into `main` and merge it (see `CLAUDE.md`, certified by the user on November 6, 2026). Never merge red checks.

## State

- **Branch:** `claude/clever-archimedes-x0r26v`, pushed to https://github.com/montrealroots/Final-SLATE-Build. After each merge the branch restarts from `main`.
- **Merged checkpoints:** montrealroots/Final-SLATE-Build#1 (base build), #2, #3 (gap fixes before the package). `main` was at `3845c2d` when the Gap Completion Package was applied.
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
| Search and map, world pickers | Catalog dropdowns | M2 (to do) |
| Holidays worldwide | Hand rules for the 66 places' countries, sourced 2026 lunar dates | M3 (to do): donor engine for 218 entries |
| 1221 UI adaptation | Own shell, startup and creation | M4 (to do) |
| Motion capture, unscripted families | Sessions and one unscripted pipeline | M5 (to do): full mocap flow, five unscripted families, release and finance UI |
| Screenings, festival and award rules | Screenings, simulated rules | M6 (to do): RSVP and travel conflicts, audited edition rules |
| Failure-path journeys, balance, performance | Happy-path journeys, balance runs | M7 (to do) |

## Milestone Log

- **M1 world data and climate:** implemented and tested; see `QA-REPORT.md`. Pull request and merge SHA recorded at the checkpoint.

## Remaining Work, In Order

### Coding Gaps

1. **M2:** gazetteer module with lazily loaded shards; accent-insensitive ranked search; World route with country list, region filter, search and outline map; creation and travel pickers for any world place (stored in `draft.places` and `state.places`); climate computed from lazily loaded stations. Copy: "No places match '{query}'. Try a city, region, or country." and "Places couldn't be loaded." with "Try Again".
2. **M3:** donor holiday engine (`references/world/.../holidays`) for 218 entries; keep the sourced 2026 overrides; label projected and unannounced dates; behaviour outside supported years; weather and holiday effects in production.
3. **M4:** 1221 UI adaptation: one route registry (Home, Calendar, World, Projects, Profile, Saved Games, Settings); startup and creation copy from `UI-1221-ADAPTATION.md`; save error copy; mobile inputs of at least 16px; widths 360 to 1920.
4. **M5:** motion capture from booking to integration with cancellation terms; unscripted talk, observational, competition, factual and studio variety; release and finance in the UI.
5. **M6:** screening invitations with RSVP deadlines and travel conflicts; edition rule records for 16 festivals and 21 award events.
6. **M7:** failure-path journeys (failed save, legacy import, missing data); held-out balance seeds; performance budgets; accessibility; report reconciliation.

### Research Still To Do

- Festival and award rulebooks per edition (M6). Where no rulebook is published, keep the simulated rule and label it.

### External Or Manual (never blocks other work or future years)

- **Physical devices:** iPhone 15 Plus and 15 Pro Max in real Safari. Emulation runs in CI; a person with the devices must do the rest.
- **Human enjoyment and balance feedback:** the questions in `BALANCE-REPORT.md`.
- **Unpublished official information:** China's 2027 holiday notice (not out as of November 6, 2026), future Islamic announcements, future festival dates. The game uses projected dates, labelled, until these exist.

## Known Limits That Are Deliberate

- No tutorial, taxes, housing, banking, visas or attribute progression.
- Rules are simulated and labelled as such.
- Saves are local to the browser.
