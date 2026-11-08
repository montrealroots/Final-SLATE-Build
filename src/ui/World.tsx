import { DAY, addLocal, addressedAs, currentPlace, currentZone, dateKey, daylight, formatZoneAbbrev, placeHolidaysOn, localParts, localToInstant, upcomingCommitments, weatherOn, temperatureAt, weekdayName, observancesOn } from '../engine';
import type { Condition } from '../engine/weather';
import { placeLabel } from '../data/places';
import type { Edition } from '../engine/types';
import { Panel, longLocal } from './components';
import { store, useClock, useGame } from './store';

const PHASE_LABEL: Record<string, string> = {
  development: 'In Development', 'pre-production': 'In Pre-Production', production: 'In Production', 'post-production': 'In Post-Production', delivered: 'Delivered', released: 'Released',
};

const WEATHER_EMOJI: Record<Condition, string> = {
  Clear: '☀️', 'Partly Cloudy': '⛅', Cloudy: '☁️', 'Light Rain': '🌦️', Rain: '🌧️', 'Heavy Rain': '🌧️', Thunderstorms: '⛈️', 'Light Snow': '🌨️', Snow: '❄️',
};
const WEATHER_SHORT: Record<Condition, string> = {
  Clear: 'Clear', 'Partly Cloudy': 'Cloudy', Cloudy: 'Overcast', 'Light Rain': 'Showers', Rain: 'Rain', 'Heavy Rain': 'Downpour', Thunderstorms: 'Storm', 'Light Snow': 'Flurries', Snow: 'Snow',
};

/** "in 1d 1h", "in 1h 30m", "in 45m", as 1221's Up Next counts down. */
function inWords(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  return `in ${d ? `${d}d ${h}h` : h ? `${h}h ${min}m` : `${min}m`}`;
}
/** When a past update came, the same way: "3h ago", "2d 4h ago". */
function agoWords(ms: number): string {
  return inWords(ms).replace(/^in (.*)$/, '$1 ago');
}

function partOfDay(hour: number): string {
  return hour >= 5 && hour < 12 ? 'Morning' : hour >= 12 && hour < 17 ? 'Afternoon' : 'Evening';
}

/** The meteorological season where you are, turned around south of the equator. */
function seasonAt(lat: number, month: number): string {
  const north = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter'][month - 1];
  if (lat >= 0) return north;
  return { Winter: 'Summer', Summer: 'Winter', Spring: 'Autumn', Autumn: 'Spring' }[north]!;
}

