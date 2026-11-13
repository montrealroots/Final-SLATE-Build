# Genres For Adapted Works: The Sweep

On November 13, 2026, the owner saw Grand Theft Auto III proposed as an adventure and asked for a sweep of the adapted
works' genres. This is the sweep.

## What Was Wrong

A work's genres come from its Wikidata record, through the reviewed table in `tools/sources/genre-map.mjs`. For a
video game, the record names how the game is played. Grand Theft Auto III's only recorded genre is "action-adventure
game", and none of that maps to a story genre. 220 of the 643 works had no genre that mapped. Each was given one by its
medium alone, so every video game was an adventure and almost everything else was a drama.

## What Changed

`src/engine/story-genre.ts` reads a work's summary and story for the words that mark a genre, for example:

- cartel, mafia and gang for gangster;
- outlaw, ranch and frontier for western;
- wizard, dragon and spell for fantasy.

The rules for a reading:

- A genre counts once it has three uses and at least two different words.
- The work's own title is taken out first, so "Theft" in Grand Theft Auto doesn't count.
- A world (a western, science fiction, fantasy, the post-apocalyptic, cyberpunk) leads what happens in it.
- A second or third genre needs five uses. Until a later fix the same day, Red Dead Redemption 2's one passage of war in
  Guarma made it a war story too.
- Common background (family, love, death, crime) leads only when nothing more particular is marked.
- Kings and kingdoms aren't read. They read the Mushroom Kingdom as history.

A reading is proposed, never sourced. The brief says what it read: Grand Theft Auto III shows "Gangster, Crime", and why:
"its story, which speaks of gangster (cartel, mafia, gang); crime (convict, drug, crime)". The player can change it like
any other field. Recorded genres that map still lead, as before.

## The Result

| | Works |
|---|---|
| A recorded genre maps (unchanged) | 423 |
| Read from the story | 94 |
| Read from the record: its recorded genres, its description, its article's opening, its subjects | 66 |
| Still proposed from the medium | 60 |

The record reading was added later the same day, after the owner asked for the remaining brief issues to be fixed
(`recordGenres` in `src/engine/story-genre.ts`). It reads what Wikidata and the article's opening say the work is:

- "theatre of the absurd" (Waiting for Godot) is absurdist;
- "fable" (Aesop) is a fairy tale;
- "an American zombie apocalypse comic book series" (The Walking Dead) is zombie;
- "life simulation game" (The Sims) is slice of life;
- "first-person shooter" is action.

Each brief quotes the words it was read from.

The 60 works still proposed from their medium have nothing recorded that names a genre. Most are:

- prayers, hymns and national anthems;
- gag webcomics with no stated genre;
- recent short works with no summary;
- games with no story, such as Candy Crush Saga.

Their brief says the genre came from the medium.

Some readings are arguable, and each shows what it was read from:

- Undertale reads as horror (from its monsters);
- Far Cry 5 reads as war;
- Killing Stalking reads as romance (it is recorded as "boys' love").

## Every Work Not Given A Genre By Its Record

