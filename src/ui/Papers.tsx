// Your papers on Profile (engine/papers.ts; the owner's v8 package, 05; from November 14, 2026): your citizenships, where
// you may work and why, and the permits you have applied for. Checking a country says what working there needs; a
// permit is applied for here and decided after its time.
import { useState } from 'react';
import { applyForPermit, permitRefusal, permits, workRight } from '../engine/papers';
import { countryName } from '../world/gazetteer/gazetteer';
import { formatDateKey, dateKey } from '../engine/time';
import { getPlace } from '../data/places';
import { NATIONALITIES } from '../engine';
import { SelectField } from './components';
import { store, useGame } from './store';

const STATUS: Record<string, string> = { pending: 'Being decided', granted: 'Granted', refused: 'Refused' };

export function PapersCard() {
  const g = useGame();
  const [country, setCountry] = useState('US');
  const [err, setErr] = useState<string | null>(null);
  const zone = getPlace(g.character.livesIn ?? g.locationId).zone;
  const w = workRight(g, country);
  const no = permitRefusal(g, country);
  return (
    <section className="card" aria-labelledby="papers-h">
      <h2 id="papers-h">Your Papers</h2>
      <p className="small">Citizen of {(g.character.nationalities ?? []).map(countryName).join(' and ') || 'nowhere recorded'}. You may work where you live. A passport lets you travel; working somewhere else needs the right to.</p>
      <SelectField label="Working In" value={country} options={NATIONALITIES.map((c) => ({ value: c.code, label: c.name })).sort((a, b) => a.label.localeCompare(b.label))} onChange={setCountry} />
      <p role="status" className="small">{w.can ? `You may work in ${countryName(country)}. ${w.why}` : w.why}{!w.can && w.days ? ` It takes about ${w.days} days to decide.` : ''}</p>
      {!w.can && w.route && <button className="btn" disabled={!!no} onClick={() => setErr(store.act((s) => void applyForPermit(s, country)))}>Apply For The Permit</button>}
      {!w.can && no && w.route && <p className="dim small">{no}</p>}
      {permits(g).length > 0 && (
        <ul className="list small" aria-label="Your Permits">
          {permits(g).map((p) => (
            <li key={p.id} className="list-item"><span className="grow">{countryName(p.country)}: {p.route}</span><span>{p.status === 'granted' && (p.expiresAt ?? 0) <= g.now ? 'Expired' : STATUS[p.status]}{p.status === 'granted' && p.expiresAt ? `, until ${formatDateKey(dateKey(p.expiresAt, zone))}` : p.status === 'pending' ? `, by ${formatDateKey(dateKey(p.decideAt, zone))}` : ''}</span></li>
          ))}
        </ul>
      )}
      <p className="dim small">From an older record of each country&apos;s rules, not checked again. Where a route&apos;s time isn&apos;t recorded the game takes 30 days, and a permit lasts a year here; fees aren&apos;t charged, as the game holds no exchange rates.</p>
      {err && <p className="error" role="alert">{err}</p>}
    </section>
  );
}
