// Your papers (from November 14, 2026; the owner's command, 4 "Papers"). Five things are kept apart, as the command asks:
// - a passport, and whether it is in force (1221's documents in the bank world: engine/bankworld/systems/documents.ts);
// - permission to enter a country, and how long a visit may last (SLATE-REBUILD's visits records, src/data/papers);
// - permission to stay longer (a residence document in the bank world; none is applied for here);
// - permission to work (SLATE-REBUILD's work records: free movement, a short engagement's days, or a permit's route);
// - permission for the work itself. The work records are what a performer needs. Acting is covered; directing and
//   producing are not, and need a right to work generally (citizenship, free movement or where you live).
//
// An application runs eligibility → the documents it needs → applying → the fee paid from your bank → the review → the
// decision → the document issued → its use → its expiry. Visitor visas and work permits can be applied for everywhere
// (from the owner's command of November 14, 2026, "make them absolutely possible", choosing research, then estimate):
// each route's fee and decision time are researched where papers-terms.ts has them (1221's visa pairs, terms.json), and
// otherwise the game's estimate from the researched routes, which the screen calls an estimate.
//
// Until November 14, 2026 (the owner's v8 package, 05) a work permit could be applied for anywhere, decided after 30 days
// where its time wasn't recorded and lasting a year: both figures the game's own and said as nothing. Earlier that same
// day they went, and nothing was taken where a figure was missing. A permit a save already holds is kept until its date.
import visitsData from '../data/papers/visits.json';
import workData from '../data/papers/work.json';
import citizenshipData from '../data/papers/citizenship.json';
import { addLog, newId, registerHandler, schedule } from './state';
import { DAY, dateKey } from './time';
import { countryName } from '../world/gazetteer/gazetteer';
import { getPlace } from '../data/places';
import { bankSim } from './bankworld';
import { documentsOf, inForce, theCountry, type PersonDocument } from './bankworld/systems/documents';
import { VISAS, type VisaRule } from './bankworld/content/visas';
import { exchange } from './bankworld/content/currency';
import { bankReach, postToBank } from './bank';
import { continentOf, permitTerms, visaTerms, type Terms } from './papers-terms';
import { CONTINENT_NAMES } from './bankworld/content/geography';
import type { GameState } from './types';

// ---------------- the records ----------------

type Entry = 'free' | 'eta' | 'evisa' | 'arrival' | 'visa';
interface Visit { entry: Entry; days?: number; within?: number; months?: number }
interface VisitList { passports: Record<string, Visit>; others: Visit }
const VISITS = visitsData as unknown as { groups: Record<string, VisitList>; countries: Record<string, VisitList | { group: string; passports?: Record<string, Visit> }> };

interface WorkRule { right: 'free' | 'permit'; route?: string; days?: number; within?: number; from?: string; only?: string }
interface WorkList { groups?: string[]; passports: Record<string, WorkRule>; others: WorkRule; /** Not researched: the game's model, and why. */ modeled?: string }
const WORK = workData as unknown as { groups: Record<string, { passports: Record<string, WorkRule>; others?: WorkRule }>; countries: Record<string, WorkList> };

const CITIZENSHIP = citizenshipData as unknown as Record<string, { nationalityOf?: string }>;
/** The state a territory's people are nationals of (SLATE-REBUILD's `nationality`): Puerto Rico's are American. */
const nationality = (country: string): string => CITIZENSHIP[country]?.nationalityOf ?? country;

export type Activity = 'act' | 'direct' | 'produce' | 'write';
export const ACTIVITY_WORDS: Record<Activity, string> = { act: 'acting', direct: 'directing', produce: 'producing', write: 'writing' };

/** A country's name as a sentence says it: "the United States", "Kenya". */
const the = (code: string) => theCountry(countryName(code));
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const citizenships = (state: GameState) => (state.character.nationalities ?? []).map(nationality);
const isCitizen = (state: GameState, country: string) => citizenships(state).includes(nationality(country));
/**
 * Where your story is lived. Until November 14, 2026 the game assumed you might live and work there, whatever your
 * passport; from then (the owner: "make living abroad need real papers") it asks what anywhere else asks: citizenship,
 * free movement, or a work visa, which there covers all four kinds of work and your stay (`grantArrivalPapers`).
 */
const livesIn = (state: GameState) => getPlace(state.character.livesIn ?? state.locationId).country;

/** A work visa or permit of yours in force in `country` for `activity`: one where you live covers every kind of work. */
const permitIn = (state: GameState, country: string, activity?: Activity) => applications(state).find((a) => a.kind === 'permit' && a.country === country && (activity === undefined || a.all || (a.activity ?? 'act') === activity) && a.stage === 'issued' && (a.expiresAt ?? Infinity) > state.now);

