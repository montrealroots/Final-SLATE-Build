# Copy Guide

The game's visible words follow these rules. They come from the 1221 adaptation (`UI-1221-ADAPTATION.md` in the Gap Completion Package), the 1221 repository itself (`docs/UI-1221-LAYOUT.md`, November 7, 2026) and the base package. Check new strings against this page.

## Case

- **Title Case:** navigation, page and section headings, named actions (buttons and links), tabs, field labels, dialog titles. Small words stay capitalized as in the base build ("Back To Start Screen", "Back To Home"). Save & Exit keeps 1221's ampersand.
- **Sentence case:** narrative, explanations, hints, alerts, notices and empty states.
- Proper names keep their own spelling and capitalization, including names in other languages and scripts (holiday names, places, people).
- No CSS that uppercases text, except 1221's eyebrows and rail group labels ("Your Work"), which are written in Title Case and shown in capitals.

## Fixed Strings

| Where | Text |
| --- | --- |
| Startup heading | SLATE |
| Startup line | Your next story starts here. |
| Startup actions, in order | New Game, Continue (only when a save exists), Saved Games, Settings |
| Creation sections, in order | Your Name, Pronouns, Background, Languages, Birthday, Starting Date, Starting Location, Review |
| Main language question | Which language do you use most? |
| Professions | Screenwriter · Producer · Director · Actor (or the player's chosen acting title) |
| Final creation action | Start My Story |
| Save failure | Your game couldn't be saved. Keep this window open and try again. Action: Try Again |
| Place search, no results | No places match '{query}'. Try a city, region, or country. |
| Place search, load failure | Places couldn't be loaded. Action: Try Again |
| Navigation (one registry, `src/ui/routes.ts`) | Home; You: Player Profile; Your Day: World (Calendar is Home's, by Open Calendar); Your Work: Projects; Your Game: Saved Games, Settings |
| Home heading | Good Morning / Afternoon / Evening, {first name}. |
| The bar | the time, date, zone, Running or Paused (Asleep while you sleep), Sleep, Advance; then Saved and Save & Exit |

Strings for screenings, schedule conflicts, weather moves, festival review and unannounced editions are listed in the package and are added with the features that show them (milestones M5 and M6 in `RESUME-HERE.md`).

## Voice

- Say what is true for the player now, and what they can do about it. No source dumps or research notes on screen; provenance lives in `docs/DATA-PROVENANCE.md`.
- Never say something happened before it did ("Saved" only after the write is verified).
- Name uncertainty plainly: "expected", "projected", "Planning dates are shown."
- No jargon, internal IDs or engine terms.
