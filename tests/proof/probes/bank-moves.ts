// The bank's account commands (1221's bank, src/engine/bankworld): an account closed or cancelled, the primary account,
// where wages go and where a standing order, a card's autopay and a loan pay from, a loan repaid early, cash paid back
// in, a scheduled payment cancelled, a switch called off or its balance kept, and which card pays every day. Read from
// the bank's own ledger, in its money (a London career's pounds, a Paris career's euros).
import type { Probe } from '../probe';
import { bank, bankMeasures, both, buysCamera, first, once } from './bank';
import { bankSim } from '../../../src/engine/bankworld';
import { banksFor } from '../../../src/engine/bankworld/systems/banking';
import type { GameState } from '../../../src/engine/types';

const DAYMS = 86_400_000;
const sim = (s: GameState) => bankSim(s.bank!);
/** The player's primary current account (the first in the bank's list needn't be). */
const primary = (s: GameState) => sim(s).player.primaryAccountId!;
const mine = (s: GameState) => sim(s).ledger.accountsOf(sim(s).universe.playerId).filter((a) => !a.nominal && !a.closedAt);
const savings = (s: GameState) => mine(s).find((a) => a.kind === 'savings')?.id ?? (bank(s, 'bank.open_savings') as { accountId: string }).accountId;
const at = (s: GameState, bankId: string, kind = 'checking') => mine(s).find((a) => a.kind === kind && a.bankId === bankId);
const from = (n: number, fn: (s: GameState) => void) => { const f = once(fn); return (s: GameState, day: number) => { if (day >= n) f(s); }; };
const NATWEST = 'gb-natwest';
/** A current account at NatWest beside Barclays, with five thousand moved in once it is open. */
const natwest = both(first((s) => { bank(s, 'bank.open_current', { bankId: NATWEST }); }), from(1, (s) => { const n = at(s, NATWEST); if (!n) throw new Error('not open'); bank(s, 'bank.transfer', { fromId: primary(s), toId: n.id, amount: 500_000 }); }));
/** Money leaving each of the player's banks, and what each holds. */
const paidFrom = (s: GameState, bankId: string) => {
  const ids = new Set(sim(s).ledger.accountsOf(sim(s).universe.playerId).filter((a) => a.bankId === bankId && a.kind === 'checking').map((a) => a.id));
  return sim(s).universe.transactions.reduce((a, t) => a + t.postings.filter((p) => ids.has(p.accountId) && p.amount < 0).reduce((b, p) => b - p.amount, 0), 0) / 100;
};
const measure = (s: GameState) => ({
  ...bankMeasures(s),
  paidFromNatwest: paidFrom(s, NATWEST),
  natwestHeld: (at(s, NATWEST)?.balance ?? 0) / 100,
  savingsHeld: mine(s).filter((a) => a.kind === 'savings').reduce((x, a) => x + a.balance, 0) / 100,
  primaryIsFirst: Number(sim(s).universe.accounts[sim(s).player.primaryAccountId ?? '']?.bankId === 'gb-barclays'),
  atFirstBank: mine(s).filter((a) => a.bankId === 'gb-barclays').reduce((x, a) => x + Math.max(0, a.balance), 0) / 100,
  cashHeld: (mine(s).find((a) => a.kind === 'cash')?.balance ?? 0) / 100,
  loansOwed: mine(s).filter((a) => a.kind === 'loan').reduce((x, a) => x - Math.min(0, a.balance), 0) / 100,
  // Purchases on NatWest's card, and that card's bills paid from a current account.
  onNatwestCard: sim(s).universe.transactions.filter((t) => /^slate:(equipment|papers)#/.test(t.category ?? '') && t.postings.some((p) => { const a = sim(s).universe.accounts[p.accountId]; return a?.kind === 'credit_card' && a.bankId === NATWEST; })).length,
  cardBillsToNatwest: sim(s).universe.transactions.reduce((x, t) => x + (t.postings.some((p) => sim(s).universe.accounts[p.accountId]?.kind === 'checking' && p.amount < 0) ? t.postings.filter((p) => { const a = sim(s).universe.accounts[p.accountId]; return a?.kind === 'credit_card' && a.bankId === NATWEST && p.amount > 0; }).reduce((y, p) => y + p.amount, 0) : 0), 0) / 100,
});
const P = (id: string, command: string, decision: string, reads: string, base: Probe['base'], variant: Probe['variant'], bites: string[], downstream: string[]): Probe =>
  ({ id, features: [`bank:${command}`], decision, reads: [reads], base, variant, measure, bites, downstream });

/** In Paris, a second current account at the bank whose monthly fee nothing waives (bank-more.ts open-current). */
const feeBank = (s: GameState) => {
  const here = sim(s).player.currentLocationId;
  const have = new Set(mine(s).map((a) => a.bankId));
  return banksFor(here).filter((b) => !have.has(b.id) && (b.current?.monthlyFee ?? 0) > 0 && !b.current?.waiver).sort((x, y) => (y.current?.monthlyFee ?? 0) - (x.current?.monthlyFee ?? 0))[0]?.id;
};
const PARIS = 'fr-paris';
const openFeeBank = first((s) => { const b = feeBank(s); if (b) { bank(s, 'bank.open_current', { bankId: b }); (opened as Map<GameState, string>).set(s, b); } });
const opened = new Map<GameState, string>();
const feeAccount = (s: GameState) => { const b = opened.get(s); return b ? at(s, b) : undefined; };
/** Ten thousand borrowed over two years on the first day. */
// The bank lends against wages paid in over the last thirty days: the first day it will, once.
const borrow = from(1, (s) => { bank(s, 'bank.borrow', { amount: 1_000_000, months: 24 }); });
const loanOf = (s: GameState) => mine(s).find((a) => a.kind === 'loan');
/** A million in savings and a switch to the bank that pays most on it, on the tenth day (bank-more.ts switch-bank). */
const switchBest = (s: GameState, day: number) => {
  if (day === 0) bank(s, 'bank.transfer', { fromId: primary(s), toId: savings(s), amount: 100_000_000 });
  if (day === 10) bank(s, 'bank.switch', { bankId: NATWEST });
};

export const PROBES: Probe[] = [
  P('close-current', 'bank.close_current', 'In Paris, close the second current account a month after opening it', 'src/engine/bankworld/systems/bankmoves.ts#registerBankMoves',
    { placeId: PARIS, daily: openFeeBank }, { placeId: PARIS, daily: both(openFeeBank, 
      // Its fee has overdrawn it by then, and the bank closes it once that is paid: the player sends ten euros on the
      // twenty-fifth day (between banks it takes days to arrive), and closes it from the thirtieth.
      from(25, (s) => { const a = feeAccount(s); if (!a) throw new Error('none'); bank(s, 'bank.transfer', { fromId: primary(s), toId: a.id, amount: 1_000 }); }),
      from(30, (s) => { const a = feeAccount(s); if (!a || a.balance < 0) throw new Error('not yet'); bank(s, 'bank.close_current', { accountId: a.id, remainderTo: primary(s) }); })) },
    ['accounts'], ['bankFees', 'worth']),
  P('cancel-new', 'bank.cancel_new', 'In Paris, cancel the new current account within its cooling-off period', 'src/engine/bankworld/systems/accountlife.ts#registerAccountLife',
    { placeId: PARIS, daily: openFeeBank }, { placeId: PARIS, daily: both(openFeeBank, from(3, (s) => { const a = feeAccount(s); if (!a) throw new Error('none'); bank(s, 'bank.cancel_new', { accountId: a.id }); })) },
    ['accounts'], ['bankFees', 'worth']),
  P('set-primary', 'bank.set_primary', 'Make the NatWest account primary before the camera is bought', 'src/engine/bankworld/systems/bankmoves.ts#registerBankMoves',
    // Once the money moved to NatWest has arrived; the camera is bought on the twentieth day.
    { daily: both(natwest, buyLater) }, { daily: both(natwest, from(15, (s) => { const n = at(s, NATWEST); if (!n || n.balance <= 0) throw new Error('not yet'); bank(s, 'bank.set_primary', { accountId: n.id }); }), buyLater) },
    ['primaryIsFirst'], ['paidFromNatwest', 'natwestHeld']),
  P('redirect-deposits', 'bank.redirect_deposits', 'Have wages paid into savings', 'src/engine/bankworld/systems/bankmoves.ts#registerBankMoves',
    { daily: first((s) => { savings(s); }) }, { daily: both(first((s) => { savings(s); }), from(1, (s) => { bank(s, 'bank.redirect_deposits', { accountId: savings(s) }); })) },
    ['savingsHeld'], ['interestIn', 'worth']),
  P('order-source', 'bank.set_order_source', "Have the monthly standing order paid from NatWest", 'src/engine/bankworld/systems/bankmoves.ts#registerBankMoves',
    { daily: both(natwest, from(2, (s) => { orders.set(s, (bank(s, 'bank.add_standing_order', { toId: savings(s), amount: 50_000, day: 1 }) as { id: string }).id); })) },
    { daily: both(natwest, from(2, (s) => { orders.set(s, (bank(s, 'bank.add_standing_order', { toId: savings(s), amount: 50_000, day: 1 }) as { id: string }).id); }), from(3, (s) => { bank(s, 'bank.set_order_source', { orderId: orders.get(s)!, accountId: at(s, NATWEST)!.id }); })) },
    ['paidFromNatwest'], ['natwestHeld', 'atFirstBank']),
  P('autopay-from', 'card.set_autopay_from', "Pay the card's autopay from NatWest", 'src/engine/bankworld/systems/bankmoves.ts#registerBankMoves',
    { daily: both(natwest, first((s) => { bank(s, 'card.apply'); bank(s, 'bank.set_payments', { everyday: 'credit' }); }), buysCamera) },
    { daily: both(natwest, first((s) => { bank(s, 'card.apply'); bank(s, 'bank.set_payments', { everyday: 'credit' }); }), from(9, (s) => { const c = mine(s).find((a) => a.kind === 'credit_card'); if (!c) throw new Error('no card'); bank(s, 'card.set_autopay_from', { cardId: c.id, accountId: at(s, NATWEST)!.id }); }), buysCamera) },
    ['paidFromNatwest'], ['natwestHeld', 'atFirstBank']),
  P('repay-loan', 'bank.repay_loan', 'Pay the loan off a month after taking it', 'src/engine/bankworld/systems/lending.ts#registerLending',
    { daily: borrow }, { daily: both(borrow, from(1, (s) => { const l = loanOf(s); if (!l || s.now - l.openedAt < 30 * DAYMS) throw new Error('not yet'); bank(s, 'bank.repay_loan', { loanId: l.id }); })) },
    ['loansOwed'], ['interestOut', 'worth']),
  P('loan-repayment', 'bank.set_loan_repayment', 'Repay the loan from NatWest', 'src/engine/bankworld/systems/lending.ts#registerLending',
    { daily: both(natwest, borrow) }, { daily: both(natwest, borrow, from(3, (s) => { const l = loanOf(s); const n = at(s, NATWEST); if (!l || !n) throw new Error('not yet'); bank(s, 'bank.set_loan_repayment', { loanId: l.id, accountId: n.id }); })) },
    ['paidFromNatwest'], ['natwestHeld', 'atFirstBank']),
  P('cash-deposit', 'cash.deposit', 'Pay the five hundred drawn out back in at the counter', 'src/engine/bankworld/systems/cash.ts#registerCash',
    { daily: first((s) => { bank(s, 'cash.withdraw', { amount: 50_000, from: 'counter' }); }) },
    { daily: both(first((s) => { bank(s, 'cash.withdraw', { amount: 50_000, from: 'counter' }); }), from(5, (s) => { bank(s, 'cash.deposit', { amount: 50_000, toId: primary(s), at: 'counter' }); })) },
    ['cashHeld'], ['atFirstBank', 'interestIn']),
  P('cancel-scheduled', 'bank.cancel_scheduled', 'Cancel the payment of a million to savings scheduled for next month', 'src/engine/bankworld/systems/payments.ts#registerPayments',
    { daily: first((s) => { scheduled.set(s, (bank(s, 'bank.schedule_payment', { fromId: primary(s), toId: savings(s), amount: 100_000_000, at: s.now + 30 * DAYMS }) as { id: string }).id); }) },
    { daily: both(first((s) => { scheduled.set(s, (bank(s, 'bank.schedule_payment', { fromId: primary(s), toId: savings(s), amount: 100_000_000, at: s.now + 30 * DAYMS }) as { id: string }).id); }), from(2, (s) => { bank(s, 'bank.cancel_scheduled', { id: scheduled.get(s)! }); })) },
    ['savingsHeld'], ['interestIn', 'worth']),
  P('cancel-switch', 'bank.cancel_switch', 'Call off the switch to NatWest the day after asking for it', 'src/engine/bankworld/systems/lending.ts#registerLending',
    { daily: switchBest }, { daily: both(switchBest, from(10, (s) => { bank(s, 'bank.cancel_switch', { confirm: true }); })) },
    ['atFirstBank'], ['interestIn', 'worth']),
  P('stop-balance-transfer', 'bank.stop_balance_transfer', "Keep the balance at Barclays when switching to NatWest", 'src/engine/bankworld/systems/lending.ts#registerLending',
    { daily: switchBest }, { daily: both(switchBest, from(11, (s) => { bank(s, 'bank.stop_balance_transfer', { confirm: true }); })) },
    ['atFirstBank'], ['interestIn', 'worth']),
  P('card-everyday', 'card.set_everyday', "Make NatWest's card the one every purchase goes on", 'src/engine/bankworld/systems/credit.ts#registerCredit',
    { daily: both(first((s) => { bank(s, 'card.apply'); bank(s, 'bank.set_payments', { everyday: 'credit' }); }), from(8, (s) => { bank(s, 'card.apply', { bankId: NATWEST }); }), buyLater) },
    { daily: both(first((s) => { bank(s, 'card.apply'); bank(s, 'bank.set_payments', { everyday: 'credit' }); }), from(8, (s) => { bank(s, 'card.apply', { bankId: NATWEST }); }), from(16, (s) => { const c = mine(s).find((a) => a.kind === 'credit_card' && a.bankId === NATWEST); if (!c) throw new Error('not yet'); bank(s, 'card.set_everyday', { accountId: c.id }); }), buyLater) },
    ['onNatwestCard'], ['cardBillsToNatwest']),
];
const orders = new Map<GameState, string>();
const scheduled = new Map<GameState, string>();
/** A camera bought on the twentieth day, once both cards have arrived. */
function buyLater(s: GameState, day: number) { buysCamera(s, day - 10); }
