// Grade news (the owner, November 18, 2026: "Build the grade-up news so I know when I level up"). A role's grade
// (reputation.ts) is read from the record, never stored, so until then a rise showed only on the Profile. The grade last
// told is kept on the save (`gradesHeard`), and wherever the record can move a grade (a delivery, a festival's selection
// or an award's nominations, an edition's results) the grades are read again and each change is news: what the grade is
// now and what it opens. A save that has none starts from the grades it has, so nothing old is told as new.
import { money } from './budget';
import { addLog, onNewGame } from './state';
import { REPUTATION_MODEL, standings, type StandingRole } from './reputation';
import { STUDIO_REACH } from './studio-projects';
import type { GameState } from './types';

const AS: Record<StandingRole, string> = { directing: 'a director', writing: 'a screenwriter', acting: 'an actor', producing: 'a producer' };
const rank = (grade: string): number => REPUTATION_MODEL.grades.findIndex(([, name]) => name === grade);

/** What a grade opens in a role, for the news: studio pictures for directing and writing, a better rate where there are jobs. */
function opens(role: StandingRole, grade: string, rose: boolean): string {
  const out: string[] = [];
  if (role === 'directing' || role === 'writing') {
    const reach = STUDIO_REACH[grade] ?? 0;
    out.push(reach === 0 ? "Studios won't offer you their own pictures in this role until it's back." : reach === Infinity ? 'Studios may now offer you any picture they make.' : `Studios may now offer you pictures of up to ${money(reach)}.`);
  }
  // A grade above the first makes a request for a better rate agreed (reputation.ts hasLeverage); producing has no jobs.
  if (role !== 'producing' && rank(grade) === 1 && rose) out.push('When you ask for a better rate for this work, it is now agreed.');
  if (role !== 'producing' && rank(grade) === 0 && !rose) out.push('A request for a better rate is no longer agreed as a matter of course.');
  return out.join(' ');
}

/** Read the grades again and tell each change since they were last told, `after` what moved them. Returns the news told. */
export function noticeGrades(state: GameState, after?: string): string[] {
  const now = standings(state);
  if (!state.gradesHeard) {
    state.gradesHeard = Object.fromEntries(now.map((x) => [x.role, x.grade]));
    return [];
  }
  const told: string[] = [];
  for (const x of now) {
    const before = state.gradesHeard[x.role];
    if (before === undefined || before === x.grade) { state.gradesHeard[x.role] = x.grade; continue; }
    const rose = rank(x.grade) > rank(before);
    const text = rose
      ? `You're now ${x.grade} as ${AS[x.role]}, up from ${before}${after ? `, after ${after}` : ''}. ${opens(x.role, x.grade, true)}`
      : `Your standing as ${AS[x.role]} has slipped from ${before} to ${x.grade}${after ? `, after ${after}` : ''}. ${opens(x.role, x.grade, false)}`;
    addLog(state, text.trim(), 'personal', { route: { view: 'profile' } });
    state.gradesHeard[x.role] = x.grade;
    told.push(text.trim());
  }
  return told;
}

// A new life starts from its grades (all Emerging), so its first rise is told.
onNewGame((s) => { noticeGrades(s); });
