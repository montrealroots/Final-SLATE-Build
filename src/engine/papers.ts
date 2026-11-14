// Your papers (from November 14, 2026; the owner's command, 4 "Papers"). Five things are kept apart, as the command asks:
// - a passport, and whether it is in force (1221's documents in the bank world: engine/bankworld/systems/documents.ts);
// - permission to enter a country, and how long a visit may last (SLATE-REBUILD's visits records, src/data/papers);
// - permission to stay longer (a residence document in the bank world; none is applied for here);
// - permission to work (SLATE-REBUILD's work records: free movement, a short engagement's days, or a permit's route);
// - permission for the work itself. The work records are what a performer needs. Acting is covered; directing and
//   producing are not, and need a right to work generally (citizenship, free movement or where you live).
//
// An application runs eligibility → the documents it needs → applying → the fee paid from your bank → the review → the
// decision → the document issued → its use → its expiry. It is offered only where the records give its fee and its time:
// 1221's visitor visas (content/visas.ts) for the pairs it researched. Nothing is invented: a route whose fee or time the
// records lack says exactly what is missing, and the game takes it no further.
//
// Until November 14, 2026 (the owner's v8 package, 05) a work permit could be applied for anywhere, decided after 30 days
// where its time wasn't recorded and lasting a year: both figures the game's own. Those went with that day. A permit a
// save already holds is kept until its date.
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
import { postToBank } from './bank';
import type { GameState } from './types';

// ---------------- the records ----------------

type Entry = 'free' | 'eta' | 'evisa' | 'arrival' | 'visa';
interface Visit { entry: Entry; days?: number; within?: number; months?: number }
interface VisitList { passports: Record<string, Visit>; others: Visit }
const VISITS = visitsData as unknown as { groups: Record<string, VisitList>; countries: Record<string, VisitList | { group: string; passports?: Record<string, Visit> }> };

interface WorkRule { right: 'free' | 'permit'; route?: string; days?: number; within?: number; from?: string; only?: string }
interface WorkList { groups?: string[]; passports: Record<string, WorkRule>; others: WorkRule }
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
/** Where your story is lived: the game's own assumption that you may live and work there (said as one, never "ready"). */
const livesIn = (state: GameState) => getPlace(state.character.livesIn ?? state.locationId).country;

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
  // Where your story is lived, you may stay: the game's assumption, said as one, as it is for work (from November 14, 2026:
  // until then the country you live in asked you for a visa to visit it).
  if (livesIn(state) === country) return { kind: 'lives', why: `You live in ${the(country)}: the game takes where your story is lived as where you may stay. That is its assumption, not a checked permission.` };
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
  | { can: true; why: string; assumed?: true }
  | { can: false; why: string; route: string | null; days: number | null; missing: string[] };

function workRule(passport: string, country: string): WorkRule | 'home' | undefined {
  if (nationality(passport) === nationality(country)) return 'home';
  const rules = WORK.countries[country];
  if (!rules) return undefined;
  return rules.passports[passport] ?? (rules.groups ?? []).map((g) => WORK.groups[g]?.passports[passport]).find(Boolean) ?? rules.others;
}

/** Days you worked in `country` (a shoot day you were called to and there for), by day. */
const workedDays = (state: GameState, country: string): string[] => state.papersWorked?.[country] ?? [];

