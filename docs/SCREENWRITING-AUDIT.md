# Screenwriting Connections Audit

Checked November 6, 2026 against the code, and updated November 7, 2026 when the fields that had changed nothing were given
effects (`src/engine/script-effects.ts`, `tests/script-effects.test.ts`). Every major script customization is placed in one of four kinds:

- **Creative description:** the player's own words, kept with the script. SLATE does not read their meaning. Since
  November 7, 2026 they count by presence and length (see below), still never for meaning and never for quality.
- **Structured choice:** a choice the engine follows into production.
- **Readiness check:** checked before approval, or as a note. For free text, the check is that something is there.
- **Modeled quality influence:** feeds the modeled script score in `assessQuality` (`src/engine/finish.ts`).

| Customization | Kind | Where it goes |
| --- | --- | --- |
| Logline and premise | Creative description; presence gate | The pitch. Investors, co-producers, commissioners, festival entries and distribution offers need both written (`pitchMissing`); without them a release gets no offers. |
| Stakes and theme | Creative description; presence gate | A grant application asks for them as well as the pitch (`grantApplicationMissing`). |
| Stakes and theme (grant) and central question (nonfiction grant) | Creative description; presence gate | A documentary or unscripted grant application also asks for the central question. |
| Conflict, point of view, ending | Creative description; presence | The treatment. Backers who take time to decide answer a week sooner when all three are written (`treatmentComplete`, `NO_TREATMENT_DELAY_DAYS`). |
| Tone, intended experience | Creative description; presence | The composer's brief: without either, each score takes a day longer (`musicBrief`). Tone is editable in the Story panel as well as at creation. |
| Story setting (words) | Creative description; presence | The design brief: without it (or a story setting place), production design and visual development take one unit longer (`designBrief`). Editable in the Story panel. |
| Genre conventions and genre questions (`genreNotes`) | Readiness check; small quality influence | Each open question is a note. An answer counts if it isn't empty: up to +4. |
| Story world or format rules | Readiness check (presence); creative description | A note, or for unscripted shows a blocking check, until at least one rule exists. SLATE can't tell whether a scene breaks a rule; the panel says so. |
| Relationships | Readiness check (presence); creative description | A note until one exists. |
| Setups, clues and reveals (planted in one scene, paid off in another) | Structured choice; quality influence | Clue props in the breakdown. Setups paid off in named scenes add up to +10. Removing a scene warns about setups linked to it. |
| Scene heading: interior or exterior, place, time of day | Structured choice | Locations, weather exposure, daylight and shoot-day planning (`generatePlan`). |
| Scene participants, estimated minutes | Structured choice | Casting needs, performer days, shoot-day length, editing work. |
| Scene objective | Readiness check; small quality influence | An objective counts if it isn't empty: up to +6 for all scenes. |
| Action and dialogue text | Creative description; length | Never parsed for meaning: a stunt or crowd written in the action changes nothing downstream (`tests/screenwriting.test.ts`). Length counts: dialogue that takes noticeably longer to say than the scene's estimate is a note (150 words a minute), a script far longer than its runtime is a note (180 words a page, a page a minute), and subtitling for a territory is priced by the dialogue words not in its language ($250 a thousand) when a distribution deal is accepted. |
| Turning point (scene) | Structured choice | A scene with one written is a structural beat: a live scene the shoot never captured costs the edit 6 more (`LOST_TURNING_POINT_COST`). |
| Props, vehicles, animals, stunts, crowd, intimacy, water, effects, songs, dance | Structured choice | Specialist crew (`neededRoles`: stunt coordinator, animal wrangler, marine coordinator, intimacy coordinator, extras casting, music supervisor...), prep and post tasks (stunt rehearsal, music clearances, effects), slower shoot days, crowd costs. The scene editor says these must be entered: "Nothing is guessed from the text above." |
| Characters: role size, performance methods, realization | Structured choice | Lead approvals, voice and capture work, costume counts. |
| Characters: series involvement | Structured choice | A regular is booked for at least every episode and credited in all of them; recurring and guest parts are credited in the episodes they appear in. A guest or single-episode part written into more than one episode is a note. Until November 7, 2026 this row said it drove episode credits; nothing read it. |
| Characters: story functions | Structured choice | Protagonist, deuteragonist and antagonist put the performer in the leading acting categories whatever the part's size (`castPlacement`). A narrator records narration after picture lock, before the mix, and is booked a day for it. |
| Characters: pronouns | Structured choice | He, She or They (or open to anyone). Casting lists performers whose pronouns match first and marks them; nobody is refused. |
| Characters: what kind of being (non-human) | Readiness check (presence) | A note until it is written, so design and casting can start. |
| Characters: description, wants, fears | Creative description; presence | The casting breakdown. An offer for a part without all three written is answered a day later (`breakdownComplete`). |
| Characters: backgrounds (November 7, 2026) | Structured choice; quality influence | Casting shows who shares one; a performer who does, you included, adds 6 to that performance (`AUTHENTIC_CASTING_BONUS`, `sharedHeritages`). Never a penalty or a block (`tests/heritage.test.ts`). |
| Character design changes (`designVersion`) | Structured choice | Downstream design-dependent work is redone. |
| Drafts and approval | Structured choice | Approval turns a draft into the production plan. Later drafts take effect when approved. Re-approval redoes only work on changed scenes (`tests/writing.test.ts`). |
| Revision notes and passes | Readiness check; quality influence | Only readiness notes count (added from Readiness with "Add To Revision Notes"), and only once a revision has addressed them **and** the check is gone from the script: +2 each, up to +10. Your own notes and the number of passes count for nothing. |
| Hired co-writer or script editor | Quality influence | Their capability moves the score: (average − 50) ÷ 3. |
| Open readiness notes on the approved script | Quality influence | −1.5 each, up to −20. |

| Project: tone and intended audience | Structured choice | The audience and the scenes set an age rating (`ageRating`: intimacy 15+, with an adult audience 18+; stunts or a young or adult audience 12+). An 18+ project gets no TV offers. A child, family or preschool project can't approve an intimate scene. |
| Project: competes as (comedy or drama) | Structured choice | Where awards split drama from comedy or musical, the producer's choice decides; otherwise the genres do (`competesAs`). |
| Project: story setting place | Structured choice | A story set somewhere other than the base adds a scouting trip there before the shoot: 2 days at home, 4 abroad. |

## What Changed (November 7, 2026)

Fields that changed nothing were given effects. Structured choices drive engines directly (placement, booking, credits,
ratings, scouting, the edit). Prose counts only by presence and length. Two fixed-seed script scores in
`tests/fixtures-data/production-golden.json` fell by 2 (55 to 53): the 3D motion-capture fixtures' Golem is a monster
with nothing written about what kind of being it is, so each gains that open note. Nothing else in the fixture changed.

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

`tests/script-effects.test.ts` (November 7, 2026): every effect above, each with the field set and unset.

Earlier tests: `tests/writing.test.ts` (drafts, revisions, re-approval), `tests/journeys.test.ts` and `tests/genres.test.ts` (breakdown requirements).
