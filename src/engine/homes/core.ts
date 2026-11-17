// Homes & Property: what the save keeps, and the helpers every housing cycle shares (from November 17, 2026).
//
// The save keeps the player's homes and agreements, never the market: a home is pinned (copied in, as offered) only
// when the player acts on it, so its price, terms and evidence can't change under a signed agreement when the packs
// are updated. Every housing event runs on the game's clock as one kind, 'home', in order, once: advancing a month
// pays each rent, bill and stage due in it once, and nothing happens while the game is closed.
//
// Money goes through the bank (engine/bank.ts), its one ledger. An expense (rent, a bill, a repair) through
// postToBank; what is neither income nor expense (a deposit held, a home's cost, a mortgage, a tenant's deposit you
// hold) through postHousing, so none of it is ever earnings. Every posting has a key: a retry, a reload or a double
// click never pays twice.
import { getPlace } from '../../data/places';
import { bankReach, postHousing, postToBank, refundExpense, type HousingBook } from '../bank';
import { exchange } from '../bankworld/content/currency';
import { formatMoney } from '../bankworld/core/money';
import { addLog, newId, schedule } from '../state';
import { DAY, addDaysToKey, dateKey, formatDateKey, localToInstant, parseYmd } from '../time';
import type { GameState } from '../types';
import type { Design, Grade, Home, WorkKind } from './model';
import type { PermissionCheck } from './model';

export interface Payment { key: string; at: number; label: string; minor: number; kind: 'paid' | 'received' | 'held' | 'released' | 'refunded' | 'borrowed' | 'repaid' | 'failed' }

