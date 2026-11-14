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
- **Sources (3):**
  - <https://goldenglobes.com/articles/one-battle-after-another-and-hamnet-take-best-picture-prizes-at-golden-globes/>, read 2026-11-13. Read through a fetching tool. Only the categories the article states are recorded.
  - <https://press.oscars.org/news/98th-oscarsr-nominations-announced>, read 2026-11-13.
  - <https://www.oscars.org/oscars/ceremonies/2026>, read 2026-11-13. Read through a fetching tool; a direct download was refused (HTTP 403). Titles and names as the page prints them.

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
