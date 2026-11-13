// An edition's recorded results (src/engine/history.ts; the owner's v6 package, 02 E): the real ones, shown only once
// they were announced, with where they come from. They are history, kept apart from this game's own competition.
import { formatDateKey } from '../engine/time';
import { holdsRecords, recordedResults, sourceOf } from '../engine/history';
import type { Edition } from '../engine/types';

export function RecordedResults({ ed, today }: { ed: Edition; today: string }) {
  if (!holdsRecords(ed.institutionId, ed.year)) return null;
  const shown = recordedResults(ed.institutionId, ed.year, today);
  const label = shown[0]?.edition ?? ed.label;
  const through = shown.map((o) => o.published!).sort().at(-1);
  const sources = [...new Map(shown.map((o) => { const s = sourceOf(o); return [s.url, s]; })).values()];
  return (
    <section className="card" aria-labelledby="recorded-h">
      <h2 id="recorded-h">Recorded Results</h2>
      {!shown.length ? <p className="muted">No results for the {label} have been announced yet.</p> : (
        <>
          <ul className="list" aria-label="Recorded Results">
            {shown.map((o) => (
              <li key={o.id}>
                <strong>{o.categoryName}</strong>
                {o.kind === 'nominees'
                  ? <>, the nominees: {o.subjects.join(', ')}.</>
                  : <>: {o.subjects.join(' and ')}{o.work ? `, for ${o.work}` : ''}{o.credited ? ` (${o.credited})` : ''}.</>}
              </li>
            ))}
          </ul>
          <p className="dim">Recorded results through {formatDateKey(through!)}. Only the categories listed here are recorded; the others aren&apos;t, and none is guessed.</p>
          <p className="dim small">From {sources.map((s, k) => <span key={s.url}>{k ? '; ' : ''}{s.provider}, <a href={s.url} target="_blank" rel="noreferrer noopener">{s.title}</a>, read {formatDateKey(s.retrieved)}</span>)}.</p>
        </>
      )}
    </section>
  );
}
