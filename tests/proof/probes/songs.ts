// Songs over the end credits (song-actions.ts playFirstOverEndCredits): an award for an original song takes a song in
// the body of the film or the first new song once the end credits begin (awards-rules.ts songRuleProblem). Two songs
// written for a feature play over its end credits (song awards take no shorts); the variant plays the second first.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { attachSong, createSong, playFirstOverEndCredits } from '../../../src/engine/song-actions';
import { approvedScenes } from '../../../src/engine/projects';
import { categoriesFor, checkEligibility, institution } from '../../../src/engine/awards';
import { submitEntry } from '../../../src/engine/awards-actions';
import { feature } from './script';

const SECOND = 'The Last Bell';
/** After the script is approved: two songs written for the film, both over the end credits; "The Last Bell" second. */
const twoOverCredits = (s: GameState, p: Project) => {
  if (!p.music) return;
  const last = approvedScenes(p).at(-1)!.id;
  for (const title of ['First Light', SECOND]) { const song = createSong(s, p, { title, source: 'write' }); attachSong(p, song.id, last, 'end-credits'); }
};
const second = (p: Project) => (p.songs ?? []).find((x) => x.title === SECOND)!;
const playSecondFirst = (s: GameState, p: Project) => { twoOverCredits(s, p); if (p.music) playFirstOverEndCredits(p, second(p).id, approvedScenes(p).at(-1)!.id); };
/** Weekly: each delivered film entered for every original-song award it is eligible for. */
const enterSongs = (s: GameState) => {
  for (const p of s.projects.filter((x) => x.delivered && !x.shelved)) {
    for (const ed of s.editions.filter((e) => e.status === 'open' && e.deadline > s.now)) {
      for (const cat of categoriesFor(institution(ed.institutionId), ed.year).filter((c) => c.recipient === 'song')) {
        if (ed.entries.some((e) => e.projectId === p.id && e.categoryId === cat.id)) continue;
        const song = (p.songs ?? []).find((x) => x.title === SECOND);
        if (!song || !checkEligibility(s, p, ed, cat, undefined, undefined, undefined, song.id).eligible) continue;
        try { submitEntry(s, p, ed.id, cat.id, undefined, undefined, undefined, song.id); } catch { /* its fee or form */ }
      }
    }
  }
};
/** A feature released in American cinemas (the Academy and the Golden Globes take only a US release in the year). */
const US = { years: 3, project: feature(), releaseRoute: 'theatrical' as const, territories: ['US', 'GB'], daily: enterSongs };
const measure = (s: GameState) => {
  const mine = s.editions.flatMap((ed) => ed.entries.filter((e) => s.projects.some((p) => p.id === e.projectId) && categoriesFor(institution(ed.institutionId), ed.year).find((c) => c.id === e.categoryId)?.recipient === 'song'));
  return { songEntries: mine.length, songFees: mine.reduce((a, e) => a + e.fee, 0), songDecided: mine.filter((e) => ['nominated', 'not-nominated', 'won', 'lost', 'selected', 'not-selected'].includes(e.status)).length };
};

export const PROBES: Probe[] = [
  {
    id: 'song-first-over-credits', features: ['action:song-actions.playFirstOverEndCredits'], decision: 'Play "The Last Bell" first over the end credits, not second',
    reads: ['src/engine/song-actions.ts#playFirstOverEndCredits', 'src/engine/awards-rules.ts#songRuleProblem'],
    base: { ...US, decide: twoOverCredits }, variant: { ...US, decide: playSecondFirst }, measure,
    bites: ['songEntries'], downstream: ['songFees', 'songDecided', 'money'],
  },
];
