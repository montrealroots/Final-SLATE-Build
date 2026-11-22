// How the industry has judged a real person in a job (November 15, 2026; the owner's ask for "real grades on their skill
// based off how everybody of importance sees them in real life"). Until this, a real person's capability was drawn by
// the game around their count of credits, and said to be "simulated, not a measure of them". Now it is read from what
// the people whose judgement counts have recorded about their work: the wins and nominations of the Academy, BAFTA, the
// Screen Actors Guild and the Television Academy (who vote as peers), the Golden Globes and the Critics' Choice (press
// and critics), the juries of Cannes, Venice and Berlin, and the Independent Spirit and César awards. The record is
// Wikidata's (CC0), built by tools/recognition/build.mjs into src/data/recognition.json, and fetched on demand.
//
// What is the game's, and said so wherever it shows: how much each body's judgement weighs, and how a weight of
// recognition becomes a capability and an asking rate. Nothing reads a rating, a vote count or a popularity figure.
// No future knowledge: only what was recorded before the story's year counts (a ceremony later this year hasn't
// happened yet; Wikidata gives years, not dates, so this year's waits for next January). A mark with no recorded year
// (561 of 18,152 on November 15, 2026) could be from any year, so it is left out.
import recognitionUrl from '../data/recognition.json?url';

export type Body = 'oscar' | 'bafta' | 'bafta-tv' | 'globe' | 'sag' | 'emmy' | 'cannes' | 'venice' | 'berlin' | 'critics' | 'spirit' | 'cesar'
  // From November 22, 2026: the other film countries' national academies and main awards (tools/recognition/build.mjs).
  | 'japan-academy' | 'golden-rooster' | 'hundred-flowers' | 'blue-dragon' | 'baeksang' | 'golden-horse' | 'hkfa' | 'filmfare' | 'nfa-india'
  | 'asian-film' | 'goya' | 'david' | 'lola' | 'ariel' | 'grande-premio' | 'platino' | 'aacta' | 'csa' | 'amaa';
/** What each body's judgement weighs: the game's (Modeled assumption), with peers' votes and the oldest festivals' juries above the press's. */
export const BODY_WEIGHT: Record<Body, number> = {
  oscar: 10, bafta: 7, sag: 7, cannes: 7, venice: 7, berlin: 6, emmy: 6, globe: 5, cesar: 5, 'bafta-tv': 5, critics: 4, spirit: 4,
  // A country's own academy or state award weighs what the César does; a press or popular vote, and a region's prize, less.
  'japan-academy': 5, 'golden-rooster': 5, 'blue-dragon': 5, 'golden-horse': 5, hkfa: 5, 'nfa-india': 5, goya: 5, david: 5, lola: 5, ariel: 5,
  'grande-premio': 5, aacta: 5, csa: 5, baeksang: 4, filmfare: 4, 'asian-film': 4, platino: 4, amaa: 4, 'hundred-flowers': 3,
};
/** A nomination's share of a win. */
export const NOMINATION_SHARE = 0.4;
export const BODY_NAME: Record<Body, [string, string]> = {
  oscar: ['Academy Award', 'Academy Awards'], bafta: ['BAFTA Film Award', 'BAFTA Film Awards'], 'bafta-tv': ['BAFTA Television Award', 'BAFTA Television Awards'],
  globe: ['Golden Globe', 'Golden Globes'], sag: ['Screen Actors Guild Award', 'Screen Actors Guild Awards'], emmy: ['Primetime Emmy', 'Primetime Emmys'],
  cannes: ['Cannes Festival prize', 'Cannes Festival prizes'], venice: ['Venice Festival prize', 'Venice Festival prizes'], berlin: ['Berlin Silver Bear', 'Berlin Silver Bears'],
  critics: ["Critics' Choice Award", "Critics' Choice Awards"], spirit: ['Independent Spirit Award', 'Independent Spirit Awards'], cesar: ['César', 'Césars'],
  'japan-academy': ['Japan Academy Prize', 'Japan Academy Prizes'], 'golden-rooster': ['Golden Rooster', 'Golden Roosters'],
  'hundred-flowers': ['Hundred Flowers Award', 'Hundred Flowers Awards'], 'blue-dragon': ['Blue Dragon Award', 'Blue Dragon Awards'],
  baeksang: ['Baeksang Arts Award', 'Baeksang Arts Awards'], 'golden-horse': ['Golden Horse', 'Golden Horses'], hkfa: ['Hong Kong Film Award', 'Hong Kong Film Awards'],
  filmfare: ['Filmfare Award', 'Filmfare Awards'], 'nfa-india': ['National Film Award', 'National Film Awards'], 'asian-film': ['Asian Film Award', 'Asian Film Awards'],
  goya: ['Goya', 'Goyas'], david: ['David di Donatello', 'David di Donatellos'], lola: ['German Film Award', 'German Film Awards'], ariel: ['Ariel', 'Ariels'],
  'grande-premio': ['Grande Prêmio do Cinema Brasileiro', 'Grande Prêmios do Cinema Brasileiro'], platino: ['Platino Award', 'Platino Awards'],
  aacta: ['AACTA Award', 'AACTA Awards'], csa: ['Canadian Screen Award', 'Canadian Screen Awards'], amaa: ['Africa Movie Academy Award', 'Africa Movie Academy Awards'],
};
/**
 * Where each body's judgement is a home one: the countries whose film industry it is (your-films.ts castPicture casts a
 * studio's picture from those first). The three festivals judge the world's films, so they are no country's. The Asian
 * Film Awards, the Platinos and the Africa Movie Academy Awards are a region's, so they count for each of its countries.
 */
