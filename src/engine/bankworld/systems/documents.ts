/**
 * SLATE — the papers a person holds, and what they let them do
 * (docs/WORLD.md, stage 1). From 2026-09-29.
 *
 * Every document is a record: its kind, who issued it, its number, when it
 * was issued and when it runs out, and whether it's pending, valid, lost or
 * canceled. Kept apart as the law keeps them apart:
 *
 * - a passport proves identity and citizenship for crossing borders
 *   (\`content/passports.ts\`);
 * - a travel authorization (the US's ESTA, the UK's ETA, Canada's eTA, and
 *   others) or a visa lets a citizen of one country visit another for a short
 *   stay, as the destination's rule for that citizenship says
 *   (\`content/entry.ts\`); it is tied to the passport it was issued on, and
 *   ends with it;
 * - a driving license said where its holder may drive, by the license's
 *   issuer's and the road's jurisdiction's rules (\`content/licenses.ts\`), for
 *   the car and the travel that went in the scope reset of 2026-10-09; it's
 *   kept as identity, and its look still says the rule, which decides nothing.
 *
 * What SLATE doesn't have a rule for, it says it doesn't have, and doesn't
 * let the action through on a guess.
 */

import { VISAS } from '../content/visas';
import { waitsOnVisit } from './papervisits';
import type { Simulation } from '../core/simulation';
import { CommandError } from '../core/simulation';
import type { Person } from '../domain/model';
import { MS_DAY, MS_HOUR, formatDate, type Instant } from '../core/time';
import { formatMoney, saveCurrency, type Money } from '../core/money';
import { exchange } from '../content/currency';
import { CITIES, COUNTRIES } from '../content/geography';
import { countryOfIso } from '../content/bankdays';
import { ENTRY, type Authorization, type EntryRule } from '../content/entry';
import { LICENSES, type LicenseRule } from '../content/licenses';
import { payFromBank } from './spending';
import { realIdShare } from '../content/identity';
import { PASSPORTS, type PassportRule } from '../content/passports';
import { PASSPORTS_ABROAD, US_RENEWAL } from '../content/passportsabroad';

export type DocumentKind = 'passport' | 'authorization' | 'visa' | 'license' | 'idp' | 'permit' | 'idcard';

/**
 * What can be reported lost or stolen: the cards and books a person carries (from 2026-10-10). A visa, a permit or an
 * authorization is a status the government holds, and losing its paper doesn't end it; until then reporting one lost
 * did, and a lost OPT stopped counting its days without work, and a lost residence freed a fresh grant.
 */
export const LOSABLE: ReadonlySet<DocumentKind> = new Set(['passport', 'license', 'idp', 'idcard']);

export interface PersonDocument {
  id: string;
  /** Lost to a theft, as reported, and a police report filed for it (`documents.police_report`, from 2026-10-03). */
  stolen?: true;
  policeReport?: Instant;
  kind: DocumentKind;
  /** Who issued it: a country (ISO 3166 alpha-2) for a passport, an authorization or a visa; a licensing jurisdiction's id (\`content/licenses.ts\`) for a license. */
  issuer: string;
  /** What the issuer calls it. */
  name: string;
  number: string;
  status: 'pending' | 'valid' | 'lost' | 'cancelled';
  appliedAt?: Instant;
  /** When a pending document is issued. */
  readyAt?: Instant;
  issuedAt?: Instant;
  expiresAt?: Instant;
  /** An authorization's or a visa's destination, and the passport it was issued on. */
  destination?: string;
  passportId?: string;
  /** A license's stage on a graduated path, and whether its holder may drive with nobody beside them; a license without them is full. */
  stage?: 'learner' | 'provisional' | 'full';
  alone?: boolean;
  /**
   * An American license or ID card that meets REAL ID (from 2026-09-30): a starting license's drawn at its state's
   * share (`realIdShare`, `content/identity.ts`), and every American state ID card SLATE issues to a citizen
   * (`systems/identity.ts`). A non-citizen's is non-verified, false (from 2026-10-16: until then every card was marked).
   * Its page says so, and nothing else reads it. The TSA's rule (`tsaAccepts`) read it for the checkpoint until the
   * scope reset of 2026-10-09 and for an ID card's page until 2026-10-10, and the TSA's date of 2025-05-07 in
   * `content/identity.ts` went on 2026-10-12; until then this said the TSA asks it, citing `systems/identity.ts`.
   */
  realId?: boolean;
  /** A license's class, where it isn't a car's: the motorcycle class (from 2026-09-30). */
  vehicleClass?: VehicleClass;
  /** A permission to work tied to one job, and days without work counted against it (`systems/permission.ts`). */
  bookingId?: string;
  idleDays?: number;
  /**
   * OPT's days with employment counted so far (from 2026-10-21; by the day from brief 22, 2026-10-22, `settleOpt` in
   * `systems/permission.ts`: a day inside a job that has begun, where until then it was any day an engagement was booked
   * for, `daysWorkedIn`).
   */
  workedDays?: number;
  /**
   * OPT's count by the day (from 2026-10-22, the owner's brief 22): the start of the first New York day not yet counted.
   * A save from before kept none and counted by weeks; its count goes on from the day its weeks reached (`countedTo`).
   */
  countedTo?: number;
  /** When a permission was ended early for a violation, which leaves no grace after it (from 2026-10-01). */
  endedAt?: number;
  /** A route to residence it was granted on (`systems/residence.ts`, from 2026-09-30). */
  route?: import('./residence').Route;
  /** The interview or biometrics its decision waits on (`systems/papervisits.ts`, from 2026-10-06). */
  visit?: import('./papervisits').PaperVisit;
}

