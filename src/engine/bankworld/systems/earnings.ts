/**
 * SLATE — what a person earned, the one ledger the tax return, unemployment
 * insurance and public cover’s income tests read (`systems/taxreturn.ts`,
 * `systems/unemployment.ts`, `systems/health.ts`). Every paycheck and
 * benefit that reaches their bank is written here as it’s paid: by calendar
 * year, for the return, and by quarter, for a claim’s base period. The
 * quarters were a union health plan’s too until the plans went with the
 * career on 2026-10-09; this said they still were until 2026-10-13.
 */

import type { Person } from '../domain/model';
import type { Simulation } from '../core/simulation';
import type { Money } from '../core/money';
import { zonedParts, type Instant } from '../core/time';
import { CITIES } from '../content/geography';
import { DENVER_OPT } from '../content/tax';

export interface YearEarnings {
  /**
   * Wages from acting work: since the career went on 2026-10-09, the Summer Cabaret's stipend. Residuals were among them
   * until then; this said they still were until 2026-10-13, when nothing had recorded one since.
   */
  acting: Money;
  // Of the acting wages, SAG-AFTRA’s (`sag`), and those by production for its pension’s per-project ceiling
  // (`sagByProject`), were kept here, and in each quarter, until 2026-10-13: recordWages took them from a `sag` and a
  // `residual` that no caller had set since the career went on 2026-10-09, so they stayed at nothing, and nothing read
  // them. A save that kept them carries them, read by nothing.
  workStudy: Money;
  unemployment: Money;
  /** A scholarship's taxable part: what paid for living, not tuition or books. */
  scholarship?: Money;
  /** Interest the bank paid, before any tax taken at source: a 1099-INT's, taxable, with no payroll tax. */
  interest?: Money;
  /**
   * Of it, what a bank outside America paid, by the bank's country, with what that country took at source (from
   * 2026-10-16, for an account kept at home): foreign-source interest (IRC 862(a)(1)), which a US person's return takes
   * with a credit for that tax and a nonresident alien's leaves out (`figuresFor`). Until then a home bank's interest was
   * recorded as any bank's, and the tax it took at source was lost to the return.
   */
  foreignInterest?: Record<string, { gross: Money; withheld: Money }>;
  /** A pension paid: a 1099-R's, taxable, with no payroll tax (`systems/pension.ts`). */
  pension?: Money;
  /** Of the pension, Social Security, which the return taxes in part (from 2026-10-10). */
  socialSecurity?: Money;
  // What a home put on the year (its mortgage interest and taxes, a let home's rent and costs, a sale's gain) and a
  // lodger's rent were kept here from 2026-09-28 and 2026-09-30, until the homes and the lodgers went in the scope
  // reset of 2026-10-09, and a farm's rent with the land the same day. A save that kept them sheds them (`migrate`, 91).
  withheld: Money;
  /**
   * Of it, what went to each authority (from the integration pass of 2026-10-10): `us` the IRS's (income tax and FICA),
   * a state's by its code. Until then only the total was kept, and a return couldn't say whose it was; a year without
   * it is divided from the calculation that withheld it (`withholdingSplit`).
   */
  withheldBy?: Record<string, Money>;
  /** What the job cost: the agency's and the manager's commission, and the unions' dues. */
  commission: Money;
  dues: Money;
  // `jobCosts`, the rest of what the work cost (casting sites, headshots, a kit, a class, a coach), went on 2026-10-14
  // with `recordJobCost`, its one writer, which nothing called, and the return's line that read it.
  /** Productions that paid $200 or more, for the performing artist deduction. */
  employers: Record<string, Money>;
  /** Where they lived when last paid, which the return is filed from. */
  residence?: string;
  /** Income by the town they lived in when it was paid, for a part-year return. */
  byResidence: Record<string, Money>;
  /**
   * Wages by the country they were earned in, from 2026-09-29: what a US
   * return taxes of someone who isn't a citizen is what they earned there.
   * A year from before it has none, and is read as all American.
   */
  bySource?: Record<string, Money>;
  /**
   * Denver's Occupational Privilege Tax, withheld by the employer: $5.75 for each month the Denver earnings reach $500
   * (`DENVER_OPT`, from the remaining-gaps pass of 2026-10-11), and those months' Denver earnings. Filed by nobody.
   */
  denverOpt?: Money;
  denverMonths?: Record<string, Money>;
  /** Wages for work done in a state they didn't live in, by `livedInState>workedInTown`. */
  elsewhere: Record<string, Money>;
  /** Wages for work done abroad, and what the country withheld, by country; and by the town it was done in. */
  foreign: Record<string, { gross: Money; withheld: Money }>;
  foreignWhere?: Record<string, Money>;
}

