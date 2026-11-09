# Award And Festival Rosters (Research Records)

One file per institution, `<institution-id>.txt`, read by `tools/awards/build.py`. Each file records the organizer's
own roster for a named edition, with where each entry was read. These are developer records: the game shows the
category names, never the citations.

## Format

```
@institution oscars
@edition 99th Academy Awards (2027)
@source aa99-rules | 99th Oscars Complete Rules | https://... | retrieved 2026-11-09
# Section Name                (a heading groups the categories that follow, for the player's navigation)
id | Official Name | kind | recipient | work | source ref | note
- Official Name | reason it isn't playable | source ref
```

- **kind**: `C` competitive category, nominees and one winner; `A` area award (one, several or no winners); `J` juried
  award (judges; one, several or no winners); `S` festival section (selection only, never a win); `P:<section>` a prize
  decided among the works selected for that section (no entry of its own); `U:<section>` an audience award among that
  section; `X:<section>` an independent or partner jury's prize, separate from the festival's own awards; `H` honorary
  or discretionary (no submission and no fee; chosen by the organizer from a body of work).
- **recipient**: `project`, `producer`, `director`, `writer`, `writer-original`, `writer-adapted`, `lead`, `supporting`,
  `guest` (each optionally `:Actor` / `:Actress` for gendered categories), `ensemble`, `voice`, `host`, `craft:<role>+<role>`
  (the crew roles credited for that craft), `song`, `national` (a country's selection body enters the work),
  `career` (a body of work).
- **work**: the formats and program types it takes, as build-script tokens (see `tools/awards/build.py`).
- A line starting with `-` records an official category the game can't represent, with the reason. It is counted in
  the roster, never in the game.

A note starting `UNVERIFIED:` marks something not read in the organizer's material (a criteria page that didn't load,
for example). The build counts it as a research gap, and the ledger never calls that row verified.

## What Is Made From These

- `tools/awards/build.py` writes the game's catalog (`src/data/institutions.json`), `docs/awards/INVENTORY.md` (per
  institution: before and after, new, renamed, not playable, unverified) and `docs/awards/COVERAGE.csv` (every roster
  line). CI fails when they differ from what the rosters make.
- `docs/awards/LEDGER.csv`, one row per playable category with its child requirements (roster, rules, engine,
  recipients, UI, save, evidence, gaps), is written and checked by `tests/awards-ledger.test.ts`. That test also fails a
  prize decided among something that takes no entries, and a craft award naming a crew role the game can't hire.
- How each kind of category is played: `docs/awards/DESIGN.md`.
