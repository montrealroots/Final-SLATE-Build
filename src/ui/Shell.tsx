import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  DAY, FORECAST_HORIZON_DAYS, addLocal, currentZone, dateKey, formatDuration, formatZoneAbbrev, localParts, localToInstant, nextNotableEvent,
} from '../engine';
import { Check, Modal, SelectField, TextField, longLocal } from './components';
import { HOME, RAIL_DESTINATIONS, destinationOf, type Destination } from './routes';
import { store, useClock, useGame, useStore } from './store';


export const DRAWER_QUERY = '(max-width: 56.25em), (max-height: 500px)';

function useMedia(query: string): boolean {
  const [on, setOn] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const m = matchMedia(query);
    const read = () => setOn(m.matches);
    read();
    m.addEventListener('change', read);
    return () => m.removeEventListener('change', read);
  }, [query]);
  return on;
}

/** The game's frame, as 1221's (`ui/shell/GameShell.tsx`): the bar across the top, the rail down the left, the screen. */
export function Shell({ children }: { children: ReactNode }) {
  const s = useStore();
  const g = useGame();
  const [railOpen, setRailOpen] = useState(false);
  const [exitError, setExitError] = useState(false);
  const drawer = useMedia(DRAWER_QUERY);
  const route = s.route;
  const here = destinationOf(route.view);
  // A new screen takes focus as it is shown, in the same commit, before the player can reach any of its fields.
  const main = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!store.focusMain) return;
    store.focusMain = false;
    main.current?.focus({ preventScroll: false });
  });

  useEffect(() => {
    if (!railOpen) return;
    // Into the drawer as it opens; Escape closes it and returns to Menu.
    requestAnimationFrame(() => document.querySelector<HTMLElement>('#rail .rail-item')?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setRailOpen(false); document.querySelector<HTMLElement>('.rail-toggle')?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [railOpen]);

  // The drawer and its shade start under the bar, which is two rows on a phone.
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>('.topbar');
    if (!bar || typeof ResizeObserver === 'undefined') return;
    const set = () => document.documentElement.style.setProperty('--bar-h', `${bar.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  const go = (view: string) => { setRailOpen(false); store.go({ view }); };
  // The drawer closes first, so a save that fails shows its message rather than sitting under the drawer.
  const exit = async () => { setRailOpen(false); setExitError(!(await store.saveAndExit())); };
  const current = (d: Destination) => (here === d ? (route.view === d.view || !d.homeOnly ? 'page' : 'true') : d === HOME && here.homeOnly ? 'true' : undefined);

  return (
    <div className="shell">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip To Content</a>
      <TopBar railOpen={railOpen} onMenu={() => setRailOpen((o) => !o)} drawer={drawer} hereLabel={here.label} onExit={exit} />
      <div className="shell-body">
        <nav className="rail" id="rail" data-open={railOpen} aria-label="Main Navigation">
          <div className="rail-group">
            <button className="rail-item" aria-current={current(HOME)} title={HOME.detail} onClick={() => go('home')}>
              <span className="grow truncate">Home</span>
            </button>
          </div>
          {RAIL_DESTINATIONS.map((group) => (
            <div key={group.label} className="rail-group">
              <div className="rail-group-label">{group.label}</div>
              {group.items.map((item) => (
                <button key={item.view} className="rail-item" aria-current={current(item)} title={item.detail} onClick={() => go(item.view)}>
                  <span className="grow truncate">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
          <div className="rail-group rail-player">
            <div className="rail-group-label">You</div>
            <button type="button" className="rail-you rail-item" aria-label={`${g.character.name}, Open Your Player Profile`} onClick={() => go('profile')}>
              <span className="col gap-1">
                <span className="small strong truncate">{g.character.name}</span>
                <span className="xs dim truncate">{g.character.actingTitle || 'Actor'}</span>
              </span>
            </button>
          </div>
          {drawer && (
            <div className="rail-group rail-foot">
              <SaveGroup onExit={exit} />
            </div>
          )}
        </nav>
        {railOpen && <button type="button" className="rail-shade" aria-label="Close Navigation" onClick={() => setRailOpen(false)} />}
        <main className="main" id="main" tabIndex={-1} ref={main}>
          <div className="main-inner">
            {s.readOnly && (
              <div className="callout callout-negative" role="alert">
                <p>This game is open in another tab, so time isn't running here and changes are paused.</p>
                <button className="btn btn-primary btn-sm" onClick={() => store.takeOver()}>Take Over Here</button>
              </div>
            )}
            {exitError && s.saveStatus !== 'saved' && (
              <div className="callout callout-negative" role="alert">
                <p>Your game couldn't be saved. Keep this window open and try again.</p>
                <button className="btn btn-primary btn-sm" onClick={exit}>Try Again</button>
              </div>
            )}
            <NoticeBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/** The save side of the bar: whether it's saved, and Save & Exit. In the drawer's foot while the rail is a drawer. */
function SaveGroup({ onExit }: { onExit: () => void }) {
  const s = useStore();
  const saveLabel = s.saveStatus === 'saving' ? 'Saving…' : s.saveStatus === 'saved' ? 'Saved' : s.saveStatus === 'error' ? "Couldn't Save" : 'Not Saved Yet';
  return (
    <div className="topbar-group" role="group" aria-label="Your Save">
      <span className={`save-state xs ${s.saveStatus === 'error' ? 'negative' : 'dim'}`} role="status" aria-live="polite" style={{ minWidth: 52, textAlign: 'right' }}>{s.busy ? `${s.busy}…` : saveLabel}</span>
      <button className="btn btn-ghost btn-sm" onClick={onExit}>Save &amp; Exit</button>
    </div>
  );
}

function TopBar({ railOpen, onMenu, drawer, hereLabel, onExit }: { railOpen: boolean; onMenu: () => void; drawer: boolean; hereLabel: string; onExit: () => void }) {
  const s = useStore();
  const g = useGame();
  const now = useClock() || g.now;
  const zone = currentZone(g);
  const t = longLocal(now, zone);
  const p = localParts(now, zone);
  const [advance, setAdvance] = useState(false);
  const [sleep, setSleep] = useState(false);
  const blocked = !!s.busy || s.readOnly || g.sleep.asleep || !!s.processingProblem;
  const running = !s.readOnly && !s.processingProblem;
  return (
    <header className="topbar">
      <button className="btn btn-ghost btn-sm rail-toggle" onClick={onMenu} aria-expanded={railOpen} aria-controls="rail">Menu</button>
      <button className="topbar-brand btn btn-ghost" onClick={() => store.go({ view: 'home' })} aria-label="SLATE, Go To Home">
        <span aria-hidden="true">🎬</span>
        <span className="hide-sm">SLATE</span>
      </button>
      {drawer && <span className="topbar-here">{hereLabel}</span>}
      <div className="topbar-clock" aria-live="off">
        <strong className="clockface">{t.time.replace(' ', `:${String(p.second).padStart(2, '0')} `)}</strong>
        <span className="topbar-clock-sep" aria-hidden="true">·</span>
        <span className="topbar-clock-date">{t.weekday}, {t.date}</span>
        <span className="topbar-clock-zone">{formatZoneAbbrev(now, zone)}</span>
        <span className="clock-state" data-running={running}>{g.sleep.asleep ? 'Asleep' : running ? 'Running' : 'Paused'}</span>
      </div>
      <div className="topbar-time row gap-2" role="group" aria-label="Time">
        <button className="btn btn-sm" disabled={blocked} onClick={() => setSleep(true)}>Sleep</button>
        <button className="btn btn-sm" disabled={blocked} onClick={() => setAdvance(true)}>Advance</button>
      </div>
      <div className="grow" />
      {!drawer && (
        <>
          <span className="topbar-divider" aria-hidden="true" />
          <SaveGroup onExit={onExit} />
        </>
      )}
      {advance && <AdvanceDialog onClose={() => setAdvance(false)} />}
      {sleep && <SleepDialog onClose={() => setSleep(false)} />}
      {s.processingProblem && (
        <div className="callout callout-negative save-alert" role="alert">
          <p>Time is paused. {s.processingProblem}</p>
          <div className="row gap-2 wrap">
            <button className="btn btn-primary btn-sm" onClick={() => store.retryTime()}>Try Again</button>
            <button className="btn btn-sm" onClick={() => store.exportSave()}>Export Save</button>
          </div>
        </div>
      )}
      {s.saveStatus === 'error' && (
        <div className="callout callout-negative save-alert" role="alert">
          {s.saveStorageFull
            ? <p>Your game couldn't be saved because this browser's storage for SLATE is full. Your last save is still there. Free up space in Saved Games, or export this game, then try again.</p>
            : <p>Your game couldn't be saved. Keep this window open and try again.</p>}
          <div className="row gap-2 wrap">
            <button className="btn btn-primary btn-sm" onClick={() => store.saveNow()}>Try Again</button>
            {s.saveStorageFull && <button className="btn btn-sm" onClick={() => store.go({ view: 'saves' })}>Free Up Space</button>}
            <button className="btn btn-sm" onClick={() => store.exportSave()}>Export Save</button>
          </div>
        </div>
      )}
    </header>
  );
}

function AdvanceDialog({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const zone = currentZone(g);
  const next = nextNotableEvent(g);
  const [mode, setMode] = useState<'next-event' | 'next-day' | 'week' | 'month' | 'time'>(next ? 'next-event' : 'next-day');
  const lp = localParts(g.now + 3600_000, zone);
  const [date, setDate] = useState(dateKey(g.now, zone));
  const [time, setTime] = useState(`${String(lp.hour).padStart(2, '0')}:00`);
  const [error, setError] = useState<string | null>(null);
  const describe = (at: number) => {
    const t = longLocal(at, zone);
    return `${t.weekday}, ${t.date}, ${t.time}`;
  };
  const go = () => {
    if (mode === 'time') {
      const [y, m, d] = date.split('-').map(Number);
      const [hh, mm] = time.split(':').map(Number);
      if (!y || Number.isNaN(hh)) return setError('Choose a date and time.');
      const at = localToInstant(zone, y, m, d, hh, mm).instant;
      if (at <= g.now) return setError('Choose a time later than now.');
      if (at - g.now > 400 * DAY) return setError('Choose a time within about a year.');
      onClose();
      void store.advance({ at });
      return;
    }
    onClose();
    void store.advance(mode);
  };
  return (
    <Modal title="Advance" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={go}>Advance</button></>}>
      <p className="muted">Everything along the way still happens. Advancing stops early if something needs you.</p>
      <SelectField label="Advance To" value={mode} onChange={(v) => { setMode(v); setError(null); }} options={[
        ...(next ? [{ value: 'next-event' as const, label: `Next Event (${describe(next.at)})` }] : []),
        { value: 'next-day', label: `Same Time Tomorrow (${describe(addLocal(g.now, zone, { days: 1 }))})` },
        { value: 'week', label: `One Week (${describe(addLocal(g.now, zone, { days: 7 }))})` },
        { value: 'month', label: `One Month (${describe(addLocal(g.now, zone, { months: 1 }))})` },
        { value: 'time', label: 'A Time I Choose' },
      ]} />
      {mode === 'time' && (
        <div className="grid grid-2 form">
          <TextField label="Date" type="date" value={date} onChange={setDate} />
          <TextField label="Time" type="time" value={time} onChange={setTime} error={error} />
        </div>
      )}
      {mode !== 'time' && error && <p role="alert" style={{ color: 'var(--negative)' }}>{error}</p>}
    </Modal>
  );
}

function SleepDialog({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const zone = currentZone(g);
  const [how, setHow] = useState<'wake' | 'duration'>('wake');
  const [wake, setWake] = useState('07:00');
  const [hours, setHours] = useState('8');
  const [alarm, setAlarm] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const target = (() => {
    if (how === 'duration') {
      const h = Number(hours);
      return Number.isFinite(h) && h > 0 ? g.now + h * 3600_000 : null;
    }
    const [hh, mm] = wake.split(':').map(Number);
    if (Number.isNaN(hh)) return null;
    const p = localParts(g.now, zone);
    let at = localToInstant(zone, p.year, p.month, p.day, hh, mm).instant;
    if (at <= g.now + 60_000) {
      const tm = localParts(addLocal(g.now, zone, { days: 1 }), zone);
      at = localToInstant(zone, tm.year, tm.month, tm.day, hh, mm).instant;
    }
    return at;
  })();
  return (
    <Modal title="Sleep" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => {
      if (target === null) return setError('Choose when to wake up.');
      const err = store.sleep(target, alarm);
      if (err) setError(err);
      else onClose();
    }}>Go To Sleep</button></>}>
      <SelectField label="Wake Up" value={how} onChange={setHow} options={[{ value: 'wake', label: 'At A Set Time' }, { value: 'duration', label: 'After A Number Of Hours' }]} />
      {how === 'wake' ? <TextField label="Set Wake Time" type="time" value={wake} onChange={setWake} error={error} /> : <TextField label="Hours Of Sleep" type="number" inputMode="decimal" value={hours} onChange={setHours} error={error} />}
      <Check label="Set An Alarm" checked={alarm} onChange={setAlarm} hint="With an alarm you can snooze when you wake." />
      {target !== null && <p className="muted">You'll wake {(() => { const t = longLocal(target, zone); return `at ${t.time} on ${t.weekday}`; })()}, after {formatDuration(target - g.now)}.{g.settings.wakeForObligations ? ' Reminders and call times will wake you earlier.' : ''}</p>}
      <p className="dim">Forecasts look ahead up to {FORECAST_HORIZON_DAYS} days.</p>
    </Modal>
  );
}

function NoticeBanner() {
  const s = useStore();
  const g = useGame();
  const n = s.notice;
  if (!n) return null;
  return (
    <div className={`callout ${n.kind === 'interrupt' ? 'callout-warning' : 'callout-info'}`} role="status" aria-live="polite">
      <h2 style={{ fontSize: 'var(--size-md)', marginBottom: 'var(--s1)' }}>{n.title}</h2>
      <p>{n.text}</p>
      <div className="row gap-2 wrap">
        {n.snooze && !g.sleep.asleep && <button className="btn btn-sm" onClick={() => { store.dismissNotice(); store.sleep(g.now + 10 * 60_000, true); }}>Snooze 10 Minutes</button>}
        <button className="btn btn-sm btn-primary" onClick={() => store.dismissNotice()}>Dismiss</button>
      </div>
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; route?: { view: string; projectId?: string; tab?: string } }[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={i} className="row gap-2">
          {i > 0 && <span aria-hidden="true">›</span>}
          {it.route ? <button onClick={() => store.go(it.route!)}>{it.label}</button> : <span className="muted" aria-current="page">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}
