# The v6 And v7 Datasets: Access And Terms

Every dataset the owner's v6 and v7 packages brought into the game, with what kind of thing it is, the terms it is held
under, and each source it cites with the day it was read. Written November 14, 2026 (V6-045). `tests/v6-datasets.test.ts`
fails a dataset file not listed here, a listed file that is gone, and a source a file cites that isn't listed under it.

The catalog (TMDB), the cinemas (Wikidata) and the stories (Wikipedia) are older and have their own ledgers:
`docs/DEPLOYMENT.md` ("What TMDB's Terms Allow"), `docs/DATA-PACKS.md` and `docs/DATA-PROVENANCE.md`.

## `src/data/history/awards-2026.json`

- **What it is:** Award results of 2026 ceremonies, from each organizer's own page.
- **Kind:** Recorded fact.
- **Terms:** Facts (who was nominated, who won) read from public pages; titles and names only, no article text. Shown from their published date; nothing written into a save.
- **Sources (37):**
  - <https://goldenglobes.com/articles/one-battle-after-another-and-hamnet-take-best-picture-prizes-at-golden-globes/>, read 2026-11-13. Read through a fetching tool. Only the categories the article states are recorded.
  - <https://goldenglobes.com/nominations/2026>, read 2026-11-19. Every category, its winner marked; read twice through a fetching tool, the readings agreed. A title the page files under its article ("Studio, The") is written in reading order.
  - <https://goldenglobes.com/articles/nominations-announced-for-the-83rd-annual-golden-globes/>, read 2026-11-19. For the date the nominations were announced, December 8, 2025.
  - <https://press.oscars.org/news/98th-oscarsr-nominations-announced>, read 2026-11-13.
  - <https://www.oscars.org/oscars/ceremonies/2026>, read 2026-11-13, and again on 2026-11-19 for every category (two readings that agreed). Read through a fetching tool; a direct download was refused (HTTP 403). Titles and names as the page prints them.
  - <https://www.televisionacademy.com/awards/nominees-winners/2026>, read 2026-11-19. Its 120 category pages, downloaded and parsed from the nominees and winners each lists in its structured data (schema.org ItemList), not summarised.
  - <https://www.televisionacademy.com/features/news/awards-news/260708-nominations>, read 2026-11-19. For the date the nominations were announced, July 8, 2026.
  - <https://www.televisionacademy.com/files/assets/press/260905-emmys-night-1-winners-v1.pdf>, read 2026-11-19. The first Creative Arts night's winners (49 categories), its text read directly; every winner a category page names is in its night's release.
  - <https://www.televisionacademy.com/files/assets/press/260906-emmys-night-2-winners-v1.pdf>, read 2026-11-19. The second night's (52 categories), the same way.
  - <https://www.sagawards.org/awards/nominees-and-recipients/32nd-annual-actor-awards>, read 2026-11-19. The 32nd Actor Awards' nominees and recipients, downloaded and parsed; the page sets names in capitals by its styling, so each is written as the game's other records write it, else in title case.
  - <https://actorawards.org/sites/default/files/2026_Actor%20Awards_Nominations%20Release.pdf>, read 2026-11-19. For the date the nominations were announced, January 7, 2026.
  - <https://www.actorawards.org/media/news/releases/actor-awards-presented-sag-aftra-announce-years-stunt-ensemble-nominees>, read 2026-11-19. For the stunt ensembles' announcement, February 26, 2026.
  - <https://www.actorawards.org/media/news/releases/outstanding-film-and-television-performances-honored-32nd-annual-actor-awards>, read 2026-11-19. The recipients of March 1, 2026; every recipient the category page marks is named here.
  - <https://www.dga.org/News/PressReleases/2026/260107_78thAnnualDGAAwardsTelevisionNomineesAnnounced>, read 2026-11-19. The DGA's television and documentary nominees (January 7, 2026), downloaded and parsed; Commercials, laid out differently and not held by the game, left out.
  - <https://www.dga.org/News/PressReleases/2026/260108_78thAnnualDGAAwardsFeatureFilmNomineesAnnounced>, read 2026-11-19. The feature nominees (January 8, 2026).
  - <https://www.dga.org/News/PressReleases/2026/260207_78th_Annual-DGA-Award-Winners>, read 2026-11-19. The winners (February 7, 2026); its Comedy Series section is worded as nominees, so that winner isn't recorded.
  - <https://awards.wga.org/awards/nominees-winners>, read 2026-11-19. The 2026 Writers Guild Awards' nominees and winners, downloaded and parsed: the 15 categories the game holds and the page lays out alike.
  - <https://www.wga.org/news-events/news/press/2026/2026-writers-guild-awards-screenplay-television-streaming-news-radio-audio-and-promotional-writing-nominations-announced>, read 2026-11-19. For the date the nominations were announced, January 27, 2026.
  - <https://www.wga.org/news-events/news/press/2026-writers-guild-awards-winners-announced>, read 2026-11-19. The winners (March 8, 2026); every winner the awards page marks is named in it.
  - <https://producersguild.org/2026-pga-awards-winners/>, read 2026-11-19. The 37th PGA Awards' nominees and winners, downloaded and parsed; the producers' p.g.a. marks left off.
  - <https://producersguild.org/2026-pga-awards-motion-pictures-and-television-categories-nominees/>, read 2026-11-19. For the nominations of January 9, 2026 and the ceremony of February 28.
  - <https://producersguild.org/2026-pga-awards-documentary-motion-pictures-nominees-pga-innovation-award-finalists/>, read 2026-11-19. For the documentary nominations of December 9, 2025.
  - <https://www.filmindependent.org/blog/here-are-your-2026-film-independent-spirit-awards-nominees/>, read 2026-11-19. The 41st Spirit Awards' nominees (December 3, 2025), downloaded and parsed; credit lines left off.
  - <https://s3.us-east-1.amazonaws.com/SA_SubForm_etc/2026_SpiritAwards_AllNominees%2BWinners_032726.pdf>, read 2026-11-19. Film Independent's "41 Years of Nominees and Winners", linked from its Spirit Awards history page; the 2026 pages' winners, each the first asterisked entry under its heading, matched to a nominee of that category.
  - <https://www.academie-cinema.org/palmares/>, read 2026-11-19. The 51st César Awards' nominees and winners, read from the structured data the page carries; the honorary César, with no field, left out.
  - <https://www.academie-cinema.org/evenements/autour-des-nominations-2026/>, read 2026-11-19. For the nominations of January 28, 2026.
  - <https://www.academie-cinema.org/evenements/ceremonie-des-cesar-2026/>, read 2026-11-19. For the ceremony of February 26, 2026.
  - <https://www.premiosgoya.com/40-edicion/nominaciones/>, read 2026-11-19. The 40th Goya Awards' nominees (announced January 13, 2026), downloaded and parsed; producers', countries' and directors' lines left off.
  - <https://www.premiosgoya.com/40-edicion/premios/por-categoria/>, read 2026-11-19. The winners of the February 28, 2026 gala, each matched to a nominee of its category.
  - <https://www.aacta.org/aacta-awards/awards-history/2026-aacta-awards/>, read 2026-11-19. The 2026 AACTA Awards' film, television, documentary and short-film nominees with their winners marked, from the page and the sections it loads; the nominations release gives no date, so the nominees are shown from February 4, 2026, the first ceremony.
  - <https://www.aacta.org/our-news/media-room/aacta-announces-the-winners-for-the-2026-aacta-awards-industry-gala/>, read 2026-11-19. The Industry Gala's winners (February 4, 2026).
  - <https://www.aacta.org/our-news/media-room/aacta-announces-the-winners-for-the-2026-aacta-awards-presented-by-foxtel-group/>, read 2026-11-19. The Awards Ceremony's winners (February 6, 2026); a category both releases name is dated by the gala's.
  - <https://www.japan-academy-prize.jp/prizes/list/49>, read 2026-11-19. The 49th Japan Academy Film Prize's Excellent Awards and Bests (March 13, 2026), from the romanised and English lines the page gives each entry; names keep the page's order with its capitals lowered, and a title it cuts short takes the whole one the other records hold. Its Excellent Awards' announcement states no date, so they are shown from the ceremony.
  - <https://www.academy.ca/nominees/>, read 2026-11-19. The 2026 Canadian Screen Awards' nominees with their winners marked, downloaded and parsed; the winners of the four shows (May 28 to 31) are all shown from May 31, the date of the winners release.
  - <https://www.academy.ca/2026/nominees-announced-for-the-2026-canadian-screen-awards/>, read 2026-11-19. For the nominations of March 25, 2026.
  - <https://www.academy.ca/2026/2026-canadian-screen-award-winners-unveiled/>, read 2026-11-19. The winners release of May 31, 2026.
  - <https://www.televisionacademy.com/78th-emmy-winners>, read 2026-11-19. The Academy's winners release (Ernst & Young's list of the telecast's 19 categories), a PDF whose text was read directly.
  - <https://www.sundance.org/blogs/2026-sundance-film-festival-unveils-97-projects-selected-for-the-feature-film-and-episodic-program/>, read 2026-11-20. Every section's selection (December 10, 2025), and the Alfred P. Sloan Feature Film Prize announced with it.
  - <https://www.sundance.org/blogs/2026-sundance-film-festival-reveals-54-titles-selected-for-short-film-program-presented-by-ketel-one-vodka/>, read 2026-11-20. The 54 short films in their four groups (December 15, 2025); the Park City Legacy shorts, earlier editions' films, are left out.
  - <https://www.sundance.org/blogs/2026-sundance-film-festival-reveals-short-film-program-award-winners/>, read 2026-11-20. The short film awards, given the evening of January 27, 2026.
  - <https://www.sundance.org/blogs/the-complete-list-of-2026-sundance-film-festival-award-winners/>, read 2026-11-20. Every jury and audience award of the January 30, 2026 ceremony, and the producers awards it lists as announced before.
  - <https://www.lecourt-clermont.org/programmation-2026/>, read 2026-11-20. The 28 competition programmes (I 1 to I 12, F 1 to F 11, L 1 to L 5): every film of the international, national and lab competitions.
  - <https://www.lecourt-clermont.org/programmation-2026/palmares-2026/>, read 2026-11-20. Every prize of the 38th international, 48th national, 25th lab and XR competitions, and the out-of-competition one, given at the close on February 7, 2026.
  - <https://www.berlinale.de/en/2026/news-press-releases/271932.html>, read 2026-11-20. The 22 films of the Competition (January 20, 2026).
  - <https://www.berlinale.de/en/2026/news-press-releases/273288.html>, read 2026-11-20. The 14 first features of Perspectives, the last of them announced on January 29, 2026 (13 on January 20).
  - <https://www.berlinale.de/en/2026/news-press-releases/271610.html>, read 2026-11-20. The 37 films of Panorama (January 14, 2026).
  - <https://www.berlinale.de/en/2026/news-press-releases/271764.html>, read 2026-11-20. The Forum's 32 films and its Forum Special (announced January 12), 45 in all (January 15, 2026).
  - <https://www.berlinale.de/en/2026/news-press-releases/271763.html>, read 2026-11-20. The 32 works of Forum Expanded (January 15, 2026).
  - <https://www.berlinale.de/en/2026/news-press-releases/271596.html>, read 2026-11-20. Generation's 18 features and 23 shorts (January 14, 2026).
  - <https://www.berlinale.de/en/2026/news-press-releases/271389.html>, read 2026-11-20. The 21 films of Berlinale Shorts (January 12, 2026).
  - <https://www.berlinale.de/en/archive/programme/programme-archive.html>, read 2026-11-20. The 21 works of Berlinale Special, whose release of January 14, 2026 counted 19 "so far"; shown from the opening, February 12, when the whole section was certainly public.
  - <https://www.berlinale.de/en/archive/awards-juries/awards.html>, read 2026-11-20. The prizes of the official juries of February 21, 2026, with the honorary awards; the release of that evening (277999) and its PDF list them too.
  - <https://www.berlinale.de/en/2026/news-press-releases/277867.html>, read 2026-11-20. The 14plus prizes of the Youth Jury and the Generation International Jury (February 20, 2026).
  - <https://www.berlinale.de/en/2026/news-press-releases/277918.html>, read 2026-11-20. The two Panorama Audience Awards (February 21, 2026).
  - <https://www.berlinale.de/en/2026/news-press-releases/269378.html>, read 2026-11-20. The Honorary Golden Bear (November 14, 2025).
  - <https://www.berlinale.de/en/2026/news-press-releases/271392.html>, read 2026-11-20. A Berlinale Camera (January 12, 2026).
  - <https://www.berlinale.de/en/2026/news-press-releases/277191.html>, read 2026-11-20. A Berlinale Camera (February 16, 2026).

