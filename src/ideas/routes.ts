// Routes through a genre (the Creative Depth package, milestone C: "every existing canonical genre has ... at least
// several meaningful routes"). A route is one coherent way of doing a kind of story: a tone in a sentence, the light, the
// sound and the score that go with it (craft.ts), and three scenes offered, none added unless ticked. Sixty-eight are
// written, four for each of the seventeen families the genre catalog groups its 149 genres into; a genre is offered its
// family's four. Original authored content: no route retells a real work. Choosing a route promises nothing about how
// the film turns out; it sets what the work will be.
import type { Beat, Command, Idea } from '../engine/brief';
import type { Light, Score, SoundChoice } from '../engine/craft';

/** The catalog's genres by family (src/data/genre-catalog.json `legacy_parent_label`), copied here so the library needn't load the catalog; tests/routes.test.ts fails when the two differ. */
export const FAMILIES: Record<string, string[]> = {
  action: ['action', 'action-comedy', 'biker', 'blaxploitation', 'buddy-cop', 'chanbara', 'chase', 'disaster', 'grindhouse', 'martial-arts', 'samurai', 'spy', 'superhero', 'wuxia'],
  adventure: ['adventure', 'sea-adventure', 'swashbuckler', 'sword-and-sandal'],
  animation: ['animated', 'anime', 'isekai'],
  comedy: ['absurdist', 'black-comedy', 'buddy-comedy', 'caper', 'comedy', 'farce', 'hangout', 'mockumentary', 'parody', 'picaresque', 'romantic-comedy', 'satire', 'screwball-comedy', 'slapstick', 'stoner-comedy', 'teen'],
  crime: ['crime', 'detective', 'film-noir', 'gangster', 'heist', 'neo-noir', 'nordic-noir', 'police-procedural', 'true-crime', 'yakuza'],
  documentary: ['concert-film', 'documentary', 'nature-documentary', 'rockumentary'],
  drama: ['alternate-history', 'anthology', 'art-house', 'avant-garde', 'biographical', 'coming-of-age', 'costume-drama', 'courtroom-drama', 'docudrama', 'docufiction', 'domestic-drama', 'drama', 'epic', 'experimental', 'historical-drama', 'historical-fiction', 'hood-film', 'jidaigeki', 'kitchen-sink-drama', 'legal-drama', 'magical-realism', 'medical-drama', 'melodrama', 'mumblecore', 'neorealism', 'new-wave', 'period-drama', 'political-drama', 'prison-film', 'queer-cinema', 'road-movie', 'silent-film', 'slice-of-life', 'social-realism', 'sports', 'surrealist', 'tragedy', 'tragicomedy'],
  family: ['childrens', 'christmas', 'family', 'holiday'],
  fantasy: ['dark-fantasy', 'fairy-tale', 'fantasy', 'sword-and-sorcery'],
  horror: ['body-horror', 'cosmic-horror', 'creature-feature', 'eco-horror', 'exploitation', 'folk-horror', 'found-footage', 'giallo', 'gothic-horror', 'horror', 'horror-comedy', 'monster-movie', 'occult', 'psychological-horror', 'slasher', 'splatter', 'supernatural', 'vampire', 'werewolf', 'zombie'],
  musical: ['backstage-musical', 'dance', 'jukebox-musical', 'musical'],
  romance: ['romance', 'romantic-drama'],
  'science-fiction': ['apocalyptic', 'cyberpunk', 'dystopian', 'kaiju', 'post-apocalyptic', 'science-fantasy', 'science-fiction', 'space-opera', 'steampunk', 'time-travel', 'tokusatsu'],
  suspense: ['mystery', 'whodunit'],
  thriller: ['conspiracy-thriller', 'erotic-thriller', 'espionage', 'political-thriller', 'psychological-thriller', 'revenge', 'survival', 'techno-thriller', 'thriller'],
  war: ['military', 'war'],
  western: ['spaghetti-western', 'western'],
};

type Row = [label: string, tone: string, light: Light | '', sound: SoundChoice[], score: Score | '', scenes: [place: string, where: 'INT' | 'EXT', when: 'DAY' | 'NIGHT', what: string][]];

