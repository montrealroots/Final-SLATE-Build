// The bank (1221's, src/engine/bankworld): each command run as the bank screens run it (ui/bankworld/app/game-context.tsx
// `run`), on the career's first day, and its effect read from the bank's own ledger.
import type { Probe } from '../probe';
import { buyGear } from '../../../src/engine/equipment';
import { advanceBankWorld, bankSim } from '../../../src/engine/bankworld';
import { bankSummary } from '../../../src/engine/bankworld/summary';
import { netWorth } from '../../../src/engine/bankworld/systems/finance';
import type { GameState } from '../../../src/engine/types';

/** Runs a bank command as the screen does; a refusal throws, so a probe never measures a command that didn't run. */
export function bank(s: GameState, kind: string, payload: Record<string, unknown> = {}): Record<string, unknown> {
  advanceBankWorld(s.bank!, s.now);
  const r = bankSim(s.bank!).execute<Record<string, unknown>>({ kind, payload });
  if (!r.ok) throw new Error(`${kind}: ${r.error}`);
  return r.value ?? {};
}
export const current = (s: GameState) => bankSim(s.bank!).ledger.accountsOf(bankSim(s.bank!).universe.playerId).find((a) => !a.nominal && !a.closedAt && a.kind === 'checking')!.id;
/** Each day until the command is allowed, then never again: for a command the bank allows only in some circumstances. */
export const once = (fn: (s: GameState) => void) => { const done = new WeakSet<GameState>(); return (s: GameState) => { if (done.has(s)) return; try { fn(s); done.add(s); } catch { /* not yet allowed */ } }; };
/** On the first day only. */
export const first = (fn: (s: GameState) => void) => (s: GameState, day: number) => { if (day === 0) fn(s); };

