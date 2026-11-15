// The credit card's own commands (1221's bank, src/engine/bankworld): locking, reporting, paying, autopay, the limit,
// the statement day, money transfers, plans, rewards, closing and a credit sent back. Every career here takes a card on
// its first day and makes it how it pays, and buys a camera on the tenth (bank.ts), so the card carries a balance; the
// variant does one thing more. Read from the bank's own ledger, in its money (a London career's pounds).
import type { Probe } from '../probe';
import { bank, bankMeasures, both, buysCamera, first, once, walletMeasures } from './bank';
import { bankSim } from '../../../src/engine/bankworld';
import { stateOf } from '../../../src/engine/bankworld/systems/credit';
import type { GameState } from '../../../src/engine/types';
import { buyGear } from '../../../src/engine/equipment';

/** A card on the first day, and every purchase on it. */
const withCard = first((s) => { bank(s, 'card.apply'); bank(s, 'bank.set_payments', { everyday: 'credit' }); });
const card = (s: GameState) => bankSim(s.bank!).ledger.accountsOf(bankSim(s.bank!).universe.playerId).find((a) => a.kind === 'credit_card' && !a.closedAt);
/** From day `n` on, once it is allowed. */
const from = (n: number, fn: (s: GameState) => void) => { const f = once(fn); return (s: GameState, day: number) => { if (day >= n) f(s); }; };
const BASE = both(withCard, buysCamera);
const measure = (s: GameState) => {
  const sim = bankSim(s.bank!);
  const c = card(s);
  const st = c && sim.player.credit ? stateOf(sim.player, c) : undefined;
  return {
    ...bankMeasures(s), ...walletMeasures(s),
    limit: (c?.creditLimit ?? 0) / 100,
    cardOwed: c ? Math.max(0, -c.balance) / 100 : 0,
    cardCredit: c ? Math.max(0, c.balance) / 100 : 0,
    cardsOpen: sim.ledger.accountsOf(sim.universe.playerId).filter((a) => a.kind === 'credit_card' && !a.closedAt).length,
    plans: (st?.plans ?? []).length,
    transfers: (st?.transfers ?? []).length,
    statementDay: st?.statementDay ?? 0,
    rewardsLeft: (st?.rewards ?? 0) / 100,
    // A money transfer, read from the ledger: what it moved from the card into the current account.
    transferredIn: sim.universe.transactions.filter((t) => t.category === 'card-transfer').reduce((a, t) => a + t.postings.filter((p) => p.amount > 0).reduce((b, p) => b + p.amount, 0), 0) / 100,
  };
};
/** Autopay set to the minimum on the second day: the card carries a balance, and interest, from one statement to the next. */
const MIN = both(BASE, (s, day) => { if (day === 1) bank(s, 'finance.set_autopay', { mode: 'minimum' }); });
/** A second purchase on the hundredth day, after anything done to the card. */
const later = (s: GameState, day: number) => { if (day === 100) try { buyGear(s, 'bmpcc-4k'); } catch { /* not sold */ } };
const probe = (id: string, command: string, decision: string, act: (s: GameState, day: number) => void, bites: string[], downstream: string[], reads: string,
  opts: { base?: (s: GameState, day: number) => void; placeId?: string } = {}): Probe => ({
  id, features: [`bank:${command}`], decision, reads: [reads],
  base: { daily: opts.base ?? BASE, ...(opts.placeId ? { placeId: opts.placeId } : {}) }, variant: { daily: both(opts.base ?? BASE, act), ...(opts.placeId ? { placeId: opts.placeId } : {}) }, measure, bites, downstream,
});
/** NatWest's card, which offers money transfers, applied for beside the current account at Barclays. */
const NATWEST = both(first((s) => { bank(s, 'card.apply', { bankId: 'gb-natwest' }); bank(s, 'bank.set_payments', { everyday: 'credit' }); }), buysCamera);
/** A New York career: Chase's card, which has payment plans and rewards. */
const NY = 'us-new-york';
/** A thousand more than is owed paid onto the card on the seventeenth day: a credit on it. */
const OVERPAY = (s: GameState, day: number) => { if (day === 17) { const c = card(s)!; bank(s, 'finance.pay_card', { amount: Math.max(0, -c.balance) + 100_000 }); } };

