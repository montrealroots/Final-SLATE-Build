import { lazy, Suspense, useState } from 'react';
import { findPlace, placeLabel, type Place } from '../data/places';
// Only a save that names a place the game can't find needs a place search, so it loads with that screen (November 10,
// 2026); until then the start screen carried it.
const WorldPlacePicker = lazy(() => import('./WorldPicker').then((m) => ({ default: m.WorldPlacePicker })));
// The saved games list and the settings open only when asked for, so they load then (November 11, 2026).
const SavedGamesList = lazy(() => import('./SavedGames').then((m) => ({ default: m.SavedGamesList })));
const SettingsDialog = lazy(() => import('./SavedGames').then((m) => ({ default: m.SettingsDialog })));
import { Modal, Wordmark, longLocal, realTimestamp } from './components';
import { store, useStore } from './store';

export function Startup() {
  const s = useStore();
  const saves = s.saves();
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  const [view, setView] = useState<'home' | 'saves'>('home');
  const [showDraftOffer, setShowDraftOffer] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const latest = saves[0];
  const draft = s.draftExists;

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
          <Suspense fallback={<p role="status">Loading your saved games…</p>}><SavedGamesList /></Suspense>
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
        {s.startingCreation && <p role="status" className="muted">Getting character creation ready…</p>}

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
      {settingsOpen && <Suspense fallback={null}><SettingsDialog onClose={() => setSettingsOpen(false)} /></Suspense>}
    </div>
  );
}

export function SaveLine({ summary }: { summary: ReturnType<typeof store.saves>[number] }) {
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