## `src/data/history/awards-2026-reference.json`

- **What it is:** The v7 package's award reference records, grouped by category.
- **Kind:** Recorded fact.
- **Terms:** As the package retrieved them from organizers' primary pages; facts only. A result naming only the work names no recipient.
- **Sources (11):**
  - <https://press.oscars.org/news/98th-oscarsr-nominations-announced>, read 2026-11-13.
  - <https://sxsw.com/wp-content/uploads/2026/03/2026-FTV-Jury-Special-Awards.pdf>, read 2026-11-13.
  - <https://www.bafta.org/media-centre/press-releases/winners-announced-2026-film-awards/>, read 2026-11-13.
  - <https://www.festival-cannes.com/en/press/press-releases/the-79th-festival-de-cannes-winners-list/>, read 2026-11-13.
  - <https://www.labiennale.org/en/news/official-awards-83rd-venice-international-film-festival>, read 2026-11-13.
  - <https://www.oscars.org/oscars/ceremonies/2026>, read 2026-11-13.
  - <https://www.sundance.org/blogs/2026-sundance-film-festival-announces-award-winners>, read 2026-11-13.
  - <https://www.televisionacademy.com/awards/nominees-winners/2026/outstanding-comedy-series>, read 2026-11-13.
  - <https://www.televisionacademy.com/awards/nominees-winners/2026/outstanding-drama-series>, read 2026-11-13.
  - <https://www.televisionacademy.com/awards/nominees-winners/2026/outstanding-limited-or-anthology-series>, read 2026-11-13.
  - <https://www.televisionacademy.com/files/assets/Downloads/2026-rules-procedures-v1.pdf>, read 2026-11-13.

