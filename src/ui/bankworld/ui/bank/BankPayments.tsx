/**
 * SLATE — how each thing is paid, on the bank's screen.
 *
 * The day's spending, the way the character pays it; savings linked to the
 * current account or not; standing orders
 * into savings; and payments set for a date (`systems/payments.ts`). How the
 * rent and the bills were paid was chosen here too, checks in the post were
 * stopped and SEPA direct debits taken back, until the home went in the scope
 * reset of 2026-10-09.
 */

import { useState } from 'react';
import { useGame, useWorld } from '../../app/game-context';
import { Panel } from '../components/primitives';
import { Gated } from '../guide/Guide';
import { formatMoney, saveCurrency, centsFromTyped } from '../../../../engine/bankworld/core/money';
import { dateKey, formatDate, instantFromZoned } from '../../../../engine/bankworld/core/time';
import { LookRegion, Open, at } from '../looks';
import { coveredBanks, linkCovers, paymentsOf, SCHEDULED_KIND, type LinkCover } from '../../../../engine/bankworld/systems/payments';
import { FRENCH_CARDS, cardCeilingRoom } from '../../../../engine/bankworld/systems/lending';

export function BankPayments() {
  const { sim, run, toast } = useGame();
  const cur = saveCurrency(sim.universe);
  const money = (c: number) => formatMoney(c, cur);
  const person = useWorld((s) => s.player);
  const pay = useWorld((s) => paymentsOf(s.player));
  const accounts = useWorld((s) => Object.values(s.universe.accounts).filter((a) => a.ownerId === s.player.id && !a.closedAt && (a.kind === 'checking' || a.kind === 'savings') && a.category !== 'term'));
  const savings = accounts.filter((a) => a.kind === 'savings');
  const current = accounts.find((a) => a.id === person.primaryAccountId);
  const covers = useWorld((s) => linkCovers(s, s.player));
  const linkable = covers.some((one) => one.savings);
  const scheduled = useWorld((s) => s.universe.scheduled.filter((i) => i.kind === SCHEDULED_KIND && i.status === 'pending' && i.payload.personId === s.player.id));
  const ceiling = current?.bankId ? FRENCH_CARDS[current.bankId] : undefined;
  const ceilingRoom = cardCeilingRoom(sim, person);

  const [soAmount, setSoAmount] = useState('');
  const [soDay, setSoDay] = useState('1');
  const [soTo, setSoTo] = useState('');
  const [spFrom, setSpFrom] = useState('');
  const [spTo, setSpTo] = useState('');
  const [spAmount, setSpAmount] = useState('');
  const [spDate, setSpDate] = useState('');
  const cents = centsFromTyped;

  const addOrder = () => {
    const answer = run('bank.add_standing_order', { toId: soTo || savings[0]?.id, amount: cents(soAmount), day: Number(soDay) });
    if (answer.ok) { toast('Standing order set up.', 'positive'); setSoAmount(''); }
  };
  const schedule = () => {
    const [y, m, d] = spDate.split('-').map(Number);
    if (!y || !m || !d) return;
    const at = instantFromZoned({ year: y, month: m, day: d, hour: 9 }, sim.zone);
    const from = spFrom || current?.id;
    const to = spTo || accounts.find((a) => a.id !== from)?.id;
    const answer = run('bank.schedule_payment', { fromId: from, toId: to, amount: cents(spAmount), at });
    if (answer.ok) { toast(`Payment set for ${formatDate(at, sim.zone)}.`, 'positive'); setSpAmount(''); }
  };

  return (
    <Panel title="How You Pay" subtitle="How the day’s spending is paid, and which account each payment comes from." help="bank.payments">
      <div className="field-row">
        <div className="field">
          <label htmlFor="pay-everyday">The Day’s Spending</label>
          <select id="pay-everyday" value={pay.everyday} onChange={(e) => run('bank.set_payments', { everyday: e.target.value })}>
            <option value="cash">In Cash, Then The Debit Card</option>
            <option value="credit">On The Credit Card</option>
            <option value="debit">On The Debit Card</option>
          </select>
        </div>
      </div>
      <p className="small" style={{ margin: 'var(--s2) 0' }}>
        {pay.everyday === 'debit' && ceiling && ceilingRoom !== undefined ? `The debit card pays up to its spending limit ${ceiling.window === 'month' ? 'each calendar month' : 'over any 30 days'}, and ${money(ceilingRoom)} of it is left. Past it, the day’s shopping goes on the credit card, or isn’t bought. ` : ''}
      </p>
      {/* Only with savings the link draws on for a current account a payment comes from (`linkCovers`), or while it's
          On, so it can be turned Off. Until 2026-09-27 it was offered with no savings, and On changed nothing; until
          2026-10-12 it was offered with savings only at a bank no payment came from, and On covered nothing and then
          was refused.
          Later the same day, until group r3b, it read the primary account's bank alone: with savings at the bank of a
          loan's repayment account it went once Off, and said On covered nothing, though On paid that loan. */}
      {(linkable || pay.linkSavings) && (
        <div className="col gap-2">
          <p className="small" style={{ margin: 0 }}>{coverText(covers)}</p>
          <div>
            <Gated feature="bank.set_payments" className="btn btn-sm btn-ghost" onClick={() => run('bank.set_payments', { linkSavings: !pay.linkSavings })}>
              Savings Covers The Checking Account: {pay.linkSavings ? 'On' : 'Off'}
            </Gated>
          </div>
        </div>
      )}

      {savings.length > 0 && (
        <div style={{ marginTop: 'var(--s4)' }}>
          <div className="eyebrow">Standing Orders</div>
          {pay.standingOrders.map((order) => (
            <div key={order.id} className="row-between small" style={{ padding: '3px 0' }}>
              <span>{money(order.amount)} to {sim.universe.accounts[order.toId]?.name ?? 'savings'} on the {order.day}{ordinal(order.day)} of each month</span>
              <Gated feature="bank.cancel_standing_order" className="btn btn-sm btn-ghost" onClick={() => run('bank.cancel_standing_order', { id: order.id })}>Cancel</Gated>
            </div>
          ))}
          <div className="field-row">
            <div className="field"><label htmlFor="so-amount">Each Month ({cur})</label><input id="so-amount" inputMode="decimal" value={soAmount} onChange={(e) => setSoAmount(e.target.value)} /></div>
            <div className="field"><label htmlFor="so-day">Day Of The Month</label><input id="so-day" inputMode="numeric" value={soDay} onChange={(e) => setSoDay(e.target.value)} /></div>
            {savings.length > 1 && (
              <div className="field">
                <label htmlFor="so-to">Into</label>
                <select id="so-to" value={soTo || savings[0]!.id} onChange={(e) => setSoTo(e.target.value)}>
                  {savings.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <Gated feature="bank.add_standing_order" className="btn btn-sm" onClick={addOrder} disabled={!soAmount}>Set Up A Standing Order Into Savings</Gated>
        </div>
      )}

      {accounts.length > 1 && (
        <div style={{ marginTop: 'var(--s4)' }}>
          <div className="eyebrow">Payments Set For A Date</div>
          <LookRegion>
          {scheduled.map((item) => (
            <div key={item.id} className="row-between small" style={{ padding: '3px 0' }}>
              <span>{money(Number(item.payload.amount))} to <Open subject={at('account', String(item.payload.toId))}>{sim.universe.accounts[String(item.payload.toId)]?.name}</Open> on <Open subject={at('day', dateKey(item.at, sim.homeZone))}>{formatDate(item.at, sim.zone)}</Open></span>
              <Gated feature="bank.cancel_scheduled" className="btn btn-sm btn-ghost" onClick={() => run('bank.cancel_scheduled', { id: item.id })}>Cancel</Gated>
            </div>
          ))}
          </LookRegion>
          <div className="field-row">
            <div className="field">
              <label htmlFor="sp-from">From</label>
              <select id="sp-from" value={spFrom || current?.id} onChange={(e) => setSpFrom(e.target.value)}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sp-to">To</label>
              <select id="sp-to" value={spTo || accounts.find((a) => a.id !== (spFrom || current?.id))?.id} onChange={(e) => setSpTo(e.target.value)}>
                {accounts.filter((a) => a.id !== (spFrom || current?.id)).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="sp-amount">Amount ({cur})</label><input id="sp-amount" inputMode="decimal" value={spAmount} onChange={(e) => setSpAmount(e.target.value)} /></div>
            <div className="field"><label htmlFor="sp-date">On</label><input id="sp-date" type="date" value={spDate} onChange={(e) => setSpDate(e.target.value)} /></div>
          </div>
          <Gated feature="bank.schedule_payment" className="btn btn-sm" onClick={schedule} disabled={!spAmount || !spDate}>Set The Payment</Gated>
        </div>
      )}

      {/* Checks not yet cashed and direct debits to take back were listed here until 2026-10-09: only the rent and the bills went by them. */}
    </Panel>
  );
}

const andList = (items: readonly string[]): string => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

/**
 * What the link covers, account by account, as `linkCovers` reads it: the primary for the day's spending, the account a
 * card's autopay is set on for that autopay (from later on 2026-10-12: until then the primary was said to pay 'a card's
 * autopay from it' even where the autopay stayed on another account), and each loan's repayment account for its loan.
 * From 2026-10-12, group r3b: until then one line
 * said a payment “the current account” couldn't make came from savings, or, with no easy-access savings at the primary
 * account's bank, that On covered nothing, which was false with savings at the bank of a loan's repayment account.
 */
function coverText(covers: LinkCover[]): string {
  if (!covers.some((one) => one.savings)) return `You don’t have easy-access savings at ${coveredBanks(covers)}, so turning this on covers nothing until you open some there.`;
  const each = covers.map((one) => {
    const name = one.from?.name ?? 'your checking account';
    const pays = andList([...(one.primary ? ['the day’s spending'] : []), ...one.cards.map((card) => `the ${card.name}’s autopay`), ...one.loans.map((loan) => `the ${loan.name}`)]);
    return one.savings ? `${one.savings.name} covers ${name}, which pays ${pays}.` : `${name[0]!.toUpperCase()}${name.slice(1)}, which pays ${pays}, has no easy-access savings at ${one.from?.institution ?? 'your bank'} to cover it.`;
  });
  return ['When this is on, a payment your checking account can’t cover is taken from easy-access savings at the same bank, as far as the savings allows.', ...each].join(' ');
}

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return 'th';
  return n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
}