export interface Tenancy {
  id: string; homeId: string;
  stage: 'applied' | 'approved' | 'declined' | 'lapsed' | 'signed' | 'active' | 'notice' | 'ended';
  appliedAt: number; decideAt: number; decision?: string;
  rentMinor: number; depositMinor: number; depositKind: 'security' | 'last-rent' | 'bond' | 'none'; depositRule: string | null; depositSays: string;
  instalmentsMinor: number[]; instalmentsPaid: number;
  start: string; termMonths: number; noticeDays: number;
  /** The day of the month rent is due, from the start date. */
  anchorDay: number; rentPaidThrough?: string; rentsPaid: number;
  arrearsMinor: number; arrearsSince?: number;
  movedIn?: number; endsOn?: string; ended?: number;
  /** Condition at move-in, by component and item, against which move-out is read. */
  inventory?: Record<string, Grade | 'present'>;
  /** Changes made with the landlord's permission, and whether they must be undone. */
  changes: { work: WorkKind; restore: boolean; restored: boolean }[];
  deductions?: { what: string; minor: number; wear: boolean }[];
  /** Damage you caused while living here (the game's chance of an accident): yours to repair, not the landlord's. */
  damaged?: string[];
  disputed?: boolean; disputeDecision?: string;
  refundedMinor?: number; keptMinor?: number;
  payments: Payment[];
}
export interface Repair { id: string; homeId: string; component: string; reportedAt: number; who: 'landlord' | 'you'; stage: 'reported' | 'quoted' | 'booked' | 'fixed' | 'declined'; quoteMinor?: number; visitAt?: number; claimed?: boolean; claimPaidMinor?: number; says: string }
export interface Permission { id: string; homeId: string; work: WorkKind; askedAt: number; decideAt: number; stage: 'asked' | 'granted' | 'refused'; conditions?: string; check: PermissionCheck }
export interface Purchase {
  id: string; homeId: string;
  stage: 'offered' | 'countered' | 'accepted' | 'rejected' | 'withdrawn' | 'inspecting' | 'financing' | 'ready' | 'completed' | 'failed';
  offerMinor: number; counterMinor?: number; askedAt: number; answerAt: number;
  finance: { kind: 'cash' } | { kind: 'mortgage'; loanMinor: number; years: number; paymentMinor: number; rate: number; decision?: 'approved' | 'refused'; decidedAt?: number; says?: string };
  inspect: boolean; inspection?: { at: number; found: string[]; feeMinor: number };
  earnestMinor: number; closingMinor: number; completeOn?: string; says?: string; payments: Payment[];
  /** A route the rules require: Mexico's bank trust, Kenya's leasehold, Singapore's approval for a landed home. */
  route?: string; approvalAt?: number;
}
export interface Owned { homeId: string; since: number; costMinor: number; mortgage?: { name: string; principalMinor: number; rate: number; months: number; paymentMinor: number; paidMonths: number; anchorDay: number; start: string; arrearsMinor: number }; soldAt?: number; payments: Payment[] }
export interface Sale { id: string; homeId: string; askingMinor: number; listedAt: number; stage: 'listed' | 'offer' | 'agreed' | 'completed' | 'withdrawn'; offerMinor?: number; buyerAt?: number; completeOn?: string; feeMinor: number; proceedsMinor?: number; debtRepaidMinor?: number; payments: Payment[] }
export interface Item {
  id: string; homeId: string | null; roomId: string | null; name: string; category: string; sourceId: string | null; model: string | null;
  priceMinor: number; deliveryMinor: number; installMinor: number; currency: string;
  stage: 'ordered' | 'delivered' | 'needs-measurements' | 'installed' | 'faulty' | 'returned' | 'disposed' | 'sold' | 'stored';
  orderedAt: number; deliverAt?: number; installedAt?: number; warrantyUntil?: number; annualKwh: number | null; fuel: string | null;
  needs: string[]; builtIn: boolean; owner: 'you' | 'landlord'; says?: string; payments: Payment[];
  /** EPA records no depth for it: the installer measures before it can go in. */
  measureFirst?: boolean; measured?: boolean;
}
export interface Job { id: string; homeId: string; work: WorkKind; stage: 'awaiting-permission' | 'scheduled' | 'working' | 'done' | 'refused' | 'cancelled'; quoteMinor: number; paidMinor: number; startOn: string; doneOn: string; needs: string[]; check: PermissionCheck; payments: Payment[]; disruptive: boolean }
export interface Stay { id: string; placeId: string; from: string; to: string; nightlyMinor: number; currency: string; paidMinor: number; reason: string }
export interface Policy { id: string; homeId: string; cover: 'contents' | 'buildings'; monthlyMinor: number; excessMinor: number; since: number; endedAt?: number; claims: { repairId: string; stage: 'assessing' | 'paid' | 'refused'; paidMinor?: number; says: string }[] }
export interface Bill { key: string; homeId: string; period: string; lines: { what: string; minor: number; basis: string }[]; totalMinor: number; paid: boolean }
export interface BuildStage { name: string; days: number; costMinor: number; exterior: boolean; inspection: boolean; started?: string; done?: string; paidKey?: string; failedInspections: number }
export interface Build {
  id: string; landId: string; stage: 'designing' | 'awaiting-permission' | 'permitted' | 'refused' | 'building' | 'paused' | 'complete';
  design: Design; floorAreaM2: number; rooms: { kind: import('./model').RoomKind; areaM2: number }[]; revisions: { revision: number; at: number; changed: string[]; costMinor: number }[];
  quoteMinor: number; permitAskedAt?: number; permitDecideAt?: number; permitSays?: string;
  stages: BuildStage[]; current: number; pausedBecause?: string; homeId?: string; defectsUntil?: string; defects: string[]; payments: Payment[];
}
export interface Letting {
  id: string; homeId: string; stage: 'advertised' | 'applicants' | 'let' | 'notice' | 'ended' | 'withdrawn';
  rentMinor: number; listedAt: number; applicants: { name: string; offerMinor: number; checks: string }[];
  tenant?: string; start?: string; anchorDay?: number; depositMinor?: number; rentsReceived: number; arrearsMinor: number;
  manager?: { feeShare: number; capMinor: number }; repairs: { what: string; minor: number; stage: 'asked' | 'done' | 'awaiting-you' }[]; endsOn?: string; vacantSince?: number; payments: Payment[];
}
export interface HomesState {
  homes: Record<string, Home>;
  favorites: string[];
  viewings: { id: string; homeId: string; at: number; seen?: boolean; notes?: string[] }[];
  tenancies: Tenancy[]; repairs: Repair[]; permissions: Permission[];
  purchases: Purchase[]; owned: Owned[]; sales: Sale[];
  items: Item[]; jobs: Job[]; stays: Stay[]; policies: Policy[]; bills: Bill[];
  builds: Build[]; lettings: Letting[];
  residence?: string;
  history: { at: number; homeId?: string; text: string }[];
  documents: { id: string; at: number; homeId: string; title: string; lines: string[] }[];
}

