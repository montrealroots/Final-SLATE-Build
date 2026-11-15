// People the industry has recognised for a job, offered beside the game's own in the hiring lists (recognition.ts): who
// they are, what their work won or was nominated for, the grade the game reads from that, and what they ask. Considering
// one puts them at the top of the list above, to be offered the job like anyone (recognition-hire.ts).
import { useEffect, useState } from 'react';
import { consideredOn, realId } from '../engine/guests';
import { gradeFrom, gradeScore } from '../engine/grades';
import { capabilityFrom, describeStanding, experienceFrom, loadRecognition, recognisedIn, recognitionData } from '../engine/recognition';
import { crewAskFrom, performerAskFrom } from '../engine/recognition-pay';
import { considerRecognised } from '../engine/recognition-hire';
import { budgetBand } from '../engine/production/schedule';
import { money } from '../engine/budget';
import type { PerformanceMethod, Project } from '../engine/types';
import { store } from './store';
import { TextField } from './components';

const PAGE = 12;

export function RecognisedCandidates({ p, roleId, characterId, method, today }: { p: Project; roleId: string; characterId?: string; method?: PerformanceMethod; today: string }) {
  const [ready, setReady] = useState(!!recognitionData());
  const [failed, setFailed] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (!ready) loadRecognition().then(() => setReady(true), (e: Error) => setFailed(e.message)); }, [ready]);
  if (failed) return <p className="dim">{failed} <button className="btn btn-sm" onClick={() => { setFailed(null); setReady(false); }}>Try Again</button></p>;
  if (!ready) return <p className="dim">Reading the industry's record of awards…</p>;
  const year = Number(today.slice(0, 4));
  const already = new Set(consideredOn(p).filter((c) => c.roleId === roleId).map((c) => c.personId));
  const words = query.trim().toLowerCase();
  const all = recognisedIn(roleId, year).filter((x) => !already.has(realId(x.tmdbId)) && (!words || x.name.toLowerCase().includes(words)));
  if (!recognisedIn(roleId, year).length) return null;
  const performing = roleId === 'actor' || roleId === 'voice-actor';
  return (
    <section className="spaced" aria-labelledby={`recognised-${roleId}`}>
      <h3 id={`recognised-${roleId}`}>Recognised By The Industry</h3>
      <p className="dim small">People whose work in this job won or was nominated for an Academy Award, a BAFTA, a Golden Globe, a Screen Actors Guild Award, an Emmy or a prize at Cannes, Venice or Berlin, among others, before this year. The record is Wikidata's; the grade and the rate are the game's reading of it.</p>
      <TextField label="Search By Name" value={query} onChange={(v) => { setQuery(v); setShown(PAGE); }} />
      {err && <p className="error" role="alert">{err}</p>}
      <ul className="list">
        {all.slice(0, shown).map(({ tmdbId, name, standing }) => {
          const exp = experienceFrom(standing);
          const grade = gradeFrom(gradeScore(exp, capabilityFrom(exp, standing.points)));
          const ask = performing ? performerAskFrom(roleId, standing.points, budgetBand(p), today) : crewAskFrom(roleId, exp, standing.points);
          return (
            <li key={tmdbId} className="list-item">
              <div className="grow">
                <strong>{name}</strong> <span className="chip">Grade {grade}</span>
                <div className="dim small">{describeStanding(standing)}. Asks about {money(ask)} a day.</div>
              </div>
              <button className="btn btn-sm" aria-label={`Consider ${name}`} onClick={() => setErr(store.act((s) => considerRecognised(s, s.projects.find((x) => x.id === p.id)!, tmdbId, { roleId, characterId, method }, today)))}>Consider</button>
            </li>
          );
        })}
      </ul>
      {!all.length && <p className="dim">Nobody recognised in this job matches that name.</p>}
      {all.length > shown && <button className="btn btn-sm" onClick={() => setShown(shown + PAGE)}>Show {Math.min(PAGE, all.length - shown)} More Of {all.length}</button>}
    </section>
  );
}
