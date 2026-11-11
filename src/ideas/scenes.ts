// Ideas for the fields that had none until milestone C of the Creative Depth package: whose eyes a story is seen through,
// a documentary's question, where it is set, how a character comes across, what a scene is for, and what a scene needs on
// the day. Original authored content: no entry retells a real work or describes a real person. The first seven groups are
// words, kept and never read for meaning. The last four are lists the breakdown reads, so each entry there is work.
import type { Idea, IdeaField, NeedKind, SceneField, StoryField } from '../engine/brief';

const DOC = ['script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)'];
const T_APPLY = ['tests/brief.test.ts::every idea applies through the one command path and says first what it will do'];
const T_NEEDS = 'tests/scene-ideas.test.ts::';
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const story = (field: IdeaField, to: StoryField, rows: [string, string][], tags: string[]): Idea[] => rows.map(([label, text]): Idea => ({
  id: `${field}.${slug(label)}`, v: 1, field, label, text, kind: 'brief', scope: 'project', tags, patch: [{ op: 'story', field: to, text }], consumers: DOC, tests: T_APPLY,
}));

const viewpoint = story('viewpoint', 'viewpoint', [
  ['One Person, Close', 'We stay with one person and know only what they know, when they know it.'],
  ['An Outsider Arriving', 'Seen by someone new to the place, who has to be told what everyone else takes for granted.'],
  ['Told Looking Back', 'Someone who was there tells it years later, knowing how it ended and choosing what to leave out.'],
  ['Two Sides, Turn By Turn', 'We move between two people who want opposite things, and are never told which to side with.'],
  ['The Place As A Whole', 'No one person carries it: we follow the street, the shift or the household, whoever is nearest the trouble.'],
  ["A Child's Eye", 'Seen from the height of a child, who notices everything and is told almost nothing.'],
  ['The One Who Stayed', 'Told by the person left behind when the others went, who sees what leaving cost.'],
  ['A Witness, Not A Player', 'Someone at the edge watches it happen to other people, and has to decide whether to step in.'],
  ["The Other Side's Reasons", 'We spend real time with the person in the way, and learn why they think they are right.'],
  ['Handed On', 'Each part is carried by a different person, and what one starts another has to finish.'],
], ['point of view']);

const question = story('question', 'question', [
  ['Who Pays For It?', 'Who bears the cost of this, and who decided they would?'],
  ['What Was Lost When It Closed?', 'What went with it when it closed, beyond the jobs?'],
  ['Who Decided, And How?', 'Who made the decision, on what information, and who was not in the room?'],
  ['What Does The Work Do To Them?', 'What does doing this work, year after year, do to the people who do it?'],
  ['Why Here?', 'Why did this happen in this place and not in the next one along?'],
  ['Who Is Missing From The Record?', 'Whose account was never written down, and what changes when it is?'],
  ['What Would It Take To Fix?', 'What would it take to put this right, and who would have to give something up?'],
  ['What Does A Day Look Like?', 'What does one ordinary day of this look like, from first light to last?'],
  ['What Is Remembered, And By Whom?', 'How do the people who were there remember it, and where do their accounts part?'],
  ['What Happens Next?', 'When the attention moves on, what happens to the people still living with it?'],
], ['question']);

