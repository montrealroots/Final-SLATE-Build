// Your papers (engine/papers.ts; the owner's command of November 14, 2026, 4 and 5): your passports, what visiting a
// country asks of you, what working there asks for each kind of work, and what you have applied for. Each line says
// where its answer comes from; nothing the game hasn't confirmed is called ready.
import { useState, type ReactNode } from 'react';
import { ACTIVITY_WORDS, applications, applyForPermit, homeVisa, applyForRecordedPassport, applyForVisa, entryRight, passportOffers, passports, permitCheck, permits, visaCheck, workRight, type Activity, type ApplicationCheck } from '../engine/papers';
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

/** How long a permission lasts, in the words a person uses: "10 years", "6 months", "90 days". */
const lasts = (d: number) => (d >= 360 ? `${Math.round(d / 365.25)} year${Math.round(d / 365.25) === 1 ? '' : 's'}` : d >= 60 && d % 30 < 3 ? `${Math.round(d / 30)} months` : `${d} days`);

/** An application's terms in a sentence: its fee, its decision time and how long it lasts, and where the figures come from. */
function TermsLine({ c }: { c: Extract<ApplicationCheck, { ok: true }> }) {
  const t = c.terms;
  return (
    <p className="small">
      {t.route}: {c.feeText}, decided in {t.daysText}{t.stayDays ? `, good for ${lasts(t.stayDays)}` : ''}. You need: {c.needs.join('; ')}.{' '}
      {t.estimate ? <span className="dim">{t.basis}</span> : <>{t.basis} {t.sources.map((x, i) => <a key={i} href={x.url} target="_blank" rel="noreferrer" className="dim">{x.kind === 'official' ? 'Official source' : 'Source'}{t.sources.length > 1 ? ` ${i + 1}` : ''}</a>).reduce<ReactNode[]>((a, x, i) => (i ? [...a, ', ', x] : [x]), [])}</>}
    </p>
  );
}

export function PapersCard() {
  const g = useGame();
  const [country, setCountry] = useState(g.character.nationalities?.includes('US') ? 'GB' : 'US');
  const [err, setErr] = useState<string | null>(null);
  const zone = getPlace(g.character.livesIn ?? g.locationId).zone;
  const day = (t: number) => formatDateKey(dateKey(t, zone));
  const person = g.bank ? bankSim(g.bank).player : undefined;
  const office = person ? passportOffice(person, g.now) : undefined;
  const rule = person ? passportRuleFor(person) : undefined;
  const passportNo = person ? passportRefusal(person) : 'This story has no papers yet.';
  const enter = entryRight(g, country);
  const liveHere = getPlace(g.character.livesIn ?? g.locationId).country === country;
  const homeCheck = liveHere ? permitCheck(g, country) : ({ ok: false, why: '' } as ApplicationCheck);
  const visa = visaCheck(g, country);
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
                <span className="grow">{o.route.speed === 'urgent' ? 'Urgent' : 'Standard'}, {o.route.where === 'home' ? 'at home' : 'from abroad'}: {o.fee ? formatMoney(o.fee.minor, o.fee.currency) : ''}{o.estimated.includes('the fee') ? ' (estimate)' : ''}, {o.route.within ? `ready in ${o.route.within.n} ${o.route.within.unit}${o.route.within.n === 1 ? '' : 's'}` : ''}{o.estimated.includes('how long it takes') ? ' (estimate)' : ''}{o.pages ? `, ${o.pages} pages` : ''}{o.validYears ? `, valid ${o.validYears} years` : ''}</span>
                {o.basis && <span className="dim">{o.basis}</span>}
                <button className="btn btn-sm" aria-label={`Apply: ${o.route.id}`} onClick={() => setErr(store.act((s) => applyForRecordedPassport(s, i)))}>Apply</button>
              </li>
            ))}
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
            <TermsLine c={visa} />
            <button className="btn btn-sm" onClick={() => setErr(store.act((s) => void applyForVisa(s, country)))}>Apply And Pay The Fee</button>
          </>
        ) : <p className="dim small">{visa.why}</p>)}
        <h3>Working</h3>
        {/* Where you live, one work visa covers all four kinds of work and your stay: one place to apply, or to renew it as its end nears. */}
        {liveHere && homeCheck.ok && (
          <div className="col">
            <p className="small" style={{ margin: 0 }}><strong>{homeVisa(g) ? 'Renew Your Work Visa' : 'Your Work Visa'}:</strong> it covers acting, directing, producing and writing, and your stay.</p>
            <TermsLine c={homeCheck} />
            <button className="btn btn-sm" onClick={() => setErr(store.act((s) => void applyForPermit(s, country)))}>{homeVisa(g) ? 'Renew And Pay The Fee' : 'Apply And Pay The Fee'}</button>
          </div>
        )}
        {liveHere && !homeCheck.ok && !workRight(g, country).can && <p className="dim small">{homeCheck.why}</p>}
        <ul className="list small" aria-label="Working">
          {ACTIVITIES.map(({ value, label }) => {
            const work = workRight(g, country, value);
            const permit = liveHere || work.can ? null : permitCheck(g, country, value);
            return (
              <li key={value} className="list-item list-static col">
                <span className="grow"><strong>{label}:</strong> {work.can ? 'Allowed. ' : 'Not allowed yet. '}{work.why}</span>
                {permit && (permit.ok ? (
                  <>
                    <TermsLine c={permit} />
                    <button className="btn btn-sm" aria-label={`Apply For A Permit: ${label}`} onClick={() => setErr(store.act((s) => void applyForPermit(s, country, value)))}>Apply And Pay The Fee</button>
                  </>
                ) : <span className="dim">{permit.why}</span>)}
              </li>
            );
          })}
        </ul>
        {err && <p className="error" role="alert">{err}</p>}
      </section>

      {(applications(g).length > 0 || permits(g).length > 0) && (
        <section className="card" aria-labelledby="applied-h">
          <h2 id="applied-h">What You Applied For</h2>
          <ul className="list small" aria-label="Your Applications">
            {applications(g).map((a) => (
              <li key={a.id} className="list-item list-static">
                <span className="grow">{a.route}{a.kind === 'permit' && a.activity ? ` (${ACTIVITY_WORDS[a.activity]})` : ''}, {countryName(a.country)}: {formatMoney(a.fee.minor, a.fee.currency)} paid{a.estimate ? ', on the game\'s estimate' : ''}</span>
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
      <p className="dim small">From SLATE-REBUILD&apos;s records of who may visit and work where, 1221&apos;s passport offices and visitor visas, and fees and times researched on November 14, 2026. Where no research gives a fee or a time yet, the game estimates it from the researched ones on the same continent and says so.</p>
    </>
  );
}
