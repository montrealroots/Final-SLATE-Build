# Gameplay Depth: Reconciliation And Build Plan

The owner's SLATE Complete Gameplay Depth Package (November 8, 2026) is in `package/`, byte for byte (its MANIFEST hashes
match). It defines 20 areas and 100 feature groups (`SLATE-01-01` to `SLATE-20-05`). This folder records what the game
actually does for each one.

- `COVERAGE-LEDGER.csv`: the package's 100 rows, each with its original wording, filled in: status, child IDs, where a
  player meets it, the engine files, unit and browser evidence, research status and the remaining gap.
- `CHILDREN.csv`: the features inside the features. Each group is broken into child requirements (`SLATE-06-04.02`),
  each with its own status, evidence and gap.
- `tests/depth-ledger.test.ts` holds both files to the evidence:
  - all 100 groups are present, with the package's words unchanged;
  - a group's status is derived from its children's statuses and can't be typed in;
  - every cited test is a file that contains the words cited;
  - every child short of verified names its gap.

## Statuses

The package's seven statuses:

- **VERIFIED EXISTING:** the game already did it before this package, and a named test proves it.
- **VERIFIED:** built or repaired for this package, and proven by a named test.
- **IMPLEMENTED UNVERIFIED:** the code exists, but no test exercises it yet.
- **NEEDS REPAIR:** it exists but falls short of the requirement.
- **MISSING:** not built.
- **EXTERNAL BLOCKER:** needs something outside this environment, such as real devices or human players.
- **NOT YET RECONCILED:** none remain.

## Starting Point (Reconciled At `ca62be4`, Main After #40, Plus PR #41)

| | Groups | Children |
|---|---|---|
| Verified existing | 38 | 148 |
| Verified (new) | 1 | 1 |
| Implemented, unverified | 22 | 36 |
| Needs repair | 31 | 2 |
| Missing | 6 | 40 |
| External blocker | 2 | 2 |

The groups that are wholly missing:

- **09-02** auditions and callbacks;
- **12-03** directorial take choices in live action;
- **16-05** later release windows;
- **18-02** professional relationships;
- **18-03** opportunities;
- **18-04** sequels and returning seasons.

## Decisions And Assumptions

- **Start date:** the package says a start date in 2026. The owner decided on November 8, 2026 that 2026 is the default
  and any day to 2050 can be chosen (`SLATE-01-03.01`). The owner's later decision stands.
- **Prose:** it is never scored. Structured declarations drive rules; prose stays the player's record (the package's own
  rule, already enforced by `tests/screenwriting.test.ts`).
- **Sources:** production rates and durations are modeled (`docs/ASSUMPTIONS.md`). Festival and award rules and world data
  are sourced (`docs/DATA-PROVENANCE.md`, `src/engine/rulebooks.ts`). A per-feature source register for production
  processes is `SLATE-20-02.03`, still missing.

## Build Order

The package's order (`package/04-BUILD-ORDER-AND-CONNECTIONS.md`). Each stage brings engine, UI, failure and recovery,
migration and tests, and moves its children to VERIFIED.

1. Ledger and checker, areas 19 and 20 (done).
2. Identity, time and responsive interface (done):
   - handing over writing or directing (`01-04.05`);
   - previewing what Advance will pass (`02-02.04`);
   - the sticky-header check (`19-02.03`).
3. Project, story and scenes (done):
   - shelving or cancelling a project (`03-04.02`);
   - ways to cut cost (`03-03.02`);
   - acts and threads (`04-02.02`, `.03`);
   - fiction research notes (`04-04.02`);
   - documents as they were sent (`04-05.02`);
   - aliases (`05-01.02`);
   - arc beats (`05-04.02`);
   - previewing a removed requirement (`06-03.02`);
   - duplicating, splitting and combining scenes (`06-04.02`).
4. Episodes (done; also 18-04, sequels and returning seasons):
   - the shared-fact preview (`07-01.02`);
   - season arc and order (`07-02.02`);
   - block scheduling (`07-04.02`);
   - renewal (`07-05.02`).
5. Money and people (done):
   - negotiating finance terms (`08-03.03`);
   - comparing scope cuts (`08-05.03`);
   - auditions (`09-02`).
6. Preparation (done):
   - location options and a backup (`11-02.02`);
   - design approval (`11-03.02`);
   - call sheets (`11-05.03`).
7. Live action (done): setups and takes (`12-02.02`, `12-03`).
8. Animation and documentary (done): use restrictions (`14-02.02`).
9. Post:
   - replacement voice and effects work (`15-03.02`);
   - ADR and Foley (`15-04.02`);
   - festival and distribution versions (`15-05.03`).
10. Release:
    - territories and exclusivity (`16-01.02`);
    - reported against received income (`16-04.02`);
    - later windows (`16-05`).
11. Career:
    - relationships (`18-02`);
    - opportunities (`18-03`);
    - sequels and seasons (`18-04`).
12. End-to-end journeys for everything above (`20-04.02`). Every IMPLEMENTED UNVERIFIED child also gets the test it
    lacks.

Human acceptance and real-device checks (`19-05.03`, `20-05`) stay with the owner.