// ---------------- passports ----------------

/** Your passports, from your bank world's documents: each with whether it is in force today. */
export function passports(state: GameState): { doc: PersonDocument; inForce: boolean }[] {
  if (!state.bank) return [];
  const person = bankSim(state.bank).player;
  return documentsOf(person).filter((d) => d.kind === 'passport').map((doc) => ({ doc, inForce: inForce(doc, state.now) }));
}
/** A passport of yours in force today, and still in force on `until` (a visit's end), if you hold one. */
export function passportFor(state: GameState, until = state.now): PersonDocument | undefined {
  return passports(state).find((p) => p.inForce && (p.doc.expiresAt === undefined || p.doc.expiresAt > until))?.doc;
}

// ---------------- entering and staying ----------------

export type EntryRight =
  | { kind: 'home'; why: string }
  | { kind: 'lives'; why: string }
  /** Where you live, with no right to stay: a work visa that ran out, or none. */
  | { kind: 'unpermitted'; why: string }
  | { kind: 'free'; days?: number; within?: number; why: string }
  | { kind: 'held'; why: string; until?: number }
  | { kind: 'needs'; entry: Exclude<Entry, 'free'>; days?: number; why: string }
  | { kind: 'unknown'; why: string };

const ENTRY_WORDS: Record<Exclude<Entry, 'free'>, string> = { eta: 'an electronic travel authorization', evisa: 'an electronic visa', arrival: 'a visa issued on arrival', visa: 'a visa' };
const ENTRY_ORDER: Entry[] = ['free', 'arrival', 'eta', 'evisa', 'visa'];

function visitRule(passport: string, destination: string): Visit | 'home' | undefined {
  if (nationality(passport) === nationality(destination)) return 'home';
  const entry = VISITS.countries[destination];
  if (!entry) return undefined;
  const list: VisitList = 'group' in entry ? { passports: { ...VISITS.groups[entry.group].passports, ...(entry.passports ?? {}) }, others: VISITS.groups[entry.group].others } : entry;
  return list.passports[passport] ?? list.passports[nationality(passport)] ?? list.others;
}

/** What entering `country` asks of you, by the best of your passports, or the visa you hold for it. */
export function entryRight(state: GameState, country: string): EntryRight {
  if (isCitizen(state, country)) return { kind: 'home', why: `You are a citizen of ${the(country)}.` };
  // Where your story is lived, you stay by free movement or a work visa; without either you live there without the right
  // to (from November 14, 2026: until then the game assumed it, and before that asked a visitor's visa of you).
  if (livesIn(state) === country) {
    const visa = permitIn(state, country);
    if (visa) return { kind: 'lives', why: `You live in ${the(country)} on your ${visa.route}${visa.expiresAt ? `, good until ${dateKey(visa.expiresAt, 'UTC')}` : ''}.` };
    const free = freeMovement(state, country);
    if (free) return { kind: 'lives', why: `You live in ${the(country)}: your passport from ${the(free)} gives you the right to live and work there.` };
    const lapsed = applications(state).filter((a) => a.kind === 'permit' && a.country === country && a.stage === 'expired').at(-1);
    return { kind: 'unpermitted', why: `You live in ${the(country)} without the right to${lapsed ? `: your ${lapsed.route} ran out${lapsed.expiresAt ? ` on ${dateKey(lapsed.expiresAt, 'UTC')}` : ''}` : ''}. You can't work there until a work visa is issued; apply under Working.` };
  }
  const held = applications(state).find((a) => a.country === country && a.kind === 'visa' && a.stage === 'issued' && (a.expiresAt ?? Infinity) > state.now);
  if (held) return { kind: 'held', why: `Your ${held.route} lets you in${held.expiresAt ? ` until ${dateKey(held.expiresAt, 'UTC')}` : ''}.`, until: held.expiresAt };
  const rules = citizenships(state).map((n) => ({ n, r: visitRule(n, country) })).filter((x): x is { n: string; r: Visit | 'home' } => x.r !== undefined);
  if (!rules.length) return { kind: 'unknown', why: `The game has no record of who may visit ${the(country)}.` };
  if (rules.some((x) => x.r === 'home')) return { kind: 'home', why: `Your passport is ${the(country)}'s own.` };
  const best = rules.map((x) => ({ n: x.n, r: x.r as Visit })).sort((a, b) => ENTRY_ORDER.indexOf(a.r.entry) - ENTRY_ORDER.indexOf(b.r.entry))[0];
  if (best.r.entry === 'free') return { kind: 'free', days: best.r.days, within: best.r.within, why: `Your passport from ${the(best.n)} lets you visit ${the(country)} without a visa${best.r.days ? `, for up to ${best.r.days} days${best.r.within ? ` in any ${best.r.within}` : ''}` : ''}.` };
  return { kind: 'needs', entry: best.r.entry, days: best.r.days, why: `To visit ${the(country)} on your passport from ${the(best.n)} you need ${ENTRY_WORDS[best.r.entry]}.` };
}

