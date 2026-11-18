// First-look deals on screen (engine/first-look.ts; the owner's v5 brief, 5). The Profile card is where an offer is read in
// full and accepted, declined or bargained over, and where a running deal's term, money and submissions are followed.
// The Budget card is where a covered project's place under the deal shows, and where development money goes in.
import { useState } from 'react';
import { money } from '../engine/budget';
import {
  acceptFirstLook, activeFirstLook, askMoreOverhead, askToMatch, declineFirstLook, developmentRefusal, drawDevelopment, endFirstLook, firstLookWords, firstLooks, fundLeft,
  matchRefusal, openFirstLookOffers, submissionStanding,
  dealName, scopeOf,
} from '../engine/first-look';
import { TV_FORMATS } from '../engine/blueprints';
import { deals, submitSeries } from '../engine/finance';
import { formatDateKey } from '../engine/time';
import type { Project } from '../engine/types';
import { NumberField } from './components';
import { store, useGame } from './store';

// Written out, as the rest of the game writes dates (until November 14, 2026 these were ISO keys, 2026-05-11).
const day = (t: number) => formatDateKey(new Date(t).toISOString().slice(0, 10));
const STAGE: Record<string, string> = { 'not-submitted': 'Not submitted yet', considering: 'Considering', offered: 'Offered: answer it on the project\'s Budget page', taken: 'Taken', turnaround: 'Passed: free to take elsewhere' };

