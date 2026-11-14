// Banks (the owner's v8 package, 03 "Bank lifecycle"; 07 step 4; A09, A10; from November 14, 2026). The products are
// src/data/banks.json, imported by tools/v8/import_banks.py from the old line's research and labelled by how sure we
// are of each: primary-observed, reported or legacy-unreverified. A fee the record doesn't give is unknown and is shown as
// unknown, never as free.
//
// The lifecycle, through the journal (cash/journal.ts):
// - Discover what you can hold: personal products where you live; business products only with a company.
// - Apply: the account is pending, and the bank decides after three bank business days, checking again that you still
//   live in its market. Choosing a bank isn't being accepted by it.
// - Fund and move money: a transfer holds the money at once and settles on the next bank business day. Money on its
//   way can't be spent, and the sender can't spend it twice.
// - Pay the account fee each period on the day the account was opened, clamped to a short month's end. Each period is
//   charged once, by its key, however the days pass. A waiver the record gives is checked from the account's own lines.
// - Close an empty account with nothing held or on its way.
//
// What isn't simulated, and says so where it shows: bank holidays (business days are Monday to Friday), interest,
// overdrafts, card and cash-machine fees, and the documents an application asks for (step 8 of the package).
import banksData from '../data/banks.json';
import { available, ensureAccount, held, pendingIn, placeHold, postTx, posted, outsideAccount, releaseHold, setTxStatus, statementLines, type Account, type JournalLine, type JournalTx } from './cash/journal';
import { CURRENCIES, formatMoney, monthlyDue, periodId } from './cash/money';
import { PERSONAL_CASH } from './personal';
import { addLog, cancelEvents, registerHandler, schedule } from './state';
import { addDaysToKey, ageOn, dateKey, localToInstant, parseYmd, weekdayOfKey } from './time';
import { getPlace } from '../data/places';
import type { GameState } from './types';

export type Evidence = 'primary-observed' | 'reported' | 'legacy-unreverified' | 'simulation';
export interface Waiver { kind: string; minor?: number | null; age?: number }
export interface ProductFee { event: 'account'; everyMonths: number; minor: number; waivers: Waiver[]; changes: { from: string; minor: number }[]; waiversPartial?: boolean }
export interface BankProduct {
  id: string; provider: string; product: string; market: string; holder: 'personal' | 'business'; currency: string;
  fees: ProductFee[];
  /** Whether the record says what the account itself costs. False: no account fee is recorded, which isn't "free". */
  accountFeeKnown: boolean;
  domesticTransferMinor: number | null;
  openingMinor?: number;
  inboundWireMinor?: number;
  overdraft: 'not-offered' | 'fee-only' | 'unknown';
  evidence: Evidence; source: string; observed: string | null;
}

/**
 * The account the inheritance arrives in: a private account the estate opened for you before the story, at a fictional
 * bank. A simulation choice, said as one: no real bank approved anyone, and it charges nothing by the game's design.
 */
export const ESTATE_PRODUCT: BankProduct = {
  id: 'estate-private', provider: 'Your Family\'s Private Bank (Fictional)', product: 'Private Account', market: '*', holder: 'personal', currency: 'USD',
  fees: [], accountFeeKnown: true, domesticTransferMinor: 0, overdraft: 'not-offered', evidence: 'simulation', source: 'The game\'s scenario', observed: null,
};
/** Your company's account until step 6 of the package gives companies banks of their own: the game's ledger, said as such. */
export const COMPANY_PRODUCT: BankProduct = { ...ESTATE_PRODUCT, id: 'company-ledger', provider: 'Your Company\'s Account (Simulated)', product: 'Company Account', holder: 'business' };
export const PRODUCTS: BankProduct[] = [ESTATE_PRODUCT, ...(banksData.products as BankProduct[]).filter((p) => CURRENCIES[p.currency])];
export const productById = (id: string) => (id === COMPANY_PRODUCT.id ? COMPANY_PRODUCT : PRODUCTS.find((p) => p.id === id));
/** The product an account is held under. Your own and your company's first accounts are the game's, said as such. */
export const productOf = (a: Account): BankProduct => productById(a.product ?? '') ?? (a.owner === 'company' ? COMPANY_PRODUCT : ESTATE_PRODUCT);

