/**
 * SLATE — the bank's lending and the ways out of it, on the bank screen.
 *
 * The overdraft the bank runs and, where it arranges one, the limit and the
 * rate the record earns; a term deposit, locked for its term and ended the
 * bank's way (until 2026-09-26 this said one was always paid out and never
 * broken early, which Module 7 had made untrue); a personal
 * loan, offered at the rate and payment the bank would set before it is
 * taken, and paid off whenever there's the money; and a move to another
 * bank where you live (`systems/lending.ts`). What is SLATE's estimate
 * rather than the bank's figure says so.
 */

import { useState } from 'react';

/** How a switch ended, as its history says it (`payments.switches`, from 2026-10-10). */
const SWITCH_OUTCOME: Record<string, string> = { declined: 'declined by the new bank', canceled: 'called off', complete: 'complete', held: 'complete, the old account held open for card payments still pending', debt: 'complete, the old account left in debt', 'balance-kept': 'complete, the balance left in the old account', partial: 'a partial switch' };
import { homeOf } from '../../../../engine/bankworld/systems/earnings';
import { useGame, useWorld } from '../../app/game-context';
import { Panel, Fine } from '../components/primitives';
import { Gated } from '../guide/Guide';
import { HowItWorks } from '../guide/HowItWorks';
import { formatMoney, saveCurrency, centsFromTyped } from '../../../../engine/bankworld/core/money';
import { dateKey, formatDate } from '../../../../engine/bankworld/core/time';
import { LookRegion, Open, at } from '../looks';
import { bankById, banksIn, type Bank } from '../../../../engine/bankworld/content/banks';
import { countryOfIso } from '../../../../engine/bankworld/content/bankdays';
import { SWITCHING } from '../../../../engine/bankworld/content/banks-lending';
import { ACCOUNT_LIFE } from '../../../../engine/bankworld/content/accountlife';
import { CASH } from '../../../../engine/bankworld/content/cash';
import { BREAK_NOTICE, breakRuleWords, END_WORDS } from '../../../../engine/bankworld/systems/accountlife';
import { CHARGE_OFF_AFTER, MARK_YEARS, US_LATE } from '../../../../engine/bankworld/systems/credit';
import { CITIES } from '../../../../engine/bankworld/content/geography';
import { said } from '../looks/words';
import { banksFor, inSaveMoney, isoOf } from '../../../../engine/bankworld/systems/banking';
import { abroadRefusal } from '../../../../engine/bankworld/systems/abroad';
import type { Account } from '../../../../engine/bankworld/core/ledger';
import {
  CASS, ESTIMATE, LOAN_DUE_KIND, SWITCH_KIND, checkingsOf, collectionsOf, collectionsSource, lendingOf, loanOf, loanOffer, overdraftOffer, overdraftRoom, repaymentAccount, termsOf,
  FRANCE, CHEX, declines, nextBusinessDay, overdrawnDeadline,
} from '../../../../engine/bankworld/systems/lending';

/** A date key in words, as the calendar has it: no zone round trip. */
const dayWords = (key: string) => { const [y, m, d] = key.split('-').map(Number); return formatDate(Date.UTC(y!, m! - 1, d!, 12), 'UTC'); };

/** Whole units typed, as a banking app takes them, in hundredths. */
const cents = centsFromTyped;
const pct = (rate: number) => `${Number((rate * 100).toFixed(2))}%`;

/** The bank screen's parts this shows: what's borrowed, what's put away for a term, and moving banks. */
export type LendingPart = 'borrowing' | 'term' | 'switch';

/**
 * `account`: the current account at the bank shown, for a bank other than the primary's (from 2026-10-10, when lending
 * could be had at any bank held); absent, the primary account.
 */
