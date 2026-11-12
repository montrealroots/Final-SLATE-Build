// Settings, Mods (November 11, 2026, docs/DATA-PACKS.md; the owner: "put that package in game under 'Mods' and once
// installed boom"). The mods this copy of the game offers, each installed with one press; what is installed, with
// Remove; and a pack from a file, for one the game doesn't offer.
import { useEffect, useRef, useState } from 'react';
import { forgetCatalog, retryCatalog } from '../catalog/load';
import { STORAGE_MARGIN, downloadedSoFar, installOffered, installPack, installedPacks, offeredMods, ownerSession, ownerSignIn, ownerSignOut, packExpires, removePack, storageRoom, type InstalledPack, type OfferedMod, type OwnerSession, type PackKind, type PackMeta } from '../catalog/packs';
import { picturesOn, setPicturesOn } from './Picture';
import { expirePeople, startLivingWorld } from './App';
import { Check, TextField, plural } from './components';
import { store, useStore } from './store';

const day = (iso: string | number) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;
const n = (x: number) => x.toLocaleString('en-US');
const WHERE: Record<PackKind, string> = { catalog: 'Open Companies to see the films and series.', cinemas: 'Open a place in World to see its cinemas.', images: "Open a film, a series or a person in Companies to see its picture." };
const WHAT: Record<PackKind, string> = { catalog: 'Every film, series, season, episode and person the catalog covers, and the networks they air on.', cinemas: 'Cinemas worldwide, and what they show.', images: "Optional: posters and profile photos for some of the films, series and people. The game works the same without it, and a picture changes nothing in your story." };

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

function About({ p, size, toInstall }: { p: PackMeta; size: number; toInstall: boolean }) {
  const ends = packExpires(p);
  return (
    <>
      <div className="dim small">{WHAT[p.kind]} From {p.source}, gathered {day(p.retrieved?.from ?? p.builtAt)}. {mb(size)}.{ends ? ` Withdrawn on ${day(ends)}: TMDB allows its data to be kept six months.` : ''}</div>
      {toInstall && <div className="dim small">Installing it needs about {mb(size * STORAGE_MARGIN)} free in this browser.</div>}
      {p.kind !== 'cinemas' && <div className="dim small">This product uses the TMDB API but is not endorsed or certified by TMDB.</div>}
    </>
  );
}

/** How much room this browser reports, where it reports any, and what the installed mods take. */
function Storage({ installed, version }: { installed: Map<PackKind, InstalledPack> | null; version: number }) {
  const [room, setRoom] = useState<Awaited<ReturnType<typeof storageRoom>>>(null);
  useEffect(() => { let live = true; void storageRoom().then((r) => { if (live) setRoom(r); }); return () => { live = false; }; }, [version, installed]);
  const used = [...(installed?.values() ?? [])].reduce((a, p) => a + p.bytes, 0);
  return (
    <p className="dim small" aria-label="Storage In This Browser">
      {used > 0 ? `The mods installed here hold ${mb(used)}. ` : ''}
      {room ? `This browser reports ${mb(room.free)} free for the game, of ${mb(room.quota)}. ` : "This browser doesn't say how much room it has. "}
      An update is stored beside the mod it replaces and takes its place only once it is whole, so for a moment both are held; if it is cut short or there isn't room, the one you have stays. Your saved games are kept apart from mods, and removing a mod never touches them.
    </p>
  );
}

const SIGN_IN_FAILED = {
  wrong: "That isn't the owner's passphrase.",
  locked: 'Too many wrong passphrases. Wait a minute, then try again.',
  failed: "The game's server couldn't be reached. Check your connection and try again.",
};

/**
 * The owner's sign-in (docs/DEPLOYMENT.md, "Who Gets The Owner's Data"). Shown only where the game's server offers it:
 * the owner's own server, reached from somewhere other than the machine it runs on. Nobody else ever sees it.
 */
