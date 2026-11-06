import { lazy, Suspense } from 'react';
import { Creation } from './Creation';
import { Shell } from './Shell';
import { Startup } from './Startup';
import { useStore } from './store';
import { Home } from './World';

// Project and event screens load on first use to keep startup small.
const ProjectsList = lazy(() => import('./Projects').then((m) => ({ default: m.ProjectsList })));
const NewProject = lazy(() => import('./Projects').then((m) => ({ default: m.NewProject })));
const ProjectWorkspace = lazy(() => import('./Projects').then((m) => ({ default: m.ProjectWorkspace })));
const WorldView = lazy(() => import('./WorldView').then((m) => ({ default: m.WorldView })));
const SavedGamesPage = lazy(() => import('./Startup').then((m) => ({ default: () => <><h1>Saved Games</h1><m.SavedGamesList /></> })));
const SettingsPage = lazy(() => import('./Startup').then((m) => ({ default: () => <><h1>Settings</h1><section className="panel"><m.SettingsPanel /></section></> })));
const CalendarView = lazy(() => import('./Places').then((m) => ({ default: m.CalendarView })));
const PlaceView = lazy(() => import('./Places').then((m) => ({ default: m.PlaceView })));
const Profile = lazy(() => import('./Places').then((m) => ({ default: m.Profile })));
const EventDetail = lazy(() => import('./FinishViews').then((m) => ({ default: m.EventDetail })));

export function App() {
  const s = useStore();
  if (s.screen === 'creation' && s.draft) return <Creation />;
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
      {v === 'settings' && <SettingsPage />}
      </Suspense>
    </Shell>
  );
}
