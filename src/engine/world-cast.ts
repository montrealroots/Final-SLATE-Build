// The simulated world's own titles and people, for every year a story can reach (the owner, November 20, 2026: "no
// repetitiveness ... freshness and realism year by year"). Until then each season drew its titles from 20 words by 20
// and its people from 16 first names by 16 last: measured over ten seasons from 2027 for three seeds, by 2036 about 60%
// of a season's titles had been used in an earlier season, and from 2029 nearly every credit named someone seen before,
// as a stranger who merely shared the name.
//
// Titles: every simulated work of a year has a slot in that year's block of the title space, and the space is shuffled
// once per save (an affine permutation, so two slots never share a title). A title is never used again in a later
// year until the space wraps, TITLE_YEARS seasons on.
//
// People: a lasting pool. Every year a cohort debuts (COHORT people, each a director, a writer or a performer), with a
// career of its own length and a skill that rises, peaks and fades. Each person has one name for good, and no name is
// given to two people while the name space lasts (NAME_YEARS cohorts). The same director comes back because they made
// another film, better or worse as their career goes. Nothing of it is stored: it follows from the seed, so a reload
// gives the same world.
import { gaussian, intBetween, stream } from './rng';

const ADJ = ['Quiet', 'Salt', 'Paper', 'Northern', 'Last', 'Glass', 'Hollow', 'Bright', 'Small', 'Burning', 'Silent', 'Iron', 'Little', 'Distant', 'Golden', 'Low', 'Wild', 'Late', 'Blue', 'Second',
  'Hidden', 'Starlit', 'Winter', 'Lost', 'Crimson', 'Endless', 'Brave', 'Secret', 'Midnight', 'Forgotten', 'Amber', 'Ashen', 'Bitter', 'Black', 'Broken', 'Cold', 'Copper', 'Crooked', 'Dark', 'Deep',
  'Dry', 'Early', 'Empty', 'Faint', 'Fallen', 'False', 'Far', 'Final', 'First', 'Frozen', 'Gentle', 'Ghost', 'Gray', 'Green', 'Grey', 'Half', 'Heavy', 'High', 'Holy', 'Honest', 'Hungry', 'Inner',
  'Invisible', 'Ivory', 'Kind', 'Lasting', 'Lazy', 'Lean', 'Lonely', 'Long', 'Loud', 'Lucky', 'Marble', 'Mild', 'Moving', 'Narrow', 'New', 'Nameless', 'Odd', 'Old', 'Open', 'Orange', 'Outer', 'Pale',
  'Perfect', 'Plain', 'Poor', 'Proud', 'Quick', 'Rare', 'Raw', 'Red', 'Restless', 'Rich', 'Rising', 'Rough', 'Royal', 'Rusted', 'Sacred', 'Scarlet', 'Shallow', 'Sharp', 'Shining', 'Short', 'Silver',
  'Simple', 'Sleeping', 'Slow', 'Soft', 'Southern', 'Still', 'Stolen', 'Strange', 'Sudden', 'Sweet', 'Tender', 'Thin', 'Tired', 'True', 'Twin', 'Upper', 'Velvet', 'Violet', 'Warm', 'Western',
  'White', 'Wide', 'Wooden', 'Young', 'Eastern', 'Borrowed', 'Burnt', 'Careless', 'Clear', 'Common', 'Crystal', 'Dusty', 'Electric', 'Fragile', 'Furious', 'Gilded', 'Hard', 'Humble', 'Idle'];
