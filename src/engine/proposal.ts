// A whole creative brief proposed from a real work (the v4 package, 01 "Auto-fill the whole brief"). The player chooses a
// work from the source catalog, a format, a method and how closely to follow it; this composes a complete brief in the
// shape a blueprint has (engine/blueprints.ts), so it is previewed, kept, locked, renamed, applied and undone by the same
// code a written story was. It replaced the generated story library on November 12, 2026.
//
// What is the work's and what is the game's are never confused. Each field the proposal writes is one of three:
// - sourced: taken from the work's record as recorded (its title, its makers, the characters, places, period and
//   subjects Wikidata records, the installment that follows it, a Wikipedia article's own summary as its premise);
// - proposed: an adaptation choice the game makes from those facts and the player's choices, and says it made;
// - unknown: not recorded, and not guessed. The field says what is missing and asks for it (a faithful adaptation's
//   ending is the work's own, which the game does not have, so it says so instead of inventing one).
// Nothing here reconstructs a protected work's plot, and nothing proposed is presented as the author's.
import { adaptFrom } from './adaptation';
import { applyBlueprint, briefFields, type Blueprint, type BlueprintCharacter, type BlueprintScene } from './blueprints';
import { createProject, isEpisodic, isNonfiction, type NewProjectInput } from './projects';
import type { SourceWork } from './sources';
import type { AdaptationApproach, Format, GameState, Project } from './types';

export type FieldOrigin = 'sourced' | 'proposed' | 'unknown';
export const ORIGIN_LABELS: Record<FieldOrigin | 'edited', string> = { sourced: 'From The Work', proposed: 'Proposed', unknown: 'Not Recorded', edited: 'Your Words' };

export interface ProposalInput {
  work: SourceWork;
  format: Format;
  approach: AdaptationApproach;
  /** The game's year: an updated adaptation is set in it. */
  gameYear: number;
  episodes?: number;
  /** Minutes: a film's running time, or a series' episode length. */
  minutes?: number;
  /** The game's genre ids, so a proposal never names one the game lacks. */
  genres: ReadonlySet<string>;
}
export interface Proposal {
  blueprint: Blueprint;
  /** For every field it writes (blueprints.ts FIELD_LABELS keys): sourced, proposed or unknown. */
  origin: Record<string, FieldOrigin>;
  /** Why a proposed or unknown field says what it says, in a sentence, where that is not obvious. */
  why: Record<string, string>;
  /** What fitting this work to this format meant: what was selected, compressed or left for later. */
  notes: string[];
}

type Matrix = Blueprint['matrix'];
/** A proposed shape for the story by genre: what the lead is after, what stands against them, the choice and the outcome. Game choices, not readings of any work. */
const MATRIX: [RegExp, Matrix][] = [
  [/horror|slasher|zombie|vampire|werewolf|creature|kaiju|monster|splatter|occult|supernatural/, { goal: 'survive', opposition: 'creature', dilemma: 'survival-vs-humanity', resolution: 'pyrrhic' }],
  [/romance|romantic/, { goal: 'belong', opposition: 'person', dilemma: 'love-vs-duty', resolution: 'bittersweet' }],
  [/crime|detective|noir|mystery|whodunit|police|heist|caper|gangster|yakuza|giallo/, { goal: 'expose', opposition: 'secret', dilemma: 'loyalty-vs-truth', resolution: 'ironic' }],
  [/thriller|spy|espionage|conspiracy/, { goal: 'expose', opposition: 'institution', dilemma: 'safety-vs-freedom', resolution: 'open' }],
  [/fantasy|fairy|sword|myth|epic|wuxia/, { goal: 'restore', opposition: 'fate', dilemma: 'self-vs-others', resolution: 'transformed' }],
  [/science|cyber|space|time-travel|apocalyp|dystop|techno|steampunk/, { goal: 'understand', opposition: 'technology', dilemma: 'order-vs-change', resolution: 'open' }],
  [/war|military|western|samurai|survival|disaster/, { goal: 'survive', opposition: 'system', dilemma: 'self-vs-others', resolution: 'bittersweet' }],
  [/comedy|farce|satire|parody|slapstick|screwball/, { goal: 'win', opposition: 'community', dilemma: 'ambition-vs-integrity', resolution: 'reconciled' }],
  [/coming-of-age|teen|family|childrens/, { goal: 'belong', opposition: 'family', dilemma: 'belonging-vs-identity', resolution: 'transformed' }],
  [/adventure|action|swashbuckl|sea|chase/, { goal: 'find', opposition: 'rival', dilemma: 'self-vs-others', resolution: 'triumph' }],
  [/tragedy|melodrama|gothic/, { goal: 'keep', opposition: 'fate', dilemma: 'desire-vs-conscience', resolution: 'tragic' }],
];
const DEFAULT_MATRIX: Matrix = { goal: 'reconcile', opposition: 'past', dilemma: 'past-vs-future', resolution: 'bittersweet' };

