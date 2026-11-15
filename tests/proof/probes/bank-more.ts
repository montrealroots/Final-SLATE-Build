// More of the bank (1221's, src/engine/bankworld): term deposits, standing orders and scheduled payments to your own
// savings, accounts opened and closed, and a switch to another bank. Each is run as the bank screens run it, and read
// from the bank's own ledger (bank.ts `bankMeasures`). Amounts are in the bank's own money: a London career's pounds.
import type { Probe } from '../probe';
import { bank, bankMeasures } from './bank';
import { bankSim } from '../../../src/engine/bankworld';
import { banksFor, rateOn } from '../../../src/engine/bankworld/systems/banking';
import type { GameState } from '../../../src/engine/types';

const DAYMS = 86_400_000;
const mine = (s: GameState) => bankSim(s.bank!).ledger.accountsOf(bankSim(s.bank!).universe.playerId).filter((a) => !a.nominal && !a.closedAt);
const current = (s: GameState) => mine(s).find((a) => a.kind === 'checking')!.id;
const savings = (s: GameState) => mine(s).find((a) => a.kind === 'savings')?.id ?? (bank(s, 'bank.open_savings') as { accountId: string }).accountId;
/** Once per career, on the first day `fn` can run (a refusal waits for the next day). */
const once = (fn: (s: GameState) => void) => { const done = new WeakSet<GameState>(); return (s: GameState) => { if (done.has(s)) return; try { fn(s); done.add(s); } catch { /* not yet */ } }; };
/** On the `n`th day of the career, once. */
const onDay = (n: number, fn: (s: GameState) => void) => (s: GameState, day: number) => { if (day === n) fn(s); };
const both = (...fns: ((s: GameState, day: number) => void)[]) => (s: GameState, day: number) => { for (const f of fns) f(s, day); };
/** The bank here, other than yours, that pays most on `kind` today (null when none pays more than yours). */
const bestOther = (s: GameState, kind: 'savings' | 'current') => {
  const sim = bankSim(s.bank!);
  const here = sim.player.currentLocationId;
  const mineBanks = new Set(mine(s).map((a) => a.bankId));
  const pays = (b: ReturnType<typeof banksFor>[number]) => rateOn(kind === 'savings' ? b.savings : b.current, sim.now);
  const yours = Math.max(0, ...banksFor(here).filter((b) => mineBanks.has(b.id)).map(pays));
  const best = banksFor(here).filter((b) => !mineBanks.has(b.id)).sort((a, b) => pays(b) - pays(a))[0];
  return best && pays(best) > yours ? best.id : null;
};
/** A million in savings at your own bank, on the first day it can be done. */
const saveMillion = once((s) => { bank(s, 'bank.transfer', { fromId: current(s), toId: savings(s), amount: TERM }); });

const TERM = 1_000_000_00; // a million in the bank's money
/** The standing order each career adds, by id, so it can be cancelled. */
const orders = new WeakMap<GameState, string>();
const addOrder = (s: GameState) => { orders.set(s, (bank(s, 'bank.add_standing_order', { toId: savings(s), amount: 5_000_000, day: 1 }) as { id: string }).id); };
/** NatWest is the London bank with a term deposit (Barclays has none): a current account there, with a million moved in. */
const NATWEST = 'gb-natwest';
const atNatwest = (s: GameState) => mine(s).find((a) => a.kind === 'checking' && a.bankId === NATWEST)?.id;
const fundNatwest = once((s) => { if (!atNatwest(s)) bank(s, 'bank.open_current', { bankId: NATWEST }); const to = atNatwest(s); if (!to) throw new Error('not open yet'); bank(s, 'bank.transfer', { fromId: current(s), toId: to, amount: TERM + 100_000 }); });
const openTerm = (s: GameState) => { if (!mine(s).some((a) => /fixed-term/i.test(a.name))) bank(s, 'bank.open_term', { amount: TERM, bankId: NATWEST }); };
const withTerm = () => { const f = once(openTerm); return (s: GameState, day: number) => { fundNatwestFor(s); if (atNatwest(s) && day > 5) f(s); }; };
const fundNatwestFor = (s: GameState) => fundNatwest(s);
const term = (s: GameState) => mine(s).find((a) => /fixed-term/i.test(a.name))!.id;

