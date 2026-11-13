// A work's story read as developments (the owner's v5 brief, 1: "Do not treat dividing a plot summary into equal-sized
// chunks as meaningful scene or episode structure. Organize proposed material around dramatic developments,
// dependencies, character changes, episode purposes and format constraints"). Built November 13, 2026. Until then a
// proposal cut the story into equal runs of sentences (proposal.ts).
//
// The story is the work's article's plot section (sources.ts WorkPlot), its full names already written {key}. This file
// reads it, and never writes a word of it: every sentence it returns is the article's, whole. What it adds is the game's
// own reading, and is labelled so where it is shown:
// - a development is a paragraph, split where the story moves in time ("Later", "Meanwhile", "Years later") or to a
//   place the work records;
// - it weighs what each does: the first time a recorded character appears, a turn (someone discovers, escapes, dies,
//   betrays, decides), a change of place;
// - it gives each a dramatic role by its place in the story and what it does: setup, inciting event, complication,
//   reversal, crisis, climax, resolution;
// - it says who each character is to the lead by what the story has them do together (fight, betray, capture; help,
//   join, rescue);
// - it chooses which developments a format has room for, keeping their order, and where a season's episodes break.
// It is a reading of words, not an understanding of them: a sentence that turns the story without one of the words
// below is weighed as a complication, which the player can change.

/** Words that turn a story: something found out, won, lost, ended or begun. Game calibration, read whole-word. */
export const TURNS = /\b(discover(s|ed)?|learn(s|ed)?|realis(es|ed)|realiz(es|ed)|reveal(s|ed)?|find(s)? out|found out|kill(s|ed)?|die(s|d)?|dead|murder(s|ed)?|escape(s|d)?|betray(s|ed)?|decide(s|d)?|refuse(s|d)?|confront(s|ed)?|defeat(s|ed)?|destroy(s|ed)?|captur(es|ed)|arrest(s|ed)?|rescue(s|d)?|marr(y|ies|ied)|flee(s)?|fled|attack(s|ed)?|abandon(s|ed)?|return(s|ed)? (to|home)|leave(s)? for good|confess(es|ed)?|wins?|won|loses|lost|vow(s|ed)?|agree(s|d)? to|sets out|set out|begins|traps?|trapped|trick(s|ed)?|recruit(s|ed)?|invite(s|d)?|summon(s|ed)?|hire(s|d)?|arrive(s|d)?)\b/i;
/** Words for acting against someone. */
const AGAINST = /\b(against|re-educat\w*|starve(s|d)?|tortur(es|ed)|interrogat(es|ed)|arrest(s|ed)?|frames?|framed|bites?|bit|harpoon(s|ed)?|smash(es|ed)?|sinks?|sank|ram(s|med)?|drag(s|ged)?|pursue(s|d)?|vengeance|revenge|abandon(s|ed)?|double-cross(es|ed)?|turn(s|ed)? on|accuse(s|d)?|execute(s|d)?|shoot(s)?|shot|kill(s|ed)?|attack(s|ed)?|betray(s|ed)?|captur(es|ed)|imprison(s|ed)?|threaten(s|ed)?|fight(s)?|fought|defeat(s|ed)?|murder(s|ed)?|hunt(s|ed)?|chase(s|d)?|trap(s|ped)?|deceive(s|d)?|confront(s|ed)?|oppose(s|d)?|rival|enemy|enemies)\b/i;
/** Words for acting alongside someone. */
const ALONGSIDE = /\b(help(s|ed)?|join(s|ed)?|rescue(s|d)?|marr(y|ies|ied)|befriend(s|ed)?|ally|allies|friend|together|accompan(y|ies|ied)|travel(s|led)? with|protect(s|ed)?|save(s|d)?|love(s|d)?|guide(s|d)?)\b/i;
/**
 * A sentence about the work rather than its events ("Portal features two prominent characters", "The plot involves a
 * host of other characters", "It takes place in the Half-Life universe"): background, kept out of the outline unless it
 * also turns the story. Found November 13, 2026 in the stories of The Hobbit and Portal, where such sentences became
 * scenes and the real start of Portal's story was read as its climax.
 */
