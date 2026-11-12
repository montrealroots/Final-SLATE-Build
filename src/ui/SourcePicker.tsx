// Choosing a real work to adapt (the v3 package, 02; engine/adaptation.ts, engine/sources.ts). A dialog on the Script
// page: search the source-material catalog, read what is recorded about a work, including what is and isn't recorded
// about its rights, then declare the script adapted from it. The catalog is fetched when this opens, and at most forty
// works are drawn at once.
import { useEffect, useMemo, useState } from 'react';
import type { Project } from '../engine/types';
import { MEDIUM_LABELS, loadSources, rightsLine, rightsStanding, searchSources, type RightsStanding, type SourceCatalog, type SourceMedium, type SourceWork } from '../engine/sources';
import { STANDING_SAYS, adaptFrom, adaptRefusal, basedOn } from '../engine/adaptation';
import { GENRES, genreCatalogLoaded, loadGenreCatalog } from '../engine/genres';
import { Modal, SelectField, TextField, plural } from './components';
import { store } from './store';

const SHOWN = 40;
const STANDING_LABEL: Record<RightsStanding, string> = { 'public-domain-recorded': 'Recorded As Public Domain', 'copyrighted-recorded': 'Recorded As Copyrighted', 'not-recorded': 'No Rights Status Recorded' };
const when = (w: SourceWork) => (w.year === null ? 'No year recorded' : w.year < 0 ? `${-w.year} BC` : String(w.year));
const makers = (w: SourceWork) => w.creators.map((c) => c.name).join(', ') || 'No creator recorded';

export interface SourcePickerProps { p: Project; run: (fn: () => void) => string | null; onClose: () => void; onChosen: (title: string) => void }

