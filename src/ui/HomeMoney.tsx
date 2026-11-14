// Home's way into your bank and your papers (from November 14, 2026; the owner's command, 5 "Home entry points"). Your
// Bank reads the bank's ledger (engine/bankworld/summary.ts): available, pending and owed kept apart, each currency
// apart, nothing added across currencies. Your Papers says what each document is and until when, and calls a document
// in force only when its issuer's record says so; a permission the game hasn't confirmed is never said to be ready.
import { Panel } from './components';
import { store, useClock, useGame } from './store';
import { bankSim } from '../engine/bankworld';
import { bankSummary } from '../engine/bankworld/summary';
import { formatMoney } from '../engine/bankworld/core/money';
import { formatDate } from '../engine/bankworld/core/time';
import { documentsOf, inForce } from '../engine/bankworld/systems/documents';
import { bankOf } from '../engine/bankworld/systems/banking';
import { permits, workRight } from '../engine/papers';
import { countryName } from '../world/gazetteer/gazetteer';
import { getPlace } from '../data/places';

export function YourBankPanel() {
  const g = useGame();
  useClock();
  const open = <button className="btn btn-sm btn-primary" onClick={() => store.go({ view: 'bank' })}>Open Your Bank</button>;
  if (!g.bank) return <Panel title="Your Bank" actions={open}><p className="muted small" style={{ margin: 0 }}>This story has no bank yet.</p></Panel>;
  const sim = bankSim(g.bank);
  const bank = bankOf(sim, sim.player);
  const rows = bankSummary(sim);
  return (
    <Panel title="Your Bank" subtitle={bank ? `At ${bank.name}.` : undefined} actions={open}>
      {rows.map((r) => (
        <dl key={r.currency} className="kv small" aria-label={`In ${r.currency}`} style={{ margin: 0 }}>
          {rows.length > 1 && <><dt>Currency</dt><dd>{r.currency}</dd></>}
          <dt>Available</dt><dd>{formatMoney(r.available, r.currency, { cents: false })}</dd>
          <dt>Pending</dt><dd>{r.pending === 0 ? 'Nothing' : `${r.pending > 0 ? '' : '−'}${formatMoney(Math.abs(r.pending), r.currency, { cents: false })}${r.pending > 0 ? ' on its way in' : ' on its way out'}`}</dd>
          <dt>Owed</dt><dd>{r.owed === 0 ? 'Nothing' : formatMoney(r.owed, r.currency, { cents: false })}</dd>
        </dl>
      ))}
      {rows.length > 1 && <p className="xs dim" style={{ margin: 'var(--s2) 0 0' }}>Each currency is shown in its own money. They aren&apos;t added together.</p>}
    </Panel>
  );
}

export function YourPapersPanel() {
  const g = useGame();
  useClock();
  const open = <button className="btn btn-sm btn-primary" onClick={() => store.go({ view: 'papers' })}>Open Your Papers</button>;
  const docs = g.bank ? documentsOf(bankSim(g.bank).player) : [];
  const zone = getPlace(g.character.livesIn ?? g.locationId).zone;
  const passports = docs.filter((d) => d.kind === 'passport');
  const pending = permits(g).filter((p) => p.status === 'pending').length + docs.filter((d) => d.status === 'pending').length;
  const here = getPlace(g.locationId).country;
  const work = workRight(g, here);
  return (
    <Panel title="Your Papers" actions={open}>
      <ul className="list small" style={{ margin: 0 }}>
        {passports.map((d) => (
          <li key={d.id} className="list-item list-static">
            <span className="grow">{d.name ?? 'Passport'} ({countryName(d.issuer)})</span>
            <span>{inForce(d, g.now) ? `In force to ${formatDate(d.expiresAt!, zone)}` : d.status === 'pending' ? 'Applied for' : 'Not in force'}</span>
          </li>
        ))}
        {!passports.length && <li className="list-item list-static">No passport on record.</li>}
        <li className="list-item list-static"><span className="grow">Work in {countryName(here)}</span><span>{work.can ? 'Allowed' : 'Not allowed yet'}</span></li>
      </ul>
      {pending > 0 && <p className="xs dim" style={{ margin: 'var(--s2) 0 0' }}>{pending === 1 ? 'One application is being decided.' : `${pending} applications are being decided.`}</p>}
    </Panel>
  );
}