/** On the tenth day, once a card applied for has arrived: a camera bought (equipment.ts buyGear), as a player kits up. */
export const buysCamera = (s: GameState, day: number) => { if (day === 10) buyGear(s, 'bmpcc-4k'); };
export const both = (...fns: ((s: GameState, day: number) => void)[]) => (s: GameState, day: number) => { for (const f of fns) f(s, day); };
/** What purchases were paid from cash in hand, and what is in hand: the wallet's own postings. */
export const walletMeasures = (s: GameState) => {
  const sim = bankSim(s.bank!);
  const wallet = sim.ledger.accountsOf(sim.universe.playerId).find((a) => a.kind === 'cash');
  const paidInCash = wallet ? sim.universe.transactions.filter((t) => /^slate:(equipment|papers)#/.test(t.category ?? '')).reduce((a, t) => a - t.postings.filter((p) => p.accountId === wallet.id).reduce((b, p) => b + p.amount, 0), 0) : 0;
  const kindOf = (id: string) => sim.universe.accounts[id]?.kind;
  return {
    paidInCash: paidInCash / 100,
    withdrawn: wallet ? sim.universe.transactions.reduce((a, t) => a + t.postings.filter((p) => p.accountId === wallet.id && p.amount > 0).reduce((b, p) => b + p.amount, 0), 0) / 100 : 0,
    onCard: sim.universe.transactions.filter((t) => /^slate:(equipment|papers)#/.test(t.category ?? '') && t.postings.some((p) => kindOf(p.accountId) === 'credit_card')).length,
    // The card's bills paid from a current account: a purchase on the card is paid for a statement later.
    cardPaid: sim.universe.transactions.reduce((a, t) => a + (t.postings.some((p) => kindOf(p.accountId) === 'checking' && p.amount < 0) ? t.postings.filter((p) => kindOf(p.accountId) === 'credit_card' && p.amount > 0).reduce((b, p) => b + p.amount, 0) : 0), 0) / 100,
  };
};

/** What the bank's ledger says of the player: interest in and out, fees, what is owed and held. */
export function bankMeasures(s: GameState): Record<string, number> {
  const sim = bankSim(s.bank!);
  const mine = new Set(sim.ledger.accountsOf(sim.universe.playerId).filter((a) => !a.nominal).map((a) => a.id));
  let interestIn = 0, interestOut = 0, fees = 0;
  for (const t of sim.universe.transactions) {
    const amt = t.postings.filter((p) => mine.has(p.accountId)).reduce((a, p) => a + p.amount, 0);
    if (/interest/i.test(t.memo)) { if (amt > 0) interestIn += amt; else interestOut -= amt; }
    else if (/fee|charge|commission/i.test(t.memo) && amt < 0) fees -= amt;
  }
  const sum = bankSummary(sim);
  return {
    interestIn: interestIn / 100, interestOut: interestOut / 100, bankFees: fees / 100,
    owed: sum.reduce((a, c) => a + c.owed, 0) / 100, accounts: sum.reduce((a, c) => a + c.accounts, 0),
    // What you're worth at the bank, in its own money: a term deposit's interest counts here before it's spendable.
    worth: netWorth(sim, sim.universe.playerId).total / 100,
    rewards: sim.ledger.accountsOf(sim.universe.playerId).filter((a) => a.kind === 'credit_card').length,
  };
}

export const PROBES: Probe[] = [
  {
    id: 'bank-savings',
    features: ['bank:bank.open_savings', 'bank:bank.transfer'],
    decision: 'Open a savings account and move $1,000,000 into it',
    reads: ['src/engine/bankworld/systems/banking.ts#registerBanking'],
    variant: { daily: first((s) => { const { accountId } = bank(s, 'bank.open_savings') as { accountId: string }; bank(s, 'bank.transfer', { fromId: current(s), toId: accountId, amount: 100_000_000 }); }) },
    measure: bankMeasures,
    bites: ['accounts', 'interestIn'],
    downstream: ['money'],
  },
  {
    id: 'bank-loan',
    features: ['bank:bank.borrow'],
    decision: 'Borrow as much as the bank will lend, up to $20,000 over five years, on the first day it will (it lends against wages paid in)',
    seeds: 60,
    base: { years: 3 },
    reads: ['src/engine/bankworld/systems/lending.ts#loanOffer', 'src/engine/bankworld/core/ledger.ts#isWages'],
    variant: { years: 3, daily: once((s) => {
      for (const amount of [2_000_000, 1_500_000, 1_200_000, 1_010_000]) { try { bank(s, 'bank.borrow', { amount, months: 60 }); return; } catch { /* less */ } }
      throw new Error('not yet');
    }) },
    measure: bankMeasures,
    bites: ['interestOut'],
    downstream: ['money'],
  },
  {
    id: 'credit-card',
    features: ['bank:card.apply', 'bank:bank.set_payments'],
    // Both careers buy a camera on the tenth day; one has a credit card by then and pays the day's purchases on it.
    // Until November 14, 2026 SLATE's purchases came out of the current account whatever How You Pay said, so the card
    // paid for nothing (bankworld/systems/spending.ts isEveryday).
    decision: 'Take a credit card and pay for what you buy with it',
    reads: ['src/engine/bankworld/systems/spending.ts#isEveryday', 'src/engine/bank.ts#postToBank'],
    base: { daily: buysCamera },
    variant: { daily: both(first((s) => { bank(s, 'card.apply'); bank(s, 'bank.set_payments', { everyday: 'credit' }); }), buysCamera) },
    measure: (s) => ({ ...bankMeasures(s), ...walletMeasures(s) }),
    bites: ['accounts', 'onCard'],
    downstream: ['cardPaid', 'owed', 'interestOut', 'bankFees'],
  },
  {
    id: 'cash-withdrawal',
    features: ['bank:cash.withdraw'],
    // Both careers buy a camera on the tenth day; one has drawn cash and pays the day's purchases in cash first.
    decision: 'Take 250 in the bank\'s own money out of a cash machine and pay for what you buy in cash first',
    reads: ['src/engine/bankworld/systems/cash.ts#registerCash', 'src/engine/bankworld/systems/spending.ts#isEveryday'],
    base: { daily: buysCamera },
    variant: { daily: both(first((s) => { bank(s, 'cash.withdraw', { amount: 25_000, from: 'atm' }); bank(s, 'bank.set_payments', { everyday: 'cash' }); }), buysCamera) },
    measure: (s) => ({ ...bankMeasures(s), ...walletMeasures(s) }),
    bites: ['withdrawn'],
    downstream: ['paidInCash', 'bankFees'],
  },
];
