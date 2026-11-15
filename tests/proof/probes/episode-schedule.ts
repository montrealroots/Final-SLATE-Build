// When a season's episodes come out (FinishViews.tsx "Episode Schedule", "Episodes On The Premiere", each later
// episode's date): at the International Emmys a season counts in the calendar year most of its episodes aired
// (awards-rules.ts airing; the Emmys read the premiere alone). On a commissioned season of three 45-minute episodes,
// made in London and streamed in Britain from the next December 25 after delivery, a week before the year closes,
// entered in everything.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { planRelease } from '../../../src/engine/finish';
import { addDaysToKey, dateKey } from '../../../src/engine/time';
import { buildProject } from '../../helpers';
import { unfunded } from '../career';
import { commission } from './project-fields';
import { enterAll, kinds } from './awards-fields';
import { SERIES } from './scheduled';

const season = (s: GameState, year: number): Project => commission(s, unfunded(buildProject(s, { title: `Season ${year + 1}`, format: 'limited-series', medium: 'live-action', scenario: 'micro', genres: ['drama'], episodes: 3, runtime: 135 },
  [{ name: 'Mara', patch: { roleSize: 'lead' } }], [1, 2, 3].flatMap((e) => [1, 2, 3].map((k) => ({ place: k === 2 ? 'Quay' : 'Pier', chars: ['Mara'], minutes: 15, extra: { episode: e } }))))));
/** The next December 25 at least a fortnight away. */
const nextDec25 = (s: GameState) => { const soon = addDaysToKey(dateKey(s.now, 'Europe/London'), 14); const y = Number(soon.slice(0, 4)); return `${soon.slice(5) <= '12-25' ? y : y + 1}-12-25`; };
type Plan = Omit<Parameters<typeof planRelease>[2], 'route' | 'date' | 'territories'>;
/** Streamed in Britain from the next December 25, its episodes as `plan` (given the premiere) puts them. */
const streamed = (plan: (premiere: string) => Plan) => (s: GameState, p: Project) => { const d = nextDec25(s); try { planRelease(s, p, { route: 'streaming', date: d, territories: ['GB'], ...plan(d) }); } catch { /* no release */ } };
const RUN = (plan: (premiere: string) => Plan) => ({ ...SERIES, years: 3, release: false, project: season, afterDelivery: streamed(plan), daily: enterAll });
/** The International Emmys' entries, and the year each is for: a season moved to the next year enters a year later. */
const measure = (s: GameState) => {
  const emmys = s.editions.filter((e) => e.institutionId === 'international-emmys').flatMap((ed) => ed.entries.filter((e) => s.projects.some((p) => p.id === e.projectId)).map(() => ed.year));
  return { ...kinds(s), emmyEntries: emmys.length, emmyYears: emmys.reduce((a, y) => a + y - 2026, 0) };
};
const F = (label: string) => `field:FinishViews.tsx#${label}#1`;

export const PROBES: Probe[] = [
  { id: 'schedule-weekly', features: [F('"Episode Schedule"')], decision: 'Put the season out weekly from December 25 rather than all on the premiere', reads: ['src/engine/episode-releases.ts#presetDates', 'src/engine/awards-rules.ts#requirementProblems'],
    base: RUN(() => ({ pattern: 'all' })), variant: RUN(() => ({ pattern: 'weekly' })), measure, bites: ['emmyYears'], downstream: ['decided', 'emmyEntries'] },
  { id: 'premiere-count', features: [F('"Episodes On The Premiere"')], decision: 'Put one episode out on the premiere, then one a week, rather than all three on the premiere', reads: ['src/engine/episode-releases.ts#presetDates', 'src/engine/awards-rules.ts#requirementProblems'],
    base: RUN(() => ({ pattern: 'premiere-weekly', onPremiere: 3 })), variant: RUN(() => ({ pattern: 'premiere-weekly', onPremiere: 1 })), measure, bites: ['emmyYears'], downstream: ['decided', 'emmyEntries'] },
  { id: 'episode-date', features: [F('{`Episode ${i + 2}`}')], decision: 'Hold the second and third episodes until the spring, a break that splits the season', reads: ['src/engine/episode-releases.ts#episodeDateProblem', 'src/engine/awards-rules.ts#requirementProblems'],
    base: RUN((d) => ({ episodeDates: [d, d, d] })), variant: RUN((d) => ({ episodeDates: [d, addDaysToKey(d, 120), addDaysToKey(d, 127)] })), measure, bites: ['emmyYears'], downstream: ['decided', 'emmyEntries'] },
];
