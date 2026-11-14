// Casting calls (casting-calls.ts, auditions.ts): inviting performers to read, a shortlist and its callbacks. A read
// shows a performer's capability as a range; a callback narrows it. Each probe casts from what it has seen, and the
// later measure is the performances the film is assessed on (finish.ts assessQuality).
import type { Probe } from '../probe';
import { callBack, inviteToAudition, setShortlisted } from '../../../src/engine/casting-calls';
import { approvedCharacters, approvedScenes, isAvailable, makeOffer, productionWindow, roleCandidates } from '../../engine-api';
import { personAge, personById } from '../../../src/engine/people';
import { DAY, processUntil } from '../../engine-api';
import { dateKey } from '../../../src/engine/time';
import { financeSummary } from '../../../src/engine/finance';
import { putInOwnMoney } from '../../../src/engine/personal';
import { considerFor, considerPerson, type RecordedPerson } from '../../../src/engine/guests';
import type { Audition, GameState, Project } from '../../../src/engine/types';

const READERS = 4;
/** The money raised first, from your own account as the career raises it, so offers can be made before the career's casting. */
const fund = (s: GameState, p: Project) => { const need = financeSummary(p).stillToRaise; if (need > 0) putInOwnMoney(s, p, need); };
/** The speaking parts, and for each the cheapest few adults free for the production, as the career's casting chooses. */
const parts = (s: GameState, p: Project) => {
  const win = productionWindow(s, p);
  const today = dateKey(s.now, 'UTC');
  const pool = roleCandidates(s, p, 'actor').filter((x) => isAvailable(s, x, win.from, win.to, p.id).ok && x.experience >= 3 && personAge(x, today) >= 18).sort((a, b) => a.dayRate - b.dayRate);
  return approvedCharacters(p).filter((c) => c.roleSize !== 'background' && approvedScenes(p).some((sc) => sc.participants.includes(c.id))).map((c) => ({ c, pool }));
};
const mid = (a: Audition) => (a.read ? (a.read[0] + a.read[1]) / 2 : -1);
/** Invite the cheapest READERS to read for each part (each person reads for one part), and wait for the sessions. */
const audition = (s: GameState, p: Project) => {
  const asked = new Set<string>();
  for (const { c, pool } of parts(s, p)) {
    for (const x of pool.filter((y) => !asked.has(y.id)).slice(0, READERS)) { try { inviteToAudition(s, p, c.id, 'on-camera', x.id); asked.add(x.id); } catch { /* can't come: the next */ } }
  }
  processUntil(s, s.now + 7 * DAY, 'tick', 1_000_000);
};
/** Offer each part to the best read seen for it, at their asking rate. Parts nobody read for are cast as the career does. */
const castBest = (s: GameState, p: Project) => {
  for (const { c } of parts(s, p)) {
    const seen = (p.auditions ?? []).filter((a) => a.characterId === c.id && a.status === 'seen').sort((a, b) => mid(b) - mid(a));
    for (const a of seen) { try { makeOffer(s, p, { personId: a.personId, roleId: 'actor', dayRate: personById(s, a.personId, 'actor').dayRate, characterId: c.id, method: 'on-camera' }); break; } catch { /* clash or funds: the next */ } }
  }
};
/** Shortlist the two best reads for each part and call both back, then cast from the narrowed reads. */
const callbacks = (s: GameState, p: Project) => {
  for (const { c } of parts(s, p)) {
    for (const a of (p.auditions ?? []).filter((x) => x.characterId === c.id && x.status === 'seen').sort((x, y) => mid(y) - mid(x)).slice(0, 2)) {
      setShortlisted(p, a.id, true);
      try { callBack(s, p, a.id); } catch { /* can't come back: their first read stands */ }
    }
  }
  processUntil(s, s.now + 7 * DAY, 'tick', 1_000_000);
};

