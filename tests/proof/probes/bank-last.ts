// The bank commands a career on its inheritance never needed (1221's bank, src/engine/bankworld): a card's automatic
// raises, and the rest as they are written. Read from the bank's own ledger and the card's record.
import type { Probe } from '../probe';
import { bank, bankMeasures, both, buysCamera, first, once, walletMeasures } from './bank';
import { advanceBankWorld, bankSim } from '../../../src/engine/bankworld';
import { attemptOnNumber, somebodyElse } from '../../../src/engine/bankworld/systems/security';
import type { GameState } from '../../../src/engine/types';
import { buyGear } from '../../../src/engine/equipment';

const sim = (s: GameState) => bankSim(s.bank!);
const cards = (s: GameState) => sim(s).ledger.accountsOf(sim(s).universe.playerId).filter((a) => a.kind === 'credit_card' && !a.closedAt);
const DAY = 86_400_000;
const fraudOf = (s: GameState) => sim(s).player.fraud ?? [];
const measure = (s: GameState) => ({
  ...bankMeasures(s), ...walletMeasures(s),
  loans: sim(s).ledger.accountsOf(sim(s).universe.playerId).filter((a) => a.kind === 'loan' && a.category !== 'collections' && !a.closedAt).length,
  heldByState: (sim(s).player.unclaimed ?? []).reduce((a, u) => a + u.amount, 0) / 100,
  inCollections: -sim(s).ledger.accountsOf(sim(s).universe.playerId).filter((a) => a.category === 'collections' && !a.closedAt).reduce((a, c) => a + c.balance, 0) / 100,
  wellsAccounts: sim(s).ledger.accountsOf(sim(s).universe.playerId).filter((a) => a.bankId === 'us-wells-fargo' && !a.closedAt).length,
  dormantAccounts: sim(s).ledger.accountsOf(sim(s).universe.playerId).filter((a) => a.dormant && !a.closedAt).length,
  inSavings: sim(s).ledger.accountsOf(sim(s).universe.playerId).filter((a) => a.kind === 'savings' && !a.closedAt).reduce((a, c) => a + c.balance, 0) / 100,
  gearOwned: (s.gear?.items ?? []).length,
  overdrawnBy: Math.max(0, -sim(s).ledger.accountsOf(sim(s).universe.playerId).filter((a) => a.kind === 'checking' && !a.closedAt).reduce((a, c) => a + Math.min(0, c.balance), 0)) / 100,
  // Somebody else's charges (a labelled fixture below): what was taken, what of it the holder carried, and how long
  // before they were taken to know of it.
  fraudTaken: fraudOf(s).reduce((a, f) => a + f.amount, 0) / 100,
  fraudCarried: fraudOf(s).reduce((a, f) => a + (f.reportedAt === undefined ? f.amount : f.carried ?? 0), 0) / 100,
  fraudReported: fraudOf(s).filter((f) => f.reportedAt !== undefined).length,
  fraudKnownAfter: fraudOf(s).reduce((a, f) => a + (f.learnedAt - f.at) / DAY, 0),
  takenByNumber: fraudOf(s).filter((f) => f.via === 'number').reduce((a, f) => a + f.amount, 0) / 100,
  cardLimit: cards(s).reduce((a, c) => a + (c.creditLimit ?? 0), 0) / 100,
  creditScore: sim(s).player.credit?.score ?? 0,
});
const P = (id: string, command: string, decision: string, reads: string, base: Probe['base'], variant: Probe['variant'], bites: string[], downstream: string[]): Probe =>
  ({ id, features: [`bank:${command}`], decision, reads: [reads], base, variant, measure, bites, downstream });
/** A card on the first day, everyday spending put on it, and the camera bought on it on the tenth. */
const onCard = both(first((s) => { bank(s, 'card.apply'); bank(s, 'bank.set_payments', { everyday: 'credit' }); }), buysCamera);
/**
 * On the four hundredth day, two more cameras, $2,269 and then $1,295 (about £1,790 and £1,020 in London): the second
 * fits on the card beside the first only under a limit that was raised.
 */
