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

**Version 3 (`oscars-2027@3`, November 9, 2026):** International Feature Film's "more than 50 percent non-English
dialogue" (Rule Sixteen II.D) is counted from the approved script, in words, by each line's language; until then it read
the first dialogue language the producer declared. A film with no written dialogue still reads the declaration. See
`docs/awards/RECIPIENT-RULES.md`.

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

**Version 2 (`clermont-2027@2`, read November 9, 2026):** "The regulations of the International Competition also apply to
the Lab Competition except article 11" (Lab Competition page), so Lab takes the rules above. The National Competition's own
[Règlement – compétition nationale 2027](https://www.lecourt-clermont.org/wp-content/uploads/2026/06/FR-Reglement-national-2027.pdf)
(French), 1.1: French production completed after October 1, 2025 (the main production country holds 50 percent or more of
the financing; SLATE uses the production base); under 60 minutes; no premiere rule; no resubmission, even in a new version.
Section 2: July 9, 2026 for films finished from October to December 2025, October 1, 2026 for 2026 films. Prizes go to
the directors.

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

**Version 2 (`annie-2027@2`, November 9, 2026):** the call's eligibility, exceptions and window are the competition's,
so the other 20 entered categories held for the 54th (effects, character animation and design, directing, music,
production design, storyboarding, voice acting, writing and editorial for TV and features, Independent Feature, Special
Production) read them too. Their own definitions are in the rules page, which still didn't load; they stay unverified.

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

**Version 3 (`golden-globes-2027@3`, November 9, 2026):** Non-English Language's "more than 50% of its dialogue must be
in a language other than English" (A.3.c.i) is counted from the approved script, as the Oscars' is. Not modeled: A.3.c.ii,
that dialects, pidgins and local usages of English count as English.

**Version 4 (`golden-globes-2027@4`, November 9, 2026):** Cinematic and Box Office Achievement's threshold (B.1.b): $150
million worldwide in 2026, $100 million of it from the US, read from what distributors reported for theatrical releases.
Not modeled: commensurate streaming viewership, and projections for releases after November 21 (B.1.c).

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

**Version 3 (`venice-2026@3`, `venice-2027@3` projected, read November 9, 2026):** the Giornate degli Autori's own
[Regulation and Entry Form](https://www.giornatedegliautori.com/?p=381) for its 23rd edition (2026), Article 2: features
and documentaries longer than 60 minutes; produced after September 30, 2025; European films must be world premieres; not
at another international festival or major film event; not released in cinemas, on home video or online (a new SLATE rule,
`unreleased`); not refused at the 2025 selection (SLATE: no earlier Venice entry); entries by June 15, 2026. The
Settimana Internazionale della Critica's site (sicvenezia.it) returned HTTP 503 that morning, so SIC stayed on SLATE's
rules until version 4.

**Version 4 (`venice-2026@4`, `venice-2027@4` projected, read November 9, 2026, later the same day):** the
[Regulations](https://www.sicvenezia.it/en/regulations/) of the 41st Settimana Internazionale della Critica, Articles 3 and
4: the director's first full-length film (the catalog's debut requirement); at least 60 minutes; produced and completed in
the 12 months before the festival (SLATE: from September 2, 2025); Italian films world premieres only, others not released
or at another festival before Venice except in their country of origin (SLATE: `world-if-domestic`); not online;
submitted by June 19, 2026. "Priority will be given to world premieres" is a selection preference, not modeled.

**Version 3 (`emmys-2026@3`, November 9, 2026):** Category 76, Outstanding Narrator ("for a continuing or single
narration in a documentary/nonfiction series or special"), entered: the cast Narrator of a program with a narration
sequence. Performer Awards, read the same day: narrators may not enter the lead, supporting or guest categories
(`noNarrators`); a guest appears in fewer than half the eligible episodes and a short form performer in half or more
(`episodeShare`, from the episodes each performer is credited in). Not modeled: a narration performed as a character
belongs in Character Voice-Over; a performer nominated as lead or supporting can't later enter the same role as a guest;
the 5% screen-time minimums. Category 110, Outstanding Stunt Performance, stays out: SLATE credits the stunt coordinator
but casts no stunt performers (`docs/awards/NONPLAYABLE-REVIEW.md`).

**Version 4 (`emmys-2026@4`, November 9, 2026):** directing and writing "for a single episode" (Categories 24, 25, 27,
29, 30, 113, 114, 116) are entered for one episode, to the people credited on it; comedy and drama directing name at
most two directors. A limited or anthology series (26, 115) is entered whole when everyone credited worked on every
part, and as one part otherwise (decided per entry, not per person). Guest Performer Eligibility: a performer nominated
as lead or supporting for a part can't enter the same part in a later season as a guest (`notAfterNomination`). The 5%
screen-time minimums (guests, of an episode; limited and movie supporting, of the whole) read the approved script's scene
minutes (`screenShare`). When a part is ruled out, every rule that rules it out is listed. Not modeled: the variety series' single entry
chosen by the head writer (116), judging by the episode.

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

## Sitges, 59th (2026, verified) and 60th (2027, projected)

Sources (read November 9, 2026): [2026 Regulations](https://sitgesfilmfestival.com/sites/default/files/2026-02/SIFFFC%202026_Regulations_ENG_23F.pdf),
section I; [2026 Rules](https://sitgesfilmfestival.com/sites/default/files/2026-02/SIFFFC%202026_Rules_ENG.pdf), section II.

| Section | Rules applied | Where |
| --- | --- | --- |
| Official Fantàstic In-Competition Selection | Features at least 60 minutes, produced in the 12 months before the festival opens; Spanish premiere required; no streaming release in Europe (SLATE: any online release); shorts at most 30 minutes, produced 2025-2026 | I, 1.1.1 |
| Anima't | Unreleased in Spain, produced 2025-2026; shorts at most 30 minutes, unreleased in Catalonia (SLATE: Spain) | I, 1.1.3 |
| Noves Visions, Panorama, Sitges Documenta | Unreleased in Spain, produced 2025-2026 | I, 1.1.6, 1.1.8, 1.1.9 |
| Midnight X-Treme | Produced 2025-2026 | I, 1.1.5 |
| All | No films after 12:00 p.m. on July 16, 2026 ("CET" in the document; SLATE uses local time in Sitges) | Rules II |

Not modeled: films produced entirely in Spain must be world premieres in the Official Selection; Panorama's "independent
productions"; the Programming Committee's exceptions for films shown at another Spanish festival.

## IDFA, 39th (2026, verified) and 40th (2027, projected)

Source: [Festival Entry Regulations](https://professionals.idfa.nl/program/festival-entries/festival-entry-regulations/)
for the 39th edition (read November 9, 2026).

| Rule | Where | Applied to |
| --- | --- | --- |
| Completed after July 10, 2025 | 1.2 | Every section |
| Not screened, broadcast or online in the Netherlands before the festival | 1.2 | Every section |
| Final entry deadline July 9, 2026 (time not given; SLATE: end of day in Amsterdam) | 1.1 | Every section |
| World, international or European premiere | 2.4 | Every section (`europeanPremiere`) |
| Over 60 minutes | 2.4.1 | International Competition |
| Over 40 minutes | 2.4.1, 2.4.2 | Envision Competition, Luminous, Frontlight (shorts only by invitation) |
| Up to 40 minutes | 2.4.4 | Short Documentary Competition |

Not modeled: Dutch productions in the short competition must be world premieres (2.4.4); the private-screening exception
for premiere status.

## Hot Docs 2027

Source: [Submit A Film](https://hotdocs.ca/industry/submit-a-film), for the 2027 festival, April 23 to May 2 (read November
9, 2026): completed after January 1, 2026; not available online to Ontario audiences before the festival, broadcast versions
included (SLATE: no earlier online release); deadlines October 29, December 10, 2026 and January 4, 2027 (SLATE: the late
one). Not modeled: the Ontario premiere for features, mid-lengths and series and the Toronto premiere for shorts (SLATE
records releases by country), and English or English subtitles.

## Canadian Screen Awards: 2026 (verified) and 2027 (projected)

Sources (read November 9, 2026): [2026 Film Rules & Regulations](https://www.academy.ca/wp-content/uploads/2025/09/2026-Canadian-Screen-Awards-Film-Rules-Regulations.pdf)
and [2026 Television & Digital Media Rules & Regulations](https://www.academy.ca/wp-content/uploads/2025/09/2026-Canadian-Screen-Awards-Television-Digital-Media-Rules-Regulations.pdf).
The 2027 rules aren't published; 2027 carries 2026's a year on, labelled projected.

| Rule (2026) | Where | Applied to |
| --- | --- | --- |
| Film qualifying period January 1, 2025 to March 31, 2026 | Film II, VI | The 28 film categories |
| First commercial release in Canada: five Canadian screening dates in a commercial theatre (one in Montreal, Toronto or Vancouver), or an approved streaming service | Film V.C, VI.A | Film categories (SLATE: a Canadian theatrical or streaming release) |
| Television eligibility September 1, 2024 to November 15, 2025, made available in Canada | TV V | The 87 television categories, television's documentary programs included |
| Not entered at an earlier Canadian Screen Awards (or prix Gémeaux) | Film V.E | Every category |
| Final entry deadline November 3, 2025 (no late entries) | Film II, TV II | Every category; the 2026 edition is closed when a game starts |
| Features at least 60 minutes; feature documentaries over 45; short documentaries under 45; live-action and animated shorts at most 59 | Film XX (definitions) | The matching film categories |

Not modeled: the five-date run and the city; the Academy's list of approved streaming services; first public exposure
within 1.5 years of the period; minority co-productions only where Canadians are credited; the 2026 citizenship rule for
nominees in certified productions. The catalog's own requirement (a Canadian production) stays.

## Goya Awards, 41st (2027)

Source: [Bases de los 41 Premios Goya](https://www.premiosgoya.com/pdfs/bases-de-los-41-premios-goya/) (read November 9,
2026), sections 3.1 and 5.1: fiction and animated features at least 60 minutes, feature documentaries at least 70;
released commercially in Spanish cinemas, in the original version, January 1 to December 31, 2026; Spanish nationality
(the catalog's requirement); not in an earlier edition; not available online before the theatrical release, festivals
excepted; materials before 14:00 on September 9, 2026 for films released July to December (July 28 for January to June,
not separated in SLATE). Applied to the 23 feature categories. Best European Film, Best Ibero-American Film and the three
short film awards follow their own specific Bases (section 2), not read. Not modeled: seven consecutive days in one cinema
(three for documentaries); the ICAA rating before release.

**Version 2 (`goya-2027@2`, read November 9, 2026):** the specific Bases are in the same document. Best European Film and
Best Ibero-American Film (3.1-3.5): released in the country of origin from November 1, 2025 to December 31, 2026 (SLATE: a
theatrical release there), at least 60 minutes, not online before that release except at festivals, never in an earlier
edition, materials by 14:00 on September 10. Not modeled: selection by the country's academy or a national jury, one film
per country. The three short film awards: Spanish shorts of at most 59 minutes, a nationality certificate dated October 1,
2024 to September 30, 2026 (SLATE: the completion date), never in an earlier edition, materials by 14:00 on September 4,
and a festival route: a qualifying prize or selections at Annex V festivals (fiction 7, documentary 3, animation 1, or one
at a festival in bold). SLATE takes a selection at any of the 11 Annex V festivals in its catalog; the bold type doesn't
survive in the text read, so which festivals count alone is SLATE's reading.

Two bugs the reading found: the Goyas' European and Ibero-American categories (and the Césars' and the Japan Academy's
foreign films) took nothing at all, because the event's own countries were applied to categories for work from
elsewhere; and a festival premiere counted as a release outside cinemas, ruling films out of every rule that asks for
the theatrical run first.

## César, 2027 ceremony

Source: [Règlement 2026-2027](https://www.academie-cinema.org/wp-content/uploads/2026/10/reglement-aatc-2026-2027.pdf),
chapter II, Article 3 (read November 9, 2026). Features (3-A, and through 3-C every category that follows Best Film): a
first national commercial release in France January 1 to December 31, 2026, at least seven consecutive days in a Paris-region
commercial cinema (SLATE: a French theatrical release in 2026); French initiative is the catalog's requirement. Best
Foreign Film (3-B): the same release, for films that aren't French. Shorts (3-K): under an hour, registered January 15 to
July 15, 2026. Not modeled: the CNC approval and the exploitation visa (for shorts, July 1 to June 30); the Bureau's
exceptions; Best Score's original-music share; documentaries shown on television before the cinema release (3-L). The
César des Lycéens is chosen among the Best Film nominees and takes no entries; it stays on SLATE's rules.

## Film Independent Spirit Awards, 2027

Sources (read November 9, 2026): [Film rules](https://s3.us-east-1.amazonaws.com/SA_SubForm_etc/2027_SAsubmissions_RulesRegs_Film_082426.pdf)
(August 24, 2026) and [TV rules](https://s3.us-east-1.amazonaws.com/SA_SubForm_etc/2027_SAsubmissions_RulesRegs_TV_090126.pdf)
(September 1, 2026), "Rules for eligibility".

| Rule | Where | Applied to |
| --- | --- | --- |
| At least 70 minutes | Film 1 | The 14 film categories |
| Completed for under $30 million (a new SLATE rule, `maxBudget`, read from the project's estimate) | Film 2 | Film categories |
| In 2026: programmed at one of nine festivals (Hot Docs, New Directors/New Films, New York, Sundance, SXSW, Telluride, TIFF, Tribeca, Berlinale), or a week in a US cinema, or a fee-based streaming or on-demand release | Film 3 | Film categories. The festival route is a selection, not a win (a new SLATE route, `festivalSelection`); four of the festivals aren't in SLATE. |
| Once nominated, no later entry | Film 4 | SLATE refuses any earlier Spirit entry |
| Film final deadline September 29, 2026 | Dates | Film categories |
| New series with all or part of its first season airing October 1, 2025 to September 30, 2026; episodes at least 18 minutes, at least two available; international series only as US co-productions; TV final deadline September 15 | TV 1-3, 5, dates | The six TV categories |

The Robert Redford Environmental Vision Award takes films and series alike and stays on SLATE's rules.

## The Actor Awards, 33rd (2027)

Source: [33rd Annual Actor Awards Rules & Regulations](https://www.actorawards.org/sites/default/files/33rd%20Annual%20Actor%20Awards%20Presented%20by%20SAG-AFTRA%20Rules%20%26%20Regulations.pdf)
(read November 9, 2026). Films (A.1, A.3, A.5): scripted, over 60 minutes, a seven-day run beginning in 2026 in one of six
US markets, no nontheatrical release before it. Television (B.1, B.2): first aired or streamed in the United States in
2026; comedy and drama series of at least six episodes of 20 minutes or more. Submissions close at 5 p.m. PT on November 2,
2026 (General Timetable). Not modeled: the SAG-AFTRA contract, the six markets (SLATE: a US theatrical release), primetime
airing, the limited series' 150 minutes and the television movie's length, AI-generated performances.

## DGA Awards, 79th (2027)

Source: [Theatrical Feature Film guidelines](https://www.dga.org/Awards/Entry-Forms/Theatrical-Feature-Film/ApplicationRules)
(read November 9, 2026): more than 40 minutes; a paid-admission run of at least seven consecutive days in Los Angeles or New
York, January 1 to December 31, 2026; animated films and documentaries excluded; entry forms by 5:00 p.m. PT on November 13,
2026. Applied to Outstanding Directorial Achievement in Theatrical Feature Film only. The documentary and first-time feature
guideline pages returned HTTP 404 (guessed URLs).

**Version 2 (`dga-2027@2`, read November 9, 2026):** the [Entry Forms index](https://www.dga.org/Awards/Entry-Forms) links
each category's rules. Dramatic, Comedy, Limited & Anthology, Documentary Series / News and Reality / Quiz & Game: an
episode of a series (Reality: or a special), originally aired on television or streaming in 2026, by 5:00 p.m. PT on
November 13, 2026, to that episode's credited director. Movies for Television: not shown in US cinemas before television or
streaming (day and date is fine). Variety: programs and specials, nothing theatrical first. Not modeled: the "approximately
one half hour" (one hour for movies) broadcast format, local-only broadcasts, DGA membership and one entry per director. The
index lists no documentary film or first-time feature guidelines; those stay on SLATE's rules.

## Writers Guild Awards, 2027

Sources (read November 9, 2026): [Adapted and Original Screenplay](https://awards.wga.org/submissions/adapted-and-original-screenplay),
[Series](https://awards.wga.org/submissions/series), [TV-Streaming-Radio/Audio](https://awards.wga.org/submissions/tv-streaming-radio-audio-scripts).
Screenplays: a week in Los Angeles or New York cinemas, January 1 to December 31, 2026; first shown on television or straight
to DVD isn't eligible. Series (drama, comedy, limited, new): aired in 2026, however many episodes. TV (movie, animation,
episodic, children's, short form): first broadcast in 2026; comedy/variety talk and specials and documentary categories:
November 1, 2025 to October 31, 2026. Every category: 5:00 p.m. PST on November 20, 2026. Not modeled: a WGA (or affiliate)
collective bargaining agreement; the TV movie's bar on an earlier theatrical exhibition. The Documentary Screenplay and Paul
Selvin pages weren't read in version 1.

**Version 2 (`wga-2027@2`, read November 9, 2026):** [Documentary Screenplay](https://awards.wga.org/submissions/documentary-screenplay):
exhibited in 2026, more than 40 minutes, a week in Los Angeles or New York cinemas (SLATE: a US theatrical release), a
simultaneous stream allowed and a television premiere not, by 5:00 p.m. on November 20, 2026. Not modeled: the WGA
agreement and Notice of Tentative Writing Credits. The Paul Selvin Award stays on SLATE's rules.

## Gotham Awards, 2026

Source: [Criteria for the 2026 Gotham Awards](https://awards.thegotham.org/criteria/) (read November 9, 2026): over 70
minutes; a theatrical release January 1 to December 31, 2026, with a paid run of at least seven consecutive days in one of
six qualifying US metro areas (SLATE: a US theatrical release); submissions closed September 17, 2026. Applied to the ten
film categories; Breakthrough Series and the tributes stay on SLATE's rules. The key roles' citizenship or US base is the
catalog's own US/non-US requirement, read from the production base.

## Producers Guild Awards, 2027

Sources (read November 9, 2026): [Motion Pictures](https://www.producersguildawards.com/Content/documents/Rules_and_Procedures_Awards_Eligibility_Motion_Pictures.pdf)
(July 20, 2026) and [Animated Motion Pictures](https://www.producersguildawards.com/Content/documents/Rules_and_Procedures_Awards_Eligibility_Animated_Motion_Pictures.pdf),
section A: a US theatrical release for paid admission between January 1 and December 31, 2026; no nontheatrical exhibition
or distribution before it (as at the 99th Academy Awards); submitted by October 9, 2026; animated features over 40 minutes and
at least 75 percent animation. Applied to the Theatrical and Animated awards. The documentary rules' several qualifying
exhibitions and the television rules weren't applied in version 1.

**Version 2 (`pga-2027@2`, read November 9, 2026):** [Documentary Motion Pictures](https://www.producersguildawards.com/Content/documents/Rules_and_Procedures_Awards_Eligibility_Documentary_Motion_Pictures.pdf)
(July 20, 2026), A.2: an exhibition in 2026, more than 40 minutes, by a seven-day paid run in one of eleven US areas
(SLATE: a US theatrical release), a national television premiere at 70 minutes (SLATE: a US broadcast or streaming release,
without the 70-minute floor), an Official Selection or In Competition at a listed festival (SLATE: the eight it holds), or a
qualifying award on the Academy's list (SLATE: the 99th list it holds, where the PGA attached the 98th); submitted by August
28, 2026. The fee line reads "one hundred fifty dollars ($175.00)". The television awards' rules weren't found under the
same naming (404) and stay on SLATE's rules.

## AACTA Awards, 2027

Sources (read November 9, 2026): the [2027 Film entry page](https://www.aacta.org/aacta-awards/entries-2027/film/) (a
dramatised story of at least 60 minutes released publicly from January 1 to December 31, 2026; entries close 11:59 p.m.
AEST on Monday September 28, 2026) and the [Rule Book](https://s3-ap-southeast-2.amazonaws.com/aacta-org-assets/Uploads/2026-AACTA-Awards-Rule-Book2.pdf)
it links, whose file and cover say 2026, section 7.3: a seven-day run in two capital cities including Sydney or Melbourne,
a qualifying festival with four paid screenings, a qualifying streaming platform or free-to-air broadcast. SLATE takes an
Australian theatrical, streaming or broadcast release. Applied to the 16 film-only categories (`aacta-2027@1`). Not
modeled: the Indie Film budget under AUD 2 million (the catalog keeps its own independent requirement), the festival and
platform lists, AACTA's discretion. The [Television](https://www.aacta.org/aacta-awards/entries-2027/television/),
[Documentary](https://www.aacta.org/aacta-awards/entries-2027/documentary/) and [Short Film](https://www.aacta.org/aacta-awards/entries-2027/short-film/)
pages and the Rule Book's sections 4-6: television's first episode broadcast in Australia in 2026 on free-to-air or a
streaming platform, by September 28; documentaries of 60 minutes or more completed or first shown August 30, 2025 to August
24, 2026, by August 24; shorts under 40 minutes completed July 19, 2025 to July 18, 2026, by August 3. 31 categories in all.
Shared categories (hair and makeup, song, soundtrack, visual effects) and online series stay on SLATE's rules; the entry
pages answered after a 503 earlier the same day.

## Not Readable From Here

- **TIFF (Toronto):** tiff.net/submissions and TIFF's FilmFreeway page refused this environment (HTTP 403), on two
  passes. Search summaries mention premiere-status rules (world, international or North American; Canadian at TIFF's
  discretion) and May 8, 2026 as the standard deadline, but these were not read from TIFF's own terms and are **not
  used**: `tiff-2026` stays simulated. A third pass on November 9, 2026 (tiff.net/submit and filmfreeway.com/tiff) was
  refused the same way; the next try is an official archived copy of TIFF's terms or a TIFF press release with them.
- **SXSW 2027:** the premiere and eligibility policies on support.sxsw.com (features, shorts, TV) refused this environment
  (HTTP 403) on November 9, 2026; SXSW's eligibility stays on SLATE's rules. The submissions page itself answered later
  that day: `sxsw-2027@1` applies its final deadline (October 1, 2026, 11:59 p.m. PT) and the catalog takes its
  final-deadline fees (features $125; shorts, music videos and TV $90). A book whose only rule is a deadline counts as
  SLATE's rules for eligibility (`categoryRuleStatus`).
- **European Film Awards:** the [fiction regulations](https://www.europeanfilmawards.eu/regulations/feature-films/) were read
  on November 9, 2026 but name no dates or deadline, and the page mixes 2026 and 2027 headings. Their tests (16 of 21
  European-elements points; a major-festival selection or a seven-day release in three countries) aren't anything SLATE
  records yet, so the categories stay on SLATE's rules rather than take a partial rule.
- **Series Mania and the International Emmys:** no current competition rules were found (Series Mania's latest festival
  rules found are 2021's; the International Emmys' rules page returned HTTP 404).
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
