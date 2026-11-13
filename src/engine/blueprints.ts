// Full stories the player can start from (the v3 package, 01-STORIES-AND-CHARACTERS.md). A blueprint is a whole original
// story written for this game: its title, premise and synopsis, the people in it and what is between them, how it is
// built, a scene outline, and, for a series, its first season episode by episode. Choosing one writes all of that into
// the fields the game already has, in one step that Undo takes back. It is material to develop: it skips no writing
// work, financing, casting or production, and an outline is not a screenplay.
//
// Blueprints are text files, one for each genre, in src/blueprints/ (the format is in docs/v3/BLUEPRINT-FORMAT.md),
// loaded when the picker opens. This module holds no story. It reads the format, says what is wrong with an entry,
// says what applying one would change, and applies it by calling the functions the pages' own controls call.
//
// Three things are never confused: an original blueprint (written for this game, with its own ID), a real work in the
// source catalog (sources.ts, not here), and a film or series in the imported catalog (a reference, never a plot).
// Nothing here is read for meaning or scored: the words are the player's to change, and the choices that engines read
// (genres, the year, what a scene needs on the day) are set through the same typed fields as anywhere else.
import { addCharacter, addScene, assertEditable, isEpisodic, isNonfiction, setGenres, updateCharacter, updateScene } from './projects';
import { newId } from './state';
import type { Entity, Format, GameState, IntExt, NarrativeFunction, Project, RoleSize, Scene, TimeOfDay } from './types';

export const FILM_FORMATS: Format[] = ['feature', 'short', 'mid-length', 'tv-film', 'documentary-feature', 'documentary-short'];
export const TV_FORMATS: Format[] = ['series', 'limited-series', 'anthology-series', 'documentary-series', 'web-series'];
export const formatClass = (f: Format): 'film' | 'tv' | null => (FILM_FORMATS.includes(f) ? 'film' : TV_FORMATS.includes(f) ? 'tv' : null);

/** How a story is built, in the words the page shows. */
export const STRUCTURES: Record<string, string> = {
  'three-act': 'Three Acts', 'four-act': 'Four Acts', 'five-act': 'Five Acts', 'two-part': 'Two Parts', circular: 'Circular', episodic: 'Episodic',
  nonlinear: 'Out Of Order', parallel: 'Parallel Stories', 'real-time': 'Real Time', frame: 'A Story Within A Frame', chapters: 'Chapters', journey: 'A Journey',
};
export const SETTING_TYPES = ['city', 'town', 'village', 'suburb', 'wilderness', 'sea', 'island', 'desert', 'mountain', 'farm', 'road', 'border', 'institution', 'school', 'workplace', 'home', 'court', 'battlefield', 'ship', 'space', 'underground', 'otherworld'] as const;
// The diversity matrix's words (the v3 package, 01 section 2): what the lead is after, what stands against them, the choice at the centre, and how it comes out.
export const GOALS = ['survive', 'escape', 'find', 'win', 'protect', 'expose', 'restore', 'belong', 'create', 'avenge', 'reconcile', 'understand', 'keep', 'leave', 'rise', 'atone', 'prove'] as const;
export const OPPOSITIONS = ['person', 'family', 'community', 'institution', 'nature', 'creature', 'self', 'system', 'rival', 'time', 'secret', 'fate', 'technology', 'past'] as const;
export const DILEMMAS = ['loyalty-vs-truth', 'safety-vs-freedom', 'love-vs-duty', 'self-vs-others', 'justice-vs-mercy', 'ambition-vs-integrity', 'past-vs-future', 'belonging-vs-identity', 'order-vs-change', 'faith-vs-evidence', 'survival-vs-humanity', 'desire-vs-conscience'] as const;
export const RESOLUTIONS = ['triumph', 'bittersweet', 'tragic', 'open', 'ironic', 'pyrrhic', 'reconciled', 'transformed', 'restored', 'escape', 'defeat'] as const;

const SIZES: RoleSize[] = ['lead', 'co-lead', 'ensemble-lead', 'supporting', 'featured', 'background', 'cameo'];
const FUNCTIONS: NarrativeFunction[] = ['protagonist', 'antagonist', 'deuteragonist', 'ally', 'mentor', 'foil', 'rival', 'love-interest', 'narrator', 'none'];
const ENTITIES: Entity[] = ['human', 'animal', 'alien', 'robot', 'supernatural', 'monster', 'undead', 'anthropomorphic-object', 'custom'];
const TIMES: TimeOfDay[] = ['DAY', 'NIGHT', 'DAWN', 'DUSK'];
const INT_EXT: IntExt[] = ['INT', 'EXT', 'INT/EXT'];

