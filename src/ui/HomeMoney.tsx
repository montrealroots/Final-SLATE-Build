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
import { applications, homeVisa, permits, workRight } from '../engine/papers';
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
  const pending = permits(g).filter((p) => p.status === 'pending').length + docs.filter((d) => d.status === 'pending').length + applications(g).filter((a) => a.stage === 'applied').length;
  const here = getPlace(g.locationId).country;
  const work = workRight(g, here);
  const home = homeVisa(g);
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
        {home && <li className="list-item list-static"><span className="grow">{home.visa.route}</span><span>{home.visa.expiresAt ? `To ${formatDate(home.visa.expiresAt, zone)}` : 'In force'}</span></li>}
      </ul>
      {home?.renewable && <p className="xs" style={{ margin: 'var(--s2) 0 0' }}>Your {home.visa.route} runs out soon. Renew it under Your Papers.</p>}
      {pending > 0 && <p className="xs dim" style={{ margin: 'var(--s2) 0 0' }}>{pending === 1 ? 'One application is being decided.' : `${pending} applications are being decided.`}</p>}
    </Panel>
  );
}

/**
 * Homes And Property on Home (from November 17, 2026; the owner's Homes & Property package, section 2): where you live,
 * what you pay for it each month, what's being decided, and the next date that matters. The page has the rest.
 */
export function YourHomesPanel() {
  const g = useGame();
  useClock();
  const open = <button className="btn btn-sm btn-primary" onClick={() => store.go({ view: 'homes' })}>Open Homes And Property</button>;
  const hs = g.homes;
  const res = hs?.residence ? hs.homes[hs.residence] : undefined;
  const t = res ? hs!.tenancies.find((x) => x.homeId === res.id && (x.stage === 'active' || x.stage === 'notice')) : undefined;
  const owned = hs ? hs.owned.filter((o) => !o.soldAt) : [];
  const mortgages = owned.filter((o) => o.mortgage);
  const pending = hs ? hs.tenancies.filter((x) => x.stage === 'applied' || x.stage === 'approved').length + hs.purchases.filter((p) => !['completed', 'failed', 'rejected', 'withdrawn'].includes(p.stage)).length + hs.jobs.filter((j) => j.stage === 'awaiting-permission' || j.stage === 'scheduled' || j.stage === 'working').length + hs.builds.filter((b) => b.stage !== 'complete' && b.stage !== 'refused').length : 0;
  const next = g.events.filter((e) => e.kind === 'home' && e.attention !== 'silent').sort((a, b) => a.at - b.at)[0];
  const overdue = (t?.arrearsMinor ?? 0) + mortgages.reduce((a, o) => a + (o.mortgage!.arrearsMinor ?? 0), 0);
  return (
    <Panel title="Homes And Property" actions={open}>
      <ul className="list small" style={{ margin: 0 }}>
        <li className="list-item list-static"><span className="grow">Where you live</span><span>{res ? res.title : 'Not chosen yet'}</span></li>
        {t && <li className="list-item list-static"><span className="grow">Rent</span><span>{formatMoney(t.rentMinor, res!.currency, { cents: false })} a month</span></li>}
        {mortgages.map((o) => <li key={o.homeId} className="list-item list-static"><span className="grow">Mortgage: {hs!.homes[o.homeId]?.title}</span><span>{formatMoney(o.mortgage!.paymentMinor, hs!.homes[o.homeId]?.currency ?? 'USD', { cents: false })} a month</span></li>)}
        {owned.length > 0 && <li className="list-item list-static"><span className="grow">Homes and land you own</span><span>{owned.length}</span></li>}
      </ul>
      {overdue > 0 && <p className="xs negative" style={{ margin: 'var(--s2) 0 0' }}>A housing payment is overdue.</p>}
      {pending > 0 && <p className="xs dim" style={{ margin: 'var(--s2) 0 0' }}>{pending === 1 ? 'One thing is under way.' : `${pending} things are under way.`}{next ? ` Next: ${formatDate(next.at, getPlace(g.character.livesIn ?? g.locationId).zone)}.` : ''}</p>}
    </Panel>
  );
}
