/**
 * SLATE — statements, the year, and alerts, on the bank's screen.
 *
 * Every account the character has held, open or closed, and each statement
 * period it had: what it opened and closed at, every entry with the balance
 * after it, and for the card what the statement asked and what paying only
 * the minimum would take. The year's interest, the tax the bank took and
 * every fee. And the alerts the bank sends (`systems/statements.ts`).
 */

import { useState } from 'react';
import { useGame, useWorld } from '../../app/game-context';
import { Panel, Fine } from '../components/primitives';
import { Gated } from '../guide/Guide';
import { formatMoney, saveCurrency, centsFromTyped } from '../../../../engine/bankworld/core/money';
import { dateKey, formatDate, zonedParts } from '../../../../engine/bankworld/core/time';
import { LookRegion, Open, at, type Subject } from '../looks';
import type { Account } from '../../../../engine/bankworld/core/ledger';
import { dueAt, stateOf, usCard } from '../../../../engine/bankworld/systems/credit';
import { pendingOn } from '../../../../engine/bankworld/systems/pending';
import { PENDING } from '../../../../engine/bankworld/content/pending';
import { LOOKAHEAD_DAYS } from '../../../../engine/bankworld/systems/obligations';
import {
  accountStatement, alertsOf, cardStatement, periodsOf, yearSummary, type StatementLine,
} from '../../../../engine/bankworld/systems/statements';

const KINDS = new Set(['checking', 'savings', 'credit_card', 'loan']);

export function BankStatements() {
  const { sim } = useGame();
  const accounts = useWorld((s) => Object.values(s.universe.accounts)
    .filter((a) => a.ownerId === s.player.id && !a.nominal && KINDS.has(a.kind))
    // Open ones first, the current account first among them.
    .sort((a, b) => Number(Boolean(a.closedAt)) - Number(Boolean(b.closedAt)) || (a.id === s.player.primaryAccountId ? -1 : b.id === s.player.primaryAccountId ? 1 : 0)));
  const [accountId, setAccountId] = useState('');
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const periods = account ? periodsOf(sim, account) : [];
  const [periodIndex, setPeriodIndex] = useState(0);
  const period = periods[Math.min(periodIndex, periods.length - 1)];
  if (!account || !period) return null;

  return (
    <>
      <Panel title="Statements" subtitle="Every payment in and out of each account, with the balance after it.">
        <div className="field-row">
          <div className="field">
            <label htmlFor="statement-account">Account</label>
            <select id="statement-account" value={account.id} onChange={(e) => { setAccountId(e.target.value); setPeriodIndex(0); }}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}{a.last4 ? ` ···${a.last4}` : ''}{a.institution ? `, ${a.institution}` : ''}{a.closedAt ? ' (Closed)' : ''}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="statement-period">Period</label>
            <select id="statement-period" value={periodIndex} onChange={(e) => setPeriodIndex(Number(e.target.value))}>
              {periods.map((p, i) => <option key={p.from} value={i}>{p.label}</option>)}
            </select>
          </div>
        </div>
        {period.rebuilt && <p className="xs dim" style={{ margin: 0 }}>Rebuilt: this statement is from before the game kept card statements, so its dates are estimated from the earliest one kept. If you moved the statement day before then, they may be a few days off.</p>}
        {account.kind === 'credit_card' ? <CardStatementView account={account} period={period} /> : <AccountStatementView account={account} period={period} />}
      </Panel>
      <YearView />
      <AlertsView />
    </>
  );
}

/**
 * A balance as the statement writes it, below zero with a minus sign (from 2026-10-20, brief 17): until then an overdrawn
 * account's Available Now and the balance after each line read “-$600.00”, a hyphen, beside “−$20,165.00” in In / Out.
 */
const signed = (cents: number, currency: string) => (cents < 0 ? `−${formatMoney(-cents, currency)}` : formatMoney(cents, currency));

