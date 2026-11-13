// A work's genres read from what happens in it (November 13, 2026, after the owner saw Grand Theft Auto III proposed as
// an "adventure"). A work's recorded genres are Wikidata's. For a video game those name how it is played (an
// action-adventure game, a shooter), and for 220 of the 643 works none maps to one of the game's genres. Until now such a
// work was given a genre by its medium alone: every video game was an adventure, and every novel without one a drama.
//
// Now the work's summary and story (sources.ts, the article's words) are read for what marks a genre: mafia, cartel and
// gang for gangster; wizard, dragon and spell for fantasy; and so on. The words are game reading, tuned on a sweep of
// all 643 works on November 13, 2026 (docs/v5/GENRES.md). A genre needs enough of its words to count:
// three uses, at least two of them different words. What it was read from is said with it. It is a reading, so it is
// proposed, never sourced. Recorded genres that name the story are kept first, as they always were.
import { WORD } from './story-structure';

/** The words that mark each of the game's genres in a story. Lower case; a phrase is matched whole. Game reading. */
export const GENRE_WORDS: Record<string, string[]> = {
  gangster: ['mafia', 'mob', 'mobster', 'mobsters', 'gang', 'gangs', 'gangster', 'gangsters', 'cartel', 'cartels', 'triad', 'triads', 'crime family', 'crime boss', 'racket', 'mafioso'],
  crime: ['crime', 'crimes', 'criminal', 'criminals', 'drug', 'drugs', 'robbery', 'murder', 'murders', 'police', 'smuggling', 'corruption', 'stolen', 'prison', 'arrested', 'convict'],
  heist: ['heist', 'heists', 'robbery', 'robbers', 'bank job', 'vault'],
  detective: ['detective', 'detectives', 'investigation', 'investigates', 'investigate', 'clue', 'clues', 'inspector', 'sleuth'],
  mystery: ['mystery', 'mysterious', 'murderer', 'suspect', 'suspects', 'secret', 'disappearance'],
  war: ['war', 'wars', 'soldier', 'soldiers', 'army', 'armies', 'battle', 'battles', 'troops', 'invasion', 'regiment', 'front line', 'battlefield'],
  military: ['marine', 'marines', 'squad', 'commander', 'sergeant', 'military', 'mission', 'special forces', 'nuclear', 'weapons facility'],
  horror: ['monster', 'monsters', 'demon', 'demons', 'ghost', 'ghosts', 'haunted', 'curse', 'cursed', 'horror', 'possessed', 'nightmare'],
  zombie: ['zombie', 'zombies', 'undead', 'infected'],
  vampire: ['vampire', 'vampires', 'blood-drinking'],
  'science-fiction': ['alien', 'aliens', 'spaceship', 'starship', 'robot', 'robots', 'android', 'androids', 'planet', 'planets', 'space station', 'galaxy', 'laboratory', 'experiment'],
  'post-apocalyptic': ['apocalypse', 'wasteland', 'nuclear war', 'survivors', 'fallout', 'collapse of civilization'],
  dystopian: ['regime', 'totalitarian', 'surveillance', 'dystopia', 'rebellion', 'oppressive'],
  cyberpunk: ['cybernetic', 'implants', 'megacorporation', 'hacker', 'hackers', 'netrunner'],
  fantasy: ['magic', 'magical', 'wizard', 'wizards', 'sorcerer', 'sorceress', 'dragon', 'dragons', 'elf', 'elves', 'spell', 'spells', 'enchanted', 'prophecy', 'witch', 'witches', 'dwarves', 'goblins'],
  romance: ['love', 'loves', 'in love', 'romance', 'lover', 'lovers', 'marry', 'marries', 'married', 'marriage', 'wedding', 'courtship'],
  spy: ['spy', 'spies', 'espionage', 'secret agent', 'intelligence agency', 'double agent', 'infiltrate', 'infiltrates', 'operative', 'operatives'],
  thriller: ['conspiracy', 'assassin', 'assassins', 'assassination', 'hostage', 'hostages', 'kidnapped', 'kidnapping', 'betrayed', 'chase', 'terrorist', 'terrorists'],
  western: ['outlaw', 'outlaws', 'sheriff', 'cowboy', 'cowboys', 'frontier', 'ranch', 'gunslinger', 'bounty hunter', 'posse'],
  'coming-of-age': ['school', 'teenage', 'teenager', 'adolescence', 'childhood', 'grows up', 'growing up', 'classmates'],
  superhero: ['superhero', 'superheroes', 'superpowers', 'supervillain', 'vigilante', 'powers'],
  revenge: ['revenge', 'avenge', 'avenges', 'vengeance', 'retribution'],
  sports: ['tournament', 'championship', 'match', 'team', 'coach', 'league'],
  survival: ['survive', 'survival', 'stranded', 'shipwrecked', 'starvation'],
  'martial-arts': ['martial arts', 'kung fu', 'dojo', 'sensei'],
  wuxia: ['sect', 'sects', 'cultivation', 'jianghu', 'martial world'],
  isekai: ['reincarnated', 'another world', 'transported to'],
  'sea-adventure': ['ship', 'ships', 'pirate', 'pirates', 'voyage', 'sailors', 'shipwreck', 'whaling'],
  satire: ['satire', 'satirical', 'absurd'],
  tragedy: ['tragic', 'dies', 'death', 'suicide', 'kills himself', 'kills herself'],
  'domestic-drama': ['family', 'mother', 'father', 'husband', 'wife', 'household', 'daughter', 'son'],
};
/** Uses, and different words, a genre needs before it counts. */
export const GENRE_MIN_USES = 3;
export const GENRE_MIN_WORDS = 2;
/**
 * Uses a genre needs to stand beside the first. Red Dead Redemption 2's one passage of war in Guarma (army twice, war
 * once) made it a war story as well as a western until November 13, 2026.
 */