// ---------------- working ----------------

export type WorkRight =
  | { can: true; why: string }
  | { can: false; why: string; route: string | null; days: number | null; missing: string[] };

function workRule(passport: string, country: string): WorkRule | 'home' | undefined {
  if (nationality(passport) === nationality(country)) return 'home';
  const rules = WORK.countries[country];
  if (!rules) return undefined;
  return rules.passports[passport] ?? (rules.groups ?? []).map((g) => WORK.groups[g]?.passports[passport]).find(Boolean) ?? rules.others;
}

/** The citizenship of yours that gives you the right to live and work in `country` (free movement), if one does. */
function freeMovement(state: GameState, country: string): string | undefined {
  return citizenships(state).find((n) => { const r = workRule(n, country); return r === 'home' || (r !== undefined && r.right === 'free'); });
}

/** Days you worked in `country` (a shoot day you were called to and there for), by day. */
const workedDays = (state: GameState, country: string): string[] => state.papersWorked?.[country] ?? [];

/** Whether you may do `activity` in `country` now, and why: citizenship, free movement, a short engagement, or what's missing. */
export function workRight(state: GameState, country: string, activity: Activity = 'act'): WorkRight {
  if (isCitizen(state, country)) return { can: true, why: `You are a citizen of ${the(country)}.` };
  const permit = permitIn(state, country, activity);
  if (permit) return { can: true, why: `Your ${permit.route} lets you work in ${the(country)}${permit.expiresAt ? ` until ${dateKey(permit.expiresAt, 'UTC')}` : ''}.` };
  const legacy = (state.permits ?? []).find((p) => p.country === country && p.status === 'granted' && (p.expiresAt ?? 0) > state.now);
  if (legacy && activity === 'act') return { can: true, why: `Your ${legacy.route}, granted before November 14, 2026, lets you work in ${the(country)} until it expires.` };
  const rules = citizenships(state).map((n) => ({ n, r: workRule(n, country) })).filter((x): x is { n: string; r: WorkRule | 'home' } => x.r !== undefined);
  if (!rules.length) return { can: false, why: `The game has no record of who may work in ${the(country)}.`, route: null, days: null, missing: ['who may work there'] };
  const free = rules.find((x) => x.r === 'home' || (x.r as WorkRule).right === 'free');
  if (free) return { can: true, why: free.r === 'home' ? `Your passport is ${the(country)}'s own.` : `Your passport from ${the(free.n)} gives you the right to live and work in ${the(country)}.` };
  const r = rules[0].r as WorkRule;
  const route = r.route ?? null;
  // The records are what a performer needs: acting only. Directing or producing there needs a right to work generally.
  // Directing, producing or writing: the records name a performer's route only, and the game takes the same route, at its
  // terms, for the other work too. Said as an assumption wherever it shows (from November 14, 2026; until then, refused).
  if (activity !== 'act') return { can: false, why: `To work in ${the(country)} other than as a performer you need a right to work there. The records name a performer's route only, ${route ?? 'a permit'}, and the game takes it as the route for ${ACTIVITY_WORDS[activity]} too: its assumption.`, route, days: null, missing: [] };
  if (r.days) {
    const used = workedDays(state, country).filter((d) => !r.within || d >= dateKey(state.now - r.within * DAY, 'UTC')).length;
    if (used < r.days) return { can: true, why: `A short engagement: ${capital(the(country))} lets a performer work up to ${r.days} days${r.within ? ` in any ${r.within}` : ''} without ${route ?? 'a permit'}. You have used ${used}.` };
  }
  const model = WORK.countries[country]?.modeled;
  return { can: false, why: `To act in ${the(country)} you need ${route ?? 'a permit whose route isn\'t recorded'}${r.days ? `: the ${r.days} days a short engagement may be worked without it are used` : ''}.${model ? ` ${capital(model)}.` : ''}`, route, days: null, missing: [] };
}

/** Records a day worked in a country, for the short engagement's count. Called by the shoot when you're on set. */
export function recordWorkDay(state: GameState, country: string): void {
  const day = dateKey(state.now, 'UTC');
  const list = ((state.papersWorked ??= {})[country] ??= []);
  if (!list.includes(day)) list.push(day);
}

// ---------------- applications ----------------

