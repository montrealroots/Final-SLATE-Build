// The casting director's work (the v3 package, 02: "Add producer and casting-director responsibilities before allowing
// those hires: scoped mandate, delegated tasks, costs, decisions requiring player approval, accountability, credit and
// termination"). Until November 12, 2026 a casting director could be hired and did nothing.
//
// The mandate is one search for one part. The delegated task is the legwork: choosing who to bring and arranging the
// session. It costs two of their days, paid on their own budget line and counted as days worked, which is what
// credits them. They then advise, from the same readings the player sees. What stays the player's: the shortlist, the
// callbacks and every offer. If they leave the production, the readings they arranged still happen, what they were
// paid stays paid, their credit stays, and the advice goes with them.
import type { Audition, CastingSearch, GameState, Hire, PerformanceMethod, Project } from './types';
import { inviteRefusal, inviteToAudition, setShortlisted } from './casting-calls';
import { candidatesFor, castRoleFor, CASTING_SEARCH_DAYS, payDelegatedDays } from './hiring';
import { personById } from './people';
import { money } from './budget';
import { approvedCharacters } from './projects';
import { newId } from './state';
import { sessionDay } from './auditions';

/** The casting director working on this production now, if there is one. */
export const castingDirector = (p: Project): Hire | null => p.hires.find((h) => h.roleId === 'casting-director' && h.status === 'accepted') ?? null;

/** How many performers they bring to one session: more with experience, never fewer than three or more than six. */
export const searchSize = (experience: number): number => Math.min(6, Math.max(3, 2 + experience));
export const SEARCH_DAYS = CASTING_SEARCH_DAYS;
export const searchFee = (cd: Hire): number => cd.dayRate * SEARCH_DAYS;

export const searchesFor = (p: Project, characterId: string, method: PerformanceMethod): CastingSearch[] => (p.castingSearches ?? []).filter((s) => s.characterId === characterId && s.method === method);

/** Why a search for this part can't be asked for now, or null. */
export function searchRefusal(p: Project, characterId: string, method: PerformanceMethod): string | null {
  if (p.delivered) return 'This project has been delivered.';
  if (p.shelved) return 'This project is shelved. Take it up again to make changes.';
  if (!castingDirector(p)) return 'Hire a casting director first (Crew, Casting And Performance).';
  const c = approvedCharacters(p).find((x) => x.id === characterId);
  if (!c) return 'That part is not in the approved script.';
  if (c.roleSize === 'background') return 'Background parts are covered by the crowd budget, without auditions.';
  if (p.cast.some((x) => x.characterId === characterId && x.method === method)) return `${c.name} is cast already.`;
  if (searchesFor(p, characterId, method).some((s) => searchStatus(p, s).waiting > 0)) return `A search for ${c.name} is under way: its readings haven't all happened yet.`;
  return null;
}

/** What asking would do, said before it is asked: who runs it, how many they bring, when, and what it costs. */
export function searchPreview(state: GameState, p: Project): { by: string; brings: number; on: string; fee: number } | null {
  const cd = castingDirector(p);
  if (!cd) return null;
  const who = personById(state, cd.personId, 'casting-director');
  return { by: who.name, brings: searchSize(who.experience), on: sessionDay(state, p), fee: searchFee(cd) };
}

/**
 * Ask the casting director to run a search for a part. They choose who to bring, most experienced first among those
 * who can be asked, arrange the session, and are paid for two days. Those they looked at and left out are recorded
 * with the reason.
 */
export function startSearch(state: GameState, p: Project, characterId: string, method: PerformanceMethod): CastingSearch {
  const why = searchRefusal(p, characterId, method);
  if (why) throw new Error(why);
  const cd = castingDirector(p)!;
  const who = personById(state, cd.personId, 'casting-director');
  const part = approvedCharacters(p).find((x) => x.id === characterId)!;
  const pool = candidatesFor(state, p, castRoleFor(method), characterId).sort((a, b) => b.experience - a.experience || a.name.localeCompare(b.name));
  const brings = searchSize(who.experience);
  const chosen: string[] = []; const passed: CastingSearch['passed'] = [];
  for (const c of pool) {
    const no = inviteRefusal(state, p, characterId, method, c.id);
    if (no) { if (passed.length < 8) passed.push({ name: c.name, why: no }); continue; }
    if (chosen.length < brings) chosen.push(c.id);
  }
  if (!chosen.length) throw new Error(`${who.name} found nobody who can be asked to read for ${part.name} now.`);
  // Paid first, on their own line of the budget: their agreement reserved one search, and a further one adds to it. A
  // search the production can't pay for is not begun. The days count as days worked, which is what credits them.
  const fee = payDelegatedDays(state, p, cd, SEARCH_DAYS, `casting-search:${characterId}:${method}:${state.now}`, 'search');
  const auditionIds = chosen.map((id) => inviteToAudition(state, p, characterId, method, id).id);
  const s: CastingSearch = { id: newId(state, 'cs'), characterId, method, by: cd.personId, byName: who.name, at: state.now, fee, auditionIds, passed };
  (p.castingSearches ??= []).push(s);
  return s;
}

export interface SearchStatus { invited: number; seen: number; declined: number; missed: number; waiting: number; done: boolean }
export function searchStatus(p: Project, s: CastingSearch): SearchStatus {
  const mine = (p.auditions ?? []).filter((a) => s.auditionIds.includes(a.id));
  const n = (st: Audition['status']) => mine.filter((a) => a.status === st).length;
  const waiting = n('invited');
  return { invited: mine.length, seen: n('seen'), declined: n('declined'), missed: n('missed'), waiting, done: waiting === 0 };
}

/**
 * What they advise once everyone has read: up to three of those seen, by the middle of the reading the player sees
 * too, best first. With their casting director gone from the production there is no advice.
 */
export function searchAdvice(p: Project, s: CastingSearch): { auditions: Audition[]; left: boolean } {
  const left = castingDirector(p)?.personId !== s.by;
  if (left || !searchStatus(p, s).done) return { auditions: [], left };
  const seen = (p.auditions ?? []).filter((a) => s.auditionIds.includes(a.id) && a.status === 'seen' && a.read);
  return { auditions: seen.sort((a, b) => (b.read![0] + b.read![1]) - (a.read![0] + a.read![1]) || a.id.localeCompare(b.id)).slice(0, 3), left };
}

/** Take their advice: the people they recommend go on the shortlist. The player's decision, made by pressing it. */
export function shortlistAdvice(p: Project, searchId: string): number {
  const s = (p.castingSearches ?? []).find((x) => x.id === searchId);
  if (!s) throw new Error('Unknown search.');
  const advice = searchAdvice(p, s).auditions;
  if (!advice.length) throw new Error('There is no advice to take yet.');
  for (const a of advice) setShortlisted(p, a.id, true);
  return advice.length;
}

/** The search in a sentence, for the page and the log. */
export function searchLine(p: Project, s: CastingSearch, date: (at: number) => string): string {
  const st = searchStatus(p, s);
  const parts = [`${st.seen} read`, st.declined ? `${st.declined} couldn't come` : '', st.missed ? `${st.missed} didn't come` : '', st.waiting ? `${st.waiting} still to read` : ''].filter(Boolean).join(', ');
  return `${s.byName} ran a search on ${date(s.at)} for ${money(s.fee)}: ${st.invited} asked, ${parts}.`;
}