export interface EarningsRecord {
  years: Record<string, YearEarnings>;
  /** Wages by quarter, `YYYY-Q`, and by the state they were earned in (of them SAG-AFTRA’s until 2026-10-13). */
  quarters: Record<string, { wages: Money; byState?: Record<string, Money> }>;
  // `equityWeeks`, the weeks with Equity work, went on 2026-10-13: nothing had written a week to it since the union’s
  // work went with the career in the scope reset of 2026-10-09, and nothing read it. A save from before keeps an empty
  // list under the name, which nothing reads.
  /** Income by month, `YYYY-MM`, for the programs that test current income. */
  months: Record<string, Money>;
  /**
   * The same month's income by kind (from 2026-10-10): wages, work-study wages, and the unearned (interest, benefits,
   * pensions). SNAP excludes work-study and gives its deduction to earned income only (7 CFR 273.9); until then it
   * took the month's whole as earned. A month from before has none, and is read as it was.
   */
  kinds?: Record<string, { wages: Money; workStudy: Money; unearned: Money }>;
  /** UK wages by the UK's tax year, keyed by the year it began on 6 April, for its treaty's test; what was withheld, by year and by payer; and the years settled. */
  ukYears: Record<string, Money>;
  /** Wages earned in the UK by its tax year, in the save's money, and the years National Insurance credits covered: the State Pension's record (`systems/statepension.ts`). */
  ukEarned?: Record<string, Money>;
  ukCredited?: string[];
  ukWithheld?: Record<string, Money>;
  ukPayers?: Record<string, Record<string, Money>>;
  ukSettled?: string[];
}

export function earningsOf(person: Person): EarningsRecord {
  person.earnings ??= { years: {}, quarters: {}, months: {}, ukYears: {} };
  person.earnings.months ??= {};
  person.earnings.ukYears ??= {};
  return person.earnings;
}

export function yearOf(person: Person, year: number | string): YearEarnings {
  const record = earningsOf(person);
  record.years[year] ??= { acting: 0, workStudy: 0, unemployment: 0, withheld: 0, commission: 0, dues: 0, employers: {}, byResidence: {}, elsewhere: {}, foreign: {} };
  const y = record.years[year]!;
  y.byResidence ??= {};
  y.elsewhere ??= {};
  y.foreign ??= {};
  return y;
}

/** Withholding put to its authorities: each state's as given, the rest the IRS's. */
export function addWithheld(y: YearEarnings, amount: Money, by: Record<string, Money> = {}): void {
  const to = (y.withheldBy ??= {});
  let states = 0;
  for (const [k, v] of Object.entries(by)) if (k !== 'us' && v) { to[k] = (to[k] ?? 0) + v; states += v; }
  to.us = (to.us ?? 0) + amount - states;
}

export const quarterKey = (year: number, month: number) => `${year}-${Math.floor((month - 1) / 3) + 1}`;