const NOUN = ['Harbor', 'Summer', 'Orchard', 'Signal', 'River', 'Kingdom', 'Witness', 'Houses', 'Tide', 'Season', 'Weather', 'Mountain', 'Archive', 'Garden', 'Crossing', 'Lights', 'Hours', 'Field',
  'Animals', 'Room', 'Voyage', 'Machine', 'Frontier', 'Promise', 'Comet', 'Lantern', 'Forest', 'Island', 'Engine', 'Legend', 'Acre', 'Alley', 'Anchor', 'Angel', 'Apartment', 'Arrival', 'Attic',
  'Avenue', 'Ballad', 'Bargain', 'Basement', 'Bay', 'Beach', 'Bell', 'Border', 'Bridge', 'Brother', 'Building', 'Cabin', 'Canal', 'Canyon', 'Captain', 'Carnival', 'Castle', 'Cathedral', 'Cellar',
  'Chapel', 'Child', 'Circus', 'City', 'Cliff', 'Coast', 'Corner', 'Country', 'Courtyard', 'Cousin', 'Crown', 'Daughter', 'Delta', 'Desert', 'Diary', 'District', 'Dock', 'Door', 'Dream', 'Drift',
  'Dune', 'Echo', 'Embassy', 'Estate', 'Evening', 'Exile', 'Factory', 'Farm', 'Father', 'Ferry', 'Fever', 'Fire', 'Flood', 'Fountain', 'Friend', 'Game', 'Gate', 'Glacier', 'Guest', 'Hall',
  'Heir', 'Highway', 'Hill', 'Hotel', 'Hunter', 'Inheritance', 'Inn', 'Journey', 'Keeper', 'Lake', 'Letter', 'Library', 'Lighthouse', 'Line', 'Marsh', 'Meadow', 'Mirror', 'Mother', 'Museum',
  'Neighbor', 'Night', 'Ocean', 'Office', 'Pass', 'Passenger', 'Path', 'Pilgrim', 'Planet', 'Port', 'Prairie', 'Prince', 'Quarry', 'Railway', 'Ranch', 'Reef', 'Refuge', 'Ridge', 'Road', 'Rooftop',
  'Ruin', 'Saint', 'School', 'Shore', 'Sister', 'Sky', 'Song', 'Son', 'Station', 'Storm', 'Stranger', 'Street', 'Suburb', 'Swimmer', 'Tailor', 'Teacher', 'Temple', 'Tenant', 'Territory', 'Theater',
  'Thief', 'Tower', 'Town', 'Trail', 'Train', 'Traveler', 'Tunnel', 'Valley', 'Village', 'Visitor', 'Wall', 'Wanderer', 'Well', 'Widow', 'Window', 'Wind', 'Winner', 'Wolf', 'Year', 'Yard',
  'Painter', 'Dancer', 'Singer', 'Sailor', 'Soldier', 'Miner', 'Farmer', 'Doctor', 'Driver', 'Judge', 'Pilot', 'Priest', 'Queen', 'Twins', 'Orphan', 'Bride', 'Groom', 'Messenger', 'Diver', 'Runner'];
const ABSTRACT = ['Salt', 'Glass', 'Lanterns', 'Ash', 'Rain', 'Smoke', 'Silence', 'Paper', 'Iron', 'Snow', 'Dust', 'Bread', 'Gold', 'Honey', 'Ice', 'Ink', 'Lies', 'Light', 'Mercy', 'Mirrors',
  'Moths', 'Music', 'Names', 'Oranges', 'Pearls', 'Rust', 'Sand', 'Secrets', 'Shadows', 'Sparrows', 'Stars', 'Stones', 'Strangers', 'Thunder', 'Tides', 'Wolves', 'Wonder', 'Wool', 'Feathers', 'Flame',
  'Flowers', 'Fog', 'Ghosts', 'Grace', 'Hope', 'Hunger', 'Kings', 'Ladders', 'Lemons', 'Memory', 'Milk', 'Moons', 'Nails', 'Needles', 'Olives', 'Pepper', 'Promises', 'Questions', 'Ribbons',
  'Rivers', 'Roses', 'Saints', 'Seeds', 'Silk', 'Skin', 'Sleep', 'Sorrow', 'Spring', 'Steel', 'Storms', 'Sugar', 'August', 'Teeth', 'Thieves', 'Tin', 'Trains', 'Velvet', 'Water', 'Wheat', 'Whispers',
  'Winter', 'Wishes', 'Witches', 'Wine', 'Youth', 'Clouds', 'Copper', 'Crows', 'Daughters', 'Distance', 'Echoes', 'Embers', 'Fathers', 'Fortune', 'Glory', 'Heaven', 'Islands', 'Justice', 'Lilies', 'Mothers',
  'Almonds', 'Amber', 'Apples', 'Arrows', 'Autumn', 'Bones', 'Brass', 'Candles', 'Chalk', 'Cinnamon', 'Coal', 'Coins', 'Coral', 'Cotton', 'Daggers', 'Dawn', 'Debts', 'Desire', 'Dusk', 'Fables',
  'Figs', 'Flint', 'Frost', 'Gardens', 'Granite', 'Harvests', 'Horses', 'Hymns', 'Jasmine', 'Lace', 'Linen', 'Marrow', 'Midnight', 'Mint', 'Mist', 'Oaths', 'Oceans', 'Orchids', 'Plums', 'Prayers',
  'Quartz', 'Rumors', 'Saffron', 'Scars', 'Shells', 'Slate', 'Thorns', 'Twilight', 'Vows', 'Willows'];