const ABOUT = /\b(the (game|player|novel|book|series|story|film|comic|manga|reader|narrative|plot) (features|involves|is set|takes place|centres|centers|follows|opens)|gameplay|the player|takes place (in|within)|is set (in|within)|features (two|three|four|several|many)|the protagonist,|main characters?|prominent characters?|the plot involves|after the credits|(is|was) a reference to)\b/i;
/** Where a story moves in time, which starts a new development. */
const MOVES_ON = /^(Meanwhile|Later|Afterwards?|After that|The next (day|morning|night|week|year)|Years later|Months later|Weeks later|Some time later|Eventually|In the end|Finally|Back (in|at)|Elsewhere|That night|At dawn|On the way)\b/i;

export type Role = 'setup' | 'inciting' | 'complication' | 'reversal' | 'crisis' | 'climax' | 'resolution';
export const ROLE_LABELS: Record<Role, string> = { setup: 'Setup', inciting: 'Inciting Event', complication: 'Complication', reversal: 'Reversal', crisis: 'Crisis', climax: 'Climax', resolution: 'Resolution' };

export interface Development {
  /** Its sentences, the article's, in order. */
  sentences: string[];
  /** The one that says most: its first turn, or its first sentence. */
  key: string;
  /** Characters it names ({key}s, and first names where a person was given one). */
  who: string[];
  /** Characters it names for the first time in the story. */
  introduces: string[];
  /** A place the work records that it names, where it names one. */
  place: string | null;
  /** Whether it turns the story. */
  turns: boolean;
  /** Whether it is about the work rather than its events (ABOUT), and so isn't scene material. */
  background: boolean;
  weight: number;
  role: Role;
  /** Its position in the story, from 0 to 1. */
  at: number;
}
/** A person in the story: their {key}, and the first name that also names them where it is theirs alone. */
export interface Cast {
  key: string; first: string | null;
  /** Other single words that name them alone: a surname no one else has, or the name after a title ("Hamlet" of "Prince Hamlet"). */
  also?: string[];
}
export interface StoryReading { developments: Development[]; rival: string | null; ally: string | null; together: Record<string, { against: number; alongside: number }> }

/** A letter or digit: what a whole word must not run into, either side. */
export const WORD = /[\p{L}\p{N}]/u;
/** Whether a text has a word or name whole, not inside a longer word. */
export function hasWord(t: string, w: string): boolean {
  for (let at = t.indexOf(w); at >= 0; at = t.indexOf(w, at + w.length)) if (!WORD.test(t[at - 1] ?? ' ') && !WORD.test(t[at + w.length] ?? ' ')) return true;
  return false;
}

const CLOSERS = '"\'\u201d)]';
const ABBREVIATIONS = new Set(['Mr', 'Mrs', 'Ms', 'Dr', 'St', 'Mt', 'Jr', 'Sr', 'Prof', 'Capt', 'Col', 'Gen', 'Lt', 'Sgt', 'Rev', 'Hon', 'Gov', 'Sen', 'Rep', 'Fr', 'Messrs', 'vs']);
const OPENERS = '"\'\u201c([{';
const isUpper = (c: string) => c !== c.toLowerCase() || (c >= '0' && c <= '9');
/**
 * A story's sentences, in order: a break after . ! or ? (and any closing quote or bracket), then space, then a capital,
 * a digit, an opening quote or bracket, or a name written {key}. Scans, here and wherever a name is looked for in a
 * story, not Unicode patterns: with patterns, proposing every work with a story as a film and as a series (1,034
 * proposals) took 4.6 seconds; with scans, 0.44 (measured November 13, 2026).
 */
export function sentencesOf(text: string): string[] {
  const out: string[] = [];
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c !== '.' && c !== '!' && c !== '?') continue;
    let j = i + 1;
    if (j < text.length && CLOSERS.includes(text[j])) j += 1;
    let k = j;
    while (k < text.length && /\s/.test(text[k])) k += 1;
    if (k === j || k >= text.length) continue;
    const n = text[k];
    if (!isUpper(n) && !OPENERS.includes(n)) continue;
    // A title or an initial isn't the end of a sentence: "a walk with Dr. Watson" split into two until November 13, 2026.
    if (c === '.' && j === i + 1) {
      let b = i;
      while (b > 0 && /[A-Za-z]/.test(text[b - 1])) b -= 1;
      const word = text.slice(b, i);
      if (ABBREVIATIONS.has(word) || (word.length === 1 && word !== word.toLowerCase() && !'IVX'.includes(word))) continue; // not a numeral: World War I.
    }
    const x = text.slice(from, j).trim();
    if (x) out.push(x);
    from = k;
    i = k - 1;
  }
  const last = text.slice(from).trim();
  if (last) out.push(last);
  return out;
}

