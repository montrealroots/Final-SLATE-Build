/**
 * SLATE — the credit card, on the bank's screen.
 *
 * The card is the bank's product (`content/cards.ts`), so it is shown where
 * the bank's accounts are: its name, what it owes and what's left of the
 * limit, the rate the record buys and how the bank prices it, the yearly
 * fee, the statement and the due date, the minimum and the late fee, and
 * the law's caps. Paying it and the autopay are here. Until 2026-09-26 the
 * card was run from the Money panel on Home and this screen didn't show it.
 * From 2026-10-20 (brief 17) the next payment and what the card costs come
 * first, the standing terms fold under The Card’s Terms, and a card applied
 * for says its rate, yearly fee and limit before Apply For This Card.
 *
 * A card issued by a bank the player has since left stays with that bank, as
 * a real one does. Every card held is here, each in its own panel, the
 * everyday one first; until 2026-09-28 a person held one card.
 */

import { useGame, useWorld } from '../../app/game-context';
import { Panel, Fine, WhyNot } from '../components/primitives';
import { Gated } from '../guide/Guide';
import { formatMoney, saveCurrency, centsFromTyped } from '../../../../engine/bankworld/core/money';
import { dateKey, formatDate, formatDateKey, zonedParts } from '../../../../engine/bankworld/core/time';
import { LookRegion, Open, at } from '../looks';
import { said } from '../looks/words';
import { autopayAsk, cardRoom, cardsOf, cardTerms, DUE_KIND, stateOf, statementDayOf, statementDayRefusal, US_LATE, usCard, usDueDay, type CardTerm } from '../../../../engine/bankworld/systems/credit';
import { bankById, banksIn } from '../../../../engine/bankworld/content/banks';
import type { Account } from '../../../../engine/bankworld/core/ledger';
import { transferRefusal } from '../../../../engine/bankworld/systems/cardoffers';
import { APPROVE_FROM, askRefusal, cardOffer, limitFor } from '../../../../engine/bankworld/systems/cardlife';
import { useState } from 'react';
import { inTheBank } from '../../../../engine/bankworld/systems/spending';
import { PENDING } from '../../../../engine/bankworld/content/pending';
import { FIRST_LATE_FEE, US_SAFE_HARBOR } from '../../../../engine/bankworld/content/latefees';
import { bankOf, inSaveMoney } from '../../../../engine/bankworld/systems/banking';
import { CARDS } from '../../../../engine/bankworld/content/cards';

/**
 * A card's source and the day its terms are from, as the game writes a date. Said once where the source already ends on
 * that day: until 2026-10-17 (brief 14) 45 cards read "…/terms/, 2026-09-26, 2026-09-26.", the research's day and then
 * the same day again. Where the source ends on another day, the terms' day is named as such: until the same day 40 cards
 * read "…, September 26, 2026, April 10, 2026." with nothing saying which day was which (the data pass's record).
 */
const sourceAndDay = (source: string, asOf: string | undefined): string => {
  const day = asOf ? formatDateKey(asOf) : '';
  if (!day || source.endsWith(`, ${day}`)) return source;
  return /, [A-Z][a-z]+ \d{1,2}, \d{4}$/.test(source) ? `${source}. Terms as of ${day}` : `${source}, ${day}`;
};

/** A fee to the cent where it has cents, and in whole units where it hasn't: "€39.90", "$95". */
const exact = (cents: number, cur: string) => formatMoney(cents, cur, { cents: cents % 100 !== 0 });

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pct = (rate: number) => `${Number((rate * 100).toFixed(2))}%`;
const TERM_WORDS: Record<CardTerm, string> = {
  card: 'the card', rate: 'the rate', minimum: 'the minimum payment', lateFee: 'the late fee', annualFee: 'the yearly fee', returnedPaymentFee: 'the returned payment fee', cashAdvance: 'the cash advance’s terms',
};

export function BankCard({ bankId }: { bankId: string }) {
  const cards = useWorld((s) => cardsOf(s, s.player));
  const credit = useWorld((s) => s.player.credit);
  if (!credit) return null;
  // Every card held, the everyday one first, and then applying for another.
  return (
    <>
      {cards.map((card, i) => <CardPanel key={card.id} card={card} bankId={bankId} everyday={i === 0} many={cards.length > 1} />)}
      <CardApplication held={cards} />
    </>
  );
}

