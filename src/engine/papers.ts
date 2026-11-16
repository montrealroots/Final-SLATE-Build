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
import refusalData from '../data/papers/refusals.json';
import sponsorData from '../data/papers/sponsors.json';
import { addLog, adoptPlace, newId, onArrival, onTravelCheck, registerHandler, schedule, travelTo } from './state';
import { DAY, addDaysToKey, dateKey } from './time';
import { countryName } from '../world/gazetteer/gazetteer';
import { getPlace } from '../data/places';
import { advanceBankWorld, bankSim, cityForPlace } from './bankworld';
import { armHomeAccounts, heldFromAbroad } from './bankworld/systems/abroad';
import { checkingsOf } from './bankworld/systems/lending';
import { banksFor } from './bankworld/systems/banking';
import { documentsOf, inForce, theCountry, type PersonDocument } from './bankworld/systems/documents';
import { VISAS, type VisaRule } from './bankworld/content/visas';
import { exchange } from './bankworld/content/currency';
import { bankReach, postToBank } from './bank';
import { continentOf, permitTerms, visaTerms, type Terms } from './papers-terms';
import { CONTINENT_NAMES } from './bankworld/content/geography';
import { filmPlace } from './destinations';
import { stream } from './rng';
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
  // A visitor visa or a work visa in force lets you in (a work visa, from November 14, 2026).
  const held = applications(state).find((a) => a.country === country && a.stage === 'issued' && (a.expiresAt ?? Infinity) > state.now);
  if (held) return { kind: 'held', why: `Your ${held.route} lets you in${held.expiresAt ? ` until ${dateKey(held.expiresAt, 'UTC')}` : ''}.`, until: held.expiresAt };
  const rules = citizenships(state).map((n) => ({ n, r: visitRule(n, country) })).filter((x): x is { n: string; r: Visit | 'home' } => x.r !== undefined);
  if (!rules.length) return { kind: 'unknown', why: `The game has no record of who may visit ${the(country)}.` };
  if (rules.some((x) => x.r === 'home')) return { kind: 'home', why: `Your passport is ${the(country)}'s own.` };
  const best = rules.map((x) => ({ n: x.n, r: x.r as Visit })).sort((a, b) => ENTRY_ORDER.indexOf(a.r.entry) - ENTRY_ORDER.indexOf(b.r.entry))[0];
  // An overstay in the United States ends visiting it on the Visa Waiver Program's authorization (from November 16, 2026).
  if (best.r.entry === 'eta' && borderOf(country) === 'US' && overstayedInUS(state)) return { kind: 'needs', entry: 'visa', why: `You overstayed in the United States once, and its Visa Waiver Program never admits a visitor who has: to visit, you need a visa.` };
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
  stage: 'applied' | 'issued' | 'expired' | 'refused';
  /** Who sponsored a work visa, as the decision read it. */
  sponsor?: string;
  /** The chance it was refused, as the decision drew it (0 to 1), and why that chance. */
  refusal?: { chance: number; basis: string };
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
  | { ok: true; terms: Terms; needs: string[]; feeText: string; refusal: { chance: number; basis: string } }
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
  const bar = barredFrom(state, country);
  if (bar) return { ok: false, why: bar.why };
  if (applications(state).some((a) => a.kind === 'visa' && a.country === country && a.stage === 'applied')) return { ok: false, why: 'Your application is being decided.' };
  const t = visaFor(state, country);
  const need = passportNeed(state, t);
  if ('why' in need) return { ok: false, why: need.why };
  return { ok: true, terms: t, needs: [`Your ${need.passport.name ?? 'passport'}, in force until ${dateKey(need.passport.expiresAt ?? state.now, 'UTC')}`], feeText: feeText(t), refusal: refusalChance(state, 'visa', country) };
}

// ---------------- what papers read of the rest of the game ----------------

/**
 * Your record's best standing and an agent's name, given to papers by reputation.ts and representation.ts as they load.
 * Papers can't import them: they import finance, projects and jobs, which import papers, and in the browser that loop
 * started production.ts before projects.ts (found November 14, 2026, when the game stopped loading).
 */
export const papersReads = { bestStanding: (_s: GameState): number => 50, agentName: (id: string): string => id };

// ---------------- sponsors ----------------

