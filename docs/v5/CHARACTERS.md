# Characters In Adapted Briefs: The Sweep

On November 13, 2026, the owner asked: "Fix O'Brien and Dracula's lead too, and make sure to a complete sweep again
and make sure all adaptations have their real characters and 100% accuracy."

This is that sweep. Every one of the 517 works with a story was proposed as a feature film. The table lists the
setting and the people the brief proposes, in order, with the role the story gives them:

- (lead) is the one the story names most;
- (against) is someone the story shows against the lead;
- (ally) is someone the story shows beside them.

A setting marked * is read from the story. A name marked * is not recorded in Wikidata. It is taken from the story's own words, and its pronouns are "they"
until the player sets them.

## What Changed

- **People from the story** (`storyPeople` in `src/engine/story-structure.ts`).
  - 199 works with a story had no character recorded. They were given "The Lead", "The Rival" and "The Ally",
    Julius Caesar and David Copperfield among them.
  - The story's own people are now taken from it. A name counts if it's used three times, or twice in full.
  - These are left out: places, peoples, groups, words that start sentences, and voice actors' credits.
  - Names are broken at punctuation, so "Dutch, Arthur, Bill and Javier" is four people.
  - A first name or surname alone is joined to the full name it belongs to.
  - The story's people also join the recorded ones: Red Dead Redemption 2 gains Micah, Abigail and Jack.
  - 376 briefs now have someone taken from their story.
- **Pronouns are never guessed.** Reading them from the sentences around a name came out wrong too often (John Seward
  as "she", Lenore as "he"), and a wrong guess misnames a real character.
- **Names.**
  - A character is counted by first name and surname after a title.
  - A possessive is not a name.
  - A creature is called what the story calls it ("the whale", "the creature").
  - Someone named only alongside the lead's sentence carries over from the sentence before it.
- **The setting.** Where no place is recorded, the place the story names most as where things happen is proposed:
  Julius Caesar is set in Rome, Doctor Zhivago in Moscow, The Unbearable Lightness of Being in Prague. That place is also where the scenes
  are. 38 works are set this way. Three of these are names, not places: Susan, Charles and Doc Scratch. They are
  listed under what isn't right.
- **The logline.** A connective that leans on the sentence before ("Meanwhile, Cassius attempts…") is taken off.
- **The lead.** Dracula is led by the Count, who is now counted by "Dracula", not only "Count Dracula". A group
  recorded as a character ("Brides of Dracula") no longer takes his name from him.
- **Against and beside.** O'Brien, whose betrayal comes in the sentence before "Winston is starved and relentlessly
  tortured", now stands against Winston. Torture, starving and re-education count. Someone is an ally only where the
  story shows it, as a rival must be. 236 briefs have someone against the lead.

## What Isn't Right Yet

The reading is of sentences, not of who does what to whom. "100% accuracy" isn't claimed. These are known:

- **29 works still have only placeholders,** and 65 more have one or two.
  - Some stories name no one: The Tell-Tale Heart's narrator, Blindness's characters.
  - Others are told about play ("the player controls") or are too short.
- **Places, things and peoples still read as people in some works:** Kyrat (Far Cry 4), Luthadel (Mistborn), the
  Cornucopia (The Hunger Games), Athenian (Timon of Athens), Denizens (Shakugan no Shana).
  - A stricter test, that a name must do something in one sentence of four, dropped real leads (Yuri Zhivago, Rachel
    Sexton, Rue), so it was taken out.
- **Some roles are the sentences' and not the story's:**
  - Hamlet's Polonius reads as his ally (from "love").
  - The Tempest's Ariel reads as against Prospero.
  - Metal Gear Solid is led by Liquid Snake, because "Snake" alone can't be told apart.
- **Some settings are a person's name** where the story says "to Susan" or "to Charles" (The Adventure of the
  Cardboard Box, The Adventure of the Musgrave Ritual), and Homestuck is set at "Doc Scratch".
- **One person under two names** is two people where nothing joins them: Don Quixote and Alonso Quijano, Kira and
  Light Yagami.

## Every Work With A Story

