// Who writes each episode of a series, and which episode a hired writer is asked to work on (PlanViews.tsx "Writer For
// Episode", WritingWork.tsx "Episode For"), on a commissioned two-episode season whose second episode runs three times
// the first's length. Three years, as a season this long is delivered in half the careers in two.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { assignEpisodeRole } from '../../../src/engine/projects';
import { roleCraft } from '../../../src/engine/reputation';
import { buildProject } from '../../helpers';
import { unfunded } from '../career';
import { commission } from './project-fields';
import { SERIES } from './scheduled';
import { acceptWriting, commissionWriting } from '../../../src/engine/writing-jobs';
import { editor, hireEditor, writingDay } from './writing';

/** A season of two episodes: the first six minutes, the second eighteen. */
const season = (s: GameState, year: number): Project => commission(s, unfunded(buildProject(s,
  { title: `Season ${year + 1}`, format: 'limited-series', medium: 'live-action', scenario: 'micro', genres: ['drama'], episodes: 2, runtime: 20 },
  [{ name: 'Mara', patch: { roleSize: 'lead' } }],
  [{ place: 'Pier', chars: ['Mara'], minutes: 3, extra: { episode: 1 } }, { place: 'Quay', intExt: 'EXT' as const, chars: ['Mara'], minutes: 3, extra: { episode: 1 } },
    ...[1, 2, 3].flatMap(() => [{ place: 'Pier', chars: ['Mara'], minutes: 3, extra: { episode: 2 } }, { place: 'Quay', intExt: 'EXT' as const, chars: ['Mara'], minutes: 3, extra: { episode: 2 } }])])));
const SEASON = { ...SERIES, years: 3, project: season };
const measure = (s: GameState, projects: Project[]) => ({
  writingWorks: roleCraft(s, 'writing').works.length,
  writingCraft: roleCraft(s, 'writing').craft ?? 0,
  episodesByHire: projects.reduce((a, p) => a + p.episodes.filter((e) => e.writer !== 'player').length, 0),
  writingDays: projects.reduce((a, p) => a + (p.writing ?? []).reduce((b, j) => b + j.passes.reduce((c, x) => c + x.days, 0), 0), 0),
  // What the hired writer was paid (budget.ts settle) and the minutes of the season credited to them.
  writerPaid: projects.reduce((a, p) => a + p.hires.filter((h) => h.roleId === 'episode-writer').reduce((b, h) => b + (p.obligations.find((o) => o.id === h.obligationId)?.settled ?? 0), 0), 0),
  minutesByHire: projects.reduce((a, p) => a + p.episodes.filter((e) => e.writer !== 'player').reduce((b, e) => b + p.scenes.filter((x) => (x.episode ?? 1) === e.number).reduce((c, x) => c + x.estMinutes, 0), 0), 0),
});
const draft = (episode: number) => writingDay('accept', 'draft', 'episode-writer', 'Dialogue', episode);
/** Each day: the hired writer asked for a draft of each episode in turn, each accepted when delivered. */
const draftEach = (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered && x.writing && x.approvedDraft !== null)) {
    hireEditor(s, p, 'episode-writer');
    const h = editor(p, 'episode-writer');
    if (!h) continue;
    const mine = p.writing!.filter((j) => j.hireId === h.id);
    for (const j of mine.filter((x) => x.status === 'delivered')) acceptWriting(s, p, j.id);
    const next = p.episodes.find((e) => !mine.some((j) => j.episode === e.number && j.status !== 'cancelled'));
    if (next && !mine.some((j) => j.status === 'working')) try { commissionWriting(s, p, h.id, { scope: 'draft', episode: next.number }); } catch { /* not yet */ }
  }
};
/** Each day: the first episode, once credited to the hired writer, taken back as yours. */
const takeFirst = (s: GameState) => { for (const p of s.projects.filter((x) => !x.delivered && x.episodes[0].writer !== 'player')) try { assignEpisodeRole(p, 1, 'writer', 'player'); } catch { /* not now */ } };

export const PROBES: Probe[] = [
  // A hired writer's accepted draft credits them with the episode (writing-jobs.ts acceptWriting). Both arms have them
  // draft both episodes; taking the first back makes the season yours in part, and so counts in your record as a writer
  // (reputation.ts roleCraft counts a work with any episode yours).
  { id: 'episode-writer', features: ['field:PlanViews.tsx#{`Writer For Episode ${e.number}`}#1'], decision: 'Credit the first episode\'s script to yourself rather than the writer whose draft of it you accepted', reads: ['src/engine/projects.ts#assignEpisodeRole', 'src/engine/reputation.ts#roleCraft', 'src/engine/finish.ts#assessEpisodes'],
    base: { ...SEASON, daily: (s) => { SERIES.daily(s); draftEach(s); } }, variant: { ...SEASON, daily: (s) => { SERIES.daily(s); draftEach(s); takeFirst(s); } }, measure,
    bites: ['episodesByHire'], downstream: ['writingWorks', 'writingCraft'] },
  // A pass's days are the episode's minutes at the scope's pace (writing-jobs.ts passDays), paid by the day, and the
  // episode is credited to them once accepted. The season's script, or what it cost all told, moved inside the noise
  // (40 careers, November 15, 2026).
  { id: 'writer-episode', features: ['field:WritingWork.tsx#{`Episode For ${name}`}#1'], decision: 'Ask the hired writer for a draft of the long second episode rather than the short first', reads: ['src/engine/writing-jobs.ts#writingTerms', 'src/engine/writing-jobs.ts#acceptedRead'],
    base: { ...SEASON, daily: (s) => { SERIES.daily(s); draft(1)(s); } }, variant: { ...SEASON, daily: (s) => { SERIES.daily(s); draft(2)(s); } }, measure,
    bites: ['writingDays'], downstream: ['writerPaid', 'minutesByHire'] },
];