interface SponsorRule { kinds: ('agent' | 'employer')[]; basis: string; source?: { kind: string; url: string; what: string } }
const SPONSOR_RULES = (sponsorData as { countries: Record<string, SponsorRule> }).countries;
/** Who may sponsor a work visa for `country`: researched for eight countries, else an employer, the game's assumption. */
export const sponsorRule = (country: string): SponsorRule & { estimated: boolean } =>
  SPONSOR_RULES[country] ? { ...SPONSOR_RULES[country], estimated: false } : { kinds: ['employer'], basis: 'Most work visas are sponsored by the employer the work is for; the game takes it that this one is (its assumption).', estimated: true };

/**
 * Who could sponsor your work visa for `country` now, of what you have (from November 14, 2026; until then a work visa
 * needed none): your agent, where an agent may petition; an outside job offered or taken there; a project of yours being
 * made there, through the production's local company (the game's assumption, said as one).
 */
export function sponsorsFor(state: GameState, country: string): string[] {
  const rule = sponsorRule(country);
  const out: string[] = [];
  const agentId = state.representation?.current?.agentId;
  if (rule.kinds.includes('agent') && agentId) out.push(`your agent, ${papersReads.agentName(agentId)}`);
  if (rule.kinds.includes('employer')) {
    for (const j of state.jobs ?? []) if ((j.status === 'offered' || j.status === 'accepted') && getPlace(j.placeId).country === country) out.push(`${j.company}, for ${j.production}`);
    for (const p of state.projects) {
      if (p.delivered || p.shelved) continue;
      const places = [getPlace(p.axes.basePlaceId), ...Object.keys(p.locationChoices ?? {}).map((l) => filmPlace(p, l))];
      if (places.some((x) => x.country === country)) out.push(`${p.title}'s production company there`);
    }
  }
  return [...new Set(out)];
}

// ---------------- refusals ----------------

interface RateTable { byPassport: Record<string, number>; overall?: number; what: string; sources: { kind: string; url: string; what: string }[] }
const REFUSALS = refusalData as unknown as { schengen: string[]; visitor: Record<string, RateTable>; work: { approval: number; what: string } };
/** An electronic authorization's or e-visa's chance of refusal: game calibration, as none is published. */
export const ELECTRONIC_REFUSAL = 0.02;
/** Where the record behind a work visa's chance starts: an established standing, as the typical O-1 petition's (game calibration). */
const WORK_ANCHOR_STANDING = 55;

/**
 * The chance an application is refused, and why (from November 14, 2026; until then every one was granted, and the
 * game said it modeled no grounds for refusal). A visitor visa: the published refusal rate for your passport there, the
 * destination's overall rate, or the game's estimate from your passport's rates elsewhere. A work visa: anchored to the
 * O-1's published approval, 90%, for an established record; each 10 points of standing above it halves the chance and
 * each 10 below doubles it, between 2% and 50% (game calibration).
 */
