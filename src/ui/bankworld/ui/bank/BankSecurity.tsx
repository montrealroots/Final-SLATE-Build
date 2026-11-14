/**
 * SLATE — the cards in the hand, on the bank's screen
 * (`systems/security.ts`): each one's number and expiry, locking it, reporting
 * it lost, stolen or damaged, the bills on a replaced card, a new account
 * number where the bank gives one, and payments somebody else made, reported
 * as not the holder's.
 */

import { useState } from 'react';
import { useGame, useWorld } from '../../app/game-context';
import { Panel, Fine } from '../components/primitives';
import { Gated } from '../guide/Guide';
import { formatMoney, saveCurrency } from '../../../../engine/bankworld/core/money';
import { dateKey, formatDate } from '../../../../engine/bankworld/core/time';
import { LookRegion, Open, at } from '../looks';
import { bankById } from '../../../../engine/bankworld/content/banks';
import { FRAUD_LAW, SECURITY, type DebitTier, type FraudLaw } from '../../../../engine/bankworld/content/security';
import { disputeRefusal, ESTIMATE_YEARS, plasticView, type Which } from '../../../../engine/bankworld/systems/security';
import { inSaveMoney } from '../../../../engine/bankworld/systems/banking';
import { cardsOf } from '../../../../engine/bankworld/systems/credit';
import type { Account } from '../../../../engine/bankworld/core/ledger';
import { FRENCH_CARDS, FRENCH_CARDS_SOURCE, cardCeilingRoom } from '../../../../engine/bankworld/systems/lending';

const WHY_WORDS = { lost: 'Lost', stolen: 'Stolen', damaged: 'Damaged', fraud: 'Used by somebody else', new: 'Not arrived yet' } as const;

/**
 * What to do, and by when, to pay as little as the law lets you of a card payment that wasn't you: from the tiers
 * `liabilityFor` (`systems/security.ts`) charges by and the days from the statement `disputeRefusal` allows, so it says
 * what the game does (from 2026-10-20, brief 16, section 7). The law's own words fold away under it. Until then they were
 * the only account of it, five sentences in the US with the deadline in the first. Where a country's law sets no limit
 * for a credit card, the debit card's tiers are what `liabilityFor` charges a credit card too, and where both have one
 * limit at any time, it's the same for both: the sentence says "a card payment" for either.
 */
function reportByWords(law: FraudLaw, amount: (max: number) => string, credit: boolean): string {
  const days = (n: number, business?: boolean) => `${n.toLocaleString('en-US')} ${business ? 'business ' : ''}day${n === 1 ? '' : 's'}`;
  const clock = (t: DebitTier) => `${days(t.withinDays!, t.business)} of ${t.from === 'statement' ? 'the statement that showed it' : 'finding out'}`;
  const pays = (max: number) => (max === 0 ? 'nothing' : `at most ${amount(max)}`);
  const claim = law.claimDays !== undefined ? ` within ${days(law.claimDays)} of the statement that showed it` : '';
  const bounded = law.debitTiers.filter((t) => t.withinDays !== undefined && t.max !== undefined);
  const rest = law.debitTiers.find((t) => t.withinDays === undefined);
  const alike = credit && (law.creditMax === undefined || (bounded.length === 0 && rest?.max === law.creditMax));
  const what = alike ? 'a card payment' : 'a debit card payment';
  const said: string[] = [];
  if (bounded.length > 0) {
    const [first, ...later] = bounded;
    said.push(`If ${what} wasn’t you, press Report It As Not Mine within ${clock(first!)}, and you pay ${pays(first!.max!)} of it.`);
    const after = [...later.map((t) => `within ${clock(t)}, you pay ${pays(t.max!)}`), ...(rest ? [`after that, you pay ${rest.max === undefined ? 'all of it' : pays(rest.max)}`] : [])].join(', and ');
    if (after) said.push(`${after.charAt(0).toUpperCase()}${after.slice(1)}.`);
  } else if (rest?.max !== undefined) said.push(`If ${what} wasn’t you, press Report It As Not Mine${claim}, and you pay ${pays(rest.max)} of it.`);
  else said.push(`No law was found here that limits what you pay of ${what} that wasn’t you.`);
  if (credit && !alike && law.creditMax !== undefined) said.push(`On a credit card, you pay ${pays(law.creditMax)} of one you report${claim}.`);
  return said.join(' ');
}

