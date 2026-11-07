# Screenwriting Connections Audit

First checked November 6, 2026. On November 7, 2026 a pass gave every script field an effect (montrealroots/Final-SLATE-Build#33),
and a review the same day found that many of those effects were arbitrary or rewarded filling boxes. This document is
the result of that review. Code: `src/engine/script-effects.ts` (rules), `src/engine/script-explain.ts` (what the screens
say), `src/engine/finish.ts` (edit plan, quality, distribution), `src/engine/finance.ts` (documents backers ask for).
Tests: `tests/script-effects.test.ts`; browser playthroughs: `e2e/script-rules.spec.ts`.

The standard: having an effect isn't enough. A rule stays only if it is a real constraint, or a simulation assumption
that is labelled and explained where the player meets it. Otherwise the field is the player's creative record, with no
number attached. Prose is never read for meaning, never raises quality and never buys time.

## Classes

- **Real constraint:** what real processes do, cited where a specific rule is claimed.
- **Simulation assumption:** a modeled number or behaviour, labelled as the game's in the UI or the code.
- **Creative description:** the player's record, kept with the script and shown back; it changes no outcome.
- **Corrected shortcut:** an arbitrary or unsupported rule from #33 or earlier, and what replaced it.

## Every Recent Field Effect, Traced

Each row: player input, where it is stored, what it changes, where the player is told, and whether saves keep it.

| Field or rule | Input → state | Changes | Explained where | Saved | Class |
| --- | --- | --- | --- | --- | --- |
| Awards Placement (new) | Character editor → `StoryCharacter.awardPlacement` (unset = by role size) | Which acting category recipients a performance is offered for (`castPlacement`, `categoryRecipients`) | Its hint, and How Parts Are Placed in the submission dialog (`placementExplained`) | Yes, with the draft | Real constraint: entrants declare placement. An organizer that decides placement by its own vote isn't modeled, and the dialog says so. |
| Story functions | Character editor → `functions` | A narrator gets a recording session after picture lock, before the mix, and one booked day. Nothing else. | Story Functions text | Yes | Real constraint (narration is recorded in post). Corrected shortcut: in #33, protagonist, deuteragonist and antagonist forced the leading categories, so a supporting antagonist couldn't be entered as supporting. |
| Series involvement | Character editor → `seriesInvolvement` | A regular is booked at least a day per episode and credited in all of them; others are booked and credited for the episodes they appear in | Its hint | Yes | Real constraint: series regulars are contracted for all episodes. Corrected shortcut: a note that a guest in two episodes should be "recurring" cost quality, though recurring guest parts are common. Removed. |
| Character pronouns | Select (Open To Anyone, He/Him, She/Her, They/Them) | Casting marks performers who match and offers List Matching Pronouns First (off by default). Nobody is filtered out and nothing is scored. | Pronouns hint, the check box | Yes | Creative description and casting preference. Corrected shortcut: #33 always sorted matches first. |
| Character backgrounds | Character editor → `heritages` | Casting shows Shares A Background, as information | The chip | Yes | Creative description. Corrected shortcut: a shared background added 6 to the performance score (`AUTHENTIC_CASTING_BONUS`), which inferred ability from ethnicity. Removed; tests prove it scores nothing (`tests/heritage.test.ts`). |
| Language suggestions from backgrounds | Creation | Suggested languages are listed first. Nothing is added unless the player adds it. | Creation step | Player's choice is saved | Suggestion only. |
| Description, wants, fears | Character editor | Shown with offers as the casting breakdown, if written | Find Performers dialog | Yes | Creative description. Corrected shortcut: a missing breakdown delayed every answer by a day. |
| What kind of being | Character editor → `entityNote` | Nothing. A prompt suggests writing it. | Readiness prompts | Yes | Creative description. Corrected shortcut: the open note cost 1.5 script points, so any text "fixed" it. |
| Logline, premise | Story panel | Form the **Pitch**. Investors, co-producers, commissioners and grants need it, festival entry forms need it, and a distribution contract's delivery list needs it. | The backer row, the submission dialog and the offer each name the document and the empty fields (`documentsNeeded`) | Yes | Real constraint: applications and entry forms ask for a logline and synopsis. Which backer asks for what is a simulation assumption. Corrected shortcut: a missing pitch made a release get no distribution offers at all; offers now come, and signing waits for the pitch. |
| Central conflict, point of view, intended ending | Story panel | Form the **Treatment**. A commissioner or grant application includes it. | Same | Yes | Real constraint (funds and commissioners ask for treatments), labelled assumption as to who asks. Corrected shortcut: in #33, without a treatment every backer answered a week later. Decisions never read the text: tests prove timing is identical with or without it. |
| Theme, stakes (and central question for nonfiction) | Story panel | Form the **Statement Of Intent** a grant application includes | Same | Yes | As above. |
| Sent documents | Approach → `FinanceDeal.sent` | Recorded with the deal | Backers card: "Sent with the approved script: …. They read it; SLATE doesn't judge it." | Yes | Record. |
| Tone, intended experience, story setting | Story panel and New Script | Nothing. They are the writer's record and brief. | Story panel text, hints | Yes | Creative description. Corrected shortcut: #33 made a missing "brief" add a day to the score and a unit to design. |
| Story setting place | New Script (optional) | Nothing. A reference kept with the project. | The section's text says it adds no travel or work | Yes | Creative description. Corrected shortcut: #33 added a scouting trip there, though a story's setting isn't where it is shot. |
| Competes As | New Script and Story panel → `axes.register` | Where awards that split drama from comedy enter it; unset, its genres decide | Hint | Yes | Real constraint: entrants declare it (the Golden Globes' comedy or musical split is the familiar case). It is now editable after creation. |
| Intended audience | New Script | Advice only: with moderate or strong declared content, the Content card says outlets for that audience usually expect milder content | Content card | Yes | Corrected shortcut: an intimate-scene checkbox in a family or children's project blocked approval, and the audience fed an invented rating. |
| Content (new) | Content card → `axes.content` by issue (violence, threat and horror, sexual content, nudity, language, drug use) at Mild, Moderate or Strong; or Declare None Of These | Strong content: broadcast offers come for a late slot at 75% of the guarantee, or the full guarantee with a broadcast edit ($2,500 more in delivery materials). Streaming contracts need a declaration. Fixed once delivered. | Content card ("only a classification body gives a rating"), and each offer cites the rule | Yes | Real constraint: the GB watershed (Ofcom Broadcasting Code, 9pm) and the US broadcast safe harbour (FCC, 10pm to 6am) are cited. Elsewhere it is labelled as an assumption. The 75% and $2,500 are simulation assumptions. Corrected shortcut: #33 inferred an "18+" rating from the audience and an intimacy checkbox, and 18+ projects got no broadcast offers at all. |
| Intimacy and stunt flags | Scene editor | Specialist crew, rehearsal and coordinator work as before. They suggest declaring sexual content or violence; they never set a level. | Content card suggestions | Yes | Real constraint (crew). Suggestion (content). |
| Essential To The Story (new) | Scene editor → `Scene.essential` | If the scene is cut from the edit, editing is 8 lower (`ESSENTIAL_CUT_COST`). Nothing if it is shot or picked up. | The check box's hint, and the cut dialog states it | Yes | Simulation assumption, from an explicit player declaration. Corrected shortcut: text written in Turning Point cost the edit 6 if the scene went unshot, which picture lock already made impossible. Turning Point is now a note SLATE doesn't read. |
| Setups, clues, reveals | Setup ledger (planted in one scene, paid off in another) | Count toward the script when both scenes are in the cut. Cutting one says which payoff loses its setup. | Cut dialog (`cutConsequences`) | Yes | Structured choice. Order isn't read: a payoff shown first and marked Intentional Discontinuity scores the same (test). Intentional Discontinuity is now offered for every project, not only formal-genre ones. |
| Missing footage | Coverage card | Each gap offers Request Pickups (a shoot day, paid as any other), waiting for its scheduled day, or Cut It From The Edit (shorter runtime; consequences listed; Restore It until picture lock). A day left empty is cancelled. Cut scenes stop holding up assembly and lock. | Coverage card, cut dialog, lock blockers ("Schedule a pickup, or cut it from the edit.") | `Edit.cutSceneIds` | Real constraint (pickups and cutting around a gap are what editing does). The cost is a simulation assumption. |
| Dialogue length, script length | Scene editor | Shows the spoken length at about 150 words a minute, as a guide | Scene editor | n/a | Creative description. Corrected shortcut: word-count notes cost quality, and backers counted them. |
| Subtitles | Distribution offer | Runtime × $12 a minute for each territory language the declared dialogue languages don't include | Offer text | n/a | Simulation assumption. Corrected shortcut: priced by words written, so writing less dialogue made subtitles cheaper. |
| Objective, genre questions, world rules, relationships, tonal intention, found-footage operator, anthology link | Scene editor, genre panel | Shown as **prompts** ("for your own writing"): never counted in the script assessment or by backers, and a revision note made from one earns nothing when it's resolved (`Issue.advisory`, `RevisionNote.advisory`) | Readiness card | Yes | Creative description. Corrected shortcut: a filled objective was worth up to 6, answered genre questions up to 4, and each empty one cost 1.5 and lowered backers' odds, all satisfiable with any text. Unscripted format rules still block approval. A show can't run without its rules; that is a requirement, not a reward. |

## Script Assessment After The Review

`script = 42 + setups × 10 + min(10, resolved structural notes × 2) − min(20, open structural notes × 1.5) + writing help`.
The base went from 40 to 42. It was set so the balance suite's mean overall quality per family stays within half a point
of before (`docs/balance-results.json`). Held-out combinations whose scripts wrote every objective and had no open genre
questions fell about 2 overall (`docs/balance-heldout.json`). Those text points are gone, which is the intent.

## Saves And History

- New fields are optional (`awardPlacement`, `essential`, `axes.content`, `edit.cutSceneIds`, `FinanceDeal.sent`,
  offer `slot` and `editedGuarantee`), so no save migration was needed. Old saves open with them unset: placement by role
  size, nothing essential, content not declared yet.
- Delivered projects keep the quality, credits and offers stored at delivery. Nothing is recomputed on load (test).
- Active projects use the revised rules from now on. Consequences for an active save:
  - Text in Turning Point no longer marks a scene. Mark Essential To The Story to declare one.
  - A streaming offer can't be accepted until content is declared.
  - Revision notes resolved from presence-only prompts no longer earn the 2 points they did.
- Fixed-seed reference results (`tests/fixtures-data/production-golden.json`) changed only in quality: script 46–55
  became 47–48, overall and reception moved by 2 points or less. Money, timing, tasks and credits are unchanged.

## Not Modeled

- No classification board decides a rating. The game cites two broadcast scheduling rules and labels everything else.
- No organizer reassigns an acting placement.
- Credits for a performer whose only scene was cut still list them.
- Content can't be verified against what was shot: the declaration is the producer's, fixed at delivery.
