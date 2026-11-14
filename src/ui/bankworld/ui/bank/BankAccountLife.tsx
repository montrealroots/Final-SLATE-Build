/**
 * SLATE — an account's life, on the bank's screen: term deposits and their
 * end, breaking one early for the bank's penalty, taking interest during the
 * term, round-ups, a dormant account reactivated, unclaimed money claimed
 * back, and a new account or card canceled in its cooling-off period
 * (`systems/accountlife.ts`).
 */

import { useGame, useWorld } from '../../app/game-context';
import { Panel, Fine } from '../components/primitives';
import { Gated } from '../guide/Guide';
import { HowItWorks } from '../guide/HowItWorks';
import { formatMoney, saveCurrency } from '../../../../engine/bankworld/core/money';
import { formatDate } from '../../../../engine/bankworld/core/time';
import { LookRegion, Open, at } from '../looks';
import { ACCOUNT_LIFE } from '../../../../engine/bankworld/content/accountlife';
import { ROUND_UPS } from '../../../../engine/bankworld/content/roundups';
import { RoundUps } from './RoundUps';
import { bankById } from '../../../../engine/bankworld/content/banks';
import { closingFeesWords, inSaveMoney } from '../../../../engine/bankworld/systems/banking';
import { BREAK_NOTICE, breakQuote, cancelRefusal, cancelWords, coolingOffEnds, END_WORDS, inCoolingOff, termEndOf, unclaimedLaw } from '../../../../engine/bankworld/systems/accountlife';
import type { TermEnd } from '../../../../engine/bankworld/content/accountlife';

const END_BUTTON: Record<TermEnd, string> = {
  renews: 'Renew It At The End',
  savings: 'Move It To Savings At The End',
  paid_out: 'Pay It Out At The End',
};