export interface PaperApplication {
  id: string;
  kind: 'visa' | 'permit';
  /** A permit's kind of work (acting when absent). */
  activity?: Activity;
  /** A work visa where you live: it covers all four kinds of work, and your stay. */
  all?: true;
  /** Held when the story began: you arrived on it. */
  arrival?: true;
  /** Applied for on the game's estimate of the fee and the time, not a researched figure. */
  estimate?: true;
  country: string;
  route: string;
  stage: 'applied' | 'issued' | 'expired';
  passportId: string;
  fee: { minor: number; currency: string; paidUsdMinor: number };
  appliedAt: number;
  decideAt: number;
  issuedAt?: number;
  expiresAt?: number;
}
export const applications = (state: GameState): PaperApplication[] => state.paperApplications ?? [];

/** 1221's visa record for one of your passports and `country`, as terms: researched, with its source. */
function visaPair(state: GameState, country: string): Terms | undefined {
  for (const n of citizenships(state)) {
    const rule: VisaRule | undefined = VISAS[`${country}<${n}`];
    if (rule) return {
      route: rule.name, fee: { amount: rule.fee, currency: rule.currency }, days: rule.days, daysText: `${rule.days} days`,
      stayDays: rule.years ? Math.round(rule.years * 365.25) : rule.validDays ?? null, basis: rule.basis,
      sources: [{ kind: 'secondary', url: rule.source, what: '1221\'s visa record' }], estimate: null,
    };
  }
  return undefined;
}

/** What a visitor visa for `country` costs and takes for you: 1221's pair for your passport, the destination's researched visa, or the estimate. */
export const visaFor = (state: GameState, country: string): Terms => visaPair(state, country) ?? visaTerms(country);

export type ApplicationCheck =
  | { ok: true; terms: Terms; needs: string[]; feeText: string }
  | { ok: false; why: string; missing?: string[] };

const feeText = (t: Terms) => `${t.fee.amount.toLocaleString('en-US')} ${t.fee.currency}`;

/** The documents an application needs: a passport in force until the decision, at least. */
function passportNeed(state: GameState, t: Terms): { passport: PersonDocument } | { why: string } {
  const passport = passportFor(state, state.now + t.days * DAY);
  return passport ? { passport } : { why: 'You need a passport in force until the decision, at least. Apply for one first.' };
}

/** Whether you may apply for the visa `country` asks of you, what it needs, and what it costs; or exactly why not. */
export function visaCheck(state: GameState, country: string): ApplicationCheck {
  const e = entryRight(state, country);
  if (e.kind !== 'needs') return { ok: false, why: e.kind === 'unknown' ? e.why : `You don't need a visa: ${e.why}` };
  if (applications(state).some((a) => a.kind === 'visa' && a.country === country && a.stage === 'applied')) return { ok: false, why: 'Your application is being decided.' };
  const t = visaFor(state, country);
  const need = passportNeed(state, t);
  if ('why' in need) return { ok: false, why: need.why };
  return { ok: true, terms: t, needs: [`Your ${need.passport.name ?? 'passport'}, in force until ${dateKey(need.passport.expiresAt ?? state.now, 'UTC')}`], feeText: feeText(t) };
}

/** Whether you may apply for a permit to do `activity` in `country`, what it needs and costs; or exactly why not. */
export function permitCheck(state: GameState, country: string, activity: Activity = 'act'): ApplicationCheck {
  const w = workRight(state, country, activity);
  const home = livesIn(state) === country;
  const held = permitIn(state, country, activity);
  const route = w.can ? held?.route ?? null : w.route;
  const t = permitTerms(country, route ?? 'Work permit');
  // A work visa where you live can be renewed once its end is nearer than its decision and a month (game calibration).
  const renewable = !!held && home && held.expiresAt !== undefined && held.expiresAt - state.now <= (t.days + RENEW_MARGIN_DAYS) * DAY;
  if (w.can && !renewable) return { ok: false, why: `You may already work there: ${w.why}` };
  if (!route && !WORK.countries[country]) return { ok: false, why: w.why };
  if (applications(state).some((a) => a.kind === 'permit' && a.country === country && (home || (a.activity ?? 'act') === activity) && a.stage === 'applied')) return { ok: false, why: 'Your application is being decided.' };
  const need = passportNeed(state, t);
  if ('why' in need) return { ok: false, why: need.why };
  return { ok: true, terms: t, needs: [`Your ${need.passport.name ?? 'passport'}, in force until ${dateKey(need.passport.expiresAt ?? state.now, 'UTC')}`], feeText: feeText(t) };
}

/** The work visa you live on, if you live on one, and whether it can be renewed now. */
export function homeVisa(state: GameState): { visa: PaperApplication; renewable: boolean } | undefined {
  const country = livesIn(state);
  const visa = permitIn(state, country);
  return visa && { visa, renewable: workRight(state, country).can && permitCheck(state, country).ok };
}

/** How long before a work visa where you live runs out, beyond its decision time, it can be renewed: game calibration. */
export const RENEW_MARGIN_DAYS = 30;