/** Whether you may do `activity` in `country` now, and why: citizenship, free movement, a short engagement, or what's missing. */
export function workRight(state: GameState, country: string, activity: Activity = 'act'): WorkRight {
  if (isCitizen(state, country)) return { can: true, why: `You are a citizen of ${the(country)}.` };
  if (livesIn(state) === country) return { can: true, assumed: true, why: `You live in ${the(country)}: the game takes where your story is lived as where you may live and work. That is its assumption, not a checked permission.` };
  const legacy = (state.permits ?? []).find((p) => p.country === country && p.status === 'granted' && (p.expiresAt ?? 0) > state.now);
  if (legacy && activity === 'act') return { can: true, why: `Your ${legacy.route}, granted before November 14, 2026, lets you work in ${the(country)} until it expires.` };
  const rules = citizenships(state).map((n) => ({ n, r: workRule(n, country) })).filter((x): x is { n: string; r: WorkRule | 'home' } => x.r !== undefined);
  if (!rules.length) return { can: false, why: `The game has no record of who may work in ${the(country)}.`, route: null, days: null, missing: ['who may work there'] };
  const free = rules.find((x) => x.r === 'home' || (x.r as WorkRule).right === 'free');
  if (free) return { can: true, why: free.r === 'home' ? `Your passport is ${the(country)}'s own.` : `Your passport from ${the(free.n)} gives you the right to live and work in ${the(country)}.` };
  const r = rules[0].r as WorkRule;
  const route = r.route ?? null;
  // The records are what a performer needs: acting only. Directing or producing there needs a right to work generally.
  if (activity !== 'act') return { can: false, why: `To work in ${the(country)} other than as a performer you need a general right to work there, which you don't have. The game's record covers performers: ${route ?? 'its route isn\'t recorded'}.`, route: null, days: null, missing: [`what ${ACTIVITY_WORDS[activity]} there needs`] };
  if (r.days) {
    const used = workedDays(state, country).filter((d) => !r.within || d >= dateKey(state.now - r.within * DAY, 'UTC')).length;
    if (used < r.days) return { can: true, why: `A short engagement: ${capital(the(country))} lets a performer work up to ${r.days} days${r.within ? ` in any ${r.within}` : ''} without ${route ?? 'a permit'}. You have used ${used}.` };
  }
  return { can: false, why: `To act in ${the(country)} you need ${route ?? 'a permit whose route isn\'t recorded'}${r.days ? `: the ${r.days} days a short engagement may be worked without it are used` : ''}.`, route, days: null, missing: permitMissing() };
}

/** What the records lack for any work permit route: its fee and how long a decision takes (none is recorded). */
const permitMissing = () => ['the permit\'s fee', 'how long the decision takes'];

/** Records a day worked in a country, for the short engagement's count. Called by the shoot when you're on set. */
export function recordWorkDay(state: GameState, country: string): void {
  const day = dateKey(state.now, 'UTC');
  const list = ((state.papersWorked ??= {})[country] ??= []);
  if (!list.includes(day)) list.push(day);
}

// ---------------- applications ----------------

