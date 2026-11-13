// The real music catalog on a project's Music page (engine/music-catalog.ts; the owner's v5 brief, 3): find a composer, a
// songwriter, an artist or a recording as Wikidata records them, license a recording into the project, or consider a
// composer for the job under the one identity they have in the save. Records are facts with their source; everything
// about working with them is the game's simulation, and says so.
import { useEffect, useState } from 'react';
import { considerFor } from '../engine/guests';
import { MUSIC_ROLE_LABELS, considerComposer, composerRecord, licenseRecording, loadMusicCatalog, musicCatalog, performerNames, searchMusic, wikidataLink, type MusicCatalog, type MusicPerson, type MusicRole, type Recording } from '../engine/music-catalog';
import { songsOf } from '../engine/songs';
import { dateKey } from '../engine/time';
import type { Project, Song } from '../engine/types';
import { SelectField, TextField } from './components';
import { store, useGame } from './store';

const length = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const lifespan = (m: MusicPerson) => (m.kind === 'group' ? [m.formed && `formed ${m.formed.slice(0, 4)}`, m.ended && `ended ${m.ended.slice(0, 4)}`] : [m.born && `born ${m.born.slice(0, 4)}`, m.died && `died ${m.died.slice(0, 4)}`]).filter(Boolean).join(', ');

export function MusicCatalogCard({ p }: { p: Project }) {
  const g = useGame();
  const [cat, setCat] = useState<MusicCatalog | null>(musicCatalog());
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<MusicRole | 'any'>('any');
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (!cat) loadMusicCatalog().then(setCat).catch(() => setFailed(true)); }, [cat]);
  if (p.delivered) return null;
  if (!cat) return <section className="card"><h2>Real Music</h2><p className="muted">{failed ? "The music catalog couldn't be loaded. Reload the page to try again." : 'Loading the music catalog.'}</p></section>;
  const found = query.trim().length >= 2 ? searchMusic(cat, query, role) : { people: [], recordings: [] };
  const today = dateKey(g.now, 'UTC');
  const live = () => store.state!.projects.find((x) => x.id === p.id)!;
  return (
    <section className="card" aria-labelledby="real-music-h">
      <h2 id="real-music-h">Real Music</h2>
      <p className="muted">Real composers, songwriters, artists and recordings, as Wikidata records them (CC0, read {cat.retrieved}): {cat.people.length} people and groups, {cat.recordings.length} recordings. Their records are facts. Anything about working with them here, from availability and willingness to fees and answers, is the game's simulation. Nobody is contacted and nothing is bought. No audio or lyrics are held.</p>
      <div className="inline-form">
        <TextField label="Find A Composer, Artist Or Recording" value={query} onChange={setQuery} />
        <SelectField label="Their Role" value={role} options={[{ value: 'any', label: 'Any Role' }, ...(Object.keys(MUSIC_ROLE_LABELS) as MusicRole[]).map((r) => ({ value: r, label: MUSIC_ROLE_LABELS[r] }))]} onChange={setRole} />
      </div>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      {found.people.length > 0 && (
        <ul className="list" aria-label="People And Groups">
          {found.people.map((m) => {
            const rec = composerRecord(m);
            const id = rec ? `tp_${rec.id}` : null;
            const listed = !!id && (p.considered ?? []).some((c) => c.personId === id && c.roleId === 'composer');
            return (
              <li key={m.id} className="list-item" style={{ display: 'block' }} aria-label={m.name}>
                <div><strong>{m.name}</strong> {(m.roles ?? []).map((r) => <span key={r} className="chip">{MUSIC_ROLE_LABELS[r]}</span>)}</div>
                <p className="dim small">{[m.kind === 'group' ? 'A group' : null, lifespan(m), m.country].filter(Boolean).join('; ')}.{m.occupations?.length ? ` Recorded as: ${m.occupations.slice(0, 6).join(', ')}.` : ''} <a href={wikidataLink(m.id)} target="_blank" rel="noreferrer noopener">Its record</a>.</p>
                {m.scores && <p className="small">{m.scores.films} film {m.scores.films === 1 ? 'score' : 'scores'} recorded{m.scores.first ? `, ${m.scores.first} to ${m.scores.last}` : ''}: {m.scores.known.map((f) => `${f.title}${f.year ? ` (${f.year})` : ''}`).join(', ')}.</p>}
                {rec && !m.died && (
                  <button className="btn btn-sm" disabled={listed} onClick={() => setErr(store.act((s) => { considerComposer(s, cat, m); considerFor(s, live(), { personId: `tp_${rec.id}`, roleId: 'composer' }, today); }))}>{listed ? 'Considered For Composer' : 'Consider For Composer'}</button>
                )}
                {rec && m.died && <p className="dim small">Recorded as having died in {m.died.slice(0, 4)}: not approached.</p>}
              </li>
            );
          })}
        </ul>
      )}
      {found.recordings.length > 0 && (
        <ul className="list" aria-label="Recordings">
          {found.recordings.map((r) => <RecordingRow key={r.id} p={p} cat={cat} r={r} onError={setErr} />)}
        </ul>
      )}
      {query.trim().length >= 2 && !found.people.length && !found.recordings.length && <p className="muted">Nothing in the catalog by that name.</p>}
      {(p.considered ?? []).some((c) => c.roleId === 'composer') && <p className="dim small">Composers you consider are among the candidates for the Composer job on the Crew page, to approach like anyone else.</p>}
    </section>
  );
}

function RecordingRow({ p, cat, r, onError }: { p: Project; cat: MusicCatalog; r: Recording; onError: (e: string | null) => void }) {
  const have = songsOf(p).some((s) => s.recording?.id === r.id);
  const writers = [...new Set([...(r.composers ?? []), ...(r.lyricists ?? [])].map((x) => x.name))];
  return (
    <li className="list-item" style={{ display: 'block' }} aria-label={r.title}>
      <div><strong>"{r.title}"</strong>, by {performerNames(cat, r).join(' and ')}</div>
      <p className="dim small">{[r.date && `Released ${r.date.slice(0, 4)}`, r.seconds && `${length(r.seconds)} long`, writers.length ? `written by ${writers.join(', ')}` : 'no writer recorded', r.versionOf && `a version of "${r.versionOf.title}"`].filter(Boolean).join('; ')}. <a href={wikidataLink(r.id)} target="_blank" rel="noreferrer noopener">Its record</a>.</p>
      <button className="btn btn-sm" disabled={have} onClick={() => onError(store.act((s) => void licenseRecording(s, s.projects.find((x) => x.id === p.id)!, cat, r)))}>{have ? 'In This Project' : 'License This Recording'}</button>
    </li>
  );
}

/** The real recording a licensed song is, in one line, on its licence card. */
export function RecordingFacts({ s }: { s: Song }) {
  const x = s.recording;
  if (!x) return null;
  return <p className="dim small">A real recording by {x.performers.join(' and ')}{x.date ? `, released ${x.date.slice(0, 4)}` : ''}{x.seconds ? `, ${length(x.seconds)} long` : ''}, as Wikidata recorded it on {x.retrieved}. {x.writersRecorded ? '' : "Wikidata names no writer, so its performers stand as its writers until you name them on the Production page. "}<a href={wikidataLink(x.id)} target="_blank" rel="noreferrer noopener">Its record</a>.</p>;
}
