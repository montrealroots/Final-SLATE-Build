import { getPlace } from '../src/data/places';
import type { Project } from '../src/engine/types';

export * from '../src/engine';
// Page-only modules the app loads with their page (the startup budget); tests reach them here.
export * from '../src/engine/awards-actions';
export * from '../src/engine/awards-results';

export function getProjectZone(p: Project): string {
  return getPlace(p.axes.basePlaceId).zone;
}
export * from '../src/engine/edit-actions';
