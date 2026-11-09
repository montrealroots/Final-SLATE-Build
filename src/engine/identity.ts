// Who the player is, from 1221's Identity (November 8, 2026): a legal name in parts, the name people call them, and a
// citizenship the place of birth decides.
//
// The legal name (first, middle, last) is what credits carry, as `CharacterIdentity.name`, so every credit, award
// record and save made before keeps reading one field. What people call you is `preferredName`, or your first and last
// name when you leave it blank. The game says it back wherever it addresses you: Home's greeting, the rail, your
// Profile and the Saved Games list. Nothing else in the game addresses the player by name.
//
// Citizenship isn't asked: it's the country of your place of birth. A territory gives its sovereign state's citizenship
// (someone born in San Juan is a citizen of the United States), from 1221's table, which cites each territory's standing
// under the nationality law of the state it belongs to. With where you live, it makes your home countries, and a
// country's public screen fund supports its citizens and residents (finance.ts). Travel and work permits don't read it.

import { NATIONAL_LABEL, NATIONALITY_ONLY } from '../data/identity';
import { findPlace } from '../data/places';
import { COUNTRIES, countryName } from '../world/gazetteer/gazetteer';
import type { CharacterIdentity, CreationDraft, GameState, Heritage } from './types';

/** Territories whose people hold another country's citizenship, by the country that gives it (from 1221). */
export const TERRITORY_CITIZENSHIP: Readonly<Record<string, string>> = {
  // The United States.
  PR: 'US', GU: 'US', VI: 'US', MP: 'US', AS: 'US', UM: 'US',
  // France.
  RE: 'FR', GP: 'FR', MQ: 'FR', GF: 'FR', YT: 'FR', PF: 'FR', NC: 'FR', BL: 'FR', MF: 'FR', PM: 'FR', WF: 'FR', TF: 'FR',
  // The United Kingdom, its overseas territories and the Crown dependencies.
  AI: 'GB', BM: 'GB', IO: 'GB', VG: 'GB', KY: 'GB', FK: 'GB', GI: 'GB', MS: 'GB', PN: 'GB', SH: 'GB', GS: 'GB', TC: 'GB', GG: 'GB', JE: 'GB', IM: 'GB',
  // The Netherlands.
  AW: 'NL', CW: 'NL', SX: 'NL', BQ: 'NL',
  // Denmark, Finland and Norway.
  GL: 'DK', FO: 'DK', AX: 'FI', SJ: 'NO', BV: 'NO',
  // Australia and New Zealand.
  CX: 'AU', CC: 'AU', NF: 'AU', HM: 'AU', CK: 'NZ', NU: 'NZ', TK: 'NZ',
  // China.
  HK: 'CN', MO: 'CN',
};

/** The country someone born in this place is a citizen of, or undefined when the place is unknown. */
export function citizenshipFor(birthplaceId: string): string | undefined {
  const country = findPlace(birthplaceId)?.country;
  return country ? TERRITORY_CITIZENSHIP[country] ?? country : undefined;
}

export const citizenshipOf = (c: Pick<CharacterIdentity, 'birthplaceId'>): string | undefined => citizenshipFor(c.birthplaceId);

/** A headshot as ui/portrait.ts writes one: a JPEG data URL, at most 400 kB (a 512 by 640 photo is far smaller). */
export const PORTRAIT_MAX_CHARS = 400_000;
export function isPortrait(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('data:image/jpeg;base64,') && v.length <= PORTRAIT_MAX_CHARS && /^[A-Za-z0-9+/=]+$/.test(v.slice(23));
}

/** First, middle and last, as written: the legal name credits carry. */
export function legalName(n: Pick<CharacterIdentity, 'firstName' | 'lastName'> & Partial<Pick<CharacterIdentity, 'middleName'>>): string {
  return [n.firstName, n.middleName, n.lastName].map((x) => (x ?? '').trim()).filter(Boolean).join(' ');
}

/** A one-field name, from before names had parts: the first word is the first name, the rest the last. */
export function splitName(name: string): { firstName: string; lastName: string } {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: words[0] ?? '', lastName: words.slice(1).join(' ') };
}

/** The name people call you: the preferred name, or your first and last name. */
export function knownAs(c: Pick<CharacterIdentity, 'name' | 'firstName' | 'lastName' | 'preferredName'>): string {
  return c.preferredName?.trim() || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.name;
}

/** How a greeting addresses you: the preferred name, or your first name. */
export function addressedAs(c: Pick<CharacterIdentity, 'name' | 'firstName' | 'preferredName'>): string {
  return c.preferredName?.trim() || c.firstName || splitName(c.name).firstName || c.name;
}

/** The draft's name parts, taking a one-field name from an older draft or a fixture when the parts are empty. */
export function draftNames(d: Pick<CreationDraft, 'firstName' | 'middleName' | 'lastName' | 'name'>): { firstName: string; middleName: string; lastName: string } {
  if (!d.firstName?.trim() && !d.lastName?.trim() && d.name?.trim()) return { ...splitName(d.name), middleName: '' };
  return { firstName: d.firstName?.trim() ?? '', middleName: d.middleName?.trim() ?? '', lastName: d.lastName?.trim() ?? '' };
}

/** A country's name as it sits in a sentence: "the United Kingdom", "the Netherlands", "Kenya". */
export function countryInSentence(code: string): string {
  const name = countryName(code);
  if (name.startsWith('The ')) return `the ${name.slice(4)}`;
  const takesThe = /^(United |Democratic Republic|Republic of)|Republic$|Islands$|Emirates$/.test(name) || ['Bahamas', 'Comoros', 'Gambia', 'Maldives', 'Philippines', 'Seychelles'].includes(name);
  return takesThe ? `the ${name}` : name;
}