/** A made-up performer from the film catalog with forty-five recorded parts (a labelled fixture: nobody real). */
const VETERAN: RecordedPerson = { id: 890001, name: 'Odile Varga (Fixture)', details: { birthday: '1975-05-05', deathday: null, retrievedAt: '2026-01-02T12:00:00.000Z' },
  credits: Array.from({ length: 45 }, (_, i) => ({ kind: 'cast', role: `Part ${i + 1}`, date: `${1995 + Math.floor(i / 2)}-03-01` })) };
/** Consider the veteran for the lead and offer them the part at their asking rate, before the career's casting. */
const castVeteran = (s: GameState, p: Project) => {
  const lead = approvedCharacters(p).find((c) => c.roleSize === 'lead');
  if (!lead) return;
  const who = considerPerson(s, VETERAN, '2026-01-02');
  try {
    considerFor(s, p, { personId: who.id, roleId: 'actor', characterId: lead.id, method: 'on-camera' }, dateKey(s.now, 'UTC'));
    makeOffer(s, p, { personId: who.id, roleId: 'actor', dayRate: personById(s, who.id, 'actor').dayRate, characterId: lead.id, method: 'on-camera' });
  } catch { /* busy, or the offer can't be made: cast as the career does */ }
};

const measure = (s: GameState, projects: Project[]) => ({
  realCast: projects.reduce((a, p) => a + p.cast.filter((x) => x.performer.startsWith('tp_')).length, 0),
  readsSeen: projects.reduce((a, p) => a + (p.auditions ?? []).filter((x) => x.status === 'seen').length, 0),
  callbacksSeen: projects.reduce((a, p) => a + (p.auditions ?? []).filter((x) => x.callback?.status === 'seen').length, 0),
  // How good the people cast are: the truth the reads show a range of, never shown to the player.
  castCapability: (() => { const c = projects.flatMap((p) => p.cast.filter((x) => x.performer !== 'player').map((x) => personById(s, x.performer).capability)); return c.length ? c.reduce((a, b) => a + b, 0) / c.length : 0; })(),
  performance: (() => { const v = projects.flatMap((p) => Object.entries(p.quality ?? {}).filter(([k]) => k.startsWith('performance:')).map(([, x]) => Number(x))); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; })(),
});

export const PROBES: Probe[] = [
  {
    id: 'audition',
    features: ['action:casting-calls.inviteToAudition', 'scheduled:audition'],
    decision: 'Invite the four cheapest performers to read for each part and cast the best read, rather than the cheapest unseen',
    reads: ['src/engine/casting-calls.ts#inviteToAudition', 'src/engine/auditions.ts#handler:audition', 'src/engine/finish.ts#assessQuality'],
    base: { decide: fund },
    variant: { decide: (s, p) => { fund(s, p); audition(s, p); castBest(s, p); } },
    measure,
    bites: ['readsSeen', 'castCapability'],
    downstream: ['performance', 'overall', 'castRates'],
  },
  {
    id: 'callback',
    features: ['action:casting-calls.setShortlisted', 'action:casting-calls.callBack'],
    decision: 'Shortlist the two best reads for each part and call them back before casting, rather than casting from the first read',
    reads: ['src/engine/casting-calls.ts#callBack', 'src/engine/casting-calls.ts#setShortlisted', 'src/engine/auditions.ts#readRange'],
    base: { decide: (s, p) => { fund(s, p); audition(s, p); castBest(s, p); } },
    variant: { decide: (s, p) => { fund(s, p); audition(s, p); callbacks(s, p); castBest(s, p); } },
    measure,
    bites: ['callbacksSeen'],
    downstream: ['castCapability', 'performance', 'overall'],
  },
  {
    id: 'consider-real',
    features: ['action:guests.considerFor', 'action:guests.considerPerson'],
    decision: 'Consider a performer from the film catalog with forty-five parts behind them for the lead, and offer it to them',
    reads: ['src/engine/guests.ts#considerFor', 'src/engine/guests.ts#considerPerson', 'src/engine/hiring.ts#candidatesFor'],
    base: { decide: fund },
    variant: { decide: (s, p) => { fund(s, p); castVeteran(s, p); } },
    measure,
    bites: ['realCast'],
    downstream: ['castCapability', 'performance', 'castRates'],
  },
];