const GOAL: Record<string, string> = {
  survive: 'survive', escape: 'get out', find: 'find what was lost', win: 'win', protect: 'protect the people who depend on them', expose: 'bring the truth into the open',
  restore: 'put right what was broken', belong: 'find a place among other people', create: 'make something that lasts', avenge: 'answer a wrong done to them', reconcile: 'mend what was broken between them and the people closest to them',
  understand: 'understand what is really happening', keep: 'hold on to what is theirs', leave: 'leave for good', rise: 'rise above where they started', atone: 'make amends', prove: 'prove what they are worth',
};
const AGAINST: Record<string, string> = {
  person: '{rival}', family: 'their own family', community: 'the people around them', institution: 'an institution with more power than they have', nature: 'the land and the weather',
  creature: 'something that is not human', self: 'their own worst habits', system: 'the way things are run', rival: '{rival}', time: 'time running out', secret: 'a secret someone has kept',
  fate: 'what everyone believes is already decided', technology: 'a technology nobody fully controls', past: 'what happened before',
};
const CHOICE: Record<string, [string, string]> = {
  'loyalty-vs-truth': ['loyalty', 'the truth'], 'safety-vs-freedom': ['safety', 'freedom'], 'love-vs-duty': ['love', 'duty'], 'self-vs-others': ['themselves', 'everyone else'],
  'justice-vs-mercy': ['justice', 'mercy'], 'ambition-vs-integrity': ['ambition', 'integrity'], 'past-vs-future': ['the past', 'the future'], 'belonging-vs-identity': ['belonging', 'who they are'],
  'order-vs-change': ['order', 'change'], 'faith-vs-evidence': ['faith', 'evidence'], 'survival-vs-humanity': ['staying alive', 'staying human'], 'desire-vs-conscience': ['what they want', 'what is right'],
};
const OUTCOME: Record<string, string> = {
  triumph: '{lead} succeeds, and the cost is one they can carry.', bittersweet: '{lead} gets what mattered most and loses something they cannot have back.', tragic: '{lead} fails, and understands why too late.',
  open: 'The last scene leaves the outcome with the audience.', ironic: '{lead} wins exactly what they asked for, and it is not what they needed.', pyrrhic: '{lead} wins, and what the win cost is shown in full.',
  reconciled: '{lead} and {rival} end on the same side.', transformed: '{lead} ends a different person from the one who began.', restored: 'What was broken is put back, changed.',
  escape: '{lead} gets away, and the story stays with what they left.', defeat: '{lead} loses, and goes on.',
};

const MEDIUM_GENRE: Record<string, string> = { novel: 'drama', 'short-story': 'drama', play: 'drama', poem: 'drama', comic: 'action', 'video-game': 'adventure', online: 'drama', 'light-novel': 'fantasy' };
const INVENTED_WORLD = /fantasy|science|space|fairy|myth|sword|cyber|steampunk|apocalyp|dystop/;
const LONG = new Set(['novel', 'light-novel', 'video-game', 'comic']);

