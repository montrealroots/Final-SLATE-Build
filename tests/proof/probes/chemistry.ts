// A chemistry read (PlanViews.tsx "Read ... With"): the friend's two best reads called back with the lead's best read
// as their partner, so how each plays with the lead is seen (auditions.ts pairChemistry), and the friend cast from it.
// Chemistry moves each one's performance in the scenes they share whether or not it is read (finish.ts); reading it
// lets the casting follow it. Both arms audition, call the same two back and cast the lead the same way. Cast on
// chemistry over the read, the pair played better together and the film's performances worse: at half weight, chemistry
// was worth less than the better read it gave up (40 careers, November 15, 2026). The read is the player's to weigh.
import type { Probe } from '../probe';
import type { Audition, GameState, Project } from '../../../src/engine/types';
import { callBack, setShortlisted } from '../../../src/engine/casting-calls';
import { pairChemistry } from '../../../src/engine/auditions';
import { makeOffer, processUntil, DAY } from '../../engine-api';
import { personById } from '../../../src/engine/people';
import { audition, fund } from './casting';

const mid = (a: Audition) => (a.callback?.status === 'seen' && a.read ? (a.read[0] + a.read[1]) / 2 : a.read ? (a.read[0] + a.read[1]) / 2 : -1);
const seenFor = (p: Project, name: string) => {
  const c = p.characters.find((x) => x.name === name);
  return (p.auditions ?? []).filter((a) => a.characterId === c?.id && a.status === 'seen').sort((a, b) => mid(b) - mid(a));
};
const offer = (s: GameState, p: Project, a: Audition) => { try { makeOffer(s, p, { personId: a.personId, roleId: 'actor', dayRate: personById(s, a.personId, 'actor').dayRate, characterId: a.characterId, method: 'on-camera' }); return true; } catch { return false; } };
/** Audition both parts, cast the lead from the best read, call the friend's two best back (with the lead to read with, or alone) and cast the friend. */
const castWith = (read: boolean) => (s: GameState, p: Project) => {
  fund(s, p);
  audition(s, p);
  const lead = seenFor(p, 'Lead').find((a) => offer(s, p, a));
  const two = seenFor(p, 'Friend').slice(0, 2);
  for (const a of two) { setShortlisted(p, a.id, true); try { callBack(s, p, a.id, read && lead ? lead.personId : undefined); } catch { /* can't come back */ } }
  processUntil(s, s.now + 7 * DAY, 'tick', 1_000_000);
  // With the chemistry read, the one who plays best with the lead (the narrowed read breaks a tie); without, the best read.
  const score = (a: Audition) => (read ? (a.callback?.chemistry ?? -99) * 100 : 0) + mid(a);
  for (const a of [...two].sort((x, y) => score(y) - score(x))) if (offer(s, p, a)) break;
};
const measure = (s: GameState, projects: Project[]) => ({
  chemistryRead: projects.reduce((a, p) => a + (p.auditions ?? []).filter((x) => x.callback?.chemistry !== undefined).length, 0),
  castChemistry: projects.reduce((a, p) => {
    const who = (n: string) => p.cast.find((x) => x.characterId === p.characters.find((c) => c.name === n)?.id)?.performer;
    const l = who('Lead'), f = who('Friend');
    return a + (l && f ? pairChemistry(s, l, f) : 0);
  }, 0),
  performance: (() => { const v = projects.flatMap((p) => Object.entries(p.quality ?? {}).filter(([k]) => k.startsWith('performance:')).map(([, x]) => Number(x))); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; })(),
});

export const PROBES: Probe[] = [
  { id: 'chemistry-read', features: ['field:PlanViews.tsx#{`Read ${who.name} With`}#1'], decision: 'Call the friend\'s two best reads back to read with the lead, and cast the one who plays best with them', reads: ['src/engine/casting-calls.ts#callBack', 'src/engine/auditions.ts#pairChemistry', 'src/engine/finish.ts#assessQuality'],
    base: { decide: castWith(false) }, variant: { decide: castWith(true) }, measure, bites: ['chemistryRead', 'castChemistry'], downstream: ['performance', 'overall'] },
];
