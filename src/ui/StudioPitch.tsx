// Pitching a project to a studio your story follows, on the Budget page (strategy.ts, finance.ts; the Creative Depth
// package, milestone F). Each studio shows what it makes, as recorded when the story's world began, and how it reads
// this project today, with its reasons, before anything is sent. The read has no chance in it.
import { useState } from 'react';
import { STUDIO_DECIDE_DAYS, pitchToStudio, studioOptions } from '../engine/finance';
import { strategyWords, type PitchVerdict } from '../engine/strategy';
import type { Project } from '../engine/types';
import { store, useGame } from './store';

const VERDICT: Record<PitchVerdict, { chip: string; tone: string; says: string }> = {
  offer: { chip: 'Would Finance It', tone: 'chip-positive', says: 'As things stand it would finance the film and release it.' },
  option: { chip: 'Would Option It', tone: 'chip-accent', says: 'As things stand it would put in development money and release the film, and leave the rest of the budget to you.' },
  notes: { chip: 'Would Give Notes', tone: 'chip-warning', says: 'As things stand it would say not yet, and say what would change that.' },
  pass: { chip: 'Would Pass', tone: 'chip-negative', says: 'As things stand it would pass.' },
};

export function StudioPitchCard({ p }: { p: Project }) {
  const g = useGame();
  const [err, setErr] = useState<string | null>(null);
  const options = studioOptions(g, p);
  if (!options.length) return null;
  return (
    <section className="card" aria-labelledby="studio-pitch-h">
      <h2 id="studio-pitch-h">Pitch To A Studio</h2>
      <p className="muted">The studios your story follows, nearest fit first. Each reads a pitch by what it has released, the room on its slate, your script and what you have delivered: never by how many films it makes. What it would say today is shown before you send anything, and it answers in about {STUDIO_DECIDE_DAYS} days by the facts as they are then.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      <ul className="list">
        {options.map((o) => {
          const v = VERDICT[o.read.verdict];
          return (
            <li key={o.company} aria-label={o.name}>
              <div className="row-wrap">
                <div className="grow"><strong>{o.name}</strong> <span className={`chip ${v.tone}`}>{v.chip}</span></div>
                <button className="btn btn-sm" disabled={!!o.needs} aria-label={`Pitch To ${o.name}`} onClick={() => setErr(store.act((s) => void pitchToStudio(s, s.projects.find((x) => x.id === p.id)!, o.company)))}>Send The Pitch</button>
              </div>
              <p className="dim">{v.says}</p>
              {o.read.for.length > 0 && <><p className="dim small" style={{ margin: 0 }}>For it:</p><ul className="dim">{o.read.for.map((t) => <li key={t}>{t}</li>)}</ul></>}
              {o.read.against.length > 0 && <><p className="dim small" style={{ margin: 0 }}>Against it:</p><ul className="dim">{o.read.against.map((t) => <li key={t}>{t}</li>)}</ul></>}
              {o.read.next && <p className="dim">{o.read.next}</p>}
              {o.needs && <p className="muted">{o.needs}</p>}
              <details className="small">
                <summary>What {o.name} Makes</summary>
                <ul className="dim">{strategyWords(o.strategy).map((t) => <li key={t}>{t}</li>)}</ul>
                <p className="dim small">From the films credited to it when your story's world began, kept with your save. Nothing here comes from ratings, popularity, budgets or box office.</p>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
