// Roles and the simulated industry population. Day rates are SIMULATION ASSUMPTIONS used for
// calibration (docs/ASSUMPTIONS.md), not quoted real-world wages. NPC capability is a modeled
// value that lets hiring choices differ; the player has no attribute or skill numbers.

import { HERITAGES } from '../data/identity';
import { COUNTRY_LANGUAGES } from '../data/country-languages';
import { getPlace } from '../data/places';
import { splitBackgrounds } from './identity';
import { countryName } from '../world/gazetteer/gazetteer';
import { gaussian, intBetween, pick, stream } from './rng';
import { addDaysToKey, ageOn, dateKey, dayNumber } from './time';
import type { GameState, Project } from './types';

export interface RoleDef {
  id: string;
  label: string;
  dept: string;
  rate: number;
  cast?: boolean;
}

const R = (id: string, label: string, dept: string, rate: number, cast = false): RoleDef => ({ id, label, dept, rate, cast });

export const ROLES: RoleDef[] = [
  R('co-writer', 'Co-Writer', 'Writing', 400), R('script-editor', 'Script Editor', 'Writing', 350), R('episode-writer', 'Episode Writer', 'Writing', 500),
  R('line-producer', 'Line Producer', 'Producing', 550), R('production-manager', 'Production Manager', 'Producing', 450),
  R('production-coordinator', 'Production Coordinator', 'Producing', 300),
  R('story-producer', 'Story Producer', 'Producing', 450),
  R('first-ad', 'First Assistant Director', 'Direction', 550), R('script-supervisor', 'Script Supervisor', 'Direction', 400),
  R('episode-director', 'Episode Director', 'Direction', 900), R('video-assist', 'Video Assist Operator', 'Direction', 320),
  R('casting-director', 'Casting Director', 'Casting And Performance', 500), R('actor', 'Performer', 'Casting And Performance', 700, true),
  R('voice-actor', 'Voice Performer', 'Casting And Performance', 600, true), R('background', 'Background Performer', 'Casting And Performance', 180, true),
  R('dialect-coach', 'Dialect And Language Coach', 'Casting And Performance', 400), R('choreographer', 'Choreographer', 'Casting And Performance', 500),
  R('stunt-coordinator', 'Stunt Coordinator', 'Safety And Specialists', 650), R('fight-choreographer', 'Fight Choreographer', 'Safety And Specialists', 550),
  R('intimacy-coordinator', 'Intimacy Coordinator', 'Safety And Specialists', 500), R('animal-wrangler', 'Animal Wrangler', 'Safety And Specialists', 450),
  R('vehicle-coordinator', 'Picture Vehicle Coordinator', 'Safety And Specialists', 450), R('marine-coordinator', 'Marine And Water Safety Coordinator', 'Safety And Specialists', 600),
  R('extras-casting', 'Background Casting Coordinator', 'Safety And Specialists', 350),
  R('dop', 'Director Of Photography', 'Camera', 800), R('camera-operator', 'Camera Operator', 'Camera', 500), R('camera-assistant', 'Camera Assistant', 'Camera', 350),
  R('gaffer', 'Gaffer', 'Lighting And Grip', 500), R('key-grip', 'Key Grip', 'Lighting And Grip', 450),
  R('sound-mixer', 'Production Sound Mixer', 'Sound', 550), R('boom-operator', 'Boom Operator', 'Sound', 350),
  R('location-manager', 'Location Manager', 'Locations', 450),
  R('production-designer', 'Production Designer', 'Art', 700), R('art-director', 'Art Director', 'Art', 500), R('set-builder', 'Set Builder', 'Art', 350),
  R('prop-master', 'Prop Master', 'Art', 400),
  R('costume-designer', 'Costume Designer', 'Costume And Makeup', 550), R('hair-makeup', 'Hair And Makeup Artist', 'Costume And Makeup', 400),
  R('prosthetics', 'Prosthetics And Creature Designer', 'Creature And Effects', 650),
  R('visdev-artist', 'Visual Development Artist', 'Animation', 450), R('storyboard-artist', 'Storyboard Artist', 'Animation', 450),
  R('character-designer', 'Character Designer', 'Animation', 450), R('background-artist', 'Background Artist', 'Animation', 400),
  R('modeler', 'Modeler', 'Animation', 500), R('rigger', 'Rigger', 'Animation', 550), R('layout-artist', 'Layout Artist', 'Animation', 450),
  R('animator', 'Animator', 'Animation', 500), R('assistant-animator', 'Assistant Animator', 'Animation', 350), R('fx-artist', 'Effects Artist', 'Animation', 550),
  R('lighting-artist', 'Lighting Artist', 'Animation', 500), R('compositor', 'Compositor', 'Animation', 450),
  R('puppet-fabricator', 'Puppet Fabricator', 'Stop Motion', 450), R('armature-fabricator', 'Armature Fabricator', 'Stop Motion', 500),
  R('miniature-builder', 'Miniature Set Builder', 'Stop Motion', 400), R('stopmo-animator', 'Stop-Motion Animator', 'Stop Motion', 500),
  R('stage-dp', 'Stage Camera And Lighting', 'Stop Motion', 550),
  R('editor', 'Editor', 'Post Production', 600), R('assistant-editor', 'Assistant Editor', 'Post Production', 300),
  R('sound-designer', 'Sound Designer', 'Post Production', 550), R('re-recording-mixer', 'Re-Recording Mixer', 'Post Production', 650),
  R('vfx-artist', 'Visual Effects Artist', 'Post Production', 550), R('colorist', 'Colorist', 'Post Production', 650),
  R('subtitler', 'Subtitler And Captioner', 'Post Production', 300), R('qc-technician', 'Delivery Quality Control', 'Post Production', 400),
  R('composer', 'Composer', 'Music', 600), R('music-supervisor', 'Music Supervisor', 'Music', 450),
  R('songwriter', 'Songwriter', 'Music', 500), R('lyricist', 'Lyricist', 'Music', 400), R('music-producer', 'Music Producer', 'Music', 500),
  R('researcher', 'Researcher', 'Documentary', 350), R('archive-producer', 'Archive Producer', 'Documentary', 450), R('fact-checker', 'Fact Checker', 'Documentary', 350),
];