| Work | Medium | Proposed Genres | From |
|---|---|---|---|
| Captain Tsubasa | comic | sports, domestic-drama | Its story |
| Kuroko's Basketball | comic | sports | Its story |
| Maus | comic | war, domestic-drama | Its story |
| The Crab with the Golden Claws | comic | gangster, crime | Its story |
| Shakugan no Shana | light novel | fantasy | Its story |
| A Thousand Splendid Suns | novel | coming-of-age, domestic-drama, romance | Its story |
| Anna Karenina | novel | domestic-drama, romance | Its story |
| Demons | novel | domestic-drama, romance | Its story |
| East of Eden | novel | war, domestic-drama | Its story |
| Eugene Onegin | novel | romance | Its story |
| Fathers and Sons | novel | domestic-drama, romance | Its story |
| Infinity Blade: Redemption | novel | war, domestic-drama | Its story |
| Lady Chatterley's Lover | novel | romance | Its story |
| Madame Bovary | novel | domestic-drama, tragedy | Its story |
| Mrs Dalloway | novel | domestic-drama | Its story |
| On the Road | novel | domestic-drama | Its story |
| One Hundred Years of Solitude | novel | war, domestic-drama, tragedy | Its story |
| Poor Folk | novel | domestic-drama | Its story |
| Resurrection | novel | crime, romance | Its story |
| Siddhartha | novel | romance | Its story |
| Sophie's World | novel | domestic-drama | Its story |
| The Brothers Karamazov | novel | domestic-drama | Its story |
| The Fountainhead | novel | domestic-drama | Its story |
| The Gambler | novel | romance | Its story |
| The Idiot | novel | domestic-drama, romance | Its story |
| The Kite Runner | novel | domestic-drama, romance | Its story |
| The Master and Margarita | novel | fantasy | Its story |
| The Picture of Dorian Gray | novel | romance | Its story |
| The Plague | novel | tragedy | Its story |
| The Sound and the Fury | novel | domestic-drama | Its story |
| The Sun Also Rises | novel | romance | Its story |
| The Tenant of Wildfell Hall | novel | domestic-drama | Its story |
| The Unbearable Lightness of Being | novel | domestic-drama, romance | Its story |
| To the Lighthouse | novel | domestic-drama | Its story |
| Uncle Tom's Cabin | novel | domestic-drama, tragedy | Its story |
| Wind and Truth | novel | war | Its story |
| Cherry Magic! Thirty Years of Virginity Can Make You a Wizard?! | online | romance | Its story |
| Concerned | online | zombie | Its story |
| Fox Spirit Matchmaker | online | romance | Its story |
| Heartstopper | online | coming-of-age, romance | Its story |
| Nimona | online | fantasy | Its story |
| Questionable Content | online | science-fiction | Its story |
| The God of High School | online | sports | Its story |
| Zahra’s Paradise | online | crime | Its story |
| A Doll's House | play | domestic-drama, romance | Its story |
| A Streetcar Named Desire | play | domestic-drama, romance | Its story |
| Abhigyanashakuntalam | play | domestic-drama | Its story |
| Love's Labour's Lost | play | romance | Its story |
| Lysistrata | play | war | Its story |
| Peer Gynt | play | domestic-drama | Its story |
| The Imaginary Invalid | play | domestic-drama, romance | Its story |
| The Misanthrope | play | romance | Its story |
| The Winter's Tale | play | domestic-drama | Its story |
| Three Sisters | play | war, romance, domestic-drama | Its story |
| Titus Andronicus | play | revenge, domestic-drama | Its story |
| Uncle Vanya | play | romance, domestic-drama | Its story |
| Layla and Majnun | poem | romance | Its story |
| Le Roman de la Rose | poem | romance | Its story |
| Orlando Furioso | poem | fantasy, romance | Its story |
| Paradise Lost | poem | war | Its story |
| Sir Gawain and the Green Knight | poem | domestic-drama | Its story |
| The Raven | poem | romance | Its story |
| Rashōmon | short story | survival | Its story |
| The Adventure of the Red-Headed League | short story | crime | Its story |
| The Lady with the Dog | short story | romance, domestic-drama | Its story |
| The Legend of Sleepy Hollow | short story | horror | Its story |
| The Tale of the Bamboo Cutter | short story | romance | Its story |
| Assassin's Creed | video game | thriller | Its story |
| Assassin's Creed II | video game | revenge, thriller, domestic-drama | Its story |
| Assassin's Creed IV: Black Flag | video game | sea-adventure, thriller | Its story |
| Call of Duty 2 | video game | war, military | Its story |
| Call of Duty 4: Modern Warfare | video game | war, military | Its story |
| Call of Duty: Modern Warfare 2 | video game | war, military | Its story |
| Call of Duty: Modern Warfare 3 | video game | military | Its story |
| Call of Duty: World at War | video game | war, military | Its story |
| Dota 2 | video game | sports | Its story |
| Far Cry 3 | video game | sea-adventure, crime | Its story |
| Far Cry 4 | video game | war, domestic-drama | Its story |
| Far Cry 5 | video game | war | Its story |
| Genshin Impact | video game | fantasy | Its story |
| God of War | video game | war, domestic-drama | Its story |
| Grand Theft Auto III | video game | gangster, crime | Its story |
| Grand Theft Auto IV | video game | gangster, crime, domestic-drama | Its story |
| Grand Theft Auto V | video game | heist, crime, domestic-drama | Its story |
| Grand Theft Auto: San Andreas | video game | gangster, crime, domestic-drama | Its story |
| Grand Theft Auto: Vice City | video game | gangster, crime | Its story |
| Mafia II | video game | gangster, war, domestic-drama | Its story |
| Max Payne | video game | gangster, crime, domestic-drama | Its story |
| Metal Gear Solid | video game | spy, military, thriller | Its story |
| Need for Speed: Most Wanted | video game | crime | Its story |
| Red Dead Redemption | video game | western, domestic-drama | Its story |
| Red Dead Redemption 2 | video game | western, gangster | Its story |
| The Elder Scrolls IV: Oblivion | video game | war, thriller | Its story |
| Undertale | video game | horror | Its story |
| Asterix | comic | alternate-history | Its record |
| Hetalia: Axis Powers | comic | romance | Its record |
| Ouran High School Host Club | comic | romantic-comedy, comedy, coming-of-age | Its record |
| Sailor Moon | comic | fantasy | Its record |
| Teenage Mutant Ninja Turtles | comic | martial-arts | Its record |
| The Walking Dead | comic | zombie | Its record |
| Weekly Shōnen Jump | comic | comedy | Its record |
| Classroom of the Elite | light novel | psychological-thriller, coming-of-age | Its record |
| Date A Live | light novel | romantic-comedy | Its record |
| High School DxD | light novel | romantic-comedy, comedy, supernatural | Its record |
| Calamity | novel | superhero | Its record |
| Demian | novel | coming-of-age | Its record |
| Dream of the Red Chamber | novel | domestic-drama | Its record |
| Firefight | novel | superhero | Its record |
| Germinal | novel | social-realism | Its record |
| Martin Eden | novel | coming-of-age | Its record |
| Songs of the Dead | novel | fantasy | Its record |
| Steelheart | novel | superhero | Its record |
| A Simple Thinking About Blood Type | online | comedy | Its record |
| Ctrl+Alt+Del | online | comedy | Its record |
| Cyanide and Happiness | online | satire | Its record |
| Killing Stalking | online | romance | Its record |
| Looking for Group | online | fantasy | Its record |
| Lore Olympus | online | romance | Its record |
| Penny Arcade | online | satire, comedy | Its record |
| Polandball | online | satire | Its record |
| Return of the Blossoming Blade | online | wuxia | Its record |
| Sabrina Online | online | comedy | Its record |
| The Gamer | online | fantasy | Its record |
| The Girl Downstairs | online | romance | Its record |
| xkcd | online | comedy, romance | Its record |
| The Frogs | play | comedy | Its record |
| Waiting for Godot | play | absurdist | Its record |
| Bhagavad Gita | poem | epic | Its record |
| Cantar de Mio Cid | poem | epic | Its record |
| Jabberwocky | poem | absurdist | Its record |
| The Backrooms | short story | horror | Its record |
| The Boy Who Cried Wolf | short story | fairy-tale | Its record |
| The Fox and the Crow | short story | fairy-tale | Its record |
| The Fox and the Grapes | short story | fairy-tale | Its record |
| The Lion and the Mouse | short story | fairy-tale | Its record |
| The Old Man and the Sea | short story | sea-adventure | Its record |
| The Three Little Pigs | short story | fairy-tale | Its record |
| The Tortoise and the Hare | short story | fairy-tale | Its record |
| Age of Empires | video game | war, historical-fiction | Its record |
| Age of Empires II: The Age of Kings | video game | war, historical-fiction | Its record |
| Clash of Clans | video game | war | Its record |
| Grand Theft Auto VI | video game | action | Its record |
| League of Legends | video game | action | Its record |
| Minecraft | video game | survival | Its record |
| Space Invaders | video game | action | Its record |
| Spore | video game | war, slice-of-life | Its record |
| Stardew Valley | video game | slice-of-life | Its record |
| Super Mario 64 | video game | adventure | Its record |
| Super Mario Bros. | video game | adventure | Its record |
| Super Mario Bros. 3 | video game | adventure | Its record |
| Tamagotchi | video game | slice-of-life | Its record |
| Team Fortress 2 | video game | action | Its record |
| The Sims | video game | slice-of-life | Its record |
| The Sims 2 | video game | slice-of-life | Its record |
| The Sims 3 | video game | slice-of-life | Its record |
| The Sims 4 | video game | slice-of-life | Its record |
| Travian | video game | war | Its record |
| Valorant | video game | action | Its record |
| War Thunder | video game | war | Its record |
| World of Tanks | video game | war | Its record |
| Lucky Luke | comic | action | Its medium |
| Durarara!! | light novel | fantasy | Its medium |
| Eromanga Sensei | light novel | fantasy | Its medium |
| Children of the Nameless | novel | drama | Its medium |
| Defiant | novel | drama | Its medium |
| Deleted Scenes from the 2002 Version of The Way of Kings | novel | drama | Its medium |
| Four Great Classical Novels | novel | drama | Its medium |
| Lies of the Beholder | novel | drama | Its medium |
| Moment Zero | novel | drama | Its medium |
| Secret History | novel | drama | Its medium |
| Shadows for Silence in the Forests of Hell | novel | drama | Its medium |
| Sixth of the Dusk | novel | drama | Its medium |
| Skin Deep | novel | drama | Its medium |
| Steppenwolf | novel | drama | Its medium |
| The House of the Dead | novel | drama | Its medium |
| There Are Still Stories to Tell | novel | drama | Its medium |
| Thus Spoke Zarathustra | novel | drama | Its medium |
| 100 Nichi Go ni Shinu Wani | online | drama | Its medium |
| All of Us Are Dead | online | drama | Its medium |
| Along with the Gods | online | drama | Its medium |
| Category:2000s webcomics | online | drama | Its medium |
| Cupid's Chocolate | online | drama | Its medium |
| Dinosaur Comics | online | drama | Its medium |
| Doctor Elise | online | drama | Its medium |
| Loss | online | drama | Its medium |
| Ozy and Millie | online | drama | Its medium |
| Piled Higher and Deeper | online | drama | Its medium |
| Please Take My Brother Away! | online | drama | Its medium |
| Sarah's Scribbles | online | drama | Its medium |
| Tawawa on Monday | online | drama | Its medium |
| The Perry Bible Fellowship | online | drama | Its medium |
| The Sound of Heart | online | drama | Its medium |
| User Friendly | online | drama | Its medium |
| VG Cats | online | drama | Its medium |
| Why Raeliana Ended Up at the Duke's Mansion | online | drama | Its medium |
| ZooPhobia | online | drama | Its medium |
| Measure for Measure | play | drama | Its medium |
| Angelus | poem | drama | Its medium |
| Georgics | poem | drama | Its medium |
| God Defend New Zealand | poem | drama | Its medium |
| Hey, Slavs | poem | drama | Its medium |
| Lord's Prayer | poem | drama | Its medium |
| Psalms | poem | drama | Its medium |
| Shakespeare's sonnets | poem | drama | Its medium |
| The Canterbury Tales | poem | drama | Its medium |
| Vande Mataram | poem | drama | Its medium |
| Works and Days | poem | drama | Its medium |
| Boule de Suif | short story | drama | Its medium |
| Brain Dump | short story | drama | Its medium |
| I Hate Dragons | short story | drama | Its medium |
| Mabinogion | short story | drama | Its medium |
| Probability Approaching Zero | short story | drama | Its medium |
| The Overcoat | short story | drama | Its medium |
| Agar.io | video game | adventure | Its medium |
| Candy Crush Saga | video game | adventure | Its medium |
| Pokémon Go | video game | adventure | Its medium |
| Roblox | video game | adventure | Its medium |
| Second Life | video game | adventure | Its medium |
| Subway Surfers | video game | adventure | Its medium |
| Terraria | video game | adventure | Its medium |
