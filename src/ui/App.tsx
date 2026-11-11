import { lazy, Suspense, useEffect } from 'react';
import { loadFile } from '../catalog/load';
import type { WorldSeed } from '../catalog/world';
import type { RecordedPerson } from '../engine/guests';
import { PageHead } from './components';
import { Startup } from './Startup';
import { store, useStore } from './store';

const CATALOG_VIEWS = ['companies', 'company', 'title', 'season', 'episode', 'person', 'executive', 'networks', 'network'];

// Creation, project and event screens load on first use to keep startup small. So, from November 11, 2026, do the
// game's frame and Home: the start screen needs neither, and both arrive with the engine (store.warm), fetched once it
// has drawn.
const Creation = lazy(() => import('./Creation').then((m) => ({ default: m.Creation })));
const ProjectsList = lazy(() => import('./Projects').then((m) => ({ default: m.ProjectsList })));
const NewProject = lazy(() => import('./Projects').then((m) => ({ default: m.NewProject })));
const ProjectWorkspace = lazy(() => import('./Projects').then((m) => ({ default: m.ProjectWorkspace })));
const WorldView = lazy(() => import('./WorldView').then((m) => ({ default: m.WorldView })));
const SavedGamesPage = lazy(() => import('./SavedGames').then((m) => ({ default: () => <><PageHead eyebrow="Your Game" title="Saved Games" lede="Every saved game on this device. Export one to keep a copy of it anywhere." /><m.SavedGamesList /></> })));
const SettingsPage = lazy(() => import('./SavedGames').then((m) => ({ default: () => <><PageHead eyebrow="Your Game" title="Settings" /><section className="card"><m.SettingsPanel /></section></> })));
const CalendarView = lazy(() => import('./Places').then((m) => ({ default: m.CalendarView })));
const PlaceView = lazy(() => import('./Places').then((m) => ({ default: m.PlaceView })));
const Profile = lazy(() => import('./Places').then((m) => ({ default: m.Profile })));
const CatalogView = lazy(() => import('./Catalog').then((m) => ({ default: m.CatalogView })));
const TmdbCredit = lazy(() => import('./Catalog').then((m) => ({ default: m.TmdbCredit })));
const EventDetail = lazy(() => import('./FinishViews').then((m) => ({ default: m.EventDetail })));

/**
 * Starts the living world for the open save when the catalog's world file is installed (docs/WORLD.md): the engine
 * gets the series it continues, and the save's world begins once. Without the catalog nothing changes.
 */
function useLivingWorld(saveKey: string | null): void {
  useEffect(() => {
    if (!saveKey) return;
    let live = true;
    startLivingWorld(() => live);
    expireSources();
    void expirePeople();
    const hourly = setInterval(() => { expireSources(); void expirePeople(); }, 3_600_000);
    return () => { live = false; clearInterval(hourly); };
  }, [saveKey]);
}

/** Load the world file and start the open game's world from it, once; also run when a film pack is installed (DataPacks.tsx). */
export function startLivingWorld(live: () => boolean = () => true): void {
  // The living world's engine loads with the world file, not at startup (state.ts holds its decisions until then).
  void Promise.all([loadFile<WorldSeed>('world.json'), loadFile<{ retrieved?: { from?: string | null } }>('index.json'), import('../engine/industry'), import('../engine/awards-results'), import('../catalog/registry')]).then(([w, index, { ensureIndustry, setIndustryWorld }, { setStudioNames }, { company }]) => {
    if (!live() || w.status !== 'ready' || !w.data.series) return;
    setStudioNames((id) => company(id)?.name);
    // TMDB's six months count from the oldest record gathered, which the catalog's index gives.
    const from = index.status === 'ready' ? index.data.retrieved?.from?.slice(0, 10) : undefined;
    setIndustryWorld({ horizon: w.data.horizon, builtAt: w.data.builtAt, ...(from ? { from } : {}), series: w.data.series, studios: w.data.studios });
    const ind = store.state?.industry;
    // Only a game that lacks something is changed (and saved): its world, the studios' pace, or a series' frozen inputs.
    if (store.state && (!ind || (!ind.studios && w.data.studios) || Object.values(ind.series).some((x) => !x.closed && (!x.p || x.rec === undefined)))) store.act((g) => void ensureIndustry(g));
    store.worldVersion += 1;
    store.emit();
  });
}

