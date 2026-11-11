// Ideas written for the game beyond the package's starter set (src/ideas/starter.ts): periods, genre blends, crowds, and
// more words for stakes, themes and fears. Original authored content. Every mechanical one names the code that reads what
// it sets; tests/ideas.test.ts checks each record, and that no genre or method it names is missing.
import type { Idea } from '../engine/brief';

const DOC = ['script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)'];
const T_APPLY = ['tests/brief.test.ts::every idea applies through the one command path and says first what it will do'];
const T_PERIOD = ['tests/looks.test.ts::1986 made in 2026 is a period: research, and half as much costume work again; 2026 is neither; the look it borrows changes no work'];
const T_CROWD = ['tests/looks.test.ts::made partly in post puts a quarter on set, shoots plates, and is finished after the picture is locked', 'tests/looks.test.ts::made up is made up head by head: the people on set, at a background performer\'s share'];
const PERIOD_READERS = ['looks.ts periodBand, projectBand', 'projects.ts deriveRequirements (period research)', 'production/tasks.ts buildTasks (costume work)'];

const DECADES: [string, number, string][] = [
  ['1920s', 1925, 'Between the wars: a costume house and a great deal of building.'], ['1930s', 1935, 'Hard years and sharp tailoring.'], ['1940s', 1945, 'Wartime and its end.'],
  ['1950s', 1955, 'Within living memory, and hired rather than found.'], ['1960s', 1965, 'A decade that changed halfway through.'], ['1970s', 1975, 'Still in costume houses, and in a few attics.'],
  ['1980s', 1986, 'Forty years back: hired, researched, and fitted.'], ['1990s', 1995, 'Just far enough to need a costume house.'], ['2000s', 2005, 'The recent past: findable second-hand, with care.'],
  ['2010s', 2015, 'Close enough to dress from shops and wardrobes.'],
];

const period: Idea[] = [
  ...DECADES.map(([d, year, text]): Idea => ({
    id: `period.${d}`, v: 1, field: 'period', label: `Set In The ${d}`, text: `The story happens in ${year}. ${text}`, kind: 'mechanical', scope: 'project', tags: ['period', d],
    patch: [{ op: 'year', year }], consumers: PERIOD_READERS, tests: T_PERIOD, excludes: ['period.present', ...DECADES.filter((x) => x[0] !== d).map((x) => `period.${x[0]}`)],
  })),
  { id: 'period.present', v: 1, field: 'period', label: 'Set In The Present Day', text: 'The story happens now, in the year it is made. No period research, and clothes from shops and wardrobes will do.', kind: 'mechanical', scope: 'project', tags: ['period', 'present'],
    patch: [{ op: 'year', year: null }], consumers: PERIOD_READERS, tests: T_PERIOD, excludes: DECADES.map((x) => `period.${x[0]}`) },
  ...DECADES.map(([d]): Idea => ({
    id: `style.${d}`, v: 1, field: 'style', label: `Borrow The Look Of The ${d}`, text: `Whatever year it is set in, it looks to the ${d} for its colours, type and framing. A note for the departments: it changes no work and no date.`, kind: 'reference', scope: 'project', tags: ['look', d],
    patch: [{ op: 'style', era: `The ${d}` }], consumers: ['the Creative Brief on the Script page (a note for the departments)'], tests: T_PERIOD,
  })),
];

