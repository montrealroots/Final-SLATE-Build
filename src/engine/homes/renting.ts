// Renting, from application to the deposit back (from November 17, 2026; the package's 03-RENT-BUY-LIVE-MOVE and
// 02-RESEARCH-TO-ENGINE "Renting: search to returned deposit").
// Apply → decision → review and sign (deposit held, first rent paid) → move in (condition recorded) → rent on its day
// each month → repairs and permission for changes → notice → move-out inspection → the deposit settled by its own
// rule: England's protected deposit, Ontario's last month's rent, Queensland's bond, Germany's instalments, France's
// months of base rent. Each step changes the save and the bank, says what changed, and leads to the next.
import { getPlace } from '../../data/places';
import { residenceRight } from '../papers';
import { newId } from '../state';
import type { GameState } from '../types';
import { HOME_RULES } from './market';
import { COMPONENT_WORDS, WORK, depositFor, permissionFor, gardenOf, type Condition, type Home, type WorkKind } from './model';
import { moveBetweenBooks } from '../bank';
import { moveRefusal, moveTo } from '../papers';
import {
  BOOK, addDaysToKey, addMonths, book, canPay, days, document, dollarsOf, formatDateKey, homeOf, homesOf, instantOn, money, note, parseYmdDay,
  payOut, pin, record, scheduleHome, todayAt, type Repair, type Tenancy,
} from './core';

/** Days a landlord takes to decide an application, and how long an approval stands: the game's model. */
export const APPLICATION = { decideDays: 3, approvalStandsDays: 14, termMonths: 12, noticeDays: 30, refundDaysModel: 14 } as const;

export interface RentQuote { rentMinor: number; deposit: ReturnType<typeof depositFor>; firstRentMinor: number; moveInMinor: number; monthlyMinor: number; included: string[]; lines: { what: string; minor: number }[] }
export function rentQuote(home: Home): RentQuote {
  const deposit = depositFor(HOME_RULES, home.scopes, home.priceMinor, home.furnished);
  // Ontario's rent deposit pays the last month; it is still paid now, before move-in.
  const firstDeposit = deposit.instalmentsMinor[0] ?? 0;
  const lines = [{ what: deposit.kind === 'last-rent' ? "Rent deposit (your last month's rent)" : deposit.kind === 'bond' ? 'Bond' : deposit.instalmentsMinor.length > 1 ? 'Deposit, first instalment' : 'Deposit', minor: firstDeposit }, { what: 'First month\'s rent', minor: home.priceMinor }];
  return { rentMinor: home.priceMinor, deposit, firstRentMinor: home.priceMinor, moveInMinor: firstDeposit + home.priceMinor, monthlyMinor: home.priceMinor, included: home.included, lines };
}

/** Why you can't apply for this home now, or null. */
export function applyRefusal(state: GameState, home: Home): string | null {
  if (home.market !== 'rent') return "This home isn't offered to rent.";
  if (todayAt(state, home) > home.validUntil) return 'This offer has lapsed: the landlord let it go on the market again under new terms.';
  const hs = homesOf(state);
  if (hs.tenancies.some((t) => t.homeId === home.id && ['applied', 'approved', 'signed', 'active', 'notice'].includes(t.stage))) return "You've already applied for this home.";
  const q = rentQuote(home);
  if (!canPay(state, home.currency, q.moveInMinor)) return `You need ${money(home.currency, q.moveInMinor)} available to move in: the deposit and the first month's rent.`;
  return null;
}

