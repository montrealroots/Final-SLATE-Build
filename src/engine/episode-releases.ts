// Episode release schedules (November 10, 2026). Until then a series' episode dates weren't stored: the airing rules
// assumed a broadcast aired weekly from its release date and anything online put every episode out at once
// (awards-rules.ts episodeAirDates). Now each episode in each release has its own date, set from a preset the player
// can edit (all at once, weekly, several on the premiere and then weekly, or dates of their own), and its own status:
// planned until its day comes, released after, and never moved once released. Each release keeps its own schedule, so a
// season can come out differently by territory and platform; the rules read the earliest date for each episode.
import { getPlace } from '../data/places';
import { isEpisodic } from './projects';
import { addLog, cancelEvents, registerCommitmentSource, registerHandler, schedule } from './state';
import { addDaysToKey, dateKey, formatDateKey, isDateKey, localToInstant, parseYmd } from './time';
import type { EpisodeRelease, GameState, Project, ReleasePattern, ReleaseRecord } from './types';

/** The routes a series comes out on episode by episode. Cinemas and festivals show a season, if at all, as one event. */
export const EPISODE_ROUTES: ReleaseRecord['route'][] = ['broadcast', 'streaming', 'digital'];
const ON: Record<string, string> = { broadcast: 'on television', streaming: 'on streaming', digital: 'online' };

export const PATTERN_LABELS: Record<Exclude<ReleasePattern, 'assumed'>, string> = {
  all: 'All Episodes At Once', weekly: 'Weekly', daily: 'Daily, One A Day', 'premiere-weekly': 'Several On The Premiere, Then Weekly', custom: 'Dates Of My Own',
};

/** Whether this release puts a series out episode by episode. */
export function hasEpisodes(p: Project, route: ReleaseRecord['route']): boolean {
  return isEpisodic(p.axes.format) && EPISODE_ROUTES.includes(route);
}

/** A preset's dates, one per episode, from the premiere: the starting point the player edits. */
export function presetDates(pattern: Exclude<ReleasePattern, 'custom' | 'assumed'>, premiere: string, episodes: number, onPremiere = 2): string[] {
  // Daily (from November 13, 2026): one a day from the premiere, as a limited series stripped across a week is.
  if (pattern === 'daily') return Array.from({ length: episodes }, (_, i) => addDaysToKey(premiere, i));
  const first = pattern === 'all' ? episodes : pattern === 'weekly' ? 1 : Math.max(1, Math.min(episodes, onPremiere));
  return Array.from({ length: episodes }, (_, i) => (i < first ? premiere : addDaysToKey(premiere, 7 * (i - first + 1))));
}

/** What the broadcast and online releases of a series assumed before schedules existed: weekly on television, all at once otherwise. */
export function assumedDates(r: Pick<ReleaseRecord, 'route' | 'date'>, episodes: number): string[] {
  return presetDates(r.route === 'broadcast' ? 'weekly' : 'all', r.date, episodes);
}

export function episodesFor(releaseId: string, dates: string[], assumed = false): EpisodeRelease[] {
  return dates.map((date, i) => ({ id: `${releaseId}-e${i + 1}`, number: i + 1, date, status: 'planned', ...(assumed ? { assumed: true as const } : {}) }));
}

const nineAm = (p: Project, d: string) => { const { year, month, day } = parseYmd(d); return localToInstant(getPlace(p.axes.basePlaceId).zone, year, month, day, 9).instant; };
/** Whether a day's release hour has gone: an event for it would be in the past, so the day is too late to choose. */
export const releaseHourPassed = (state: GameState, p: Project, d: string): boolean => nineAm(p, d) <= state.now;

/**
 * The release's events, rebuilt from its dates: its first day while it is planned, and one for each later day an
 * episode is still to come out. Every change goes through here, so a moved date replaces its event and none is doubled.
 */