/** A person's papers, kept on them. */
export function documentsOf(person: Person): PersonDocument[] {
  person.documents ??= [];
  return person.documents;
}

/** Whether a document can be shown on a day: issued, not lost or canceled, not run out. */
export function inForce(doc: PersonDocument, at: Instant): boolean {
  return doc.status === 'valid' && (doc.issuedAt ?? 0) <= at && (doc.expiresAt === undefined || doc.expiresAt > at);
}

/**
 * The countries a person is a citizen of, ISO codes: by birth, and any they've
 * naturalized in since (`systems/citizenship.ts`, from 2026-09-30). Travel
 * is still on the passport of the first; the rest give the right to live,
 * work, and claim there.
 */
export function citizenshipsOf(person: Person): string[] {
  const own = isoOfCountry(person.citizenshipId);
  return [...(own ? [own] : []), ...(person.naturalized ?? []).map((n) => n.iso)];
}

/** Whether they're a citizen of a country, by birth or naturalized. */
export const citizenOf = (person: Person, iso: string): boolean => citizenshipsOf(person).includes(iso);

/** The passport they'd travel on: their own country's, in force, the longest-lasting. */
export function passportOf(person: Person, at: Instant): PersonDocument | undefined {
  const own = isoOfCountry(person.citizenshipId);
  return documentsOf(person)
    .filter((d) => d.kind === 'passport' && inForce(d, at) && (own === undefined || d.issuer === own))
    .sort((a, b) => (b.expiresAt ?? 0) - (a.expiresAt ?? 0))[0];
}

/** A country's ISO 3166 alpha-2 code, from SLATE's country id. */
export function isoOfCountry(countryId: string | undefined): string | undefined {
  if (!countryId) return undefined;
  return COUNTRIES.get(countryId)?.iso2?.toUpperCase() ?? (countryId.length === 2 ? countryId.toUpperCase() : undefined);
}

/** The country a town is in, as ISO alpha-2. */
export function isoOfCity(cityId: string): string | undefined {
  const city = CITIES.get(cityId);
  return city ? isoOfCountry(city.countryId) : undefined;
}

/**
 * A moment some years on, by the calendar: a passport issued on 16 February
 * runs out on 16 February, as issuers date them. A term in half-years, as
 * New South Wales's P1 license's eighteen months, goes by months. Until
 * 2026-09-29 a term was 365.25 days a year, and a ten-year passport ran out
 * a day late.
 */
export function addYears(at: Instant, years: number): Instant {
  const d = new Date(at);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + Math.round(years * 12), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
}

/** A country's name as a sentence says it: the United Kingdom, the Netherlands. */
export function theCountry(name: string): string {
  return /^(United |Netherlands|Philippines|Bahamas|Gambia|Maldives|Czech Republic|Dominican Republic|Central African Republic|Democratic Republic|Republic of)/.test(name) ? `the ${name}` : name;
}

/** Days between two instants, rounded up. */
const days = (from: Instant, to: Instant) => Math.ceil((to - from) / MS_DAY);

// ---------------------------------------------------------------------------
// Entering a country
// ---------------------------------------------------------------------------

export interface EntryAnswer {
  ok: boolean;
  /** The rule that applies, where SLATE has one. */
  rule?: EntryRule;
  /** Each thing missing, and how to get it, in the player's words. */
  missing: string[];
  /** What they may do once in: how many days, where the rule says. */
  stay?: string;
}

/**
 * Whether a person may enter a country on a day, for a short visit of some
 * days: their citizenship against the destination's rule, their passport
 * against the destination's validity rule, and the authorization or visa the
 * rule asks. Entering to stay or to work are other permissions, not this one.
 */
