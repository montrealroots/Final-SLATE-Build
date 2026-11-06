# Screenwriting Connections Audit

Checked November 6, 2026 against the code. Every major script customization is placed in one of four kinds:

- **Creative description:** the player's own words, kept with the script. SLATE does not read their meaning.
- **Structured choice:** a choice the engine follows into production.
- **Readiness check:** checked before approval, or as a note. For free text, the check is that something is there.
- **Modeled quality influence:** feeds the modeled script score in `assessQuality` (`src/engine/finish.ts`).

| Customization | Kind | Where it goes |
| --- | --- | --- |
| Logline, premise, stakes, conflict, viewpoint, theme, ending, intended experience, question | Creative description | Kept with drafts. Not read for meaning; the Story panel says so. |
| Genre conventions and genre questions (`genreNotes`) | Readiness check; small quality influence | Each open question is a note. An answer counts if it isn't empty: up to +4. |
| Story world or format rules | Readiness check (presence); creative description | A note, or for unscripted shows a blocking check, until at least one rule exists. SLATE can't tell whether a scene breaks a rule; the panel says so. |
| Relationships | Readiness check (presence); creative description | A note until one exists. |
| Setups, clues and reveals (planted in one scene, paid off in another) | Structured choice; quality influence | Clue props in the breakdown. Setups paid off in named scenes add up to +10. Removing a scene warns about setups linked to it. |
| Scene heading: interior or exterior, place, time of day | Structured choice | Locations, weather exposure, daylight and shoot-day planning (`generatePlan`). |
| Scene participants, estimated minutes | Structured choice | Casting needs, performer days, shoot-day length, editing work. |
| Scene objective | Readiness check; small quality influence | An objective counts if it isn't empty: up to +6 for all scenes. |
| Action and dialogue text | Creative description | Shown and kept. Never parsed: a stunt or crowd written in the action changes nothing downstream (`tests/screenwriting.test.ts`). |
| Props, vehicles, animals, stunts, crowd, intimacy, water, effects, songs, dance | Structured choice | Specialist crew (`neededRoles`: stunt coordinator, animal wrangler, marine coordinator, intimacy coordinator, extras casting, music supervisor...), prep and post tasks (stunt rehearsal, music clearances, effects), slower shoot days, crowd costs. The scene editor says these must be entered: "Nothing is guessed from the text above." |
| Characters: role size, performance methods, realization, series involvement | Structured choice | Lead approvals, voice and capture work, costume counts, episode credits. |
| Characters: description, wants, fears | Creative description | Kept. |
| Character design changes (`designVersion`) | Structured choice | Downstream design-dependent work is redone. |
| Drafts and approval | Structured choice | Approval turns a draft into the production plan. Later drafts take effect when approved. Re-approval redoes only work on changed scenes (`tests/writing.test.ts`). |
| Revision notes and passes | Readiness check; quality influence | Only readiness notes count (added from Readiness with "Add To Revision Notes"), and only once a revision has addressed them **and** the check is gone from the script: +2 each, up to +10. Your own notes and the number of passes count for nothing. |
| Hired co-writer or script editor | Quality influence | Their capability moves the score: (average − 50) ÷ 3. |
| Open readiness notes on the approved script | Quality influence | −1.5 each, up to −20. |

## What Changed (November 6, 2026)

| Before | Now |
| --- | --- |
| Any non-empty objective counted fully (+15) | +6 at most |
| Any answer to a genre question counted fully (+10) | +4 at most |
| Every revision pass added 4 points, up to 12, whatever it addressed, and notes you wrote yourself counted too | Nothing for passes or your own notes; readiness notes count only once actually resolved |
| Filling every text field could reach about 84 of 100 on your own | About 70 on your own; higher needs resolved readiness notes and skilled writing help |

Fixed-seed production results changed only in quality, with script scores 5 to 9 points lower
(`tests/fixtures-data/production-golden.json`, regenerated after checking that money, timing, tasks and credits are
identical).

## Tested

`tests/screenwriting.test.ts`:
- arbitrary text moves the score only a little and never to excellent;
- your own notes and repeated passes add nothing;
- a readiness note counts only once the script is fixed;
- the same scene with and without a stunt, water, a crowd, animals, intimacy or a licensed song has different staffing, tasks and shoot days;
- prose changes nothing downstream.

Earlier tests: `tests/writing.test.ts` (drafts, revisions, re-approval), `tests/journeys.test.ts` and `tests/genres.test.ts` (breakdown requirements).
