# UI Coverage Matrix

Written by `node tools/v3/ui-coverage.mjs` from `docs/v3/ui-inventory.json`, the walk (`e2e/ui-coverage.spec.ts`, last run 2026-11-12) and the journey sweep (`SLATE_UI_SWEEP`). The owner's brief is `docs/v3/UI-BRIEF.md`.

78 rows. 34 measured, 44 not visited. 0 open defects.

What the columns mean. **Walked**: the screen was opened on purpose and measured at that many window sizes in each browser profile. **Desktop And Phone**: the same screen in the same state at 1280 and at 390 pixels wide, compared for headings, things to press, fields and their order. **Reached In Journeys**: a full play-through reached it and the same measure ran there, at the sizes listed. A screen measured only in journeys was not compared between desktop and phone. Browser emulation is not a real device: nothing here measures a virtual keyboard, and that is tracked in the limits below.

| Area | Screen | Kind | Walked: sizes measured | Desktop And Phone | Reached In Journeys | Open Defects |
|---|---|---|---|---|---|---|
| Startup | Start Screen | screen | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Startup | Opening Your Game (Loading) | state | no | not compared | no | **not visited** |
| Startup | Couldn't Open This Save (Error) | state | no | not compared | no | **not visited** |
| Startup | Choose Missing Places (Repair) | state | no | not compared | no | **not visited** |
| Startup | Saved Games (From The Start Screen) | screen | no | not compared | no | **not visited** |
| Startup | Creation: Identity | screen | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Startup | Creation: Background And Languages | screen | no | not compared | no | **not visited** |
| Startup | Creation: Starting Point | screen | no | not compared | no | **not visited** |
| Startup | Creation: Review | screen | no | not compared | no | **not visited** |
| Shell | Menu Drawer (Phone And Tablet) (The rail on a desktop; a drawer under 900 pixels.) | menu | iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Home | Home | screen | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| You | Player Profile | screen | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Your Day | Calendar | screen | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Your Day | Festival Or Awards Edition | screen | no | not compared | no | **not visited** |
| Your Day | World | screen | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Your Day | A Place | screen | no | not compared | no | **not visited** |
| Industry | Companies | screen | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Industry | A Company | screen | no | not compared | no | **not visited** |
| Industry | A Film Or Series | screen | no | not compared | no | **not visited** |
| Industry | A Season | screen | no | not compared | no | **not visited** |
| Industry | An Episode | screen | no | not compared | no | **not visited** |
| Industry | A Person | screen | no | not compared | no | **not visited** |
| Industry | Networks And Streaming Services | screen | no | not compared | no | **not visited** |
| Industry | A Network | screen | no | not compared | no | **not visited** |
| Industry | An Executive | screen | no | not compared | no | **not visited** |
| Your Work | Projects | screen | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Your Work | New Script | screen | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Your Game | Saved Games | screen | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Your Game | Settings | screen | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Project | Project: Overview | tab | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Project | Project: Script | tab | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Project | Project: Characters | tab | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Project | Project: Cast | tab | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Project | Project: Crew | tab | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Project | Project: Schedule | tab | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Project | Project: Budget | tab | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Project | Project: Production | tab | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Project | Project: Edit | tab | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Project | Project: Release | tab | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Project | Project: Festivals And Awards | tab | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Shell | Sleep | dialog | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Shell | Advance | dialog | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Startup | Settings (From The Start Screen) | dialog | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Startup | Start Over? | dialog | no | not compared | no | **not visited** |
| Your Day | Add Plan | dialog | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Your Game | Delete This Save? | dialog | no | not compared | no | **not visited** |
| Your Game | Rename Save | dialog | no | not compared | no | **not visited** |
| Your Game | This Save Is Already Here | dialog | no | not compared | no | **not visited** |
| Your Game | Replace This Save? | dialog | no | not compared | no | **not visited** |
| Your Game | Delete This Copy? | dialog | no | not compared | no | **not visited** |
| Project | Shelve The Project | dialog | no | not compared | no | **not visited** |
| Script | Choose A Full Story | dialog | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Script | A Full Story, Open | dialog | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Script | Choose Ideas | dialog | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Script | An Idea, Open | dialog | no | not compared | no | **not visited** |
| Script | Approve This Draft? | dialog | no | not compared | no | **not visited** |
| Script | Compare Draft | dialog | no | not compared | no | **not visited** |
| Script | Rename Draft | dialog | no | not compared | no | **not visited** |
| Script | Delete This Scene? | dialog | no | not compared | no | **not visited** |
| Script | A Script Change That Touches Other Work (Split The Scene, Combine The Scenes and the like: titled with the change.) | dialog | no | not compared | no | **not visited** |
| Script | Change The Rule | dialog | no | not compared | no | **not visited** |
| Script | Remove The Rule | dialog | no | not compared | no | **not visited** |
| Script | Change The Relationship | dialog | no | not compared | no | **not visited** |
| Script | Remove The Relationship | dialog | no | not compared | no | **not visited** |
| Characters | Take A Character Out Of The Script? | dialog | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Script | A Contributor Withdraws? | dialog | no | not compared | no | **not visited** |
| Budget | Accept These Terms? | dialog | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Cast | Cast A Character (Find Performers) | dialog | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |
| Crew | Hire A Crew Member | dialog | no | not compared | no | **not visited** |
| Crew | Staff A Department | dialog | no | not compared | no | **not visited** |
| Crew | Hire A Writer Or Director | dialog | no | not compared | no | **not visited** |
| Schedule | Where A Place Is Filmed | dialog | no | not compared | no | **not visited** |
| Edit | Cut This Scene From The Edit? | dialog | no | not compared | no | **not visited** |
| Release | Change These Episode Dates? | dialog | no | not compared | no | **not visited** |
| Release | Cancel This Release? | dialog | no | not compared | no | **not visited** |
| Festivals And Awards | Prepare Submission | dialog | no | not compared | no | **not visited** |
| Edit | Change The Approved Take? | dialog | no | not compared | no | **not visited** |
| Script | A Scene, Open | panel | desktop: 4, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | none found |

## Open Defects

None found by the measures above.

## Accepted, With The Reason

- January #: span.dot keeps to one line and ends in an ellipsis; pressing it shows the whole
- Map: the map's markers are under # pixels; the list of places beside the map opens the same places

## Panes That Scroll Sideways On Purpose

- div.tabs "Ideas" in Choose A Starting Idea
- div.tabs "Project Sections" in 

## Reached In Journeys But Not In The Inventory

None.