export function mayEnter(person: Person, destination: string, at: Instant, stayDays = 7): EntryAnswer {
  const dest = ENTRY[destination];
  const citizenship = isoOfCountry(person.citizenshipId);
  // Britain's id is `uk`, not its code: until 2026-10-17 a British destination was named "GB" here.
  const country = COUNTRIES.get(countryOfIso(destination))?.name ?? destination;
  if (!dest || !citizenship) return { ok: false, missing: [`The game doesn’t have ${country}’s entry rules.`] };
  const rule = dest.citizens[citizenship];
  const theirs = theCountry(COUNTRIES.get(person.citizenshipId ?? '')?.name ?? citizenship);
  if (!rule) return { ok: false, missing: [`The game doesn’t have ${country}’s rule for citizens of ${theirs}.`] };
  const missing: string[] = [];
  const passport = passportOf(person, at);
  const leaving = at + stayDays * MS_DAY;
  if (!passport) {
    missing.push(`You need a passport in force, and you don’t have one${documentsOf(person).some((d) => d.kind === 'passport' && d.status === 'valid') ? ' that hasn’t run out' : ''}. Apply for one under Your Passport.`);
  } else if (rule.status !== 'citizen') {
    const need = leaving + dest.passport.beyondDays * MS_DAY;
    if ((passport.expiresAt ?? Infinity) < need) {
      missing.push(dest.passport.beyondDays
        ? `You need a passport valid ${Math.round(dest.passport.beyondDays / 30)} months past the day you leave ${country}, and yours runs out ${formatDate(passport.expiresAt!, 'UTC')}. Renew it first.`
        : `You need a passport valid for the whole stay, and yours runs out ${formatDate(passport.expiresAt!, 'UTC')}. Renew it first.`);
    }
    if (dest.passport.issuedWithinYears && passport.issuedAt !== undefined && at - passport.issuedAt > dest.passport.issuedWithinYears * 365.25 * MS_DAY) {
      missing.push(`${theCountry(country).replace(/^./, (c) => c.toUpperCase())} asks for a passport issued within the last ${dest.passport.issuedWithinYears} years. Renew it first.`);
    }
  }
  if (rule.status === 'free' || rule.status === 'authorization') {
    if (rule.maxDays !== null && stayDays > rule.maxDays) missing.push(`A visitor may stay ${rule.maxDays} days at most${rule.windowDays ? ` in any ${rule.windowDays}` : ''}, and ${stayDays} days is longer. A longer stay needs a visa or permission to stay.`);
  }
  if (rule.status === 'authorization' && rule.authorization) {
    const auth = dest.authorizations[rule.authorization]!;
    // A visa for the country answers it, and so does permission to work there held in force: SLATE takes an approved
    // O-1 or OPT as the visa its holder travels on, and doesn't model the consulate's stamp ($205, DS-160).
    const visaHeld = documentsOf(person).some((d) => (d.kind === 'visa' || (d.kind === 'permit' && d.bookingId === undefined)) && d.destination === destination && inForce(d, at) && (d.expiresAt ?? Infinity) >= leaving);
    if (auth.live && !visaHeld && !authorizationFor(person, destination, at, leaving)) {
      // Its years in words under ten, as prose writes a number (from 2026-10-20, brief 17: until then "good for 1 year").
      const years = auth.validityYears < 10 ? `${['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][auth.validityYears]} ${auth.validityYears === 1 ? 'year' : 'years'}` : `${auth.validityYears} years`;
      missing.push(`${theCountry(country).replace(/^./, (c) => c.toUpperCase())} asks citizens of ${theirs} for ${auth.name}: ${auth.fee > 0 ? formatFee(auth.fee, auth.currency) : 'no fee'}, applied for online, and good for ${years} or until the passport runs out.`);
    }
  }
  if (rule.status === 'visa') {
    const visa = documentsOf(person).find((d) => (d.kind === 'visa' || (d.kind === 'permit' && d.bookingId === undefined)) && d.destination === destination && inForce(d, at) && (d.expiresAt ?? Infinity) >= leaving);
    if (!visa) missing.push(`${theCountry(country).replace(/^./, (c) => c.toUpperCase())} asks for a visa: ${VISAS[`${destination}<${isoOfCountry(person.citizenshipId)}`]?.name ?? rule.visa ?? 'a visitor visa'}, issued by its consulate.`);
  }
  // Said as sentences after "… would let you in for a week's visit." (from 2026-10-19, brief 15: until then fragments,
  // "As a citizen, as long as you like.", "Free movement: to live and work as well as visit.", "Up to 90 days … as a visitor.").
  const stay = rule.status === 'citizen' ? 'As a citizen, you can stay as long as you like.'
    : rule.status === 'free-movement' ? 'Free movement lets you live and work there, as well as visit.'
      : rule.maxDays !== null ? `A visitor can stay up to ${rule.maxDays} days${rule.windowDays ? ` in any ${rule.windowDays}` : ''}.` : undefined;
  return { ok: missing.length === 0, rule, missing, ...(stay ? { stay } : {}) };
}

// ---------------------------------------------------------------------------
// Crossing a border, and living across one
// ---------------------------------------------------------------------------

// Why a person couldn't go from one town to another across a border (`crossingRefusal`) was asked by the journeys
// until the scope reset of 2026-10-09, and by nothing after it; it went in the connected world that day.

/**
 * Why a person can't make a home in a town's country, or nothing: a citizen
 * may, and so may someone with free movement there (the EU and EEA's, the
 * Common Travel Area's between Ireland and the UK), or someone holding a
 * visa for the country in force, as a student's F-1 lets them live in the
 * United States while they study. Anyone else would need permission to live
 * there, which SLATE doesn't grant yet.
 */
export function residenceRefusal(person: Person, cityId: string, at: Instant): string | undefined {
  const to = isoOfCity(cityId);
  const own = isoOfCountry(person.citizenshipId);
  if (!to || citizenOf(person, to)) return undefined;
  const status = own ? ENTRY[to]?.citizens[own]?.status : undefined;
  if (status === 'citizen' || status === 'free-movement') return undefined;
  if (documentsOf(person).some((d) => d.kind === 'visa' && d.destination === to && inForce(d, at))) return undefined;
  // Permission to work there is permission to live there while it lasts, and an OPT filed in time keeps a student while it's decided.
  // Not a Global Talent visa waiting on its biometrics (from 2026-10-06): it's applied for from abroad, and lets no one in until it's granted.
  if (documentsOf(person).some((d) => d.kind === 'permit' && d.destination === to && d.bookingId === undefined && (inForce(d, at) || (d.status === 'pending' && d.route !== 'global-talent')))) return undefined;
  const there = theCountry(COUNTRIES.get(countryOfIso(to))?.name ?? to);
  return `Living in ${there} needs permission to live there, which you don’t hold. Residence Abroad, on Papers under Permission To Work, shows any route there is.`;
}

/**
 * A photo ID in force: a passport from anywhere, or a license or an ID card. What a bank asks of a new customer
 * (31 CFR 1020.220, the customer identification rule, and its like elsewhere), read by `bank.switch` from 2026-10-09.
 */
export function photoIdOf(person: Person, at: Instant): PersonDocument | undefined {
  return documentsOf(person).find((d) => inForce(d, at) && (d.kind === 'passport' || d.kind === 'license' || d.kind === 'idcard'));
}

/** An authorization in force for a destination, on the passport they'd travel on, through a day. */
export function authorizationFor(person: Person, destination: string, at: Instant, through = at): PersonDocument | undefined {
  const passport = passportOf(person, at);
  // Out of US status once, the Visa Waiver Program is closed for good (INA 217(a)(7)), an ESTA held with it (from 2026-10-01).
  if (destination === 'US' && person.usOutOfStatus !== undefined) return undefined;
  return documentsOf(person).find((d) => d.kind === 'authorization' && d.destination === destination && inForce(d, at)
    && (d.expiresAt ?? Infinity) >= through && d.passportId === passport?.id);
}

