// The one list of destinations. The sidebar, the mobile drawer, the active state and breadcrumbs all read it.
// Only implemented capabilities appear here.

export interface Destination {
  view: string;
  label: string;
  /** Views that belong to this destination (the active state and the breadcrumb root). */
  owns?: string[];
}

export const DESTINATIONS: readonly Destination[] = [
  { view: 'home', label: 'Home' },
  { view: 'calendar', label: 'Calendar', owns: ['event'] },
  { view: 'world', label: 'World', owns: ['place'] },
  { view: 'projects', label: 'Projects', owns: ['project', 'new-project'] },
  { view: 'profile', label: 'Profile' },
  { view: 'saves', label: 'Saved Games' },
  { view: 'settings', label: 'Settings' },
];

/** The destination a view belongs to. */
export function destinationOf(view: string): Destination {
  return DESTINATIONS.find((d) => d.view === view || d.owns?.includes(view)) ?? DESTINATIONS[0];
}

/** A breadcrumb trail's first item: the destination a view belongs to. */
export function crumbRoot(view: string): { label: string; route: { view: string } } {
  const d = destinationOf(view);
  return { label: d.label, route: { view: d.view } };
}