export function BankSecurity({ bankId }: { bankId: string }) {
  const { sim, run, toast } = useGame();
  const [why, setWhy] = useState<'damaged' | 'lost' | 'stolen'>('lost');
  const cur = saveCurrency(sim.universe);
  const money = (c: number) => formatMoney(c, cur);
  const person = useWorld((s) => s.player);
  const rules = SECURITY[bankId];
  const bank = bankById(bankId);
  const law = bank ? FRAUD_LAW[bank.iso] : undefined;
  // The debit card this bank issued, and every credit card held, each under its own bank's rules: until 2026-09-28 a person held one credit card.
  // Every current account's debit card, at each bank (from 2026-10-10: the primary account's only until then).
  const debits = Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && a.kind === 'checking' && !a.closedAt && !a.nominal);
  const cards: { which: Which; account: Account }[] = [
    ...debits.map((account) => ({ which: 'debit' as Which, account })),
    ...cardsOf(sim, person).map((account) => ({ which: 'credit' as Which, account })),
  ];
  if (cards.length === 0) return null;
  const held = cards.some((c) => c.which === 'credit');
  const ceiling = FRENCH_CARDS[bankId];
  const room = cardCeilingRoom(sim, person);
  const learned = (person.fraud ?? []).map((one, index) => ({ one, index })).filter(({ one }) => one.learnedAt <= sim.now && one.reportedAt === undefined
    && (sim.universe.accounts[one.accountId]?.bankId === bankId || cards.some((c) => c.account.id === one.accountId)));

  return (
    <Panel title="Your Cards" subtitle="Lock a card, report it lost or stolen, or report a payment that wasn’t yours" help="bank.card-security">
      <LookRegion className="col gap-3">
        {cards.map(({ which, account }) => {
          const p = plasticView(sim, account, which);
          const own = SECURITY[account.bankId ?? bankId];
          const ownCurrency = bankById(account.bankId ?? bankId)?.currency ?? cur;
          const fee = which === 'debit' ? own?.replaceFeeDebit : own?.replaceFeeCredit;
          return (
            <div key={account.id} className="col gap-2">
              <div className="strong small"><Open subject={at('account', account.id)}>{which === 'debit' ? 'Debit card' : account.name} ending {p.last4}</Open>, expires <Open subject={at('day', dateKey(p.expiresAt, sim.homeZone))}>{formatDate(p.expiresAt, sim.zone)}</Open></div>
              {p.stopped && <p className="small" style={{ margin: 0 }}>{p.stopped === 'new' ? 'This is a new account’s first card' : `${WHY_WORDS[p.stopped]}: stopped`}. {p.stopped === 'new' ? 'It' : 'A new one'} arrives {p.replacementAt ? formatDate(p.replacementAt, sim.zone) : 'soon'}.</p>}
              {p.locked && !p.stopped && <p className="small" style={{ margin: 0 }}>Locked: nothing new can go on it until you unlock it.</p>}
              {which === 'debit' && ceiling && (
                <p className="small" style={{ margin: 0 }}>
                  It pays up to {money(inSaveMoney(sim, ceiling.ceiling, 'EUR'))} {ceiling.window === 'month' ? 'a calendar month' : 'over any 30 days'}. {room !== undefined ? `${money(room)} of that is left. ` : ''}Past it, a purchase goes on the credit card, or isn’t made. Source: {FRENCH_CARDS_SOURCE}. The limit shown is the lowest the bank sets, which is estimated.
                </p>
              )}
              <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                {!p.stopped && (
                  <Gated feature="card.lock" className="btn btn-sm btn-ghost" onClick={() => run('card.lock', { which, locked: !p.locked, accountId: account.id })}>{p.locked ? 'Unlock It' : 'Lock It'}</Gated>
                )}
                {!p.stopped && (
                  <>
                    <select aria-label="Why" style={{ width: 'auto' }} value={why} onChange={(e) => setWhy(e.target.value as typeof why)}>
                      <option value="damaged">Damaged</option>
                      <option value="lost">Lost</option>
                      <option value="stolen">Stolen</option>
                    </select>
                    <Gated feature="card.report" className="btn btn-sm" onClick={() => {
                      const answer = run<{ arrivesAt: number; fee: number }>('card.report', { which, why, accountId: account.id });
                      if (answer.ok) toast(`The card is stopped. The new one arrives ${formatDate(answer.value!.arrivesAt, sim.zone)}${answer.value!.fee ? `, for ${money(answer.value!.fee)}` : ''}.`, 'positive');
                    }}>Report It</Gated>
                    {/* Where the bank lists a rush fee or rush days, as `card.report` takes it (from 2026-10-13: until
                        then a rush fee alone, and Wells Fargo’s and Capital One’s days drew no button). Wells Fargo’s,
                        a fee it doesn’t publish, draws none again from later that day (`rushUnpublished`). */}
                    {(own?.rushFee !== undefined || own?.rushDays !== undefined) && (
                      <Gated feature="card.report" className="btn btn-sm btn-ghost" onClick={() => run('card.report', { which, why, rush: true, accountId: account.id })}>Report It And Rush The New One</Gated>
                    )}
                  </>
                )}
              </div>
              <Fine>
                {fee === undefined && own?.replaceWords ? `The bank’s terms: ${own.replaceWords} The game charges nothing for it. ` : ''}
                {fee === undefined && !own?.replaceWords ? 'The bank lists no fee for a new card, so the game charges nothing for one.' : fee === undefined ? '' : fee === 0 ? 'A new card is free.' : `A new card costs ${money(inSaveMoney(sim, fee, ownCurrency))}${own?.freeFor?.length ? `, or nothing when it’s ${own.freeFor.map((w) => w).join(' or ')}` : ''}.`}
                {own?.rushFee !== undefined ? (own.rushFee === 0 ? ' A rushed one costs nothing more.' : ` A rushed one costs ${money(inSaveMoney(sim, own.rushFee, ownCurrency))} more.`)
                  : own?.rushDays !== undefined ? ` A rushed one comes in ${own.rushDays} business ${own.rushDays === 1 ? 'day' : 'days'}. The bank lists no fee for it, so the game charges nothing.`
                  // A rush the bank charges for and doesn’t price (from 2026-10-13): said, and not offered.
                  : own?.rushUnpublished ? ` ${own.rushUnpublished} With no fee published, the game doesn’t offer a rushed card.` : ''}
                {(which === 'credit' ? own?.cardYearsCredit ?? own?.cardYears : own?.cardYears) === undefined ? ` Cards last ${ESTIMATE_YEARS} years here. That’s estimated: the bank doesn’t say.` : ''}
              </Fine>
            </div>
          );
        })}
        {learned.map(({ one, index }) => (
          <div key={index} className="row-between small">
            <span>{money(one.amount)} {one.via === 'number' ? 'taken with your account number' : `on your ${one.which} card`}, {formatDate(one.at, sim.zone)}. Wasn’t this you?</span>
            {disputeRefusal(sim, person, index) ? <span className="xs dim">{disputeRefusal(sim, person, index)}</span> : <Gated feature="card.dispute" className="btn btn-sm" onClick={() => {
              const answer = run<{ carried: number; refundAt: number }>('card.dispute', { index });
              if (answer.ok) toast(`Reported. The refund comes by ${formatDate(answer.value!.refundAt, sim.zone)}${answer.value!.carried ? `, less the ${money(answer.value!.carried)} the law leaves you to pay` : ''}.`, 'positive');
            }}>Report It As Not Mine</Gated>}
          </div>
        ))}
        {rules?.newNumberOnFraud && (() => {
          // What a new number does (`EXPOSURE`, from 2026-10-10): attempts on the old one are declined; a card's own fraud is apart.
          const current = person.primaryAccountId ? sim.universe.accounts[person.primaryAccountId] : undefined;
          const exposed = current?.exposed;
          const moved = exposed && current?.number !== exposed.number;
          return (
            <div className="col gap-1">
              <p className="xs" style={{ margin: 0 }}>{!exposed ? 'Your account number isn’t known to be exposed. A new number would mean a new debit card, and wouldn’t protect you from anything yet.' : moved ? `Your old number was exposed on ${formatDate(exposed.at, sim.zone)}. The account has moved to a new number, and debits tried on the old one are declined until ${formatDate(exposed.until, sim.zone)}.` : `Your account number was exposed when your debit card was used on ${formatDate(exposed.at, sim.zone)}. Somebody could try debits on it until ${formatDate(exposed.until, sim.zone)}, and a new number stops them. It doesn’t stop a card being misused: that’s a separate risk.`}</p>
              <Gated feature="bank.new_number" className="btn btn-sm btn-ghost" onClick={() => run('bank.new_number', {})}>Move My Account To A New Number</Gated>
            </div>
          );
        })()}
        {rules?.lostCardWords && <p className="xs dim" style={{ margin: 0 }}>{rules.lostCardWords}</p>}
        {rules?.suspectWords && <p className="xs dim" style={{ margin: 0 }}>{rules.suspectWords}</p>}
        {/* What to do and by when, then the law's own words behind a disclosure (from 2026-10-20, brief 16, section 7):
            until then the law's words were three paragraphs here, of up to five sentences. */}
        {law && bank && (
          <p className="small" style={{ margin: 0 }}>
            {reportByWords(law, (max) => { const c = inSaveMoney(sim, max, law.inEuros ? 'EUR' : bank.currency); return formatMoney(c, cur, { cents: c % 100 !== 0 }); }, held)}
          </p>
        )}
        {(law?.debitWords || (law?.creditWords && held) || law?.refundWords) && (
          <details className="xs dim">
            <summary>What The Law Says</summary>
            {law?.debitWords && <p className="xs dim" style={{ margin: 'var(--s2) 0 0' }}>The law on the debit card: {law.debitWords}</p>}
            {law?.creditWords && held && <p className="xs dim" style={{ margin: 'var(--s2) 0 0' }}>The law on the credit card: {law.creditWords}</p>}
            {law?.refundWords && <p className="xs dim" style={{ margin: 'var(--s2) 0 0' }}>The law on a payment you report as not yours: {law.refundWords}</p>}
          </details>
        )}
        {(rules || law) && <Fine>Source: {[rules?.source, law?.source].filter(Boolean).join('; ')}.</Fine>}
      </LookRegion>
    </Panel>
  );
}
