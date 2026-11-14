// Where an edition's recorded results come from (src/engine/history.ts; the owner's v6 package, 02 E; v8 decision 7).
import { formatDateKey } from '../engine/time';
import { holdsRecords, recordedResults, sourceOf } from '../engine/history';
import { unplacedRecorded } from '../engine/awards-history';
import { institution } from '../engine/awards';
import { checkExtract, extractsFor } from '../engine/rule-extracts';
import type { Edition, Project } from '../engine/types';

/**
 * Where this edition's recorded results come from. From November 14, 2026 the results themselves are shown once, in each
 * category, as this save's history (awards-history.ts); until then this card listed them apart from the game's own.
 */
export function RecordedResults({ ed, today }: { ed: Edition; today: string }) {
  if (!holdsRecords(ed.institutionId, ed.year)) return null;
  const shown = recordedResults(ed.institutionId, ed.year, today);
  const unplaced = unplacedRecorded(ed, institution(ed.institutionId).categories, today);
  const label = shown[0]?.edition ?? ed.label;
  const sources = [...new Map(shown.map((o) => { const s = sourceOf(o); return [s.url, s]; })).values()];
  return (
    <section className="card" aria-labelledby="recorded-h">
      <h2 id="recorded-h">Where The Record Comes From</h2>
      {!shown.length ? <p className="muted">No results for the {label} have been announced yet.</p> : (
        <>
          <p className="dim">{shown.length} recorded {shown.length === 1 ? 'result is' : 'results are'} in this story&apos;s history, each under its category. Only the categories the record lists come from it; none is guessed.</p>
          {unplaced.length > 0 && (
            <ul className="list" aria-label="Recorded Under Other Names">
              {unplaced.map((o) => <li key={o.id}><strong>{o.categoryName}</strong>{o.kind === 'nominees' ? <>, the nominees: {o.subjects.join(', ')}.</> : <>: {o.subjects.join(' and ')}{o.work ? `, for ${o.work}` : ''}.</>}</li>)}
            </ul>
          )}
          <p className="dim small">From {sources.map((s, k) => <span key={s.url}>{k ? '; ' : ''}{s.provider}, <a href={s.url} target="_blank" rel="noreferrer noopener">{s.title}</a>, read {formatDateKey(s.retrieved)}</span>)}.</p>
        </>
      )}
    </section>
  );
}

/**
 * The parts of this edition's rules read from the organizer's own documents (engine/rule-extracts.ts; the v7 package,
 * decision 10), checked against each of your projects: a stated rule it fails, or what can't be confirmed. Never a pass.
 */
export function ReadRules({ ed, projects }: { ed: Edition; projects: Project[] }) {
  const xs = extractsFor(ed.institutionId, ed.year);
  if (!xs.length) return null;
  const facts = (p: Project) => ({
    runtimeMinutes: p.delivered?.runtimeMin ?? null,
    animationShare: p.axes.medium === 'animation' ? 1 : p.axes.medium === 'live-action' ? 0 : null,
    firstRelease: p.releases.filter((r) => r.status === 'released').map((r) => r.date).sort()[0] ?? null,
  });
  return (
    <section className="card" aria-labelledby="read-rules-h">
      <h2 id="read-rules-h">Rules Read For This Edition</h2>
      <p className="dim">Parts of the organizer&apos;s rules, read from its own documents. They are incomplete, so they can show a project fails one of them, never that it qualifies.</p>
      <ul className="list" aria-label="Rules Read For This Edition">
        {xs.map((x) => <li key={x.id} className="small"><a href={x.source.url} target="_blank" rel="noreferrer noopener">{x.source.title}</a>, read {formatDateKey(x.source.checked)}</li>)}
      </ul>
      {projects.length ? (
        <ul className="list" aria-label="Your Projects Against Them">
          {projects.flatMap((p) => xs.map((x) => { const c = checkExtract(x, facts(p)); return (
            <li key={`${p.id}-${x.id}`}><strong>{p.title}</strong> <span className="chip">{c.verdict === 'ineligible' ? 'Fails A Rule' : 'Not Confirmed'}</span><div className="dim small">{c.reasons.join(' ')}</div></li>
          ); }))}
        </ul>
      ) : <p className="muted">You have no projects to check.</p>}
    </section>
  );
}