function OwnerSignIn({ session, changed }: { session: OwnerSession; changed: () => void }) {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!session.signIn) return null;
  if (session.owner) {
    return (
      <p className="muted">You're signed in as this game's owner on this browser.{' '}
        <button className="btn btn-sm" onClick={() => void ownerSignOut().then(changed)}>Sign Out</button>
      </p>
    );
  }
  const submit = async () => {
    if (!passphrase) { setError("Enter the owner's passphrase."); return; }
    setBusy(true); setError(null);
    const r = await ownerSignIn(passphrase);
    setBusy(false);
    if (r !== 'ok') { setError(SIGN_IN_FAILED[r]); return; }
    setPassphrase('');
    changed();
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} style={{ margin: 'var(--s2) 0' }}>
      <p className="muted">The films and series are this game's owner's alone. If that's you, sign in to see them here.</p>
      <TextField label="Owner Passphrase" type="password" value={passphrase} onChange={setPassphrase} error={error} />
      <button className="btn btn-sm btn-primary" type="submit" disabled={busy}>Sign In</button>
    </form>
  );
}

/**
 * Newer records, only when asked (docs/WORLD.md, "Taking Newer Records"). An open game's world keeps the records it
 * began with. When the installed films and series were gathered later, this says so, shows what taking them would
 * change, and changes nothing until the player chooses. A copy of the game is kept first.
 */
function WorldRecords({ version }: { version: number }) {
  const s = useStore();
  const [preview, setPreview] = useState<import('../engine/industry').RefreshPreview | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ind = s.state?.industry;
  useEffect(() => {
    if (!s.state?.industry) { setPreview(null); return; }
    let live = true;
    void import('../engine/industry').then((m) => { if (live && store.state) setPreview(m.worldRefreshPreview(store.state)); });
    return () => { live = false; };
  }, [s.state?.saveId, ind?.refreshes?.length, ind?.builtAt, version, s.worldVersion]);
  if (!ind || !s.state) return null;
  const count = preview ? preview.changes.length + preview.added.length : 0;
  const take = async () => {
    setBusy(true); setError(null);
    const { currentZone, dateKey } = await import('../engine');
    const e = await store.takeNewerRecords(dateKey(store.state!.now, currentZone(store.state!)));
    setBusy(false);
    if (e) { setError(e); return; }
    setOpen(false);
    setNote('Done. A copy of your game from before the change is in Saved Games, under Recovery Copies.');
  };
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 'var(--s4) 0 0' }} aria-busy={busy}>
      <legend style={{ fontWeight: 600, marginBottom: 'var(--s2)' }}>Your Story's World</legend>
      <p className="muted">This game's world began from the records gathered up to {day(`${ind.horizon}T00:00:00Z`)}, and keeps them: installing newer films and series never changes what your story has decided.</p>
      {preview && count > 0 && (
        <>
          <p>The installed films and series were gathered later, on {day(preview.builtAt)}.{' '}
            {preview.changes.length > 0 && `You can take them for ${plural(preview.changes.length, 'series', 'series')} your story hasn't decided anything for yet${preview.added.length ? `, and add ${plural(preview.added.length, 'series', 'series')} it doesn't follow yet` : ''}.`}
            {preview.changes.length === 0 && `They follow ${plural(preview.added.length, 'series', 'series')} your story doesn't yet, which you can add.`}
            {preview.kept > 0 && ` ${plural(preview.kept, 'series', 'series')} already decided won't change.`}</p>
          {!open && <button className="btn btn-sm" onClick={() => setOpen(true)}>See What Would Change</button>}
          {open && (
            <>
              <ul className="list" aria-label="What Would Change">
                {preview.changes.map((c) => <li key={c.r} className="list-item"><span className="grow"><strong>{c.title}</strong><div className="dim small">{c.what.join(' ')}</div></span></li>)}
                {preview.added.map((a) => <li key={a.r} className="list-item"><span className="grow"><strong>{a.title}</strong><div className="dim small">New to your story: its future would be decided from now on.</div></span></li>)}
              </ul>
              <p className="dim small">Your game is saved and a copy kept first. Nothing already decided, no film already released and no date before today changes.</p>
              <div className="row gap-2 wrap">
                <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => void take()}>Take The Newer Records</button>
                <button className="btn btn-sm" disabled={busy} onClick={() => setOpen(false)}>Keep My World As It Is</button>
              </div>
            </>
          )}
        </>
      )}
      {note && <p role="status" className="muted">{note}</p>}
      {error && <p role="alert" className="error">{error}</p>}
    </fieldset>
  );
}

