// Choosing a real work to adapt (the v3 package, 02; the v4 package, 01; engine/adaptation.ts, engine/sources.ts). The
// list of works and a work's recorded facts are shared by two places: the dialog on the Script page, which declares an
// existing script adapted from a work, and Adapt A Work (AdaptWork.tsx), which makes a whole project from one. The catalog
// is fetched when either opens, at most forty works are drawn at once, and a work first published after the game's year
// is not offered.
import { useEffect, useMemo, useState } from 'react';
import type { Project } from '../engine/types';
import { MEDIUM_LABELS, loadPlots, plotSection, loadSources, rightsLine, rightsStanding, searchSources, type RightsStanding, type SourceCatalog, type SourceMedium, type SourceWork } from '../engine/sources';
import { STANDING_SAYS, adaptFrom, adaptRefusal, basedOn } from '../engine/adaptation';
import { GENRES, genreCatalogLoaded, loadGenreCatalog } from '../engine/genres';
import { recordGenres, storyGenres } from '../engine/story-genre';
import { Modal, SelectField, TextField, plural } from './components';
import { store, useGame } from './store';

const SHOWN = 40;
const STANDING_LABEL: Record<RightsStanding, string> = { 'public-domain-recorded': 'Recorded As Public Domain', 'copyrighted-recorded': 'Recorded As Copyrighted', 'not-recorded': 'No Rights Status Recorded' };
const when = (w: SourceWork) => (w.year === null ? 'No year recorded' : w.year < 0 ? `${-w.year} BC` : String(w.year));
const makers = (w: SourceWork) => w.creators.map((c) => c.name).join(', ') || 'No creator recorded';
export const genreName = (id: string) => GENRES.find((g) => g.id === id)?.name ?? id;

/**
 * Where no recorded genre is one of the game's, what its story reads as: the same reading the brief proposes (from
 * November 13, 2026; until then this said "none is guessed" while the brief proposed its medium's genre).
 */
function StoryGenres({ work }: { work: SourceWork }) {
  const have = new Set(GENRES.map((g) => g.id));
  const read = storyGenres(work, have);
  const record = read.length ? [] : recordGenres(work, have);
  if (record.length) return <>None recorded. Read from what is recorded of it, an adaptation proposes {record.map((r) => `${genreName(r.genre)} ("${r.phrase}")`).join(' and ')}.</>;
  if (!read.length) return <>None. Nothing recorded is plainly one of the game's genres, and too little of it is recorded to read one from, so an adaptation proposes one from its medium.</>;
  return <>None recorded. Read from its story, an adaptation proposes {read.map((r) => `${genreName(r.genre)} (${r.words.slice(0, 3).map(([x]) => x).join(', ')})`).join(' and ')}.</>;
}