const FIRST = ['Iris', 'Teo', 'Marisol', 'Kwame', 'Ana', 'Lars', 'Mina', 'Rafi', 'Odile', 'Sung-min', 'Leila', 'Joaquín', 'Ngozi', 'Yuki', 'Farid', 'Elsa', 'Dara', 'Ines', 'Malik', 'Priya', 'Aiko',
  'Amadou', 'Anneke', 'Aurelio', 'Beatriz', 'Bilal', 'Bjørn', 'Camille', 'Chiara', 'Chidi', 'Clemens', 'Dalia', 'Dmitri', 'Elif', 'Emeka', 'Esther', 'Fatima', 'Federico', 'Freya', 'Gabriel', 'Hana',
  'Hamid', 'Helga', 'Hugo', 'Ilse', 'Imani', 'Ivan', 'Jae-won', 'Jana', 'Javier', 'Jonas', 'Kaito', 'Karin', 'Kemal', 'Kenji', 'Lena', 'Leon', 'Lucía', 'Luka', 'Mads', 'Mai', 'Manon', 'Marek',
  'Marta', 'Mateo', 'Mei', 'Milos', 'Nadia', 'Naveen', 'Nico', 'Nils', 'Noor', 'Oksana', 'Olu', 'Omar', 'Paola', 'Pavel', 'Pedro', 'Ravi', 'Rhea', 'Rosa', 'Sabine', 'Sami', 'Sanjay', 'Sara', 'Selin',
  'Seo-yeon', 'Simone', 'Sofía', 'Soren', 'Tamar', 'Tariq', 'Thandi', 'Tomasz', 'Uma', 'Valeria', 'Vikram', 'Wanjiru', 'Xavier', 'Yara', 'Yusuf', 'Zainab', 'Zofia', 'Ahmed', 'Alba', 'Anders',
  'Aryan', 'Ayesha', 'Bruno', 'Carmen', 'Cyrus', 'Daniel', 'Diego', 'Dina', 'Eitan', 'Emma', 'Femi', 'Gael', 'Greta', 'Hyun-woo', 'Ingrid', 'Isabel', 'Jamal', 'Joon', 'Kalinda', 'Kirra', 'Lior',
  'Lotte', 'Magnus', 'Maren', 'Matías', 'Mehmet', 'Mira', 'Nasrin', 'Nikolai', 'Ola', 'Otto', 'Ramón', 'Rania', 'Rui', 'Saoirse', 'Shira', 'Siddharth', 'Tove', 'Vera', 'Wei', 'Yasmin', 'Zara'];