export function syncReleaseEvents(state: GameState, p: Project, r: ReleaseRecord): void {
  cancelEvents(state, (e) => (e.kind === 'release' || e.kind === 'episode-release') && e.payload.releaseId === r.id);
  if (r.status === 'cancelled') return;
  // Never an event before now: a day whose release hour has passed, or an episode held back, waits for a new date.
  if (r.status === 'planned' && !releaseHourPassed(state, p, r.date)) schedule(state, nineAm(p, r.date), 'release', { projectId: p.id, releaseId: r.id }, { attention: 'notify', priority: 30, id: `${r.id}-out` });
  const later = new Set((r.episodes ?? []).filter((e) => e.status === 'planned' && !e.held && !(r.status === 'planned' && e.date === r.date) && !releaseHourPassed(state, p, e.date)).map((e) => e.date));
  for (const d of later) schedule(state, nineAm(p, d), 'episode-release', { projectId: p.id, releaseId: r.id, date: d }, { attention: 'notify', priority: 31, id: `${r.id}-air-${d}` });
}

const which = (eps: EpisodeRelease[]) => {
  const n = eps.map((e) => e.number);
  if (n.length === 1) return `Episode ${n[0]}`;
  const run = n.every((x, i) => i === 0 || x === n[i - 1] + 1);
  return run ? `Episodes ${n[0]} to ${n[n.length - 1]}` : `Episodes ${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
};

/** The release's first day: the episodes dated that day come out with it (finish.ts, the release handler). */
export function onReleaseDay(r: ReleaseRecord): void {
  for (const e of r.episodes ?? []) if (e.status === 'planned' && !e.held && e.date <= r.date) e.status = 'released';
}

const deliveredYet = (p: Project, n: number) => !!p.delivered || !!p.episodeDeliveries?.[n];

/**
 * An episode whose day has come before it is delivered doesn't come out: it is held back, the player is told, and it
 * waits for a new date on the Release tab. Returns what the player is told, or null if every episode due was ready.
 * Nothing else changes: a release contract only exists for a delivered season, so no contract term applies.
 */
export function holdUndelivered(state: GameState, p: Project, r: ReleaseRecord, date: string): string | null {
  const due = (r.episodes ?? []).filter((e) => e.status === 'planned' && !e.held && e.date === date && !deliveredYet(p, e.number));
  if (!due.length) return null;
  for (const e of due) e.held = true;
  const one = due.length === 1;
  const text = `${which(due)} of ${p.title} ${one ? "isn't" : "aren't"} delivered, so ${one ? 'it' : 'they'} didn't come out today ${ON[r.route]}. Choose a new day on the Release tab.`;
  addLog(state, text, 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  p.history.push({ at: state.now, text: `Held back: ${which(due)}, not delivered by ${date}.` });
  return text;
}

registerHandler('episode-release', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const r = p?.releases.find((x) => x.id === ev.payload.releaseId);
  if (!p || !r || r.status === 'cancelled') return { suppressInterrupt: true };
  const held = holdUndelivered(state, p, r, String(ev.payload.date));
  const due = (r.episodes ?? []).filter((e) => e.status === 'planned' && !e.held && e.date === ev.payload.date);
  if (!due.length) return held ? { message: held } : { suppressInterrupt: true };
  for (const e of due) e.status = 'released';
  // A release whose first day was held back starts with the first episode that does come out.
  if (r.status === 'planned') {
    r.status = 'released';
    if (!p.premiere) p.premiere = { kind: 'world', date: String(ev.payload.date), country: r.territories[0], venue: { broadcast: 'Broadcast', streaming: 'Streaming', digital: 'Digital Self-Release' }[r.route as 'broadcast'] ?? r.route };
  }
  const text = `${which(due)} of ${p.title} ${due.length === 1 ? 'is' : 'are'} out today ${ON[r.route]}.`;
  addLog(state, text, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  p.history.push({ at: state.now, text: `Released: ${which(due)}, ${ON[r.route]} on ${String(ev.payload.date)}.` });
  return { message: text };
});

/** Why these dates can't be the release's schedule, or null. A date already past stays; episodes come out in order. */
export function episodeDateProblem(state: GameState, p: Project, releaseId: string, dates: string[]): string | null {
  const r = p.releases.find((x) => x.id === releaseId);
  if (!r || r.status === 'cancelled') return 'That release is no longer planned.';
  if (!r.episodes?.length) return 'This release has no episodes to schedule.';
  if (dates.length !== r.episodes.length) return `Give a date for each of the ${r.episodes.length} episodes.`;
  const today = dateKey(state.now, getPlace(p.axes.basePlaceId).zone);
  for (const [i, e] of r.episodes.entries()) {
    const d = dates[i];
    void i;
    if (e.status === 'released') {
      if (d !== e.date) return `Episode ${e.number} came out on ${formatDateKey(e.date)}. A release that has happened stays as it was.`;
      continue;
    }
    if (e.held && d === e.date) return `Episode ${e.number} wasn't delivered in time for ${formatDateKey(e.date)}. Choose a new day for it.`;
    if (!isDateKey(d)) return `Choose a real date for episode ${e.number}.`;
    if (d < today) return `Episode ${e.number} can't come out before today.`;
    if (d !== e.date && releaseHourPassed(state, p, d)) return `Episode ${e.number} can't come out today: releases go out at 9 in the morning, and that has passed. Choose tomorrow or later.`;
    // Story order is advice, not a rule: episodes that stand alone can come out in another order (orderNotes says so).
  }
  return null;
}

/** Where these dates put episodes out of story order: advice for the player, never a refusal. */
export function orderNotes(dates: string[]): string[] {
  const out: string[] = [];
  for (let i = 1; i < dates.length; i++) if (dates[i] < dates[i - 1]) out.push(`Episode ${i + 1} would come out before episode ${i}: viewers meet them out of story order. That suits episodes that stand alone; a serial story may confuse.`);
  return out;
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/**
 * Give the release's episodes these dates. Episodes already out are never touched; the release's first day follows
 * its first episode while it is still to come, and an exclusive window counts from the new first day.
 */
export function setEpisodeDates(state: GameState, p: Project, releaseId: string, dates: string[]): string[] {
  const why = episodeDateProblem(state, p, releaseId, dates);
  if (why) throw new Error(why);
  const r = p.releases.find((x) => x.id === releaseId)!;
  const moved: EpisodeRelease[] = [];
  for (const [i, e] of r.episodes!.entries()) {
    if (e.status === 'released' || e.date === dates[i]) continue;
    e.date = dates[i];
    delete e.assumed;
    delete e.held;
    moved.push(e);
  }
  if (!moved.length) return [];
  r.pattern = 'custom';
  // A release still to start starts with its earliest episode, whatever its number.
  const first = [...dates].sort()[0];
  if (r.status === 'planned' && r.date !== first) {
    const o = r.offerId ? p.offers.find((x) => x.id === r.offerId) : undefined;
    if (o?.exclusiveUntil) o.exclusiveUntil = addDaysToKey(o.exclusiveUntil, daysBetween(r.date, first));
    r.date = first;
  }
  syncReleaseEvents(state, p, r);
  const text = `You moved ${which(moved).replace(/^E/, 'e')} of ${p.title}: ${moved.map((e) => `${e.number} on ${formatDateKey(e.date)}`).join(', ')}.`;
  addLog(state, text, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  p.history.push({ at: state.now, text: `Rescheduled: ${which(moved)} ${ON[r.route]}.` });
  return moved.map((e) => e.id);
}

export interface Airing { number: number; date: string; countries: string[]; planned: boolean; assumed: boolean; held?: true }

/**
 * When each episode first comes out, across every release on television or online that isn't cancelled: the earliest
 * date wins. A release without stored dates (a fixture, or a save written before version 9 and not yet migrated) is
 * read by the old assumption and marked assumed. A film is one airing, on its first such release.
 */
export function airings(p: Project): Airing[] {
  const n = isEpisodic(p.axes.format) ? Math.max(1, p.axes.episodeCount) : 1;
  const rel = p.releases.filter((r) => r.status !== 'cancelled' && EPISODE_ROUTES.includes(r.route));
  const out: Airing[] = [];
  for (let i = 1; i <= n; i++) {
    const all = rel.map((r) => {
      const ep = r.episodes?.find((e) => e.number === i);
      return { date: ep ? ep.date : n > 1 ? assumedDates(r, n)[i - 1] : r.date, countries: r.territories, planned: ep ? ep.status === 'planned' : r.status === 'planned', assumed: ep ? !!ep.assumed : n > 1, held: !!ep?.held };
    });
    if (!all.length) continue;
    // Every release on the earliest day counts, in any order. Until November 10, 2026 the first record listed won, so
    // its countries alone were read, and a planned record listed first made an episode already out read as to come.
    const date = all.reduce((m, a) => (a.date < m ? a.date : m), all[0].date);
    const first = all.filter((a) => a.date === date);
    // A day an episode was held back on is no airing: it counts once it has a new date (episode-delivery.ts).
    const live = all.filter((a) => !a.held);
    if (!live.length) { out.push({ number: i, date: first[0].date, countries: [], planned: true, assumed: false, held: true }); continue; }
    const day = live.reduce((m, a) => (a.date < m ? a.date : m), live[0].date);
    const on = live.filter((a) => a.date === day);
    out.push({ number: i, date: day, countries: [...new Set(on.flatMap((a) => a.countries))].sort(), planned: on.every((a) => a.planned), assumed: on.every((a) => a.assumed) });
  }
  return out;
}

// Releases on the calendar, as your schedule: each day episodes come out, and a film's release day.
registerCommitmentSource((state, from, to) => state.projects.flatMap((p) => p.releases.filter((r) => r.status !== 'cancelled' && r.route !== 'festival-premiere').flatMap((r) => {
  const days = r.episodes?.length ? [...new Set(r.episodes.map((e) => e.date))].map((d) => ({ d, eps: r.episodes!.filter((e) => e.date === d) })) : [{ d: r.date, eps: [] as EpisodeRelease[] }];
  return days.map(({ d, eps }) => {
    const out = eps.length ? eps.every((e) => e.status === 'released') : r.status === 'released';
    // Where, too: a film opening in several countries on one day is several releases, and each is its own entry.
    const what = `${eps.length ? `${which(eps)} ${ON[r.route]}` : `Release ${ON[r.route] ?? 'in cinemas'}`} in ${r.territories.join(', ')}`;
    return { id: `${r.id}@${d}`, at: nineAm(p, d), label: `${p.title}: ${what}${out ? ' (Out)' : ''}${eps.some((e) => e.held) ? ' (Held Back: Not Delivered)' : ''}${eps.some((e) => e.assumed) ? ' (Assumed Date)' : ''}`, route: { view: 'project' as const, projectId: p.id, tab: 'release' }, kind: 'project' as const };
  }).filter((c) => c.at >= from && c.at <= to);
})));

/**
 * v8 -> v9: each series release on television or online gets the episode dates the rules assumed for it, marked
 * assumed. Episodes dated before the save's own day in a release that has happened count as out; later ones are
 * still to come, with their events. Entries, their snapshots and results are left exactly as they were.
 */
export function migrateV8toV9(raw: Record<string, unknown>): Record<string, unknown> {
  const s = raw as unknown as GameState;
  for (const p of Array.isArray(s.projects) ? s.projects : []) {
    if (!isEpisodic(p.axes?.format) || !Array.isArray(p.releases)) continue;
    const today = dateKey(Number(s.now) || 0, getPlace(p.axes.basePlaceId).zone);
    for (const r of p.releases) {
      if (r.episodes || !EPISODE_ROUTES.includes(r.route)) continue;
      r.episodes = episodesFor(r.id, assumedDates(r, Math.max(1, p.axes.episodeCount)), true);
      r.pattern = 'assumed';
      if (r.status === 'released') for (const e of r.episodes) if (e.date <= today) e.status = 'released';
      if (r.status !== 'cancelled' && Array.isArray(s.events)) {
        // The release's own event stays as it was; only the later days an episode still comes out are added.
        const later = new Set(r.episodes.filter((e) => e.status === 'planned' && !(r.status === 'planned' && e.date === r.date)).map((e) => e.date));
        for (const d of later) schedule(s, nineAm(p, d), 'episode-release', { projectId: p.id, releaseId: r.id, date: d }, { attention: 'notify', priority: 31, id: `${r.id}-air-${d}` });
      }
    }
  }
  return raw;
}