function formatFee(fee: number, currency: string): string {
  return formatMoney(Math.round(fee * 100), currency);
}

// How long each authorization took to decide (`DECIDED_IN_HOURS`: ESTAs, ETAs and eTAs within the hour, K-ETA and NZeTA
// 72 hours, Brazil's e-Visa a week, Australia's a day, SLATE's estimate) went with the applications on 2026-10-09.

/** Validity that differs by the traveler's citizenship: Brazil's e-Visa, ten years for Americans, five for Canadians and Australians. */
const VALIDITY_BY_CITIZEN: Readonly<Record<string, Readonly<Record<string, number>>>> = { 'BR/e-Visa': { US: 10, CA: 5, AU: 5 } };

// A charge paid with an authorization (New Zealand's levy, `PAID_BESIDE`) went with the applications on 2026-10-09.

// Why a visa or a travel authorization couldn't be applied for (`visaRefusal`, `authorizationRefusal`) went with
// their applications on 2026-10-09: see `registerDocuments`.

function inSave(sim: Simulation, amount: number, currency: string): Money {
  const cents = Math.round(amount * 100);
  const into = saveCurrency(sim.universe);
  return currency === into ? cents : exchange(cents, currency, into) ?? cents;
}

/** A document number: letters of its kind and a serial made from its record, eight digits. SLATE's own, not an issuer's format. */
export function numberFor(prefix: string, id: string): string {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return `${prefix}${String(h % 1e8).padStart(8, '0')}`;
}

export function registerDocuments(sim: Simulation): void {
  // Applying for a travel authorization (`documents.apply_authorization`) and a visitor's visa
  // (`documents.apply_visa`) went in the connected world of 2026-10-09: each was paid for to cross a border, and since
  // the scope reset nothing crosses one, so each was a fee for a document nothing reads. What a country asks of a
  // citizenship stays on Papers as what it is, the rule (`mayEnter`); one already pending in a save is decided below.
  sim.onSchedule(DECIDED_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId)];
    if (!person) return;
    for (const doc of documentsOf(person)) {
      if (doc.status !== 'pending' || (doc.readyAt ?? Infinity) > s.now) continue;
      // Its interview or biometrics not yet kept, it waits on them (from 2026-10-06, `systems/papervisits.ts`).
      if (waitsOnVisit(doc)) continue;
      issue(s, person, doc);
    }
  });

  sim.onCommand<{ expedite?: boolean }, { readyAt: Instant; fee: Money }>('documents.apply_passport', (p, { sim: s }) => {
    const person = s.player;
    const expedite = Boolean(p?.expedite);
    const no = passportRefusal(person, expedite);
    if (no) throw new CommandError(no);
    const rule = passportRuleFor(person)!;
    // The office's terms where they are: from abroad, or a US renewal by mail (`passportOffice`, from 2026-10-16).
    const office = passportOffice(person, s.now)!;
    const fee = inSave(s, office.fee + (expedite ? office.expedite!.extra : 0), office.currency);
    if (!payFromBank(s, person, fee, `${rule.name}${office.renewal ? `, renewed on Form ${US_RENEWAL.form}` : ''}${expedite ? ', expedited' : ''}`, 'documents')) throw new CommandError(`Your bank can’t cover ${formatMoney(fee, saveCurrency(s.universe))}, so nothing was charged.`);
    const days = expedite ? office.expedite!.days : office.days;
    // Handed over the same day where the office does it: a few hours, SLATE's estimate.
    const readyAt = s.now + (days > 0 ? days * MS_DAY : 3 * MS_HOUR);
    const id = s.nextId('document');
    documentsOf(person).push({ id, kind: 'passport', issuer: isoOfCountry(person.citizenshipId)!, name: rule.name, number: numberFor(isoOfCountry(person.citizenshipId)!, id), status: 'pending', appliedAt: s.now, readyAt });
    s.schedule({ at: readyAt, kind: DECIDED_KIND, label: `${rule.name} Ready`, category: 'system', priority: 20, payload: { personId: person.id } });
    return { readyAt, fee };
  });

  sim.onCommand<{ documentId: string; stolen?: boolean }, { lost: boolean }>('documents.report_lost', (p, { sim: s }) => {
    const doc = documentsOf(s.player).find((d) => d.id === p.documentId);
    // In force, as the screen offers it (from 2026-10-13: until then a document run out was taken too, and a license
    // so reported was replaced with the same past date; found by the second round of that day).
    if (!doc || !inForce(doc, s.now)) throw new CommandError('That isn’t a document you hold in force.');
    if (!LOSABLE.has(doc.kind)) throw new CommandError('You can’t report a status lost. It stays in force whatever happens to the paper.');
    doc.status = 'lost';
    if (p.stolen) doc.stolen = true;
    // A passport reported lost is canceled, and what was issued on it goes with it, except the F-1: SLATE's F-1 is the
    // student's status as much as the stamp, and the status holds while they study (the I-20 and the I-94), the stamp
    // mattering only to come back in, which SLATE doesn't model since travel went (from 2026-10-10: until then a lost
    // passport canceled the F-1, and the Work tab showed it canceled while the status read held).
    if (doc.kind === 'passport') for (const d of documentsOf(s.player)) if (d.passportId === doc.id && d.status === 'valid' && !(d.kind === 'visa' && d.destination === 'US' && d.name.startsWith('F-1'))) d.status = 'cancelled';
    return { lost: true };
  });
  sim.onCommand<{ documentId: string }, { filed: Instant }>('documents.police_report', (p, { sim: s }) => {
    const person = s.player;
    const doc = documentsOf(person).find((d) => d.id === p?.documentId);
    const no = policeReportRefusal(person, doc);
    if (no) throw new CommandError(no);
    doc!.policeReport = s.now;
    return { filed: s.now };
  });
}