export const GENRE_SECONDARY_USES = 5;
/**
 * Genres a story can mark only as a background. These words come up in most stories (family, death, a king in the
 * past), so they lead only when nothing more particular does.
 */
const BACKGROUND = new Set(['domestic-drama', 'tragedy', 'romance', 'crime', 'mystery', 'military', 'thriller']);
/**
 * Genres that are a story's world, which lead whatever else it marks: Red Dead Redemption 2's gang is an outlaw gang in
 * a western. A king or a kingdom isn't read at all (it was, as historical fiction, until the sweep showed it reading
 * the Mushroom Kingdom and Shakespeare's courts as history).
 */
const SETTING = new Set(['western', 'science-fiction', 'fantasy', 'post-apocalyptic', 'cyberpunk']);
const rank = (g: string) => (SETTING.has(g) ? 0 : BACKGROUND.has(g) ? 2 : 1);

/** Every whole-word, case-blind use of a word or phrase in a text: a scan, as story-structure.ts reads stories. */
function uses(text: string, w: string): number {
  let n = 0;
  for (let at = text.indexOf(w); at >= 0; at = text.indexOf(w, at + w.length)) if (!WORD.test(text[at - 1] ?? ' ') && !WORD.test(text[at + w.length] ?? ' ')) n += 1;
  return n;
}

export interface GenreReading { genre: string; uses: number; words: [string, number][] }

/**
 * The game's genres a text marks, strongest first: a world, then particular genres, then background ones, then by uses. Only genres
 * the game has (`have`) and that reach the threshold are kept.
 */
