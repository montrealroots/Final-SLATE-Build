import { useEffect, useState, type ReactNode } from 'react';
import { placeLabel } from '../data/places';
import {
  DAY, FORECAST_HORIZON_DAYS, addLocal, currentPlace, currentZone, dateKey, formatDuration, localParts, localToInstant, nextNotableEvent, weatherOn,
} from '../engine';
import { Check, Modal, SelectField, TextField, Wordmark, longLocal } from './components';
import { DESTINATIONS, destinationOf } from './routes';
import { store, useClock, useGame, useStore } from './store';


export function Shell({ children }: { children: ReactNode }) {
  const s = useStore();
  const [drawer, setDrawer] = useState(false);
  const [exitError, setExitError] = useState(false);
  const route = s.route;
  const active = destinationOf(route.view).view;

  useEffect(() => {
    if (!drawer) return;
    const opener = document.activeElement as HTMLElement | null;
    // Move focus into the drawer, keep Tab inside it, and return focus when it closes.
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.drawer nav a')?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false);
      if (e.key === 'Tab') {
        const items = [...document.querySelectorAll<HTMLElement>('.drawer a, .drawer button')];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [drawer]);

  const nav = (
    <nav aria-label="Main">
      {DESTINATIONS.map((n) => (
        <a key={n.view} href={`#${n.view}`} aria-current={active === n.view ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); setDrawer(false); store.go({ view: n.view }); }}>{n.label}</a>
      ))}
    </nav>
  );

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip To Content</a>
      <TopBar onMenu={() => setDrawer(true)} onSettings={() => store.go({ view: 'settings' })} onExit={async () => setExitError(!(await store.saveAndExit()))} />
      {s.readOnly && (
        <div className="alert bad" role="alert" style={{ margin: '12px 16px 0' }}>
          <p>This game is open in another tab, so time isn't running here and changes are paused.</p>
          <button className="btn btn-primary" onClick={() => store.takeOver()}>Take Over Here</button>
        </div>
      )}
      {exitError && s.saveStatus !== 'saved' && (
        <div className="alert bad" role="alert" style={{ margin: '12px 16px 0' }}>
          <p>Your game couldn't be saved. Keep this window open and try again.</p>
          <button className="btn btn-primary" onClick={async () => setExitError(!(await store.saveAndExit()))}>Try Again</button>
        </div>
      )}
      <div className="body">
        <aside className="rail" aria-label="Navigation">{nav}</aside>
        <main id="main" tabIndex={-1}>
          <div className="page">
            <NoticeBanner />
            {children}
          </div>
        </main>
      </div>
      {drawer && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="btn-row spread"><Wordmark /><button className="btn" onClick={() => setDrawer(false)}>Close Menu</button></div>
            <div className="spaced">{nav}</div>
          </div>
        </>
      )}
    </div>
  );
}

function TopBar({ onMenu, onSettings, onExit }: { onMenu: () => void; onSettings: () => void; onExit: () => void }) {
  const s = useStore();
  const g = useGame();
  const now = useClock() || g.now;
  const place = currentPlace(g);
  const zone = currentZone(g);
  const t = longLocal(now, zone);
  const p = localParts(now, zone);
  const w = weatherOn(g.seed, place, dateKey(now, zone));
  const [advance, setAdvance] = useState(false);
  const [sleep, setSleep] = useState(false);
  const saveLabel = s.saveStatus === 'saving' ? 'Saving' : s.saveStatus === 'saved' ? 'Saved' : s.saveStatus === 'error' ? "Couldn't Save" : '';
  return (
    <header className="topbar">
      <button className="btn menu-btn" onClick={onMenu} aria-haspopup="dialog">Menu</button>
      <Wordmark />
      <div className="context" aria-label="Current Status">
        <span className="who">{g.character.name}</span>
        <button className="btn-quiet btn btn-small" onClick={() => store.go({ view: 'place', placeId: place.id })} aria-label={`${placeLabel(place)}, ${w.condition}, ${Math.round(w.high)} degrees. Open place details.`}>
          {place.name} · {w.condition} · {Math.round(w.low)}° To {Math.round(w.high)}°C
        </button>
        <span>{t.weekday}, {t.date}</span>
        <span className="clockface" aria-live="off">{t.time.replace(' ', `:${String(p.second).padStart(2, '0')} `)}</span>
      </div>
      <div className="tools">
        <span className={`save-state ${s.saveStatus === 'error' ? 'error' : ''}`} role="status" aria-live="polite">{s.busy ? `${s.busy}…` : saveLabel}</span>
        <button className="btn btn-small btn-primary" disabled={!!s.busy || s.readOnly || g.sleep.asleep || !!s.processingProblem} onClick={() => setAdvance(true)}>Advance</button>
        <button className="btn btn-small" disabled={!!s.busy || s.readOnly || g.sleep.asleep || !!s.processingProblem} onClick={() => setSleep(true)}>Sleep</button>
        <button className="btn btn-small" onClick={onSettings}>Settings</button>
        <button className="btn btn-small" onClick={onExit}>Save And Exit</button>
      </div>
      {advance && <AdvanceDialog onClose={() => setAdvance(false)} />}
      {sleep && <SleepDialog onClose={() => setSleep(false)} />}
      {s.processingProblem && (
        <div className="alert bad save-alert" role="alert">
          <p>Time is paused. {s.processingProblem}</p>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => store.retryTime()}>Try Again</button>
            <button className="btn" onClick={() => store.exportSave()}>Export Save</button>
          </div>
        </div>
      )}
      {s.saveStatus === 'error' && (
        <div className="alert bad save-alert" role="alert">
          <p>Your game couldn't be saved. Keep this window open and try again.</p>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => store.saveNow()}>Try Again</button>
            <button className="btn" onClick={() => store.exportSave()}>Export Save</button>
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
        <div className="grid2">
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
    <div className={`alert ${n.kind === 'interrupt' ? '' : 'info'}`} role="status" aria-live="polite">
      <h2 style={{ fontSize: 'var(--size-md)' }}>{n.title}</h2>
      <p>{n.text}</p>
      <div className="btn-row">
        {n.snooze && !g.sleep.asleep && <button className="btn btn-small" onClick={() => { store.dismissNotice(); store.sleep(g.now + 10 * 60_000, true); }}>Snooze 10 Minutes</button>}
        <button className="btn btn-small btn-primary" onClick={() => store.dismissNotice()}>Dismiss</button>
      </div>
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; route?: { view: string; projectId?: string; tab?: string } }[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={i}>
          {it.route ? <button onClick={() => store.go(it.route!)}>{it.label}</button> : <span aria-current="page">{it.label}</span>}
          {i < items.length - 1 && <span aria-hidden="true"> / </span>}
        </span>
      ))}
    </nav>
  );
}
