# UI Coverage Matrix

Written by `node tools/v3/ui-coverage.mjs` from `docs/v3/ui-inventory.json`, the walk (`e2e/ui-coverage.spec.ts`, last run 2026-11-13) and the journey sweep (`SLATE_UI_SWEEP`). The owner's brief is `docs/v3/UI-BRIEF.md`.

89 rows. 88 measured, 1 not visited. 0 open defects.

What the columns mean. **Walked**: the screen was opened on purpose and measured at that many window sizes in each browser profile. **Desktop And Phone**: the same screen in the same state at 1280 and at 390 pixels wide, compared for headings, things to press, fields and their order. **Reached In Journeys**: a full play-through reached it and the same measure ran there, at the sizes listed. **Desktop And Phone, In Journeys**: what the screen offered when the same journeys ran in each layout. Browser emulation is not a real device: nothing here measures a virtual keyboard, and that is tracked in the limits below.

| Area | Screen | Kind | Walked: sizes measured | Desktop And Phone, Walked | Reached In Journeys | Desktop And Phone, In Journeys | Open Defects |
|---|---|---|---|---|---|---|---|
| Startup | Start Screen | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (844x390 390x844), desktop (600x960 320x568 1280x720), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739) | 7 things in both | none found |
| Startup | Opening Your Game (Loading) | state | no | not compared | phone (390x844), desktop (1280x720) | 2 things in both | none found |
| Startup | Couldn't Open This Save (Error) | state | no | not compared | desktop (1280x720), phone (390x844) | 4 things in both | none found |
| Startup | Choose Missing Places (Repair) | state | no | not compared | phone (390x844) | not compared | none found |
| Startup | Saved Games (From The Start Screen) | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720), iphone-15-plus (430x932 932x430), iphone-15-pro-max (430x932) | 22 things in both, 1 seen only on desktop, 1 only on phone (listed below) | none found |
| Startup | Creation: Identity | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Startup | Creation: Background And Languages | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720 1024x768), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Startup | Creation: Starting Point | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Startup | Creation: Review | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932), iphone-15-pro-max-landscape (814x380) | 12 things in both | none found |
| Shell | Menu Drawer (Phone And Tablet) (The rail on a desktop; a drawer under 900 pixels.) | menu | iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | not compared | no | not compared | none found |
| Home | Home | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 430x932 667x375 1280x720), desktop (1280x720 768x1024 320x568 390x844 1440x900), iphone-15-plus (430x739 430x932 932x430), iphone-15-pro-max (430x739 430x932), iphone-15-pro-max-landscape (814x380) | 40 things in both | none found |
| You | Player Profile | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568 390x844), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| You | Find An Agent | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| You | The Shop | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| You | Give Notice? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Day | Calendar | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (932x430 430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Your Day | Festival Or Awards Edition | screen | no | not compared | phone (390x844), desktop (1280x720), iphone-15-plus (430x739), iphone-15-pro-max (430x739) | not compared | none found |
| Your Day | World | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568 360x800 390x844 1024x768), iphone-15-plus (430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Your Day | A Place | screen | no | not compared | phone (390x844), desktop (1280x720 393x852 414x896 440x956), iphone-15-pro-max (430x739) | not compared | none found |
| Industry | Companies | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932 932x430), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Industry | A Company | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568), iphone-15-plus (932x430 430x932), iphone-15-pro-max (430x932) | not compared | none found |
| Industry | A Film Or Series | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932 932x430), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Industry | A Season | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x739) | not compared | none found |
| Industry | An Episode | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Industry | A Person | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Industry | Networks And Streaming Services | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Industry | A Network | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1024x768 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Industry | An Executive | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1024x768 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Your Work | Projects | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568 1024x768 360x800), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | 3 things in both, 2 seen only on desktop, 0 only on phone (listed below) | none found |
| Your Work | New Project | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 360x740 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x739 430x932 932x430), iphone-15-pro-max (430x739 430x932), iphone-15-pro-max-landscape (814x380) | 47 things in both | none found |
| Your Work | Write An Original | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Work | Develop A Documentary | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Work | Adapt A Work | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Game | Saved Games | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 1920x1080), iphone-15-plus (932x430 430x932), iphone-15-pro-max (430x739 430x932) | 12 things in both, 2 seen only on desktop, 0 only on phone (listed below) | none found |
| Your Game | Settings | screen | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568 390x844), iphone-15-plus (430x932 932x430), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Project | Project: Overview | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Project | Project: Script | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 844x390 1280x720 667x375), desktop (1280x720 768x1024 320x568 600x960 1024x768 844x390), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932), iphone-15-pro-max-landscape (814x380) | 4 things in both, 0 seen only on desktop, 160 only on phone (listed below) | none found |
| Project | Project: Characters | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568 360x800 414x896 1440x900), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Project | Project: Cast | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375 360x740), desktop (1280x720 1024x768 768x1024 320x568 440x956), iphone-15-plus (430x932 932x430), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Project | Project: Crew | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568 390x844 1920x1080), iphone-15-plus (430x932 932x430), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Project | Project: Schedule | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Project | Project: Budget | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 844x390 667x375 1280x720 360x740), desktop (1280x720 1024x768 768x1024 600x960 393x852 430x932), iphone-15-plus (430x739 430x932 932x430), iphone-15-pro-max (430x739 430x932), iphone-15-pro-max-landscape (814x380) | not compared | none found |
| Project | Project: Production | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 360x740 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739) | not compared | none found |
| Project | Project: Music | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Project | Project: Edit | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568 844x390), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Project | Project: Release | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 1024x768 768x1024 320x568), iphone-15-plus (430x739 932x430), iphone-15-pro-max (430x739) | not compared | none found |
| Project | Project: Festivals And Awards | tab | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 430x932 667x375), desktop (1280x720 768x1024 320x568 1920x1080), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932), iphone-15-pro-max-landscape (814x380) | not compared | none found |
| Shell | Sleep | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 430x932 844x390 1280x720), desktop (1024x768 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x932) | not compared | none found |
| Shell | Advance | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 360x740 667x375), desktop (1280x720 600x960 360x800 414x896 768x1024), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739) | not compared | none found |
| Startup | Settings (From The Start Screen) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720), iphone-15-plus (430x932), iphone-15-pro-max (430x932) | not compared | none found |
| Startup | Start Over? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1024x768), iphone-15-plus (932x430) | not compared | none found |
| Your Day | Add Plan | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1024x768 600x960), iphone-15-plus (430x932) | not compared | none found |
| Your Game | Delete This Save? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1024x768), iphone-15-plus (430x932) | not compared | none found |
| Your Game | Rename Save | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1024x768 600x960), iphone-15-plus (932x430 430x932) | not compared | none found |
| Your Game | This Save Is Already Here | dialog | no | not compared | phone (390x844) | not compared | none found |
| Your Game | Replace This Save? | dialog | no | not compared | desktop (1280x720), phone (390x844) | 4 things in both | none found |
| Your Game | Delete This Copy? | dialog | no | not compared | desktop (1280x720), phone (390x844) | 5 things in both | none found |
| Project | Shelve The Project | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1280x720 600x960), iphone-15-plus (932x430), iphone-15-pro-max (430x932) | not compared | none found |
| Script | Choose A Work To Adapt | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | A Work To Adapt, Open | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | Revise From The Work | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Your Work | Split A Character | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | Choose Ideas (A Starting Idea, Blend Genres, Build A Logline And The Rest) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Script | An Idea, Open | dialog | no | not compared | desktop (1280x720), iphone-15-pro-max (430x739) | not compared | none found |
| Script | Approve This Draft? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1280x720 768x1024 600x960), iphone-15-plus (430x932), iphone-15-pro-max (430x932) | not compared | none found |
| Script | Compare Draft | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1280x720 768x1024 320x568), iphone-15-plus (932x430), iphone-15-pro-max (430x932) | not compared | none found |
| Script | Rename Draft | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932) | not compared | none found |
| Script | Delete This Scene? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | A Script Change That Touches Other Work (Split The Scene, Combine The Scenes and the like: titled with the change.) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x932) | not compared | none found |
| Script | Change The Rule | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | Remove The Rule | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Script | Change The Relationship | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1024x768 768x1024 600x960), iphone-15-plus (932x430) | not compared | none found |
| Script | Remove The Relationship | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Characters | Take A Character Out Of The Script? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 320x568), iphone-15-plus (932x430) | not compared | none found |
| Script | A Contributor Withdraws? | dialog | no | not compared | desktop (1280x720) | not compared | none found |
| Budget | Accept These Terms? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 667x375), desktop (1280x720 768x1024 600x960), iphone-15-plus (430x739 430x932), iphone-15-pro-max (430x739 430x932) | not compared | none found |
| Cast | Cast A Character (Find Performers) | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844 844x390), desktop (1280x720 768x1024 320x568), iphone-15-plus (430x932), iphone-15-pro-max (430x932 430x739) | not compared | none found |
| Crew | Hire A Crew Member | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | desktop (1024x768 768x1024 320x568 1280x720), iphone-15-plus (430x932 932x430), iphone-15-pro-max (430x932) | not compared | none found |
| Crew | Staff A Department | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | phone (390x844), desktop (1280x720 600x960), iphone-15-pro-max (430x739 430x932), iphone-15-plus (430x739 430x932) | not compared | none found |
| Crew | Guide Me For A Department | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Crew | Hire A Writer Or Director | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Schedule | Where A Place Is Filmed | dialog | no | not compared | phone (390x844), desktop (1280x720), iphone-15-pro-max (430x739) | not compared | none found |
| Edit | Cut This Scene From The Edit? | dialog | no | not compared | phone (390x844) | not compared | none found |
| Release | Change These Episode Dates? | dialog | no | not compared | desktop (1280x720) | not compared | none found |
| Release | Cancel This Release? | dialog | no | not compared | desktop (1280x720) | not compared | none found |
| Festivals And Awards | Prepare Submission | dialog | no | not compared | phone (390x844), desktop (1280x720), iphone-15-plus (430x739) | not compared | none found |
| Edit | Change The Approved Take? | dialog | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |
| Production | Revise The Animatic? | dialog | no | not compared | no | not compared | **not visited** |
| Script | A Scene, Open | panel | desktop: 5, iphone-15-plus: 2, iphone-15-pro-max: 1, phone: 5 | same headings, actions and fields, same order | no | not compared | none found |