const roleById = new Map(ROLES.map((r) => [r.id, r]));

/**
 * Compatible roles one person may combine at small scale (DESIGN section 9). One person still works
 * only one task a day, so combining saves money but not time. A working default, not an industry rule.
 */
export const COMBINES: Record<string, string[]> = {
  editor: ['colorist', 'subtitler', 'qc-technician', 'assistant-editor'],
  'sound-designer': ['re-recording-mixer'],
  dop: ['camera-operator', 'gaffer', 'stage-dp'],
  'production-designer': ['prop-master', 'art-director', 'set-builder', 'location-manager'],
  'costume-designer': ['hair-makeup'],
  composer: ['music-supervisor'],
  'first-ad': ['production-coordinator', 'script-supervisor'],
  researcher: ['fact-checker', 'archive-producer'],
  'character-designer': ['visdev-artist'],
  'visdev-artist': ['character-designer', 'background-artist'],
  'storyboard-artist': ['layout-artist'],
  animator: ['assistant-animator'],
  modeler: ['rigger'],
  'lighting-artist': ['compositor', 'fx-artist'],
  'puppet-fabricator': ['armature-fabricator'],
};

/** Does someone hired as \`hiredRole\` cover \`neededRole\`? */
export function covers(hiredRole: string, neededRole: string): boolean {
  return hiredRole === neededRole || (COMBINES[hiredRole]?.includes(neededRole) ?? false);
}
export function role(id: string): RoleDef {
  const r = roleById.get(id);
  if (!r) throw new Error(`Unknown role ${id}`);
  return r;
}
export function roleLabel(id: string): string {
  if (id === 'director') return 'Director';
  if (id === 'producer') return 'Producer';
  if (id === 'writer') return 'Screenwriter';
  return roleById.get(id)?.label ?? id;
}

export const EXPERIENCE = ['New To The Role', 'Developing', 'Experienced', 'Seasoned', 'Leading'];

export type Skill = 'singing' | 'dance' | 'stunts' | 'voice' | 'motion-capture' | 'puppetry' | 'stage-combat' | 'horse-riding';