/** Apply to rent a home: the landlord decides in a few days. Nothing is paid yet. */
export function applyToRent(state: GameState, offer: Home): Tenancy {
  const no = applyRefusal(state, offer);
  if (no) throw new Error(no);
  const home = pin(state, offer);
  const q = rentQuote(home);
  const today = todayAt(state, home);
  const start = home.availableFrom > today ? home.availableFrom : addDaysToKey(today, 7);
  const t: Tenancy = {
    id: newId(state, 'ten'), homeId: home.id, stage: 'applied', appliedAt: state.now, decideAt: state.now + days(APPLICATION.decideDays),
    rentMinor: home.priceMinor, depositMinor: q.deposit.amountMinor, depositKind: q.deposit.kind, depositRule: q.deposit.ruleId, depositSays: q.deposit.says,
    instalmentsMinor: q.deposit.instalmentsMinor, instalmentsPaid: 0, start, termMonths: APPLICATION.termMonths, noticeDays: APPLICATION.noticeDays,
    anchorDay: parseYmdDay(start), rentsPaid: 0, arrearsMinor: 0, changes: [], payments: [],
  };
  homesOf(state).tenancies.push(t);
  scheduleHome(state, t.decideAt, 'rent-decision', { id: t.id });
  note(state, home.id, `You applied to rent ${home.title}. The landlord answers by ${formatDateKey(addDaysToKey(today, APPLICATION.decideDays))}.`);
  return t;
}

/**
 * The landlord's decision, once and kept (reopening the page can't change it). The game's model of a landlord's
 * checks: enough money to pay the move-in costs and three more months' rent, and the right to live in the country if
 * you mean to. It never weighs who you are.
 */
export function decideApplication(state: GameState, t: Tenancy): void {
  if (t.stage !== 'applied') return;
  const home = homeOf(state, t.homeId);
  const need = rentQuote(home).moveInMinor + 3 * t.rentMinor;
  const right = residenceRight(state, home.country);
  if (!canPay(state, home.currency, need)) { t.stage = 'declined'; t.decision = `The landlord turned your application down: they look for ${money(home.currency, need)} available, the move-in costs and three months' rent besides.`; }
  else if (!right.can) { t.stage = 'declined'; t.decision = `The landlord turned your application down: a landlord here checks your right to live in ${getPlace(home.placeId).countryName}. ${right.why}`; }
  else { t.stage = 'approved'; t.decision = `The landlord approved your application. Review the lease and sign by ${formatDateKey(addDaysToKey(todayAt(state, home), APPLICATION.approvalStandsDays))}.`; }
  note(state, home.id, `${home.title}: ${t.decision}`, t.stage === 'declined' ? 'warning' : 'personal');
}

/** The lease's terms, before signing: what you pay, when, and what you may change. */
export function leaseTerms(state: GameState, t: Tenancy): string[] {
  const home = homeOf(state, t.homeId);
  return [
    `Rent ${money(home.currency, t.rentMinor)} a month, due on the ${ordinal(t.anchorDay)} of each month from ${formatDateKey(t.start)}.`,
    `A term of ${t.termMonths} months. Either side gives ${t.noticeDays} days' notice to end it after that (the game's model; local notice rules haven't been researched).`,
    `${t.depositKind === 'last-rent' ? 'Rent deposit' : t.depositKind === 'bond' ? 'Bond' : 'Deposit'}: ${money(home.currency, t.depositMinor)}. ${t.depositSays}`,
    home.included.length ? `Included in the rent: ${home.included.join(' and ')}. They aren't billed again.` : 'No utilities are included: you pay them yourself.',
    home.landlordItems.length ? `The landlord's: ${home.landlordItems.join(', ')}. They repair them.` : 'No appliances are the landlord\'s.',
    'Changes to the home need the landlord\'s written permission; anything you add that is fixed may have to be removed when you leave.',
    'Repairs to the building, its plumbing, wiring and heating, and the landlord\'s appliances are the landlord\'s; damage you cause is yours.',
  ];
}
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

export function signRefusal(state: GameState, t: Tenancy): string | null {
  const home = homeOf(state, t.homeId);
  if (t.stage === 'signed' || t.stage === 'active') return "You've already signed this lease.";
  if (t.stage !== 'approved') return t.stage === 'applied' ? 'The landlord hasn\'t answered yet.' : 'This application was not approved.';
  if (state.now > t.decideAt + days(APPLICATION.approvalStandsDays)) return 'The approval has lapsed: the landlord offered the home to someone else.';
  const q = rentQuote(home);
  if (!canPay(state, home.currency, q.moveInMinor)) return `You need ${money(home.currency, q.moveInMinor)} available to sign: the deposit and the first month's rent.`;
  return null;
}

