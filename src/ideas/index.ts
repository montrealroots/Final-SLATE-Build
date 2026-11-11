// The idea library (src/engine/brief.ts), loaded when the picker first opens and never at startup. The whole library is
// a few hundred kilobytes of text, so it is one lazy chunk; when it grows past what one fetch should carry it is split
// by field here, and nothing that uses it changes.
import type { Idea, IdeaField } from '../engine/brief';
import type { Project } from '../engine/types';
import { MORE } from './more';
import { STARTER } from './starter';

export const IDEAS: Idea[] = [...STARTER, ...MORE];
const byId = new Map(IDEAS.map((x) => [x.id, x]));
export const ideaById = (id: string): Idea | undefined => byId.get(id);
export const ideasFor = (field: IdeaField | IdeaField[]): Idea[] => { const set = new Set(Array.isArray(field) ? field : [field]); return IDEAS.filter((x) => set.has(x.field)); };

/**
 * Why an idea suits this project, in words, or null when it has no particular reason to. Nothing is hidden for not
 * fitting: Browse All shows everything, and an idea that doesn't suit says why when it is opened.
 */
export function whyItFits(p: Project, idea: Idea): string | null {
  const f = idea.fits;
  if (!f) return null;
  const genres = p.axes.genres.map((g) => g.id);
  const reasons: string[] = [];
  const g = f.genres?.find((x) => genres.includes(x));
  if (g) reasons.push(`suits ${g.replace(/-/g, ' ')}`);
  if (f.formats?.includes(p.axes.format)) reasons.push('written for this format');
  if (f.media?.includes(p.axes.medium) && !f.genres && !f.formats) reasons.push(p.axes.medium === 'animation' ? 'for animation' : 'for live action');
  return reasons.length ? reasons.join(', ') : null;
}
/** Whether an idea is for another way of making things than this project's: said on its card, never hidden. */
export const wrongMedium = (p: Project, idea: Idea): boolean => !!idea.fits?.media && !idea.fits.media.includes(p.axes.medium);

/** Ideas for a field with those that suit the project first, in their written order otherwise. */
export function recommended(p: Project, field: IdeaField | IdeaField[]): Idea[] {
  return ideasFor(field).filter((x) => !wrongMedium(p, x) && whyItFits(p, x) !== null);
}