export const BODY_COUNTRIES: Record<Body, readonly string[]> = {
  oscar: ['US'], globe: ['US'], sag: ['US'], emmy: ['US'], critics: ['US'], spirit: ['US'], bafta: ['GB'], 'bafta-tv': ['GB'], cesar: ['FR'],
  cannes: [], venice: [], berlin: [],
  'japan-academy': ['JP'], 'golden-rooster': ['CN'], 'hundred-flowers': ['CN'], 'blue-dragon': ['KR'], baeksang: ['KR'], 'golden-horse': ['TW', 'HK', 'CN'],
  hkfa: ['HK'], filmfare: ['IN'], 'nfa-india': ['IN'], 'asian-film': ['JP', 'KR', 'CN', 'HK', 'TW', 'IN', 'TH', 'PH', 'ID', 'MY', 'SG', 'VN'],
  goya: ['ES'], david: ['IT'], lola: ['DE'], ariel: ['MX'], 'grande-premio': ['BR'], platino: ['ES', 'PT', 'MX', 'AR', 'BR', 'CO', 'CL', 'PE', 'UY', 'CU', 'VE'],
  aacta: ['AU'], csa: ['CA'], amaa: ['NG', 'GH', 'ZA', 'KE', 'EG', 'SN', 'CM', 'TZ', 'UG'],
};
/** Whether someone has been recognised by a body of `country` before the story's year. */
export function recognisedAtHome(tmdbId: number, country: string, storyYear: number, data = loaded): boolean {
  const rec = data?.people[String(tmdbId)];
  return !!rec && rec[3].some(([c, , y]) => y !== null && y < storyYear && BODY_COUNTRIES[data!.categories[c].body].includes(country));
}

export interface RecognitionData {
  dataset: 'recognition';
  version: 1;
  source: { provider: string; url: string; licence: string; retrieved: string };
  categories: { id: string; label: string; body: Body; jobs: string[] }[];
  /** TMDB person ID: [name, born, died, marks]; a mark is [category index, won (1) or nominated (0), year or null]. */
  people: Record<string, [string | null, string | null, string | null, [number, 0 | 1, number | null][]]>;
  /** TMDB person ID: how many Wikipedia editions have an article on them, for everyone with ten or more (tools/recognition/fame.mjs). */
  fame?: Record<string, number>;
}

