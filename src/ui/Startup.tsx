import { useState } from 'react';
import { findPlace, placeLabel } from '../data/places';
import { Check, Modal, TextField, Wordmark, longLocal, realTimestamp } from './components';
import { store, useStore } from './store';

export function Startup() {
  const s = useStore();
  const saves = s.saves();
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [showDraftOffer, setShowDraftOffer] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const latest = saves[0];
  const draft = s.draft;

  if (s.screen === 'loading') {
    return (
      <div className="startup">
        <div className="startup-card" role="status" aria-live="polite">
          <Wordmark as="h1" />
          <h2>Opening Your Game</h2>
          <p>Your saved game is loading.</p>
        </div>
      </div>
    );
  }
  if (s.screen === 'load-error') {
    return (
      <div className="startup">
        <div className="startup-card">
          <Wordmark as="h1" />
          <div className="panel" role="alert">
            <h2>Couldn't Open This Save</h2>
            <p>Your saved game couldn't be opened. It hasn't been deleted.</p>
            <div className="btn-row">
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

  return (
    <div className="startup">
      <div className="startup-card">
        <Wordmark as="h1" />
        <p className="tagline">Write your stories. Bring them to the screen.</p>

        {latest && (
          <section className="panel" aria-labelledby="resume-h">
            <h2 id="resume-h" className="sr-only">Most Recent Game</h2>
            <SaveLine summary={latest} />
            <div className="btn-row spaced">
              <button className="btn btn-primary" onClick={() => store.open(latest.saveId)}>Resume</button>
              <button className="btn" onClick={newGame}>New Game</button>
            </div>
          </section>
        )}

        {(showDraftOffer || (!latest && draft)) && draft && (
          <section className="panel" aria-labelledby="draft-h">
            <h2 id="draft-h">Continue Creating Your Character</h2>
            <p>Your choices are saved. Pick up where you left off.</p>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={() => store.startCreation(false)}>Continue Creation</button>
              <button className="btn" onClick={() => setConfirmStartOver(true)}>Start Over</button>
            </div>
          </section>
        )}

        {!latest && !draft && (
          <section className="panel" aria-labelledby="none-h">
            <h2 id="none-h">No Saved Games</h2>
            <p>Start a new game to create your character.</p>
            <button className="btn btn-primary" onClick={newGame}>New Game</button>
          </section>
        )}

        {saves.length > 0 && (
          <section className="panel" aria-labelledby="saves-h">
            <h2 id="saves-h">Saved Games</h2>
            <ul className="list">
              {saves.map((sv) => (
                <li key={sv.saveId}>
                  <div className="row">
                    <div className="grow"><SaveLine summary={sv} /></div>
                    <div className="btn-row">
                      <button className="btn btn-small" onClick={() => store.open(sv.saveId)} aria-label={`Resume ${sv.saveName}`}>Resume</button>
                      <button className="btn btn-small" onClick={() => { setRenaming({ id: sv.saveId, name: sv.saveName }); setRenameError(null); }} aria-label={`Rename Save ${sv.saveName}`}>Rename Save</button>
                      <button className="btn btn-small btn-danger" onClick={() => setDeleting({ id: sv.saveId, name: sv.characterName })} aria-label={`Delete Save ${sv.saveName}`}>Delete Save</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="btn-row">
          <button className="btn" onClick={() => setSettingsOpen(true)}>Settings</button>
        </div>
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
      {deleting && (
        <Modal title="Delete This Save?" onClose={() => setDeleting(null)} footer={
          <>
            <button className="btn btn-danger" onClick={() => { store.deleteSave(deleting.id); setDeleting(null); }}>Delete Save</button>
            <button className="btn btn-primary" onClick={() => setDeleting(null)}>Keep Save</button>
          </>
        }>
          <p>This will permanently delete {deleting.name}'s saved game.</p>
        </Modal>
      )}
      {renaming && (
        <Modal title="Rename Save" onClose={() => setRenaming(null)} footer={
          <>
            <button className="btn" onClick={() => setRenaming(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { const err = store.renameSave(renaming.id, renaming.name); if (err) setRenameError(err); else setRenaming(null); }}>Rename Save</button>
          </>
        }>
          <TextField label="Save Name" value={renaming.name} maxLength={80} error={renameError} onChange={(v) => setRenaming({ ...renaming, name: v })} />
        </Modal>
      )}
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function SaveLine({ summary }: { summary: ReturnType<typeof store.saves>[number] }) {
  const place = findPlace(summary.locationId);
  const when = place ? longLocal(summary.gameNow, place.zone) : null;
  return (
    <div>
      <div style={{ fontWeight: 700 }}>{summary.saveName}{summary.saveName !== summary.characterName ? ` (${summary.characterName})` : ''}</div>
      {place && when && <div className="muted">{placeLabel(place)} · {when.weekday}, {when.date}, {when.time}</div>}
      <div className="dim">Saved {realTimestamp(summary.savedAtReal)}</div>
    </div>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const theme = (document.documentElement.dataset.theme as 'dark' | 'light') || 'dark';
  const large = document.documentElement.dataset.text === 'large';
  return (
    <Modal title="Settings" onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}>
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
        <legend style={{ fontWeight: 600, marginBottom: 8 }}>Theme</legend>
        <div className="btn-row">
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
    </Modal>
  );
}