export const PROBES: Probe[] = [
  probe('card-lock', 'card.lock', 'Lock the credit card before the camera is bought',
    from(5, (s) => { bank(s, 'card.lock', { which: 'credit', locked: true }); }), ['onCard'], ['cardOwed', 'cardPaid', 'interestOut'], 'src/engine/bankworld/systems/security.ts#registerSecurity'),
  probe('card-report', 'card.report', 'Report the credit card lost before the camera is bought',
    from(5, (s) => { bank(s, 'card.report', { which: 'credit', why: 'lost' }); }), ['onCard'], ['cardOwed', 'cardPaid', 'interestOut'], 'src/engine/bankworld/systems/security.ts#registerSecurity'),
  probe('card-limit-down', 'card.request_limit', 'Lower the card limit below the camera before buying it',
    from(5, (s) => { bank(s, 'card.request_limit', { limit: 50_000 }); }), ['limit'], ['cardPaid'], 'src/engine/bankworld/systems/cardlife.ts#registerCardLife'),
  probe('card-pay-full', 'finance.pay_card', 'Pay the card off in full the week after the camera',
    from(17, (s) => { bank(s, 'finance.pay_card', { amount: 'full' }); }), ['cardPaid'], ['interestOut', 'worth'], 'src/engine/bankworld/systems/credit.ts#payCard', { base: MIN }),
  probe('card-autopay-minimum', 'finance.set_autopay', 'Have autopay pay only the minimum rather than the whole statement',
    from(1, (s) => { bank(s, 'finance.set_autopay', { mode: 'minimum' }); }), ['cardPaid'], ['interestOut', 'worth'], 'src/engine/bankworld/systems/credit.ts#registerCredit'),
  probe('card-statement-day', 'card.set_statement_day', 'Move the statement to the 28th',
    from(12, (s) => { bank(s, 'card.set_statement_day', { day: 28 }); }), ['statementDay'], ['interestOut', 'cardPaid'], 'src/engine/bankworld/systems/cardlife.ts#registerCardLife', { base: MIN }),
  probe('card-money-transfer', 'card.money_transfer', 'Move a thousand from the card into the current account',
    from(12, (s) => { bank(s, 'card.money_transfer', { amount: 100_000 }); }), ['transferredIn'], ['bankFees', 'interestOut', 'worth'], 'src/engine/bankworld/systems/cardoffers.ts#registerCardOffers', { base: NATWEST }),
  probe('card-plan', 'card.plan', "Put the camera's cost into a payment plan",
    from(12, (s) => { const c = card(s)!; const owed = Math.max(0, -c.balance); for (const m of [3, 6, 12, 24]) { try { bank(s, 'card.plan', { amount: owed, months: m }); return; } catch { /* another length */ } } throw new Error('no plan'); }),
    // A plan in force is gone once paid off; what it leaves is its own interest instead of the card's, and the payments.
    ['interestOut'], ['cardPaid', 'worth'], 'src/engine/bankworld/systems/cardoffers.ts#registerCardOffers', { base: MIN, placeId: NY }),
  probe('card-redeem', 'card.redeem_rewards', 'Redeem the card\'s rewards once there are any',
    from(40, (s) => { bank(s, 'card.redeem_rewards'); }), ['rewardsLeft'], ['worth', 'money'], 'src/engine/bankworld/systems/cardoffers.ts#registerCardOffers', { placeId: NY }),
  probe('card-close', 'card.close', 'Close the card once it is paid off',
    from(60, (s) => { const c = card(s); if (!c || c.balance < 0) throw new Error('owes'); bank(s, 'card.close'); }), ['cardsOpen', 'onCard'], ['cardPaid', 'worth'], 'src/engine/bankworld/systems/cardlife.ts#registerCardLife', { base: both(BASE, later) }),
  probe('card-refund', 'card.refund_credit', 'Ask for a thousand overpaid on the card back',
    from(18, (s) => { bank(s, 'card.refund_credit'); }), ['cardCredit'], ['money', 'worth'], 'src/engine/bankworld/systems/credit.ts#refundCredit', { base: both(BASE, OVERPAY) }),
];
