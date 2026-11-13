// Work for others on screen (engine/jobs.ts; the v4 package, 01). Profile lists offers with their days, pay and who
// found them; work taken, with Withdraw and what it costs; and the credits it earned. The productions are invented by
// the game and say so.
import { Fragment, useState } from 'react';
import { money } from '../engine/budget';
import { formatDateKey } from '../engine/time';
import { JOB_ROLES, acceptJob, acceptRefusal, askBetterRate, declineJob, evidenceFor, jobCredits, withdrawJob, type JobRole, type OutsideJob } from '../engine/jobs';
import { PRODUCTION_KIND_LABELS, productionById } from '../engine/productions';
import { reputation } from '../engine/reputation';
import { qualityWords } from '../engine/finish';
import { agentById } from '../engine/representation';
import { store, useGame } from './store';

const span = (j: OutsideJob) => `${j.days.length} ${j.days.length === 1 ? 'day' : 'days'}, ${formatDateKey(j.days[0])} to ${formatDateKey(j.days.at(-1)!)}`;

/** The production a job is on: its kind, genre and dates, as the game keeps them. */
function ProductionLine({ j }: { j: OutsideJob }) {
  const g = useGame();
  const p = j.productionId ? productionById(g, j.productionId) : undefined;
  if (!p) return null;
  if (p.cancelled) return <div className="dim small">{PRODUCTION_KIND_LABELS[p.kind]}, {p.genre}: cancelled before it shot.</div>;
  return <div className="dim small">{PRODUCTION_KIND_LABELS[p.kind]}{p.episodes ? ` of ${p.episodes} episodes` : ''}, {p.genre}: it shoots {formatDateKey(p.shootsFrom)} to {formatDateKey(p.wrapsOn)} and comes out {formatDateKey(p.releasesOn)}.{p.delayedDays ? ` Put back ${p.delayedDays} days.` : ''}</div>;
}

export function WorkForOthersCard() {
  const g = useGame();
  const [err, setErr] = useState<string | null>(null);
  const offers = (g.jobs ?? []).filter((j) => j.status === 'offered');
  const taken = (g.jobs ?? []).filter((j) => j.status === 'accepted');
  const credits = jobCredits(g);
  return (
    <section className="card" aria-labelledby="jobs-h">
      <h2 id="jobs-h">Work For Others</h2>
      {!offers.length && !taken.length && !credits.length && <p className="muted">Offers of paid work on other people's productions come after your own work is seen, or through an agent. None yet.</p>}
      {offers.length > 0 && (
        <ul className="list" aria-label="Offers Of Work">
          {offers.map((j) => {
            const no = acceptRefusal(g, j.id);
            return (
              <li key={j.id} className="list-item" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <strong>{JOB_ROLES[j.role].label}: {j.production}</strong> <span className="dim small">({j.company}; an invented production)</span>
                  <ProductionLine j={j} />
                  {j.part && <div className="small"><strong>{j.part}.</strong> {j.material} {j.requirement}</div>}
                  <div className="small">{span(j)}, {money(j.dayRate)} a day: {money(j.dayRate * j.days.length)} if every day is worked{j.viaAgent ? `, less ${Math.round(j.viaAgent.rate * 100)}% to ${agentById(j.viaAgent.agentId).name}, who found it` : ''}.</div>
                  {j.role !== 'acting' && <div className="dim small">{evidenceFor(g, j.role)}</div>}
                  {j.counter && <div className="dim small">{j.counter.outcome === 'agreed' ? `It agreed to ${money(j.dayRate)} a day.` : j.counter.outcome === 'held' ? `It kept its rate of ${money(j.dayRate)} a day.` : `You asked for ${money(j.counter.rate)} a day; it answers in a couple of days.`}</div>}
                  {no && <div className="dim small">{no}</div>}
                </div>
                <button className="btn btn-sm btn-primary" disabled={!!no} aria-label={`Accept ${j.production}`} onClick={() => setErr(store.act((s) => acceptJob(s, j.id)))}>Accept</button>
                <button className="btn btn-sm" disabled={!!j.counter} aria-label={`Ask For ${money(Math.round(j.dayRate * 1.2))} A Day On ${j.production}`} onClick={() => setErr(store.act((s) => askBetterRate(s, j.id)))}>Ask For {money(Math.round(j.dayRate * 1.2))} A Day</button>
                <button className="btn btn-sm" aria-label={`Decline ${j.production}`} onClick={() => setErr(store.act((s) => declineJob(s, j.id)))}>Decline</button>
              </li>
            );
          })}
        </ul>
      )}
      {taken.length > 0 && (
        <ul className="list" aria-label="Work You Have Taken">
          {taken.map((j) => (
            <li key={j.id} className="list-item" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}>
              <div className="grow" style={{ minWidth: 0 }}>
                <strong>{JOB_ROLES[j.role].label}: {j.production}</strong>
                <div className="small">{span(j)}. {j.attended.length} worked{j.missed.length ? `, ${j.missed.length} missed` : ''}. Be in town and awake by 9 each morning.</div>
              </div>
              <button className="btn btn-sm btn-danger" aria-label={`Withdraw From ${j.production}`} onClick={() => setErr(store.act((s) => withdrawJob(s, j.id)))}>Withdraw</button>
            </li>
          ))}
        </ul>
      )}
      {taken.length > 0 && <p className="dim small">Withdrawing pays the days worked and nothing more, and offers come less often for a while; so does a missed day.</p>}
      {credits.length > 0 && (
        <ul className="list" aria-label="Your Credits For Others">
          {credits.map((j) => { const p = j.productionId ? productionById(g, j.productionId) : undefined; return <li key={j.id} className="list-item">{JOB_ROLES[j.role].label}{j.part ? ` (${j.part.replace(/^The part of /, 'as ')})` : ''}, {j.production} ({j.company}), {j.attended.length} {j.attended.length === 1 ? 'day' : 'days'}{p ? (p.result ? `. Out ${formatDateKey(p.releasesOn)}, received at ${p.result.reception} (simulated).` : `. Comes out ${formatDateKey(p.releasesOn)}.`) : ''}</li>; })}
        </ul>
      )}
      <p className="dim small">Day rates, the odds of an offer and its length are game calibration. The pay comes to your own account when the days are done.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </section>
  );
}