let loaded: RecognitionData | null = null;
let loading: Promise<RecognitionData> | null = null;
/** Publish the record (the loader, and tests). */
export function applyRecognition(data: unknown): RecognitionData {
  const d = data as RecognitionData;
  if (d?.dataset !== 'recognition' || d.version !== 1 || !Array.isArray(d.categories) || typeof d.people !== 'object') throw new Error("The industry's record of awards couldn't be read.");
  loaded = d;
  return d;
}
export const recognitionData = (): RecognitionData | null => loaded;
/** Fetched when a person or a hiring screen opens, not at startup: it is half a megabyte. A failed load can be tried again. */
export function loadRecognition(): Promise<RecognitionData> {
  if (loaded) return Promise.resolve(loaded);
  loading ??= fetch(recognitionUrl).then((r) => r.json()).then(applyRecognition).catch((e) => { loading = null; throw e; });
  return loading;
}

export interface Standing {
  /** The weight of their recognition in the job: each win its body's weight, each nomination a share of it. */
  points: number;
  wins: Partial<Record<Body, number>>;
  nominations: Partial<Record<Body, number>>;
  first: number;
  last: number;
}

/** A person's recognition in a job, as recorded before the story's year; null where nothing is recorded. */
export function standingOf(tmdbId: number, job: string, storyYear: number, data = loaded): Standing | null {
  const rec = data?.people[String(tmdbId)];
  if (!rec) return null;
  // A win and the nomination it came from are one recognition: kept once, as the win.
  const marks = new Map<string, 0 | 1>();
  rec[3].forEach(([c, won, year]) => {
    const cat = data!.categories[c];
    if (!cat?.jobs.includes(job) || year === null || year >= storyYear) return;
    const key = `${c}:${year}`;
    marks.set(key, Math.max(marks.get(key) ?? 0, won) as 0 | 1);
  });
  if (!marks.size) return null;
  const s = { points: 0, wins: {}, nominations: {}, first: null, last: null } as unknown as Standing;
  for (const [key, won] of marks) {
    const [c, y] = key.split(':');
    const body = data!.categories[Number(c)].body;
    s.points += BODY_WEIGHT[body] * (won ? 1 : NOMINATION_SHARE);
    const into = won ? s.wins : s.nominations;
    into[body] = (into[body] ?? 0) + 1;
    const n = Number(y);
    s.first = Math.min(s.first ?? n, n);
    s.last = Math.max(s.last ?? n, n);
  }
  s.points = Math.round(s.points * 10) / 10;
  return s;
}

/** What recognition adds to a capability: steep for the first nominations, then less for each more. */
export const recognitionLift = (points: number): number => 16 * Math.log2(1 + points / 3);
/** A capability from experience (1 to 5) and recognition: 35 for the newest with none, 55 for the most experienced with none. */
export const capabilityFrom = (experience: number, points: number): number => Math.round(Math.max(30, Math.min(98, 30 + experience * 5 + recognitionLift(points))));

/** Days a lead works on a feature, to read a fee for a film as a day rate (the game's; Modeled assumption). */
export const LEAD_DAYS = 40;
/** The most a fee for a film is taken to be (the highest reported fees, July 2022, were around $30 million before shares of the takings). */
export const FEE_CEILING = 30_000_000;
/** A performer's fee for a film from their recognition (the game's curve, calibrated against fees reported in July 2022: docs/people/PAY.md). */
export const filmFeeFrom = (points: number): number => Math.min(FEE_CEILING, Math.round(250_000 * (1 + points / 4) ** 1.5 / 1000) * 1000);
/** How many Wikipedia editions have an article on a person, by TMDB ID: 0 when fewer than ten, or the record isn't loaded. */
export const fameOf = (tmdbId: number | string): number => loaded?.fame?.[String(tmdbId)] ?? 0;
/**
 * A performer's fee for a film from how widely they are known: $4,700 × editions^1.75, at most the ceiling. Recognition
 * prices prestige and not an audience's draw, so until November 15, 2026 a star with few awards was under-priced (Daniel
 * Craig about 2% of his reported fee) and a star with none asked a working actor's rate. Calibrated on fees reported in
 * 2021 and 2022: Margot Robbie and Ryan Gosling, $12.5 million each for Barbie at 92 and 90 editions; Dwayne Johnson,
 * $23.5 million, Gal Gadot and Ryan Reynolds, $20 million each, for Red Notice (Variety) at 113, 94 and 91. The fame is
 * today's: a fee before a star was this well known is over-read. The curve is the game's: Modeled assumption.
 */
