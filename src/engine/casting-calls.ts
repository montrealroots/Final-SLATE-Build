// Inviting performers to read, calling them back and shortlisting (auditions.ts says how auditions work and why). Loaded
// with the Cast page, not at startup.
import { AUDITION_NOTICE_DAYS, at10, sessionDay } from './auditions';
import { castRoleFor, roleCandidates } from './hiring';
import { isAvailable, personById } from './people';
import { approvedCharacters, approvedScenes, assertEditable } from './projects';
import { newId, schedule } from './state';
import type { Audition, GameState, PerformanceMethod, Project } from './types';

export { AUDITION_NOTICE_DAYS };

export function auditionsFor(p: Project, characterId: string, method: PerformanceMethod): Audition[] {
  return (p.auditions ?? []).filter((a) => a.characterId === characterId && a.method === method);
}

/** Why this person can't be invited to read for this part now, or null. */
export function inviteRefusal(state: GameState, p: Project, characterId: string, method: PerformanceMethod, personId: string): string | null {
  if (p.delivered) return 'This project has been delivered.';
  if (p.shelved) return 'This project is shelved. Take it up again to make changes.';
  const c = approvedCharacters(p).find((x) => x.id === characterId);
  if (!c || !approvedScenes(p).some((s) => s.participants.includes(characterId))) return 'That part is not in the approved script.';
  if (c.roleSize === 'background') return 'Background parts are covered by the crowd budget, without auditions.';
  if (p.cast.some((x) => x.characterId === characterId && x.method === method)) return `${c.name} is cast already.`;
  if (!roleCandidates(state, p, castRoleFor(method)).some((x) => x.id === personId)) return 'They are not a performer for this kind of part.';
  if (auditionsFor(p, characterId, method).some((a) => a.personId === personId && a.status !== 'missed')) return 'They have been asked to read for this part already.';
  return null;
}

/** Invite someone to read for a part. They come on the next session day, decline because they're booked, or don't come. */
export function inviteToAudition(state: GameState, p: Project, characterId: string, method: PerformanceMethod, personId: string): Audition {
  assertEditable(p);
  const why = inviteRefusal(state, p, characterId, method, personId);
  if (why) throw new Error(why);
  const day = sessionDay(state, p);
  const who = personById(state, personId);
  const a: Audition = { id: newId(state, 'au'), characterId, method, personId, date: day, status: 'invited' };
  const av = isAvailable(state, who, day, day, p.id);
  if (!av.ok) {
    a.status = 'declined';
    a.reason = `${av.reason} They can't come to read on ${day}.`;
  } else schedule(state, at10(p, day), 'audition', { projectId: p.id, auditionId: a.id }, { attention: 'notify', priority: 50 });
  (p.auditions ??= []).push(a);
  return a;
}

/** Who a callback could read with: performers already cast, or seen, for another part sharing a scene with this one. */
export function chemistryPartners(state: GameState, p: Project, a: Audition): { personId: string; label: string }[] {
  const scenes = approvedScenes(p).filter((s) => s.participants.includes(a.characterId));
  const shares = (cid: string) => cid !== a.characterId && scenes.some((s) => s.participants.includes(cid));
  const name = (cid: string) => p.characters.find((c) => c.id === cid)?.name ?? 'another part';
  const out = new Map<string, string>();
  for (const c of p.cast) if (shares(c.characterId) && c.performer !== a.personId) out.set(c.performer, `${c.performer === 'player' ? 'You' : personById(state, c.performer).name} (cast as ${name(c.characterId)})`);
  for (const x of p.auditions ?? []) if (shares(x.characterId) && x.status === 'seen' && x.personId !== a.personId && !out.has(x.personId)) out.set(x.personId, `${personById(state, x.personId).name} (read for ${name(x.characterId)})`);
  return [...out].map(([personId, label]) => ({ personId, label }));
}

/**
 * Ask someone on the shortlist back, optionally to read with a partner. Once per audition. Callbacks come from the
 * shortlist, as in casting; until November 9, 2026 the shortlist only ordered the table and anyone seen could be called back.
 */
export function callBack(state: GameState, p: Project, auditionId: string, partnerId?: string): Audition {
  assertEditable(p);
  const a = p.auditions?.find((x) => x.id === auditionId);
  if (!a || a.status !== 'seen') throw new Error('Only someone who has read can be called back.');
  if (a.callback) throw new Error('They have been called back already.');
  if (!a.shortlisted) throw new Error('Shortlist them first: callbacks are for the shortlist.');
  if (p.cast.some((x) => x.characterId === a.characterId && x.method === a.method)) throw new Error('That part is cast already.');
  if (partnerId && !chemistryPartners(state, p, a).some((x) => x.personId === partnerId)) throw new Error('They can only read with someone cast or seen for a part in the same scenes.');
  const day = sessionDay(state, p);
  const who = personById(state, a.personId);
  const av = isAvailable(state, who, day, day, p.id);
  if (!av.ok) throw new Error(`${av.reason} They can't come back on ${day}.`);
  a.callback = { date: day, status: 'scheduled', ...(partnerId ? { partnerId } : {}) };
  schedule(state, at10(p, day), 'audition', { projectId: p.id, auditionId: a.id }, { attention: 'notify', priority: 50 });
  return a;
}

export function setShortlisted(p: Project, auditionId: string, on: boolean): void {
  assertEditable(p);
  const a = p.auditions?.find((x) => x.id === auditionId);
  if (!a || a.status !== 'seen') throw new Error('Only someone who has read can be shortlisted.');
  if (on) a.shortlisted = true;
  else delete a.shortlisted;
}

