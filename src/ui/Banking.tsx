// Your bank accounts on Profile (engine/banking.ts; the owner's v8 package, 03 "Bank lifecycle"; from November 14, 2026).
// Each account is shown in its own currency, with its four balances kept apart: settled, held, available, and on its way.
// Opening one names the product, its fees as recorded (an unrecorded fee says so), and how sure the record is.
// Moving money is held at once and settles the next business day.
import { useState } from 'react';
import { EVIDENCE_LABELS, accountView, applyForAccount, applyRefusal, bankAccounts, closeAccount, closeRefusal, feeText, productOf, productsOpenTo, transferBetween, transferFee, transferRefusal } from '../engine/banking';
import { formatMoney, parseAmount } from '../engine/cash/money';
import { statementLines } from '../engine/cash/journal';
import { formatDateKey, dateKey } from '../engine/time';
import { getPlace } from '../data/places';
import { SelectField, TextField } from './components';
import { store, useGame } from './store';

const STATE_WORDS: Record<string, string> = { pending: 'Applied for: the bank is deciding', open: 'Open', closed: 'Closed', restricted: 'Restricted', closing: 'Closing', draft: 'Not sent' };

export function BankingCard() {
  const g = useGame();
  const [pick, setPick] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  if (!g.journal) return null;
  const accounts = bankAccounts(g);
  const offer = productsOpenTo(g);
  const product = offer.find((p) => p.id === pick) ?? offer[0];
  const open = accounts.filter((a) => a.state === 'open');
  const A = open.find((a) => a.id === from) ?? open[0];
  const B = open.find((a) => a.id === to && a.id !== A?.id) ?? open.find((a) => a.id !== A?.id && a.owner === A?.owner);
  const parsed = A ? parseAmount(amount, A.currency) : null;
  const moveNo = !A || !B ? 'You need two open accounts of your own to move money between.' : !parsed?.ok ? (amount ? parsed!.reason : 'Say how much to move.') : transferRefusal(g, A.id, B.id, parsed.minor);
  const fee = A && B ? transferFee(A, B) : 0;
  const zone = getPlace(g.character.livesIn ?? g.locationId).zone;
  const money = (currency: string, minor: number) => formatMoney({ currency, minor });
  return (
    <section className="card" aria-labelledby="banking-h">
      <h2 id="banking-h">Your Bank Accounts</h2>
      <ul className="list" aria-label="Your Accounts">
        {accounts.map((a) => {
          const v = accountView(g, a);
          const p = productOf(a);
          const no = closeRefusal(g, a.id);
          return (
            <li key={a.id} className="list-item" style={{ display: 'block' }}>
              <div className="row-between" style={{ gap: 'var(--s3)', flexWrap: 'wrap' }}>
                <strong>{a.label}</strong>
                <span className="small">{a.owner === 'company' ? `${g.company?.name ?? 'Your company'}'s` : 'Yours'} · {STATE_WORDS[a.state]}{a.bank?.reason && a.state === 'closed' ? `: ${a.bank.reason}` : ''}</span>
              </div>
              {a.state !== 'closed' && (
                <dl className="small" aria-label={`${a.label} Balances`} style={{ margin: 'var(--s2) 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: 'var(--s2)' }}>
                  <div><dt className="muted">Settled</dt><dd style={{ margin: 0 }}>{money(a.currency, v.posted)}</dd></div>
                  <div><dt className="muted">Held</dt><dd style={{ margin: 0 }}>{money(a.currency, v.held)}</dd></div>
                  <div><dt className="muted">Available</dt><dd style={{ margin: 0 }}><strong>{money(a.currency, v.available)}</strong></dd></div>
                  <div><dt className="muted">On Its Way In</dt><dd style={{ margin: 0 }}>{money(a.currency, v.pendingIn)}</dd></div>
                </dl>
              )}
              <p className="dim small" style={{ margin: 'var(--s2) 0 0' }}>{feeText(p)}. {EVIDENCE_LABELS[p.evidence]}{p.observed ? `, ${formatDateKey(p.observed)}` : ''}.{a.bank?.anchor ? ` Charges fall on day ${Number(a.bank.anchor.slice(8))} of the month, or the month's last day.` : ''}</p>
              <div className="row" style={{ gap: 'var(--s2)', marginTop: 'var(--s2)', flexWrap: 'wrap' }}>
                <button className="btn btn-small" aria-expanded={shown === a.id} onClick={() => setShown(shown === a.id ? null : a.id)}>{shown === a.id ? 'Hide Statement' : 'Statement'}</button>
                {a.state !== 'closed' && !no && <button className="btn btn-small" onClick={() => setErr(store.act((s) => closeAccount(s, a.id)))}>{a.state === 'pending' ? 'Withdraw Application' : 'Close Account'}</button>}
              </div>
              {shown === a.id && (
                <ul className="list small" aria-label={`${a.label} Statement`}>
                  {statementLines(g, a.id).slice(-12).reverse().map(({ tx, line }, i) => (
                    <li key={`${tx.id}-${i}`} className="list-item"><span className="muted" style={{ whiteSpace: 'nowrap' }}>{formatDateKey(dateKey(tx.at, zone))}</span><span className="grow">{line.label ?? tx.memo}</span><span>{money(a.currency, line.minor)}</span></li>
                  ))}
                  {!statementLines(g, a.id).length && <li className="list-item muted">Nothing has moved yet.</li>}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <h3>Open An Account</h3>
      {offer.length ? (
        <>
          <SelectField label="Account To Apply For" value={product!.id} options={offer.map((p) => ({ value: p.id, label: `${p.provider}, ${p.product} (${p.holder === 'business' ? 'business' : 'personal'}, ${p.currency})` }))} onChange={setPick} />
          <p className="small">{feeText(product!)}. {product!.domesticTransferMinor === null ? 'Its fee for a transfer to another bank isn\'t recorded.' : `A transfer to another bank costs ${money(product!.currency, product!.domesticTransferMinor)}.`} {EVIDENCE_LABELS[product!.evidence]}{product!.observed ? `, ${formatDateKey(product!.observed)}` : ''}.</p>
          <button className="btn" disabled={!!applyRefusal(g, product!.id)} onClick={() => setErr(store.act((s) => void applyForAccount(s, product!.id)))}>Apply</button>
          {applyRefusal(g, product!.id) && <p className="dim small">{applyRefusal(g, product!.id)}</p>}
        </>
      ) : <p className="muted small">The game has no account on record for where you live.</p>}

      <h3>Move Money</h3>
      {open.length >= 2 && A ? (
        <>
          <div className="field-row">
            <SelectField label="From" value={A.id} options={open.map((a) => ({ value: a.id, label: a.label }))} onChange={(v) => { setFrom(v); setTo(''); }} />
            <SelectField label="To" value={B?.id ?? ''} options={open.filter((a) => a.id !== A.id && a.owner === A.owner).map((a) => ({ value: a.id, label: a.label }))} onChange={setTo} />
          </div>
          <TextField label={`Amount (${A.currency})`} inputMode="decimal" value={amount} onChange={setAmount} hint={fee === null ? 'The bank\'s fee for this transfer isn\'t recorded.' : fee ? `Plus a ${money(A.currency, fee)} transfer fee.` : 'No fee between these accounts.'} />
          <button className="btn" disabled={!!moveNo} onClick={() => { const e = store.act((s) => void transferBetween(s, `${s.now}:${A.id}:${B!.id}`, A.id, B!.id, (parsed as { minor: number }).minor)); setErr(e); if (!e) setAmount(''); }}>Move It</button>
          {moveNo && amount && <p className="dim small">{moveNo}</p>}
          <p className="dim small">Held at once and settled the next business day (Monday to Friday; bank holidays aren&apos;t held). Money on its way can&apos;t be spent.</p>
        </>
      ) : <p className="muted small">Open a second account to move money between yours.</p>}
      {err && <p className="error" role="alert">{err}</p>}
    </section>
  );
}
