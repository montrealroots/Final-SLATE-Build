# The Research Recovery Package, Applied (November 20, 2026)

The owner's package `SLATE-Research-Recovery-2026-11-19` was researched against `b9a9e5c`, and this branch started from that same commit. Its contents are kept unchanged in `docs/recovery/package/`, and its validator passes there: 167 award rows, 45 fee components, 42 sources and 322 gap rows. A pass checks the package's structure only.

## From The Package's Findings To The Code

| Gap (package `docs/01-FINDINGS.md`) | Where it lives | Evidence used | What changed |
|---|---|---|---|
| BAFTA film, television and craft | `src/data/history/awards-2026.json`; reference set `awards-2026-reference.json` | BAFTA's releases as the package read them. bafta.org refused this session (HTTP 403), and the source record says so. | Every winner is now recorded: Film 26, Television 26, Craft 23. Five Film winners stay where the reference set already held them, once. The Craft Awards ceremony (April 26) is kept apart as `bafta-tv-craft`. The game has no institution for it, so it is shown nowhere and is listed below. Nominees are not recorded. |
| SXSW | same | Both official releases, read in full from their PDFs. The jury release is dated March 18 and the audience release March 20, from the text inside each. The October upload folder is ignored. | 46 results: every jury, special and audience award. The narrative jury award stays in the reference set. |
| Locarno | same | A secondary report attributed to the festival. The festival's own page refused both the package and this session. | 19 results with status `reported`, never `verified`. |
| TIFF | same | A secondary report, corroborated by a second one. | 5 results with status `reported`. |
| IDFA | same | IDFA's results page, read in full by this session. Announced November 19, three days before the festival ends. | 22 results: every award and special mention. They show from November 19, not from the festival's close. |
| International Emmys | same | The Academy's nominations release, read in full. | Nominees for all 16 categories, from September 23. Winners on November 23: not yet held. |
| Gothams | same | The Gothams' nominations release, read in full by this session. The package had only the search-index text. | Nominees for 11 film categories, from October 27. Winners on November 30: not yet held. |
| Blue Dragon | same | A secondary report. | Best Film nominees with status `reported`. Winners on November 25: not yet held. |
| European Film Awards, two editions | same; `src/data/institutions.json` (the 39th is the game's 2026 edition) | The 39th's nominations page, read in full and dated November 14. The 38th's winners page, which carries no date. | The 39th's nominees: 16 categories. The 38th's 22 winners are kept as the 2025 edition with status `reported`, because the organizer's page gives no date. No save reaches 2025 (play starts in 2026), so they are never shown in a 2026 edition. |
| Visas and permits | `src/data/papers/terms.json`, `src/engine/papers*.ts` | See the papers section of `RESUME-HERE.md`. | See below. |
| Browser journeys | `playwright.config.ts`, `e2e/` | — | See `JOURNEY-REPORT.md`. |
| Box office | `src/engine/box-office*.ts` | No licensed dataset exists. | See `docs/recovery/BOX-OFFICE.md`. |

## Evidence Statuses

Before November 20, 2026, every observation was `verified`. From then on there are two statuses:

- **`verified`:** the result was read at an official page that gives its date.
- **`reported`:** the result comes from a secondary report, or from an official page with no date.

A `reported` result is shown with "As reported, not yet confirmed by the organizer." A test fails if an observation whose source is secondary or undated is marked anything other than `reported`. Before November 20 the game had no way to say this.

## Counts

| | Before | After |
|---|---|---|
| Observations in `awards-2026.json` | 1,352 | 1,580 (228 added; 47 of them `reported`) |
| Sources | 82 | 95 |

The import is idempotent. A second run adds nothing and leaves the file byte for byte the same. A row that is already held with different content stops the run, because a correction has to be recorded as a revision rather than written over the old row.

## Results Not In The Game's Categories

These are recorded under the organizer's own name, with the category left empty (`category: null`). On an edition's page they appear under "Recorded Under Other Names", where the game holds that institution. Nothing is lost and no category is guessed.

| Edition | Year | Results | In the game's categories | Status | Not in the game's categories |
|---|---|---|---|---|---|
| SXSW 2026 Film & TV Festival | 2026 | 46 | 5 | verified | Narrative Feature Competition Special Jury Award For Performance; Narrative Feature Competition Special Jury Award For Screenwriting; Documentary Feature Competition Special Jury Award; Narrative Short Competition Jury Award; Narrative Short Competition Special Jury Award; Documentary Short Competition Jury Award; Documentary Short Competition Special Jury Award; Animated Short Competition Jury Award; Animated Short Competition Special Jury Award; Midnight Short Competition Jury Award; Midnight Short Competition Special Jury Award; Texas Short Competition Jury Award; Texas Short Competition Special Jury Award For Standout Ensemble; Music Video Competition Special Jury Award; Independent TV Pilot Competition Special Jury Award; XR Experience Competition Jury Award; XR Experience Competition Special Jury Award; Agog Immersive Impact Award; Green Lens Award; Janet Pierson Champion Award; NEON Auteur Award; Redbreast Unhidden Award; SXSW Best of Texas Award; Vimeo Staff Pick; Headliner Audience Award; Narrative Spotlight Audience Award; Documentary Spotlight Audience Award; Midnighter Audience Award; Visions Audience Award; Global Audience Award; 24 Beats Per Second Audience Award; Festival Favorite Audience Award; Narrative Short Competition Audience Award; Documentary Short Competition Audience Award; Animated Short Competition Audience Award; Midnight Short Competition Audience Award; Texas Short Competition Audience Award; Music Video Competition Audience Award; TV Premiere Audience Award; TV Spotlight Audience Award; Independent TV Pilot Competition Audience Award |
| IDFA 2026 | 2026 | 22 | 6 | verified | International Competition: IDFA Award For Best Directing; International Competition: IDFA Award For Best Editing; International Competition: IDFA Award For Best Cinematography; International Competition: Special Mention; Envision Competition: Special Mention; Envision Competition: IDFA Award For Best Directing; Envision Competition: IDFA Award For Outstanding Artistic Contribution; IDFA DocLab Award For Immersive Non-Fiction; IDFA DocLab Immersive Non-Fiction: Special Mention; IDFA DocLab Award For Digital Storytelling; IDFA DocLab Digital Storytelling: Special Mention; IDFA Award For Best Short Documentary; Short Documentary Competition: Special Mention; Best First Feature: Special Mention; Best Dutch Film: Special Mention; ReFrame Award: Special Mention |
| 39th European Film Awards | 2026 | 16 | 14 | verified | European Actress; European Discovery – Prix FIPRESCI |
| 38th European Film Awards | 2025 | 22 | 20 | reported | European Actress; European Discovery – Prix FIPRESCI |
| 54th International Emmy Awards | 2026 | 16 | 13 | verified | Current Affairs; News; Telenovela |
| 36th Gotham Film Awards | 2026 | 11 | 10 | verified | Gotham Audience Award |
| 2026 EE BAFTA Film Awards | 2026 | 21 | 4 | verified | Adapted Screenplay; Cinematography; Editing; Original Score; Costume Design; Make Up and Hair; Production Design; Outstanding British Film; Casting; Film Not in the English Language; Outstanding Debut; Children's and Family Film; Sound; Special Visual Effects; British Short Film; British Short Animation; EE Rising Star |
| 2026 BAFTA Television Awards | 2026 | 26 | 5 | verified | Supporting Actor; Supporting Actress; Male Performance in a Comedy; Female Performance in a Comedy; Entertainment Performance; Entertainment; Reality; Soap; Scripted Comedy; Daytime; Live Event; Sport; Factual Entertainment; Single Documentary; Specialist Factual; News Coverage; Current Affairs; Short Form; International; Children's Scripted; Children's Non-Scripted |
| 2026 BAFTA Television Craft Awards | 2026 | 23 | 0 | verified | Director: Fiction; Sound: Fiction; Entertainment Craft Team; Sound: Factual; Emerging Talent: Fiction; Emerging Talent: Factual; Director: Multi-Camera; Writer: Comedy; Writer: Drama; Costume Design; Photography and Lighting: Fiction; Production Design; Director: Factual; Original Music: Factual; Original Music: Fiction; Children's Craft Team; Make Up and Hair Design; Scripted Casting; Editing: Factual; Photography: Factual; Editing: Fiction; Titles and Graphic Identity; Special, Visual and Graphic Effects |
| Locarno79 | 2026 | 19 | 1 | reported | International Special Jury; International Director; International Performance; Cineasti Golden Leopard; Cineasti Emerging Director; Cineasti Special Jury; Cineasti Performance; Auteur Short; International Short Golden Leopard; International Short Silver Leopard; International Short Direction; EFA Short Candidate; Swiss Short Golden Leopard; Swiss Short Silver Leopard; Swiss Newcomer; Kids; First Feature; Change |
| TIFF 2026 | 2026 | 5 | 5 | reported | none |
| 47th Blue Dragon Film Awards | 2026 | 1 | 1 | reported | none |

Two gaps in the game's own catalog showed up here:
- The European Film Awards have no European Actress category, though the organizer gives one in both editions.
- The game holds no institution for the BAFTA Television Craft Awards.

Neither has been added. A playable category or institution needs its rules read, and they haven't been.

## Not Done And Why

- **BAFTA nominees.** BAFTA's site refuses this session, so the full roster (`bafta.org/awards/film/?award-year=2026`) couldn't be read.
- **Official confirmation for Locarno and TIFF.** Both festivals refuse the tools.
- **Most other festival awards.** The package holds 5 of TIFF's results and the Pardo's competition's; the rest aren't recorded.
- **Winners still to come.** The International Emmys (November 23), Blue Dragon (November 25), the Gothams (November 30) and the 39th European Film Awards (January 16, 2027) haven't happened yet. Nothing can record them before they do.
- **The 38th European Film Awards' date.** No official page that states it was found, so its results stay `reported`.