const moreCameras = (s: GameState, day: number) => { if (day === 400) for (const id of ['bmpcc-6k-g2', 'bmpcc-4k']) try { buyGear(s, id); } catch { /* refused */ } };
/**
 * Steps in order, each tried daily until the bank allows it (or it stops throwing), the next from the day after; a step
 * gets the time the one before it finished. For set-ups that wait on the bank: a passport, an account opening.
 */
type Step = (s: GameState, since: number) => void;
const steps = (...fns: Step[]) => { const at = new WeakMap<GameState, { i: number; since: number }>(); return (s: GameState) => {
  const c = at.get(s) ?? { i: 0, since: s.now };
  if (c.i >= fns.length) return;
  try { fns[c.i](s, c.since); at.set(s, { i: c.i + 1, since: s.now }); } catch { at.set(s, c); }
}; };
const wait = (days: number): Step => (s, since) => { if (s.now - since < days * 86_400_000) throw new Error('waiting'); };
/** A passport applied for (a bank asks a new customer for photo ID), where none is held or on its way. */
const passport: Step = (s) => { try { bank(s, 'documents.apply_passport', {}); } catch { /* held or applied for */ } };
/** Each day from the first until the bank allows it, then never again (a card's settings wait for the card). */
const soon = (fn: (s: GameState) => void) => { const f = once(fn); return (s: GameState, day: number) => { if (day >= 1) f(s); }; };

const NY = 'us-new-york';
const primary = (s: GameState) => sim(s).player.primaryAccountId!;
/** A labelled fixture: on `day`, somebody else spends $400 on the debit card of the everyday account. */
const stranger = (day: number) => (s: GameState, d: number) => {
  if (d !== day) return;
  advanceBankWorld(s.bank!, s.now);
  somebodyElse(sim(s), sim(s).player, { which: 'debit', account: sim(s).universe.accounts[primary(s)]!, amount: 40_000, stopped: false });
};
/** Each day: the stranger's charge reported once the holder knows of it (`known`) or once its statement has come (`statement`). */
const report = (when: 'known' | 'statement') => (s: GameState) => {
  const f = fraudOf(s)[0];
  if (!f || f.reportedAt !== undefined || s.now < (when === 'known' ? f.learnedAt : f.statedAt)) return;
  try { bank(s, 'card.dispute', { index: 0 }); } catch { /* not allowed */ }
};
/** Born in New York: an American, whom Citi opens a current account for. */
const AMERICAN = { birthplaceId: 'us-new-york' };
const CITI = 'us-citi';
const citi = (s: GameState) => sim(s).ledger.accountsOf(sim(s).universe.playerId).find((a) => a.kind === 'checking' && a.bankId === CITI && !a.closedAt);
const openCiti: Step = (s) => { if (!citi(s)) bank(s, 'bank.open_current', { bankId: CITI }); };
const fundCiti: Step = (s) => { const a = citi(s)!; bank(s, 'bank.transfer', { fromId: primary(s), toId: a.id, amount: 1_000_000 }); };
const citiPrimary: Step = (s) => { const a = citi(s); if (!a || a.balance <= 0) throw new Error('not yet'); bank(s, 'bank.set_primary', { accountId: a.id }); };
/** A labelled fixture: somebody else spends $400 on the debit card of the everyday account. */
const strangerNow: Step = (s) => { advanceBankWorld(s.bank!, s.now); somebodyElse(sim(s), sim(s).player, { which: 'debit', account: sim(s).universe.accounts[primary(s)]!, amount: 40_000, stopped: false }); };
/** A labelled fixture: somebody tries the everyday account's number for a debit. */
const numberTried: Step = (s) => { advanceBankWorld(s.bank!, s.now); attemptOnNumber(sim(s), sim(s).player, { size: 0.5 }); };
const moveNumber: Step = (s) => { bank(s, 'bank.new_number'); };
/**
 * In Citi's case: a passport, the account opened and funded and made the everyday one, a stranger's debit on its card,
 * then (`moved`) the account moved to a new number five days on, and twenty days after that the old number tried.
 */
const citiCase = (moved: boolean) => steps(passport, openCiti, fundCiti, citiPrimary, strangerNow, wait(5), ...(moved ? [moveNumber] : []), wait(20), numberTried);
/**
 * On `day`: everything but `keep` (in cents) of the current account moved into a savings account (opened then if there
 * is none), and a $370 memory card bought on the debit card, or refused for want of money.
 */
