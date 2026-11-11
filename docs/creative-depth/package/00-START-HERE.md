# SLATE — Creative Depth & Living Industry Expansion
Version 2 • November 11, 2026 • Implementation specification, not a completed game build

## The player's vision
Build a deeply customizable screen-industry simulation where the player begins as screenwriter, producer, director and actor/actress together. Make writing, casting, production and career progression feel connected. Every actionable choice has a justified consequence or a clearly identified documentary purpose. Preserve natural language, the 1221-inspired layout, desktop/mobile parity, real-time clock, sleep/advance and existing saves. No new tutorial, taxes, housing or unrelated life simulation.

Add rich click-to-fill creative libraries to the existing writing and production screens. Let the player choose from many distinct ideas, customize them, preview their consequences and combine compatible choices. Do not manufacture a thousand synonyms to meet a count. Aim for thousands of valid, meaningfully different combinations in broad creative fields, supported by curated building blocks and a complete inventory of the remaining input fields. Preserve custom entry.

The latest addition is essential: imported real actors, actresses, screenwriters, directors, producers and other credited professionals must become usable participants through complete casting and hiring loops. Their profile pages cannot stop at reference information. This applies to both existing Disney/NBCUniversal imports and future studio packs.

## Baseline and reconciliation
Last reviewed main: 8a60369f7f4cf75a229f27369182d974884f7c16 (PR #66). Latest CI at that review passed; QA reported 766 tests and startup 97 kB gzipped. These are historical observations: inspect current HEAD before implementing.
Existing systems include script effects, auditions, casting calls, hiring, design approvals, production schedules, location choices, finance and earnings, episodic delivery, awards, industry simulation, company catalogs, cinema listings and installable packs. Extend these systems; do not build a parallel game.
Known review targets: owner mode lacks identity authentication/local-only binding; series profiles still consult mutable catalog inputs; worldwide simultaneous releases and pace-based studio selection are shallow. Reverify these against current code and fix what remains.

## Files and reading order
1. 01-MASTER-BUILD-SPEC.md — architecture and implementation sequence.
2. 02-CREATIVE-LIBRARIES.md — writing, themes, genres, eras and production choices.
3. 03-PEOPLE-CASTING-AND-HIRING.md — real people as playable industry participants.
4. 04-WORLD-STUDIOS-AND-MEDIA.md — locations, studio behavior, data packs and images.
5. 05-LOOPS-AND-ACCEPTANCE.csv — feature-by-feature consequences and proof obligations.
6. 06-TESTING-AND-DELIVERY.md — tests, Playwright journeys, completeness reporting.
7. 07-SOURCES-AND-RESEARCH.md — source map and research boundaries.
8. 08-CLAUDE-COMMAND.txt — the implementation command.
9. starter-options.json — original authored starter content, not researched historical facts.
10. example-project.json — the 1980s zombie example and expected dependencies.
11. option-contract.schema.json — data contract to adapt to repository types.
12. MANIFEST.json — package file inventory and integrity hashes.

## What this package is and is not
This is a substantial build blueprint with original starter choices, explicit loops and test requirements. It does not contain every movie, person, venue or a thousand finished presets per field. Claude has authenticated TMDB access and must build/import/verify those catalogs. It contains no TMDB credentials, downloaded photographs or licensed movie database. No claim of 100% realism, exhaustive worldwide research or zero bugs is made. Completion is judged by traceable behavior and test evidence, with precise external gaps.

The main instruction is to complete the whole authorized scope in sequential checkpoints, not to implement a tiny demo and stop. Long work must leave a resumable ledger of completed code, remaining work and exact validation results.