/**
 * Read a story: its developments in order, each with what it does and its role, and who stands against or alongside
 * the lead. `cast` is each person's {key} and the first-name pattern that also names them; `places` the work's
 * recorded places. Pure.
 */
export function readStory(paragraphs: string[], cast: Cast[], lead: string | null, places: string[]): StoryReading {
  const named = (t: string) => cast.filter((c) => t.includes(`{${c.key}}`) || (c.first !== null && hasWord(t, c.first)) || (c.also ?? []).some((a) => hasWord(t, a))).map((c) => c.key);
  const placeIn = (t: string) => places.find((x) => t.includes(x)) ?? null;
  // Split each paragraph where the story moves on in time or to another recorded place.
  const runs: string[][] = [];
  for (const para of paragraphs) {
    let run: string[] = [];
    let where: string | null = null;
    for (const s of sentencesOf(para)) {
      const here = placeIn(s);
      const moved = run.length >= 2 && (MOVES_ON.test(s) || (here !== null && where !== null && here !== where));
      if (moved) { runs.push(run); run = []; }
      run.push(s);
      if (here) where = here;
    }
    if (run.length) runs.push(run);
  }
  const seen = new Set<string>();
  let lastPlace: string | null = null;
  const devs: Development[] = runs.map((sentences, i) => {
    const text = sentences.join(' ');
    const who = named(text);
    const introduces = who.filter((k) => !seen.has(k));
    for (const k of who) seen.add(k);
    const place = placeIn(text);
    const turning = sentences.find((s) => TURNS.test(s));
    const moved = place !== null && place !== lastPlace;
    if (place) lastPlace = place;
    const weight = introduces.length * 2 + sentences.filter((s) => TURNS.test(s)).length * 2 + (moved ? 1 : 0) + Math.min(2, sentences.length / 3);
    // Background: most of its sentences are about the work, and none of the rest turns the story.
    const about = sentences.filter((x) => ABOUT.test(x)).length;
    const background = about > 0 && about * 2 >= sentences.length && !sentences.some((x) => !ABOUT.test(x) && TURNS.test(x));
    return { sentences, key: turning ?? sentences[0], who, introduces, place, turns: !!turning, background, weight, role: 'complication' as Role, at: runs.length > 1 ? i / (runs.length - 1) : 0 };
  });
  // The story is what isn't background; its positions and roles are counted among its own developments.
  const story = devs.filter((d) => !d.background);
  story.forEach((d, i) => { d.at = story.length > 1 ? i / (story.length - 1) : 0; });
  assignRoles(story);
  // Who the story has with the lead, and how: against, or alongside.
  const together: StoryReading['together'] = {};
  if (lead) {
    // A sentence that names only the lead goes on from the one before it: "O'Brien also shows himself to be a member of
    // the Thought Police… Over several months, Winston is starved and relentlessly tortured." Whoever that one named, alone
    // beside the lead, is counted with them (from November 13, 2026, when O'Brien read as Winston's ally).
    let prior: string[] = [];
    for (const d of devs) for (const s of d.sentences) {
      const inIt: string[] = named(s);
      const others = prior.filter((k) => k !== lead);
      const withLead: string[] = inIt.length === 1 && inIt[0] === lead && others.length === 1 ? [...inIt, ...others] : inIt;
      prior = inIt;
      if (!withLead.includes(lead)) continue;
      for (const k of withLead) if (k !== lead) {
        const t = (together[k] ??= { against: 0, alongside: 0 });
        if (AGAINST.test(s)) t.against += 1;
        if (ALONGSIDE.test(s)) t.alongside += 1;
      }
    }
  }
  // A rival or an ally only on clear evidence: at least two sentences of it, and twice as many as of the other kind.
  // Sentences don't say who does what to whom, so a weaker reading is left to the proposal (Nineteen Eighty-Four read
  // Julia as the rival and Big Brother as the ally until November 13, 2026).
  const by = (f: (x: { against: number; alongside: number }) => [number, number], clear: (a: number, b: number) => boolean) => Object.entries(together).filter(([, v]) => { const [a, b] = f(v); return a >= 2 && clear(a, b); }).sort((x, y) => f(y[1])[0] - f(x[1])[0])[0]?.[0] ?? null;
  // Against the lead in more sentences than beside them (from November 13, 2026; until then twice as many, which missed
  // Catalina, who shoots Claude in Grand Theft Auto III, and the whale that drags Ahab to his death).
  const rival = by((v) => [v.against, v.alongside], (a, b) => a > b);
  const ally = by((v) => [v.alongside, v.against], (a, b) => a >= 2 * b);
  return { developments: devs, rival, ally: ally !== rival ? ally : null, together };
}

