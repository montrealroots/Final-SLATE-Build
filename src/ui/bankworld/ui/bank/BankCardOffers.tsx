/**
 * SLATE — the card's own offers, on the bank's screen
 * (`systems/cardoffers.ts`): its introductory rate, a balance moved from a
 * card at another bank (applied for on `ui/bank/BankCard.tsx` since
 * 2026-09-28), a money transfer into the current account, a plan
 * that pays a purchase off in equal months for a fee (none for its life on one
 * made in Chase's introduction, from 2026-10-12), and rewards.
 */

import { useState } from 'react';
import { useGame, useWorld } from '../../app/game-context';
import { Panel } from '../components/primitives';
import { Gated } from '../guide/Guide';
import { formatMoney, saveCurrency, centsFromTyped } from '../../../../engine/bankworld/core/money';
import { formatDate } from '../../../../engine/bankworld/core/time';
import { Open, at } from '../looks';
import { bankById } from '../../../../engine/bankworld/content/banks';
import { cardsOf, cardTerms, INTRO_ENDS_ON_MISS, stateOf } from '../../../../engine/bankworld/systems/credit';
import type { Account } from '../../../../engine/bankworld/core/ledger';
import { BONUSES, PLAN_MONTHS, planFreeIfMadeNow, planMonthsOf, planRoom, transferRate } from '../../../../engine/bankworld/systems/cardoffers';
import { INTEREST_PLANS } from '../../../../engine/bankworld/content/plans';
import { inSaveMoney } from '../../../../engine/bankworld/systems/banking';

const pct = (rate: number) => `${Number((rate * 100).toFixed(2))}%`;

export function BankCardOffers(_props: { bankId: string }) {
  const cards = useWorld((s) => cardsOf(s, s.player));
  const credit = useWorld((s) => s.player.credit);
  if (!credit) return null;
  // Each card's own, where it has any; until 2026-09-28 a person held one card. A balance moved from another bank's card is applied for beside the card (`ui/bank/BankCard.tsx`).
  return <>{cards.map((card) => <CardOffers key={card.id} card={card} />)}</>;
}

