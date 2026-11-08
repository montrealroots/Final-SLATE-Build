# Directing: Coverage, Takes And Pickups (SLATE-12-02, 12-03, 12-05, 15-01, 15-03)

Research record for the contextual-directing change of November 8, 2026 (`src/engine/takes.ts`, `src/engine/directing.ts`).
It separates what a source says from what the game decided. Retrieved November 8, 2026.

## Sources

| ID | Source | Kind | Used for |
|---|---|---|---|
| D1 | IATSE Local 634, *Script Department Positions And Descriptions* (2025), https://www.iatselocal634.com/assets/script-department-positions-and-descriptions-2025.pdf | Primary: a union's own description of the role | What is recorded about a day's material and passed to the editor |
| D2 | Film glossaries for master, coverage and insert (for example https://resources.shade.inc/glossary/term/coverage, https://morphic.com/ai-glossary/master-shot) | Secondary: definitions | The words used: master, singles, inserts, coverage |
| D3 | Explainers on dialogue replacement (for example https://howtofilmschool.com/dictionary/adr-film/) | Secondary | That damaged production sound can be replaced in post by the performers re-recording their lines |
| D4 | UK rest-period guidance under the Pact/Bectu agreements (https://union.bectu.org.uk/), IATSE turnaround summaries | Secondary summaries of agreements | Consulted; **not used**. Rest between days is not modeled by this change |

Two other pages (a ScreenSkills job description and an IATSE ASA fact sheet) refused the request (HTTP 403) and were not read.

## What D1 says, and what the game takes from it

D1 says the script supervisor times takes, notes the coverage of sequences, may prepare lists of pickup shots and wild
sound, keeps continuity notes, and forwards notes to the supervising editor or editor after the day's shooting; the daily
report gives the number of set-ups, picture time, scenes and pages shot.

The game takes the **process** from this:

- A day's material is reviewed as set-ups and takes per scene: the Dailies card lists what each scene needed, which
  set-ups were filmed and each take (`dailies`, `sceneIssues`).
- Missing coverage is listed, and a pickup shoots only what is missing (`missingMaterial`, `applyPickup`).
- A scene filmed over more than one day without inserts to cut around it is a continuity risk the editor has to accept or
  cover.

## What the game decided (calibration, not sourced)

These are game rules, registered in `docs/depth/PRODUCTION-SOURCES.md`:

- **What a scene needs** (`requiredSetups`): a master always; singles for an exchange between two speakers or a
  performance emphasis; inserts for a stunt, an effect, a planted setup or a detail emphasis; a scene played in one shot
  needs only its master. These follow common practice as the glossaries describe it (D2). They are not a rule any
  source states.
- **Time** (`SETUP_RESET` 0.2 and `TAKE_RUN` 0.15 of a scene's standard load): each set-up costs a reset and each take
  its running time. The numbers are calibration.
- **Take rules** (`TAKE_RULES`): one take; until one is usable (up to four); five for the best. A usable first take ends
  the usual rule, so more takes cost time and are not guaranteed to be better.
- **Issues** (`ISSUE_GAP` 8): a take whose performance or technical side falls 8 below what the crew and cast can do
  shows a performance, camera or sound problem. Sound only where the day's sound is at risk. Nothing is read from the
  scene's free text.
- **The edit** (`coverageEdit`): 6 for each set-up the scene needed and lacks, 3 for a continuity break, averaged;
  coverage beyond the need adds nothing, so a restrained plan is not penalised. With singles, the editor cuts between
  usable takes for the performance (`editPerformance`).

## Not modeled

Rest between days (D4), fatigue, the script supervisor as a hired role, wild sound, and anything that would need a new
attribute system. Old saves keep the earlier take rules unchanged.