function AccountStatementView({ account, period }: { account: Account; period: ReturnType<typeof periodsOf>[number] }) {
  const { sim } = useGame();
  const cur = saveCurrency(sim.universe);
  const money = (c: number) => signed(c, cur);
  const st = accountStatement(sim, account, period);
  const owed = account.kind === 'loan';
  const pending = pendingOn(sim, account);
  const look = at('account', account.id);
  // An account kept at home, in its bank's money as the bank's statement has it, the dollars under each (from 2026-10-16).
  const h = st.held;
  const own = (native: number, dollars: number) => (h && account.currency ? { value: signed(native, account.currency), note: `${money(dollars)} in dollars` } : { value: money(dollars) });
  return (
    <LookRegion className="col gap-3">
      {h && account.currency && <p className="xs dim" style={{ margin: 0 }}>Figures are in {account.currency}, as {account.institution ?? 'the bank'} keeps them, with each one’s value in dollars under it, at an estimated exchange rate.</p>}
      <div className="grid grid-3">
        <Figure look={look} label={owed ? 'Owed At The Start' : 'Opening Balance'} {...own(h?.opening ?? 0, st.opening)} />
        <Figure look={look} label={owed ? 'Paid Off' : 'Money In'} {...own(h?.moneyIn ?? 0, owed ? st.moneyOut : st.moneyIn)} />
        <Figure look={look} label={owed ? 'Added' : 'Money Out'} {...own(h?.moneyOut ?? 0, owed ? st.moneyIn : st.moneyOut)} />
        {!owed && <Figure look={look} label="Interest, After Tax" {...own(h?.interest ?? 0, st.interest)} />}
        {!owed && <Figure look={look} label="Fees" {...own(h?.fees ?? 0, st.fees)} />}
        <Figure look={look} label={owed ? 'Owed At The End' : period.to > sim.now ? 'Available Now' : 'Closing Balance'} {...own(h?.closing ?? 0, st.closing)} />
        {!owed && period.to > sim.now && pending !== 0 && <Figure look={look} label="Posted Balance" value={money(st.closing - pending)} note="Posted payments only: what’s pending hasn’t posted yet" />}
      </div>
      <Lines lines={st.lines} sign={1} empty="No money went in or out of the account in this period." card={owed} valueDated={Boolean(account.bankId && PENDING[account.bankId]?.valueDating)} currency={account.currency} />
      {!owed && account.bankId && PENDING[account.bankId] && <PendingTerms bankId={account.bankId} />}
    </LookRegion>
  );
}

/** How the bank holds and posts what's paid, in its words, and where they're from. */
function PendingTerms({ bankId }: { bankId: string }) {
  const terms = PENDING[bankId]!;
  const said = [
    terms.pendingWords ? `A card payment: ${terms.pendingWords}` : '',
    terms.postingOrder ? `Overnight: ${terms.postingOrder}` : '',
    terms.valueDating ? `Value dates: ${terms.valueDating}` : '',
  ].filter(Boolean);
  return (
    <Fine>
      {said.join(' ')}{said.length ? ' ' : ''}Source: {terms.source}.{terms.pendingDays === undefined ? ' How long a card payment stays pending is estimated: the bank doesn’t say.' : ''}
    </Fine>
  );
}

