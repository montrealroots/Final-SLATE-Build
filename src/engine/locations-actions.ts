// Choosing a site and a backup for a place (locations.ts says how sites work and why). Loaded with the Schedule page,
// not at startup.
import { scoutedPlaces, type SiteOption } from './locations';
import type { Project } from './types';

export function chooseSite(p: Project, place: string, which: 'main' | 'backup', id: SiteOption['id'] | null): void {
  if (!scoutedPlaces(p).includes(place)) throw new Error('Scouting hasn\'t found sites for that place yet.');
  const rec = ((p.locationChoices ??= {})[place] ??= {});
  if (id && rec.lost?.includes(id)) throw new Error('That site fell through and is no longer available.');
  if (id && (which === 'main' ? rec.backup : rec.main) === id) throw new Error('The main site and the backup must be different.');
  if (which === 'main' && !id) throw new Error('Choose a site.');
  if (id) rec[which] = id;
  else delete rec[which];
}