/** Wages paid: to the year and the quarter they're paid in. */
export function recordWages(person: Person, at: Instant, zone: string, pay: {
  gross: Money; withheld?: Money; commission?: Money; dues?: Money; employer?: string; workStudy?: boolean;
  /** Of what was withheld, each authority's; the rest is the IRS's. */
  withheldBy?: Record<string, Money>;
  /** The town the work was done in, where it isn't where they live. */
  where?: string;
  /** What a country withheld, for work done abroad. */
  foreignWithheld?: Money;
}): void {
  const p = zonedParts(at, zone);
  const y = yearOf(person, p.year);
  const home = homeOf(person);
  y.byResidence[home] = (y.byResidence[home] ?? 0) + pay.gross;
  const source = CITIES.get(pay.where ?? home)?.countryId ?? 'us';
  y.bySource = { ...y.bySource, [source]: (y.bySource?.[source] ?? 0) + pay.gross };
  if (source === 'uk') { const r = earningsOf(person); const key = ukTaxYear(at); r.ukEarned = { ...r.ukEarned, [key]: (r.ukEarned?.[key] ?? 0) + pay.gross }; }
  const lived = stateOf(home);
  const country = pay.where ? CITIES.get(pay.where)?.countryId : undefined;
  if (country && country !== CITIES.get(home)?.countryId) {
    const f = (y.foreign[country] ??= { gross: 0, withheld: 0 });
    f.gross += pay.gross;
    y.foreignWhere = { ...y.foreignWhere, [pay.where!]: (y.foreignWhere?.[pay.where!] ?? 0) + pay.gross };
    f.withheld += pay.foreignWithheld ?? 0;
    if (country === 'uk') {
      const r = earningsOf(person);
      const key = ukTaxYear(at);
      r.ukYears[key] = (r.ukYears[key] ?? 0) + pay.gross;
      r.ukWithheld = { ...r.ukWithheld, [key]: (r.ukWithheld?.[key] ?? 0) + (pay.foreignWithheld ?? 0) };
      const payers = ((r.ukPayers ??= {})[key] ??= {});
      if (pay.employer) payers[pay.employer] = (payers[pay.employer] ?? 0) + pay.gross;
    }
  }
  const worked = pay.where && !(country && country !== CITIES.get(home)?.countryId) ? stateOf(pay.where) : lived;
  if (worked !== lived) y.elsewhere[`${lived}>${pay.where}`] = (y.elsewhere[`${lived}>${pay.where}`] ?? 0) + pay.gross;
  const month = `${p.year}-${String(p.month).padStart(2, '0')}`;
  earningsOf(person).months[month] = (earningsOf(person).months[month] ?? 0) + pay.gross;
  addKind(person, month, pay.workStudy ? 'workStudy' : 'wages', pay.gross);
  if (pay.workStudy) y.workStudy += pay.gross;
  else y.acting += pay.gross;
  y.withheld += pay.withheld ?? 0;
  if (pay.withheld) addWithheld(y, pay.withheld, pay.withheldBy);
  // Work done in Denver: its occupational privilege tax, once a month its earnings reach $500 there, the employer's to
  // withhold and remit (from 2026-10-11).
  if ((pay.where ?? home) === DENVER_OPT.cityId && !pay.workStudy) {
    const m = (y.denverMonths ??= {});
    const before = m[month] ?? 0;
    m[month] = before + pay.gross;
    if (before < DENVER_OPT.threshold && m[month] >= DENVER_OPT.threshold) y.denverOpt = (y.denverOpt ?? 0) + DENVER_OPT.monthly;
  }
  y.commission += pay.commission ?? 0;
  y.dues += pay.dues ?? 0;
  if (pay.employer) y.employers[pay.employer] = (y.employers[pay.employer] ?? 0) + pay.gross;
  y.residence = home;
  // A student's work-study wages aren't covered by unemployment insurance.
  if (pay.workStudy) return;
  const q = (earningsOf(person).quarters[quarterKey(p.year, p.month)] ??= { wages: 0 });
  q.wages += pay.gross;
  // Where in the country they were earned, which state a claim goes to.
  (q.byState ??= {})[worked] = (q.byState[worked] ?? 0) + pay.gross;
}

/**
 * The wages paid a person between two moments, gross, and the hours they were for, read from the ledger (from
 * 2026-10-10): the school's work-study, its hours in the memo, and the Summer Cabaret's stipend, a company week taken
 * as forty hours (SLATE’s estimate). A month’s SNAP and Medicaid’s work requirement read them (`systems/assistance.ts`,
 * `systems/health.ts`). A week’s unemployment read them too until 2026-10-13, when it took the work done in
 * the week instead (`workDoneIn`, `systems/school.ts`), as a claimant reports it. Until 2026-10-10 the reads took every
 * week as workless once the career went, though the school still paid these.
 */
export function workedBetween(sim: Simulation, person: Person, from: Instant, to: Instant): { pay: Money; hours: number } {
  let pay = 0;
  let hours = 0;
  for (const t of sim.universe.transactions) {
    if (t.at < from || t.at >= to || t.category !== 'salary') continue;
    if (!t.postings.some((p) => sim.universe.accounts[p.accountId]?.ownerId === person.id)) continue;
    const gross = t.postings.filter((p) => sim.universe.accounts[p.accountId]?.kind === 'income' || (sim.universe.accounts[p.accountId]?.nominal && p.amount < 0)).reduce((s, p) => s - p.amount, 0);
    pay += Math.max(0, gross);
    const stated = /(\d+(?:\.\d+)?) hours/.exec(t.memo);
    hours += stated ? Number(stated[1]) : t.memo.startsWith('Yale Summer Cabaret stipend') ? 40 : 0;
  }
  return { pay, hours };
}