export const EVIDENCE_LABELS: Record<Evidence, string> = {
  'primary-observed': 'Read on the bank\'s own page',
  reported: 'From research with its sources',
  'legacy-unreverified': 'From an older record, not checked again',
  simulation: 'The game\'s own choice',
};

/** Where you live, as a country code: what a personal account's market must be. */
export const residence = (state: GameState) => getPlace(state.character.livesIn ?? state.locationId).country;
const zoneOf = (state: GameState) => getPlace(state.character.livesIn ?? state.locationId).zone;
const today = (state: GameState) => dateKey(state.now, zoneOf(state));

/** The accounts you or your company hold at a bank (any state), oldest first. */
export function bankAccounts(state: GameState): Account[] {
  return Object.values(state.journal?.accounts ?? {}).filter((a) => a.owner !== 'outside');
}

/** The products you could apply for now: personal ones where you live, and business ones if you have a company. */
export function productsOpenTo(state: GameState): BankProduct[] {
  const home = residence(state);
  return PRODUCTS.filter((p) => p.market === home && (p.holder === 'personal' || !!state.company));
}

/** Why you can't apply for this product now, or null. */
export function applyRefusal(state: GameState, productId: string): string | null {
  const p = productById(productId);
  if (!p || p.id === ESTATE_PRODUCT.id) return 'That isn\'t an account you can apply for.';
  if (p.holder === 'business' && !state.company) return `${p.product} is a business account: it needs a company to hold it.`;
  if (p.market !== residence(state)) return `${p.provider} opens this account for people who live in ${p.market}; you live in ${residence(state)}.`;
  const birth = state.character.birth;
  if (ageOn(birth, parseYmd(today(state))) < 18) return 'You need to be 18 to open an account of your own.';
  if (bankAccounts(state).some((a) => a.product === p.id && a.owner === (p.holder === 'business' ? 'company' : 'player') && (a.state === 'pending' || a.state === 'open'))) return `You already hold or have applied for ${p.product}.`;
  return null;
}

/** The next bank business day (Monday to Friday; holidays aren't held) after `key`. */
export function nextBusinessDay(key: string, after = 1): string {
  let k = key;
  for (let n = 0; n < after;) { k = addDaysToKey(k, 1); if (weekdayOfKey(k) !== 0 && weekdayOfKey(k) !== 6) n++; }
  return k;
}
const at = (state: GameState, key: string, hour: number) => { const d = parseYmd(key); return localToInstant(zoneOf(state), d.year, d.month, d.day, hour).instant; };

/** Apply for an account. It is pending until the bank decides, three business days on. */
export function applyForAccount(state: GameState, productId: string): Account {
  const no = applyRefusal(state, productId);
  if (no) throw new Error(no);
  const p = productById(productId)!;
  const n = Object.keys(state.journal?.accounts ?? {}).filter((k) => k.startsWith('bank:')).length + 1;
  const owner = p.holder === 'business' ? 'company' : 'player';
  const a = ensureAccount(state, { id: `bank:${n}`, owner, type: 'asset', currency: p.currency, label: `${p.provider}, ${p.product}`, product: p.id, state: 'pending' });
  a.bank = { appliedAt: state.now };
  schedule(state, at(state, nextBusinessDay(today(state), 3), 10), 'bank-decision', { account: a.id }, { attention: 'notify', priority: 55, id: `bank-decision:${a.id}` });
  addLog(state, `You applied to ${p.provider} for ${p.product}. They decide within three business days.`, 'money', { route: { view: 'profile' } });
  return a;
}