/** Pays an application's fee from your bank at the day's reference rate and schedules its decision. */
function apply(state: GameState, kind: 'visa' | 'permit', country: string, c: Extract<ApplicationCheck, { ok: true }>, activity?: Activity): PaperApplication {
  const t = c.terms;
  const passport = passportFor(state, state.now + t.days * DAY)!;
  const minor = Math.round(t.fee.amount * 100);
  const usd = t.fee.currency === 'USD' ? minor : exchange(minor, t.fee.currency, 'USD');
  if (usd === undefined) throw new Error(`No exchange rate for ${t.fee.currency} is recorded by today, so the fee can't be paid.`);
  const id = newId(state, 'pa');
  postToBank(state, 'papers', -usd / 100, `${t.route}: The Fee`, `papers:${id}`);
  const a: PaperApplication = {
    id, kind, country, route: t.route, stage: 'applied', passportId: passport.id,
    ...(kind === 'permit' && country === livesIn(state) ? { all: true as const } : activity && activity !== 'act' ? { activity } : {}), ...(t.estimate ? { estimate: true as const } : {}),
    fee: { minor, currency: t.fee.currency, paidUsdMinor: usd }, appliedAt: state.now, decideAt: state.now + t.days * DAY,
  };
  (state.paperApplications ??= []).push(a);
  schedule(state, a.decideAt, 'papers-decision', { id }, { attention: 'notify', priority: 55, id: `papers-decision:${id}` });
  const what = kind === 'visa' ? `a ${t.route} for ${the(country)}` : `${t.route} to work in ${the(country)}${activity && activity !== 'act' ? ` (${ACTIVITY_WORDS[activity]})` : ''}`;
  addLog(state, `You applied for ${what} and paid its fee. It is decided in about ${t.days} days${t.estimate ? ', the game\'s estimate' : ''}.`, 'personal', { route: { view: 'papers' } });
  return a;
}

/** Apply for a visa: the fee paid from your bank now, at the day's reference rate; decided after its days. */
export function applyForVisa(state: GameState, country: string): PaperApplication {
  const c = visaCheck(state, country);
  if (!c.ok) throw new Error(c.why);
  return apply(state, 'visa', country, c);
}

/** Apply for a work permit for `activity`: the fee paid from your bank now; decided after its days. */
export function applyForPermit(state: GameState, country: string, activity: Activity = 'act'): PaperApplication {
  const c = permitCheck(state, country, activity);
  if (!c.ok) throw new Error(c.why);
  return apply(state, 'permit', country, c, activity);
}

/**
 * A life that begins where you aren't a citizen and have no free movement begins on the work visa that country asks of
 * you (the owner chose it, November 14, 2026, over arriving without one): issued before the story starts, for its
 * researched or estimated term from the first day, and covering all four kinds of work and your stay. A new story pays
 * its fee from the inheritance on the first day; a story from before then was already under way, so it is granted with
 * its fee taken as settled. Nothing is granted twice.
 */
export function grantArrivalPapers(state: GameState, paid = true): PaperApplication | undefined {
  const country = livesIn(state);
  if (state.papersArrival || isCitizen(state, country) || freeMovement(state, country)) return undefined;
  state.papersArrival = true;
  if (permitIn(state, country)) return undefined;
  const w = workRight(state, country, 'act');
  const route = w.can ? null : w.route;
  if (!route && !WORK.countries[country]) return undefined; // no record of who may work there: nothing to hold
  const t = permitTerms(country, route ?? 'Work permit');
  const minor = Math.round(t.fee.amount * 100);
  const usd = t.fee.currency === 'USD' ? minor : exchange(minor, t.fee.currency, 'USD');
  // A fixed id, not the next in the save's count, which seeds the draws of everything made after it: arriving on a visa
  // changes no casting, crew or take in the story (tests/production-golden.test.ts holds them).
  const id = 'pa-arrival';
  // A life that begins with less than the fee paid it before the story began, from money that isn't in the bank.
  if (paid && (usd === undefined || !state.bank || bankReach(state) < usd / 100)) paid = false;
  if (paid) postToBank(state, 'papers', -usd! / 100, `${t.route}: The Fee, Before You Arrived`, `papers:${id}`);
  const a: PaperApplication = {
    id, kind: 'permit', all: true, arrival: true, country, route: t.route, stage: 'issued', passportId: passportFor(state)?.id ?? '',
    ...(t.estimate ? { estimate: true as const } : {}),
    fee: { minor, currency: t.fee.currency, paidUsdMinor: paid ? usd ?? 0 : 0 },
    appliedAt: state.now - t.days * DAY, decideAt: state.now, issuedAt: state.now,
    ...(t.stayDays ? { expiresAt: state.now + t.stayDays * DAY } : {}),
  };
  (state.paperApplications ??= []).push(a);
  if (a.expiresAt) schedule(state, a.expiresAt, 'papers-expiry', { id }, { attention: 'notify', priority: 55, id: `papers-expiry:${id}` });
  const until = a.expiresAt ? ` It's good until ${dateKey(a.expiresAt, 'UTC')}, and you can renew it from ${dateKey(a.expiresAt - (t.days + RENEW_MARGIN_DAYS) * DAY, 'UTC')}.` : '';
  addLog(state, `You live in ${the(country)} on your ${t.route}, issued before you arrived${paid ? `; its fee, ${t.fee.amount.toLocaleString('en-US')} ${t.fee.currency}, came from your inheritance` : ''}${t.estimate ? ' (the fee and its term are the game\'s estimate)' : ''}.${until}`, 'personal', { route: { view: 'papers' }, id: 'l-arrival' });
  return a;
}