const shortThenBuy = (day: number, keep: number) => (s: GameState, d: number) => {
  if (d !== day) return;
  const mine = sim(s).ledger.accountsOf(sim(s).universe.playerId);
  const savings = mine.find((a) => a.kind === 'savings' && !a.closedAt)?.id ?? (bank(s, 'bank.open_savings') as { accountId: string }).accountId;
  const cur = sim(s).universe.accounts[primary(s)]!;
  if (cur.balance > keep) bank(s, 'bank.transfer', { fromId: cur.id, toId: savings, amount: cur.balance - keep });
  try { buyGear(s, 'cfast-256'); } catch { /* refused */ }
};
/** On the first day: a card applied for and everyday spending put on it, and all but $50 of the current account locked in a term deposit. */
const lockedAway = first((s) => {
  bank(s, 'card.apply'); bank(s, 'bank.set_payments', { everyday: 'credit' });
  const cur = sim(s).universe.accounts[primary(s)]!;
  bank(s, 'bank.open_term', { amount: cur.balance - 5_000 });
});
/** Each day: a hardship plan asked for, once the bank allows it (the holder can't clear the card from current and savings). */
const hardship = (s: GameState) => { try { bank(s, 'card.request_hardship'); } catch { /* not allowed yet, or already on one */ } };
/** New York: $10,000 in a savings account at the home bank on the first day, then never touched. */
const forgotten = first((s) => { const { accountId } = bank(s, 'bank.open_savings') as { accountId: string }; bank(s, 'bank.transfer', { fromId: primary(s), toId: accountId, amount: 1_000_000 }); });
/** Each day: unclaimed money of yours claimed back, once there is any. */
const claim = (s: GameState) => { if ((sim(s).player.unclaimed ?? []).length) try { bank(s, 'bank.claim_unclaimed'); } catch { /* nothing to claim */ } };
/** Paris: on the fifth day, all but €50 of the current account moved to savings, and the camera bought on the debit card past it. */
const PARIS = 'fr-paris';
const overrun = (s: GameState, d: number) => {
  if (d !== 5) return;
  const mine = sim(s).ledger.accountsOf(sim(s).universe.playerId);
  const savings = mine.find((a) => a.kind === 'savings' && !a.closedAt)?.id ?? (bank(s, 'bank.open_savings') as { accountId: string }).accountId;
  const cur = sim(s).universe.accounts[primary(s)]!;
  bank(s, 'bank.transfer', { fromId: cur.id, toId: savings, amount: cur.balance - 5_000 });
  try { buyGear(s, 'bmpcc-4k'); } catch { /* refused */ }
};
/** Each day: the bank's loan for the overrun taken, once it is offered. */
const takeLoan = (s: GameState) => { if (sim(s).universe.accounts[primary(s)]?.creditOffered) try { bank(s, 'bank.take_overrun_loan'); } catch { /* not now */ } };
/** In Toronto: a TD current account and a TD savings account with $10,000 in it, both left alone; on day 500, $5,000 asked back from it to the everyday account. */
const TORONTO = 'ca-toronto';
const tdSavings = (s: GameState) => sim(s).ledger.accountsOf(sim(s).universe.playerId).find((a) => a.kind === 'savings' && a.bankId === 'ca-td' && !a.closedAt);
const idleAtTd = both(first((s) => { bank(s, 'bank.open_current', { bankId: 'ca-td' }); const { accountId } = bank(s, 'bank.open_savings', { bankId: 'ca-td' }) as { accountId: string }; bank(s, 'bank.transfer', { fromId: primary(s), toId: accountId, amount: 1_000_000 }); }),
  (s: GameState, d: number) => { if (d === 500) { const a = tdSavings(s); if (a) try { bank(s, 'bank.transfer', { fromId: a.id, toId: primary(s), amount: 500_000 }); } catch { /* refused */ } } });
/** Each day: the TD savings account reactivated once it has gone dormant. */
const reactivate = (s: GameState) => { const a = tdSavings(s); if (a?.dormant) try { bank(s, 'bank.reactivate', { accountId: a.id }); } catch { /* not now */ } };
/**
 * New York, American: a passport, a Citi account opened and wages paid into it, Chase left with $300 and the rest
 * moved to Citi, the debit card
 * overdraft opted into at Chase, a $370 debit purchase there the next day, into its overdraft, then Citi made the
 * everyday account, so nothing pays Chase back; Chase charges it off after sixty days (lending.ts). A hundred and twenty
 * days after the purchase, an account asked for at Wells Fargo. With `pay`, whatever is in collections paid each day.
 */
