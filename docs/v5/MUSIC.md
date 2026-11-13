# Real Music And Music Specific To The Project

This note covers the owner's v5 brief, sections 3 and 4. It was built on November 13, 2026.

## The Real Catalog (Section 3)

- **Provider.** Wikidata. Its structured data is CC0 (https://www.wikidata.org/wiki/Wikidata:Licensing), so the
  catalog is committed: `src/data/music.json`, built by `tools/music/catalog.mjs`.
- **The query service's terms.** The terms are at https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual.
  The service asks for three things, and the builder does all three:
  - an identifying User-Agent: the builder sends a generic client name, with no personal contact;
  - no more than 60 seconds of query time a minute: queries go one at a time, a second apart;
  - a stop on 429: it backs off and retries.

  Answers are cached locally, in `.sources-cache/music/`, which is not committed.
- **MusicBrainz.** It was not reachable from the build environment, and it wasn't needed: Wikidata records each
  artist's, recording's and work's MusicBrainz ID, and the catalog keeps those as links.
- **What is kept.** Each record carries its QID.
  - People and groups:
    - names and dates;
    - their country;
    - their occupations as Wikidata names them, and the game's distinct music roles each is evidence for: composer,
      songwriter, lyricist, recording artist, performer, music producer, conductor, arranger and music director;
    - their MusicBrainz ID and TMDB person ID;
    - for composers, the films they are credited with scoring: a count, the first and last years, and the most
      written-about titles.
  - Recordings: performers, release date, a duration where one is recorded, composers, lyricists, producers, what a
    version is a version of, and MusicBrainz IDs.
- **Size.** 896 people and groups, 1,740 recordings, 497 composers with recorded scores, and 760 people with a TMDB ID.
- **What is not kept.** No audio, no lyrics, no fee, no rate and no availability. Wikidata's own errors are kept as
  recorded. One recording credits a magazine as a composer, for example. Every record links to its source so it can be
  checked.

## In A Save

- **A recording** can be licensed into a project. It becomes a licensed song carrying its performers, writers as
  recorded, release date and length. Where Wikidata names no writer, the song says so. Its licence is asked of its
  rights holders on the Music page. The holders' answers and prices are the game's invention, labelled there.
- **A composer** with recorded scores and a TMDB ID can be considered for the composer's job.
  - They join the save's real people under the TMDB identity the film catalog uses (`engine/guests.ts`), so one person
    has one profile and one diary.
  - A film catalog record of the same person stands: the music catalog's copy never replaces it.
  - Their level for the job comes from their recorded scores (the game's calibration).
  - Their capability, asking rate and other work are made up, as for everyone, and labelled.
  - Someone recorded as having died is not approached.
- Nobody is contacted and nothing is bought.

## Music Specific To The Project (Section 4)

The brief and cue plan come from the project (`engine/cues.ts`), not its genre.

- **What sets the brief:**
  - the player's own tone and intended experience, quoted back;
  - the period;
  - how much the scenes talk and how fast they cut;
  - how much is action;
  - the size of the cast;
  - the budget;
  - the songs.
- **When nothing points one way,** the style is left to the composer.
- **Silence** is proposed when the intent asks for it, and stays a choice.
- **Cues** follow what their scenes do: action is tension, and night isn't.
- **Intensity** climbs with the story and stays down under dialogue.
- **Motifs** follow the characters a scene is about.
- **The rest of the loop** was built in v4 and still applies: shortlist, availability, request, terms, budget,
  sketches (themes) and notes, recording sessions, cue placement, mix and stems, clearance, delivery, credits, and the
  relationship that follows.