/** Each development's role: the first sets up; the first turn after it incites; the last resolves; before it, the climax and the crisis; at the middle, a turn reverses. */
function assignRoles(d: Development[]): void {
  const n = d.length;
  if (!n) return;
  d[0].role = 'setup';
  if (n === 1) return;
  d[n - 1].role = 'resolution';
  // The inciting event: the first turn after the setup within the first two fifths, or else the development after it.
  const early = d.findIndex((x, i) => i > 0 && i < n - 1 && x.turns && i <= Math.max(1, Math.floor(n * 0.4)));
  const inciting = early > 0 ? early : n > 2 ? 1 : -1;
  if (inciting > 0) d[inciting].role = 'inciting';
  // The climax: the heaviest turn in the last third, before the resolution.
  const late = d.map((x, i) => ({ x, i })).filter(({ i }) => i >= Math.floor(n * 0.6) && i < n - 1 && i !== inciting);
  const climax = late.length ? late.reduce((a, b) => (b.x.weight > a.x.weight ? b : a)).i : -1;
  if (climax > 0) {
    d[climax].role = 'climax';
    if (climax - 1 > Math.max(0, inciting)) d[climax - 1].role = 'crisis';
  }
  // The reversal: the heaviest turn around the middle.
  // The reversal comes after the inciting event and before the crisis.
  const before = climax > 0 ? climax - 1 : n - 1;
  const mid = d.map((x, i) => ({ x, i })).filter(({ x, i }) => x.role === 'complication' && x.turns && i > inciting && i < before && i >= Math.floor(n * 0.3) && i <= Math.ceil(n * 0.7));
  if (mid.length) d[mid.reduce((a, b) => (b.x.weight > a.x.weight ? b : a)).i].role = 'reversal';
}

const MUST: Role[] = ['setup', 'inciting', 'reversal', 'crisis', 'climax', 'resolution'];

/**
 * The developments a format has room for, in their order: every one with a structural role, then the heaviest of the
 * rest. Returns them with the number left out, which the proposal says.
 */
export function selectDevelopments(all: Development[], room: number): { kept: Development[]; left: number } {
  const devs = all.filter((d) => !d.background);
  if (devs.length <= room) return { kept: devs, left: 0 };
  const keep = new Set<Development>(devs.filter((d) => MUST.includes(d.role)).slice(0, room));
  for (const d of [...devs].sort((a, b) => b.weight - a.weight)) { if (keep.size >= room) break; keep.add(d); }
  const kept = devs.filter((d) => keep.has(d));
  return { kept, left: devs.length - kept.length };
}

/**
 * Where a season's episodes break: each episode a run of developments whose weight is near its share, ending where the
 * story turns when one is close. Returns the index each episode starts at. Fewer developments than episodes leaves the
 * later episodes without one (the proposal fills them with the game's own, and says so).
 */
export function episodeBreaks(devs: Development[], episodes: number): number[] {
  const n = devs.length;
  if (n <= episodes) return Array.from({ length: Math.min(n, episodes) }, (_, i) => i);
  const total = devs.reduce((a, d) => a + d.weight, 0);
  const starts = [0];
  let acc = 0;
  for (let i = 0; i < n && starts.length < episodes; i++) {
    acc += devs[i].weight;
    const remaining = episodes - starts.length;
    const left = n - (i + 1);
    if (left < remaining) break;
    // Break after a turn once the episode has its share; or at its share if no turn comes; and never leave too few.
    const share = (total * starts.length) / episodes;
    const mustBreak = left === remaining;
    if (mustBreak || (acc >= share && (devs[i].turns || acc >= share * 1.25))) starts.push(i + 1);
  }
  while (starts.length < episodes && starts.at(-1)! < n - 1) starts.push(starts.at(-1)! + 1);
  return starts;
}

