import { lazy, Suspense, useEffect } from 'react';
import { loadFile } from '../catalog/load';
import type { WorldSeed } from '../catalog/world';
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
    return () => { live = false; };
  }, [saveKey]);
}

/** Load the world file and start the open game's world from it, once; also run when a film pack is installed (DataPacks.tsx). */
export function startLivingWorld(live: () => boolean = () => true): void {
  // The living world's engine loads with the world file, not at startup (state.ts holds its decisions until then).
  void Promise.all([loadFile<WorldSeed>('world.json'), import('../engine/industry'), import('../engine/awards-results'), import('../catalog/registry')]).then(([w, { ensureIndustry, setIndustryWorld }, { setStudioNames }, { company }]) => {
    if (!live() || w.status !== 'ready' || !w.data.series) return;
    setStudioNames((id) => company(id)?.name);
    setIndustryWorld({ horizon: w.data.horizon, builtAt: w.data.builtAt, series: w.data.series, studios: w.data.studios });
    if (store.state && (!store.state.industry || (!store.state.industry.studios && w.data.studios))) store.act((g) => void ensureIndustry(g));
  });
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
