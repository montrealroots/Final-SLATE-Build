// Where a place in the script is filmed (the Creative Depth package, milestone E, 04-WORLD-STUDIOS-AND-MEDIA.md "Places:
// where the story happens versus where it is filmed"). Until November 11, 2026 every scene was shot at the production's
// base: its weather, its holidays, its clock. Now each place in the script can be filmed in any real place in the world
// registry, at a kind of site the player chooses. The real place is a public geographic fact: its name, country,
// coordinates, climate and holidays. The site is not: it is a candidate the game makes up, of the kind chosen, and is
// always labelled so. No address, owner, fee, opening hours or permission of any real venue is stated or implied.
//
// What follows from the choice: the day's weather, daylight and public holidays are that place's; the call is on that
// place's clock, and the player has to be there; a unit away from its base is moved there once and housed each shooting
// day; the kind of site sets a permit lead time before the first day there, a share of the location fee, whether rain
// can stop the day, and how often noise spoils dialogue. Every figure is game calibration (docs/ASSUMPTIONS.md,
// "Filming Somewhere Else"), not a quote, a rate or legal guidance.
import { findPlace, getPlace, type Place } from '../data/places';
import { dayFees } from './production/rates';
import { stream } from './rng';
import { distanceKm } from './state';
import type { Project, Scene, ShootDay } from './types';

export type SiteKind = 'street' | 'neighbourhood' | 'coast' | 'forest' | 'mountain' | 'desert' | 'station' | 'port' | 'historic' | 'civic' | 'market' | 'soundstage' | 'backlot';

export interface SiteKindDef {
  label: string;
  /** What the candidate site is, in words that go after "a" or "an" in a sentence. */
  noun: string;
  /** The share of the budget size's location fee a day there costs. */
  fee: number;
  /** Working days of permits and arrangements before the first shoot day there. A modeled lead time, not a legal one. */
  permitDays: number;
  /** How often a day's dialogue there is spoiled by noise, from 0 to 1. */
  noise: number;
  /** Under a roof: rain and snow don't stop an exterior written there. */
  covered: boolean;
}

export const SITE_KINDS: Record<SiteKind, SiteKindDef> = {
  street: { label: 'A Street', noun: 'street', fee: 1, permitDays: 3, noise: 0.25, covered: false },
  neighbourhood: { label: 'A Neighbourhood', noun: 'residential neighbourhood', fee: 0.9, permitDays: 2, noise: 0.15, covered: false },
  coast: { label: 'A Coastline', noun: 'stretch of coast', fee: 0.7, permitDays: 2, noise: 0.3, covered: false },
  forest: { label: 'A Forest', noun: 'forest', fee: 0.6, permitDays: 2, noise: 0.05, covered: false },
  mountain: { label: 'A Mountain', noun: 'mountainside', fee: 0.6, permitDays: 3, noise: 0.1, covered: false },
  desert: { label: 'A Desert', noun: 'stretch of desert', fee: 0.6, permitDays: 3, noise: 0.05, covered: false },
  station: { label: 'A Rail Station', noun: 'rail station', fee: 1.4, permitDays: 6, noise: 0.4, covered: false },
  port: { label: 'A Port', noun: 'working port', fee: 1.3, permitDays: 6, noise: 0.4, covered: false },
  historic: { label: 'A Historic District', noun: 'historic district', fee: 1.3, permitDays: 5, noise: 0.2, covered: false },
  civic: { label: 'A Civic Space', noun: 'civic building', fee: 1.2, permitDays: 5, noise: 0.15, covered: false },
  market: { label: 'A Market', noun: 'market', fee: 1.1, permitDays: 4, noise: 0.45, covered: false },
  soundstage: { label: 'A Soundstage', noun: 'soundstage', fee: 1.6, permitDays: 1, noise: 0, covered: true },
  backlot: { label: 'A Backlot', noun: 'studio backlot', fee: 1.4, permitDays: 1, noise: 0.05, covered: false },
};

/** A place this far from the base, or further, is away: the unit is moved there and housed. */
export const AWAY_KM = 80;
/** Housing and feeding the unit for a shooting day away, as a share of the budget size's day fees (location and equipment). */
export const AWAY_DAY_SHARE = 0.6;
/** Moving the unit there and back, once for a place: half the equipment day fee, and as much again for each 1,000 km, up to four times it. */
export const MOVE_BASE = 0.5;
export const MOVE_PER_1000_KM = 1;
export const MOVE_CAP = 4;

export interface FilmedAt { placeId: string; kind: SiteKind }

/** Where a place in the script is filmed, when the player has chosen somewhere; nothing chosen means the base. */
export const filmedAt = (p: Project, label: string): FilmedAt | undefined => {
  const at = p.locationChoices?.[label]?.at;
  return at && findPlace(at.placeId) && SITE_KINDS[at.kind as SiteKind] ? (at as FilmedAt) : undefined;
};

const base = (p: Project): Place => getPlace(p.axes.basePlaceId);

/** The real place a script location is filmed in: the one chosen, or the production's base. */
export const filmPlace = (p: Project, label: string): Place => { const at = filmedAt(p, label); return at ? getPlace(at.placeId) : base(p); };

/** The real place a shoot day happens in. */
export const dayPlace = (p: Project, d: Pick<ShootDay, 'locationLabel'>): Place => filmPlace(p, d.locationLabel);

export const kmFromBase = (p: Project, label: string): number => Math.round(distanceKm(base(p), filmPlace(p, label)));
export const isAway = (p: Project, label: string): boolean => !!filmedAt(p, label) && kmFromBase(p, label) >= AWAY_KM;

/** The share of the location fee a day at this place costs, from the kind of site; 1 when nothing is chosen. */
export const kindFee = (p: Project, label: string): number => { const at = filmedAt(p, label); return at ? SITE_KINDS[at.kind].fee : 1; };

