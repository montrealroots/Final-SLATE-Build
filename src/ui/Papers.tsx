// Your papers (engine/papers.ts; the owner's command of November 14, 2026, 4 and 5): your passports, what visiting a
// country asks of you, what working there asks for each kind of work, and what you have applied for. Each line says
// where its answer comes from; nothing the game hasn't confirmed is called ready.
import { useState } from 'react';
import { ACTIVITY_WORDS, applications, applyForRecordedPassport, applyForVisa, entryRight, passportOffers, passports, permits, visaCheck, workRight, type Activity } from '../engine/papers';
import { bankSim } from '../engine/bankworld';
import { passportOffice, passportRefusal, passportRuleFor } from '../engine/bankworld/systems/documents';
import { formatMoney } from '../engine/bankworld/core/money';
import { countryName } from '../world/gazetteer/gazetteer';
import { formatDateKey, dateKey } from '../engine/time';
import { getPlace } from '../data/places';
import { NATIONALITIES } from '../engine';
import { SelectField } from './components';
import { store, useGame } from './store';
import { run } from './bankworld/app/game-context';

const COUNTRIES = NATIONALITIES.map((c) => ({ value: c.code, label: c.name })).sort((a, b) => a.label.localeCompare(b.label));
const ACTIVITIES = (Object.keys(ACTIVITY_WORDS) as Activity[]).map((a) => ({ value: a, label: ACTIVITY_WORDS[a].replace(/^./, (x) => x.toUpperCase()) }));
const STAGE: Record<string, string> = { applied: 'Being decided', issued: 'Issued', expired: 'Expired' };