registerHandler('papers-decision', (state, ev) => {
  const a = applications(state).find((x) => x.id === ev.payload.id);
  if (!a || a.stage !== 'applied') return { suppressInterrupt: true };
  const t = a.kind === 'visa' ? visaFor(state, a.country) : permitTerms(a.country, a.route);
  // Granted: the game models no grounds for refusal, and says so rather than inventing a chance of one.
  a.stage = 'issued';
  a.issuedAt = state.now;
  if (t.stayDays) a.expiresAt = state.now + t.stayDays * DAY;
  if (a.expiresAt) schedule(state, a.expiresAt, 'papers-expiry', { id: a.id }, { attention: 'notify', priority: 55, id: `papers-expiry:${a.id}` });
  const message = `Your ${a.route} for ${the(a.country)} was issued.${a.expiresAt ? ` It's good until ${dateKey(a.expiresAt, 'UTC')}.` : ''}${a.all && a.expiresAt ? ` You can renew it from ${dateKey(a.expiresAt - (t.days + RENEW_MARGIN_DAYS) * DAY, 'UTC')}.` : ''}`;
  addLog(state, message, 'personal', { route: { view: 'papers' } });
  return { message };
});

registerHandler('papers-expiry', (state, ev) => {
  const a = applications(state).find((x) => x.id === ev.payload.id);
  if (!a || a.stage !== 'issued') return { suppressInterrupt: true };
  a.stage = 'expired';
  const home = a.all && a.country === livesIn(state) && !permitIn(state, a.country);
  const message = home
    ? `Your ${a.route} for ${the(a.country)} has run out. You live there without the right to now, and can't work there until a new one is issued. Apply under Your Papers.`
    : `Your ${a.route} for ${the(a.country)} has expired. Apply again before your next visit.`;
  addLog(state, message, 'personal', { route: { view: 'papers' } });
  return { message };
});

// ---------------- what older saves hold ----------------

/** A work permit from before November 14, 2026, kept until its date. */
export interface WorkPermit {
  id: string; country: string; route: string;
  status: 'pending' | 'granted' | 'refused';
  appliedAt: number; decideAt: number; grantedAt?: number; expiresAt?: number;
}
export const permits = (state: GameState): WorkPermit[] => state.permits ?? [];

/** Why a work permit can't be applied for now, or null. */
export function permitRefusal(state: GameState, country: string, activity: Activity = 'act'): string | null {
  const c = permitCheck(state, country, activity);
  return c.ok ? null : c.why;
}

// A permit applied for before November 14, 2026 and still waiting: decided as it was promised, on its own terms.
registerHandler('permit-decision', (state, ev) => {
  const p = permits(state).find((x) => x.id === ev.payload.id);
  if (!p || p.status !== 'pending') return { suppressInterrupt: true };
  p.status = 'granted';
  p.grantedAt = state.now;
  p.expiresAt = state.now + 365 * DAY; // the term it was applied for under, before that day
  const message = `Your ${p.route} was granted: you may work in ${the(p.country)} for a year, as applied for.`;
  addLog(state, message, 'project', { route: { view: 'papers' } });
  return { message };
});

// ---------------- passports from SLATE-REBUILD's records ----------------
// 1221 kept fifteen passport offices (bankworld content/passports.ts), which its own application uses. For every other
// citizenship, SLATE-REBUILD's records (236 entries) give each office's routes, its fee by age band and its time. An
// application is taken from them only where the route's fee and its time are both recorded (from November 14, 2026).
import passportData from '../data/papers/passports.json';

type Unit = 'minute' | 'hour' | 'day' | 'working day' | 'week' | 'month';
interface PRoute { id: string; where: 'home' | 'abroad'; speed: 'standard' | 'urgent'; within: { n: number; unit: Unit } | null; months?: number[]; renewal?: true; replacement?: true }
interface PBand { from?: number; under?: number; pages?: number; validYears: number | null; pay: Record<string, number | null> }
interface PRecord { currency: string; abroad?: { currency: string }; routes: PRoute[]; bands: PBand[] }
const PASSPORT_RECORDS = passportData as unknown as Record<string, PRecord | { issuedBy: string; onlyRoutes?: string[] }>;

