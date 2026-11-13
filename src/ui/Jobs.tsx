// Work for others on screen (engine/jobs.ts; the v4 package, 01). Profile lists offers with their days, pay and who
// found them; work taken, with Withdraw and what it costs; and the credits it earned. The productions are invented by
// the game and say so.
import { useState } from 'react';
import { money } from '../engine/budget';
import { formatDateKey } from '../engine/time';
import { JOB_ROLES, acceptJob, acceptRefusal, declineJob, jobCredits, withdrawJob, type OutsideJob } from '../engine/jobs';
import { agentById } from '../engine/representation';
import { store, useGame } from './store';

const span = (j: OutsideJob) => `${j.days.length} ${j.days.length === 1 ? 'day' : 'days'}, ${formatDateKey(j.days[0])} to ${formatDateKey(j.days.at(-1)!)}`;

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
                  <div className="small">{span(j)}, {money(j.dayRate)} a day: {money(j.dayRate * j.days.length)} if every day is worked{j.viaAgent ? `, less ${Math.round(j.viaAgent.rate * 100)}% to ${agentById(j.viaAgent.agentId).name}, who found it` : ''}.</div>
                  {no && <div className="dim small">{no}</div>}
                </div>
                <button className="btn btn-sm btn-primary" disabled={!!no} aria-label={`Accept ${j.production}`} onClick={() => setErr(store.act((s) => acceptJob(s, j.id)))}>Accept</button>
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
          {credits.map((j) => <li key={j.id} className="list-item">{JOB_ROLES[j.role].label}, {j.production} ({j.company}), {j.attended.length} {j.attended.length === 1 ? 'day' : 'days'}</li>)}
        </ul>
      )}
      <p className="dim small">Day rates, the odds of an offer and its length are game calibration. The pay comes to your own account when the days are done.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </section>
  );
}
