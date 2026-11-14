/**
 * SLATE — the visit an application waits on (the requirements' 49a–b, e–g
 * and i, from 2026-10-06): an interview at a consulate or biometrics taken
 * at a center, booked as a driving test is (`systems/licensing.ts`), on the
 * calendar at ten in the morning on a business day where the applicant
 * lives, clear of anything else they must be at, and kept by being there,
 * awake and not in hospital (`present`). From
 * `docs/research/world/research-appointments-immigration.json`, read
 * 2026-10-06, each authority's own page unless marked.
 *
 * Until then a visa, a work permit or a green card was decided on the
 * calendar with nothing asked of the applicant between, and Britain's Global
 * Talent visa was granted the day it was paid for. Now the decision waits on
 * the visit being kept:
 * - **A US visa's interview at the consulate** (travel.state.gov, read
 *   secondhand: its pages refused automated reading). Every visitor visa
 *   SLATE issues asks one since 2025-10-01, the waiver left only for
 *   diplomats and a renewal within a year of the last, which SLATE's
 *   applicants aren't. The fee covers it. It's booked at the visa's own wait
 *   (`content/visas.ts`), and the visa issued its week after. Missed, it's a
 *   no-show and the fee isn't refunded; some posts then ask a new
 *   application, read only on third parties' pages, which SLATE takes: the
 *   application closes, applied for again.
 * - **USCIS biometrics for the green card** (verified): the I-485's
 *   appointment at an Application Support Center, no separate fee since the
 *   fee rule of 2024 (the I-485's $1,440 has none). Missed, the case "may
 *   [be] consider[ed] ... abandoned and ... denied" (8 CFR 103.2(b)(13)(ii)),
 *   which SLATE does, the fees kept. The O-1's I-129 has none: its page asks
 *   the beneficiary for no biometrics, so none is booked.
 * - **Britain's biometric enrolment** (the Home Office's enrolment
 *   guidance, v14.0, 4 June 2026): for the Global Talent visa, at a UKVCAS
 *   service point by one living in Britain, or at a visa application center
 *   abroad. In Britain, one not enrolled is sent a warning and given 10 more
 *   days, then the application is rejected, "treated as not being made";
 *   SLATE books the second visit at the warning's tenth day. Abroad, a first
 *   miss without a reasonable excuse may be treated the same, which SLATE
 *   does. The visa is granted the day it's kept, as it was the day it was
 *   paid for until now: its decision time wasn't read. UKVCAS's prices
 *   aren't on gov.uk, so none is charged.
 * - **Canada's biometrics** (canada.ca, verified): CAD 85, already paid with
 *   the visitor visa and the C14 work permit. "You have 30 days from the time
 *   you get your BIL", the letter SLATE takes as come the day it's applied
 *   for; missed, SLATE books again at the thirtieth day, and missed again the
 *   application is refused, as an old letter can't be used. A visitor visa
 *   is decided its 18 days after the biometrics, as its basis reads.
 * - **Ireland's IRP registration** isn't reached: SLATE gives an actor no
 *   permission to live or work in Ireland (`routeRefusal`), so there's
 *   nothing to register.
 *
 * How far ahead a USCIS notice, a UKVCAS slot or a Canadian center's slot
 * comes isn't published (none of the authorities gives one): SLATE books
 * them two weeks on (`VISIT_LEAD_DAYS` until 2026-10-09), SLATE's estimate, inside every
 * deadline read (Canada's 30 days, UKVCAS's 45 working days). A visit takes
 * an hour, SLATE's estimate. Supporting documents to gather aren't kept: the
 * guidance lists what's brought, and nothing in SLATE would read the list.
 *
 * Nothing books a visit since the connected world of 2026-10-09: the green
 * card's and the Global Talent visa's applications went that day with the
 * career's record they read, and the visitor visas' with the travel they were
 * for. A visit a save already has booked is still kept or missed as above, and
 * its application decided or ended by it; booking one (`bookVisit`,
 * `ukEnrolment`) went.
 */