export interface PaperApplication {
  id: string;
  kind: 'visa';
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

/** The visitor visa the records give a fee and a time for, for your passport and `country`, or nothing. */
function visaRule(state: GameState, country: string): { rule: VisaRule; passport: string } | undefined {
  for (const n of citizenships(state)) {
    const rule = VISAS[`${country}<${n}`];
    if (rule) return { rule, passport: n };
  }
  return undefined;
}

export type ApplicationCheck =
  | { ok: true; rule: VisaRule; needs: string[]; feeText: string }
  | { ok: false; why: string; missing?: string[] };

/** Whether you may apply for the visa `country` asks of you, what it needs, and what it costs; or exactly why not. */
export function visaCheck(state: GameState, country: string): ApplicationCheck {
  const e = entryRight(state, country);
  if (e.kind !== 'needs') return { ok: false, why: e.kind === 'unknown' ? e.why : `You don't need a visa: ${e.why}` };
  if (applications(state).some((a) => a.country === country && a.stage === 'applied')) return { ok: false, why: 'Your application is being decided.' };
  const v = visaRule(state, country);
  if (!v) return { ok: false, why: 'The records don\'t give its fee or how long a decision takes, so the game can\'t take an application.', missing: ['the fee', 'how long the decision takes'] };
  const passport = passportFor(state, state.now + v.rule.days * DAY);
  if (!passport) return { ok: false, why: 'You need a passport in force until the decision, at least. Apply for one first.' };
  return { ok: true, rule: v.rule, needs: [`Your ${passport.name ?? 'passport'}, in force until ${dateKey(passport.expiresAt ?? state.now, 'UTC')}`], feeText: `${v.rule.fee} ${v.rule.currency}` };
}

/** Apply for a visa: the fee paid from your bank now, at the day's reference rate; decided after its recorded days. */
export function applyForVisa(state: GameState, country: string): PaperApplication {
  const c = visaCheck(state, country);
  if (!c.ok) throw new Error(c.why);
  const passport = passportFor(state, state.now + c.rule.days * DAY)!;
  const minor = Math.round(c.rule.fee * 100);
  const usd = c.rule.currency === 'USD' ? minor : exchange(minor, c.rule.currency, 'USD');
  if (usd === undefined) throw new Error(`No exchange rate for ${c.rule.currency} is recorded by today, so the fee can't be paid.`);
  const id = newId(state, 'pa');
  postToBank(state, 'papers', -usd / 100, `${c.rule.name}: The Fee`, `papers:${id}`);
  const a: PaperApplication = {
    id, kind: 'visa', country, route: c.rule.name, stage: 'applied', passportId: passport.id,
    fee: { minor, currency: c.rule.currency, paidUsdMinor: usd }, appliedAt: state.now, decideAt: state.now + c.rule.days * DAY,
  };
  (state.paperApplications ??= []).push(a);
  schedule(state, a.decideAt, 'papers-decision', { id }, { attention: 'notify', priority: 55, id: `papers-decision:${id}` });
  addLog(state, `You applied for a ${c.rule.name} for ${the(country)} and paid its fee. It is decided in ${c.rule.days} days, as recorded.`, 'personal', { route: { view: 'papers' } });
  return a;
}

registerHandler('papers-decision', (state, ev) => {
  const a = applications(state).find((x) => x.id === ev.payload.id);
  if (!a || a.stage !== 'applied') return { suppressInterrupt: true };
  const v = visaRule(state, a.country);
  // Granted: the game models no grounds for refusal, and says so rather than inventing a chance of one.
  a.stage = 'issued';
  a.issuedAt = state.now;
  if (v?.rule.years) a.expiresAt = state.now + Math.round(v.rule.years * 365.25) * DAY;
  else if (v?.rule.validDays) a.expiresAt = state.now + v.rule.validDays * DAY;
  if (a.expiresAt) schedule(state, a.expiresAt, 'papers-expiry', { id: a.id }, { attention: 'notify', priority: 55, id: `papers-expiry:${a.id}` });
  const message = `Your ${a.route} for ${the(a.country)} was issued.${a.expiresAt ? ` It's good until ${dateKey(a.expiresAt, 'UTC')}.` : ''}`;
  addLog(state, message, 'personal', { route: { view: 'papers' } });
  return { message };
});

registerHandler('papers-expiry', (state, ev) => {
  const a = applications(state).find((x) => x.id === ev.payload.id);
  if (!a || a.stage !== 'issued') return { suppressInterrupt: true };
  a.stage = 'expired';
  const message = `Your ${a.route} for ${the(a.country)} has expired. Apply again before your next visit.`;
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

/** Why a work permit can't be applied for (always, now: no route's fee or decision time is recorded). */
export function permitRefusal(state: GameState, country: string): string | null {
  const w = workRight(state, country);
  if (w.can) return w.why;
  return `${w.why} The records don't give ${w.missing.join(' or ')}, so the game can't take an application.`;
}
export function applyForPermit(state: GameState, country: string): never {
  throw new Error(permitRefusal(state, country) ?? 'You may already work there.');
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

export interface PassportOffer { issuer: string; route: PRoute; fee: { minor: number; currency: string } | null; validYears: number | null; pages?: number; missing: string[] }

/** The ways your citizenship's office issues a passport to you now (SLATE-REBUILD's `passportOffers`), each with what's missing. */
export function passportOffers(state: GameState, need?: 'renewal' | 'replacement'): PassportOffer[] {
  const country = citizenships(state)[0];
  const entry = country ? PASSPORT_RECORDS[country] : undefined;
  if (!country || !entry) return [];
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
      const missing = [...(minor === null ? ['the fee'] : []), ...(route.within === null ? ['how long it takes'] : [])];
      out.push({ issuer: 'issuedBy' in entry ? entry.issuedBy : country, route, fee: minor === null ? null : { minor, currency }, validYears: b.validYears, ...(b.pages ? { pages: b.pages } : {}), missing });
    }
  }
  return out;
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
  if (o.missing.length) throw new Error(`The records don't give ${o.missing.join(' or ')} for this route, so the game can't take an application.`);
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
  addLog(state, `You applied for your passport from ${the(o.issuer)} and paid its fee. It should be ready by ${dateKey(readyAt, 'UTC')}, as recorded.`, 'personal', { route: { view: 'papers' } });
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
