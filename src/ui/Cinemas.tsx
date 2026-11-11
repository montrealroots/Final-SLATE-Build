// Cinemas near a place, as Wikidata records them (November 11, 2026, docs/CINEMAS.md): read when a place page opens, at
// the save's date. Wikidata holds former cinemas as well as working ones, so none is called open.
import { useState } from 'react';
import type { Place } from '../data/places';
import { useCatalogFile } from '../catalog/load';
import { formatDateKey } from '../engine';
import { CINEMAS_READ, cinemasNear, type Cinema, type CinemaStanding } from '../world/cinemas';
import { countryName } from '../world/gazetteer/gazetteer';

const RADIUS_KM = 25;
const SHOWN = 15;
const count = (n: number, one: string, many: string) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
/** A date as recorded: a year, a month and year, or a day. */
const when = (d: string) => (d.length === 4 ? d : d.length === 7 ? new Date(`${d}-15T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : formatDateKey(d));
const standingWords = (s: CinemaStanding) => (s.kind === 'closed' ? `Closed ${s.on.length === 10 ? 'on' : 'in'} ${when(s.on)}` : s.kind === 'closed-undated' ? "Recorded as closed; when isn't recorded" : 'No closure recorded');

export function CinemasNearby({ place, today }: { place: Place; today: string }) {
  const index = useCatalogFile<{ countries: { code: string; cinemas: number }[] }>('cinemas/index.json');
  const recorded = index.status === 'ready' ? index.data.countries.find((c) => c.code === place.country) : undefined;
  const file = useCatalogFile<Cinema[]>(recorded ? `cinemas/${place.country}.json` : null);
  const [all, setAll] = useState(false);
  const country = countryName(place.country);
  let body;
  if (index.status === 'loading' || (recorded && file.status === 'loading')) body = <p role="status" className="muted">Loading the cinemas…</p>;
  else if (index.status !== 'ready') body = <p className="muted">The cinema list isn't installed in this copy of SLATE. It is gathered from Wikidata separately from the game.</p>;
  else if (!recorded) body = <p className="muted">Wikidata records no cinemas in {country}.</p>;
  else if (file.status !== 'ready') body = <p className="muted">The cinemas of {country} couldn't be loaded.</p>;
  else {
    const near = cinemasNear(file.data, place.lat, place.lon, RADIUS_KM, today);
    const unclosed = near.filter((x) => x.standing.kind === 'no-closure').length;
    body = (
      <>
        <p>Wikidata records {count(near.length, 'cinema', 'cinemas')} within {RADIUS_KM} km of {place.name}{near.length ? `, ${count(unclosed, 'with no closure recorded', 'with no closure recorded')}` : ''}, and {count(recorded.cinemas, 'cinema', 'cinemas')} in {country}.</p>
        {near.length > 0 && (
          <ul className="list" aria-label={`Cinemas near ${place.name}`}>
            {(all ? near : near.slice(0, SHOWN)).map(({ c, km, standing }) => (
              <li key={c.id} className="list-item">
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{c.name ?? 'A cinema with no recorded name'}</div>
                  <div className="dim small">{[c.in, c.opened && `Opened ${c.opened.length === 10 ? 'on ' : 'in '}${when(c.opened)}`, standingWords(standing), c.seats && `${c.seats.toLocaleString('en-US')} seats`, c.operator && `Run by ${c.operator}`].filter(Boolean).join(' · ')}</div>
                </div>
                <span className="dim small">{km < 10 ? km.toFixed(1) : Math.round(km)} km</span>
              </li>
            ))}
          </ul>
        )}
        {near.length > SHOWN && <button type="button" className="btn btn-sm" onClick={() => setAll(!all)}>{all ? `Show The Nearest ${SHOWN}` : `Show All ${near.length.toLocaleString('en-US')}`}</button>}
        <p className="dim small">As recorded in Wikidata in {CINEMAS_READ}, which lists former cinemas as well as working ones: one with no closure recorded may be something else now. Coverage differs a great deal from country to country.</p>
      </>
    );
  }
  return (
    <section className="card card-wide" aria-labelledby="pl-cinemas">
      <h2 id="pl-cinemas">Cinemas Nearby</h2>
      {body}
    </section>
  );
}