export interface BlueprintCharacter {
  key: string; name: string; size: RoleSize; functions: NarrativeFunction[]; entity: Entity; pronouns: string; age: string;
  wants: string; motivation: string; obstacle: string; contradiction: string; arc: string; voice: string; look: string;
}
export interface BlueprintScene {
  act: string; intExt: IntExt; place: string; time: TimeOfDay; who: string[]; objective: string; action: string; turn: string; minutes: number;
  /** A series' episode, from 1 (a proposal from a work's story, proposal.ts); the first where none is given. */
  episode?: number;
  crowd?: number; stunts?: string; water?: true; intimacy?: true; dance?: true; vfx?: string[]; animals?: string[]; vehicles?: string[]; props?: string[];
}
export interface Blueprint {
  id: string; v: number; format: Format; structure: string; title: string; genre: string; secondary: string[];
  tone: string; year: number | null; time: 'contemporary' | 'period' | 'future'; setting: { name: string; kind: 'real' | 'fictional'; type: string };
  logline: string; premise: string; synopsis: string; question: string; themes: string[]; audience: string; viewpoint: string;
  stakes: string; conflict: string; ending: string; experience: string; look: string; sound: string;
  matrix: { goal: string; opposition: string; dilemma: string; resolution: string };
  rules: { rule: string; limit: string }[];
  characters: BlueprintCharacter[];
  relationships: { a: string; b: string; kind: string; start: string; end: string }[];
  scenes: BlueprintScene[];
  tv?: { episodes: number; minutes: number; engine: string; arc: string; eps: { n: number; title: string; moves: string }[]; changes: string; recurring: string[]; continuation: string };
  /** Documentary: who it would follow and how they might be reached, what it asks, and what would have to be shown. Nobody is promised and nothing is found in advance. */
  doc?: { subjects: { name: string; role: string; access: string }[]; asks: { question: string; reference: string }[]; evidence: { claim: string; note: string }[] };
  review: { status: 'reviewed' | 'authored'; at: string; note: string };
  /** The line it starts on in its file, for a problem's message. */
  line: number;
  /** Proposed from a real work (proposal.ts), not written for this game: applying it records the work and each field's origin. */
  origin?: { kind: 'source'; workId: string; title: string; approach: import('./types').AdaptationApproach; story?: import('./types').StoryCredit; cast?: import('./types').StoryCredit };
}

const split = (s: string, by = '|') => s.split(by).map((x) => x.trim());
const list = (s: string) => split(s, ';').filter(Boolean);

