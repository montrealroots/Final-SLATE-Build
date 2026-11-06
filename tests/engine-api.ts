import { getPlace } from '../src/data/places';
import type { Project } from '../src/engine/types';

export * from '../src/engine';

export function getProjectZone(p: Project): string {
  return getPlace(p.axes.basePlaceId).zone;
}