const ROUTES: Record<string, Row[]> = {
  comedy: [
    ['One Building, Many Doors', 'Fast and precise: people just miss each other, and every door matters.', '', ['clarity'], 'chamber', [['Hallway', 'INT', 'DAY', 'Two people who must not meet pass within a door of each other.'], ['Kitchen', 'INT', 'DAY', 'A lie told to one person has to be kept up in front of another.'], ['Front Step', 'EXT', 'DAY', 'Everyone arrives at once.']]],
    ['Deadpan', 'Dry and still: nobody admits anything is funny, least of all the camera.', '', ['sparse'], '', [['Waiting Room', 'INT', 'DAY', 'A long wait, and one person who will not stop being reasonable.'], ['Office', 'INT', 'DAY', 'A small request is refused by the rules.'], ['Car Park', 'EXT', 'DAY', 'A dignified exit goes slightly wrong.']]],
    ['On The Road Together', 'Warm and loose: two people stuck with each other, getting somewhere slowly.', 'available', ['texture'], '', [['Roadside', 'EXT', 'DAY', 'The transport gives up, and blame is shared out.'], ['Cafe', 'INT', 'DAY', 'A plan is made on a napkin.'], ['Guest Room', 'INT', 'NIGHT', 'An argument turns, without warning, into the truth.']]],
    ['The Scheme', 'Bright and escalating: a simple plan that needs one more lie every hour.', '', ['clarity'], 'percussive', [['Back Room', 'INT', 'NIGHT', 'The plan is explained, and sounds easy.'], ['Shop Floor', 'INT', 'DAY', 'The plan meets its first ordinary obstacle.'], ['Street', 'EXT', 'DAY', 'Everyone who was lied to is in one place.']]],
  ],
  action: [
    ['One Long Night', 'Tight and physical: one location, one night, and less help every hour.', 'contrast', ['clarity'], 'percussive', [['Loading Bay', 'EXT', 'NIGHT', 'The way out is closed off.'], ['Stairwell', 'INT', 'NIGHT', 'Floor by floor, with whatever is to hand.'], ['Roof', 'EXT', 'NIGHT', 'The last stand, and the thing it was really about.']]],
    ['The Chase', 'Forward at all times: the story is told on the move, and stopping costs.', 'available', ['texture'], 'percussive', [['Market Street', 'EXT', 'DAY', 'The pursuit starts on foot, through people with their own day to get on with.'], ['Underpass', 'EXT', 'DAY', 'A breath, a decision, and the wrong turning.'], ['Depot', 'INT', 'DAY', 'Cornered, with one idea left.']]],
    ['The Reluctant Team', 'Sharp and funny under pressure: people who would not choose each other.', '', ['clarity'], 'synth', [['Briefing Room', 'INT', 'DAY', 'The team is put together, against its own judgement.'], ['Van', 'INT', 'NIGHT', 'Waiting, and finding out who talks when nervous.'], ['Warehouse', 'INT', 'NIGHT', 'The plan fails, and they improvise as one.']]],
    ['The Duel', 'Spare and formal: two people of equal skill, and a meeting put off as long as it can be.', 'contrast', ['sparse'], 'chamber', [['Courtyard', 'EXT', 'DAY', 'They see each other for the first time, and neither moves.'], ['Workshop', 'INT', 'NIGHT', 'Preparation, done alone.'], ['Open Ground', 'EXT', 'DAY', 'The meeting, kept short.']]],
  ],
  adventure: [
    ['The Crossing', 'Wide and patient: a journey measured in days, with the land as the difficulty.', 'available', ['texture'], 'chamber', [['Trailhead', 'EXT', 'DAY', 'They set out with more than they can carry.'], ['Camp', 'EXT', 'NIGHT', 'What each of them is really going for comes out by the fire.'], ['High Pass', 'EXT', 'DAY', 'The point where turning back stops being possible.']]],
    ['The Map And The Rival', 'Quick and bright: a prize, a map with a piece missing, and someone else after it.', '', ['clarity'], 'percussive', [['Archive', 'INT', 'DAY', 'The missing piece is found, and so are they.'], ['Harbour', 'EXT', 'DAY', 'A boat is talked into.'], ['Ruin', 'EXT', 'DAY', 'The rival is already there.']]],
    ['Stranded', 'Close and practical: a few people, a place nobody chose, and what they have with them.', 'available', ['texture', 'sparse'], '', [['Shoreline', 'EXT', 'DAY', 'They count what came ashore.'], ['Shelter', 'INT', 'NIGHT', 'The first night, and the first disagreement about who decides.'], ['Headland', 'EXT', 'DAY', 'A signal is built.']]],
    ['Swords And Promises', 'High-spirited and romantic: honour, disguises and a fight on a staircase.', '', ['clarity'], 'chamber', [['Great Hall', 'INT', 'NIGHT', 'A challenge is made in public.'], ['Stable Yard', 'EXT', 'NIGHT', 'An escape that needs two people to trust each other.'], ['Battlements', 'EXT', 'DAY', 'The promise is kept, at a price.']]],
  ],
  drama: [
    ['One Family, One Week', 'Close and unhurried: a household under one pressure, watched day by day.', 'available', ['clarity'], 'chamber', [['Kitchen', 'INT', 'DAY', 'The news arrives while breakfast is still going on.'], ['Bedroom', 'INT', 'NIGHT', 'Two people talk about anything but the thing.'], ['Garden', 'EXT', 'DAY', 'It is finally said, outdoors, where nobody can slam a door.']]],
    ['The Decision', 'Plain and exact: one person, one choice, and everyone who will be changed by it.', '', ['sparse'], '', [['Office', 'INT', 'DAY', 'The choice is put to them, with a date.'], ['Bus', 'INT', 'DAY', 'They carry it home through an ordinary afternoon.'], ['Doorstep', 'EXT', 'NIGHT', 'They tell the person it will cost most.']]],
    ['A Life In Chapters', 'Spacious and observant: the same person at four ages, and what stayed.', '', ['texture'], 'chamber', [['Schoolyard', 'EXT', 'DAY', 'The thing that will matter later is barely noticed.'], ['Rented Room', 'INT', 'NIGHT', 'The first place that was theirs.'], ['Hospital Corridor', 'INT', 'DAY', 'They are now the one who is waited for.']]],
    ['The Institution', 'Level and unsparing: a place with rules, and a person the rules were not written for.', 'contrast', ['clarity'], '', [['Hearing Room', 'INT', 'DAY', 'The case is stated, in the institution\'s words.'], ['Corridor', 'INT', 'DAY', 'What is really decided is decided out here.'], ['Front Steps', 'EXT', 'DAY', 'The result, and the people waiting to hear it.']]],
  ],
  animation: [
    ['A Small Creature, A Big World', 'Curious and gentle: the world from knee height, where everything is an expedition.', '', ['creature'], 'chamber', [['Under The Table', 'INT', 'DAY', 'A crumb is a quest.'], ['Garden Wall', 'EXT', 'DAY', 'The edge of the known world.'], ['Drainpipe', 'EXT', 'NIGHT', 'The long way home.']]],
    ['Another World, Its Own Rules', 'Bold and strange: a place with its own logic, taken entirely seriously.', 'contrast', ['sparse'], 'synth', [['The Gate', 'EXT', 'DAY', 'The crossing, and the first rule learnt the hard way.'], ['Market Of That World', 'EXT', 'DAY', 'What things cost here.'], ['The Tower', 'INT', 'NIGHT', 'Who made the rules.']]],
    ['Friends On A Mission', 'Fast and funny: a team of opposites, a plan with a song in it.', '', ['clarity'], 'percussive', [['Clubhouse', 'INT', 'DAY', 'The mission is accepted before it is understood.'], ['Forest Path', 'EXT', 'DAY', 'The team falls out over the map.'], ['Summit', 'EXT', 'DAY', 'They get there together or not at all.']]],
    ['Memory, Drawn', 'Quiet and personal: something remembered, with the gaps left visible.', '', ['sparse'], 'chamber', [['Childhood Room', 'INT', 'DAY', 'The room as it was, or as it is remembered.'], ['Shoreline', 'EXT', 'DAY', 'A day that was replayed for years.'], ['Train Window', 'INT', 'NIGHT', 'Leaving, seen from the inside.']]],
  ],
  'science-fiction': [
    ['One Change, Followed Through', 'Cool and exact: one thing is different, and everything else follows from it.', '', ['sparse'], 'synth', [['Kitchen', 'INT', 'DAY', 'The change, seen first as a household matter.'], ['Clinic', 'INT', 'DAY', 'What the change has done to an ordinary appointment.'], ['Street', 'EXT', 'NIGHT', 'The moment someone refuses to go along with it.']]],
    ['After The End', 'Bare and watchful: few people, long distances, and old rules that no longer bind.', 'available', ['texture', 'sparse'], '', [['Empty Road', 'EXT', 'DAY', 'Two travellers decide whether to trust a third.'], ['Shelter', 'INT', 'NIGHT', 'What is shared, and what is kept back.'], ['Settlement Gate', 'EXT', 'DAY', 'A place with people in it, and a price for coming in.']]],
    ['The Crew', 'Close and procedural: a small crew, a long way from help, doing their jobs.', 'contrast', ['clarity'], 'synth', [['Control Room', 'INT', 'NIGHT', 'A reading that should not be possible.'], ['Mess', 'INT', 'NIGHT', 'The argument about what to tell the others.'], ['Airlock', 'INT', 'NIGHT', 'Someone has to go and look.']]],
    ['The City That Watches', 'Dense and nervous: neon, rain, and a system that knows where everyone is.', 'contrast', ['crowd'], 'synth', [['Night Market', 'EXT', 'NIGHT', 'A meeting hidden in a crowd.'], ['Capsule Room', 'INT', 'NIGHT', 'The thing that was not supposed to be found.'], ['Rooftop', 'EXT', 'NIGHT', 'Out of the cameras\' sight, for one conversation.']]],
  ],
  musical: [
    ['Putting On The Show', 'Generous and busy: rehearsals, rivalries, and an opening night nobody is ready for.', '', ['clarity', 'crowd'], 'chamber', [['Rehearsal Room', 'INT', 'DAY', 'The number does not work yet.'], ['Dressing Room', 'INT', 'NIGHT', 'Nerves, and a truth told to a mirror.'], ['Stage', 'INT', 'NIGHT', 'The number works.']]],
    ['They Sing What They Cannot Say', 'Heightened and sincere: people break into song when words stop being enough.', '', ['clarity'], 'chamber', [['Street Corner', 'EXT', 'DAY', 'A wish, sung to nobody.'], ['Balcony', 'EXT', 'NIGHT', 'Two people, one song, different meanings.'], ['Station', 'INT', 'DAY', 'A goodbye that has to be sung.']]],
    ['The Band', 'Loud and close: a group that sounds better than it gets on.', 'available', ['crowd', 'texture'], 'percussive', [['Garage', 'INT', 'NIGHT', 'The song arrives, in pieces.'], ['Van', 'INT', 'NIGHT', 'The long drive between two bad gigs.'], ['Small Club', 'INT', 'NIGHT', 'The night it works.']]],
    ['A Dance Tells It', 'Physical and wordless where it counts: the story is in who moves with whom.', 'contrast', ['sparse'], 'percussive', [['Studio', 'INT', 'DAY', 'A partnership is tried and does not fit.'], ['Empty Hall', 'INT', 'NIGHT', 'Practice alone, until it changes.'], ['Floor', 'INT', 'NIGHT', 'The dance, with everything in it.']]],
  ],
  horror: [
    ['Slow Dread In One House', 'Quiet and patient: wrong in small ways first, and never fully explained.', 'available', ['sparse'], '', [['Hallway', 'INT', 'NIGHT', 'Something is not where it was left.'], ['Kitchen', 'INT', 'DAY', 'By daylight, it is talked out of being true.'], ['Cellar Door', 'INT', 'NIGHT', 'Someone goes to look.']]],
    ['Siege Till Morning', 'Loud and close: a few people, a few doors, and the hours until light.', 'contrast', ['creature', 'clarity'], 'synth', [['Front Room', 'INT', 'NIGHT', 'The doors are counted and barred.'], ['Yard', 'EXT', 'NIGHT', 'Someone has to cross it.'], ['Roof', 'EXT', 'NIGHT', 'The first grey light, and who is left to see it.']]],
    ['The Thing Among Us', 'Tense and mistrustful: it looks like one of them, and everyone knows it.', 'contrast', ['clarity'], 'synth', [['Common Room', 'INT', 'NIGHT', 'A test is proposed, and nobody wants to go first.'], ['Corridor', 'INT', 'NIGHT', 'Two people decide to trust each other, for now.'], ['Store Room', 'INT', 'NIGHT', 'The test gives an answer.']]],
    ['The Old Custom', 'Bright and wrong: daylight, hospitality, and a tradition with a place set for the visitor.', 'available', ['texture', 'crowd'], 'chamber', [['Village Green', 'EXT', 'DAY', 'The welcome, which is a little too complete.'], ['Farmhouse Table', 'INT', 'DAY', 'A custom is explained, kindly.'], ['Field', 'EXT', 'DAY', 'The day the custom is kept.']]],
  ],
  family: [
    ['The Holiday That Nearly Failed', 'Warm and busy: everything goes wrong in time for it to matter less than expected.', '', ['clarity'], 'chamber', [['Front Room', 'INT', 'DAY', 'The plan for the day, read out with confidence.'], ['Kitchen', 'INT', 'DAY', 'The dinner does not survive.'], ['Front Step', 'EXT', 'NIGHT', 'Everyone ends up outside, and it is better.']]],
    ['A Child Sets Out', 'Brave and funny: a child with a job to do, and grown-ups who are no help.', '', ['texture'], 'chamber', [['Bedroom', 'INT', 'NIGHT', 'The plan, packed into a school bag.'], ['Bus Stop', 'EXT', 'DAY', 'A stranger who turns out to be useful.'], ['Edge Of Town', 'EXT', 'DAY', 'Further than they have ever been alone.']]],
    ['The Animal Who Came To Stay', 'Gentle and chaotic: a household rearranged around a creature nobody planned for.', '', ['creature'], '', [['Back Door', 'EXT', 'DAY', 'It arrives, and looks at them.'], ['Living Room', 'INT', 'DAY', 'The rule about the furniture is broken.'], ['Park', 'EXT', 'DAY', 'It is lost, and looked for by everyone.']]],
    ['Grandparent And Grandchild', 'Unhurried and kind: two people at either end of a family, lent to each other for a summer.', 'available', ['texture'], 'chamber', [['Allotment', 'EXT', 'DAY', 'A job is taught, slowly.'], ['Kitchen Table', 'INT', 'NIGHT', 'A story about the parent that the child was never told.'], ['Station Platform', 'EXT', 'DAY', 'The end of the summer.']]],
  ],
  documentary: [
    ['A Year With Them', 'Patient and present: the camera stays long enough to be forgotten.', 'available', ['texture'], '', [['Workplace', 'INT', 'DAY', 'An ordinary day, filmed whole.'], ['Home', 'INT', 'NIGHT', 'What they say when the work is done.'], ['The Same Place, Later', 'EXT', 'DAY', 'What a season changed.']]],
    ['The Question, Followed', 'Direct and curious: one question, asked of everyone who might know.', '', ['clarity'], '', [['Office', 'INT', 'DAY', 'The official answer.'], ['Kitchen', 'INT', 'DAY', 'The answer from someone it happened to.'], ['Archive', 'INT', 'DAY', 'What the record says, and what it leaves out.']]],
    ['The Event', 'Loud and immediate: one night, many cameras, and the crowd as a character.', 'contrast', ['crowd', 'texture'], '', [['Backstage', 'INT', 'NIGHT', 'The hour before.'], ['Front Of House', 'INT', 'NIGHT', 'The crowd, waiting.'], ['Stage', 'INT', 'NIGHT', 'The thing itself.']]],
    ['The Place Itself', 'Wordless where it can be: a landscape, its weather, and what lives in it.', 'available', ['texture', 'sparse'], 'chamber', [['Shoreline', 'EXT', 'DAY', 'First light, and who is already awake.'], ['Woodland', 'EXT', 'DAY', 'An hour of waiting for a minute of film.'], ['Hide', 'INT', 'NIGHT', 'The people who do the waiting.']]],
  ],
  thriller: [
    ['The Wrong Person', 'Lean and paranoid: an ordinary person mistaken for someone worth chasing.', 'available', ['clarity'], 'synth', [['Hotel Lobby', 'INT', 'DAY', 'A message is handed to the wrong person.'], ['Train', 'INT', 'NIGHT', 'Someone is following, politely.'], ['Car Park', 'EXT', 'NIGHT', 'The first chance to give it back, refused.']]],
    ['The Room And The Clock', 'Contained and exact: one room, one deadline, and information as the weapon.', 'contrast', ['clarity', 'sparse'], '', [['Interview Room', 'INT', 'NIGHT', 'Two people, and one of them is lying well.'], ['Corridor', 'INT', 'NIGHT', 'A minute to check a single fact.'], ['Interview Room', 'INT', 'NIGHT', 'The fact is used.']]],
    ['They Know', 'Cold and procedural: someone has found out, and the people it concerns are deciding what to do.', 'contrast', ['sparse'], 'synth', [['Open-Plan Office', 'INT', 'DAY', 'A file is opened that should not exist.'], ['Underground Car Park', 'INT', 'NIGHT', 'A warning, given as advice.'], ['Flat', 'INT', 'NIGHT', 'Someone has been in.']]],
    ['Alone Out There', 'Physical and stripped back: one person, hard country, and no rescue coming.', 'available', ['texture', 'sparse'], '', [['Ridge', 'EXT', 'DAY', 'The accident, and the count of what is left.'], ['Gully', 'EXT', 'NIGHT', 'The first night, and the cold.'], ['River', 'EXT', 'DAY', 'The only way down.']]],
  ],
  crime: [
    ['The Job', 'Cool and methodical: a plan, a crew, and the part nobody planned for.', 'contrast', ['clarity'], 'percussive', [['Back Room', 'INT', 'NIGHT', 'The plan, laid out on a table.'], ['Across The Street', 'EXT', 'DAY', 'Watching the place, for the third day.'], ['Vault Corridor', 'INT', 'NIGHT', 'The part nobody planned for.']]],
    ['The Case', 'Dogged and plain: one investigator, one case, and a town that would rather not know.', 'available', ['clarity', 'texture'], '', [['Incident Room', 'INT', 'DAY', 'What is known, pinned to a wall.'], ['Doorstep', 'EXT', 'DAY', 'A witness who has decided what they saw.'], ['Riverbank', 'EXT', 'DAY', 'The thing everyone walked past.']]],
    ['A Rise And What It Costs', 'Seductive and unsentimental: somebody clever gets what they want, one compromise at a time.', 'contrast', ['crowd'], 'chamber', [['Club', 'INT', 'NIGHT', 'A favour is done for the right person.'], ['Family Table', 'INT', 'DAY', 'The money is explained, badly.'], ['Empty Office', 'INT', 'NIGHT', 'At the top, and alone.']]],
    ['Rain And Bad Choices', 'Dark and fated: a tired person takes one job they know better than to take.', 'contrast', ['sparse'], 'chamber', [['Office', 'INT', 'NIGHT', 'A client who is not telling it all.'], ['Bar', 'INT', 'NIGHT', 'An old friend with a warning.'], ['Alley', 'EXT', 'NIGHT', 'It was a set-up, and they half knew.']]],
  ],
  fantasy: [
    ['The Small Folk And The Long Road', 'Open-hearted and large: ordinary people carrying something too big for them.', 'available', ['texture'], 'chamber', [['Village Inn', 'INT', 'NIGHT', 'The burden is handed over, with apologies.'], ['Forest Road', 'EXT', 'DAY', 'The first sign they are followed.'], ['Mountain Door', 'EXT', 'NIGHT', 'A door that needs the right word.']]],
    ['A Bargain With Something Old', 'Dark and careful: a wish granted exactly, by something that keeps accounts.', 'contrast', ['sparse', 'creature'], 'chamber', [['Crossroads', 'EXT', 'NIGHT', 'The bargain is offered.'], ['Home', 'INT', 'DAY', 'The wish is granted, exactly.'], ['Crossroads', 'EXT', 'NIGHT', 'The account comes due.']]],
    ['The Tale As It Was Told', 'Simple and strange: a story with the logic of one told aloud, kept that way.', '', ['sparse'], 'chamber', [['Cottage', 'INT', 'DAY', 'Three rules are given.'], ['Wood', 'EXT', 'DAY', 'The second rule is broken.'], ['Castle Hall', 'INT', 'NIGHT', 'The price of the third.']]],
    ['Blades And Sorcery', 'Brash and quick: a sword for hire, a thief, and a tower with something in it.', 'contrast', ['clarity', 'creature'], 'percussive', [['Tavern', 'INT', 'NIGHT', 'The job is offered, for too much money.'], ['Tower Stair', 'INT', 'NIGHT', 'The guardian, which is not what was described.'], ['Rooftops', 'EXT', 'NIGHT', 'The getaway, lighter than planned.']]],
  ],
  war: [
    ['One Unit, One Objective', 'Close and unheroic: a handful of people, an order, and the ground between.', 'available', ['texture', 'clarity'], '', [['Dugout', 'INT', 'NIGHT', 'The order arrives, and is read twice.'], ['Open Field', 'EXT', 'DAY', 'The crossing.'], ['Farm Building', 'INT', 'DAY', 'The objective, and what it turns out to be.']]],
    ['The Home Front', 'Quiet and worn: the war as it reaches a street far from it.', 'available', ['clarity'], 'chamber', [['Kitchen', 'INT', 'DAY', 'A letter, and the wait before opening it.'], ['Factory Floor', 'INT', 'DAY', 'The work that has to go on.'], ['Station', 'EXT', 'DAY', 'A train comes in, and not everyone is on it.']]],
    ['The Order', 'Tense and moral: an instruction that is legal, and someone who has to carry it out.', 'contrast', ['clarity'], '', [['Command Tent', 'INT', 'NIGHT', 'The order is given, and questioned once.'], ['Checkpoint', 'EXT', 'DAY', 'The moment to carry it out.'], ['Inquiry Room', 'INT', 'DAY', 'It is accounted for, afterwards.']]],
    ['After It Ended', 'Still and unresolved: people come back, and the place they left has gone on without them.', '', ['sparse'], 'chamber', [['Front Door', 'EXT', 'DAY', 'The return, and a child who does not know them.'], ['Bar', 'INT', 'NIGHT', 'The only people who understand.'], ['Bedroom', 'INT', 'NIGHT', 'What cannot be told.']]],
  ],
  suspense: [
    ['Everyone In The House', 'Neat and sly: a closed circle, a death, and a reason for each of them.', '', ['clarity'], 'chamber', [['Drawing Room', 'INT', 'NIGHT', 'Everyone is asked to stay.'], ['Study', 'INT', 'DAY', 'One alibi comes apart at the edge.'], ['Drawing Room', 'INT', 'NIGHT', 'It is explained, with everyone present.']]],
    ['The Thing That Does Not Fit', 'Curious and exact: one small detail that will not go away.', 'available', ['sparse'], '', [['Front Garden', 'EXT', 'DAY', 'The detail is noticed, and dismissed.'], ['Library', 'INT', 'DAY', 'It is looked up.'], ['Lane', 'EXT', 'NIGHT', 'It is proved, in person.']]],
    ['The Amateur', 'Light and stubborn: someone with no business asking questions, asking them.', '', ['clarity', 'texture'], 'chamber', [['Shop', 'INT', 'DAY', 'A customer says something that does not add up.'], ['Church Hall', 'INT', 'DAY', 'Everyone in town, and one who leaves early.'], ['Allotments', 'EXT', 'DAY', 'What was buried.']]],
    ['The Vanishing', 'Uneasy and open: someone is gone, and each account of the last day is slightly different.', 'contrast', ['sparse'], 'synth', [['Empty Flat', 'INT', 'DAY', 'A room left as if for an hour.'], ['Cafe', 'INT', 'DAY', 'The last person to see them, sure of the wrong thing.'], ['Towpath', 'EXT', 'NIGHT', 'The walk they took, retraced.']]],
  ],
  romance: [
    ['Wrong Time, Right Person', 'Tender and rueful: two people who suit each other, meeting when neither is free to.', 'available', ['clarity'], 'chamber', [['Station Cafe', 'INT', 'DAY', 'A conversation that runs past the train.'], ['Bridge', 'EXT', 'NIGHT', 'What they do not say.'], ['Doorway', 'EXT', 'DAY', 'A second meeting, years on.']]],
    ['They Cannot Stand Each Other', 'Quick and warm: an argument that turns out to be the best conversation either has.', '', ['clarity'], 'chamber', [['Office', 'INT', 'DAY', 'They are made to work together.'], ['Late Train', 'INT', 'NIGHT', 'Stuck, and unexpectedly honest.'], ['Party', 'INT', 'NIGHT', 'Each sees the other being kind to someone else.']]],
    ['Letters', 'Slow and private: two people who know each other best on paper.', 'available', ['sparse'], 'chamber', [['Desk', 'INT', 'NIGHT', 'A letter is written, and nearly not sent.'], ['Post Office', 'INT', 'DAY', 'A reply, read standing up.'], ['Platform', 'EXT', 'DAY', 'The first meeting.']]],
    ['A Marriage, Looked At', 'Honest and close: two people long together, deciding whether they still are.', 'available', ['clarity'], '', [['Kitchen', 'INT', 'NIGHT', 'An ordinary row that goes somewhere new.'], ['Car', 'INT', 'DAY', 'The long silence on a familiar road.'], ['Old Flat', 'INT', 'DAY', 'Where it started, visited.']]],
  ],
  western: [
    ['The Stranger Rides In', 'Spare and watchful: a town with a problem, and someone passing through who could fix it.', 'available', ['texture', 'sparse'], 'chamber', [['Main Street', 'EXT', 'DAY', 'The arrival, watched from every window.'], ['Saloon', 'INT', 'NIGHT', 'The town\'s problem introduces itself.'], ['Main Street', 'EXT', 'DAY', 'The street, emptied.']]],
    ['The Long Drive', 'Wide and weary: a herd, a crew, and a thousand miles of reasons to quit.', 'available', ['texture'], '', [['River Crossing', 'EXT', 'DAY', 'The crossing that costs them.'], ['Night Camp', 'EXT', 'NIGHT', 'Who is thinking of leaving.'], ['Railhead', 'EXT', 'DAY', 'The end, and what it paid.']]],
    ['The Land And The Law', 'Stubborn and plain: a family on a claim, and people with paper that says otherwise.', '', ['clarity'], 'chamber', [['Homestead Porch', 'EXT', 'DAY', 'The paper is served.'], ['Land Office', 'INT', 'DAY', 'The law, explained by the people it suits.'], ['Fence Line', 'EXT', 'DAY', 'The day they come to move them.']]],
    ['Three People And The Money', 'Sly and sun-struck: nobody is good, and everybody is counting.', 'contrast', ['sparse'], 'percussive', [['Desert Well', 'EXT', 'DAY', 'A partnership, made at gunpoint.'], ['Ghost Town', 'EXT', 'DAY', 'One of them has been here before.'], ['Graveyard', 'EXT', 'DAY', 'Three people, one prize, and a long look.']]],
  ],
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const READERS = ['craft.ts craftTime, craftRoles, postFactors (the light, the sound, the score)', 'production/tasks.ts buildTasks', 'projects.ts deriveRequirements (each scene ticked is a location and a shoot day\'s work)'];
const TESTS = ['tests/routes.test.ts::a route sets the light, the sound and the score it names, and the work follows', 'tests/routes.test.ts::every genre in the catalog is offered at least four routes'];

/** The routes as idea records, built when the library loads so each names its family's genres as the catalog has them. */
export function routes(): Idea[] {
  return Object.entries(ROUTES).flatMap(([family, rows]) => rows.map(([label, tone, light, sound, score, scenes]): Idea => {
    const beats: Beat[] = scenes.map(([place, intExt, time, objective]) => ({ place, intExt, time, objective, minutes: 3 }));
    const patch: Command[] = [{ op: 'tone', text: tone }, ...(light ? [{ op: 'light' as const, light }] : []), ...sound.map((add) => ({ op: 'sound' as const, add })), ...(score ? [{ op: 'score' as const, score }] : []), { op: 'beats', beats }];
    return {
      id: `route.${family}-${slug(label)}`, v: 1, field: 'genre-route', label, text: tone, kind: 'mechanical', scope: 'project', tags: ['route', family],
      fits: { genres: FAMILIES[family] }, patch, consumers: READERS, tests: TESTS,
    };
  }));
}