/** Your home countries: where you're a citizen, and where you live. A public fund supports both (finance.ts). */
export function homeCountries(state: GameState): { code: string; name: string; citizen: boolean; resident: boolean }[] {
  const citizen = citizenshipOf(state.character);
  const live = findPlace(state.character.livesIn)?.country;
  const resident = live ? TERRITORY_CITIZENSHIP[live] ?? live : undefined;
  const out: { code: string; name: string; citizen: boolean; resident: boolean }[] = [];
  for (const code of [citizen, resident]) {
    if (!code || out.some((x) => x.code === code)) continue;
    out.push({ code, name: countryName(code), citizen: code === citizen, resident: code === resident });
  }
  return out;
}

/**
 * v5 -> v6: a legal name in parts, a preferred name (none), where you live, and room for a headshot. The one-field name
 * is split as `splitName` does, so the legal name reads back exactly as before. Where you live wasn't recorded: it's
 * where you were before any trip under way, or where you are, which is right unless you had travelled and stayed.
 */
export function migrateV5toV6(raw: Record<string, unknown>): Record<string, unknown> {
  const c = { ...(raw.character as Record<string, unknown>) };
  if (typeof c.firstName !== 'string') Object.assign(c, splitName(typeof c.name === 'string' ? c.name : ''));
  if (typeof c.livesIn !== 'string') {
    const travel = raw.travel as { from?: unknown } | null | undefined;
    c.livesIn = travel && typeof travel.from === 'string' ? travel.from : raw.locationId;
  }
  return { ...raw, character: c };
}

// Ethnicity and nationality (November 8, 2026). Your ethnicities are `heritages`, as backgrounds were; your
// nationalities are countries. Both are asked, at least one of each. A nationality is where you and your family come
// from, which can differ from your citizenship (the country of your place of birth, above), and it changes no legal
// standing: it suggests holidays and languages and shows in casting, as the word for it did when it was a background.

/** Gazetteer entries that are no one's nationality: uninhabited, or no longer a country. */
const NO_NATIONALITY = new Set(['AQ', 'BV', 'HM', 'GS', 'TF', 'UM', 'IO', 'AN', 'CS']);

/** Every country or territory a nationality can be, by name. */
export const NATIONALITIES: readonly { code: string; name: string }[] = COUNTRIES.filter((c) => !NO_NATIONALITY.has(c.code)).map((c) => ({ code: c.code, name: c.name }));
export const isNationality = (code: unknown): code is string => typeof code === 'string' && NATIONALITIES.some((n) => n.code === code);

/** The words your ethnicities and nationalities stand for, for holidays, languages and casting (HERITAGES labels). */
export function backgroundLabels(heritages: readonly Heritage[], nationalities: readonly string[] | undefined): string[] {
  return [...new Set([...heritages.map((h) => h.label), ...(nationalities ?? []).map((c) => NATIONAL_LABEL[c]).filter(Boolean)])];
}

/**
 * One mixed list into the two: a chosen word that's only a nationality becomes its country; everything else stays an
 * ethnicity. With no nationality among them, the nationality is the citizenship, when it's known.
 */
export function splitBackgrounds(heritages: readonly Heritage[], citizenship: string | undefined): { heritages: Heritage[]; nationalities: string[] } {
  const byLabel = new Map<string, string>();
  for (const [code, label] of Object.entries(NATIONAL_LABEL)) if (!byLabel.has(label)) byLabel.set(label, code);
  const nationalities = new Set<string>();
  const kept: Heritage[] = [];
  for (const h of heritages) {
    const code = !h.custom && NATIONALITY_ONLY.has(h.label) ? byLabel.get(h.label) : undefined;
    if (code) nationalities.add(code); else kept.push(h);
  }
  if (!nationalities.size && citizenship && isNationality(citizenship)) nationalities.add(citizenship);
  return { heritages: kept, nationalities: [...nationalities] };
}

/** v6 -> v7: backgrounds asked as ethnicity and nationality (splitBackgrounds), with the citizenship the save's own place gives. */
export function migrateV6toV7(raw: Record<string, unknown>): Record<string, unknown> {
  const c = { ...(raw.character as Record<string, unknown>) };
  const birthplaceId = typeof c.birthplaceId === 'string' ? c.birthplaceId : '';
  const own = (raw.places as Record<string, { country?: string }> | undefined)?.[birthplaceId]?.country ?? findPlace(birthplaceId)?.country;
  const citizenship = own ? TERRITORY_CITIZENSHIP[own] ?? own : undefined;
  Object.assign(c, splitBackgrounds(Array.isArray(c.heritages) ? (c.heritages as Heritage[]) : [], citizenship));
  // Script characters were written with the one list too: their nationality words become countries (no fallback).
  const projects = Array.isArray(raw.projects) ? (raw.projects as Record<string, unknown>[]).map((p) => ({
    ...p,
    characters: Array.isArray(p.characters) ? (p.characters as Record<string, unknown>[]).map((ch) => {
      if (!Array.isArray(ch.heritages) || !ch.heritages.length) return ch;
      const split = splitBackgrounds((ch.heritages as string[]).map((h) => ({ id: h, label: h, custom: false })), undefined);
      return { ...ch, heritages: split.heritages.map((h) => h.label), ...(split.nationalities.length ? { nationalities: split.nationalities } : {}) };
    }) : p.characters,
  })) : raw.projects;
  return { ...raw, character: c, projects };
}