function CardOffers({ card }: { card: Account }) {
  const { sim, run, toast } = useGame();
  const [moveAmount, setMoveAmount] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [planMonths, setPlanMonths] = useState<number>(PLAN_MONTHS[0]);
  const cur = saveCurrency(sim.universe);
  const money = (cents: number) => formatMoney(cents, cur, { cents: false });
  const interestPlan = card.bankId ? INTEREST_PLANS[card.bankId] : undefined;
  const lengths = planMonthsOf(card);
  const months = lengths.includes(planMonths) ? planMonths : lengths[0]!;
  const record = useWorld((s) => s.player.credit)!;
  const credit = stateOf(sim.player, card);
  const cents = centsFromTyped;

  const terms = cardTerms(sim, card, record.score);
  const transfers = credit.transfers ?? [];
  const plans = credit.plans ?? [];
  const room = planRoom(sim.player, card);
  const roomWords = room > 0 ? `You can put up to ${money(room)} into one.` : 'There’s nothing on the card to put into one right now.';
  if (!terms.introUntil && !terms.moneyTransferFee && !terms.planFeeShare && !(card?.bankId && INTEREST_PLANS[card.bankId]) && !terms.rewardsRate && transfers.length === 0 && plans.length === 0) return null;

  const lines: string[] = [];
  // What ends it early, in the game's count of payments missed, as the due date ends it (`credit.introLost`): two missed in
  // a row on a US card, one at a bank whose terms end it at one (`INTRO_ENDS_ON_MISS`). From 2026-10-20 (brief 17): until
  // then “A payment that’s sixty days late ends it early.” on a US card, where the second missed due date is thirty days
  // late by the late notice's count, nothing at Barclaycard, and “because a payment was sixty days late” of any card, the
  // Barclaycard ended at one missed minimum among them.
  // From 2026-10-22 (brief 21) a US card's ends 45 days after the notice a minimum more than 60 days late brings
  // (`US_LATE`, `credit.introEndsAt`): until then at the second payment missed in a row, about 30 days late.
  const endsAtOne = card.bankId !== undefined && INTRO_ENDS_ON_MISS.has(card.bankId);
  const endsEarly = endsAtOne ? ' Missing a minimum payment ends it early.' : bankById(card.bankId ?? '')?.iso === 'US' ? ' A minimum payment more than 60 days late ends it early, 45 days after the bank’s notice.' : '';
  if (terms.standardApr !== undefined && terms.introUntil !== undefined) lines.push(`${pct(terms.apr)} on purchases until ${formatDate(credit.introEndsAt !== undefined && credit.introEndsAt < terms.introUntil ? credit.introEndsAt : terms.introUntil, sim.zone)}, then ${pct(terms.standardApr)}.${credit.introEndsAt !== undefined ? ' It ends early because a minimum payment is more than 60 days late.' : endsEarly}`);
  else if (terms.introUntil !== undefined && credit.introLost) lines.push(`Its introductory rate ended because ${endsAtOne ? 'a minimum payment was missed' : 'a minimum payment was more than 60 days late'}.`);
  for (const one of transfers) {
    lines.push(`${one.kind === 'balance' ? 'A balance transfer' : 'A money transfer'}: ${money(one.owed)} at ${pct(transferRate(sim, credit, one))}${one.introUntil !== undefined && sim.now < one.introUntil && !credit.introLost ? ` until ${formatDate(one.introUntil, sim.zone)}, then ${pct(one.apr)}` : ''}. Interest is charged on it from the day it was made.`);
  }
  // Each plan's fee is the one it was made with, for its life, nothing on one made in Chase's introduction
  // (`PLAN_FREE_IN_INTRO`): until 2026-10-12 that plan carried its 1.72%, and this said so.
  for (const plan of plans) lines.push(`A payment plan: ${money(plan.left)} left, paid at ${money(plan.monthly)} a month for ${plan.monthsLeft === 1 ? 'one more month' : plan.monthsLeft + ' more months'}${plan.fee > 0 ? `, with a ${money(plan.fee)} monthly fee instead of interest` : ', with no fee and no interest'}.`);
  // A plan made today is free for its life while Chase's introduction runs (`planFreeIfMadeNow`); until 2026-10-12
  // the offer said 1.72% a month then too.
  const freeUntil = planFreeIfMadeNow(sim, card, credit, terms) && terms.introUntil !== undefined ? formatDate(terms.introUntil, sim.zone) : undefined;
  const bonus = card?.bankId ? BONUSES[card.bankId] : undefined;
  // Each category as the card pays it (`BONUSES`), not a base rate the rest may not earn: until 2026-09-27 this
  // said "the rest at the base rate" of cards that pay nothing on the rest, or less past a cap.
  const per = { quarter: 'a quarter', year: 'a year', cycle: 'a statement', month: 'a month' } as const;
  const part = (what: string, b: { rate: number; cap?: number; after?: number } | undefined, cur2: string) => b === undefined ? undefined
    : `${pct(b.rate)} on ${what}${b.cap !== undefined ? ` to the first ${money(inSaveMoney(sim, b.cap, cur2))} ${per[bonus!.per]}, ${pct(b.after ?? 0)} after` : ''}`;
  const bonusWords = bonus && card?.bankId ? [part('groceries', bonus.food, bankById(card.bankId)?.currency ?? 'USD'), bonus.other ? part('everything else', bonus.other, bankById(card.bankId)?.currency ?? 'USD') : `${pct(terms.rewardsRate ?? 0)} on everything else`].filter(Boolean).join('; ') : undefined;
  // What you earn and have, then the bank's published list and why the game pays what it does of it, apart (from
  // 2026-10-20, brief 16: until then one paragraph of four sentences).
  if (terms.rewardsRate || bonus) lines.push(`Rewards: ${bonusWords ?? `${pct(terms.rewardsRate ?? 0)} back on every purchase`}, added up at each statement. You have ${money(credit.rewards ?? 0)} to redeem.`);
  if ((terms.rewardsRate || bonus) && terms.rewardsWords) lines.push(`Its published rewards: ${terms.rewardsWords}. ${bonus ? 'In the game, groceries are the only thing a card buys: no bill is paid by card.' : 'Those categories are things a card doesn’t buy in the game, so you earn the base rate.'}`);

  return (
    <Panel title="The Card’s Offers" subtitle={<Open subject={at('account', card.id)}>{terms.name}</Open>} look={at('account', card.id)} help="bank.card-offers">
      <div className="col gap-3">
        {lines.map((line) => <p key={line} className="small" style={{ margin: 0 }}>{line}</p>)}
        {terms.rewardsRate && (
          <Gated feature="card.redeem_rewards" className="btn btn-sm btn-ghost" disabled={(credit.rewards ?? 0) <= 0} onClick={() => run('card.redeem_rewards', { accountId: card.id })}>Redeem Onto The Card</Gated>
        )}
        {terms.moneyTransferFee && (
          <div className="field-row">
            <div className="field">
              <label htmlFor={`card-money-transfer-${card.id}`}>Money Transfer To Your Account ({cur})</label>
              <input id={`card-money-transfer-${card.id}`} inputMode="decimal" value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} />
            </div>
            <Gated feature="card.money_transfer" className="btn btn-sm" disabled={!moveAmount} onClick={() => {
              const answer = run<{ fee: number }>('card.money_transfer', { amount: cents(moveAmount), accountId: card.id });
              if (answer.ok) { toast(`Transferred to your account, for a ${money(answer.value!.fee)} fee.`, 'positive'); setMoveAmount(''); }
            }}>Transfer It ({pct(terms.moneyTransferFee)} Fee)</Gated>
          </div>
        )}
        {(terms.planFeeShare || interestPlan) && (
          <>
            <p className="small" style={{ margin: 0 }}>
              {interestPlan
                ? `A payment plan pays off part of what you owe for purchases in equal monthly amounts: ${Object.entries(interestPlan.months).map(([m, t]) => `${m} months ${t.apr !== undefined ? `at ${pct(t.apr)} a year` : t.fee ? `for ${pct(t.fee)} of the plan` : 'free'}`).join(', ')}${interestPlan.min !== undefined ? `, on ${formatMoney(inSaveMoney(sim, interestPlan.min, bankById(card!.bankId!)!.currency), cur)} or more` : ''}. ${roomWords}`
                : freeUntil
                  ? `A payment plan pays off part of what you owe for purchases in equal monthly amounts, instead of interest. A plan made while the introductory rate lasts, until ${freeUntil}, is free for its whole life. One made after that costs ${pct(terms.planFeeShare!)} of the plan a month, the most the bank says it charges. ${roomWords}`
                  : `A payment plan pays off part of what you owe for purchases in equal monthly amounts, for a fee of ${pct(terms.planFeeShare!)} of the plan a month instead of interest. That’s the most the bank says it charges. ${roomWords}`}
            </p>
            <div className="field-row">
              <div className="field">
                <label htmlFor={`card-plan-amount-${card.id}`}>Amount For The Plan ({cur})</label>
                <input id={`card-plan-amount-${card.id}`} inputMode="decimal" value={planAmount} onChange={(e) => setPlanAmount(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor={`card-plan-months-${card.id}`}>Over</label>
                <select id={`card-plan-months-${card.id}`} value={months} onChange={(e) => setPlanMonths(Number(e.target.value))}>
                  {lengths.map((m) => <option key={m} value={m}>{m + ' months'}</option>)}
                </select>
              </div>
              <Gated feature="card.plan" className="btn btn-sm" disabled={!planAmount || room <= 0} onClick={() => {
                const answer = run('card.plan', { amount: cents(planAmount), months, accountId: card.id });
                if (answer.ok) setPlanAmount('');
              }}>Make The Plan</Gated>
            </div>
          </>
        )}
        {terms.planWords && terms.planFeeShare && <p className="xs dim" style={{ margin: 0 }}>The bank’s published plans: {terms.planWords}.</p>}
      </div>
    </Panel>
  );
}
