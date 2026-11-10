// The one list of destinations, grouped as 1221's rail is (`ui/shell/destinations.ts`). The rail, the drawer, the
// active state, the bar's screen name, each screen's eyebrow and the breadcrumbs all read it.
// Only implemented capabilities appear here.

export interface Destination {
  view: string;
  label: string;
  /** One line on what is behind it, shown as the rail item's title. */
  detail: string;
  /** Views that belong to this destination (the active state and the breadcrumb root). */
  owns?: string[];
  /** Offered on Home and kept off the rail, as 1221's calendar is: Home's Open Calendar is its way in. */
  homeOnly?: boolean;
}

export interface DestinationGroup {
  label: string;
  items: readonly Destination[];
}

export const HOME: Destination = { view: 'home', label: 'Home', detail: 'Your day, what is coming up and your projects' };

export const DESTINATIONS: readonly DestinationGroup[] = [
  { label: 'You', items: [{ view: 'profile', label: 'Player Profile', detail: 'Your professions, credits and history' }] },
  {
    label: 'Your Day',
    items: [
      { view: 'calendar', label: 'Calendar', detail: 'Your plans and commitments, month by month', owns: ['event'], homeOnly: true },
      { view: 'world', label: 'World', detail: 'Every place, on the map and in a list', owns: ['place'] },
    ],
  },
  { label: 'Your Work', items: [{ view: 'projects', label: 'Projects', detail: 'Your scripts and productions, from first draft to release', owns: ['project', 'new-project'] }] },
  { label: 'Industry', items: [{ view: 'companies', label: 'Companies', detail: "Disney's studios, their leadership, films and series", owns: ['company', 'title', 'season', 'episode', 'person', 'executive'] }] },
  {
    label: 'Your Game',
    items: [
      { view: 'saves', label: 'Saved Games', detail: 'Every saved game on this device' },
      { view: 'settings', label: 'Settings', detail: 'Theme, text size and whether obligations wake you' },
    ],
  },
];

/** What the rail offers: everything except what Home keeps. */
export const RAIL_DESTINATIONS: readonly DestinationGroup[] = DESTINATIONS
  .map((g) => ({ ...g, items: g.items.filter((i) => !i.homeOnly) }))
  .filter((g) => g.items.length > 0);

export const ALL_DESTINATIONS: readonly Destination[] = [HOME, ...DESTINATIONS.flatMap((g) => g.items)];

/** The destination a view belongs to. */
export function destinationOf(view: string): Destination {
  return ALL_DESTINATIONS.find((d) => d.view === view || d.owns?.includes(view)) ?? HOME;
}

/** The rail group a view sits under, for its screen's eyebrow. */
export function groupOf(view: string): string | undefined {
  const d = destinationOf(view);
  return DESTINATIONS.find((g) => g.items.includes(d))?.label;
}

/** A breadcrumb trail's first item: the destination a view belongs to. */
export function crumbRoot(view: string): { label: string; route: { view: string } } {
  const d = destinationOf(view);
  return { label: d.label, route: { view: d.view } };
}