export interface PassportOffer {
  issuer: string; route: PRoute; fee: { minor: number; currency: string } | null; validYears: number | null; pages?: number;
  /** Always empty from November 14, 2026: what the records lack is estimated instead (`estimated`). */
  missing: string[];
  /** What of this route is the game's estimate, not the records': 'the fee', 'how long it takes', 'how long it lasts'. */
  estimated: string[];
  /** Where an estimate comes from, in words. */
  basis?: string;
}

const UNIT_DAYS: Record<Unit, number> = { minute: 1 / 1440, hour: 1 / 24, day: 1, 'working day': 1.4, week: 7, month: 30 };
/**
 * The recorded passport routes' adult fees (in dollars, at the day's rate), times (in days) and validities, by continent:
 * what an estimate for a route the records lack is the middle of (the owner's command of November 14, 2026).
 */
function passportPool(country: string): { fee: number | undefined; days: number | undefined; years: number | undefined; where: string } {
  const cont = continentOf(country);
  const rows: { c: string; fee?: number; days?: number; years?: number }[] = [];
  for (const [c, e] of Object.entries(PASSPORT_RECORDS)) {
    if ('issuedBy' in e) continue;
    for (const r of e.routes.filter((x) => x.where === 'home' && x.speed === 'standard')) {
      const b = e.bands.find((x) => (x.from ?? 0) <= 30 && 30 < (x.under ?? Infinity) && typeof x.pay[r.id] === 'number');
      const usd = b ? exchange(b.pay[r.id]!, e.currency, 'USD') : undefined;
      rows.push({ c, fee: usd === undefined ? undefined : usd / 100, days: r.within ? r.within.n * UNIT_DAYS[r.within.unit] : undefined, years: b?.validYears ?? undefined });
    }
  }
  const near = rows.filter((x) => continentOf(x.c) === cont);
  const mid = (k: 'fee' | 'days' | 'years') => {
    const pick = (xs: typeof rows) => xs.map((x) => x[k]).filter((v): v is number => v !== undefined && Number.isFinite(v)).sort((a, b) => a - b);
    const xs = pick(near).length ? pick(near) : pick(rows);
    return xs.length ? xs[xs.length >> 1] : undefined;
  };
  return { fee: mid('fee'), days: mid('days'), years: mid('years'), where: near.length ? `the recorded passport offices in ${CONTINENT_NAMES[cont] ?? cont}` : 'every recorded passport office' };
}

/** The ways your citizenship's office issues a passport to you now (SLATE-REBUILD's `passportOffers`), each with what's missing. */
export function passportOffers(state: GameState, need?: 'renewal' | 'replacement'): PassportOffer[] {
  const country = citizenships(state)[0];
  if (!country) return [];
  const entry = PASSPORT_RECORDS[country];
  const est = () => passportPool(country);
  const estimatedOffer = (why: string): PassportOffer => {
    const e = est();
    return {
      issuer: country, route: { id: 'estimate', where: livesIn(state) === country ? 'home' : 'abroad', speed: 'standard', within: { n: Math.max(1, Math.round(e.days ?? 30)), unit: 'day' } },
      fee: { minor: Math.round((e.fee ?? 100) * 100), currency: 'USD' }, validYears: e.years ?? 10, missing: [], estimated: ['the fee', 'how long it takes', 'how long it lasts'],
      basis: `${why} The game estimates all three from ${e.where}: the middle of each.`,
    };
  };
  if (!entry) return [estimatedOffer('The records have no passport office for your citizenship.')];
  const p = ('issuedBy' in entry ? PASSPORT_RECORDS[entry.issuedBy] : entry) as PRecord;
  const only = 'issuedBy' in entry ? entry.onlyRoutes : undefined;
  const parts = new Date(state.now);
  const age = parts.getUTCFullYear() - state.character.birth.year - ((parts.getUTCMonth() + 1 < state.character.birth.month || (parts.getUTCMonth() + 1 === state.character.birth.month && parts.getUTCDate() < state.character.birth.day)) ? 1 : 0);
  const where = livesIn(state) === country ? 'home' : 'abroad';
  const offered = p.routes.filter((r) => (only === undefined || only.includes(r.id)) && (r.months === undefined || r.months.includes(parts.getUTCMonth() + 1)) && r.where === where);
  const own = (r: PRoute) => (need ? r[need] === true : false);
  const routes = offered.filter((r) => (r.renewal || r.replacement ? own(r) : !offered.some(own)));
  const out: PassportOffer[] = [];
  for (const route of routes) {
    const currency = route.where === 'abroad' ? p.abroad?.currency ?? p.currency : p.currency;
    for (const b of p.bands) {
      if (!((b.from ?? 0) <= age && age < (b.under ?? Infinity)) || !Object.hasOwn(b.pay, route.id)) continue;
      const minor = b.pay[route.id];
      const estimated = [...(minor === null ? ['the fee'] : []), ...(route.within === null ? ['how long it takes'] : []), ...(b.validYears === null ? ['how long it lasts'] : [])];
      const e = estimated.length ? est() : undefined;
      out.push({
        issuer: 'issuedBy' in entry ? entry.issuedBy : country,
        route: route.within === null ? { ...route, within: { n: Math.max(1, Math.round(e!.days ?? 30)), unit: 'day' } } : route,
        fee: minor === null ? { minor: Math.round((e!.fee ?? 100) * 100), currency: 'USD' } : { minor, currency },
        validYears: b.validYears ?? e?.years ?? 10, ...(b.pages ? { pages: b.pages } : {}), missing: [], estimated,
        ...(e ? { basis: `The records don't give ${estimated.join(' or ')} for this route: the game estimates ${estimated.length > 1 ? 'them' : 'it'} from ${e.where}${estimated.length > 1 ? ', the middle of each' : ', the middle of them'}.` } : {}),
      });
    }
  }
  return out.length ? out : [estimatedOffer('The records give no route your citizenship\'s office offers you where you live.')];
}