const blend = (id: string, label: string, text: string, primary: string, secondary: string): Idea => ({
  id: `blend.${id}`, v: 1, field: 'genre-blend', label, text, kind: 'mechanical', scope: 'project', tags: ['genre', primary, secondary],
  patch: [{ op: 'genre', id: primary, emphasis: 'primary' }, { op: 'genre', id: secondary, emphasis: 'secondary' }],
  consumers: ['genres.ts composeGenres (the conventions asked for)', 'script-effects.ts competesAs (a secondary comedy genre doesn\'t make it a comedy)', 'projects.ts projectModules'],
  tests: ['tests/brief.test.ts::a blend sets a primary and a secondary genre, and only the primary decides where it competes'],
});
const blends: Idea[] = [
  blend('horror-comedy', 'Horror With A Comic Streak', 'Frightening first, funny second: the laughs come from people coping badly. It competes as a drama.', 'horror', 'comedy'),
  blend('comedy-horror', 'A Comedy With Monsters In It', 'Funny first, with real danger underneath. It competes as a comedy.', 'comedy', 'horror'),
  blend('crime-comedy', 'A Crime Story Played For Laughs', 'A plan, and the people least able to carry it out.', 'comedy', 'crime'),
  blend('mystery-drama', 'A Drama With A Question In It', 'A family or a town, and one thing nobody will say.', 'drama', 'mystery'),
  blend('scifi-romance', 'A Love Story With One Impossible Thing', 'One invented rule, and two people on either side of it.', 'romance', 'science-fiction'),
  blend('thriller-satire', 'A Thriller That Knows Who Profits', 'The chase is real, and so is the point about who set it going.', 'thriller', 'satire'),
  blend('western-horror', 'A Frontier With Something In The Dark', 'Open country by day, and a reason not to be out in it at night.', 'western', 'horror'),
  blend('musical-drama', 'A Drama That Breaks Into Song', 'The songs say what the characters can\'t.', 'drama', 'musical'),
];

const CROWD_READERS = ['looks.ts physicalCrowd, digitalCrowd, chairMinutes, makeupDayCost', 'production/schedule.ts sceneLoad, groupShootDays', 'production/tasks.ts buildTasks (crowd extension)', 'production/shoot.ts runShootDay', 'estimate.ts costBreakdown'];
const crowd: Idea[] = [
  { id: 'crowd.practical', v: 1, field: 'crowd', label: 'Everyone On Set', text: 'Every person the scene shows is there on the day, paid for the day.', kind: 'mechanical', scope: 'scene', tags: ['crowd'], patch: [{ op: 'crowd', method: 'practical' }], consumers: CROWD_READERS, tests: T_CROWD, excludes: ['crowd.digital'] },
  { id: 'crowd.digital', v: 1, field: 'crowd', label: 'Extend The Crowd In Post', text: 'A quarter of the crowd on set, at least eight, and the rest added afterwards: fewer people to pay and make up, clean plates on the day, and effects work once the picture is locked.', kind: 'mechanical', scope: 'scene', tags: ['crowd', 'effects'], patch: [{ op: 'crowd', method: 'digital' }], consumers: CROWD_READERS, tests: T_CROWD, excludes: ['crowd.practical'] },
  { id: 'crowd.wounds', v: 1, field: 'crowd', label: 'A Wounded Or Bloodied Crowd', text: 'The background is made up too: injuries and blood on everyone on set, head by head.', kind: 'mechanical', scope: 'scene', tags: ['crowd', 'makeup'], patch: [{ op: 'crowd', look: 'wounds' }], consumers: CROWD_READERS, tests: T_CROWD, fits: { media: ['live-action', 'hybrid'] }, excludes: ['crowd.creature', 'crowd.period-hair', 'crowd.plain'] },
  { id: 'crowd.creature', v: 1, field: 'crowd', label: 'A Crowd Of Creatures', text: 'Simplified appliances on every background performer. Hours of chair time for a large group: plan for more makeup artists, or fewer people.', kind: 'mechanical', scope: 'scene', tags: ['crowd', 'makeup', 'creature'], patch: [{ op: 'crowd', look: 'creature' }], consumers: CROWD_READERS, tests: T_CROWD, fits: { media: ['live-action', 'hybrid'], genres: ['horror', 'zombie', 'creature-feature', 'monster-movie'] }, excludes: ['crowd.wounds', 'crowd.period-hair', 'crowd.plain'] },
  { id: 'crowd.period-hair', v: 1, field: 'crowd', label: 'A Crowd In Period Hair', text: 'Wigs and set hair of the story\'s time on everyone in the background.', kind: 'mechanical', scope: 'scene', tags: ['crowd', 'makeup', 'period'], patch: [{ op: 'crowd', look: 'period-hair' }], consumers: CROWD_READERS, tests: T_CROWD, fits: { media: ['live-action', 'hybrid'] }, excludes: ['crowd.wounds', 'crowd.creature', 'crowd.plain'] },
  { id: 'crowd.plain', v: 1, field: 'crowd', label: 'A Crowd As They Come', text: 'The background as themselves: no makeup beyond what they arrive in.', kind: 'mechanical', scope: 'scene', tags: ['crowd'], patch: [{ op: 'crowd', look: null }], consumers: CROWD_READERS, tests: T_CROWD, excludes: ['crowd.wounds', 'crowd.creature', 'crowd.period-hair'] },
];