const setting: Idea[] = ([
  ['A Ferry Town In Winter', 'A ferry town in winter, when the last boat sets the length of every day.'],
  ['A Night Market', 'A night market that fills a car park at dusk and is gone by morning.'],
  ['A Research Station On The Ice', 'A research station on the ice, weeks from relief, where everyone knows everyone else\'s footsteps.'],
  ['An Estate Awaiting Demolition', 'A housing estate with a demolition date, half its flats already empty.'],
  ['A Border Railway Halt', 'A railway halt on a border, where every train stops and almost nobody gets off.'],
  ['A Hospital Night Ward', 'A hospital ward between midnight and six, run by the few who work those hours.'],
  ['A Family Restaurant After Closing', 'A family restaurant after the last table has gone, when the real conversations start.'],
  ['A High Pasture In Summer', 'A high pasture in summer, a day\'s walk above the village and its opinions.'],
  ['A Container Port', 'A container port that never stops, where a person is small and a mistake is large.'],
  ['A Valley About To Be Flooded', 'A valley in its last season before the dam is finished.'],
  ['A University In Exam Week', 'A university in exam week, when nobody sleeps and everything feels final.'],
  ['A Local Radio Station', 'A local radio station with four staff, one studio and a town that phones in.'],
  ['A Coach On A Long Road', 'A long-distance coach, a day and a night on one road with the same strangers.'],
  ['A Wedding Hall', 'A hired hall across one wedding day, from the first chair set out to the last light off.'],
  ['A Town After The Mine', 'A town a generation after its mine closed, still built around the shift whistle.'],
  ['A Salt Flat', 'A salt flat where the horizon is the only landmark and weather arrives without warning.'],
] as [string, string][]).map(([label, text]): Idea => ({
  id: `setting.${slug(label)}`, v: 1, field: 'setting', label, text, kind: 'brief', scope: 'project', tags: ['setting'],
  patch: [{ op: 'setting', text }], consumers: ['script-effects.ts DOCUMENTS (the Treatment)', 'the Script page (Story Setting)'], tests: T_APPLY,
}));

const description: Idea[] = ([
  ['Always Early', 'Arrives before everyone, and has already put the chairs out.'],
  ['One Bag, Always Packed', 'Carries everything they own that matters in one bag, and never unpacks it fully.'],
  ['Talks To Fill A Silence', 'Cannot leave a silence alone, and says the thing they meant to keep back.'],
  ['Hands That Fix Things', 'Mends whatever is nearest while talking, and trusts objects more than promises.'],
  ['Dressed For A Job They Lost', 'Still dresses for the work they used to do, a little more carefully each month.'],
  ['Laughs First', 'Laughs before anyone else can, so that nothing said afterwards can land.'],
  ['Watches The Door', 'Chooses the seat that faces the door, and notices who comes in before they speak.'],
  ['Keeps Lists', 'Writes everything down in a small book, and consults it when feelings would be quicker.'],
  ['Hard To Hurry', 'Moves at one speed whatever is happening, and is usually right about how long it takes.'],
  ['Remembers Every Name', 'Remembers every name and every favour, and can say exactly who owes what.'],
  ['Never Asks Twice', 'Asks for help once, plainly, and does not mention it again if the answer is no.'],
  ['Younger Than The Job', 'Was given the responsibility before the years, and is trying not to let either show.'],
] as [string, string][]).map(([label, text]): Idea => ({
  id: `character-description.${slug(label)}`, v: 1, field: 'character-description', label, text, kind: 'brief', scope: 'character', tags: ['character'],
  patch: [{ op: 'character', field: 'description', text }], consumers: ['script-effects.ts breakdownComplete (the casting breakdown offers go with)', 'the Characters page (Description)'], tests: T_APPLY,
}));

const scene = (field: IdeaField, to: SceneField, rows: [string, string][]): Idea[] => rows.map(([label, text]): Idea => ({
  id: `${field}.${slug(label)}`, v: 1, field, label, text, kind: 'brief', scope: 'scene', tags: ['scene'],
  patch: [{ op: 'scene', field: to, text }], consumers: ['the Script page (the scene card and its breakdown)'], tests: T_APPLY,
}));

const sceneObjective = scene('scene-objective', 'objective', [
  ['Ask For The One Thing', 'Someone has to ask for the one thing they swore they never would.'],
  ['Get Through The Door', 'Get past the person at the door without saying why they have really come.'],
  ['Deliver The News', 'Tell them what happened, and stay in the room afterwards.'],
  ['Buy An Hour', 'Keep them talking long enough for the others to finish.'],
  ['Find Out What They Know', 'Find out how much they know without revealing how much there is.'],
  ['Make The Offer', 'Put the offer on the table, and watch who looks at whom.'],
  ['Hand Over The Keys', 'Give up the thing they were trusted with, and see it treated carelessly.'],
  ['Say Goodbye Without Saying It', 'Leave for good, in a conversation that is about something else.'],
  ['Get The Signature', 'Come away with the signature, whatever has to be promised for it.'],
  ['Keep The Peace At The Table', 'Get the meal finished without the argument everyone can feel coming.'],
  ['Prove It Works', 'Show the doubters that it works, once, in front of them.'],
  ['Take The Blame', 'Step forward for something they did not do, before the person who did can speak.'],
  ['Count What Is Left', 'Work out exactly what they still have, and what it will buy.'],
  ['Wait For The Call', 'Wait, together, for news neither of them can affect.'],
]);

