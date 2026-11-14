/**
 * SLATE — cash, on the bank's screen: what's in hand, taking it out at an
 * ATM, the counter, the Post Office or on the card, and paying it in
 * (`systems/cash.ts`). What a withdrawal costs is shown before it's made.
 */

import { useState } from 'react';
import { useGame, useWorld } from '../../app/game-context';
import { Panel, Fine } from '../components/primitives';
import { Gated } from '../guide/Guide';
import { formatMoney, saveCurrency, centsFromTyped } from '../../../../engine/bankworld/core/money';
import { CASH } from '../../../../engine/bankworld/content/cash';
import { walletOf, withdrawalQuote, type CashFrom, type CashTo } from '../../../../engine/bankworld/systems/cash';
import { cardOf, cardTerms } from '../../../../engine/bankworld/systems/credit';

export function BankCash({ bankId }: { bankId: string }) {
  const { sim, run, toast } = useGame();
  const cur = saveCurrency(sim.universe);
  const money = (c: number) => formatMoney(c, cur);
  const person = useWorld((s) => s.player);
  const inHand = useWorld((s) => Math.max(0, walletOf(s, s.player)?.balance ?? 0));
  const accounts = useWorld((s) => Object.values(s.universe.accounts).filter((a) => a.ownerId === s.player.id && !a.closedAt && (a.kind === 'checking' || a.kind === 'savings') && a.category !== 'term'));
  const rules = CASH[bankId];
  const card = cardOf(sim, person);
  const [outAmount, setOutAmount] = useState('');
  const [from, setFrom] = useState<CashFrom>('atm');
  const [inAmount, setInAmount] = useState('');
  const [into, setInto] = useState('');
  const [at, setAt] = useState<CashTo>('counter');
  const cents = centsFromTyped;
  const quote = outAmount ? withdrawalQuote(sim, person, cents(outAmount), from) : undefined;
  const cash = card && person.credit ? cardTerms(sim, card, person.credit.score) : undefined;

  const withdraw = () => {
    const answer = run<{ fee: number; ownerFee?: boolean }>('cash.withdraw', { amount: cents(outAmount), from });
    if (answer.ok && answer.value) {
      toast(`You took out ${money(cents(outAmount))}${answer.value.fee > 0 ? `, for a ${money(answer.value.fee)} fee` : ''}.`, 'positive');
      setOutAmount('');
    }
  };
  const deposit = () => {
    const answer = run('cash.deposit', { amount: cents(inAmount), toId: into || accounts[0]?.id, at });
    if (answer.ok) { toast(`You paid in ${money(cents(inAmount))}.`, 'positive'); setInAmount(''); }
  };

  return (
    <Panel title="Cash" subtitle={`You have ${money(inHand)} in cash.`} help="bank.cash">
      <div className="field-row">
        <div className="field">
          <label htmlFor="cash-out">Amount To Take Out ({cur})</label>
          <input id="cash-out" inputMode="decimal" value={outAmount} onChange={(e) => setOutAmount(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cash-from">From</label>
          <select id="cash-from" value={from} onChange={(e) => setFrom(e.target.value as CashFrom)}>
            {card && <option value="card">A Cash Advance On The Card</option>}
            {rules?.postOffice && <option value="post_office">The Post Office</option>}
            <option value="counter">The Counter</option>
            <option value="other_atm">Another Bank’s ATM</option>
            <option value="atm">Your Bank’s ATM</option>
          </select>
        </div>
      </div>
      {quote && (
        <p className="small" style={{ margin: 'var(--s2) 0' }}>
          {quote.refused ?? `${quote.fee > 0 ? `It costs ${money(quote.fee)}` : 'It’s free'}${quote.ownerCharge ? `, plus ${money(quote.ownerCharge)} to the machine’s owner, the average such charge` : ''}.${quote.ownerFee ? ' The machine’s owner may add a fee of its own, shown on the machine before you take the cash. That fee isn’t known, so the game doesn’t charge it.' : ''}`}
          {from === 'card' && cash && !quote.refused && ` A cash advance is charged ${(cash.cashApr * 100).toFixed(2)}% a year from today, with no interest-free period.`}
        </p>
      )}
      <Gated feature="cash.withdraw" className="btn btn-sm" disabled={!outAmount || Boolean(quote?.refused)} onClick={withdraw}>Take It Out</Gated>

      {inHand > 0 && (
        <div style={{ marginTop: 'var(--s4)' }}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="cash-in">Amount To Pay In ({cur})</label>
              <input id="cash-in" inputMode="decimal" value={inAmount} onChange={(e) => setInAmount(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="cash-into">Into</label>
              <select id="cash-into" value={into || accounts[0]?.id} onChange={(e) => setInto(e.target.value)}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cash-at">At</label>
              <select id="cash-at" value={at} onChange={(e) => setAt(e.target.value as CashTo)}>
                {rules?.postOffice === 'both' && <option value="post_office">The Post Office</option>}
                <option value="atm">An ATM</option>
                <option value="counter">The Counter</option>
              </select>
            </div>
          </div>
          <Gated feature="cash.deposit" className="btn btn-sm" disabled={!inAmount} onClick={deposit}>Pay It In</Gated>
        </div>
      )}
      <Fine>
        {rules ? `Source: ${rules.source}.` : 'This bank’s cash fees weren’t found, so taking cash out here is free in the game.'}
        {cash?.estimated.includes('cashAdvance') ? ` The cash advance fee is estimated from a typical US card: ${Number((cash.cashFeeShare * 100).toFixed(2))}% or ${money(cash.cashFeeMin)}, whichever is more.` : ''}
      </Fine>
    </Panel>
  );
}
