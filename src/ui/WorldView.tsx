import { useEffect, useId, useMemo, useState } from 'react';
import { getPlace, placeLabel } from '../data/places';
import { travelHours } from '../engine';
import { countryName, toGamePlace, type WorldPlace } from '../world/gazetteer/gazetteer';
import { boxAround, frameBox, loadMap, markerRadiusAt, projectPoint, strokeAt, viewBoxOf, type WorldMapData } from '../world/map/map';
import { formatDuration } from '../engine';
import { store, useGame } from './store';
import { CountryAndRegion, LoadProblem, noMatch, useWorldSearch } from './WorldPicker';

const SHOWN = 20;

/** The World route: every playable country or territory, its regions and places, a list and an outline map. */
export function WorldView() {
  const g = useGame();
  const here = getPlace(g.locationId);
  const ws = useWorldSearch(here.country);
  const searchId = useId();
  const [opening, setOpening] = useState<string | null>(null);
  const [openFailed, setOpenFailed] = useState<WorldPlace | null>(null);
  const shown = ws.matches.slice(0, SHOWN);
  const open = async (w: WorldPlace) => {
    setOpening(w.id);
    setOpenFailed(null);
    try {
      const place = await toGamePlace(w);
      store.go({ view: 'place', placeId: place.id });
    } catch {
      setOpenFailed(w);
    } finally {
      setOpening(null);
    }
  };
  return (
    <>
      <h1>World</h1>
      <p className="muted">You're in {placeLabel(here)}. Choose a country or territory to see its places. Travel times come from the distance between places.</p>
      <div className="panel-grid">
        <section className="panel" aria-labelledby="w-find">
          <h2 id="w-find">Find A Place</h2>
          <CountryAndRegion ws={ws} />
          <div className="field">
            <label htmlFor={searchId}>Search Places</label>
            <input id={searchId} type="search" value={ws.q} disabled={!ws.country} onChange={(e) => ws.setQ(e.target.value)} />
          </div>
          {ws.status === 'loading' && <p role="status" className="muted">Loading places…</p>}
          {(ws.status === 'error' || openFailed) && <LoadProblem onRetry={() => (openFailed ? void open(openFailed) : ws.retry())} />}
          {ws.status === 'ready' && (
            shown.length ? (
              <ul className="list" aria-label="Places" aria-busy={!!opening}>
                {shown.map((w) => {
                  const hours = travelHours(here, { ...here, lat: w.lat, lon: w.lon });
                  return (
                    <li key={w.id}>
                      <button className="btn btn-quiet" disabled={!!opening} onClick={() => void open(w)}>{w.name}</button>{' '}
                      <span className="dim">{[ws.regionNames.get(w.region), countryName(w.country)].filter(Boolean).join(', ')} · about {formatDuration(hours * 3600_000)} away</span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="muted">{noMatch(ws.q)}</p>
          )}
          {ws.status === 'ready' && ws.matches.length > SHOWN && <p className="dim">Showing {SHOWN} of {ws.matches.length.toLocaleString('en')} places, largest first. Type more of the name to narrow the list.</p>}
        </section>
        <section className="panel" aria-labelledby="w-map">
          <h2 id="w-map">Map</h2>
          <WorldMap country={ws.country} here={here} places={ws.status === 'ready' ? shown : []} onCountry={ws.setCountry} onPlace={(w) => void open(w)} />
        </section>
      </div>
    </>
  );
}

function WorldMap(props: { country: string; here: { lat: number; lon: number; name: string }; places: WorldPlace[]; onCountry: (c: string) => void; onPlace: (w: WorldPlace) => void }) {
  const [data, setData] = useState<WorldMapData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setFailed(false);
    loadMap().then((m) => live && setData(m), () => live && setFailed(true));
    return () => { live = false; };
  }, [attempt]);
  const view = useMemo(() => {
    if (!data) return null;
    const outline = data.bounds[props.country];
    // Countries too small to draw at this scale are framed around their places' markers instead.
    const target = outline
      ? { x: Math.min(outline[0], outline[2]), y: Math.min(outline[1], outline[3]), width: Math.abs(outline[2] - outline[0]), height: Math.abs(outline[3] - outline[1]) }
      : boxAround(props.places.map((p) => projectPoint(p.lat, p.lon, data)));
    return target ? frameBox(target, data) : { x: 0, y: 0, width: data.width, height: data.height };
  }, [data, props.country, props.places]);
  if (failed) {
    return (
      <div role="alert">
        <p>The map couldn't be loaded. The list of places still works.</p>
        <button type="button" className="btn" onClick={() => setAttempt((a) => a + 1)}>Try Again</button>
      </div>
    );
  }
  if (!data || !view) return <p role="status" className="muted">Loading the map…</p>;
  const r = markerRadiusAt(view, data);
  const me = projectPoint(props.here.lat, props.here.lon, data);
  return (
    <>
      <svg className="worldmap" viewBox={viewBoxOf(view)} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Map of ${props.country ? countryName(props.country) : 'the world'}, with the listed places marked`}>
        <rect className="worldmap-sea" x={0} y={0} width={data.width} height={data.height} />
        {Object.entries(data.countries).map(([code, d]) => (
          <path key={code} d={d} className="worldmap-country" data-selected={code === props.country || undefined} strokeWidth={strokeAt(view, data)} onClick={() => props.onCountry(code)}>
            <title>{countryName(code)}</title>
          </path>
        ))}
        {props.places.map((w) => {
          const p = projectPoint(w.lat, w.lon, data);
          return (
            <circle key={w.id} className="worldmap-marker" cx={p.x} cy={p.y} r={r} onClick={() => props.onPlace(w)}>
              <title>{w.name}</title>
            </circle>
          );
        })}
        <circle className="worldmap-here" cx={me.x} cy={me.y} r={r * 1.4}><title>You're in {props.here.name}</title></circle>
      </svg>
      <p className="dim">Outlines: Natural Earth. Small countries and territories that can't be drawn at this scale are still in the list. Your location is ringed.</p>
    </>
  );
}
