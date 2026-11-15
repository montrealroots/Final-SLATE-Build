// Screen time recorded from the cut (screen-time.ts): a performance category that needs a share of the running time
// (the International Emmys' 10% of a submitted episode, the Emmys' guest and limited-series supporting categories) is met
// only by time recorded; unrecorded time leaves it open, and an open share is not eligible (awards.ts ruledRecipients).
// On a two-episode limited series of twenty-minute episodes (the International Emmys' performance categories take none
// shorter), entered each week in every category with such a rule.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { categoriesFor, categoryRules, checkEligibility, institution } from '../../../src/engine/awards';
import { submitEntry } from '../../../src/engine/awards-actions';
import { editScenes } from '../../../src/engine/finish';
import { clearScreenTime, recordScreenTime } from '../../../src/engine/screen-time';
import { SERIES } from './scheduled';
import { castPlayer } from '../../../src/engine/hiring';
import { approvedCharacters } from '../../../src/engine/projects';
import { unfunded } from '../career';
import { buildProject } from '../../helpers';

/** Each category whose rules measure screen time, for the editions open now. */
const screenCategories = (s: GameState, p: Project) => s.editions.filter((e) => e.status === 'open' && e.deadline > s.now)
  .flatMap((ed) => categoriesFor(institution(ed.institutionId), ed.year).filter((c) => categoryRules(ed, c.id, p)?.screenShare).map((cat) => ({ ed, cat })));
/** Weekly: each delivered series entered in every screen-share category it is eligible for. */
const lastLook = new WeakMap<GameState, number>();
const enterScreen = (s: GameState) => {
  if (s.now - (lastLook.get(s) ?? -Infinity) < 7 * 86_400_000) return;
  lastLook.set(s, s.now);
  for (const p of s.projects.filter((x) => x.delivered && !x.shelved)) {
    for (const { ed, cat } of screenCategories(s, p)) {
      if (ed.entries.some((e) => e.projectId === p.id && e.categoryId === cat.id)) continue;
      if (!checkEligibility(s, p, ed, cat).eligible) continue;
      try { submitEntry(s, p, ed.id, cat.id); } catch { /* its fee or form */ }
    }
  }
};
/** Once picture is locked: each performer's time recorded from the cut, on screen for the whole of every scene they're in. */
const recorded = new WeakSet<Project>();
const record = (s: GameState, p: Project) => {
  if (!p.edit.pictureLocked || recorded.has(p)) return;
  for (const sc of editScenes(p)) for (const cid of sc.participants) recordScreenTime(s, p, sc.id, cid, sc.estMinutes);
  recorded.add(p);
};
/** Recorded, then the lead's record for each scene cleared again. */
const recordThenClear = (s: GameState, p: Project) => {
  if (recorded.has(p)) return;
  record(s, p);
  if (recorded.has(p)) for (const sc of editScenes(p)) for (const cid of sc.participants) clearScreenTime(p, sc.id, cid);
};

/** The scheduled proofs' series, its episodes twenty minutes long: two ten-minute scenes each. */
const twenty = (s: GameState, year: number): Project => unfunded(buildProject(s, { title: `Season ${year + 1}`, format: 'limited-series', medium: 'live-action', scenario: 'micro', genres: ['drama'], episodes: 2, runtime: 40 }, [{ name: 'Mara', patch: { roleSize: 'lead' } }],
  [{ place: 'Pier', chars: ['Mara'], minutes: 10, extra: { episode: 1 } }, { place: 'Quay', intExt: 'EXT' as const, chars: ['Mara'], minutes: 10, extra: { episode: 1 } },
    { place: 'Pier', chars: ['Mara'], minutes: 10, extra: { episode: 2 } }, { place: 'Quay', intExt: 'EXT' as const, chars: ['Mara'], minutes: 10, extra: { episode: 2 } }]));
/** Mara played by you: gendered acting categories take only your own performance, under the acting title you chose (awards.ts creditedRecipients). */
const playMara = (s: GameState, p: Project) => { const c = approvedCharacters(p).find((x) => x.name === 'Mara'); if (c && !p.cast.some((x) => x.characterId === c.id)) castPlayer(s, p, c.id, 'on-camera'); };
const RUN = { ...SERIES, years: 3, project: twenty, decide: playMara, daily: enterScreen };
const measure = (s: GameState) => {
  const mine = s.editions.flatMap((ed) => ed.entries.filter((e) => s.projects.some((p) => p.id === e.projectId && categoryRules(ed, e.categoryId, p)?.screenShare)));
  return {
    screenRecords: s.projects.reduce((a, p) => a + (p.edit.screenTime ?? []).length, 0),
    screenEntries: mine.length,
    screenFees: mine.reduce((a, e) => a + e.fee, 0),
    screenDecided: mine.filter((e) => ['nominated', 'not-nominated', 'won', 'lost', 'selected', 'not-selected'].includes(e.status)).length,
  };
};

export const PROBES: Probe[] = [
  {
    id: 'record-screen-time', features: ['action:screen-time.recordScreenTime'], decision: "Record each performer's screen time from the locked cut",
    reads: ['src/engine/screen-time.ts#recordScreenTime', 'src/engine/screen-time.ts#shareCheck', 'src/engine/awards.ts#checkEligibility'],
    base: RUN, variant: { ...RUN, beforeManage: record }, measure,
    bites: ['screenRecords', 'screenEntries'], downstream: ['screenFees', 'screenDecided', 'money'],
  },
  {
    id: 'clear-screen-time', features: ['action:screen-time.clearScreenTime'], decision: 'Clear the screen time recorded from the cut',
    reads: ['src/engine/screen-time.ts#clearScreenTime', 'src/engine/screen-time.ts#shareCheck'],
    base: { ...RUN, beforeManage: record }, variant: { ...RUN, beforeManage: recordThenClear }, measure,
    bites: ['screenRecords', 'screenEntries'], downstream: ['screenFees', 'screenDecided', 'money'],
  },
];
