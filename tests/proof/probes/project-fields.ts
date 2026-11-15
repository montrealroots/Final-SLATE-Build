// The project's own fields (Projects.tsx), each changed on the film it applies to: the animation technique, the era a
// period story is set in, the language its dialogue is in, where the story is set,
// how many episodes a season has, and how many years pass before a sequel. Each is read where CONTROLS.csv says.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { buildProject, agreedFunding, writePitch } from '../../helpers';
import { addScene, updateScene } from '../../engine-api';
import { unfunded } from '../career';
import { continueProject } from '../../../src/engine/sequel';
import { financeSummary } from '../../../src/engine/finance';
import { short } from './script';
import { SERIES } from './scheduled';

const F = (label: string, n = 1) => `field:Projects.tsx#${label}#${n}`;
/** A costume drama: the genre whose period module makes the era count (genres.ts composeGenres). */
const PERIOD = [{ id: 'costume-drama', emphasis: 'primary' as const }];
/** A two-minute animated short of two scenes, its lead and friend. */
const animated = (technique: '3d-cg' | 'stop-motion') => (s: GameState, year: number): Project => unfunded(buildProject(s,
  { title: `Year ${year + 1}`, format: 'short', medium: 'animation', technique, quality: 'tv', scenario: 'micro', genres: ['drama'], runtime: 2 },
  [{ name: 'Lead', patch: { roleSize: 'lead' } }, { name: 'Friend', patch: { roleSize: 'supporting' } }],
  [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: 1 }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: 1 }]));
/** The commissioned series (scheduled.ts SERIES) with a third episode of the same two scenes. */
const threeEpisodes = (s: GameState, year: number): Project => {
  const p = unfunded(buildProject(s, { title: `Season ${year + 1}`, format: 'limited-series', medium: 'live-action', scenario: 'micro', genres: ['drama'], episodes: 3, runtime: 20 }, [{ name: 'Mara', patch: { roleSize: 'lead' } }],
    [1, 2, 3].flatMap((e) => [{ place: 'Pier', chars: ['Mara'], minutes: 3, extra: { episode: e } }, { place: 'Quay', intExt: 'EXT' as const, chars: ['Mara'], minutes: 3, extra: { episode: e } }])));
  // Commissioned as SERIES is: the season's whole cost met by the broadcaster.
  const amount = Math.max(1, financeSummary(p).stillToRaise);
  (p.finance ??= { estimate: amount, target: amount, deals: [] }).deals.push({ id: `${p.id}-commission`, kind: 'commissioner', backer: 'A Broadcaster (Fixture)', amount, status: 'accepted', askedAt: s.now, reason: 'Labelled fixture: the season is commissioned.', received: amount, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null } });
  p.funding.fund += amount;
  return p;
};
/**
 * The default short, its lead a ten-year-old; in the second year a sequel to it, `years` later in the story (sequel.ts
 * continueProject): the lead is as old as the years make them (story-age.ts), with the same three scenes written for it.
 */
const childSequel = (years: number) => (s: GameState, year: number): Project => {
  const prev = s.projects.find((x) => x.delivered && !x.continuedBy);
  if (year === 0 || !prev) return short({ lead: { ageInStory: '10' } })(s, year);
  const p = continueProject(s, prev, `Year ${year + 1}`, years);
  agreedFunding(p);
  writePitch(p);
  const id = (name: string) => p.characters.find((c) => c.name === name)!.id;
  for (const sc of [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: 3 }, { place: 'Street', chars: ['Lead'], minutes: 3 }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: 4 }]) {
    const x = addScene(s, p, 1);
    updateScene(p, x.id, { heading: { intExt: 'INT', place: sc.place, time: 'DAY' }, storyLocation: sc.place, participants: sc.chars.map(id), objective: 'Move the story forward.', action: 'Action.', estMinutes: sc.minutes } as never);
  }
  return unfunded(p);
};
const sequels = (_s: GameState, projects: Project[]) => ({ continued: projects.filter((p) => p.continues).length });

export const PROBES: Probe[] = [
  { id: 'technique-stop-motion', features: [F("{medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'}")], decision: 'Animate the short in stop-motion rather than 3D CG', reads: ['src/engine/production/tasks.ts#buildTasks'],
    base: { project: animated('3d-cg') }, variant: { project: animated('stop-motion') }, bites: ['hired'], downstream: ['daysToDeliver', 'spent'] },
  // Research is a specialist's work: the researcher is hired, and the player puts in what it costs.
  { id: 'story-era', features: [F('"Story Era"')], decision: 'Set the costume drama in Victorian times rather than the present', reads: ['src/engine/projects.ts#deriveRequirements', 'src/engine/production/tasks.ts#buildTasks'],
    base: { project: short({ axes: { storyEra: 'Contemporary', genres: PERIOD } }) }, variant: { project: short({ axes: { storyEra: 'Victorian', genres: PERIOD } }) }, bites: ['spent'], downstream: ['hired', 'ownIn'] },
  { id: 'dialogue-french', features: [F('?', 2)], decision: 'Write the short\'s dialogue in French', reads: ['src/engine/production/language.ts#personLanguagesFit', 'src/engine/finish.ts#versionLanguages'],
    variant: { project: short({ axes: { dialogueLanguages: ['fr'] }, lead: { languages: ['fr'] } }) }, bites: ['spent'], downstream: ['hired', 'money'] },
  // A story set in another country than the base is researched before design and costumes (projects.ts deriveRequirements).
  { id: 'setting-abroad', features: [F('"Story Setting Place"'), 'field:ScriptViews.tsx#"Story Setting Place"#1'], decision: 'Set the short in Paris, made from London', reads: ['src/engine/projects.ts#deriveRequirements', 'src/engine/production/tasks.ts#buildTasks'],
    variant: { project: short({ axes: { settingPlaceId: 'fr-paris' } }) }, bites: ['spent'], downstream: ['hired', 'ownIn'] },
  { id: 'episodes-three', features: [F('"Episodes"')], decision: 'Make the commissioned season three episodes rather than two', reads: ['src/engine/projects.ts#createProject'],
    base: SERIES, variant: { ...SERIES, project: threeEpisodes }, bites: ['shootDays', 'spent'], downstream: ['daysToDeliver', 'revenue'] },
  // A grown lead needs no one hired for a child (minors.ts), and the days aren't held to a child's hours.
  { id: 'story-years', features: [F('"Years That Pass In The Story"')], decision: 'Let ten years pass before the sequel, so its child lead is grown', reads: ['src/engine/sequel.ts#continueProject', 'src/engine/minors.ts#minorFor'],
    base: { project: childSequel(0) }, variant: { project: childSequel(10) }, measure: sequels, bites: ['hired'], downstream: ['daysToDeliver', 'money'] },
];
