import { lazy, Suspense } from 'react';
import { Creation } from './Creation';
import { Shell } from './Shell';
import { Startup } from './Startup';
import { useStore } from './store';
import { CalendarView, Home, PlaceView, Profile } from './World';

// Project and event screens load on first use to keep startup small.
const ProjectsList = lazy(() => import('./Projects').then((m) => ({ default: m.ProjectsList })));
const NewProject = lazy(() => import('./Projects').then((m) => ({ default: m.NewProject })));
const ProjectWorkspace = lazy(() => import('./Projects').then((m) => ({ default: m.ProjectWorkspace })));
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
      {v === 'place' && <PlaceView />}
      {v === 'profile' && <Profile />}
      {v === 'projects' && <ProjectsList />}
      {v === 'new-project' && <NewProject />}
      {v === 'project' && <ProjectWorkspace />}
      {v === 'event' && <EventDetail />}
      </Suspense>
    </Shell>
  );
}