/**
 * A save keeps copies of a few recorded seasons until its world has made its own (industry.ts FrozenSeries). TMDB allows
 * its data to be kept six months, so past that they are deleted from the open game: when it opens, and every hour while
 * it stays open. Nothing the save's world decided is touched.
 */
function expireSources(): void {
  const ind = store.state?.industry;
  if (!ind) return;
  void import('../engine/industry').then(({ expireIndustrySources, sourcesExpire }) => {
    if (store.state?.industry !== ind || Date.now() < sourcesExpire(ind)) return;
    if (Object.values(ind.series).some((x) => x.p?.last || x.p?.model)) store.act((g) => void expireIndustrySources(g, Date.now()));
  });
}

/**
 * The same six months for the people the player brought in from the film catalog (guests.ts): each copied record is
 * renewed from the catalog installed now when that copy is newer, and removed otherwise, with the person's name taken out
 * of what the game wrote. Their contracts, pay, work and credits in the story stay. Also run when a film pack is installed.
 */
export async function expirePeople(): Promise<void> {
  const state = store.state;
  if (!state?.real) return;
  const { expireRecords, recordEnds, tmdbIdOf } = await import('../engine/guests');
  const now = Date.now();
  // Only the people whose copy is due, or already withdrawn (a newer catalog brings their name back), are looked up.
  const due = Object.values(state.real).filter((p) => { const ends = recordEnds(p); return ends === null || now >= ends; });
  if (!due.length) return;
  const { fileFor } = await import('../catalog/model');
  const index = await loadFile<{ builtAt?: string; retrieved?: { from?: string | null } }>('index.json');
  const gathered = index.status === 'ready' ? index.data.retrieved?.from ?? index.data.builtAt : undefined;
  const fresh = new Map<number, { record: RecordedPerson; gathered: string }>();
  if (gathered) {
    for (const p of due) {
      const id = tmdbIdOf(p.id);
      const bucket = await loadFile<Record<string, RecordedPerson>>(fileFor(`person:${id}`)!);
      const record = bucket.status === 'ready' ? bucket.data[String(id)] : undefined;
      if (record) fresh.set(id, { record, gathered });
    }
  }
  // Nothing to write when every one of them is withdrawn already and no catalog has them.
  if (store.state !== state || (!fresh.size && due.every((p) => !p.rec))) return;
  store.act((g) => void expireRecords(g, now, (id) => fresh.get(id)));
}

export function App() {
  const s = useStore();
  // The engine and the game's frame (store.warm) load once the start screen has drawn, so Continue and New Game rarely
  // wait for them.
  useEffect(() => { void store.warm().catch(() => undefined); }, []);
  useLivingWorld(s.screen === 'game' && s.state ? `${s.state.createdAtReal}` : null);
  if (s.screen === 'creation' && s.draft) return <Suspense fallback={<p role="status">Loading…</p>}><Creation /></Suspense>;
  if (s.screen !== 'game' || !s.state || !store.frame) return <Startup />;
  const { Shell, Home } = store.frame;
  const v = s.route.view;
  return (
    <Shell>
      <Suspense fallback={<p role="status">Loading…</p>}>
      {v === 'home' && <Home />}
      {v === 'calendar' && <CalendarView />}
      {v === 'world' && <WorldView />}
      {v === 'place' && <PlaceView />}
      {v === 'profile' && <Profile />}
      {v === 'projects' && <ProjectsList />}
      {v === 'new-project' && <NewProject />}
      {v === 'project' && <ProjectWorkspace />}
      {v === 'event' && <EventDetail />}
      {v === 'saves' && <SavedGamesPage />}
      {v === 'settings' && <><SettingsPage /><TmdbCredit /></>}
      {CATALOG_VIEWS.includes(v) && <CatalogView route={s.route} />}
      </Suspense>
    </Shell>
  );
}
