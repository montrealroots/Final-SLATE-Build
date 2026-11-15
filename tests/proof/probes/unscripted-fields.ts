// An unscripted show's format (ScriptViews.tsx "Format Family", who competes, "Leave Each Episode"): a competition
// decides each episode's result once it is recorded (unscripted.ts decideCompetition), and a contestant who has left
// must come out of the later episodes' segments (unscripted.ts unscriptedIssues). On a three-episode show with a host
// and six people in every segment, all of whom agreed to appear.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { contestantPresence, contestantTraits, setFamily, setupCompetition } from '../../../src/engine/unscripted';
import { scriptIssues } from '../../../src/engine/projects';
import { buildProject } from '../../helpers';
import { unfunded } from '../career';

const S = (label: string, n = 1) => `field:ScriptViews.tsx#${label}#${n}`;
const seg = (id: string, ep: number, who: string[]) => ({
  id, episode: ep, heading: { intExt: 'INT' as const, place: 'Tent', time: 'DAY' as const }, storyLocation: 'Tent', participants: [], objective: 'The challenge', action: '', dialogue: [], turningPoint: '',
  estMinutes: 6, props: [], animals: [], vehicles: [], stunts: '', crowd: 0, intimacy: false, water: false, vfx: [], songs: [], dance: false, kind: 'segment' as const,
  basis: 'sourced' as const, contributorIds: who, evidenceIds: [], intentionalDiscontinuity: false,
});
const PEOPLE = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
/**
 * The show as `family`; as a competition, `competing` of the six compete and `leave` go each episode: the first of them,
 * or with `byPresence` those who come across best on screen (unscripted.ts contestantTraits).
 */
const show = (family: 'competition' | 'observational', competing = 6, leave = 1, byPresence = false) => (s: GameState, year: number): Project => {
  const p = unfunded(buildProject(s, { title: `Bake Off Season ${year + 1}`, format: 'unscripted-series', medium: 'live-action', episodes: 3, runtime: 20 }, [], []));
  p.worldRules.push({ id: 'fr1', rule: 'Six bakers, one tent.', limit: 'One day per episode.' });
  p.contributors.push({ id: 'h', name: 'A Host (Fixture)', role: 'Host', consent: 'given' }, ...PEOPLE.map((id, i) => ({ id, name: `Baker ${i + 1} (Fixture)`, role: 'Contestant', consent: 'given' as const })));
  setFamily(p, family);
  const order = byPresence ? [...PEOPLE].sort((a, b) => contestantTraits(s, p, b).presence - contestantTraits(s, p, a).presence) : PEOPLE;
  if (family === 'competition') setupCompetition(p, order.slice(0, competing), leave);
  p.scenes.push(...[1, 2, 3].map((e) => seg(`e${e}`, e, ['h', ...PEOPLE])) as never[]);
  return p;
};
/** What the competition decided, and the notes it left on the later episodes' scripts. */
const measure = (_s: GameState, projects: Project[]) => ({
  results: projects.reduce((a, p) => a + (p.unscripted?.competition?.results.length ?? 0), 0),
  eliminated: projects.reduce((a, p) => a + (p.unscripted?.competition?.results ?? []).reduce((b, r) => b + r.eliminated.length, 0), 0),
  // Before the final, which eliminates all but the winner.
  eliminatedEarly: projects.reduce((a, p) => a + (p.unscripted?.competition?.results ?? []).filter((r) => r.episode < p.axes.episodeCount).reduce((b, r) => b + r.eliminated.length, 0), 0),
  leftNotes: projects.reduce((a, p) => a + scriptIssues(p).filter((i) => i.text.includes('left the competition before')).length, 0),
  presence: projects.reduce((a, p) => a + (contestantPresence(_s, p, p.scenes) ?? 0), 0),
});

export const PROBES: Probe[] = [
  { id: 'format-competition', features: [S('"Format Family"')], decision: 'Make the show a competition rather than observational', reads: ['src/engine/unscripted.ts#decideCompetition', 'src/engine/unscripted.ts#unscriptedIssues'],
    base: { project: show('observational') }, variant: { project: show('competition') }, measure, bites: ['results'], downstream: ['leftNotes'] },
  // Who competes: their skill weighs on who goes through (decideCompetition) and their screen presence is the show's
  // performance (finish.ts assessQuality). Until November 15, 2026 neither was read: five of six or all six changed only
  // how many were eliminated.
  { id: 'contestants', features: [S('{c.name}', 4)], decision: 'Have the five who come across best on screen compete, rather than the first five', reads: ['src/engine/unscripted.ts#contestantTraits', 'src/engine/unscripted.ts#contestantPresence', 'src/engine/finish.ts#assessQuality'],
    base: { project: show('competition', 5) }, variant: { project: show('competition', 5, 1, true) }, measure, bites: ['presence'], downstream: ['overall', 'reception'] },
  { id: 'leave-each', features: [S('"Leave Each Episode"')], decision: 'Have two leave each episode rather than one', reads: ['src/engine/unscripted.ts#decideCompetition', 'src/engine/unscripted.ts#unscriptedIssues'],
    base: { project: show('competition', 6, 1) }, variant: { project: show('competition', 6, 2) }, measure, bites: ['eliminatedEarly'], downstream: ['leftNotes'] },
];