import type { Simulation } from '../core/simulation';
import type { Person } from '../domain/model';
import { MS_DAY, formatDate, instantFromZoned, normalDate, zonedParts, type Instant } from '../core/time';
import { CITIES } from '../content/geography';
import { businessDay } from '../content/bankdays';
import { present } from './health';
import { DECIDED_KIND, documentsOf, type PersonDocument } from './documents';
import { scheduleUsStatus } from './permission';

export const VISIT_KIND = 'documents.visit';
/** How long a visit takes, minutes: SLATE's estimate. */
export const VISIT_MINUTES = 60;

export type VisitRule = 'us-interview' | 'us-biometrics' | 'uk-enrolment-home' | 'uk-enrolment-abroad' | 'ca-biometrics';

interface VisitTerms {
  /** What the calendar calls it. */
  what: string;
  /** Days from the visit kept to the decision, at the least. */
  after: number;
  /** Missed once, the second visit: so many days on (Britain's warning), or so many from applying (Canada's letter); none, and the first miss ends it. */
  again?: { days: number; from: 'missed' | 'applied' };
  /** What's said when it's missed and ends the application. */
  ended: string;
}

export const VISITS: Readonly<Record<VisitRule, VisitTerms>> = {
  'us-interview': { what: 'Visa Interview At The Consulate', after: 7, ended: 'You missed the visa interview: a no-show closes the application, and its fee isn’t refunded.' },
  'us-biometrics': { what: 'Biometrics At A USCIS Application Support Center', after: 0, ended: 'You missed the biometrics appointment, and USCIS treats the case as abandoned and denies it (8 CFR 103.2(b)(13)(ii)). The fees aren’t returned.' },
  'uk-enrolment-home': { what: 'Biometrics At A UKVCAS Service Point', after: 0, again: { days: 10, from: 'missed' }, ended: 'You didn’t give your biometrics after the Home Office’s warning, so it rejected the application and treats it as not made.' },
  'uk-enrolment-abroad': { what: 'Biometrics At A Visa Application Center', after: 0, ended: 'You didn’t give your biometrics, so the Home Office treats the application as not made.' },
  'ca-biometrics': { what: 'Biometrics At A Visa Application Center', after: 0, again: { days: 30, from: 'applied' }, ended: 'You didn’t give your biometrics within the 30 days of IRCC’s letter, so IRCC refuses the application.' },
};

/**
 * A visit's name inside a sentence: its words in lower case but an acronym's (from 2026-10-19, brief 15: until then
 * lowercased whole, "biometrics at a uscis application support center", and in its title's case after "Done:").
 */
export function visitWords(rule: VisitRule): string {
  return VISITS[rule].what.split(' ').map((w) => (/^[A-Z]{2,}$/.test(w) ? w : w.toLowerCase())).join(' ');
}

/** The visit a document waits on, where there is one, and whether it's been kept. */
export interface PaperVisit {
  rule: VisitRule;
  at: Instant;
  cityId: string;
  /** Visits missed so far. */
  missed?: number;
  keptAt?: Instant;
  /** A grant's years from the day it's decided, where the decision sets them (the Global Talent visa's five). */
  years?: number;
  /** What decides it, where it isn't the papers' own (`DECIDED_KIND`): a work permit's (`PERMISSION_KIND`). */
  decidedBy?: string;
  /** Days from the visit kept to the decision, where the application's own (Canada's visitor visa's 18) stands for the rule's. */
  after?: number;
}

/** Whether a pending document's decision still waits on its visit. */
export const waitsOnVisit = (doc: PersonDocument): boolean => doc.visit !== undefined && doc.visit.keptAt === undefined;