export interface Person {
  id: string;
  name: string;
  pronouns: 'he' | 'she' | 'they';
  roleId: string;
  experience: number; // 1..5
  capability: number; // modeled 0..100
  dayRate: number; // asking rate
  languages: string[];
  homeCountry: string;
  /** Their ethnicities (labels): casting shows which a character's share, as information; never scored. */
  heritages: string[];
  /** Their nationalities (country codes): from a nationality word drawn with their background, else where they're based. */
  nationalities: string[];
  /**
   * The ages a performer played when your story began. They move with the performer's own age: see playingAgeAt, which
   * is what the game reads. Until November 10, 2026 this range never changed, so a performer cast at 25 to 35 in your
   * first year was still 25 to 35 twenty years on.
   */
  playingAge?: [number, number];
  /** Their date of birth (YYYY-MM-DD). Their age turns on their birthday, by the same rule as yours (time.ts). */
  born: string;
  skills: Skill[];
  samples: string;
  busy: { from: string; to: string }[];
}

const GIVEN = [
  'Amara', 'Bilal', 'Camila', 'Dmitri', 'Esi', 'Farah', 'Gustavo', 'Hana', 'Ifeoma', 'Jae-won', 'Kofi', 'Leila', 'Mateo', 'Nadia', 'Oren', 'Priya',
  'Quinn', 'Rafael', 'Sakura', 'Tomás', 'Uma', 'Viktor', 'Wanjiru', 'Xiomara', 'Yusuf', 'Zainab', 'Aiko', 'Bruno', 'Chiara', 'Dev', 'Elif',
  'Felix', 'Grace', 'Hugo', 'Imani', 'Jonas', 'Kavya', 'Lucas', 'Mei', 'Nikolai', 'Olumide', 'Paloma', 'Rania', 'Soren', 'Tariq', 'Valentina',
  'Wei', 'Ximena', 'Yara', 'Zeynep', 'Anouk', 'Benedikt', 'Chloé', 'Darius', 'Emeka', 'Freya', 'Gabriel', 'Hamid', 'Ingrid', 'Jasmine', 'Kenji',
  'Lorenzo', 'Maya', 'Noa', 'Omar', 'Pilar', 'Rohan', 'Sione', 'Thandiwe', 'Ulla', 'Vikram', 'Willa', 'Yohannes', 'Zara', 'Alejandro', 'Beatriz',
];
const FAMILY = [
  'Adeyemi', 'Bergström', 'Castillo', 'Dubois', 'Evans', 'Fernandes', 'Gallagher', 'Haddad', 'Ibrahim', 'Jensen', 'Kim', 'Laurent', 'Mensah',
  'Nakamura', 'Okafor', "O'Neill", 'Petrov', 'Quispe', 'Rossi', 'Santos', 'Tanaka', 'Usman', 'Varga', 'Wójcik', 'Xu', 'Yilmaz', 'Zhang', 'Abara',
  'Brennan', 'Cohen', 'Dlamini', 'Eriksen', 'Fitzgerald', 'García', 'Hosseini', 'Iyer', 'Jovanović', 'Kowalski', 'Lindqvist', 'Moreau',
  'Ndlovu', 'Okonkwo', 'Park', 'Reyes', 'Schmidt', 'Tran', 'Ueda', 'Van Dijk', 'Walker', 'Yamamoto', 'Achebe', 'Bianchi', 'Chowdhury',
];

const LANG_BY_COUNTRY: Record<string, string> = {
  US: 'en', CA: 'en', GB: 'en', IE: 'en', AU: 'en', NZ: 'en', NG: 'en', KE: 'sw', ZA: 'en', IN: 'hi', FR: 'fr', MC: 'fr', BF: 'fr', DE: 'de', CH: 'it',
  ES: 'es', MX: 'es', AR: 'es', BR: 'pt', IT: 'it', NL: 'nl', CZ: 'cs', SE: 'sv', NO: 'no', DK: 'da', TR: 'tr', EG: 'ar', MA: 'ar', AE: 'ar', SA: 'ar',
  JP: 'ja', KR: 'ko', CN: 'zh',
};

/**
 * Backgrounds common among performers based in a country, for the modeled casting pool; a quarter of people are drawn
 * from every background instead, as anywhere's population is. Modeled, not census figures.
 */