/**
 * The police report as its own step (from 2026-10-03; `research-life-gaps.json`,
 * each force's own page): filed online where the force takes a lost or stolen
 * thing that way, free and at once. New York's NYPD takes lost property and a
 * theft to $1,000; Los Angeles's CORS lost property and theft; Toronto's CORE
 * lost property under $5,000, but not a passport; Vancouver's VPD lost or
 * stolen property under $25,000; Ireland's Garda a theft to €1,000 online,
 * lost property only at a station; Mexico City's Denuncia Digital a lost
 * document's constancia (read secondhand). London's Met records no lost
 * document, sending it to DVLA or the Passport Office. New Haven's Police
 * to Citizen portal takes lost property and a theft (from 2026-10-09, read
 * secondhand). What a report then does is the issuer's: New York replaces a
 * stolen license or permit free with the police's MV-78B, though not a
 * non-driver ID (dmv.ny.gov; `documents.replace_license`); ServiceOntario
 * asks for a report before replacing one; ICBC asks for one when it was stolen.
 */
export const ONLINE_REPORTS: Readonly<Record<string, { lost: boolean; stolen: boolean; noPassport?: boolean }>> = {
  'us-ny-newyork': { lost: true, stolen: true },
  'us-ca-losangeles': { lost: true, stolen: true },
  'ca-on-toronto': { lost: true, stolen: true, noPassport: true },
  'ca-bc-vancouver': { lost: true, stolen: true },
  'ie-lei-dublin': { lost: false, stolen: true },
  'mx-cmx-mexicocity': { lost: true, stolen: false },
  // From 2026-10-09: New Haven's police take non-emergency reports, lost property among them, through their Police to
  // Citizen portal (newhavenct.policetocitizen.com, read secondhand: the city's own page turned the reading away).
  'us-ct-newhaven': { lost: true, stolen: true },
};

export function policeReportRefusal(person: Person, doc: PersonDocument | undefined): string | undefined {
  if (!doc || doc.status !== 'lost') return 'Report it lost first.';
  if (doc.policeReport !== undefined) return 'You’ve already filed a police report for it.';
  const here = person.currentLocationId;
  if (here === 'uk-eng-london') return 'The Met doesn’t record lost documents. The DVLA and the Passport Office handle them.';
  const rule = ONLINE_REPORTS[here];
  if (!rule) return 'How the police here take a report isn’t in the game.';
  if (doc.stolen ? !rule.stolen : !rule.lost) return doc.stolen ? 'Here a theft is reported in person at a police station, not online.' : 'Here lost property is reported in person at a police station, not online.';
  if (rule.noPassport && doc.kind === 'passport') return 'Here a lost passport can’t be reported online.';
  return undefined;
}

export const DECIDED_KIND = 'documents.decided';

// ---------------------------------------------------------------------------
// Passports
// ---------------------------------------------------------------------------

/** The passport office for a citizenship, where SLATE has it. */
export function passportRuleFor(person: Person): PassportRule | undefined {
  const iso = isoOfCountry(person.citizenshipId);
  return iso ? PASSPORTS[iso] : undefined;
}

/** A passport's term and fee for a person's age: ten years, or less for a young adult where the office gives less. */
export function passportTerms(rule: PassportRule, age: number): { years: number; fee: number } {
  if (rule.young && age < rule.young.under) return { years: rule.young.years, fee: rule.young.fee ?? rule.fee };
  return { years: rule.validityYears, fee: rule.fee };
}

/**
 * What applying asks of a person where they are (from 2026-10-16): the office's terms at home, or from abroad where they
 * live outside the country that issues it (`PASSPORTS_ABROAD`, where SLATE has them), and a US citizen's renewal by mail
 * where they may (`US_RENEWAL`, Form DS-82). Every life lives in New Haven, so a citizen of anywhere but the United
 * States applies from abroad. Until 2026-10-16 everyone paid the office's fee at home and was offered its faster
 * service at home: a British student was charged £102 and offered the UK's Fast Track, which isn't sold outside the UK,
 * and a US citizen renewing paid a first passport's $165 (tests/remaining-papers.test.ts). The fee is in the office's
 * currency, for its term at their age.
 */
export interface PassportOffice { fee: number; currency: string; days: number; daysEstimated: boolean; expedite: PassportRule['expedite']; years: number; basis: string; abroad: boolean; renewal: boolean; assumed: readonly string[] }