registerHandler('bank-decision', (state, ev) => {
  const a = state.journal?.accounts[ev.payload.account as string];
  if (!a || a.state !== 'pending') return { suppressInterrupt: true };
  const p = productById(a.product!)!;
  // Checked again on the day: an application isn't an approval, and someone who moved away is no longer in the market.
  const still = p.market === residence(state) && (p.holder === 'personal' || !!state.company);
  if (!still) {
    a.state = 'closed';
    a.bank!.reason = p.holder === 'business' && !state.company ? 'You no longer have a company to hold it.' : `You no longer live in ${p.market}.`;
    const message = `${p.provider} turned down your application for ${p.product}. ${a.bank!.reason}`;
    addLog(state, message, 'money', { route: { view: 'profile' } });
    return { message };
  }
  a.state = 'open';
  a.bank!.anchor = today(state);
  a.bank!.nextPeriod = 1;
  scheduleFee(state, a);
  const message = `${p.provider} opened your ${p.product}.${p.openingMinor ? ` Its opening charge of ${formatMoney({ currency: p.currency, minor: p.openingMinor })} is due once there is money in it.` : ''}`;
  addLog(state, message, 'money', { route: { view: 'profile' } });
  return { message };
});

/** The fee a product charges for a period on this date (a recorded change applies from its date), or null if none. */
export function feeOn(p: BankProduct, due: string): { fee: ProductFee; minor: number } | null {
  const fee = p.fees.find((f) => f.event === 'account');
  if (!fee) return null;
  const change = [...fee.changes].filter((c) => c.from <= due).sort((x, y) => x.from.localeCompare(y.from)).at(-1);
  return { fee, minor: change ? change.minor : fee.minor };
}

/** What a product's account fee reads as: an amount and its period, "none" only when the record says so, else unknown. */
export function feeText(p: BankProduct): string {
  const fee = p.fees.find((f) => f.event === 'account');
  if (!fee) return p.accountFeeKnown ? 'No account fee' : 'Account fee not recorded';
  const per = fee.everyMonths === 1 ? 'a month' : fee.everyMonths === 12 ? 'a year' : `every ${fee.everyMonths} months`;
  return `${formatMoney({ currency: p.currency, minor: fee.minor })} ${per}${fee.waivers.length ? ', waived on conditions' : ''}`;
}

function scheduleFee(state: GameState, a: Account): void {
  const p = productById(a.product!)!;
  const fee = p.fees.find((f) => f.event === 'account');
  if (!fee || !a.bank?.anchor) return;
  const k = a.bank.nextPeriod ?? 1;
  const due = monthlyDue(a.bank.anchor, k * fee.everyMonths);
  schedule(state, at(state, due, 9), 'bank-fee', { account: a.id, period: k }, { attention: 'silent', priority: 60, id: `bank-fee:${a.id}:${k}` });
}

/** The account's settled balance at the end of a day, from its own lines. */
function balanceAt(state: GameState, account: string, key: string): number {
  const zone = zoneOf(state);
  return statementLines(state, account).filter(({ tx }) => dateKey(tx.at, zone) <= key).reduce((s, { line }) => s + line.minor, 0);
}

/**
 * Whether a waiver the record gives is met for the period ending `due`, and why. Each kind is read from the account's
 * own lines: a balance kept every day, an average day's balance, money paid in, or your age. A kind the record names
 * but the game can't read ("averageUpTo") never waives: it is said.
 */
export function waiverMet(state: GameState, a: Account, w: Waiver, from: string, due: string): boolean {
  const days: string[] = [];
  for (let k = from; k < due; k = addDaysToKey(k, 1)) days.push(k);
  if (!days.length) days.push(due);
  const age = ageOn(state.character.birth, parseYmd(due));
  switch (w.kind) {
    case 'balance': return w.minor != null && days.every((k) => balanceAt(state, a.id, k) >= w.minor!);
    case 'average': return w.minor != null && days.reduce((s, k) => s + balanceAt(state, a.id, k), 0) / days.length >= w.minor;
    case 'deposits': {
      const zone = zoneOf(state);
      const inn = statementLines(state, a.id).filter(({ tx, line }) => line.minor > 0 && dateKey(tx.at, zone) >= from && dateKey(tx.at, zone) < due).reduce((s, { line }) => s + line.minor, 0);
      return w.minor != null && inn >= w.minor;
    }
    case 'under': return w.age != null && age < w.age;
    case 'from': return w.age != null && age >= w.age;
    default: return false;
  }
}

