// More of the bank (1221's, src/engine/bankworld): round-ups into savings, a passport applied for through Your Papers, a
// US card allowed over its limit, and a term deposit's interest taken while it runs. Read from the bank's own ledger.
import type { Probe } from '../probe';
import { bank, bankMeasures, both, buysCamera, first, once, walletMeasures } from './bank';
import { bankSim } from '../../../src/engine/bankworld';
import type { GameState } from '../../../src/engine/types';

const sim = (s: GameState) => bankSim(s.bank!);
const mine = (s: GameState) => sim(s).ledger.accountsOf(sim(s).universe.playerId).filter((a) => !a.nominal && !a.closedAt);
const primary = (s: GameState) => sim(s).player.primaryAccountId!;
const from = (n: number, fn: (s: GameState) => void) => { const f = once(fn); return (s: GameState, day: number) => { if (day >= n) f(s); }; };
const NATWEST = 'gb-natwest';
const TORONTO = 'ca-toronto';
const natwestCurrent = (s: GameState) => mine(s).find((x) => x.kind === 'checking' && x.bankId === NATWEST);
/** A NatWest current account, funded and made primary, with savings there. */
const atNatwest = both(first((s) => { bank(s, 'bank.open_current', { bankId: NATWEST }); }),
  from(1, (s) => { const a = natwestCurrent(s); if (!a) throw new Error('not open'); bank(s, 'bank.transfer', { fromId: primary(s), toId: a.id, amount: 1_000_000 }); }),
  from(12, (s) => { const a = natwestCurrent(s); if (!a || a.balance <= 0) throw new Error('not yet'); bank(s, 'bank.set_primary', { accountId: a.id }); }),
  from(13, (s) => { if (!mine(s).some((a) => a.kind === 'savings' && a.bankId === NATWEST)) bank(s, 'bank.open_savings', { bankId: NATWEST }); }));
/** The camera bought on the twentieth day. */
const later = (s: GameState, day: number) => buysCamera(s, day - 10);
/** A term deposit of a hundred thousand at the home bank, on the eighth day. */
const homeTerm = from(8, (s) => { bank(s, 'bank.open_term', { amount: 10_000_000 }); });
const measure = (s: GameState) => ({
  ...bankMeasures(s), ...walletMeasures(s),
  savingsHeld: mine(s).filter((a) => a.kind === 'savings').reduce((x, a) => x + a.balance, 0) / 100,
  passports: ((sim(s).player as unknown as { documents?: { kind: string }[] }).documents ?? []).filter((d) => d.kind === 'passport').length,
  termHeld: mine(s).filter((a) => a.category === 'term').reduce((x, a) => x + a.balance, 0) / 100,
  inCurrent: mine(s).filter((a) => a.kind === 'checking').reduce((x, a) => x + a.balance, 0) / 100,
  // How much of what was bought went on a credit card.
  onCardAmount: sim(s).universe.transactions.filter((t) => /^slate:(equipment|papers)#/.test(t.category ?? '')).reduce((x, t) => x - t.postings.filter((p) => sim(s).universe.accounts[p.accountId]?.kind === 'credit_card').reduce((y, p) => y + p.amount, 0), 0) / 100,
});
const P = (id: string, command: string, decision: string, reads: string, base: Probe['base'], variant: Probe['variant'], bites: string[], downstream: string[]): Probe =>
  ({ id, features: [`bank:${command}`], decision, reads: [reads], base, variant, measure, bites, downstream });

/** A New York career's card, its limit lowered under the camera's price before it is bought. */
const NY = 'us-new-york';
const lowCard = both(first((s) => { bank(s, 'card.apply'); bank(s, 'bank.set_payments', { everyday: 'credit' }); }), from(8, (s) => { bank(s, 'card.request_limit', { limit: 50_000 }); }), buysCamera);
export const PROBES: Probe[] = [
  P('round-ups', 'bank.set_round_ups', 'Round each card purchase up into savings', 'src/engine/bankworld/systems/roundups.ts#setRoundUps',
    // NatWest rounds up (Barclays doesn't): its current account made primary, savings there, the camera on its debit card.
    { daily: both(atNatwest, later) }, { daily: both(atNatwest, from(17, (s) => { bank(s, 'bank.set_round_ups', { on: true }); }), later) },
    ['savingsHeld'], ['inCurrent', 'interestIn']),
  P('bank-passport', 'documents.apply_passport', 'Apply for a passport through Your Papers', 'src/engine/bankworld/systems/documents.ts#registerDocuments',
    {}, { daily: from(5, (s) => { bank(s, 'documents.apply_passport', {}); }) },
    ['passports'], ['worth', 'inCurrent']),
  P('card-over-limit', 'card.set_over_limit', 'In New York, let the card go over its limit before buying the camera', 'src/engine/bankworld/systems/cardlife.ts#registerCardLife',
    { placeId: NY, daily: lowCard }, { placeId: NY, daily: both(lowCard, from(9, (s) => { bank(s, 'card.set_over_limit', { on: true }); })) },
    // Over the limit the purchase goes through and its fee is charged and paid; under it, it is declined on the card.
    ['onCardAmount'], ['cardPaid']),
  P('term-interest', 'bank.take_term_interest', "Take the term deposit's interest while it runs, three months in", 'src/engine/bankworld/systems/accountlife.ts#registerAccountLife',
    { placeId: TORONTO, daily: homeTerm }, { placeId: TORONTO, daily: both(homeTerm, from(100, (s) => { const t = mine(s).find((a) => a.category === 'term'); if (!t) throw new Error('none'); bank(s, 'bank.take_term_interest', { accountId: t.id }); })) },
    ['termHeld'], ['inCurrent', 'worth']),
];