/** Read a blueprint file. Anything it can't place is a problem with the line it is on; nothing is guessed. */
export function parseBlueprints(text: string): { blueprints: Blueprint[]; problems: string[] } {
  const blueprints: Blueprint[] = [];
  const problems: string[] = [];
  let b: Blueprint | null = null;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith('//')) continue;
    const at = `line ${i + 1}`;
    if (raw.startsWith('== ')) {
      const [id, format, structure] = split(raw.slice(3));
      b = {
        id, v: 1, format: format as Format, structure: structure ?? '', title: '', genre: '', secondary: [], tone: '', year: null, time: 'contemporary', setting: { name: '', kind: 'fictional', type: '' },
        logline: '', premise: '', synopsis: '', question: '', themes: [], audience: '', viewpoint: '', stakes: '', conflict: '', ending: '', experience: '', look: '', sound: '',
        matrix: { goal: '', opposition: '', dilemma: '', resolution: '' }, rules: [], characters: [], relationships: [], scenes: [], review: { status: 'authored', at: '', note: '' }, line: i + 1,
      };
      blueprints.push(b);
      continue;
    }
    if (!b) { problems.push(`${at}: text before the first story.`); continue; }
    if (raw.startsWith('@ ')) {
      const f = split(raw.slice(2));
      b.characters.push({ key: f[0] ?? '', name: f[1] ?? '', size: (f[2] ?? '') as RoleSize, functions: split(f[3] ?? '', ',').filter(Boolean) as NarrativeFunction[], entity: (f[4] ?? '') as Entity, pronouns: f[5] ?? '', age: f[6] ?? '', wants: f[7] ?? '', motivation: f[8] ?? '', obstacle: f[9] ?? '', contradiction: f[10] ?? '', arc: f[11] ?? '', voice: f[12] ?? '', look: f[13] ?? '' });
      continue;
    }
    if (raw.startsWith('~ ')) {
      const f = split(raw.slice(2));
      const [a, c] = split(f[0] ?? '', ' - ');
      b.relationships.push({ a: a ?? '', b: c ?? '', kind: f[1] ?? '', start: f[2] ?? '', end: f[3] ?? '' });
      continue;
    }
    if (raw.startsWith('# ')) {
      const f = split(raw.slice(2));
      const sc: BlueprintScene = { act: f[0] ?? '', intExt: (f[1] ?? '') as IntExt, place: f[2] ?? '', time: (f[3] ?? '') as TimeOfDay, who: split(f[4] ?? '', ',').filter(Boolean), objective: f[5] ?? '', action: f[6] ?? '', turn: f[7] ?? '', minutes: Number(f[8] ?? '') };
      for (const flag of split(f[9] ?? '', ',').filter(Boolean)) {
        const [k, val = ''] = split(flag, '=');
        const items = val.split('+').map((x) => x.trim()).filter(Boolean);
        if (k === 'crowd') sc.crowd = Number(val);
        else if (k === 'stunts') sc.stunts = val;
        else if (k === 'water') sc.water = true;
        else if (k === 'intimacy') sc.intimacy = true;
        else if (k === 'dance') sc.dance = true;
        else if (k === 'vfx') sc.vfx = items;
        else if (k === 'animals') sc.animals = items;
        else if (k === 'vehicles') sc.vehicles = items;
        else if (k === 'props') sc.props = items;
        else problems.push(`${at}: ${b.id}: a scene needs "${k}", which isn't one this game has.`);
      }
      b.scenes.push(sc);
      continue;
    }
    const ep = /^ep (\d+) \|(.*)$/.exec(raw);
    if (ep) {
      const f = split(ep[2]);
      (b.tv ??= { episodes: 0, minutes: 0, engine: '', arc: '', eps: [], changes: '', recurring: [], continuation: '' }).eps.push({ n: Number(ep[1]), title: f[0] ?? '', moves: f[1] ?? '' });
      continue;
    }
    const m = /^([a-z]+):\s*(.*)$/.exec(raw);
    if (!m) { problems.push(`${at}: ${b.id}: can't read "${raw.slice(0, 40)}".`); continue; }
    const [, key, value] = m;
    const tv = () => (b!.tv ??= { episodes: 0, minutes: 0, engine: '', arc: '', eps: [], changes: '', recurring: [], continuation: '' });
    const doc = () => (b!.doc ??= { subjects: [], asks: [], evidence: [] });
    switch (key) {
      case 'title': b.title = value; break;
      case 'genre': { const [g, more = ''] = split(value, '+'); b.genre = g; b.secondary = split(more, ',').filter(Boolean); break; }
      case 'tone': b.tone = value; break;
      case 'era': { const [y, t] = split(value); b.year = y === '-' ? null : Number(y); b.time = (t ?? '') as Blueprint['time']; break; }
      case 'setting': { const [name, kind, type] = split(value); b.setting = { name: name ?? '', kind: (kind ?? '') as 'real' | 'fictional', type: type ?? '' }; break; }
      case 'logline': case 'premise': case 'synopsis': case 'question': case 'audience': case 'viewpoint': case 'stakes': case 'conflict': case 'ending': case 'experience': case 'look': case 'sound': b[key] = value; break;
      case 'themes': b.themes = list(value); break;
      case 'm': { const [goal, opposition, dilemma, resolution] = split(value); b.matrix = { goal: goal ?? '', opposition: opposition ?? '', dilemma: dilemma ?? '', resolution: resolution ?? '' }; break; }
      case 'rule': { const [rule, limit] = split(value); b.rules.push({ rule: rule ?? '', limit: limit ?? '' }); break; }
      case 'tv': { const [shape] = split(value); const x = /^(\d+) x (\d+)$/.exec(shape ?? ''); if (x) { tv().episodes = Number(x[1]); tv().minutes = Number(x[2]); } else problems.push(`${at}: ${b.id}: a series says "tv: 8 x 45" (episodes by minutes).`); break; }
      case 'engine': tv().engine = value; break;
      case 'arc': tv().arc = value; break;
      case 'changes': tv().changes = value; break;
      case 'recurring': tv().recurring = list(value); break;
      case 'continuation': tv().continuation = value; break;
      case 'subject': { const [name, role, access] = split(value); doc().subjects.push({ name: name ?? '', role: role ?? '', access: access ?? '' }); break; }
      case 'ask': { const [question, reference] = split(value); doc().asks.push({ question: question ?? '', reference: reference ?? '' }); break; }
      case 'evidence': { const [claim, note] = split(value); doc().evidence.push({ claim: claim ?? '', note: note ?? '' }); break; }
      case 'review': { const [status, when, note] = split(value); b.review = { status: status === 'reviewed' ? 'reviewed' : 'authored', at: when ?? '', note: note ?? '' }; break; }
      case 'v': b.v = Number(value); break;
      default: problems.push(`${at}: ${b.id}: "${key}" isn't a line this format has.`);
    }
  }
  return { blueprints, problems };
}

const has = (s: string) => s.trim().length > 0;
const keysIn = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((x) => x[1]);

/**
 * Everything wrong with one blueprint, in sentences. An entry with any problem doesn't count toward a quota
 * (tools/v3/counts.mjs). `genres` is the registry's real IDs; a blueprint can't invent one.
 */
