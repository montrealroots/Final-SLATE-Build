// The bank (1221's, src/engine/bankworld): each command run as the bank screens run it (ui/bankworld/app/game-context.tsx
// `run`), on the career's first day, and its effect read from the bank's own ledger.
import type { Probe } from '../probe';
import { advanceBankWorld, bankSim } from '../../../src/engine/bankworld';
import { bankSummary } from '../../../src/engine/bankworld/summary';
import type { GameState } from '../../../src/engine/types';

/** Runs a bank command as the screen does; a refusal throws, so a probe never measures a command that didn't run. */
export function bank(s: GameState, kind: string, payload: Record<string, unknown> = {}): Record<string, unknown> {
  advanceBankWorld(s.bank!, s.now);
  const r = bankSim(s.bank!).execute<Record<string, unknown>>({ kind, payload });
  if (!r.ok) throw new Error(`${kind}: ${r.error}`);
  return r.value ?? {};
}
const current = (s: GameState) => bankSim(s.bank!).ledger.accountsOf(bankSim(s.bank!).universe.playerId).find((a) => !a.nominal && !a.closedAt && a.kind === 'checking')!.id;
/** Each day until the command is allowed, then never again: for a command the bank allows only in some circumstances. */
const once = (fn: (s: GameState) => void) => { const done = new WeakSet<GameState>(); return (s: GameState) => { if (done.has(s)) return; try { fn(s); done.add(s); } catch { /* not yet allowed */ } }; };
/** On the first day only. */
const first = (fn: (s: GameState) => void) => (s: GameState, day: number) => { if (day === 0) fn(s); };

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
    decision: 'Take a credit card and pay for everyday things with it',
    reads: ['src/engine/bankworld/systems/banking.ts#registerBanking'],
    variant: { daily: first((s) => { bank(s, 'card.apply'); bank(s, 'bank.set_payments', { everyday: 'credit' }); }) },
    measure: bankMeasures,
    bites: ['accounts'],
    downstream: ['money', 'bankFees', 'interestOut', 'owed'],
  },
  {
    id: 'cash-withdrawal',
    features: ['bank:cash.withdraw'],
    decision: 'Take $400 out of a cash machine',
    reads: ['src/engine/bankworld/systems/banking.ts#registerBanking'],
    variant: { daily: first((s) => void bank(s, 'cash.withdraw', { amount: 40_000, from: 'atm' })) },
    measure: bankMeasures,
    bites: ['money'],
    downstream: ['bankFees', 'interestIn'],
  },
];
