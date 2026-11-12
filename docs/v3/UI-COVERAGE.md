# UI Coverage Matrix

Written by `node tools/v3/ui-coverage.mjs` from `docs/v3/ui-inventory.json`, the walk (`e2e/ui-coverage.spec.ts`, last run 2026-11-12) and the journey sweep (`SLATE_UI_SWEEP`). The owner's brief is `docs/v3/UI-BRIEF.md`.

82 rows. 69 measured, 13 not visited. 0 open defects.

What the columns mean. **Walked**: the screen was opened on purpose and measured at that many window sizes in each browser profile. **Desktop And Phone**: the same screen in the same state at 1280 and at 390 pixels wide, compared for headings, things to press, fields and their order. **Reached In Journeys**: a full play-through reached it and the same measure ran there, at the sizes listed. **Desktop And Phone, In Journeys**: what the screen offered when the same journeys ran in each layout. Browser emulation is not a real device: nothing here measures a virtual keyboard, and that is tracked in the limits below.

| Area | Screen | Kind | Walked: sizes measured | Desktop And Phone, Walked | Reached In Journeys | Desktop And Phone, In Journeys | Open Defects |
|---|---|---|---|---|---|---|---|
| Startup | Start Screen | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (844x390), desktop (600x960 320x568), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739) | 4 things in both | none found |
| Startup | Opening Your Game (Loading) | state | no | not compared | no | not compared | **not visited** |
| Startup | Couldn't Open This Save (Error) | state | no | not compared | no | not compared | **not visited** |
| Startup | Choose Missing Places (Repair) | state | no | not compared | no | not compared | **not visited** |
| Startup | Saved Games (From The Start Screen) | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720), iphone-15-plus (430x932 932x430), iphone-15-pro-max (430x932) | 10 things in both | none found |
| Startup | Creation: Identity | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | 87 things in both | none found |
| Startup | Creation: Background And Languages | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720 1024x768), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | 77 things in both, 3 seen only on desktop, 14 only on phone (listed below) | none found |
| Startup | Creation: Starting Point | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Startup | Creation: Review | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932), iphone-15-pro-max-landscape (814x380) | 13 things in both | none found |
| Shell | Menu Drawer (Phone And Tablet) (The rail on a desktop; a drawer under 900 pixels.) | menu | iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | not compared | no | not compared | none found |
| Home | Home | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 430x932 667x375 1280x720), desktop (1280x720 768x1024 320x568 390x844 1440x900), iphone-15-plus (430x739 430x932 932x430), iphone-15-pro-max (430x739 430x932), iphone-15-pro-max-landscape (814x380) | 441 things in both, 162 seen only on desktop, 101 only on phone (listed below) | none found |
| You | Player Profile | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568 390x844), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | 10 things in both | none found |
| You | Find An Agent | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| You | Give Notice? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Day | Calendar | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (932x430 430x932), iphone-15-pro-max (430x739 430x932) | 99 things in both, 17 seen only on desktop, 16 only on phone (listed below) | none found |
| Your Day | Festival Or Awards Edition | screen | no | not compared | phone (390x844), desktop (1280x720), iphone-15-plus (430x739), iphone-15-pro-max (430x739) | 84 things in both, 1 seen only on desktop, 2 only on phone (listed below) | none found |
| Your Day | World | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568 360x800 390x844 1024x768), iphone-15-plus (430x932), iphone-15-pro-max (430x739 430x932) | 30 things in both | none found |
| Your Day | A Place | screen | no | not compared | phone (390x844), desktop (1280x720 393x852 414x896 440x956), iphone-15-pro-max (430x739) | 42 things in both, 0 seen only on desktop, 9 only on phone (listed below) | none found |
| Industry | Companies | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932 932x430), iphone-15-pro-max (430x739 430x932) | 147 things in both | none found |
| Industry | A Company | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568), iphone-15-plus (932x430 430x932), iphone-15-pro-max (430x932) | 29 things in both, 1 seen only on desktop, 1 only on phone (listed below) | none found |
| Industry | A Film Or Series | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932 932x430), iphone-15-pro-max (430x739 430x932) | 28 things in both | none found |
| Industry | A Season | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x739) | 12 things in both | none found |
| Industry | An Episode | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x739 430x932) | 22 things in both | none found |
| Industry | A Person | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x739 430x932) | 20 things in both, 1 seen only on desktop, 1 only on phone (listed below) | none found |
| Industry | Networks And Streaming Services | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x739 430x932) | 8 things in both | none found |
| Industry | A Network | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1024x768 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x739 430x932) | 14 things in both | none found |
| Industry | An Executive | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1024x768 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x739 430x932) | 9 things in both | none found |
| Your Work | Projects | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568 1024x768 360x800), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | 41 things in both | none found |
| Your Work | New Script | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 360x740 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x739 430x932 932x430), iphone-15-pro-max (430x739 430x932), iphone-15-pro-max-landscape (814x380) | 43 things in both, 28 seen only on desktop, 1 only on phone (listed below) | none found |
| Your Game | Saved Games | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 1920x1080), iphone-15-plus (932x430 430x932), iphone-15-pro-max (430x739 430x932) | 21 things in both, 2 seen only on desktop, 0 only on phone (listed below) | none found |
| Your Game | Settings | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568 390x844), iphone-15-plus (430x932 932x430), iphone-15-pro-max (430x739 430x932) | 33 things in both | none found |
| Project | Project: Overview | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | 69 things in both, 2 seen only on desktop, 2 only on phone (listed below) | none found |
| Project | Project: Script | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 844x390 1280x720 667x375), desktop (1280x720 768x1024 320x568 600x960 1024x768 844x390), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932), iphone-15-pro-max-landscape (814x380) | 625 things in both, 88 seen only on desktop, 13 only on phone (listed below) | none found |
| Project | Project: Characters | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568 360x800 414x896 1440x900), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | 133 things in both | none found |
| Project | Project: Cast | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375 360x740), desktop (1280x720 1024x768 768x1024 320x568 440x956), iphone-15-plus (430x932 932x430), iphone-15-pro-max (430x739 430x932) | 58 things in both, 0 seen only on desktop, 1 only on phone (listed below) | none found |
| Project | Project: Crew | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568 390x844 1920x1080), iphone-15-plus (430x932 932x430), iphone-15-pro-max (430x739 430x932) | 71 things in both, 5 seen only on desktop, 0 only on phone (listed below) | none found |
| Project | Project: Schedule | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | 63 things in both, 1 seen only on desktop, 2 only on phone (listed below) | none found |
| Project | Project: Budget | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 844x390 667x375 1280x720 360x740), desktop (1280x720 1024x768 768x1024 600x960 393x852 430x932), iphone-15-plus (430x739 430x932 932x430), iphone-15-pro-max (430x739 430x932), iphone-15-pro-max-landscape (814x380) | 212 things in both, 3 seen only on desktop, 0 only on phone (listed below) | none found |
| Project | Project: Production | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 360x740 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739) | 72 things in both, 2 seen only on desktop, 4 only on phone (listed below) | none found |
| Project | Project: Edit | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568 844x390), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | 98 things in both, 10 seen only on desktop, 6 only on phone (listed below) | none found |
| Project | Project: Release | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568), iphone-15-plus (430x739 932x430), iphone-15-pro-max (430x739) | 48 things in both, 3 seen only on desktop, 4 only on phone (listed below) | none found |
| Project | Project: Festivals And Awards | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 430x932 667x375), desktop (1280x720 768x1024 320x568 1920x1080), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932), iphone-15-pro-max-landscape (814x380) | 52 things in both | none found |
| Shell | Sleep | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 430x932 844x390 1280x720), desktop (1024x768 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x932) | 7 things in both | none found |
| Shell | Advance | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 360x740 667x375), desktop (1280x720 600x960 360x800 414x896 768x1024), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739) | 30 things in both | none found |
| Startup | Settings (From The Start Screen) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720), iphone-15-plus (430x932), iphone-15-pro-max (430x932) | 9 things in both | none found |
| Startup | Start Over? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1024x768), iphone-15-plus (932x430) | not compared | none found |
| Your Day | Add Plan | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1024x768 600x960), iphone-15-plus (430x932) | 8 things in both | none found |
| Your Game | Delete This Save? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1024x768), iphone-15-plus (430x932) | not compared | none found |
| Your Game | Rename Save | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1024x768 600x960), iphone-15-plus (932x430 430x932) | not compared | none found |
| Your Game | This Save Is Already Here | dialog | no | not compared | phone (390x844) | not compared | none found |
| Your Game | Replace This Save? | dialog | no | not compared | no | not compared | **not visited** |
| Your Game | Delete This Copy? | dialog | no | not compared | no | not compared | **not visited** |
| Project | Shelve The Project | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1280x720 600x960), iphone-15-plus (932x430), iphone-15-pro-max (430x932) | not compared | none found |
| Script | Choose A Full Story | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x739 430x932) | 6 things in both | none found |
| Script | A Full Story, Open | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (932x430 430x932), iphone-15-pro-max (430x739 430x932) | 37 things in both | none found |
| Script | Choose A Work To Adapt | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | A Work To Adapt, Open | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x739 430x932) | 96 things in both, 13 seen only on desktop, 0 only on phone (listed below) | none found |
| Script | An Idea, Open | dialog | no | not compared | desktop (1280x720), iphone-15-pro-max (430x739) | not compared | none found |
| Script | Approve This Draft? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1280x720 768x1024 600x960), iphone-15-plus (430x932), iphone-15-pro-max (430x932) | not compared | none found |
| Script | Compare Draft | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1280x720 768x1024 320x568), iphone-15-plus (932x430), iphone-15-pro-max (430x932) | not compared | none found |
| Script | Rename Draft | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932) | not compared | none found |
| Script | Delete This Scene? | dialog | no | not compared | no | not compared | **not visited** |
| Script | A Script Change That Touches Other Work (Split The Scene, Combine The Scenes and the like: titled with the change.) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x932) | not compared | none found |
| Script | Change The Rule | dialog | no | not compared | no | not compared | **not visited** |
| Script | Remove The Rule | dialog | no | not compared | no | not compared | **not visited** |
| Script | Change The Relationship | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1024x768 768x1024 600x960), iphone-15-plus (932x430) | not compared | none found |
| Script | Remove The Relationship | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Characters | Take A Character Out Of The Script? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (932x430) | 6 things in both | none found |
| Script | A Contributor Withdraws? | dialog | no | not compared | no | not compared | **not visited** |
| Budget | Accept These Terms? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 600x960), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | 4 things in both | none found |
| Cast | Cast A Character (Find Performers) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 844x390), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x932 430x739) | 208 things in both | none found |
| Crew | Hire A Crew Member | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1024x768 768x1024 320x568 1280x720), iphone-15-plus (430x932 932x430), iphone-15-pro-max (430x932) | not compared | none found |
| Crew | Staff A Department | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720 600x960), iphone-15-pro-max (430x739 430x932), iphone-15-plus (430x739 430x932) | 40 things in both | none found |
| Crew | Hire A Writer Or Director | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Schedule | Where A Place Is Filmed | dialog | no | not compared | phone (390x844), desktop (1280x720), iphone-15-pro-max (430x739) | 9 things in both, 0 seen only on desktop, 19 only on phone (listed below) | none found |
| Edit | Cut This Scene From The Edit? | dialog | no | not compared | no | not compared | **not visited** |
| Release | Change These Episode Dates? | dialog | no | not compared | no | not compared | **not visited** |
| Release | Cancel This Release? | dialog | no | not compared | no | not compared | **not visited** |
| Festivals And Awards | Prepare Submission | dialog | no | not compared | phone (390x844), desktop (1280x720), iphone-15-plus (430x739) | 6 things in both | none found |
| Edit | Change The Approved Take? | dialog | no | not compared | no | not compared | **not visited** |
| Script | A Scene, Open | panel | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |

## Open Defects

None found by the measures above.

## Seen In One Layout's Journeys And Not The Other's

From the same journeys run on a desktop and on a phone: headings and fields one run caught and the other did not. A journey is sampled as it plays, so something on screen for under half a second can be caught in one run and missed in the other, and each run makes its own save with its own made-up names. This is a list to read, not a count of defects; the comparison that fails a build is the walk's. Everything the stylesheet hides by window size is listed in QA-REPORT.md.

| Screen | Seen | What |
|---|---|---|
| A Place | phone only | heading: In Cinemas In Finland |
| A Place | phone only | heading: Vatican City, Vatican |
| Calendar | desktop only | heading: August # |
| Calendar | phone only | heading: June # |
| Creation: Background And Languages | phone only | field: Pesach (Passover) |
| Creation: Background And Languages | phone only | field: Rosh Hashanah |
| Creation: Background And Languages | phone only | field: Shavuot |
| Creation: Background And Languages | phone only | field: Sukkot |
| Creation: Background And Languages | phone only | field: Yom Kippur |
| Festival Or Awards Edition | phone only | heading: Advance Stopped |
| Home | desktop only | heading: Time Is Paused |
| New Script | desktop only | heading: What These Add To Your Project |
| Project: Budget | desktop only | field: Ask The Private Investor For |
| Project: Crew | desktop only | field: What Fen Ward's Revision Should Look At |
| Project: Crew | desktop only | field: Your Note To Fen Ward (Optional) |
| Project: Edit | desktop only | field: Odile Heard Only (Minutes) |
| Project: Edit | desktop only | field: Odile On Screen (Minutes) |
| Project: Edit | desktop only | field: Scene # (Boathouse) |
| Project: Edit | desktop only | field: Scene # (Dock) |
| Project: Edit | desktop only | field: Scene # (Pumping Station) |
| Project: Edit | desktop only | field: Scene # (Quay) |
| Project: Edit | desktop only | field: The Ferryman Heard Only (Minutes) |
| Project: Edit | desktop only | field: The Ferryman On Screen (Minutes) |
| Project: Edit | phone only | field: Scene # (Boathouse): Nothing has been shot for it yet. |
| Project: Edit | phone only | field: Scene # (Harbour) |
| Project: Edit | phone only | field: Scene # (Kitchen) |
| Project: Overview | desktop only | heading: Late Light |
| Project: Overview | phone only | heading: Till Morning |
| Project: Production | phone only | field: Lyrics By |
| Project: Production | phone only | field: Music By |
| Project: Production | phone only | field: Rights Holder |
| Project: Release | phone only | field: New Date For Episode # |
| Project: Release | phone only | field: Version In United Kingdom, France, Germany, Brazil |
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
| Project: Script | phone only | field: Adapted From |
| Project: Script | phone only | field: Story Setting Place, State Or Region |
| Project: Script | phone only | heading: Far Shore |
| Project: Script | phone only | heading: Same Day |

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
- div.tabs "Ideas" in How The Returned Looks
- div.tabs "Project Sections" in 
- nav.rail "Main Navigation" in Main Navigation

## Reached In Journeys But Not In The Inventory

None.