export function blueprintProblems(b: Blueprint, genres: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const say = (x: string) => out.push(`${b.id}: ${x}`);
  const cls = formatClass(b.format);
  if (!/^[a-z0-9-]+(\+[a-z0-9-]+)?\.[ftx]\d{2,3}$/.test(b.id)) say('its ID is not "<genre>.f01", "<genre>.t01" or "<genre>+<genre>.x01".');
  if (!cls) say(`"${b.format}" is not a film or series format.`);
  else if ((b.id.includes('.f') && cls !== 'film') || (b.id.includes('.t') && cls !== 'tv')) say('its ID says film or series and its format says the other.');
  if (!STRUCTURES[b.structure]) say(`"${b.structure}" is not a structure this game names.`);
  if (!genres.has(b.genre)) say(`"${b.genre}" is not one of the game's genres.`);
  else if (!b.id.includes('+') && b.id.split('.')[0] !== b.genre) say('its ID names one genre and its genre line another.');
  for (const g of b.secondary) if (!genres.has(g)) say(`secondary genre "${g}" is not one of the game's genres.`);
  if (b.id.includes('+')) { const [x, y] = b.id.split('.')[0].split('+'); if (b.genre !== x || b.secondary[0] !== y) say('a mixed story names its two genres in its ID, the first as its genre and the second as its first secondary genre.'); }
  for (const k of ['title', 'tone', 'logline', 'premise', 'synopsis', 'question', 'audience', 'viewpoint', 'stakes', 'conflict', 'ending', 'experience', 'look', 'sound'] as const) if (!has(b[k])) say(`it has no ${k}.`);
  if (b.tone.length > 80) say('its tone is longer than 80 characters.');
  if (b.setting.name.length > 100) say('its setting is longer than 100 characters.');
  if (!b.themes.length) say('it has no themes.');
  if (b.year !== null && !(Number.isInteger(b.year) && b.year >= 1000 && b.year <= 2200)) say('its year is not a year from 1000 to 2200.');
  if (!['contemporary', 'period', 'future'].includes(b.time)) say('its era is not contemporary, period or future.');
  if (!has(b.setting.name) || !['real', 'fictional'].includes(b.setting.kind)) say('its setting needs a name and to say real or fictional.');
  if (!(SETTING_TYPES as readonly string[]).includes(b.setting.type)) say(`"${b.setting.type}" is not a kind of setting the matrix counts.`);
  if (!(GOALS as readonly string[]).includes(b.matrix.goal) || !(OPPOSITIONS as readonly string[]).includes(b.matrix.opposition) || !(DILEMMAS as readonly string[]).includes(b.matrix.dilemma) || !(RESOLUTIONS as readonly string[]).includes(b.matrix.resolution)) say('its matrix line (goal, opposition, dilemma, resolution) uses a word the matrix does not have.');
  const nonfiction = isNonfiction(b.format);
  const keys = new Set<string>();
  for (const c of b.characters) {
    if (!/^\w+$/.test(c.key) || keys.has(c.key)) say(`character key "${c.key}" is missing or used twice.`);
    keys.add(c.key);
    if (!has(c.name)) say(`character "${c.key}" has no name.`);
    if (!SIZES.includes(c.size)) say(`${c.name}'s billing "${c.size}" is not one the game has.`);
    if (!c.functions.length || c.functions.some((f) => !FUNCTIONS.includes(f))) say(`${c.name} needs a story function the game has.`);
    if (!ENTITIES.includes(c.entity)) say(`${c.name}'s kind of being "${c.entity}" is not one the game has.`);
    for (const k of ['wants', 'motivation', 'obstacle', 'contradiction', 'arc', 'voice', 'look'] as const) if (!has(c[k])) say(`${c.name} has no ${k}.`);
    if (!has(c.pronouns) || !has(c.age)) say(`${c.name} needs pronouns and an age (or "-" for neither applying).`);
  }
  if (nonfiction) {
    if (!b.doc || !b.doc.subjects.length || !b.doc.asks.length || !b.doc.evidence.length) say('a documentary needs its subjects with an access plan, what it asks, and what it would have to show.');
    for (const s of b.doc?.subjects ?? []) if (!has(s.name) || !has(s.role) || !has(s.access)) say('a documentary subject needs a name or description, who they are, and how they might be reached.');
  } else {
    // One character is a story (a one-person source, from November 13, 2026); two or more need what is between them.
    if (!b.characters.length) say('it has no characters.');
    if (!b.characters.some((c) => c.functions.includes('protagonist'))) say('nobody in it is a protagonist.');
    if (b.characters.length > 1 && !b.relationships.length) say('it has no relationships.');
  }
  for (const r of b.relationships) {
    if (!keys.has(r.a) || !keys.has(r.b) || r.a === r.b) say(`a relationship names "${r.a}" and "${r.b}", who are not two of its characters.`);
    if (!has(r.kind) || !has(r.start) || !has(r.end)) say(`the relationship between ${r.a} and ${r.b} needs what it is, where it starts and where it ends.`);
  }
  const acts = [...new Set(b.scenes.map((s) => s.act))];
  if (b.scenes.length < 5) say('its outline has fewer than five scenes.');
  if (acts.length < 3) say('its outline has fewer than three parts.');
  if (b.scenes.filter((s) => has(s.turn)).length < 2) say('fewer than two of its scenes turn the story.');
  b.scenes.forEach((s, i) => {
    const n = `scene ${i + 1}`;
    if (!has(s.act) || !has(s.place) || !has(s.objective) || !has(s.action)) say(`${n} needs its part, place, purpose and what happens.`);
    if (!INT_EXT.includes(s.intExt) || !TIMES.includes(s.time)) say(`${n} needs INT, EXT or INT/EXT and DAY, NIGHT, DAWN or DUSK.`);
    if (!(s.minutes > 0 && s.minutes <= 30)) say(`${n} needs a length from 1 to 30 minutes.`);
    for (const k of s.who) if (!keys.has(k)) say(`${n} has "${k}", who is not one of its characters.`);
    if (!nonfiction && !s.who.length) say(`${n} has nobody in it.`);
    if (s.crowd !== undefined && !(s.crowd > 0 && s.crowd <= 5000)) say(`${n}'s crowd is not a number from 1 to 5,000.`);
  });
  // A name in the prose is written {key}, so renaming a character renames it everywhere the story says it.
  const prose = [b.logline, b.premise, b.synopsis, b.question, b.stakes, b.conflict, b.ending, b.viewpoint, ...b.scenes.flatMap((s) => [s.objective, s.action, s.turn]), ...b.characters.flatMap((c) => [c.wants, c.motivation, c.obstacle, c.contradiction, c.arc]), ...b.relationships.flatMap((r) => [r.start, r.end]), b.tv?.arc ?? '', b.tv?.engine ?? '', b.tv?.changes ?? '', b.tv?.continuation ?? '', ...(b.tv?.eps.map((e) => e.moves) ?? [])];
  for (const k of new Set(prose.flatMap(keysIn))) if (!keys.has(k)) say(`its words name {${k}}, who is not one of its characters.`);
  for (const c of b.characters) if (!nonfiction && !b.scenes.some((s) => s.who.includes(c.key))) say(`${c.name} is in no scene.`);
  if (cls === 'tv') {
    const t = b.tv;
    if (!t || !(t.episodes >= 2 && t.episodes <= 26) || !(t.minutes >= 5 && t.minutes <= 120)) say('a series needs "tv: <2 to 26 episodes> x <5 to 120 minutes>".');
    else {
      if (!has(t.engine) || !has(t.arc) || !has(t.changes) || !has(t.continuation) || !t.recurring.length) say('a series needs what an episode does, its season arc, how its people change, the places it returns to, and how it goes on or ends.');
      if (t.eps.length !== t.episodes || t.eps.some((e, i) => e.n !== i + 1 || !has(e.title) || !has(e.moves))) say(`it says ${t.episodes} episodes and gives ${t.eps.length} in order, each with a title and what it moves.`);
    }
  } else if (b.tv) say('a film has series lines.');
  if (!b.review.at) say('it has no review line.');
  return out;
}