/** When an application made now is ready: its recorded time; working days skip Saturdays and Sundays (holidays aren't counted). */
function readyAfter(now: number, within: { n: number; unit: Unit }): number {
  const unit = { minute: 60_000, hour: 3_600_000, day: DAY, week: 7 * DAY, month: 30 * DAY } as Record<string, number>;
  if (within.unit !== 'working day') return now + within.n * unit[within.unit];
  let t = now;
  for (let n = 0; n < within.n;) { t += DAY; const wd = new Date(t).getUTCDay(); if (wd !== 0 && wd !== 6) n++; }
  return t;
}

/** Apply for a passport by SLATE-REBUILD's record: the fee paid from your bank, issued after its recorded time. */
export function applyForRecordedPassport(state: GameState, offerIndex: number): void {
  const o = passportOffers(state)[offerIndex];
  if (!o) throw new Error('That route isn\'t offered to you now.');
  if (!state.bank) throw new Error('This story has no bank to pay from.');
  const person = bankSim(state.bank).player;
  if (documentsOf(person).some((d) => d.kind === 'passport' && d.status === 'pending')) throw new Error('You’ve already applied, and it’s being decided.');
  const usd = o.fee!.currency === 'USD' ? o.fee!.minor : exchange(o.fee!.minor, o.fee!.currency, 'USD');
  if (usd === undefined) throw new Error(`No exchange rate for ${o.fee!.currency} is recorded by today, so the fee can't be paid.`);
  const id = newId(state, 'pp');
  postToBank(state, 'papers', -usd / 100, `Passport (${countryName(o.issuer)}): The Fee`, `papers:${id}`);
  const readyAt = readyAfter(state.now, o.route.within!);
  documentsOf(person).push({ id, kind: 'passport', issuer: o.issuer, name: `${countryName(o.issuer)} Passport`, number: `P${id.replace(/\D/g, '').padStart(8, '0')}`, status: 'pending', appliedAt: state.now, readyAt } as PersonDocument);
  schedule(state, readyAt, 'papers-passport', { id, years: o.validYears }, { attention: 'notify', priority: 55, id: `papers-passport:${id}` });
  addLog(state, `You applied for your passport from ${the(o.issuer)} and paid its fee. It should be ready by ${dateKey(readyAt, 'UTC')}${o.estimated.length ? ', the game\'s estimate' : ', as recorded'}.`, 'personal', { route: { view: 'papers' } });
}

registerHandler('papers-passport', (state, ev) => {
  if (!state.bank) return { suppressInterrupt: true };
  const doc = documentsOf(bankSim(state.bank).player).find((d) => d.id === ev.payload.id);
  if (!doc || doc.status !== 'pending') return { suppressInterrupt: true };
  doc.status = 'valid';
  doc.issuedAt = state.now;
  const years = ev.payload.years as number | null;
  if (years) doc.expiresAt = state.now + Math.round(years * 365.25) * DAY;
  const message = `Your ${doc.name} is ready.${doc.expiresAt ? ` It's valid until ${dateKey(doc.expiresAt, 'UTC')}.` : ' Its validity isn\'t recorded.'}`;
  addLog(state, message, 'personal', { route: { view: 'papers' } });
  return { message };
});
