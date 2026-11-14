// Papers for working abroad (the owner's v8 package, 05 "Paperwork, travel and world"; 07 step 8; A16; from November 14,
// 2026). Where you may work is read from src/data/work-rights.json, the old line's table imported unchanged and labelled
// unverified: for each country, who may work there freely (its citizens, some passports by treaty or a shared market)
// and the route everyone else must apply for. A passport lets you travel; it doesn't let you work. A visit is not work.
//
// The consumer is the call (production/shoot.ts): on a day filmed in a country where you may not work, the day starts
// without you, as it does when you aren't there. A permit is applied for and decided; until it is granted, and after it
// expires, it lets you do nothing. What isn't researched is said, never filled: a route with no processing time takes the
// game's 30 days, and every permit lasts a year, both simulation choices. Fees are in their own currencies and aren't
// charged, because the game has no exchange rates.
import rights from '../data/work-rights.json';
import { addLog, newId, registerHandler, schedule } from './state';
import { DAY } from './time';
import { countryName } from '../world/gazetteer/gazetteer';
import { getPlace } from '../data/places';
import type { GameState } from './types';

interface Rule { right: 'free' | 'permit'; route?: string; days?: number }
interface CountryRules { groups?: string[]; passports: Record<string, Rule>; others: Rule }
const DATA = rights as unknown as { groups: Record<string, { passports: Record<string, Rule>; others?: Rule }>; countries: Record<string, CountryRules> };

export interface WorkPermit {
  id: string; country: string; route: string;
  status: 'pending' | 'granted' | 'refused';
  appliedAt: number; decideAt: number; grantedAt?: number; expiresAt?: number;
}
/** A route the record gives no processing time for: the game's own figure. */
export const PERMIT_DAYS_UNKNOWN = 30;
/** How long a granted permit lasts here: one year, a simulation choice (real permits run for a stated job or period). */
export const PERMIT_VALID_DAYS = 365;

export type WorkRight = { can: true; why: string } | { can: false; why: string; route: string | null; days: number | null };

/** Whether you may work in `country` now, and why: citizenship, a passport's treaty right, a permit, or what you'd need. */
export function workRight(state: GameState, country: string): WorkRight {
  const mine = state.character.nationalities ?? [];
  if (mine.includes(country)) return { can: true, why: `You are a citizen of ${countryName(country)}.` };
  // Where you live is where you may work: a simulation choice, said as one. Residence papers aren't modelled, and a
  // story begun somewhere is a life settled there.
  if (getPlace(state.character.livesIn ?? state.locationId).country === country) return { can: true, why: `You live in ${countryName(country)}: the game treats where you live as where you may work.` };
  const rules = DATA.countries[country];
  if (!rules) return { can: false, why: `The game has no record of who may work in ${countryName(country)}.`, route: null, days: null };
  for (const n of mine) {
    const own = rules.passports[n] ?? (rules.groups ?? []).map((g) => DATA.groups[g]?.passports[n]).find(Boolean);
    if (own?.right === 'free') return { can: true, why: `Your ${countryName(n)} passport lets you work in ${countryName(country)}.` };
  }
  const p = permits(state).find((x) => x.country === country && x.status === 'granted' && (x.expiresAt ?? 0) > state.now);
  if (p) return { can: true, why: `Your ${p.route} lets you work in ${countryName(country)} until it expires.` };
  const r = rules.others;
  if (r.right === 'free') return { can: true, why: `${countryName(country)} lets anyone work there.` };
  return { can: false, why: `To work in ${countryName(country)} you need a permit: ${r.route ?? 'its route isn\'t recorded'}. Visiting isn't working.`, route: r.route ?? null, days: r.days ?? null };
}

export const permits = (state: GameState): WorkPermit[] => state.permits ?? [];

/** Why you can't apply for a permit for `country` now, or null. */
export function permitRefusal(state: GameState, country: string): string | null {
  const w = workRight(state, country);
  if (w.can) return w.why;
  if (!w.route) return w.why;
  if (permits(state).some((x) => x.country === country && x.status === 'pending')) return 'Your application is being decided.';
  return null;
}

/** Apply for the permit `country` asks of you. It is decided after its processing time; until then it lets you do nothing. */
export function applyForPermit(state: GameState, country: string): WorkPermit {
  const no = permitRefusal(state, country);
  if (no) throw new Error(no);
  const w = workRight(state, country) as Extract<WorkRight, { can: false }>;
  const days = w.days ?? PERMIT_DAYS_UNKNOWN;
  const p: WorkPermit = { id: newId(state, 'wp'), country, route: w.route!, status: 'pending', appliedAt: state.now, decideAt: state.now + days * DAY };
  (state.permits ??= []).push(p);
  schedule(state, p.decideAt, 'permit-decision', { id: p.id }, { attention: 'notify', priority: 55, id: `permit-decision:${p.id}` });
  addLog(state, `You applied for a ${p.route} to work in ${countryName(country)}. It is decided in about ${days} days${w.days ? '' : ' (the game\'s figure: the route\'s time isn\'t recorded)'}.`, 'project', { route: { view: 'profile' } });
  return p;
}

registerHandler('permit-decision', (state, ev) => {
  const p = permits(state).find((x) => x.id === ev.payload.id);
  if (!p || p.status !== 'pending') return { suppressInterrupt: true };
  // Granted: the game models no grounds for refusal yet, and says so rather than inventing a chance of one.
  p.status = 'granted';
  p.grantedAt = state.now;
  p.expiresAt = state.now + PERMIT_VALID_DAYS * DAY;
  const message = `Your ${p.route} was granted: you may work in ${countryName(p.country)} for a year.`;
  addLog(state, message, 'project', { route: { view: 'profile' } });
  return { message };
});
