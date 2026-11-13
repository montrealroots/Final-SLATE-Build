# Characters In Adapted Briefs: The Sweep

On November 13, 2026, the owner asked:

1. "Fix O'Brien and Dracula's lead too, and make sure to a complete sweep again and make sure all adaptations have
   their real characters and 100% accuracy."
2. "Fix the remaining wrong characters and placeholders too."

This is the sweep after both. Every one of the 517 works with a story was proposed as a feature film. The
table lists each brief's setting and its people, in order, with the role the story gives them:

- (lead) is the one the story names most;
- (against) is someone the story shows against the lead;
- (ally) is someone the story shows beside them.

A setting marked * is read from the story. A name marked * is not recorded in Wikidata: it is taken from the story's
own words, and its pronouns are "they" until the player sets them.

## The Numbers

| | Works |
|---|---|
| With a story | 517 |
| With someone taken from their story | 419 |
| With someone against the lead | 193 |
| Set where their story says, with no place recorded | 28 |
| With one person and a second part named for what it does ("The Rival") | 20 |
| With no one at all, all three parts named for what they do | 5 |

Before these two requests, 199 works with a story had no character recorded and were given "The Lead", "The Rival"
and "The Ally". A work with one or two people was given made-up parts to make three.

## What Changed

**People from the story** (`storyPeople` in `src/engine/story-structure.ts`)
- A name counts if it's used three times, or twice in full.
- Names are broken at punctuation, so "Dutch, Arthur, Bill and Javier" is four people.
- A first name or surname alone is joined to the full name it belongs to. Where it belongs to several, it goes to the
  one named most in full ("Castorp" is Hans Castorp, not his grandfather).
- These are left out:
  - places, found by "in", "at", "from", "fled", "the country of", "the capital city," and so on (Kyrat, Luthadel,
    Alethkar);
  - peoples, plurals and groups ("Germans", "Denizens who…", "Afrika Korps");
  - words that start sentences ("Like", "Meanwhile");
  - parts of the title;
  - voice actors' credits.