export const PROBES: Probe[] = [
  {
    id: 'term-deposit',
    features: ['bank:bank.open_term'],
    decision: 'Lock a million away in a term deposit on the first day',
    reads: ['src/engine/bankworld/systems/lending.ts#registerLending'],
    base: { daily: (s) => fundNatwestFor(s) },
    variant: { daily: withTerm() },
    measure: bankMeasures,
    bites: ['accounts', 'interestIn'],
    downstream: ['worth', 'money'],
  },
  {
    id: 'break-term',
    features: ['bank:bank.break_term'],
    decision: 'Break the term deposit two months in',
    reads: ['src/engine/bankworld/systems/accountlife.ts#registerAccountLife'],
    base: { daily: withTerm() },
    variant: { daily: both(withTerm(), onDay(60, (s) => { bank(s, 'bank.break_term', { accountId: term(s) }); })) },
    measure: bankMeasures,
    bites: ['accounts'],
    downstream: ['interestIn', 'worth', 'money'],
  },
  {
    id: 'term-end',
    features: ['bank:bank.set_term_end'],
    decision: 'Have the term deposit moved to savings at its end rather than renewed (NatWest offers those two)',
    reads: ['src/engine/bankworld/systems/accountlife.ts#registerAccountLife'],
    seeds: 30,
    base: { years: 3, daily: both(withTerm(), onDay(30, (s) => { bank(s, 'bank.set_term_end', { accountId: term(s), atEnd: 'renews' }); })) },
    variant: { years: 3, daily: both(withTerm(), onDay(30, (s) => { bank(s, 'bank.set_term_end', { accountId: term(s), atEnd: 'savings' }); })) },
    measure: bankMeasures,
    bites: ['interestIn'],
    downstream: ['worth', 'money'],
  },
  {
    id: 'standing-order',
    features: ['bank:bank.add_standing_order'],
    decision: 'Send £50,000 a month by standing order to your own savings',
    reads: ['src/engine/bankworld/systems/payments.ts#registerPayments'],
    variant: { daily: once((s) => { bank(s, 'bank.add_standing_order', { toId: savings(s), amount: 5_000_000, day: 1 }); }) },
    measure: bankMeasures,
    bites: ['interestIn'],
    downstream: ['money'],
  },
  {
    id: 'cancel-standing-order',
    features: ['bank:bank.cancel_standing_order'],
    decision: 'Cancel that standing order after three months',
    reads: ['src/engine/bankworld/systems/payments.ts#registerPayments'],
    base: { daily: once(addOrder) },
    variant: { daily: both(once(addOrder), onDay(90, (s) => { const id = orders.get(s); if (id) bank(s, 'bank.cancel_standing_order', { id }); })) },
    measure: bankMeasures,
    bites: ['interestIn'],
    downstream: ['money'],
  },
  {
    id: 'scheduled-payment',
    features: ['bank:bank.schedule_payment'],
    decision: 'Schedule a payment of a million to your own savings a month ahead',
    reads: ['src/engine/bankworld/systems/payments.ts#registerPayments'],
    variant: { daily: once((s) => { bank(s, 'bank.schedule_payment', { fromId: current(s), toId: savings(s), amount: TERM, at: s.now + 30 * DAYMS }); }) },
    measure: bankMeasures,
    bites: ['interestIn'],
    downstream: ['money'],
  },
  {
    id: 'close-savings',
    features: ['bank:bank.close_savings'],
    decision: 'Close the savings account a month after filling it',
    reads: ['src/engine/bankworld/systems/banking.ts#registerBanking'],
    base: { daily: once((s) => { bank(s, 'bank.transfer', { fromId: current(s), toId: savings(s), amount: TERM }); }) },
    variant: { daily: both(once((s) => { bank(s, 'bank.transfer', { fromId: current(s), toId: savings(s), amount: TERM }); }), onDay(30, (s) => { bank(s, 'bank.close_savings', { accountId: savings(s) }); })) },
    measure: bankMeasures,
    bites: ['accounts'],
    downstream: ['interestIn', 'money'],
  },
  {
    id: 'open-current',
    features: ['bank:bank.open_current'],
    // A life in Paris, where a current account has a monthly fee (La Banque Postale's, Crédit Agricole's: no waiver).
    // In London no bank in the data charges for one or pays on one, so a second there changed nothing (until November
    // 14, 2026 the probe was there).
    decision: 'In Paris, open a second current account at a bank whose monthly fee nothing waives',
    reads: ['src/engine/bankworld/systems/bankmoves.ts#registerBankMoves', 'src/engine/bankworld/systems/accountlife.ts#registerAccountLife'],
    base: { placeId: 'fr-paris' },
    variant: { placeId: 'fr-paris', daily: once((s) => {
      const here = bankSim(s.bank!).player.currentLocationId;
      const mineBanks = new Set(mine(s).map((a) => a.bankId));
      const to = banksFor(here).filter((b) => !mineBanks.has(b.id) && (b.current?.monthlyFee ?? 0) > 0 && !b.current?.waiver).sort((x, y) => (y.current?.monthlyFee ?? 0) - (x.current?.monthlyFee ?? 0))[0];
      if (!to) throw new Error('no such bank here');
      bank(s, 'bank.open_current', { bankId: to.id });
    }) },
    measure: bankMeasures,
    bites: ['accounts'],
    downstream: ['bankFees', 'worth'],
  },
  {
    id: 'switch-bank',
    features: ['bank:bank.switch'],
    // With a million in savings, switched to the London bank that pays most on it (until November 14, 2026 the probe
    // switched with nothing saved, between banks that charge nothing for a current account, so nothing could follow).
    decision: 'With a million in savings, switch to the bank here that pays most on savings',
    reads: ['src/engine/bankworld/systems/bankmoves.ts#registerBankMoves', 'src/engine/bankworld/systems/banking.ts#rateOn'],
    base: { daily: saveMillion },
    variant: { daily: both(saveMillion, onDay(10, (s) => { const to = bestOther(s, 'savings'); if (to) bank(s, 'bank.switch', { bankId: to }); })) },
    measure: (s) => ({ ...bankMeasures(s), atFirstBank: mine(s).filter((x) => x.bankId === 'gb-barclays').length }),
    bites: ['atFirstBank'],
    downstream: ['interestIn', 'worth', 'money'],
  },
];