/** Sign: the deposit is held (it stays yours, not spent), the first month's rent is paid, and rent is due each month. */
export function signLease(state: GameState, id: string): Tenancy {
  const hs = homesOf(state);
  const t = hs.tenancies.find((x) => x.id === id);
  if (!t) throw new Error('That application is no longer on record.');
  const no = signRefusal(state, t);
  if (no) throw new Error(no);
  const home = homeOf(state, t.homeId);
  const first = t.instalmentsMinor[0] ?? 0;
  // Deposit first, then rent: each keyed, so a double click or a reload pays each once. Checked above as one sum.
  book(state, home, `dep:${t.id}:1`, -first, `${t.depositKind === 'bond' ? 'Bond' : 'Deposit'} held: ${home.title}`, BOOK.depositsHeld);
  record(t.payments, { key: `dep:${t.id}:1`, label: t.instalmentsMinor.length > 1 ? 'Deposit, first instalment, held' : 'Deposit held', minor: first, kind: 'held' }, state);
  t.instalmentsPaid = 1;
  payOut(state, home, `rent:${t.id}:1`, t.rentMinor, `Rent: ${home.title}`, 'Rent');
  record(t.payments, { key: `rent:${t.id}:1`, label: `Rent from ${formatDateKey(t.start)}`, minor: t.rentMinor, kind: 'paid' }, state);
  t.rentsPaid = 1;
  t.rentPaidThrough = addDaysToKey(addMonths(t.start, 1, t.anchorDay), -1);
  t.stage = 'signed';
  scheduleHome(state, instantOn(home, addMonths(t.start, 1, t.anchorDay)), 'rent-due', { id: t.id, n: 2 }, 'silent', `home-rent:${t.id}:2`);
  for (let i = 1; i < t.instalmentsMinor.length; i++) scheduleHome(state, instantOn(home, addMonths(t.start, i, t.anchorDay)), 'deposit-instalment', { id: t.id, n: i + 1 }, 'silent', `home-depi:${t.id}:${i + 1}`);
  document(state, home.id, 'Lease', leaseTerms(state, t));
  note(state, home.id, `You signed the lease on ${home.title}. ${money(home.currency, first)} is held as your deposit; it isn't available to spend. Your next rent, ${money(home.currency, t.rentMinor)}, is due on ${formatDateKey(addMonths(t.start, 1, t.anchorDay))}. You can move in from ${formatDateKey(t.start)}.`, 'money');
  return t;
}

/** A rent due: paid from the bank on its day, once. Short of money, it stays owed and the landlord is told; nothing else. */
export function rentDue(state: GameState, t: Tenancy, n: number): void {
  if (!['signed', 'active', 'notice'].includes(t.stage) || t.rentsPaid >= n) return;
  const home = homeOf(state, t.homeId);
  const due = addMonths(t.start, n - 1, t.anchorDay);
  // Ontario: the rent deposit pays the last month of the tenancy.
  const last = t.endsOn && addMonths(due, 1, t.anchorDay) > t.endsOn;
  if (last && t.depositKind === 'last-rent') {
    t.rentsPaid = n; t.rentPaidThrough = t.endsOn;
    note(state, home.id, `Your last month's rent on ${home.title} is paid by your rent deposit, as Ontario's rules have it: nothing more is taken.`, 'money');
    return;
  }
  try {
    payOut(state, home, `rent:${t.id}:${n}`, t.rentMinor, `Rent: ${home.title}`, 'Rent');
    record(t.payments, { key: `rent:${t.id}:${n}`, label: `Rent from ${formatDateKey(due)}`, minor: t.rentMinor, kind: 'paid' }, state);
    t.rentsPaid = n;
    t.rentPaidThrough = addDaysToKey(addMonths(due, 1, t.anchorDay), -1);
  } catch {
    t.arrearsMinor += t.rentMinor;
    t.arrearsSince ??= state.now;
    t.rentsPaid = n;
    record(t.payments, { key: `rent:${t.id}:${n}:failed`, label: `Rent from ${formatDateKey(due)} not paid`, minor: t.rentMinor, kind: 'failed' }, state);
    note(state, home.id, `Your rent of ${money(home.currency, t.rentMinor)} on ${home.title} couldn't be paid: your bank refused it. You owe ${money(home.currency, t.arrearsMinor)}. Pay it from Your Home.`, 'warning');
  }
  const next = addMonths(t.start, n, t.anchorDay);
  if (!t.endsOn || next < t.endsOn) scheduleHome(state, instantOn(home, next), 'rent-due', { id: t.id, n: n + 1 }, 'silent', `home-rent:${t.id}:${n + 1}`);
}