/** The catalog, loaded once and tried again on request, with the game's genre names. */
export function useSourceCatalog(): { catalog: SourceCatalog | null; failed: boolean; retry: () => void } {
  const [catalog, setCatalog] = useState<SourceCatalog | null>(null);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  // The list waits for the genre names too: drawn before them, each card grew when they came and the page moved
  // (the UI audit, November 12, 2026). If they can't be loaded the ids are shown, and the list is not held back.
  const [named, setNamed] = useState(genreCatalogLoaded());
  useEffect(() => { if (!named) void loadGenreCatalog().catch(() => {}).finally(() => setNamed(true)); }, [named]);
  useEffect(() => {
    let live = true;
    setFailed(false);
    loadSources().then((c) => { if (live) setCatalog(c); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [tries]);
  return { catalog: named ? catalog : null, failed, retry: () => setTries((n) => n + 1) };
}

/** Search, filters and the list of works. Opening one is the caller's. */
export function WorkBrowser({ onOpen }: { onOpen: (w: SourceWork) => void }) {
  const g = useGame();
  const year = new Date(g.now).getUTCFullYear();
  const { catalog, failed, retry } = useSourceCatalog();
  const [text, setText] = useState('');
  const [medium, setMedium] = useState<SourceMedium | ''>('');
  const [genre, setGenre] = useState('');
  const [standing, setStanding] = useState<RightsStanding | ''>('');
  // Only the game's genres that some work has, most works first.
  const genres = useMemo(() => {
    const n = new Map<string, number>();
    for (const w of catalog?.records ?? []) for (const x of w.genres) n.set(x.genre, (n.get(x.genre) ?? 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1]);
  }, [catalog]);
  if (failed) return <div className="callout callout-negative" role="alert"><p>The works couldn't be loaded.</p><button className="btn btn-sm" onClick={retry}>Try Again</button></div>;
  if (!catalog) return <p role="status" className="muted">Loading the works…</p>;
  const found = searchSources(catalog, { text, medium, genre, standing, byYear: year });
  const later = catalog.records.filter((w) => w.year !== null && w.year > year).length;
  const published = catalog.records.length - later;
  return (
    <>
      <div className="grid grid-2 form">
        <TextField label="Search Works" value={text} onChange={setText} hint="A title, a writer or maker, or a genre as Wikidata names it." />
        <SelectField label="Medium" value={medium} onChange={setMedium} options={[{ value: '', label: 'Every Medium' }, ...(Object.keys(MEDIUM_LABELS) as SourceMedium[]).map((m) => ({ value: m, label: MEDIUM_LABELS[m] }))]} />
        <SelectField label="One Of The Game's Genres" value={genre} onChange={setGenre} options={[{ value: '', label: 'Any Or None' }, ...genres.map(([id, n]) => ({ value: id, label: `${genreName(id)} (${n})` }))]} />
        <SelectField label="What Is Recorded About Its Rights" value={standing} onChange={setStanding} options={[{ value: '', label: 'Anything' }, ...(Object.keys(STANDING_LABEL) as RightsStanding[]).map((s) => ({ value: s, label: STANDING_LABEL[s] }))]} />
      </div>
      <p className="dim small" role="status">{found.length === published ? `${plural(published, 'work')} published by ${year}, the most written about first.` : `${found.length} of ${plural(published, 'work')} published by ${year}.`}{found.length > SHOWN ? ` The first ${SHOWN} are shown: search or choose a medium to narrow them.` : ''}{later ? ` ${plural(later, 'work')} in the catalog ${later === 1 ? 'comes' : 'come'} out later.` : ''}</p>
      {found.length === 0 ? <p className="muted">No work matches that. Clear the search or choose less.</p> : (
        <ul className="idea-list" aria-label="Works">
          {found.slice(0, SHOWN).map((w) => (
            <li key={w.id}>
              <button type="button" className="idea-card" onClick={() => onOpen(w)}>
                <span className="idea-label">{w.title}</span>
                <span className="idea-text">{makers(w)}</span>
                <span className="dim small">{MEDIUM_LABELS[w.medium]} · {when(w)}{w.description ? ` · ${w.description}` : ''}</span>
                <span className="chip-row"><span className={`chip${rightsStanding(w) === 'public-domain-recorded' ? ' chip-positive' : ''}`}>{STANDING_LABEL[rightsStanding(w)]}</span>{w.genres.slice(0, 3).map((x) => <span key={x.genre} className="chip">{genreName(x.genre)}</span>)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="dim small spaced">From Wikidata, read {catalog.retrieved}, under CC0; summaries are English Wikipedia's, under CC BY-SA 4.0. A work is listed because many language editions of Wikipedia have an article on it, which says it is widely written about and nothing about its worth.</p>
    </>
  );
}

const list = (xs: string[] | undefined) => (xs?.length ? xs.join(', ') : 'Not recorded');

/** What is recorded about a work, its rights, and where each part comes from. */
export function WorkFacts({ w }: { w: SourceWork }) {
  const standing = rightsStanding(w);
  // The work's story is fetched when a work is opened (sources.ts loadPlots): undefined until then.
  const [, setStories] = useState(0);
  useEffect(() => { let live = true; if (w.plot === undefined) loadPlots().catch(() => {}).finally(() => { if (live) setStories((n) => n + 1); }); return () => { live = false; }; }, [w]);
  return (
    <>
      <p className="idea-sentence">{w.description ?? `${MEDIUM_LABELS[w.medium]}.`}</p>
      {w.summary && (
        <section className="idea-block" aria-label="What It Is About">
          <h3>What It Is About</h3>
          <blockquote className="small">{w.summary.text}</blockquote>
          <p className="dim small">From the English Wikipedia article <a href={w.summary.link} target="_blank" rel="noreferrer noopener">{w.summary.article}</a>, under {w.summary.licence}, read {w.summary.retrieved}. Its words, not the game's.</p>
        </section>
      )}
      <section className="idea-block" aria-label="The Story">
        <h3>The Story</h3>
        {w.plot === undefined ? <p className="dim small">Reading the story…</p> : w.plot ? (
          <>
            {w.plot.paragraphs.map((x, i) => <p key={i} className="small">{x}</p>)}
            <p className="dim small">From the {plotSection(w.plot)} section of the English Wikipedia article <a href={w.plot.link} target="_blank" rel="noreferrer noopener">{w.plot.article}</a>, under {w.plot.licence}, read {w.plot.retrieved}{w.plot.whole ? '' : '; the article tells more than is kept here'}. Its words, not the game's or the work's. An adaptation's outline is told from it, and its credits name the article.</p>
          </>
        ) : <p className="muted small">No story is recorded for {w.title}: its article has no plot section{w.medium === 'video-game' ? ' (it describes how the game is played)' : ''}. An adaptation of it starts from the game's own outline, for you to write the work's story into.</p>}
      </section>
      <section className="idea-block" aria-label="What Is Recorded">
        <h3>What Is Recorded</h3>
        <dl className="kv">
          <dt>Medium</dt><dd>{MEDIUM_LABELS[w.medium]}{w.kind ? ` (Wikidata: ${w.kind})` : ''}{w.forms?.length ? `; form: ${w.forms.join(', ')}` : ''}</dd>
          <dt>By</dt><dd>{w.creators.length ? w.creators.map((c) => `${c.name} (${c.role}${c.died ? `, died ${c.died}` : ''})`).join('; ') : 'No creator recorded'}</dd>
          <dt>First Published Or Released</dt><dd>{when(w)}</dd>
          <dt>Language</dt><dd>{w.languages.join(', ') || 'Not recorded'}</dd>
          <dt>Country Of Origin</dt><dd>{w.countries.join(', ') || 'Not recorded'}</dd>
          {w.series && <><dt>Part Of</dt><dd>{w.series.name}{w.series.number ? `, number ${w.series.number}` : ''}</dd></>}
          {(w.follows || w.followedBy) && <><dt>Before And After It</dt><dd>{[w.follows && `Follows ${w.follows.title}`, w.followedBy && `Followed by ${w.followedBy.title}`].filter(Boolean).join('. ')}. {w.series ? `In ${w.series.name}.` : 'Wikidata records this for the next in a series and for a maker\'s next work alike; no series is recorded for this one.'}</dd></>}
          <dt>Where It Is Set</dt><dd>{list(w.places?.map((p) => p.name))}</dd>
          <dt>When It Is Set</dt><dd>{list(w.periods)}</dd>
          <dt>Characters</dt><dd>{w.characters?.length ? w.characters.map((c) => c.name).join(', ') : 'None recorded'}</dd>
          <dt>What It Is About, As Recorded</dt><dd>{list(w.subjects)}</dd>
          <dt>Genres, As Recorded</dt><dd>{w.recordedGenres.map((x) => x.label).join(', ') || 'None recorded'}</dd>
          <dt>In The Game's Genres</dt><dd>{w.genres.length ? w.genres.map((x) => `${genreName(x.genre)}: ${x.because}`).join('. ') : <StoryGenres work={w} />}</dd>
          <dt>Adapted Before</dt><dd>{w.adaptationCount ? `${w.adaptationCount} recorded: ${(w.adaptations ?? []).map((a) => `${a.title}${a.kind ? ` (${a.kind}${a.year ? `, ${a.year}` : ''})` : a.year ? ` (${a.year})` : ''}`).join('; ')}${w.adaptationCount > (w.adaptations?.length ?? 0) ? ', and more' : ''}. You can still make your own.` : 'None recorded'}</dd>
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
        <p className="dim">Wikidata, read {w.enriched?.retrieved ?? w.provenance.retrieved}, under {w.provenance.licence}.{w.summary ? ' The summary above is Wikipedia\'s.' : ' No summary is recorded, and none is written here.'} A field that says "not recorded" is not recorded there; nothing is filled in.</p>
        <p><a href={w.link} target="_blank" rel="noreferrer noopener">Its Wikidata Record</a>{w.article && <> · <a href={w.article} target="_blank" rel="noreferrer noopener">Its Wikipedia Article</a></>}</p>
      </section>
    </>
  );
}

export interface SourcePickerProps { p: Project; run: (fn: () => void) => string | null; onClose: () => void; onChosen: (title: string) => void }

export function SourcePicker({ p, run, onClose, onChosen }: SourcePickerProps) {
  const [open, setOpen] = useState<SourceWork | null>(null);
  if (open) return <OpenWork p={p} w={open} run={run} back={() => setOpen(null)} onClose={onClose} onChosen={onChosen} />;
  return (
    <Modal title="Choose A Work To Adapt" kind="source-list" onClose={onClose} sheet footer={<button className="btn" onClick={onClose}>Keep My Script As It Is</button>}>
      <p className="dim">Real novels, stories, plays, poems, comics, games and online fiction, as Wikidata records them. Open one to read what is recorded about it, including its rights, before you choose. Choosing one declares what your script is based on. It is not permission to use the work, and nothing agreed in the game is.</p>
      <WorkBrowser onOpen={setOpen} />
    </Modal>
  );
}

function OpenWork({ p, w, run, back, onClose, onChosen }: { p: Project; w: SourceWork; run: SourcePickerProps['run']; back: () => void; onClose: () => void; onChosen: (title: string) => void }) {
  const [err, setErr] = useState<string | null>(null);
  const refusal = adaptRefusal(p);
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
      {refusal && <div className="callout callout-negative" role="alert"><p>{refusal}</p></div>}
      {err && <div className="callout callout-negative" role="alert"><p>{err}</p></div>}
      <WorkFacts w={w} />
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