const isoDay = (at: Instant, zone: string) => { const p = zonedParts(at, zone); return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`; };

/** Ten in the morning on the first business day from a day, where they live, clear of anything else they must be at. */
function slot(sim: Simulation, person: Person, cityId: string, from: Instant): Instant {
  const city = CITIES.require(cityId);
  const zone = city.timeZone;
  const start = zonedParts(from, zone);
  for (let n = 0; n < 60; n += 1) {
    const at = instantFromZoned({ ...normalDate(start.year, start.month, start.day + n), hour: 10 }, zone);
    if (at <= sim.now || !businessDay(city.countryId, isoDay(at, zone), city.parentId)) continue;
    const end = at + VISIT_MINUTES * 60_000;
    const clash = sim.universe.scheduled.some((i) => i.status === 'pending' && i.requiresPlayer === true && (i.payload.personId === undefined || i.payload.personId === person.id)
      && i.at < end && i.at + (i.durationMinutes ?? 60) * 60_000 > at);
    if (!clash) return at;
  }
  return from;
}

/** The last free ten o'clock on a business day by a deadline, after now; nothing where there's none. */
function lastSlot(sim: Simulation, person: Person, cityId: string, by: Instant): Instant | undefined {
  for (let n = 0; n < 14; n += 1) {
    const at = slot(sim, person, cityId, by - n * MS_DAY);
    if (at > sim.now && at <= by) return at;
  }
  return undefined;
}

function schedule(sim: Simulation, person: Person, doc: PersonDocument): void {
  const v = doc.visit!;
  sim.schedule({ at: v.at, kind: VISIT_KIND, label: VISITS[v.rule].what, category: 'personal', priority: 33, requiresPlayer: true, durationMinutes: VISIT_MINUTES, locationId: v.cityId, payload: { personId: person.id, documentId: doc.id } });
}

export function registerPaperVisits(sim: Simulation): void {
  sim.onSchedule(VISIT_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId)];
    const doc = person ? documentsOf(person).find((d) => d.id === item.payload.documentId) : undefined;
    const v = doc?.visit;
    if (!person || !doc || !v || doc.status !== 'pending' || v.keptAt !== undefined || v.at !== item.at) return;
    const terms = VISITS[v.rule];
    const mine = person.id === s.universe.playerId;
    const tell = (title: string, body: string, importance: number) => { if (mine) s.notify({ category: 'personal', title, body, importance, route: '/workspace/papers' }); };
    if (present(person, item.at, v.cityId)) {
      v.keptAt = s.now;
      // Decided its days after, or when it was always to be, whichever is later; on the calendar again where that moved.
      const was = doc.readyAt;
      const ready = Math.max(was ?? s.now, s.now + (v.after ?? terms.after) * MS_DAY);
      doc.readyAt = ready;
      if (v.years) doc.expiresAt = ready + v.years * 365.2425 * MS_DAY;
      if (ready !== was || ready <= s.now) s.schedule({ at: ready, kind: v.decidedBy ?? DECIDED_KIND, label: `${doc.name} Decided`, category: 'system', priority: 20, payload: { personId: person.id, documentId: doc.id } });
      tell(`${terms.what.split(' At ')[0]} Done`, `You went to your ${visitWords(v.rule)} for your ${doc.name}. It’s decided on ${formatDate(ready, s.zone)}.`, 45);
      return;
    }
    v.missed = (v.missed ?? 0) + 1;
    if (terms.again && v.missed === 1) {
      const base = terms.again.from === 'applied' ? (doc.appliedAt ?? s.now) : s.now;
      const again = lastSlot(s, person, v.cityId, base + terms.again.days * MS_DAY);
      if (again !== undefined) {
        v.at = again;
        schedule(s, person, doc);
        tell('An Appointment Missed', `You missed your ${visitWords(v.rule)} for your ${doc.name}. It’s booked again for ${formatDate(v.at, s.zone)}, your last chance before the application ends.`, 80);
        return;
      }
    }
    doc.status = 'cancelled';
    tell('An Application Ended', terms.ended, 85);
    // A US application ended takes the status it held with it (`usStatusEnds`), so the status is looked at again.
    if (doc.destination === 'US') scheduleUsStatus(s, person);
  });
}