export function payArrears(state: GameState, id: string): void {
  const t = homesOf(state).tenancies.find((x) => x.id === id);
  if (!t || t.arrearsMinor <= 0) throw new Error('You owe no rent on this home.');
  const home = homeOf(state, t.homeId);
  if (!canPay(state, home.currency, t.arrearsMinor)) throw new Error(`You need ${money(home.currency, t.arrearsMinor)} available to pay what you owe.`);
  const k = `arrears:${t.id}:${t.payments.length}`;
  payOut(state, home, k, t.arrearsMinor, `Rent owed: ${home.title}`, 'Rent');
  record(t.payments, { key: k, label: 'Rent owed, paid', minor: t.arrearsMinor, kind: 'paid' }, state);
  note(state, home.id, `You paid the ${money(home.currency, t.arrearsMinor)} of rent you owed on ${home.title}.`, 'money');
  t.arrearsMinor = 0; t.arrearsSince = undefined;
}

export function depositInstalment(state: GameState, t: Tenancy, n: number): void {
  if (t.instalmentsPaid >= n || t.stage === 'ended') return;
  const home = homeOf(state, t.homeId);
  const amount = t.instalmentsMinor[n - 1];
  try {
    book(state, home, `dep:${t.id}:${n}`, -amount, `Deposit instalment ${n} held: ${home.title}`, BOOK.depositsHeld);
    record(t.payments, { key: `dep:${t.id}:${n}`, label: `Deposit, instalment ${n}, held`, minor: amount, kind: 'held' }, state);
    t.instalmentsPaid = n;
    note(state, home.id, `Instalment ${n} of your deposit, ${money(home.currency, amount)}, is held for ${home.title}.`, 'money');
  } catch {
    note(state, home.id, `Instalment ${n} of your deposit on ${home.title}, ${money(home.currency, amount)}, couldn't be paid. It is still owed.`, 'warning');
    t.arrearsMinor += amount;
    t.instalmentsPaid = n;
  }
}

// ---------------- Living there ----------------

/** Why you can't make this home your residence now, or null. Papers decide whether you may live in its country. */
export function moveInRefusal(state: GameState, homeId: string): string | null {
  const hs = homesOf(state);
  const home = hs.homes[homeId];
  if (!home) return 'That home is no longer on record.';
  if (hs.residence === homeId) return 'You already live here.';
  const t = hs.tenancies.find((x) => x.homeId === homeId && (x.stage === 'signed' || x.stage === 'active'));
  const owns = hs.owned.some((o) => o.homeId === homeId && !o.soldAt);
  if (!t && !owns) return "You don't rent or own this home.";
  if (t && todayAt(state, home) < t.start) return `You can move in from ${formatDateKey(t.start)}.`;
  if (hs.lettings.some((l) => l.homeId === homeId && (l.stage === 'let' || l.stage === 'notice'))) return 'Your tenant lives here: you can move in once their tenancy has ended.';
  if (hs.jobs.some((j) => j.homeId === homeId && j.stage === 'working' && j.disruptive)) return "Work is under way here: you can't stay during this stage.";
  const r = residenceRight(state, home.country);
  if (!r.can) return r.why;
  if (state.travel) return "You're travelling: you can move in once you arrive.";
  // A home in another town is a move there (papers.ts moveTo): its entry, your bank and the journey.
  if (state.character.livesIn !== home.placeId) return moveRefusal(state, home.placeId);
  return null;
}

