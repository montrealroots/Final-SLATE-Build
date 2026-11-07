# The 1221 Layout

On November 7, 2026 the user asked for the game's screens to be set up exactly like the 1221 repository's
(`montrealroots/1221`, read at `d6eba5d`), keeping Final SLATE's own game: its look and layout, not 1221's features.
1221 is an actor's life simulator (drama school, an acting career, a bank, tax papers); none of those were added, and
nothing Final SLATE has was removed.

## What Was Taken From 1221

| Part | 1221 source | Here |
| --- | --- | --- |
| Design system: tokens, type, buttons, fields, cards, callouts, chips, lists, tabs, dialogs, the bar, the rail, Home's grid | `src/styles/app.css` | `src/ui/app.css`, copied whole, followed by a short section for Final SLATE's own elements (film tables, the review list, calendar cells, scene cards, pick lists) |
| The frame: the bar across the top, the rail down the left, the screen in a scrolling column | `ui/shell/GameShell.tsx` | `src/ui/Shell.tsx` |
| The bar: SLATE, the time with its date and zone, Running or Paused, the time controls, then Saved and Save & Exit | `GameShell`, `TimeControls` | Sleep and Advance (1221's Play and Look After Yourself are 1221 features and weren't added) |
| The rail in groups, with Home first and the player at its foot; a drawer below a laptop's width, with Save & Exit in its foot | `ui/shell/destinations.ts` | `src/ui/routes.ts`: You (Player Profile), Your Day (World), Your Work (Projects), Your Game (Saved Games, Settings). The calendar is Home's, as 1221's is: Up Next's Open Calendar and the calendar's Back To Home |
| Home: the day, the place, the zone, the season and the daylight under "Good Morning, …", the sky and five days ahead on the right, then the cards in two columns | `ui/screens/Home.tsx` | Projects, Up Next (Open Calendar) and Recent Updates (Go There); Today's details moved into the head |
| A screen's head: an eyebrow naming its group, the title, a line on what it's for, then the tab bar | `workspaces/*Workspace.tsx`, `components/TabBar.tsx` | `PageHead` and `SectionNav` in `src/ui/components.tsx`; the project's sections are one scrolling row of tabs on every width (the phone's section menu is gone, as 1221 has none) |
| Cards with a head: title and a line under it, actions on the right | `components/primitives.tsx` `Panel` | `Panel` in `src/ui/components.tsx` |
| Dialogs: a head with ✕, the body, a foot for the actions | `primitives.tsx` `Modal` | `Modal` |
| The start screen and creation: the clapper and SLATE spaced wide; creation under "Who Are You Going To Be?" with Cancel, the steps as a row of tabs, one card, Back and Continue under it | `saves/SaveSlots.tsx`, `creation/CharacterCreation.tsx` | Final SLATE's own actions and eight steps kept (New Game, Continue, Saved Games, Settings; Next: … and Start My Story) |

## What Stayed Final SLATE's

Every engine, every screen's content and every control: projects, financing, casting, crew, schedules, production,
motion capture, festivals, releases, the world, saves and Import Save. Final SLATE has more saves than 1221's three
slots, so the start screen keeps its save list rather than slots.

## Changed Words

- "Save And Exit" is now "Save & Exit", and "Profile" on the rail is "Player Profile", as in 1221.
- Home's heading is the greeting; the bar's screen name and the rail mark where you are.
