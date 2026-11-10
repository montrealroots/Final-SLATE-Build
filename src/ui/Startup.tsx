import { lazy, Suspense, useRef, useState } from 'react';
import { findPlace, placeLabel, type Place } from '../data/places';
// Only a save that names a place the game can't find needs a place search, so it loads with that screen (November 10,
// 2026); until then the start screen carried it.
const WorldPlacePicker = lazy(() => import('./WorldPicker').then((m) => ({ default: m.WorldPlacePicker })));
import { Check, Modal, TextField, Wordmark, longLocal, realTimestamp } from './components';
import { store, useStore } from './store';

export function Startup() {
  const s = useStore();
  const saves = s.saves();
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  const [view, setView] = useState<'home' | 'saves'>('home');
  const [showDraftOffer, setShowDraftOffer] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const latest = saves[0];
  const draft = s.draft;

  if (s.screen === 'loading') {
    return (
      <div className="start-page">
        <div className="main-inner start-head" role="status" aria-live="polite">
          <Wordmark as="h1" />
          <h2>Opening Your Game</h2>
          <p>Your saved game is loading.</p>
        </div>
      </div>
    );
  }
  if (s.screen === 'repair' && s.repair) return <RepairPlaces />;
  if (s.screen === 'load-error') {
    return (
      <div className="start-page">
        <div className="main-inner">
          <div className="start-head"><Wordmark as="h1" /></div>
          <div className="card" role="alert">
            <h2>Couldn't Open This Save</h2>
            <p>Your saved game couldn't be opened. It hasn't been deleted or changed.</p>
            {s.loadErrorMessage && <p className="muted">{s.loadErrorMessage}</p>}
            <div className="row gap-2 wrap">
              <button className="btn btn-primary" onClick={() => s.loadErrorSave && store.open(s.loadErrorSave)}>Try Again</button>
              <button className="btn" onClick={() => store.backToStartup()}>Back To Saved Games</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const newGame = () => {
    if (draft) setShowDraftOffer(true);
    else store.startCreation(true);
  };

  if (view === 'saves') {
    return (
      <div className="start-page">
        <div className="main-inner">
          <div className="start-head"><Wordmark /></div>
          <div className="page-head"><h1>Saved Games</h1><p className="muted">Every saved game on this device.</p></div>
          <SavedGamesList />
          <div className="row gap-2 wrap spaced">
            <button className="btn" onClick={() => setView('home')}>Back To Start Screen</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="start-page">
      <div className="main-inner">
        <div className="start-head">
          <Wordmark as="h1" />
          <p className="muted">Your next story starts here.</p>
        </div>
        {!s.storageReady && <p role="status" className="muted">Looking for your saved games…</p>}
        {s.storageNote && <p role="alert" className="muted">{s.storageNote}</p>}

        {latest && (
          <section className="card" aria-labelledby="resume-h">
            <h2 id="resume-h" className="sr-only">Most Recent Game</h2>
            <SaveLine summary={latest} />
          </section>
        )}

        <div className="row gap-2 wrap start-actions" role="group" aria-label="Start" hidden={!s.storageReady}>
          <button className={latest ? 'btn' : 'btn btn-primary'} onClick={newGame}>New Game</button>
          {latest && <button className="btn btn-primary" onClick={() => store.open(latest.saveId)}>Continue</button>}
          <button className="btn" onClick={() => setView('saves')}>Saved Games</button>
          <button className="btn" onClick={() => setSettingsOpen(true)}>Settings</button>
        </div>

        {(showDraftOffer || (!latest && draft)) && draft && (
          <section className="card spaced" aria-labelledby="draft-h">
            <h2 id="draft-h">Continue Creating Your Character</h2>
            <p>Your choices are saved. Pick up where you left off.</p>
            <div className="row gap-2 wrap">
              <button className="btn btn-primary" onClick={() => store.startCreation(false)}>Continue Creation</button>
              <button className="btn" onClick={() => setConfirmStartOver(true)}>Start Over</button>
            </div>
          </section>
        )}
      </div>

      {confirmStartOver && (
        <Modal title="Start Over?" onClose={() => setConfirmStartOver(false)} footer={
          <>
            <button className="btn btn-danger" onClick={() => { store.discardDraft(); setConfirmStartOver(false); store.startCreation(true); }}>Discard Draft</button>
            <button className="btn btn-primary" onClick={() => { setConfirmStartOver(false); store.startCreation(false); }}>Keep Editing</button>
          </>
        }>
          <p>This will discard your unfinished character. Your saved games won't change.</p>
        </Modal>
      )}
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

/** Every saved game, with Continue, Rename and Delete. In a game, the one being played can't be deleted from here. */
export function SavedGamesList() {
  const s = useStore();
  const saves = s.saves();
  const current = s.state?.saveId;
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  if (!saves.length) return <><p className="muted">No saved games yet. Start a new game to create your character, or import a save you exported.</p><ImportSave /><StoragePanel /></>;
  const copiesOf = (id: string) => s.recoveryCopies().filter((c) => c.saveId === id).length;
  return (
    <>
      <ul className="list">
        {saves.map((sv) => (
          <li key={sv.saveId}>
            <div className="row-wrap">
              <div className="grow"><SaveLine summary={sv} /></div>
              <div className="row gap-2 wrap">
                {sv.saveId === current ? <span className="chip chip-accent">Playing Now</span> : (
                  <button className="btn btn-sm" onClick={() => void store.switchTo(sv.saveId)} aria-label={`Continue ${sv.saveName}`}>Continue</button>
                )}
                <button className="btn btn-sm" onClick={() => { setRenaming({ id: sv.saveId, name: sv.saveName }); setRenameError(null); }} aria-label={`Rename Save ${sv.saveName}`}>Rename Save</button>
                <button className="btn btn-sm" onClick={() => store.exportSave(sv.saveId)} aria-label={`Export Save ${sv.saveName}`}>Export Save</button>
                {sv.saveId !== current && <button className="btn btn-sm btn-danger" onClick={() => setDeleting({ id: sv.saveId, name: sv.characterName })} aria-label={`Delete Save ${sv.saveName}`}>Delete Save</button>}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <ImportSave />
      {deleting && (
        <Modal title="Delete This Save?" onClose={() => setDeleting(null)} footer={
          <>
            <button className="btn btn-danger" onClick={() => { store.deleteSave(deleting.id); setDeleting(null); }}>Delete Save</button>
            <button className="btn btn-primary" onClick={() => setDeleting(null)}>Keep Save</button>
          </>
        }>
          <p>This will permanently delete {deleting.name}'s saved game{(() => {
            const n = copiesOf(deleting.id);
            return n ? `, its backup and ${n === 1 ? 'its recovery copy' : `its ${n} recovery copies`}` : ' and its backup';
          })()}.</p>
        </Modal>
      )}
      {renaming && (
        <Modal title="Rename Save" onClose={() => setRenaming(null)} footer={
          <>
            <button className="btn" onClick={() => setRenaming(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => void store.renameSave(renaming.id, renaming.name).then((err) => { if (err) setRenameError(err); else setRenaming(null); })}>Rename Save</button>
          </>
        }>
          <TextField label="Save Name" value={renaming.name} maxLength={80} error={renameError} onChange={(v) => setRenaming({ ...renaming, name: v })} />
        </Modal>
      )}
      <StoragePanel />
    </>
  );
}

type ImportStage =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'done'; saveId: string; name: string }
  | { kind: 'error'; message: string }
  | { kind: 'conflict'; text: string; existing: ReturnType<typeof store.saves>[number] }
  | { kind: 'confirm-replace'; text: string; existing: ReturnType<typeof store.saves>[number] };

/**
 * Import Save: reads an exported save file, checks and upgrades it, and stores it. A save with the same ID is never
 * replaced silently: the player chooses a separate copy or confirms a replacement. The file itself is never changed.
 */
function ImportSave() {
  const s = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<ImportStage>({ kind: 'idle' });
  const run = async (text: string, mode?: 'copy' | 'replace') => {
    setStage({ kind: 'busy' });
    const r = await store.importSaveFile(text, mode);
    if (r.ok) setStage({ kind: 'done', saveId: r.saveId, name: r.name });
    else if ('conflict' in r) setStage({ kind: 'conflict', text, existing: r.conflict });
    else setStage({ kind: 'error', message: r.error });
  };
  const choose = async (file: File | undefined) => {
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setStage({ kind: 'error', message: "The file couldn't be read." });
      return;
    }
    await run(text);
  };
  return (
    <section className="card spaced" aria-labelledby="import-h">
      <h2 id="import-h">Import Save</h2>
      <p className="muted">Bring back a save you exported from SLATE, from this browser or another. The file isn't changed.</p>
      <input ref={input} type="file" accept=".json,application/json" hidden aria-label="Save File To Import"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void choose(f); }} />
      <button className="btn" disabled={stage.kind === 'busy'} onClick={() => input.current?.click()}>{stage.kind === 'busy' ? 'Importing…' : 'Import Save'}</button>
      {stage.kind === 'error' && <p role="alert" className="error">This save couldn't be imported. {stage.message}</p>}
      {stage.kind === 'done' && (
        <div role="status" className="row-wrap spaced">
          <span className="grow">Imported {stage.name}. It's in your saved games.</span>
          {s.state?.saveId !== stage.saveId && <button className="btn btn-sm btn-primary" onClick={() => void (s.state ? store.switchTo(stage.saveId) : store.open(stage.saveId))}>Open Imported Save</button>}
        </div>
      )}
      {stage.kind === 'conflict' && (
        <Modal title="This Save Is Already Here" onClose={() => setStage({ kind: 'idle' })} footer={
          <>
            <button className="btn" onClick={() => setStage({ kind: 'idle' })}>Cancel</button>
            <button className="btn" onClick={() => setStage({ kind: 'confirm-replace', text: stage.text, existing: stage.existing })}>Replace The Save Here</button>
            <button className="btn btn-primary" onClick={() => void run(stage.text, 'copy')}>Import As A Separate Copy</button>
          </>
        }>
          <p>The file is the same saved game as {stage.existing.saveName ? <><strong>{stage.existing.saveName}</strong>{stage.existing.savedAtReal ? `, saved ${realTimestamp(stage.existing.savedAtReal)}` : ''}</> : 'a save already here'}.</p>
          <p>A separate copy keeps both. Nothing is replaced unless you choose to.</p>
        </Modal>
      )}
      {stage.kind === 'confirm-replace' && (
        <Modal title="Replace This Save?" onClose={() => setStage({ kind: 'idle' })} footer={
          <>
            <button className="btn btn-primary" onClick={() => setStage({ kind: 'conflict', text: stage.text, existing: stage.existing })}>Keep The Save Here</button>
            <button className="btn btn-danger" onClick={() => void run(stage.text, 'replace')}>Replace Save</button>
          </>
        }>
          <p>{stage.existing.saveName || 'The save here'} will be replaced by the file. The save it replaces is kept as this save's backup until the next time it is saved; export it first if you want to keep it for longer.</p>
        </Modal>
      )}
    </section>
  );
}

function size(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_073_741_824).toFixed(1)} GB`;
  return n >= 1_000_000 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

type Copy = ReturnType<typeof store.recoveryCopies>[number];

function copyLabel(c: Copy): string {
  if (c.kind === 'damaged') return 'Damaged save';
  if (c.kind === 'migration') return 'Copy from before an update';
  if (c.kind === 'repair') return 'Copy from before places were repaired';
  if (c.kind === 'conflict') return 'Copy saved by another tab';
  return 'Copy from an interrupted save';
}

/** How much browser storage the games use, and the recovery copies the game keeps, with Export and Delete. */
function StoragePanel() {
  const s = useStore();
  const use = s.storageUse();
  const copies = s.recoveryCopies();
  const names = new Map(s.saves().map((x) => [x.saveId, x.saveName]));
  const [deleting, setDeleting] = useState<Copy | null>(null);
  const share = use.usedChars / use.limitChars;
  return (
    <section className="card spaced" aria-labelledby="storage-h">
      <h2 id="storage-h">Storage</h2>
      <p>Your games use about {size(use.usedChars)} of the roughly {size(use.limitChars)} this browser keeps for SLATE.</p>
      {share > 0.6 && <p className="muted">Saving needs room for about two copies of a game. If saving starts to fail, export and delete copies you don't need.</p>}
      <h3>Recovery Copies</h3>
      {copies.length === 0 ? (
        <p className="muted">None. Each game also keeps its previous save as a backup, replaced as you play.</p>
      ) : (
        <>
          <p className="muted">SLATE keeps these so lost progress can be recovered, and never deletes them by itself. Export a copy to keep it as a file.</p>
          <ul className="list" aria-label="Recovery Copies">
            {copies.map((c) => {
              const label = `${copyLabel(c)} of ${names.get(c.saveId) ?? 'a deleted game'}`;
              const when = c.keptAtReal ?? c.savedAtReal;
              return (
                <li key={c.key}>
                  <div className="row-wrap">
                    <div className="grow">
                      <div style={{ fontWeight: 700 }}>{label}</div>
                      <div className="dim">{when ? `${c.kind === 'damaged' ? 'Kept' : 'Saved'} ${realTimestamp(when)} · ` : ''}{size(c.chars)}</div>
                    </div>
                    <div className="row gap-2 wrap">
                      <button className="btn btn-sm" onClick={() => store.exportRecoveryCopy(c)} aria-label={`Export ${label}`}>Export Copy</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleting(c)} aria-label={`Delete ${label}`}>Delete Copy</button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {deleting && (
        <Modal title="Delete This Copy?" onClose={() => setDeleting(null)} footer={
          <>
            <button className="btn btn-danger" onClick={() => { store.deleteRecoveryCopy(deleting.key); setDeleting(null); }}>Delete Copy</button>
            <button className="btn" onClick={() => store.exportRecoveryCopy(deleting)}>Export First</button>
            <button className="btn btn-primary" onClick={() => setDeleting(null)}>Keep Copy</button>
          </>
        }>
          <p>This permanently deletes the copy and frees {size(deleting.chars)}. Your saved game and its backup won't change.</p>
        </Modal>
      )}
    </section>
  );
}

function SaveLine({ summary }: { summary: ReturnType<typeof store.saves>[number] }) {
  const place = findPlace(summary.locationId);
  const when = place ? longLocal(summary.gameNow, place.zone) : null;
  return (
    <div>
      <div style={{ fontWeight: 700 }}>{summary.saveName}{summary.saveName !== summary.characterName ? ` (${summary.characterName})` : ''}</div>
      {place && when && <div className="muted">{placeLabel(place)} · {when.weekday}, {when.date}, {when.time}</div>}
      <div className="dim">Saved {realTimestamp(summary.savedAtReal)}{summary.startedAtReal ? ` · Begun ${realTimestamp(summary.startedAtReal)}` : ''}</div>
    </div>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Settings" onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}>
      <SettingsPanel />
    </Modal>
  );
}

/** The settings themselves: shown in a dialog on the start screen and as the Settings page in a game. */
export function SettingsPanel() {
  const s = useStore();
  const theme = (document.documentElement.dataset.theme as 'dark' | 'light') || 'dark';
  const large = document.documentElement.dataset.text === 'large';
  return (
    <>
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
        <legend style={{ fontWeight: 600, marginBottom: 8 }}>Theme</legend>
        <div className="row gap-2 wrap">
          <button className={`btn ${theme === 'dark' ? 'btn-primary' : ''}`} aria-pressed={theme === 'dark'} onClick={() => store.setTheme('dark')}>Dark</button>
          <button className={`btn ${theme === 'light' ? 'btn-primary' : ''}`} aria-pressed={theme === 'light'} onClick={() => store.setTheme('light')}>Light</button>
        </div>
      </fieldset>
      <Check label="Larger Text" checked={large} onChange={(v) => {
        document.documentElement.dataset.text = v ? 'large' : '';
        try { localStorage.setItem('slate.v1.text', v ? 'large' : ''); } catch { /* ignore */ }
        store.emit();
      }} />
      {s.state && (
        <Check label="Wake Me For Obligations" hint="Reminders and call times wake you during Sleep." checked={s.state.settings.wakeForObligations}
          onChange={(v) => store.act((g) => (g.settings.wakeForObligations = v))} />
      )}
      <p className="dim">Motion follows your device's reduced-motion setting.</p>
    </>
  );
}

/** A save that mentions places the game can't find: choose a replacement for each before it opens. */
function RepairPlaces() {
  const s = useStore();
  const r = s.repair!;
  const [chosen, setChosen] = useState<Record<string, Place>>({});
  const [error, setError] = useState<string | null>(null);
  const ready = r.ids.every((id) => chosen[id]);
  return (
    <div className="start-page">
      <div className="main-inner">
        <div className="start-head"><Wordmark /></div>
        <h1>Choose Missing Places</h1>
        <p>This save mentions {r.ids.length === 1 ? 'a place' : `${r.ids.length} places`} the game can't find. Choose {r.ids.length === 1 ? 'a place' : 'places'} to use instead. An untouched copy of the save is kept first, and nothing else changes.</p>
        {r.ids.map((id, i) => (
          <section key={id} className="card spaced" aria-labelledby={`miss-${i}`}>
            <h2 id={`miss-${i}`}>{(r.uses[id] ?? ['A place in this save']).join(', ')}</h2>
            <Suspense fallback={<p role="status">Loading the place search…</p>}><WorldPlacePicker label={`Replacement Place ${i + 1}`} value={chosen[id]?.id ?? ''} onChoose={(pl) => setChosen({ ...chosen, [id]: pl })} /></Suspense>
          </section>
        ))}
        {error && <p role="alert" className="error">{error}</p>}
        <div className="row gap-2 wrap spaced">
          <button className="btn btn-primary" disabled={!ready} onClick={() => void store.repairAndOpen(chosen).then(setError)}>Repair And Continue</button>
          <button className="btn" onClick={() => store.backToStartup()}>Back To Start Screen</button>
        </div>
      </div>
    </div>
  );
}
