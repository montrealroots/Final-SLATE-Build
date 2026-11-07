import { lazy, Suspense, useEffect, useId, useMemo, useState } from 'react';
import { findPlace, placeLabel, searchPlaces, type Place } from '../data/places';
import { PLAYABLE_COUNTRIES, placesOf, regionsOf, search, toGamePlace, type WorldPlace } from '../world/gazetteer/gazetteer';
import { Field } from './components';

const SHOWN = 20;
// The map loads with the World screen's file, only when a picker shows it, so it stays out of the startup files.
const WorldMap = lazy(() => import('./WorldView').then((m) => ({ default: m.WorldMap })));

export interface WorldSearch {
  country: string;
  setCountry: (c: string) => void;
  region: string;
  setRegion: (r: string) => void;
  q: string;
  setQ: (q: string) => void;
  status: 'idle' | 'loading' | 'error' | 'ready';
  retry: () => void;
  regions: { key: string; name: string }[];
  regionNames: Map<string, string>;
  matches: WorldPlace[];
}

/** A country's places, loaded on demand, with a region filter and ranked search. Stale loads are ignored. */
export function useWorldSearch(initialCountry = ''): WorldSearch {
  const [country, setCountryRaw] = useState(initialCountry);
  const [region, setRegion] = useState('');
  const [q, setQ] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ country: string; places: WorldPlace[]; regions: { key: string; name: string }[] } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (!country) return;
    let live = true;
    setFailed(null);
    Promise.all([placesOf(country), regionsOf(country)]).then(
      ([places, regions]) => { if (live) setLoaded({ country, places, regions }); },
      () => { if (live) setFailed(country); },
    );
    return () => { live = false; };
  }, [country, attempt]);
  const ready = !!country && loaded?.country === country;
  const status = !country ? 'idle' : failed === country ? 'error' : ready ? 'ready' : 'loading';
  const regions = ready ? loaded.regions : [];
  const regionNames = useMemo(() => new Map(regions.map((r) => [r.key, r.name])), [regions]);
  const matches = useMemo(() => (ready ? search(loaded.places, q, region || undefined) : []), [ready, loaded, q, region]);
  return {
    country, setCountry: (c) => { setCountryRaw(c); setRegion(''); }, region, setRegion, q, setQ, status,
    retry: () => setAttempt((a) => a + 1), regions, regionNames, matches,
  };
}

export function CountryAndRegion({ ws, featured }: { ws: WorldSearch; featured?: boolean }) {
  const cid = useId();
  const rid = useId();
  return (
    <div className="inline-form">
      <div className="field">
        <label htmlFor={cid}>Country Or Territory</label>
        <select id={cid} value={ws.country} onChange={(e) => ws.setCountry(e.target.value)}>
          <option value="">{featured ? 'Featured Cities' : 'Choose A Country Or Territory'}</option>
          {PLAYABLE_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>
      {ws.country && ws.regions.length > 0 && (
        <div className="field">
          <label htmlFor={rid}>Region</label>
          <select id={rid} value={ws.region} onChange={(e) => ws.setRegion(e.target.value)}>
            <option value="">All Regions</option>
            {ws.regions.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

export function LoadProblem({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" style={{ padding: 12 }}>
      <p>Places couldn't be loaded.</p>
      <button type="button" className="btn" onClick={onRetry}>Try Again</button>
    </div>
  );
}

export const noMatch = (q: string) => `No places match '${q.trim()}'. Try a city, region, or country.`;

/** Choose any playable place on Earth: featured cities without a country, or any GeoNames place within one. */
export function WorldPlacePicker(props: { label: string; value: string; error?: string | null; onChoose: (place: Place) => void; map?: boolean }) {
  const [mapOpen, setMapOpen] = useState(true);
  const chosen = findPlace(props.value);
  const ws = useWorldSearch();
  const listId = useId();
  const [busy, setBusy] = useState<string | null>(null);
  const [chooseFailed, setChooseFailed] = useState<WorldPlace | null>(null);
  const choose = async (w: WorldPlace) => {
    setBusy(w.id);
    setChooseFailed(null);
    try {
      props.onChoose(await toGamePlace(w));
    } catch {
      setChooseFailed(w);
    } finally {
      setBusy(null);
    }
  };
  const featured = ws.country ? [] : searchPlaces(ws.q, 10);
  const shown = ws.matches.slice(0, SHOWN);
  return (
    <>
      {props.map && (
        <div className="col gap-2" style={{ marginBottom: 'var(--s4)' }}>
          <div className="row-between wrap gap-2">
            <p className="xs dim" style={{ margin: 0 }}>Pick a country on the map, or find it in the list below.</p>
            <button type="button" className="btn btn-ghost btn-sm" aria-expanded={mapOpen} onClick={() => setMapOpen(!mapOpen)}>{mapOpen ? 'Hide Map' : 'Show Map'}</button>
          </div>
          {mapOpen && (
            <Suspense fallback={<p role="status" className="muted">Loading the map…</p>}>
              <WorldMap country={ws.country} places={ws.status === 'ready' ? shown : []} onCountry={ws.setCountry} onPlace={(w) => void choose(w)} verb="Choose" />
            </Suspense>
          )}
        </div>
      )}
      <CountryAndRegion ws={ws} featured />
      <Field label={props.label} error={props.error} hint={chosen ? `Chosen: ${placeLabel(chosen)}` : 'Search by city, or choose a country or territory to search all of its places.'}>
        {(id, db) => (
          <>
            <input id={id} type="search" value={ws.q} placeholder="Search Places" aria-describedby={db} aria-controls={listId} aria-invalid={!!props.error} onChange={(e) => ws.setQ(e.target.value)} />
            <div className="picklist" id={listId} role="group" aria-label={`${props.label} Results`} aria-busy={ws.status === 'loading' || !!busy}>
              {!ws.country && featured.map((p) => (
                <button key={p.id} type="button" aria-pressed={p.id === props.value} onClick={() => props.onChoose(p)}>
                  <span>{p.name}</span>
                  <span className="dim">{p.region !== p.name ? `${p.region}, ` : ''}{p.countryName}</span>
                </button>
              ))}
              {ws.status === 'loading' && <p role="status" className="muted" style={{ padding: 12 }}>Loading places…</p>}
              {(ws.status === 'error' || chooseFailed) && <LoadProblem onRetry={() => (chooseFailed ? void choose(chooseFailed) : ws.retry())} />}
              {ws.status === 'ready' && shown.map((w) => (
                <button key={w.id} type="button" disabled={!!busy} aria-pressed={findPlace(props.value)?.geonameId === w.id} onClick={() => void choose(w)}>
                  <span>{w.name}</span>
                  <span className="dim">{[ws.regionNames.get(w.region), PLAYABLE_COUNTRIES.find((c) => c.code === w.country)?.name].filter(Boolean).join(', ')}</span>
                </button>
              ))}
              {((!ws.country && !featured.length) || (ws.status === 'ready' && !shown.length)) && <p className="muted" style={{ padding: 12 }}>{noMatch(ws.q)}</p>}
            </div>
            {ws.status === 'ready' && ws.matches.length > SHOWN && <p className="dim">Showing {SHOWN} of {ws.matches.length.toLocaleString('en')} places. Type more of the name to narrow the list.</p>}
          </>
        )}
      </Field>
    </>
  );
}