const COUNTRY_HERITAGES: Record<string, string[]> = {
  US: ['American', 'African American', 'Mexican', 'Puerto Rican', 'Irish', 'Italian', 'Chinese', 'Filipino', 'Korean', 'Indian', 'Ashkenazi Jewish', 'Vietnamese', 'Haitian', 'Cherokee', 'Navajo (Diné)'],
  CA: ['Canadian', 'French Canadian', 'First Nations', 'Métis', 'Inuit', 'Chinese', 'Indian', 'Punjabi', 'Filipino', 'Jamaican', 'Italian', 'Scottish', 'Irish'],
  GB: ['English', 'Scottish', 'Welsh', 'Irish', 'Indian', 'Pakistani', 'Bangladeshi', 'Jamaican', 'Nigerian', 'Ghanaian', 'Polish', 'Chinese', 'Somali'],
  IE: ['Irish', 'Polish', 'Nigerian', 'British'], AU: ['Australian', 'Aboriginal Australian', 'English', 'Chinese', 'Indian', 'Vietnamese', 'Greek', 'Italian', 'Filipino', 'Lebanese', 'Samoan'],
  NZ: ['New Zealander', 'Māori', 'Samoan', 'Tongan', 'Chinese', 'Indian', 'Fijian'], NG: ['Yoruba', 'Igbo', 'Hausa', 'Fulani', 'Nigerian'],
  KE: ['Kikuyu', 'Luo', 'Kenyan', 'Swahili', 'Somali', 'Indian'], ZA: ['Zulu', 'Xhosa', 'South African', 'Indian', 'English'],
  IN: ['Indian', 'Punjabi', 'Gujarati', 'Tamil', 'Telugu', 'Malayali', 'Bengali', 'Sikh'],
  FR: ['French', 'Algerian', 'Moroccan', 'Tunisian', 'Senegalese', 'Vietnamese', 'Portuguese', 'Amazigh'], MC: ['French', 'Italian'], BF: ['Fulani', 'French'],
  DE: ['German', 'Turkish', 'Kurdish', 'Polish', 'Russian', 'Syrian', 'Italian', 'Greek'], CH: ['Swiss', 'Italian', 'German', 'French', 'Portuguese', 'Albanian'],
  ES: ['Spanish', 'Catalan', 'Basque', 'Moroccan', 'Romani', 'Colombian', 'Ecuadorian'], MX: ['Mexican', 'Mestizo', 'Indigenous Mexican', 'Maya'],
  AR: ['Argentine', 'Italian', 'Spanish', 'Mapuche'], BR: ['Brazilian', 'Afro-Brazilian', 'Portuguese', 'Japanese', 'Italian'],
  IT: ['Italian', 'Romanian', 'Albanian', 'Moroccan', 'Chinese'], NL: ['Dutch', 'Moroccan', 'Turkish', 'Indonesian'], CZ: ['Czech', 'Slovak', 'Romani', 'Ukrainian'],
  SE: ['Swedish', 'Finnish', 'Sámi', 'Iraqi', 'Syrian', 'Somali'], NO: ['Norwegian', 'Sámi', 'Polish', 'Pakistani', 'Somali'], DK: ['Danish', 'Turkish', 'Polish'],
  TR: ['Turkish', 'Kurdish', 'Armenian'], EG: ['Egyptian', 'Arab'], MA: ['Moroccan', 'Amazigh', 'Arab'], AE: ['Emirati', 'Indian', 'Pakistani', 'Filipino', 'Arab'],
  SA: ['Saudi', 'Arab', 'Yemeni'], JP: ['Japanese', 'Okinawan', 'Korean'], KR: ['Korean'], CN: ['Chinese', 'Han Chinese', 'Tibetan', 'Uyghur', 'Mongolian'],
};

export function countryLanguage(country: string): string {
  // Countries the pool had no entry for spoke English until November 8, 2026; now their own first language.
  return LANG_BY_COUNTRY[country] ?? COUNTRY_LANGUAGES[country]?.[0] ?? 'en';
}

const POOL_SIZE: Record<string, number> = { actor: 36, 'voice-actor': 14, background: 6, animator: 10, 'stopmo-animator': 8 };

