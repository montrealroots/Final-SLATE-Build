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
/** A Citi current account (Citi moves a compromised account to a new number), funded and made the everyday one. */
const CITI = 'us-citi';
const citi = (s: GameState) => sim(s).ledger.accountsOf(sim(s).universe.playerId).find((a) => a.kind === 'checking' && a.bankId === CITI && !a.closedAt);
const atCiti = both(first((s) => { bank(s, 'bank.open_current', { bankId: CITI }); }),
  soon((s) => { const a = citi(s); if (!a) throw new Error('not open'); bank(s, 'bank.transfer', { fromId: primary(s), toId: a.id, amount: 1_000_000 }); }),
  ((made) => (s: GameState, d: number) => { if (d >= 12) made(s); })(once((x: GameState) => { const a = citi(x); if (!a || a.balance <= 0) throw new Error('not yet'); bank(x, 'bank.set_primary', { accountId: a.id }); })));
/** A labelled fixture: on `day`, somebody tries the account's number for a debit. */
const tryNumber = (day: number) => (s: GameState, d: number) => { if (d === day) { advanceBankWorld(s.bank!, s.now); attemptOnNumber(sim(s), sim(s).player, { size: 0.5 }); } };

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
    { placeId: NY, creation: AMERICAN, daily: both(atCiti, stranger(20), tryNumber(40)) }, { placeId: NY, creation: AMERICAN, daily: both(atCiti, stranger(20), (s: GameState, d: number) => { if (d === 25) try { bank(s, 'bank.new_number'); } catch { /* not offered */ } }, tryNumber(40)) },
    ['takenByNumber'], ['fraudCarried', 'worth']),
];
