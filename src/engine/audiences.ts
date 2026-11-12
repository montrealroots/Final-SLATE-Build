// Weekly audiences for what is broadcast or streamed (the v3 package, 02, "Weekly TV and streaming audiences"). Until
// November 12, 2026 a release on television or a streaming service had monthly earnings and no audience at all.
//
// What is here, and what is not. Every figure is this game's own simulation and is labelled so wherever it is shown; no
// recorded audience is imported, and none is made up to stand beside these. Nothing else in the game reads an audience
// yet: a commissioner decides on another season thirty days after delivery, from how the season turned out, which is
// before it has aired (continuation.ts), and no agreement pays by audience. So this is a report, and says so. Not
// built: reach and promotion, competition from other programmes, ratings points, share, demographic ratings,
// completion, rankings, sponsor or licence receipts tied to an audience, and recorded figures of real programmes.
//
// The measures are kept apart and never turned into one another across kinds of release:
// - Broadcast: the average audience of an episode's first showing, in people. One figure an episode, in the week it
//   aired. A week with no first showing has no figure, which is not the same as nobody watching.
// - Streaming: hours viewed in the week, of everything then available; and views, which the service works out as those
//   hours over the running time of what is available. Views are not people, and neither is an audience.
// - Bought or rented digitally: no audience is reported. Its sales are in its earnings.
//
// An observation is recorded the day its week ends, from the release as it stands that day (which episodes are out,
// in how many territories), and is never rewritten: a week that was not recorded stays unknown.
import type { AudienceMetric, AudienceObservation, DistributionOffer, Project } from './types';
import { stream } from './rng';
import { addDaysToKey } from './time';

export const METRICS: Record<AudienceMetric, { label: string; says: string }> = {
  viewers: { label: 'Average Audience', says: 'People watching a first showing, live or later the same day, in the territories it aired in. For a series, each episode has its own.' },
  hours: { label: 'Hours Viewed', says: 'Every hour watched in the week, of everything then available, in the territories it is streaming in.' },
  views: { label: 'Views', says: 'Hours viewed over the running time of what is available: the service\'s own count. It is not a number of people.' },
};
/** What each kind of release reports. A digital release reports no audience. */
export const routeMetrics = (route: DistributionOffer['route']): AudienceMetric[] => (route === 'broadcast' ? ['viewers'] : route === 'streaming' ? ['hours', 'views'] : []);

/** How many weeks after the last episode is out the reports go on. */
export const AUDIENCE_TAIL_WEEKS = 8;
/** A first showing's audience at full appeal in one territory, and a streaming week's viewers at the same. Modeled assumptions. */
export const BROADCAST_BASE = 250_000;
export const STREAMING_BASE = 120_000;
/** How much of a streamed episode's week-one hours it keeps each week after. A modeled assumption. */
export const STREAMING_DECAY = 0.55;

/** Something that is out: an episode, or the whole film (number null), with the day it came out, how it was received and how long it runs. */
export interface Showing { number: number | null; date: string; reception: number; runtimeMin: number }

const days = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
/** The week of a run a day falls in, counting from the day it opened: 1 for its first seven days. */
export const weekOf = (opened: string, date: string): number => Math.floor(days(opened, date) / 7) + 1;
export const audienceWeekDates = (opened: string, week: number) => ({ from: addDaysToKey(opened, (week - 1) * 7), to: addDaysToKey(opened, week * 7 - 1) });

/** How much of the possible audience something draws, from how it was received: none at 30 of 100, all of the base at 80. A modeled assumption. */
export const appeal = (reception: number): number => Math.max(0, reception - 30) / 50;
/** How much of the audience the next episode keeps, from how this one was received: four fifths at worst, nearly all at best. A modeled assumption. */
export const retention = (reception: number): number => Math.min(0.98, Math.max(0.8, 0.86 + (reception - 50) / 400));

const thousand = (n: number) => Math.round(n / 1000) * 1000;

/** What is out under a deal, each episode once at its earliest day, in order. */
export function showingsOf(p: Project, o: DistributionOffer): Showing[] {
  const out = new Map<number | null, Showing>();
  const put = (number: number | null, date: string, reception: number, runtimeMin: number) => {
    const had = out.get(number);
    if (!had || date < had.date) out.set(number, { number, date, reception, runtimeMin });
  };
  const whole = p.quality?.reception ?? 50;
  for (const r of p.releases.filter((x) => x.offerId === o.id && x.status !== 'cancelled')) {
    if (r.episodes?.length) {
      for (const e of r.episodes.filter((x) => x.status === 'released')) put(e.number, e.date, p.episodeQuality?.[String(e.number)]?.reception ?? whole, p.episodeDeliveries?.[e.number]?.runtimeMin ?? p.axes.targetRuntimeMin);
    } else if (r.status === 'released') put(null, r.date, whole, p.delivered?.runtimeMin ?? p.axes.targetRuntimeMin);
  }
  return [...out.values()].sort((a, b) => a.date.localeCompare(b.date) || (a.number ?? 0) - (b.number ?? 0));
}

