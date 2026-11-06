import { Creation } from './Creation';
import { EventDetail } from './FinishViews';
import { NewProject, ProjectWorkspace, ProjectsList } from './Projects';
import { Shell } from './Shell';
import { Startup } from './Startup';
import { useStore } from './store';
import { CalendarView, Home, PlaceView, Profile } from './World';

export function App() {
  const s = useStore();
  if (s.screen === 'creation' && s.draft) return <Creation />;
  if (s.screen !== 'game' || !s.state) return <Startup />;
  const v = s.route.view;
  return (
    <Shell>
      {v === 'home' && <Home />}
      {v === 'calendar' && <CalendarView />}
      {v === 'place' && <PlaceView />}
      {v === 'profile' && <Profile />}
      {v === 'projects' && <ProjectsList />}
      {v === 'new-project' && <NewProject />}
      {v === 'project' && <ProjectWorkspace />}
      {v === 'event' && <EventDetail />}
    </Shell>
  );
}