const words = (field: Idea['field'], story: 'stakes' | 'theme', id: string, label: string, text: string): Idea => ({
  id: `${field}.${id}`, v: 1, field, label, text, kind: 'brief', scope: 'project', tags: [field], patch: [{ op: 'story', field: story, text }], consumers: DOC, tests: T_APPLY,
});
const stakes: Idea[] = [
  words('stakes', 'stakes', 'home', 'A Place To Live', 'If it fails, the people in it lose the one place that is theirs.'),
  words('stakes', 'stakes', 'name', 'A Good Name', 'If the truth comes out, a name that took a lifetime to earn is gone in a day.'),
  words('stakes', 'stakes', 'trust', 'The Last Of Someone\'s Trust', 'There is one person left who still believes them, and this is the thing that could end it.'),
  words('stakes', 'stakes', 'deadline', 'A Door That Closes', 'After a fixed hour the chance is gone, whatever anyone has learned by then.'),
  words('stakes', 'stakes', 'debt', 'A Debt That Falls On Others', 'If they don\'t pay it, the people who vouched for them will.'),
  words('stakes', 'stakes', 'record', 'How It Will Be Remembered', 'Whoever is believed now writes the version that lasts.'),
  words('stakes', 'stakes', 'together', 'Staying Together', 'Either choice saves something, and no choice keeps everyone in the same place.'),
  words('stakes', 'stakes', 'safety', 'Someone Else\'s Safety', 'The danger was meant for them, and it has found someone who did nothing to earn it.'),
];
const themes: Idea[] = [
  words('theme', 'theme', 'owed', 'What We Owe Strangers', 'What do we owe people we will never see again?'),
  words('theme', 'theme', 'credit', 'Who Gets The Credit', 'Whose work is it, when one person is seen and another did it?'),
  words('theme', 'theme', 'promise', 'A Promise After Its Reason', 'Is a promise still binding once the person it was made to has changed?'),
  words('theme', 'theme', 'memory', 'Whose Memory Counts', 'When two people remember it differently, who decides what happened?'),
  words('theme', 'theme', 'work', 'The Dignity Of The Job', 'What is a job worth when nobody is watching it done?'),
  words('theme', 'theme', 'leaving', 'Leaving And Being Left', 'What do the ones who go owe the ones who stay?'),
  words('theme', 'theme', 'crowd', 'The Comfort Of The Crowd', 'How much do we give up to be believed by everyone?'),
  words('theme', 'theme', 'help', 'Asking For Help', 'What does it cost a proud person to ask?'),
  words('theme', 'theme', 'second', 'Second Chances', 'Who decides when someone has paid enough?'),
  words('theme', 'theme', 'small', 'Small Places', 'What does a small place know that a large one has forgotten?'),
];
const fear = (id: string, label: string, text: string): Idea => ({
  id: `fear.${id}`, v: 1, field: 'character-fear', label, text, kind: 'brief', scope: 'character', tags: ['character'], patch: [{ op: 'character', field: 'fears', text }],
  consumers: ['the character sheet and the casting breakdown (casting-notes.ts)'], tests: T_APPLY,
});
const fears: Idea[] = [
  fear('found-out', 'Being Found Out', 'That the people who rely on them will learn how little they know.'),
  fear('repeat', 'Repeating A Parent\'s Mistake', 'That they are already doing the thing they swore they never would.'),
  fear('alone', 'Being The Last One Left', 'That everyone else will leave, and they will be the one who stayed for nothing.'),
  fear('ordinary', 'Being Ordinary', 'That the one thing they are good at is something anyone could do.'),
  fear('owing', 'Owing Anyone', 'That accepting help now means being held to it for ever.'),
  fear('late', 'Arriving Too Late', 'That the one moment that mattered has already gone by.'),
  fear('harm', 'Doing Harm By Helping', 'That every time they step in, somebody else pays for it.'),
  fear('forgotten', 'Being Forgotten', 'That nothing they made will have their name on it.'),
];

export const MORE: Idea[] = [...period, ...blends, ...crowd, ...stakes, ...themes, ...fears];
