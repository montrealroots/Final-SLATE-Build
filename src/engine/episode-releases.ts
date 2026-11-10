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
  all: 'All Episodes At Once', weekly: 'Weekly', 'premiere-weekly': 'Several On The Premiere, Then Weekly', custom: 'Dates Of My Own',
};

/** Whether this release puts a series out episode by episode. */
export function hasEpisodes(p: Project, route: ReleaseRecord['route']): boolean {
  return isEpisodic(p.axes.format) && EPISODE_ROUTES.includes(route);
}

/** A preset's dates, one per episode, from the premiere: the starting point the player edits. */
export function presetDates(pattern: Exclude<ReleasePattern, 'custom' | 'assumed'>, premiere: string, episodes: number, onPremiere = 2): string[] {
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

/**
 * The release's events, rebuilt from its dates: its first day while it is planned, and one for each later day an
 * episode is still to come out. Every change goes through here, so a moved date replaces its event and none is doubled.
 */
export function syncReleaseEvents(state: GameState, p: Project, r: ReleaseRecord): void {
  cancelEvents(state, (e) => (e.kind === 'release' || e.kind === 'episode-release') && e.payload.releaseId === r.id);
  if (r.status === 'cancelled') return;
  if (r.status === 'planned') schedule(state, nineAm(p, r.date), 'release', { projectId: p.id, releaseId: r.id }, { attention: 'notify', priority: 30, id: `${r.id}-out` });
  const later = new Set((r.episodes ?? []).filter((e) => e.status === 'planned' && !(r.status === 'planned' && e.date === r.date)).map((e) => e.date));
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
  for (const e of r.episodes ?? []) if (e.status === 'planned' && e.date <= r.date) e.status = 'released';
}

registerHandler('episode-release', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const r = p?.releases.find((x) => x.id === ev.payload.releaseId);
  if (!p || !r || r.status === 'cancelled') return { suppressInterrupt: true };
  const due = (r.episodes ?? []).filter((e) => e.status === 'planned' && e.date === ev.payload.date);
  if (!due.length) return { suppressInterrupt: true };
  for (const e of due) e.status = 'released';
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
    if (e.status === 'released') {
      if (d !== e.date) return `Episode ${e.number} came out on ${formatDateKey(e.date)}. A release that has happened stays as it was.`;
      continue;
    }
    if (!isDateKey(d)) return `Choose a real date for episode ${e.number}.`;
    if (d < today) return `Episode ${e.number} can't come out before today.`;
    if (i > 0 && d < dates[i - 1]) return `Episode ${e.number} can't come out before episode ${e.number - 1}.`;
  }
  return null;
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
    moved.push(e);
  }
  if (!moved.length) return [];
  r.pattern = 'custom';
  if (r.status === 'planned' && r.date !== dates[0]) {
    const o = r.offerId ? p.offers.find((x) => x.id === r.offerId) : undefined;
    if (o?.exclusiveUntil) o.exclusiveUntil = addDaysToKey(o.exclusiveUntil, daysBetween(r.date, dates[0]));
    r.date = dates[0];
  }
  syncReleaseEvents(state, p, r);
  const text = `You moved ${which(moved).replace(/^E/, 'e')} of ${p.title}: ${moved.map((e) => `${e.number} on ${formatDateKey(e.date)}`).join(', ')}.`;
  addLog(state, text, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  p.history.push({ at: state.now, text: `Rescheduled: ${which(moved)} ${ON[r.route]}.` });
  return moved.map((e) => e.id);
}

export interface Airing { number: number; date: string; countries: string[]; planned: boolean; assumed: boolean }

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
    let best: Airing | undefined;
    for (const r of rel) {
      const ep = r.episodes?.find((e) => e.number === i);
      const date = ep ? ep.date : n > 1 ? assumedDates(r, n)[i - 1] : r.date;
      const a: Airing = { number: i, date, countries: r.territories, planned: ep ? ep.status === 'planned' : r.status === 'planned', assumed: ep ? !!ep.assumed : n > 1 };
      if (!best || a.date < best.date) best = a;
    }
    if (best) out.push(best);
  }
  return out;
}

// Releases on the calendar, as your schedule: each day episodes come out, and a film's release day.
registerCommitmentSource((state, from, to) => state.projects.flatMap((p) => p.releases.filter((r) => r.status !== 'cancelled' && r.route !== 'festival-premiere').flatMap((r) => {
  const days = r.episodes?.length ? [...new Set(r.episodes.map((e) => e.date))].map((d) => ({ d, eps: r.episodes!.filter((e) => e.date === d) })) : [{ d: r.date, eps: [] as EpisodeRelease[] }];
  return days.map(({ d, eps }) => {
    const out = eps.length ? eps.every((e) => e.status === 'released') : r.status === 'released';
    const what = eps.length ? `${which(eps)} ${ON[r.route]}` : `Release ${ON[r.route] ?? 'in cinemas'}`;
    return { at: nineAm(p, d), label: `${p.title}: ${what}${out ? ' (Out)' : ''}${eps.some((e) => e.assumed) ? ' (Assumed Date)' : ''}`, route: { view: 'project' as const, projectId: p.id, tab: 'release' }, kind: 'project' as const };
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