export function homesOf(state: GameState): HomesState {
  return (state.homes ??= { homes: {}, favorites: [], viewings: [], tenancies: [], repairs: [], permissions: [], purchases: [], owned: [], sales: [], items: [], jobs: [], stays: [], policies: [], bills: [], builds: [], lettings: [], history: [], documents: [] });
}
export const homeOf = (state: GameState, id: string): Home => {
  const h = homesOf(state).homes[id];
  if (!h) throw new Error('That home is no longer on record.');
  return h;
};
/** A home acted on is kept as it was offered: later market packs can't rewrite it. */
export function pin(state: GameState, home: Home): Home {
  const hs = homesOf(state);
  const kept = hs.homes[home.id];
  if (!kept) return (hs.homes[home.id] = structuredClone(home));
  // A home back on the market comes with its new listing: its asking price and dates, and the evidence they're from.
  // What you've done there (a tenancy, a purchase, ownership) keeps the record as it was agreed.
  if (!engaged(hs, home.id) && kept.validUntil !== home.validUntil) Object.assign(kept, { priceMinor: home.priceMinor, availableFrom: home.availableFrom, validUntil: home.validUntil, evidence: structuredClone(home.evidence), market: home.market });
  return kept;
}
/** Whether the player is renting, buying, owns or is selling or letting this home: its agreed terms are then fixed. */
export function engaged(hs: HomesState, id: string): boolean {
  return hs.tenancies.some((t) => t.homeId === id && ['applied', 'approved', 'signed', 'active', 'notice'].includes(t.stage))
    || hs.purchases.some((p) => p.homeId === id && !['completed', 'failed', 'rejected', 'withdrawn'].includes(p.stage))
    || hs.owned.some((o) => o.homeId === id && !o.soldAt);
}

export const zoneOf = (h: Pick<Home, 'placeId'>) => getPlace(h.placeId).zone;
export const todayAt = (state: GameState, h: Pick<Home, 'placeId'>) => dateKey(state.now, zoneOf(h));
/** 09:00 local on a day: when a due housing event happens. */
export function instantOn(h: Pick<Home, 'placeId'>, day: string, hour = 9): number {
  const { year, month, day: d } = parseYmd(day);
  return localToInstant(zoneOf(h), year, month, d, hour).instant;
}
/** The same day of the month n months on, or the month's last day where it has fewer (a 31st in February is the 28th). */
export function addMonths(day: string, n: number, anchor = parseYmd(day).day): string {
  const { year, month } = parseYmd(day);
  const m0 = month - 1 + n;
  const y = year + Math.floor(m0 / 12);
  const m = ((m0 % 12) + 12) % 12 + 1;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(anchor, last)).padStart(2, '0')}`;
}
export const days = (n: number) => n * DAY;
export const parseYmdDay = (day: string) => parseYmd(day).day;
export { addDaysToKey, formatDateKey };

/** Hundredths of a home's currency, as dollars for the bank, at the day's rate. Throws where no rate is recorded. */
export function dollarsOf(state: GameState, currency: string, minor: number): number {
  const usd = exchange(minor, currency, 'USD', dateKey(state.now, 'UTC'));
  if (usd === undefined) throw new Error(`No exchange rate for ${currency} is recorded by today, so the bank can't pay it.`);
  return usd / 100;
}
/** A dollar figure of the game's in a home's own money at today's rate, to the whole unit. */
export function localOf(state: GameState, currency: string, usd: number): number {
  return Math.round((usd * 100) / (dollarsOf(state, currency, 10000) / 100) / 100) * 100;
}
export const money = (currency: string, minor: number) => formatMoney(minor, currency, { cents: minor % 100 !== 0 });

