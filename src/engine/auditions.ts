// Auditions, callbacks and chemistry reads (SLATE-09-02, November 8, 2026). Until now a part was cast straight from the
// candidate list, by experience and rate: a performer's capability, which decides most of their performance (finish.ts
// computeQuality), stayed hidden until the film was assessed. Now:
// - You invite someone to read for a part. The audition is on a working day AUDITION_NOTICE_DAYS ahead, at the base, and
//   is on the calendar. Someone booked that day declines, saying so; someone can also miss it, decided from the world
//   seed. Either way the others stand, and someone who missed can be asked again.
// - A read shows their capability for this part as a range in words (Uneven to Solid): the truth is inside it, never
//   shown as a number. A callback narrows it. Shortlisting orders the comparison and decides who can be called back (from
//   November 9, 2026); nothing is collapsed into one score:
//   the read, the asking rate, the language and age fit and the dates sit side by side, and you choose.
// - A chemistry read at a callback pairs them with someone already cast, or seen for a part that shares scenes, and shows
//   how the two play together. Chemistry is a modeled property of the pair whether or not it is read (pairChemistry),
//   and it moves each one's performance in the scenes they share (finish.ts). Reading it only reveals it.
// - Background parts aren't auditioned; they're covered by the crowd budget, as before.
// Spreads, notice and the chance of a missed audition are game calibration. What runs at startup is here (the handler,
// the calendar, the chemistry model finish.ts reads); inviting, calling back and shortlisting are in casting-calls.ts,
// loaded with the Cast page (the startup JavaScript budget).
import { getPlace } from '../data/places';
import { personById } from './people';
import { nextWorkingDay } from './production/schedule';
import { stream } from './rng';
import { addLog, registerCommitmentSource, registerHandler } from './state';
import { addDaysToKey, dateKey, localToInstant, parseYmd } from './time';
import type { GameState, Project } from './types';

export const AUDITION_NOTICE_DAYS = 3;
export const FIRST_SPREAD = 22;
export const CALLBACK_SPREAD = 8;
const MISS_CHANCE = 0.08;

export const at10 = (p: Project, key: string) => {
  const { year, month, day } = parseYmd(key);
  return localToInstant(getPlace(p.axes.basePlaceId).zone, year, month, day, 10).instant;
};
export const sessionDay = (state: GameState, p: Project) => nextWorkingDay(p, addDaysToKey(dateKey(state.now, getPlace(p.axes.basePlaceId).zone), AUDITION_NOTICE_DAYS));

/** A range of width `spread` that contains the true value, placed by the seed: the read, never the number itself. */
export function readRange(truth: number, spread: number, roll: number): [number, number] {
  const low = Math.max(0, Math.min(100 - spread, Math.round(truth - roll * spread)));
  return [low, low + spread];
}

/** How two performers play together, -8 to +8: modeled from the world seed, the same for the pair in any order. */
export function pairChemistry(state: GameState, a: string, b: string): number {
  const [x, y] = [a, b].sort();
  return Math.round((stream(state.seed, 'chemistry', x, y)() - 0.5) * 16);
}

export function chemistryWords(n: number): string {
  if (n >= 4) return 'They play off each other well';
  if (n <= -4) return 'They are awkward together';
  return 'Nothing in particular between them';
}

registerHandler('audition', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const a = p?.auditions?.find((x) => x.id === ev.payload.auditionId);
  if (!p || !a) return { suppressInterrupt: true };
  const who = personById(state, a.personId);
  const part = p.characters.find((c) => c.id === a.characterId)?.name ?? 'the part';
  const callback = !!a.callback && a.callback.status === 'scheduled';
  if (!callback && a.status !== 'invited') return { suppressInterrupt: true };
  const r = stream(state.seed, 'audition', p.id, a.id, callback ? 'callback' : 'first');
  const missed = r() < MISS_CHANCE;
  let text: string;
  if (missed) {
    if (callback) a.callback!.status = 'missed';
    else a.status = 'missed';
    text = `${who.name} didn't come to ${callback ? 'the callback' : 'read'} for ${part} in ${p.title}. You can ask them again or see others.`;
  } else if (callback) {
    a.callback!.status = 'seen';
    a.read = readRange(who.capability, CALLBACK_SPREAD, r());
    if (a.callback!.partnerId) a.callback!.chemistry = pairChemistry(state, a.personId, a.callback!.partnerId);
    text = `${who.name} came back for ${part} in ${p.title}${a.callback!.partnerId ? ', with a chemistry read' : ''}.`;
  } else {
    a.status = 'seen';
    a.read = readRange(who.capability, FIRST_SPREAD, r());
    text = `${who.name} read for ${part} in ${p.title}.`;
  }
  addLog(state, text, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'cast' } });
  return { message: text };
});

// Auditions and callbacks are on the shared calendar.
registerCommitmentSource((state, from, to) => state.projects.flatMap((p) => (p.auditions ?? []).flatMap((a) => {
  const day = a.callback?.status === 'scheduled' ? a.callback.date : a.status === 'invited' ? a.date : null;
  if (!day) return [];
  const at = at10(p, day);
  if (at < from || at > to) return [];
  const part = p.characters.find((c) => c.id === a.characterId)?.name ?? 'a part';
  return [{ at, label: `${a.callback ? 'Callback' : 'Audition'}: ${personById(state, a.personId).name} for ${part}, ${p.title}`, route: { view: 'project' as const, projectId: p.id, tab: 'cast' }, kind: 'project' as const }];
})));

