# Source-Material Coverage

Written by `V3_WRITE=1 npx vitest run tests/sources.test.ts` from `src/data/sources.json`. Nothing here is typed by hand.

The catalog holds **576 distinct works**, read from Wikidata (CC0) on 2026-11-12 by `tools/sources/import.mjs`. Each is a work, not an edition or a translation of one, a franchise or a series of separate books. They were chosen by how many language editions of Wikipedia have an article on them, most first, within each medium: a measure of being widely written about, and not a judgement of worth. It leans towards older, European and Japanese works for that reason, and says so here rather than claiming balance.

## By Medium

| Medium | Works | With a creator recorded | With a year recorded | Recorded as public domain somewhere | Recorded as copyrighted | No copyright status recorded | With one of the game's genres |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Novel | 190 | 184 | 188 | 95 | 29 | 66 | 153 |
| Short Story | 60 | 57 | 53 | 46 | 0 | 14 | 44 |
| Play | 60 | 60 | 59 | 39 | 0 | 21 | 45 |
| Poem Or Epic | 25 | 20 | 16 | 16 | 0 | 9 | 6 |
| Comic, Graphic Novel Or Manga | 70 | 68 | 17 | 0 | 3 | 67 | 58 |
| Video Game | 71 | 57 | 71 | 0 | 24 | 47 | 15 |
| Online Fiction, Webcomic Or Webtoon | 70 | 47 | 32 | 0 | 3 | 67 | 30 |
| Light Novel | 30 | 29 | 20 | 0 | 0 | 30 | 24 |
| **All** | 576 | 522 | 456 | 196 | 59 | 321 | 375 |

A copyright status is one Wikidata states, with the place it applies to. The game works none out. "Recorded as public domain somewhere" is not a statement that a work is free to use where you are.

## By The Game's Genres

A work has one of the game's genres only where the reviewed table (`tools/sources/genre-map.mjs`, 86 entries) says a genre Wikidata records is that genre. 45 of the game's 149 genres have at least one work; 104 have none, and no work was pushed into one to change that.

| Genre | Works | Of those, recorded as public domain somewhere |
| --- | --- | --- |
| Fantasy | 77 | 8 |
| Adventure | 59 | 18 |
| Science Fiction | 50 | 10 |
| Romance | 35 | 13 |
| Comedy | 34 | 14 |
| Crime | 34 | 23 |
| Action | 32 | 0 |
| Detective | 32 | 23 |
| Horror | 29 | 12 |
| Coming Of Age | 28 | 13 |
| Historical Fiction | 24 | 16 |
| Tragedy | 24 | 13 |
| Dark Fantasy | 16 | 0 |
| Drama | 16 | 0 |
| Mystery | 16 | 4 |
| Dystopian | 15 | 3 |
| Thriller | 15 | 0 |
| Romantic Comedy | 13 | 1 |
| Satire | 13 | 6 |
| Epic | 11 | 8 |
| Slice Of Life | 11 | 0 |
| Supernatural | 11 | 0 |
| Children's | 10 | 4 |
| Fairy Tale | 10 | 6 |
| Vampire | 9 | 1 |
| Isekai | 8 | 0 |
| Post-Apocalyptic | 7 | 0 |
| War | 7 | 3 |
| Tragicomedy | 6 | 5 |
| Science Fantasy | 5 | 0 |
| Sea Adventure | 5 | 5 |
| Time Travel | 5 | 1 |
| Black Comedy | 4 | 1 |
| Cyberpunk | 4 | 0 |
| Magical Realism | 4 | 0 |
| Military | 4 | 1 |
| Sports | 4 | 0 |
| Absurdist | 3 | 1 |
| Historical Drama | 3 | 1 |
| Picaresque | 3 | 2 |
| Techno-Thriller | 3 | 0 |
| Alternate History | 2 | 1 |
| Apocalyptic | 2 | 1 |
| Martial Arts | 2 | 0 |
| Parody | 2 | 1 |

**Genres with no work:** Action Comedy, Animated, Anime, Anthology, Art House, Avant-Garde, Backstage Musical, Biker, Biographical, Blaxploitation, Body Horror, Buddy Comedy, Buddy Cop, Caper, Chanbara, Chase, Christmas, Concert Film, Conspiracy Thriller, Cosmic Horror, Costume Drama, Courtroom Drama, Creature Feature, Dance, Disaster, Docudrama, Docufiction, Documentary, Domestic Drama, Eco-Horror, Erotic Thriller, Espionage, Experimental, Exploitation, Family, Farce, Film Noir, Folk Horror, Found Footage, Gangster, Giallo, Gothic Horror, Grindhouse, Hangout, Heist, Holiday, Hood Film, Horror Comedy, Jidaigeki, Jukebox Musical, Kaiju, Kitchen Sink Drama, Legal Drama, Medical Drama, Melodrama, Mockumentary, Monster Movie, Mumblecore, Musical, Nature Documentary, Neo-Noir, Neorealism, New Wave, Nordic Noir, Occult, Period Drama, Police Procedural, Political Drama, Political Thriller, Prison Film, Psychological Horror, Psychological Thriller, Queer Cinema, Revenge, Road Movie, Rockumentary, Romantic Drama, Samurai, Screwball Comedy, Silent Film, Slapstick, Slasher, Social Realism, Space Opera, Spaghetti Western, Splatter, Spy, Steampunk, Stoner Comedy, Superhero, Surrealist, Survival, Swashbuckler, Sword And Sandal, Sword And Sorcery, Teen, Tokusatsu, True Crime, Werewolf, Western, Whodunit, Wuxia, Yakuza, Zombie.

## Recorded Genres Left Unmapped

245 genres Wikidata records on these works are not one of the game's and map to nothing: how a game is played, a readership, or a mode with no one genre here. The most used: action-adventure game (21), philosophical fiction (21), young adult fiction (19), first-person shooter (17), comedy drama anime and manga (14), Gothic fiction (11), school anime and manga (10), psychological fiction (10), serialized fiction (9), political fiction (8), video game with LGBT character (8), harem (8), third-person shooter (7), role-playing video game (7), philosophical novel (7), fable (7), real-time strategy (6), massively multiplayer online game (6), social fiction (6), ecchi (6), metafiction (5), life simulation game (5), developmental novel (5), autobiography (4), family saga (4).

## What Is Not Here

- A synopsis: Wikidata has none and none is written. A work's one-line description is Wikidata's.
- Rights beyond the recorded statements: no territory-by-territory status, no chain of title, no adaptation rights. Nothing in the game grants a right to a real work.
- Fan fiction, and web serials Wikidata does not class as web fiction, webcomics or webtoons: "online" here is those three classes.
- Fictional works invented for the game: none yet; they would be counted separately.
