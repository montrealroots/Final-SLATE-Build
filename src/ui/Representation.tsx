// Representation on the screens (engine/representation.ts): the card on the Profile page, where an agent is found,
// signed with, renewed and given notice, with their submissions and their commission; and the line on the Budget
// page's backers where the agent is asked to submit a project.
import { useState } from 'react';
import { BACKERS, money } from '../engine';
import {
  AGENTS, MANDATE_OPEN_DAYS, NOTICE_DAYS, agentById, agentRead, approachAgent, approachRefusal, commissionStatement, commissionTotal, declineMandate, giveNotice, mandateTerms,
  renewMandate, renewRefusal, representedBy, signWith, submissions, submitRefusal, submitThrough, type Agent, type PlacedKind,
} from '../engine/representation';
import { currentZone } from '../engine';
import type { FinanceDeal, Project } from '../engine/types';
import { Modal, longLocal } from './components';
import { store, useGame } from './store';

const pct = (rate: number) => `${Math.round(rate * 1000) / 10}%`;
const DEAL_WORD: Record<FinanceDeal['status'], string> = { considering: 'Being Read', offered: 'Offer Open', declined: 'They Said No', refused: 'You Turned It Down', accepted: 'Signed', breached: 'Ended Unmet', lapsed: 'Offer Lapsed', withdrawn: 'Withdrawn' };

function Terms({ agent }: { agent: Agent }) {
  return <ul className="dim">{mandateTerms(agent).map((t) => <li key={t}>{t}</li>)}</ul>;
}