/** Pay out of your bank: an expense. Throws, paying nothing, when the bank can't. */
export function payOut(state: GameState, h: Pick<Home, 'currency'>, key: string, minor: number, label: string, counter: string, goods = false): void {
  if (minor <= 0) return;
  postToBank(state, goods ? 'home-goods' : 'housing', -dollarsOf(state, h.currency, minor), label, key, counter);
}
/** Money in that is income (rent from your tenant): never wages, so never your earnings from work. */
export function payIn(state: GameState, h: Pick<Home, 'currency'>, key: string, minor: number, label: string, counter: string): void {
  if (minor <= 0) return;
  postToBank(state, 'housing', dollarsOf(state, h.currency, minor), label, key, counter);
}
export function book(state: GameState, h: Pick<Home, 'currency'>, key: string, minor: number, label: string, b: HousingBook): void {
  if (minor === 0) return;
  postHousing(state, key, dollarsOf(state, h.currency, minor), label, b);
}
export function refund(state: GameState, h: Pick<Home, 'currency'>, key: string, minor: number, label: string, counter: string): void {
  refundExpense(state, key, dollarsOf(state, h.currency, minor), label, counter);
}
/** Whether the bank can pay this much now (accounts, linked savings and an overdraft), before anything is committed. */
export function canPay(state: GameState, currency: string, minor: number): boolean {
  const u = state.bank;
  if (!u) return false;
  // bankReach is in dollars and includes the overdraft: a housing payment may use it, as every bank payment may.
  return bankReach(state) + 1e-6 >= dollarsOf(state, currency, minor);
}

export const BOOK = {
  depositsHeld: { kind: 'asset_value', name: 'Rental Deposits Held For You' } as HousingBook,
  purchaseDeposits: { kind: 'asset_value', name: 'Purchase Deposits Held' } as HousingBook,
  homesOwned: { kind: 'asset_value', name: 'Homes You Own' } as HousingBook,
  tenantDeposits: { kind: 'liability_other', name: "Your Tenants' Deposits" } as HousingBook,
  belongings: { kind: 'asset_value', name: 'Your Belongings' } as HousingBook,
  depositsKept: { kind: 'expense', name: 'Deposit Deductions' } as HousingBook,
  depositsRetained: { kind: 'income', name: 'Tenant Deposit Deductions Kept' } as HousingBook,
};

/** A housing event on the game's clock: one kind, its step in the payload. */
export function scheduleHome(state: GameState, at: number, step: string, payload: Record<string, unknown>, attention: 'silent' | 'notify' = 'notify', id?: string): void {
  schedule(state, at, 'home', { step, ...payload }, { priority: 46, attention, ...(id ? { id } : {}) });
}
export function note(state: GameState, homeId: string | undefined, text: string, kind: 'money' | 'personal' | 'warning' = 'personal'): void {
  homesOf(state).history.unshift({ at: state.now, ...(homeId ? { homeId } : {}), text });
  if (homesOf(state).history.length > 600) homesOf(state).history.length = 600;
  addLog(state, text, kind, { route: { view: 'homes', ...(homeId ? { ref: homeId } : {}) } });
}
export function document(state: GameState, homeId: string, title: string, lines: string[]): void {
  homesOf(state).documents.unshift({ id: newId(state, 'hdoc'), at: state.now, homeId, title, lines });
}
export function record(list: Payment[], p: Omit<Payment, 'at'> & { at?: number }, state: GameState): void {
  if (!list.some((x) => x.key === p.key)) list.push({ at: state.now, ...p });
}