/** A month's income of a kind (`EarningsRecord.kinds`). */
function addKind(person: Person, month: string, kind: 'wages' | 'workStudy' | 'unearned', amount: Money): void {
  const k = ((earningsOf(person).kinds ??= {})[month] ??= { wages: 0, workStudy: 0, unearned: 0 });
  k[kind] += amount;
}

/** A benefit paid: unemployment insurance, income for the return. */
export function recordBenefit(person: Person, at: Instant, zone: string, amount: Money): void {
  const p = zonedParts(at, zone);
  const y = yearOf(person, p.year);
  y.unemployment += amount;
  const home = homeOf(person);
  y.residence = home;
  y.byResidence[home] = (y.byResidence[home] ?? 0) + amount;
  const month = `${p.year}-${String(p.month).padStart(2, '0')}`;
  earningsOf(person).months[month] = (earningsOf(person).months[month] ?? 0) + amount;
  addKind(person, month, 'unearned', amount);
}

/**
 * Interest paid on an account, to the year's return and the month's income.
 * Until 2026-09-27 it was posted as income and read by nothing, so the
 * wealthy start's savings earned about $11,000 a year that no return taxed
 * and no income test for Medicaid or the premium credit saw. From a bank
 * outside America its country and the tax it took at source go with it
 * (`abroad`, from 2026-10-16).
 */
export function recordInterest(person: Person, at: Instant, zone: string, amount: Money, abroad?: { iso: string; withheld: Money }): void {
  const p = zonedParts(at, zone);
  const y = yearOf(person, p.year);
  y.interest = (y.interest ?? 0) + amount;
  if (abroad) {
    const f = ((y.foreignInterest ??= {})[abroad.iso] ??= { gross: 0, withheld: 0 });
    f.gross += amount;
    f.withheld += abroad.withheld;
  }
  const home = homeOf(person);
  y.byResidence[home] = (y.byResidence[home] ?? 0) + amount;
  const month = `${p.year}-${String(p.month).padStart(2, '0')}`;
  earningsOf(person).months[month] = (earningsOf(person).months[month] ?? 0) + amount;
  addKind(person, month, 'unearned', amount);
}

/** A pension paid, to the year it's paid and where they lived: income for the return, and the month's. */
export function recordPension(person: Person, at: Instant, zone: string, amount: Money, withheld = 0, socialSecurity = false): void {
  const p = zonedParts(at, zone);
  const y = yearOf(person, p.year);
  y.pension = (y.pension ?? 0) + amount;
  // Social Security apart, which the return taxes in part (`taxableSocialSecurity`, from 2026-10-10).
  if (socialSecurity) y.socialSecurity = (y.socialSecurity ?? 0) + amount;
  y.withheld += withheld;
  if (withheld) addWithheld(y, withheld);
  const home = homeOf(person);
  y.byResidence[home] = (y.byResidence[home] ?? 0) + amount;
  const month = `${p.year}-${String(p.month).padStart(2, '0')}`;
  earningsOf(person).months[month] = (earningsOf(person).months[month] ?? 0) + amount;
  addKind(person, month, 'unearned', amount);
}

/** A scholarship's taxable part, to the year it's paid and where they lived. */
export function recordScholarship(person: Person, at: Instant, zone: string, amount: Money): void {
  const y = yearOf(person, zonedParts(at, zone).year);
  y.scholarship = (y.scholarship ?? 0) + amount;
  const home = homeOf(person);
  y.byResidence[home] = (y.byResidence[home] ?? 0) + amount;
  y.residence = home;
}

// `recordJobCost`, a cost of the work paid from the bank for the year's return, went on 2026-10-14: nothing called it.

/** The UK tax year a moment is in, by the year it began: 6 April to 5 April. */
export function ukTaxYear(at: Instant): string {
  const p = zonedParts(at, 'Europe/London');
  return String(p.month > 4 || (p.month === 4 && p.day >= 6) ? p.year : p.year - 1);
}

/** Where they live: their home's town, or where they are without one. */
export const homeOf = (person: Person): string => person.currentLocationId;

/** A town's state or region, `us-ny`. */
export const stateOf = (cityId: string): string => CITIES.get(cityId)?.parentId ?? cityId;

/** The quarters before one, newest last: `count` of them, ending the quarter before `year-q`. */
export function quartersBefore(year: number, quarter: number, count: number): string[] {
  const out: string[] = [];
  let y = year;
  let q = quarter;
  for (let n = 0; n < count; n += 1) {
    q -= 1;
    if (q === 0) { q = 4; y -= 1; }
    out.unshift(`${y}-${q}`);
  }
  return out;
}
