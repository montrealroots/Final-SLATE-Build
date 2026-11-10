// What changing a series' episode dates affects, said before you confirm (November 10, 2026): which episodes move,
// what happens to the calendar and to a distributor's exclusive window, and each award entry whose qualification would
// change. Kept apart from episode-releases.ts so the release engine doesn't import the award engine.
import { checkEligibility, institution } from './awards';
import { episodeDateProblem, orderNotes, setEpisodeDates } from './episode-releases';
import { formatDateKey } from './time';
import type { GameState, Project } from './types';

/** Entries not yet judged: their eligibility can still change. */
const OPEN = ['submitted', 'accepted', 'needs-correction'];

function entryReadings(state: GameState, p: Project): Map<string, { label: string; eligible: boolean; provisional: boolean; why: string; accepted: boolean }> {
  const out = new Map<string, { label: string; eligible: boolean; provisional: boolean; why: string; accepted: boolean }>();
  for (const ed of state.editions) {
    for (const e of ed.entries.filter((x) => x.projectId === p.id && OPEN.includes(x.status))) {
      const cat = institution(ed.institutionId).categories.find((c) => c.id === e.categoryId);
      if (!cat) continue;
      const el = checkEligibility(state, p, ed, cat, e.recipients, e.versionId, e.episode, e.songId);
      out.set(`${ed.id}|${e.id}`, { label: `${cat.name} at the ${ed.label}${e.episode ? ` (episode ${e.episode})` : ''}`, eligible: el.eligible, provisional: el.provisional, why: el.reasons[0] ?? el.provisionalNote ?? '', accepted: e.status === 'accepted' });
    }
  }
  return out;
}

/**
 * In words, what giving the release these dates would change. Nothing is changed: the dates are tried on a copy of the
 * game and the entries read before and after. Throws the reason if the dates can't be used.
 */
export function scheduleChangeEffects(state: GameState, p: Project, releaseId: string, dates: string[]): string[] {
  const why = episodeDateProblem(state, p, releaseId, dates);
  if (why) throw new Error(why);
  const r = p.releases.find((x) => x.id === releaseId)!;
  const lines: string[] = [];
  const moved = r.episodes!.filter((e, i) => e.status === 'planned' && e.date !== dates[i]);
  if (!moved.length) return ['Nothing changes: these are the dates already planned.'];
  for (const e of moved) lines.push(`Episode ${e.number} moves from ${formatDateKey(e.date)} to ${formatDateKey(dates[e.number - 1])}${e.assumed ? ' (its date was assumed from an older save)' : ''}.`);
  const out = r.episodes!.filter((e) => e.status === 'released');
  if (out.length) lines.push(`${out.length === 1 ? 'Episode 1 has' : `${out.length} episodes have`} already come out; ${out.length === 1 ? 'it stays' : 'they stay'} as ${out.length === 1 ? 'it was' : 'they were'}.`);
  lines.push('Your calendar shows the new days, and each episode comes out on its own day.');
  lines.push(...orderNotes(dates));
  const notReady = moved.filter((e) => !p.delivered && !p.episodeDeliveries?.[e.number]);
  if (notReady.length) lines.push(`${notReady.map((e) => `Episode ${e.number}`).join(', ')} ${notReady.length === 1 ? "isn't" : "aren't"} delivered yet: if still not delivered by ${notReady.length === 1 ? 'its' : 'their'} new day, ${notReady.length === 1 ? 'it is' : 'they are'} held back again.`);
  if (r.status === 'planned' && dates[0] !== r.date) {
    const o = r.offerId ? p.offers.find((x) => x.id === r.offerId) : undefined;
    lines.push(`The release starts on ${formatDateKey(dates[0])} instead of ${formatDateKey(r.date)}${o?.exclusiveUntil ? `, and ${o.distributor}'s exclusive window moves with it` : ''}.`);
  }
  const before = entryReadings(state, p);
  const copy = structuredClone(state);
  setEpisodeDates(copy, copy.projects.find((x) => x.id === p.id)!, releaseId, dates);
  const after = entryReadings(copy, copy.projects.find((x) => x.id === p.id)!);
  for (const [k, b] of before) {
    const a = after.get(k)!;
    if (b.eligible && !a.eligible) lines.push(`Your entry for ${b.label} would no longer qualify: ${a.why} It would be ${b.accepted ? 'disqualified before judging' : 'turned down when entries are reviewed'}, and the fee isn't refunded.`);
    else if (!b.eligible && a.eligible) lines.push(`Your entry for ${b.label} would qualify again${a.provisional ? ', provisionally' : ''}.`);
    else if (b.provisional !== a.provisional) lines.push(a.provisional ? `Your entry for ${b.label} would rest on dates still to come: ${a.why}` : `Your entry for ${b.label} would no longer depend on dates still to come.`);
  }
  if (before.size && lines.every((l) => !l.startsWith('Your entry'))) lines.push(`Your ${before.size === 1 ? 'entry still qualifies' : `${before.size} entries still qualify`} as before.`);
  return lines;
}
