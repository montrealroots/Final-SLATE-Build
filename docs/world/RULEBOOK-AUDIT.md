# Festival And Award Rulebook Audit

Checked November 6, 2026 (two passes the same day). The catalog was recounted from the engine before the second pass
(`tests/rulebooks.test.ts` asserts it): **37 institutions and 142 categories**. The count was 141 until the 78th Emmys
renamed Outstanding Television Movie to Outstanding Movie; both are kept, by year, so older saves keep their entries.
On November 9, 2026 the rosters (`docs/awards/roster/`, `docs/awards/INVENTORY.md`) took the catalog to **802
categories**, and the rules already read were applied to the categories they cover that the catalog had lacked; the
coverage table below was recounted then.

This audit records rules read in each organizer's own document for a named edition. A rule is listed only if it was
read; dates or category names being right does not make an institution's rules verified. Rules not listed here are
**simulated** (SLATE's own rules, shaped on each event and labelled as such in the game). The data is in
`src/engine/rulebooks.ts`; each rule there carries its status, its source and, where SLATE is simpler than the real
process, a note the player can read under "How These Rules Apply".

## Coverage

A category counts once, at the best status any of its editions has.

| | Institutions | Categories |
| --- | --- | --- |
| In the catalog | 37 | 802 (142 until November 9, 2026) |
| Organizer rules read for an edition (verified) | 9 (Academy Awards, Sundance, Clermont-Ferrand, Annie Awards, Annecy, Venice, Golden Globes, Primetime Emmys, San Sebastián) | 66 (24 + 6 + 1 + 9 + 2 + 3 + 7 + 13 + 1); 48 before: the Academy's Rule Two and general deadline were applied to its 12 craft and adapted-screenplay categories, Sundance's to its 2 World Cinema competitions, Venice's shorts rules to Orizzonti Corti, and the Annies' call to the 4 TV categories that replaced Best TV Or Media Production (which kept its 2026 rules) |
| Only rules carried forward or from an undated page (projected) | 2 (Cannes short films, Berlinale Competition) | 2 |
| Rules still simulated | 26 fully, plus the remaining categories of the 11 above | 734 (92 before) |

Editions per institution with rules: Annecy 2026 (verified) and 2027 (projected from 2026); Venice 2026 (verified) and
2027 (projected); Emmys 2026 (verified) and 2027 (projected); Golden Globes 2027, Academy Awards 2027, Sundance 2027,
Clermont-Ferrand 2027 and Annie Awards 2027 (verified); Cannes 2027 and Berlinale 2027 (projected).

Dates (separate from rules) remain as recorded in `INSTITUTION-AUDIT.md`: 19 institutions on organizer-announced
dates, 18 on planning dates. Annecy 2026 (June 21-27) and Venice 2026 (September 2-12) dates were read in the documents
below but the game's edition dates were not changed in this pass.

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
retrieved November 9, 2026: [99th Documentary Feature Film Qualifying Festival List](https://www.oscars.org/sites/oscars/files/2026-04/99AA_Documentary%20Feature%20Qualifying%20Festivals.pdf) (updated April 10, 2026);
[International Feature Film FAQs](https://www.oscars.org/sites/oscars/files/2026-07/99AA_International_Feature_FAQs.pdf);
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
| Short qualification | Seven-day theatrical run in one of the six metro areas, **or** "won a qualifying award at a competitive film festival, as specified in the Short Films Qualifying Festival List, regardless of any prior public exhibition", the award won October 1, 2025 to September 30, 2026 | Short rules II.A.2 (Rules Eight, Fourteen, Seventeen); the list | Same. **Version 2 (`oscars-2027@2`, November 9, 2026):** only the 20 listed awards SLATE holds, each mapped to one category (`QUALIFYING_LISTS` `aa99-shorts`: Annecy Cristal and Jury Award; Berlinale Golden Bear for Best Short Film; Canadian Screen Awards' three short awards; Cannes Short Film Palme d'Or; the César's three; Clermont-Ferrand Grand Prix (International); the Goyas' three; Sitges SOFC Best Short Film and Best Animated Short; Sundance Short Film Grand Jury Prize; TIFF Best International and Best Canadian Short Film; Venice Orizzonti Best Short Film). Another prize at the same festival, a selection, a mention, an audience award, a withdrawn or disqualified entry, or a win outside the window doesn't qualify. Listed but not held in SLATE: Clermont's national Grand Prix, Sundance's four Short Film Jury Awards, SXSW's three shorts jury awards, Hot Docs' two, IDFA's short documentary award, FESPACO's Golden Foal, Locarno's two Pardini, BAFTA's two, and the Busan International *Short* Film Festival (a different festival). **Version 1** named sections and awards the list doesn't (TIFF's animated short award, Hot Docs' audience award, SXSW's, FESPACO's and IDFA's short sections) and admitted any listed result; editions entered under it keep it. |
| Live action excludes documentaries | "Documentary short films will not be accepted in the live action category." | Live Action Short I.C | Live Action Short |
| Shorts deadline | 5 p.m. PT, Thursday October 8, 2026 | Short rules | All three short categories |

| Documentary feature qualification | A US theatrical run in 2026 (six metro areas, seven days, three screenings daily), **or** a qualifying award on the Documentary Feature Film Qualifying Festival List won October 1, 2025 to September 30, 2026 "regardless of any prior public exhibition or distribution by nontheatrical means", **or** "submitted and deemed eligible in the International Feature Film category" | Rule Thirteen II.A.1-3; the list | Documentary (version 2). Listed awards SLATE holds: Berlinale Documentary Award; IDFA's International Competition award, which SLATE's roster calls "Best Film" and the list "Best Feature-Length Documentary" (SLATE's reading, flagged in the ledger). Route 3: an International Feature Film entry of the same film that the committee accepted; while it is undecided the documentary entry is provisional, and the deadline decides national selections first. |
| International Feature Film definition | Over 40 minutes, produced outside the United States and its territories, more than 50 percent non-English dialogue; animation and documentary allowed | Rule Sixteen I, II.D | International (version 2). **SLATE simplification:** the dialogue test reads the project's first dialogue language; there is no percentage in the game. |
| International Feature Film qualification | Route 1: official selection by the country's Academy-approved committee, one film per country, with a theatrical release beginning October 1, 2025 to September 30, 2026 for seven consecutive days in one venue, outside the US. Route 2: "won a qualifying award at an international film festival" on the list | Rule Sixteen II.A, III.A.2; FAQs | International (version 2): a theatrical release outside the US in the window, or a listed award; a listed award qualifies without the committee and takes no country's place; a country's committee puts forward only one of your films, the strongest considered first. The FAQ's six awards: Berlin Golden Bear for Best Film, Busan Award – Best Film Award (not held in SLATE), Cannes Palme d'Or, Sundance World Cinema Grand Jury Prize (the list doesn't say which competition; SLATE accepts the Dramatic and the Documentary prize), TIFF Platform Award, Venice Golden Lion, won "before September 30, 2026" (no first day stated; SLATE uses October 1, 2025). |
| International Feature Film nontheatrical release | Any nontheatrical exhibition or distribution before the qualifying theatrical release makes a film ineligible | Rule Sixteen II.C | International (version 2), anywhere; not applied to a film qualifying by its festival award, which has no qualifying theatrical release (SLATE's reading). |
| International Feature Film materials | Due 5 p.m. PT, Wednesday September 30, 2026 | Rule Sixteen III.B | International (version 2) |

Until November 9, 2026, International Feature Film had no rules here: it asked for a US theatrical release, and any
festival entry marked won in the 400 days before the deadline, at any festival, qualified it without the committee. An
Oscar short whose edition had no rulebook qualified through any festival win at all. Editions of later years read the
newest list carried forward a year at a time (`projectedList`), labelled as such in Prepare Submission.

Not verified: craft categories, writing and acting recipient
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

**Version 2 (`cannes-2027@2`, read November 9, 2026):** the [2026 Official Selection feature film regulations](https://cdn.festival-cannes.com/media/uploads/2025/11/reglement_longs-metrages_2026_en.pdf),
projected to 2027. Article 3 lists the sections (Competition, Un Certain Regard, Cannes Première, special screenings) and
Article 4's criteria apply to all of them: produced in the twelve months before the festival; "not have been screened
elsewhere than their home country"; not presented in another festival's international selection (SLATE: any earlier
festival premiere); "not have been screened on the Internet". Article 10: submissions by March 13, 2026 (2027 date not
announced; SLATE uses March 13, end of day in Paris). Not modeled: the Competition's pledge of a French theatrical release
(Article 4) and the Palme d'Or or Grand Prix winner's commitment not to compete elsewhere (Article 9).

## Annecy International Animation Film Festival 2026 (verified) and 2027 (projected)

Sources: [2026 Terms and Conditions - Feature Films](https://www.annecyfestival.com/sites/default/files/2025-11/Annecy_Festival_2026_Feature_Films_Terms_and_Conditions.pdf)
and [Short Films](https://www.annecyfestival.com/sites/default/files/2025-11/Annecy_Festival_2026_Short_Films_Terms_and_Conditions.pdf)
(retrieved November 6, 2026). The 2027 terms are not published; 2027 carries the 2026 rules forward, a year later,
labelled Projected Rules.

| Rule (2026) | Feature Film Competition | Short Film Competition |
| --- | --- | --- |
| Works | "Frame-by-frame" animated works, any technique, for cinema, television or any platform | Same |
| Completion | After January 1, 2025, submitted to Annecy for the first time | Same |
| Length | Over 60 minutes, credits included | Less than 59 minutes 59 seconds, credits included |
| Premiere | Not screened in France before the festival ends; Cannes (Official Selection, Directors' Fortnight, Critics' Week, ACID) excepted | No requirement stated |
| Entry closes | Before March 15, 2026 (SLATE: end of March 14 in France) | Before February 15, 2026 (end of February 14) |
| Fee | €100 (recorded only) | €30 (recorded only) |

Not read: the Television, commissioned and graduation film terms; the TV competition stays simulated.

**Version 2 (`annecy-2026@2`, `annecy-2027@2` projected, read November 9, 2026):** the feature terms apply "in all
categories: Official, Contrechamp, Midnight Specials, Annecy Presents" (section 2), so Contrechamp takes the feature rules;
the short film terms list Off-Limits and Perspectives among their competitive categories (section 5), so both take the
short film rules; TV films and web series follow the [Règlement 2026 – Films de télévision](https://www.annecyfestival.com/sites/default/files/2025-11/Annecy_Festival_2026_Reglements_Films_de_TV.pdf)
(French only), section 2: completed after January 1, 2025; submitted for the first time; entries before February 15, 2026
(SLATE: end of February 14 in France). Not modeled: one episode per series and no pilots (SLATE enters a project).

## Venice International Film Festival, 83rd (2026, verified) and 84th (2027, projected)

Source: [Regulations - 83rd Venice International Film Festival](https://static.labiennale.org/files/cinema/2026/Documenti/regulations-83.pdf)
(retrieved November 6, 2026). 2027 carries these forward, labelled projected.

| Rule (2026) | Applied to |
| --- | --- |
| World premieres only; no commercial distribution or internet exhibition; not screened to the public or press, nor at any other festival or event, including in the country of origin | Competition, Horizons |
| Completed after September 6, 2025; not presented in any form for selection at an earlier Venice edition | Competition, Horizons |
| At least 60 minutes for features; at most 20 minutes for short films in competition (credits included) | Competition (features), Horizons (both) |
| Submissions open February 9; close June 4 (features, series) and May 28 (short films), 2026 | Both; time of day not given (end of day in Venice) |

Not applied: the prize recipients (the regulations name the prizes, not who receives most of them).

**Version 2 (`san-sebastian-2026@2`, `san-sebastian-2027@2` projected, read November 9, 2026):** "All films submitted will
be considered for any of the Festival sections making up the programme" (II, article 3), so section II's rules above apply
to New Directors, Horizontes Latinos, Zabaltegi-Tabakalera, Perlak, Culinary Zinema and Velodrome too. The FAQ on the same
page: "as of 2025 there will not be an open entry for short films" (Zabaltegi's shorts are invited; the over-60-minutes
rule refuses an entered short). Article 2 refers to each section's own rules or guidelines, which the page doesn't
reproduce and which weren't found; the catalog keeps its own section requirements (a debut, Latin American production,
a food subject).

## Berlinale 2027: Competition, projected

Source: [Competition Regulations](https://www.berlinale.de/en/film-entry/guidelines/competition.html) (retrieved November
6, 2026). **The page names no edition year**, so these rules are shown as projected for 2027, not verified: at least 60
minutes; world or international premieres (not presented publicly outside the country of origin); not broadcast on
television or presented on the internet or VOD; completed within the 12 months before the festival. No 2027 deadline was
found.

**Version 2 (`berlinale-2027@2`, read November 9, 2026):** the other five sections' regulation pages, also undated, so
projected. Each page's section 1:

| Section | Page | Rules applied |
| --- | --- | --- |
| Perspectives | [perspectives.html](https://www.berlinale.de/en/film-entry/guidelines/perspectives.html) | At least 60 minutes; world, international or European premiere (not shown in Europe outside the country of origin); not shown in Germany; no TV or internet/VOD; completed in the 12 months before the festival; never submitted before. The debut rule is the catalog's own requirement. |
| Panorama | [panorama.html](https://www.berlinale.de/en/film-entry/guidelines/panorama.html) | The same, without the debut rule |
| Forum | [forum.html](https://www.berlinale.de/en/film-entry/guidelines/forum.html) | The same |
| Generation | [generation.html](https://www.berlinale.de/en/film-entry/guidelines/generation.html) | The same; shorts at most 20 minutes |
| Berlinale Shorts | [berlinale-shorts.html](https://www.berlinale.de/en/film-entry/guidelines/berlinale-shorts.html) | At most 30 minutes; world or international premiere (not shown outside the country of origin); not shown in Germany; no TV or internet/VOD; completed in the 12 months before; never submitted before |

Not modeled: "intended for theatrical release"; the country of origin is the production company's registered office,
for which SLATE uses the production base; Generation's audience isn't a rule on its page (the catalog keeps its own
young-audience requirement).

## Golden Globes, 84th (2027)

Source: [84th Annual Golden Globes Eligibility and Consideration Rules, updated August 3, 2026](https://goldenglobes.com/wp-content/uploads/2026/08/FINAL_84th-ANNUAL-GOLDEN-GLOBES-ELIGIBILITY-AND-CONSIDERATION-RULES_8_3_2026.pdf)
(retrieved November 6, 2026).

| Rule | Applied to |
| --- | --- |
| Feature-length scripted motion pictures, 70 minutes or longer, qualifying year January 1 to December 31, 2026 | All five motion picture categories |
| "Released": commercial theaters or pay-per-view (not subscription) in greater Atlanta, Chicago, Dallas, Los Angeles, Miami, New York City or San Francisco for seven consecutive days; a festival screening alone doesn't count | Same; SLATE treats a US theatrical or digital release as qualifying (stated to the player) |
| Uploaded to the voters' viewing platform no later than December 2, 2026 | Same (end of day in Los Angeles assumed) |
| Animated: at least 75% animation of the main characters; motion capture alone isn't animation | Best Motion Picture, Animated: animation projects only |
| Recipients: Drama and Musical or Comedy go to the producers accredited by the PGA; Animated to directors, co-directors and accredited producers | Those three |
| Television: first episode of the season first available in the US in 2026; programs produced principally outside the US only as US co-productions; documentaries not eligible | Both television series categories |

Not applied: the drama-or-comedy classification by tone (SLATE separates them by genre, simulated), the Non-English and
low-budget independent provisions, campaign rules.

**Version 2 (`golden-globes-2027@2`, read November 9, 2026):** the other 19 entered categories read their part of the
rules. Film acting, Original Score, Original Song and Cinematic and Box Office Achievement take the motion picture rules
(A.1: 70 minutes, released in 2026 in one of seven US metro areas, on the voters' platform by December 2). Non-English
Language takes A.3.c: first released in its country of origin for seven consecutive days in 2026 (vi), no US release
needed (viii), submitted once (vii), given to its directors and PGA-accredited producers (A.3.i.ii). The television
limited series and every television acting category take the television rules (C.1). Not modeled: A.1.c (a film must
also be submitted for Best Motion Picture to be eligible for the individual awards, except non-English and low-budget
independent films); A.3.d's exclusion of voice-only and cameo performances; B.1.b's $150 million box-office threshold (the
catalog's requirement reads a theatrical release, a gap recorded for the recipients and work-specific audit).

## Primetime Emmy Awards, 78th (2026, verified) and 79th (2027, projected)

Source: Television Academy, 78th Emmy Awards 2025-2026 Rules and Procedures, version 4 (updated April 7, 2026), from
[televisionacademy.com/rules](https://www.televisionacademy.com/rules) (retrieved November 6, 2026). The 2026-2027 rules
are not published; 2027 carries these forward, labelled projected.

| Rule (2025-2026) | Applied to |
| --- | --- |
| Eligibility June 1, 2025 to May 31, 2026; the premiere airing on a US national platform in that period | All 13 categories held from 2026 |
| Entries close May 7, 2026 | All (end of day in Los Angeles assumed) |
| Six episodes premiered by May 31 for comedy and drama series; three for documentary series | Series, directing, writing and lead acting categories; Documentary Or Nonfiction Series |
| A "domestic general theatrical release" before airing makes a program ineligible | All (limited releases of up to 70 theater-days are not modeled) |
| Foreign productions eligible only as US co-productions begun before production | All (production base as origin) |
| Outstanding Movie (category 82, renamed from Outstanding Television Movie): one part of at least 75 minutes | Outstanding Movie, held from 2026 |
| Program awards go to producers whose credits and functions support it | Program categories |

**Version 2 (`emmys-2026@2`, `emmys-2027@2`, read November 9, 2026).** The general rules above are the "Eligibility"
section's rules 1 to 17, which apply to every category of the competition, so version 2 applies them to all 111 entered
categories held from 2026 (the 13 above keep their rules unchanged; the two Governors and Special Awards take no entries).
Category-level provisions applied:

| Rule (2025-2026) | Where | Applied to |
| --- | --- | --- |
| Six episodes premiered by May 31 for series in animation, comedy, drama, variety, short form and reality categories; three for documentary and hosted nonfiction series | Eligibility 11c | Every category that takes series only: the 34 in `EMMY_SIX` (rulebook-data.ts) at six, Hosted Nonfiction Series Or Special at three. Categories that also take specials, movies or limited series (Animated Program, the variety specials' crafts, the nonfiction crafts, Title Design and others) have no minimum: the rule is per program and SLATE can't tell from the category which one is entered. |
| Short Form Comedy, Drama Or Variety Series: at most six entrants; "petitions to exceed the cap will not be considered" | Category 86 | At most six credited producers named |
| Program awards to producers whose screen credit and functions support it | Each program category's text | Every program category: credited producers |

Read but not modeled (each needs a fact SLATE doesn't record): guest performers must appear in fewer than half of the
eligible episodes, and a performer nominated before as lead or supporting can't enter as a guest (categories 70-73);
Character Voice-Over is for programming for audiences 13 and over (category 75); short form episodes average 2 to 20
minutes (Eligibility 17); an animated program needs 65 percent new animation (category 2); music categories need 35
percent of the episode's music (Music); producers must be credited on half of a series' episodes, and the producer caps
other than short form's are guidelines; the variety categories also honour the principal host; the limited release of up
to 70 theater-days and the Oscar-nomination bar (Eligibility 8a-8d).

**Version 2 (`venice-2026@2`, `venice-2027@2` projected, read November 9, 2026):** Article 3's criteria open with "Only
films presented as world premieres that meet the following criteria are eligible for selection" for the whole Official
Selection, so Open – Out of Competition (3.2) and Venice Spotlight (3.4, "provided their duration exceeds 60 minutes")
take them, with the features' June 4 deadline. The Settimana Internazionale della Critica (5.1) and the Giornate degli
Autori (5.2) are selected "in accordance with" their own associations' regulations, which these don't give; they stay on
SLATE's rules until those are read.

## San Sebastián, 74th Edition (2026, Verified) And 75th (2027, Projected)

Source: "Rules and Regulations - 74th San Sebastian International Film Festival" (sansebastianfestival.com, read November 6,
2026). Festival September 18-26, 2026; entries from January 16.

| Rule | Value | Article |
| --- | --- | --- |
| Length | Feature films over 60 minutes | II, 2 |
| Completed | In the 12 months before the festival starts (from September 18, 2025) | II, 2 |
| Other festivals | Not in any other festival before San Sebastián | II, 7 |
| Online | Not on video-on-demand platforms | II, 7 |
| Deadline | June 16, 2026 (time not given; SLATE uses the end of the day in San Sebastián); later entries at the festival's discretion | II, 6 |

Simplifications, as written in the rules' notes: the exceptions for FIAPF non-competitive festivals and national
competitions in the country of production are not modeled; films produced entirely in Spain must also be world premieres,
which SLATE does not check separately. The 2027 rules are the 2026 ones carried forward, labelled projected.

## Not Readable From Here

- **TIFF (Toronto):** tiff.net/submissions and TIFF's FilmFreeway page refused this environment (HTTP 403), on two
  passes. Search summaries mention premiere-status rules (world, international or North American; Canadian at TIFF's
  discretion) and May 8, 2026 as the standard deadline, but these were not read from TIFF's own terms and are **not
  used**: `tiff-2026` stays simulated. A third pass on November 9, 2026 (tiff.net/submit and filmfreeway.com/tiff) was
  refused the same way; the next try is an official archived copy of TIFF's terms or a TIFF press release with them.
- **BAFTA Film Awards 2027:** bafta.org (the rules page and the press release "2027 EE BAFTA Film Awards opens for
  entries") refused this environment (HTTP 403), on both passes. Search summaries give a longlist on January 7, nominations
  on January 19 and the ceremony on February 21, 2027, but not the eligibility period; **not used**: BAFTA stays
  simulated.

### Tests For These Rules (`tests/rulebooks.test.ts`)

Boundaries (runtime, completion date, episode count, airing window), releases (US theatrical or pay-per-view; television or
online first), premieres (France except Cannes; world premiere only), the organizer's time zone (Venice opening at 9:00
and closing at the end of June 4 in Venice, checked from Los Angeles; Emmys May 7 and Golden Globes December 2 in Los
Angeles, checked from London), late entries refused, an entry accepted at the deadline, judged once, screened twice and
given one winner per category, repeated announcement and results events changing nothing, and a selected film withdrawn
when it premieres elsewhere first.

## Still To Read (rules simulated until then)

TIFF, Busan, Sitges, IDFA, Hot Docs, SXSW, Series Mania, Locarno, FESPACO, BAFTA Film and Television,
International Emmys, Spirit, Gotham, DGA, WGA, PGA, Actor Awards, César, Goya, Canadian Screen, AACTA, AMAA, Japan
Academy, Blue Dragon and European Film Awards; and the remaining sections of Cannes (Competition, Special Screenings),
Berlinale (Panorama, Shorts), Annecy (Television) and the Emmys' pre-2026 Outstanding Television Movie. Each needs its
organizer's document for the edition in play; add a new rulebook version, never edit one an edition already uses.