| Work | Medium | Setting | Proposed People |
|---|---|---|---|
| Don Quixote | novel | Barcelona | Quixote (lead)*, Sancho Panza, Dulcinea, Cardenio, Alonso Quijano, Rocinante |
| Death Note | comic | Not recorded | Light Yagami (lead), L (against), Kira*, Near, Misa Amane, Mello |
| Uncle Tom's Cabin | novel | Not recorded | Uncle Tom (lead), Eliza*, Simon Legree, George Shelby*, Little Eva, Cassy* |
| Gone with the Wind | novel | Atlanta | Scarlett O'Hara (lead), Ashley Wilkes, Melanie Hamilton (ally), Rhett Butler |
| Ulysses | novel | #7 Eccles street | Stephen Dedalus (lead), Buck Mulligan, Garrett Deasy, Molly Bloom, Leopold Bloom, Martha Clifford |
| Dream of the Red Chamber | novel | China | Jia Baoyu (lead), Lin Daiyu, Xue Baochai, Wang Xifeng, Hua Xiren, Jia Qiaojie |
| Mahabharata | poem | Not recorded | Bhishma (lead)*, Pandu*, Vyasa*, Kunti*, Dhritarashtra*, Satyavati* |
| Super Mario Bros. | video game | Mushroom Kingdom | Bowser (lead), Mario, Luigi, Toad, Princess Peach, Goomba |
| The Hunger Games | novel | Panem | Katniss Everdeen (lead), Rue*, Peeta Mellark (ally), Cato*, Haymitch Abernathy, Effie Trinket |
| Snow White | short story | The world of Snow White | Snow White (lead), The Prince (against), Magic Mirror, Evil Queen, Seven Dwarfs, Huntsman |
| The Little Mermaid | short story | The world of The Little Mermaid | Little Mermaid (lead), The Sea Witch, Prince |
| The Snow Queen | short story | The world of The Snow Queen | Gerda (lead), The Snow Queen, Kai (ally)*, Kay, Reindeer Bae, robber‐maiden |
| The Wild Swans | short story | The world of The Wild Swans | Elisa (lead)*, The Rival (against), The Ally (ally) |
| Grand Theft Auto V | video game | Not recorded | Michael De Santa (lead), Trevor Philips (against), Franklin Clinton, Steve Haines*, Dave Norton*, Devin Weston* |
| Fairy Tail | comic | The world of Fairy Tail | Zeref (lead)*, Natsu Dragneel (against), Acnologia*, Fairy Tail*, Igneel*, Lucy Heartfilia* |
| Waiting for Godot | play | Not recorded | Vladimir (lead), Lucky, Estragon, Pozzo |
| The Raven | poem | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| The Little Prince | short story | The world of The Little Prince | the little prince (lead), the rose, The Ally (ally) |
| The Old Man and the Sea | short story | Cuba | Santiago (lead), Manolin*, Marlin |
| Othello | play | Venice | Iago (lead), Michael Cassio (against), Othello, Desdemona, Roderigo, Brabantio |
| Sword Art Online | light novel | The world of Sword Art Online | Asuna Yūki (lead), Kazuto (against)*, Kirito (ally), Nobuyuki Sugou*, Eugeo*, Shino Asada |
| Paradise Lost | poem | Not recorded | Adam (lead), Eve, Satan, Michael, Mankind*, God the Son |
| Fathers and Sons | novel | Russia | Yevgeni Bazarov (lead), Anna Sergevna Odintsova*, Arkady Nikolayevitch Kirsanov (ally), Nikolay*, Katya*, Pavel* |
| Odyssey | novel | Mediterranean Sea | Odysseus (lead), Penelope, Athena (ally), Telemachus, Zeus, Hermes |
| The Trial | novel | The world of The Trial | K (lead)*, Fräulein Bürstner (against)*, Huld*, Karl*, Rudi Block*, Josef K. |
| Ramayana | poem | Ayodhyā* | Rāma (lead)*, Lakṣmaṇa*, Sītā (ally)*, Rāvaṇa, Daśaratha*, Kaikeyī* |
| Dracula | novel | Bistrița | Count Dracula (lead), John Seward (against), Mina Harker, Lucy Westenra, Abraham Van Helsing, Quincey Morris |
| Hamlet | play | Denmark | Prince Hamlet (lead), King Claudius (against), Polonius (ally), Laertes, Ophelia, Gertrude |
| Harry Potter and the Philosopher's Stone | novel | England | Harry Potter (lead), Lord Voldemort (against), Hermione Granger, Quirrell*, Ron Weasley, Severus Snape |
| The Tenant of Wildfell Hall | novel | Yorkshire | Helen (lead)*, Huntingdon*, Gilbert (ally)* |
| The Hound of the Baskervilles | novel | Dartmoor | Henry Baskerville (lead), Sherlock Holmes, Beryl Stapleton (ally)*, Dr. Watson, James Mortimer*, Eliza Barrymore* |
| Charlotte's Web | novel | The world of Charlotte's Web | Wilbur (lead)*, Homer Zuckerman (against)*, Charlotte (ally)*, Fern*, Templeton*, John Arable* |
| Harry Potter and the Goblet of Fire | novel | Hogwarts Castle | Harry Potter (lead), Cedric Diggory (against), Ron Weasley, Lord Voldemort, Albus Dumbledore, Moody* |
| Harry Potter and the Deathly Hallows | novel | Forest of Dean | Harry Potter (lead), Voldemort (against)*, Ron Weasley, Hermione Granger, Dumbledore* |
| Harry Potter and the Half-Blood Prince | novel | Hogwarts Castle | Harry Potter (lead), Severus Snape (against), Albus Dumbledore, Ron Weasley, Draco Malfoy, Hermione Granger |
| Harry Potter and the Chamber of Secrets | novel | Chamber of Secrets | Harry Potter (lead), Ron Weasley, Dobby, Gilderoy Lockhart, Riddle*, Ginny Weasley |
| Harry Potter and the Prisoner of Azkaban | novel | Hogsmeade | Harry Potter (lead), Sirius Black (against)*, Hermione Granger, Ron Weasley, Hagrid*, Buckbeak* |
| Orlando Furioso | poem | The world of Orlando Furioso | Orlando (lead), Agramante (against), Angelica (ally), Ruggiero, Rodomonte, Bradamante |
| Cardcaptor Sakura | comic | Hong Kong* | Sakura Kinomoto (lead), Clow Reed, Syaoran Li (ally), Yue, Eriol Hiiragizawa, Yukito Tsukishiro |
| The Elder Scrolls IV: Oblivion | video game | Weynon Priory* | Martin (lead)*, Dagon (against)*, Uriel Septim*, Jauffre*, Vaermina |
| Eugene Onegin | novel | Not recorded | Eugene Onegin (lead), Vladimir Lensky (against), Tatyana Larina, Olga, Author-narrator |
| Accel World | light novel | Not recorded | Kuroyukihime (lead), Brain Burst*, Haruyuki*, Chiyuri Kurashima |
| From the Earth to the Moon | novel | Baltimore | Impey Barbicane (lead)*, Michel Ardan*, Nicholl* |
| Breaking Dawn | novel | Washington | Bella Swan (lead), Jacob (against)*, Edward Cullen, Renesmee Cullen, Alice*, Irina* |
| BioShock | video game | The world of BioShock | Jack (lead)*, Fontaine (against)*, Ryan*, Atlas*, Brigid Tenenbaum* |
| Mafia II | video game | Empire Bay | Vito Scaletta (lead), Leo Galante (against)*, Joe Barbaro*, Carlo Falcone*, Henry*, Derek Pappalardo* |
| Maus | comic | Modrzejowska street in Sosnowiec | Vladek (lead)*, Art Spiegelman*, Anja*, Richieu*, Mala* |
| Aeneid | poem | Not recorded | Aeneas (lead), Juno, Dido, Venus, Ascanius, Creusa |
| Sophie's World | novel | Not recorded | Sophie Amundsen (lead), Alberto Knox (against)*, Albert Knag*, Hilde* |
| Boule de Suif | short story | Le Havre* | The Lead (lead), The Rival (against), The Ally (ally) |
| Journey to the West | novel | China | Zhu Bajie (lead), Sun Wukong, Queen Mother of the West, Sha Wujing, White Dragon Horse, Chang'e |
| The Romance of the Three Kingdoms | novel | Not recorded | Cao Cao (lead)*, Liu Bei (against)*, Dong Zhuo*, Yuan Shao*, Lü Bu*, Jin* |
| Water Margin | novel | Liangshan Marsh* | Song Jiang (lead), Chao Gai*, Gao Qiu*, Wang Jin*, Ximen Qing, Yang Jian |
| The Legend of Sleepy Hollow | short story | Not recorded | Ichabod Crane (lead), Brom Bones*, Katrina Van Tassel* |
| The Hobbit | novel | Middle-earth | Bilbo Baggins (lead), Thorin Oakenshield, Gandalf (ally), Smaug, Gollum, Beorn |
| And Quiet Flows the Don | novel | Russian Empire | Grigori Melekhov (lead), Natalya Melekhova, The Ally (ally) |
| Call of Duty 4: Modern Warfare | video game | Azerbaijan | Imran Zakhaev (lead)*, John Price (against)*, Khaled Al-Asad*, Griggs*, Kamarov*, Marines* |
| Harry Potter and the Order of the Phoenix | novel | Forbidden Forest | Harry Potter (lead), Voldemort (against)*, Dumbledore*, Dolores Umbridge*, Sirius Black*, Death Eaters* |
| Azumanga Daioh | comic | Not recorded | Chiyo Mihama (lead), Koyomi Mizuhara (against), Sakaki (ally), Ayumu Kasuga, Minamo Kurosawa, Tomo Takino |
| The Da Vinci Code | novel | Paris | Robert Langdon (lead), Sophie Neveu, Jacques Saunière*, Bezu Fache*, Silas*, Bishop Aringarosa* |
| The Picture of Dorian Gray | novel | England | Dorian Gray (lead), Sibyl Vane (against), Basil Hallward (ally)*, Lord Henry Wotton |
| Romeo and Juliet | play | Mantua | Romeo (lead), Tybalt (against), Juliet (ally), Lady Capulet, Count Paris, Mercutio |
| Grand Theft Auto: San Andreas | video game | Las Venturas | Big Smoke (lead), Frank Tenpenny, Sweet*, Cesar Vialpando, Ryder, Michael Toreno |
| We | novel | The world of We | D-503 (lead)*, I-330*, O-90* |
| The Tempest | play | Not recorded | Prospero (lead), Ariel (against), Miranda (ally), Alonso, Antonio, Caliban |
| Alice's Adventures in Wonderland | novel | Wonderland | Alice (lead), The Hatter, White Rabbit, Cheshire Cat, Caterpillar, Duchess |
| Grand Theft Auto: Vice City | video game | Vice City | Tommy Vercetti (lead), Lance Vance (against), Juan Garcia Cortez (ally)*, Sonny Forelli, Ricardo Diaz, Ken Rosenberg |
| Grand Theft Auto IV | video game | Liberty City | Niko Bellic (lead), Dimitri Rascalov (against)*, Roman Bellic, Jimmy Pegorino*, Kenny Petrović*, Mallorie* |
| A Midsummer Night's Dream | play | Athens | Titania (lead), Lysander, Nick Bottom, Theseus*, Oberon, Hermia |
| Second Life | video game | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| Poor Folk | novel | Russian Empire | Varvara Dobroselova (lead), Makar Devushkin, Pokrovsky*, Anna Fyodorovna* |
| Shakugan no Shana | light novel | The world of Shakugan no Shana | Denizens (lead)*, Shana, Flame Hazes*, Yūji Sakai, Kazumi Yoshida |
| Crayon Shin-chan | comic | Not recorded | Shinnosuke Nohara (lead), Ume Matsuzaka, Hiroshi Nohara, Misae Nohara, Himawari Nohara, Action Mask |
| Lolita | novel | New England | Humbert Humbert (lead), Dolores Haze, Annabel Leigh (ally), Charlotte Haze, Valeria Zborovski, Clare Quilty |
| Love's Labour's Lost | play | Not recorded | Costard (lead)*, Adriano de Armado*, Jaquenetta*, Berowne*, Holofernes* |
| Macbeth | play | Not recorded | Macbeth (lead), King Duncan (against), Banquo, Macduff, Lady Macbeth, Fleance |
| The Wonderful Wizard of Oz | novel | Kansas | Dorothy Gale (lead), Scarecrow, Toto (ally), The Cowardly Lion, Wizard of Oz, Winged monkeys |
| Much Ado About Nothing | play | Italy | Benedick (lead), Claudio, Beatrice (ally), Hero, Don Pedro, Don John |
| Nibelungenlied | poem | Hunnic Empire | Siegfried (lead)*, Hagen (against), Kriemhild (ally)*, Gunther*, Brünhild*, Sigurd |
| The Sound and the Fury | novel | Not recorded | Quentin (lead)*, Caddy*, Benjy*, Jason Compson*, Dilsey Gibson* |
| Germinal | novel | northern French coal mining region | Étienne Lantier (lead), Catherine*, Chaval*, Souvarine* |
| Life is a Dream | play | Poland | Segismundo (lead)*, Clotaldo (against)*, Astolfo (ally)*, Rosaura*, Estrella*, Clarín* |
| The Three Musketeers | novel | Béthune | D'Artagnan (lead), Comte de Rochefort (against), Milady de Winter, Cardinal Richelieu, Athos, Constance Bonacieux |
| The Captain's Daughter | novel | Orenburg Governorate | Pyotr Grinyov (lead), Yemelyan Pugachev (against), Masha (ally)*, Alexey Shvabrin, Maria Mironova |
| Resurrection | novel | Russian Empire | Dmitri Ivanovich Nekhlyudov (lead)*, Katerina Mikhailovna Maslova*, The Ally (ally) |
| Anna Karenina | novel | Russian Empire | Anna Karenina (lead), Alexei Vronsky (against), Stiva (ally)*, Kitty*, Kostya*, Dolly* |
| Oedipus Rex | play | Thebes | Oedipus (lead), Laius (against)*, Jocasta, Creon, Tiresias |
| Grand Theft Auto III | video game | Liberty City | Claude (lead), Catalina (against), Donald Love (ally)*, Maria*, Salvatore Leone, Asuka Kasen |
| Frankenstein; or, The Modern Prometheus | novel | The world of Frankenstein; or, The Modern Prometheus | Victor Frankenstein (lead), Frankenstein's monster (against), Elizabeth Lavenza, Doctor Waldman |
| White Fang | novel | Alaska | White Fang (lead)*, Grey Beaver (against)*, Weedon Scott*, Eye* |
| The Horse and His Boy | novel | Archenland | Shasta (lead), Rabadash, Aravis (ally), Tisroc, Arsheesh*, Corin* |
| War and Peace | novel | Austrian Empire | Pierre Bezukhov (lead), Nikolai Rostov, Andrei Nikolayevich Bolkonsky, Fedor Ivanovich Dolokhov, Vasily Denisov, Boris Drubetskoy |
| The Order of the Stick | online | Not recorded | Roy (lead)*, Gate Xykon*, Elan*, Miko Miyazaki*, Belkar*, Celia* |
| The Stranger | novel | Algeria | Meursault (lead), Céleste, Marie (ally)*, Emmanuel, l'Arabe |
| Initial D | comic | Kantō region | Takumi Fujiwara (lead), Keisuke Takahashi (against), Kōichirō Iketani (ally), Bunta Fujiwara, Project D*, Itsuki Takeuchi |
| Oliver Twist | novel | London | Oliver Twist (lead), Fagin, Brownlow*, Bill Sikes, Nancy, Rose Maylie |
| The Tales of Beedle the Bard | short story | The world of The Tales of Beedle the Bard | Altheda (lead)*, Amata*, Asha (ally)* |
| Crime and Punishment | novel | Saint Petersburg | Rodion Romanovich Raskolnikov (lead), Dunya*, Razumikhin (ally)*, Pyotr Petrovich Luzhin, Semjon Marmeladov, Sonya* |
| The Crab with the Golden Claws | comic | Not recorded | Tintin (lead), Allan Thompson (against), Captain Haddock (ally), Omar Ben Salaad, Thomson*, Snowy |
| Mat' | novel | Not recorded | Pavel Vlasov (lead)*, The Rival (against), The Ally (ally) |
| D.Gray-man | comic | The world of D.Gray-man | Allen Walker (lead)*, Nea*, Mana D*, Innocence*, Apocryphos* |
| Pride and Prejudice | novel | Hertfordshire | Elizabeth Bennet (lead), George Wickham, Jane Bennet (ally), Lydia Bennet, Mr William Collins, Charlotte Lucas |
| The Name of the Rose | novel | Italy | William of Baskerville (lead), Jorge de Burgos, Adso of Melk, Malachi*, Berengar*, Adelmo* |
| Moby-Dick | novel | Pacific Ocean | Captain Ahab (lead), Moby Dick (against), Queequeg, Ishmael, Fedallah*, Stubb* |
| One Hundred Years of Solitude | novel | Macondo | José Arcadio (lead)*, José Arcadio Buendía (against)*, Aureliano Segundo*, Rebeca*, Fernanda del Carpio*, Úrsula Iguarán* |
| The Alchemist | novel | Andalusia | Santiago (lead)*, The Rival (against), The Ally (ally) |
| Les Misérables | novel | Digne-les-Bains | Jean Valjean (lead), Fantine, Javert, Cosette, Bishop Myriel, Éponine |
| Gulliver's Travels | novel | Balnibarbi | Lemuel Gulliver (lead), Glumdalclitch, Houyhnhnm, Yahoo, Struldbrugg |
| King Lear | play | Not recorded | Lear (lead), Edmund, Goneril, Edgar*, Gloucester*, Regan |
| Inuyasha | comic | The world of Inuyasha | Inuyasha (lead), Kagome Higurashi, Naraku*, Per Kikyo*, Kohaku*, Sesshomaru |
| Angels & Demons | novel | CERN | Camerlengo Carlo Ventresca (lead)*, Robert Langdon, Vittoria Vetra, Maximilian Kohler*, Cardinal Saverio Mortati* |
| Date A Live | light novel | Not recorded | Shido Itsuka (lead), Kotori Itsuka, Isaac Ray Pelham Westcott, Kurumi Tokisaki, Tohka Yatogami, Ai Yamabuki |
| The Brothers Karamazov | novel | Russian Empire | Dmitri Karamazov (lead), Ivan Karamazov, Alyosha Karamazov, Pavel Smerdyakov, Fyodor Karamazov, Father Zosima |
| Troilus and Cressida | play | Not recorded | Hector (lead)*, Achilles (against)*, Cressida, Pandarus*, Ajax*, Aeneas* |
| Twenty Thousand Leagues Under the Sea | novel | Atlantic Ocean | Captain Nemo (lead), Pierre Aronnax (against), Ned Land, Nautilus*, Conseil, Farragut |
| The Catcher in the Rye | novel | New York City | Holden Caulfield (lead), Phoebe Caulfield, Jane Gallagher*, Antolini* |
| Metamorphoses | poem | Not recorded | Perseus (lead)*, Ovid*, Achilles*, Medea*, Rome*, Scylla* |
| Treasure Island | novel | Hispanic America | Jim Hawkins (lead), Long John Silver (against), Captain Flint, Dr. Livesey, Billy Bones, Ben Gunn |
| The Song of Roland | poem | Spanish march | Roland (lead), Charlemagne (against)*, Oliver (ally)*, Ganelon*, Marsile*, Pinabel* |
| Eragon | novel | Alagaësia | Eragon (lead), Murtagh (against)*, Saphira*, Durza*, Brom*, Ajihad* |
| The Master and Margarita | novel | Alexander Garden | Woland (lead), Yeshua Ha-Notsri, Margarita, Pilate*, Satan*, Azazello |
| Twilight | novel | Forks | Bella Swan (lead), Edward Cullen, James*, Jacob Black, Alice Cullen |
| Fullmetal Alchemist | comic | The world of Fullmetal Alchemist | Edward Elric (lead), Alphonse Elric, Roy Mustang*, Greed*, Lin Yao*, Van Hohenheim* |
| David Copperfield | novel | England | David (lead)*, Edward Murdstone (against)*, Agnes (ally)*, Uriah Heep*, Clara Peggotty*, Emily* |
| Dune | novel | Arrakis | Leto I Atreides (lead), Wellington Yueh (against), Paul Atreides (ally), Lady Jessica, Piter De Vries, Duncan Idaho |
| The Satanic Verses | novel | India* | Gibreel Farishta (lead)*, Saladin Chamcha (against)*, The Ally (ally) |
| The Hunchback of Notre Dame | novel | Cour des miracles | Esmeralda (lead), Captain Phoebus (against), Pierre Gringoire (ally), Quasimodo, Sister Gudule, Louis XI of France |
| New Moon | novel | Washington | Bella Swan (lead), Jacob Black, Edward Cullen (ally)*, Alice Cullen* |
| The Count of Monte Cristo | novel | Château d'If | Fernand Mondego (lead), Gaspard Caderousse, Abbe Faria, Albert de Morcerf, Benedetto, Giovanni Bertuccio |
| Brave New World | novel | London | John (lead)*, Bernard Marx*, Linda*, Lenina Crowne*, Helmholtz Watson* |
| The Red and the Black | novel | Besançon | Julien Sorel (lead), Rênal*, Mathilde (ally)* |
| Madame Bovary | novel | Yonville | Emma Bovary (lead), Berthe*, Charles Bovary (ally), Léon Dupuis*, Rodolphe Boulanger* |
| Half-Life 2 | video game | Black Mesa East | Gordon Freeman (lead), Judith Mossman, Alyx Vance, Eli Vance, Wallace Breen, Isaac Kleiner |
| Thus Spoke Zarathustra | novel | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| Assassin's Creed | video game | Holy Land | Altaïr (lead)*, Al Mualim (against)*, Desmond Miles*, Robert de Sablé*, Malik*, Warren Vidic* |
| For Whom the Bell Tolls | novel | Spain | Robert Jordan (lead)*, Pablo (against)*, María* |
| Fahrenheit 451 | novel | United States | Guy Montag (lead), Mildred*, Clarisse McClellan, Beatty*, Faber* |
| Deception Point | novel | Arctic | Rachel Sexton (lead)*, Michael Tolland*, Marjorie Tench*, Senator Sexton* |
| Wuthering Heights | novel | Yorkshire | Heathcliff (lead), Edgar Linton (against), Lockwood, Nelly Dean, Hindley Earnshaw, Hareton Earnshaw |
| Tartuffe | play | Not recorded | Orgon (lead), Tartuffe (against), Mariane (ally), Elmire, Damis, Valère |
| The Merchant of Venice | play | Venice | Shylock (lead), Antonio, Bassanio, Portia, Gratiano, Duke of Venice |
| Doctor Zhivago | novel | Moscow* | Yuri (lead)*, Amalia Karlovna Guichard*, Nikolai Nikolaevich*, Victor Ippolitovich Komarovsky*, Kiprian Savelyevich Tiverzin*, Misha Grigorievich Gordon* |
| All Quiet on the Western Front | novel | Northern France | Paul Bäumer (lead)*, Albert*, Kat* |
| Call of Duty: World at War | video game | Berlin | Dimitri Petrenko (lead)*, Viktor Reznov (against)*, Miller*, Corporal Roebuck*, Heinrich Amsel* |
| Warcraft III: Reign of Chaos | video game | Kalimdor* | Arthas (lead)*, Kel'Thuzad*, Thrall*, Archmage Jaina Proudmoore*, Grom Hellscream*, Mannoroth* |
| Digital Fortress | novel | Seville* | Ensei Tankado (lead)*, Susan Fletcher (against)*, Commander Trevor Strathmore*, Digital Fortress*, David Becker*, Hulohot* |
| The Fellowship of the Ring | novel | Middle-earth | Frodo Baggins (lead), Strider*, Gandalf (ally), Bilbo Baggins, Elrond*, Galadriel* |
| Peer Gynt | play | Norway | Peer Gynt (lead), Solveig, Ingrid Hegstad, The Mountain King, Anitra, Aslak |
| Nineteen Eighty-Four | novel | London | Winston Smith (lead), O'Brien (against), Julia, Big Brother, Emmanuel Goldstein, Charrington |
| The Good Soldier Švejk | novel | Central and Eastern Europe | Josef Švejk (lead), Otto Katz*, Baloun |
| Call of Duty 2 | video game | France | The Lead (lead), The Rival (against), The Ally (ally) |
| The Idiot | novel | Russian Empire | Ganya (lead)*, Nastasya Filipovna, Parfyon Rogozhin, Prince Myshkin, Aglaya*, Lizaveta Prokofyevna* |
| The Lost Symbol | novel | Washington, D.C. | Peter Solomon (lead)*, Robert Langdon (against), Mal'akh*, Inoue Sato*, Warren Bellamy*, Zachary* |
| Assassin's Creed II | video game | Florence | Ezio (lead)*, Rodrigo Borgia (against)*, Desmond Miles*, Checco*, Mario* |
| To Kill a Mockingbird | novel | Alabama | Scout Finch (lead), Atticus Finch, Boo Radley, Jem Finch, Tom Robinson*, Dill* |
| Eclipse | novel | Seattle | Bella Swan (lead), Edward Cullen, Jacob Black (ally)*, Victoria* |
| The Threepenny Opera | play | London | Macheath (lead)*, Tiger Brown (against)*, Polly (ally)*, Peachum* |
| The Magic Mountain | novel | Davos | Hans Castorp (lead)*, The Rival (against), The Ally (ally) |
| The War of the Worlds | novel | The world of The War of the Worlds | West London (lead)*, Wells*, Narrator |
| And Then There Were None | novel | Devon | Philip Lombard (lead)*, Vera Claythorne*, Armstrong*, Justice Wargrave*, William Blore* |
| Final Fantasy VII | video game | http://www.wikidata.org/.well-known/genid/647f4b0c1ca918cff75315979d5a6924 | Sephiroth (lead), Cloud Strife (against), Jenova*, President Shinra*, Aerith Gainsborough, Meteor* |
| The Great Gatsby | novel | New York City | Jay Gatsby (lead), George B. Wilson (against), Daisy Buchanan (ally), Nick Carraway, Tom Buchanan, Myrtle Wilson |
| Elfen Lied | comic | The world of Elfen Lied | Diclonius (lead)*, Diclonii*, Lucy* |
| Adventures of Huckleberry Finn | novel | Arkansas | Huck (lead)*, Jim (against), Tom Sawyer, Pap*, Miss Watson, Peter Wilks* |
| Julius Caesar | play | Rome* | Julius Caesar (lead)*, Brutus (against)*, Mark Antony*, Cassius*, Casca* |
| S.T.A.L.K.E.R.: Shadow of Chernobyl | video game | Ukraine | Kill Strelok (lead)*, Doc*, Pripyat*, Sidorovich* |
| The Grapes of Wrath | novel | Arvin Federal Government Camp | Tom Joad (lead)*, Jim Casy*, Ma Joad*, Muley Graves* |
| Fruits Basket | comic | Not recorded | Tohru Honda (lead), Yuki Sohma*, Kyo Sohma* |
| Rurouni Kenshin | comic | Not recorded | Himura Kenshin (lead)*, Yukishiro Enishi (against)*, Kamiya Kaoru (ally)*, Shishio Makoto*, Hitokiri Battōsai*, Oniwabanshū* |
| Super Mario 64 | video game | Mushroom Kingdom | Mario (lead), Bowser (against), Princess Peach, Goomba, Koopa Troopa, Boo |
| Steppenwolf | novel | Not recorded | Harry Haller (lead)*, Hermine*, Pablo* |
| Strange Case of Dr Jekyll and Mr Hyde | novel | London | Dr Jekyll (lead), Mr. Utterson, Mr Hyde (ally), Dr. Lanyon, Mr. Enfield, Mr. Poole |
| My Youth Romantic Comedy Is Wrong, as I Expected | light novel | Not recorded | Yukino Yukinoshita (lead), Hachiman Hikigaya (against), Yui Yuigahama (ally), Haruno Yukinoshita, Hayato Hayama, Hina Ebina |
| Prince Caspian | novel | Archenland | Prince Caspian (lead), Miraz, Susan Pevensie, Aslan, Lucy Pevensie, Peter Pevensie |
| A Journey to the Centre of the Earth | novel | Church of Our Saviour | Professor Otto Lidenbrock (lead), Hans Bjelke, Axel (ally)*, Arne Saknussemm, Phileas Fogg, Graüben |
| Great Expectations | novel | Kent | Pip (lead), Joe Gargery*, Estella (ally), Miss Havisham, Herbert Pocket*, Bentley Drummle* |
| Shaman King | comic | Not recorded | Yoh Asakura (lead), Shaman (against)*, Hao Asakura, Great Spirit, Anna Kyoyama, Lyserg Diethel |
| Through the Looking-Glass | novel | The world of Through the Looking-Glass | Alice (lead), Red Queen, White Knight (ally), White Queen, Humpty Dumpty, Tweedledum and Tweedledee |
| Need for Speed: Most Wanted | video game | United States | Razor (lead)*, Mia Townsend (against)*, Jonathan Cross*, Bull*, Rog* |
| Twelfth Night | play | Not recorded | Olivia (lead), Orsino, Cesario (ally)*, Malvolio, Sebastian, Viola |
| Chobits | comic | The world of Chobits | Chi (lead)*, Hideki*, Chii |
| A Study in Scarlet | novel | London | Enoch J. Drebber (lead), Joseph Stangerson (against)*, Sherlock Holmes, Jefferson Hope*, Lucy*, Dr. Watson |
| Hellsing | comic | The world of Hellsing | Integra Fairbrook Wingates Hellsing (lead)*, Millennium*, The Ally (ally) |
| The Gambler | novel | Europe | Alexei (lead)*, Astley*, Polina (ally)*, Des Grieux*, Grandmother*, Mademoiselle Blanche* |
| Emma | novel | Southern England | Emma Woodhouse (lead)*, Jane Fairfax*, Harriet Smith (ally)*, Frank Churchill*, Knightley*, Bates* |
| The Murder of Roger Ackroyd | novel | Fernly Park* | James Sheppard (lead)*, Hercule Poirot, Flora*, Ferrars*, Parker*, Blunt* |
| The Final Problem | short story | London | Sherlock Holmes (lead), Professor Moriarty (against), Dr. Watson |
| The Two Gentlemen of Verona | play | Milan* | Proteus (lead)*, Valentine*, Julia (ally)*, Silvia*, Thurio* |
| Doraemon | comic | The world of Doraemon | Nobita Nobi (lead), Gian*, Shizuka Minamoto (ally), Doraemon, Suneo Honekawa, Dorami |
| As You Like It | play | Not recorded | Rosalind (lead), Ganymede*, Orlando (ally), Celia, Oliver*, Phebe* |
| Père Goriot | novel | France | Eugène de Rastignac (lead), Vautrin (against), Jean-Joachim Goriot, Delphine de Nucingen, Anastasie de Restaud, Vicomtesse de Beauséant |
| Antigone | play | Thebes | Creon (lead), Antigone (against), Haemon, Eurydice of Thebes, Polynices*, Tiresias |
| The Godfather | novel | Las Vegas* | Michael Corleone (lead), Vito Corleone, Virgil Sollozzo*, Sonny Corleone, Tom Hagen, Peter Clemenza |
| Solaris | novel | Solaris | Kris Kelvin (lead), Harey, Sartorius, Snaut |
| A Scandal in Bohemia | short story | Not recorded | Irene Adler (lead), Sherlock Holmes, Dr. Watson, Lawyer Godfrey Norton*, Wilhelm Gottsreich Sigismond von Ormstein |
| Slaughterhouse-Five | novel | Dresden | Billy Pilgrim (lead), Roland Weary*, Montana Wildhack*, Valencia Merble*, Kilgore Trout, Eliot Rosewater |
| Vampire Knight | comic | Not recorded | Yūki Cross (lead), Zero Kiryu, The Ally (ally) |
| Lord of the Flies | novel | The world of Lord of the Flies | Ralph (lead)*, Jack (against)*, Piggy*, Simon*, Sam* |
| Ranma ½ | comic | Furinkan | Ranma Saotome (lead), Akane Tendo, Soun Tendo, Genma Saotome, Ryoga Hibiki, Kasumi Tendo |
| Titus Andronicus | play | Rome* | Titus Andronicus (lead), Tamora (against)*, Aaron*, Saturninus*, Lavinia*, Bassianus* |
| The Phantom of the Opera | novel | Paris | Christine Daaé (lead), The Persian, Erik (ally), Persian'*, Carlotta, Joseph Buquet |
| Sense and Sensibility | novel | England | Marianne Dashwood (lead), John Willoughby, Elinor Dashwood (ally), Edward Ferrars, Lucy Steele*, Colonel Brandon |
| Portal | video game | Aperture Science Enrichment Center | Chell (lead), GLaDOS (against), The Ally (ally) |
| Resident Evil 4 | video game | Spain | Leon S. Kennedy (lead), Osmund Saddler (against)*, Ashley Graham, Ada Wong, Jack Krauser, Ramon Salazar |
| Mermaid Melody Pichi Pichi Pitch | comic | The world of Mermaid Melody Pichi Pichi Pitch | Lucia Nanami (lead)*, Kaito (against)*, Aqua Regina*, Gackto*, Michal Amagi*, Michel* |
| Saint Seiya | comic | The world of Saint Seiya | Gold Saints (lead), Bronze Saints, Black Saints, Silver Saints, Athena*, Pegasus Seiya |
| A Certain Magical Index | light novel | The world of A Certain Magical Index | Toma Kamijo (lead), Index, Accelerator, Mikoto Misaka, Teitoku Kakine, Kuroko Shirai |
| Catch-22 | novel | Italy | Yossarian (lead), Milo Minderbinder, Major Major Major Major |
| Half-Life | video game | Black Mesa Research Facility | Gordon Freeman (lead), G-Man, Eli Vance, Barney Calhoun, Arne Magnusson |
| User Friendly | online | Not recorded | Erwin (lead)*, Illiad*, Miranda*, Columbia Internet* |
| Timon of Athens | play | Not recorded | Flavius (lead)*, Alcibiades*, Apemantus*, Athenian*, Ventidius* |
| Medea | play | Corinth | Medea (lead), Creon (against), Jason, Glauce*, Aegeus, Greek chorus |
| Oedipus at Colonus | play | Colonus | Oedipus (lead), Theseus, Creon, Antigone, Polynices, Ismene |
| A Clash of Kings | novel | The world of A Clash of Kings | Joffrey (lead)*, Tyrion Lannister (against)*, Stannis Baratheon*, Daenerys Targaryen*, Renly*, Robb Stark* |
| A Tale of Two Cities | novel | London | Charles Darnay (lead)*, Lucie*, Manette*, Jarvis Lorry*, Jerry Cruncher*, Sydney Carton* |
| The Plague | novel | Oran | Jean Tarrou (lead)*, Bernard Rieux, Raymond Rambert*, Paneloux*, Cottard* |
| Abhigyanashakuntalam | play | Not recorded | Bharata (lead), Duṣyanta, Śakuntala*, Śakuntalā, Durvāsā, Kanva |
| Love Hina | comic | Not recorded | Keitarō Urashima (lead)*, Naru Narusegawa*, Mutsumi Otohime* |
| Haikyu!! | comic | Not recorded | Shōyō Hinata (lead), Tobio Kageyama, Karasuno*, Toru Oikawa |
| Buddenbrooks | novel | Bad Schwartau | Tony (lead)*, Thomas Buddenbrook, Christian Buddenbrook, Bendix Grünlich, Erika Weinschenk, Gotthold Buddenbrook |
| The Adventures of Tom Sawyer | novel | Missouri | Tom Sawyer (lead), Huck (against)*, Injun Joe*, Becky Thatcher, Muff Potter, Polly* |
| Ouran High School Host Club | comic | Not recorded | Haruhi Fujioka (lead), Tamaki Suoh, Hikaru Hitachiin, Kaoru Hitachiin, Kyoya Ootori, Mitsukuni Haninozuka |
| Demons | novel | Russian Empire | Nikolai Stavrogin (lead), Varvara Petrovna*, Marya Lebyadkina*, Stepan Trofimovich*, Dasha*, Ivan Shatov* |
| The Voyage of the Dawn Treader | novel | Narnia universe | Lucy Pevensie (lead), Prince Caspian, Eustace Scrubb, Aslan, Edmund Pevensie, Reepicheep |
| The Silver Chair | novel | England | Eustace Scrubb (lead), Rilian, Jill Pole (ally), Prince Caspian, Aslan, Puddleglum |
| The Taming of the Shrew | play | Padua | Lucentio (lead), Petruchio, Bianca Minola (ally), Katherina Minola, Tranio, Baptista Minola |
| The Two Towers | novel | Middle-earth | Gandalf (lead)*, Pippin*, Frodo Baggins, Saruman*, Gollum*, Sam* |
| The Return of the King | novel | Middle-earth | Frodo Baggins (lead), Aragorn*, Tolkien*, Sauron*, Merry*, Sam* |
| Persuasion | novel | England | Anne Elliot (lead), Louisa*, Frederick Wentworth (ally), Elizabeth*, Charles Hayter*, Mary* |
| Quo Vadis | novel | Ancient Rome | Lygia (lead)*, Chilo Chilonis (against)*, Marcus Vinicius (ally)*, Nero, Paul the Apostle, Saint Peter |
| Far Cry | video game | The world of Far Cry | Jack Carver (lead), Val*, Krieger Corp*, Doyle* |
| Sluggy Freelance | online | The world of Sluggy Freelance | Torg (lead), Zoë Bean, Chaz, http://www.wikidata.org/.well-known/genid/4b35bb85930a605edc44d6804d7f9585, http://www.wikidata.org/.well-known/genid/c341baefd2653f4d268f9597b0ff190b, Satan / Lucifer in a work of fiction |
| Atlas Shrugged | novel | The world of Atlas Shrugged | Dagny Taggart (lead), John Galt, Francisco d'Anconia, Henry 'Hank' Rearden, Jim*, Ellis Wyatt* |
| Life of Pi | novel | India | Pi (lead), Richard Parker, Orange Juice* |
| Spice and Wolf | light novel | The world of Spice and Wolf | Holo (lead), Kraft Lawrence, Hans Remerio, Norah Arendt, Richten Marlheit, Zheren |
| The Miser | play | Not recorded | Harpagon (lead), Cléante, Mariane (ally)*, La Flèche, Élise*, Master Jacques |
| Tokyo Mew Mew | comic | The world of Tokyo Mew Mew | Ichigo Momomiya (lead)*, Quiche*, Masaya Aoyama (ally)*, Deep Blue*, Pie*, Berry Shirayuki* |
| The Overcoat | short story | Saint Petersburg | Akaky Akakievich Bashmachkin (lead)*, Petrovich*, The Ally (ally) |
| Nana | comic | Not recorded | Nana K (lead)*, Nana O.*, Nana O*, Ren*, Black Stones'*, Black Stones* |
| Siddhartha | novel | India | Siddhartha (lead)*, Kamala*, Vasudeva*, Govinda* |
| Great Teacher Onizuka | comic | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| The Murders in the Rue Morgue | short story | Paris | C. Auguste Dupin (lead), Camille*, G*, Le Bon* |
| The Adventure of the Red-Headed League | short story | London | Jabez Wilson (lead)*, Sherlock Holmes, John Clay* |
| The Neverending Story | novel | Amarganth | Bastian Balthazar Bux (lead), Atreyu, Falkor, Gmork, Carl Conrad Coreander, Uyulala |
| Coriolanus | play | Rome* | Coriolanus (lead)*, Tullus Aufidius (against)*, Caius Marcius*, Cominius*, Menenius Agrippa*, Volumnia* |
| A Portrait of the Artist as a Young Man | novel | Dublin | Stephen Dedalus (lead), Father John Conmee, Charles Stewart Parnell, Archibald Hamilton Rowan, May Goulding Dedalus, Simon Dedalus |
| The Black Cat | short story | Not recorded | Pluto (lead)*, The Rival (against), The Ally (ally) |
| Oh My Goddess! | comic | The world of Oh My Goddess! | Belldandy (lead)*, The Rival (against), The Ally (ally) |
| Mansfield Park | novel | England | Fanny Price (lead), Maria Bertram, Henry Crawford (ally), Edmund Bertram, Mary Crawford, Thomas Bertram |
| The Shining | novel | Overlook Hotel | Jack Torrance (lead), Danny Torrance (against), Wendy Torrance, Dick Hallorann* |
| The Mysterious Island | novel | Lincoln Island | Captain Nemo (lead), Tom Ayrton, Cyrus Smith, Harbert Brown, Bonadventure Pencroff, Gedéon Spilett |
| The Government Inspector | play | Not recorded | Ivan Khlestakov (lead), The Rival (against), The Ally (ally) |
| The Mysterious Affair at Styles | novel | Essex | Alfred Inglethorp (lead)*, Emily Inglethorp (against)*, Hercule Poirot, John Cavendish*, Inspector Japp, Evelyn Howard* |
| Questionable Content | online | The world of Questionable Content | Marten Reed (lead)*, Jacques*, Faye*, Pintsize*, Questionable Content* |
| Claymore | comic | The world of Claymore | Clare (lead)*, The Rival (against), The Ally (ally) |
| The Call of the Wild | novel | Alaska | Buck (lead)*, John Thornton*, François*, Hal*, Perrault* |
| Three Sisters | play | Russia | Natasha (lead)*, Irina*, Andrei (ally)*, Masha*, Olga*, Tuzenbach* |
| The Magician's Nephew | novel | London | Digory Kirke (lead), Jadis (against)*, Polly Plummer, Aslan, Andrew Ketterley, Frank and Helen |
| To the Lighthouse | novel | Skyes | Cam (lead)*, Lily Briscoe*, The Ally (ally) |
| The Cherry Orchard | play | Not recorded | Lyubov Andreievna Ranevskaya (lead), Lopakhin Yermolai Alexeievitch, Trofimov, Anya, Varya, Dunyasha |
| Full Metal Panic! | light novel | Not recorded | Kaname Chidori (lead)*, Sousuke Sagara (against)*, The Ally (ally) |
| Kuroko's Basketball | comic | Not recorded | Seirin High (lead)*, Alongside Taiga Kagami*, Tetsuya Kuroko (ally)*, Atsushi Murasakibara*, Daiki Aomine*, Ryota Kise* |
| Robinson Crusoe | novel | Orinoco River | Robinson Crusoe (lead), The Ally (against), Friday (ally) |
| Toradora! | light novel | Not recorded | Taiga Aisaka (lead), Ami Kawashima, Minori Kushieda (ally), Ryuuji Takasu, Yuusaku Kitamura |
| Baccano! | light novel | New York City | Claire Stanfield (lead)*, Jacuzzi Splot (against)*, Chane Laforet (ally)*, Dallas Genoard*, Szilard Quates*, Firo Prochainezo* |
| The Lion, the Witch, and the Wardrobe | novel | England | White Witch (lead), Edmund Pevensie (against), Aslan, Lucy Pevensie, Susan Pevensie, Mr. Tumnus |
| Call of Duty: Modern Warfare 3 | video game | Berlin | Makarov (lead)*, Yuri (against)*, Price*, Soap*, Task Force*, Alena Vorshevsky* |
| Call of Duty: Modern Warfare 2 | video game | Afghanistan | Soap (lead)*, Task Force (against)*, Vladimir Makarov*, John Price*, Shepherd*, Joseph Allen* |
| Tower of God | online | The world of Tower of God | High Shinsu (lead)*, The Rival (against), The Ally (ally) |
| Noblesse | online | Not recorded | Rai (lead)*, The Rival (against), The Ally (ally) |
| The Last of the Mohicans | novel | Northern America and Mexico | Alice Munro (lead)*, Magua (against), Duncan Heyward (ally)*, Hawk-eye*, Uncas, David Gamut* |
| Future Diary | comic | Kinugawa Onsen | Yuno Gasai (lead), Yukiteru Amano (against), Aru Akise*, Deus Ex Machina*, Minene Uryu*, Muru Muru* |
| Durarara!! | light novel | Ikebukuro* | Mikado Ryūgamine (lead)*, Anri Sonohara, The Ally (ally) |
| Henry V | play | Not recorded | Henry V (lead)*, Montjoy (against)*, Katharine (ally)*, Charles*, France* |
| Haruhi Suzumiya | light novel | The world of Haruhi Suzumiya | Haruhi Suzumiya (lead)*, Kyon*, The Ally (ally) |
| The Adventure of the Cardboard Box | short story | Susan* | Jim Browner (lead)*, Sarah (against)*, Holmes*, Mary*, Inspector Lestrade |
| Love in the Time of Cholera | novel | Caribbean | Fermina Daza (lead)*, Juvenal Urbino*, Florentino Ariza (ally)* |
| The Sign of Four | novel | Not recorded | Jonathan Small (lead)*, Sherlock Holmes (against), Mary Morstan, John Sholto*, Bartholomew*, Thaddeus* |
| The Sun Also Rises | novel | Pamplona | Jake Barnes (lead), Robert Cohn, Brett Ashley (ally), Mike Campbell*, Romero*, Bill Gorton* |
| The Comedy of Errors | play | Greece | Antipholus (lead)*, Dromio*, Adriana*, Aegeon*, Angelo* |
| Seven against Thebes | play | Thebes | Eteocles (lead), Antigone, messenger, Ismene, Greek chorus |
| All's Well That Ends Well | play | Italy* | Bertram (lead)*, Diana*, Helena (ally)*, Parolles* |
| Berenice | short story | Not recorded | Egaeus (lead)*, Berenice*, The Ally (ally) |
| Hetalia: Axis Powers | comic | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| Little Women | novel | Heidelberg | Jo (lead)*, Meg March, Beth March (ally), Laurie, Amy March, John Brooke |
| Soul Eater | comic | The world of Soul Eater | Death the Kid (lead), Asura (against)*, Crona*, Medusa*, Maka Albarn, Shinigami* |
| Red Dead Redemption | video game | Mexico | John Marston (lead), Edgar Ross (against)*, Bill Williamson*, Agustín Allende*, Abraham Reyes*, Dutch* |
| Kafka on the Shore | novel | Takamatsu | Nakata (lead)*, Saeki*, Oshima*, Hoshino*, Sakura*, Crow* |
| Hikaru no Go | comic | The world of Hikaru no Go | Sai (lead)*, Hikaru Shindo (against)*, Akira Toya*, Ko Yong Ha*, Korea*, Atsushi Kurata* |
| La Celestina | play | Salamanca | Calisto (lead), Celestina, Melibea, Pármeno*, Sempronio*, Areúsa* |
| Attack on Titan | comic | The world of Attack on Titan | Eren Yeager (lead), Historia Reiss*, Pure Titans*, Rod Reiss*, Ymir*, Levi Ackerman |
| The Imaginary Invalid | play | Not recorded | Argan (lead), Angelique*, Cléante (ally), Toinette, Thomas Diafoirus, Béline |
| Mortal Engines | novel | London | Hester Shaw (lead)*, Tom Natsworthy (against)*, Thaddeus Valentine*, Shrike*, Katherine*, Anna Fang* |
| It | novel | Derry | Georgie Denbrough (lead)*, Mike Hanlon*, Ben Hanscom*, Beverly Marsh*, Bill*, Eddie Kaspbrak* |
| Do Androids Dream of Electric Sheep? | novel | San Francisco | Rick Deckard (lead), Rachael Rosen (against), Phil Resch*, Iran*, Mercer*, Pris Stratton |
| Antony and Cleopatra | play | Not recorded | Octavius (lead)*, Sextus Pompey (against)*, Enobarbus*, Octavia* |
| The Fountainhead | novel | New York City | Howard Roark (lead), Gail Wynand (against)*, Dominique*, Guy Francon*, Toohey*, Henry Cameron* |
| Vanity Fair | novel | Not recorded | Becky Sharp (lead)*, George Osborne*, Amelia Sedley (ally)*, Rawdon Crawley*, Pitt Crawley*, William Dobbin* |
| Carrie | novel | Chamberlain | Carrie White (lead), Margaret White, Sue Snell, Chris Hargensen*, Tommy*, Rita Desjardin |
| Henry IV, Part 1 | play | Not recorded | Hal (lead)*, John Falstaff (against)*, Hotspur*, Edmund Mortimer*, Thomas Percy* |
| Pygmalion | play | London | Henry Higgins (lead), Eliza Doolittle, Colonel Hugh Pickering, Freddy Eynsford-Hill, Pearce*, Alfred P. Doolittle |
| The Kite Runner | novel | Afghanistan | Amir (lead)*, Hassan (against)*, Baba (ally)*, Sohrab*, Assef*, Rahim Khan* |
| Super Mario Bros. 3 | video game | Not recorded | Mario (lead), Bowser, Toadstool*, Luigi, Princess Peach, Iggy Koopa |
| Dead Souls | novel | Not recorded | Pavel Ivanovich Chichikov (lead), Plyushkin, Sobakevich |
| Captain Tsubasa | comic | Not recorded | Tsubasa Oozora (lead)*, Rivaul (against)*, Roberto Hongo (ally)*, Kojiro Hyuga*, Genzo Wakabayashi*, Shingo Aoi* |
| The Seagull | play | Moscow* | Konstantin Gavrilovich Treplyov (lead), Nina Mikhailovna Zarechnaya (against), Masha (ally), Boris Alexeyevich Trigorin, Irina Nikolayevna Arkadina, Pjotr Nikolayevich Sorin |
| Richard III | play | Not recorded | Richard (lead)*, Edward V (against)*, Elizabeth (ally)*, Buckingham*, Clarence*, Henry* |
| The Fault in Our Stars | novel | Amsterdam | Hazel (lead)*, Van Houten*, Lidewij* |
| Works and Days | poem | Not recorded | Hesiod (lead), Perses*, Zeus (ally), Pandora, Prometheus, Hermes |
| A Doll's House | play | Italy* | Torvald Helmer (lead), Krogstad, Nora Helmer (ally), Doctor Rank, The Helmer's three little children, Mrs. Linde |
| Astro Boy | comic | The world of Astro Boy | Astro Boy (lead), Dr. Tenma, Tobio*, Hamegg* |
| Layla and Majnun | poem | Not recorded | Layla al-Aamiriya (lead), Qays Ibn al-Mulawwah, The Ally (ally) |
| The Castle | novel | The world of The Castle | K. (lead), K*, The Ally (ally) |
| A Clockwork Orange | novel | England | Alex (lead), Dim (against)*, Georgie*, Alexander* |
| Hunter × Hunter | comic | The world of Hunter × Hunter | Gon Freecss (lead), Killua Zoldyck, Ging Freecss, Nen*, Kurapika, Kite* |
| Black Butler | comic | The world of Black Butler | Ciel (lead)*, Undertaker*, Sebastian Michaelis (ally)* |
| JoJo's Bizarre Adventure | comic | Not recorded | Dio Brando (lead)*, Jonathan Joestar*, Jotaro Kujo*, Joseph Joestar*, Josuke Higashikata*, Holly Kujo* |
| Slam Dunk | comic | Not recorded | Hanamichi Sakuragi (lead), Haruko Akagi, Kaede Rukawa, Takenori Akagi, Hisashi Mitsui, Ryota Miyagi |
| The Wonderful Adventures of Nils | novel | Alnön | Nils Holgersson (lead), Akka of Kebnekaise, Martin, Smirre Fox |
| Electra | play | Mycenae | Electra (lead), Agamemnon (against)*, Orestes, Clytemnestra, Aegisthus, Chrysothemis |
| Fist of the North Star | comic | The world of Fist of the North Star | Kenshiro (lead)*, Raoh (against)*, Lin (ally)*, Bat*, Kaioh* |
| On the Road | novel | Denver | Dean Moriarty (lead)*, Sal*, Camille* |
| The Winter's Tale | play | Not recorded | Leontes (lead), Perdita, Camillo*, Hermione*, Florizel, Paulina* |
| The Man in the High Castle | novel | Berlin | Tagomi (lead)*, Germany Martin Bormann*, Baynes*, Hawthorne Abendsen*, Joe Cinnadella*, Juliana Frink* |
| Lady Chatterley's Lover | novel | Not recorded | Constance Reid (lead)*, Clifford Chatterley*, The Ally (ally) |
| Mrs Dalloway | novel | London | Clarissa Dalloway (lead)*, Septimus Warren Smith*, Peter Walsh (ally)* |
| Uncle Vanya | play | Russian Empire | Vanya (lead)*, Aleksandr Vladimirovich Serebryakov (against), Yelena Andreevna Serebryakova (ally), Sonya*, Mikhail Lvovich Astrov, Marina Timofeevna |
| Lysistrata | play | Propylaea of Athens | Lysistrata (lead), Myrrhine*, The Ally (ally) |
| Persepolis | comic | Tehran | Marji (lead)*, The Rival (against), The Ally (ally) |
| Sir Gawain and the Green Knight | poem | Not recorded | Gawain (lead), Green Knight, Arthur*, Guinevere* |
| Jurassic Park | novel | Isla Nublar | Paleontologist Alan Grant (lead)*, John Hammond*, Ian Malcolm*, Dennis Nedry*, Donald Gennaro*, John Arnold* |
| The Tell-Tale Heart | short story | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| Gintama | comic | The world of Gintama | Gintoki Sakata (lead)*, The Rival (against), The Ally (ally) |
| The Masque of the Red Death | short story | Not recorded | Prospero (lead)*, The Rival (against), The Ally (ally) |
| Journey to the End of the Night | novel | Paris | Ferdinand Bardamu (lead)*, Léon Robinson*, Madelon*, Lola*, Baryton*, Grandma Henrouille* |
| Far Cry 3 | video game | Rook Islands | Jason Brody (lead), Vaas Montenegro (against), Citra Talugmai, Hoyt Volker, Riley*, Liza* |
| Bakuman | comic | Not recorded | Ashirogi (lead)*, The Rival (against), The Ally (ally) |
| The Frogs | play | Hades* | Dionysus (lead)*, Aeschylus*, Euripides*, Heracles*, Xanthias* |
| God of War | video game | Athens | Kratos (lead), Ares (against), Athena*, Box* |
| Death of a Salesman | play | Brooklyn | Willy Loman (lead), Linda Loman, Biff Loman (ally), Happy Loman, Charley*, Howard* |
| Blindness | novel | The world of Blindness | The Lead (lead), The Rival (against), The Ally (ally) |
| The Importance of Being Earnest | play | Not recorded | Algernon Moncrieff (lead)*, Jack*, Ernest (ally)*, Bracknell*, Cecily Cardew*, Gwendolen Fairfax* |
| Catching Fire | novel | Panem | Katniss Everdeen (lead), Peeta Mellark*, Haymitch Abernathy (ally)*, President Snow*, Beetee*, Johanna Mason* |
| Flowers for Algernon | short story | The world of Flowers for Algernon | Charlie Gordon (lead)*, Nemur*, Alice Kinnian* |
| Ivanhoe | novel | Not recorded | Cedric of Rotherwood (lead), Isaac of York, Lady Rowena (ally), Wilfred of Ivanhoe, Richard*, Rebecca the Jewess |
| A Streetcar Named Desire | play | Downtown New Orleans | Blanche DuBois (lead), Mitch (against)*, Stanley Kowalski (ally), Stella Kowalski, Eunice Hubbell, Harold "Mitch" Mitchell |
| The Merry Wives of Windsor | play | Not recorded | Falstaff (lead), Mistress Quickly, Anne Page*, Fenton*, Caius*, Ancient Pistol |
| Murder on the Orient Express | novel | Not recorded | Hercule Poirot (lead), M. Bouc (against), Cassetti*, Ratchett*, Pierre Michel*, Caroline Hubbard* |
| Prometheus Bound | play | Caucasus Mountains | Prometheus (lead), Zeus*, Oceanus, Io, Kratos, Hephaestus |
| East of Eden | novel | Salinas | Adam Trask (lead)*, Aron*, Cal*, Lee*, Cathy Ames, Kate Albey* |
| Monster | comic | Not recorded | Kenzo Tenma (lead), Eva Heinemann (against), Johan Liebert, Nina Fortner, Wolfgang Grimmer |
| Demian | novel | Not recorded | Emil Sinclair (lead)*, Max Demian*, The Ally (ally) |
| A Thousand Splendid Suns | novel | Afghanistan | Laila (lead)*, Mariam*, Tariq (ally)*, Rasheed*, Jalil*, Nana* |
| The Prince and the Pauper | novel | England | Edward Tudor (lead)*, Tom Canty*, Henry*, Miles Hendon* |
| The Gold-Bug | short story | Charleston | William Legrand (lead)*, Jupiter*, The Ally (ally) |
| The Scarlet Letter | novel | Boston | Hester Prynne (lead), Roger Chillingworth (against), Arthur Dimmesdale, Pearl* |
| The Unbearable Lightness of Being | novel | Prague* | Tomáš (lead), Sabina, Tereza (ally), Franz* |
| The Tale of the Bamboo Cutter | short story | Not recorded | Kaguya-hime (lead), Mount Fuji*, Isonokami no Ason Maro, Abe no Miushi, Ōtomo no Miyuki, Prince Kuramochi |
| Vinland Saga | comic | Vinland* | Thorfinn (lead)*, Canute*, Einar (ally)*, Askeladd*, Thorkell*, Karli* |
| The Bacchae | play | Thebes | Dionysus (lead), Pentheus, Cadmus, Agave, Semele*, Tiresias |
| The Wind in the Willows | novel | Berkshire | Mr. Toad (lead), Mole*, Badger*, Rat* |
| Ligeia | short story | Not recorded | Rowena Trevanion (lead)*, The Rival (against), The Ally (ally) |
| The Golden Ass | novel | Not recorded | Lucius (lead)*, Psyche*, Cupid*, Photis*, Charite*, Milo* |
| The Misanthrope | play | Paris | Alceste (lead), Célimène, Éliante, Oronte, Philinte, Acaste |
| The Adventure of the Speckled Band | short story | London | Grimesby Roylott (lead)*, Sherlock Holmes (against), Helen Stoner*, Dr. Watson |
| Rashōmon | short story | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| The Adventure of the Noble Bachelor | short story | London | Hatty Doran (lead)*, Moulton (against)*, Simon (ally)*, Inspector Lestrade |
| Rip Van Winkle | short story | Catskill Mountains | Rip Van Winkle (lead), Dutch*, The Ally (ally) |
| The Cask of Amontillado | short story | Not recorded | Montresor (lead)*, Fortunato*, The Ally (ally) |
| Sabrina Online | online | Not recorded | Sabrina Online (lead)*, The Rival (against), The Ally (ally) |
| The Adventure of the Blue Carbuncle | short story | London | Sherlock Holmes (lead), James Ryder*, Henry Baker*, Peterson*, Dr. Watson, Inspector Bradstreet |
| The Call of Cthulhu | short story | Auckland | Gustaf Johansen (lead)*, Cthulhu, Francis Wayland Thurston*, John Raymond Legrasse* |
| Ctrl+Alt+Del | online | Not recorded | Ethan (lead)*, Lucas*, Tim Buckley* |
| The Adventure of the Musgrave Ritual | short story | Charles* | Like Brunton (lead)*, Holmes*, Rachel Howells*, Ralph Musgrave* |
| A Case of Identity | short story | London | Sherlock Holmes (lead), Hosmer Angel*, James Windibank*, Mary Sutherland* |
| The Man with the Twisted Lip | short story | London | Clair (lead)*, Hugh Boone (against)*, Sherlock Holmes, Dr. Watson, Inspector Bradstreet |
| The Adventure of Silver Blaze | short story | Dartmoor | Sherlock Holmes (lead), John Straker*, Silver Blaze*, Bookmaker Fitzroy Simpson*, Watson*, Gregory* |
| The House of the Dead | novel | Russian Empire | The Lead (lead), The Rival (against), The Ally (ally) |
| The Mystery of Marie Rogêt | short story | Paris | C. Auguste Dupin (lead), The Rival (against), The Ally (ally) |
| The Adventure of the Empty House | short story | Not recorded | Sherlock Holmes (lead), Sebastian Moran*, Moriarty*, Inspector Lestrade |
| Max Payne | video game | Choir Communications Garage | Max Payne (lead), Angelo Punchinello (against), Nicole Horne, Jack Lupino*, Alfred Woden, Aesir* |
| The Boscombe Valley Mystery | short story | Herefordshire | James (lead)*, Charles McCarthy*, Alice (ally)*, Sherlock Holmes, John Turner*, Watson* |
| The Adventure of the Engineer's Thumb | short story | London | Victor Hatherley (lead)*, Sherlock Holmes, Lysander Stark (ally)*, Dr. Watson, Inspector Bradstreet |
| The Five Orange Pips | short story | London | John Openshaw (lead)*, Elias*, Sherlock Holmes, Joseph* |
| The Fall of the House of Usher | short story | Not recorded | Roderick Usher (lead)*, Madeline*, Ethelred* |
| Hop-o'-My-Thumb | short story | The world of Hop-o'-My-Thumb | Hop-o'-My-Thumb (lead)*, The Rival (against), The Ally (ally) |
| The Adventure of the Second Stain | short story | Not recorded | Sherlock Holmes (lead), Hilda Trelawney Hope (against)*, Eduardo Lucas*, Inspector Lestrade, Dr. Watson |
| The Nightingale | short story | The world of The Nightingale | The Lead (lead), The Rival (against), The Ally (ally) |
| The Adventure of the Gloria Scott | short story | Not recorded | Victor Trevor (lead)*, Holmes*, Head-keeper Hudson*, Beddoes*, Born James Armitage* |
| The Adventure of the Yellow Face | short story | America* | Effie Munro (lead)*, Watson*, Lucy*, Grant Munro* |
| In Search of the Castaways | novel | 37th parallel south | Tom Ayrton (lead), Captain Grant, Jacques Paganel, Lady Glenarvan, Lord Glenarvan, Mary Grant |
| Around the World in Eighty Days | novel | Aden | Phileas Fogg (lead), Fix (against), Jean Passepartout, Aouda, Andrew Speedy, Ibai Hermoso |
| Martin Eden | novel | Oakland | Martin Eden (lead)*, The Rival (against), The Ally (ally) |
| Concerned | online | Locations of Half-Life | Norman Frohman (lead)*, Ravenholm*, Gordon Freeman (ally), Breen*, Antlions* |
| The Adventure of the Stockbroker's Clerk | short story | Birmingham* | Pycroft (lead)*, Holmes*, Arthur Pinner*, Beddington*, Watson*, Harry* |
| Animal Farm | novel | England | Napoleon (lead), Snowball (against), Jones, Squealer, Old Major, Boxer |
| The Invisible Man | novel | London | Griffin (lead), Kemp (against)*, Thomas Marvel*, Adye*, Griffanti |
| The Handmaid's Tale | novel | United States | Offred (lead), Serena Joy, Nick* |
| High School DxD | light novel | Not recorded | Issei Hyōdō (lead), Rias Gremory, Akeno Himejima, Asia Argento, Gasper Vladi, Irina Shidō |
| A Descent into the Maelström | short story | The world of A Descent into the Maelström | The Lead (lead), The Rival (against), The Ally (ally) |
| A Game of Thrones | novel | Westeros | Ned (lead)*, Drogo*, Joffrey (ally)*, Daenerys Targaryen*, Jon Arryn*, Cersei Lannister* |
| Oruchuban Ebichu | comic | Not recorded | Ebichu (lead)*, The Rival (against), The Ally (ally) |
| The Gathering Storm | novel | The world of The Gathering Storm | Rand al'Thor (lead), Egwene*, Elaida*, Semirhage*, Verin Mathwin* |
| The Adventure of the Dancing Men | short story | Not recorded | Abe Slaney (lead)*, Elsie Patrick (against)*, Sherlock Holmes*, Watson* |
| Mistborn: The Well of Ascension | novel | The world of Mistborn: The Well of Ascension | Vin (lead)*, Zane (against)*, Elend Venture (ally)*, Sazed*, Luthadel*, Straff Venture* |
| The Adventure of Black Peter | short story | Weald | Peter Carey (lead)*, Patrick Cairns (against)*, Sherlock Holmes, Inspector Hopkins, John Hopley Neligan*, Dr. Watson |
| The Way of Kings | novel | The world of The Way of Kings | Kaladin (lead)*, Dalinar*, Szeth*, Shallan*, Gavilar* |
| Schlock Mercenary | online | The world of Schlock Mercenary | The Lead (lead), The Rival (against), The Ally (ally) |
| The Lady with the Dog | short story | Russia | Anna Sergeyevna (lead), Dmitri Gurov, The Ally (ally) |
| Elantris | novel | The world of Elantris | Hoid (lead), The Rival (against), The Ally (ally) |
| Towers of Midnight | novel | The world of Towers of Midnight | Perrin Aybara (lead)*, Galad Damodred (against)*, Isam*, Egwene*, Elayne Trakand*, Mesaana* |
| Homestuck | online | Doc Scratch* | John Egbert (lead), Vriska Serket, Jack Noir*, Sburb*, Caliborn*, Dave Strider |
| Mistborn: The Final Empire | novel | Luthadel* | Kelsier (lead)*, Ruler*, Vin*, Valette Renoux*, Elend Venture*, Marsh* |
| A Memory of Light | novel | Ebou Dar* | Rand (lead)*, Elayne Trakand*, Mat*, Egwene*, Demandred*, M'Hael* |
| Alcatraz Versus the Evil Librarians | novel | The world of Alcatraz Versus the Evil Librarians | The Lead (lead), The Rival (against), The Ally (ally) |
| The Hitchhiker's Guide to the Galaxy | novel | The world of The Hitchhiker's Guide to the Galaxy | Arthur Dent (lead), Zaphod Beeblebrox, Ford Prefect (ally), Trillian, Magrathea*, Marvin the Paranoid Android |
| Cyberpunk 2077 | video game | Night City | V (lead), Yorinobu Arasaka (against), Evelyn Parker (ally), Johnny Silverhand, Hanako Arasaka, Alt Cunningham |
| The Adventure of the Six Napoleons | short story | Not recorded | Sherlock Holmes (lead), Inspector Lestrade, Beppo* |
| Assassination Classroom | comic | The world of Assassination Classroom | Koro-sensei (lead)*, The Rival (against), The Ally (ally) |
| The God of High School | online | Not recorded | Mori Jin (lead)*, South Korea*, Borrowed Power* |
| Case Closed | comic | Not recorded | James Black (lead), Kogoro Mori, Hiroshi Agasa, Shinichi Kudo, Ran Mouri, Kaito Kuroba |
| Mistborn: The Hero of Ages | novel | The world of Mistborn: The Hero of Ages | Ruin (lead)*, Vin (against)*, Elend*, Preservation*, Marsh*, Urteau* |
| The Witcher 3: Wild Hunt | video game | Kaer Morhen | Ciri (lead)*, Geralt of Rivia (against), Emhyr (ally)*, Yennefer of Vengerberg, Avallac'h*, Eredin* |
| The Queen of Spades | short story | Not recorded | Hermann (lead)*, Lizavyeta Ivanovna*, The Ally (ally) |
| Alcatraz Versus the Knights of Crystallia | novel | The world of Alcatraz Versus the Knights of Crystallia | Alcatraz Smedry (lead)*, The Rival (against), The Ally (ally) |
| Alcatraz Versus the Scrivener's Bones | novel | The world of Alcatraz Versus the Scrivener's Bones | Bastille (lead)*, Kazan*, The Ally (ally) |
| Alcatraz Versus the Shattered Lens | novel | Mokia* | The Lead (lead), The Rival (against), The Ally (ally) |
| Monogatari | light novel | Not recorded | Koyomi Araragi (lead), Karen Araragi, Hitagi Senjōgahara (ally)* |
| Inferno | novel | Not recorded | Robert Langdon (lead), Sienna Brooks (against)*, Bertrand Zobrist*, Elizabeth Sinskey*, Vayentha* |
| The Irregular at Magic High School | light novel | The world of The Irregular at Magic High School | Tatsuya Shiba (lead)*, The Rival (against), The Ally (ally) |
| The Devil Is a Part-Timer! | light novel | Ente Isla* | The Lead (lead), The Rival (against), The Ally (ally) |
| Zahra’s Paradise | online | Not recorded | Zahra Kazemi (lead)*, The Rival (against), The Ally (ally) |
| Infinity Blade: Awakening | novel | The world of Infinity Blade: Awakening | Siris (lead)*, Isa (against)*, The Ally (ally) |
| Assassin's Creed IV: Black Flag | video game | Caribbean | Edward Kenway (lead), Bartholomew Roberts (against), John Rackham, Mary Read, Juno*, Blackbeard |
| Metal Gear Solid | video game | Shadow Moses | Liquid Snake (lead), Otacon (against)*, Meryl Silverburgh, Revolver Ocelot, Metal Gear*, Donald Anderson |
| Mistborn: The Alloy of Law | novel | Elendel* | Wax (lead)*, Lessie (against)*, Steris (ally)*, Marasi*, Wayne*, Edwarn Ladrian* |
| Nimona | online | The world of Nimona | Blackheart (lead)*, Nimona (against)*, Ambrosius Goldenloin*, Meredith Blitzmeyer* |
| Words of Radiance | novel | The world of Words of Radiance | Kaladin (lead)*, Szeth (against)*, Dalinar Kholin (ally)*, Shallan Davar*, Jasnah Kholin*, Brightlord Amaram* |
| The Seven Deadly Sins | comic | The world of The Seven Deadly Sins | Elizabeth Liones (lead), Meliodas (against), Diane (ally), Ban, King, Merlin |
| Tokyo Ghoul | comic | Tokyo | Ken Kaneki (lead)*, Tokyo Ghoul*, The Ally (ally) |
| Overlord | light novel | New World | Momonga (lead)*, Ainz Ooal Gown*, The Ally (ally) |
| No Game No Life | light novel | The world of No Game No Life | The Lead (lead), The Rival (against), The Ally (ally) |
| Your Lie in April | comic | Not recorded | Kōsei Arima (lead)*, Tsubaki Sawabe*, Kaori Miyazono (ally)* |
| Warbreaker | novel | The world of Warbreaker | Siri (lead)*, Vasher*, Vivenna (ally)*, Denth*, BioChromatic Breath*, Idris* |
| Far Cry 4 | video game | Nepal | Ajay Ghale (lead)*, Pagan Min (against)*, Kyrat*, Ishwari*, Amita*, Sabal* |
| Girls of the Wild's | online | Not recorded | Jaegu Song (lead)*, High (against)*, Hyesong (ally)*, Daldal Choi*, Moonyoung Lee*, Myunghwan* |
| Mistborn: Shadows of Self | novel | The world of Mistborn: Shadows of Self | Wax (lead)*, Bleeder (against)*, Harmony (ally)*, Innate*, Lessie*, MeLaan* |
| The Gamer | online | The world of The Gamer | Han Ji-Han (lead)*, Shin Seon-Il*, Hwan Seong-Gon*, Kwon Si-Yeon* |
| The Emperor's Soul | novel | The world of The Emperor's Soul | Gaotona (lead)*, Shai*, Hoid |
| The Legend of Zelda: Breath of the Wild | video game | The world of The Legend of Zelda: Breath of the Wild | Link (lead), Ganon (against), Princess Zelda, Rhoam*, Mipha, Daruk |
| Rascal Does Not Dream | light novel | The world of Rascal Does Not Dream | Mai Sakurajima (lead), Sakuta Azusagawa (against)*, Adolescence Syndrome (ally)* |
| My Hero Academia | comic | The world of My Hero Academia | All Might (lead), Tomura Shigaraki (against)*, Deku (ally)*, Katsuki Bakugo, Izuku Midoriya, Shoto Todoroki |
| Infinity Blade: Redemption | novel | Not recorded | Siris (lead)*, Isa (against)*, Uriel*, Adram*, Raidriar* |
| Yu Yu Hakusho | comic | Not recorded | Yusuke Urameshi (lead), Genkai, Kazuma Kuwabara (ally), Hiei, Kurama, Koenma |
| Berserk | comic | The world of Berserk | Guts (lead), Griffith (against), Casca (ally), Elfhelm*, Skull Knight, Falconia* |
| Lookism | online | Not recorded | Hyung Seok (lead)*, The Rival (against), The Ally (ally) |
| KonoSuba | light novel | Not recorded | Kazuma Satou (lead), Aqua (against), Megumin (ally), Darkness, Chomusuke, Hyoizaburoo |
| Mushoku Tensei | light novel | The world of Mushoku Tensei | Rudeus Greyrat (lead), Orsted (against)*, Hitogami* |
| The Rising of the Shield Hero | light novel | The world of The Rising of the Shield Hero | Naofumi Iwatani (lead), The Rival (against), The Ally (ally) |
| WorldEnd | light novel | The world of WorldEnd | The Lead (lead), The Rival (against), The Ally (ally) |
| Black Clover | comic | The world of Black Clover | Asta (lead), The Ally (against), Yuno (ally)* |
| Re:Zero | light novel | The world of Re:Zero | Subaru Natsuki (lead), Rem, Emilia (ally), Ram, Ferris, Beatrice |
| Eromanga Sensei | light novel | The world of Eromanga Sensei | Masamune Izumi (lead), Sagiri Izumi, Elf Yamada |
| Undertale | video game | The Underground | Asgore Dreemurr (lead), Flowey (against), Toriel (ally), Asriel Dreemurr, Alphys, Chara |
| Mistborn: The Bands of Mourning | novel | New Seran* | Wax (lead)*, Edwarn Ladrian (against)*, Marasi (ally)*, Wayne*, Harmony*, Kelesina Shores* |
| Fox Spirit Matchmaker | online | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| That Time I Got Reincarnated as a Slime | light novel | Not recorded | Rimuru Tempest (lead), Satoru Mikami, Veldora Tempest (ally), Milim Nava, Abiru, Adalman |
| Violet Evergarden | light novel | Not recorded | Violet Evergarden (lead), Alberta, Cattleya Baudelaire, Charlotte Abelfreyja Drossel, Damian Baldur Flugel |
| Unfettered | novel | The world of Unfettered | Shawn Speakman (lead)*, Patrick Rothfuss (against)*, Terry Brooks (ally)* |
| Mistborn: Secret History | novel | The world of Mistborn: Secret History | Kelsier (lead)*, Marsh (against)*, Ruin (ally)*, Preservation*, Vin*, Spook* |
| Pepper&Carrot | online | Acren | Pepper (lead), Carrot, Cayenne, Coriander, Saffron, Shichimi |
| Demon Slayer: Kimetsu no Yaiba | comic | The world of Demon Slayer: Kimetsu no Yaiba | Muzan Kibutsuji (lead), Nezuko Kamado (against), Tamayo*, Zenitsu Agatsuma, Inosuke Hashibira, Kagaya Ubuyashiki |
| Classroom of the Elite | light novel | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| Under One Person | online | The world of Under One Person | Chou Soran (lead)*, Fu Hōhō (against)*, Feng Baobao (ally), Zhang Chulan |
| Naruto | comic | Naruto World | Sasuke Uchiha (lead), Orochimaru (against), Konoha*, Kakashi Hatake, Itachi Uchiha, Madara Uchiha |
| Time Prisoners | online | The world of Time Prisoners | The Lead (lead), The Rival (against), The Ally (ally) |
| Tawawa on Monday | online | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| Red Dead Redemption 2 | video game | United States | Arthur Morgan (lead), Dutch van der Linde (against), John Marston, Micah*, Abigail*, Jack* |
| Alcatraz Versus the Dark Talent | novel | The world of Alcatraz Versus the Dark Talent | Grandpa Smedry (lead)*, Dif Smedry*, The Ally (ally) |
| World's End Harem | online | The world of World's End Harem | Reito Mizuhara (lead)*, Virus (against)*, The Ally (ally) |
| Arcanum Unbounded: The Cosmere Collection | novel | The world of Arcanum Unbounded: The Cosmere Collection | The Lead (lead), The Rival (against), The Ally (ally) |
| Oathbringer | novel | Urithiru* | Shallan (lead)*, Adolin (against)*, Dalinar Kholin*, Kaladin*, Eshonai*, Roshar* |
| One Piece | comic | The world of One Piece | Monkey D. Luffy (lead), Page One, Red King, Piece*, Devil Dias, Roronoa Zoro |
| Far Cry 5 | video game | Hope County | Joseph Seed (lead)*, Sheriff Earl Whitehorse (against)*, John*, Jacob*, Faith*, Joey Hudson* |
| Killing Stalking | online | Not recorded | Oh Sangwoo (lead)*, The Rival (against), The Ally (ally) |
| The Apothecary Diaries | light novel | Not recorded | Maomao (lead), Jinshi, Ah-Duo, Fengxian, Gaoshun, Gyokuyou |
| Eren the Southpaw | online | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| Jujutsu Kaisen | comic | The world of Jujutsu Kaisen | Yuji Itadori (lead), Ryōmen Sukuna, Megumi Fushiguro (ally), Satoru Gojo, Kenjaku*, Mahito |
| Skyward | novel | The world of Skyward | Spensa (lead)*, M-Bot*, Rodge (ally)*, Cobb*, Hurl*, Admiral Ironsides* |
| Genshin Impact | video game | The world of Genshin Impact | Traveler (lead), Teyvat*, Paimon (ally), Ronova*, Anastasya*, Raiden Shogun |
| Spy × Family | comic | Not recorded | Anya Forger (lead), Yor Forger, Twilight*, Loid Forger, Yuri Briar, Bond Forger |
| Chainsaw Man | comic | Hell | Denji (lead), Yoru (against)*, Pochita*, Asa Mitaka*, Makima, Power |
| Hell's Paradise: Jigokuraku | online | The world of Hell's Paradise: Jigokuraku | Tensen (lead)*, Gabimaru, Yamada Asaemon Sagiri, Yuzuriha, Yamada Asaemon Eizen, Yamada Asaemon Fuchi |
| Life Lessons with Uramichi Oniisan | online | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| Summer Time Rendering | online | Not recorded | Ushio (lead)*, Shinpei Ajiro*, Mio* |
| Heartstopper | online | Not recorded | Nick Nelson (lead), Charlie Spring (against), Ben Hope (ally), Tori Spring |
| Starsight | novel | Starsight* | Spensa (lead)*, Winzik (against)*, Brade*, Cuna*, Alanik*, Detritus* |
| Rhythm of War | novel | Urithiru* | Kaladin (lead)*, Navani*, Dalinar*, Venli*, Adolin*, Odium* |
| Why Raeliana Ended Up at the Duke's Mansion | online | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| Cherry Magic! Thirty Years of Virginity Can Make You a Wizard?! | online | Not recorded | Yuichi Kurosawa (lead)*, The Rival (against), The Ally (ally) |
| Pseudo Harem | online | Not recorded | Eiji Kitahama (lead)*, Rin Nanakura*, The Ally (ally) |
| I Think I Turned My Childhood Friend into a Girl | online | Not recorded | Hiura Mihate (lead)*, The Rival (against), The Ally (ally) |
| Sweet Home | online | The world of Sweet Home | Cha Hyun-soo (lead)*, Du-sik*, Lee Eun-hyuk*, Ahn Gil-seop*, Shin Joong-seop*, Byung-il* |
| Alya Sometimes Hides Her Feelings in Russian | light novel | Not recorded | Masachika Kuze (lead), Alisa Mikhailovna Kujō, The Ally (ally) |
| ZooPhobia | online | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| Cytonic | novel | The world of Cytonic | Spensa (lead)*, M-Bot*, Chet (ally)*, Hesho* |
| Viral Hit | online | Not recorded | Yoo Ho-bin (lead)*, The Rival (against), The Ally (ally) |
| Takopi's Original Sin | online | The world of Takopi's Original Sin | Shizuka Kuze (lead), Marina Kirarazaka, Takopi (ally), Naoki Azuma, Chappy* |
| Mistborn: The Lost Metal | novel | Elendel* | Wax (lead)*, Wayne (against)*, Autonomy*, Marasi*, Telsin* |
| The Summer Hikaru Died | online | Japan | Yoshiki (よしき) (lead), Tanaka (田中), "Hikaru" (ヒカル), Maki Yuuta (巻ゆうた), Tadokoro Yuuki (田所結希), Yamagishi Asako (山岸朝子) |
| Tress of the Emerald Sea | novel | The world of Tress of the Emerald Sea | Charlie (lead)*, Crow*, Huck*, Hoid*, Ann*, Fort* |
| Doctor Elise | online | Not recorded | The Lead (lead), The Rival (against), The Ally (ally) |
| A Returner's Magic Should Be Special | online | Not recorded | Desir Herrman (lead)*, The Rival (against), The Ally (ally) |
| Yumi and the Nightmare Painter | novel | Komashi | Yumi (lead), Nikaro (against), Hoid |
| The Guy She Was Interested In Wasn't a Guy at All | online | Not recorded | Aya Osawa (lead), Mitsuki Koga (against), Chizuru (ally), Joe, Kanna, Mao |
| The Sunlit Man | novel | The world of The Sunlit Man | Nomad (lead)*, Canticle*, Zellion* |
| Wind and Truth | novel | Shinovar* | Szeth (lead)*, Kaladin (against)*, Shallan*, Dalinar*, Odium*, Adolin* |