const sceneAction = scene('scene-action', 'action', [
  ['A Job Done While Talking', 'They work through a practical job together while the real subject comes out sideways.'],
  ['A Search Against The Clock', 'They turn the place over for one thing, and find another they were not meant to see.'],
  ['A Meal Nobody Eats', 'Food is served, passed and left, while the conversation does the damage.'],
  ['A Walk With A Destination', 'They walk somewhere on purpose, and arrive having decided something else.'],
  ['Packing Up', 'A room is packed into boxes, and every object needs a decision.'],
  ['A Lesson', 'One teaches the other something with their hands, and is surprised at how fast it is learnt.'],
  ['A Wait In A Public Place', 'They wait where anyone might overhear, and have to say it quietly.'],
  ['An Arrival Too Early', 'Someone arrives before the place is ready, and sees it as it really is.'],
  ['A Repair That Fails', 'They try to fix it, properly, and it breaks further.'],
  ['A Crowd Moving One Way', 'Everyone is heading the same way, and one person pushes back through them.'],
]);

const sceneTurn = scene('scene-turn', 'turningPoint', [
  ['The Wrong Person Answers', 'The person who answers is not the one they came for, and knows more.'],
  ['The Offer Is Accepted', 'The offer they made as a bluff is accepted on the spot.'],
  ['A Third Person Walks In', 'Someone walks in halfway through, and the conversation has to become another one.'],
  ['The Thing Is Not There', 'The thing they came for is already gone, and the dust says for how long.'],
  ['They Already Knew', 'The secret is told, and it turns out to have been known for years.'],
  ['The Favour Has A Price', 'The help is given, and then the price is named.'],
  ['A Name Is Said Aloud', 'Someone says the name nobody has said in this house, and the room changes.'],
  ['The Easy Way Is Refused', 'They are shown the easy way out and, to their own surprise, refuse it.'],
  ['The Plan Works Too Well', 'The plan works, more completely than anyone wanted.'],
  ['Help Comes From The Wrong Side', 'The only person who offers help is the one they have least reason to trust.'],
  ['The Clock Moves Up', 'The deadline they were working to is brought forward, in front of everyone.'],
  ['Someone Changes Sides', 'One of them quietly stops arguing, and starts agreeing with the other side.'],
]);

const NEED_READERS: Record<NeedKind, string[]> = {
  props: ['projects.ts deriveRequirements (props)', 'production/tasks.ts buildTasks (Production Design And Props)'],
  animals: ['projects.ts deriveRequirements (animals)', 'hiring.ts neededRoles (an animal wrangler is required)'],
  vehicles: ['projects.ts deriveRequirements (vehicles)', 'hiring.ts neededRoles (a vehicle coordinator is required)'],
  vfx: ['production/tasks.ts buildTasks (Visual Effects, which the colour grade waits for)', 'takes.ts requiredSetups (inserts)'],
};
const NEED_TEST: Record<NeedKind, string> = {
  props: 'props chosen from an idea are added to what the scene lists, and the art department\'s work grows with them',
  animals: 'an animal chosen from an idea requires a wrangler; without one the film needs none',
  vehicles: 'a vehicle chosen from an idea requires a coordinator; without one the film needs none',
  vfx: 'an effect chosen from an idea is visual effects work after the lock, which the grade waits for',
};
const needs = (field: IdeaField, kind: NeedKind, rows: [string, string, string[]][]): Idea[] => rows.map(([label, text, items]): Idea => ({
  id: `${field}.${slug(label)}`, v: 1, field, label, text, kind: 'mechanical', scope: 'scene', tags: [kind === 'vfx' ? 'effects' : kind],
  patch: [{ op: 'needs', kind, items }], consumers: NEED_READERS[kind], tests: [T_NEEDS + NEED_TEST[kind]],
  ...(kind === 'animals' || kind === 'vehicles' ? { fits: { media: ['live-action', 'hybrid'] as ('live-action' | 'hybrid')[] } } : {}),
}));

