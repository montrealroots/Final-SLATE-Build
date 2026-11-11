// Cinemas near a place, as Wikidata records them (November 11, 2026, docs/CINEMAS.md): read when a place page opens, at
// the save's date. Wikidata holds former cinemas as well as working ones, so none is called open.
import { useState } from 'react';
import type { Place } from '../data/places';
import { useCatalogFile } from '../catalog/load';
import { currentZone, dateKey, formatDateKey } from '../engine';
import type { Project, ReleaseRecord } from '../engine/types';
import type { Route } from '../engine/types';
import { CINEMAS_READ, cinemasNear, showsFilms, type Cinema, type CinemaStanding } from '../world/cinemas';
import { countryName } from '../world/gazetteer/gazetteer';
import { inCinemas, openingSoon, programme, RUN_DAYS, simulatedOpenings, yourShare, type Opening, type Showing } from '../world/programme';
import { studioFilms } from '../engine/studios';
import { addDaysToKey } from '../engine/time';
import { store, useGame } from './store';

const RADIUS_KM = 25;
const SHOWN = 15;
const count = (n: number, one: string, many: string) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
/** A date as recorded: a year, a month and year, or a day. */
const when = (d: string) => (d.length === 4 ? d : d.length === 7 ? new Date(`${d}-15T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : formatDateKey(d));
const standingWords = (s: CinemaStanding, c: Cinema) => (s.kind === 'closed' ? `Closed ${s.on.length === 10 ? 'on' : 'in'} ${when(s.on)}` : s.kind === 'closed-undated' ? "Recorded as closed; when isn't recorded" : c.site || c.operator ? 'No closure recorded' : 'No closure recorded, and no sign it still shows films');

/** A film's page: the catalog's title, or the player's project at its release. */
const filmRoute = (s: Showing): Route => (s.projectId ? { view: 'project', projectId: s.projectId, tab: 'release' } : { view: 'title', ref: s.ref }) as Route;
function FilmLink({ s }: { s: Showing }) {
  return <button type="button" className="link" onClick={() => store.go(filmRoute(s))}>{s.title}</button>;
}

export function CinemasNearby({ place, today }: { place: Place; today: string }) {
  const g = useGame();
  const theatrical = useCatalogFile<{ openings: Opening[] }>('theatrical.json');
  const openings = theatrical.status === 'ready' ? theatrical.data.openings : [];
  const index = useCatalogFile<{ countries: { code: string; cinemas: number }[] }>('cinemas/index.json');
  const recorded = index.status === 'ready' ? index.data.countries.find((c) => c.code === place.country) : undefined;
  const file = useCatalogFile<Cinema[]>(recorded ? `cinemas/${place.country}.json` : null);
  const [all, setAll] = useState(false);
  const country = countryName(place.country);
  let body;
  if (index.status === 'loading' || (recorded && file.status === 'loading')) body = <p role="status" className="muted">Loading the cinemas…</p>;
  else if (index.status !== 'ready') body = <p className="muted">The cinema list isn't installed in this copy of SLATE. It is gathered from Wikidata separately from the game; to add it, install the Cinemas mod in Settings, under Mods.</p>;
  else if (!recorded) body = <p className="muted">Wikidata records no cinemas in {country}.</p>;
  else if (file.status !== 'ready') body = <p className="muted">The cinemas of {country} couldn't be loaded.</p>;
  else {
    const near = cinemasNear(file.data, place.lat, place.lon, RADIUS_KM, today);
    const unclosed = near.filter((x) => x.standing.kind === 'no-closure').length;
    const trading = near.filter((x) => showsFilms(x.c, today)).length;
    // The studios' simulated films take screens alongside the recorded ones and yours (docs/WORLD.md, "Competition").
    const sims = simulatedOpenings(studioFilms(g, addDaysToKey(today, -RUN_DAYS.wide), addDaysToKey(today, 14)), place.country);
    const showing = inCinemas([...openings, ...sims], g, place.country, today);
    const shows = new Map(near.map((x) => [x.c.id, programme(x.c, showing, today)]));
    const soon = openingSoon([...openings, ...sims], place.country, today);
    body = (
      <>
        <h3>In Cinemas In {country}</h3>
        {showing.length ? (
          <ul className="list" aria-label={`Films in cinemas in ${country}`}>
            {showing.map((s) => {
              const at = near.filter((x) => shows.get(x.c.id)!.some((y) => y.ref === s.ref)).length;
              return (
                <li key={s.ref} className="list-item">
                  <div className="grow">
                    <FilmLink s={s} />{s.projectId ? <span className="chip chip-accent">Your Film</span> : null}{s.ref.startsWith('sim-film:') ? <span className="chip">Simulated</span> : null}
                    <div className="dim small">Opened {when(s.opened)}{s.limited ? ' in a limited release' : ''} · showing at {count(at, 'cinema', 'cinemas')} near {place.name}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <p className="muted">None of the catalog's films{g.projects.length ? ' or yours' : ''} is in its run in {country} now.</p>}
        {soon.length > 0 && <p className="muted">Opening soon: {soon.map((o) => `${o[1]} (${when(o[3])})`).join(', ')}.</p>}
        <h3>Cinemas Within {RADIUS_KM} km</h3>
        <p>Wikidata records {count(near.length, 'cinema', 'cinemas')} within {RADIUS_KM} km of {place.name}{near.length ? `, ${count(unclosed, 'with no closure recorded', 'with no closure recorded')}, of which the game takes ${count(trading, 'to show films', 'to show films')}, as Wikidata gives ${trading === 1 ? 'its' : 'their'} website or operator` : ''}. It records {count(recorded.cinemas, 'cinema', 'cinemas')} in {country}.{trading > 0 && trading < near.length ? ' Those are listed first.' : ''}</p>
        {near.length > 0 && (
          <ul className="list" aria-label={`Cinemas near ${place.name}`}>
            {(all ? near : near.slice(0, SHOWN)).map(({ c, km, standing }) => (
              <li key={c.id} className="list-item">
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{c.name ?? 'A cinema with no recorded name'}</div>
                  <div className="dim small">{[c.in, c.opened && `Opened ${c.opened.length === 10 ? 'on ' : 'in '}${when(c.opened)}`, standingWords(standing, c), c.seats && `${c.seats.toLocaleString('en-US')} seats`, c.operator && `Run by ${c.operator}`].filter(Boolean).join(' · ')}</div>
                  {shows.get(c.id)!.length > 0 && <div className="small">Showing: {shows.get(c.id)!.map((x, i) => <span key={x.ref}>{i ? ', ' : ''}<FilmLink s={x} /></span>)}</div>}
                </div>
                <span className="dim small">{km < 10 ? km.toFixed(1) : Math.round(km)} km</span>
              </li>
            ))}
          </ul>
        )}
        {near.length > SHOWN && <button type="button" className="btn btn-sm" onClick={() => setAll(!all)}>{all ? `Show The First ${SHOWN}` : `Show All ${near.length.toLocaleString('en-US')}`}</button>}
        <p className="dim small">As recorded in Wikidata in {CINEMAS_READ}, which lists former cinemas as well as working ones: one with no closure recorded may be something else now. Coverage differs a great deal from country to country.</p>
        <p className="dim small">What the cinemas show is simulated from the catalog's films, which are only those Disney's companies are credited with, and your own. A film plays from the day TMDB records it opening in {country}, for {RUN_DAYS.wide / 7} weeks, or {RUN_DAYS.limited / 7} in a limited release. Which cinemas book it isn't recorded, so each cinema's choice is drawn, the same on every visit. None of this changes what a film earns: that is what its distributor reports.</p>
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

/**
 * Where the player's theatrical release plays, territory by territory: the recorded cinemas that book it, by the same
 * draw the place pages use, while its run lasts. Simulated, like every cinema's programme.
 */
export function ReleaseCinemas({ p, r }: { p: Project; r: ReleaseRecord }) {
  if (r.route !== 'theatrical' || r.status === 'cancelled') return null;
  return <>{r.territories.map((t) => <TerritoryCinemas key={t} p={p} r={r} country={t} />)}</>;
}

function TerritoryCinemas({ p, r, country }: { p: Project; r: ReleaseRecord; country: string }) {
  const g = useGame();
  const today = dateKey(g.now, currentZone(g));
  const index = useCatalogFile<{ countries: { code: string; cinemas: number }[] }>('cinemas/index.json');
  const recorded = index.status === 'ready' ? index.data.countries.some((c) => c.code === country) : false;
  const file = useCatalogFile<Cinema[]>(recorded ? `cinemas/${country}.json` : null);
  const name = countryName(country);
  if (index.status !== 'ready' || !recorded || file.status !== 'ready') {
    return index.status === 'loading' || file.status === 'loading' ? null : <p className="dim small">Which cinemas show it in {name} isn't known: {index.status === 'ready' ? `Wikidata records no cinemas there` : "the cinema list isn't installed"}.</p>;
  }
  // The film as it plays on its opening day, so a planned release says where it will open.
  const on = today < r.date ? r.date : today;
  const mine = inCinemas([], { projects: [p] }, country, on).find((s) => s.projectId === p.id);
  const ends = new Date(Date.parse(`${r.date}T12:00:00Z`) + RUN_DAYS.wide * 86_400_000).toISOString().slice(0, 10);
  const film: Showing = mine ?? { ref: `project:${p.id}`, title: p.title, opened: r.date, limited: false, share: yourShare(p.quality?.reception), projectId: p.id };
  const open = file.data.filter((c) => showsFilms(c, on));
  const booked = open.filter((c) => programme(c, [film], on).length > 0);
  const named = booked.filter((c) => c.name).slice(0, 5).map((c) => c.name).join(', ');
  const what = today < r.date ? `Opens on ${formatDateKey(r.date)} at` : today < ends ? 'Showing at' : 'Its run ended on ' + formatDateKey(ends) + '. It showed at';
  return (
    <p className="small">
      {name}: {what} {count(booked.length, 'cinema', 'cinemas')} of the {open.length.toLocaleString('en-US')} there the game takes to show films{named ? `, among them ${named}` : ''}.
      <span className="dim"> Simulated: more cinemas book a film that was received well. It doesn't change what the film earns, which is what its distributor reports.</span>
    </p>
  );
}