function CardStatementView({ account, period }: { account: Account; period: ReturnType<typeof periodsOf>[number] }) {
  const { sim } = useGame();
  const cur = saveCurrency(sim.universe);
  const money = (c: number) => formatMoney(c, cur);
  const st = cardStatement(sim, account, period);
  const closed = period.to <= sim.now;
  // A US card's due date is one day each month, as the engine schedules it (`dueAt`); until 2026-10-22 (brief 21) this
  // worked it as the statement and the bank's days whatever the card, which were the engine's then too.
  const due = closed ? dueAt(sim.zone, period.to, st.terms.graceDays, usCard(account)) : undefined;
  // A balance carried into it: paid in full, what built up since still comes on the next, as trailing interest.
  const carried = sim.player.credit !== undefined && stateOf(sim.player, account).carrying === true && st.previous > 0;
  // On a hardship plan the due date judges the plan’s payment, never more than the statement, and not the card’s
  // minimum (`autopayAsk`), so a statement whose due date comes while the plan stands asks for that. Until 2026-10-13
  // this line gave the card’s minimum, which the statement kept, and a holder who paid it on a $100 plan was charged the
  // late fee; found by the guide’s audit of that day. From later that day the statement keeps the plan’s payment, and
  // says it’s the plan’s (`CardState.issued`), so a plan since ended still reads as it asked. One kept before then holds
  // the card’s minimum, and is read against the plan standing now, as this line read every statement until then.
  const plan = sim.player.credit !== undefined ? stateOf(sim.player, account).hardship : undefined;
  const onPlan = st.plan ?? (plan !== undefined && due !== undefined && due >= plan.since);
  const least = onPlan && st.plan === undefined && plan ? Math.min(st.newBalance, plan.payment) : st.minimum;
  const look = at('account', account.id);
  return (
    <LookRegion className="col gap-3">
      <div className="grid grid-3">
        <Figure look={look} label="Brought Forward" value={money(st.previous)} />
        <Figure look={look} label="Payments And Credits" value={money(st.payments)} />
        <Figure look={look} label="Spending" value={money(st.spending)} />
        <Figure look={look} label="Fees" value={money(st.fees)} />
        <Figure look={look} label="Interest" value={money(st.interest)} />
        <Figure look={look} label={closed ? 'New Balance' : 'Balance Now'} value={money(st.newBalance)} note={!closed && pendingOn(sim, account) !== 0 ? `${money(-pendingOn(sim, account))} of it pending` : undefined} />
        <Figure look={look} label="Average Daily Balance" value={money(st.averageDaily)} note="What interest is charged on" />
      </div>
      {closed && st.newBalance > 0 && st.minimum !== undefined && (
        <p className="small" style={{ margin: 0 }}>
          {st.terms.kind === 'charge'
            ? `${st.terms.issuer ?? 'The bank'} takes the whole ${money(st.newBalance)} from your checking account${due ? ` on ${formatDate(due, sim.zone)}` : ''}.`
            : `${onPlan ? 'The plan’s payment' : 'The minimum payment'} is ${money(least!)}${st.pastDue && !onPlan ? `, ${money(st.pastDue)} of it past due` : ''}${due ? `, due ${formatDate(due, sim.zone)}` : ''}. Pay the whole ${money(st.newBalance)}, and ${carried ? 'new spending isn’t charged interest, though the interest that built up since this statement still comes on the next one' : 'none of it is charged interest'}.`}
        </p>
      )}
      {/* On a plan nothing draws interest and nothing new goes on the card, so paying the plan’s payment clears it in so many
          months at no more than it owes (from 2026-10-13: until then this said what paying the card’s minimum would take,
          at the card’s rate, which a plan doesn’t charge; found by that day’s guide audit). */}
      {closed && onPlan && least !== undefined && least > 0 && st.newBalance > 0 && st.terms.kind !== 'charge' && (
        <div className="callout small">
          {`On the plan there’s no interest, and nothing new goes on the card. Paying ${money(least)} a month clears the ${money(st.newBalance)} in ${yearsAndMonths(Math.ceil(st.newBalance / least))}, ${money(st.newBalance)} in all, as long as no payment is missed.`}
        </div>
      )}
      {closed && !onPlan && st.minimumOnly && st.terms.kind !== 'charge' && (
        <div className="callout small">
          {st.minimumOnly === 'never'
            ? 'Paying only the minimum, and spending nothing more, would never pay this off: the minimum doesn’t cover the interest.'
            : `Paying only the minimum, and spending nothing more, takes ${yearsAndMonths(st.minimumOnly.months)} and ${money(st.minimumOnly.total)} in all. ${money(st.minimumOnly.threeYears)} a month pays it off in three years, ${money(st.minimumOnly.threeYearsTotal)} in all.`}
        </div>
      )}
      {st.nextInterest !== undefined && (
        <p className="xs dim" style={{ margin: 0 }}>If none of it is paid, next month’s interest will be about {money(st.nextInterest)}.</p>
      )}
      <Lines lines={st.lines} sign={1} empty="The card wasn’t used or paid in this period." card />
    </LookRegion>
  );
}