export function PapersCard() {
  const g = useGame();
  const [country, setCountry] = useState(g.character.nationalities?.includes('US') ? 'GB' : 'US');
  const [activity, setActivity] = useState<Activity>('act');
  const [err, setErr] = useState<string | null>(null);
  const zone = getPlace(g.character.livesIn ?? g.locationId).zone;
  const day = (t: number) => formatDateKey(dateKey(t, zone));
  const person = g.bank ? bankSim(g.bank).player : undefined;
  const office = person ? passportOffice(person, g.now) : undefined;
  const rule = person ? passportRuleFor(person) : undefined;
  const passportNo = person ? passportRefusal(person) : 'This story has no papers yet.';
  const enter = entryRight(g, country);
  const visa = visaCheck(g, country);
  const work = workRight(g, country, activity);
  return (
    <>
      <section className="card" aria-labelledby="passports-h">
        <h2 id="passports-h">Your Passports</h2>
        <p className="small">Citizen of {(g.character.nationalities ?? []).map(countryName).join(' and ') || 'nowhere recorded'}. A passport lets you travel. It doesn&apos;t let you stay or work anywhere.</p>
        <ul className="list small" aria-label="Your Passports">
          {passports(g).map(({ doc, inForce }) => (
            <li key={doc.id} className="list-item list-static">
              <span className="grow">{doc.name ?? 'Passport'} ({countryName(doc.issuer)}), number ending {String(doc.number ?? '').slice(-4)}</span>
              <span>{doc.status === 'pending' ? `Applied for${doc.readyAt ? `, ready by ${day(doc.readyAt)}` : ''}` : inForce ? `In force until ${day(doc.expiresAt!)}` : doc.status === 'lost' ? 'Reported lost' : 'Not in force'}</span>
            </li>
          ))}
          {!passports(g).length && <li className="list-item list-static">No passport on record.</li>}
        </ul>
        {rule && office && <p className="small">{rule.name}: {formatMoney(Math.round(office.fee * 100), office.currency)} from your bank, ready in about {office.days} days{rule.daysEstimated ? ' (an estimate)' : ''}. {rule.feeBasis}</p>}
        {rule ? (
          <>
            <button className="btn btn-sm" disabled={!!passportNo} onClick={() => { const r = run('documents.apply_passport', {}); setErr(r.ok ? null : r.error ?? null); }}>Apply For A Passport</button>
            {passportNo && <p className="dim small">{passportNo}</p>}
          </>
        ) : (
          // No 1221 office for your citizenship: SLATE-REBUILD's record of it, each route with its fee and time, or what's missing.
          <ul className="list small" aria-label="Ways To Get Your Passport">
            {passportOffers(g).map((o, i) => (
              <li key={`${o.route.id}-${i}`} className="list-item list-static">
                <span className="grow">{o.route.speed === 'urgent' ? 'Urgent' : 'Standard'}, {o.route.where === 'home' ? 'at home' : 'from abroad'}: {o.fee ? formatMoney(o.fee.minor, o.fee.currency) : 'fee not recorded'}, {o.route.within ? `ready in ${o.route.within.n} ${o.route.within.unit}${o.route.within.n === 1 ? '' : 's'}` : 'time not recorded'}{o.validYears ? `, valid ${o.validYears} years` : ''}</span>
                {o.missing.length ? <span className="dim">Not taken: {o.missing.join(' and ')} not recorded</span>
                  : <button className="btn btn-sm" aria-label={`Apply: ${o.route.id}`} onClick={() => setErr(store.act((s) => applyForRecordedPassport(s, i)))}>Apply</button>}
              </li>
            ))}
            {!passportOffers(g).length && <li className="list-item list-static">No record of your country&apos;s passport office for where you live.</li>}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="visit-h">
        <h2 id="visit-h">Visiting And Working</h2>
        <SelectField label="Country" value={country} options={COUNTRIES} onChange={(v) => { setCountry(v); setErr(null); }} />
        <h3>Entering And Staying</h3>
        <p role="status" aria-label="Entering" className="small">{enter.why}</p>
        {enter.kind === 'needs' && (visa.ok ? (
          <>
            <p className="small">{visa.rule.name}: {visa.feeText}, decided in {visa.rule.days} days. You need: {visa.needs.join('; ')}. {visa.rule.basis}</p>
            <button className="btn btn-sm" onClick={() => setErr(store.act((s) => void applyForVisa(s, country)))}>Apply And Pay The Fee</button>
          </>
        ) : <p className="dim small">{visa.why}</p>)}
        <h3>Working</h3>
        <SelectField label="Work" value={activity} options={ACTIVITIES} onChange={setActivity} />
        <p className="small">{work.can ? (work.assumed ? 'Allowed by the game\'s assumption. ' : 'Allowed. ') : 'Not allowed yet. '}{work.why}</p>
        {!work.can && work.missing.length > 0 && <p className="dim small">Not recorded: {work.missing.join(', ')}. The game doesn&apos;t make these up, so it can&apos;t take an application.</p>}
        {err && <p className="error" role="alert">{err}</p>}
      </section>

      {(applications(g).length > 0 || permits(g).length > 0) && (
        <section className="card" aria-labelledby="applied-h">
          <h2 id="applied-h">What You Applied For</h2>
          <ul className="list small" aria-label="Your Applications">
            {applications(g).map((a) => (
              <li key={a.id} className="list-item list-static">
                <span className="grow">{a.route}, {countryName(a.country)}: {formatMoney(a.fee.minor, a.fee.currency)} paid</span>
                <span>{STAGE[a.stage]}{a.stage === 'applied' ? `, by ${day(a.decideAt)}` : a.stage === 'issued' && a.expiresAt ? `, until ${day(a.expiresAt)}` : ''}</span>
              </li>
            ))}
            {permits(g).map((p) => (
              <li key={p.id} className="list-item list-static">
                <span className="grow">{p.route}, {countryName(p.country)} (from before November 14, 2026)</span>
                <span>{p.status === 'granted' && (p.expiresAt ?? 0) <= g.now ? 'Expired' : p.status === 'granted' ? `Granted, until ${day(p.expiresAt!)}` : p.status === 'pending' ? `Being decided, by ${day(p.decideAt)}` : 'Refused'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="dim small">From SLATE-REBUILD&apos;s records of who may visit and work where, and 1221&apos;s passport offices and visitor visas. A fee or a time the records don&apos;t give isn&apos;t made up: the game says so instead.</p>
    </>
  );
}