/** Deterministic pool of candidates for a role, based in the production's country. */
export function candidates(state: GameState, roleId: string, baseCountry: string): Person[] {
  const n = POOL_SIZE[roleId] ?? 6;
  const out: Person[] = [];
  for (let i = 0; i < n; i++) out.push(person(state, roleId, baseCountry, i));
  return out;
}

const personCache = new Map<string, Person>();

export function personById(state: GameState, id: string): Person {
  const hit = personCache.get(`${state.seed}|${id}`);
  if (hit) return hit;
  const m = /^np_(.+)_([A-Z]{2})_(\d+)$/.exec(id);
  if (!m) throw new Error('Unknown person');
  return person(state, m[1], m[2], Number(m[3]));
}

function person(state: GameState, roleId: string, country: string, i: number): Person {
  const id = `np_${roleId}_${country}_${i}`;
  const cacheKey = `${state.seed}|${id}`;
  const hit = personCache.get(cacheKey);
  if (hit) return hit;
  const r = stream(state.seed, 'person', id);
  const def = role(roleId);
  const experience = Math.min(5, Math.max(1, Math.round(1 + r() * 4.4)));
  const capability = Math.round(Math.min(98, Math.max(30, 40 + experience * 9 + gaussian(r, 0, 8))));
  const rate = Math.round((def.rate * (0.62 + experience * 0.2) * (0.9 + r() * 0.2)) / 10) * 10;
  const pronouns = pick(r, ['he', 'she', 'they', 'he', 'she'] as const);
  const home = countryLanguage(country);
  const languages = Array.from(new Set([home, r() < 0.75 ? 'en' : home, r() < 0.2 ? pick(r, ['es', 'fr', 'de', 'ja', 'ko', 'zh', 'ar', 'hi', 'pt', 'yo', 'sw', 'it']) : home]));
  const skills: Skill[] = [];
  if (def.cast) {
    const all: Skill[] = ['singing', 'dance', 'stunts', 'voice', 'motion-capture', 'puppetry', 'stage-combat', 'horse-riding'];
    for (const s of all) if (r() < 0.22) skills.push(s);
    if (roleId === 'voice-actor' && !skills.includes('voice')) skills.push('voice');
  }
  const ageLow = def.cast ? intBetween(r, 8, 70) : undefined;
  const busy: { from: string; to: string }[] = [];
  const blocks = intBetween(r, 0, 3);
  for (let b = 0; b < blocks; b++) {
    // Within about two and a half years of the January your story began (a 2026 start reads as it always did).
    const from = addDaysToKey(`${new Date(state.startedAt).getUTCFullYear()}-01-01`, intBetween(r, 0, 900));
    busy.push({ from, to: addDaysToKey(from, intBetween(r, 10, 70)) });
  }
  const credits = Math.max(1, experience * 2 + intBetween(r, -1, 3));
  const samples = def.cast
    ? `${credits} screen ${credits === 1 ? 'role' : 'roles'} so far${skills.length ? `; trained in ${skills.map(skillLabel).join(', ').toLowerCase()}` : ''}.`
    : `${credits} ${credits === 1 ? 'production' : 'productions'} as ${def.label.toLowerCase()}.`;
  const p: Person = {
    id, name: `${pick(r, GIVEN)} ${pick(r, FAMILY)}`, pronouns, roleId, experience, capability, dayRate: rate, languages, homeCountry: country,
    heritages: [],
    nationalities: [],
    playingAge: ageLow !== undefined ? [ageLow, ageLow + intBetween(r, 6, 14)] : undefined, born: '', skills, samples, busy,
  };
  // Drawn after everything else, so adding backgrounds left every earlier field of every person as it was.
  const local = COUNTRY_HERITAGES[country];
  p.heritages.push(local && r() < 0.75 ? pick(r, local) : pick(r, HERITAGES));
  if (r() < 0.2) p.heritages = [...new Set([...p.heritages, pick(r, local ?? HERITAGES)])];
  // Ethnicity and nationality apart, as yours are (November 8, 2026), from the same draws: no person changed.
  const split = splitBackgrounds(p.heritages.map((h) => ({ id: h, label: h, custom: false })), country);
  p.heritages = split.heritages.map((h) => h.label);
  p.nationalities = split.nationalities;
  // A date of birth (November 10, 2026), drawn after everything else, so nobody's earlier fields changed. A performer's
  // age when your story began sits inside the range they played then, a little above its middle. Anyone else's follows
  // their experience: someone new to the role is in their twenties, someone leading in it in their late forties or older.
  const start = dateKey(state.startedAt, 'UTC');
  const ageThen = p.playingAge
    ? p.playingAge[0] + Math.round((p.playingAge[1] - p.playingAge[0]) * 0.6) // where playingAgeAt puts their age
    : Math.round(Math.min(72, Math.max(19, 18 + experience * 6 + gaussian(r, 0, 5))));
  const born = addDaysToKey(`${Number(start.slice(0, 4)) - ageThen}${start.slice(4)}`, -intBetween(r, 1, 365));
  p.born = born;
  personCache.set(cacheKey, p);
  return p;
}