/** What an episode is for, from where it falls in the season and what its developments do. Proposed, never the work's. */
export function episodePurpose(index: number, episodes: number, devs: Development[]): string {
  const roles = new Set(devs.map((d) => d.role));
  if (index === 0) return 'Sets up the world and its people, and ends on what starts the story';
  if (index === episodes - 1) return roles.has('resolution') || roles.has('climax') ? 'Brings it to its climax and shows what has changed' : 'Brings the season to its end';
  if (roles.has('crisis') || index === episodes - 2) return 'Pushes everyone to the decision the finale turns on';
  if (roles.has('reversal')) return 'Turns what the lead believed, at the middle of the season';
  return devs.some((d) => d.introduces.length) ? 'Widens the story with new people, and raises the cost' : 'Raises the cost of going on';
}

/** A scene's purpose from its development's role. Proposed. */
export const PURPOSE: Record<Role, string> = {
  setup: 'Establish the world and the people in it',
  inciting: 'Show the event that sets the story going',
  complication: 'Raise the cost of going on',
  reversal: 'Turn what the lead believed',
  crisis: 'Force the decision everything turns on',
  climax: 'Settle the conflict',
  resolution: 'Show what has changed',
};

/**
 * Whether a scene is inside or outside, and when, from what its words name (from November 13, 2026). Until then a scene
 * told from a work took both from the beat at its point in the arc, so Red Dead Redemption 2's ferry heist was an
 * interior. A place word counts once; the side with more wins, and a tie or nothing leaves it to the caller. Game reading.
 */
const OUTSIDE = ['street', 'streets', 'road', 'field', 'fields', 'forest', 'woods', 'river', 'sea', 'ocean', 'shore', 'beach', 'desert', 'mountain', 'mountains', 'battlefield', 'battle', 'ranch', 'ferry', 'ship', 'boat', 'train', 'heist', 'shootout', 'ambush', 'chase', 'storm', 'garden', 'park', 'bridge', 'village', 'harbour', 'harbor', 'island', 'jungle', 'swamp', 'camp', 'outside', 'rooftop', 'horseback', 'sails', 'trench', 'front', 'graveyard', 'cemetery', 'square', 'docks', 'farm'];
const INSIDE = ['room', 'house', 'home', 'office', 'apartment', 'hall', 'bar', 'saloon', 'church', 'prison', 'cell', 'hospital', 'palace', 'mansion', 'laboratory', 'chamber', 'bedroom', 'kitchen', 'ballroom', 'restaurant', 'hotel', 'inside', 'classroom', 'courtroom', 'library', 'study', 'castle', 'party', 'dinner', 'ball', 'facility', 'bunker', 'vault', 'bank', 'casino', 'club', 'theatre', 'theater', 'shop', 'school'];
const DONE_OUTSIDE = ['drive', 'drives', 'drove', 'ride', 'rides', 'rode', 'flee', 'flees', 'fled', 'chase', 'chases', 'chased', 'race', 'races', 'fight', 'fights', 'fought', 'sail', 'sails', 'sailed', 'march', 'marches', 'marched', 'hunt', 'hunts', 'hunted', 'travels', 'travelled', 'traveled', 'journey', 'journeys', 'escape', 'escapes', 'escaped', 'shootout', 'battles', 'sights'];
const DONE_INSIDE = ['talks', 'talked', 'tells', 'told', 'confesses', 'confessed', 'writes', 'wrote', 'reads', 'letter', 'dines', 'dined', 'discusses', 'discussed', 'interrogates', 'interrogated', 'proposes', 'proposed', 'sleeps', 'slept', 'wakes', 'woke', 'waking', 'revises', 'works', 'worked'];
const TIMES: [Exclude<SceneLook['time'], null>, string[]][] = [['NIGHT', ['night', 'midnight', 'nightfall']], ['DAWN', ['dawn', 'sunrise', 'daybreak']], ['DUSK', ['dusk', 'sunset', 'evening', 'twilight']]];
export interface SceneLook { intExt: 'INT' | 'EXT' | null; time: 'DAY' | 'NIGHT' | 'DUSK' | 'DAWN' | null }
export function sceneLook(text: string): SceneLook {
  const t = text.toLowerCase();
  const out = OUTSIDE.filter((w) => hasWord(t, w)).length;
  const inn = INSIDE.filter((w) => hasWord(t, w)).length;
  // Where the places say nothing, what people do: riding, fleeing and fighting are done outside; talking, writing and
  // dining in (game reading, from November 13, 2026, so fewer scenes are left to the arc's guess).
  const doneOut = out === inn ? DONE_OUTSIDE.filter((w) => hasWord(t, w)).length : 0;
  const doneIn = out === inn ? DONE_INSIDE.filter((w) => hasWord(t, w)).length : 0;
  const side = out !== inn ? out - inn : doneOut - doneIn;
  return { intExt: side > 0 ? 'EXT' : side < 0 ? 'INT' : null, time: TIMES.find(([, ws]) => ws.some((w) => hasWord(t, w)))?.[0] ?? null };
}

