// The bank screens' inputs (src/ui/bankworld, ported from 1221), each proven by two careers that make the same move with
// the input set two ways: a card at one bank or another, cash from the bank's machine or the credit card, a loan paid
// into one account or another, a switch whole or partial. Where a proof of the move itself already sets the input
// (an amount typed, a date, a statement day moved), the input is named on that proof instead (field-proofs.ts). From
// November 16, 2026, when the bank screens' controls joined docs/input-audit/CONTROLS.csv and the feature matrix.
import type { Probe } from '../probe';
import { bank, bankMeasures, both, buysCamera, first, once, walletMeasures } from './bank';
import { buyGear } from '../../../src/engine/equipment';
import { advanceBankWorld, bankSim } from '../../../src/engine/bankworld';
import { somebodyElse } from '../../../src/engine/bankworld/systems/security';
import type { GameState } from '../../../src/engine/types';

const DAYMS = 86_400_000;
const sim = (s: GameState) => bankSim(s.bank!);
const mine = (s: GameState) => sim(s).ledger.accountsOf(sim(s).universe.playerId).filter((a) => !a.nominal && !a.closedAt);
const primary = (s: GameState) => sim(s).player.primaryAccountId!;
const at = (s: GameState, bankId: string, kind = 'checking') => mine(s).find((a) => a.kind === kind && a.bankId === bankId);
const savingsAt = (s: GameState, bankId?: string) => mine(s).find((a) => a.kind === 'savings' && (!bankId || a.bankId === bankId));
const openSavings = (s: GameState, bankId?: string) => savingsAt(s, bankId)?.id ?? (bank(s, 'bank.open_savings', bankId ? { bankId } : {}) as { accountId: string }).accountId;
const card = (s: GameState) => mine(s).find((a) => a.kind === 'credit_card');
/** From day `n` on, once it is allowed. */
const from = (n: number, fn: (s: GameState) => void) => { const f = once(fn); return (s: GameState, day: number) => { if (day >= n) f(s); }; };
const onDay = (n: number, fn: (s: GameState) => void) => (s: GameState, day: number) => { if (day === n) try { fn(s); } catch { /* refused: the arm's outcome */ } };
/** Steps in order, each tried daily until the bank allows it, the next from the day after (as bank-last.ts has them). */
type Step = (s: GameState) => void;
const steps = (...fns: Step[]) => { const done = new WeakMap<GameState, number>(); return (s: GameState) => {
  const i = done.get(s) ?? 0;
  if (i >= fns.length) return;
  try { fns[i]!(s); done.set(s, i + 1); } catch { /* not yet */ }
}; };
/** A passport applied for, where none is held or on its way: a bank asks a new customer for photo ID. */
const passport: Step = (s) => { try { bank(s, 'documents.apply_passport', {}); } catch { /* held or applied for */ } };
/** An account at `bankId` opened, ten thousand moved in, and made the primary one, with savings beside it there. */
const primaryAt = (bankId: string): Step[] => [
  passport,
  (s) => { if (!at(s, bankId)) bank(s, 'bank.open_current', { bankId }); },
  (s) => { bank(s, 'bank.transfer', { fromId: primary(s), toId: at(s, bankId)!.id, amount: 1_000_000 }); },
  (s) => { const a = at(s, bankId); if (!a || a.balance <= 0) throw new Error('not yet'); bank(s, 'bank.set_primary', { accountId: a.id }); bank(s, 'bank.redirect_deposits', { accountId: a.id }); },
  (s) => { openSavings(s, bankId); },
  // A savings account left empty is closed by a bank that asks an opening deposit (Citi's), and round-ups with it.
  (s) => { bank(s, 'bank.transfer', { fromId: primary(s), toId: savingsAt(s, bankId)!.id, amount: 10_000 }); },
];
/** The months each plan was made for, as the move made it (a plan paid off is gone from the card's state). */
const planMonths = new WeakMap<GameState, number>();
const planFor = (order: number[]) => (s: GameState) => { const owed = Math.max(0, -card(s)!.balance); if (owed < 100_00) throw new Error('little owed'); for (const m of order) { try { bank(s, 'card.plan', { amount: owed, months: m }); planMonths.set(s, m); return; } catch { /* another */ } } throw new Error('no plan'); };