const parts = (k: string) => ({ year: Number(k.slice(0, 4)), month: Number(k.slice(5, 7)), day: Number(k.slice(8, 10)) });
/** A person's age on a local date (YYYY-MM-DD), turning on their birthday. */
export function personAge(p: Person, on: string): number {
  return ageOn(parts(p.born), parts(on));
}

/**
 * The ages a performer plays on a date, following their own age:
 * - A child plays within two years of their age either way.
 * - An adult plays a range as wide as the one they had when your story began. It sits around their age as that one did:
 *   a little more of it below their age than above. For an adult that is exactly the range they had then, so nothing
 *   shown at the start moved.
 * - An adult doesn't play under 16. Moving the starting range by the years since had kept a child who grew up playing
 *   children.
 */
export function playingAgeAt(p: Person, on: string): [number, number] | undefined {
  if (!p.playingAge) return undefined;
  const age = personAge(p, on);
  if (age < 18) return [Math.max(1, age - 2), age + 2];
  const width = p.playingAge[1] - p.playingAge[0];
  const below = Math.round(width * 0.6);
  return [Math.max(16, age - below), age + width - below];
}

export function skillLabel(s: Skill): string {
  return { singing: 'Singing', dance: 'Dance', stunts: 'Stunts', voice: 'Voice Work', 'motion-capture': 'Motion Capture', puppetry: 'Puppetry', 'stage-combat': 'Stage Combat', 'horse-riding': 'Horse Riding' }[s];
}

export function projectCountry(placeId: string): string {
  return getPlace(placeId).country;
}

/** Is a person free for every date in [from, to] (inclusive), considering other productions? */
export function isAvailable(state: GameState, p: Person, from: string, to: string, ignoreProjectId?: string): { ok: boolean; reason?: string } {
  const a = dayNumber(from);
  const b = dayNumber(to);
  for (const blk of p.busy) {
    if (dayNumber(blk.from) <= b && dayNumber(blk.to) >= a) return { ok: false, reason: `${p.name} is booked on another production from ${blk.from} to ${blk.to}.` };
  }
  for (const blk of state.people[p.id]?.bookings ?? []) {
    if (blk.projectId === ignoreProjectId) continue;
    if (dayNumber(blk.from) <= b && dayNumber(blk.to) >= a) return { ok: false, reason: `${p.name} is already working on another of your projects then.` };
  }
  return { ok: true };
}

/**
 * The backgrounds a performer (you, or someone in the pool) shares with a character as written. Shown in casting as
 * information for the producer's choice; it never scores a performance (it added 6 until the review of November 7, 2026).
 */
export function sharedHeritages(state: GameState, p: Project, characterId: string, performer: 'player' | string): string[] {
  const part = p.characters.find((c) => c.id === characterId);
  const ethnicities = part?.heritages ?? [];
  const nationalities = part?.nationalities ?? [];
  if (!ethnicities.length && !nationalities.length) return [];
  // Ethnicity meets ethnicity and nationality meets nationality (November 8, 2026); a nationality reads as its country.
  const who = performer === 'player'
    ? { heritages: state.character.heritages.map((h) => h.label), nationalities: state.character.nationalities ?? [] }
    : personById(state, performer);
  return [...ethnicities.filter((h) => who.heritages.includes(h)), ...nationalities.filter((c) => who.nationalities.includes(c)).map(countryName)];
}