// ---------------- Applying ----------------

/** Every field a blueprint writes, with the words the page uses for it. The keys are what `locks` and `keep` hold. */
export const FIELD_LABELS: Record<string, string> = {
  title: 'Working Title', genres: 'Genres', tone: 'Tone', year: 'Year It Is Set In', setting: 'Story Setting',
  'story.logline': 'Logline', 'story.premise': 'Premise', 'story.synopsis': 'Synopsis', 'story.question': 'Central Question', 'story.theme': 'Theme', 'story.audience': 'Who It Is For',
  'story.viewpoint': 'Point Of View', 'story.stakes': 'Stakes', 'story.conflict': 'Central Conflict', 'story.ending': 'Intended Ending', 'story.intendedExperience': 'Intended Experience', 'story.structure': 'How It Is Built',
  rules: 'Story World Rules', characters: 'Characters', relationships: 'Relationships', scenes: 'Scene Outline', suggestions: 'Look And Sound Suggestions',
  'series.engine': 'What An Episode Does', 'series.arc': 'Season Arc', 'series.episodes': 'Episode Titles And What Each Moves', 'series.changes': 'How Its People Change', 'series.recurring': 'Places It Returns To', 'series.continuation': 'How It Goes On Or Ends',
  documentary: 'Subjects, Questions And Evidence',
};

export interface BlueprintOptions {
  /** The player's names for its characters, by the blueprint's key. */
  names?: Record<string, string>;
  /** Fields with words already in them that the player chose to keep. Locked fields are kept whatever this says. */
  keep?: string[];
}

export interface BlueprintPreview {
  /** What would be written, field by field: the key, its label and the new words. */
  changes: { key: string; label: string; text: string }[];
  /** Fields that have something in them now: the player chooses to replace or keep each. */
  overwrites: { key: string; label: string; current: string }[];
  /** Locked fields it would have written. They are left alone. */
  locked: string[];
  warnings: string[];
  refusal: string | null;
}

const nameOf = (b: Blueprint, o: BlueprintOptions) => (key: string) => (o.names?.[key]?.trim() || b.characters.find((c) => c.key === key)?.name || key);
/** Put the characters' names, as the player has them, where the story's words say {key}. */
export const named = (text: string, b: Blueprint, o: BlueprintOptions = {}): string => text.replace(/\{(\w+)\}/g, (_m, k: string) => nameOf(b, o)(k));