## `src/data/history/audience-2026-reference.json`

- **What it is:** Netflix's weekly chart for November 2-8, 2026.
- **Kind:** Recorded fact, inferred window.
- **Terms:** A public chart's figures, kept at their displayed precision. Its week is inferred, so it is hidden unless a playback opts in.
- **Sources (1):**
  - <https://www.netflix.com/tudum/top10>, read 2026-11-13.

## `src/data/platform-routes.json`

- **What it is:** Real services' release routes as their help pages describe them.
- **Kind:** Observed policy.
- **Terms:** Policy as read, not a contract, price or promise of income. Labelled with the day it was read.
- **Sources (5):**
  - <https://help.netflix.com/en/node/100386>, read 2026-11-13.
  - <https://help.vimeo.com/hc/en-us/articles/12427367616913-How-to-start-selling-with-Vimeo-On-Demand>, read 2026-11-13.
  - <https://itunespartner.apple.com/tv-movies/support/5407-encoding-houses-aggregators>, read 2026-11-13.
  - <https://support.google.com/youtube/answer/72851?product=sales>, read 2026-11-13.
  - <https://videocentral.amazon.com/support/delivery-experience/licensing-rights-and-avails/self-publishing-contracts>, read 2026-11-13.

## `src/data/eligibility-extracts.json`

