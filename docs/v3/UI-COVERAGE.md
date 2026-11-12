# UI Coverage Matrix

Written by `node tools/v3/ui-coverage.mjs` from `docs/v3/ui-inventory.json`, the walk (`e2e/ui-coverage.spec.ts`, last run 2026-11-12) and the journey sweep (`SLATE_UI_SWEEP`). The owner's brief is `docs/v3/UI-BRIEF.md`.

78 rows. 58 measured, 20 not visited. 0 open defects.

What the columns mean. **Walked**: the screen was opened on purpose and measured at that many window sizes in each browser profile. **Desktop And Phone**: the same screen in the same state at 1280 and at 390 pixels wide, compared for headings, things to press, fields and their order. **Reached In Journeys**: a full play-through reached it and the same measure ran there, at the sizes listed. **Desktop And Phone, In Journeys**: what the screen offered when the same journeys ran in each layout. Browser emulation is not a real device: nothing here measures a virtual keyboard, and that is tracked in the limits below.

| Area | Screen | Kind | Walked: sizes measured | Desktop And Phone, Walked | Reached In Journeys | Desktop And Phone, In Journeys | Open Defects |
|---|---|---|---|---|---|---|---|
| Startup | Start Screen | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Startup | Opening Your Game (Loading) | state | no | not compared | no | not compared | **not visited** |
| Startup | Couldn't Open This Save (Error) | state | no | not compared | no | not compared | **not visited** |
| Startup | Choose Missing Places (Repair) | state | no | not compared | no | not compared | **not visited** |
| Startup | Saved Games (From The Start Screen) | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Startup | Creation: Identity | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Startup | Creation: Background And Languages | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Startup | Creation: Starting Point | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Startup | Creation: Review | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Shell | Menu Drawer (Phone And Tablet) (The rail on a desktop; a drawer under 900 pixels.) | menu | iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | not compared | no | not compared | none found |
| Home | Home | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| You | Player Profile | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Day | Calendar | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Day | Festival Or Awards Edition | screen | no | not compared | no | not compared | **not visited** |
| Your Day | World | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Day | A Place | screen | no | not compared | no | not compared | **not visited** |
| Industry | Companies | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Industry | A Company | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Industry | A Film Or Series | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Industry | A Season | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Industry | An Episode | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Industry | A Person | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Industry | Networks And Streaming Services | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Industry | A Network | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Industry | An Executive | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Work | Projects | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Work | New Script | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Game | Saved Games | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Game | Settings | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Project | Project: Overview | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Project | Project: Script | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Project | Project: Characters | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Project | Project: Cast | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Project | Project: Crew | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Project | Project: Schedule | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Project | Project: Budget | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Project | Project: Production | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Project | Project: Edit | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Project | Project: Release | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Project | Project: Festivals And Awards | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Shell | Sleep | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Shell | Advance | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Startup | Settings (From The Start Screen) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Startup | Start Over? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Day | Add Plan | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Game | Delete This Save? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Game | Rename Save | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Game | This Save Is Already Here | dialog | no | not compared | no | not compared | **not visited** |
| Your Game | Replace This Save? | dialog | no | not compared | no | not compared | **not visited** |
| Your Game | Delete This Copy? | dialog | no | not compared | no | not compared | **not visited** |
| Project | Shelve The Project | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | Choose A Full Story | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | A Full Story, Open | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | An Idea, Open | dialog | no | not compared | no | not compared | **not visited** |
| Script | Approve This Draft? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | Compare Draft | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | Rename Draft | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | Delete This Scene? | dialog | no | not compared | no | not compared | **not visited** |
| Script | A Script Change That Touches Other Work (Split The Scene, Combine The Scenes and the like: titled with the change.) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | Change The Rule | dialog | no | not compared | no | not compared | **not visited** |
| Script | Remove The Rule | dialog | no | not compared | no | not compared | **not visited** |
| Script | Change The Relationship | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | Remove The Relationship | dialog | no | not compared | no | not compared | **not visited** |
| Characters | Take A Character Out Of The Script? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | A Contributor Withdraws? | dialog | no | not compared | no | not compared | **not visited** |
| Budget | Accept These Terms? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Cast | Cast A Character (Find Performers) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Crew | Hire A Crew Member | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Crew | Staff A Department | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Crew | Hire A Writer Or Director | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Schedule | Where A Place Is Filmed | dialog | no | not compared | no | not compared | **not visited** |
| Edit | Cut This Scene From The Edit? | dialog | no | not compared | no | not compared | **not visited** |
| Release | Change These Episode Dates? | dialog | no | not compared | no | not compared | **not visited** |
| Release | Cancel This Release? | dialog | no | not compared | no | not compared | **not visited** |
| Festivals And Awards | Prepare Submission | dialog | no | not compared | no | not compared | **not visited** |
| Edit | Change The Approved Take? | dialog | no | not compared | no | not compared | **not visited** |
| Script | A Scene, Open | panel | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |

## Open Defects

None found by the measures above.

## Seen In One Layout's Journeys And Not The Other's

From the same journeys run on a desktop and on a phone. A journey is sampled as it plays, so something on screen for under half a second can be caught in one run and missed in the other; these are to be looked at, not counted as defects.

None.

## Accepted, With The Reason

- January #: span.dot keeps to one line and ends in an ellipsis; pressing it shows the whole
- Map: the map's markers are under # pixels; the list of places beside the map opens the same places
- Where You Live: the map's markers are under # pixels; the list of places beside the map opens the same places

## Panes That Scroll Sideways On Purpose

- div.tabs "Ideas" in Choose A Starting Idea
- div.tabs "Project Sections" in 

## Reached In Journeys But Not In The Inventory

None.