/** The last week the reports run to: the tail after the last episode's day, planned or out. */
export function lastAudienceWeek(p: Project, o: DistributionOffer, opened: string): number {
  const dates = p.releases.filter((x) => x.offerId === o.id && x.status !== 'cancelled').flatMap((r) => (r.episodes?.length ? r.episodes.map((e) => e.date) : [r.date]));
  const last = dates.sort().at(-1) ?? opened;
  return Math.max(1, weekOf(opened, last)) + AUDIENCE_TAIL_WEEKS;
}

/**
 * The observations for one week, from what is out by its last day. Deterministic for a world: the same release in the
 * same week always reports the same figures.
 */
export function observeWeek(seed: number, projectId: string, o: Pick<DistributionOffer, 'id' | 'route'>, week: number, opened: string, showings: Showing[], territories: number): AudienceObservation[] {
  const { from, to } = audienceWeekDates(opened, week);
  const out: AudienceObservation[] = [];
  const reach = Math.sqrt(Math.max(1, territories));
  const noise = (what: string) => 0.95 + stream(seed, 'audience', projectId, o.id, String(week), what)() * 0.1;
  const base = { week, from, to, territories };
  if (o.route === 'broadcast') {
    // Each episode first shown this week; what it keeps of the audience depends on the episodes shown before it.
    showings.forEach((s, i) => {
      if (s.date < from || s.date > to) return;
      const kept = showings.slice(0, i).reduce((k, earlier) => k * retention(earlier.reception), 1);
      out.push({ ...base, metric: 'viewers', value: thousand(BROADCAST_BASE * appeal(s.reception) * reach * kept * noise(`v${s.number ?? 0}`)), scope: s.number === null ? 'title' : 'episode', ...(s.number === null ? {} : { episode: s.number }) });
    });
  } else if (o.route === 'streaming') {
    const available = showings.filter((s) => s.date <= to);
    if (!available.length) return out;
    const hours = thousand(available.reduce((n, s) => n + STREAMING_BASE * appeal(s.reception) * reach * (s.runtimeMin / 60) * Math.pow(STREAMING_DECAY, week - Math.max(1, weekOf(opened, s.date))), 0) * noise('h'));
    const runtimeHours = available.reduce((n, s) => n + s.runtimeMin / 60, 0);
    out.push({ ...base, metric: 'hours', value: hours, scope: 'title' });
    out.push({ ...base, metric: 'views', value: runtimeHours > 0 ? Math.round(hours / runtimeHours / 100) * 100 : 0, scope: 'title' });
  }
  return out;
}

/** Record a week's observations on the deal. Recorded once: a week already there is left as it was. */
export function recordAudienceWeek(o: DistributionOffer, observations: AudienceObservation[]): AudienceObservation[] {
  const fresh = observations.filter((x) => !(o.audience ?? []).some((y) => y.week === x.week && y.metric === x.metric && y.episode === x.episode));
  if (fresh.length) (o.audience ??= []).push(...fresh);
  return fresh;
}

/** A deal's audience in a sentence or two, for its row: the first showing and how the latest compares, or the hours so far. */
export function audienceSummary(o: DistributionOffer): string | null {
  const a = o.audience ?? [];
  if (!a.length) return null;
  const n = (x: number) => x.toLocaleString('en-US');
  if (o.route === 'broadcast') {
    const v = a.filter((x) => x.metric === 'viewers');
    const first = v[0]; const last = v.at(-1)!;
    return v.length === 1 ? `Its first showing drew an average audience of ${n(first.value)}.` : `Its first showing drew an average audience of ${n(first.value)}; its latest, ${n(last.value)}, which is ${first.value > 0 ? Math.round((last.value / first.value) * 100) : 0}% of that.`;
  }
  const hours = a.filter((x) => x.metric === 'hours');
  return `${n(hours.reduce((s, x) => s + x.value, 0))} hours viewed in ${hours.length} ${hours.length === 1 ? 'week' : 'weeks'} reported.`;
}