- **What it is:** Six incomplete eligibility rule extracts from organizers' documents.
- **Kind:** Partial rules.
- **Terms:** Parts of rules, read from the organizers' own documents; never complete, so a check never says an entry qualifies.
- **Sources (6):**
  - <https://cdn.festival-cannes.com/media/uploads/2025/11/reglement_courts-metrages_2026-en.pdf>, read 2026-11-13.
  - <https://press.oscars.org/news/317-feature-films-contention-98th-academy-awardsr>, read 2026-11-13.
  - <https://www.festival-cannes.com/en/take-part/submit-a-film/feature-films-in-official-selection/>, read 2026-11-13.
  - <https://www.iemmys.tv/wp-content/uploads/2026/01/2026-Entry-Materials-Checklist.pdf>, read 2026-11-13.
  - <https://www.oscars.org/sites/oscars/files/2025-04/98th_aa_complete_rules.pdf>, read 2026-11-13.
  - <https://www.televisionacademy.com/files/assets/Downloads/2026-rules-procedures-v1.pdf>, read 2026-11-13.

## `src/data/source-corrections.json`

- **What it is:** Corrections to a work's source facts (Elantris).
- **Kind:** Publisher fact.
- **Terms:** Character roles as the publisher and author describe them; the logline is SLATE's own words.
- **Sources (2):**
  - <https://us.macmillan.com/books/9780765350374/elantris/>, read 2026-11-13.
  - <https://www.brandonsanderson.com/pages/standalones-cosmere>, read 2026-11-13.

## `src/data/camera-reference.json`

- **What it is:** Camera recording modes.
- **Kind:** Manufacturer fact.
- **Terms:** Modes as the manufacturer lists them; no price is recorded, and a missing price is not free.
- **Sources (3):**
  - <https://sony.mediaroom.com/2021-02-23-Sony-Electronics-Launches-FX3-Full-Frame-Camera-for-Cinematic-Look-and-Enhanced-Operability-for-Creators>, read 2026-11-13.
  - <https://www.arri.com/en/cine-systems/cine-cameras/legacy-cine-cameras/alexa-35>, read 2026-11-13.
  - <https://www.blackmagicdesign.com/products/blackmagicpocketcinemacamera/techspecs>, read 2026-11-13.

## `src/data/composer-credits.json`

- **What it is:** Composers of BAFTA's 2026 score nominees.
- **Kind:** Recorded fact.
- **Terms:** Identity only: no fee, availability, rights or permission to use a recording.
- **Sources (1):**
  - <https://www.bafta.org/awards/film/?award-year=2026>, read 2026-11-13.

## `src/data/reputation-design.json`

- **What it is:** The standing model's weights and grades.
- **Kind:** Simulation design.
- **Terms:** SLATE's own design, not an industry formula or any real measure. No source.
- **Sources:** none; it is SLATE's own design.