export function BankAccountLife({ bankId }: { bankId: string }) {
  const { sim, run } = useGame();
  const cur = saveCurrency(sim.universe);
  const money = (c: number) => formatMoney(c, cur);
  const person = useWorld((s) => s.player);
  const accounts = useWorld((s) => Object.values(s.universe.accounts).filter((a) => a.ownerId === s.player.id && !a.closedAt && !a.nominal));
  const rules = ACCOUNT_LIFE[bankId];
  const terms = accounts.filter((a) => a.category === 'term');
  const dormant = accounts.filter((a) => a.dormant);
  const inactive = accounts.filter((a) => a.inactive && !a.dormant);
  // A current account other than the primary too, from 2026-10-15: until then savings and cards alone were offered, and
  // the command's current-account branch was reached from no screen.
  const cancelable = accounts.filter((a) => (a.kind === 'savings' || a.kind === 'credit_card' || a.kind === 'checking') && inCoolingOff(sim, a) && a.id !== person.primaryAccountId);
  const unclaimed = person.unclaimed ?? [];
  const bank = bankById(bankId);
  const country = bank ? unclaimedLaw(bank.iso) : undefined;
  const DAY = 86_400_000;
  if (terms.length === 0 && !ROUND_UPS[bankId] && dormant.length === 0 && inactive.length === 0 && cancelable.length === 0 && unclaimed.length === 0 && !rules?.withdrawalFee) return null;

  return (
    <Panel title="Your Accounts Over Time" subtitle="Term deposits, round-ups, accounts left unused, and canceling something new." help="bank.upkeep">
      <LookRegion className="col gap-3">
        {terms.map((term) => {
          const quote = breakQuote(sim, term);
          const life = term.bankId ? ACCOUNT_LIFE[term.bankId] : undefined;
          // Inside the bank's notice the end can't change, as the command holds it: until 2026-09-27 the buttons showed anyway.
          const notice = life?.endNoticeDays ?? 0;
          const tooNear = term.maturesAt !== undefined && term.maturesAt - sim.now < notice * DAY;
          return (
            <div key={term.id}>
              <div className="strong small"><Open subject={at('account', term.id)}>{term.name}</Open>, <Open subject={at('account', term.id)}>{money(term.balance)}</Open> at {((term.fixedRate ?? 0) * 100).toFixed(2)}%</div>
              <p className="small" style={{ margin: '2px 0' }}>
                {term.maturesAt ? `On ${formatDate(term.maturesAt, sim.zone)} it ${END_WORDS[termEndOf(term)]}.` : ''}
                {term.graceUntil && sim.now <= term.graceUntil ? ` It renewed, and until ${formatDate(term.graceUntil, sim.zone)} you can take it out whole, with no penalty.` : ''}
                {(life?.endChoices?.length ?? 0) > 1 && notice > 0 && term.maturesAt ? (tooNear ? ` It’s too near its end to change: the bank needs ${notice} days’ notice.` : ` You can change that until ${formatDate(term.maturesAt - notice * DAY, sim.zone)}.`) : ''}
              </p>
              {life?.maturityWords && <p className="xs dim" style={{ margin: '0 0 var(--s1)' }}>The bank’s terms at the end: {life.maturityWords}</p>}
              {/* What breaking it costs, beside the button that breaks it (from 2026-10-20, brief 17, section 8): until then
                  it was folded under Sources And Estimates, and Break It Early breaks it at once. */}
              <p className="small" style={{ margin: '0 0 var(--s1)' }} data-break-cost="">
                {term.breakAt !== undefined ? `It closes on ${formatDate(term.breakAt, sim.zone)}, on the notice you gave. ` : ''}{quote.refused ?? (quote.penalty > 0 ? `Breaking it now costs ${money(quote.penalty)}${quote.estimate ? ', the interest earned so far' : ''}.` : 'Breaking it now costs nothing.')}
              </p>
              {((!quote.refused && quote.penalty > 0 && quote.estimate) || quote.words) && (
                <Fine>
                  {!quote.refused && quote.penalty > 0 && quote.estimate ? 'The penalty is estimated as the interest so far, because the bank words its penalty another way.' : ''}
                  {quote.words ? `${!quote.refused && quote.penalty > 0 && quote.estimate ? ' ' : ''}The bank’s terms: ${quote.words}` : ''}
                </Fine>
              )}
              <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                {!tooNear && (life?.endChoices ?? []).filter((end) => end !== termEndOf(term)).map((end) => (
                  <Gated key={end} feature="bank.set_term_end" className="btn btn-sm btn-ghost" onClick={() => run('bank.set_term_end', { accountId: term.id, atEnd: end })}>
                    {END_BUTTON[end]}
                  </Gated>
                ))}
                <Gated feature="bank.break_term" className="btn btn-sm btn-ghost" disabled={Boolean(quote.refused) || term.breakAt !== undefined} onClick={() => run('bank.break_term', { accountId: term.id })}>{BREAK_NOTICE[term.bankId ?? ''] ? `Give ${BREAK_NOTICE[term.bankId ?? '']} Days’ Notice` : 'Break It Early'}</Gated>
                {life?.interestDuringTerm && (
                  <Gated feature="bank.take_term_interest" className="btn btn-sm btn-ghost" disabled={Math.floor(term.accrued ?? 0) <= 0} onClick={() => run('bank.take_term_interest', { accountId: term.id })}>
                    Take The Interest So Far ({money(Math.floor(term.accrued ?? 0))})
                  </Gated>
                )}
                <HowItWorks help="bank.term" />
              </div>
            </div>
          );
        })}
        {rules?.withdrawalFee !== undefined && rules.freeWithdrawals !== undefined && (
          <p className="small" style={{ margin: 0 }}>Savings here: {rules.freeWithdrawals} free withdrawal{rules.freeWithdrawals === 1 ? '' : 's'} a month, counting any payment the savings makes, then {money(inSaveMoney(sim, rules.withdrawalFee, bank?.currency ?? cur))} each.</p>
        )}
        <RoundUps bankId={bankId} />
        {inactive.map((a) => (
          <p key={a.id} className="small" style={{ margin: 0 }}>
            <Open subject={at('account', a.id)}>{a.name}</Open> is inactive: it hasn’t been used for months{a.bankId && ACCOUNT_LIFE[a.bankId]?.dormantMonths !== undefined ? `, and it goes dormant after ${ACCOUNT_LIFE[a.bankId]!.dormantMonths} months unused` : ''}. Using it makes it active again.
          </p>
        ))}
        {(inactive.length > 0 || dormant.length > 0) && rules?.dormancyWords && <p className="xs dim" style={{ margin: 0 }}>The bank’s terms: {rules.dormancyWords}</p>}
        {dormant.map((a) => (
          <div key={a.id} className="row-between small">
            <span><Open subject={at('account', a.id)}>{a.name}</Open> is dormant: the bank has blocked it until you reactivate it.</span>
            <Gated feature="bank.reactivate" className="btn btn-sm" onClick={() => run('bank.reactivate', { accountId: a.id })}>Reactivate</Gated>
          </div>
        ))}
        {cancelable.map((a) => {
          // A current account is canceled on Close It's refusals, said under it as Your Banks says them, and any account on
          // what settling it takes past what it holds (`cancelRefusal`); it's settled as Close It settles, with or without its
          // interest and its fees as the country has it (`cancelWords`). Until 2026-10-15 a current account was said to come
          // back whole, as savings were, and closed with no interest or fees settled; and savings and a term deposit were said
          // to come back whole everywhere, though Britain and Canada leave the holder the interest earned.
          const why = a.kind === 'credit_card' ? undefined : cancelRefusal(sim, person, a);
          const back = cancelWords(a);
          // The fees it owes, with their figure, where it owes them (from 2026-10-16: until then “less the fees it owes”
          // said no figure unless canceling was refused for them).
          const fees = a.kind === 'credit_card' ? undefined : closingFeesWords(sim, a, 'Canceling');
          // The account's own country's count, Canada's and Mexico's in business days (`coolingOffEnds`, from 2026-10-15's
          // recheck): until then the panel's bank's country's days, added as calendar days. Its last day is named in the
          // zone it ends in, the save's home (from that day's second recheck, when it began to end at that day's last
          // moment; until then it was named in the zone the player stood in, where a life away east would have read the
          // day after).
          const ends = coolingOffEnds(sim, a);
          return (
            <div key={a.id} className="row-between small">
              <span><Open subject={at('account', a.id)}>{a.name}</Open> is new enough to cancel{ends !== undefined ? `, until ${formatDate(ends, sim.homeZone)}` : ''}, {back}.{fees && <span className="xs muted" style={{ display: 'block' }}>{fees}</span>}{why && <span className="xs muted" style={{ display: 'block' }}>{why}</span>}</span>
              <Gated feature="bank.cancel_new" className="btn btn-sm btn-ghost" disabled={!!why} title={why} onClick={() => run('bank.cancel_new', { accountId: a.id })}>Cancel It</Gated>
            </div>
          );
        })}
        {unclaimed.length > 0 && (
          <div className="row-between small">
            <span>{money(unclaimed.reduce((sum, one) => sum + one.amount, 0))} went to {unclaimed[0]!.to} after years unused.{country?.claimBack ? ` ${country.claimBack}` : ''}</span>
            <Gated feature="bank.claim_unclaimed" className="btn btn-sm" onClick={() => run('bank.claim_unclaimed', {})}>Claim It Back</Gated>
          </div>
        )}
        <p className="xs dim" style={{ margin: 0 }}>{rules ? `Source: the bank’s terms, ${rules.source}.` : 'This bank’s terms for these weren’t found.'}{country && (cancelable.length > 0 || unclaimed.length > 0 || dormant.length > 0) ? ` The country’s rules: ${country.source}.` : ''}</p>
      </LookRegion>
    </Panel>
  );
}
