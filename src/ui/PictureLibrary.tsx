// Settings, Mods: the whole catalog's pictures (November 12, 2026; docs/DATA-PACKS.md; the v3 package, 03). Each kind of
// picture can be downloaded by itself, or all of them. Before anything is fetched the game says how much it is and how
// much room the browser reports, and waits for the player to choose. A download can be paused and gone on with; what
// failed can be tried again; any of it can be removed. Only the owner is ever offered these (server/catalog-handler.mjs).
import { useEffect, useState, useSyncExternalStore } from 'react';
import { KIND_ORDER, downloadPictures, kindProgress, libraryState, libraryVersion, pausePictures, planDownload, refreshLibrary, removePictures, resumePictures, retryFailedPictures, subscribeLibrary, type Plan, type Scope } from '../catalog/picture-library';
import { plural } from './components';

const day = (iso: string | number) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const mb = (bytes: number) => (bytes >= 1048576 * 1000 ? `${(bytes / 1073741824).toFixed(2)} GB` : `${(bytes / 1048576).toFixed(1)} MB`);
const n = (x: number) => x.toLocaleString('en-US');
const DAY = 86_400_000;

export function PictureLibrary({ changed }: { changed: () => void }) {
  useSyncExternalStore(subscribeLibrary, libraryVersion);
  const s = libraryState();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { void refreshLibrary(); }, []);
  const listing = s.listing;
  // Nothing offered and nothing installed: this copy of the game has no pictures to speak of, so it says nothing.
  if (!listing && s.installed.size === 0) return null;

  const ask = async (scope: Scope) => { setNote(null); setPlan(await planDownload(scope)); };
  const start = async (p: Plan) => {
    setPlan(null);
    await downloadPictures(p.scope);
    const now = libraryState();
    changed();
    if (!now.run) setNote(now.failed.size ? `${plural(now.failed.size, 'part')} couldn't be installed. What did arrive is installed and in use.` : 'Downloaded and installed. Open a film, a series, a season, an episode, a person or a company to see them.');
  };
  const go = async (work: () => Promise<void>) => { setNote(null); await work(); changed(); const now = libraryState(); if (!now.run && !now.failed.size) setNote('Downloaded and installed.'); };
  const remove = async (scope: Scope, name: string) => {
    setPlan(null);
    const parts = await removePictures(scope);
    changed();
    setNote(`Removed ${name}: ${plural(parts, 'part')} deleted from this browser. Your saved games, and everyone in them, are as they were.`);
  };

  const run = s.run;
  const total = KIND_ORDER.reduce((a, k) => { const p = kindProgress(k); return { shards: a.shards + p.shards, installed: a.installed + p.installed, current: a.current + p.current, pictures: a.pictures + p.pictures, bytes: a.bytes + p.bytes, installedBytes: a.installedBytes + p.installedBytes }; }, { shards: 0, installed: 0, current: 0, pictures: 0, bytes: 0, installedBytes: 0 });
  const ends = listing ? Date.parse(listing.retrieved.from) + listing.retrieved.maxAgeDays * DAY : null;
  const scopeName = (scope: Scope) => (scope === 'all' ? 'every picture' : listing?.kinds[scope]?.name ?? scope);

  return (
    <section className="spaced" style={{ marginBottom: 'var(--s4)' }} aria-label="Pictures For The Whole Catalog" aria-busy={!!run && !run.paused}>
      <h3>Pictures For The Whole Catalog</h3>
      {listing ? (
        <p className="muted">
          {n(total.pictures)} pictures for the films, series, seasons, episodes, people and companies the catalog covers: {mb(total.bytes)} in all, in {n(total.shards)} parts you can take a kind at a time.
          From TMDB, gathered {day(`${listing.retrieved.from}T00:00:00Z`)}.{ends ? ` Withdrawn on ${day(ends)}: TMDB allows its data to be kept six months.` : ''} They are kept in this browser only; your saved games never hold them, and nothing in the game reads a picture.
        </p>
      ) : (
        <p className="muted">This copy of the game no longer offers these pictures. What is installed stays until it is removed or its six months pass.</p>
      )}
      {listing && <p className="dim small">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>}
      {listing && <details className="small"><summary>About These Pictures' Rights</summary><p className="dim">{listing.rights}</p></details>}

      <ul className="list" aria-label="Kinds Of Picture">
        {KIND_ORDER.map((kind) => {
          const k = listing?.kinds[kind];
          const p = kindProgress(kind);
          if (!k && !p.installed) return null;
          const name = k?.name ?? kind;
          const owes = p.shards - p.current;
          return (
            <li key={kind} className="list-item">
              <span className="grow">
                <strong>{name}</strong>{' '}
                {p.installed > 0 && p.current === p.shards && <span className="chip chip-positive">Installed</span>}
                {p.installed > 0 && p.current < p.shards && <span className="chip">{p.current} Of {p.shards} Parts</span>}
                <div className="dim small">{k ? `${n(k.pictures)} pictures, ${mb(k.bytes)}.` : ''}{p.installed ? ` ${mb(p.installedBytes)} of it is in this browser.` : ''}{p.installed > p.current ? ` ${plural(p.installed - p.current, 'part')} came from an earlier gathering and can be updated.` : ''}</div>
              </span>
              {k && owes > 0 && !run && <button className="btn btn-sm btn-primary" aria-label={`Download ${name}`} onClick={() => void ask(kind)}>{p.installed ? 'Download The Rest' : 'Download'}</button>}
              {p.installed > 0 && !run && <button className="btn btn-sm" aria-label={`Remove ${name}`} onClick={() => void remove(kind, name)}>Remove</button>}
            </li>
          );
        })}
      </ul>

      <div className="row-wrap">
        {listing && total.current < total.shards && !run && <button className="btn btn-sm btn-primary" onClick={() => void ask('all')}>Download All Available</button>}
        {run && !run.paused && <button className="btn btn-sm" onClick={() => pausePictures()}>Pause</button>}
        {run?.paused && <button className="btn btn-sm btn-primary" onClick={() => void go(resumePictures)}>Go On Downloading</button>}
        {run?.paused && <button className="btn btn-sm" onClick={() => { void removePictures('all').then(() => { changed(); setNote('The download was cancelled and every picture removed. Your saved games are as they were.'); }); }}>Cancel And Remove All</button>}
        {!run && s.failed.size > 0 && <button className="btn btn-sm" onClick={() => void go(retryFailedPictures)}>Try The {plural(s.failed.size, 'Failed Part')} Again</button>}
        {!run && total.installed > 0 && <button className="btn btn-sm" onClick={() => void remove('all', 'every picture')}>Remove All Pictures</button>}
      </div>

      {plan && !run && (
        <div className="callout" role="group" aria-label="Before You Download">
          {plan.shards === 0 ? <p>Everything in {scopeName(plan.scope)} is already installed.</p> : (
            <>
              <p>
                {scopeName(plan.scope) === 'every picture' ? 'Every picture' : scopeName(plan.scope)}: {n(plan.pictures)} pictures in {plural(plan.shards, 'part')}, {mb(plan.bytes)} to download{plan.updates ? ` (${plural(plan.updates, 'part')} of it replacing an earlier copy)` : ''}.
                It needs about {mb(plan.needs)} free in this browser. {plan.free === null ? "This browser doesn't say how much room it has." : `This browser reports ${mb(plan.free)} free.`}
              </p>
              {plan.enough
                ? <p className="dim small">It downloads a part at a time and can be paused. Each part is checked against the game's own record of it before it is installed, and is installed whole or not at all.</p>
                : <p role="alert" className="error">There isn't room for it. Nothing was downloaded. Choose one kind of picture, or free some space in this browser first.</p>}
            </>
          )}
          <div className="row-wrap">
            {plan.shards > 0 && plan.enough && <button className="btn btn-sm btn-primary" onClick={() => void start(plan)}>Download {n(plan.pictures)} Pictures</button>}
            <button className="btn btn-sm" onClick={() => setPlan(null)}>Not Now</button>
          </div>
        </div>
      )}

      {run && (
        <p role="status" className="muted">
          {run.paused ? 'Paused. ' : ''}{run.done} of {plural(run.total, 'part')} installed, {mb(run.bytesDone)} of {mb(run.bytesTotal)}.
          {run.current ? ` ${run.current.phase === 'download' ? 'Downloading' : 'Installing'} ${run.current.name}${run.current.phase === 'download' ? `: ${mb(run.current.done)} of ${mb(run.current.total)}` : ''}.` : ''}
          {run.paused ? ' What is installed is in use. Going on asks only for what is left.' : ''}
        </p>
      )}
      {note && !run && <p role="status" className="muted">{note}</p>}
      {s.failed.size > 0 && (
        <div role="alert" className="error">
          <p>{plural(s.failed.size, 'part')} couldn't be installed:</p>
          <ul>{[...s.failed].slice(0, 5).map(([part, why]) => <li key={part}>{why}</li>)}</ul>
          {s.failed.size > 5 && <p>And {n(s.failed.size - 5)} more.</p>}
        </div>
      )}
    </section>
  );
}