/** Move in: your main residence, with its condition recorded as you found it, room by room. */
export function moveIn(state: GameState, homeId: string): void {
  const no = moveInRefusal(state, homeId);
  if (no) throw new Error(no);
  const hs = homesOf(state);
  const home = hs.homes[homeId];
  const t = hs.tenancies.find((x) => x.homeId === homeId && (x.stage === 'signed' || x.stage === 'active'));
  const before = hs.residence;
  hs.residence = homeId;
  if (t) {
    t.stage = 'active';
    t.movedIn = state.now;
    t.inventory = { ...Object.fromEntries((Object.keys(home.condition) as (keyof Condition)[]).map((k) => [k, home.condition[k]])), ...Object.fromEntries(home.landlordItems.map((i) => [i, 'present' as const])) };
    document(state, homeId, 'Move-In Condition Record', [
      ...(Object.keys(home.condition) as (keyof Condition)[]).map((k) => `${COMPONENT_WORDS[k]}: ${home.condition[k]}.`),
      ...home.landlordItems.map((i) => `The landlord's ${i.toLowerCase()}: present.`),
    ]);
  }
  // Your belongings move with you; the household's bills start.
  for (const it of hs.items.filter((i) => i.owner === 'you' && i.homeId === before && !i.builtIn && (i.stage === 'installed' || i.stage === 'delivered'))) { it.homeId = homeId; it.roomId = null; it.stage = 'delivered'; }
  scheduleHome(state, instantOn(home, addMonths(todayAt(state, home), 1)), 'bill', { homeId }, 'silent', `home-bill:${homeId}:${todayAt(state, home).slice(0, 7)}`);
  // Living in another place moves your life there (papers.ts moveTo): checked above with its own refusals.
  if (state.character.livesIn !== home.placeId) moveTo(state, home.placeId);
  note(state, homeId, `You moved into ${home.title}. It's your home now.${t ? ' Its condition as you found it is on record.' : ''}`);
}

// ---------------- Repairs and permission ----------------