export function FirstLookCard() {
  const g = useGame();
  const [err, setErr] = useState<string | null>(null);
  // One offer, or two studios bidding at once (from November 18, 2026), each read and answered on its own.
  const offers = openFirstLookOffers(g);
  const fl = activeFirstLook(g);
  const past = firstLooks(g).filter((x) => !offers.includes(x) && x !== fl);
  if (!offers.length && !fl && !past.length) return null;
  // An overall deal (from November 17, 2026) is shown as one: pay a year for your services, not overhead a month.
  const overall = (offers[0] ?? fl)?.terms.overall;
  const figure = (t: (typeof offers)[number]['terms']) => (t.overall ? `${money(t.overall.annual)} a year` : `${money(t.overhead)} a month`);
  return (
    <section className="card" aria-labelledby="firstlook-h">
      <h2 id="firstlook-h">{overall ? 'Overall Deal' : 'First-Look Deal'}</h2>
      {offers.length > 1 && <p className="small">Two studios want your work. Weigh them, ask one to match the other, and sign one: signing turns the other down.</p>}
      {offers.map((offer) => {
        const rival = offers.find((x) => x.id === offer.competing);
        const noMatch = matchRefusal(g, offer);
        return (
        <div key={offer.id} role="region" aria-label={`${offer.terms.overall ? 'Overall Deal Offer' : 'First-Look Offer'}${offers.length > 1 ? ` From ${offer.name}` : ''}`}>
          <p><strong>{offer.name}</strong> offers you {offer.terms.overall ? 'an overall deal' : 'a first-look deal'}{offer.renews ? ', renewing the last one' : ''}. {offer.why}</p>
          <ul className="list" aria-label="Its Terms">{firstLookWords(offer).map((w) => <li key={w} className="list-item">{w}</li>)}</ul>
          {offer.counter && <p className="dim small">{offer.counter.outcome === 'agreed' ? `It ${offer.counter.match ? 'matched' : 'agreed to'} ${figure(offer.terms)}.` : offer.counter.outcome === 'held' ? `It kept its offer of ${figure(offer.terms)}.` : `You asked ${offer.counter.match ? 'it to match' : 'for more'}. It answers by ${day(offer.counter.answerAt)}.`}</p>}
          <p className="dim small">The offer expires on {day(offer.answerBy)}. Nothing binds you until you accept. Amounts are game calibration by the company's recorded scale, not its real terms.</p>
          <div className="row gap-2 wrap">
            <button className="btn primary" disabled={!!fl || (!!offer.counter && !offer.counter.outcome)} aria-label={`${offer.terms.overall ? 'Accept The Overall Deal' : 'Accept The First-Look Deal'}${offers.length > 1 ? ` From ${offer.name}` : ''}`} onClick={() => setErr(store.act((s) => acceptFirstLook(s, offer.id)))}>{offer.terms.overall ? 'Accept The Overall Deal' : 'Accept The First-Look Deal'}</button>
            <button className="btn" disabled={!!offer.counter} onClick={() => setErr(store.act((s) => askMoreOverhead(s, offer.id)))}>{offer.terms.overall ? 'Ask For More A Year' : `Ask For ${money(Math.round(offer.terms.overhead * 1.5))} A Month`}</button>
            {rival && <button className="btn" disabled={!!noMatch} title={noMatch ?? undefined} onClick={() => setErr(store.act((s) => askToMatch(s, offer.id)))}>Ask {offer.name} To Match {rival.name}</button>}
            <button className="btn" aria-label={`Decline${offers.length > 1 ? ` ${offer.name}'s Offer` : ''}`} onClick={() => setErr(store.act((s) => declineFirstLook(s, offer.id)))}>Decline</button>
          </div>
          {rival && noMatch && !offer.counter && <p className="dim small">{noMatch}</p>}
        </div>
        );
      })}
      {fl && (
        <div role="region" aria-label={fl.terms.overall ? 'Your Overall Deal' : 'Your First-Look Deal'}>
          <p><strong>{fl.name}</strong>: {fl.terms.overall ? `${figure(fl.terms)} for your services, your work its alone,` : figure(fl.terms)} until {day(fl.endsAt!)}. {money(fundLeft(fl))} of development money left. It answers a submission in {fl.terms.considerDays} days.</p>
          {fl.submissions.length ? (
            <ul className="list" aria-label="Submitted To It">
              {fl.submissions.map((x) => {
                const p = g.projects.find((y) => y.id === x.projectId);
                const st = p && submissionStanding(g, p);
                const d = p && deals(p).find((y) => y.id === x.dealId);
                return <li key={x.dealId} className="list-item"><span className="grow">{p?.title ?? 'A project'}, submitted {day(x.at)}</span><span>{st ? STAGE[st.stage] : ''}{d?.status === 'considering' && d.decideAt ? `, answers by ${day(d.decideAt)}` : ''}</span></li>;
              })}
            </ul>
          ) : <p className="muted">{fl.terms.overall ? `Nothing submitted yet. Pitch a film to ${fl.name}, or submit a series to it, from the project's Budget page.` : scopeOf(fl.terms) === 'television' ? `Nothing submitted yet. Submit a covered series to ${fl.name} from its Budget page.` : `Nothing submitted yet. Submit a covered film by pitching it to ${fl.name} from its Budget page.`}</p>}
          <button className="btn" onClick={() => setErr(store.act((s) => endFirstLook(s, fl.id)))}>End The Deal Early</button>
        </div>
      )}
      {past.length > 0 && (
        <ul className="list" aria-label="Earlier Deals">
          {past.map((x) => <li key={x.id} className="list-item dim small">{x.name}, {dealName(x.terms)}: {x.status === 'declined' ? 'declined' : x.status === 'lapsed' ? 'lapsed unanswered' : x.status === 'ended-early' ? `ended early, ${day(x.endsAt!)}` : `ended ${day(x.endsAt!)}`}</li>)}
        </ul>
      )}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </section>
  );
}

/** On a project's Budget page: where the project stands under the deal, and development money in. */
export function FirstLookProjectCard({ p }: { p: Project }) {
  const g = useGame();
  const [amount, setAmount] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const st = submissionStanding(g, p);
  if (!st) return null;
  const no = developmentRefusal(g, p, amount);
  const drawn = st.fl.drawn.filter((x) => x.projectId === p.id).reduce((a, x) => a + x.amount, 0);
  const live = () => store.state!.projects.find((x) => x.id === p.id)!;
  // A series goes to the studio as a submission, a film as a pitch: an overall deal covers both (November 17, 2026).
  const tv = st.fl.terms.overall ? TV_FORMATS.includes(p.axes.format) : scopeOf(st.fl.terms) === 'television';
  const deal = dealName(st.fl.terms);
  return (
    <section className="card" aria-labelledby="firstlook-p-h">
      <h2 id="firstlook-p-h">{st.fl.terms.overall ? 'Overall Deal' : 'First Look'}: {st.fl.name}</h2>
      <p className="muted">
        {tv
          ? (st.stage === 'not-submitted' ? `Your ${deal} gives ${st.fl.name} the first chance at ${p.title}. Submit it to them before you take it to any commissioner; they have ${st.fl.terms.considerDays} days to answer.`
            : st.stage === 'considering' ? `${st.fl.name} is considering it until ${day(st.deal!.decideAt!)}. No commissioner can be approached for it until then.`
            : st.stage === 'offered' ? `${st.fl.name} offered to commission it. Accept or refuse it below.`
            : st.stage === 'taken' ? `${st.fl.name} commissioned it.`
            : `${st.fl.name} passed. You may take it to a commissioner${drawn ? `; if one takes it, the ${money(drawn)} of development money is repaid from its money` : ''}.`)
          : (st.stage === 'not-submitted' ? `Your ${deal} gives ${st.fl.name} the first chance at ${p.title}. Pitch it to them under Studios before any other studio; they have ${st.fl.terms.considerDays} days to answer.`
            : st.stage === 'considering' ? `${st.fl.name} is considering it until ${day(st.deal!.decideAt!)}. No other studio can be pitched it until then.`
            : st.stage === 'offered' ? `${st.fl.name} made an offer for it. Accept or refuse it below.`
            : st.stage === 'taken' ? `${st.fl.name} took it.`
            : `${st.fl.name} passed. You may take it to another studio${drawn ? `; if one takes it, the ${money(drawn)} of development money is repaid from its money` : ''}.`)}
      </p>
      {tv && st.fl.status === 'active' && st.stage === 'not-submitted' && (
        <div className="row gap-2 wrap">
          <button className="btn btn-primary" onClick={() => setErr(store.act((s) => void submitSeries(s, live())))}>Submit To {st.fl.name}</button>
        </div>
      )}
      {st.fl.status === 'active' && st.stage === 'not-submitted' && (
        <>
          <div className="inline-form">
            <NumberField label="Development Money From The Deal" value={amount} min={0} max={Math.max(0, fundLeft(st.fl))} onChange={setAmount} />
            <button className="btn" disabled={!!no} onClick={() => { const e = store.act((s) => void drawDevelopment(s, live(), amount)); setErr(e); if (!e) setAmount(0); }}>Put It In</button>
          </div>
          <p className="dim small">{no && amount > 0 ? no : `${money(fundLeft(st.fl))} left. Nobody is repaid from it unless ${st.fl.name} passes and another studio or a commissioner takes the project.`}</p>
        </>
      )}
      {drawn > 0 && <p className="dim small">{money(drawn)} of development money from {st.fl.name} is in it.</p>}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </section>
  );
}
