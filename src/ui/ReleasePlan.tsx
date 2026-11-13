// The Release Plan on a delivered project's Release page (engine/release-plan.ts; the owner's v5 brief, 6): the routes
// intended and their terms, then each route worked as it is: a licence proposal a buyer answers, or a release you run
// yourself with every cost named before it is booked.
import { useState } from 'react';
import { money } from '../engine/budget';
import { isEpisodic } from '../engine/projects';
import {
  AGENT_SHARE, BUYERS, BUYER_BAR, PLAN_ORDER, PLAN_ROUTES, SALES_AGENT, alternatives, buyerValue, planOf, planRefusal, planWords, proposalRefusal, proposeLicence,
  releaseYourself, selfCosts, selfRefusal, setReleasePlan, type SelfRoute,
} from '../engine/release-plan';
import { formatDateKey } from '../engine/time';
import type { BuyerRoute, PlanRoute, Project, ReleasePlan as Plan } from '../engine/types';
import { countryName } from '../world/gazetteer/gazetteer';
import { Check, NumberField, SelectField, TextField } from './components';
import { store, useGame } from './store';

const codes = (text: string) => text.split(/[\s,]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
const STATUS: Record<string, string> = { sent: 'Waiting For An Answer', accepted: 'Accepted', countered: 'Countered', rejected: 'Turned Down' };

export function ReleasePlanCard({ p }: { p: Project }) {
  const g = useGame();
  const saved = planOf(g, p);
  const [routes, setRoutes] = useState<PlanRoute[]>(saved.routes);
  const [terr, setTerr] = useState(saved.territories.join(', '));
  const [date, setDate] = useState(saved.date);
  const [until, setUntil] = useState(saved.festivalUntil ?? saved.date);
  const [version, setVersion] = useState<Plan['version']>(saved.version);
  const [promo, setPromo] = useState(saved.promo);
  const [err, setErr] = useState<string | null>(null);
  if (!p.delivered) return null;
  const draft = { routes, territories: codes(terr), date, festivalUntil: routes.includes('festival-first') ? until : null, version, promo };
  const no = planRefusal(g, p, draft);
  const plan = p.releasePlan;
  const episodic = isEpisodic(p.axes.format);
  const toggle = (r: PlanRoute, on: boolean) => setRoutes(on ? [...routes, r] : routes.filter((x) => x !== r));
  return (
    <section className="card" aria-labelledby="plan-h">
      <h2 id="plan-h">Release Plan</h2>
      <p className="muted">Choose the routes you intend, where and when. A buyer must accept a licence, so a proposal can be turned down. The routes you run yourself have their own requirements and costs. Buyers, the sales agent and the services are fictional, and amounts are game calibration.</p>
      <fieldset className="stack">
        <legend>Intended Routes</legend>
        {PLAN_ORDER.filter((r) => !(episodic && PLAN_ROUTES[r].films)).map((r) => (
          <Check key={r} label={PLAN_ROUTES[r].label} hint={PLAN_ROUTES[r].how} checked={routes.includes(r)} onChange={(on) => toggle(r, on)} />
        ))}
      </fieldset>
      <div className="inline-form">
        <TextField label="Plan Territories" value={terr} hint="Two-letter country codes, separated by commas, such as GB, IE." onChange={setTerr} />
        <TextField label="First Public Date" type="date" value={date} onChange={setDate} />
        {routes.includes('festival-first') && <TextField label="Held For Festivals Until" type="date" value={until} onChange={setUntil} />}
        <SelectField label="Version Abroad" value={version} options={[{ value: 'subtitled', label: 'Subtitled' }, { value: 'dubbed', label: 'Dubbed, At Your Cost' }]} onChange={setVersion} />
        <NumberField label="Promotion Budget" value={promo} min={0} max={10_000_000} onChange={setPromo} />
      </div>
      <button className="btn btn-primary" disabled={!!no} onClick={() => setErr(store.act((s) => void setReleasePlan(s, s.projects.find((x) => x.id === p.id)!, draft)))}>{plan ? 'Update The Plan' : 'Save The Plan'}</button>
      {no && <p className="dim small">{no}</p>}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      {plan && (
        <>
          <ul className="list" aria-label="The Plan">{planWords(plan).map((w) => <li key={w} className="list-item">{w}</li>)}</ul>
          {plan.routes.filter((r) => PLAN_ROUTES[r].kind === 'buyer').map((r) => <Proposals key={r} p={p} route={r as BuyerRoute} />)}
          {plan.routes.filter((r) => PLAN_ROUTES[r].kind === 'self').map((r) => <SelfRelease key={r} p={p} route={r as SelfRoute} />)}
          {plan.routes.includes('festival-first') && <p className="dim">Enter festivals from the Festivals page. Nothing is released publicly before {formatDateKey(plan.festivalUntil!)}.</p>}
        </>
      )}
    </section>
  );
}

function Proposals({ p, route }: { p: Project; route: BuyerRoute }) {
  const g = useGame();
  const plan = p.releasePlan!;
  const [buyer, setBuyer] = useState(BUYERS[route][0]);
  const [ask, setAsk] = useState(0);
  const [exclusive, setExclusive] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = { route, buyer, territories: plan.territories, ask, exclusive };
  const no = proposalRefusal(g, p, input);
  const comparable = Math.round(buyerValue(p, route, plan.territories, exclusive) / 5000) * 5000;
  const sent = plan.proposals.filter((x) => x.route === route);
  const label = PLAN_ROUTES[route].label;
  return (
    <div role="region" aria-label={`${label} Proposals`} className="stack">
      <h3>{label}</h3>
      <p className="dim small">{route === 'streaming-licence' ? `${SALES_AGENT}, a sales agent, sends it and takes ${Math.round(AGENT_SHARE * 100)}% of the fee. ` : ''}Buyers of this kind take work received at {BUYER_BAR[route]} or better. Rights like these, for {plan.territories.map(countryName).join(', ')}, sell for about {money(comparable)}. A buyer answers in three or four weeks.</p>
      <div className="inline-form">
        <SelectField label={`${label}: Buyer`} value={buyer} options={BUYERS[route].map((b) => ({ value: b, label: b }))} onChange={setBuyer} />
        <NumberField label={`${label}: Your Ask`} value={ask} min={0} max={100_000_000} onChange={setAsk} />
        <Check label={`${label}: Exclusive`} checked={exclusive} onChange={setExclusive} />
        <button className="btn" disabled={!!no} onClick={() => { const e = store.act((s) => void proposeLicence(s, s.projects.find((x) => x.id === p.id)!, input)); setErr(e); if (!e) setAsk(0); }}>Send The Proposal</button>
      </div>
      {no && ask > 0 && <p className="dim small">{no}</p>}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      {sent.length > 0 && (
        <ul className="list" aria-label={`${label}: Sent`}>
          {sent.map((x) => (
            <li key={x.id} className="list-item">
              <div><strong>{x.buyer}</strong>: {money(x.ask)}{x.exclusive ? ', exclusive' : ''}, sent {formatDateKey(new Date(x.sentAt).toISOString().slice(0, 10))}. <span className="chip">{STATUS[x.status]}</span></div>
              {x.answer && <p className="small">{x.answer}{x.offerId ? ' Its offer is under Distribution Offers: accept it there to sign.' : ''}</p>}
              {x.status === 'rejected' && <ul className="dim small" aria-label="What Remains">{alternatives(p, x).map((a) => <li key={a}>{a}</li>)}</ul>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SelfRelease({ p, route }: { p: Project; route: SelfRoute }) {
  const g = useGame();
  const plan = p.releasePlan!;
  const [err, setErr] = useState<string | null>(null);
  const costs = selfCosts(p, route, plan.territories, plan.promo);
  const no = selfRefusal(g, p, route);
  const label = PLAN_ROUTES[route].label;
  const verb = route === 'partner-theatrical' ? 'Book The Service Deal' : route === 'transactional' ? 'Release Through The Aggregator' : 'Open Your Storefront';
  return (
    <div role="region" aria-label={label} className="stack">
      <h3>{label}</h3>
      <ul className="list" aria-label={`${label}: Costs`}>
        {costs.map((c) => <li key={c.label} className="list-item"><span className="grow">{c.label}</span><span>{money(c.amount)}, {c.when === 'now' ? 'paid when booked' : 'paid on release'}</span></li>)}
      </ul>
      <button className="btn" disabled={!!no} onClick={() => setErr(store.act((s) => void releaseYourself(s, s.projects.find((x) => x.id === p.id)!, route)))}>{verb}</button>
      {no && <p className="dim small">{no}</p>}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </div>
  );
}