## Open Defects

None found by the measures above.

## Seen In One Layout's Journeys And Not The Other's

From the same journeys run on a desktop and on a phone: headings and fields one run caught and the other did not. A journey is sampled as it plays, so something on screen for under half a second can be caught in one run and missed in the other, and each run makes its own save with its own made-up names. This is a list to read, not a count of defects; the comparison that fails a build is the walk's. Everything the stylesheet hides by window size is listed in QA-REPORT.md.

| Screen | Seen | What |
|---|---|---|
| Project: Script | phone only | field: About |
| Project: Script | phone only | field: Area |
| Project: Script | phone only | field: Central Conflict |
| Project: Script | phone only | field: Central Question |
| Project: Script | phone only | field: Civil Rights |
| Project: Script | phone only | field: Climate Or The Environment |
| Project: Script | phone only | field: Competes As |
| Project: Script | phone only | field: Current Events |
| Project: Script | phone only | field: Dialogue Clarity |
| Project: Script | phone only | field: Draft Name |
| Project: Script | phone only | field: Drug Use |
| Project: Script | phone only | field: Food |
| Project: Script | phone only | field: Heightened Creature Foley |
| Project: Script | phone only | field: How It Is Built |
| Project: Script | phone only | field: Intended Ending |
| Project: Script | phone only | field: Intended Experience |
| Project: Script | phone only | field: Kind |
| Project: Script | phone only | field: Language |
| Project: Script | phone only | field: Layered Crowd Sound |
| Project: Script | phone only | field: Logline |
| Project: Script | phone only | field: Natural Location Texture |
| Project: Script | phone only | field: New Act Or Sequence |
| Project: Script | phone only | field: New Question |
| Project: Script | phone only | field: New Thread |
| Project: Script | phone only | field: Note |
| Project: Script | phone only | field: Nudity |
| Project: Script | phone only | field: Point Of View |
| Project: Script | phone only | field: Premise |
| Project: Script | phone only | field: Sexual Content |
| Project: Script | phone only | field: Social Issues |
| Project: Script | phone only | field: Source Material |
| Project: Script | phone only | field: Sparse Soundscape |
| Project: Script | phone only | field: Stakes |
| Project: Script | phone only | field: Story Setting Place |
| Project: Script | phone only | field: Story Setting Place, Country Or Territory |
| Project: Script | phone only | field: Story Setting |
| Project: Script | phone only | field: Synopsis |
| Project: Script | phone only | field: The Arts |
| Project: Script | phone only | field: The Light It Is Shot In |
| Project: Script | phone only | field: The Look It Borrows |
| Project: Script | phone only | field: The Score |
| Project: Script | phone only | field: Theme |
| Project: Script | phone only | field: Threat And Horror |
| Project: Script | phone only | field: Tone |
| Project: Script | phone only | field: Violence |
| Project: Script | phone only | field: What Is Set Up |
| Project: Script | phone only | field: When It Is Set |
| Project: Script | phone only | field: Who It Is For |
| Project: Script | phone only | field: Year It Is Set In |
| Project: Script | phone only | heading: Acts And Threads |
| Project: Script | phone only | heading: Acts |
| Project: Script | phone only | heading: Content |
| Project: Script | phone only | heading: Drafts |
| Project: Script | phone only | heading: Harbour Lights |
| Project: Script | phone only | heading: Light, Sound And Score |
| Project: Script | phone only | heading: Readiness |
| Project: Script | phone only | heading: Research |
| Project: Script | phone only | heading: Revision Notes |
| Project: Script | phone only | heading: Scenes |
| Project: Script | phone only | heading: Setups, Clues And Reveals |
| Project: Script | phone only | heading: Story |
| Project: Script | phone only | heading: Threads |
| Project: Script | phone only | heading: What It's About |
| Projects | desktop only | heading: Projects |

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