export const fameFeeFrom = (editions: number): number => (editions > 0 ? Math.min(FEE_CEILING, Math.round(4_700 * editions ** 1.75 / 1000) * 1000) : 0);
/** A performer's fee for a film: whichever of their recognition and their fame asks more. */
export const performerFee = (points: number, editions: number): number => Math.max(filmFeeFrom(points), fameFeeFrom(editions));

/**
 * A performer's gender as the awards record states it, from the categories it recognised them in ("Best Actress", "a
 * Female Actor"): the record holds no gender of its own. Unknown for someone recognised only in categories for anyone.
 */
export function genderOf(tmdbId: number, data = loaded): 'woman' | 'man' | undefined {
  const rec = data?.people[String(tmdbId)];
  if (!rec) return undefined;
  let w = 0, m = 0;
  for (const [c] of rec[3]) { const l = data!.categories[c]?.label ?? ''; if (/Actress|Female/.test(l)) w++; else if (/\bActor\b|\bMale\b/.test(l)) m++; }
  return w > m ? 'woman' : m > w ? 'man' : undefined;
}

/** The recognition in words: "2 Academy Award nominations and a Golden Globe win". */
export function describeStanding(s: Standing): string {
  const parts: string[] = [];
  const say = (n: number, body: Body, what: 'win' | 'nomination') => `${n === 1 ? (/^[AEIOU]/.test(BODY_NAME[body][0]) ? 'an' : 'a') : n} ${BODY_NAME[body][0]} ${what}${n === 1 ? '' : 's'}`;
  for (const b of Object.keys(BODY_WEIGHT) as Body[]) if (s.wins[b]) parts.push(say(s.wins[b]!, b, 'win'));
  for (const b of Object.keys(BODY_WEIGHT) as Body[]) if (s.nominations[b]) parts.push(say(s.nominations[b]!, b, 'nomination'));
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
  return `${list[0].toUpperCase()}${list.slice(1)}, ${s.first === s.last ? s.first : `${s.first} to ${s.last}`}`;
}

/** Everyone recognised in a job before the story's year, the most recognised first. */
export function recognisedIn(job: string, storyYear: number, data = loaded): { tmdbId: number; name: string; standing: Standing }[] {
  if (!data) return [];
  const out: { tmdbId: number; name: string; standing: Standing }[] = [];
  for (const [id, rec] of Object.entries(data.people)) {
    if (!rec[0]) continue; // no recorded name to offer them by
    const s = standingOf(Number(id), job, storyYear, data);
    if (s) out.push({ tmdbId: Number(id), name: rec[0], standing: s });
  }
  return out.sort((a, b) => b.standing.points - a.standing.points || a.name.localeCompare(b.name));
}

/** The game's jobs a person has been recognised in before the story's year. */
export function jobsRecognised(tmdbId: number, storyYear: number, data = loaded): string[] {
  const rec = data?.people[String(tmdbId)];
  if (!rec) return [];
  return [...new Set(rec[3].filter(([, , y]) => y !== null && y < storyYear).flatMap(([c]) => data!.categories[c]?.jobs ?? []))];
}

/**
 * The experience (1 to 5) a recognised career shows by itself, for someone known only from this record (no film catalog
 * installed): recognition across twenty years or more is a whole career (5), across ten an established one (4), and any
 * recognition at all is more than a beginner's (3). With the catalog, the count of credits decides and this is its floor.
 */
export function experienceFrom(s: Standing): number {
  const span = s.last - s.first;
  return span >= 20 ? 5 : span >= 10 ? 4 : 3;
}