const BARCLAYS = 'gb-barclays';
const NATWEST = 'gb-natwest';
const NY = 'us-new-york';
const TORONTO = 'ca-toronto';
const MADRID = 'es-madrid';
const AMERICAN = { birthplaceId: 'us-new-york' };
/** A current account at NatWest beside Barclays, with five thousand pounds moved in once it is open. */
const natwest = both(first((s) => { bank(s, 'bank.open_current', { bankId: NATWEST }); }), from(1, (s) => { const n = at(s, NATWEST); if (!n) throw new Error('not open'); bank(s, 'bank.transfer', { fromId: primary(s), toId: n.id, amount: 500_000 }); }));
/** A million in Barclays savings on the first day. */
const saveMillion = first((s) => { bank(s, 'bank.transfer', { fromId: primary(s), toId: openSavings(s), amount: 100_000_000 }); });
/** A card, every purchase on it, autopay at the minimum from the second day: it carries a balance and its interest. */
/** The card on the first day, autopay at the minimum, the camera on it on day 180. */
const cardLater = both(first((s) => { bank(s, 'card.apply'); bank(s, 'bank.set_payments', { everyday: 'credit' }); }), (s, day) => { if (day === 1) bank(s, 'finance.set_autopay', { mode: 'minimum' }); if (day === 180) try { buyGear(s, 'bmpcc-4k'); } catch { /* can't */ } });
const cardAt = (bankId?: string) => both(first((s) => { bank(s, 'card.apply', bankId ? { bankId } : {}); bank(s, 'bank.set_payments', { everyday: 'credit' }); }), buysCamera, (s, day) => { if (day === 1) bank(s, 'finance.set_autopay', { mode: 'minimum' }); });

const paidFrom = (s: GameState, id: string | undefined) => (id ? sim(s).universe.transactions.reduce((a, t) => a + t.postings.filter((p) => p.accountId === id && p.amount < 0).reduce((b, p) => b - p.amount, 0), 0) / 100 : 0);
const measure = (s: GameState) => {
  const m = mine(s);
  const held = (pred: (a: (typeof m)[number]) => boolean) => m.filter(pred).reduce((x, a) => x + a.balance, 0) / 100;
  const switched = sim(s).player.payments?.switches ?? [];
  return {
    ...bankMeasures(s), ...walletMeasures(s),
    savingsHeld: held((a) => a.kind === 'savings'),
    inCurrent: held((a) => a.kind === 'checking'),
    natwestHeld: held((a) => a.bankId === NATWEST && a.kind !== 'credit_card'),
    atFirstBank: held((a) => a.bankId === BARCLAYS && a.kind !== 'credit_card' && a.kind !== 'loan'),
    cashHeld: held((a) => a.kind === 'cash'),
    loansOwed: -held((a) => a.kind === 'loan'),
    cardsAtNatwest: m.filter((a) => a.kind === 'credit_card' && a.bankId === NATWEST).length,
    cardsOpen: m.filter((a) => a.kind === 'credit_card').length,
    planMonths: planMonths.get(s) ?? 0,
    transferred: sim(s).universe.transactions.filter((t) => /balance transfer/i.test(t.memo)).reduce((x, t) => x + t.postings.filter((p) => p.amount > 0 && sim(s).universe.accounts[p.accountId]?.kind === 'credit_card').reduce((b, p) => b + p.amount, 0), 0) / 100,
    paidFromNatwest: paidFrom(s, at(s, NATWEST)?.id),
    lowAlerts: sim(s).universe.notifications.filter((n) => n.title.startsWith('Low Balance')).length,
    fraudKnownAfter: (sim(s).player.fraud ?? []).reduce((x, f) => x + (f.learnedAt - f.at) / DAYMS, 0),
    fraudCarried: (sim(s).player.fraud ?? []).reduce((x, f) => x + (f.reportedAt === undefined ? f.amount : f.carried ?? 0), 0) / 100,
    // How long ago the first switch was done, at the career's end: earlier, longer.
    daysSinceSwitch: switched.length ? Math.round((s.now - switched[0]!.at) / DAYMS) : 0,
  };
};
const F = (file: string, label: string) => `field:bankworld/ui/${file}#${label}#1`;
const P = (id: string, field: string, decision: string, reads: string, base: Probe['base'], variant: Probe['variant'], bites: string[], downstream: string[]): Probe =>
  ({ id, features: [field], decision, reads: [reads], base, variant, measure, bites, downstream });