/**
 * The people a story names, from its own words (from November 13, 2026: 199 works with a story had no character
 * recorded, Julius Caesar and David Copperfield among them, and were given "The Lead", "The Rival" and "The Ally").
 * A name is a run of capitalised words used at least three times, or twice as a full name, that isn't a place, a
 * group, a month, a people or a word that starts sentences. A word that is part of one longer name is that person
 * ("Winston" is Winston Smith). Their pronouns aren't read: guessing them from the sentences around a name was wrong
 * too often (John Seward came out "she"), and a wrong guess misnames a real character. Game reading.
 */
export interface StoryPerson { name: string; mentions: number }
const NOT_NAMES = new Set(['The', 'A', 'An', 'After', 'Before', 'When', 'While', 'Meanwhile', 'Later', 'Then', 'However', 'Although', 'Though', 'As', 'At', 'In', 'On', 'Upon', 'With', 'Without', 'During', 'Despite', 'Since', 'Once', 'Eventually', 'Finally', 'Soon', 'Following', 'Having', 'Because', 'Unable', 'Realizing', 'Realising', 'Back', 'Now', 'Still', 'That', 'This', 'These', 'Those', 'There', 'Here', 'Some', 'Many', 'Most', 'Both', 'Each', 'Every', 'All', 'One', 'Two', 'Three', 'Several', 'Other', 'Another', 'His', 'Her', 'Their', 'Its', 'He', 'She', 'They', 'It', 'We', 'You', 'I', 'My', 'Our', 'Your', 'If', 'But', 'And', 'Or', 'So', 'Yet', 'For', 'Not', 'No', 'Nor', 'Of', 'To', 'From', 'By', 'Into', 'Onto', 'Over', 'Under', 'About', 'Against', 'Among', 'Between', 'Through', 'Throughout', 'Across', 'Along', 'Around', 'Behind', 'Beyond', 'Near', 'Outside', 'Inside', 'Within', 'Next', 'Years', 'Days', 'Weeks', 'Months', 'Act', 'Scene', 'Chapter', 'Part', 'Book', 'Volume', 'Episode', 'Season', 'Prologue', 'Epilogue', 'Ultimately', 'Instead', 'Shortly', 'Afterwards', 'Afterward', 'Elsewhere', 'Together', 'Alone', 'Only', 'Even', 'Just', 'Also', 'Unbeknownst', 'Unknown', 'Determined', 'Desperate', 'Angered', 'Furious', 'Horrified', 'Convinced', 'Believing', 'Seeing', 'Learning', 'Hearing', 'Knowing', 'Fearing', 'Hoping', 'Using', 'Taking', 'Leaving', 'Returning', 'Arriving', 'Mr', 'Mrs', 'Ms', 'Dr', 'Sir', 'Lady', 'Lord', 'God', 'English', 'French', 'German', 'British', 'American', 'Spanish', 'Italian', 'Russian', 'Chinese', 'Japanese', 'Korean', 'Indian', 'Roman', 'Greek', 'Christian', 'Jewish', 'Muslim', 'Catholic', 'Protestant', 'Soviet', 'Nazi', 'European', 'African', 'Asian', 'Western', 'Eastern', 'Northern', 'Southern', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Christmas', 'Easter', 'Thou', 'Thee', 'Thy', 'Director', 'Captain', 'King', 'Queen', 'Prince', 'Princess', 'Emperor', 'Duke', 'Count', 'Professor', 'Doctor', 'Father', 'Mother', 'Uncle', 'Aunt', 'Miss', 'Master', 'General', 'Colonel', 'Major', 'Sergeant', 'Private', 'Lieutenant', 'Agent', 'Detective', 'Inspector', 'Saint', 'Don', 'Madame', 'Monsieur', 'Holocaust', 'Nevermore']);
const GROUP = /\b(Party|Ministry|Brotherhood|Army|Navy|Company|Empire|Kingdom|City|Island|Islands|Street|Castle|Church|School|University|College|Society|Agency|Corporation|Republic|Union|States|Council|Order|Guild|Clan|Family|House|Hall|Manor|Abbey|Palace|Tower|Mountains?|River|Sea|Ocean|Lake|Forest|Valley|Bay|Station|Hotel|Hospital|Prison|Academy|Institute|War|Battle|Revolution|Court|Times|Bible|Gospel|Quran|Mass|Day|Night|Year|Age|Era|Corps|Regiment|Division|Battalion|Fleet|Squad|Team|Gang|Mafia|Cartel|Police|Guard|Guards|Federation|Alliance|Resistance|Rebellion|Empire|Dynasty|Earth|Moon|Mars|Heaven|Hell|Paradise|Room|State|Knights|Templars?|Sisters|Brothers|Industries|Inc|Entertainment|Studios|Games|Observatory|Temple|Museum|Library|Laboratory|Lab|Base|Ship|Station)\b/;
export const storyPeople = (paragraphs: string[], exclude: string[] = []): StoryPerson[] => readNames(paragraphs, exclude).people;
/**
 * The places a story names: a name used at least twice, at least half the time after "in", "to", "at", "from" and the
 * like, that isn't a people (from November 13, 2026: Julius Caesar's setting was "not recorded" and its scenes were at
 * "Home" and "A Public Place", with Rome named ten times). Most named first. Game reading.
 */
export const storyPlaces = (paragraphs: string[], exclude: string[] = []): StoryPerson[] => readNames(paragraphs, exclude).places;
function readNames(paragraphs: string[], exclude: string[]): { people: StoryPerson[]; places: StoryPerson[] } {
  const text = paragraphs.join(' ');
  const sentences = sentencesOf(text);
  const excluded = new Set(exclude.flatMap((x) => [x, ...x.split(/\s+/)]));
  // Capitalised, not all capitals (ADAM is a substance in BioShock), not a possessive, not a word that starts sentences.
  // A name can be a letter and a number (We's D-503 and I-330).
  const cap = (w: string) => (/^\p{Lu}-\d+$/u.test(w) || /^\p{Lu}[\p{L}'’.-]*$/u.test(w)) && !/^\p{Lu}{2,}$/u.test(w) && !/['’]s$/.test(w) && !NOT_NAMES.has(w);
  const PARTICLE = /^(van|von|de|der|den|del|da|di|du|la|le|al|bin|ibn)$/;
  // Every run of capitalised words, broken at punctuation: "Dutch, Arthur, Bill and Javier" is four people.
  const runsOf = (s: string): { name: string; at: number }[] => {
    const toks = s.split(/(\s+|[,;:!?()“”"\[\]—–]|\.(?=\s|$))/).filter((x) => x && !/^\s+$/.test(x));
    const out: { name: string; at: number }[] = [];
    let run: string[] = [];
    let pos = 0;
    const end = () => { if (run.length) { while (run.length && PARTICLE.test(run.at(-1)!)) run.pop(); if (run.length) out.push({ name: run.join(' '), at: pos }); } run = []; };
    toks.forEach((t, k) => {
      const bare = t.replace(/['’]s$/, '');
      if (cap(bare)) { if (!run.length) pos = k; run.push(bare); if (bare !== t) end(); }
      else if (run.length && PARTICLE.test(t) && cap(toks[k + 1] ?? '')) run.push(t);
      else end();
    });
    end();
    return out;
  };
  const counts = new Map<string, number>();
  const after = new Map<string, number>(); // uses after "in", "to", "at", "from": a place
  const plural = new Map<string, number>(); // followed by "are", "were", "have": a people, not a person ("Jews are")
  const inPlace = new Map<string, number>(); // after "in", "to", "at", "from": where something happens
  const acts = new Map<string, number>(); // followed by a verb: "Brutus joins", "Micah kills", "Vladek was"
  for (const s of sentences) {
    const toks = s.split(/\s+/);
    for (const r of runsOf(s)) {
      if (GROUP.test(r.name) || excluded.has(r.name)) continue;
      counts.set(r.name, (counts.get(r.name) ?? 0) + 1);
      const k = toks.findIndex((x, n) => x.replace(/[^\p{L}\p{N}'’.-]/gu, '').replace(/\.+$/, '').replace(/['’]s$/, '') === r.name.split(' ')[0] && n > 0);
      if (k > 0 && /^(in|to|at|from|near|towards?|into|across|through|outside|inside|of|the|a|an)$/i.test(toks[k - 1])) after.set(r.name, (after.get(r.name) ?? 0) + 1);
      if (k > 0 && /^(in|to|at|from|near|towards?|into|across|through|outside|inside|reach(es|ed)?|leaves?|left|visits?|visited)$/i.test(toks[k - 1])) inPlace.set(r.name, (inPlace.get(r.name) ?? 0) + 1);
      const last = toks.findIndex((x, n) => n >= Math.max(0, k) && x.replace(/[^\p{L}\p{N}'’.-]/gu, '').replace(/\.+$/, '').replace(/['’]s$/, '') === r.name.split(' ').at(-1));
      if (last >= 0 && /^(are|were|have|their)$/i.test(toks[last + 1] ?? '')) plural.set(r.name, (plural.get(r.name) ?? 0) + 1);
      if (last >= 0 && /^(is|was|has|had|and|who|then|also|later|finally|eventually|soon|now|still|[a-z]+(s|ed))$/.test(toks[last + 1] ?? '')) acts.set(r.name, (acts.get(r.name) ?? 0) + 1);
    }
  }
  const names = [...counts.keys()];
  // Not a person: a plural or a people ("Germans", "Templars", "Pinkertons"); a word most often after "in" or "to" (a
  // place); or after "the" or "a" (the Apple, the Third Crusade).
  const notPerson = (n: string) => {
    const one = !n.includes(' ');
    // A one-word name must do something at least once: "Eden" and "Beta" in a story are never followed by a verb.
    if (one && !acts.get(n) && !names.some((m) => m !== n && m.split(' ').includes(n) && acts.get(m))) return true;
    if (one && /(ian|ish)$/.test(n) && !acts.get(n)) return true; // a people in the singular: "Athenian"
    if (/^\p{Lu}\p{Ll}+ing\b/u.test(n)) return true; // "Accompanying Alcibiades": a word that starts a clause
    if (one && counts.has(`${n}s`)) return true; // "Assassin" beside "Assassins": a member of a group, by its name
    if (one && (/(ans|ers|ists|ites|ians|ese)$/.test(n) || (n.endsWith('s') && counts.has(n.slice(0, -1))) || (n.endsWith('s') && (plural.get(n) ?? 0) > 0))) return true;
    return (after.get(n) ?? 0) * 2 >= (counts.get(n) ?? 0) && (counts.get(n) ?? 0) > 0;
  };
  // A single word that is part of exactly one longer name is that person; the longer form is the name kept.
  const longer = (n: string) => names.filter((m) => m !== n && m.split(' ').includes(n) && !notPerson(m));
  const merged = new Map<string, number>();
  for (const [n, c] of counts) {
    if (notPerson(n)) continue;
    // Part of several: the one of them named most in full, then the shortest ("Castorp" is Hans Castorp, not his
    // grandfather Hans Lorenz Castorp).
    const into = !n.includes(' ') ? longer(n).sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.split(' ').length - b.split(' ').length) : [];
    const key = into.length ? into[0] : n;
    if (key) merged.set(key, (merged.get(key) ?? 0) + c);
  }
  const out: StoryPerson[] = [];
  for (const [name, mentions] of merged) {
    const full = counts.get(name) ?? 0;
    if (!(mentions >= 3 || (name.includes(' ') && full >= 2))) continue;
    out.push({ name, mentions });
  }
  const places: StoryPerson[] = [...counts].filter(([n, c]) => {
    const at = inPlace.get(n) ?? 0;
    // Not one who acts as a person does ("Stef is", "Charles then"), and not a people.
    // Three uses after "in", "to", "from" or the like (two for a name of two words); not half (Rome is mostly "of Rome").
    return (at >= 3 || (at >= 2 && n.includes(' '))) && !/(ans|ers|ists|ites|ians|ese)$/.test(n) && !(plural.get(n) ?? 0) && (acts.get(n) ?? 0) * 2 < c;
  }).map(([name, mentions]) => ({ name, mentions }));
  return {
    people: out.sort((a, b) => b.mentions - a.mentions || a.name.localeCompare(b.name)),
    places: places.sort((a, b) => b.mentions - a.mentions || a.name.localeCompare(b.name)),
  };
}