- Where fewer than three are named that often, the people named once in full come next (a game's soldiers), then the
  people the story names without a name ("the narrator", "the old man").
- One person under two names is one person, where the story joins them: "He renames himself 'Don Quixote'", "Kira's
  identity as Light", "known as", "under the alias". The name the story uses more is kept.
- Pronouns are never guessed. Reading them from nearby sentences was wrong too often (John Seward as "she").

**No invented people**
- A work with two people or more has them and no one else: The Cask of Amontillado is Montresor and Fortunato.
- A brief needs two people, so a work whose story names one has a second part named for what it does.
- Only a work with no one at all has "The Lead", "The Rival" and "The Ally".

**Settings** (`storyPlaces`)
- Where no place is recorded, the place the story names most as where things happen is proposed, and the scenes are
  there: Julius Caesar is set in Rome.
- "To" no longer counts as a place's word. "A few questions to Susan" made Susan a setting.

**Leads and roles**
- The Count leads Dracula.
- O'Brien stands against Winston: a sentence that names only the lead goes on from the one before it.
- A name word two characters share belongs to the one the work is named for: Metal Gear Solid's "Snake" is Solid
  Snake, who now leads.
- A rival and an ally each need the story to show it.
- Who is beside the lead is read between the two of them; who is against them is read from the whole sentence, unless
  the act is plainly someone else's. Two named together as the ones who act are beside each other.

## What Isn't Right Yet

The reading is of sentences, not of who does what to whom. Every brief is a proposal the player can change, and these
are known:

- **Roles are still read from sentences, not from who does what to whom.**
  - The final reading (`pairOf` in `story-structure.ts`) reads who is beside the lead only between the two of
    them, and who is against them from the whole sentence unless the act is plainly someone else's.
  - Compared over all 517 works with the reading before it, it fixed:
    - Polonius as Hamlet's ally and Ariel as against Prospero;
    - Julia, John Marston, Sancho Panza, Ron and Hermione as allies;
    - Fortunato against Montresor.
  - About 15 works got worse:
    - Long John Silver is no longer against Jim;
    - Rue reads as against Katniss, New Moon's Edward as against Bella;
    - Mafia II's Leo Galante reads as against Vito.
  - Some leads are the most-named person but not the story's hero: The Lion, the Witch and the Wardrobe is led by the
    White Witch, with Aslan against her.
  - Two other readings were tried and dropped, because each broke more than it fixed: counting only sentences of two
    people, and only clauses naming both.
- **20 works name only one person, and 5 name no one.** Their briefs say so.
- **A few names that aren't people still get through:** "The King" for an unnamed king, a game's "Linden Scripting
  Language" before this change.
- **Recorded names are kept as recorded.** Mina Harker stays Mina Harker where the story calls her Mina Murray. Only a
  person the story calls by a wholly different name (Don Quixote) is shown by the story's name.

## Every Work With A Story

| Work | Medium | Setting | Proposed People |
|---|---|---|---|
| Don Quixote | novel | Barcelona | Don Quixote (lead)*, Teresa Panza, Sancho Panza (ally), Dulcinea, Cardenio, Rocinante |
| Death Note | comic | Not recorded | Light Yagami (lead), L (against), Near, Misa Amane, Mello, Ryuk |
| Uncle Tom's Cabin | novel | Not recorded | Uncle Tom (lead), Eliza*, Simon Legree, George Shelby*, Little Eva, Cassy* |
| Gone with the Wind | novel | Atlanta | Scarlett O'Hara (lead), Melanie Hamilton, Ashley Wilkes, Rhett Butler |
| Ulysses | novel | #7 Eccles street | Stephen Dedalus (lead), May Goulding Dedalus, Simon Dedalus, Leopold Bloom, Molly Bloom, Milly Bloom |
| Dream of the Red Chamber | novel | China | Jia Baoyu (lead), Lin Daiyu, Xue Baochai, Jia Qiaojie, Jia Tanchun, Jia Xichun |
| Mahabharata | poem | Not recorded | Bhishma (lead)*, Pandu*, Vyasa*, Kunti*, Dhritarashtra*, Satyavati* |
| Super Mario Bros. | video game | Mushroom Kingdom | Bowser (lead), Mario, The Princess*, Luigi, Toad, Koopa Troopa |
| The Hunger Games | novel | Panem | Katniss Everdeen (lead), Rue (against)*, Peeta Mellark (ally), Cato*, Haymitch Abernathy, Effie Trinket |
| Snow White | short story | The world of Snow White | Snow White (lead), The Queen*, Magic Mirror, The Prince, Evil Queen, Seven Dwarfs |
| The Little Mermaid | short story | The world of The Little Mermaid | Little Mermaid (lead), The Prince*, The Sea Witch, The Princess*, Prince |
| The Snow Queen | short story | The world of The Snow Queen | Gerda (lead), Kai*, The Snow Queen, Kay, Reindeer Bae, Child Jesus'* |
| The Wild Swans | short story | The world of The Wild Swans | Elisa (lead)*, The King*, The Queen* |
| Grand Theft Auto V | video game | Los Santos* | Michael De Santa (lead), Trevor Philips (against), Franklin Clinton, Steve Haines*, Dave Norton*, Devin Weston* |
| Fairy Tail | comic | The world of Fairy Tail | Zeref (lead)*, Natsu Dragneel, Acnologia*, Fairy Tail*, Igneel*, Lucy Heartfilia* |
| Waiting for Godot | play | Not recorded | Vladimir (lead), Lucky, Estragon (ally), Pozzo |
| The Raven | poem | Not recorded | The Raven (lead)*, The Narrator*, The Bird* |
| The Little Prince | short story | The world of The Little Prince | The Prince (lead)*, The Narrator*, The Fox*, the little prince, the rose |
| The Old Man and the Sea | short story | Cuba | Santiago (lead), Manolin*, Joe DiMaggio*, Marlin |
| Othello | play | Venice | Iago (lead), Michael Cassio (against), Othello, Desdemona, Roderigo, Brabantio |
| Sword Art Online | light novel | The world of Sword Art Online | Asuna Yūki (lead), Kazuto (against)*, Kirito (ally), Nobuyuki Sugou*, Eugeo*, Shino Asada |
| Paradise Lost | poem | Not recorded | Adam (lead), Satan, Eve (ally), Michael, Mankind*, God the Son |
| Fathers and Sons | novel | Russia | Yevgeni Bazarov (lead), Anna Sergevna Odintsova*, Arkady Nikolayevitch Kirsanov (ally), Nikolay*, Katya*, Pavel* |
| Odyssey | novel | Mediterranean Sea | Odysseus (lead), Athena, Penelope, Telemachus, Zeus, Hermes |
| The Trial | novel | The world of The Trial | K (lead)*, Fräulein Bürstner (against)*, Josef K., Huld*, Karl*, Rudi Block* |
| Ramayana | poem | Not recorded | Rāma (lead)*, Sītā*, Lakṣmaṇa (ally)*, Rāvaṇa, Daśaratha*, Kaikeyī* |
| Dracula | novel | Bistrița | Count Dracula (lead), Brides of Dracula, Mina Harker, Lucy Westenra, Mrs. Westenra, Abraham Van Helsing |
| Hamlet | play | Denmark | Prince Hamlet (lead), King Claudius (against), Gertrude (ally), Laertes, Ophelia, Polonius |
| Harry Potter and the Philosopher's Stone | novel | England | Harry Potter (lead), Lord Voldemort (against), Hermione Granger, Quirrell*, Ron Weasley, Ginny Weasley |
| The Tenant of Wildfell Hall | novel | Yorkshire | Helen (lead)*, Huntingdon*, Gilbert* |
| The Hound of the Baskervilles | novel | Dartmoor | Henry Baskerville (lead), Sherlock Holmes, Dr. Watson, Beryl Stapleton*, James Mortimer*, Eliza Barrymore* |
| Charlotte's Web | novel | The world of Charlotte's Web | Wilbur (lead)*, Homer Zuckerman (against)*, Charlotte*, Fern*, Templeton*, John Arable* |
| Harry Potter and the Goblet of Fire | novel | Hogwarts Castle | Harry Potter (lead), Cedric Diggory (against), Ron Weasley (ally), Lord Voldemort, Albus Dumbledore, Moody* |
| Harry Potter and the Deathly Hallows | novel | Forest of Dean | Harry Potter (lead), Voldemort (against)*, Hermione Granger (ally), Ron Weasley, Dumbledore* |
| Harry Potter and the Half-Blood Prince | novel | Hogwarts Castle | Harry Potter (lead), Severus Snape (against), Albus Dumbledore, Ron Weasley, Draco Malfoy, Hermione Granger |
| Harry Potter and the Chamber of Secrets | novel | Chamber of Secrets | Harry Potter (lead), Dobby, Ron Weasley (ally), Gilderoy Lockhart, Riddle*, Ginny Weasley |
| Harry Potter and the Prisoner of Azkaban | novel | Hogsmeade | Harry Potter (lead), Sirius Black (against)*, Hermione Granger (ally), Ron Weasley, Hagrid*, Buckbeak* |
| Orlando Furioso | poem | The world of Orlando Furioso | Orlando (lead), Agramante (against), Angelica (ally), Ruggiero, Rodomonte, Bradamante |
| Cardcaptor Sakura | comic | Tomoeda* | Sakura Kinomoto (lead), Clow Reed, Syaoran Li (ally), Tōya Kinomoto, Nadeshiko Kinomoto, Fujitaka Kinomoto |
| The Elder Scrolls IV: Oblivion | video game | Not recorded | Martin (lead)*, Dagon (against)*, Jauffre (ally)*, Uriel Septim*, Vaermina |
| Eugene Onegin | novel | Not recorded | Eugene Onegin (lead), Vladimir Lensky (against), Tatyana Larina, Olga, Author-narrator |
| Accel World | light novel | Not recorded | Kuroyukihime (lead), Brain Burst*, Haruyuki*, Chiyuri Kurashima |
| From the Earth to the Moon | novel | Baltimore | Impey Barbicane (lead)*, Michel Ardan*, Nicholl* |
| Breaking Dawn | novel | Washington | Bella Swan (lead), Jacob (against)*, Edward Cullen (ally), Renesmee Cullen, Alice*, Irina* |
| BioShock | video game | The world of BioShock | Jack (lead)*, Fontaine (against)*, Ryan*, Atlas*, Brigid Tenenbaum* |
| Mafia II | video game | Empire Bay | Vito Scaletta (lead), Leo Galante (against)*, Joe Barbaro*, Carlo Falcone*, Henry*, Eddie Scarpa* |
| Maus | comic | Modrzejowska street in Sosnowiec | Vladek (lead)*, Art Spiegelman*, Anja (ally)*, Richieu*, Mala* |
| Aeneid | poem | Italy* | Aeneas (lead), Juno, Dido, Venus, Ascanius, Creusa |
| Sophie's World | novel | Not recorded | Sophie Amundsen (lead), Hilde (against)*, Alberto Knox (ally)*, Albert Knag* |
| Boule de Suif | short story | Not recorded | The Officer (lead)*, Democrat Cornudet*, Elisabeth Rousset* |
| Journey to the West | novel | China | Dragon King of the East Sea (lead), Zhu Bajie, Sun Wukong, Queen Mother of the West, Sha Wujing, White Dragon Horse |
| The Romance of the Three Kingdoms | novel | Xu* | Cao Cao (lead)*, Liu Bei (against)*, Dong Zhuo*, Yuan Shao*, Lü Bu*, Jin* |
| Water Margin | novel | Not recorded | Song Jiang (lead), Chao Gai*, Gao Qiu*, Wang Jin*, Ximen Qing, Yang Jian |
| The Legend of Sleepy Hollow | short story | Not recorded | Ichabod Crane (lead), Brom Bones*, Katrina Van Tassel* |
| The Hobbit | novel | Middle-earth | Bilbo Baggins (lead), Thorin Oakenshield, Gandalf (ally), Smaug, Gollum, Beorn |
| And Quiet Flows the Don | novel | Russian Empire | Grigori Melekhov (lead), Natalya Melekhova, Civil Wars* |
| Call of Duty 4: Modern Warfare | video game | Azerbaijan | Imran Zakhaev (lead)*, John Price (against)*, Khaled Al-Asad*, Griggs*, Kamarov*, Marines* |
| Harry Potter and the Order of the Phoenix | novel | Forbidden Forest | Harry Potter (lead), Voldemort (against)*, Dumbledore*, Dolores Umbridge*, Sirius Black*, Death Eaters* |
| Azumanga Daioh | comic | Not recorded | Chiyo Mihama (lead), Koyomi Mizuhara (against), Sakaki (ally), Ayumu Kasuga, Minamo Kurosawa, Tomo Takino |
| The Da Vinci Code | novel | Paris | Robert Langdon (lead), Jacques Saunière*, Sophie Neveu (ally), Bezu Fache*, Silas*, Bishop Aringarosa* |
| The Picture of Dorian Gray | novel | England | Dorian Gray (lead), Sibyl Vane (against), Basil Hallward*, Lord Henry Wotton |
| Romeo and Juliet | play | Mantua | Romeo (lead), Tybalt (against), Juliet, Lady Capulet, Count Paris, Mercutio |
| Grand Theft Auto: San Andreas | video game | Las Venturas | Big Smoke (lead), Frank Tenpenny, Ryder (ally), Big Bear, Sweet*, Cesar Vialpando |
| We | novel | The world of We | D-503 (lead)*, I-330*, O-90* |
| The Tempest | play | Not recorded | Prospero (lead), Antonio (against), Miranda (ally), Ariel, Alonso, Caliban |
| Alice's Adventures in Wonderland | novel | Wonderland | Alice (lead), The Hatter, White Rabbit, Cheshire Cat, Caterpillar, Duchess |
| Grand Theft Auto: Vice City | video game | Vice City | Tommy Vercetti (lead), Sonny Forelli (against), Victor Vance, Lance Vance, Juan Garcia Cortez*, Ricardo Diaz |
| Grand Theft Auto IV | video game | Liberty City | Niko Bellic (lead), Dimitri Rascalov (against)*, Roman Bellic, Jimmy Pegorino*, Kenny Petrović*, Mallorie* |
| A Midsummer Night's Dream | play | Athens | Titania (lead), Lysander, Oberon (ally), Nick Bottom, Theseus*, Hermia |
| Second Life | video game | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| Poor Folk | novel | Russian Empire | Varvara Dobroselova (lead), Pokrovsky*, Makar Devushkin (ally), Anna Fyodorovna* |
| Shakugan no Shana | light novel | The world of Shakugan no Shana | Yūji Sakai (lead), Shana, Flame Hazes*, Fureimu Heizu*, Kazumi Yoshida |
| Crayon Shin-chan | comic | Not recorded | Shinnosuke Nohara (lead), Ume Matsuzaka, Horrible Elevator*, Kindergarten Stairs*, Hiroshi Nohara, Misae Nohara |
| Lolita | novel | New England | Humbert Humbert (lead), Dolores Haze, Charlotte Haze, Annabel Leigh, Valeria Zborovski, Clare Quilty |
| Love's Labour's Lost | play | Not recorded | Costard (lead)*, Adriano de Armado*, Jaquenetta (ally)*, Berowne*, Holofernes* |
| Macbeth | play | Not recorded | Lady Macbeth (lead), Macbeth, King Duncan, Banquo, Macduff, Lady Macduff |
| The Wonderful Wizard of Oz | novel | Kansas | Dorothy Gale (lead), Scarecrow, Toto (ally), The Cowardly Lion, Wizard of Oz, Winged monkeys |
| Much Ado About Nothing | play | Italy | Benedick (lead), Claudio, Beatrice (ally), Hero, Don Pedro, Don John |
| Nibelungenlied | poem | Hunnic Empire | Siegfried (lead)*, Gunther*, Kriemhild (ally)*, Brünhild*, Hagen, Sigurd |
| The Sound and the Fury | novel | Not recorded | Quentin (lead)*, Caddy*, Benjy*, Jason Compson*, Dilsey Gibson* |
| Germinal | novel | northern French coal mining region | Étienne Lantier (lead), Catherine*, Chaval*, Souvarine* |
| Life is a Dream | play | Poland | Segismundo (lead)*, Clotaldo (against)*, Rosaura*, Astolfo*, Estrella*, Clarín* |
| The Three Musketeers | novel | Béthune | D'Artagnan (lead), Comte de Rochefort (against), Milady de Winter, Lord de Winter, Cardinal Richelieu, Athos |
| The Captain's Daughter | novel | Orenburg Governorate | Pyotr Grinyov (lead), Yemelyan Pugachev, Alexey Shvabrin (ally), Masha*, Maria Mironova |
| Resurrection | novel | Russian Empire | Dmitri Ivanovich Nekhlyudov (lead)*, Katerina Mikhailovna Maslova* |
| Anna Karenina | novel | Russian Empire | Anna Karenina (lead), Alexei Vronsky (against), Alexei Karenin, Kitty*, Stiva*, Kostya* |
| Oedipus Rex | play | Thebes | Oedipus (lead), Laius (against)*, Jocasta, Creon, Tiresias |
| Grand Theft Auto III | video game | Liberty City | Claude (lead), Catalina (against), Maria*, Salvatore Leone, Asuka Kasen, Donald Love* |
| Frankenstein; or, The Modern Prometheus | novel | The world of Frankenstein; or, The Modern Prometheus | Victor Frankenstein (lead), Frankenstein's monster (against), Elizabeth Lavenza, Henry Clerval*, Mer de Glace*, Doctor Waldman |
| White Fang | novel | Alaska | White Fang (lead)*, Grey Beaver (against)*, Weedon Scott*, Eye* |
| The Horse and His Boy | novel | Archenland | Shasta (lead), Rabadash, Aravis (ally), Tisroc, Arsheesh*, Corin* |
| War and Peace | novel | Austrian Empire | Pierre Bezukhov (lead), Nikolai Rostov, Petya Rostov, Andrei Nikolayevich Bolkonsky, Prince Nikolay Bolkonsky, Fedor Ivanovich Dolokhov |
| The Order of the Stick | online | Celia* | Roy (lead)*, Gate Xykon*, Elan*, Miko Miyazaki*, Belkar*, Haley* |
| The Stranger | novel | Algeria | Meursault (lead), Raymond Sintès*, Marie (ally)*, Céleste, Emmanuel, l'Arabe |
| Initial D | comic | Kantō region | Takumi Fujiwara (lead), Keisuke Takahashi (against), Bunta Fujiwara, Ryōsuke Takahashi, Project D*, Kōichirō Iketani |
| Oliver Twist | novel | London | Oliver Twist (lead), Fagin, Brownlow*, Bill Sikes, Nancy, Rose Maylie |
| The Tales of Beedle the Bard | short story | The world of The Tales of Beedle the Bard | Altheda (lead)*, Asha*, Amata* |
| Crime and Punishment | novel | Saint Petersburg | Rodion Romanovich Raskolnikov (lead), Dunya*, Pyotr Petrovich Luzhin, Razumikhin*, Semjon Marmeladov, Sonya* |
| The Crab with the Golden Claws | comic | Not recorded | Tintin (lead), Allan Thompson (against), Captain Haddock, Omar Ben Salaad, Thomson*, Snowy |
| Mat' | novel | Not recorded | Pavel Vlasov (lead)*, Nevertheless Nilovna*, Pelageya Nilovna Vlasova* |
| D.Gray-man | comic | The world of D.Gray-man | Allen Walker (lead)*, Nea*, Mana D*, Innocence*, Apocryphos* |
| Pride and Prejudice | novel | Hertfordshire | Mr. Darcy (lead), Georgiana Darcy, Elizabeth Bennet, George Wickham, Charles Bingley, Caroline Bingley |
| The Name of the Rose | novel | Italy | William of Baskerville (lead), Jorge de Burgos, Adso of Melk (ally), Malachi*, Berengar*, Adelmo* |
| Moby-Dick | novel | Pacific Ocean | Captain Ahab (lead), Moby Dick (against), Queequeg, Ishmael, Fedallah*, Stubb* |
| One Hundred Years of Solitude | novel | Macondo | José Arcadio (lead)*, José Arcadio Buendía (against)*, Aureliano Segundo*, Rebeca*, Fernanda del Carpio*, Úrsula Iguarán* |
| The Alchemist | novel | Andalusia | Santiago (lead)*, The Boy*, Personal Legend* |
| Les Misérables | novel | Digne-les-Bains | Jean Valjean (lead), Fantine, Javert, Cosette, Bishop Myriel, Éponine |
| Gulliver's Travels | novel | Balnibarbi | Lemuel Gulliver (lead), Glumdalclitch, Julius Caesar*, René Descartes*, Houyhnhnm, Yahoo |
| King Lear | play | Not recorded | Lear (lead), Edmund, Goneril, Edgar*, Gloucester*, Regan |
| Inuyasha | comic | The world of Inuyasha | Inuyasha (lead), Naraku*, Kagome Higurashi (ally), Per Kikyo*, Kohaku*, Sesshomaru |
| Angels & Demons | novel | CERN | Camerlengo Carlo Ventresca (lead)*, Robert Langdon, Vittoria Vetra, Maximilian Kohler*, Cardinal Saverio Mortati* |
| Date A Live | light novel | Not recorded | Kotori Itsuka (lead), Shido Itsuka, Isaac Ray Pelham Westcott, Asgard Electronics*, Deus Ex Machina*, Kurumi Tokisaki |
| The Brothers Karamazov | novel | Russian Empire | Dmitri Karamazov (lead), Ivan Karamazov, Alyosha Karamazov, Pavel Smerdyakov, Ekaterina Ivanovna Verkhovtseva, Fyodor Karamazov |
| Troilus and Cressida | play | Not recorded | Hector (lead)*, Achilles (against)*, Cressida, Pandarus*, Ajax*, Aeneas* |
| Twenty Thousand Leagues Under the Sea | novel | Atlantic Ocean | Captain Nemo (lead), Pierre Aronnax (against), Ned Land, Nautilus*, Conseil, Farragut |
| The Catcher in the Rye | novel | New York City | Holden Caulfield (lead), Phoebe Caulfield, Jane Gallagher*, Antolini* |
| Metamorphoses | poem | Not recorded | Perseus (lead)*, Ovid*, Achilles*, Medea*, Rome*, Scylla* |
| Treasure Island | novel | Hispanic America | Jim Hawkins (lead), Long John Silver, Captain Flint, Dr. Livesey, Billy Bones, Ben Gunn |
| The Song of Roland | poem | Spanish march | Roland (lead), Charlemagne (against)*, Ganelon*, Marsile*, Oliver*, Pinabel* |
| Eragon | novel | Alagaësia | Eragon (lead), Murtagh (against)*, Saphira (ally)*, Durza*, Brom*, Ajihad* |
| The Master and Margarita | novel | Alexander Garden | Woland (lead), Yeshua Ha-Notsri, Margarita, Pilate*, Satan*, Azazello |
| Twilight | novel | Forks | Bella Swan (lead), Edward Cullen, Alice Cullen, James*, Jacob Black |
| Fullmetal Alchemist | comic | The world of Fullmetal Alchemist | Edward Elric (lead), Alphonse Elric, Roy Mustang*, Greed*, Lin Yao*, Van Hohenheim* |
| David Copperfield | novel | England | David (lead)*, Edward Murdstone (against)*, Agnes (ally)*, Uriah Heep*, Clara Peggotty*, Emily* |
| Dune | novel | Arrakis | Paul Atreides (lead), Alia Atreides, Lady Jessica (ally), Leto I Atreides, Wellington Yueh, Piter De Vries |
| The Satanic Verses | novel | Not recorded | Gibreel Farishta (lead)*, Saladin Chamcha*, Amitabh Bachchan* |
| The Hunchback of Notre Dame | novel | Cour des miracles | Esmeralda (lead), Captain Phoebus (against), Pierre Gringoire (ally), Quasimodo, Claude Frollo, Jehan Frollo |
| New Moon | novel | Washington | Bella Swan (lead), Edward Cullen (against)*, Jacob Black (ally), Alice Cullen* |
| The Count of Monte Cristo | novel | Château d'If | Edmond Dantès (lead), Louis Dantès, Baron Danglars, Eugénie Danglars, Hermine Danglars, Fernand Mondego |
| Brave New World | novel | London | John (lead)*, Bernard Marx*, Linda*, Lenina Crowne*, Helmholtz Watson* |
| The Red and the Black | novel | Besançon | Julien Sorel (lead), Mathilde*, Rênal* |
| Madame Bovary | novel | Yonville | Emma Bovary (lead), Berthe*, Charles Bovary (ally), Léon Dupuis*, Rodolphe Boulanger* |
| Half-Life 2 | video game | Black Mesa East | Gordon Freeman (lead), Judith Mossman, Alyx Vance (ally), Eli Vance, Wallace Breen, Isaac Kleiner |
| Thus Spoke Zarathustra | novel | Not recorded | The Shepherd (lead)*, The Rival (against) |
| Assassin's Creed | video game | Holy Land | Altaïr (lead)*, Al Mualim (against)*, Desmond Miles*, Robert de Sablé*, Malik*, Warren Vidic* |
| For Whom the Bell Tolls | novel | Spain | Robert Jordan (lead)*, Pablo (against)*, María* |
| Fahrenheit 451 | novel | United States | Guy Montag (lead), Mildred*, Clarisse McClellan, Beatty*, Faber* |
| Deception Point | novel | Arctic | Rachel Sexton (lead)*, Michael Tolland*, Marjorie Tench*, Senator Sexton* |
| Wuthering Heights | novel | Yorkshire | Heathcliff (lead), Hindley Earnshaw (against), Linton Heathcliff, Catherine Earnshaw, Catherine Linton, Hareton Earnshaw |
| Tartuffe | play | Not recorded | Orgon (lead), Tartuffe (against), Elmire, Damis, Mariane, Valère |
| The Merchant of Venice | play | Venice | Shylock (lead), Antonio, Bassanio, Portia, Gratiano, Duke of Venice |
| Doctor Zhivago | novel | Not recorded | Yuri (lead)*, Amalia Karlovna Guichard*, Nikolai Nikolaevich*, Victor Ippolitovich Komarovsky*, Kiprian Savelyevich Tiverzin*, Misha Grigorievich Gordon* |
| All Quiet on the Western Front | novel | Northern France | Paul Bäumer (lead)*, Albert*, Kat* |
| Call of Duty: World at War | video game | Berlin | Dimitri Petrenko (lead)*, Viktor Reznov (against)*, Miller*, Corporal Roebuck*, Heinrich Amsel* |
| Warcraft III: Reign of Chaos | video game | The world of Warcraft III: Reign of Chaos | Arthas (lead)*, Kel'Thuzad*, Thrall*, Archmage Jaina Proudmoore*, Grom Hellscream*, Mannoroth* |
| Digital Fortress | novel | The world of Digital Fortress | Ensei Tankado (lead)*, Hulohot (against)*, Commander Trevor Strathmore*, Susan Fletcher*, Digital Fortress*, David Becker* |
| The Fellowship of the Ring | novel | Middle-earth | Frodo Baggins (lead), Gandalf, Strider*, Bilbo Baggins, Samwise Gamgee, Meriadoc Brandybuck |
| Peer Gynt | play | Norway | Peer Gynt (lead), Solveig, Ingrid Hegstad, The Mountain King, Anitra, Aslak |
| Nineteen Eighty-Four | novel | London | Winston Smith (lead), O'Brien (against), Julia (ally), Big Brother, Emmanuel Goldstein, Charrington |
| The Good Soldier Švejk | novel | Central and Eastern Europe | Josef Švejk (lead), Otto Katz*, Baloun |
| Call of Duty 2 | video game | France | El Dabaa (lead)*, John Davis*, Vasili Koslov* |
| The Idiot | novel | Russian Empire | Ganya (lead)*, Nastasya Filipovna, Parfyon Rogozhin, Prince Myshkin, Aglaya*, Lizaveta Prokofyevna* |
| The Lost Symbol | novel | Washington, D.C. | Robert Langdon (lead), Peter Solomon (against)*, Mal'akh*, Inoue Sato*, Zachary*, Warren Bellamy* |
| Assassin's Creed II | video game | Florence | Ezio (lead)*, Rodrigo Borgia (against)*, Desmond Miles*, Checco*, Mario* |
| To Kill a Mockingbird | novel | Alabama | Scout Finch (lead), Atticus Finch, Jem Finch (ally), Boo Radley, Tom Robinson*, Dill* |
| Eclipse | novel | Seattle | Bella Swan (lead), Jacob Black*, Edward Cullen (ally), Victoria* |
| The Threepenny Opera | play | London | Macheath (lead)*, Tiger Brown (against)*, Polly (ally)*, Peachum* |
| The Magic Mountain | novel | Davos | Hans Castorp (lead)*, Hans Lorenz Castorp*, Joachim Ziemssen* |
| The War of the Worlds | novel | The world of The War of the Worlds | West London (lead)*, Wells*, Horsell Common*, Narrator |
| And Then There Were None | novel | Devon | Philip Lombard (lead)*, Vera Claythorne*, Armstrong*, Justice Wargrave*, William Blore* |
| Final Fantasy VII | video game | http://www.wikidata.org/.well-known/genid/647f4b0c1ca918cff75315979d5a6924 | Sephiroth (lead), Cloud Strife (against), Jenova*, President Shinra*, Aerith Gainsborough, Meteor* |
| The Great Gatsby | novel | New York City | Jay Gatsby (lead), George B. Wilson (against), Daisy Buchanan (ally), Nick Carraway, Tom Buchanan, Myrtle Wilson |
| Elfen Lied | comic | The world of Elfen Lied | Diclonii (lead)*, Lucy* |
| Adventures of Huckleberry Finn | novel | Arkansas | Huck (lead)*, Tom Sawyer, Jim (ally), Pap*, Miss Watson, Peter Wilks* |
| Julius Caesar | play | Rome* | Julius Caesar (lead)*, Brutus (against)*, Mark Antony*, Cassius*, Casca* |
| S.T.A.L.K.E.R.: Shadow of Chernobyl | video game | Ukraine | Kill Strelok (lead)*, Doc*, Pripyat*, Sidorovich* |
| The Grapes of Wrath | novel | Arvin Federal Government Camp | Tom Joad (lead)*, Jim Casy*, Ma Joad*, Muley Graves* |
| Fruits Basket | comic | Not recorded | Tohru Honda (lead), Yuki Sohma*, Kyo Sohma* |
| Rurouni Kenshin | comic | Not recorded | Himura Kenshin (lead)*, Yukishiro Enishi (against)*, Kamiya Kaoru (ally)*, Shishio Makoto*, Hitokiri Battōsai*, Oniwabanshū* |
| Super Mario 64 | video game | Mushroom Kingdom | Mario (lead), Bowser (against), Princess Peach, Power Star*, Goomba, Koopa Troopa |
| Steppenwolf | novel | Not recorded | Harry Haller (lead)*, Hermine*, Pablo* |
| Strange Case of Dr Jekyll and Mr Hyde | novel | London | Dr Jekyll (lead), Mr Hyde, Mr. Utterson, Dr. Lanyon, Mr. Enfield, Mr. Poole |
| My Youth Romantic Comedy Is Wrong, as I Expected | light novel | Not recorded | Yukino Yukinoshita (lead), Hachiman Hikigaya (against), Yui Yuigahama (ally), Haruno Yukinoshita, Komachi Hikigaya, Service Club* |
| Prince Caspian | novel | Archenland | Prince Caspian (lead), Miraz, Susan Pevensie, Aslan, Edmund Pevensie, Lucy Pevensie |
| A Journey to the Centre of the Earth | novel | Church of Our Saviour | Professor Otto Lidenbrock (lead), Arne Saknussemm, Axel (ally)*, Hans Bjelke, Phileas Fogg, Graüben |
| Great Expectations | novel | Kent | Pip (lead), Miss Havisham (against), Joe Gargery (ally)*, Estella, Herbert Pocket*, Bentley Drummle* |
| Shaman King | comic | Not recorded | Yoh Asakura (lead), Great Spirit (against), Hao Asakura, Hana Asakura, Asakura Yohken, Mikihisa Asakura |
| Through the Looking-Glass | novel | The world of Through the Looking-Glass | Alice (lead), Red Queen, White Queen, White Knight, Humpty Dumpty, Tweedledum and Tweedledee |
| Need for Speed: Most Wanted | video game | United States | Razor (lead)*, Mia Townsend (against)*, Jonathan Cross*, Bull*, Rog* |
| Twelfth Night | play | Not recorded | Olivia (lead), Malvolio, Orsino (ally), Sebastian, Viola, Cesario* |
| Chobits | comic | The world of Chobits | Chi (lead)*, Hideki*, Hiromu Shinbo*, Chii |
| A Study in Scarlet | novel | London | Enoch J. Drebber (lead), Sherlock Holmes, Jefferson Hope*, Joseph Stangerson*, Lucy*, Dr. Watson |
| Hellsing | comic | The world of Hellsing | Integra Fairbrook Wingates Hellsing (lead)*, Millennium*, Abraham Van Helsing* |
| The Gambler | novel | Europe | Alexei (lead)*, Astley*, Polina (ally)*, Des Grieux*, Grandmother*, Mademoiselle Blanche* |
| Emma | novel | Southern England | Emma Woodhouse (lead)*, Jane Fairfax*, Harriet Smith (ally)*, Frank Churchill*, Knightley*, Bates* |
| The Murder of Roger Ackroyd | novel | Not recorded | James Sheppard (lead)*, Hercule Poirot, Flora*, Ferrars*, Parker*, Blunt* |
| The Final Problem | short story | London | Sherlock Holmes (lead), Professor Moriarty (against), Dr. Watson |
| The Two Gentlemen of Verona | play | Not recorded | Proteus (lead)*, Valentine*, Julia (ally)*, Silvia*, Thurio* |
| Doraemon | comic | The world of Doraemon | Nobita Nobi (lead), Nobisuke Nobi, Tamako Nobi, Gian*, Doraemon, Shizuka Minamoto |
| As You Like It | play | Not recorded | Rosalind (lead), Ganymede*, Orlando (ally), Celia, Oliver*, Phebe* |
| Père Goriot | novel | France | Eugène de Rastignac (lead), Vautrin (against), Jean-Joachim Goriot, Delphine de Nucingen, Anastasie de Restaud, Vicomtesse de Beauséant |
| Antigone | play | Thebes | Creon (lead), Antigone (against), Haemon, Eurydice of Thebes, Polynices*, Tiresias |
| The Godfather | novel | New York* | Vito Corleone (lead), Virgil Sollozzo (against)*, Michael Corleone, Sonny Corleone, Fredo Corleone, Tom Hagen |
| Solaris | novel | Solaris | Kris Kelvin (lead), Harey, Sartorius, Snaut |
| A Scandal in Bohemia | short story | Not recorded | Irene Adler (lead), Sherlock Holmes, Dr. Watson, Lawyer Godfrey Norton*, Wilhelm Gottsreich Sigismond von Ormstein |
| Slaughterhouse-Five | novel | Dresden | Billy Pilgrim (lead), Roland Weary*, Valencia Merble (ally)*, Montana Wildhack*, Kilgore Trout, Eliot Rosewater |
| Vampire Knight | comic | Not recorded | Yūki Cross (lead), Zero Kiryu, Kaname Kuran* |
| Lord of the Flies | novel | The world of Lord of the Flies | Ralph (lead)*, Jack (against)*, Piggy*, Simon*, Sam* |
| Ranma ½ | comic | Furinkan | Ranma Saotome (lead), Nodoka Saotome, Akane Tendo (ally), Genma Saotome, Soun Tendo, Ryoga Hibiki |
| Titus Andronicus | play | Not recorded | Titus Andronicus (lead), Tamora (against)*, Aaron*, Saturninus*, Lavinia*, Bassianus* |
| The Phantom of the Opera | novel | Paris | Christine Daaé (lead), Viscount Raoul de Chagny, Erik (ally), The Persian, Persian'*, Carlotta |
| Sense and Sensibility | novel | England | Marianne Dashwood (lead), John Willoughby, Elinor Dashwood (ally), Edward Ferrars, Lucy Steele*, Colonel Brandon |
| Portal | video game | Aperture Science Enrichment Center | Chell (lead), GLaDOS (against), Henry Wadsworth Longfellow* |
| Resident Evil 4 | video game | Spain | Leon S. Kennedy (lead), Osmund Saddler (against)*, Ashley Graham (ally), Ada Wong, Jack Krauser, Ramon Salazar |
| Mermaid Melody Pichi Pichi Pitch | comic | The world of Mermaid Melody Pichi Pichi Pitch | Lucia Nanami (lead)*, Kaito (against)*, Aqua Regina*, Gackto*, Michal Amagi*, Michel* |
| Saint Seiya | comic | The world of Saint Seiya | Gold Saints (lead), Bronze Saints, Black Saints, Silver Saints, Athena*, Pegasus Seiya |
| A Certain Magical Index | light novel | The world of A Certain Magical Index | Toma Kamijo (lead), Shiina Kamijo, Toya Kamijo, Index, Accelerator, Mikoto Misaka |
| Catch-22 | novel | Italy | Yossarian (lead), Milo Minderbinder, Doc Daneeka*, Kid Sampson*, Major Major Major Major |
| Half-Life | video game | Black Mesa Research Facility | Gordon Freeman (lead), G-Man, Eli Vance, Barney Calhoun, Arne Magnusson |
| User Friendly | online | Not recorded | Erwin (lead)*, Illiad*, Miranda*, Columbia Internet* |
| Timon of Athens | play | Not recorded | Flavius (lead)*, Alcibiades*, Apemantus*, Ventidius* |
| Medea | play | Corinth | Medea (lead), Creon (against), Jason, Glauce*, Aegeus, Greek chorus |
| Oedipus at Colonus | play | Colonus | Oedipus (lead), Theseus, Creon, Antigone, Polynices, Ismene |
| A Clash of Kings | novel | Qarth* | Joffrey (lead)*, Tyrion Lannister (against)*, Stannis Baratheon*, Daenerys Targaryen*, Renly*, Robb Stark* |
| A Tale of Two Cities | novel | London | Charles Darnay (lead)*, Lucie*, Manette*, Jarvis Lorry*, Jerry Cruncher*, Sydney Carton* |
| The Plague | novel | Oran | Jean Tarrou (lead)*, Bernard Rieux, Raymond Rambert (ally)*, Paneloux*, Cottard* |
| Abhigyanashakuntalam | play | Not recorded | Bharata (lead), Duṣyanta, Śakuntala*, Śakuntalā, Durvāsā, Kanva |
| Love Hina | comic | Not recorded | Keitarō Urashima (lead)*, Mutsumi Otohime*, Naru Narusegawa (ally)* |
| Haikyu!! | comic | Not recorded | Shōyō Hinata (lead), Karasuno*, Tobio Kageyama (ally), Toru Oikawa |
| Buddenbrooks | novel | Bad Schwartau | Thomas Buddenbrook (lead), Antoinette Buddenbrook, Antonie Buddenbrook, Christian Buddenbrook, Clara Buddenbrook, Clothilde Buddenbrook |
| The Adventures of Tom Sawyer | novel | Missouri | Tom Sawyer (lead), Injun Joe (against)*, Huck (ally)*, Becky Thatcher, Muff Potter, Polly* |
| Ouran High School Host Club | comic | Not recorded | Haruhi Fujioka (lead), Tamaki Suoh, Hikaru Hitachiin, Kaoru Hitachiin, Kyoya Ootori, Mitsukuni Haninozuka |
| Demons | novel | Russian Empire | Nikolai Stavrogin (lead), Varvara Petrovna*, Marya Lebyadkina*, Stepan Trofimovich*, Dasha*, Ivan Shatov* |
| The Voyage of the Dawn Treader | novel | Narnia universe | Lucy Pevensie (lead), Prince Caspian, Edmund Pevensie (ally), Eustace Scrubb, Aslan, Reepicheep |
| The Silver Chair | novel | England | Eustace Scrubb (lead), Rilian, Jill Pole (ally), Prince Caspian, Aslan, Puddleglum |
| The Taming of the Shrew | play | Padua | Lucentio (lead), Petruchio, Tranio (ally), Bianca Minola, Katherina Minola, Baptista Minola |
| The Two Towers | novel | Middle-earth | Gandalf (lead)*, Pippin*, Frodo Baggins, Saruman*, Gollum*, Sam* |
| The Return of the King | novel | Middle-earth | Frodo Baggins (lead), Aragorn*, Tolkien*, Sauron*, Merry*, Sam* |
| Persuasion | novel | England | Anne Elliot (lead), Louisa*, Frederick Wentworth (ally), Elizabeth*, Charles Hayter*, Mary* |
| Quo Vadis | novel | Ancient Rome | Lygia (lead)*, Chilo Chilonis (against)*, Marcus Vinicius (ally)*, Nero, Paul the Apostle, Saint Peter |
| Far Cry | video game | The world of Far Cry | Jack Carver (lead), Val*, Krieger Corp*, Doyle* |
| Sluggy Freelance | online | The world of Sluggy Freelance | Torg (lead), Zoë Bean, Sluggy Freelance*, Larry Cruz*, Chaz, http://www.wikidata.org/.well-known/genid/4b35bb85930a605edc44d6804d7f9585 |
| Atlas Shrugged | novel | The world of Atlas Shrugged | Dagny Taggart (lead), John Galt, Henry 'Hank' Rearden, Francisco d'Anconia, Jim*, Ellis Wyatt* |
| Life of Pi | novel | India | Pi (lead), Richard Parker, Orange Juice*, Piscine Molitor* |
| Spice and Wolf | light novel | Pasloe* | Holo (lead), Kraft Lawrence, Hans Remerio, Norah Arendt, Richten Marlheit, Zheren |
| The Miser | play | Not recorded | Harpagon (lead), Cléante, Mariane (ally)*, La Flèche, Élise*, Master Jacques |
| Tokyo Mew Mew | comic | Deep Blue* | Ichigo Momomiya (lead)*, Quiche*, Masaya Aoyama (ally)*, Pie*, Berry Shirayuki*, Ryou Shirogane* |
| The Overcoat | short story | Saint Petersburg | Akaky Akakievich Bashmachkin (lead)*, Акакий Акакиевич Башмачкин*, Petrovich (ally)* |
| Nana | comic | Not recorded | Nana K (lead)*, Nana O.*, Nana O*, Ren*, Black Stones'*, Black Stones* |
| Siddhartha | novel | India | Siddhartha (lead)*, Kamala*, Vasudeva*, Govinda* |
| Great Teacher Onizuka | comic | Not recorded | Eikichi Onizuka (lead)*, The Rival (against) |
| The Murders in the Rue Morgue | short story | Paris | C. Auguste Dupin (lead), Camille*, G*, Le Bon* |
| The Adventure of the Red-Headed League | short story | London | Jabez Wilson (lead)*, Sherlock Holmes, John Clay* |
| The Neverending Story | novel | Amarganth | Bastian Balthazar Bux (lead), Atreyu, Falkor, Gmork, Carl Conrad Coreander, Uyulala |
| Coriolanus | play | Rome* | Coriolanus (lead)*, Tullus Aufidius (against)*, Caius Marcius*, Cominius*, Menenius Agrippa*, Volumnia* |
| A Portrait of the Artist as a Young Man | novel | Dublin | Stephen Dedalus (lead), Father John Conmee, Charles Stewart Parnell, Uncle Charles, Betty Byrne*, Archibald Hamilton Rowan |
| The Black Cat | short story | Not recorded | The Narrator (lead)*, The Cat*, Pluto* |
| Oh My Goddess! | comic | The world of Oh My Goddess! | Belldandy (lead)*, Keiichi Morisato* |
| Mansfield Park | novel | England | Fanny Price (lead), Henry Crawford, Mary Crawford (ally), Maria Bertram, Edmund Bertram, Thomas Bertram |
| The Shining | novel | Overlook Hotel | Jack Torrance (lead), Danny Torrance (against), Wendy Torrance, Dick Hallorann* |
| The Mysterious Island | novel | Lincoln Island | Captain Nemo (lead), Tom Ayrton, Cyrus Smith, Harbert Brown, Bonadventure Pencroff, Gedéon Spilett |
| The Government Inspector | play | Not recorded | Ivan Khlestakov (lead), Old Believer*, Saratov Governorate* |
| The Mysterious Affair at Styles | novel | Essex | Alfred Inglethorp (lead)*, Emily Inglethorp (against)*, Hercule Poirot, John Cavendish*, Inspector Japp, Evelyn Howard* |
| Questionable Content | online | The world of Questionable Content | Marten Reed (lead)*, Jacques*, Faye (ally)*, Pintsize*, Questionable Content* |
| Claymore | comic | The world of Claymore | Clare (lead)*, The Rival (against) |
| The Call of the Wild | novel | Alaska | Buck (lead)*, John Thornton (against)*, François*, Hal*, Perrault* |
| Three Sisters | play | Russia | Natasha (lead)*, Irina*, Andrei (ally)*, Masha*, Olga*, Tuzenbach* |
| The Magician's Nephew | novel | London | Digory Kirke (lead), Jadis*, Polly Plummer (ally), Aslan, Andrew Ketterley, Frank and Helen |
| To the Lighthouse | novel | Skyes | Cam (lead)*, Lily Briscoe*, Augustus Carmichael* |
| The Cherry Orchard | play | Not recorded | Lyubov Andreievna Ranevskaya (lead), Lopakhin Yermolai Alexeievitch, Trofimov, Anya, Varya, Dunyasha |
| Full Metal Panic! | light novel | Not recorded | Kaname Chidori (lead)*, Sousuke Sagara (against)*, Kurz Weber (ally)* |
| Kuroko's Basketball | comic | Not recorded | Seirin High (lead)*, Tetsuya Kuroko*, Alongside Taiga Kagami*, Atsushi Murasakibara*, Daiki Aomine*, Ryota Kise* |
| Robinson Crusoe | novel | Orinoco River | Robinson Crusoe (lead), The Captain*, Friday (ally), Salé Rovers* |
| Toradora! | light novel | Not recorded | Taiga Aisaka (lead), Ryuuji Takasu, Yuusaku Kitamura, Minori Kushieda, Ami Kawashima |
| Baccano! | light novel | New York City | Claire Stanfield (lead)*, Jacuzzi Splot (against)*, Dallas Genoard*, Szilard Quates*, Firo Prochainezo*, Chane Laforet* |
| The Lion, the Witch, and the Wardrobe | novel | England | White Witch (lead), Aslan (against), Edmund Pevensie, Lucy Pevensie, Susan Pevensie, Peter Pevensie |
| Call of Duty: Modern Warfare 3 | video game | Berlin | Makarov (lead)*, Yuri (against)*, Price*, Soap*, Task Force*, Alena Vorshevsky* |
| Call of Duty: Modern Warfare 2 | video game | Afghanistan | Soap (lead)*, Shepherd (against)*, John Price (ally)*, Vladimir Makarov*, Task Force*, Joseph Allen* |
| Tower of God | online | The world of Tower of God | High Shinsu (lead)*, Chosen Regulars*, Former Regulars* |
| Noblesse | online | Not recorded | Rai (lead)*, Cadis Etrama Di Raizel* |
| The Last of the Mohicans | novel | Northern America and Mexico | Hawk-eye (lead)*, David Gamut (against)*, Uncas (ally), Alice Munro*, Magua, Duncan Heyward* |
| Future Diary | comic | Kinugawa Onsen | Yuno Gasai (lead), Aru Akise (against)*, Yukiteru Amano, Deus Ex Machina*, Minene Uryu*, Muru Muru* |
| Durarara!! | light novel | The world of Durarara!! | Mikado Ryūgamine (lead)*, Masaomi Kida*, Shizuo Heiwajima*, Anri Sonohara |
| Henry V | play | Not recorded | Henry V (lead)*, Montjoy (against)*, Katharine (ally)*, Charles*, France* |
| Haruhi Suzumiya | light novel | The world of Haruhi Suzumiya | Haruhi Suzumiya (lead)*, Kyon*, Esu-Ō-Esu Dan* |
| The Adventure of the Cardboard Box | short story | Not recorded | Jim Browner (lead)*, Sarah (against)*, Holmes*, Mary*, Inspector Lestrade |
| Love in the Time of Cholera | novel | Caribbean | Fermina Daza (lead)*, Juvenal Urbino*, Florentino Ariza (ally)* |
| The Sign of Four | novel | Not recorded | Jonathan Small (lead)*, Sherlock Holmes (against), Mary Morstan, John Sholto*, Bartholomew*, Thaddeus* |
| The Sun Also Rises | novel | Pamplona | Jake Barnes (lead), Robert Cohn, Bill Gorton (ally)*, Brett Ashley, Mike Campbell*, Romero* |
| The Comedy of Errors | play | Greece | Antipholus (lead)*, Dromio*, Adriana*, Aegeon*, Angelo* |
| Seven against Thebes | play | Thebes | Eteocles (lead), Antigone, messenger, Ismene, Greek chorus |
| All's Well That Ends Well | play | Not recorded | Bertram (lead)*, Diana*, Helena (ally)*, Parolles* |
| Berenice | short story | Not recorded | Egaeus (lead)*, Berenice*, Ibn Zaiat* |
| Hetalia: Axis Powers | comic | Not recorded | Leonardo da Vinci (lead)*, Maria Theresa*, Napoleon Bonaparte* |
| Little Women | novel | Heidelberg | Jo (lead)*, Meg March, Beth March, Laurie, Amy March, John Brooke |
| Soul Eater | comic | The world of Soul Eater | Death the Kid (lead), Asura (against)*, Crona*, Medusa*, Maka Albarn, Shinigami* |
| Red Dead Redemption | video game | Mexico | John Marston (lead), Edgar Ross (against)*, Bill Williamson*, Agustín Allende*, Abraham Reyes*, Dutch* |
| Kafka on the Shore | novel | Takamatsu | Nakata (lead)*, Saeki*, Oshima*, Hoshino*, Sakura*, Crow* |
| Hikaru no Go | comic | The world of Hikaru no Go | Sai (lead)*, Hikaru Shindo (against)*, Akira Toya*, Ko Yong Ha*, Korea*, Atsushi Kurata* |
| La Celestina | play | Salamanca | Calisto (lead), Celestina, Melibea, Pármeno*, Sempronio*, Areúsa* |
| Attack on Titan | comic | Shiganshina* | Eren Yeager (lead), Historia Reiss*, Pure Titans*, Rod Reiss*, Ymir*, Levi Ackerman |
| The Imaginary Invalid | play | Not recorded | Argan (lead), Angelique*, Thomas Diafoirus, Mr. Diafoirus, Toinette, Cléante |
| Mortal Engines | novel | London | Hester Shaw (lead)*, Thaddeus Valentine (against)*, Tom Natsworthy (ally)*, Shrike*, Katherine*, Anna Fang* |
| It | novel | Derry | Georgie Denbrough (lead)*, Mike Hanlon*, Ben Hanscom*, Beverly Marsh*, Bill*, Eddie Kaspbrak* |
| Do Androids Dream of Electric Sheep? | novel | San Francisco | Rick Deckard (lead), Rachael Rosen (against), Phil Resch*, Iran*, Mercer*, Pris Stratton |
| Antony and Cleopatra | play | Not recorded | Octavius (lead)*, Sextus Pompey (against)*, Enobarbus*, Octavia* |
| The Fountainhead | novel | New York City | Howard Roark (lead), Gail Wynand (against)*, Henry Cameron (ally)*, Dominique*, Guy Francon*, Toohey* |
| Vanity Fair | novel | Not recorded | Becky Sharp (lead)*, George Osborne*, Amelia Sedley (ally)*, Rawdon Crawley*, Pitt Crawley*, William Dobbin* |
| Carrie | novel | Chamberlain | Carrie White (lead), Margaret White, Sue Snell, Chris Hargensen*, Tommy*, Rita Desjardin |
| Henry IV, Part 1 | play | Not recorded | Hal (lead)*, John Falstaff (against)*, Hotspur*, Edmund Mortimer*, Thomas Percy* |
| Pygmalion | play | London | Henry Higgins (lead), Eliza Doolittle, Colonel Hugh Pickering (ally), Alfred P. Doolittle, Freddy Eynsford-Hill, Pearce* |
| The Kite Runner | novel | Afghanistan | Amir (lead)*, Hassan (against)*, Baba (ally)*, Sohrab*, Assef*, Soraya Taheri* |
| Super Mario Bros. 3 | video game | Dark Land* | Mario (lead), Bowser, Luigi (ally), Toadstool*, Princess Peach, Iggy Koopa |
| Dead Souls | novel | Not recorded | Pavel Ivanovich Chichikov (lead), Plyushkin, Sobakevich |
| Captain Tsubasa | comic | Not recorded | Tsubasa Oozora (lead)*, Rivaul (against)*, Roberto Hongo (ally)*, Kojiro Hyuga*, Genzo Wakabayashi*, Shingo Aoi* |
| The Seagull | play | Not recorded | Konstantin Gavrilovich Treplyov (lead), Nina Mikhailovna Zarechnaya (against), Boris Alexeyevich Trigorin, Irina Nikolayevna Arkadina, Dorn, Pjotr Nikolayevich Sorin |
| Richard III | play | Not recorded | Richard (lead)*, Edward V (against)*, Elizabeth*, Buckingham*, Clarence*, Henry* |
| The Fault in Our Stars | novel | Amsterdam | Hazel (lead)*, Van Houten*, Lidewij* |
| Works and Days | poem | Not recorded | Hesiod (lead), Zeus, Perses*, Pandora, Prometheus, Hermes |
| A Doll's House | play | Not recorded | Torvald Helmer (lead), Nora Helmer, Krogstad, Mrs. Linde, Doctor Rank, The Helmer's three little children |
| Astro Boy | comic | The world of Astro Boy | Astro Boy (lead), Dr. Tenma, Tobio*, Hamegg* |
| Layla and Majnun | poem | Not recorded | Layla al-Aamiriya (lead), Qays Ibn al-Mulawwah, Al Majnoun Al Faransi*, Ward Althaqafi* |
| The Castle | novel | The world of The Castle | K. (lead), K*, Otto Brunswick* |
| A Clockwork Orange | novel | England | Alex (lead), Dim (against)*, Georgie*, Alexander* |
| Hunter × Hunter | comic | The world of Hunter × Hunter | Gon Freecss (lead), Ging Freecss, Killua Zoldyck (ally), Nen*, Kurapika, Kite* |
| Black Butler | comic | The world of Black Butler | Ciel (lead)*, Undertaker*, Sebastian Michaelis (ally)* |
| JoJo's Bizarre Adventure | comic | Morioh* | Dio Brando (lead)*, Jotaro Kujo*, Jonathan Joestar (ally)*, Joseph Joestar*, Josuke Higashikata*, Holly Kujo* |
| Slam Dunk | comic | Not recorded | Hanamichi Sakuragi (lead), Takenori Akagi, Haruko Akagi, Kaede Rukawa, Hisashi Mitsui, Ryota Miyagi |
| The Wonderful Adventures of Nils | novel | Alnön | Nils Holgersson (lead), Akka of Kebnekaise, Martin, Smirre Fox |
| Electra | play | Mycenae | Electra (lead), Orestes, Clytemnestra, Aegisthus, Chrysothemis, Agamemnon* |
| Fist of the North Star | comic | The world of Fist of the North Star | Kenshiro (lead)*, Lin*, Bat*, Raoh*, Kaioh* |
| On the Road | novel | Denver | Dean Moriarty (lead)*, Sal*, Camille* |
| The Winter's Tale | play | Not recorded | Leontes (lead), Perdita, Camillo*, Hermione*, Florizel, Paulina* |
| The Man in the High Castle | novel | Berlin | Tagomi (lead)*, Germany Martin Bormann*, Baynes (ally)*, Hawthorne Abendsen*, Joe Cinnadella*, Juliana Frink* |
| Lady Chatterley's Lover | novel | Not recorded | Constance Reid (lead)*, Clifford Chatterley*, Oliver Mellors* |
| Mrs Dalloway | novel | London | Clarissa Dalloway (lead)*, Peter Walsh*, Septimus Warren Smith* |
| Uncle Vanya | play | Russian Empire | Vanya (lead)*, Aleksandr Vladimirovich Serebryakov (against), Yelena Andreevna Serebryakova (ally), Sonya*, Mikhail Lvovich Astrov, Marina Timofeevna |
| Lysistrata | play | Propylaea of Athens | Lysistrata (lead), Myrrhine*, Scythian Archers* |
| Persepolis | comic | Tehran | Marji (lead)*, The Rival (against) |
| Sir Gawain and the Green Knight | poem | Not recorded | Gawain (lead), Green Knight, Arthur*, Guinevere*, Bertilak de Hautdesert* |
| Jurassic Park | novel | Isla Nublar | Paleontologist Alan Grant (lead)*, John Hammond*, Ian Malcolm*, Dennis Nedry*, Donald Gennaro*, John Arnold* |
| The Tell-Tale Heart | short story | Not recorded | The Narrator (lead)*, The Old Man* |
| Gintama | comic | The world of Gintama | Gintoki Sakata (lead)*, Shinpachi Shimura*, Edo Japan* |
| The Masque of the Red Death | short story | Not recorded | Prospero (lead)*, The Rival (against) |
| Journey to the End of the Night | novel | Paris | Ferdinand Bardamu (lead)*, Léon Robinson*, Madelon*, Lola*, Baryton*, Grandma Henrouille* |
| Far Cry 3 | video game | Rook Islands | Jason Brody (lead), Citra Talugmai (against), Hoyt Volker, Vaas Montenegro, Riley*, Liza* |
| Bakuman | comic | Not recorded | Ashirogi (lead)*, Gitantei Torappu*, Tanto Daihatsu* |
| The Frogs | play | Athens* | Dionysus (lead)*, Aeschylus*, Euripides*, Heracles*, Xanthias* |
| God of War | video game | Athens | Kratos (lead), Ares (against), Athena*, Box* |
| Death of a Salesman | play | Brooklyn | Willy Loman (lead), Biff Loman, Happy Loman, Linda Loman, Charley*, Howard* |
| Blindness | novel | The world of Blindness | The Doctor (lead)*, The Rival (against) |
| The Importance of Being Earnest | play | Not recorded | Algernon Moncrieff (lead)*, Jack*, Ernest (ally)*, Bracknell*, Cecily Cardew*, Gwendolen Fairfax* |
| Catching Fire | novel | Panem | Katniss Everdeen (lead), Haymitch Abernathy*, Peeta Mellark (ally)*, Snow*, Beetee*, Johanna Mason* |
| Flowers for Algernon | short story | The world of Flowers for Algernon | Charlie Gordon (lead)*, Nemur*, Alice Kinnian* |
| Ivanhoe | novel | Not recorded | Cedric of Rotherwood (lead), Isaac of York, Wilfred of Ivanhoe, Lady Rowena, Richard*, Rebecca the Jewess |
| A Streetcar Named Desire | play | Downtown New Orleans | Blanche DuBois (lead), Mitch (against)*, Stanley Kowalski (ally), Stella Kowalski, Eunice Hubbell, Harold "Mitch" Mitchell |
| The Merry Wives of Windsor | play | Not recorded | Falstaff (lead), Mistress Quickly, Anne Page*, Fenton*, Caius*, Ancient Pistol |
| Murder on the Orient Express | novel | Not recorded | Hercule Poirot (lead), Cassetti (against)*, Ratchett*, Pierre Michel*, M. Bouc, Caroline Hubbard* |
| Prometheus Bound | play | Caucasus Mountains | Prometheus (lead), Zeus*, Oceanus, Io, Kratos, Hephaestus |
| East of Eden | novel | Salinas | Adam Trask (lead)*, Aron*, Cal*, Cathy Ames, Lee* |
| Monster | comic | Not recorded | Kenzo Tenma (lead), Johan Liebert (against), Eva Heinemann, Nina Fortner, West Germany*, Wolfgang Grimmer |
| Demian | novel | Not recorded | Emil Sinclair (lead)*, Max Demian* |
| A Thousand Splendid Suns | novel | Afghanistan | Laila (lead)*, Mariam*, Tariq (ally)*, Rasheed*, Jalil*, Nana* |
| The Prince and the Pauper | novel | England | Edward Tudor (lead)*, Tom Canty*, Henry*, Miles Hendon* |
| The Gold-Bug | short story | Charleston | William Legrand (lead)*, Jupiter*, Fort Moultrie* |
| The Scarlet Letter | novel | Boston | Hester Prynne (lead), Roger Chillingworth (against), Arthur Dimmesdale, Pearl* |
| The Unbearable Lightness of Being | novel | Prague* | Tomáš (lead), Sabina, Tereza (ally), Franz* |
| The Tale of the Bamboo Cutter | short story | Not recorded | Kaguya-hime (lead), The Old Man*, Mount Fuji*, Isonokami no Ason Maro, Abe no Miushi, Ōtomo no Miyuki |
| Vinland Saga | comic | Vinland* | Thorfinn (lead)*, Canute*, Karli (ally)*, Askeladd*, Einar*, Thorkell* |
| The Bacchae | play | Thebes | Dionysus (lead), Pentheus, Cadmus, Agave, Semele*, Tiresias |
| The Wind in the Willows | novel | Berkshire | Mr. Toad (lead), Mole*, Badger*, Rat* |
| Ligeia | short story | Not recorded | The Narrator (lead)*, Rowena Trevanion*, Conqueror Worm* |
| The Golden Ass | novel | Not recorded | Lucius (lead)*, Psyche*, Photis (ally)*, Cupid*, Charite*, Milo* |
| The Misanthrope | play | Paris | Alceste (lead), Célimène, Éliante, Oronte, Philinte, Acaste |
| The Adventure of the Speckled Band | short story | London | Grimesby Roylott (lead)*, Sherlock Holmes (against), Helen Stoner*, Dr. Watson |
| Rashōmon | short story | Not recorded | The Woman (lead)*, The Man*, The Old Woman* |
| The Adventure of the Noble Bachelor | short story | London | Hatty Doran (lead)*, Moulton (against)*, Simon*, Inspector Lestrade |
| Rip Van Winkle | short story | Catskill Mountains | Rip Van Winkle (lead), Dutch*, Halve Maen* |
| The Cask of Amontillado | short story | Not recorded | Montresor (lead)*, Fortunato (against)* |
| Sabrina Online | online | Not recorded | Sabrina Online (lead)*, Thomas Woolfe*, Zig Zag* |
| The Adventure of the Blue Carbuncle | short story | London | Sherlock Holmes (lead), James Ryder*, Henry Baker*, Peterson*, Dr. Watson, Inspector Bradstreet |
| The Call of Cthulhu | short story | Auckland | Gustaf Johansen (lead)*, Cthulhu, Francis Wayland Thurston*, John Raymond Legrasse* |
| Ctrl+Alt+Del | online | Not recorded | Ethan (lead)*, Tim Buckley*, Lucas (ally)* |
| The Adventure of the Musgrave Ritual | short story | Not recorded | Brunton (lead)*, Holmes*, Rachel Howells*, Ralph Musgrave* |
| A Case of Identity | short story | London | Sherlock Holmes (lead), Hosmer Angel*, James Windibank*, Mary Sutherland* |
| The Man with the Twisted Lip | short story | London | Clair (lead)*, Hugh Boone (against)*, Sherlock Holmes, Dr. Watson, Inspector Bradstreet |
| The Adventure of Silver Blaze | short story | Dartmoor | Sherlock Holmes (lead), John Straker*, Bookmaker Fitzroy Simpson*, Watson*, Gregory*, Pyland* |
| The House of the Dead | novel | Russian Empire | Aleksandr Petrovich (lead)*, Aleksandr Petrovich Goryanchikov*, Gradually Goryanchikov* |
| The Mystery of Marie Rogêt | short story | Paris | C. Auguste Dupin (lead), The Rival (against) |
| The Adventure of the Empty House | short story | Not recorded | Sherlock Holmes (lead), Sebastian Moran*, Moriarty*, Inspector Lestrade |
| Max Payne | video game | Choir Communications Garage | Max Payne (lead), Angelo Punchinello (against), Michelle Payne, Nicole Horne, Jack Lupino*, Alfred Woden |
| The Boscombe Valley Mystery | short story | Herefordshire | James (lead)*, Sherlock Holmes, Charles McCarthy (ally)*, John Turner*, Alice*, Watson* |
| The Adventure of the Engineer's Thumb | short story | London | Victor Hatherley (lead)*, Lysander Stark*, Sherlock Holmes, Dr. Watson, Inspector Bradstreet |
| The Five Orange Pips | short story | London | John Openshaw (lead)*, Elias*, Sherlock Holmes, Joseph* |
| The Fall of the House of Usher | short story | Not recorded | Roderick Usher (lead)*, Madeline*, Ethelred* |
| Hop-o'-My-Thumb | short story | The world of Hop-o'-My-Thumb | Hop-o'-My-Thumb (lead)*, The Rival (against) |
| The Adventure of the Second Stain | short story | Not recorded | Sherlock Holmes (lead), Hilda Trelawney Hope (against)*, Eduardo Lucas*, Inspector Lestrade, Dr. Watson |
| The Nightingale | short story | The world of The Nightingale | The Emperor (lead)*, The Nightingale* |
| The Adventure of the Gloria Scott | short story | Not recorded | Victor Trevor (lead)*, Head-keeper Hudson*, Holmes (ally)*, Beddoes*, Born James Armitage* |
| The Adventure of the Yellow Face | short story | America* | Effie Munro (lead)*, Watson*, Lucy*, Grant Munro* |
| In Search of the Castaways | novel | 37th parallel south | Tom Ayrton (lead), Captain Grant, Jacques Paganel, Lady Glenarvan, Lord Glenarvan, Mary Grant |
| Around the World in Eighty Days | novel | Aden | Phileas Fogg (lead), Fix (against), Jean Passepartout (ally), Aouda, Andrew Speedy, Ibai Hermoso |
| Martin Eden | novel | Oakland | Martin Eden (lead)*, Ruth Morse* |
| Concerned | online | Locations of Half-Life | Norman Frohman (lead)*, Ravenholm*, Gordon Freeman (ally), Breen*, Antlions* |
| The Adventure of the Stockbroker's Clerk | short story | Not recorded | Pycroft (lead)*, Holmes*, Arthur Pinner*, Beddington*, Watson*, Harry* |
| Animal Farm | novel | England | Napoleon (lead), Snowball (against), Jones, Squealer, Old Major, Boxer |
| The Invisible Man | novel | London | Griffin (lead), Kemp (against)*, Thomas Marvel*, Adye*, Griffanti |
| The Handmaid's Tale | novel | United States | Offred (lead), Serena Joy, Nick* |
| High School DxD | light novel | Not recorded | Issei Hyōdō (lead), Rias Gremory, Kuō Gakuen*, Akeno Himejima, Asia Argento, Gasper Vladi |
| A Descent into the Maelström | short story | The world of A Descent into the Maelström | The Narrator (lead)*, The Rival (against) |
| A Game of Thrones | novel | Westeros | Ned (lead)*, Jon Arryn (against)*, Drogo*, Daenerys Targaryen*, Cersei Lannister*, Joffrey* |
| Oruchuban Ebichu | comic | Not recorded | Ebichu (lead)*, The Rival (against) |
| The Gathering Storm | novel | Arad Doman* | Rand al'Thor (lead), Egwene*, Elaida*, Semirhage*, Verin Mathwin* |
| The Adventure of the Dancing Men | short story | Not recorded | Abe Slaney (lead)*, Sherlock Holmes*, Elsie Patrick*, Watson* |
| Mistborn: The Well of Ascension | novel | Luthadel* | Vin (lead)*, Zane (against)*, Elend Venture (ally)*, Sazed*, Straff Venture*, Ashweather Cett* |
| The Adventure of Black Peter | short story | Weald | Peter Carey (lead)*, Patrick Cairns (against)*, Sherlock Holmes, Inspector Hopkins, John Hopley Neligan*, Dr. Watson |
| The Way of Kings | novel | The world of The Way of Kings | Kaladin (lead)*, Dalinar*, Szeth*, Shallan*, Gavilar* |
| Schlock Mercenary | online | The world of Schlock Mercenary | Kaff Tagon (lead)*, F'sherl-Ganni Gatekeepers*, Kevyn Andreyasn* |
| The Lady with the Dog | short story | Russia | Anna Sergeyevna (lead), Dmitri Gurov |
| Elantris | novel | The world of Elantris | Hoid (lead), The Rival (against) |
| Towers of Midnight | novel | The world of Towers of Midnight | Perrin Aybara (lead)*, Galad Damodred (against)*, Isam*, Egwene*, Elayne Trakand*, Mesaana* |
| Homestuck | online | Doc Scratch* | John Egbert (lead), Vriska Serket, Jack Noir*, Sburb*, Caliborn*, Dave Strider |
| Mistborn: The Final Empire | novel | Luthadel* | Kelsier (lead)*, Ruler*, Vin*, Valette Renoux*, Elend Venture*, Marsh* |
| A Memory of Light | novel | The world of A Memory of Light | Rand (lead)*, Elayne Trakand*, Mat*, Egwene*, Demandred*, M'Hael* |
| Alcatraz Versus the Evil Librarians | novel | The world of Alcatraz Versus the Evil Librarians | Alcatraz Smedry (lead)*, The Rival (against) |
| The Hitchhiker's Guide to the Galaxy | novel | The world of The Hitchhiker's Guide to the Galaxy | Arthur Dent (lead), Zaphod Beeblebrox, Ford Prefect (ally), Trillian, Magrathea*, Marvin the Paranoid Android |
| Cyberpunk 2077 | video game | Night City | V (lead), Yorinobu Arasaka (against), Johnny Silverhand, Hanako Arasaka, Saburo Arasaka, Alt Cunningham |
| The Adventure of the Six Napoleons | short story | Not recorded | Sherlock Holmes (lead), Beppo*, Inspector Lestrade (ally) |
| Assassination Classroom | comic | The world of Assassination Classroom | Koro-sensei (lead)*, The Rival (against) |
| The God of High School | online | Not recorded | Mori Jin (lead)*, South Korea*, Borrowed Power* |
| Case Closed | comic | Not recorded | Shinichi Kudo (lead), Yukiko Kudo, Yusaku Kudo, James Black, Kogoro Mori, Hiroshi Agasa |
| Mistborn: The Hero of Ages | novel | The world of Mistborn: The Hero of Ages | Ruin (lead)*, Vin (against)*, Elend*, Preservation*, Marsh*, Urteau* |
| The Witcher 3: Wild Hunt | video game | Kaer Morhen | Ciri (lead)*, Geralt of Rivia (against), Yennefer of Vengerberg, Avallac'h*, Emhyr*, Eredin* |
| The Queen of Spades | short story | Not recorded | Hermann (lead)*, Lizavyeta Ivanovna* |
| Alcatraz Versus the Knights of Crystallia | novel | The world of Alcatraz Versus the Knights of Crystallia | Alcatraz Smedry (lead)*, Attica Smedry*, Leavenworth Smedry* |
| Alcatraz Versus the Scrivener's Bones | novel | The world of Alcatraz Versus the Scrivener's Bones | Bastille (lead)*, Kazan*, Grandpa Smedry* |
| Alcatraz Versus the Shattered Lens | novel | The world of Alcatraz Versus the Shattered Lens | The King (lead)*, The Rival (against) |
| Monogatari | light novel | Not recorded | Koyomi Araragi (lead), Karen Araragi, Hitagi Senjōgahara (ally)*, Mayoi Hachikuji* |
| Inferno | novel | Not recorded | Robert Langdon (lead), Vayentha (against)*, Sienna Brooks*, Bertrand Zobrist*, Elizabeth Sinskey* |
| The Irregular at Magic High School | light novel | The world of The Irregular at Magic High School | Tatsuya Shiba (lead)*, Miyuki Shiba (against)* |
| The Devil Is a Part-Timer! | light novel | The world of The Devil Is a Part-Timer! | Emi Yusa (lead)*, The Rival (against) |
| Zahra’s Paradise | online | Not recorded | Zahra Kazemi (lead)*, Mohsen Rouholamini*, Sohrab Aarabi* |
| Infinity Blade: Awakening | novel | The world of Infinity Blade: Awakening | Siris (lead)*, Isa (against)* |
| Assassin's Creed IV: Black Flag | video game | Caribbean | Edward Kenway (lead), John Rackham, Bartholomew Roberts, Mary Read, Benjamin Hornygold, Juno* |
| Metal Gear Solid | video game | Shadow Moses | Solid Snake (lead), Meryl Silverburgh (against), Liquid Snake, Otacon*, Revolver Ocelot, Donald Anderson |
| Mistborn: The Alloy of Law | novel | The world of Mistborn: The Alloy of Law | Wax (lead)*, Lessie (against)*, Wayne (ally)*, Marasi*, Steris*, Edwarn Ladrian* |
| Nimona | online | The world of Nimona | Blackheart (lead)*, Nimona (against)*, Ambrosius Goldenloin*, Meredith Blitzmeyer* |
| Words of Radiance | novel | Narak* | Kaladin (lead)*, Szeth (against)*, Shallan Davar*, Dalinar Kholin*, Jasnah Kholin*, Brightlord Amaram* |
| The Seven Deadly Sins | comic | The world of The Seven Deadly Sins | Elizabeth Liones (lead), Meliodas (against), Diane (ally), Ban, King, Merlin |
| Tokyo Ghoul | comic | Tokyo | Ken Kaneki (lead)*, Tokyo Ghoul*, Rize Kamishiro* |
| Overlord | light novel | New World | Momonga (lead)*, Ainz Ooal Gown* |
| No Game No Life | light novel | The world of No Game No Life | Stephanie Dola (lead)*, The Rival (against) |
| Your Lie in April | comic | Not recorded | Kōsei Arima (lead)*, Kaori Miyazono*, Tsubaki Sawabe* |
| Warbreaker | novel | Hallandren* | Siri (lead)*, Vasher*, Vivenna (ally)*, Denth*, BioChromatic Breath*, Idris* |
| Far Cry 4 | video game | Nepal | Ajay Ghale (lead)*, Pagan Min (against)*, Ishwari*, Amita*, Sabal*, Noore Najjar* |
| Girls of the Wild's | online | Not recorded | Jaegu Song (lead)*, High (against)*, Daldal Choi*, Moonyoung Lee*, Myunghwan*, Hyesong* |
| Mistborn: Shadows of Self | novel | The world of Mistborn: Shadows of Self | Wax (lead)*, Bleeder (against)*, Harmony*, Innate*, Lessie*, MeLaan* |
| The Gamer | online | The world of The Gamer | Han Ji-Han (lead)*, Shin Seon-Il*, Hwan Seong-Gon*, Kwon Si-Yeon* |
| The Emperor's Soul | novel | The world of The Emperor's Soul | Gaotona (lead)*, Shai*, Hoid |
| The Legend of Zelda: Breath of the Wild | video game | The world of The Legend of Zelda: Breath of the Wild | Link (lead), Ganon (against), Princess Zelda (ally), Rhoam*, Mipha, Daruk |
| Rascal Does Not Dream | light novel | The world of Rascal Does Not Dream | Mai Sakurajima (lead), Sakuta Azusagawa (against)*, Adolescence Syndrome (ally)* |
| My Hero Academia | comic | The world of My Hero Academia | All Might (lead), Tomura Shigaraki (against)*, Deku*, Katsuki Bakugo, Izuku Midoriya, Shoto Todoroki |
| Infinity Blade: Redemption | novel | Not recorded | Siris (lead)*, Isa (against)*, Uriel*, Adram*, Raidriar* |
| Yu Yu Hakusho | comic | Not recorded | Yusuke Urameshi (lead), Genkai (against), Kazuma Kuwabara (ally), Hiei, Kurama, Koenma |
| Berserk | comic | The world of Berserk | Guts (lead), Griffith (against), Casca (ally), Elfhelm*, Skull Knight, Falconia* |
| Lookism | online | Not recorded | Hyung Seok (lead)*, Daniel Park*, Park Hyung Seok* |
| KonoSuba | light novel | Not recorded | Kazuma Satou (lead), Aqua (against), Megumin (ally), Darkness, Chomusuke, Hyoizaburoo |
| Mushoku Tensei | light novel | The world of Mushoku Tensei | Rudeus Greyrat (lead), Orsted (against)*, Hitogami* |
| The Rising of the Shield Hero | light novel | The world of The Rising of the Shield Hero | Naofumi Iwatani (lead), Cardinal Heroes* |
| WorldEnd | light novel | The world of WorldEnd | The Lead (lead), The Rival (against), The Ally (ally) |
| Black Clover | comic | The world of Black Clover | Asta (lead), Yami Sukehiro*, Yuno (ally)* |
| Re:Zero | light novel | The world of Re:Zero | Subaru Natsuki (lead), Emilia, Rem, Ram, Ferris, Beatrice |
| Eromanga Sensei | light novel | The world of Eromanga Sensei | Sagiri Izumi (lead), Masamune Izumi, Elf Yamada |
| Undertale | video game | The Underground | Asgore Dreemurr (lead), Flowey (against), Toriel (ally), Asriel Dreemurr, Alphys, Chara |
| Mistborn: The Bands of Mourning | novel | Dulsing* | Wax (lead)*, Edwarn Ladrian (against)*, Marasi*, Wayne*, Harmony*, Kelesina Shores* |
| Fox Spirit Matchmaker | online | Not recorded | The Fox (lead)*, The Rival (against) |
| That Time I Got Reincarnated as a Slime | light novel | Not recorded | Rimuru Tempest (lead), Satoru Mikami, Veldora Tempest, Milim Nava, Abiru, Adalman |
| Violet Evergarden | light novel | Not recorded | Violet Evergarden (lead), Alberta, Cattleya Baudelaire, Charlotte Abelfreyja Drossel, Damian Baldur Flugel |
| Unfettered | novel | The world of Unfettered | Shawn Speakman (lead)*, Patrick Rothfuss (against)*, Terry Brooks (ally)* |
| Mistborn: Secret History | novel | The world of Mistborn: Secret History | Kelsier (lead)*, Ruin*, Preservation*, Vin*, Marsh*, Spook* |
| Pepper&Carrot | online | Acren | Pepper (lead), Carrot, Cayenne, Coriander, Saffron, Shichimi |
| Demon Slayer: Kimetsu no Yaiba | comic | The world of Demon Slayer: Kimetsu no Yaiba | Tanjirō Kamado (lead), Nezuko Kamado, Muzan Kibutsuji, Tamayo*, Zenitsu Agatsuma, Inosuke Hashibira |
| Classroom of the Elite | light novel | Not recorded | Kikyō Kushida (lead)*, Suzune Horikita* |
| Under One Person | online | The world of Under One Person | Chou Soran (lead)*, Fu Hōhō (against)*, Feng Baobao (ally), Zhang Chulan |
| Naruto | comic | Naruto World | Sasuke Uchiha (lead), Itachi Uchiha (against), Madara Uchiha, Obito Uchiha, Konoha*, Kakashi Hatake |
| Time Prisoners | online | The world of Time Prisoners | Mi Liu (lead)*, The Rival (against) |
| Tawawa on Monday | online | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| Red Dead Redemption 2 | video game | United States | Arthur Morgan (lead), Dutch van der Linde (against), John Marston (ally), Micah*, Abigail*, Jack* |
| Alcatraz Versus the Dark Talent | novel | The world of Alcatraz Versus the Dark Talent | Grandpa Smedry (lead)*, Dif Smedry*, Smedry Talent* |
| World's End Harem | online | The world of World's End Harem | Reito Mizuhara (lead)*, Virus (against)*, Man Killer (ally)* |
| Arcanum Unbounded: The Cosmere Collection | novel | The world of Arcanum Unbounded: The Cosmere Collection | Secret History (lead)*, White Sand* |
| Oathbringer | novel | Urithiru* | Shallan (lead)*, Adolin (against)*, Dalinar Kholin*, Kaladin*, Eshonai*, Roshar* |
| One Piece | comic | The world of One Piece | Monkey D. Luffy (lead), Page One, Red King, Piece*, Devil Dias, Roronoa Zoro |
| Far Cry 5 | video game | Hope County | Joseph Seed (lead)*, Joey Hudson (against)*, John*, Jacob*, Sheriff Earl Whitehorse*, Faith* |
| Killing Stalking | online | Not recorded | Oh Sangwoo (lead)*, Yoon Bum (against)* |
| The Apothecary Diaries | light novel | Not recorded | Maomao (lead), Jinshi, Imperial China*, Ah-Duo, Fengxian, Gaoshun |
| Eren the Southpaw | online | Not recorded | Kōichi Asakura (lead)*, Eren Yamagishi (against)* |
| Jujutsu Kaisen | comic | The world of Jujutsu Kaisen | Yuji Itadori (lead), Ryōmen Sukuna (against), Megumi Fushiguro (ally), Satoru Gojo, Kenjaku*, Mahito |
| Skyward | novel | The world of Skyward | Spensa (lead)*, M-Bot*, Rodge (ally)*, Cobb*, Hurl*, Admiral Ironsides* |
| Genshin Impact | video game | Teyvat* | Traveler (lead), Ronova*, Paimon (ally), Anastasya*, Raiden Shogun, Aloy |
| Spy × Family | comic | Not recorded | Anya Forger (lead), Yor Forger, Yuri Briar, Twilight*, Loid Forger, Bond Forger |
| Chainsaw Man | comic | Hell | Denji (lead), Yoru (against)*, Power (ally), Pochita*, Asa Mitaka*, Makima |
| Hell's Paradise: Jigokuraku | online | The world of Hell's Paradise: Jigokuraku | Tensen (lead)*, Gabimaru, Yamada Asaemon Sagiri, Yamada Asaemon Eizen, Yamada Asaemon Fuchi, Yamada Asaemon Genji |
| Life Lessons with Uramichi Oniisan | online | Not recorded | Uramichi Omota (lead)*, The Rival (against) |
| Summer Time Rendering | online | Not recorded | Ushio (lead)*, Shinpei Ajiro*, Mio* |
| Heartstopper | online | Not recorded | Nick Nelson (lead), Charlie Spring (against), Ben Hope (ally), Tori Spring |
| Starsight | novel | The world of Starsight | Spensa (lead)*, Winzik (against)*, Brade*, Cuna*, Alanik*, Detritus* |
| Rhythm of War | novel | The world of Rhythm of War | Kaladin (lead)*, Navani*, Dalinar*, Venli*, Adolin*, Odium* |
| Why Raeliana Ended Up at the Duke's Mansion | online | Not recorded | Raeliana McMillan (lead)*, Eunha Park (against)*, Noah Volstaire Wynknight (ally)* |
| Cherry Magic! Thirty Years of Virginity Can Make You a Wizard?! | online | Not recorded | Yuichi Kurosawa (lead)*, Kiyoshi Adachi (against)* |
| Pseudo Harem | online | Not recorded | Eiji Kitahama (lead)*, Rin Nanakura* |
| I Think I Turned My Childhood Friend into a Girl | online | Not recorded | Hiura Mihate (lead)*, Kenshiro Mido (against)* |
| Sweet Home | online | The world of Sweet Home | Cha Hyun-soo (lead)*, Du-sik*, Lee Eun-hyuk*, Ahn Gil-seop*, Shin Joong-seop*, Byung-il* |
| Alya Sometimes Hides Her Feelings in Russian | light novel | Not recorded | Masachika Kuze (lead), Alisa Mikhailovna Kujō |
| ZooPhobia | online | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| Cytonic | novel | The world of Cytonic | Spensa (lead)*, M-Bot*, Chet (ally)*, Hesho* |
| Viral Hit | online | Not recorded | Yoo Ho-bin (lead)*, Woo Ji-hyuk (against)* |
| Takopi's Original Sin | online | The world of Takopi's Original Sin | Shizuka Kuze (lead), Takopi, Marina Kirarazaka (ally), Naoki Azuma, Chappy* |
| Mistborn: The Lost Metal | novel | Elendel* | Wax (lead)*, Autonomy*, Wayne (ally)*, Marasi*, Telsin* |
| The Summer Hikaru Died | online | Japan | Yoshiki (よしき) (lead), Yamagishi Asako (山岸朝子), Tanaka (田中), "Hikaru" (ヒカル), Maki Yuuta (巻ゆうた), Tadokoro Yuuki (田所結希) |
| Tress of the Emerald Sea | novel | The world of Tress of the Emerald Sea | Charlie (lead)*, Crow*, Huck*, Hoid*, Ann*, Fort* |
| Doctor Elise | online | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| A Returner's Magic Should Be Special | online | Not recorded | Desir Herrman (lead)*, The Rival (against) |
| Yumi and the Nightmare Painter | novel | Komashi | Yumi (lead), Hoid, Nikaro (ally) |
| The Guy She Was Interested In Wasn't a Guy at All | online | Not recorded | Aya Osawa (lead), Mitsuki Koga (against), Chizuru (ally), Joe, Kanna, Mao |
| The Sunlit Man | novel | The world of The Sunlit Man | Nomad (lead)*, Canticle*, Zellion* |
| Wind and Truth | novel | Not recorded | Szeth (lead)*, Shallan*, Kaladin (ally)*, Dalinar*, Odium*, Adolin* |