const LAST = ['Varga', 'Mbeki', 'Holt', 'Ruiz', 'Okoro', 'Aalto', 'Brandt', 'Sato', 'Navarro', 'Achterberg', 'Kader', 'Lindqvist', 'Moreau', 'Osei', 'Petrova', 'Tanaka', 'Quist', 'Delacroix', 'Haddad',
  'Ferreira', 'Abara', 'Adeyemi', 'Agarwal', 'Alvarez', 'Amsel', 'Andersen', 'Arslan', 'Bakker', 'Banerjee', 'Barros', 'Bauer', 'Bello', 'Bergström', 'Bianchi', 'Bondarenko', 'Borg', 'Castillo',
  'Chen', 'Cho', 'Costa', 'Dahl', 'Dimitrov', 'Doumbia', 'Duarte', 'Eriksen', 'Esposito', 'Fischer', 'Fonseca', 'Fujita', 'Galli', 'García', 'Gomes', 'Grant', 'Guerra', 'Gupta', 'Halvorsen', 'Hamid',
  'Hansen', 'Herrera', 'Horvat', 'Hosseini', 'Ibrahim', 'Ito', 'Iyer', 'Jansen', 'Jovanović', 'Kamau', 'Kang', 'Kaur', 'Keller', 'Khan', 'Kim', 'Koch', 'Kovács', 'Kowalski', 'Kruger', 'Kumar',
  'Lambert', 'Larsen', 'Lee', 'Lehmann', 'Lima', 'Lombardi', 'Lopez', 'Lund', 'Maddox', 'Marino', 'Martins', 'Mehta', 'Mendes', 'Meyer', 'Mishra', 'Molina', 'Morales', 'Mori', 'Moretti', 'Murphy',
  'Nakamura', 'Ndlovu', 'Nguyen', 'Nielsen', 'Novak', 'Nowak', 'Nunes', 'Obi', 'Oliveira', 'Olsen', 'Ortiz', 'Owusu', 'Park', 'Pereira', 'Petersen', 'Pinto', 'Popescu', 'Quinn', 'Rahman', 'Ramos',
  'Rao', 'Reyes', 'Ricci', 'Rossi', 'Rojas', 'Russo', 'Saito', 'Salazar', 'Santos', 'Schmidt', 'Schneider', 'Shah', 'Silva', 'Singh', 'Sokolov', 'Soto', 'Suzuki', 'Szabó', 'Takahashi', 'Torres',
  'Tran', 'Turner', 'Vargas', 'Vasquez', 'Vogel', 'Volkov', 'Wagner', 'Walsh', 'Wang', 'Weber', 'Wong', 'Yamamoto', 'Yilmaz', 'Yoon', 'Zhang', 'Ziegler', 'Zubiri', 'Achebe', 'Aguilar', 'Albescu',
  'Aziz', 'Barzani', 'Becker', 'Bhatt', 'Brenner', 'Caruso', 'Castro', 'Danjuma', 'Delgado', 'Ekström', 'Falk', 'Faro', 'Gallo', 'Haas', 'Hale', 'Ishikawa', 'Jaramillo', 'Kariuki', 'Kaya', 'Lind',
  'Mansour', 'Mazur', 'Mensah', 'Nair', 'Okafor', 'Pham', 'Rasku', 'Sandoval', 'Sarr', 'Tadesse', 'Umar', 'Valdés', 'Wiśniewski', 'Zeller', 'Ahn', 'Bose', 'Dubois', 'Engel', 'Fontaine', 'Ghosh'];

// ---------------- titles ----------------

type Part = readonly string[];
// Each kind of title, with its parts. Every kind holds at least MIN_KIND titles; a slot's kind is its index modulo
// the number of kinds, so they come in turn.
const KINDS: { parts: Part[]; make: (w: string[]) => string }[] = [
  { parts: [ADJ, NOUN], make: ([a, n]) => `${a} ${n}` },
  { parts: [ADJ, NOUN], make: ([a, n]) => `The ${a} ${n}` },
  { parts: [NOUN, ABSTRACT], make: ([n, c]) => `${n} of ${c}` },
  { parts: [NOUN, ABSTRACT], make: ([n, c]) => `The ${n} of ${c}` },
  { parts: [FIRST, NOUN], make: ([f, n]) => `${f}'s ${n}` },
  { parts: [NOUN, ABSTRACT], make: ([n, c]) => `${n} and ${c}` },
];
const size = (k: (typeof KINDS)[number]) => k.parts.reduce((m, p) => m * p.length, 1);
const MIN_KIND = Math.min(...KINDS.map(size));
/** Slots each year holds: the season's slate, the extra works filling a thin category, committees' choices and studios'. */
export const TITLE_BLOCK = 1024;
export const SLOTS = { slate: 0, reserve: 200, committee: 800, studio: 864 } as const;
/** Seasons whose titles are all different from every other's: the title space, a year's block at a time. */
export const TITLE_YEARS = Math.floor((MIN_KIND * KINDS.length) / TITLE_BLOCK);
// Titles from 2020 (a season's slate is named for the year its films compete); people from 1986, so that everyone at
// work in 2026 has a debut in the pool.
const TITLE_FIRST_YEAR = 2020;
const PEOPLE_FIRST_YEAR = 1986;

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** An affine permutation of 0..n-1 for this seed and name: a·i + b mod n, with a coprime to n. */
function shuffle(seed: number, name: string, n: number): (i: number) => number {
  const r = stream(seed, 'world-cast', name);
  let a = 1 + Math.floor(r() * (n - 1));
  while (gcd(a, n) !== 1) a = (a % (n - 1)) + 1;
  const b = Math.floor(r() * n);
  return (i) => (a * (i % n) + b) % n;
}
const perms = new Map<string, (i: number) => number>();
const permOf = (seed: number, name: string, n: number) => {
  const key = `${seed}|${name}|${n}`;
  let p = perms.get(key);
  if (!p) { if (perms.size > 200) perms.clear(); p = shuffle(seed, name, n); perms.set(key, p); }
  return p;
};