export function passportOffice(person: Person, at: Instant): PassportOffice | undefined {
  const rule = passportRuleFor(person);
  const iso = isoOfCountry(person.citizenshipId);
  if (!rule || !iso) return undefined;
  const age = (at - person.birthInstant) / (365.25 * MS_DAY);
  const terms = passportTerms(rule, age);
  const here = isoOfCity(person.currentLocationId);
  const away = here !== undefined && here !== iso ? PASSPORTS_ABROAD[iso] : undefined;
  if (away) {
    const young = rule.young !== undefined && age < rule.young.under;
    return { fee: young && away.youngFee !== undefined ? away.youngFee : away.fee, currency: away.currency, days: away.days, daysEstimated: away.daysEstimated, expedite: away.expedite, years: terms.years, basis: away.basis, abroad: true, renewal: false, assumed: away.assumed };
  }
  if (iso === 'US' && here === 'US' && renewsByMail(person, at)) {
    return { fee: US_RENEWAL.fee, currency: US_RENEWAL.currency, days: rule.days, daysEstimated: rule.daysEstimated, expedite: rule.expedite, years: terms.years, basis: `You can renew by mail on Form ${US_RENEWAL.form}: $${US_RENEWAL.fee} to the Department of State, with no acceptance fee. Your most recent passport has to have been issued within the last ${US_RENEWAL.withinYears} years, when you were ${US_RENEWAL.issuedFromAge} or older, and never reported lost or stolen.`, abroad: false, renewal: true, assumed: [] };
  }
  return { fee: terms.fee, currency: rule.currency, days: rule.days, daysEstimated: rule.daysEstimated, expedite: rule.expedite, years: terms.years, basis: rule.feeBasis, abroad: false, renewal: false, assumed: [] };
}

/**
 * Whether a US citizen may renew by mail (`US_RENEWAL`): their most recent US passport, in force or run out, issued
 * within the last 15 years, at 16 or older, for 10 years, and never reported lost or stolen. One replaced by a newer
 * passport isn't the most recent; a lost one is, and sends them to Form DS-11.
 */
export function renewsByMail(person: Person, at: Instant): boolean {
  const last = documentsOf(person).filter((d) => d.kind === 'passport' && d.issuer === 'US' && d.issuedAt !== undefined).sort((a, b) => b.issuedAt! - a.issuedAt!)[0];
  if (!last || last.status === 'lost' || last.status === 'pending') return false;
  const issued = last.issuedAt!;
  return at - issued <= US_RENEWAL.withinYears * 365.25 * MS_DAY
    && issued - person.birthInstant >= US_RENEWAL.issuedFromAge * 365.25 * MS_DAY
    && last.expiresAt !== undefined && Math.round((last.expiresAt - issued) / (365.25 * MS_DAY)) >= US_RENEWAL.validityYears;
}

/** Why a passport can't be applied for now, or nothing. */
export function passportRefusal(person: Person, expedite = false): string | undefined {
  const rule = passportRuleFor(person);
  if (!rule) return 'Your country’s passport office isn’t in the game.';
  if (documentsOf(person).some((d) => d.kind === 'passport' && d.status === 'pending')) return 'You’ve already applied, and it’s being decided.';
  // From abroad, the faster service the office sells there, if any (from 2026-10-16, `passportOffice`).
  const iso = isoOfCountry(person.citizenshipId) ?? '';
  const here = isoOfCity(person.currentLocationId);
  const away = here !== undefined && here !== iso ? PASSPORTS_ABROAD[iso] : undefined;
  if (expedite && away && !away.expedite) return `${rule.issuer} offers no faster service to applicants abroad.`;
  if (expedite && !rule.expedite) return `${rule.issuer} doesn’t offer a faster service.`;
  if (expedite && rule.expedite?.renewalOnly && !documentsOf(person).some((d) => d.kind === 'passport' && d.issuer === isoOfCountry(person.citizenshipId))) return `${rule.issuer}’s faster service is for renewals only.`;
  return undefined;
}

/** A passport issued now to a person, to its term for their age; one it replaces is canceled, and what was issued on that one goes with it. */
function issuePassport(sim: Simulation, person: Person, doc: PersonDocument, age: number): void {
  const rule = passportRuleFor(person)!;
  doc.status = 'valid';
  doc.issuedAt = sim.now;
  doc.expiresAt = addYears(sim.now, passportTerms(rule, age).years);
  for (const old of documentsOf(person)) {
    if (old === doc || old.kind !== 'passport' || old.status !== 'valid' || old.issuer !== doc.issuer) continue;
    old.status = 'cancelled';
    for (const d of documentsOf(person)) if (d.passportId === old.id && d.kind === 'authorization' && d.status === 'valid') d.status = 'cancelled';
  }
}

// ---------------------------------------------------------------------------
// What a life begins with
// ---------------------------------------------------------------------------

/**
 * The papers a life begins with, at twenty-four and arriving at Yale:
 * - a citizen of another country studying in the United States holds their
 *   passport and an F-1 student visa to the end of the program, with the
 *   60 days' grace after it (8 CFR 214.2(f)(5)(iv); a 30-day rule published
 *   2026-07-17 was stayed by the District of Massachusetts on 2026-09-14);
 * - a US citizen holds a passport at the share of passports in circulation
 *   to residents, 183,170,240 in FY2025 against 341,784,857 people (State's
 *   count, the Census's Vintage 2025): 0.536, an upper bound, State counting
 *   documents, not holders;
 * - a US citizen born in a state holds its driving license at the share
 *   FHWA counts at twenty to twenty-four, 80.9% (Highway Statistics DL-20,
 *   2024). Other countries' shares weren't researched: SLATE gives no
 *   license where it doesn't know how many hold one, and says so in
 *   docs/WORLD.md.
 * A passport's issue is drawn across its term, and a license's from the
 * holder's eighteenth birthday, renewed to its term.
 */
export const STARTING = {
  usPassportShare: 183_170_240 / 341_784_857,
  usLicenseShare: 0.809,
  graceDays: 60,
  source: 'travel.state.gov passport statistics FY2025; census.gov Vintage 2025; FHWA Highway Statistics DL-20 (2024); 8 CFR 214.2(f)(5)(iv)',
} as const;

