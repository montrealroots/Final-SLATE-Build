// Settings, Mods (November 11, 2026, docs/DATA-PACKS.md; the owner: "put that package in game under 'Mods' and once
// installed boom"). The mods this copy of the game offers, each installed with one press; what is installed, with
// Remove; and a pack from a file, for one the game doesn't offer.
import { useEffect, useRef, useState } from 'react';
import { forgetCatalog, retryCatalog } from '../catalog/load';
import { installOffered, installPack, installedPacks, offeredMods, packExpires, removePack, type InstalledPack, type OfferedMod, type PackKind, type PackMeta } from '../catalog/packs';
import { startLivingWorld } from './App';
import { store, useStore } from './store';

const day = (iso: string | number) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;
const n = (x: number) => x.toLocaleString('en-US');
const WHERE: Record<PackKind, string> = { catalog: 'Open Companies to see the films and series.', cinemas: 'Open a place in World to see its cinemas.' };
const WHAT: Record<PackKind, string> = { catalog: 'Every film, series, season, episode and person the catalog covers, and the networks they air on.', cinemas: 'Cinemas worldwide, and what they show.' };

/** After a mod comes or goes, every page reads the catalog afresh, and an open game's world starts or pauses. */
async function refreshGame(kind: PackKind, installed: boolean): Promise<void> {
  forgetCatalog();
  retryCatalog();
  if (kind !== 'catalog' || !store.state) return;
  // Removed: the world's decisions wait, keeping their dates, until a catalog is back (docs/WORLD.md).
  if (!installed) (await import('../engine/industry')).setIndustryWorld(null);
  else startLivingWorld();
  store.emit();
}

function About({ p, size }: { p: PackMeta; size: number }) {
  const ends = packExpires(p);
  return (
    <>
      <div className="dim small">{WHAT[p.kind]} From {p.source}, gathered {day(p.retrieved?.from ?? p.builtAt)}. {mb(size)}.{ends ? ` Withdrawn on ${day(ends)}: TMDB allows its data to be kept six months.` : ''}</div>
      {p.kind === 'catalog' && <div className="dim small">This product uses the TMDB API but is not endorsed or certified by TMDB.</div>}
    </>
  );
}

export function DataPacks() {
  useStore();
  const [installed, setInstalled] = useState<Map<PackKind, InstalledPack> | null>(null);
  const [offered, setOffered] = useState<OfferedMod[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const reload = () => void installedPacks().then(setInstalled);
  useEffect(() => { reload(); void offeredMods().then(setOffered); }, []);

  const run = async (name: string, work: () => Promise<InstalledPack>) => {
    setBusy(true); setError(null); setStatus(`Getting ${name} ready…`);
    try {
      const p = await work();
      await refreshGame(p.kind, true);
      setStatus(`Installed ${p.name}. ${WHERE[p.kind]}`);
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
      reload();
    }
  };
  const install = (m: OfferedMod) => run(m.name, () => installOffered(m, (phase, done, total) =>
    setStatus(phase === 'download' ? `Downloading ${m.name}: ${mb(done)} of ${mb(total)}…` : `Installing ${m.name}: ${n(done)} of ${n(total)} files…`)));
  const fromFile = (f: File) => run('the mod', () => installPack(f, (done, total) => setStatus(`Installing: ${n(done)} of ${n(total)} files…`)));
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

  // Every mod the game offers, and any installed from a file that it doesn't.
  const kinds = [...new Set<PackKind>([...offered.map((m) => m.kind), ...(installed?.keys() ?? [])])];
  return (
    <fieldset style={{ border: 0, padding: 0, margin: '16px 0 0' }} aria-busy={busy}>
      <legend style={{ fontWeight: 600, marginBottom: 8 }}>Mods</legend>
      <p className="muted">Add the films and series, or the cinemas, to your game. A mod is kept in this browser only; your saved games never hold it.</p>
      {installed === null ? null : kinds.length === 0 ? <p className="dim">This copy of the game offers no mods, and none is installed.</p> : (
        <ul className="list" aria-label="Mods">
          {kinds.map((kind) => {
            const have = installed.get(kind);
            const offer = offered.find((m) => m.kind === kind);
            const newer = !!have && !!offer && offer.builtAt !== have.builtAt;
            const p = have ?? offer!;
            return (
              <li key={kind} className="list-item">
                <span className="grow">
                  <strong>{p.name}</strong> {have && <span className="chip chip-positive">Installed</span>}
                  <About p={newer ? offer! : p} size={newer ? offer!.bytes : have ? have.bytes : offer!.bytes} />
                </span>
                {offer && (!have || newer) && <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => void install(offer)} aria-label={`${newer ? 'Update' : 'Install'} ${offer.name}`}>{newer ? 'Update' : 'Install'}</button>}
                {have && <button className="btn btn-sm" disabled={busy} onClick={() => void remove(have)} aria-label={`Remove ${have.name}`}>Remove</button>}
              </li>
            );
          })}
        </ul>
      )}
      <input ref={input} type="file" accept=".slatepack" hidden aria-label="Mod File"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void fromFile(f); }} />
      <button className="btn btn-sm" style={{ marginTop: 8 }} disabled={busy} onClick={() => input.current?.click()}>Install From A File</button>
      {status && <p role="status" className="muted">{status}</p>}
      {error && <p role="alert" className="error">{error}</p>}
    </fieldset>
  );
}