export const PROBES: Probe[] = [
  // ---------------- Cards ----------------
  P('field-card-bank', F('bank/BankCard.tsx', 'id="card-apply-bank"'), 'Take the credit card at NatWest rather than at Barclays, and carry the camera on it at the minimum',
    'src/engine/bankworld/systems/cardlife.ts#registerCardLife', { daily: cardAt() }, { daily: cardAt(NATWEST) }, ['cardsAtNatwest'], ['interestOut', 'worth']),
  P('field-card-transfer', F('bank/BankCard.tsx', 'id="card-apply-from"'), "Take Lloyds' card moving the Barclaycard's balance onto it, rather than beside it",
    'src/engine/bankworld/systems/cardoffers.ts#transferRefusal',
    { daily: both(cardAt(), from(40, (s) => { bank(s, 'card.apply', { bankId: 'gb-lloyds' }); })) },
    { daily: both(cardAt(), from(40, (s) => { bank(s, 'card.apply', { bankId: 'gb-lloyds', transfer: true, fromId: card(s)!.id }); })) },
    ['transferred'], ['interestOut', 'worth']),
  P('field-plan-length', F('bank/BankCardOffers.tsx', 'id={`card-plan-months-${card.id}`}'), "In New York, put the camera's cost into Chase's longest payment plan rather than its shortest",
    'src/engine/bankworld/systems/cardoffers.ts#registerCardOffers',
    // A plan made while the card's introductory rate lasts is free, so the length shows in how fast the card is paid
    // down: within a year the twelve-month plan is still being paid where the three-month one is done (the camera on
    // day 180, the plan from day 192; a plan made on day 22 was paid off either way by the year's end).
    { years: 1, placeId: NY, daily: both(cardLater, from(192, planFor([3, 6, 12, 24]))) },
    { years: 1, placeId: NY, daily: both(cardLater, from(192, planFor([24, 12, 6, 3]))) },
    ['planMonths'], ['cardPaid', 'owed']),

  // ---------------- Cash ----------------
  P('field-cash-from', F('bank/BankCash.tsx', 'id="cash-from"'), "In New York, take $250 from Chase's machine rather than as a cash advance on its card",
    'src/engine/bankworld/systems/cash.ts#registerCash',
    { placeId: NY, daily: both(first((s) => { bank(s, 'card.apply'); }), from(15, (s) => { if (!card(s)) throw new Error('no card'); bank(s, 'cash.withdraw', { amount: 25_000, from: 'card' }); })) },
    { placeId: NY, daily: both(first((s) => { bank(s, 'card.apply'); }), from(15, (s) => { if (!card(s)) throw new Error('no card'); bank(s, 'cash.withdraw', { amount: 25_000, from: 'atm' }); })) },
    ['bankFees'], ['interestOut', 'worth', 'cardPaid']),
  P('field-cash-into', F('bank/BankCash.tsx', 'id="cash-into"'), 'Pay the five hundred taken out back into savings rather than the current account',
    'src/engine/bankworld/systems/cash.ts#registerCash',
    { daily: both(first((s) => { openSavings(s); bank(s, 'cash.withdraw', { amount: 50_000, from: 'counter' }); }), onDay(5, (s) => { bank(s, 'cash.deposit', { amount: 50_000, toId: primary(s), at: 'counter' }); })) },
    { daily: both(first((s) => { openSavings(s); bank(s, 'cash.withdraw', { amount: 50_000, from: 'counter' }); }), onDay(5, (s) => { bank(s, 'cash.deposit', { amount: 50_000, toId: openSavings(s), at: 'counter' }); })) },
    ['savingsHeld'], ['interestIn']),
  P('field-cash-at', F('bank/BankCash.tsx', 'id="cash-at"'), "Try to pay five hundred into Nationwide savings at the Post Office, which takes Nationwide's cash out and none in, rather than at its counter",
    'src/engine/bankworld/systems/cash.ts#registerCash',
    { daily: both(steps((s) => { bank(s, 'bank.open_current', { bankId: 'gb-nationwide' }); }, (s) => { openSavings(s, 'gb-nationwide'); }, (s) => { bank(s, 'cash.withdraw', { amount: 50_000, from: 'counter' }); }, (s) => { bank(s, 'cash.deposit', { amount: 50_000, toId: savingsAt(s, 'gb-nationwide')!.id, at: 'counter' }); })) },
    { daily: both(steps((s) => { bank(s, 'bank.open_current', { bankId: 'gb-nationwide' }); }, (s) => { openSavings(s, 'gb-nationwide'); }, (s) => { bank(s, 'cash.withdraw', { amount: 50_000, from: 'counter' }); }, (s) => { try { bank(s, 'cash.deposit', { amount: 50_000, toId: savingsAt(s, 'gb-nationwide')!.id, at: 'post_office' }); } catch { /* refused: kept in hand */ } })) },
    ['cashHeld'], ['interestIn']),

  // ---------------- Lending ----------------
  P('field-od-per-use', F('bank/BankLending.tsx', 'id="od-per-use"'), "In Toronto, have TD's overdraft paid for by the use rather than by the month",
    'src/engine/bankworld/systems/lending.ts#chargeForItem',
    // Unused, the monthly plan's $5 a month is all either costs: paid by the use, nothing.
    { placeId: TORONTO, daily: steps(...primaryAt('ca-td'), (s) => { bank(s, 'bank.arrange_overdraft', { limit: 50_000, perUse: false, accountId: at(s, 'ca-td')!.id }); }) },
    { placeId: TORONTO, daily: steps(...primaryAt('ca-td'), (s) => { bank(s, 'bank.arrange_overdraft', { limit: 50_000, perUse: true, accountId: at(s, 'ca-td')!.id }); }) },
    ['bankFees'], ['worth']),
  P('field-loan-purpose', F('bank/BankLending.tsx', 'id="loan-purpose"'), 'Born American, in New York, ask Capital One for a loan for an education expense rather than for anything else',
    'src/engine/bankworld/systems/lending.ts#loanOffer',
    { placeId: NY, creation: AMERICAN, daily: steps(passport, (s) => { bank(s, 'bank.open_current', { bankId: 'us-capital-one' }); }, (s) => { bank(s, 'bank.borrow', { amount: 500_000, months: 36, bankId: 'us-capital-one', purpose: 'other' }); }) },
    { placeId: NY, creation: AMERICAN, daily: steps(passport, (s) => { bank(s, 'bank.open_current', { bankId: 'us-capital-one' }); }, (s) => { try { bank(s, 'bank.borrow', { amount: 500_000, months: 36, bankId: 'us-capital-one', purpose: 'education' }); } catch (e) { if (!/education/.test(String(e))) throw e; } }) },
    ['loansOwed'], ['interestOut', 'worth']),
  P('field-loan-into', F('bank/BankLending.tsx', 'id="loan-into"'), "Have Barclays' loan paid into NatWest rather than into Barclays",
    'src/engine/bankworld/systems/lending.ts#registerLending',
    { daily: both(natwest, from(31, (s) => { bank(s, 'bank.borrow', { amount: 1_000_000, months: 24, bankId: BARCLAYS, intoId: primary(s) }); })) },
    { daily: both(natwest, from(31, (s) => { bank(s, 'bank.borrow', { amount: 1_000_000, months: 24, bankId: BARCLAYS, intoId: at(s, NATWEST)!.id }); })) },
    ['natwestHeld'], ['atFirstBank']),
  P('field-loan-repay', F('bank/BankLending.tsx', 'id="loan-repay"'), "Have Barclays' loan repaid from NatWest rather than from Barclays",
    'src/engine/bankworld/systems/lending.ts#repaymentAccount',
    { daily: both(natwest, from(31, (s) => { bank(s, 'bank.borrow', { amount: 1_000_000, months: 24, bankId: BARCLAYS, repayFromId: primary(s) }); })) },
    { daily: both(natwest, from(31, (s) => { bank(s, 'bank.borrow', { amount: 1_000_000, months: 24, bankId: BARCLAYS, repayFromId: at(s, NATWEST)!.id }); })) },
    ['paidFromNatwest'], ['natwestHeld', 'atFirstBank']),
  P('field-lender', F('workspaces/BankWorkspace.tsx', 'id="lender"'), 'Borrow at NatWest rather than at Barclays',
    'src/engine/bankworld/systems/lending.ts#loanOffer',
    { daily: both(natwest, from(31, (s) => { bank(s, 'bank.borrow', { amount: 1_000_000, months: 24, bankId: BARCLAYS }); })) },
    { daily: both(natwest, from(31, (s) => { bank(s, 'bank.borrow', { amount: 1_000_000, months: 24, bankId: NATWEST }); })) },
    ['natwestHeld'], ['interestOut', 'worth']),

  // ---------------- Switching ----------------
  P('field-switch-partial', F('bank/BankLending.tsx', 'id="switch-partial"'), 'With a million in savings, switch to NatWest partially rather than whole',
    'src/engine/bankworld/systems/lending.ts#completeSwitch',
    { daily: both(saveMillion, onDay(10, (s) => { bank(s, 'bank.switch', { bankId: NATWEST }); })) },
    { daily: both(saveMillion, onDay(10, (s) => { bank(s, 'bank.switch', { bankId: NATWEST, partial: true }); })) },
    ['accounts'], ['atFirstBank', 'interestIn']),
  P('field-switch-to', F('bank/BankLending.tsx', 'id="switch-to"'), 'With a million in savings, switch to NatWest rather than to HSBC',
    'src/engine/bankworld/systems/lending.ts#completeSwitch',
    { daily: both(saveMillion, onDay(10, (s) => { bank(s, 'bank.switch', { bankId: 'gb-hsbc' }); })) },
    { daily: both(saveMillion, onDay(10, (s) => { bank(s, 'bank.switch', { bankId: NATWEST }); })) },
    ['natwestHeld'], ['interestIn', 'bankFees']),
  P('field-switch-on', F('bank/BankLending.tsx', 'id="switch-on"'), 'With a million in savings, switch to NatWest four months later than the first day the service can',
    'src/engine/bankworld/systems/lending.ts#registerLending',
    { daily: both(saveMillion, onDay(10, (s) => { bank(s, 'bank.switch', { bankId: NATWEST }); })) },
    { daily: both(saveMillion, onDay(10, (s) => { bank(s, 'bank.switch', { bankId: NATWEST, on: new Date(s.now + 120 * DAYMS).toISOString().slice(0, 10) }); })) },
    ['daysSinceSwitch'], ['interestIn']),

  // ---------------- Accounts ----------------
  P('field-close-into', F('bank/BankMoves.tsx', 'id={`close-into-${a.id}`}'), "Close NatWest's account a month in, sending what it holds to savings rather than to Barclays' current account",
    'src/engine/bankworld/systems/bankmoves.ts#registerBankMoves',
    { daily: both(natwest, first((s) => { openSavings(s); }), from(30, (s) => { bank(s, 'bank.close_current', { accountId: at(s, NATWEST)!.id, remainderTo: primary(s) }); })) },
    { daily: both(natwest, first((s) => { openSavings(s); }), from(30, (s) => { bank(s, 'bank.close_current', { accountId: at(s, NATWEST)!.id, remainderTo: openSavings(s) }); })) },
    ['savingsHeld'], ['interestIn']),
  P('field-open-from', F('bank/BankMoves.tsx', 'id="open-from"'), "Open NatWest's account with ten thousand from savings rather than from the current account",
    'src/engine/bankworld/systems/bankmoves.ts#registerBankMoves',
    { daily: both(saveMillion, onDay(1, (s) => { bank(s, 'bank.open_current', { bankId: NATWEST, fundFrom: primary(s), amount: 1_000_000 }); })) },
    { daily: both(saveMillion, onDay(1, (s) => { bank(s, 'bank.open_current', { bankId: NATWEST, fundFrom: openSavings(s), amount: 1_000_000 }); })) },
    ['savingsHeld'], ['interestIn']),
  P('field-open-amount', F('bank/BankMoves.tsx', 'id="open-amount"'), "Open NatWest's account with a hundred thousand rather than a thousand",
    'src/engine/bankworld/systems/bankmoves.ts#registerBankMoves',
    { daily: onDay(1, (s) => { bank(s, 'bank.open_current', { bankId: NATWEST, fundFrom: primary(s), amount: 100_000 }); }) },
    { daily: onDay(1, (s) => { bank(s, 'bank.open_current', { bankId: NATWEST, fundFrom: primary(s), amount: 10_000_000 }); }) },
    ['natwestHeld'], ['atFirstBank', 'interestIn']),
  P('field-open-at', F('bank/BankMoves.tsx', 'id="open-at"'), 'In Paris, open a second current account at the bank whose fee nothing waives rather than at one that charges nothing',
    'src/engine/bankworld/systems/bankmoves.ts#registerBankMoves',
    { placeId: 'fr-paris', daily: onDay(1, (s) => { bank(s, 'bank.open_current', { bankId: 'fr-boursorama' }); }) },
    { placeId: 'fr-paris', daily: onDay(1, (s) => { bank(s, 'bank.open_current', { bankId: 'fr-lcl' }); }) },
    ['bankFees'], ['worth']),

  // ---------------- Payments ----------------
  P('field-so-day', F('bank/BankPayments.tsx', 'id="so-day"'), 'Send £50,000 a month by standing order to savings on the 28th rather than the 1st',
    'src/engine/bankworld/systems/payments.ts#registerPayments',
    { daily: once((s) => { bank(s, 'bank.add_standing_order', { toId: openSavings(s), amount: 5_000_000, day: 1 }); }) },
    { daily: once((s) => { bank(s, 'bank.add_standing_order', { toId: openSavings(s), amount: 5_000_000, day: 28 }); }) },
    ['savingsHeld'], ['interestIn']),
  P('field-so-to', F('bank/BankPayments.tsx', 'id="so-to"'), "Send £50,000 a month by standing order into NatWest's savings rather than Barclays'",
    'src/engine/bankworld/systems/payments.ts#registerPayments',
    { daily: both(natwest, from(2, (s) => { openSavings(s, NATWEST); bank(s, 'bank.add_standing_order', { toId: openSavings(s, BARCLAYS), amount: 5_000_000, day: 1 }); })) },
    { daily: both(natwest, from(2, (s) => { openSavings(s, BARCLAYS); bank(s, 'bank.add_standing_order', { toId: openSavings(s, NATWEST), amount: 5_000_000, day: 1 }); })) },
    ['natwestHeld'], ['interestIn']),
  P('field-sp-from', F('bank/BankPayments.tsx', 'id="sp-from"'), 'Schedule a payment of a hundred thousand to NatWest from savings rather than from the current account',
    'src/engine/bankworld/systems/payments.ts#registerPayments',
    { daily: both(natwest, saveMillion, from(2, (s) => { bank(s, 'bank.schedule_payment', { fromId: primary(s), toId: at(s, NATWEST)!.id, amount: 10_000_000, at: s.now + 30 * DAYMS }); })) },
    { daily: both(natwest, saveMillion, from(2, (s) => { bank(s, 'bank.schedule_payment', { fromId: openSavings(s), toId: at(s, NATWEST)!.id, amount: 10_000_000, at: s.now + 30 * DAYMS }); })) },
    ['savingsHeld'], ['interestIn']),
  P('field-sp-to', F('bank/BankPayments.tsx', 'id="sp-to"'), 'Schedule a payment of a hundred thousand to savings rather than to NatWest',
    'src/engine/bankworld/systems/payments.ts#registerPayments',
    { daily: both(natwest, from(2, (s) => { openSavings(s); bank(s, 'bank.schedule_payment', { fromId: primary(s), toId: at(s, NATWEST)!.id, amount: 10_000_000, at: s.now + 30 * DAYMS }); })) },
    { daily: both(natwest, from(2, (s) => { bank(s, 'bank.schedule_payment', { fromId: primary(s), toId: openSavings(s), amount: 10_000_000, at: s.now + 30 * DAYMS }); })) },
    ['savingsHeld'], ['interestIn']),
  P('field-move-from', F('workspaces/BankWorkspace.tsx', 'id="move-from"'), 'Move a hundred thousand to NatWest from savings rather than from the current account',
    'src/engine/bankworld/systems/banking.ts#registerBanking',
    { daily: both(natwest, saveMillion, from(2, (s) => { bank(s, 'bank.transfer', { fromId: primary(s), toId: at(s, NATWEST)!.id, amount: 10_000_000 }); })) },
    { daily: both(natwest, saveMillion, from(2, (s) => { bank(s, 'bank.transfer', { fromId: openSavings(s), toId: at(s, NATWEST)!.id, amount: 10_000_000 }); })) },
    ['savingsHeld'], ['interestIn']),
  P('field-move-to', F('workspaces/BankWorkspace.tsx', 'id="move-to"'), 'Move a hundred thousand into savings rather than to NatWest',
    'src/engine/bankworld/systems/banking.ts#registerBanking',
    { daily: both(natwest, from(2, (s) => { openSavings(s); bank(s, 'bank.transfer', { fromId: primary(s), toId: at(s, NATWEST)!.id, amount: 10_000_000 }); })) },
    { daily: both(natwest, from(2, (s) => { bank(s, 'bank.transfer', { fromId: primary(s), toId: openSavings(s), amount: 10_000_000 }); })) },
    ['savingsHeld'], ['interestIn']),

  // ---------------- Security, alerts, round-ups ----------------
  P('field-why', F('bank/BankSecurity.tsx', 'aria-label="Why"'), "In Madrid, report Santander's debit card stolen rather than lost",
    'src/engine/bankworld/systems/security.ts#registerSecurity',
    { placeId: MADRID, daily: from(5, (s) => { bank(s, 'card.report', { which: 'debit', why: 'lost', accountId: primary(s) }); }) },
    { placeId: MADRID, daily: from(5, (s) => { bank(s, 'card.report', { which: 'debit', why: 'stolen', accountId: primary(s) }); }) },
    ['bankFees'], ['worth']),
  P('field-alert-low', F('bank/BankStatements.tsx', 'id="alert-low"'), "Be told when the current account falls under a line a stranger's debit takes it under, then report the debit when the statement comes",
    'src/engine/bankworld/systems/security.ts#somebodyElse',
    { placeId: NY, daily: both(stranger(20), reportAtStatement) },
    { placeId: NY, daily: both(first((s) => { bank(s, 'bank.set_alerts', { lowBalance: Math.max(1, Math.round(sim(s).universe.accounts[primary(s)]!.balance - 100)) }); }), stranger(20), reportAtStatement) },
    ['fraudKnownAfter'], ['fraudCarried', 'worth']),
  P('field-roundup-multiplier', F('bank/RoundUps.tsx', 'aria-label={label}'), "Round each card purchase up into savings at NatWest five times over rather than once",
    'src/engine/bankworld/systems/roundups.ts#setRoundUps',
    { daily: both(natwestPrimary, from(17, (s) => { bank(s, 'bank.set_round_ups', { on: true, multiplier: 1 }); }), laterCamera) },
    { daily: both(natwestPrimary, from(17, (s) => { bank(s, 'bank.set_round_ups', { on: true, multiplier: 5 }); }), laterCamera) },
    ['savingsHeld'], ['inCurrent', 'interestIn']),
  P('field-roundup-amount', F('bank/RoundUps.tsx', 'aria-label="Each Purchase"'), "In Toronto, have TD save $5 on each purchase rather than 50 cents",
    'src/engine/bankworld/systems/roundups.ts#setRoundUps',
    { placeId: TORONTO, daily: both(tdPrimary, from(17, (s) => { bank(s, 'bank.set_round_ups', { on: true, amount: 0.5, every: 'day' }); }), laterCamera) },
    { placeId: TORONTO, daily: both(tdPrimary, from(17, (s) => { bank(s, 'bank.set_round_ups', { on: true, amount: 5, every: 'day' }); }), laterCamera) },
    ['savingsHeld'], ['inCurrent', 'interestIn']),
  P('field-roundup-minimum', F('bank/RoundUps.tsx', 'aria-label="Minimum Balance"'), 'In New York, set Citi\'s round-ups to keep $50 in the current account rather than more than it holds',
    'src/engine/bankworld/systems/roundups.ts#setRoundUps',
    { placeId: NY, creation: AMERICAN, daily: both(citiPrimary, from(17, (s) => { bank(s, 'bank.set_round_ups', { on: true, every: 'day', minimum: 50 }); }), laterCamera) },
    { placeId: NY, creation: AMERICAN, daily: both(citiPrimary, from(17, (s) => { bank(s, 'bank.set_round_ups', { on: true, every: 'day', minimum: 10_000_000 }); }), laterCamera) },
    ['savingsHeld'], ['inCurrent', 'interestIn']),
];

