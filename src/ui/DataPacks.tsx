// Settings, Data Packs (November 11, 2026, docs/DATA-PACKS.md): install the film catalog or the cinemas from a pack
// file, see what is installed, and remove it.
import { useEffect, useRef, useState } from 'react';
import { forgetCatalog, retryCatalog } from '../catalog/load';
import { installPack, installedPacks, packExpires, removePack, type InstalledPack, type PackKind } from '../catalog/packs';
import { startLivingWorld } from './App';
import { store, useStore } from './store';

const day = (iso: string | number) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

/** After a pack comes or goes, every page reads the catalog afresh, and an open game's world starts or pauses. */
async function refreshGame(kind: PackKind, installed: boolean): Promise<void> {
  forgetCatalog();
  retryCatalog();
  if (kind !== 'catalog' || !store.state) return;
  // Removed: the world's decisions wait, keeping their dates, until a catalog is back (docs/WORLD.md).
  if (!installed) (await import('../engine/industry')).setIndustryWorld(null);
  else startLivingWorld();
  store.emit();
}

export function DataPacks() {
  useStore();
  const [list, setList] = useState<InstalledPack[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const reload = () => void installedPacks().then((m) => setList([...m.values()]));
  useEffect(reload, []);

  const install = async (file: File) => {
    setBusy(true); setError(null); setStatus('Reading the pack…');
    try {
      const p = await installPack(file, (n, total) => setStatus(`Installing: ${n.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} files…`));
      await refreshGame(p.kind, true);
      setStatus(`Installed ${p.name}. ${p.kind === 'catalog' ? 'Open Companies to see the films and series.' : 'Open a place in World to see its cinemas.'}`);
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
      reload();
    }
  };
  const remove = async (p: InstalledPack) => {
    setBusy(true); setError(null);
    try {
      await removePack(p.kind);
      await refreshGame(p.kind, false);
      setStatus(`Removed ${p.name}. Every record it held was deleted from this browser.`);
    } catch {
      setError(`${p.name} couldn't be removed. Try again.`);
    } finally {
      setBusy(false);
      reload();
    }
  };

  return (
    <fieldset style={{ border: 0, padding: 0, margin: '16px 0 0' }} aria-busy={busy}>
      <legend style={{ fontWeight: 600, marginBottom: 8 }}>Data Packs</legend>
      <p className="muted">Add the films and series, or the cinemas, by installing their data pack. A pack is kept in this browser only; your saved games never hold it.</p>
      {list === null ? null : list.length === 0 ? <p className="dim">No data packs are installed.</p> : (
        <ul className="list" aria-label="Installed Data Packs">
          {list.map((p) => {
            const ends = packExpires(p);
            return (
              <li key={p.kind} className="list-item">
                <span className="grow">
                  <strong>{p.name}</strong>
                  <div className="dim small">From {p.source}, gathered {day(p.retrieved?.from ?? p.builtAt)}. {p.files.toLocaleString('en-US')} files, {mb(p.bytes)}.{ends ? ` Withdrawn on ${day(ends)}: TMDB allows its data to be kept six months.` : ''}</div>
                  {p.kind === 'catalog' && <div className="dim small">This product uses the TMDB API but is not endorsed or certified by TMDB.</div>}
                </span>
                <button className="btn btn-sm" disabled={busy} onClick={() => void remove(p)} aria-label={`Remove ${p.name}`}>Remove</button>
              </li>
            );
          })}
        </ul>
      )}
      <input ref={input} type="file" accept=".slatepack" hidden aria-label="Data Pack File"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void install(f); }} />
      <button className="btn" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Working…' : 'Install Data Pack'}</button>
      {status && <p role="status" className="muted">{status}</p>}
      {error && <p role="alert" className="error">{error}</p>}
    </fieldset>
  );
}
