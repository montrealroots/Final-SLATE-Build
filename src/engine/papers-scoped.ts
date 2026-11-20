// Fees researched for one route and one kind of applicant (the owner's research recovery package of November 19, 2026;
// src/data/papers/route-evidence.json). Until November 20, 2026 every destination had one term for everyone
// (papers-terms.ts), so a consulate's price list could only have replaced the whole country's, and a fee paid in parts
// (Colombia's study fee, then its issuance fee) could only be charged at once. Now a record applies only where its
// conditions hold: where you live (which stands for where you apply: the game has no consulates), your passport, and
// the date. Where none holds, the country's terms stand as they were, estimate and all. A conflicting, undated or
// not-yet-in-force record is held, with its reason, and never charged.
import evidence from '../data/papers/route-evidence.json';
import { addDaysToKey, weekdayOfKey } from './time';
import { hasHolidayRules, holidaysOn } from './holidays';
import type { Source, Terms } from './papers-terms';

interface When { livesIn?: string[]; livesOutside?: string[]; passport?: string[]; passportNot?: string[]; from?: string; through?: string }
export interface RouteRecord {
  id: string; country: string; route: string; amount: number; currency: string; component: string; scope: string; evidence: string;
  from: string | null; through: string | null; days: number | null; dayUnit: string | null; note: string;
  source: { url: string; access: string; retrieved: string; note: string };
  applies?: { kind: 'visa' | 'permit'; component: 'application' | 'issuance'; when: When };
  held?: string;
}
export const ROUTE_RECORDS = (evidence as { records: RouteRecord[] }).records;

/** Who is applying, as a record's conditions read them. */
export interface Applicant { livesIn: string; passports: string[]; today: string }

const holds = (w: When, a: Applicant, r: RouteRecord): boolean =>
  (!w.livesIn || w.livesIn.includes(a.livesIn)) && (!w.livesOutside || !w.livesOutside.includes(a.livesIn)) &&
  (!w.passport || a.passports.some((p) => w.passport!.includes(p))) && (!w.passportNot || !a.passports.some((p) => w.passportNot!.includes(p))) &&
  (!(w.from ?? r.from) || a.today >= (w.from ?? r.from)!) && (!(w.through ?? r.through) || a.today <= (w.through ?? r.through)!);

/** The records that apply to this applicant's application for `kind` in `country` today, by component. */
export function scopedRecords(country: string, kind: 'visa' | 'permit', a: Applicant): { application?: RouteRecord; issuance?: RouteRecord } {
  const mine = ROUTE_RECORDS.filter((r) => r.country === country && r.applies?.kind === kind && holds(r.applies.when, a, r));
  return { application: mine.find((r) => r.applies!.component === 'application'), issuance: mine.find((r) => r.applies!.component === 'issuance') };
}

/**
 * Calendar days for `n` working days from `today`: weekends, and the country's public holidays where the game holds
 * its rules, don't count. A published service target, not a promise of the decision's day.
 */
export function workingDays(country: string, today: string, n: number): number {
  let day = today;
  let left = n;
  let calendar = 0;
  while (left > 0) {
    day = addDaysToKey(day, 1);
    calendar++;
    const wd = weekdayOfKey(day);
    if (wd === 0 || wd === 6) continue;
    if (hasHolidayRules(country) && holidaysOn(country, undefined, day).length) continue;
    left--;
  }
  return calendar;
}

const sourceOf = (r: RouteRecord): Source => ({ kind: 'official', url: r.source.url, what: `${r.route}: ${r.scope || r.component}` });

/**
 * The country's terms with what applies to this applicant: its application fee, an issuance fee charged only once it is
 * issued, and a decision time where the record gives one. A route-scoped fee makes the fee researched; the decision
 * time stays the country's (and so the game's estimate, said as one) unless the record gives it.
 */
export function withScope(t: Terms, country: string, kind: 'visa' | 'permit', a: Applicant): Terms {
  const { application, issuance } = scopedRecords(country, kind, a);
  if (!application && !issuance) return t;
  const parts: string[] = [];
  let next: Terms = { ...t, sources: [...t.sources] };
  if (application) {
    next.fee = { amount: application.amount, currency: application.currency };
    parts.push(`The fee is ${kind === 'visa' ? 'this visa\'s' : 'this permit\'s'} for applicants like you (${application.scope || application.route}), from the government's own schedule.`);
    next.sources.push(sourceOf(application));
    if (application.days && application.dayUnit === 'working') {
      const days = workingDays(country, a.today, application.days);
      next = { ...next, days, daysText: `${application.days} working days (about ${days} days)` };
      parts.push(`The decision is due in ${application.days} working days: a published target, not a promise.`);
    }
  }
  if (issuance) {
    next.issuance = { amount: issuance.amount, currency: issuance.currency };
    parts.push(`A further ${issuance.amount.toLocaleString('en-US')} ${issuance.currency} is paid only if it's issued; a refusal costs only the first fee.`);
    if (!application) next.sources.push(sourceOf(issuance));
  }
  const timeResearched = !!(application?.days) || (t.estimate === null);
  next.estimate = timeResearched ? null : { ...(t.estimate ?? { from: [], where: '' }), only: 'days' };
  next.basis = [parts.join(' '), timeResearched ? '' : `How long it takes to decide is still the game's estimate: ${t.daysText}.`].filter(Boolean).join(' ');
  return next;
}