export function DataPacks() {
  useStore();
  const [installed, setInstalled] = useState<Map<PackKind, InstalledPack> | null>(null);
  const [offered, setOffered] = useState<OfferedMod[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Counts installs, removals and sign-ins, so the world's records are compared again after each.
  const [version, setVersion] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const cancel = useRef<AbortController | null>(null);
  const [showPictures, setShowPictures] = useState(picturesOn);
  const [session, setSession] = useState<OwnerSession>({ owner: false, signIn: false });
  const reload = () => void installedPacks().then(setInstalled);
  const ask = () => { void offeredMods().then(setOffered); void ownerSession().then(setSession); };
  useEffect(() => { reload(); ask(); }, []);
  // Signing in or out changes what the server answers: the pages read the catalog afresh, and an open game's world
  // starts or waits, as when a mod comes or goes.
  const signedInOrOut = async () => {
    ask(); forgetCatalog(); retryCatalog();
    if (!store.state) return;
    (await import('../engine/industry')).setIndustryWorld(null);
    startLivingWorld();
    void expirePeople();
    store.emit();
    setVersion((v) => v + 1);
  };

  const run = async (name: string, work: () => Promise<InstalledPack>) => {
    setBusy(true); setError(null); setStatus(`Getting ${name} ready…`);
    try {
      const p = await work();
      await refreshGame(p.kind, true);
      setVersion((v) => v + 1);
      setStatus(`Installed ${p.name}. ${WHERE[p.kind]}`);
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      cancel.current = null;
      if (input.current) input.current.value = '';
      reload();
    }
  };
  const signal = () => (cancel.current = new AbortController()).signal;
  const install = (m: OfferedMod) => run(m.name, () => installOffered(m, (phase, done, total) =>
    setStatus(phase === 'download' ? `Downloading ${m.name}: ${mb(done)} of ${mb(total)}…` : `Installing ${m.name}: ${n(done)} of ${n(total)} files…`), signal()));
  const fromFile = (f: File) => run('the mod', () => installPack(f, (done, total) => setStatus(`Installing: ${n(done)} of ${n(total)} files…`), signal()));
  const remove = async (p: InstalledPack) => {
    setBusy(true); setError(null);
    try {
      await removePack(p.kind);
      await refreshGame(p.kind, false);
      setVersion((v) => v + 1);
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
    <>
    <fieldset style={{ border: 0, padding: 0, margin: 'var(--s4) 0 0' }} aria-busy={busy}>
      <legend style={{ fontWeight: 600, marginBottom: 'var(--s2)' }}>Mods</legend>
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
                  <About p={newer ? offer! : p} size={newer ? offer!.bytes : have ? have.bytes : offer!.bytes} toInstall={!!offer && (!have || newer)} />
                  {offer && (!have || newer) && downloadedSoFar(offer) > 0 && !busy && <div className="dim small">{mb(downloadedSoFar(offer))} of it is already downloaded and kept until you close the game; installing goes on from there.</div>}
                </span>
                {offer && (!have || newer) && <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => void install(offer)} aria-label={`${newer ? 'Update' : 'Install'} ${offer.name}`}>{newer ? 'Update' : 'Install'}</button>}
                {have && <button className="btn btn-sm" disabled={busy} onClick={() => void remove(have)} aria-label={`Remove ${have.name}`}>Remove</button>}
              </li>
            );
          })}
        </ul>
      )}
      <OwnerSignIn session={session} changed={() => void signedInOrOut()} />
      <input ref={input} type="file" accept=".slatepack" hidden aria-label="Mod File"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void fromFile(f); }} />
      <button className="btn btn-sm" style={{ marginTop: 'var(--s2)' }} disabled={busy} onClick={() => input.current?.click()}>Install From A File</button>
      {busy && cancel.current && <button className="btn btn-sm" style={{ marginTop: 'var(--s2)', marginLeft: 'var(--s2)' }} onClick={() => cancel.current?.abort()}>Cancel</button>}
      {status && <p role="status" className="muted">{status}</p>}
      {error && <p role="alert" className="error">{error}</p>}
      <Storage installed={installed} version={version} />
      {(installed?.has('images') || offered.some((m) => m.kind === 'images')) && (
        <Check label="Show Pictures From The Picture Pack" checked={showPictures} onChange={(v) => { setPicturesOn(v); setShowPictures(v); }}
          hint="On this device only. Off, every picture is a plain placeholder and none is read from storage. A device that asks its browser for less data is shown none either way." />
      )}
    </fieldset>
    <WorldRecords version={version} />
    </>
  );
}