const chaseShort: Step = (s) => { const a = citi(s)!; const chase = sim(s).universe.accounts[primary(s)]!; bank(s, 'bank.redirect_deposits', { accountId: a.id }); bank(s, 'bank.transfer', { fromId: chase.id, toId: a.id, amount: chase.balance - 30_000 }); bank(s, 'bank.debit_overdraft', { on: true }); };
const buyAtChase: Step = (s) => { buyGear(s, 'cfast-256'); };
const askWells: Step = (s) => { try { bank(s, 'bank.open_current', { bankId: 'us-wells-fargo', fundFrom: primary(s), amount: 10_000 }); } catch { /* declined */ } };
const payCollections = (s: GameState) => { const owed = sim(s).ledger.accountsOf(sim(s).universe.playerId).find((a) => a.category === 'collections' && !a.closedAt && a.balance < 0); if (owed) try { bank(s, 'bank.pay_collections', { amount: -owed.balance, debtId: owed.id }); } catch { /* nothing to pay with */ } };
const chargedOff = (pay: boolean) => { const run = steps(passport, openCiti, wait(10), chaseShort, buyAtChase, citiPrimary, wait(120), askWells); return (s: GameState) => { run(s); if (pay) payCollections(s); }; };

export const PROBES: Probe[] = [
  // Every six months a clean record raises the limit by a fifth, unless the holder asked it never to be raised unasked
  // (credit.ts statement review): a higher limit leaves less of it used, which the score reads (credit.ts reportMonth).
  P('card-no-auto-raise', 'card.set_auto_raise', "Ask the bank never to raise the card's limit unasked", 'src/engine/bankworld/systems/credit.ts#registerCredit',
    // A purchase the card has no room for isn't made on it (spending.ts): the last camera goes on it only if raised.
    { daily: both(onCard, moreCameras) }, { daily: both(onCard, moreCameras, soon((s) => { bank(s, 'card.set_auto_raise', { on: false }); })) },
    ['cardLimit'], ['cardPaid', 'onCard']),
  // Reported, a stranger's charge is the bank's to bear, but for what the law leaves the holder (security.ts
  // liabilityFor: in the US at most $50 within two business days of finding out); unreported, all of it is theirs.
  P('dispute-charge', 'card.dispute', 'Report the debit somebody else made on your card, once you know of it', 'src/engine/bankworld/systems/security.ts#liabilityFor',
    { placeId: NY, daily: stranger(20) }, { placeId: NY, daily: both(stranger(20), report('known')) },
    ['fraudReported'], ['fraudCarried', 'worth']),
  // A large-payment alert tells you of a stranger's charge at once (security.ts somebodyElse: learnedAt), and the US
  // two-day limit runs from finding out: a holder who reports only when the statement comes is then past it.
  P('large-payment-alert', 'bank.set_alerts', 'Be alerted to payments of $100 or more, then report the stranger\'s debit when the statement comes', 'src/engine/bankworld/systems/security.ts#somebodyElse',
    { placeId: NY, daily: both(stranger(20), report('statement')) }, { placeId: NY, daily: both(first((s) => { bank(s, 'bank.set_alerts', { largePayment: 10_000 }); }), stranger(20), report('statement')) },
    ['fraudKnownAfter'], ['fraudCarried', 'worth']),
  // A debit card used by somebody else leaves the account's number exposed at a bank that offers a new one (security.ts):
  // moved, a later attempt on the old number is declined; kept, it is taken.
  P('new-number', 'bank.new_number', 'Born American and banking with Citi, move the account to a new number after a stranger used its debit card', 'src/engine/bankworld/systems/security.ts#attemptOnNumber',
    { placeId: NY, creation: AMERICAN, daily: citiCase(false) }, { placeId: NY, creation: AMERICAN, daily: citiCase(true) },
    ['takenByNumber'], ['fraudCarried', 'worth']),
  // With £300 in the current account, the memory card (about £290) is paid on the debit card; over £300 on a later day,
  // only into an overdraft arranged (lending.ts), which Barclays arranges against wages paid in, so from paid work.
  P('arrange-overdraft', 'bank.arrange_overdraft', 'Arrange a £1,000 overdraft once wages are paid in, then buy the memory card with £30 in the current account', 'src/engine/bankworld/systems/lending.ts#registerLending',
    { daily: shortThenBuy(300, 3_000) }, { daily: both(soon((s) => { bank(s, 'bank.arrange_overdraft', { limit: 100_000 }); }), shortThenBuy(300, 3_000)) },
    ['gearOwned'], ['interestOut', 'worth']),
  // A US bank pays a debit card purchase into an overdraft only for a customer who opted in (lending.ts), for its fee.
  P('debit-overdraft', 'bank.debit_overdraft', 'Opt in to debit card overdrafts, then buy the $370 memory card with $300 in the checking account', 'src/engine/bankworld/systems/lending.ts#registerLending',
    { placeId: NY, daily: shortThenBuy(10, 30_000) }, { placeId: NY, daily: both(soon((s) => { bank(s, 'bank.debit_overdraft', { on: true }); }), shortThenBuy(10, 30_000)) },
    ['gearOwned'], ['bankFees', 'worth']),
  // TD makes an account untouched for twelve months dormant (accountlife.ts): nothing moves in or out of it until the
  // holder gets in touch (banking.ts transfer).
  P('reactivate', 'bank.reactivate', 'Reactivate the idle TD savings account once it goes dormant', 'src/engine/bankworld/systems/accountlife.ts#registerAccountLife',
    { placeId: TORONTO, daily: idleAtTd }, { placeId: TORONTO, daily: both(idleAtTd, reactivate) },
    ['dormantAccounts'], ['inSavings', 'interestIn']),
  // A debt in collections paid, a US bank's ChexSystems check turns fewer away (lending.ts declines).
  P('pay-collections', 'bank.pay_collections', 'Pay the debt Chase charged off, then ask Wells Fargo for an account', 'src/engine/bankworld/systems/lending.ts#declines',
    { placeId: NY, creation: AMERICAN, daily: chargedOff(false) }, { placeId: NY, creation: AMERICAN, daily: chargedOff(true) },
    ['inCollections'], ['wellsAccounts']),
  // A hardship plan (cardlife.ts) freezes the card's interest and asks a small fixed payment, met where the minimum isn't,
  // for a holder who can't pay:
  // here, in Toronto, with the money locked in a term deposit and no paid work, the camera on the card can't be cleared.
  P('card-hardship', 'card.request_hardship', 'With everything in a term deposit, ask for a hardship plan on the card the camera went on', 'src/engine/bankworld/systems/cardlife.ts#registerCardLife',
    { placeId: TORONTO, takeJobs: false, daily: both(lockedAway, buysCamera) }, { placeId: TORONTO, takeJobs: false, daily: both(lockedAway, buysCamera, hardship) },
    // At this card's introductory 0%, there is no interest to freeze: what the plan saves is the late fees (4 careers).
    ['bankFees'], ['worth', 'owed']),
  // New York hands an account untouched for three years to the state (accountlife.ts: UNCLAIMED), which holds it until
  // claimed; claimed, it is the holder's again. Four years, so the three pass.
  P('claim-unclaimed', 'bank.claim_unclaimed', 'Claim back the savings the state took after three idle years', 'src/engine/bankworld/systems/accountlife.ts#registerAccountLife',
    { placeId: NY, years: 4, daily: forgotten }, { placeId: NY, years: 4, daily: both(forgotten, claim) },
    ['heldByState'], ['worth', 'inCurrent']),
  // French law has the bank offer a loan for an account past its limit three months (lending.ts frenchOverrun): taken,
  // the overrun is cleared into a loan at its rate, before the bank's notice to close the account runs out.
  P('overrun-loan', 'bank.take_overrun_loan', 'In Paris, take the loan the bank offers for the overrun', 'src/engine/bankworld/systems/lending.ts#frenchOverrun',
    { placeId: PARIS, takeJobs: false, daily: overrun }, { placeId: PARIS, takeJobs: false, daily: both(overrun, takeLoan) },
    ['loans'], ['overdrawnBy', 'inCollections', 'worth']),
];