export const LANDLORD_REPAIR_DAYS = 5;
/** Report something broken: the landlord's to fix if it's the building or their appliance; yours if it's yours. */
export function reportRepair(state: GameState, homeId: string, component: string): Repair {
  const hs = homesOf(state);
  const home = hs.homes[homeId];
  if (!home) throw new Error('That home is no longer on record.');
  const renting = hs.tenancies.some((t) => t.homeId === homeId && t.stage === 'active');
  const owns = hs.owned.some((o) => o.homeId === homeId && !o.soldAt);
  if (!renting && !owns) throw new Error("You don't live in or own this home.");
  if (hs.repairs.some((r) => r.homeId === homeId && r.component === component && !['fixed', 'declined'].includes(r.stage))) throw new Error('That repair is already reported.');
  const yourItem = hs.items.find((i) => i.homeId === homeId && i.name === component && i.owner === 'you');
  const landlords = renting && !yourItem;
  const today = todayAt(state, home);
  const quoteMinor = landlords ? 0 : repairQuote(home, component);
  const r: Repair = { id: newId(state, 'rep'), homeId, component, reportedAt: state.now, who: landlords ? 'landlord' : 'you', stage: landlords ? 'booked' : 'quoted', quoteMinor, says: '' };
  if (landlords) {
    r.visitAt = instantOn(home, addDaysToKey(today, LANDLORD_REPAIR_DAYS));
    r.says = `The landlord is responsible for this. Their contractor visits on ${formatDateKey(addDaysToKey(today, LANDLORD_REPAIR_DAYS))}; it costs you nothing.`;
    scheduleHome(state, r.visitAt, 'repair-visit', { id: r.id });
  } else r.says = `This is yours to repair. A contractor quotes ${money(home.currency, quoteMinor)} (the game's estimate).`;
  hs.repairs.push(r);
  note(state, homeId, `${home.title}: ${component} reported. ${r.says}`);
  return r;
}
export function repairQuote(home: Home, component: string): number {
  const base: Record<string, number> = { Roof: 140000, Structure: 400000, Plumbing: 45000, Electrics: 38000, Heating: 60000, 'Floors And Walls': 30000 };
  return Math.round((base[component] ?? 25000) * (home.currency === 'USD' ? 1 : 1));
}
/** Approve a quoted repair that's yours: paid now, the contractor visits in two days. */
export function approveRepair(state: GameState, id: string): void {
  const hs = homesOf(state);
  const r = hs.repairs.find((x) => x.id === id);
  if (!r || r.stage !== 'quoted') throw new Error('There is no quote to approve.');
  const home = homeOf(state, r.homeId);
  if (!canPay(state, home.currency, r.quoteMinor ?? 0)) throw new Error(`You need ${money(home.currency, r.quoteMinor ?? 0)} available for this repair.`);
  payOut(state, home, `repair:${r.id}`, r.quoteMinor ?? 0, `Repair: ${r.component}, ${home.title}`, 'Home Repairs');
  r.stage = 'booked';
  r.visitAt = instantOn(home, addDaysToKey(todayAt(state, home), 2));
  scheduleHome(state, r.visitAt, 'repair-visit', { id: r.id });
  note(state, home.id, `Repair booked: ${r.component}, ${money(home.currency, r.quoteMinor ?? 0)} paid. The contractor comes on ${formatDateKey(addDaysToKey(todayAt(state, home), 2))}.`, 'money');
}
export function repairVisit(state: GameState, r: Repair): void {
  if (r.stage !== 'booked') return;
  const home = homeOf(state, r.homeId);
  r.stage = 'fixed';
  const key = (Object.keys(COMPONENT_WORDS) as (keyof Condition)[]).find((k) => COMPONENT_WORDS[k] === r.component);
  if (key) home.condition[key] = 'good';
  const item = homesOf(state).items.find((i) => i.homeId === r.homeId && i.name === r.component && i.stage === 'faulty');
  if (item) item.stage = 'installed';
  note(state, home.id, `${home.title}: ${r.component} repaired.`);
}

/** Ask the landlord's written permission for a change. They answer in a few days (New Zealand's 21 for a minor change). */
export function askPermission(state: GameState, homeId: string, work: WorkKind): void {
  const hs = homesOf(state);
  const home = hs.homes[homeId];
  const t = hs.tenancies.find((x) => x.homeId === homeId && x.stage === 'active');
  if (!home || !t) throw new Error('You need to be living here as a tenant to ask your landlord.');
  if (hs.permissions.some((p) => p.homeId === homeId && p.work === work && p.stage === 'asked')) throw new Error('You have already asked about this.');
  const check = permissionFor(HOME_RULES, home, 'tenant', work, gardenOf(home));
  if (!check.allowed) throw new Error(check.steps.at(-1)!.says);
  const nz = check.steps.find((s) => s.ruleId === 'nz.minor_changes');
  const wait = nz ? 21 : 10;
  const p = { id: newId(state, 'perm'), homeId, work, askedAt: state.now, decideAt: state.now + days(wait), stage: 'asked' as const, check };
  hs.permissions.push(p);
  scheduleHome(state, p.decideAt, 'permission-decision', { id: p.id });
  note(state, homeId, `You asked your landlord for permission: ${WORK[work].label}. They answer by ${formatDateKey(addDaysToKey(todayAt(state, home), wait))}.`);
}
/** The landlord's answer, the game's model: a reversible change is granted on condition you undo it; structural work isn't. */
export function decidePermission(state: GameState, p: { id: string; homeId: string; work: WorkKind; stage: string; conditions?: string }): void {
  if (p.stage !== 'asked') return;
  const home = homeOf(state, p.homeId);
  const w = WORK[p.work];
  if (w.structural || w.exterior) { p.stage = 'refused'; p.conditions = 'Your landlord refused: they won\'t allow structural or outside work by a tenant.'; }
  else { p.stage = 'granted'; p.conditions = w.reversible ? 'Your landlord agreed, on condition you put it back as it was when you leave, at your cost.' : 'Your landlord agreed. You pay for the work; it stays when you leave.'; }
  note(state, home.id, `${home.title}: ${w.label}. ${p.conditions}`);
}