const key = (name: string, used: Set<string>) => {
  let k = name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'person';
  if (/^\d/.test(k)) k = `p_${k}`;
  let out = k; let n = 2;
  while (used.has(out)) out = `${k}_${n++}`;
  used.add(out);
  return out;
};
/** What a character is, from its recorded kind ("fictional horse"); a person where nothing else is recorded. */
export function entityOf(kind?: string): BlueprintCharacter['entity'] {
  const k = (kind ?? '').toLowerCase();
  if (/horse|dog|cat|donkey|mule|animal|bird|wolf|lion|bear|pig|fox|rabbit|mouse|rat|whale|fish|monkey|ape|elephant|cow|goat|sheep/.test(k)) return 'animal';
  if (/robot|android|artificial intelligence|computer/.test(k)) return 'robot';
  if (/alien|extraterrestrial/.test(k)) return 'alien';
  if (/vampire|zombie|undead|ghoul|mummy/.test(k)) return 'undead';
  if (/dragon|monster|kaiju/.test(k)) return 'monster';
  if (/ghost|spirit|deity|god|demon|angel|fairy|supernatural|witch/.test(k)) return 'supernatural';
  return 'human';
}
const pronounsOf = (gender?: string) => (gender === 'male' ? 'he/him' : gender === 'female' ? 'she/her' : 'they/them');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** How many recorded characters a format can carry before the rest are left out. */
const castFor = (format: Format, minutes: number) => (isEpisodic(format) ? 7 : minutes <= 25 ? 3 : minutes <= 60 ? 4 : 6);
/** How many scenes an outline proposes. */
const scenesFor = (format: Format, minutes: number) => (isEpisodic(format) ? 6 : minutes <= 25 ? 5 : minutes <= 60 ? 6 : 8);

/** The beats an outline is built from, in order. Each scene takes one; a shorter outline drops from the middle. */
const BEATS: { act: 0 | 1 | 2; objective: string; action: string; turn: string; intExt: 'INT' | 'EXT'; time: 'DAY' | 'NIGHT' | 'DUSK' | 'DAWN' }[] = [
  { act: 0, objective: 'Show {lead} before anything changes', action: 'We meet {lead} at {place}, in the life the story is about to take away.', turn: '', intExt: 'INT', time: 'DAY' },
  { act: 0, objective: 'Bring the trouble to {lead}', action: 'The first sign of {against} reaches {lead}, and it cannot be ignored.', turn: '{lead} decides to {goal}.', intExt: 'EXT', time: 'DAY' },
  { act: 1, objective: 'Try the obvious way', action: '{lead} and {ally} try the straightforward way, and it fails in a way that teaches them something.', turn: '', intExt: 'EXT', time: 'DUSK' },
  { act: 1, objective: 'Learn what the other side wants', action: '{lead} comes face to face with {rival} and learns what {rival} is really after.', turn: 'What {lead} thought the problem was turns out to be smaller than the real one.', intExt: 'INT', time: 'NIGHT' },
  { act: 1, objective: 'Pay for the first victory', action: 'A gain for {lead} costs {ally} something, and the two of them are no longer sure of each other.', turn: '', intExt: 'INT', time: 'DAY' },
  { act: 1, objective: 'Force the choice', action: '{lead} is left with two ways forward: {choiceA} or {choiceB}.', turn: '{lead} chooses, and cannot take it back.', intExt: 'EXT', time: 'NIGHT' },
  { act: 2, objective: 'Settle it', action: 'At {place}, {lead} and {rival} meet for the last time.', turn: '{ending}', intExt: 'EXT', time: 'DAWN' },
  { act: 2, objective: 'Show what it cost', action: 'Afterwards, {lead} and {ally} take stock of what the choice cost and what it bought.', turn: '', intExt: 'INT', time: 'DAY' },
];
/** Which beats a given number of scenes uses: always the opening, the trouble, the choice and the end. */
const BEAT_SETS: Record<number, number[]> = { 5: [0, 1, 3, 5, 6], 6: [0, 1, 2, 3, 5, 6], 8: [0, 1, 2, 3, 4, 5, 6, 7] };