/** Housing the unit for a shooting day at this place: nothing at the base or near it. */
export function awayDayCost(p: Project, label: string): number {
  if (!isAway(p, label)) return 0;
  const f = dayFees(p);
  return Math.round((f.location + f.equipment) * AWAY_DAY_SHARE);
}

/** Moving the unit to this place and back, once: nothing at the base or near it. */
export function moveCost(p: Project, label: string): number {
  if (!isAway(p, label)) return 0;
  return Math.round(dayFees(p).equipment * Math.min(MOVE_CAP, MOVE_BASE + (kmFromBase(p, label) / 1000) * MOVE_PER_1000_KM));
}

/** What the days planned at each place away cost beyond their fees: the move, once for each place, and housing for each day. */
export function awayCosts(p: Project, days: Pick<ShootDay, 'locationLabel'>[]): { label: string; place: string; days: number; move: number; housing: number }[] {
  const by = new Map<string, number>();
  for (const d of days) if (isAway(p, d.locationLabel)) by.set(d.locationLabel, (by.get(d.locationLabel) ?? 0) + 1);
  return [...by].map(([label, n]) => ({ label, place: filmPlace(p, label).name, days: n, move: moveCost(p, label), housing: awayDayCost(p, label) * n }));
}

/** Whether rain or snow can stop an exterior written at this place: not under a soundstage's roof. */
export const underCover = (p: Project, label: string): boolean => { const at = filmedAt(p, label); return !!at && SITE_KINDS[at.kind].covered; };

/** Whether noise at the site spoiled the day's dialogue: decided from the world seed, the place and the date, by the kind of site. */
export function noisyDay(seed: number, p: Project, d: Pick<ShootDay, 'locationLabel' | 'date'>): boolean {
  const at = filmedAt(p, d.locationLabel);
  return !!at && stream(seed, 'site-noise', p.id, d.locationLabel, d.date)() < SITE_KINDS[at.kind].noise;
}

/** Permit and arrangement days before the first shoot day at each chosen place, by script location. */
export function permitWork(p: Project, scenes: Scene[]): { label: string; days: number; where: string }[] {
  const labels = [...new Set(scenes.map((s) => s.storyLocation || s.heading.place))];
  return labels.filter((l) => filmedAt(p, l)).map((l) => ({ label: l, days: SITE_KINDS[filmedAt(p, l)!.kind].permitDays, where: filmPlace(p, l).name }));
}

/**
 * The candidate site, in words. It is made up by the game and says so: the place is real, the site is not.
 */
export function candidateSite(p: Project, label: string): string | null {
  const at = filmedAt(p, label);
  if (!at) return null;
  const place = getPlace(at.placeId);
  const k = SITE_KINDS[at.kind];
  return `A ${k.noun} in ${place.name}, ${place.countryName}. ${place.name} is a real place; the site is a candidate the game made up, not a real venue, and its fee, permit time and noise are the game's figures.`;
}

/** What choosing this place and kind asks, for the page to say before anything is chosen. */
export function filmedAtPreview(p: Project, label: string, placeId: string, kind: SiteKind): { km: number; away: boolean; lines: string[] } {
  const place = getPlace(placeId);
  const km = Math.round(distanceKm(base(p), place));
  const away = km >= AWAY_KM;
  const k = SITE_KINDS[kind];
  const probe: Project = { ...p, locationChoices: { ...p.locationChoices, [label]: { ...p.locationChoices?.[label], at: { placeId, kind } } } };
  const lines = [
    `${km.toLocaleString('en-US')} km from ${base(p).name}. Each day there has ${place.name}'s weather, daylight and public holidays, and is called on ${place.name}'s clock.`,
    `A day at ${/^[aeiou]/i.test(k.noun) ? 'an' : 'a'} ${k.noun} costs ${Math.round(k.fee * 100)}% of the usual location fee.`,
    `${k.permitDays} working ${k.permitDays === 1 ? 'day' : 'days'} of permits and arrangements before the first day there.`,
    k.covered ? 'Under a roof: rain and snow do not stop the day.' : k.noise >= 0.3 ? 'Noisy: dialogue recorded there is often spoiled, and replaced in post unless a boom is on every dialogue scene.' : k.noise > 0 ? 'Fairly quiet: dialogue is sometimes spoiled by noise.' : 'Quiet.',
  ];
  if (away) lines.push(`Away from base: the unit is moved there and back once (${money(moveCost(probe, label))}) and housed each shooting day (${money(awayDayCost(probe, label))} a day). You have to be there for the call.`);
  else lines.push('Near enough to the base that nobody is moved or housed.');
  return { km, away, lines };
}

const money = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;

/** Why this script location can't be given a place to be filmed, or null. */
export function filmedAtRefusal(p: Project, label: string): string | null {
  if (p.delivered) return 'This project has been delivered.';
  if (p.schedule.days.some((d) => d.locationLabel === label && (d.status === 'shot' || d.status === 'partial'))) return `${label} has been shot already, so where it is filmed can't change.`;
  return null;
}

/** Choose where a script location is filmed, or go back to the base (null). The schedule is rebuilt by the player to follow it. */
export function setFilmedAt(p: Project, label: string, at: FilmedAt | null): void {
  const why = filmedAtRefusal(p, label);
  if (why) throw new Error(why);
  const rec = ((p.locationChoices ??= {})[label] ??= {});
  if (!at) { delete rec.at; return; }
  if (!findPlace(at.placeId)) throw new Error('That place is not in the world registry.');
  if (!SITE_KINDS[at.kind]) throw new Error('Choose a kind of site.');
  rec.at = { placeId: at.placeId, kind: at.kind };
}