registerHandler('bank-fee', (state, ev) => {
  const a = state.journal?.accounts[ev.payload.account as string];
  if (!a || a.state !== 'open') return { suppressInterrupt: true };
  const p = productById(a.product!)!;
  const k = ev.payload.period as number;
  const f = p.fees.find((x) => x.event === 'account')!;
  const due = monthlyDue(a.bank!.anchor!, k * f.everyMonths);
  const from = monthlyDue(a.bank!.anchor!, (k - 1) * f.everyMonths);
  const key = `bankfee:${a.id}:${periodId(due)}`;
  // Once per period, whatever delivered this event: a period already charged or waived charges nothing.
  if ((a.bank!.nextPeriod ?? 1) > k || state.journal!.txs.some((t) => t.key === key)) return { suppressInterrupt: true };
  const { minor } = feeOn(p, due)!;
  const waived = f.waivers.find((w) => waiverMet(state, a, w, from, due));
  a.bank!.nextPeriod = k + 1;
  if (waived || minor === 0) {
    if (waived) addLog(state, `${p.provider} waived ${p.product}'s fee for the period to ${due}: ${waiverWords(p, waived)}.`, 'money');
  } else {
    const owed = (a.bank!.owedMinor ?? 0) + minor;
    const pay = Math.min(owed, Math.max(0, available(state, a.id)));
    if (pay > 0) postTx(state, { key, kind: 'bank-fee', memo: `${p.product} Fee To ${due}`, lines: [{ account: a.id, minor: -pay, kind: 'bank-fee', label: `Account Fee To ${due}` }, { account: outsideAccount(state, 'bank-fees', a.currency), minor: pay }] });
    a.bank!.owedMinor = owed - pay;
    if (owed - pay > 0) addLog(state, `${p.provider} couldn't take all of ${p.product}'s fee: ${formatMoney({ currency: a.currency, minor: owed - pay })} is owed and taken with the next.`, 'money', { route: { view: 'profile' } });
  }
  scheduleFee(state, a);
  return { suppressInterrupt: true };
});

export function waiverWords(p: BankProduct, w: Waiver): string {
  const amt = (m?: number | null) => (m == null ? 'an amount not recorded' : formatMoney({ currency: p.currency, minor: m }));
  if (w.kind === 'balance') return `a balance of ${amt(w.minor)} or more every day`;
  if (w.kind === 'average') return `an average day's balance of ${amt(w.minor)} or more`;
  if (w.kind === 'deposits') return `${amt(w.minor)} or more paid in`;
  if (w.kind === 'under') return `an account holder under ${w.age}`;
  if (w.kind === 'from') return `an account holder ${w.age} or older`;
  return 'a condition the game can\'t read, which never waives here';
}

/** Why money can't move between these two accounts of yours, or null. */
export function transferRefusal(state: GameState, from: string, to: string, minor: number): string | null {
  const A = state.journal?.accounts[from], B = state.journal?.accounts[to];
  if (!A || !B || A.owner === 'outside' || B.owner === 'outside') return 'Choose two of your accounts.';
  if (from === to) return 'Choose two different accounts.';
  if (A.owner !== B.owner) return 'Money between you and your company moves as capital or a draw, on the company card.';
  if (A.state !== 'open' || B.state !== 'open') return 'Both accounts must be open.';
  if (A.currency !== B.currency) return `${A.label} holds ${A.currency} and ${B.label} ${B.currency}: an exchange needs a rate, which the game doesn't have yet.`;
  if (!Number.isSafeInteger(minor) || minor <= 0) return 'Say how much to move.';
  const fee = transferFee(A, B);
  if (available(state, from) < minor + (fee ?? 0)) return `${A.label} has ${formatMoney({ currency: A.currency, minor: available(state, from) })} available.`;
  return null;
}

/** A transfer's fee: none within one bank, the sending product's domestic fee when recorded, else null (unknown). */
export function transferFee(A: Account, B: Account): number | null {
  const pa = productOf(A), pb = productOf(B);
  if (pa.provider === pb.provider) return 0;
  return pa.domesticTransferMinor;
}

