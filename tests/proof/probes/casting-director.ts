// A casting director's search (casting-director.ts): they bring the most experienced performers who can be asked, the
// people the player is considering first (hiring.ts candidatesFor), and advise who read best; the player shortlists,
// calls back and casts. And a performer from the film catalog with no recorded birth date, who can't be approached
// until the player says to treat them as an adult in this story (guests.ts canApproach).
import { readFileSync } from 'node:fs';
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { approvedCharacters, approvedScenes, makeOffer, roleCandidates } from '../../engine-api';
import { estimateDays } from '../../../src/engine/hiring';
import { financeSummary, setFinanceTarget } from '../../../src/engine/finance';
import { putInOwnMoney } from '../../../src/engine/personal';
import { DAY, processUntil } from '../../engine-api';
import { personById } from '../../../src/engine/people';
import { dateKey } from '../../../src/engine/time';
import { callBack } from '../../../src/engine/casting-calls';
import { shortlistAdvice, startSearch } from '../../../src/engine/casting-director';
import { considerFor, considerPerson, realId, stopConsidering, treatAsAdult, type RecordedPerson } from '../../../src/engine/guests';
import { applyRecognition, recognisedIn } from '../../../src/engine/recognition';
import { considerRecognised } from '../../../src/engine/recognition-hire';
import { castBest, fund } from './casting';

// The record the hiring lists fetch in the game, read from the file here (as people.ts).
applyRecognition(JSON.parse(readFileSync('src/data/recognition.json', 'utf8')));
/** A labelled fixture, nobody real: a performer with thirty recorded parts and no recorded birth date. */
const UNDATED: RecordedPerson = { id: 890012, name: 'Teodor Laine (Fixture)', details: { birthday: null, deathday: null, retrievedAt: '2026-01-02T12:00:00.000Z' },
  credits: Array.from({ length: 30 }, (_, i) => ({ kind: 'cast', role: `Part ${i + 1}`, date: `${2000 + Math.floor(i / 2)}-03-01` })) };

const speaking = (p: Project) => approvedCharacters(p).filter((c) => c.roleSize !== 'background' && approvedScenes(p).some((sc) => sc.participants.includes(c.id)));
const lead = (p: Project) => speaking(p).find((c) => c.roleSize === 'lead') ?? speaking(p)[0];

/** Funded, then the most experienced casting director offered their rate, and a few days for their answer. */
const hireCD = (s: GameState, p: Project) => {
  fund(s, p);
  const best = [...roleCandidates(s, p, 'casting-director')].sort((a, b) => b.experience - a.experience || a.dayRate - b.dayRate)[0];
  if (best) try { makeOffer(s, p, { personId: best.id, roleId: 'casting-director', dayRate: best.dayRate }); } catch { /* not this one */ }
  processUntil(s, s.now + 5 * DAY, 'tick', 1_000_000);
};
/** A search for each speaking part, and a week for the readings. */
const search = (s: GameState, p: Project) => {
  for (const c of speaking(p)) try { startSearch(s, p, c.id, 'on-camera'); } catch { /* no casting director, or nobody to bring */ }
  processUntil(s, s.now + 7 * DAY, 'tick', 1_000_000);
};
/** Their advice taken (onto the shortlist), the shortlist called back, and a week for the callbacks. */
const takeAdvice = (s: GameState, p: Project) => {
  for (const cs of p.castingSearches ?? []) try { shortlistAdvice(p, cs.id); } catch { /* no advice yet */ }
  for (const a of (p.auditions ?? []).filter((x) => x.shortlisted && x.status === 'seen')) try { callBack(s, p, a.id); } catch { /* can't come back */ }
  processUntil(s, s.now + 7 * DAY, 'tick', 1_000_000);
};
/**
 * The most recognised performer who can be approached, considered for the lead, so the search can bring them. Until
 * November 15, 2026 this was a made-up veteran with forty-five parts and no awards: graded 55 (recognition.ts), against
 * the 88 the career's cast averaged, they read every time and were never the best read, so dropping them changed nothing.
 */