/** The title in slot `slot` of `year`, in this save's world. Two different (year, slot) pairs never share a title within TITLE_YEARS. */
export function worldTitle(seed: number, year: number, slot: number): string {
  const g = (year - TITLE_FIRST_YEAR) * TITLE_BLOCK + (slot % TITLE_BLOCK);
  const kind = KINDS[((g % KINDS.length) + KINDS.length) % KINDS.length];
  const k = Math.floor(g / KINDS.length);
  let i = permOf(seed, `title:${KINDS.indexOf(kind)}`, MIN_KIND)(k);
  // Mixed radix over the kind's parts (only the first MIN_KIND of a larger kind are used, so every kind turns alike).
  const words = kind.parts.map((p) => { const w = p[i % p.length]; i = Math.floor(i / p.length); return w; });
  return kind.make(words);
}

/** A slot from a key, in the part of the year's block from `from` to `to`: for works whose count isn't known ahead. */
export function slotOf(key: string, from: number, to: number): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0;
  return from + (h % (to - from));
}

// ---------------- people ----------------

export type Craft = 'director' | 'writer' | 'performer';
export interface WorldPerson {
  /** For good: the same person in every season they work. */
  id: string;
  name: string;
  craft: Craft;
  debut: number;
  /** The last year they work. */
  last: number;
  /** Skill in a year of their career (25-96), rising from the debut to a peak and fading after. */
  skillIn: (year: number) => number;
}
/** People debuting each year. */
export const COHORT = 60;
const NAMES = FIRST.length * LAST.length;
/** Cohorts whose names are all different: the name space, a cohort at a time. */
export const NAME_YEARS = Math.floor(NAMES / COHORT);

const cohorts = new Map<string, WorldPerson[]>();
/** The people who debut in `year`. */
export function cohort(seed: number, year: number): WorldPerson[] {
  const key = `${seed}|${year}`;
  const hit = cohorts.get(key);
  if (hit) return hit;
  const r = stream(seed, 'world-cast-cohort', year);
  const names = permOf(seed, 'names', NAMES);
  const out: WorldPerson[] = [];
  for (let j = 0; j < COHORT; j++) {
    const n = names((year - PEOPLE_FIRST_YEAR) * COHORT + j);
    const name = `${FIRST[n % FIRST.length]} ${LAST[Math.floor(n / FIRST.length)]}`;
    const craft: Craft = j % 3 === 0 ? 'director' : j % 3 === 1 ? 'writer' : 'performer';
    const length = intBetween(r, 6, 40);
    const base = Math.max(30, Math.min(88, gaussian(r, 60, 10)));
    const rise = gaussian(r, 9, 5); // how far they climb by their peak
    const peakAt = intBetween(r, 3, Math.max(4, Math.round(length * 0.6)));
    const skillIn = (y: number) => {
      const t = y - year;
      const curve = t <= peakAt ? rise * (t / peakAt) : rise - (rise + 6) * ((t - peakAt) / Math.max(1, length - peakAt)) ** 2;
      return Math.max(25, Math.min(96, base + curve));
    };
    out.push({ id: `wp-${year}-${j}`, name, craft, debut: year, last: year + length, skillIn });
  }
  if (cohorts.size > 400) cohorts.clear();
  cohorts.set(key, out);
  return out;
}

/** Everyone of a craft at work in `year`: debuted by then, not yet finished. */
export function working(seed: number, year: number, craft: Craft): WorldPerson[] {
  const out: WorldPerson[] = [];
  for (let y = Math.max(PEOPLE_FIRST_YEAR, year - 40); y <= year; y++) for (const p of cohort(seed, y)) if (p.craft === craft && p.last >= year) out.push(p);
  return out;
}
