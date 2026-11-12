# UI Coverage Matrix

Written by `node tools/v3/ui-coverage.mjs` from `docs/v3/ui-inventory.json`, the walk (`e2e/ui-coverage.spec.ts`, last run 2026-11-12) and the journey sweep (`SLATE_UI_SWEEP`). The owner's brief is `docs/v3/UI-BRIEF.md`.

78 rows. 64 measured, 14 not visited. 0 open defects.

What the columns mean. **Walked**: the screen was opened on purpose and measured at that many window sizes in each browser profile. **Desktop And Phone**: the same screen in the same state at 1280 and at 390 pixels wide, compared for headings, things to press, fields and their order. **Reached In Journeys**: a full play-through reached it and the same measure ran there, at the sizes listed. **Desktop And Phone, In Journeys**: what the screen offered when the same journeys ran in each layout. Browser emulation is not a real device: nothing here measures a virtual keyboard, and that is tracked in the limits below.

| Area | Screen | Kind | Walked: sizes measured | Desktop And Phone, Walked | Reached In Journeys | Desktop And Phone, In Journeys | Open Defects |
|---|---|---|---|---|---|---|---|
| Startup | Start Screen | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (844x390), desktop (600x960 320x568) | 4 things in both | none found |
| Startup | Opening Your Game (Loading) | state | no | not compared | no | not compared | **not visited** |
| Startup | Couldn't Open This Save (Error) | state | no | not compared | no | not compared | **not visited** |
| Startup | Choose Missing Places (Repair) | state | no | not compared | no | not compared | **not visited** |
| Startup | Saved Games (From The Start Screen) | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720) | 10 things in both | none found |
| Startup | Creation: Identity | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720) | 87 things in both | none found |
| Startup | Creation: Background And Languages | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720 1024x768) | 77 things in both, 3 seen only on desktop, 14 only on phone (listed below) | none found |
| Startup | Creation: Starting Point | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720) | not compared | none found |
| Startup | Creation: Review | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720) | 13 things in both | none found |
| Shell | Menu Drawer (Phone And Tablet) (The rail on a desktop; a drawer under 900 pixels.) | menu | iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | not compared | no | not compared | none found |
| Home | Home | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 430x932 667x375 1280x720), desktop (1280x720 768x1024 320x568 390x844 1440x900) | 441 things in both, 162 seen only on desktop, 101 only on phone (listed below) | none found |
| You | Player Profile | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568 390x844) | 10 things in both | none found |
| Your Day | Calendar | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568) | 99 things in both, 17 seen only on desktop, 16 only on phone (listed below) | none found |
| Your Day | Festival Or Awards Edition | screen | no | not compared | phone (390x844), desktop (1280x720) | 84 things in both, 1 seen only on desktop, 2 only on phone (listed below) | none found |
| Your Day | World | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568 360x800 390x844 1024x768) | 30 things in both | none found |
| Your Day | A Place | screen | no | not compared | phone (390x844), desktop (1280x720 393x852 414x896 440x956) | 42 things in both, 0 seen only on desktop, 9 only on phone (listed below) | none found |
| Industry | Companies | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568) | 147 things in both | none found |
| Industry | A Company | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568) | 29 things in both, 1 seen only on desktop, 1 only on phone (listed below) | none found |
| Industry | A Film Or Series | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568) | 28 things in both | none found |
| Industry | A Season | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568) | 12 things in both | none found |
| Industry | An Episode | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568) | 22 things in both | none found |
| Industry | A Person | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568) | 20 things in both, 1 seen only on desktop, 1 only on phone (listed below) | none found |
| Industry | Networks And Streaming Services | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568) | 8 things in both | none found |
| Industry | A Network | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1024x768 768x1024 320x568) | 14 things in both | none found |
| Industry | An Executive | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1024x768 768x1024 320x568) | 9 things in both | none found |
| Your Work | Projects | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568 1024x768 360x800) | 41 things in both | none found |
| Your Work | New Script | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 360x740 667x375), desktop (1280x720 768x1024 320x568) | 43 things in both, 28 seen only on desktop, 1 only on phone (listed below) | none found |
| Your Game | Saved Games | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 1920x1080) | 21 things in both, 2 seen only on desktop, 0 only on phone (listed below) | none found |
| Your Game | Settings | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568 390x844) | 33 things in both | none found |
| Project | Project: Overview | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568) | 69 things in both, 2 seen only on desktop, 2 only on phone (listed below) | none found |
| Project | Project: Script | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 844x390 1280x720 667x375), desktop (1280x720 768x1024 320x568 600x960 1024x768 844x390) | 625 things in both, 88 seen only on desktop, 13 only on phone (listed below) | none found |
| Project | Project: Characters | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568 360x800 414x896 1440x900) | 133 things in both | none found |
| Project | Project: Cast | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375 360x740), desktop (1280x720 1024x768 768x1024 320x568 440x956) | 58 things in both, 0 seen only on desktop, 1 only on phone (listed below) | none found |
| Project | Project: Crew | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568 390x844 1920x1080) | 71 things in both, 5 seen only on desktop, 0 only on phone (listed below) | none found |
| Project | Project: Schedule | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568) | 63 things in both, 1 seen only on desktop, 2 only on phone (listed below) | none found |
| Project | Project: Budget | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 844x390 667x375 1280x720 360x740), desktop (1280x720 1024x768 768x1024 600x960 393x852 430x932) | 212 things in both, 3 seen only on desktop, 0 only on phone (listed below) | none found |
| Project | Project: Production | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 360x740 667x375), desktop (1280x720 768x1024 320x568) | 72 things in both, 2 seen only on desktop, 4 only on phone (listed below) | none found |
| Project | Project: Edit | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568 844x390) | 98 things in both, 10 seen only on desktop, 6 only on phone (listed below) | none found |
| Project | Project: Release | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568) | 48 things in both, 3 seen only on desktop, 4 only on phone (listed below) | none found |
| Project | Project: Festivals And Awards | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 430x932 667x375), desktop (1280x720 768x1024 320x568 1920x1080) | 52 things in both | none found |
| Shell | Sleep | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 430x932 844x390 1280x720), desktop (1024x768 768x1024 320x568) | 7 things in both | none found |
| Shell | Advance | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 360x740 667x375), desktop (1280x720 600x960 360x800 414x896 768x1024) | 30 things in both | none found |
| Startup | Settings (From The Start Screen) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720) | 9 things in both | none found |
| Startup | Start Over? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1024x768) | not compared | none found |
| Your Day | Add Plan | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1024x768 600x960) | 8 things in both | none found |
| Your Game | Delete This Save? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1024x768) | not compared | none found |
| Your Game | Rename Save | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1024x768 600x960) | not compared | none found |
| Your Game | This Save Is Already Here | dialog | no | not compared | phone (390x844) | not compared | none found |
| Your Game | Replace This Save? | dialog | no | not compared | no | not compared | **not visited** |
| Your Game | Delete This Copy? | dialog | no | not compared | no | not compared | **not visited** |
| Project | Shelve The Project | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1280x720 600x960) | not compared | none found |
| Script | Choose A Full Story | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568) | 6 things in both | none found |
| Script | A Full Story, Open | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568) | 37 things in both | none found |
| Script | Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568) | 96 things in both, 13 seen only on desktop, 0 only on phone (listed below) | none found |
| Script | An Idea, Open | dialog | no | not compared | desktop (1280x720) | not compared | none found |
| Script | Approve This Draft? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1280x720 768x1024 600x960) | not compared | none found |
| Script | Compare Draft | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1280x720 768x1024 320x568) | not compared | none found |
| Script | Rename Draft | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1280x720 768x1024 320x568) | not compared | none found |
| Script | Delete This Scene? | dialog | no | not compared | no | not compared | **not visited** |
| Script | A Script Change That Touches Other Work (Split The Scene, Combine The Scenes and the like: titled with the change.) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1280x720 768x1024 320x568) | not compared | none found |
| Script | Change The Rule | dialog | no | not compared | no | not compared | **not visited** |
| Script | Remove The Rule | dialog | no | not compared | no | not compared | **not visited** |
| Script | Change The Relationship | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1024x768 768x1024 600x960) | not compared | none found |
| Script | Remove The Relationship | dialog | no | not compared | no | not compared | **not visited** |
| Characters | Take A Character Out Of The Script? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568) | 6 things in both | none found |
| Script | A Contributor Withdraws? | dialog | no | not compared | no | not compared | **not visited** |
| Budget | Accept These Terms? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 600x960) | 4 things in both | none found |
| Cast | Cast A Character (Find Performers) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 844x390), desktop (1280x720 768x1024 320x568) | 208 things in both | none found |
| Crew | Hire A Crew Member | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1024x768 768x1024 320x568 1280x720) | not compared | none found |
| Crew | Staff A Department | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720 600x960) | 40 things in both | none found |
| Crew | Hire A Writer Or Director | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Schedule | Where A Place Is Filmed | dialog | no | not compared | phone (390x844), desktop (1280x720) | 9 things in both, 0 seen only on desktop, 19 only on phone (listed below) | none found |
| Edit | Cut This Scene From The Edit? | dialog | no | not compared | no | not compared | **not visited** |
| Release | Change These Episode Dates? | dialog | no | not compared | no | not compared | **not visited** |
| Release | Cancel This Release? | dialog | no | not compared | no | not compared | **not visited** |
| Festivals And Awards | Prepare Submission | dialog | no | not compared | phone (390x844), desktop (1280x720) | 6 things in both | none found |
| Edit | Change The Approved Take? | dialog | no | not compared | no | not compared | **not visited** |
| Script | A Scene, Open | panel | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |

## Open Defects

None found by the measures above.

## Seen In One Layout's Journeys And Not The Other's

From the same journeys run on a desktop and on a phone. A journey is sampled as it plays, so something on screen for under half a second can be caught in one run and missed in the other; these are to be looked at, not counted as defects.

| Screen | Seen | What |
|---|---|---|
| A Company | desktop only | press: Crimson Animals |
| A Company | phone only | press: Quiet Legend |
| A Person | desktop only | press: Open Harbour Song |
| A Person | phone only | press: Open Night Ferry |
| A Place | phone only | heading: In Cinemas In Finland |
| A Place | phone only | heading: Vatican City, Vatican |
| A Place | phone only | press: Mortal Kombat II |
| A Place | phone only | press: Passenger |
| A Place | phone only | press: Reminders of Him |
| A Place | phone only | press: The Mandalorian and Grogu |
| A Place | phone only | press: The Sheep Detectives |
| A Place | phone only | press: They Will Kill You |
| A Place | phone only | press: You, Me & Tuscany |
| Calendar | desktop only | heading: August # |
| Calendar | desktop only | press: Friday, August #, # |
| Calendar | desktop only | press: Friday, August #, #, # entry |
| Calendar | desktop only | press: Golden Globe Awards # |
| Calendar | desktop only | press: Monday, August #, # |
| Calendar | desktop only | press: Monday, August #, #, # entries |
| Calendar | desktop only | press: Monday, August #, #, # entry |
| Calendar | desktop only | press: Saturday, August #, # |
| Calendar | desktop only | press: Saturday, August #, #, # entry |
| Calendar | desktop only | press: Sunday, August #, # |
| Calendar | desktop only | press: Sunday, August #, #, # entry |
| Calendar | desktop only | press: Thursday, August #, # |
| Calendar | desktop only | press: Thursday, August #, #, # entry |
| Calendar | desktop only | press: Tuesday, August #, # |
| Calendar | desktop only | press: Tuesday, August #, #, # entry |
| Calendar | desktop only | press: Wednesday, August #, # |
| Calendar | desktop only | press: Wednesday, August #, #, # entry |
| Calendar | phone only | heading: June # |
| Calendar | phone only | press: Friday, June #, # |
| Calendar | phone only | press: Friday, June #, #, # entry |
| Calendar | phone only | press: Monday, June #, # |
| Calendar | phone only | press: Monday, June #, #, # entry |
| Calendar | phone only | press: Producers Guild Awards # |
| Calendar | phone only | press: Saturday, June #, # |
| Calendar | phone only | press: Saturday, June #, #, # entry |
| Calendar | phone only | press: Sunday, June #, # |
| Calendar | phone only | press: Sunday, June #, #, # entry |
| Calendar | phone only | press: Thursday, June #, # |
| Calendar | phone only | press: Thursday, June #, #, # entry |
| Calendar | phone only | press: Tuesday, June #, # |
| Calendar | phone only | press: Tuesday, June #, #, # entry |
| Calendar | phone only | press: Wednesday, June #, # |
| Calendar | phone only | press: Wednesday, June #, #, # entry |
| Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | desktop only | press: Closing NightA failing theater company discovers that its final |
| Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | desktop only | press: The Festival DetourInes Vaartjes, a filmmaker stranded with a r |
| Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | desktop only | press: The Last Night TrainPassengers on a diverted train must decide  |
| Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | desktop only | press: The Missing MinuteSol Aguirre, an apprentice editor, finds the  |
| Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | desktop only | press: The Second First DayOdile Farrow, a substitute teacher, relives |
| Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | desktop only | press: The Substitute ChampionHollis Grange, a retired amateur, is ask |
| Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | desktop only | press: backstage (#) |
| Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | desktop only | press: city (#) |
| Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | desktop only | press: identity (#) |
| Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | desktop only | press: journey (#) |
| Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | desktop only | press: night (#) |
| Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | desktop only | press: one location (#) |
| Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | desktop only | press: time (#) |
| Creation: Background And Languages | desktop only | press: Add Ethnicity: Korean |
| Creation: Background And Languages | desktop only | press: Add Language: English |
| Creation: Background And Languages | desktop only | press: Remove Afro-Mexican from Costa Chica |
| Creation: Background And Languages | phone only | field: Pesach (Passover) |
| Creation: Background And Languages | phone only | field: Rosh Hashanah |
| Creation: Background And Languages | phone only | field: Shavuot |
| Creation: Background And Languages | phone only | field: Sukkot |
| Creation: Background And Languages | phone only | field: Yom Kippur |
| Creation: Background And Languages | phone only | press: Add Language: Hebrew |
| Creation: Background And Languages | phone only | press: Add Language: Yoruba |
| Creation: Background And Languages | phone only | press: Add Nationality: Israel |
| Creation: Background And Languages | phone only | press: AmharicFrom your backgrounds |
| Creation: Background And Languages | phone only | press: HebrewFrom your backgrounds |
| Creation: Background And Languages | phone only | press: Remove Beta Israel |
| Creation: Background And Languages | phone only | press: Remove Korean |
| Creation: Background And Languages | phone only | press: Remove Yoruba |
| Creation: Background And Languages | phone only | press: YorubaFrom your backgrounds |
| Festival Or Awards Edition | desktop only | press: Amaranta Okonkwo-Villaseñor de la Cruz, Open Your Player Profil |
| Festival Or Awards Edition | phone only | heading: Advance Stopped |
| Festival Or Awards Edition | phone only | press: Dismiss |
| Home | desktop only | heading: Time Is Paused |
| Home | desktop only | press: # HOURS, from Sony Pictures, came out. |
| Home | desktop only | press: # HOURS, from Sony Pictures, is due to come out. |
| Home | desktop only | press: A Forgotten Comet, from #th Century Studios, is due to come out |
| Home | desktop only | press: A Forgotten Forest, from Walt Disney Pictures, came out. |
| Home | desktop only | press: A Late Summer, from Universal Animation Studios, came out. |
| Home | desktop only | press: A Northern Mountain, from Focus Features, is due to come out. |
| Home | desktop only | press: A Silent Harbor, from Warner Bros. Pictures, came out. |
| Home | desktop only | press: All # episodes of Dig are due to come out on Peacock. |
| Home | desktop only | press: All # episodes of Golden Axe are due to come out on Paramount+. |
| Home | desktop only | press: All # episodes of Little House on the Prairie came out on Netfl |
| Home | desktop only | press: All # episodes of Season # of Curses! are due to come out on Ap |
| Home | desktop only | press: All # episodes of Season # of Gabby's Dollhouse are due to come |
| Home | desktop only | press: All # episodes of Season # of Mighty Monsterwheelies came out o |
| Home | desktop only | press: All # episodes of Season # of SkyMed came out on CBC Television |
| Home | desktop only | press: All # episodes of Season # of Spidey and His Amazing Friends ar |
| Home | desktop only | press: All # episodes of Season # of The Paper came out on Peacock. |
| Home | desktop only | press: All # episodes of Season # of The Proud Family: Louder and Prou |
| Home | desktop only | press: All # episodes of Season # of Timeless Tales from Hallmark are  |
| Home | desktop only | press: All # episodes of Spider-Noir are due to come out on MGM+. |
| Home | desktop only | press: All # episodes of The Five Star Weekend came out on Peacock. |
| Home | desktop only | press: All's Fair was renewed for Season #. |
| Home | desktop only | press: Amaranta Okonkwo-Villaseñor de la Cruz, Open Your Player Profil |
| Home | desktop only | press: Avatar Aang: The Last Airbender, from Nickelodeon Movies and Pa |
| Home | desktop only | press: Blue Kingdom, from Universal Pictures, came out. |
| Home | desktop only | press: Brave Voyage, from #th Century Studios, is due to come out. |
| Home | desktop only | press: Bright Promise, from Nickelodeon Movies, came out. |
| Home | desktop only | press: Bright Room, from Warner Bros. Animation, came out. |
| Home | desktop only | press: Cartoon Network cancelled Regular Show: The Lost Tapes after on |
| Home | desktop only | press: Comedy Central cancelled Mike Judge's Beavis and Butt-Head afte |
| Home | desktop only | press: Dig was renewed for Season #. |
| Home | desktop only | press: Disney+ Insider: The Mandalorian and Grogu - A New Mission Laun |
| Home | desktop only | press: Distant Field, from Castle Rock Entertainment, is due to come o |
| Home | desktop only | press: Euphoria: A Look Back, from HBO, came out. |
| Home | desktop only | press: Evil Dead Burn, from New Line Cinema and Screen Gems, came out. |
| Home | desktop only | press: FX ordered Pretty/Handsome to series. |
| Home | desktop only | press: FX passed on Pretty/Handsome; it won't go to series. |
| Home | desktop only | press: Finding Emily, from Working Title and Focus Features, came out. |
| Home | desktop only | press: Food of Empire, from Williams Street, came out. |
| Home | desktop only | press: Forgotten Comet, from Marvel Studios, is due to come out. |
| Home | desktop only | press: Forgotten Island, from DreamWorks Animation, came out. |
| Home | desktop only | press: Furious is due to premiere on Hulu. |
| Home | desktop only | press: Glass Archive, from Illumination, is due to come out. |
| Home | desktop only | press: Glass Promise, from Working Title, came out. |
| Home | desktop only | press: Hulu cancelled Only Murders in the Building after # seasons. |
| Home | desktop only | press: Imperfect Women is due to premiere on Apple TV. |
| Home | desktop only | press: Iron Signal, from DC Films, came out. |
| Home | desktop only | press: Its network ordered How I Met Your Dad to series. |
| Home | desktop only | press: Its network passed on Southern Discomfort; it won't go to serie |
| Home | desktop only | press: Its network passed on The Exit List; it won't go to series. |
| Home | desktop only | press: Krypto Saves the Day!: Space Busted, from Warner Bros. Animatio |
| Home | desktop only | press: Late Comet, from Skydance Animation, came out. |
| Home | desktop only | press: Life Drawings, from Walt Disney Animation Studios, is due to co |
| Home | desktop only | press: Lost Weather, from Williams Street, is due to come out. |
| Home | desktop only | press: Low Forest, from Screen Gems, came out. |
| Home | desktop only | press: Maddie & The Test, from Walt Disney Animation Studios, is due t |
| Home | desktop only | press: Midnight Forest, from Showtime Networks, came out. |
| Home | desktop only | press: Mike & Nick & Nick & Alice, from #th Century Studios, is due to |
| Home | desktop only | press: Moana, from Walt Disney Pictures, came out. |
| Home | desktop only | press: NBC ordered The IT Crowd to series. |
| Home | desktop only | press: PAW Patrol: The Dino Movie, from Nickelodeon Movies and Paramou |
| Home | desktop only | press: Paper Hours, from Searchlight Pictures, came out. |
| Home | desktop only | press: Practical Magic #, from Warner Bros. Pictures, came out. |
| Home | desktop only | press: President Curtis is due to premiere on Adult Swim. |
| Home | desktop only | press: Reminders of Him, from Universal Pictures, came out. |
| Home | desktop only | press: Resident Evil, from Columbia Pictures and TriStar Pictures, is  |
| Home | desktop only | press: Rooster premiered on HBO. |
| Home | desktop only | press: Season # of # was given a date: it premieres July #, #. |
| Home | desktop only | press: Season # of Afterlife with Archie was given a date: it premiere |
| Home | desktop only | press: Season # of All American is due to begin on The CW. |
| Home | desktop only | press: Season # of Archibald's Next Big Thing is due to begin on Netfl |
| Home | desktop only | press: Season # of Bob's Burgers began on FOX and Adult Swim and Adult |
| Home | desktop only | press: Season # of Celebrity Jeopardy! began on ABC. |
| Home | desktop only | press: Season # of Cherish the Day was given a date: it premieres Apri |
| Home | desktop only | press: Season # of Colin from Accounts is due to begin on Binge. |
| Home | desktop only | press: Season # of Criminal Minds is due to begin on CBS and Paramount |
| Home | desktop only | press: Season # of Cry Wolf was given a date: it premieres October #,  |
| Home | desktop only | press: Season # of Escorted was given a date: it premieres June #, #. |
| Home | desktop only | press: Season # of Family Guy is due to begin on FOX. |
| Home | desktop only | press: Season # of Faust was given a date: it premieres October #, #. |
| Home | desktop only | press: Season # of First Day on Earth was given a date: it premieres J |
| Home | desktop only | press: Season # of Happy Jack was given a date: it premieres July #, # |
| Home | desktop only | press: Season # of Heist Brothers was given a date: it premieres July  |
| Home | desktop only | press: Season # of Kitchen Nightmares Spain began on laSexta. |
| Home | desktop only | press: Season # of Krypto Saves the Day! began on YouTube and HBO Max. |
| Home | desktop only | press: Season # of Lovesick was given a date: it premieres December #, |
| Home | desktop only | press: Season # of Matlock is due to begin on CBS. |
| Home | desktop only | press: Season # of Mighty Monsterwheelies was given a date: it premier |
| Home | desktop only | press: Season # of Miley's New Year's Eve Party was given a date: it p |
| Home | desktop only | press: Season # of My True Crime Story was given a date: it premieres  |
| Home | desktop only | press: Season # of Oh My God... Yes! A Series of Extremely Relatable C |
| Home | desktop only | press: Season # of Phineas and Ferb was given a date: it premieres Nov |
| Home | desktop only | press: Season # of Pinky Malinky was given a date: it premieres April  |
| Home | desktop only | press: Season # of Prison Break: Black Creek was given a date: it prem |
| Home | desktop only | press: Season # of Random Rings began on Disney Channel. |
| Home | desktop only | press: Season # of Rick and Morty is due to begin on Adult Swim. |
| Home | desktop only | press: Season # of Rock, Paper, Scissors was given a date: it premiere |
| Home | desktop only | press: Season # of Shifting Gears began on ABC. |
| Home | desktop only | press: Season # of Slow Horses is due to begin on Apple TV. |
| Home | desktop only | press: Season # of Snatchback was given a date: it premieres June #, # |
| Home | desktop only | press: Season # of St. Donatus was given a date: it premieres August # |
| Home | desktop only | press: Season # of Star Trek: Strange New Worlds began on Paramount+. |
| Home | desktop only | press: Season # of The Bachelor is due to begin on ABC. |
| Home | desktop only | press: Season # of The Bachelorette is due to begin on ABC. |
| Home | desktop only | press: Season # of The Best of The New Scooby-Doo Movies was given a d |
| Home | desktop only | press: Season # of The Chi is due to begin on Showtime and Paramount+  |
| Home | desktop only | press: Season # of The God of the Woods was given a date: it premieres |
| Home | desktop only | press: Season # of The Joe Schmo Show was given a date: it premieres A |
| Home | desktop only | press: Season # of The Loud House began on Nickelodeon and Netflix. |
| Home | desktop only | press: Season # of The Patrick Star Show is due to begin on Nickelodeo |
| Home | desktop only | press: Season # of The Spot was given a date: it premieres May #, #. |
| Home | desktop only | press: Season # of The Undeclared War began on Channel #. |
| Home | desktop only | press: Season # of The Wonderful World of Disney was given a date: it  |
| Home | desktop only | press: Season # of This Week! in Star Wars was given a date: it premie |
| Home | desktop only | press: Season # of What's up Bunny began on France # and France # and  |
| Home | desktop only | press: Season # of Yellowjackets is due to begin on Showtime and Param |
| Home | desktop only | press: Second Animals, from Williams Street, came out. |
| Home | desktop only | press: Second Harbor, from MTV Entertainment Studios, is due to come o |
| Home | desktop only | press: Secret Harbor, from Warner Bros. Pictures, is due to come out. |
| Home | desktop only | press: Silent Kingdom, from Paramount Players, came out. |
| Home | desktop only | press: Simpsley, from #th Television Animation, came out. |
| Home | desktop only | press: Sofia the First: Royal Magic is due to premiere on Disney Junio |
| Home | desktop only | press: Spider-Man: Brand New Day, from Marvel Studios and Columbia Pic |
| Home | desktop only | press: Starlit Forest, from Universal Pictures, came out. |
| Home | desktop only | press: Stuart Fails to Save the Universe premiered on HBO Max. |
| Home | desktop only | press: The Bright Mountain, from #th Century Studios, is due to come o |
| Home | desktop only | press: The Bright Season, from Searchlight Pictures, came out. |
| Home | desktop only | press: The Burning Weather, from Williams Street, is due to come out. |
| Home | desktop only | press: The Dark Wizard premiered on HBO. |
| Home | desktop only | press: The Drop: A Snowfall Saga premiered on FX. |
| Home | desktop only | press: The Glass Weather, from Marvel Studios, is due to come out. |
| Home | desktop only | press: The Golden Machine, from Affirm Films, came out. |
| Home | desktop only | press: The Lord of the Rings: The Rings of Power was renewed for Seaso |
| Home | desktop only | press: The Lowdown was renewed for Season #. |
| Home | desktop only | press: The Midnight Crossing, from Focus Features, came out. |
| Home | desktop only | press: The Odyssey, from Universal Pictures, is due to come out. |
| Home | desktop only | press: The Season # finale of Boston Blue, "Patrol", aired on CBS. |
| Home | desktop only | press: The Season # finale of Criminal Minds, "Episode #", is due to a |
| Home | desktop only | press: The Season # finale of Cross, "Quemar", is due to air on Prime  |
| Home | desktop only | press: The Season # finale of Doc, "Happy Birthday (#)", aired on FOX. |
| Home | desktop only | press: The Season # finale of Fire Country, "Try Not to Drown", aired  |
| Home | desktop only | press: The Season # finale of Ghosts, "Across the Pond (#)", aired on  |
| Home | desktop only | press: The Season # finale of Primal, "An Echo of Eternity", is due to |
| Home | desktop only | press: The Season # finale of Sheriff Country, "Mexico", aired on CBS. |
| Home | desktop only | press: The Season # finale of Stumble, "Daytona", aired on NBC. |
| Home | desktop only | press: The Season # finale of The Chi, "The Last Dance", is due to air |
| Home | desktop only | press: The Season # finale of The Patrick Star Show, "Slumber Party St |
| Home | desktop only | press: The Season # finale of The Testaments, "Secateurs", is due to a |
| Home | desktop only | press: The Season # finale of Tracker, "The Best Ones", is due to air  |
| Home | desktop only | press: The Small Frontier, from MTV Entertainment Studios, is due to c |
| Home | desktop only | press: The Terrors of Jordan Mendoza is due to premiere on Adult Swim. |
| Home | desktop only | press: The Winter Frontier, from #th Television, is due to come out. |
| Home | desktop only | press: The Winter Tide, from Nickelodeon Movies, came out. |
| Home | desktop only | press: Twin, started May #, #, first of that title |
| Home | desktop only | press: Twin, started May #, #, second of that title |
| Home | desktop only | press: Unaccustomed Earth was renewed for Season #. |
| Home | desktop only | press: Way of the Warrior Kid, from Skydance Media, is due to come out |
| Home | desktop only | press: Wild Mountain, from Marvel Studios, is due to come out. |
| Home | desktop only | press: Wild Tide, from #th Television, is due to come out. |
| Home | desktop only | press: Wilhelmina Oyelaran-Castellanos Bjørnstad, Open Your Player Pro |
| Home | desktop only | press: Winter Room, from Disney Branded Television, is due to come out |
| Home | desktop only | press: Winter Signal, from #th Century Studios, came out. |
| Home | phone only | press: A Brave Engine, from Warner Bros. Pictures, is due to come out. |
| Home | phone only | press: A Little Animals, from Illumination, is due to come out. |
| Home | phone only | press: A Midnight Weather, from Universal Pictures, is due to come out |
| Home | phone only | press: A Paper Crossing, from Screen Gems, is due to come out. |
| Home | phone only | press: A Quiet Room, from Focus Features, came out. |
| Home | phone only | press: A Salt Voyage, from MTV Entertainment Studios, is due to come o |
| Home | phone only | press: A Secret Island, from Screen Gems, is due to come out. |
| Home | phone only | press: A Secret Signal, from Walt Disney Pictures, came out. |
| Home | phone only | press: A Starlit Island, from Screen Gems, is due to come out. |
| Home | phone only | press: A Wild Signal, from Illumination, is due to come out. |
| Home | phone only | press: A Winter Season, from Disney Branded Television, is due to come |
| Home | phone only | press: Adult Swim cancelled Welcome to Eltingville after one season. |
| Home | phone only | press: All # episodes of Season # of BE@RBRICK are due to come out on  |
| Home | phone only | press: All # episodes of Season # of Pinky Malinky are due to come out |
| Home | phone only | press: Bright Kingdom, from #th Century Studios, came out. |
| Home | phone only | press: Crimson Lights, from Nickelodeon Productions, is due to come ou |
| Home | phone only | press: Distant Engine, from Paramount Animation, is due to come out. |
| Home | phone only | press: Emily in Paris was renewed for Season #. |
| Home | phone only | press: FOX passed on The Adventures of Big Handsome Guy and His Little |
| Home | phone only | press: GET JIRO was renewed for Season #. |
| Home | phone only | press: Golden Lantern, from Williams Street, is due to come out. |
| Home | phone only | press: Iron Houses, from #th Television Animation, is due to come out. |
| Home | phone only | press: Iron River, from MTV Entertainment Studios, is due to come out. |
| Home | phone only | press: Its network cancelled Young MacGyver after one season. |
| Home | phone only | press: Its network ordered Happiness Isn't Everything to series. |
| Home | phone only | press: Its network ordered Trick Moon to series. |
| Home | phone only | press: Its network passed on A.P.O. #; it won't go to series. |
| Home | phone only | press: Its network passed on AbFab; it won't go to series. |
| Home | phone only | press: Last Hours, from #th Television Animation, is due to come out. |
| Home | phone only | press: Last Voyage, from Affirm Films, is due to come out. |
| Home | phone only | press: Late Summer, from Warner Bros. Pictures, is due to come out. |
| Home | phone only | press: Little Harbor, from Universal Pictures, came out. |
| Home | phone only | press: Low Tide, from Showtime Networks, came out. |
| Home | phone only | press: Netflix cancelled Unaccustomed Earth after one season. |
| Home | phone only | press: Paper Field, from Sony Pictures Animation, is due to come out. |
| Home | phone only | press: Percy Jackson and the Olympians was renewed for a final season, |
| Home | phone only | press: Regular Show: The Lost Tapes was renewed for Season #. |
| Home | phone only | press: Season # of American Dad! began on FOX and TBS. |
| Home | phone only | press: Season # of Blue's Clues and You! Nursery Rhymes is due to begi |
| Home | phone only | press: Season # of Bob's Burgers is due to begin on FOX and Adult Swim |
| Home | phone only | press: Season # of Can You Keep a Secret? is due to begin on BBC One. |
| Home | phone only | press: Season # of Christmas In Rockefeller Center began on NBC. |
| Home | phone only | press: Season # of Christmas In Rockefeller Center is due to begin on  |
| Home | phone only | press: Season # of Conan The Barbarian was given a date: it premieres  |
| Home | phone only | press: Season # of Faust was given a date: it premieres January #, #. |
| Home | phone only | press: Season # of Firebuds began on Disney Channel and Disney Junior. |
| Home | phone only | press: Season # of First Day on Earth was given a date: it premieres F |
| Home | phone only | press: Season # of Garfield was given a date: it premieres August #, # |
| Home | phone only | press: Season # of God of War was given a date: it premieres July #, # |
| Home | phone only | press: Season # of House of Gods began on ABC TV. |
| Home | phone only | press: Season # of I Suck at Girls was given a date: it premieres Sept |
| Home | phone only | press: Season # of Joker: Laugh Riot was given a date: it premieres Ju |
| Home | phone only | press: Season # of Kinderwood was given a date: it premieres March #,  |
| Home | phone only | press: Season # of Lake Success was given a date: it premieres April # |
| Home | phone only | press: Season # of Lake Success was given a date: it premieres Novembe |
| Home | phone only | press: Season # of Legends was given a date: it premieres November #,  |
| Home | phone only | press: Season # of Memory of a Killer began on FOX. |
| Home | phone only | press: Season # of Mosquito was given a date: it premieres August #, # |
| Home | phone only | press: Season # of Mosquito was given a date: it premieres February #, |
| Home | phone only | press: Season # of Phantom Investigators is due to begin on The WB. |
| Home | phone only | press: Season # of Plastic Man began on Cartoon Network. |
| Home | phone only | press: Season # of Pluribus was given a date: it premieres August #, # |
| Home | phone only | press: Season # of Power Slap: Road to the Title was given a date: it  |
| Home | phone only | press: Season # of Rally was given a date: it premieres May #, #. |
| Home | phone only | press: Season # of Rooster was given a date: it premieres May #, #. |
| Home | phone only | press: Season # of Star City was given a date: it premieres March #, # |
| Home | phone only | press: Season # of Star Trek: Starfleet Academy was given a date: it p |
| Home | phone only | press: Season # of Star Wars: The Mandalorian and Grogu / A Special Lo |
| Home | phone only | press: Season # of Sunset P.I. was given a date: it premieres July #,  |
| Home | phone only | press: Season # of Sunset P.I. was given a date: it premieres May #, # |
| Home | phone only | press: Season # of Thalia's Mixtape: El Soundtrack de Mi Vida was give |
| Home | phone only | press: Season # of The Bachelorette began on ABC. |
| Home | phone only | press: Season # of The Night Agent was given a date: it premieres Nove |
| Home | phone only | press: Season # of Untitled Poison Ivy Series. was given a date: it pr |
| Home | phone only | press: Season # of Vought Rising was given a date: it premieres March  |
| Home | phone only | press: Season # of Wallykazam! is due to begin on Nick Jr.. |
| Home | phone only | press: Season # of We Are All Completely Beside Ourselves was given a  |
| Home | phone only | press: Season # of We Were Liars was given a date: it premieres July # |
| Home | phone only | press: Second Legend, from TriStar Pictures, came out. |
| Home | phone only | press: Silent Garden, from Warner Bros. Animation, came out. |
| Home | phone only | press: Silent Harbor, from # Pictures, came out. |
| Home | phone only | press: Silent Room, from Cartoon Network Studios, is due to come out. |
| Home | phone only | press: Small Archive, from Nickelodeon Movies, came out. |
| Home | phone only | press: Small Room, from Nickelodeon Movies, came out. |
| Home | phone only | press: Syfy cancelled Tremors after one season. |
| Home | phone only | press: The Distant Houses, from Affirm Films, came out. |
| Home | phone only | press: The Golden Signal, from Lucasfilm, is due to come out. |
| Home | phone only | press: The Last Orchard, from Showtime Networks, came out. |
| Home | phone only | press: The Late Kingdom, from MTV Entertainment Studios, came out. |
| Home | phone only | press: The Northern Legend, from Walt Disney Pictures, is due to come  |
| Home | phone only | press: The Paper Houses, from Marvel Studios, came out. |
| Home | phone only | press: The Season # finale of Jeopardy! Masters, "Episode #", aired on |
| Home | phone only | press: The Season # finale of Jeopardy! Masters, "Episode #", is due t |
| Home | phone only | press: The Season # finale of R.J. Decker, "Episode #", aired on ABC. |
| Home | phone only | press: The Season # finale of The Bachelor, "Episode #", aired on ABC. |
| Home | phone only | press: The Small Legend, from Working Title, is due to come out. |
| Home | phone only | press: The Starlit Lantern, from Showtime Networks, is due to come out |
| Home | phone only | press: The Wild Comet, from Focus Features, came out. |
| Home | phone only | press: Tulsa King was renewed for Season #. |
| Home | phone only | press: VisionQuest came to its planned end after one season. |
| Home | phone only | press: in #d #hScreening Of Your film At The Venice International Film |
| New Script | desktop only | heading: What These Add To Your Project |
| New Script | desktop only | press: Add Biographical |
| New Script | desktop only | press: Add Coming Of Age |
| New Script | desktop only | press: Add Costume Drama |
| New Script | desktop only | press: Add Courtroom Drama |
| New Script | desktop only | press: Add Docudrama |
| New Script | desktop only | press: Add Docufiction |
| New Script | desktop only | press: Add Domestic Drama |
| New Script | desktop only | press: Add Drama |
| New Script | desktop only | press: Add Epic |
| New Script | desktop only | press: Add Experimental |
| New Script | desktop only | press: Add Historical Drama |
| New Script | desktop only | press: Add Historical Fiction |
| New Script | desktop only | press: Add Hood Film |
| New Script | desktop only | press: Add Jidaigeki |
| New Script | desktop only | press: Add Jukebox Musical |
| New Script | desktop only | press: Add Kitchen Sink Drama |
| New Script | desktop only | press: Add Legal Drama |
| New Script | desktop only | press: Add Magical Realism |
| New Script | desktop only | press: Add Medical Drama |
| New Script | desktop only | press: Add Melodrama |
| New Script | desktop only | press: Add Mumblecore |
| New Script | desktop only | press: Add Neorealism |
| New Script | desktop only | press: Add New Wave |
| New Script | desktop only | press: Add Period Drama |
| New Script | desktop only | press: Add Political Drama |
| New Script | desktop only | press: Add Prison Film |
| New Script | desktop only | press: Remove Comedy |
| New Script | phone only | press: Add Zombie |
| Project: Budget | desktop only | field: Ask The Private Investor For |
| Project: Budget | desktop only | press: Amaranta Okonkwo-Villaseñor de la Cruz, Open Your Player Profil |
| Project: Budget | desktop only | press: Ask For Better Terms |
| Project: Cast | phone only | press: Offer Ines To Ada Quill |
| Project: Crew | desktop only | field: What Fen Ward's Revision Should Look At |
| Project: Crew | desktop only | field: Your Note To Fen Ward (Optional) |
| Project: Crew | desktop only | press: Accept This Pass |
| Project: Crew | desktop only | press: Amaranta Okonkwo-Villaseñor de la Cruz, Open Your Player Profil |
| Project: Crew | desktop only | press: Ask For A Revision |
| Project: Edit | desktop only | field: Odile Heard Only (Minutes) |
| Project: Edit | desktop only | field: Odile On Screen (Minutes) |
| Project: Edit | desktop only | field: Scene # (Boathouse) |
| Project: Edit | desktop only | field: Scene # (Dock) |
| Project: Edit | desktop only | field: Scene # (Pumping Station) |
| Project: Edit | desktop only | field: Scene # (Quay) |
| Project: Edit | desktop only | field: The Ferryman Heard Only (Minutes) |
| Project: Edit | desktop only | field: The Ferryman On Screen (Minutes) |
| Project: Edit | desktop only | press: Amaranta Okonkwo-Villaseñor de la Cruz, Open Your Player Profil |
| Project: Edit | desktop only | press: Cut Scene # (Dock) From The Edit |
| Project: Edit | phone only | field: Scene # (Boathouse): Nothing has been shot for it yet. |
| Project: Edit | phone only | field: Scene # (Harbour) |
| Project: Edit | phone only | field: Scene # (Kitchen) |
| Project: Edit | phone only | press: Cut Scene # (Front Room) From The Edit |
| Project: Edit | phone only | press: Re-Record Ines's Lines |
| Project: Edit | phone only | press: Re-Record Marco's Lines |
| Project: Overview | desktop only | heading: Late Light |
| Project: Overview | desktop only | press: Late Light |
| Project: Overview | phone only | heading: Till Morning |
| Project: Overview | phone only | press: Till Morning |
| Project: Production | desktop only | press: Remove The Song Harbour Lights |
| Project: Production | desktop only | press: Take Lantern Out Of Scene # (Pier) |
| Project: Production | phone only | field: Lyrics By |
| Project: Production | phone only | field: Music By |
| Project: Production | phone only | field: Rights Holder |
| Project: Production | phone only | press: Remove The Song Lantern |
| Project: Release | desktop only | press: Accept The Late Slot |
| Project: Release | desktop only | press: Accept With A Broadcast Edit |
| Project: Release | desktop only | press: Decline Offer |
| Project: Release | phone only | field: New Date For Episode # |
| Project: Release | phone only | field: Version In United Kingdom, France, Germany, Brazil |
| Project: Release | phone only | press: Keep The Dates |
| Project: Release | phone only | press: Review The Change |
| Project: Schedule | desktop only | press: Amaranta Okonkwo-Villaseñor de la Cruz, Open Your Player Profil |
| Project: Schedule | phone only | field: Backup For Ferry Dock |
| Project: Schedule | phone only | field: Site For Ferry Dock |
| Project: Script | desktop only | field: Claim |
| Project: Script | desktop only | field: Contributor Name |
| Project: Script | desktop only | field: Ines's Look In This Scene |
| Project: Script | desktop only | field: Marco |
| Project: Script | desktop only | field: Source Note |
| Project: Script | desktop only | field: Who They Are |
| Project: Script | desktop only | heading: Contributors |
| Project: Script | desktop only | heading: Episode #, Scene # (Corridor) |
| Project: Script | desktop only | heading: Episode #, Scene # (Dock) |
| Project: Script | desktop only | heading: Episode #, Scene # (Harbor) |
| Project: Script | desktop only | heading: Episode #, Scene # (Market) |
| Project: Script | desktop only | heading: Episode #, Scene # (Ward) |
| Project: Script | desktop only | heading: Episode #, Scene # |
| Project: Script | desktop only | heading: Facts And Contributors |
| Project: Script | desktop only | heading: Facts |
| Project: Script | desktop only | heading: Les Dunes |
| Project: Script | desktop only | heading: Night Ward |
| Project: Script | desktop only | heading: North Line |
| Project: Script | desktop only | heading: One Room |
| Project: Script | desktop only | heading: Scene # (Ferry) |
| Project: Script | desktop only | heading: Scene # (Library) |
| Project: Script | desktop only | heading: Scene # (Lido) |
| Project: Script | desktop only | heading: Scene # (Lighthouse Roof) |
| Project: Script | desktop only | heading: Scene # (Pier) |
| Project: Script | desktop only | heading: Scene # (Stairwell) |
| Project: Script | desktop only | heading: Subject And Approach |
| Project: Script | desktop only | heading: Tide Notes |
| Project: Script | desktop only | press: Add Contributor |
| Project: Script | desktop only | press: Add Fact |
| Project: Script | desktop only | press: Add Sequence |
| Project: Script | desktop only | press: Amaranta Okonkwo-Villaseñor de la Cruz, Open Your Player Profil |
| Project: Script | desktop only | press: Change The Relationship Of Mara and Ilse Brandt |
| Project: Script | desktop only | press: Combine Scene # (Front Room) With Scene # (Front Room) |
| Project: Script | desktop only | press: Delete Episode #, Scene # (Corridor) |
| Project: Script | desktop only | press: Delete Episode #, Scene # (Dock) |
| Project: Script | desktop only | press: Delete Episode #, Scene # (Harbor) |
| Project: Script | desktop only | press: Delete Episode #, Scene # (Market) |
| Project: Script | desktop only | press: Delete Episode #, Scene # (Ward) |
| Project: Script | desktop only | press: Delete Episode #, Scene # |
| Project: Script | desktop only | press: Delete Scene # (Ferry) |
| Project: Script | desktop only | press: Delete Scene # (Library) |
| Project: Script | desktop only | press: Delete Scene # (Lido) |
| Project: Script | desktop only | press: Delete Scene # (Lighthouse Roof) |
| Project: Script | desktop only | press: Delete Scene # (Pier) |
| Project: Script | desktop only | press: Delete Scene # (Stairwell) |
| Project: Script | desktop only | press: Duplicate Episode #, Scene # (Corridor) |
| Project: Script | desktop only | press: Duplicate Episode #, Scene # (Dock) |
| Project: Script | desktop only | press: Duplicate Episode #, Scene # (Harbor) |
| Project: Script | desktop only | press: Duplicate Episode #, Scene # (Market) |
| Project: Script | desktop only | press: Duplicate Episode #, Scene # (Ward) |
| Project: Script | desktop only | press: Duplicate Episode #, Scene # |
| Project: Script | desktop only | press: Duplicate Scene # (Ferry) |
| Project: Script | desktop only | press: Duplicate Scene # (Library) |
| Project: Script | desktop only | press: Duplicate Scene # (Lido) |
| Project: Script | desktop only | press: Duplicate Scene # (Lighthouse Roof) |
| Project: Script | desktop only | press: Duplicate Scene # (Pier) |
| Project: Script | desktop only | press: Duplicate Scene # (Stairwell) |
| Project: Script | desktop only | press: Les Dunes |
| Project: Script | desktop only | press: Move Episode #, Scene # (Corridor) Down |
| Project: Script | desktop only | press: Move Episode #, Scene # (Corridor) Up |
| Project: Script | desktop only | press: Move Episode #, Scene # (Dock) Down |
| Project: Script | desktop only | press: Move Episode #, Scene # (Dock) Up |
| Project: Script | desktop only | press: Move Episode #, Scene # (Harbor) Down |
| Project: Script | desktop only | press: Move Episode #, Scene # (Harbor) Up |
| Project: Script | desktop only | press: Move Episode #, Scene # (Market) Down |
| Project: Script | desktop only | press: Move Episode #, Scene # (Market) Up |
| Project: Script | desktop only | press: Move Episode #, Scene # (Ward) Down |
| Project: Script | desktop only | press: Move Episode #, Scene # (Ward) Up |
| Project: Script | desktop only | press: Move Episode #, Scene # Down |
| Project: Script | desktop only | press: Move Episode #, Scene # Up |
| Project: Script | desktop only | press: Move Scene # (Ferry) Down |
| Project: Script | desktop only | press: Move Scene # (Ferry) Up |
| Project: Script | desktop only | press: Move Scene # (Library) Down |
| Project: Script | desktop only | press: Move Scene # (Library) Up |
| Project: Script | desktop only | press: Move Scene # (Lido) Down |
| Project: Script | desktop only | press: Move Scene # (Lido) Up |
| Project: Script | desktop only | press: Move Scene # (Lighthouse Roof) Down |
| Project: Script | desktop only | press: Move Scene # (Lighthouse Roof) Up |
| Project: Script | desktop only | press: Move Scene # (Pier) Down |
| Project: Script | desktop only | press: Move Scene # (Pier) Up |
| Project: Script | desktop only | press: Move Scene # (Stairwell) Down |
| Project: Script | desktop only | press: Move Scene # (Stairwell) Up |
| Project: Script | desktop only | press: Night Ward |
| Project: Script | desktop only | press: North Line |
| Project: Script | desktop only | press: One Room |
| Project: Script | desktop only | press: Remove The Relationship Of Mara and Ilse Brandt |
| Project: Script | desktop only | press: Tide Notes |
| Project: Script | desktop only | press: Unlock Tone |
| Project: Script | phone only | field: Adapted From |
| Project: Script | phone only | field: Story Setting Place, State Or Region |
| Project: Script | phone only | heading: Far Shore |
| Project: Script | phone only | heading: Same Day |
| Project: Script | phone only | press: Accept Note |
| Project: Script | phone only | press: Change The Rule The tide never lies |
| Project: Script | phone only | press: Combine Scene # (Quay) With Scene # (Quay) |
| Project: Script | phone only | press: Far Shore |
| Project: Script | phone only | press: No Setting Place |
| Project: Script | phone only | press: Reject Note |
| Project: Script | phone only | press: Remove The Rule The tide never lies |
| Project: Script | phone only | press: Same Day |
| Project: Script | phone only | press: Split Before Line # |
| Saved Games | desktop only | press: Continue London Story |
| Saved Games | desktop only | press: Delete Save London Story |
| Where A Place Is Filmed | phone only | press: AskerAkershus, Norway |
| Where A Place Is Filmed | phone only | press: DrammenBuskerud, Norway |
| Where A Place Is Filmed | phone only | press: FredrikstadØstfold, Norway |
| Where A Place Is Filmed | phone only | press: HaugesundRogaland, Norway |
| Where A Place Is Filmed | phone only | press: KristiansandAgder, Norway |
| Where A Place Is Filmed | phone only | press: LillestrømAkershus, Norway |
| Where A Place Is Filmed | phone only | press: MossØstfold, Norway |
| Where A Place Is Filmed | phone only | press: NesttunVestland, Norway |
| Where A Place Is Filmed | phone only | press: OsloOslo, Norway |
| Where A Place Is Filmed | phone only | press: SandefjordVestfold, Norway |
| Where A Place Is Filmed | phone only | press: SandnesRogaland, Norway |
| Where A Place Is Filmed | phone only | press: SarpsborgØstfold, Norway |
| Where A Place Is Filmed | phone only | press: SkienTelemark, Norway |
| Where A Place Is Filmed | phone only | press: StavangerRogaland, Norway |
| Where A Place Is Filmed | phone only | press: TromsøTroms, Norway |
| Where A Place Is Filmed | phone only | press: TrondheimTrøndelag, Norway |
| Where A Place Is Filmed | phone only | press: TønsbergVestfold, Norway |
| Where A Place Is Filmed | phone only | press: ÅlesundMøre og Romsdal, Norway |
| Where A Place Is Filmed | phone only | press: ÅsaneVestland, Norway |

## Accepted, With The Reason

- August #: span.dot keeps to one line and ends in an ellipsis; pressing it shows the whole
- Build A Logline: a chooser's long choice is cut short in its box; "Your Logline" beside it shows the whole
- Identity: the map's markers are under # pixels; the list of places beside the map opens the same places
- January #: span.dot keeps to one line and ends in an ellipsis; pressing it shows the whole
- Map: the map's markers are under # pixels; the list of places beside the map opens the same places
- March #: span.dot keeps to one line and ends in an ellipsis; pressing it shows the whole
- Where You Live: the map's markers are under # pixels; the list of places beside the map opens the same places

## Panes That Scroll Sideways On Purpose

- div.tabs "Ideas" in Choose A Starting Idea
- div.tabs "Project Sections" in 
- nav.rail "Main Navigation" in Main Navigation

## Reached In Journeys But Not In The Inventory

None.