export function startingDocuments(sim: Simulation, person: Person): void {
  if (person.documents) return;
  const docs = documentsOf(person);
  const rng = sim.rng('documents.start', person.id);
  const iso = isoOfCountry(person.citizenshipId);
  const rule = passportRuleFor(person);
  const age = (sim.now - person.birthInstant) / (365.25 * MS_DAY);
  const passport = (years: number): PersonDocument => {
    const id = sim.nextId('document');
    const issuedAt = sim.now - rng.next() * Math.min(years, age - 16) * 365.25 * MS_DAY;
    return { id, kind: 'passport', issuer: iso ?? '', name: rule?.name ?? 'Passport', number: numberFor(iso ?? 'P', id), status: 'valid', issuedAt, expiresAt: addYears(issuedAt, years) };
  };
  const years = rule ? passportTerms(rule, age).years : 10;
  if (iso && iso !== 'US') {
    // The passport. 1221 added a US student visa for its drama school here; SLATE has no school, and the owner's
    // command of November 14, 2026 keeps that assumption out (a recorded deviation, docs/v9/PARITY.md).
    docs.push(passport(years));
  } else if (iso === 'US' && rng.next() < STARTING.usPassportShare) {
    docs.push(passport(years));
  }
  // A US-born citizen's license from their birth state, renewed to its term.
  const born = CITIES.get(person.homeRegionId);
  if (iso === 'US' && born && isoOfCountry(born.countryId) === 'US' && rng.next() < STARTING.usLicenseShare) {
    const jurisdiction = born.parentId.toLowerCase();
    const term = LICENSES[jurisdiction]?.validityYears ?? 8;
    let issuedAt = addYears(person.birthInstant, 18);
    while (addYears(issuedAt, term) <= sim.now) issuedAt = addYears(issuedAt, term);
    const id = sim.nextId('document');
    // REAL ID at the state's published share (`content/identity.ts`, from 2026-09-30).
    docs.push({ id, kind: 'license', issuer: jurisdiction, name: LICENSES[jurisdiction]?.name ?? 'Driver License', number: numberFor('D', id), status: 'valid', issuedAt, expiresAt: addYears(issuedAt, term), realId: rng.next() < realIdShare(jurisdiction) });
  }
}

/** A pending document issued: in force from now, to its term. */
function issue(sim: Simulation, person: Person, doc: PersonDocument): void {
  if (doc.kind === 'passport') {
    // What it replaces, read before it's issued, so the notice says only what happened (from 2026-10-19, brief 15: until
    // then every passport's notice said a travel authorization on the one it replaced had ended, a first passport's too).
    const replaced = documentsOf(person).filter((d) => d !== doc && d.kind === 'passport' && d.status === 'valid' && d.issuer === doc.issuer);
    const ended = documentsOf(person).some((d) => d.kind === 'authorization' && d.status === 'valid' && replaced.some((old) => old.id === d.passportId));
    issuePassport(sim, person, doc, (sim.now - person.birthInstant) / (365.25 * MS_DAY));
    const after = replaced.length ? ` Your old passport is canceled${ended ? ', and the travel authorization issued on it ended with it' : ''}.` : '';
    if (person.id === sim.universe.playerId) sim.notify({ category: 'personal', title: `${doc.name} Issued`, body: `Your ${doc.name}, ${doc.number}, has arrived. It’s good until ${formatDate(doc.expiresAt!, sim.zone)}.${after}`, importance: 60, route: '/workspace/papers' });
    return;
  }
  doc.status = 'valid';
  doc.issuedAt = sim.now;
  if (doc.kind === 'authorization' && doc.destination) {
    const dest = ENTRY[doc.destination]!;
    const key = Object.entries(dest.authorizations).find(([, a]) => a.name === doc.name)?.[0] ?? '';
    const auth: Authorization | undefined = dest.authorizations[key];
    const years = VALIDITY_BY_CITIZEN[`${doc.destination}/${key}`]?.[isoOfCountry(person.citizenshipId) ?? ''] ?? auth?.validityYears ?? 1;
    const passport = documentsOf(person).find((d) => d.id === doc.passportId);
    doc.expiresAt = Math.min(addYears(sim.now, years), passport?.expiresAt ?? Infinity);
  }
  // A visitor visa, for its term and no longer than the passport it's in (from 2026-09-29).
  if (doc.kind === 'visa' && doc.destination && doc.bookingId === undefined) {
    const rule = VISAS[`${doc.destination}<${isoOfCountry(person.citizenshipId)}`];
    const passport = documentsOf(person).find((d) => d.id === doc.passportId);
    if (rule) doc.expiresAt = Math.min(rule.years ? addYears(sim.now, rule.years) : sim.now + (rule.validDays ?? 180) * MS_DAY, passport?.expiresAt ?? Infinity);
  }
  if (person.id === sim.universe.playerId) sim.notify({ category: 'personal', title: `${doc.name} Issued`, body: `Your ${doc.name}, ${doc.number}, has arrived.${doc.expiresAt ? ` It’s good until ${formatDate(doc.expiresAt, sim.zone)}.` : ''}`, importance: 60, route: '/workspace/papers' });
}

// ---------------------------------------------------------------------------
// Driving
// ---------------------------------------------------------------------------

/** The licensing jurisdiction a town is in, where SLATE has its rules: a US state, a Canadian province or an Australian state, else the country. */
export function licensingOf(cityId: string): string | undefined {
  const city = CITIES.get(cityId);
  if (!city) return undefined;
  const iso = isoOfCountry(city.countryId)?.toLowerCase();
  const region = city.parentId.toLowerCase();
  // A region is SLATE's GeoNames first-level code: Canada's 02 is British Columbia and 08 Ontario, Australia's 02 New South Wales, Mexico's 09 the capital.
  const byRegion: Record<string, string> = { 'uk-nir': 'gb-nir', 'uk-eng': 'gb', 'uk-sct': 'gb', 'uk-wls': 'gb', 'ca-02': 'ca-bc', 'ca-08': 'ca-on', 'au-02': 'au-nsw', 'mx-09': 'mx-cmx' };
  const id = byRegion[region] ?? (iso === 'us' ? region : iso);
  return id && LICENSES[id] ? id : undefined;
}

