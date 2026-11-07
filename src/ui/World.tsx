import { DAY, currentPlace, currentZone, dateKey, daylight, placeHolidaysOn, localParts, localToInstant, upcomingCommitments, weatherOn, temperatureAt } from '../engine';
import type { Edition } from '../engine/types';
import { longLocal } from './components';
import { store, useClock, useGame } from './store';

const PHASE_LABEL: Record<string, string> = {
  development: 'In Development', 'pre-production': 'In Pre-Production', production: 'In Production', 'post-production': 'In Post-Production', delivered: 'Delivered', released: 'Released',
};

export function Home() {
  const g = useGame();
  useClock();
  const zone = currentZone(g);
  const place = currentPlace(g);
  const now = g.now;
  const t = longLocal(now, zone);
  const today = dateKey(now, zone);
  const w = weatherOn(g.seed, place, today);
  const dl = daylight(place.lat, place.lon, today);
  const p = localParts(now, zone);
  const endOfDay = localToInstant(zone, p.year, p.month, p.day, 23, 59).instant;
  const todays = upcomingCommitments(g, now, endOfDay);
  const later = upcomingCommitments(g, endOfDay + 1, now + 7 * DAY).slice(0, 6);
  const hol = placeHolidaysOn(place, today);
  const weatherLine = (() => {
    const temp = Math.round(temperatureAt(w, p.hour + p.minute / 60));
    if (dl.polar === 'night') return `It's ${temp}°C and the sun won't rise today.`;
    if (dl.polar === 'day') return `It's ${temp}°C and the sun won't set today.`;
    const sunrise = dl.sunrise!;
    const sunset = dl.sunset!;
    const cond = w.condition.toLowerCase();
    if (now < sunrise) return `It's ${temp}°C. Sunrise is at ${longLocal(sunrise, zone).time}, and the day looks ${cond === 'clear' ? 'clear' : cond}.`;
    if (now < sunset) return `It's ${temp}°C and ${cond === 'clear' ? 'clear' : cond}. The sun sets at ${longLocal(sunset, zone).time}.`;
    return `It's ${temp}°C and dark out. Today was ${cond}.`;
  })();
  const projects = g.projects.filter((x) => x.phase !== 'released').slice(0, 5);
  return (
    <>
      <h1>Home</h1>
      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button className="btn" onClick={() => store.go({ view: 'calendar' })}>Open Calendar</button>
        <button className="btn" onClick={() => store.go({ view: 'new-project' })}>New Script</button>
      </div>
      <div className="panel-grid">
        <section className="panel" aria-labelledby="today-h">
          <h2 id="today-h">Today</h2>
          <p>It's {t.time} on {t.weekday}, {t.date}. You're in {place.name}.</p>
          <p className="muted">{weatherLine}</p>
          {hol.map((h) => <p key={h.name} className="muted">{h.estimated ? `${h.name} is expected today in ${place.countryName}, depending on the moon sighting.` : `Today is ${h.name} in ${place.countryName}.`}</p>)}
          <button className="btn btn-small" onClick={() => store.go({ view: 'place', placeId: place.id })}>Weather And Place Details</button>
        </section>
        <section className="panel" aria-labelledby="next-h">
          <h2 id="next-h">Up Next</h2>
          {todays.length ? (
            <ul className="list">{todays.map((c, i) => <li key={i}><button className="btn btn-quiet" onClick={() => store.go(c.route)}>{longLocal(c.at, zone).time}: {c.label}</button></li>)}</ul>
          ) : <p>You have nothing scheduled today.</p>}
          {later.length > 0 && (
            <>
              <h3 className="spaced">Later This Week</h3>
              <ul className="list">{later.map((c, i) => { const lt = longLocal(c.at, zone); return <li key={i}><button className="btn btn-quiet" onClick={() => store.go(c.route)}>{lt.weekday} {lt.time}: {c.label}</button></li>; })}</ul>
            </>
          )}
        </section>
        <section className="panel" aria-labelledby="proj-h">
          <h2 id="proj-h">Projects</h2>
          {projects.length ? (
            <ul className="list">
              {projects.map((pr) => (
                <li key={pr.id}>
                  <button className="btn btn-quiet" onClick={() => store.go({ view: 'project', projectId: pr.id, tab: 'overview' })}>{pr.title}</button>
                  <span className="dim"> {PHASE_LABEL[pr.phase]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p>You haven't started a project yet.</p>
              <button className="btn btn-primary" onClick={() => store.go({ view: 'new-project' })}>New Script</button>
            </>
          )}
        </section>
        <section className="panel" aria-labelledby="upd-h">
          <h2 id="upd-h">Recent Updates</h2>
          {g.log.length ? (
            <ul className="list">
              {g.log.slice(0, 8).map((l) => (
                <li key={l.id}>
                  {l.route ? <button className="btn-quiet btn" style={{ textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => store.go(l.route!)}>{l.text}</button> : <span>{l.text}</span>}
                  <div className="dim">{longLocal(l.at, zone).weekday} {longLocal(l.at, zone).time}</div>
                </li>
              ))}
            </ul>
          ) : <p>You're up to date.</p>}
        </section>
      </div>
    </>
  );
}

// ---------------- Calendar ----------------

export type { Edition };