export function refusalChance(state: GameState, kind: 'visa' | 'permit', country: string): { chance: number; basis: string } {
  if (kind === 'permit') {
    const best = papersReads.bestStanding(state);
    const chance = Math.min(0.5, Math.max(0.02, (1 - REFUSALS.work.approval) * 2 ** ((WORK_ANCHOR_STANDING - best) / 10)));
    return { chance, basis: `${REFUSALS.work.what}; your record's best standing, ${best}, moves that from an established record's 10% (game calibration).` };
  }
  // The published tables are for visas a consulate decides; an electronic authorization (an ESTA, an ETA) or an e-visa is
  // granted online to nearly everyone eligible for one, and no rate is published: 2%, the game's estimate.
  const e = entryRight(state, country);
  if (e.kind === 'needs' && (e.entry === 'eta' || e.entry === 'evisa')) return { chance: ELECTRONIC_REFUSAL, basis: 'The game\'s estimate: an electronic authorization or e-visa is refused rarely, and no rate for one is published.' };
  const table = REFUSALS.visitor[country] ?? (REFUSALS.schengen.includes(country) ? REFUSALS.visitor.SCHENGEN : undefined);
  const mine = citizenships(state);
  const recorded = table ? mine.map((n) => table.byPassport[n]).filter((x): x is number => x !== undefined) : [];
  if (recorded.length) return { chance: Math.min(...recorded) / 100, basis: `${table!.what}: your passport's rate, as published.` };
  if (table?.overall !== undefined) return { chance: table.overall / 100, basis: `${table.what}: the overall rate, as no rate for your passport is recorded.` };
  const elsewhere = mine.flatMap((n) => Object.values(REFUSALS.visitor).map((t) => t.byPassport[n])).filter((x): x is number => x !== undefined);
  const est = elsewhere.length ? elsewhere.reduce((a, x) => a + x, 0) / elsewhere.length : REFUSALS.visitor.SCHENGEN.overall!;
  return { chance: est / 100, basis: elsewhere.length ? 'The game\'s estimate: your passport\'s published refusal rates elsewhere, averaged, as none is recorded here.' : 'The game\'s estimate: the Schengen area\'s overall refusal rate, as none is recorded for here or for your passport.' };
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
  const bar = barredFrom(state, country);
  if (bar) return { ok: false, why: bar.why };
  if (w.can && !renewable) return { ok: false, why: `You may already work there: ${w.why}` };
  if (!route && !WORK.countries[country]) return { ok: false, why: w.why };
  if (applications(state).some((a) => a.kind === 'permit' && a.country === country && (home || (a.activity ?? 'act') === activity) && a.stage === 'applied')) return { ok: false, why: 'Your application is being decided.' };
  const need = passportNeed(state, t);
  if ('why' in need) return { ok: false, why: need.why };
  const sponsor = sponsorsFor(state, country)[0];
  const rule = sponsorRule(country);
  if (!sponsor) return { ok: false, why: `It needs a sponsor, and you have none there: ${rule.basis} An outside job there, a project of yours made there${rule.kinds.includes('agent') ? ', or an agent' : ''} would be one.` };
  return { ok: true, terms: t, needs: [`Your ${need.passport.name ?? 'passport'}, in force until ${dateKey(need.passport.expiresAt ?? state.now, 'UTC')}`, `A sponsor: ${sponsor}`], feeText: feeText(t), refusal: refusalChance(state, 'permit', country) };
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
    ...(kind === 'permit' ? { sponsor: sponsorsFor(state, country)[0] } : {}),
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
    id, kind: 'permit', all: true, arrival: true, country, route: t.route, stage: 'issued', passportId: passportFor(state)?.id ?? '', sponsor: 'sponsored before your story began',
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

// ---------------- moving ----------------

/** How many of your accounts your bank holds for you from abroad: at a bank in a country you don't live in. */
export function heldFromAbroadCount(state: GameState): number {
  if (!state.bank) return 0;
  const sim = bankSim(state.bank);
  return sim.ledger.accountsOf(sim.universe.playerId).filter((a) => !a.nominal && !a.closedAt && heldFromAbroad(sim, a)).length;
}

/**
 * Why you can't make `placeId` your home now, or null (from November 14, 2026; until then where a story was lived was
 * set at its start and never changed). Within your country you may move freely; to another you need the right to live
 * there: citizenship, free movement, or a work visa in force there.
 */
export function moveRefusal(state: GameState, placeId: string): string | null {
  const to = getPlace(placeId);
  if (to.id === state.character.livesIn) return 'You already live there.';
  if (state.travel) return "You're travelling: you can move once you arrive.";
  if (state.sleep.asleep) return "You're asleep.";
  if (to.country !== livesIn(state) && !isCitizen(state, to.country) && !freeMovement(state, to.country) && !permitIn(state, to.country)) {
    return `To live in ${the(to.country)} you need the right to: citizenship, free movement, or a work visa there. Apply for one under Your Papers; it needs a sponsor there.`;
  }
  if (state.locationId !== to.id) return entryRefusal(state, to.country);
  return null;
}

/**
 * Make `placeId` your home: you set off there if you aren't there, your bank takes it as where you live (1221's rules
 * for accounts held from abroad then apply, its notices included), and a work visa there covers your stay and all four
 * kinds of work. Your money stays in the currency it is kept in.
 */
export function moveTo(state: GameState, placeId: string): void {
  const no = moveRefusal(state, placeId);
  if (no) throw new Error(no);
  const to = getPlace(placeId);
  adoptPlace(state, to);
  const from = getPlace(state.character.livesIn);
  state.character.livesIn = to.id;
  const visa = permitIn(state, to.country);
  if (visa && !isCitizen(state, to.country)) visa.all = true;
  restartStay(state);
  let opened: string | null | undefined;
  if (state.bank) {
    advanceBankWorld(state.bank, state.now);
    const sim = bankSim(state.bank);
    const city = cityForPlace(to.country, to.lat, to.lon);
    if (city) {
      sim.player.currentLocationId = city;
      // An account where you now live, as a person moving opens one: the first bank there that opens it without a deposit.
      const local = checkingsOf(sim, sim.player).some((a) => !heldFromAbroad(sim, a));
      if (!local) opened = banksFor(city).map((b) => ({ b, r: sim.execute<{ accountId?: string; decidedAt?: number }>({ kind: 'bank.open_current', payload: { bankId: b.id } }) })).find((x) => x.r.ok)?.b.name ?? null;
      armHomeAccounts(sim);
    }
  }
  if (state.locationId !== to.id) travelTo(state, to.id);
  const bankWords = opened ? ` You opened a current account at ${opened}.` : opened === null ? ` No bank in ${to.name} opened an account for you without a deposit: open one under Your Bank, or a bank at home may close yours.` : '';
  addLog(state, `You moved from ${from.name} to ${to.name}${visa && !isCitizen(state, to.country) ? `, on your ${visa.route}` : ''}.${bankWords}${state.travel ? ' You set off now.' : ''}`, 'personal', { route: { view: 'papers' } });
}

// ---------------- staying ----------------
//
// From November 16, 2026 (the owner's list: "count days of stay against a visit's limit; make travel ask for entry"):
// until then a visitor could stay anywhere for as long as the story ran, and the days in the visit records were shown
// and read by nothing. Now each stay is recorded as you arrive, a visit's days are counted against its limit, and the
// border refuses a visitor who has no days left. Staying past the limit is an overstay. Its consequences are modeled
// where the law fixes them: the United States' (8 U.S.C. 1182(a)(9)(B), and the Visa Waiver Program's own condition,
// 1187(a)(7)) and the United Kingdom's (Immigration Rules, Part 9, 9.8.7). Where a state decides case by case (a
// Schengen state may fine you or ban you), the overstay is recorded and nothing more is invented.

/** A stay in a country, from arriving to leaving: open while you're there. `free`: with the right to stay (not a visit). */
export interface Stay { country: string; from: number; until?: number; free?: boolean }
/** A stay past what the visit allowed: from its first day over to the day you left the place it was counted in. */
export interface Overstay { country: string; area: string; from: number; left?: number }

/**
 * The Schengen area counts one 90 days in any 180 across all its states (the Schengen Borders Code, Regulation (EU)
 * 2016/399, article 6(1)): its 29 states (REFUSALS.schengen), plus Monaco, San Marino, the Vatican and Åland, which have
 * no border with it.
 */
const SCHENGEN_AREA = new Set([...REFUSALS.schengen, 'MC', 'SM', 'VA', 'AX']);
/**
 * Territories inside their state's border: Puerto Rico and the US Virgin Islands are admitted to as the United States
 * (8 U.S.C. 1101(a)(38)). Every other territory keeps its own immigration (Hong Kong, Bermuda, Guam's own visa waiver),
 * so it counts its visits apart.
 */
const ONE_BORDER: Record<string, string> = { PR: 'US', VI: 'US' };
const borderOf = (c: string) => ONE_BORDER[c] ?? c;
/** Whether two countries are one place to the border: within the Schengen area, or one state's admission. */
const sameArea = (a: string, b: string) => borderOf(a) === borderOf(b) || (SCHENGEN_AREA.has(a) && SCHENGEN_AREA.has(b));
/** The warning comes this many days before a visit's last day (game calibration). */
export const STAY_WARNING_DAYS = 7;

export interface StayLimit {
  /** Where the days are counted, as a sentence says it: "the Schengen area", "the United States". */
  area: string;
  /** Whether a country's days count toward it. */
  counts: (country: string) => boolean;
  days: number;
  /** A rolling window: `days` in any `within`. Without one, each visit may last `days`, or `months`. */
  within?: number;
  months?: number;
  basis: string;
}

/** Whether you may stay in `country` as long as you like: a citizen, living there, a work visa there, or free movement. */
const mayStay = (state: GameState, country: string) => isCitizen(state, country) || livesIn(state) === country || !!permitIn(state, country) || !!freeMovement(state, country);

/** The visit record of your best passport for `country`, as `entryRight` chooses it, or nothing where none is kept. */
function bestVisit(state: GameState, country: string): { n: string; r: Visit } | undefined {
  const rules = citizenships(state).map((n) => ({ n, r: visitRule(n, country) })).filter((x): x is { n: string; r: Visit } => x.r !== undefined && x.r !== 'home');
  return rules.sort((a, b) => ENTRY_ORDER.indexOf(a.r.entry) - ENTRY_ORDER.indexOf(b.r.entry))[0];
}

/** How long a visit to `country` may last, and where its days are counted; nothing where you may stay, or no limit is kept. */
export function stayLimit(state: GameState, country: string): StayLimit | undefined {
  if (mayStay(state, country)) return undefined;
  // Days with the right to stay (a stay marked `free`) don't count: a resident of one Schengen state visits the others.
  if (SCHENGEN_AREA.has(country)) return { area: 'the Schengen area', counts: (c) => SCHENGEN_AREA.has(c), days: 90, within: 180, basis: 'the Schengen Borders Code, which allows 90 days in any 180 across all the Schengen states' };
  const v = bestVisit(state, country);
  if (!v || (!v.r.days && !v.r.months)) return undefined;
  const border = borderOf(country);
  const counts = (c: string) => borderOf(c) === border;
  const basis = `the visit rules for your passport from ${the(v.n)}`;
  if (v.r.days && v.r.within) return { area: the(border), counts, days: v.r.days, within: v.r.within, basis };
  if (v.r.days) return { area: the(border), counts, days: v.r.days, basis };
  return { area: the(border), counts, days: Math.round(v.r.months! * 30.44), months: v.r.months, basis };
}

const dayOf = (t: number) => dateKey(t, 'UTC');
const startOf = (key: string) => Date.parse(`${key}T00:00:00Z`);
const addMonths = (t: number, n: number) => { const d = new Date(t); d.setUTCMonth(d.getUTCMonth() + n); return d.getTime(); };
const daysBetween = (a: string, b: string) => Math.round((startOf(b) - startOf(a)) / DAY);

/** Your stays, oldest first: the first from the story's start (`startStays`). */
export const stays = (state: GameState): Stay[] => state.stays ?? [];
const openStay = (state: GameState): Stay | undefined => stays(state).find((s) => s.until === undefined);
const keptStays = (state: GameState): Stay[] => (state.stays ??= []);

/**
 * The first stay, where you are: a new story's from its start, and a story begun before November 16, 2026 from the day it
 * is opened, as no earlier day is known.
 */
export function startStays(state: GameState): void {
  if (state.stays) return;
  const country = getPlace(state.locationId).country;
  state.stays = [{ country, from: state.now, ...(mayStay(state, country) ? { free: true } : {}) }];
  watchStay(state);
}

/** The days, by date, you were (and, staying on, will be to `through`) where `limit` counts them as a visitor's. */
function visitDays(state: GameState, limit: StayLimit, through: string): Set<string> {
  const out = new Set<string>();
  for (const s of stays(state)) {
    if (s.free || !limit.counts(s.country)) continue;
    const last = s.until === undefined ? through : dayOf(s.until);
    for (let d = dayOf(s.from); d <= last && d <= through; d = addDaysToKey(d, 1)) out.add(d);
  }
  return out;
}
/** The days of `days` in the `within` days ending on `end`, that day included. */
const inWindow = (days: Set<string>, end: string, within: number) => { let n = 0; for (let i = 0; i < within; i++) if (days.has(addDaysToKey(end, -i))) n++; return n; };

export interface StayStatus { limit: StayLimit; used: number; lastDay: string; over: boolean }

/** Where you stand on the visit you're on: its days used, the last day you may stay, and whether you're past it. */
export function stayStatus(state: GameState): StayStatus | undefined {
  const here = openStay(state);
  if (!here || here.free) return undefined;
  const limit = stayLimit(state, here.country);
  if (!limit) return undefined;
  const today = dayOf(state.now);
  if (limit.within) {
    const end = addDaysToKey(today, limit.within + 1);
    const ahead = visitDays(state, limit, end);
    // Staying on, the last day is the one before the first whose window holds more days than the limit.
    let d = today;
    while (inWindow(ahead, d, limit.within) <= limit.days && d < end) d = addDaysToKey(d, 1);
    const used = inWindow(ahead, today, limit.within);
    return { limit, used, lastDay: addDaysToKey(d, -1), over: used > limit.days };
  }
  // Each visit on its own: counted from the day you arrived in the place, however many of its territories you've been to.
  const all = stays(state);
  let i = all.indexOf(here);
  while (i > 0 && !all[i - 1]!.free && limit.counts(all[i - 1]!.country) && all[i - 1]!.until === all[i]!.from) i--;
  const first = dayOf(all[i]!.from);
  const lastDay = limit.months ? dayOf(addMonths(startOf(first), limit.months) - DAY) : addDaysToKey(first, limit.days - 1);
  return { limit, used: daysBetween(first, today) + 1, lastDay, over: today > lastDay };
}

/** The first day you may begin a visit to `country` where its days in any window are used up; nothing where you may today. */
export function nextEntry(state: GameState, country: string): { day: string; used: number; limit: StayLimit } | undefined {
  const limit = stayLimit(state, country);
  if (!limit?.within) return undefined;
  const today = dayOf(state.now);
  const past = visitDays(state, limit, today);
  if (inWindow(past, today, limit.within) < limit.days) return undefined;
  // A visit may begin on a day whose window, that day included, has a day left.
  let d = addDaysToKey(today, 1);
  while (inWindow(past, d, limit.within) >= limit.days) d = addDaysToKey(d, 1);
  return { day: d, used: inWindow(past, today, limit.within), limit };
}

export const overstays = (state: GameState): Overstay[] => state.overstays ?? [];
/** An overstay's days: from its first day over to the day you left (or today, while it goes on), both counted. */
export const overstayDays = (o: Overstay, now: number) => daysBetween(dayOf(o.from), dayOf(o.left ?? now)) + 1;

/** The United States' bars after unlawful presence (8 U.S.C. 1182(a)(9)(B)(i)): ten years past a year, three past 180 days. */
export const US_BARS = [{ over: 364, years: 10 }, { over: 180, years: 3 }] as const;
/** The United Kingdom's: an overstay of more than 30 days, left voluntarily, is refused entry for 12 months (Part 9, 9.8.7). */
export const UK_OVERSTAY = { overDays: 30, months: 12 } as const;

/** Whether an overstay you left bars you from `country`, and until when, by its law; nothing where its law fixes none. */
export function barredFrom(state: GameState, country: string): { until: number; why: string } | undefined {
  const nat = borderOf(country);
  for (const o of overstays(state)) {
    if (o.left === undefined || borderOf(o.country) !== nat) continue;
    const days = overstayDays(o, state.now);
    const bar = nat === 'US' ? US_BARS.find((b) => days > b.over) : undefined;
    if (bar && addMonths(o.left, bar.years * 12) > state.now) {
      const until = addMonths(o.left, bar.years * 12);
      return { until, why: `You overstayed in the United States by ${days} days. Its law bars you for ${bar.years} years from the day you left, until ${dayOf(until)}.` };
    }
    if (nat === 'GB' && days > UK_OVERSTAY.overDays && addMonths(o.left, UK_OVERSTAY.months) > state.now) {
      const until = addMonths(o.left, UK_OVERSTAY.months);
      return { until, why: `You overstayed in the United Kingdom by ${days} days. Its rules refuse you entry for ${UK_OVERSTAY.months} months from the day you left, until ${dayOf(until)}.` };
    }
  }
  return undefined;
}

/** Whether you've ever overstayed in the United States: the Visa Waiver Program admits nobody who has (8 U.S.C. 1187(a)(7)). */
const overstayedInUS = (state: GameState) => overstays(state).some((o) => borderOf(o.country) === 'US');

/** As you arrive in another country: the stay before ends, a new one begins, and an overstay ends if you've left its place. */
function recordArrival(state: GameState, to: string): void {
  const list = keptStays(state);
  const open = list.find((s) => s.until === undefined);
  if (open?.country === to) return;
  if (open) open.until = state.now;
  list.push({ country: to, from: state.now, ...(mayStay(state, to) ? { free: true } : {}) });
  for (const o of state.overstays ?? []) if (o.left === undefined && !sameArea(o.country, to)) o.left = state.now;
  watchStay(state);
}

/**
 * Where your right to stay changes while you're there (you move there, or a work visa is issued or runs out), the stay you
 * were on ends today and another begins with the right as it now is: a visitor's days before it still count.
 */
function restartStay(state: GameState): void {
  const list = keptStays(state);
  const open = list.find((s) => s.until === undefined);
  if (!open || !!open.free === mayStay(state, open.country)) return;
  open.until = state.now;
  list.push({ country: open.country, from: state.now, ...(mayStay(state, open.country) ? { free: true } : {}) });
  watchStay(state);
}

/** Watch the visit's last day: a warning a week before it (or now, if that's sooner), and the overstay from the day after. */
function watchStay(state: GameState): void {
  const here = openStay(state);
  const st = stayStatus(state);
  if (!here || !st) return;
  const key = `${here.country}:${here.from}`;
  schedule(state, Math.max(startOf(addDaysToKey(st.lastDay, -(STAY_WARNING_DAYS - 1))), state.now), 'stay-limit', { country: here.country, from: here.from, kind: 'warn' }, { attention: 'notify', priority: 55, id: `stay-warn:${key}` });
  schedule(state, Math.max(startOf(addDaysToKey(st.lastDay, 1)), state.now), 'stay-limit', { country: here.country, from: here.from, kind: 'over' }, { attention: 'notify', priority: 55, id: `stay-over:${key}` });
}

/** How a visit's limit reads in a sentence: "90 days in any 180", "6 months a visit". */
export const limitWords = (l: StayLimit) => (l.within ? `${l.days} days in any ${l.within}` : l.months ? `${l.months} months a visit` : `${l.days} days a visit`);

/** Where you are, and how long you may stay there, as Your Papers says it. */
export function stayNow(state: GameState): string {
  const here = openStay(state);
  if (!here) return '';
  const name = the(here.country);
  const st = stayStatus(state);
  if (!st) return mayStay(state, here.country) ? `You're in ${name}, where you have the right to stay.` : `You're in ${name}. The game has no record of how long a visit there may last.`;
  if (st.over) return `You're in ${name}, overstaying: your visit to ${st.limit.area} ended on ${st.lastDay}. Leave to end it.`;
  return st.limit.within
    ? `You're in ${name} as a visitor: ${st.used} of the ${st.limit.days} days in any ${st.limit.within} that ${st.limit.area} allows are used. You may stay until ${st.lastDay}.`
    : `You're in ${name} as a visitor, on day ${st.used} of a visit that may last ${limitWords(st.limit).replace(' a visit', '')}. You may stay until ${st.lastDay}.`;
}

registerHandler('stay-limit', (state, ev) => {
  const here = openStay(state);
  // Only while the stay it was set for goes on as a visit: left, or with the right to stay since, it says nothing.
  if (!here || here.country !== ev.payload.country || here.from !== ev.payload.from) return { suppressInterrupt: true };
  const st = stayStatus(state);
  if (!st) return { suppressInterrupt: true };
  if (ev.payload.kind === 'warn') {
    if (st.over) return { suppressInterrupt: true };
    const message = `You may stay in ${st.limit.area} until ${st.lastDay} (${limitWords(st.limit)}, by ${st.limit.basis}). Leave by then, or you'll be overstaying.`;
    addLog(state, message, 'warning', { route: { view: 'papers' } });
    return { message };
  }
  if (!st.over) return { suppressInterrupt: true };
  if (overstays(state).some((o) => o.left === undefined)) return { suppressInterrupt: true };
  (state.overstays ??= []).push({ country: here.country, area: st.limit.area, from: startOf(addDaysToKey(st.lastDay, 1)) });
  // A visitor visa or travel authorization for the United States you hold is void from the day you overstay
  // (8 U.S.C. 1202(g)).
  const voided = borderOf(here.country) === 'US' ? applications(state).filter((a) => a.kind === 'visa' && borderOf(a.country) === 'US' && a.stage === 'issued') : [];
  for (const a of voided) { a.stage = 'expired'; a.expiresAt = state.now; }
  const law = borderOf(here.country) === 'US'
    ? `${voided.length ? ` Your ${voided.map((a) => a.route).join(' and ')} is void.` : ''} The United States bars a visitor who overstays more than 180 days for three years after they leave, and one who overstays a year for ten; and the Visa Waiver Program never admits them again.`
    : borderOf(here.country) === 'GB'
      ? ' The United Kingdom refuses entry for 12 months to a visitor who overstayed more than 30 days.'
      : ' Each state decides for itself whether to fine or ban you; the game records the overstay and nothing more.';
  const message = `Your visit to ${st.limit.area} ended on ${st.lastDay}, and you're still here: you're overstaying.${law} Leave to end it.`;
  addLog(state, message, 'warning', { route: { view: 'papers' } });
  return { message };
});

onArrival((state, _from, to) => recordArrival(state, to.country));

/**
 * Why entering the country a trip goes to is refused, or null (from November 14, 2026; until then travel asked nothing
 * of your papers). A trip within the country you're in asks nothing. Entering asks what Your Papers says: free entry, a
 * visa on arrival, a visa or work visa you hold, or a place the records don't cover, let you in; a visa you need and
 * don't hold, or living there without the right to, doesn't.
 */
export function entryRefusal(state: GameState, country: string): string | null {
  const here = getPlace(state.locationId).country;
  if (here === country) return null;
  const e = entryRight(state, country);
  if (e.kind === 'home' || e.kind === 'lives') return null;
  // An overstay's bar, and a visit's days used up (from November 16, 2026). Within the Schengen area, or between one
  // state's territories, there's no border to refuse you at.
  if (!sameArea(here, country)) {
    const bar = barredFrom(state, country);
    if (bar) return bar.why;
    const next = nextEntry(state, country);
    if (next) return `You've spent ${next.used} of the ${next.limit.days} days in any ${next.limit.within} that ${next.limit.area} allows a visitor. You can enter again from ${next.day}.`;
  }
  if (e.kind === 'needs' && e.entry !== 'arrival') return `${e.why} Apply under Your Papers before you travel.`;
  if (e.kind === 'unpermitted') return `${e.why}`;
  return null;
}
onTravelCheck((state, to) => entryRefusal(state, to.country));

registerHandler('papers-decision', (state, ev) => {
  const a = applications(state).find((x) => x.id === ev.payload.id);
  if (!a || a.stage !== 'applied') return { suppressInterrupt: true };
  const t = a.kind === 'visa' ? visaFor(state, a.country) : permitTerms(a.country, a.route);
  // Refused by its chance, drawn once for this application (from November 14, 2026; until then always granted). The fee
  // isn't returned; you may apply again.
  a.refusal = refusalChance(state, a.kind, a.country);
  if (stream(state.seed, 'papers-decision', a.id)() < a.refusal.chance) {
    a.stage = 'refused';
    const home = a.all && a.country === livesIn(state) && !permitIn(state, a.country);
    const message = `Your ${a.route} for ${the(a.country)} was refused. The fee isn't returned; you may apply again.${home ? ' Until a work visa is issued you can\'t work there, and once the one you hold runs out you live there without the right to.' : ''}`;
    addLog(state, message, 'warning', { route: { view: 'papers' } });
    return { message };
  }
  a.stage = 'issued';
  a.issuedAt = state.now;
  if (t.stayDays) a.expiresAt = state.now + t.stayDays * DAY;
  if (a.expiresAt) schedule(state, a.expiresAt, 'papers-expiry', { id: a.id }, { attention: 'notify', priority: 55, id: `papers-expiry:${a.id}` });
  restartStay(state);
  const message = `Your ${a.route} for ${the(a.country)} was issued.${a.expiresAt ? ` It's good until ${dateKey(a.expiresAt, 'UTC')}.` : ''}${a.all && a.expiresAt ? ` You can renew it from ${dateKey(a.expiresAt - (t.days + RENEW_MARGIN_DAYS) * DAY, 'UTC')}.` : ''}`;
  addLog(state, message, 'personal', { route: { view: 'papers' } });
  return { message };
});

registerHandler('papers-expiry', (state, ev) => {
  const a = applications(state).find((x) => x.id === ev.payload.id);
  if (!a || a.stage !== 'issued') return { suppressInterrupt: true };
  a.stage = 'expired';
  restartStay(state);
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
