// Your Bank (from November 14, 2026; the owner's command, 5 "Home entry points"): 1221's bank workspace, whole, with a
// way back to Home, the bank's toasts, and for a save brought from version 10 the record of how its money came here.
import './bank.css';
import { store, useGame } from '../store';
import { PageHead } from '../components';
import { BankWorkspace } from './ui/workspaces/BankWorkspace';
import { useToasts } from './app/game-context';
import { formatMoney } from '../../engine/bankworld/core/money';

export function BankToasts() {
  const toasts = useToasts();
  if (!toasts.length) return null;
  return (
    <div className="bank-toasts" role="status" aria-live="polite">
      {toasts.map((t) => <p key={t.id} className={`callout${t.tone === 'negative' ? ' callout-warning' : ''}`}>{t.message}</p>)}
    </div>
  );
}

function Brought() {
  const g = useGame();
  const r = g.reconciliation;
  if (!r || (!r.brought.length && !r.notBrought.length)) return null;
  return (
    <section className="card" aria-labelledby="brought-h">
      <h2 id="brought-h">How Your Money Came Here</h2>
      <p className="small">Your money moved to your bank when this game was updated. Each account was brought once, for exactly what it held.</p>
      <ul className="list small">
        {r.brought.map((b) => <li key={b.account} className="list-item"><span className="grow">{b.label}</span><span>{formatMoney(b.minor, b.currency)}</span></li>)}
        {r.notBrought.map((b) => <li key={b.account} className="list-item"><span className="grow">{b.label}: not brought. {b.why}</span><span>{formatMoney(b.minor, b.currency)}</span></li>)}
      </ul>
    </section>
  );
}

export function BankPage() {
  const g = useGame();
  return (
    <div className="bank-page">
      <PageHead eyebrow="Your Money" title="Your Bank" lede="Your accounts, cards, loans and payments, at a real bank where you live."
        actions={<button className="btn btn-sm" onClick={() => store.go({ view: 'home' })}>Back To Home</button>} />
      <BankToasts />
      {g.bank ? <BankWorkspace /> : <p className="muted">This story has no bank yet.</p>}
      <Brought />
    </div>
  );
}