/** Home, laid out as 1221's: the day and the sky across the top, then the cards in two columns. */
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
  const soon = upcomingCommitments(g, now, now + 30 * DAY);
  const next = soon[0];
  const hol = placeHolidaysOn(place, today);
  const temp = Math.round(temperatureAt(w, p.hour + p.minute / 60));
  const week = Array.from({ length: 5 }, (_, i) => {
    const key = dateKey(addLocal(now, zone, { days: i + 1 }), zone);
    const lp = localParts(addLocal(now, zone, { days: i + 1 }), zone);
    return { key, weekday: weekdayName(lp.weekday).slice(0, 3), w: weatherOn(g.seed, place, key) };
  });
  const daylightWords = dl.polar === 'night' ? "The sun won't rise today" : dl.polar === 'day' ? "The sun won't set today"
    : `Daylight ${longLocal(dl.sunrise!, zone).time} to ${longLocal(dl.sunset!, zone).time}, ${(() => { const m = Math.round((dl.sunset! - dl.sunrise!) / 60_000); return `${Math.floor(m / 60)}h ${m % 60}m`; })()}`;
  const projects = g.projects.filter((x) => x.phase !== 'released').slice(0, 5);
  const firstName = addressedAs(g.character);
  return (
    <>
      <div className="page-head today">
        <div className="today-main">
          <div className="eyebrow">{t.weekday}, {t.date} · {g.character.actingTitle || 'Actor'}</div>
          <h1>Good {partOfDay(p.hour)}, {firstName}.</h1>
          <p className="muted today-line">
            {t.time} in {placeLabel(place)} · {formatZoneAbbrev(now, zone)} · {seasonAt(place.lat, p.month)} · {daylightWords}
          </p>
          {hol.map((h) => <p key={h.name} className="small today-line">{h.estimated ? `${h.name} is expected today in ${place.countryName}, depending on the moon sighting.` : `Today is ${h.name} in ${place.countryName}.`}</p>)}
          {observancesOn(g.character.observances, today).map((o) => <p key={o.id} className="small today-line">Today is {o.name}, which you keep.</p>)}
          <div className="help-below today-actions">
            <button className="btn btn-sm" onClick={() => store.go({ view: 'place', placeId: place.id })}>Weather And Place Details</button>
          </div>
        </div>
        <div className="today-weather" id="today-weather">
          <div className="today-weather-now">
            <span aria-hidden="true" className="today-weather-icon">{WEATHER_EMOJI[w.condition]}</span>
            <span>
              <span>{temp}°C {w.condition}</span>
              <span className="xs dim nowrap">{` High ${Math.round(w.high)}°C · Low ${Math.round(w.low)}°C`}</span>
            </span>
          </div>
          <div className="weather-week today-week" aria-label="The Days Ahead">
            {week.map((d) => (
              <div key={d.key} className="weather-day">
                <div className="xs dim">{d.weekday}</div>
                <div aria-hidden="true">{WEATHER_EMOJI[d.w.condition]}</div>
                <div className="xs weather-cond">{WEATHER_SHORT[d.w.condition]}</div>
                <div className="xs mono">{Math.round(d.w.high)}° / {Math.round(d.w.low)}°</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="home-grid">
        <Panel title="Projects" subtitle={projects.length ? 'What you are making, and where each one stands.' : undefined}
          actions={<button className="btn btn-sm btn-primary" onClick={() => store.go({ view: 'new-project' })}>New Script</button>}>
          {projects.length ? (
            <div className="col gap-2">
              {projects.map((pr) => (
                <div key={pr.id} className="row-between">
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'calc(-1 * var(--s3))' }} onClick={() => store.go({ view: 'project', projectId: pr.id, tab: 'overview' })}>{pr.title}</button>
                  <span className="xs dim nowrap">{PHASE_LABEL[pr.phase]}</span>
                </div>
              ))}
            </div>
          ) : <p className="muted small" style={{ margin: 0 }}>You haven't started a project yet.</p>}
        </Panel>

        <Panel title="Up Next" subtitle={next ? 'What’s coming up, and when.' : undefined}
          actions={<button className="btn btn-sm btn-primary" onClick={() => store.go({ view: 'calendar' })}>Open Calendar</button>}>
          {next ? (
            <button type="button" className="stat link" onClick={() => store.go(next.route)} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', color: 'inherit', cursor: 'pointer' }}>
              <span className="stat-label">{inWords(next.at - now)}</span>
              <span className="stat-value" style={{ fontSize: 'var(--size-md)' }}>{next.label}</span>
              <span className="stat-note">{(() => { const lt = longLocal(next.at, zone); return `${lt.date} at ${lt.time}`; })()}</span>
            </button>
          ) : null}
          {!todays.length && <p className="muted small" style={{ margin: next ? 'var(--s3) 0 0' : 0 }}>You have nothing scheduled today.</p>}
          {soon.length > 1 && (
            <>
              <hr className="divider" />
              <div className="col gap-2">
                {soon.slice(1, 6).map((c, i) => (
                  <div key={i} className="row-between">
                    <button className="btn btn-ghost btn-sm clamp-2" style={{ marginLeft: 'calc(-1 * var(--s3))' }} onClick={() => store.go(c.route)}>{c.label}</button>
                    <span className="xs dim nowrap">{inWords(c.at - now)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>

        <Panel title="Recent Updates" subtitle={g.log.length ? 'The newest first.' : undefined} flush>
          {g.log.length ? (
            <div className="list">
              {g.log.slice(0, 8).map((l) => (
                <div key={l.id} className="list-item list-static notice-row">
                  <div className="grow">
                    <div className="small">{l.text}</div>
                    <div className="xs dim">{agoWords(now - l.at)}</div>
                  </div>
                  {l.route && <div className="row gap-2 notice-row-actions"><button className="btn btn-sm" onClick={() => store.go(l.route!)}>Go There</button></div>}
                </div>
              ))}
            </div>
          ) : <p className="muted small" style={{ padding: '0 var(--s4) var(--s4)', margin: 0 }}>You're up to date.</p>}
        </Panel>
      </div>
    </>
  );
}

// ---------------- Calendar ----------------

export type { Edition };
