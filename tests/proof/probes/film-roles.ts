// Who writes and who directs a single film (PlanViews.tsx "Writer", "Director"): you, or someone hired as an episode's
// writer or director, on the default short. A director: the best candidate asked at their rate before the money is
// raised, and once they accept the film is theirs to direct; its direction is judged on their work (finish.ts
// assessQuality), and they are on set for the shoot days (production/shoot.ts).
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { assignEpisodeRole } from '../../../src/engine/projects';
import { makeOffer, roleCandidates } from '../../../src/engine/hiring';
import { fund } from './casting';
import { writingDay } from './writing';
import { roleCraft } from '../../../src/engine/reputation';

const P = (label: string) => `field:PlanViews.tsx#"${label}"#1`;
/** Before the money is raised: the most capable candidate for `role` asked at their rate. */
const hire = (role: 'episode-writer' | 'episode-director') => (s: GameState, p: Project) => {
  fund(s, p);
  const best = [...roleCandidates(s, p, role)].sort((a, b) => b.capability - a.capability)[0];
  if (best) try { makeOffer(s, p, { personId: best.id, roleId: role, dayRate: best.dayRate }); } catch { /* not this one */ }
};
/** Each day: once the hire has accepted, the film given to them as its `which`. */
const assign = (role: 'episode-writer' | 'episode-director', which: 'writer' | 'director') => (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered)) {
    const h = p.hires.find((x) => x.roleId === role && x.status === 'accepted');
    if (h && p.episodes[0][which] !== h.personId) try { assignEpisodeRole(p, 1, which, h.personId); } catch { /* not now */ }
  }
};
/** Each day: a script credited to a hired writer taken back as yours. */
const takeBack = (s: GameState) => { for (const p of s.projects.filter((x) => !x.delivered && x.episodes[0].writer !== 'player')) try { assignEpisodeRole(p, 1, 'writer', 'player'); } catch { /* not now */ } };
const rewrite = writingDay('accept', 'rewrite', 'episode-writer');
const measure = (s: GameState, projects: Project[]) => ({
  writingWorks: roleCraft(s, 'writing').works.length,
  writingCraft: roleCraft(s, 'writing').craft ?? 0,
  directedByHire: projects.filter((p) => p.episodes[0].director !== 'player').length,
  writtenByHire: projects.filter((p) => p.episodes[0].writer !== 'player').length,
});

export const PROBES: Probe[] = [
  { id: 'film-director', features: [P('Director')], decision: 'Hire the most capable director for the short and give it to them, rather than direct it yourself', reads: ['src/engine/projects.ts#assignEpisodeRole', 'src/engine/finish.ts#assessQuality'],
    base: { decide: hire('episode-director') }, variant: { decide: hire('episode-director'), daily: assign('episode-director', 'director') }, measure,
    bites: ['directedByHire'], downstream: ['quality.direction', 'overall', 'standing.directing'] },
  // A hired writer is credited once a draft or rewrite of theirs is accepted (writing-jobs.ts acceptWriting), so the
  // select's decision is the credit: theirs, or taken back as yours. Both arms hire one and accept their rewrite. The
  // script is judged the same either way (4 careers); what follows is your record as a writer, which counts only the
  // work credited to you (reputation.ts roleCraft).
  { id: 'film-writer', features: [P('Writer')], decision: 'Credit the short\'s script to yourself rather than the writer whose rewrite you accepted', reads: ['src/engine/projects.ts#assignEpisodeRole', 'src/engine/reputation.ts#roleCraft', 'src/engine/finish.ts#computeCredits'],
    base: { daily: rewrite }, variant: { daily: (s) => { rewrite(s); takeBack(s); } }, measure,
    bites: ['writtenByHire'], downstream: ['writingWorks', 'writingCraft'] },
];