/**
 * How the industry reads your record, role by role (engine/reputation.ts): each facet with what it is read from. It is
 * worked out from what happened, never kept as a score, and offers of outside work follow it.
 */
export function ReputationCard() {
  const g = useGame();
  const r = reputation(g);
  const craft = (role: JobRole) => {
    const x = r.roles[role];
    return x.craft === null ? 'No delivered work in this role yet.' : `${qualityWords(x.craft)}, from ${x.works.map((w) => `${w.title} (${qualityWords(w.score).toLowerCase()})`).join(', ')}.`;
  };
  const pct = (n: number, d: number) => `${n} of ${d}`;
  return (
    <section className="card" aria-labelledby="reputation-h">
      <h2 id="reputation-h">Your Reputation</h2>
      <p className="dim small">How the industry reads your record, from what happened. Offers of outside work lean to the role your work is strongest in, and pay by it.</p>
      <dl className="kv" aria-label="Your Reputation">
        {(['writing', 'directing', 'acting'] as const).map((role) => <Fragment key={role}><dt>{JOB_ROLES[role].label}</dt><dd>{craft(role)}</dd></Fragment>)}
        <dt>Reliability</dt><dd>{r.reliability >= 1 ? 'Nothing against you: no work withdrawn from, no day missed.' : `Offers come ${Math.round((1 - r.reliability) * 100)}% less often for work withdrawn from or days missed.`}</dd>
        <dt>Budget And Delivery</dt><dd>{r.budget.delivered ? `${pct(r.budget.onBudget, r.budget.delivered)} delivered projects came in on budget.` : 'Nothing delivered yet.'}{r.budget.shelved ? ` ${r.budget.shelved} shelved.` : ''}</dd>
        <dt>Audiences</dt><dd>{r.audience === null ? 'Nothing delivered yet.' : `${qualityWords(r.audience)} reception, on average.`}</dd>
        <dt>Commercial Results</dt><dd>{r.commercial === null ? 'Nothing delivered yet.' : `${money(r.commercial.earned)} paid by distributors against ${money(r.commercial.spent)} spent.`}</dd>
        <dt>Relationships</dt><dd>{r.relationships.completed + r.relationships.letGo + r.relationships.declined === 0 ? 'Nobody has worked with you yet.' : `${r.relationships.completed} saw a project through with you, ${r.relationships.letGo} let go, ${r.relationships.declined} turned down after asking for more.`}</dd>
      </dl>
    </section>
  );
}