/** The Profile page's card. */
export function RepresentationCard() {
  const g = useGame();
  const [finding, setFinding] = useState(false);
  const [ending, setEnding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const zone = currentZone(g);
  const day = (at: number) => longLocal(at, zone).date;
  const cur = representedBy(g);
  const r = g.representation;
  const offer = r?.approaches.find((a) => a.status === 'offered');
  const asked = r?.approaches.find((a) => a.status === 'asked');
  const last = !cur && !offer && !asked ? [...(r?.approaches ?? [])].reverse().find((a) => a.status === 'declined' || a.status === 'lapsed') : undefined;
  const act = (fn: Parameters<typeof store.act>[0]) => setErr(store.act(fn));
  const theirs = cur ? submissions(g, cur.agent.id) : [];
  const statement = commissionStatement(g);
  return (
    <section className="card" aria-labelledby="rep-h">
      <h2 id="rep-h">Representation</h2>
      {cur ? (
        <>
          <p><strong>{cur.agent.name}</strong>, {cur.agent.agency}, represents you until {day(cur.until)}.{r?.current?.renewed ? ` You have renewed ${r.current.renewed === 1 ? 'once' : `${r.current.renewed} times`}.` : ''}{cur.noticeUntil ? ` You gave notice: it ends on ${day(cur.noticeUntil)}, and they make no new submissions.` : ''}</p>
          <details className="small"><summary>The Terms You Signed</summary><Terms agent={cur.agent} /></details>
          {r?.current?.renewal && !cur.noticeUntil && <p className="muted">Asked on {day(r.current.renewal.at)}: {r.current.renewal.reason}</p>}
          <div className="row gap-2 wrap spaced">
            {r?.current?.renewal?.willing && !renewRefusal(g) && <button className="btn btn-sm btn-primary" onClick={() => act((s) => renewMandate(s))}>Renew For Twelve Months</button>}
            {!cur.noticeUntil && <button className="btn btn-sm" onClick={() => setEnding(true)}>Give Notice</button>}
          </div>
          <h3>What They Have Submitted</h3>
          {theirs.length ? (
            <ul className="list">
              {theirs.map(({ p, d }) => (
                <li key={d.id}>
                  <strong><button className="link" onClick={() => store.go({ view: 'project', projectId: p.id, tab: 'budget' })}>{p.title}</button></strong> to the {BACKERS[d.kind as PlacedKind].name.toLowerCase()}, {day(d.askedAt)} <span className="chip">{DEAL_WORD[d.status]}</span>
                  {d.status === 'offered' || d.status === 'accepted' ? <div className="dim">{money(d.amount)}{d.status === 'accepted' ? `; ${money(d.received)} of it has arrived` : ''}.</div> : d.reason ? <div className="dim">{d.reason}</div> : null}
                </li>
              ))}
            </ul>
          ) : <p className="muted">Nothing yet. Ask them from a project's Budget page, under Raise Money: they submit the project as it stands, with the documents the backer asks for.</p>}
        </>
      ) : offer ? (
        <>
          <p><strong>{agentById(offer.agentId).name}</strong> of {agentById(offer.agentId).agency} offers to represent you. {offer.reason}{offer.openUntil ? ` The offer is open until ${day(offer.openUntil)}.` : ''}</p>
          <Terms agent={agentById(offer.agentId)} />
          <div className="row gap-2 wrap">
            <button className="btn btn-sm btn-primary" onClick={() => act((s) => signWith(s, offer.agentId))}>Sign With {agentById(offer.agentId).name}</button>
            <button className="btn btn-sm" onClick={() => act((s) => declineMandate(s, offer.agentId))}>Decline</button>
          </div>
        </>
      ) : (
        <>
          <p className="muted">Nobody represents you. An agent submits your projects to backers and negotiates the offers that come of it, for a share of the money those deals pay in. A commissioner reads an agent's submission before you have delivered anything.</p>
          {asked && <p>You asked {agentById(asked.agentId).name} on {day(asked.at)}. Their answer is due {day(asked.answerAt)}.</p>}
          {last && <p className="dim">{agentById(last.agentId).name}: {last.status === 'lapsed' ? `their offer lapsed after ${MANDATE_OPEN_DAYS} days.` : last.reason}</p>}
          <button className="btn btn-sm" onClick={() => setFinding(true)}>Find An Agent</button>
        </>
      )}
      {statement.length > 0 && (
        <>
          <h3>Commission Paid</h3>
          <p className="dim small">Each line is on its project's own budget. {money(commissionTotal(g))} in all.</p>
          <ul className="list">{statement.map((x) => <li key={`${x.dealId}:${x.at}`}>{day(x.at)}: {money(x.amount)} on {x.title}, from the {x.backer.toLowerCase()}.</li>)}</ul>
        </>
      )}
      {(r?.past.length ?? 0) > 0 && <p className="dim small">Before: {r!.past.map((x) => `${agentById(x.agentId).name}, ${day(x.from)} to ${day(x.to)} (${x.how === 'notice' ? 'ended on notice' : 'ran out'})`).join('; ')}.</p>}
      {err && <p role="alert" className="error">{err}</p>}
      {finding && (
        <Modal title="Find An Agent" kind="agent-list" onClose={() => setFinding(false)} footer={<button className="btn" onClick={() => setFinding(false)}>Close</button>}>
          <p className="muted">Each says what they need to see before they take someone on. An approach is answered in about three days, from your record as it stands that day. One approach at a time, and one agent at a time.</p>
          <ul className="list spaced">
            {AGENTS.map((a) => {
              const read = agentRead(g, a);
              const no = approachRefusal(g, a.id);
              return (
                <li key={a.id} className="row-wrap">
                  <div className="grow">
                    <strong>{a.name}</strong>, {a.agency} <span className="chip">{pct(a.rate)} Commission</span>
                    <div className="dim">Takes on: {a.takesOn} {a.standsAside ? `Stands aside from ${BACKERS[a.standsAside.kind].name.toLowerCase()}s.` : 'Declares no conflict.'}</div>
                    <div className="dim">On your record today: {read.takes ? 'they would say yes. ' : 'they would say no. '}{read.reason}</div>
                    {no && <div className="dim">{no}</div>}
                  </div>
                  <button className="btn btn-sm" disabled={!!no} aria-label={`Approach ${a.name}`} onClick={() => { const e = store.act((s) => void approachAgent(s, a.id)); setErr(e); if (!e) setFinding(false); }}>Approach</button>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}
      {ending && cur && (
        <Modal title="Give Notice?" kind="agent-notice" onClose={() => setEnding(false)} footer={<>
          <button className="btn" onClick={() => setEnding(false)}>Keep Them</button>
          <button className="btn btn-danger" onClick={() => { act((s) => giveNotice(s)); setEnding(false); }}>Give {NOTICE_DAYS} Days' Notice</button>
        </>}>
          <p>{cur.agent.name} represents you for {NOTICE_DAYS} more days, or until the term ends if that is sooner, and makes no new submissions in that time.</p>
          <p className="dim">{theirs.filter(({ d }) => ['considering', 'offered', 'accepted'].includes(d.status) && d.received < d.amount).length > 0 ? 'Deals they already submitted stay theirs: their commission is due as that money arrives.' : 'They have no open submissions, so nothing further would be owed.'} After that you can approach another agent.</p>
        </Modal>
      )}
    </section>
  );
}

/** Under a backer on the Budget page: ask the agent to submit this project there, with what it would cost said first. */
export function AgentSubmit({ p, kind, onError }: { p: Project; kind: string; onError: (e: string | null) => void }) {
  const g = useGame();
  const cur = representedBy(g);
  if (!cur || !['investor', 'co-producer', 'commissioner'].includes(kind)) return null;
  const k = kind as PlacedKind;
  const no = submitRefusal(g, p, k);
  const name = BACKERS[k].name;
  return (
    <div className="row-wrap" role="group" aria-label={`${cur.agent.name} And The ${name}`}>
      <span className="grow dim small">
        {no ?? `${cur.agent.name} can submit this for you. If it is signed, ${pct(cur.agent.rate)} of the money as it arrives is their commission, and the offer is theirs to help negotiate.`}
      </span>
      {!no && <button className="btn btn-sm" aria-label={`Ask ${cur.agent.name} To Submit To The ${name}`} onClick={() => onError(store.act((s) => void submitThrough(s, s.projects.find((x) => x.id === p.id)!, k)))}>Ask {cur.agent.name} To Submit</button>}
    </div>
  );
}

/** On a deal the agent submitted: who, and what is theirs of it. */
export function viaLine(d: FinanceDeal): string | null {
  return d.via ? `Submitted by ${d.via.name}. ${pct(d.via.rate)} of what it pays in is their commission, taken as each payment arrives${d.status === 'offered' ? `: ${money(Math.round(d.amount * d.via.rate))} if all of it is paid` : ''}.` : null;
}
