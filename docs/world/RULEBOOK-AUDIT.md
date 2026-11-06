# Festival And Award Rulebook Audit

Checked November 6, 2026. The catalog was recounted from the engine before the audit (`tests/rulebooks.test.ts`
asserts it): **37 institutions and 141 categories**, the same counts as the previous review.

This audit records rules read in each organizer's own document for a named edition. A rule is listed only if it was
read; dates or category names being right does not make an institution's rules verified. Rules not listed here are
**simulated** (SLATE's own rules, shaped on each event and labelled as such in the game). The data is in
`src/engine/rulebooks.ts`; each rule there carries its status, its source and, where SLATE is simpler than the real
process, a note the player can read under "How These Rules Apply".

## Coverage

| | Institutions | Categories |
| --- | --- | --- |
| In the catalog | 37 | 141 |
| With organizer rules read for their next edition | 4 (Academy Awards, Sundance, Clermont-Ferrand, Annie Awards) | 23 (12 + 4 + 1 + 6) |
| With last edition's rules carried forward (projected) | 1 (Cannes) | 1 (Short Film Competition) |
| Rules still simulated | 32 fully, plus the remaining categories of Cannes | 117 |

Dates (separate from rules) remain as recorded in `INSTITUTION-AUDIT.md`: 19 institutions on organizer-announced
dates, 18 on planning dates.

## How Rules Are Versioned

- Each edition records the rulebook it is judged by (`Edition.rulesId`, for example `oscars-2027@1`, or `simulated`)
  when it is created. Rulebooks are append-only: a correction is a new version with a new id, so an edition keeps the
  rules it was created with and past entries and results are never re-judged.
- Save version 3 (migration from version 2, after the usual pre-migration backup) records `simulated` for every
  existing edition that is past, current or has any entry. A future edition nobody has entered adopts the published
  rulebook; its deadline events move to the published deadlines. The same migration stores each competing film once
  (`GameState.rivalFilms`) instead of in every category of every edition; titles, people and strengths are unchanged.

## Academy Awards, 99th (ceremony 2027)

Sources (retrieved November 6, 2026):
[99th Oscars Complete Rules](https://www.oscars.org/sites/oscars/files/2026-05/99th_oscars_complete_rules.pdf);
[99th Short Films Qualifying Festival List](https://www.oscars.org/sites/oscars/files/2026-05/99AA_Shorts%20Qualifying%20Festivals.pdf);
[press release approving the 99th rules](https://press.oscars.org/news/awards-rules-and-campaign-promotional-regulations-approved-99th-oscarsr).

| Rule | Verified text (summary) | Where | Applied in SLATE to |
| --- | --- | --- | --- |
| Feature length | "feature length (defined as over 40 minutes)" | Rule Two 2a | Picture, Director, Screenplay, the four acting categories, Animated, Documentary |
| Qualifying run window | Theatrical qualifying run must begin January 1 to December 31, 2026 | Rule Three 1 | Same categories |
| Theatrical run | Paid admission in one of six US metro areas, at least seven consecutive days, three screenings daily with one between 6 and 10 p.m. | Rule Two 2c-d | Same categories. **SLATE simplification:** a US theatrical release by a distributor stands in for the run (no cities or screening counts in the game). Shown to the player. |
| Theatrical first | First public exhibition in any non-theatrical way (TV, VOD, streaming...) makes a film ineligible; non-theatrical release on or after the run's first day is allowed | Rule Two 3, Rule Three 2-3 | Same categories: a US streaming, digital or broadcast release before the first US theatrical release rules a film out |
| General entry deadline | 5 p.m. PT, Thursday November 12, 2026 (films qualifying July to December; September 17 for January to June) | Rule Three 5 | SLATE uses November 12 for every film |
| Documentary feature deadline | 5 p.m. PT, Thursday October 15, 2026 | Documentary rules | Documentary |
| Animated feature | At least 75 percent of running time animated; over 40 minutes | Animated Feature I | Animated: animation projects only; hybrid projects are not treated as meeting 75 percent. Shown to the player. |
| Best Picture recipients | Three or fewer credited "producer"/"produced by" individuals; executive, co-, associate and line producers excluded | Rule Twenty | Picture: at most three credited producers are named |
| Short definition | 40 minutes or less, including all credits | Short rules I.A | Live Action, Animated and Documentary Short |
| Short qualifying period | October 1, 2025 to September 30, 2026 | Short rules II | Same |
| Short qualification | Seven-day theatrical run in one of the six metro areas, **or** a qualifying award at a festival on the Academy's list | Short rules II.A | Same. Festivals on the list that exist in SLATE: Annecy, Berlinale, Cannes, Clermont-Ferrand, FESPACO, Hot Docs, IDFA, Sitges, SXSW, Sundance, TIFF, Venice (Busan's listed festival is the separate short film festival, so Busan's SLATE section doesn't count). A win counts when it is the top award of the matching SLATE section. |
| Live action excludes documentaries | "Documentary short films will not be accepted in the live action category." | Live Action Short I.C | Live Action Short |
| Shorts deadline | 5 p.m. PT, Thursday October 8, 2026 | Short rules | All three short categories |

Not verified: International Feature Film (not in SLATE's catalog), craft categories, writing and acting recipient
limits, Best Picture's expanded theatrical run (Rule Twenty), inclusion standards, the shorts' student-film path.

## Sundance Film Festival 2027

Sources (retrieved November 6, 2026): [2027 Submissions FAQ](https://www.sundance.org/submissions-faq);
[2027 Rules & Regulations](https://www.sundance.org/submissions-rules);
[submit page with 2027 deadlines and fees](https://www.sundance.org/festivals/sundance-film-festival/submit).

| Rule | Verified | Applied to |
| --- | --- | --- |
| Feature length | 50 minutes or more (US and International narrative and documentary features) | Dramatic Competition, Documentary Competition |
| Short length | Less than 50 minutes, including credits | Short Film Program |
| Premiere | US features: world premiere status; International features: international premiere status (not shown outside the country of origin, nothing non-theatrical anywhere) before February 1, 2027 | Dramatic and Documentary: world premiere for US-based productions, international for others. **SLATE simplification:** US or international is decided by at least half of financing; SLATE uses the production base. |
| Shorts | Not publicly shown before January 1, 2026; completed after December 31, 2025 "eligible regardless of premiere status" | Short Film Program |
| Episodic | Not public anywhere before February 1, 2027; the 60-minute split changes only the fee | Episodic Program |
| Completion | Feature-length and episodic projects completed before January 1, 2025 not eligible | Dramatic, Documentary, Episodic |
| Deadlines | Features late deadline September 21, shorts August 31, episodic September 11, 2026 | Each section. The time of day is not given; SLATE uses 11:59 p.m. in Boulder and says so. |

Festival dates January 21 to 31, 2027 were already recorded. Not verified: NEXT, Premieres and Midnight programs
(not in SLATE), U.S. Documentary financing proof, subtitle rules (not modeled).

## Clermont-Ferrand International Short Film Festival, 49th (2027)

Source: [Regulations - International Competition 2027](https://www.lecourt-clermont.org/wp-content/uploads/2026/06/EN-Reglement-international-2027.pdf) (retrieved November 6, 2026).

| Rule | Verified | Applied to |
| --- | --- | --- |
| Dates | January 29 to February 6, 2027 | (already recorded) |
| Completion | "Only films completed after 1st October 2025" | International Competition (from October 2, 2025) |
| Length | "Films must not exceed 40 minutes" | International Competition |
| Genres | Fiction, documentary, experimental, live action or animation; no industrial or commercial films | Already matched by SLATE's formats |
| Premiere | "does not require premiere status" | No premiere check |
| Origin | France-majority productions go to the national competition | International Competition refuses French-based productions (production base as origin) |
| Re-entry | "Films submitted to previous editions cannot be re-entered, even in a new version." | International Competition |
| Deadlines | July 9, 2026 for films completed October to December 2025; September 24, 2026 for films produced in 2026 | International Competition, by completion date; end of day in France assumed (time not given) |
| Fee | €13 plus a Shortfilmdepot stamp | Recorded only; SLATE's fee for this section is 0 |
| Recipients | Prizes are paid to the director | International Competition names the credited director |

## Annie Awards, 54th (2027)

Source: ASIFA-Hollywood's call for submissions, as republished by
[Animation Scoop](https://www.animationscoop.com/54th-annie-awards-call-for-submissions-begin-today/) (retrieved November
6, 2026). The rules page on annieawards.org did not load from this environment; the announcement is the organizer's
own text. It is an accessible alternative, not the full rulebook.

| Rule | Verified | Applied to |
| --- | --- | --- |
| Eligibility | Animated productions released in the United States in 2026 | All six SLATE categories |
| Exceptions | Short subjects (and special projects, sponsored productions, student films, films in competition at Annie-qualifying festivals) can submit with or without a US release | Shorts need no US release in SLATE |
| Submissions | Open August 3, 2026; close November 30, 2026 | All categories; end of day in Los Angeles assumed (time not given) |
| Fees | $200 to $325 by date paid | Not applied (SLATE's fees are simulated) |
| Nominations, ceremony | January 20, 2027; February 20, 2027, Royce Hall | Ceremony date already recorded |

Not verified: running-time thresholds, category definitions, individual achievement eligibility.

## Cannes Film Festival, 80th (2027): Short Film Competition, projected

Source: [2026 Regulations - Short Films In Competition](https://cdn.festival-cannes.com/media/uploads/2025/11/reglement_courts-metrages_2026-en.pdf)
(retrieved November 6, 2026). The 2027 short film regulations are not published; the 2026 rules are carried forward and
labelled **Projected Rules** in the game.

| Rule (2026) | Projected for 2027 as |
| --- | --- |
| Made in the twelve months preceding the festival | Completed from May 11, 2026 |
| Not screened elsewhere than the home country | International premiere |
| Not in another festival's international selection | No earlier festival premiere (SLATE treats any as one) |
| Not screened on the internet | No streaming or digital release before the festival |
| At most 15 minutes including credits | 15 minutes or less |
| Deadline March 2, 2026 | March 2, 2027, end of day in France |

The Competition and Special Screenings sections, and every other Cannes rule, remain simulated.

## Still To Read (rules simulated until then)

Berlinale, Venice, TIFF, San Sebastián, Busan, Sitges, IDFA, Hot Docs, SXSW, Series Mania, Locarno, FESPACO, Annecy,
BAFTA Film and Television, Golden Globes, Emmys, International Emmys, Spirit, Gotham, DGA, WGA, PGA, Actor Awards,
César, Goya, Canadian Screen, AACTA, AMAA, Japan Academy, Blue Dragon, European Film Awards; and the remaining
categories of Cannes. Each needs its organizer's document for the edition in play. Attempted on November 6, 2026:

- **BAFTA Film Awards 2027:** bafta.org (rules page and the "2027 EE BAFTA Film Awards opens for entries" release)
  refused requests from this environment (HTTP 403). Secondary coverage was found but not used. Read the organizer's
  2027 Rules and Guidelines from a normal browser.
- **Annecy 2027:** the festival has not published 2027 terms; its 2026 Feature Films and Short Films Terms and
  Conditions exist (annecyfestival.com) and could support projected rules, like Cannes short films.
