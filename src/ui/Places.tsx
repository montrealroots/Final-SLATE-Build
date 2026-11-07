// Calendar, place and profile screens: loaded on first use (App.tsx), so they stay out of the startup files.
import { useEffect, useMemo, useState } from 'react';
import { languageName, PRONOUNS } from '../data/identity';
import { getPlace, placeLabel, searchPlaces, type Place } from '../data/places';
import { FORECAST_HORIZON_DAYS, addDaysToKey, addPlan, cancelPlan, characterAge, currentPlace, currentZone, dateKey, daylight, daysInMonth, forecast, formatClock, formatDateKey, honors, placeHolidayCoverage, placeHolidays, institution, localParts, localToInstant, monthName, nextBirthdayInstant, observedBirthday, parseYmd, upcomingCommitments, weatherOn, weekdayOfKey, ymd, temperatureAt, travelTo, travelHours } from '../engine';
import type { GameState } from '../engine/types';
import { Check, Modal, NumberField, PageHead, Professions, SelectField, TextField, longLocal, plural } from './components';
import { Breadcrumbs } from './Shell';
import { store, useClock, useGame } from './store';
import { loadWorldHolidays } from '../world/holidays/holidays';
import { climateNote } from '../world/climate';


const FILTERS = ['Birthdays', 'Holidays', 'Festivals', 'Awards', 'Deadlines', 'My Schedule'];

interface CalItem {
  label: string;
  kind: string;
  time?: string;
  editionId?: string;
  route?: { view: string; projectId?: string; tab?: string; editionId?: string };
}

function calendarItems(g: GameState, year: number, month: number): Map<string, CalItem[]> {
  const zone = currentZone(g);
  const place = currentPlace(g);
  const out = new Map<string, CalItem[]>();
  const push = (k: string, it: CalItem) => (out.get(k) ?? out.set(k, []).get(k)!).push(it);
  const first = ymd(year, month, 1);
  const last = ymd(year, month, daysInMonth(year, month));
  if (g.calendarFilters.includes('Birthdays')) {
    const obs = observedBirthday(g.character.birth, year);
    if (obs.month === month) push(ymd(year, obs.month, obs.day), { label: `Your Birthday (${year - g.character.birth.year})`, kind: 'Birthdays' });
  }
  if (g.calendarFilters.includes('Holidays')) {
    for (const h of placeHolidays(place, year)) if (h.date >= first && h.date <= last) push(h.date, { label: `${h.name}${h.estimated ? ' (Expected)' : h.projected ? ' (Projected)' : ''}`, kind: 'Holidays' });
  }
  for (const ed of g.editions) {
    const inst = institution(ed.institutionId);
    const filter = inst.kind === 'festival' ? 'Festivals' : 'Awards';
    const ezone = getPlace(inst.placeId).zone;
    if (g.calendarFilters.includes(filter)) {
      const s = dateKey(ed.start, ezone);
      const e = dateKey(ed.end, ezone);
      for (let k = s; k <= e; k = addDaysToKey(k, 1)) {
        if (k >= first && k <= last) push(k, { label: inst.kind === 'award' ? `${ed.label} Ceremony` : ed.label, kind: filter, editionId: ed.id, route: { view: 'event', editionId: ed.id } });
      }
    }
    if (g.calendarFilters.includes('Deadlines') && g.followed.includes(inst.id)) {
      const k = dateKey(ed.deadline, zone);
      if (k >= first && k <= last) push(k, { label: `${ed.label}: Entries Close`, kind: 'Deadlines', time: longLocal(ed.deadline, zone).time, route: { view: 'event', editionId: ed.id } });
    }
  }
  if (g.calendarFilters.includes('My Schedule')) {
    const from = localToInstant(zone, year, month, 1).instant;
    const to = localToInstant(zone, year, month, daysInMonth(year, month), 23, 59).instant;
    for (const c of upcomingCommitments(g, from, to)) {
      if (c.kind === 'deadline' || c.kind === 'event') continue;
      push(dateKey(c.at, zone), { label: c.label, kind: 'My Schedule', time: longLocal(c.at, zone).time, route: c.route });
    }
    for (const pl of g.plans.filter((x) => x.status !== 'upcoming' && x.status !== 'cancelled')) {
      const k = dateKey(pl.start, zone);
      if (k >= first && k <= last) push(k, { label: `${pl.title} (${pl.status === 'missed' ? 'Missed' : 'Done'})`, kind: 'My Schedule', time: longLocal(pl.start, zone).time });
    }
  }
  return out;
}

