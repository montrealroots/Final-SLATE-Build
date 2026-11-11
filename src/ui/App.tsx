import { lazy, Suspense, useEffect } from 'react';
import { loadFile } from '../catalog/load';
import type { WorldSeed } from '../catalog/world';
import { PageHead } from './components';
import { Shell } from './Shell';
import { Startup } from './Startup';
import { store, useStore } from './store';
import { Home } from './World';

const CATALOG_VIEWS = ['companies', 'company', 'title', 'season', 'episode', 'person', 'executive', 'networks', 'network'];

// Creation, project and event screens load on first use to keep startup small.
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
    // The living world's engine loads with the world file, not at startup (state.ts holds its decisions until then).
    void Promise.all([loadFile<WorldSeed>('world.json'), import('../engine/industry')]).then(([w, { ensureIndustry, setIndustryWorld }]) => {
      if (!live || w.status !== 'ready' || !w.data.series) return;
      setIndustryWorld({ horizon: w.data.horizon, builtAt: w.data.builtAt, series: w.data.series });
      if (!store.state?.industry) store.act((g) => void ensureIndustry(g));
    });
    return () => { live = false; };
  }, [saveKey]);
}

export function App() {
  const s = useStore();
  useLivingWorld(s.screen === 'game' && s.state ? `${s.state.createdAtReal}` : null);
  if (s.screen === 'creation' && s.draft) return <Suspense fallback={<p role="status">Loading…</p>}><Creation /></Suspense>;
  if (s.screen !== 'game' || !s.state) return <Startup />;
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