/** The words each field holds now, by FIELD_LABELS key: what a proposal would replace, and what it wrote. */
export function briefFields(p: Project): Record<string, string> {
  const s = p.story;
  return {
    // Until November 12, 2026 the title and genres read as empty here, so a revision replaced them without offering to keep them.
    title: p.title, genres: p.axes.genres.map((g) => g.id).join(', '), tone: p.axes.tone, year: p.axes.storyYear === undefined ? '' : String(p.axes.storyYear), setting: p.axes.storySetting,
    'story.logline': s.logline, 'story.premise': s.premise, 'story.synopsis': s.synopsis ?? '', 'story.question': s.question, 'story.theme': s.theme, 'story.audience': s.audience ?? '',
    'story.viewpoint': s.viewpoint, 'story.stakes': s.stakes, 'story.conflict': s.conflict, 'story.ending': s.ending, 'story.intendedExperience': s.intendedExperience, 'story.structure': s.structure ?? '',
    'series.engine': p.series?.engine ?? '', 'series.arc': p.seasonArc ?? '', 'series.changes': p.series?.changes ?? '', 'series.recurring': (p.series?.recurring ?? []).join('; '), 'series.continuation': p.series?.continuation ?? '',
    suggestions: [p.brief?.suggestions?.look, p.brief?.suggestions?.sound].filter(Boolean).join(' '),
  };
}

/** What applying a blueprint would do, without doing it. Pure. */
export function previewBlueprint(p: Project, b: Blueprint, o: BlueprintOptions = {}): BlueprintPreview {
  const out: BlueprintPreview = { changes: [], overwrites: [], locked: [], warnings: [], refusal: null };
  if (p.delivered) out.refusal = 'This project has been delivered. Its script is locked.';
  else if (p.approvedDraft !== null) out.refusal = 'A draft of this script has been approved and work has begun on it. A full story is for a script that is still being written; change this one field by field instead.';
  else if (formatClass(p.axes.format) !== formatClass(b.format)) out.refusal = `${b.title} is written as a ${formatClass(b.format) === 'tv' ? 'series' : 'film'}, and this project is a ${isEpisodic(p.axes.format) ? 'series' : 'film'}.`;
  else if (isNonfiction(p.axes.format) !== isNonfiction(b.format)) out.refusal = isNonfiction(b.format) ? `${b.title} is a documentary plan, and this project is scripted.` : `${b.title} is a scripted story, and this project is a documentary.`;
  const say = (text: string) => named(text, b, o);
  const add = (key: string, text: string) => out.changes.push({ key, label: FIELD_LABELS[key], text });
  add('title', b.title);
  add('genres', [b.genre, ...b.secondary].join(', '));
  add('tone', b.tone);
  add('year', b.year === null ? `No year: ${b.time === 'future' ? 'the future or an invented world' : b.time === 'period' ? 'the past' : 'the present day'}` : `${b.year} (${b.time === 'period' ? 'the past' : b.time === 'future' ? 'the future' : 'the present day'})`);
  add('setting', `${b.setting.name}${b.setting.kind === 'fictional' ? ' (a made-up place)' : ''}`);
  add('story.logline', say(b.logline)); add('story.premise', say(b.premise)); add('story.synopsis', say(b.synopsis)); add('story.question', say(b.question));
  add('story.theme', b.themes.join('; ')); add('story.audience', b.audience); add('story.viewpoint', say(b.viewpoint)); add('story.stakes', say(b.stakes)); add('story.conflict', say(b.conflict));
  add('story.ending', say(b.ending)); add('story.intendedExperience', b.experience); add('story.structure', STRUCTURES[b.structure] ?? b.structure);
  if (b.rules.length) add('rules', b.rules.map((r) => r.rule).join(' '));
  if (b.characters.length) add('characters', b.characters.map((c) => `${nameOf(b, o)(c.key)} (${c.size.replace(/-/g, ' ')})`).join(', '));
  if (b.relationships.length) add('relationships', b.relationships.map((r) => `${nameOf(b, o)(r.a)} and ${nameOf(b, o)(r.b)}: ${r.kind}`).join('; '));
  const across = new Set(b.scenes.map((s) => s.episode ?? 1)).size;
  add('scenes', `${b.scenes.length} scenes${b.tv ? (across > 1 ? ` across ${across} episodes` : ' for the first episode') : ''}, about ${b.scenes.reduce((a, s) => a + s.minutes, 0)} minutes, in ${[...new Set(b.scenes.map((s) => s.act))].length} parts`);
  if (b.tv) {
    add('series.engine', say(b.tv.engine)); add('series.arc', say(b.tv.arc));
    add('series.episodes', b.tv.eps.map((e) => `${e.n}. ${e.title}`).join('; '));
    add('series.changes', say(b.tv.changes)); add('series.recurring', b.tv.recurring.join('; ')); add('series.continuation', say(b.tv.continuation));
    if (p.episodes.length !== b.tv.episodes) out.warnings.push(`${b.title} is written for ${b.tv.episodes} episodes and this project has ${p.episodes.length}. ${p.episodes.length < b.tv.episodes ? `Only the first ${p.episodes.length} get their titles and what they move.` : `Episodes after ${b.tv.episodes} are left as they are.`}`);
  }
  if (b.doc) add('documentary', `${b.doc.subjects.length} to approach, ${b.doc.asks.length} questions, ${b.doc.evidence.length} things it would have to show. Nobody has agreed to anything, and nothing has been found.`);
  add('suggestions', `Look: ${b.look} Sound: ${b.sound}`);
  const locks = new Set(p.locks ?? []);
  const now = briefFields(p);
  out.locked = out.changes.filter((c) => locks.has(c.key)).map((c) => c.key);
  for (const c of out.changes) if (!locks.has(c.key) && now[c.key]?.trim() && now[c.key].trim() !== c.text.trim()) out.overwrites.push({ key: c.key, label: c.label, current: now[c.key] });
  if (p.characters.length) out.warnings.push(`This script already has ${p.characters.length === 1 ? 'a character' : `${p.characters.length} characters`}. The story's people are added beside them; nobody is removed or renamed.`);
  if (p.scenes.length) out.warnings.push(`This script already has ${p.scenes.length === 1 ? 'a scene' : `${p.scenes.length} scenes`}. The outline's scenes are added after them.`);
  out.warnings.push('This is an outline to develop, not a screenplay: no dialogue is written, and the writing, financing, casting and production are all still to do.');
  return out;
}