export function CalendarView() {
  const g = useGame();
  const zone = currentZone(g);
  const today = dateKey(g.now, zone);
  const [cursor, setCursor] = useState(() => { const p = parseYmd(today); return { year: p.year, month: p.month }; });
  const [selected, setSelected] = useState(today);
  const [adding, setAdding] = useState(false);
  const items = useMemo(() => calendarItems(g, cursor.year, cursor.month), [g, cursor, store.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const firstWd = weekdayOfKey(ymd(cursor.year, cursor.month, 1));
  const days = daysInMonth(cursor.year, cursor.month);
  const cells: (string | null)[] = [...Array(firstWd).fill(null), ...Array.from({ length: days }, (_, i) => ymd(cursor.year, cursor.month, i + 1))];
  const move = (delta: number) => {
    let m = cursor.month + delta;
    let y = cursor.year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setCursor({ year: y, month: m });
  };
  const selItems = items.get(selected) ?? (() => {
    const p = parseYmd(selected);
    return p.year === cursor.year && p.month === cursor.month ? [] : calendarItems(g, p.year, p.month).get(selected) ?? [];
  })();
  const plansToday = g.plans.filter((pl) => pl.status === 'upcoming' && dateKey(pl.start, zone) === selected);
  return (
    <>
      <div className="page-head">
        <button type="button" className="btn btn-ghost btn-sm back-home" onClick={() => store.go({ view: 'home' })}>Back To Home</button>
        <h1>Calendar</h1>
        <p className="muted">Your schedule, birthdays, festivals, awards and their deadlines, and the public holidays where you are.</p>
      </div>
      <fieldset className="card" style={{ border: '1px solid var(--line)' }}>
        <legend className="sr-only">Show On Calendar</legend>
        <div className="chip-row">
          {FILTERS.map((f) => (
            <Check key={f} label={f} checked={g.calendarFilters.includes(f)} onChange={(v) => store.act((s) => { s.calendarFilters = v ? [...s.calendarFilters, f] : s.calendarFilters.filter((x) => x !== f); })} />
          ))}
        </div>
      </fieldset>
      <div className="card">
        <div className="row-between wrap">
          <button className="btn" onClick={() => move(-1)}>Previous Month</button>
          <h2 style={{ margin: 0 }} aria-live="polite">{monthName(cursor.month)} {cursor.year}</h2>
          <button className="btn" onClick={() => move(1)}>Next Month</button>
        </div>
        <div className="cal-grid spaced" role="grid" aria-label={`${monthName(cursor.month)} ${cursor.year}`}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="dow" role="columnheader">{d}</div>)}
          {cells.map((k, i) =>
            k ? (
              <button key={k} className={`cal-day ${k === today ? 'today' : ''}`} aria-pressed={k === selected} onClick={() => setSelected(k)}
                aria-label={`${formatDateKey(k, true)}${(items.get(k) ?? []).length ? `, ${plural((items.get(k) ?? []).length, 'entry', 'entries')}` : ''}${k === today ? ', today' : ''}`}>
                <span className="n">{Number(k.slice(8))}</span>
                {(items.get(k) ?? []).slice(0, 3).map((it, j) => <span key={j} className="dot">{it.label}</span>)}
                {(items.get(k) ?? []).length > 0 && <span className="count">{(items.get(k) ?? []).length}</span>}
              </button>
            ) : <div key={`e${i}`} aria-hidden="true" />,
          )}
        </div>
      </div>
      <section className="card" aria-labelledby="day-h">
        <div className="row-between wrap">
          <h2 id="day-h" style={{ margin: 0 }}>{formatDateKey(selected, true)}</h2>
          {selected >= today && <button className="btn btn-sm" onClick={() => setAdding(true)}>Add Plan</button>}
        </div>
        {selItems.length ? (
          <ul className="list spaced">
            {selItems.map((it, i) => (
              <li key={i} className="row-wrap">
                <span className="grow">{it.time ? `${it.time}: ` : ''}{it.label} <span className="chip">{it.kind}</span></span>
                {it.route && <button className="btn btn-sm" onClick={() => store.go(it.route!)}>View Details</button>}
              </li>
            ))}
          </ul>
        ) : <p className="spaced muted">Nothing on this day.</p>}
        {plansToday.length > 0 && (
          <>
            <h3>Your Plans</h3>
            <ul className="list">
              {plansToday.map((pl) => (
                <li key={pl.id} className="row-wrap">
                  <span className="grow">{longLocal(pl.start, zone).time}: {pl.title}</span>
                  <button className="btn btn-sm btn-danger" onClick={() => store.act((s) => cancelPlan(s, pl.id))}>Cancel Plan</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      <FollowedEvents />
      {adding && <AddPlanDialog date={selected} onClose={() => setAdding(false)} />}
    </>
  );
}

function FollowedEvents() {
  const g = useGame();
  const zone = currentZone(g);
  const upcoming = g.editions.filter((e) => e.end > g.now).slice(0, 40);
  const [q, setQ] = useState('');
  const shown = upcoming.filter((e) => e.label.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
  return (
    <section className="card" aria-labelledby="ev-h">
      <h2 id="ev-h">Festivals And Awards</h2>
      <TextField label="Search Events" type="search" value={q} onChange={setQ} />
      <ul className="list">
        {shown.map((e) => {
          const inst = institution(e.institutionId);
          return (
            <li key={e.id} className="row-wrap">
              <div className="grow">
                <button className="btn btn-ghost" onClick={() => store.go({ view: 'event', editionId: e.id })}>{e.label}</button>
                <div className="dim">{inst.kind === 'festival' ? 'Festival' : 'Awards'} · {formatDateKey(dateKey(e.start, zone))} · Entries {e.deadline > g.now ? `close ${formatDateKey(dateKey(e.deadline, zone))}` : 'closed'}</div>
              </div>
              <FollowButton id={inst.id} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function FollowButton({ id }: { id: string }) {
  const g = useGame();
  const on = g.followed.includes(id);
  return (
    <button className="btn btn-sm" aria-pressed={on} onClick={() => store.act((s) => { s.followed = on ? s.followed.filter((x) => x !== id) : [...s.followed, id]; })}>
      {on ? 'Unfollow Event' : 'Follow Event'}
    </button>
  );
}

function AddPlanDialog({ date, onClose }: { date: string; onClose: () => void }) {
  const g = useGame();
  const zone = currentZone(g);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('10:00');
  const [mins, setMins] = useState(60);
  const [remind, setRemind] = useState<'none' | '15' | '60' | '1440'>('60');
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal title="Add Plan" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => {
      const { year, month, day } = parseYmd(date);
      const [hh, mm] = time.split(':').map(Number);
      const start = localToInstant(zone, year, month, day, hh, mm).instant;
      const err = store.act((s) => void addPlan(s, { title, start, durationMin: mins, remindMin: remind === 'none' ? null : Number(remind) }));
      if (err) setError(err);
      else onClose();
    }}>Add Plan</button></>}>
      <p className="muted">{formatDateKey(date, true)}</p>
      <TextField label="Title" value={title} maxLength={80} onChange={setTitle} error={error && /title/i.test(error) ? error : null} />
      <TextField label="Start Time" type="time" value={time} onChange={setTime} error={error && /time|later/i.test(error) ? error : null} />
      <NumberField label="Length In Minutes" value={mins} min={5} max={1440} onChange={setMins} />
      <SelectField label="Reminder" value={remind} onChange={setRemind} options={[{ value: 'none', label: 'No Reminder' }, { value: '15', label: '15 Minutes Before' }, { value: '60', label: 'One Hour Before' }, { value: '1440', label: 'One Day Before' }]} />
      {error && !/title|time|later/i.test(error) && <p role="alert" style={{ color: 'var(--negative)' }}>{error}</p>}
    </Modal>
  );
}

// ---------------- Place and weather ----------------

export function PlaceView() {
  const g = useGame();
  useClock();
  const placeId = store.route.placeId ?? g.locationId;
  const place = getPlace(placeId);
  const here = place.id === g.locationId;
  const now = g.now;
  const today = dateKey(now, place.zone);
  const lt = longLocal(now, place.zone);
  const w = weatherOn(g.seed, place, today);
  const dl = daylight(place.lat, place.lon, today);
  const issued = dateKey(now, place.zone);
  const fc = Array.from({ length: FORECAST_HORIZON_DAYS }, (_, i) => forecast(g.seed, place, addDaysToKey(today, i + 1), issued));
  const year = parseYmd(today).year;
  const hols = [...placeHolidays(place, year), ...placeHolidays(place, year + 1)].filter((h) => h.date >= today).slice(0, 6);
  const [q, setQ] = useState('');
  const [travelError, setTravelError] = useState<string | null>(null);
  return (
    <>
      <Breadcrumbs items={[{ label: 'Home', route: { view: 'home' } }, { label: place.name }]} />
      <PageHead eyebrow="Your Day" title={placeLabel(place)} />
      <div className="card-grid">
        <section className="card" aria-labelledby="pl-now">
          <h2 id="pl-now">Now</h2>
          <p>It's {lt.time} on {lt.weekday}, {lt.date} here.</p>
          <p>{w.condition}, {Math.round(temperatureAt(w, localParts(now, place.zone).hour))}°C now. High {Math.round(w.high)}°C, low {Math.round(w.low)}°C.{w.precipHours ? ` ${w.snow ? 'Snow' : 'Rain'} from about ${formatClock(w.precipHours[0], 0)} to ${formatClock(w.precipHours[1] % 24, 0)}.` : ''}</p>
          <p>{dl.polar === 'day' ? 'The sun stays up all day.' : dl.polar === 'night' ? "The sun doesn't rise today." : `Sunrise ${longLocal(dl.sunrise!, place.zone).time}, sunset ${longLocal(dl.sunset!, place.zone).time} (${dl.dayLengthHours.toFixed(1)} hours of daylight).`}</p>
          <p className="dim">Weather in SLATE is simulated from typical local climate, not live observations.{climateNote(place.climate.source) ? ` ${climateNote(place.climate.source)}` : ''}</p>
          {!here && (
            <>
              <button className="btn btn-primary" disabled={!!g.travel} onClick={() => { let at = 0; const err = store.act((s) => { at = travelTo(s, place.id); }); setTravelError(err); if (!err) void store.advance({ at }); }}>Travel Here</button>
              <p className="dim">The trip takes about {travelHours(currentPlace(g), place)} hours. Time passes on the way.</p>
              {travelError && <p role="alert" style={{ color: 'var(--negative)' }}>{travelError}</p>}
            </>
          )}
          {here && <p className="chip chip-accent">You're here</p>}
        </section>
        <section className="card" aria-labelledby="pl-fc">
          <h2 id="pl-fc">Forecast</h2>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Day</th><th>Outlook</th><th>High</th><th>Low</th><th>Chance Of Rain Or Snow</th></tr></thead>
              <tbody>
                {fc.map((f) => (
                  <tr key={f.date}>
                    <td data-label="Day">{formatDateKey(f.date, true).split(',')[0]} {Number(f.date.slice(8))}</td>
                    <td data-label="Outlook">{f.summary}</td>
                    <td data-label="High">{Math.round(f.high)}°C</td>
                    <td data-label="Low">{Math.round(f.low)}°C</td>
                    <td data-label="Chance Of Rain Or Snow">{f.chanceOfPrecip}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="dim">Forecasts get less certain the further ahead they look.</p>
        </section>
        <section className="card" aria-labelledby="pl-hol">
          <h2 id="pl-hol">Upcoming Public Holidays</h2>
          {hols.length > 0 && <ul className="list">{hols.map((h) => <li key={h.date + h.name}>{formatDateKey(h.date, true)}: {h.name}{h.estimated ? ' (expected; depends on the moon sighting)' : h.projected ? ' (projected)' : ''}</li>)}</ul>}
          <HolidayNote place={place} year={hols.some((h) => h.projected) ? year + 1 : year} />
        </section>
        <section className="card" aria-labelledby="pl-other">
          <h2 id="pl-other">Other Places</h2>
          <TextField label="Search Places" type="search" value={q} onChange={setQ} />
          <ul className="list">
            {searchPlaces(q, 8).map((pl: Place) => (
              <li key={pl.id}><button className="btn btn-ghost" onClick={() => store.go({ view: 'place', placeId: pl.id })}>{placeLabel(pl)}</button> <span className="dim">{longLocal(now, pl.zone).time}</span></li>
            ))}
          </ul>
          <button className="btn" onClick={() => store.go({ view: 'world' })}>Browse The World</button>
        </section>
      </div>
    </>
  );
}

/** Explains anything about a place's holiday dates other than "all kept". */
function HolidayNote({ place, year }: { place: Place; year: number }) {
  const [, rerender] = useState(0);
  const [failed, setFailed] = useState(false);
  const c = placeHolidayCoverage(place, year);
  if (c.kind === 'not-loaded') {
    return (
      <div role="status">
        <p className="muted">{failed ? "Holiday dates couldn't be loaded. Until they are, no day here is treated as a holiday." : 'Loading holiday dates…'}</p>
        {failed && <button className="btn" onClick={() => { setFailed(false); loadWorldHolidays().then(() => rerender((n) => n + 1), () => setFailed(true)); }}>Try Again</button>}
        <HolidayLoader onFail={() => setFailed(true)} onLoad={() => rerender((n) => n + 1)} />
      </div>
    );
  }
  if (c.kind === 'not-kept') return <p className="muted">Holiday dates for {place.countryName} aren't included yet, so no day here is treated as a holiday.</p>;
  if (c.kind === 'outside-years') return <p className="muted">Holiday dates are included for 2026 to 2100.</p>;
  const missing = c.kind === 'projected' || c.kind === 'kept' ? c.unannounced : undefined;
  const notYet = missing?.length ? <p className="dim">Not on the calendar until announced each year: {missing.join(', ')}.</p> : null;
  if (c.kind === 'projected') return <>{notYet}<p className="dim">Dates after {c.announcedTo} are projected from the law until the government announces them.</p></>;
  return <>{notYet}<p className="dim">Dates marked expected depend on a moon sighting and can move by a day.</p></>;
}

function HolidayLoader({ onFail, onLoad }: { onFail: () => void; onLoad: () => void }) {
  useEffect(() => { let live = true; loadWorldHolidays().then(() => live && onLoad(), () => live && onFail()); return () => { live = false; }; }, []);
  return null;
}

// ---------------- Profile ----------------

export function Profile() {
  const g = useGame();
  const c = g.character;
  const age = characterAge(g);
  const next = nextBirthdayInstant(g, g.now);
  const zone = currentZone(g);
  const credits = g.projects.flatMap((p) => p.credits.filter((x) => x.person === 'player').map((x) => ({ p, x })));
  const h = honors(g);
  return (
    <>
      <PageHead eyebrow="Player Profile" title={c.name}><Professions actingTitle={c.actingTitle} /></PageHead>
      <div className="card-grid">
        <section className="card">
          <h2>About</h2>
          <dl className="kv">
            <dt>Pronouns</dt><dd>{PRONOUNS[c.pronouns].label}</dd>
            <dt>Age</dt><dd>{age}</dd>
            <dt>Birthday</dt><dd>{monthName(c.birth.month)} {c.birth.day}. Next: {longLocal(next.at, g.ageZone).weekday}, {longLocal(next.at, g.ageZone).date} ({next.age}).</dd>
            <dt>Birthplace</dt><dd>{placeLabel(getPlace(c.birthplaceId))}</dd>
            <dt>Backgrounds</dt><dd>{c.heritages.map((x) => x.label).join(', ')}</dd>
            <dt>Languages</dt><dd>{languageName(c.mainLanguage)} (main){c.languages.map((l) => `, ${languageName(l.code)} (${l.proficiency.toLowerCase()})`).join('')}</dd>
            <dt>Now In</dt><dd>{placeLabel(currentPlace(g))}</dd>
          </dl>
        </section>
        <section className="card">
          <h2>Credits</h2>
          {credits.length ? (
            <ul className="list">
              {credits.map(({ p, x }) => (
                <li key={p.id + x.id}>
                  <button className="btn btn-ghost" onClick={() => store.go({ view: 'project', projectId: p.id, tab: 'release' })}>{p.title}</button>
                  <div className="dim">{x.contribution}{x.characterName ? ` (${x.characterName})` : ''}{x.episodes !== 'all' ? `, ${plural(x.episodes.length, 'episode')}` : ''}</div>
                </li>
              ))}
            </ul>
          ) : <p className="muted">Credits appear here when a project is delivered.</p>}
        </section>
        <section className="card">
          <h2>Festivals And Awards</h2>
          {h.length ? (
            <ul className="list">{h.map((x, i) => <li key={i}><strong>{x.result}</strong>: {x.category}, {x.editionLabel} ({x.projectTitle}){x.personal ? '' : <span className="dim"> · credited to others on your project</span>}</li>)}</ul>
          ) : <p className="muted">Selections, nominations and wins appear here.</p>}
        </section>
        <section className="card">
          <h2>History</h2>
          <ul className="list">{g.log.filter((l) => l.kind === 'personal').slice(0, 6).map((l) => <li key={l.id}>{l.text} <span className="dim">{longLocal(l.at, zone).date}</span></li>)}</ul>
          {!g.log.some((l) => l.kind === 'personal') && <p className="muted">Nothing yet.</p>}
        </section>
      </div>
    </>
  );
}