export function SourcePicker({ p, run, onClose, onChosen }: SourcePickerProps) {
  const [catalog, setCatalog] = useState<SourceCatalog | null>(null);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  const [text, setText] = useState('');
  const [medium, setMedium] = useState<SourceMedium | ''>('');
  const [genre, setGenre] = useState('');
  const [standing, setStanding] = useState<RightsStanding | ''>('');
  const [open, setOpen] = useState<SourceWork | null>(null);
  const [, setNamed] = useState(0);
  useEffect(() => { if (!genreCatalogLoaded()) void loadGenreCatalog().then(() => setNamed((n) => n + 1)).catch(() => {}); }, []);
  useEffect(() => {
    let live = true;
    setFailed(false);
    loadSources().then((c) => { if (live) setCatalog(c); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [tries]);
  // Only the game's genres that some work has, most works first.
  const genres = useMemo(() => {
    const n = new Map<string, number>();
    for (const w of catalog?.records ?? []) for (const g of w.genres) n.set(g.genre, (n.get(g.genre) ?? 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1]);
  }, [catalog]);
  const name = (id: string) => GENRES.find((g) => g.id === id)?.name ?? id;
  if (open) return <OpenWork p={p} w={open} run={run} name={name} back={() => setOpen(null)} onClose={onClose} onChosen={onChosen} />;
  const found = catalog ? searchSources(catalog, { text, medium, genre, standing }) : [];
  return (
    <Modal title="Choose A Work To Adapt" kind="source-list" onClose={onClose} sheet footer={<button className="btn" onClick={onClose}>Keep My Script As It Is</button>}>
      <p className="dim">Real novels, stories, plays, poems, comics, games and online fiction, as Wikidata records them. Open one to read what is recorded about it, including its rights, before you choose. Choosing one declares what your script is based on. It is not permission to use the work, and nothing agreed in the game is.</p>
      {failed ? (
        <div className="callout callout-negative" role="alert"><p>The works couldn't be loaded.</p><button className="btn btn-sm" onClick={() => setTries((n) => n + 1)}>Try Again</button></div>
      ) : !catalog ? <p role="status" className="muted">Loading the works…</p> : (
        <>
          <div className="grid grid-2 form">
            <TextField label="Search Works" value={text} onChange={setText} hint="A title, a writer or maker, or a genre as Wikidata names it." />
            <SelectField label="Medium" value={medium} onChange={setMedium} options={[{ value: '', label: 'Every Medium' }, ...(Object.keys(MEDIUM_LABELS) as SourceMedium[]).map((m) => ({ value: m, label: MEDIUM_LABELS[m] }))]} />
            <SelectField label="One Of The Game's Genres" value={genre} onChange={setGenre} options={[{ value: '', label: 'Any Or None' }, ...genres.map(([id, n]) => ({ value: id, label: `${name(id)} (${n})` }))]} />
            <SelectField label="What Is Recorded About Its Rights" value={standing} onChange={setStanding} options={[{ value: '', label: 'Anything' }, ...(Object.keys(STANDING_LABEL) as RightsStanding[]).map((s) => ({ value: s, label: STANDING_LABEL[s] }))]} />
          </div>
          <p className="dim small" role="status">{found.length === catalog.records.length ? `${plural(found.length, 'work')}, the most written about first.` : `${found.length} of ${plural(catalog.records.length, 'work')}.`}{found.length > SHOWN ? ` The first ${SHOWN} are shown: search or choose a medium to narrow them.` : ''}</p>
          {found.length === 0 ? <p className="muted">No work matches that. Clear the search or choose less.</p> : (
            <ul className="idea-list" aria-label="Works">
              {found.slice(0, SHOWN).map((w) => (
                <li key={w.id}>
                  <button type="button" className="idea-card" onClick={() => setOpen(w)}>
                    <span className="idea-label">{w.title}</span>
                    <span className="idea-text">{makers(w)}</span>
                    <span className="dim small">{MEDIUM_LABELS[w.medium]} · {when(w)}{w.description ? ` · ${w.description}` : ''}</span>
                    <span className="chip-row"><span className={`chip${rightsStanding(w) === 'public-domain-recorded' ? ' chip-positive' : ''}`}>{STANDING_LABEL[rightsStanding(w)]}</span>{w.genres.slice(0, 3).map((g) => <span key={g.genre} className="chip">{name(g.genre)}</span>)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="dim small spaced">From Wikidata, read {catalog.retrieved}, under CC0. A work is listed because many language editions of Wikipedia have an article on it, which says it is widely written about and nothing about its worth.</p>
        </>
      )}
    </Modal>
  );
}

function OpenWork({ p, w, run, name, back, onClose, onChosen }: { p: Project; w: SourceWork; run: SourcePickerProps['run']; name: (id: string) => string; back: () => void; onClose: () => void; onChosen: (title: string) => void }) {
  const [err, setErr] = useState<string | null>(null);
  const refusal = adaptRefusal(p);
  const standing = rightsStanding(w);
  const choose = () => {
    const e = run(() => { adaptFrom(store.state!, p, w); });
    if (e) { setErr(e); return; }
    onChosen(w.title);
    onClose();
  };
  const had = p.source?.kind === 'adapted' ? (p.source.work ?? '').trim() : '';
  return (
    <Modal title={w.title} kind="source-open" onClose={onClose} sheet footer={
      <>
        <button className="btn" onClick={back}>Back To Works</button>
        {!refusal && <button className="btn btn-primary" onClick={choose}>Adapt This Work</button>}
      </>
    }>
      <p className="idea-sentence">{w.description ?? `${MEDIUM_LABELS[w.medium]}.`}</p>
      {refusal && <div className="callout callout-negative" role="alert"><p>{refusal}</p></div>}
      {err && <div className="callout callout-negative" role="alert"><p>{err}</p></div>}
      <section className="idea-block" aria-label="What Is Recorded">
        <h3>What Is Recorded</h3>
        <dl className="kv">
          <dt>Medium</dt><dd>{MEDIUM_LABELS[w.medium]}{w.kind ? ` (Wikidata: ${w.kind})` : ''}</dd>
          <dt>By</dt><dd>{w.creators.length ? w.creators.map((c) => `${c.name} (${c.role}${c.died ? `, died ${c.died}` : ''})`).join('; ') : 'No creator recorded'}</dd>
          <dt>First Published Or Released</dt><dd>{when(w)}</dd>
          <dt>Language</dt><dd>{w.languages.join(', ') || 'Not recorded'}</dd>
          <dt>Country Of Origin</dt><dd>{w.countries.join(', ') || 'Not recorded'}</dd>
          {w.series && <><dt>Part Of</dt><dd>{w.series.name}{w.series.number ? `, number ${w.series.number}` : ''}</dd></>}
          <dt>Genres, As Recorded</dt><dd>{w.recordedGenres.map((g) => g.label).join(', ') || 'None recorded'}</dd>
          <dt>In The Game's Genres</dt><dd>{w.genres.length ? w.genres.map((g) => `${name(g.genre)}: ${g.because}`).join('. ') : "None: nothing recorded is plainly one of the game's genres, and none is guessed."}</dd>
        </dl>
      </section>
      <section className="idea-block" aria-label="Its Rights">
        <h3>Its Rights</h3>
        <p><span className={`chip${standing === 'public-domain-recorded' ? ' chip-positive' : ''}`}>{STANDING_LABEL[standing]}</span></p>
        <p>{rightsLine(w)}</p>
        <p className="dim">{STANDING_SAYS[standing]} The game works nothing out from a date or a death, gives no advice about the law, and grants no right to a real work.</p>
      </section>
      <section className="idea-block" aria-label="Where This Comes From">
        <h3>Where This Comes From</h3>
        <p className="dim">Wikidata, read {w.provenance.retrieved}, under {w.provenance.licence}. No synopsis is recorded there and none is written here.</p>
        <p><a href={w.link} target="_blank" rel="noreferrer noopener">Its Wikidata Record</a>{w.article && <> · <a href={w.article} target="_blank" rel="noreferrer noopener">Its Wikipedia Article</a></>}</p>
      </section>
      {!refusal && (
        <fieldset className="idea-block" role="region" aria-label="What Choosing It Changes">
          <legend>What Choosing It Changes</legend>
          <ul className="list">
            <li><strong>Source Material</strong> becomes Adapted From Another Work{p.source?.kind === 'adapted' ? ' (it is already)' : ''}.</li>
            <li><strong>Adapted From</strong> becomes "{basedOn(w).slice(0, 120)}"{had && had !== basedOn(w).slice(0, 120) ? `, in place of "${had}"` : ''}.</li>
          </ul>
          <p className="dim small">Nothing else in your script is touched. Undo Last Change takes it back.</p>
        </fieldset>
      )}
    </Modal>
  );
}