/**
 * Applying for a card (C1, C31): any bank in the country that issues one, as
 * in life, one card from each; with a balance moved onto it from a card held
 * at another bank where the new card takes one. Until 2026-09-28 only the
 * bank the current account was with, and only with no card held.
 */
function CardApplication({ held }: { held: Account[] }) {
  const { sim, run } = useGame();
  const [bankWanted, setBankWanted] = useState('');
  const [fromWanted, setFromWanted] = useState('');
  const credit = useWorld((s) => s.player.credit)!;
  const cur = saveCurrency(sim.universe);
  const money = (cents: number) => formatMoney(cents, cur, { cents: false });
  const home = bankOf(sim, sim.player);
  const issuers = (home ? banksIn(home.iso) : []).filter((b) => {
    const product = CARDS[b.id];
    return product !== undefined && !('none' in product) && !held.some((c) => c.bankId === b.id);
  });
  // Least important first: the bank the current account is with last.
  const ordered = [...issuers.filter((b) => b.id !== home?.id).reverse(), ...issuers.filter((b) => b.id === home?.id)];
  const chosen = ordered.find((b) => b.id === bankWanted) ?? ordered.at(-1);
  const product = chosen ? CARDS[chosen.id] : undefined;
  const offer = product && !('none' in product) ? product.transfer : undefined;
  const sources = offer ? held.filter((c) => c.bankId !== chosen?.id && c.balance < 0) : [];
  const from = sources.find((c) => c.id === fromWanted);
  // Offered only where the bank would take it: until 2026-09-27 Apply showed for a transfer the command refused.
  const refused = from && chosen ? transferRefusal(sim, sim.player, chosen.id, limitFor(sim, credit.score), from.id) : undefined;
  const pending = credit.applied ? bankById(credit.applied.bankId) : undefined;
  const offered = chosen ? offerWords(sim, chosen, money) : [];
  return (
    <Panel title={held.length ? 'Another Card' : 'Credit Card'} subtitle={credit.applied ? 'On its way' : held.length ? `${held.length} held` : 'None held'} help="bank.card">
      {credit.applied
        ? <LookRegion><p className="small" style={{ margin: 0 }}>{pending ? <Open subject={at('bank', pending.id)}>{pending.name}</Open> : 'The bank'} approved a card with a {money(credit.applied.limit)} limit. It arrives <Open subject={at('day', dateKey(credit.applied.arrivesAt, sim.homeZone))}>{formatDate(credit.applied.arrivesAt, sim.zone)}</Open>.</p></LookRegion>
        : !chosen
          ? <p className="small" style={{ margin: 0 }}>{held.length ? 'You already have a card from every bank here that issues one.' : `${home?.name ?? 'Your bank'} doesn’t issue a credit card, and no other bank here does.`}</p>
          : (
            <div className="col gap-3">
              {/* What applying does, then what it asks and costs, then what a second card changes (from 2026-10-20, brief 16,
                  section 7: until then one paragraph of up to five sentences). */}
              <p className="small" style={{ margin: 0 }}>You can apply to any bank here, not only yours. If it approves you, the card arrives a week later.</p>
              {/* Who a bank approves, as `card.apply` decides it (from 2026-10-20, brief 17): until then “The bank checks your
                  credit record and whether you have income or money to repay from.”, with no score, where income alone
                  approves nobody and the score is judged after the application's points. */}
              <p className="small" style={{ margin: 0 }}>In the game a bank approves a credit score of {APPROVE_FROM} or more, counted after the few points applying takes off it, with money in the bank to repay from and no debt in collections. Applying takes those points whether or not you’re approved.</p>
              {held.length > 0 && <p className="small" style={{ margin: 0 }}>Credit bureaus look at how much of all your cards’ limits you use, taken together.</p>}
              <div className="field-row">
                <div className="field">
                  <label htmlFor="card-apply-bank">Bank</label>
                  <select id="card-apply-bank" value={chosen.id} onChange={(e) => { setBankWanted(e.target.value); setFromWanted(''); }}>
                    {ordered.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                {sources.length > 0 && (
                  <div className="field">
                    <label htmlFor="card-apply-from">Move A Balance From</label>
                    <select id="card-apply-from" value={from?.id ?? ''} onChange={(e) => setFromWanted(e.target.value)}>
                      <option value="">Nothing</option>
                      {sources.map((c) => <option key={c.id} value={c.id}>{c.name}, {money(-c.balance)}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {/* The card applied for, its rate, its yearly fee and the limit it would open with, before the button
                  (from 2026-10-20, brief 17, section 8): until then nothing of it showed until it arrived. */}
              {offered.map((line) => <p key={line} className="small" style={{ margin: 0 }} data-card-offer="">{line}</p>)}
              <div>
                <Gated feature="card.apply" className="btn btn-sm" disabled={Boolean(refused)} onClick={() => run('card.apply', { bankId: chosen.id, ...(from ? { transfer: true, fromId: from.id } : {}) })}>
                  {from ? 'Apply And Move The Balance' : 'Apply For This Card'}
                </Gated>
              </div>
              {from && offer && (
                <p className="small" style={{ margin: 0 }}>
                  When the new card arrives, the {from.name}’s balance moves onto it {offer.feeShare ? `for a fee of ${pct(offer.feeShare)} of the balance` : 'with no fee'}{offer.feeMin ? ` (at least ${money(inSaveMoney(sim, offer.feeMin, chosen.currency))})` : ''}, and it’s charged {offer.introMonths !== undefined ? `${pct(offer.introApr ?? 0)} for ${offer.introMonths + ' months'}, then ` : ''}{offer.apr !== undefined ? pct(offer.apr) : 'the card’s own rate'}. The old card can’t be used for anything new while it waits, and it closes once the balance has moved.
                </p>
              )}
              {refused && <p className="small muted" style={{ margin: 0 }}>{refused}</p>}
              <Fine>The credit score a bank approves at, the limit a card opens with and the week it takes to arrive are estimated: no bank publishes them.</Fine>
            </div>
          )}
    </Panel>
  );
}

/**
 * The card applied for, as it would open today (`cardOffer`): its name and rate, its yearly fee, and the limit your
 * credit score opens it with, said before Apply For This Card (from 2026-10-20, brief 17, section 8).
 */
function offerWords(sim: import('../../../../engine/bankworld/core/simulation').Simulation, bank: NonNullable<ReturnType<typeof bankById>>, money: (cents: number) => string): string[] {
  const offer = cardOffer(sim, sim.player, bank.id);
  if (!offer) return [];
  const { terms, limit } = offer;
  const product = CARDS[bank.id];
  const months = product && !('none' in product) ? product.introMonths : undefined;
  const intro = months && terms.introApr !== undefined ? ` It charges ${pct(terms.introApr)} on purchases for its first ${months} months.` : '';
  const rate = terms.kind === 'charge'
    ? `${terms.name} is a charge card: ${bank.name} takes the whole statement from your checking account each month, so it never carries a balance.`
    : terms.aprFrom !== undefined && terms.aprTo !== undefined
      ? `${terms.name}: ${bank.name} sets its rate between ${pct(terms.aprFrom)} and ${pct(terms.aprTo)} from your credit record when the card opens, about ${pct(terms.priced)} with your record today.${intro}`
      : `${terms.name}: ${pct(terms.priced)} a year on any balance you carry.${intro}`;
  // As the statement charges it: in a US card's first year, its fees held to a quarter of the limit (Reg Z §1026.52(a)).
  const firstYear = bank.iso === 'US' ? Math.min(terms.annualFee, Math.round(limit * 0.25)) : terms.annualFee;
  const cur = saveCurrency(sim.universe);
  const fee = terms.annualFee > 0
    ? `Its yearly fee is ${exact(terms.annualFee, cur)}${firstYear < terms.annualFee ? `, held to ${exact(firstYear, cur)} in its first year by the law’s cap on a new card’s fees` : ''}.`
    : terms.estimated.includes('annualFee') ? 'No yearly fee was found for it, so none is charged in the game.' : 'It has no yearly fee.';
  return [rate, `${fee} If ${bank.name} approves you, the card’s limit is ${money(limit)}, set by your credit score.`];
}

function CardPanel({ card, bankId, everyday, many }: { card: Account; bankId: string; everyday: boolean; many: boolean }) {
  const { sim, run, toast } = useGame();
  const person = useWorld((s) => s.player);
  const [limitWanted, setLimitWanted] = useState('');
  const [dayWanted, setDayWanted] = useState(0);
  const cur = saveCurrency(sim.universe);
  const money = (cents: number) => formatMoney(cents, cur, { cents: false });
  const credit = useWorld((s) => s.player.credit)!;
  const state = stateOf(person, card);
  // Why a higher limit can't be asked for yet (from 2026-10-21, brief 20's D2): six months from the card's opening and
  // from the last ask or raise, said under the button, as the statement day's own wait is.
  const askWait = useWorld((s) => askRefusal(s, card, stateOf(s.player, card)));
  const payable = useWorld((s) => Math.min(Math.max(0, -card.balance), inTheBank(s, s.player)));
  // Its own due date, or, the everyday card's, one from before cards were named.
  const due = useWorld((s) => s.timeline.pending().find((i) => i.kind === DUE_KIND && i.payload.personId === s.player.id
    && (i.payload.accountId === card.id || (i.payload.accountId === undefined && everyday))));
  const bankName = bankById(card.bankId ?? bankId)?.name ?? 'The bank';
  const terms = cardTerms(sim, card, credit.score);
  const bankIso = bankById(card.bankId ?? '')?.iso;
  const owed = Math.max(0, -card.balance);
  const limit = card.creditLimit ?? 0;
  const charge = terms.kind === 'charge';
  const opened = MONTH_NAMES[zonedParts(card.openedAt, sim.zone).month - 1];

  // What matters now first, then what the card costs, then its standing terms behind The Card’s Terms (from 2026-10-20,
  // brief 17, section 8). Until then nine lines ran in the order the terms were written, the rate and how the bank prices
  // a new card first, and the next due date, a suspension or a plan came sixth to tenth, below them.
  const now: string[] = [];
  const costs: string[] = [];
  const rules: string[] = [];
  const plan = state.hardship;
  // The payment the next due date judges (`autopayAsk`): the minimum, the plan’s payment, or a charge card’s whole statement.
  const ask = state.statementBalance > 0 ? autopayAsk(sim, person, card) : undefined;
  if (due && ask) {
    const statement = state.statementBalance;
    const paid = state.paidSinceStatement;
    // What's past due is in the minimum payment due, and said (from 2026-10-22, brief 21).
    const least = ask.due >= statement ? `The whole ${money(statement)} statement is due then` : `The statement is ${money(statement)}, and ${plan ? 'the plan’s payment' : 'the minimum payment'} is ${money(ask.due)}${ask.pastDue > 0 ? `, ${money(ask.pastDue)} of it past due` : ''}`;
    const covered = ask.due < statement && paid >= ask.due ? ` You’ve paid ${money(paid)} since the statement, which covers it.` : paid > 0 && paid < ask.due ? ` You’ve paid ${money(paid)} of it since the statement.` : '';
    now.push(`The next payment is due ${formatDate(due.at, sim.zone)}. ${least}.${covered}`);
  }
  // What lifts a suspension, as the due date and the statement lift it (from 2026-10-20, brief 17): until then “It works
  // again once you make a payment on time.”
  // A US card is charged off by its days past due, the day named (from 2026-10-22, brief 21): until then every card said
  // "Miss six in a row", which a US card's charge-off no longer counts.
  const oldest = usCard(card) ? state.pastDue?.[0] : undefined;
  const offWords = oldest
    ? ` The oldest minimum still short was due ${formatDate(oldest.at, sim.zone)}. Pay it before ${formatDate(oldest.at + US_LATE.chargeOff * 86_400_000, sim.zone)}, ${US_LATE.chargeOff} days after it was due, or what’s owed is charged off to collections.`
    : usCard(card) ? ` If a minimum payment goes unpaid for ${US_LATE.chargeOff} days after its due date, what’s owed is charged off to collections.` : ' Miss six in a row, and what’s owed is charged off to collections.';
  if (state.suspended === 'late') now.push(`Suspended: you’ve missed ${said(state.missed ?? 0, 'payment')} in a row. It works again once you pay at least the minimum by a due date, or pay the card off.${offWords}`);
  // Until 2026-10-13 this said the card couldn’t be used until it was cleared. A plan ends, and its suspension with it,
  // only at the first statement or due date after it’s paid off (`systems/credit.ts`), as the guide says. This statement’s
  // payment is the next payment’s line, above: until 2026-10-20 (brief 17) the plan’s line said it again.
  if (plan) now.push(`${state.suspended === 'persistent' ? `After three years of persistent debt, the bank put it on a payment plan on ${formatDate(plan.since, sim.zone)}` : `It’s been on a payment plan since ${formatDate(plan.since, sim.zone)}`}. There’s no interest, and each statement asks for the plan’s ${money(plan.payment)} instead of the minimum. You can’t use the card until the plan ends, at the first statement or due date after it’s paid off.`);
  // Canada's rule where it runs (`CANADA_PENALTY`), the US's otherwise.
  const canadian = bankIso === 'CA';
  if (terms.penaltyApr && terms.penaltyInForce) now.push(`The penalty rate, ${pct(terms.penaltyApr)}, ${state.penalty ? `has applied since ${formatDate(state.penalty.noticeAt, sim.zone)}` : 'applies now'}. ${canadian ? 'Twelve' : 'Six'} payments on time in a row take it off.`);
  // Credit a payment from another bank freed, held while it clears (`PENDING.paymentHoldDays`).
  const holds = state.paymentHolds ?? [];
  if (holds.length) now.push(`${money(holds.reduce((sum, one) => sum + one.amount, 0))} of the credit your payment freed up is on hold until ${formatDate(Math.max(...holds.map((one) => one.until)), sim.zone)}, while the payment clears from another bank.${card.bankId && PENDING[card.bankId]?.paymentHoldWords ? ` ${PENDING[card.bankId]!.paymentHoldWords}` : ''}`);
  if (card.balance > 0) now.push(`The card holds ${money(card.balance)} of your money.${bankIso === 'US' ? ' If it’s still there after six months, the bank sends it back to you.' : ''}`);
  if (bankIso === 'GB' && state.persistentNoticeAt !== undefined && !state.hardship) {
    now.push(`Persistent debt: over eighteen months, more of what you paid went to interest and fees than to the balance, and the bank wrote to you about it on ${formatDate(state.persistentNoticeAt, sim.zone)}. If that’s still so at thirty-six months, the bank freezes the interest, sets a payment of ${money(Math.ceil(owed / 48 / 100) * 100)} a month, and suspends the card.`);
  }
  if (state.closing !== undefined) now.push('It’s closed to new spending. You keep paying off what’s owed as before, and then the account closes.');
  if (many) now.push(everyday ? 'This is your everyday card: the day’s spending goes on it.' : 'The day’s spending goes on your everyday card, not this one, unless you make this the everyday card.');
  if (state.overLimitOptIn) now.push('You’ve opted in to going over the limit: a purchase can take it up to a tenth over, and this card charges nothing for it.');

  if (charge) costs.push(`This is a charge card: ${terms.issuer ?? 'the bank'} takes the whole statement from your checking account each month. It can’t carry a balance, and it charges ${pct(terms.apr)} a year on anything the account can’t cover.`);
  // As the engine takes it, by country: until 2026-09-27 every card read as America's rule of the day before.
  // On a hardship plan a statement asks the plan’s payment in the minimum’s place (`autopayAsk`); the card’s own rule is
  // what it asks once the plan ends. Until 2026-10-13 the late fee’s line said “short of the minimum”, where the due date
  // judges the plan’s payment; found by that day’s guide audit.
  const asks = plan ? 'the plan’s payment' : 'the minimum';
  const short = plan || !charge ? asks : 'the statement';
  if (bankIso === 'US') {
    const asked = ask?.due;
    // As the due date charges it (`systems/credit.ts`): the bank's fee, its lower first fee where it has one, each held to
    // the safe harbor, and never over the minimum. Until 2026-10-10 this said the bank's flat fee, which the harbor cut.
    const tier = card.bankId ? FIRST_LATE_FEE[card.bankId] : undefined;
    const first = Math.min(tier ? Math.min(terms.lateFee, inSaveMoney(sim, tier.first, 'USD')) : terms.lateFee, inSaveMoney(sim, US_SAFE_HARBOR.first, 'USD'));
    const again = Math.min(terms.lateFee, inSaveMoney(sim, US_SAFE_HARBOR.repeat, 'USD'));
    const capped = (fee: number) => money(asked !== undefined ? Math.min(fee, asked) : fee);
    costs.push(`Paying less than ${short} by the due date costs ${capped(first)} the first time, and ${capped(again)} if it happens again within ${tier?.withinPeriods ?? US_SAFE_HARBOR.withinPeriods} billing periods, but never more than ${asks} itself. If an autopay bounces and leaves the payment short, that fee is all you’re charged, with no returned payment fee on top. If it’s still short at the next due date, thirty days late, it goes on your credit record and the limit is cut.`);
  } else {
    const rule = terms.lateRule;
    const fee = rule ? `${rule.fixed ? `${money(rule.fixed)} and ` : ''}${pct(rule.share)} of ${rule.of === 'minimum' ? asks : rule.of === 'balance' ? 'the balance' : 'what went unpaid'}${rule.min !== undefined ? `, at least ${money(rule.min)}` : ''}${rule.max !== undefined ? `, at most ${money(rule.max)}` : ''}${rule.notOverMinimum ? `, never more than ${asks}` : ''}` : money(terms.lateFee);
    costs.push(`Paying less than ${short} by the due date costs ${fee}. It also goes on your credit record, and the limit is cut.${bankIso === 'GB' ? ` ${bankName} then takes what was missed from your other accounts with it.` : ''}`);
  }
  // The penalty rule as the game counts it. From 2026-10-20 (brief 17) until 2026-10-22 (brief 21) it said “Miss two
  // payments in a row”, the second missed due date then bringing it; from brief 21 a US card's minimum more than 60 days
  // late does (Reg Z §1026.55(b)(4)), 45 days after the bank's notice.
  if (terms.penaltyApr && !terms.penaltyInForce) costs.push(canadian ? `Miss two minimum payments in twelve months, and the rate goes up to ${pct(terms.penaltyApr)} at once, for at least twelve payments on time.` : `A minimum payment more than 60 days late raises the rate to ${pct(terms.penaltyApr)}, 45 days after the bank’s notice, until six minimum payments in a row are on time.`);
  // A fee the research didn't find isn't a fee of none; until 2026-09-26 the Barclaycard said it had none.
  // In a US card's first year the law holds its fees to a quarter of the limit (Reg Z §1026.52(a)), as the statement charges it.
  const firstYearFee = bankIso === 'US' && sim.now - card.openedAt < 365 * 86_400_000 ? Math.min(terms.annualFee, Math.round(limit * 0.25)) : undefined;
  // To the cent where it has cents (from 2026-10-20, brief 17): until then Commerzbank's €39.90 read “€40”.
  costs.push(firstYearFee !== undefined && firstYearFee < terms.annualFee ? `The yearly fee is ${exact(firstYearFee, cur)} this first year, on your ${opened} statement, because the law limits a first year’s fees to a quarter of the credit limit. After that it’s ${exact(terms.annualFee, cur)} a year.` : terms.annualFee > 0 ? `The yearly fee is ${exact(terms.annualFee, cur)}, on your ${opened} statement.` : terms.estimated.includes('annualFee') ? 'No yearly fee was found for it, so none is charged in the game.' : 'No yearly fee.');

  const intro = terms.standardApr !== undefined ? ` during the introductory months, then ${pct(terms.standardApr)}` : '';
  if (!charge && terms.aprFrom !== undefined && terms.aprTo !== undefined) {
    // The rate the card was set at when it opened (`card.apr`, as `cardTerms` reads it), not today's: from 2026-10-17. Until
    // then this said "yours opened at" the rate charged today, which in the introductory months is 0%.
    // Your rate first, then how the bank prices a new card (from 2026-10-20, brief 16: until then one paragraph of four
    // sentences, the bank's range between the rate and when yours was set).
    rules.push(`${pct(terms.apr)} a year on any balance you carry${intro}. Yours was set at ${pct(card.apr ?? terms.priced)} when it opened, and the bank doesn’t reprice it.`);
    rules.push(`${terms.issuer} sets a new card’s rate between ${pct(terms.aprFrom)} and ${pct(terms.aprTo)} from your credit record when it opens. With your record today, a new card would get ${pct(terms.priced)}.`);
  } else if (!charge) {
    rules.push(`${pct(terms.apr)} a year on any balance you carry${intro}.`);
  }
  if (!charge) rules.push('Once a statement isn’t paid in full, interest builds up daily on what you owe, including the interest already added. Pay a statement in full, and new spending is charged no interest until the next one is due.');
  // The next due date is the first line now (from 2026-10-20, brief 17); until then it closed this one.
  // A US card's one day each month (`usDueDay`), from 2026-10-22 (brief 21): until then every card said its days after
  // each statement, which a US card's due date no longer is.
  const statementDay = statementDayOf(person, card);
  const usDue = usCard(card) ? usDueDay(statementDay, terms.graceDays) : undefined;
  const dueWords = usDue
    ? `on the ${usDue.day}${ordinal(usDue.day)} of ${usDue.next ? 'the next month' : 'the same month'}${terms.graceDays !== undefined ? `, at least ${terms.graceDays} days after each one` : ''}`
    : terms.graceDays !== undefined ? `${terms.graceDays} days after each one` : 'on the 15th of the next month';
  rules.push(`Statements come on the ${statementDay}${ordinal(statementDay)}, and payment is due ${dueWords}.`);
  // This statement’s minimum is the next payment’s line, above (from 2026-10-20, brief 17): until then each rule ended
  // “On this statement it’s …”.
  if (!charge) {
    if (terms.course) rules.push(`The minimum payment${plan ? ' once the plan ends' : ''} follows the revolving course: ${terms.course.shareByScore ? 'a share of the statement set by your credit grade' : terms.course.every ? `${money(inSaveMoney(sim, terms.course.pay ?? 0, bankById(card.bankId ?? '')!.currency))} for each ${money(inSaveMoney(sim, terms.course.every, bankById(card.bankId ?? '')!.currency))} owed` : `${money(inSaveMoney(sim, terms.course.pay ?? 0, bankById(card.bankId ?? '')!.currency))} of what’s owed`}${terms.minimumPlusInterest ? ' plus the month’s interest' : ''}.`);
    else rules.push(`The minimum payment${plan ? ' once the plan ends' : ''} is ${pct(terms.minimumShare)} of the statement${terms.minimumPlusInterest ? ' plus the month’s interest' : ''}${terms.minimumFloor > 0 ? `, or ${money(terms.minimumFloor)} if that’s more` : ''}${terms.minimumOfLimit ? `, and never under ${money(terms.minimumOfLimit)}, 1.25% of the limit, as Mexico’s central bank sets it` : ''}.`);
  }
  if (terms.capped) {
    const caps = [terms.capped.apr !== undefined ? `the rate at ${pct(terms.capped.apr)}` : '', terms.capped.lateFee !== undefined ? `the late fee at ${money(terms.capped.lateFee)}` : ''].filter(Boolean).join(' and ');
    // The law named in the source line, not as the sentence's subject (from brief 15, 2026-10-19): until then the subject
    // was the whole citation, three statutes long for Canada.
    rules.push(`The law here caps ${caps}, and the card is held to that. Source: ${terms.capped.law}; ${terms.capped.source}.`);
  }
  const listed = terms.estimated.map((one) => TERM_WORDS[one]);
  const estimated = [terms.estimated.includes('card')
    ? `${terms.issuer ?? 'The bank'}’s own card wasn’t found, so its terms are estimated from a typical American card.`
    : terms.estimated.length > 0
      ? `${(listed.length < 2 ? listed.join('') : `${listed.slice(0, -1).join(', ')} and ${listed.at(-1)}`).replace(/^./, (c) => c.toUpperCase())} ${terms.estimated.length === 1 ? 'is' : 'are'} estimated. The rest are ${terms.issuer}’s published terms.`
      : '', state.overLimitOptIn ? 'How far over the limit a bank lets a purchase go is estimated.' : ''].filter(Boolean).join(' ');

  return (
    <Panel title={terms.name} subtitle={<Open subject={at('account', card.id)}>{`${many && everyday ? 'The everyday card, ' : ''}···${card.last4 ?? ''}`}</Open>} look={at('account', card.id)} help="bank.card">
      <div className="col gap-3">
        <div className="grid grid-3">
          <div className="stat">
            <Open subject={at('account', card.id)}>
              <span className="stat-label">Owed</span>{' '}
              <span className={`stat-value mono ${owed > 0 ? 'negative' : ''}`}>{money(owed)}</span>
            </Open>
          </div>
          <div className="stat">
            <Open subject={at('account', card.id)}>
              <span className="stat-label">Left To Spend</span>{' '}
              {/* What a purchase can take, as the till asks it (`cardRoom`): until 2026-10-10 the limit less what's owed,
                  which showed room on a locked, suspended or closing card and left out held payments. */}
              <span className="stat-value mono">{money(cardRoom(person, card))}</span>{' '}
              <span className="stat-note">Of a {money(limit)} limit</span>
            </Open>
          </div>
          <div className="stat">
            <Open subject={at('account', card.id)}>
              <span className="stat-label">{charge ? 'Kind' : 'Rate'}</span>{' '}
              <span className="stat-value mono">{charge ? 'Charge' : pct(terms.apr)}</span>{' '}
              <span className="stat-note">{charge ? 'Paid in full each month' : 'A year, on a balance carried'}</span>
            </Open>
          </div>
        </div>
        {[...now, ...costs].map((line) => <p key={line} className="small" style={{ margin: 0 }}>{line}</p>)}
        <details className="small" data-card-terms="">
          <summary>The Card’s Terms</summary>
          {rules.map((line) => <p key={line} className="small" style={{ margin: 'var(--s2) 0 0' }}>{line}</p>)}
        </details>
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          <Gated feature="finance.pay_card" className="btn btn-sm" disabled={payable === 0} onClick={() => run('finance.pay_card', { amount: 'full', accountId: card.id })}>
            {payable < owed ? 'Pay What You Can' : 'Pay Card In Full'} ({money(payable)})
          </Gated>
          {card.balance > 0 && (
            <Gated feature="card.refund_credit" className="btn btn-sm btn-ghost" onClick={() => run('card.refund_credit', { accountId: card.id })}>Send The Credit To My Account</Gated>
          )}
          {many && !everyday && state.closing === undefined && (
            <Gated feature="card.set_everyday" className="btn btn-sm btn-ghost" onClick={() => run('card.set_everyday', { accountId: card.id })}>Make It The Everyday Card</Gated>
          )}
          {state.closing === undefined && (
            <Gated feature="card.close" className="btn btn-sm btn-ghost" onClick={() => run('card.close', { accountId: card.id })}>Close The Card</Gated>
          )}
          {!state.hardship && owed > 0 && (
            <Gated feature="card.request_hardship" className="btn btn-sm btn-ghost" onClick={() => run('card.request_hardship', { accountId: card.id })}>Ask For Help With Payments</Gated>
          )}
          {!charge && (
            <Gated
              feature="finance.set_autopay"
              className="btn btn-sm btn-ghost"
              onClick={() => run('finance.set_autopay', { mode: state.autopay === 'full' ? 'minimum' : 'full', accountId: card.id })}
            >
              Autopay: {state.autopay === 'full' ? 'The Whole Statement' : 'The Minimum'}
            </Gated>
          )}
        </div>
        <div className="field-row">
          <div className="field-act">
            <div className="field">
              <label htmlFor={`card-statement-day-${card.id}`}>Statement Day</label>
              <select id={`card-statement-day-${card.id}`} value={dayWanted || statementDayOf(person, card)} onChange={(e) => setDayWanted(Number(e.target.value))}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}{ordinal(d)}</option>)}
              </select>
            </div>
            <Gated feature="card.set_statement_day" className="btn btn-sm btn-ghost" disabled={!dayWanted || dayWanted === statementDayOf(person, card) || Boolean(statementDayRefusal(person, card))} onClick={() => {
              const answer = run('card.set_statement_day', { day: dayWanted, accountId: card.id });
              if (answer.ok) { toast(`Statements come on the ${dayWanted}${ordinal(dayWanted)} now, and the due date moves with them.`, 'positive'); setDayWanted(0); }
            }}>Change The Day</Gated>
            <WhyNot reasons={[['Change The Day', statementDayRefusal(person, card)]]} />
          </div>
          <div className="field-act">
            <div className="field">
              <label htmlFor={`card-limit-${card.id}`}>New Limit ({cur}), Now {money(limit)}</label>
              <input id={`card-limit-${card.id}`} type="text" inputMode="decimal" value={limitWanted} onChange={(e) => setLimitWanted(e.target.value)} />
            </div>
            <Gated feature="card.request_limit" className="btn btn-sm" disabled={!limitWanted} onClick={() => {
              const answer = run<{ limit: number; granted: boolean }>('card.request_limit', { limit: centsFromTyped(limitWanted), accountId: card.id });
              if (answer.ok && answer.value?.granted) { toast(`Your limit is now ${money(answer.value.limit)}.`, 'positive'); setLimitWanted(''); }
            }}>Ask For This Limit</Gated>
            <WhyNot reasons={[['Ask For A Higher Limit', askWait]]} />
          </div>
        </div>
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          <Gated feature="card.set_auto_raise" className="btn btn-sm btn-ghost" onClick={() => run('card.set_auto_raise', { on: Boolean(state.noAutoRaise), accountId: card.id })}>
            Raise My Limit Automatically: {state.noAutoRaise ? 'Off' : 'When My Record Earns It'}
          </Gated>
          {bankIso === 'US' && (
            <Gated feature="card.set_over_limit" className="btn btn-sm btn-ghost" onClick={() => run('card.set_over_limit', { on: !state.overLimitOptIn, accountId: card.id })}>
              Going Over The Limit: {state.overLimitOptIn ? 'Allowed' : 'Declined'}
            </Gated>
          )}
        </div>
        <Fine>
          {estimated}{estimated && terms.source ? ' ' : ''}{terms.source ? `Source: ${sourceAndDay(terms.source, terms.asOf)}.` : ''}
        </Fine>
      </div>
    </Panel>
  );
}

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return 'th';
  return n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
}