// Helpers the probes above name, kept below them for reading.
const tdSteps = steps(...primaryAt('ca-td'));
const citiSteps = steps(...primaryAt('us-citi'));
/** A labelled fixture, as bank-last.ts has it: on `day`, somebody else spends $400 on the everyday account's debit card. */
function stranger(day: number) { return (s: GameState, d: number) => { if (d !== day) return; advanceBankWorld(s.bank!, s.now); somebodyElse(sim(s), sim(s).player, { which: 'debit', account: sim(s).universe.accounts[primary(s)]!, amount: 40_000, stopped: false }); }; }
/** Each day: the stranger's charge reported once its statement has come, however soon the holder knew (bank-last.ts). */
function reportAtStatement(s: GameState) { const f = (sim(s).player.fraud ?? [])[0]; if (!f || f.reportedAt !== undefined || s.now < f.statedAt) return; try { bank(s, 'card.dispute', { index: 0 }); } catch { /* not allowed */ } }
function natwestPrimary(s: GameState, day: number) { if (day === 0) { const { accountId } = bank(s, 'bank.open_current', { bankId: NATWEST }) as { accountId: string }; void accountId; } if (day === 2) { const n = at(s, NATWEST); if (n) { bank(s, 'bank.transfer', { fromId: primary(s), toId: n.id, amount: 1_000_000 }); bank(s, 'bank.set_primary', { accountId: n.id }); openSavings(s, NATWEST); } } }
function tdPrimary(s: GameState) { tdSteps(s); }
function citiPrimary(s: GameState) { citiSteps(s); }
/**
 * Gear priced to the cent, bought once the bank set up is the primary one (a passport and an opening take weeks), on its
 * debit card: a whole-dollar price rounds up by nothing, so a camera alone would leave round-ups with nothing to move.
 */
const CENTS = ['canon-ef-50-18', 'bp-u35', 'zoom-f3', 'stand-300f', 'lumix-12-35'];
function laterCamera(s: GameState, day: number) { const i = day - 150; if (i >= 0 && i < CENTS.length * 5 && i % 5 === 0) try { buyGear(s, CENTS[i / 5]!); } catch { /* can't, here */ } }

// A bank lends, and arranges an overdraft, only against wages paid in over the last thirty days, which a career's paid
// work brings in some months and not others: these run at twice the careers, so the ones that never borrow don't hide it.
for (const p of PROBES) if (['field-loan-into', 'field-loan-repay', 'field-lender', 'field-loan-purpose', 'field-od-per-use'].includes(p.id)) p.seeds = 80;