// ---------------- Leaving ----------------

export function giveNotice(state: GameState, id: string): void {
  const t = homesOf(state).tenancies.find((x) => x.id === id);
  if (!t || t.stage !== 'active' && t.stage !== 'signed') throw new Error("There's no tenancy to give notice on.");
  const home = homeOf(state, t.homeId);
  const today = todayAt(state, home);
  const earliest = addDaysToKey(today, t.noticeDays);
  const termEnd = addDaysToKey(addMonths(t.start, t.termMonths, t.anchorDay), -1);
  t.endsOn = earliest > termEnd ? earliest : termEnd;
  t.stage = 'notice';
  scheduleHome(state, instantOn(home, t.endsOn, 12), 'tenancy-end', { id: t.id }, 'notify', `home-tend:${t.id}`);
  note(state, home.id, `You gave notice on ${home.title}. The tenancy ends on ${formatDateKey(t.endsOn)}${t.endsOn === termEnd ? ', the end of its term' : ''}. Rent is due until then.`);
}

/** Move-out: the condition now against the record at move-in; wear is the landlord's, damage and missing items are yours. */
export function endTenancy(state: GameState, t: Tenancy): void {
  if (t.stage !== 'notice') return;
  const hs = homesOf(state);
  const home = homeOf(state, t.homeId);
  const deductions: NonNullable<Tenancy['deductions']> = [];
  const inv = t.inventory ?? {};
  for (const [k, was] of Object.entries(inv)) {
    if (was === 'present') {
      const broken = hs.repairs.some((r) => r.homeId === home.id && r.component === k && r.who === 'you' && r.stage !== 'fixed');
      if (broken) deductions.push({ what: `The landlord's ${k.toLowerCase()} left broken`, minor: 30000, wear: false });
      continue;
    }
    const now = home.condition[k as keyof Condition];
    if (was === 'good' && now === 'fair') deductions.push({ what: `${COMPONENT_WORDS[k as keyof Condition]}: ordinary wear`, minor: 0, wear: true });
    if (now === 'poor' && was !== 'poor') deductions.push({ what: `${COMPONENT_WORDS[k as keyof Condition]}: damage beyond wear`, minor: 40000, wear: false });
  }
  for (const c of t.changes.filter((c) => c.restore && !c.restored)) deductions.push({ what: `${WORK[c.work].label}: not put back as agreed`, minor: 50000, wear: false });
  t.deductions = deductions;
  const owed = deductions.reduce((a, d) => a + d.minor, 0) + t.arrearsMinor;
  const held = t.payments.filter((p) => p.kind === 'held').reduce((a, p) => a + p.minor, 0);
  // Ontario's rent deposit can't be kept for damage: it paid the last month (rentDue). Damage is claimed separately.
  const keep = t.depositKind === 'last-rent' ? 0 : Math.min(held, owed);
  t.stage = 'ended';
  t.ended = state.now;
  if (hs.residence === home.id) hs.residence = undefined;
  // Your belongings go with you into storage until your next home.
  for (const it of hs.items.filter((i) => i.homeId === home.id && i.owner === 'you')) { if (!it.builtIn) { it.homeId = null; it.roomId = null; it.stage = 'stored'; } }
  const refundDays = t.depositRule === 'en.deposit.cap' ? 10 : APPLICATION.refundDaysModel;
  if (t.depositKind !== 'last-rent') scheduleHome(state, instantOn(home, addDaysToKey(todayAt(state, home), refundDays)), 'deposit-settle', { id: t.id, keep }, 'notify', `home-dset:${t.id}`);
  document(state, home.id, 'Move-Out Inspection', deductions.length ? deductions.map((d) => `${d.what}${d.wear ? ': not charged' : `: ${money(home.currency, d.minor)}`}`) : ['Nothing beyond ordinary wear.']);
  note(state, home.id, `You moved out of ${home.title}. ${t.depositKind === 'last-rent' ? 'Your rent deposit paid your last month.' : keep ? `The landlord proposes keeping ${money(home.currency, keep)} of your deposit; the rest comes back by ${formatDateKey(addDaysToKey(todayAt(state, home), refundDays))}. You can dispute it.` : `Your deposit, ${money(home.currency, held)}, comes back by ${formatDateKey(addDaysToKey(todayAt(state, home), refundDays))}.`}`);
}