/**
 * Move money between two of your own accounts. It is held at once and settles on the next bank business day; until
 * then it is on its way: not spendable at either end. A fee the product records is charged; one it doesn't record is
 * charged as nothing and said to be unknown.
 */
export function transferBetween(state: GameState, key: string, from: string, to: string, minor: number): JournalTx {
  const had = state.journal?.txs.find((t) => t.key === `transfer:${key}`);
  if (had) return had;
  const no = transferRefusal(state, from, to, minor);
  if (no) throw new Error(no);
  const A = state.journal!.accounts[from], B = state.journal!.accounts[to];
  const fee = transferFee(A, B) ?? 0;
  const lines: JournalLine[] = [{ account: from, minor: -minor, kind: 'transfer', label: `To ${B.label}` }, { account: to, minor, kind: 'transfer', label: `From ${A.label}` }];
  if (fee) lines.push({ account: from, minor: -fee, kind: 'bank-fee', label: 'Transfer Fee' }, { account: outsideAccount(state, 'bank-fees', A.currency), minor: fee });
  const h = placeHold(state, `transfer:${key}`, from, minor + fee, `On its way to ${B.label}`);
  const tx = postTx(state, { key: `transfer:${key}`, kind: 'transfer', memo: `${A.label} to ${B.label}`, status: 'pending', lines });
  const settles = nextBusinessDay(today(state));
  schedule(state, at(state, settles, 10), 'bank-settle', { tx: tx.id, hold: h.id }, { attention: 'silent', priority: 40, id: `bank-settle:${tx.id}` });
  addLog(state, `${formatMoney({ currency: A.currency, minor })} is on its way from ${A.label} to ${B.label}, arriving on ${settles}.${transferFee(A, B) === null ? ' The bank\'s fee for it isn\'t recorded.' : ''}`, 'money', { route: { view: 'profile' } });
  return tx;
}

registerHandler('bank-settle', (state, ev) => {
  const tx = state.journal?.txs.find((t) => t.id === ev.payload.tx);
  if (!tx || tx.status !== 'pending') return { suppressInterrupt: true };
  releaseHold(state, ev.payload.hold as string);
  setTxStatus(state, tx.id, 'settled', 'arrived');
  return { suppressInterrupt: true };
});

/** Why this account can't be closed now, or null. Nothing is stranded: no money, nothing held, nothing on its way. */
export function closeRefusal(state: GameState, id: string): string | null {
  const a = state.journal?.accounts[id];
  if (!a || a.owner === 'outside') return 'That isn\'t one of your accounts.';
  if (a.state === 'closed') return 'It is already closed.';
  if (id === PERSONAL_CASH || id === 'company:cash:USD') return 'This is the account your money moves through in the game; it stays open.';
  if (a.state === 'pending') return null; // withdrawing an application strands nothing
  if (held(state, id) > 0 || pendingIn(state, id) > 0) return 'Money is held or on its way: wait until it settles.';
  if (posted(state, id) !== 0) return `Move the ${formatMoney({ currency: a.currency, minor: posted(state, id) })} in it out first.`;
  if ((a.bank?.owedMinor ?? 0) > 0) return 'A fee is still owed on it.';
  return null;
}

export function closeAccount(state: GameState, id: string): void {
  const no = closeRefusal(state, id);
  if (no) throw new Error(no);
  const a = state.journal!.accounts[id];
  a.state = 'closed';
  a.bank = { ...(a.bank ?? { appliedAt: state.now }), reason: 'Closed by you.' };
  cancelEvents(state, (e) => (e.kind === 'bank-fee' || e.kind === 'bank-decision') && e.payload.account === id);
  addLog(state, `You closed ${a.label}.`, 'money', { route: { view: 'profile' } });
}

/** One account as the screen shows it: its four balances in its own currency. */
export function accountView(state: GameState, a: Account) {
  return { posted: posted(state, a.id), held: held(state, a.id), available: available(state, a.id), pendingIn: pendingIn(state, a.id) };
}