const props = needs('props', 'props', [
  ["A Dispatcher's Desk", 'What a night dispatcher works with, all of it practical and all of it handled.', ['Radio handset', 'Call log', 'Wall map with pins']],
  ['A Working Kitchen', 'Enough to cook a real meal on camera.', ['Knives and boards', 'Stock pot', 'Order tickets']],
  ['Papers That Matter', 'The documents the scene turns on, made to be read in close-up.', ['Signed contract', 'Stamped letter']],
  ['A Mechanic\'s Bench', 'Tools that are used, not arranged.', ['Socket set', 'Inspection lamp', 'Parts tray']],
  ['A Packed Suitcase', 'One case, and what somebody chose to put in it.', ['Suitcase', 'Framed photograph', 'Folded coat']],
  ['A Classroom', 'What thirty children leave on thirty desks.', ['Exercise books', 'Chalk and board rubber', 'Lunch boxes']],
  ['A Market Stall', 'Stock, scales and a cash tin.', ['Crates of produce', 'Hanging scales', 'Cash tin']],
  ['A Sick Room', 'The small objects that gather round a bed.', ['Medicine bottles', 'Water glass', 'Bedside clock']],
  ['A Celebration Table', 'A table laid for an occasion.', ['Cake', 'Candles', 'Wrapped presents']],
  ['A Keepsake', 'One small object that is handed over, kept, and noticed again later.', ['Keepsake']],
  ['Phones And Screens', 'What people hold now, with something on every screen.', ['Mobile phones', 'Laptop']],
  ['A Field Kit', 'What someone carries who works outdoors, far from help.', ['Rucksack', 'Field notebook', 'Hand radio']],
]);

const animals = needs('animals', 'animals', [
  ['A Dog That Knows The Way', 'A dog that has to hit a mark, wait, and go on a word.', ['Dog']],
  ['Horses At The Gate', 'Two horses, handled in shot.', ['Two horses']],
  ['A Caged Bird', 'A bird in a cage in the room, quiet until it matters.', ['Caged bird']],
  ['Sheep In The Road', 'A small flock that blocks the way.', ['Six sheep']],
  ['A Cat In The Window', 'A cat that sits where it is put, for as long as the scene takes.', ['Cat']],
  ['Chickens In The Yard', 'Hens loose in a yard, underfoot.', ['Hens']],
]);

const vehicles = needs('vehicles', 'vehicles', [
  ['A Delivery Van', 'A working van, driven in shot and parked on its mark.', ['Delivery van']],
  ['A Patrol Car', 'A marked car, lights working.', ['Patrol car']],
  ['A Bus With Passengers', 'A bus driven past and stopped, with people aboard.', ['Bus']],
  ['A Tractor', 'A tractor crossing the frame at its own speed.', ['Tractor']],
  ['A Taxi At The Kerb', 'A taxi that pulls up, waits and pulls away.', ['Taxi']],
  ['A Motorbike', 'A motorbike ridden in and out of shot.', ['Motorbike']],
  ['Two Cars In A Car Park', 'Two cars and the distance between them.', ['Saloon car', 'Hatchback']],
  ['A Small Fishing Boat', 'A boat brought alongside and tied up in shot.', ['Fishing boat']],
]);

const effects = needs('effects', 'vfx', [
  ['Screens And Monitors', 'What is on the screens is put there afterwards.', ['Screen replacement']],
  ['A Sky Replaced', 'The sky that was there on the day is changed for the one the scene needs.', ['Sky replacement']],
  ['Wires And Rigs Removed', 'The rigging that made it safe is painted out.', ['Rig removal']],
  ['Breath In The Cold', 'Visible breath added to a scene shot warm.', ['Breath in cold air']],
  ['A View Through The Window', 'What is outside the window is added later.', ['Window view']],
  ['A Set Extended', 'The street or the room goes on further than was built.', ['Set extension']],
  ['Weather Added', 'Rain or snow added to what was shot dry.', ['Added weather']],
  ['Something That Isn\'t There', 'A presence the cast played to on the day is put into the shot.', ['Composited figure']],
]);

export const SCENES: Idea[] = [...viewpoint, ...question, ...setting, ...description, ...sceneObjective, ...sceneAction, ...sceneTurn, ...props, ...animals, ...vehicles, ...effects];