/** A license's language, by its issuer's country: what a visitor rule reads. */
const LICENSE_LANGUAGE: Readonly<Record<string, string>> = {
  us: 'en', gb: 'en', ca: 'en', ie: 'en', au: 'en', nz: 'en', is: 'is', de: 'de', fr: 'fr', es: 'es', jp: 'ja', kr: 'ko', mx: 'es', br: 'pt', lv: 'lv',
};
const NON_LATIN = new Set(['ja', 'ko']);
const EU_EEA = new Set(['ie', 'is', 'de', 'fr', 'es', 'lv']);

/** The license they'd drive on, in force: one that lets them drive alone before a learner's. */
export type VehicleClass = 'car' | 'motorcycle';
export const classOf = (d: PersonDocument): VehicleClass => d.vehicleClass ?? 'car';

export function licenseOf(person: Person, at: Instant, cls: VehicleClass = 'car', here?: string): PersonDocument | undefined {
  // A full license before a learner's; and where `here` is given, the one its authority issued first (from 2026-10-06;
  // until then the first in force was read, so a license from where they'd lived before was asked about where they now
  // held the place's own, and they were refused).
  const rank = (d: PersonDocument) => (d.alone !== false ? 2 : 0) + (here !== undefined && d.issuer === here ? 1 : 0);
  return documentsOf(person).filter((d) => d.kind === 'license' && classOf(d) === cls && inForce(d, at)).sort((a, b) => rank(b) - rank(a))[0];
}

/**
 * Whether a person may drive a car where they are, and if not, why and what
 * would let them: a license from this jurisdiction; or, as a visitor, one
 * from elsewhere within the days the jurisdiction allows, with an
 * International Driving Permit where the license's language asks one; a
 * license from another US state, Canadian province or Australian state, and
 * an EU or EEA license within the EU and EEA, recognized as the law
 * recognises them.
 */
/**
 * A moped ridden on a car license, from 2026-09-30 (`research-vehicles5.json`),
 * the most cc it may have: British Columbia's limited-speed motorcycle, 50cc
 * or under, on a full-privilege Class 5 or 7 of its own (ICBC). Its 70 km/h
 * and 95 kg limits aren't kept, SLATE not holding a scooter's top speed or
 * weight. Nowhere else: New York's Class D covers a moped held to 30 mph,
 * whose speed SLATE doesn't hold either; California's and Ontario's car
 * licenses cover none; Britain's and Ireland's only those from before
 * February 2001 and October 2006, which no life beginning at twenty-four
 * holds.
 */
export const MOPED_ON_CAR: Readonly<Record<string, number>> = { 'ca-bc': 50 };

export function mayDrive(person: Person, cityId: string, at: Instant, arrivedAt = at, cls: VehicleClass = 'car', cc?: number): { ok: boolean; why?: string } {
  const here = licensingOf(cityId);
  const place = CITIES.get(cityId)?.name ?? 'here';
  if (!here) return { ok: false, why: `The game doesn’t have the driving rules for ${place}.` };
  const car = cls === 'motorcycle' && cc !== undefined && cc <= (MOPED_ON_CAR[here] ?? 0) ? licenseOf(person, at, 'car') : undefined;
  // Its own: a car license from elsewhere carries no moped. A learner's is refused below as for a car.
  if (car && car.issuer === here) cls = 'car';
  const license = licenseOf(person, at, cls, here);
  if (!license) return { ok: false, why: cls === 'motorcycle' ? `You don’t hold a motorcycle license in force.` : `You don’t hold a driving license in force. ${LICENSES[here]!.authority} issues ${LICENSES[here]!.name}.` };
  // Points suspended it (`systems/driving.ts`, from 2026-09-29) until the driving went in the scope reset of 2026-10-09.
  if (license.alone === false) return { ok: false, why: `${license.name} lets you drive only with a licensed driver beside you.` };
  if (license.issuer === here) return { ok: true };
  const from = license.issuer.split('-')[0]!;
  const hereCountry = here.split('-')[0]!;
  // Within one country's states and provinces, and within the EU and EEA, a license is recognized.
  if (from === hereCountry || (EU_EEA.has(from) && EU_EEA.has(hereCountry))) return { ok: true };
  const rule: LicenseRule = LICENSES[here]!;
  if (!rule.visitor.confirmed) return { ok: false, why: `${place}’s rule for a license from elsewhere couldn’t be confirmed, so the game doesn’t let you drive on one there.` };
  if (rule.visitor.days !== null && days(arrivedAt, at) > rule.visitor.days) return { ok: false, why: `A visitor may drive on a license from elsewhere for ${rule.visitor.days} days from arriving. After that, ${rule.authority} asks for its own license.` };
  const language = LICENSE_LANGUAGE[from] ?? '';
  const languages = rule.visitor.languages;
  const needsPermit = languages === 'always' ? true : languages === 'any' ? false : languages === 'latin' ? NON_LATIN.has(language) : !languages.includes(language);
  if (needsPermit && !documentsOf(person).some((d) => d.kind === 'idp' && inForce(d, at) && d.issuer === license.issuer.split('-')[0])) {
    return { ok: false, why: `${place} asks for an International Driving Permit with a license like yours. It’s issued in the country that issued your license, before you travel${LICENSES[license.issuer]?.idp ? `: ${LICENSES[license.issuer]!.idp!.issuer}` : ''}.` };
  }
  return { ok: true };
}