/** Propose a whole brief for a work. Pure: the same inputs propose the same brief. */
/** A sentence that ranks a work by sales or standing: kept out of a proposed premise. */
export const SALES_CLAIM = /\b(best[- ]?sell(ing|er)s?|copies sold|million copies|sold (over|more than)|of all time|most (popular|successful|widely read|translated))\b/i;

export function proposeFromSource(i: ProposalInput): Proposal {
  const w = i.work;
  const tv = isEpisodic(i.format);
  const minutes = i.minutes ?? (tv ? 30 : i.format === 'short' ? 12 : 95);
  const origin: Record<string, FieldOrigin> = {};
  const why: Record<string, string> = {};
  const notes: string[] = [];
  if (isNonfiction(i.format)) throw new Error("A documentary isn't adapted from a work of fiction. Develop a documentary instead.");

  // ---- Genres: the work's own, through the reviewed table; otherwise one proposed from its medium.
  const mapped = w.genres.map((g) => g.genre).filter((g) => i.genres.has(g));
  const genre = mapped[0] ?? (i.genres.has(MEDIUM_GENRE[w.medium]) ? MEDIUM_GENRE[w.medium] : 'drama');
  origin.genres = mapped.length ? 'sourced' : 'proposed';
  if (!mapped.length) why.genres = `No genre recorded for ${w.title} matches one of the game's; ${genre.replace(/-/g, ' ')} is proposed from its being a ${w.medium.replace(/-/g, ' ')}.`;
  const matrix = MATRIX.find(([re]) => re.test(genre))?.[1] ?? DEFAULT_MATRIX;
  const invented = INVENTED_WORLD.test(genre) || mapped.some((g) => INVENTED_WORLD.test(g));

  // ---- Characters: the ones recorded, the most written about first (the only recorded sign of who matters most), and
  // among equals the one the summary names first.
  const summary = w.summary?.text ?? '';
  const recorded = [...(w.characters ?? [])];
  const at = (n: string) => { const k = summary.indexOf(n.split(' ')[0]); return k < 0 ? Infinity : k; };
  recorded.sort((a, b) => (b.sitelinks ?? 0) - (a.sitelinks ?? 0) || at(a.name) - at(b.name) || a.name.localeCompare(b.name));
  const room = castFor(i.format, minutes);
  const chosen = recorded.slice(0, room);
  if (recorded.length > room) notes.push(`${w.title} records ${recorded.length} characters. A ${tv ? 'season' : minutes <= 25 ? 'short' : 'film'} can carry about ${room}, so the proposal keeps ${chosen.map((c) => c.name).join(', ')} and leaves the others for you to add back.`);
  const used = new Set<string>();
  type Who = { key: string; name: string; gender?: string; kind?: string; recorded: boolean };
  const people: Who[] = chosen.map((c) => ({ key: key(c.name, used), name: c.name, gender: c.gender, kind: c.kind, recorded: true }));
  // Too few recorded: the missing parts are named for what they do, for the player to name.
  const PARTS = ['The Lead', 'The Rival', 'The Ally'];
  for (const part of PARTS) if (people.length < Math.min(3, room)) people.push({ key: key(part, used), name: part, recorded: false });
  origin.characters = people.some((p) => p.recorded) ? 'sourced' : 'unknown';
  if (!recorded.length) why.characters = `No characters are recorded for ${w.title}. The three parts an outline needs are named for what they do; name them from the work.`;
  else if (people.some((p) => !p.recorded)) why.characters = `${w.title} records ${recorded.length === 1 ? 'one character' : `${recorded.length} characters`}; the other parts are named for what they do.`;
  else why.characters = 'The names are recorded. Who leads, and what each wants, are proposed: the record does not say who leads, so the ones most written about come first.';
  const [lead, rival, ally] = people;
  const extras = people.slice(3);
  const place = (n: number) => {
    const places = (w.places ?? []).map((p) => p.name);
    return places.length ? places[n % places.length] : invented ? `The World Of ${w.title}` : (n % 2 ? 'A Public Place' : 'Home');
  };

  // ---- When and where.
  const recordedPlace = (w.places ?? [])[0]?.name;
  const period = (w.periods ?? [])[0];
  let year: number | null; let time: Blueprint['time'];
  if (i.approach !== 'faithful' && !invented) {
    year = i.gameYear; time = 'contemporary'; origin.year = 'proposed';
    why.year = `${i.approach === 'updated' ? 'Moved' : 'Freely adapted'} to the present day, ${i.gameYear}.`;
  } else if (invented) {
    year = null; time = /science|space|cyber|apocalyp|dystop/.test(genre) ? 'future' : 'period'; origin.year = 'proposed';
    why.year = `${w.title} is ${genre.replace(/-/g, ' ')}; the proposal sets it in its own world with no calendar year.`;
  } else if (period) {
    year = null; time = 'period'; origin.year = 'sourced';
    why.year = `Recorded as set in ${period}. No single year is recorded; choose one if the story needs it.`;
  } else if (w.year !== null && w.year >= 1000 && w.year <= i.gameYear) {
    year = w.year; time = w.year < i.gameYear - 15 ? 'period' : 'contemporary'; origin.year = 'proposed';
    why.year = `No setting date is recorded; it is proposed in ${w.year}, when the work was published.`;
  } else {
    year = null; time = 'period'; origin.year = 'unknown';
    why.year = 'No date is recorded for when it is set, or when it was made.';
  }
  const settingName = (recordedPlace ?? (invented ? `The world of ${w.title}` : 'Not recorded')).slice(0, 100);
  origin.setting = recordedPlace ? 'sourced' : invented ? 'proposed' : 'unknown';
  if (!recordedPlace) why.setting = invented ? `No place is recorded; the proposal keeps the work's own world.` : `No place is recorded for ${w.title}. Name it from the work.`;

  // ---- Words.
  const [choiceA, choiceB] = CHOICE[matrix.dilemma];
  const against = AGAINST[matrix.opposition];
  const goal = GOAL[matrix.goal];
  const endingProposed = OUTCOME[matrix.resolution];
  const fill = (t: string) => t.replace(/\{goal\}/g, goal).replace(/\{against\}/g, against).replace(/\{choiceA\}/g, choiceA).replace(/\{choiceB\}/g, choiceB)
    .replace(/\{place\}/g, place(0)).replace(/\{ending\}/g, endingProposed)
    .replace(/\{lead\}/g, `{${lead.key}}`).replace(/\{rival\}/g, `{${rival.key}}`).replace(/\{ally\}/g, `{${ally.key}}`);
  const where = recordedPlace ? `In ${recordedPlace}` : invented ? `In the world of ${w.title}` : 'Where the story is set';
  const by = w.creators.map((c) => c.name).join(' and ');
  const logline = fill(`${where}, {lead} must {goal} against {against}, and choose between {choiceA} and {choiceB}.`);
  origin['story.logline'] = 'proposed';
  // A premise is story. A sentence about sales or standing (best-selling, copies sold, of all time) is left out of it:
  // the game names no list, metric, year or territory for such a claim (the v4 package; ledger V4-003.05).
  const sentences = summary ? summary.split(/(?<=[.!?])\s+(?=[A-Z"'(])/) : [];
  const told = sentences.filter((x) => !SALES_CLAIM.test(x));
  const premise = told.length ? told.join(' ') : fill(`An adaptation of ${w.title}${by ? ` by ${by}` : ''}${w.description ? `, ${w.description}` : ''}. {lead} sets out to {goal}.`);
  const dropped = sentences.length - told.length;
  origin['story.premise'] = told.length ? 'sourced' : 'proposed';
  why['story.premise'] = told.length ? `The English Wikipedia article "${w.summary!.article}", in its own words (${w.summary!.licence})${dropped ? `, less ${dropped === 1 ? 'a sentence' : `${dropped} sentences`} about its sales or standing, which the game can't vouch for` : ''}.` : `No summary is recorded for ${w.title}; this premise is the game's proposal, not the work's story.`;
  const synopsis = fill('{lead} lives a life that {against} is about to upend. When it arrives, {lead} decides to {goal}, first with {ally} and the obvious way, which fails. Facing {rival}, {lead} learns the real size of the problem, and the cost of each victory falls on someone close. Forced at last to choose between {choiceA} and {choiceB}, {lead} chooses. ') + fill(endingProposed);
  origin['story.synopsis'] = 'proposed';
  why['story.synopsis'] = `A shape for the adaptation, not ${w.title}'s plot: the game does not have the work's story, and writes none as if it were.`;
  // Faithful and updated keep the work's ending (adaptation.ts APPROACHES); only a free adaptation proposes its own.
  const faithfulEnd = i.approach !== 'free';
  const ending = faithfulEnd ? `The work's own ending, kept. The game does not record how ${w.title} ends; write it here from the work.` : fill(endingProposed);
  origin['story.ending'] = faithfulEnd ? 'unknown' : 'proposed';
  if (faithfulEnd) why['story.ending'] = `This approach keeps the work's ending, which is not recorded.`;
  for (const k of ['story.question', 'story.stakes', 'story.conflict', 'story.viewpoint', 'story.audience', 'story.intendedExperience', 'story.structure', 'tone', 'suggestions', 'relationships', 'scenes']) origin[k] = 'proposed';
  const themes = (w.subjects ?? []).slice(0, 3);
  origin['story.theme'] = themes.length ? 'sourced' : 'proposed';
  if (!themes.length) themes.push(cap(choiceA), cap(choiceB));
  origin.title = 'sourced';

  // ---- People.
  const char = (p: Who, n: number): BlueprintCharacter => {
    const role = n === 0 ? 'lead' : n === 1 ? 'antagonist' : n === 2 ? 'ally' : 'supporting';
    const T: Record<string, Omit<BlueprintCharacter, 'key' | 'name' | 'size' | 'functions' | 'entity' | 'pronouns' | 'age'>> = {
      lead: { wants: 'to {goal}', motivation: 'What {against} would take from them', obstacle: '{rival}, and their own doubt', contradiction: `Wants ${choiceA} and keeps choosing ${choiceB}`, arc: `From reacting to {against} to choosing between ${choiceA} and ${choiceB}`, voice: 'Proposed: set from the work', look: 'Proposed: set from the work' },
      antagonist: { wants: 'what {lead} is trying to stop', motivation: 'A reason of their own that the story must make clear', obstacle: '{lead}', contradiction: 'Right about something that matters', arc: 'From certainty to the moment {lead} proves them wrong, or right', voice: 'Proposed: set from the work', look: 'Proposed: set from the work' },
      ally: { wants: 'to see {lead} through it', motivation: 'What they owe {lead}, or want from them', obstacle: 'The price of standing with {lead}', contradiction: 'Loyal, and keeping something back', arc: 'From following {lead} to choosing for themselves', voice: 'Proposed: set from the work', look: 'Proposed: set from the work' },
      supporting: { wants: 'their own piece of what happens', motivation: 'Their place in the story', obstacle: 'What {lead} needs from them', contradiction: 'Proposed: set from the work', arc: 'Proposed: set from the work', voice: 'Proposed: set from the work', look: 'Proposed: set from the work' },
    };
    const t = T[role];
    return {
      key: p.key, name: p.name, size: n === 0 ? 'lead' : n < 3 ? 'supporting' : 'featured', functions: n === 0 ? ['protagonist'] : n === 1 ? ['antagonist'] : n === 2 ? ['ally'] : ['none'],
      entity: entityOf(p.kind), pronouns: pronounsOf(p.gender), age: '-',
      wants: fill(t.wants), motivation: fill(t.motivation), obstacle: fill(t.obstacle), contradiction: fill(t.contradiction), arc: fill(t.arc), voice: t.voice, look: t.look,
    };
  };
  const characters = people.map(char);
  const relationships = [
    { a: lead.key, b: rival.key, kind: 'opponents', start: fill('{rival} stands where {lead} needs to go'), end: fill(endingProposed) },
    { a: lead.key, b: ally.key, kind: 'allies', start: fill('{ally} is on {lead}\'s side'), end: fill('Changed by what it cost {ally}') },
  ];

  // ---- The outline.
  const count = scenesFor(i.format, minutes);
  const acts = tv ? ['Opening', 'Middle', 'Close'] : ['Beginning', 'Middle', 'End'];
  const each = Math.max(1, Math.min(30, Math.round((tv ? minutes : minutes) / count)));
  const scenes: BlueprintScene[] = BEAT_SETS[count].map((n, k) => {
    const b = BEATS[n];
    const here = place(k);
    const who = [lead.key, ...(b.action.includes('{rival}') ? [rival.key] : []), ...(b.action.includes('{ally}') ? [ally.key] : [])];
    return { act: acts[b.act], intExt: b.intExt, place: here, time: b.time, who, objective: fill(b.objective), action: fill(b.action).replace(place(0), here), turn: fill(b.turn), minutes: each };
  });
  // Everyone in the cast is in a scene: the extras join the scene with the ally.
  for (const x of extras) scenes.find((s) => s.who.includes(ally.key))!.who.push(x.key);

  // ---- Fitting it to the format.
  if (LONG.has(w.medium) && !tv && minutes <= 25) notes.push(`A short can hold one strand of a ${w.medium.replace(/-/g, ' ')}. The outline follows ${lead.name} through one conflict and leaves the rest of ${w.title} out.`);
  else if (LONG.has(w.medium) && !tv) notes.push(`A ${minutes}-minute film compresses ${w.title}: one line of action, ${characters.length} people, ${count} scenes to build from.`);
  if (w.medium === 'video-game') notes.push('A game\'s story is told through play. The proposal turns what the player is asked to do into what the lead wants.');
  // Wikidata's "followed by" is the next in a series or only the maker's next work; it is read as a next installment
  // only where the work is recorded as part of a series.
  const next = w.series ? w.followedBy : null;
  if (tv && next) notes.push(`${w.title} is followed by ${next.title} in ${w.series!.name} (recorded), which a later season could adapt.`);
  if ((w.adaptationCount ?? 0) > 0) notes.push(`${w.title} has been adapted before (${w.adaptationCount} recorded, among them ${(w.adaptations ?? []).slice(0, 3).map((a) => `${a.title}${a.year ? `, ${a.year}` : ''}`).join('; ')}). Yours is its own version.`);
  if (i.approach === 'updated' && !invented) notes.push(`Moved to ${i.gameYear}: the period is changed from the work, which the rights holder reads a draft against.`);

  const episodes = tv ? Math.max(2, Math.min(26, i.episodes ?? 6)) : 0;
  const PHASES = ['Arrival', 'First Steps', 'The Other Side', 'What It Costs', 'Turning', 'The Choice', 'Closing In', 'The Reckoning', 'After'];
  const blueprint: Blueprint = {
    id: `${genre}.${tv ? 't' : 'f'}01`, v: 1, format: i.format, structure: tv ? 'episodic' : 'three-act',
    title: w.title, genre, secondary: mapped.slice(1, 3),
    tone: fill(matrix.resolution === 'tragic' ? 'Grave, close and unsentimental' : matrix.goal === 'win' ? 'Quick, warm and sharp' : matrix.goal === 'survive' ? 'Tense, physical and uneasy' : 'Close to its people, steady and clear'),
    year, time, setting: { name: settingName, kind: invented || !recordedPlace ? 'fictional' : 'real', type: invented ? 'otherworld' : 'city' },
    logline, premise, synopsis,
    question: fill(`Can {lead} {goal} without giving up ${choiceA}, or ${choiceB}?`),
    themes, audience: 'Proposed: adults and older teenagers', viewpoint: fill('With {lead} throughout'),
    stakes: fill('If {lead} fails, {against} wins, and the people around {lead} pay for it.'), conflict: fill(`{lead} against {against}`), ending,
    experience: 'Proposed: a story that follows one person\'s choice to its end', look: `Proposed: drawn from ${w.title}'s own world and period`, sound: 'Proposed: chosen with the music brief',
    matrix, rules: [], characters, relationships, scenes,
    ...(tv ? {
      tv: {
        episodes, minutes,
        engine: fill('Each episode {lead} takes one more step toward the goal, and pays for it'), arc: fill('Over the season {lead} sets out to {goal}, and is brought to choose between {choiceA} and {choiceB}'),
        eps: Array.from({ length: episodes }, (_, n) => ({ n: n + 1, title: PHASES[Math.min(PHASES.length - 1, Math.floor((n / Math.max(1, episodes - 1)) * (PHASES.length - 1)))] + (episodes > PHASES.length && n > 0 ? ` ${n + 1}` : ''), moves: fill(n === 0 ? 'The trouble reaches {lead}' : n === episodes - 1 ? '{lead} makes the choice' : n === Math.floor(episodes / 2) ? '{lead} learns what {rival} wants' : '{lead} and {ally} push on') })),
        changes: fill('{lead} learns what the goal costs; {ally} learns to choose'), recurring: [...new Set([place(0), place(1)])],
        continuation: next ? `Open: the work is followed by ${next.title} in ${w.series!.name} (recorded), which a later season could adapt.` : i.format === 'limited-series' ? 'It ends with this season.' : 'Proposed: open, if the season is renewed.',
      },
    } : {}),
    review: { status: 'authored', at: 'proposed', note: `Proposed from ${w.title} (${w.id}).` },
    line: 0,
    origin: { kind: 'source', workId: w.id, title: w.title, approach: i.approach },
  };
  if (tv) {
    for (const k of ['series.engine', 'series.arc', 'series.episodes', 'series.changes', 'series.recurring']) origin[k] = 'proposed';
    origin['series.continuation'] = next ? 'sourced' : 'proposed';
  }
  // Unique episode titles: the phases repeat when a season is longer than the list.
  if (blueprint.tv) { const seen = new Map<string, number>(); for (const e of blueprint.tv.eps) { const n = (seen.get(e.title) ?? 0) + 1; seen.set(e.title, n); if (n > 1) e.title = `${e.title} (${n})`; } }
  return { blueprint, origin, why, notes };
}

export interface CreateFromSource {
  work: SourceWork;
  title?: string;
  axes: NewProjectInput['axes'];
  scenarioId: string;
  approach: AdaptationApproach;
  genres: ReadonlySet<string>;
  /** The player's names for the proposal's people, by its keys. */
  names?: Record<string, string>;
}

/**
 * Make a project from a work in one step (the v4 package, 01): the project, the work it is adapted from, the approach's
 * declared changes, and the whole proposed brief. If any part fails the project is removed again, so nothing half-made
 * is left and nothing is charged: making a project costs nothing until its work is paid for.
 */
export function createFromSource(state: GameState, c: CreateFromSource): Project {
  const minutes = c.axes.targetRuntimeMin;
  const prop = proposeFromSource({ work: c.work, format: c.axes.format, approach: c.approach, gameYear: new Date(state.now).getUTCFullYear(), episodes: c.axes.episodeCount, minutes, genres: c.genres });
  const p = createProject(state, { title: c.title?.trim() || c.work.title, axes: c.axes, scenarioId: c.scenarioId });
  try {
    adaptFrom(state, p, c.work);
    applyBlueprint(state, p, prop.blueprint, { names: c.names }, prop);
    if (c.title?.trim()) p.title = c.title.trim();
    return p;
  } catch (e) {
    state.projects = state.projects.filter((x) => x.id !== p.id);
    throw e;
  }
}

/** Where a field's words came from now: as proposed, or the player's own once they differ from what was written. */
export function fieldOrigin(p: Project, k: string): FieldOrigin | 'edited' | null {
  const o = p.proposal?.origin[k];
  if (!o) return null;
  const was = p.proposal!.applied[k];
  return was !== undefined && briefFields(p)[k] !== was ? 'edited' : o;
}