const considered = new WeakMap<Project, string>();
const considerStar = (s: GameState, p: Project) => {
  const c = lead(p);
  if (!c) return;
  const today = dateKey(s.now, 'UTC');
  for (const { tmdbId } of recognisedIn('actor', Number(today.slice(0, 4)))) {
    try { considerRecognised(s, p, tmdbId, { roleId: 'actor', characterId: c.id, method: 'on-camera' }, today); considered.set(p, realId(tmdbId)); return; } catch { /* no recorded age, died, or busy: the next */ }
  }
};
const dropStar = (_s: GameState, p: Project) => { const c = lead(p); const id = considered.get(p); if (c && id) stopConsidering(p, { personId: id, roleId: 'actor', characterId: c.id }); };
/** If the star read for the lead, the money for their days raised from your own account and the part offered to them, before the rest are cast. */
const castStar = (s: GameState, p: Project) => {
  const c = lead(p); const id = considered.get(p);
  if (!c || !id || !(p.auditions ?? []).some((a) => a.personId === id && a.characterId === c.id && a.status === 'seen')) return;
  const rate = personById(s, id, 'actor').dayRate;
  const need = rate * estimateDays(p, 'actor', c.id, 'on-camera', s);
  try {
    setFinanceTarget(p, financeSummary(p).target + need); putInOwnMoney(s, p, need);
    makeOffer(s, p, { personId: id, roleId: 'actor', dayRate: rate, characterId: c.id, method: 'on-camera' });
  } catch { /* not that much money, or they're busy: the best read is cast */ }
};
/** The undated performer considered for the lead and offered it at their rate, before the career's casting; `adult` first marks them as an adult in this story. */
const offerUndated = (adult: boolean) => (s: GameState, p: Project) => {
  fund(s, p);
  const c = lead(p);
  if (!c) return;
  const who = considerPerson(s, UNDATED, '2026-01-02');
  if (adult) treatAsAdult(s, who.id, true);
  try {
    considerFor(s, p, { personId: who.id, roleId: 'actor', characterId: c.id, method: 'on-camera' }, dateKey(s.now, 'UTC'));
    makeOffer(s, p, { personId: who.id, roleId: 'actor', dayRate: personById(s, who.id, 'actor').dayRate, characterId: c.id, method: 'on-camera' });
  } catch { /* no recorded age: refused, and the career casts the part */ }
};

const measure = (s: GameState, projects: Project[]) => ({
  searches: projects.reduce((a, p) => a + (p.castingSearches ?? []).length, 0),
  readsSeen: projects.reduce((a, p) => a + (p.auditions ?? []).filter((x) => x.status === 'seen').length, 0),
  callbacksSeen: projects.reduce((a, p) => a + (p.auditions ?? []).filter((x) => x.callback?.status === 'seen').length, 0),
  realReads: projects.reduce((a, p) => a + (p.auditions ?? []).filter((x) => x.personId.startsWith('tp_')).length, 0),
  realCast: projects.reduce((a, p) => a + p.cast.filter((x) => x.performer.startsWith('tp_')).length, 0),
  castCapability: (() => { const c = projects.flatMap((p) => p.cast.filter((x) => x.performer !== 'player').map((x) => personById(s, x.performer).capability)); return c.length ? c.reduce((a, b) => a + b, 0) / c.length : 0; })(),
  performance: (() => { const v = projects.flatMap((p) => Object.entries(p.quality ?? {}).filter(([k]) => k.startsWith('performance:')).map(([, x]) => Number(x))); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; })(),
});

export const PROBES: Probe[] = [
  {
    id: 'casting-search', features: ['action:casting-director.startSearch'], decision: "Have the casting director run a search for each part and cast the best read, rather than the cheapest unseen",
    reads: ['src/engine/casting-director.ts#startSearch', 'src/engine/hiring.ts#candidatesFor', 'src/engine/finish.ts#assessQuality'],
    base: { decide: hireCD }, variant: { decide: (s, p) => { hireCD(s, p); search(s, p); castBest(s, p); } }, measure,
    bites: ['searches', 'readsSeen'], downstream: ['castCapability', 'performance', 'castRates', 'spent'],
  },
  {
    id: 'shortlist-advice', features: ['action:casting-director.shortlistAdvice'], decision: "Take the casting director's advice onto the shortlist and call those back before casting",
    reads: ['src/engine/casting-director.ts#shortlistAdvice', 'src/engine/casting-calls.ts#callBack', 'src/engine/auditions.ts#readRange'],
    base: { decide: (s, p) => { hireCD(s, p); search(s, p); castBest(s, p); } },
    variant: { decide: (s, p) => { hireCD(s, p); search(s, p); takeAdvice(s, p); castBest(s, p); } }, measure,
    bites: ['callbacksSeen'], downstream: ['castCapability', 'performance', 'overall'],
  },
  {
    id: 'stop-considering', features: ['action:guests.stopConsidering'], decision: 'Take the most recognised performer off the list for the lead before the casting director searches',
    reads: ['src/engine/guests.ts#stopConsidering', 'src/engine/hiring.ts#candidatesFor', 'src/engine/casting-director.ts#startSearch'],
    base: { decide: (s, p) => { hireCD(s, p); considerStar(s, p); search(s, p); castStar(s, p); castBest(s, p); } },
    variant: { decide: (s, p) => { hireCD(s, p); considerStar(s, p); dropStar(s, p); search(s, p); castStar(s, p); castBest(s, p); } }, measure,
    bites: ['realReads'], downstream: ['realCast', 'castRates', 'spent', 'performance'],
  },
  {
    id: 'treat-as-adult', features: ['action:guests.treatAsAdult'], decision: 'Treat a catalog performer with no recorded birth date as an adult, and offer them the lead',
    reads: ['src/engine/guests.ts#treatAsAdult', 'src/engine/guests.ts#canApproach'],
    base: { decide: offerUndated(false) }, variant: { decide: offerUndated(true) }, measure,
    bites: ['realCast'], downstream: ['castCapability', 'performance', 'castRates'],
  },
];