/** Dispute what the landlord keeps: decided by the game's model of a scheme's adjudicator (wear is never chargeable). */
export function disputeDeductions(state: GameState, id: string): void {
  const t = homesOf(state).tenancies.find((x) => x.id === id);
  if (!t || t.stage !== 'ended' || t.refundedMinor !== undefined) throw new Error('There is nothing to dispute.');
  if (t.disputed) throw new Error('You have already disputed it.');
  const home = homeOf(state, t.homeId);
  t.disputed = true;
  // A deduction for something you agreed to put back stands; one the inspection called damage is halved, the game's model.
  for (const d of t.deductions ?? []) if (!d.wear && !/not put back/.test(d.what)) d.minor = Math.round(d.minor / 2);
  t.disputeDecision = 'The adjudicator halved the charges for damage; what you agreed to put back stands.';
  note(state, home.id, `${home.title}: ${t.disputeDecision}`);
}

/** The deposit settled, once: what's kept goes to the landlord, the rest back to you. Neither is income or an expense twice. */
export function settleDeposit(state: GameState, t: Tenancy): void {
  if (t.refundedMinor !== undefined) return;
  const home = homeOf(state, t.homeId);
  const held = t.payments.filter((p) => p.kind === 'held').reduce((a, p) => a + p.minor, 0);
  const owed = (t.deductions ?? []).reduce((a, d) => a + d.minor, 0) + t.arrearsMinor;
  const keep = Math.min(held, owed);
  const back = held - keep;
  if (keep > 0) {
    // What the landlord keeps: from the deposit book to the cost it covers (damage, unpaid rent): an expense now, once.
    moveKept(state, home, `dep:${t.id}:kept`, keep, `Deposit kept for damage or rent owed: ${home.title}`);
    record(t.payments, { key: `dep:${t.id}:kept`, label: 'Kept from your deposit', minor: keep, kind: 'paid' }, state);
    t.arrearsMinor = 0;
  }
  if (back > 0) {
    book(state, home, `dep:${t.id}:back`, back, `Deposit returned: ${home.title}`, BOOK.depositsHeld);
    record(t.payments, { key: `dep:${t.id}:back`, label: 'Deposit returned', minor: back, kind: 'released' }, state);
  }
  t.keptMinor = keep;
  t.refundedMinor = back;
  note(state, home.id, back ? `${money(home.currency, back)} of your deposit on ${home.title} is back in your account${keep ? `; ${money(home.currency, keep)} was kept` : ''}. A deposit returned isn't income.` : `Your whole deposit on ${home.title} was kept against what you owed.`, 'money');
}
/** What a landlord keeps leaves the deposit book as the cost it covers: an expense, once. */
function moveKept(state: GameState, home: Home, key: string, minor: number, label: string): void {
  moveBetweenBooks(state, key, dollarsOf(state, home.currency, minor), label, BOOK.depositsHeld, BOOK.depositsKept);
}