function YearView() {
  const { sim } = useGame();
  const cur = saveCurrency(sim.universe);
  const money = (c: number) => formatMoney(c, cur);
  // From the first entry in the books, the life's first morning.
  const first = zonedParts(sim.universe.transactions[0]?.at ?? sim.now, sim.zone).year;
  const last = zonedParts(sim.now, sim.zone).year;
  const years = Array.from({ length: last - first + 1 }, (_, i) => last - i);
  const [year, setYear] = useState(last);
  const y = yearSummary(sim, sim.player.id, year);
  return (
    <Panel title="The Year" subtitle="Interest, the tax taken off it, and every fee, as the bank reports them for the year.">
      <div className="field" style={{ maxWidth: 240 }}>
        <label htmlFor="statement-year">Year</label>
        <select id="statement-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((one) => <option key={one} value={one}>{one}{one === last ? ', So Far' : ''}</option>)}
        </select>
      </div>
      <div className="grid grid-3" style={{ marginTop: 'var(--s3)' }}>
        <Figure label="Interest Earned" value={money(y.interestEarned)} note="Before tax" />
        <Figure label="Tax Taken Off It" value={money(y.taxTaken)} />
        <Figure label="Bank Fees" value={money(y.bankFees)} />
        <Figure label="Card Fees" value={money(y.cardFees)} />
        <Figure label="Card Interest Paid" value={money(y.cardInterest)} />
      </div>
      {y.byFee.length > 0 && (
        <div className="col gap-1" style={{ marginTop: 'var(--s3)' }}>
          {y.byFee.map((one) => (
            <div key={one.memo} className="row-between small"><span>{one.memo}</span><span className="mono">{money(one.amount)}</span></div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function AlertsView() {
  const { sim, run, toast } = useGame();
  const cur = saveCurrency(sim.universe);
  const alerts = useWorld((s) => alertsOf(s.player));
  const [low, setLow] = useState(alerts.lowBalance !== undefined ? String(alerts.lowBalance / 100) : '');
  const [large, setLarge] = useState(alerts.largePayment !== undefined ? String(alerts.largePayment / 100) : '');
  const cents = (v: string) => (v.trim() === '' ? null : centsFromTyped(v));
  const save = () => {
    const answer = run('bank.set_alerts', { lowBalance: cents(low), largePayment: cents(large) });
    if (answer.ok) toast('Alerts saved.', 'positive');
  };
  return (
    <Panel title="Alerts" subtitle={`What the bank tells you, in a notice in Updates. Short For A Payment tells you once when an account can’t cover a standing order, a payment set for a date, card autopay or a loan payment due from it in the next ${['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][LOOKAHEAD_DAYS] ?? LOOKAHEAD_DAYS} days. That alert is the game’s own, not a feature of a real bank.`} help="bank.set_alerts">
      <div className="field-row">
        <div className="field">
          <label htmlFor="alert-low">Any Checking Account Under ({cur})</label>
          <input id="alert-low" type="text" inputMode="decimal" placeholder="Off" value={low} onChange={(e) => setLow(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="alert-large">A Payment Over ({cur})</label>
          <input id="alert-large" type="text" inputMode="decimal" placeholder="Off" value={large} onChange={(e) => setLarge(e.target.value)} />
        </div>
      </div>
      <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
        <Gated feature="bank.set_alerts" className="btn btn-sm btn-primary" onClick={save}>Save Alerts</Gated>
        <Gated feature="bank.set_alerts" className="btn btn-sm btn-ghost" onClick={() => run('bank.set_alerts', { statements: !alerts.statements })}>
          Statement Ready: {alerts.statements ? 'On' : 'Off'}
        </Gated>
        <Gated feature="bank.set_alerts" className="btn btn-sm btn-ghost" onClick={() => run('bank.set_alerts', { upcoming: alerts.upcoming === false })}>
          Short For A Payment: {alerts.upcoming === false ? 'Off' : 'On'}
        </Gated>
      </div>
    </Panel>
  );
}

/** A figure, labeled. */
function Figure({ label, value, note, look }: { label: string; value: string; note?: string; look?: Subject }) {
  const inner = (
    <>
      <span className="stat-label">{label}</span>{' '}
      <span className="stat-value mono" style={{ fontSize: 'var(--size-md)' }}>{value}</span>
      {note && <>{' '}<span className="stat-note">{note}</span></>}
    </>
  );
  return <div className="stat">{look ? <Open subject={look}>{inner}</Open> : inner}</div>;
}

/** The entries, newest first as a banking app shows them, each with the balance after it. */
function Lines({ lines, sign, empty, card, valueDated, currency }: { lines: StatementLine[]; sign: 1 | -1; empty: string; card?: boolean; valueDated?: boolean; currency?: string }) {
  const { sim } = useGame();
  const cur = saveCurrency(sim.universe);
  // An account kept at home: each line and the balance after it in the bank's money (from 2026-10-16).
  const shownIn = (dollars: number, native: number | undefined) => (currency && native !== undefined ? signed(native, currency) : signed(dollars, cur));
  if (lines.length === 0) return <p className="small muted" style={{ margin: 0 }}>{empty}</p>;
  return (
    <div className="statement-lines">
      <div className="row-between xs dim" style={{ padding: 'var(--s1) 0', borderBottom: '1px solid var(--line)' }}>
        <span style={{ flex: '0 0 110px' }}>Date</span>
        <span style={{ flex: 1 }}>What</span>
        <span style={{ flex: '0 0 130px', textAlign: 'right' }}>{card ? 'Charged / Paid' : 'In / Out'}</span>
        <span style={{ flex: '0 0 130px', textAlign: 'right' }}>{card ? 'Owed After' : 'Balance'}</span>
      </div>
      {[...lines].reverse().map((line) => {
        const shown = line.amount * sign;
        const credit = card ? shown < 0 : shown > 0;
        return (
          <div key={line.id} className="row-between small" style={{ padding: 'var(--s1) 0', borderBottom: '1px solid var(--line-soft, var(--line))' }}>
            <span className="dim" style={{ flex: '0 0 110px' }}><Open subject={at('day', dateKey(line.at, sim.homeZone))}>{formatDate(line.at, sim.zone)}</Open></span>
            <span style={{ flex: 1 }}><Open subject={at('transaction', line.id)}>{line.memo}</Open>{line.pending ? <span className="xs dim"> · Pending, posts {formatDate(line.postsAt!, sim.zone)}</span> : valueDated && line.postsAt !== undefined ? <span className="xs dim"> · Booked {formatDate(line.postsAt, sim.zone)}, value {formatDate(line.at, sim.zone)}</span> : null}</span>
            <span className={`mono ${credit ? 'positive' : ''}`} style={{ flex: '0 0 130px', textAlign: 'right' }}>
              <Open subject={at('transaction', line.id)}>{credit ? '+' : '−'}{shownIn(Math.abs(shown), line.native === undefined ? undefined : Math.abs(line.native))}</Open>
            </span>
            <span className="mono dim" style={{ flex: '0 0 130px', textAlign: 'right' }}>{shownIn(line.balance * sign, line.heldAfter === undefined ? undefined : line.heldAfter * sign)}</span>
          </div>
        );
      })}
    </div>
  );
}

function yearsAndMonths(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const years = y === 0 ? '' : y === 1 ? 'a year' : `${y} years`;
  const rest = m === 0 ? '' : m === 1 ? 'a month' : `${m} months`;
  return [years, rest].filter(Boolean).join(' and ') || 'under a month';
}