export function BankLending({ bank, show, account }: { bank: Bank; show: readonly LendingPart[]; account?: Account }) {
  const { sim, run, toast } = useGame();
  const cur = saveCurrency(sim.universe);
  const money = (c: number) => formatMoney(c, cur, { cents: false });
  const lending = lendingOf(bank);
  const primary = useWorld((s) => (s.player.primaryAccountId ? s.universe.accounts[s.player.primaryAccountId] : undefined));
  const current = account ?? primary;
  const isPrimary = current?.id === primary?.id;
  const room = useWorld((s) => overdraftRoom(s, s.player, current));
  const offer = useWorld((s) => overdraftOffer(s, s.player, current));
  const terms = useWorld((s) => termsOf(s, s.player).filter((t) => t.bankId === bank.id));
  const loan = useWorld((s) => loanOf(s, s.player, bank.id));
  const repayFrom = loan ? repaymentAccount(sim, sim.player, loan) : undefined;
  const mine = useWorld((s) => checkingsOf(s, s.player));
  const [into, setInto] = useState('');
  const [repay, setRepay] = useState('');
  const debt = useWorld((s) => collectionsOf(s, s.player));
  const [toCollections, setToCollections] = useState('');
  const loanDue = useWorld((s) => s.universe.scheduled.find((one) => one.kind === LOAN_DUE_KIND && one.status === 'pending' && (!loan || one.refId === loan.id)));
  const switching = useWorld((s) => s.universe.scheduled.find((one) => one.kind === SWITCH_KIND && one.status === 'pending'));
  // A bank owed a charged-off debt won't open an account.
  // Every bank owed one: until 2026-10-13 only the first debt's bank was left out, with two banks owed.
  const owes = (name: string) => Boolean(collectionsOf(sim, sim.player, name));
  // What the debt shown came from, and its bank, for the words (from 2026-10-13: until then a card charged off was
  // described as an account overdrawn, and the French notice was read from the bank on screen, not the bank owed).
  const source = useWorld((s) => (debt ? collectionsSource(s, debt) : undefined));
  const owedBank = debt ? banksIn(bank.iso).find((b) => b.name === debt.institution) : undefined;
  // What the charge-off does to the record, and what the unpaid debt blocks (from brief 15, 2026-10-19). Until then this
  // said “It’s on your record until it’s paid.”: the record keeps the mark its country's years, paid or not
  // (`markRecord`, `marksFallOff`), a bank abroad marks it not at all (`closeForOverdraft`), and paying the debt touches
  // neither. Mexico's years go by the debt's size, so they aren't named.
  const country = CITIES.get(sim.player.currentLocationId)?.countryId;
  const recordYears = country && country !== 'mx' ? MARK_YEARS[country] : undefined;
  const onRecord = source?.card === true || (owedBank !== undefined && owedBank.iso === isoOf(homeOf(sim.player)));
  // Nor one that turns a ChexSystems report away: until 2026-09-27 the list offered them, and the switch was refused.
  const chex = sim.player.chex && sim.now - sim.player.chex.at < CHEX.years * 365 * 86_400_000 ? sim.player.chex : undefined;
  const others = banksFor(homeOf(sim.player)).filter((b) => b.id !== bank.id && !owes(b.name) && !declines(sim, sim.player, b));
  const rule = SWITCHING[isoOf(homeOf(sim.player)) ?? ''];

  const [limit, setLimit] = useState('');
  const [perUse, setPerUse] = useState(false);
  const [deposit, setDeposit] = useState('');
  const [borrow, setBorrow] = useState('');
  const [months, setMonths] = useState(String(lending.loan?.minMonths ?? 24));
  const [target, setTarget] = useState(others[0]?.id ?? '');
  const [askCancel, setAskCancel] = useState(false);
  const [switchOn, setSwitchOn] = useState('');
  const [partial, setPartial] = useState(false);
  const [askStop, setAskStop] = useState(false);
  const [purpose, setPurpose] = useState<'other' | 'education'>('other');
  const history = useWorld((s) => s.player.payments?.switches ?? []);
  const inDebt = useWorld((s) => Object.values(s.universe.accounts).filter((a) => a.ownerId === s.player.id && a.switchDebt && a.closedAt === undefined));
  const asked = cents(borrow);
  const away = useWorld((s) => abroadRefusal(s.player, bank));
  const quote = useWorld((s) => (asked > 0 ? loanOffer(s, s.player, asked, Number(months), bank.id, purpose) : undefined), [asked, months, bank.id, purpose]);
  const od = lending.overdraft;

  return (
    <div className="grid grid-2" style={{ margin: 'var(--s5) 0' }}>
      {show.includes('borrowing') && (
      <Panel title="Overdraft" subtitle={current?.secondChance ? 'None on a second-chance account' : od ? undefined : 'None on record'} help="bank.borrowing">
        {current?.secondChance && (
          <p className="small">
            A second-chance account: {formatMoney(inSaveMoney(sim, CHEX.secondChanceFee, 'USD'), cur)} a month instead of the usual account’s fee, and no overdraft. A payment it can’t cover comes back unpaid, with its fee. Source: {CHEX.source}. The monthly fee is estimated.
          </p>
        )}
        {!current?.secondChance && <>
        {!od && <p className="small">No overdraft terms were found for {bank.name}, so the account never goes below zero here. A payment it can’t cover comes from savings if you’ve linked them. Otherwise the day’s shopping goes on the card, and any other payment comes back unpaid, with its fee.</p>}
        {/* What it charges, when it charges nothing, and the next business day's wait, a sentence each (from 2026-10-20,
            brief 17, section 3): until then one sentence of up to eight clauses, “…, unless the account is back by the end
            of the next business day, and nothing while it’s overdrawn by $50 or less, and none on an item of $5.00 or
            less.” “Back” is back within the grace, as `settlePendingItems` lets a held fee go, and the fees-on-hold line
            below says it so. */}
        {od?.kind === 'per_item' && (
          <p className="small">
            {bank.name} pays what the account can’t cover without an arrangement, and charges {formatMoney(inSaveMoney(sim, od.fee, bank.currency), cur)}
            {od.atMidnight ? ' for an account still overdrawn at midnight' : ' for each item that overdraws it'}
            {od.maxPerDay !== undefined && !od.atMidnight ? `, at most ${od.maxPerDay} a day` : ''}
            {od.maxPerMonth !== undefined ? `, at most ${od.maxPerMonth} a month` : ''}
            {od.rate !== undefined ? `, with ${pct(od.rate)} a year on what’s overdrawn` : ''}.
            {(() => {
              const none = [
                od.smallItemsFree !== undefined ? `on an item of ${formatMoney(inSaveMoney(sim, od.smallItemsFree, bank.currency), cur)} or less` : '',
                od.graceUpTo !== undefined ? `while the account is overdrawn by ${formatMoney(inSaveMoney(sim, od.graceUpTo, bank.currency), cur, { cents: false })} or less` : '',
              ].filter(Boolean);
              const back = od.graceUpTo !== undefined ? `−${formatMoney(inSaveMoney(sim, od.graceUpTo, bank.currency), cur)}` : 'zero';
              return `${none.length ? ` There’s no fee ${none.join(', or ')}.` : ''}${od.nextDay ? ` A fee waits until the end of the next business day, and if the account is back to ${back} or better by then, there’s none.` : ''}`;
            })()}
            {od.ties ? ` Payments at the same moment post ${od.ties === 'high' ? 'largest' : 'smallest'} first.` : ''}
            {' '}It covers up to about {money(room)}.
          </p>
        )}
        {od?.kind === 'per_item' && od.debitCard === 'never' && (
          <p className="small">{bank.name} never pays an everyday debit card purchase into an overdraft: one it can’t pay goes on the card, or is declined.</p>
        )}
        {od?.kind === 'per_item' && od.debitCard === 'opt_in' && isPrimary && (
          <div className="col gap-2">
            <p className="small" style={{ margin: 0 }}>
              {current?.debitOverdraft
                ? 'You’ve opted in: an everyday debit card purchase the account can’t cover is paid into the overdraft, with its fee.'
                : 'You haven’t opted in, so an everyday debit card purchase the account can’t cover goes on the card, or is declined, and costs no fee. Other payments, like autopay and standing orders, go into the overdraft either way. The law requires a US bank to ask you first.'}
            </p>
            <div>
              <Gated feature="bank.debit_overdraft" className="btn btn-sm btn-ghost" onClick={() => run('bank.debit_overdraft', { on: !current?.debitOverdraft })}>
                {current?.debitOverdraft ? 'Opt Out Of Debit Card Overdrafts' : 'Opt In To Debit Card Overdrafts'}
              </Gated>
            </div>
          </div>
        )}
        {od?.kind === 'tacit' && (
          <p className="small">
            {bank.name} pays what the account can’t without an arrangement (a descubierto), at {pct(od.rate)} a year on what’s overdrawn, and a commission of {pct(od.commission.share)} of the month’s deepest point, at least {formatMoney(inSaveMoney(sim, od.commission.min, bank.currency), cur)}.
            {od.cap ? ` The two together may not cost more than ${pct(od.cap.rate)} a year on what was overdrawn day by day. That’s the law’s cap (${od.cap.source}).` : ''}
            {' '}It covers up to about {money(room)}.
          </p>
        )}
        {od?.kind === 'unarranged' && (
          <p className="small">
            {bank.name} arranges no overdraft on this account, but pays what it can’t{od.rate !== undefined ? `, at ${pct(od.rate)} a year` : ''}
            {od.monthlyFee !== undefined ? `, and charges ${formatMoney(inSaveMoney(sim, od.monthlyFee, bank.currency), cur)} for a month it’s more than ${formatMoney(inSaveMoney(sim, od.graceUpTo ?? 0, bank.currency), cur, { cents: false })} overdrawn${od.afterDays !== undefined && od.afterDays > 1 ? ` on ${od.afterDays} days or more` : ''}${od.freeUnder !== undefined ? `, or nothing if you’re under ${od.freeUnder}` : ''}` : ''}.
            {od.rate === undefined ? ' The bank charges interest too, at a rate it doesn’t publish, so the game charges none.' : ''}
            {' '}It covers up to about {money(room)}.
          </p>
        )}
        {od?.kind === 'secured' && (
          <p className="small">
            Your general account lends against your time deposits: {pct(od.share)} of them up to {formatMoney(inSaveMoney(sim, od.max, bank.currency), cur, { cents: false })}, at their rate plus {pct(od.over)}. Right now that’s {money(room)}.
          </p>
        )}
        {od?.kind === 'arranged' && (
          <div className="col gap-3">
            <p className="small" style={{ margin: 0 }}>
              {(current?.overdraftLimit ?? 0) > 0
                ? `Arranged to ${money(current!.overdraftLimit!)} at ${pct(current!.overdraftRate ?? od.rate)} a year.`
                : 'You don’t have one arranged.'}
              {od.rateTo !== undefined ? ` The bank sets its rate from your credit record, ${pct(od.rate)} to ${pct(od.rateTo)}.` : (current?.overdraftLimit ?? 0) > 0 ? '' : ` ${pct(od.rate)} a year on what’s used.`}
              {od.buffer !== undefined ? ` The first ${formatMoney(inSaveMoney(sim, od.buffer, bank.currency), cur, { cents: false })} is free.` : ''}
              {od.monthlyFee !== undefined ? ` ${formatMoney(inSaveMoney(sim, od.monthlyFee, bank.currency), cur)} a month while it’s arranged${od.perUse ? `, or ${formatMoney(inSaveMoney(sim, od.perUse.fee, bank.currency), cur)} each time it’s used instead${od.perUse.oncePerDay ? ', once a day at most' : ''}` : ''}.` : ''}
              {current?.overdraftPerUse ? ' You pay each time you use it.' : ''}
              {od.setupFee !== undefined ? ` ${formatMoney(inSaveMoney(sim, od.setupFee, bank.currency), cur)} to set one up.` : ''}
              {od.yearlyFee !== undefined ? ` ${formatMoney(inSaveMoney(sim, od.yearlyFee, bank.currency), cur)} a year to have one.` : ''}
              {od.beyond ? ` Past the limit the bank still pays${od.beyond.rate !== undefined ? `, at ${pct(od.beyond.rate)} a year on the part beyond it` : ''}${od.beyond.fee !== undefined ? `, for ${formatMoney(inSaveMoney(sim, od.beyond.fee, bank.currency), cur)} an operation${od.beyond.maxPerMonth !== undefined ? `, at most ${od.beyond.maxPerMonth} a month` : ''}` : ''}${od.beyond.monthlyFee !== undefined ? `, and ${formatMoney(inSaveMoney(sim, od.beyond.monthlyFee, bank.currency), cur)} for a month it’s more than ${formatMoney(inSaveMoney(sim, od.beyond.graceUpTo ?? 0, bank.currency), cur, { cents: false })} past it${od.beyond.afterDays !== undefined && od.beyond.afterDays > 1 ? ` on ${od.beyond.afterDays} days or more` : ''}` : ''}.` : ''}
            </p>
            {'refused' in offer
              ? <p className="small muted" style={{ margin: 0 }}>{offer.refused}</p>
              : (
                <>
                  <Fine>
                    It would arrange {od.minLimit !== undefined ? `${money(offer.min)} to ` : 'up to '}{money(offer.max)} at {pct(offer.rate)}. The most a bank allows, a month of your wages, is estimated.
                  </Fine>
                  <div className="field-act">
                    <div className="field"><label htmlFor="od-limit">{`Overdraft Limit (${cur})`}</label><input id="od-limit" type="text" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} /></div>
                    <Gated feature="bank.arrange_overdraft" className="btn btn-sm" disabled={!limit}
                      onClick={() => { if (run('bank.arrange_overdraft', { limit: cents(limit), perUse, accountId: current?.id }).ok) { toast('Overdraft arranged.', 'positive'); setLimit(''); } }}>
                      Arrange It
                    </Gated>
                    {od.perUse && (
                      <label className="row gap-1 small" style={{ alignItems: 'center' }}>
                        <input type="checkbox" checked={perUse} onChange={(e) => setPerUse(e.target.checked)} /> Pay Per Use
                      </label>
                    )}
                  </div>
                </>
              )}
            {(current?.overdraftLimit ?? 0) > 0 && (
              <div>
                <Gated feature="bank.arrange_overdraft" className="btn btn-sm btn-ghost" onClick={() => run('bank.arrange_overdraft', { limit: 0, accountId: current?.id })}>
                  Close The Overdraft
                </Gated>
              </div>
            )}
          </div>
        )}
        {/* The day the bank acts on an account left overdrawn (`leftOverdrawn`, `closeForOverdraft`), said while there's
            time to act (from 2026-10-20, brief 17, section 8): until then nothing on Money said it before the notice that it
            had closed the account and sent the debt to collections. */}
        {current?.negativeSince !== undefined && (
          <p className="small" data-overdrawn-until="">
            If {current.name} is still {(current.overdraftLimit ?? 0) > 0 ? 'past its overdraft limit' : 'overdrawn'} at the end of {formatDate(overdrawnDeadline(bank, current)! - 1, sim.zone)}, {bank.name} takes what it’s owed from your other money there. If that isn’t enough, it closes the account, and the rest goes to collections{bank.iso === isoOf(homeOf(sim.player)) ? ' and onto your credit record' : ''}.
          </p>
        )}
        {(current?.pendingItems?.length ?? 0) > 0 && od?.kind === 'per_item' && (
          <p className="small">
            {current!.pendingItems!.reduce((n, one) => n + one.count, 0)} overdraft {current!.pendingItems!.reduce((n, one) => n + one.count, 0) === 1 ? 'fee is' : 'fees are'} on hold, {formatMoney(inSaveMoney(sim, od.fee * current!.pendingItems!.reduce((n, one) => n + one.count, 0), bank.currency), cur)}. {current!.pendingItems!.reduce((n, one) => n + one.count, 0) === 1 ? 'It’s' : 'Each is'} charged after the end of {dayWords(nextBusinessDay(current!.pendingItems![0]!.day, countryOfIso(bank.iso)))}, unless the account is back to {od.graceUpTo !== undefined ? `−${formatMoney(inSaveMoney(sim, od.graceUpTo, bank.currency), cur)}` : 'zero'} or better by then.
          </p>
        )}
        {Math.floor(current?.odAccrued ?? 0) > 0 && (
          <p className="small">{money(Math.floor(current!.odAccrued!))} of overdraft interest has built up this month. It’s charged on the 1st.</p>
        )}
        {od?.kind === 'tacit' && (current?.odPeak ?? 0) > 0 && (
          <p className="small">
            The furthest the account has been overdrawn this month is {money(current!.odPeak!)}, and the commission on it would be {formatMoney(Math.max(Math.round(current!.odPeak! * od.commission.share), inSaveMoney(sim, od.commission.min, bank.currency)), cur)}{od.cap ? `, less anything that would take the month past the cap` : ''}.
          </p>
        )}
        <Fine>{od ? `Source: ${od.source}.` : bank.overdraft ?? ''}{od && od.kind !== 'arranged' && od.kind !== 'secured' ? ' How far the bank lets the account go below zero is estimated: it publishes no limit.' : ''}</Fine>
        </>}
      </Panel>
      )}

      {show.includes('term') && (
      <Panel title={lending.term?.called ?? 'Term Deposit'} subtitle={lending.term ? `${account ? `${bank.name}, ` : ''}${lending.term.months} months at ${pct(lending.term.rate)}` : 'None on record'} help="bank.term">
        {!lending.term && <p className="small">No term deposit rate was found for {bank.name}.</p>}
        {lending.term && (
          <div className="col gap-3">
            <p className="small" style={{ margin: 0 }}>
              {/* What breaking it costs, by the bank's rule, before Put It Away (`breakRuleWords`, from 2026-10-20, brief 17):
                  until then “Breaking one early, where the bank lets you, is under Your Accounts Over Time.” */}
              Locked for {lending.term.months} months at a fixed {pct(lending.term.rate)}. At its end it {END_WORDS[ACCOUNT_LIFE[bank.id]?.atEnd ?? 'paid_out']}, unless you choose another way the bank allows. {breakRuleWords(bank.id, lending.term.months)}{ACCOUNT_LIFE[bank.id]?.early === false ? '' : ` Once it’s open, ${BREAK_NOTICE[bank.id] ? `Give ${BREAK_NOTICE[bank.id]} Days’ Notice` : 'Break It Early'} is under Your Accounts Over Time.`}
              {lending.term.minAmount !== undefined ? ` It takes ${formatMoney(inSaveMoney(sim, lending.term.minAmount, bank.currency), cur, { cents: false })} or more.` : ''}
              {lending.term.market ? ' The rate is the market’s average: the bank publishes none of its own.' : ''}
            </p>
            {terms.length > 0 && (
              <LookRegion className="col gap-1">
                {terms.map((t) => (
                  <p key={t.id} className="small strong" style={{ margin: 0 }}>
                    <Open subject={at('account', t.id)}>{money(t.balance)}</Open> at {pct(t.fixedRate ?? 0)}, ends <Open subject={at('day', dateKey(t.maturesAt ?? sim.now, sim.homeZone))}>{formatDate(t.maturesAt ?? sim.now, sim.zone)}</Open>.
                  </p>
                ))}
              </LookRegion>
            )}
            <div className="field-act">
              <div className="field"><label htmlFor={`term-amount${account ? `-${bank.id}` : ''}`}>{`Term Deposit Amount (${cur})`}</label><input id={`term-amount${account ? `-${bank.id}` : ''}`} type="text" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
              <Gated feature="bank.open_term" className="btn btn-sm" disabled={!deposit}
                onClick={() => { const a = run<{ maturesAt: number }>('bank.open_term', { amount: cents(deposit), bankId: bank.id }); if (a.ok && a.value) { toast(`Your ${lending.term!.called} is open, locked until ${formatDate(a.value.maturesAt, sim.zone)}.`, 'positive'); setDeposit(''); } }}>
                Put It Away
              </Gated>
            </div>
            <Fine>Source: {lending.term.source}.</Fine>
          </div>
        )}
      </Panel>
      )}

      {show.includes('borrowing') && debt && (
        <Panel title="In Collections" subtitle={<Open subject={at('account', debt.id)}>{`${money(-debt.balance)} owed`}</Open>} look={at('account', debt.id)} help="bank.pay_collections">
          <div className="col gap-3">
            <p className="small" style={{ margin: 0 }}>
              {source?.overdraft !== false ? <>{debt.institution} closed your account after it was overdrawn {owedBank?.id.startsWith('fr-') ? `past its limit, on the ${FRANCE.closingNoticeDays} days’ notice French law requires` : `for ${ESTIMATE.closeAfterDays} days`}, and charged off what it couldn’t recover. {owedBank?.id.startsWith('fr-') ? '' : 'How long a bank lets an overdraft run is estimated. '}</> : null}
              {/* The payments missed, as the card's notices count them (from 2026-10-20, brief 17): until then “after its
                  payments were 180 days behind”, at the sixth missed due date, 150 days after the first. A US card's from
                  2026-10-22 (brief 21): charged off at 180 days past due, counted in days (`US_LATE`). */}
              {source?.card ? <>{debt.institution} closed your card after {owedBank?.iso === 'US' ? `a minimum payment was ${US_LATE.chargeOff} days late` : `${said(CHARGE_OFF_AFTER, 'payment')} in a row were missed`}, and charged off what was owed on it. </> : null}
              {onRecord ? `The charge-off stays on your credit record${recordYears !== undefined ? ` for ${said(recordYears, 'year')}` : ''}, paid or not. ` : ''}While the debt is unpaid, no bank approves a card, and {debt.institution} won’t open an account for you.
            </p>
            <div className="field-act">
              <div className="field"><label htmlFor="collections-pay">{`Pay Toward It (${cur})`}</label><input id="collections-pay" type="text" inputMode="decimal" value={toCollections} onChange={(e) => setToCollections(e.target.value)} /></div>
              <Gated feature="bank.pay_collections" className="btn btn-sm" disabled={!toCollections}
                onClick={() => { if (run('bank.pay_collections', { amount: cents(toCollections), debtId: debt.id }).ok) { toast(`Paid ${money(cents(toCollections))} toward the debt.`, 'positive'); setToCollections(''); } }}>
                Pay It
              </Gated>
            </div>
          </div>
        </Panel>
      )}

      {show.includes('borrowing') && current?.creditOffered && (
        <Panel title="A Loan For The Overrun" subtitle={`${money(current.creditOffered.amount)} over ${current.creditOffered.months} months at ${pct(current.creditOffered.apr)}`}
          actions={<Gated feature="bank.take_overrun_loan" className="btn btn-sm" onClick={() => { if (run('bank.take_overrun_loan', { accountId: current.id }).ok) toast('The overrun is a loan now.', 'positive'); }}>Take The Loan</Gated>} help="bank.take_overrun_loan">
          <p className="small" style={{ margin: 0 }}>Three months after the account went past its overdraft, French law has the bank offer you a loan for the overrun. The rate is the top of the bank’s personal loan rates. Source: {FRANCE.source}. The rate it would offer is estimated.</p>
        </Panel>
      )}

      {show.includes('borrowing') && (
      <Panel title="Personal Loan" subtitle={loan ? <Open subject={at('account', loan.id)}>{`${money(-loan.balance)} owed`}</Open> : lending.loan ? undefined : 'None on record'} look={loan ? at('account', loan.id) : undefined} help="bank.borrowing">
        {!lending.loan && !loan && <p className="small">No personal loan rate was found for {bank.name}.</p>}
        {loan && (
          <div className="col gap-3">
            <p className="small" style={{ margin: 0 }}>
              <Open subject={at('account', loan.id)}>{money(-loan.balance)}</Open> owed at {pct(loan.apr ?? 0)} a year, {money(loan.loanPayment ?? 0)} a month{loan.loanMonths ? ` over the ${loan.loanMonths} months it was taken for` : ''}
              {loanDue ? <>, next on <Open subject={at('day', dateKey(loanDue.at, sim.homeZone))}>{formatDate(loanDue.at, sim.zone)}</Open></> : ''}, from {repayFrom ? `${repayFrom.name} at ${repayFrom.institution}` : 'your primary account'}. Changing your primary account doesn’t move it. A payment the account can’t make goes on your credit record.
            </p>
            <div className="field-act" style={{ flexWrap: 'wrap' }}>
              <div className="field"><label htmlFor="loan-repay-from">Repaid From</label>
                <select id="loan-repay-from" value={repay || repayFrom?.id || ''} onChange={(e) => setRepay(e.target.value)}>
                  {mine.map((a) => <option key={a.id} value={a.id}>{a.name}, {a.institution}</option>)}
                </select>
              </div>
              <Gated feature="bank.set_loan_repayment" className="btn btn-sm btn-ghost" disabled={!repay || repay === repayFrom?.id} onClick={() => { if (run('bank.set_loan_repayment', { loanId: loan.id, accountId: repay }).ok) toast('From the next payment, it’s repaid from that account.', 'positive'); }}>Repay From This Account</Gated>
              <Gated feature="bank.repay_loan" className="btn btn-sm" onClick={() => { if (run('bank.repay_loan', { loanId: loan.id }).ok) toast('Your loan is paid off.', 'positive'); }}>
                Pay It Off
              </Gated>
            </div>
          </div>
        )}
        {!loan && lending.loan && away && (
          // A bank in another country lends nothing new, said in place of a form it can't act on (from 2026-10-16: until
          // then the form was drawn, and its quote or Borrow It refused in these words).
          <p className="small muted" style={{ margin: 0 }}>{away}</p>
        )}
        {!loan && lending.loan && !away && (
          <div className="col gap-3">
            {lending.loan.lender && <p className="small" style={{ margin: 0 }}>{bank.name}’s personal loans are made by {lending.loan.lender}.{lending.loan.rateSource === 'third-party' ? ' It publishes no rate of its own, so the range is a comparison site’s, named in the source.' : ''}</p>}
            <p className="small" style={{ margin: 0 }}>
              {lending.loan.market
                ? `At the market’s average, ${pct(lending.loan.from)}: the bank publishes no rate of its own.`
                : lending.loan.to !== undefined ? `${pct(lending.loan.from)} to ${pct(lending.loan.to)} a year, set by your credit record.` : `From ${pct(lending.loan.from)} a year.`}
              {' '}Repaid in equal monthly payments. A bank lends against the wages you’re paid, and a payment may take up to {Math.round(ESTIMATE.loanShareOfPay * 100)}% of a month’s wages.
            </p>
            <div className="field-act">
              <div className="field"><label htmlFor="loan-amount">{`Loan Amount (${cur})`}</label><input id="loan-amount" type="text" inputMode="decimal" value={borrow} onChange={(e) => setBorrow(e.target.value)} /></div>
              <div className="field" style={{ flex: '0 0 auto' }}><label htmlFor="loan-months">Over</label><select id="loan-months" style={{ width: 'auto' }} value={months} onChange={(e) => setMonths(e.target.value)}>
                {[12, 24, 36, 48, 60, 72, 84]
                  .filter((m) => m >= (lending.loan!.minMonths ?? ESTIMATE.loanMonths[0]) && m <= (lending.loan!.maxMonths ?? ESTIMATE.loanMonths[1]))
                  .map((m) => <option key={m} value={m}>{m} Months</option>)}
              </select></div>
              {lending.loan.notFor && <div className="field" style={{ flex: '0 0 auto' }}><label htmlFor="loan-purpose">For</label><select id="loan-purpose" style={{ width: 'auto' }} value={purpose} onChange={(e) => setPurpose(e.target.value as 'other' | 'education')}>
                <option value="other">Anything Else</option>
                <option value="education">Education</option>
              </select></div>}
            </div>
            {quote && ('refused' in quote
              ? <p className="small muted" style={{ margin: 0 }}>{quote.refused}</p>
              : <p className="small" style={{ margin: 0 }}>{pct(quote.apr)} a year: {money(quote.payment)} a month for {months} months. Every loan you hold, at any bank, counts against the same wages.</p>)}
            <div className="field-row">
              <div className="field"><label htmlFor="loan-into">Paid Into</label>
                <select id="loan-into" value={into || current?.id || ''} onChange={(e) => setInto(e.target.value)}>
                  {mine.map((a) => <option key={a.id} value={a.id}>{a.name}, {a.institution}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="loan-repay">Repaid From</label>
                <select id="loan-repay" value={repay || current?.id || ''} onChange={(e) => setRepay(e.target.value)}>
                  {mine.map((a) => <option key={a.id} value={a.id}>{a.name}, {a.institution}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Gated feature="bank.borrow" className="btn btn-sm" disabled={!quote || 'refused' in quote}
                onClick={() => { const paidInto = sim.universe.accounts[into || current?.id || '']; if (run('bank.borrow', { amount: asked, months: Number(months), bankId: bank.id, purpose, intoId: into || current?.id, repayFromId: repay || current?.id }).ok) { toast(`Your ${money(asked)} loan is in ${paidInto?.name ?? 'your account'}.`, 'positive'); setBorrow(''); setInto(''); setRepay(''); } }}>
                Borrow It
              </Gated>
            </div>
            <Fine>Source: {lending.loan.source}. How much of your wages a payment may take is estimated.</Fine>
          </div>
        )}
      </Panel>
      )}

      {/* Only where a switching service runs it: with none, until 2026-10-10 this moved everything the same day, and
          its text said you did it yourself. The steps are in Your Banks now (`BankMoves`). */}
      {show.includes('switch') && rule && (
      <Panel title="Switch Bank" subtitle={switching ? `Under way, done ${formatDate(switching.at, sim.zone)}` : undefined} help="bank.other-banks">
        {others.length === 0 ? <p className="small">There’s no other bank where you live in the game.</p> : (
          <div className="col gap-3">
            <p className="small" style={{ margin: 0 }}>
              {`Through the ${rule.scheme}: ${rule.workingDays} working days, and your balances, wages and bills move with you.`}
              {' '}An overdraft has to be cleared first. Term deposits and loans stay where they are.
              {bank.iso === 'DE' && CASH[bank.id]?.savingsMonthly ? ` Savings over the ${formatMoney(CASH[bank.id]!.savingsMonthly!, 'EUR', { cents: false })} you can take out in a month without notice isn’t moved: notice is given on it, and it follows three months later.` : ''}
            </p>
            {switching && (() => {
              // The switch's stage: what calling it off does, until when (from 2026-10-10, `bank.cancel_switch`).
              const until = switching.payload.cancellableUntil as number | undefined;
              const open = until !== undefined && sim.now <= until;
              return (
                <div className="col gap-2">
                  <p className="small" style={{ margin: 0 }}>
                    Switching to {bankById(String(switching.payload.bankId))?.name} on {formatDate(switching.at, sim.zone)}. {until === undefined ? 'This service publishes no right to call a switch off: it runs to its date.' : open ? `It can be called off until ${formatDate(until, sim.zone)}: your accounts, wages and payments stay where they are, and nothing has moved yet.` : `It’s past ${formatDate(until, sim.zone)}, its last day to be called off, and under way.`}
                    {' '}If {current?.name ?? 'the old account'} is overdrawn on the day, the old bank can’t close it: the new account opens and your payments move, and the debt stays to be cleared.
                  </p>
                  {switching.payload.partial === true && <p className="small" style={{ margin: 0 }}>A partial switch: your wages, standing orders and autopay move, and {current?.name ?? 'the old account'} stays open with its balance.</p>}
                  {switching.payload.keepBalance === true && <p className="small" style={{ margin: 0 }}>Its balance transfer is stopped: your payments move, and the balance stays in the old account, which stays open.</p>}
                  {until !== undefined && !open && switching.payload.keepBalance !== true && switching.payload.partial !== true && (!askStop
                    ? <div><button type="button" className="btn btn-sm btn-ghost" onClick={() => setAskStop(true)}>Stop The Balance Transfer…</button></div>
                    : <div className="row gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}><span className="small">Your payments still move on the day, and the balance stays in {current?.name ?? 'the old account'}, which stays open.</span><Gated feature="bank.stop_balance_transfer" className="btn btn-sm btn-danger" onClick={() => { if (run('bank.stop_balance_transfer', { confirm: true }).ok) toast('Your balance stays in the old account.', 'positive'); setAskStop(false); }}>Keep The Balance There</Gated><button type="button" className="btn btn-sm btn-ghost" onClick={() => setAskStop(false)}>Move It As Planned</button><HowItWorks help="bank.stop_balance_transfer" /></div>)}
                  {open && (!askCancel
                    ? <div><button type="button" className="btn btn-sm btn-ghost" onClick={() => setAskCancel(true)}>Call Off The Switch…</button></div>
                    : <div className="row gap-2"><Gated feature="bank.cancel_switch" className="btn btn-sm btn-danger" onClick={() => { if (run('bank.cancel_switch', { confirm: true }).ok) toast('The switch is called off.', 'positive'); setAskCancel(false); }}>Call It Off</Gated><button type="button" className="btn btn-sm btn-ghost" onClick={() => setAskCancel(false)}>Keep It</button></div>)}
                </div>
              );
            })()}
            {chex && (
              <p className="small" style={{ margin: 0 }}>
                {chex.bank} reported you to ChexSystems on {formatDate(chex.at, sim.zone)}, and the report stays on your record until {formatDate(chex.at + CHEX.years * 365 * 86_400_000, sim.zone)}. A bank here turns down about {Math.round((debt && debt.balance < 0 ? CHEX.declines.unpaid : CHEX.declines.paid) * 100)}% of applicants with a report, and the banks that turned you down are left off the list. Source: {CHEX.source}. That share is estimated.
              </p>
            )}
            {inDebt.map((a) => <p key={a.id} className="small" style={{ margin: 0 }}>{a.name} at {a.institution} was overdrawn on the switch date, so it’s blocked to everything but payments in. It closes once what it owes is repaid.</p>)}
            {history.length > 0 && (
              <details className="small"><summary>Past Switches</summary>
                <ul style={{ margin: 0 }}>{history.map((h, i) => <li key={i}>{formatDate(h.at, sim.zone)}: {h.fromBank ? `${h.fromBank} to ` : ''}{h.toBank}, {SWITCH_OUTCOME[h.outcome]}{h.why ? `: ${h.why}` : ''}.</li>)}</ul>
              </details>
            )}
            <Fine>Source: {rule.source}.</Fine>
            {bank.iso === 'GB' && (
              <label className="row gap-1 small" style={{ alignItems: 'center' }}><input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} /> Partial: your payments move, the old account stays open, and it takes {CASS.partialDays} working days</label>
            )}
            <div className="field-act">
              <div className="field"><label htmlFor="switch-to">Switch To</label><select id="switch-to" value={target} onChange={(e) => setTarget(e.target.value)}>
                {/* The dearest current account first, the cheapest last. */}
                {[...others].sort((a, b) => (b.current.monthlyFee ?? 0) - (a.current.monthlyFee ?? 0)).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select></div>
              <div className="field"><label htmlFor="switch-on">On (Optional)</label><input id="switch-on" type="date" value={switchOn} onChange={(e) => setSwitchOn(e.target.value)} /></div>
              <Gated feature="bank.switch" className="btn btn-sm" disabled={!!switching || !target}
                onClick={() => { const a = run<{ at: number }>('bank.switch', { bankId: target, ...(switchOn ? { on: switchOn } : {}), ...(partial ? { partial: true } : {}) }); if (a.ok) toast(`Switch set for ${formatDate(a.value!.at, sim.zone)}.`, 'positive'); }}>
                Switch
              </Gated>
            </div>
          </div>
        )}
      </Panel>
      )}
    </div>
  );
}

/**
 * Term deposits at each bank kept with a current account, the primary's first, each funded from the current account
 * there as `bank.open_term` funds it. Until 2026-10-13 only the primary's bank's panel was drawn, so the command's bank,
 * taken since 2026-10-10, was never another bank's from any screen; found by that day's evidence check.
 */
export function TermDeposits({ primaryBank }: { primaryBank: Bank }) {
  const currents = useWorld((s) => checkingsOf(s, s.player));
  const others = [...new Set(currents.map((a) => a.bankId))]
    .map((id) => (id && id !== primaryBank.id ? bankById(id) : undefined))
    .filter((b): b is Bank => !!b && lendingOf(b).term !== undefined);
  return (
    <>
      <BankLending bank={primaryBank} show={['term']} />
      {others.map((b) => <BankLending key={b.id} bank={b} account={currents.find((a) => a.bankId === b.id)} show={['term']} />)}
    </>
  );
}
