// Who and where an idea applies to (IdeaPicker.tsx): the parts ticked and the scenes ticked. On the default short, both
// parts in built costumes, the idea applied as its brief is written: "Human Disguise" (two looks, before and after a
// reveal; looks.ts costumeCopies) to the friend only or to both, and "Physical Slapstick" (a rehearsed gag with a
// coordinator; projects.ts deriveRequirements) to the flat's scene only or to all three.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { applyIdea } from '../../../src/engine/brief';
import { IDEAS } from '../../../src/ideas';
import { short } from './script';
import { measure as scoreMeasure, reviewThemes, takeBrief } from './score';

const I = (label: string) => `field:IdeaPicker.tsx#${label}#1`;
const idea = (id: string) => IDEAS.find((x) => x.id === id)!;
/** The short, both parts in built costumes, with `apply` done to it before the script is approved. */
const withIdea = (apply: (s: GameState, p: Project) => void) => (s: GameState, year: number): Project => {
  const p = short()(s, year);
  for (const c of p.characters) c.look = { ...c.look, wardrobe: 'build' };
  apply(s, p);
  return p;
};
const named = (p: Project, ...names: string[]) => p.characters.filter((c) => names.includes(c.name)).map((c) => c.id);
const disguise = (...names: string[]) => withIdea((s, p) => { applyIdea(s, p, idea('creature_rule.009'), { characterIds: named(p, ...names) }); });
const slapstick = (...places: string[]) => withIdea((s, p) => { applyIdea(s, p, idea('comedy_treatment.004'), { sceneIds: p.scenes.filter((x) => places.includes(x.heading.place)).map((x) => x.id) }); });

/** The short, its tone "quiet and tender", given "Mistaken Identity" (a tone) with the tone kept or not. */
const farce = (keep: string[]) => (s: GameState, year: number): Project => {
  const p = short({ axes: { tone: 'quiet and tender' } })(s, year);
  applyIdea(s, p, idea('comedy_treatment.001'), { keep });
  return p;
};

export const PROBES: Probe[] = [
  { id: 'idea-characters', features: [I('{c.name}')], decision: 'Apply "Human Disguise" to the lead as well as the friend', reads: ['src/engine/brief.ts#applyIdea', 'src/engine/looks.ts#costumeCopies'],
    base: { project: disguise('Friend') }, variant: { project: disguise('Friend', 'Lead') }, bites: ['ownIn'], downstream: ['daysToDeliver', 'spent'] },
  { id: 'idea-scenes', features: [I('{`Scene ${i + 1}')], decision: 'Apply "Physical Slapstick" to all three scenes rather than the flat\'s alone', reads: ['src/engine/brief.ts#applyIdea', 'src/engine/projects.ts#deriveRequirements'],
    base: { project: slapstick('Flat') }, variant: { project: slapstick('Flat', 'Street', 'Cafe') }, bites: ['spent'], downstream: ['ownIn', 'daysToDeliver'] },
  // A kept field is left as the player wrote it (brief.ts applyIdea): here the tone, which the music brief reads; quiet
  // and tender asks for a chamber score, a farce's tone for none in particular, and a micro budget then asks for synth.
  { id: 'idea-keep-tone', features: [I('{`Keep My ${o.label}`}')], decision: 'Keep your own tone when applying "Mistaken Identity", then take the music brief it proposes', reads: ['src/engine/brief.ts#applyIdea', 'src/engine/cues.ts#proposeBrief'],
    base: { project: farce([]), decide: takeBrief, daily: reviewThemes(0) }, variant: { project: farce(['tone']), decide: takeBrief, daily: reviewThemes(0) }, measure: scoreMeasure,
    bites: ['chamber'], downstream: ['spent', 'daysToDeliver'] },
];