/**
 * Apply a blueprint: every field it has that isn't locked or kept, the characters with what is between them, the outline,
 * and for a series its season. One step; the caller snapshots the project first, so Undo takes all of it back.
 * Returns what it did, in sentences.
 */
export function applyBlueprint(state: GameState, p: Project, b: Blueprint, o: BlueprintOptions = {}, origin?: { origin: Record<string, import('./proposal').FieldOrigin>; why: Record<string, string> }): string[] {
  assertEditable(p);
  const pre = previewBlueprint(p, b, o);
  if (pre.refusal) throw new Error(pre.refusal);
  const skip = new Set([...(p.locks ?? []), ...(o.keep ?? [])]);
  const on = (key: string) => !skip.has(key);
  const say = (text: string) => named(text, b, o);
  const did: string[] = [];
  if (on('title')) p.title = b.title;
  if (on('genres')) setGenres(p, [{ id: b.genre, emphasis: 'primary' }, ...b.secondary.map((id) => ({ id, emphasis: 'secondary' as const }))]);
  if (on('tone')) p.axes.tone = b.tone.slice(0, 80);
  if (on('year')) { if (b.year === null) delete p.axes.storyYear; else p.axes.storyYear = b.year; if (b.time === 'contemporary') delete p.storyTime; else p.storyTime = b.time; }
  if (on('setting')) p.axes.storySetting = `${b.setting.name}${b.setting.kind === 'fictional' ? ' (made up)' : ''}`.slice(0, 120);
  const story: [string, keyof Project['story'], string][] = [
    ['story.logline', 'logline', say(b.logline)], ['story.premise', 'premise', say(b.premise)], ['story.synopsis', 'synopsis', say(b.synopsis)], ['story.question', 'question', say(b.question)],
    ['story.theme', 'theme', b.themes.join('; ')], ['story.audience', 'audience', b.audience], ['story.viewpoint', 'viewpoint', say(b.viewpoint)], ['story.stakes', 'stakes', say(b.stakes)],
    ['story.conflict', 'conflict', say(b.conflict)], ['story.ending', 'ending', say(b.ending)], ['story.intendedExperience', 'intendedExperience', b.experience], ['story.structure', 'structure', STRUCTURES[b.structure] ?? b.structure],
  ];
  for (const [key, field, text] of story) if (on(key)) p.story[field] = text;
  if (on('rules')) for (const r of b.rules) p.worldRules.push({ id: newId(state, 'w'), rule: say(r.rule), limit: say(r.limit) });
  const ids: Record<string, string> = {};
  if (on('characters')) {
    for (const c of b.characters) {
      const made = addCharacter(state, p, nameOf(b, o)(c.key));
      ids[c.key] = made.id;
      updateCharacter(p, made.id, {
        roleSize: c.size, functions: c.functions.filter((f) => f !== 'none'), entity: c.entity, pronouns: c.pronouns === '-' ? '' : c.pronouns, ageInStory: c.age === '-' ? '' : c.age,
        wants: say(c.wants), motivation: say(c.motivation), obstacle: say(c.obstacle), contradiction: say(c.contradiction), arc: say(c.arc), voice: c.voice, description: c.look,
        seriesInvolvement: b.tv ? (c.size === 'lead' || c.size === 'co-lead' || c.size === 'ensemble-lead' ? 'regular' : 'recurring') : 'single',
      });
    }
    did.push(`${b.characters.length} characters added.`);
    if (on('relationships')) for (const r of b.relationships) if (ids[r.a] && ids[r.b]) p.relationships.push({ id: newId(state, 'r'), a: ids[r.a], b: ids[r.b], kind: r.kind, start: say(r.start), end: say(r.end) });
  }
  if (on('scenes')) {
    const acts = new Map((p.acts ?? []).map((a) => [a.name, a.id]));
    for (const s of b.scenes) {
      if (!acts.has(s.act)) { const id = newId(state, 'a'); (p.acts ??= []).push({ id, name: s.act }); acts.set(s.act, id); }
      // Its own episode, where it has one and the project has that many; the first otherwise. Until November 13, 2026
      // every scene went to the first, and a proposed series' later episodes were empty.
      const made = addScene(state, p, Math.min(Math.max(1, s.episode ?? 1), Math.max(1, p.axes.episodeCount)));
      const patch: Partial<Scene> = {
        heading: { intExt: s.intExt, place: s.place, time: s.time }, storyLocation: s.place, participants: s.who.map((k) => ids[k]).filter(Boolean), objective: say(s.objective), action: say(s.action),
        turningPoint: say(s.turn), estMinutes: s.minutes, act: acts.get(s.act), ...(s.turn ? { essential: true } : {}),
        ...(s.crowd ? { crowd: s.crowd } : {}), ...(s.stunts ? { stunts: s.stunts } : {}), ...(s.water ? { water: true } : {}), ...(s.intimacy ? { intimacy: true } : {}), ...(s.dance ? { dance: true } : {}),
        ...(s.vfx ? { vfx: s.vfx } : {}), ...(s.animals ? { animals: s.animals } : {}), ...(s.vehicles ? { vehicles: s.vehicles } : {}), ...(s.props ? { props: s.props } : {}),
      };
      updateScene(p, made.id, patch);
    }
    did.push(`${b.scenes.length} scenes added.`);
  }
  if (b.tv) {
    const series = (p.series ??= {});
    if (on('series.engine')) series.engine = say(b.tv.engine);
    if (on('series.arc')) p.seasonArc = say(b.tv.arc);
    if (on('series.changes')) series.changes = say(b.tv.changes);
    if (on('series.recurring')) series.recurring = [...b.tv.recurring];
    if (on('series.continuation')) series.continuation = say(b.tv.continuation);
    if (on('series.episodes')) for (const e of b.tv.eps) { const ep = p.episodes.find((x) => x.number === e.n); if (ep) { ep.title = e.title; ep.arc = say(e.moves); } }
  }
  if (b.doc && on('documentary')) {
    for (const s of b.doc.subjects) p.contributors.push({ id: newId(state, 'k'), name: s.name, role: `${s.role}. To reach them: ${s.access}`, consent: 'not-asked' });
    for (const a of b.doc.asks) (p.research ??= []).push({ id: newId(state, 'q'), question: a.question, reference: a.reference, status: 'open', sceneIds: [] });
    for (const e of b.doc.evidence) p.evidence.push({ id: newId(state, 'v'), claim: e.claim, status: 'unverified', sourceNote: e.note, verified: false });
  }
  if (on('suggestions')) (p.brief ??= { picks: [] }).suggestions = { look: b.look, sound: b.sound };
  if (b.origin) {
    // A proposal from a real work records the work and where each field it wrote came from, and the words it wrote, so a
    // field the player has since changed reads as theirs. It is not "an original story written for this game".
    const wrote = briefFields(p);
    const written = pre.changes.map((c) => c.key).filter(on);
    const prior = p.proposal;
    p.proposal = {
      workId: b.origin.workId, title: b.origin.title, approach: b.origin.approach, at: state.now, ...(b.origin.story ? { story: b.origin.story } : prior?.workId === b.origin.workId && prior.story ? { story: prior.story } : {}),
      ...(b.origin.cast ? { cast: b.origin.cast } : prior?.workId === b.origin.workId && prior.cast ? { cast: prior.cast } : {}),
      origin: { ...(prior?.workId === b.origin.workId ? prior.origin : {}), ...Object.fromEntries(written.map((k) => [k, origin?.origin[k] ?? 'proposed'])) },
      why: { ...(prior?.workId === b.origin.workId ? prior.why : {}), ...Object.fromEntries(written.filter((k) => origin?.why[k]).map((k) => [k, origin!.why[k]])) },
      applied: { ...(prior?.workId === b.origin.workId ? prior.applied : {}), ...Object.fromEntries(written.filter((k) => k in wrote).map((k) => [k, wrote[k]])) },
    };
  } else p.blueprint = { id: b.id, v: b.v, title: b.title, at: state.now, names: ids };
  return did;
}

/** Lock or unlock a field: a full story, or a shuffle, leaves a locked field alone. */
export function setLock(p: Project, key: string, on: boolean): void {
  if (!FIELD_LABELS[key]) throw new Error('That is not a field a story writes.');
  const set = new Set(p.locks ?? []);
  if (on) set.add(key); else set.delete(key);
  if (set.size) p.locks = [...set]; else delete p.locks;
}