export function readGenres(text: string, have: ReadonlySet<string>, title = ''): GenreReading[] {
  // The work's own title is taken out first: Grand Theft Auto's "theft" and God of War's "war" are its name, not its story.
  let t = text.toLowerCase();
  if (title.trim()) t = t.split(title.toLowerCase()).join(' ');
  const out: GenreReading[] = [];
  for (const [genre, words] of Object.entries(GENRE_WORDS)) {
    if (!have.has(genre)) continue;
    const hits = words.map((w) => [w, uses(t, w)] as [string, number]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    const total = hits.reduce((a, [, n]) => a + n, 0);
    if (total >= GENRE_MIN_USES && hits.length >= GENRE_MIN_WORDS) out.push({ genre, uses: total, words: hits });
  }
  return out.sort((a, b) => rank(a.genre) - rank(b.genre) || b.uses - a.uses || a.genre.localeCompare(b.genre));
}

/** What a reading was made from, in words: "mafia (4), cartel (3), gang (2)". */
export const readingWords = (r: GenreReading): string => r.words.slice(0, 4).map(([w, n]) => `${w} (${n})`).join(', ');

/**
 * The genres a work's story marks, as a brief proposes them: read from its summary and its story, the first and those
 * strong enough to stand beside it. The work's page shows the same reading (SourcePicker.tsx), so the two never differ.
 */
export function storyGenres(work: { title: string; summary?: { text: string } | null; plot?: { paragraphs: string[] } | null }, have: ReadonlySet<string>): GenreReading[] {
  return readGenres(`${work.summary?.text ?? ''} ${(work.plot?.paragraphs ?? []).join(' ')}`, have, work.title).filter((r, n) => n === 0 || r.uses >= GENRE_SECONDARY_USES);
}

/**
 * What a work's record says of it, read for a genre where none of its recorded genres is one of the game's and its
 * story is too short to read (from November 13, 2026, for the 126 works that were given a genre by their medium alone).
 * Its recorded genres first ("theatre of the absurd", "fable", "magical girl anime and manga"), then its description
 * ("2026 fantasy novel", "American satirical webcomic"), then its recorded subjects ("humor", "Cold War"). Each phrase
 * names a genre plainly or near enough; a genre of how a game is played is read for the story it implies only where it
 * does imply one (a shooter is action, a real-time strategy game is war). Game reading, proposed, never sourced: the
 * reviewed table in tools/sources/genre-map.mjs is what makes a recorded genre the game's own.
 */
const RECORD_WORDS: [RegExp, string][] = [
  [/theatre of the absurd|\babsurd|nonsense verse/i, 'absurdist'],
  [/family saga/i, 'domestic-drama'],
  [/\bharem\b/i, 'romantic-comedy'],
  [/satir/i, 'satire'],
  [/\bcomedy\b|humou?r|sarcasm|\bgag\b/i, 'comedy'],
  // Lower case: "Romance of the Three Kingdoms" is a title, not a genre.
  [/\bromance\b|romantic love|boys' love|\byaoi\b/, 'romance'],
  [/chanson de geste|\bepic\b/i, 'epic'],
  [/\bfable\b|fairy tale/i, 'fairy-tale'],
  [/psychological thriller/i, 'psychological-thriller'],
  [/\bzombie/i, 'zombie'],
  [/post-apocalyptic/i, 'post-apocalyptic'],
  [/superhero|superhuman powers/i, 'superhero'],
  [/science fiction|\bsci-fi\b/i, 'science-fiction'],
  [/magical girl|\bfantasy\b/i, 'fantasy'],
  [/supernatural|\bafterlife\b|kings of hell/i, 'supernatural'],
  [/\bninj/i, 'martial-arts'],
  [/school life|school anime|high school|künstlerroman|developmental novel|bildungsroman/i, 'coming-of-age'],
  [/creepypasta|urban legend|\bhorror\b/i, 'horror'],
  [/\bwulin\b|\bwuxia\b/i, 'wuxia'],
  [/alternate history/i, 'alternate-history'],
  [/detective/i, 'detective'],
  [/\bcrime\b|\bgang\b|underworld/i, 'crime'],
  [/\bcold war\b|eastern front|tank simulation|vehicular combat|real-time strategy|strategy (video )?game/i, 'war'],
  [/historical video game/i, 'historical-fiction'],
  [/survival game/i, 'survival'],
  [/\bsea\b|fisherman|\bvoyage\b/i, 'sea-adventure'],
  [/life sim|social simulation|farm(ing)? (life )?sim|virtual pet/i, 'slice-of-life'],
  [/social fiction/i, 'social-realism'],
  [/shooter|shoot 'em up|battle arena/i, 'action'],
  [/platform (video )?game|platformer/i, 'adventure'],
];
export interface RecordReading { genre: string; phrase: string }
/** A long phrase cut to the words around what matched: "an American zombie apocalypse comic book", not the sentence. */
function around(phrase: string, re: RegExp): string {
  if (phrase.length <= 60) return phrase;
  const m = re.exec(phrase)!;
  const before = phrase.slice(0, m.index).split(/\s+/).slice(-3).join(' ');
  const after = phrase.slice(m.index + m[0].length).split(/\s+/).slice(0, 4).join(' ');
  return `…${before}${m[0]}${after}`.replace(/\s+/g, ' ').replace(/["'.,;:]+$/, '') + '…';
}
export function recordGenres(work: { title?: string; description?: string | null; recordedGenres?: { label: string }[]; subjects?: string[]; summary?: { text: string } | null }, have: ReadonlySet<string>): RecordReading[] {
  // Three tiers, each read whole before the next: its recorded genres; what it is said to be (its description, and the
  // first two sentences of its article, which say "an American zombie apocalypse comic book series"); its subjects.
  // The work's own title is taken out, as from its story: The Old Man and the Sea isn't read for "Sea".
  const untitled = (t: string) => (work.title ? t.split(work.title).join(' ') : t);
  const opening = untitled((work.summary?.text ?? '').split(/(?<=[.!?])\s+/).slice(0, 2).join(' '));
  const tiers = [(work.recordedGenres ?? []).map((g) => g.label), [untitled(work.description ?? ''), opening], work.subjects ?? []].map((xs) => xs.filter((x) => x.trim()));
  const out: RecordReading[] = [];
  for (const phrases of tiers) for (const [re, genre] of RECORD_WORDS) {
    const phrase = phrases.find((x) => re.test(x));
    if (phrase && have.has(genre) && !out.some((x) => x.genre === genre)) out.push({ genre, phrase: around(phrase, re) });
  }
  return out.slice(0, 3);
}
