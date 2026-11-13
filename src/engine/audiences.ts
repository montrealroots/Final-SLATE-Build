// Weekly audiences for what is broadcast or streamed (the v3 package, 02, "Weekly TV and streaming audiences"). Until
// November 12, 2026 a release on television or a streaming service had monthly earnings and no audience at all.
//
// What is here, and what is not. Every figure is this game's own simulation and is labelled so wherever it is shown; no
// recorded audience is imported, and none is made up to stand beside these. Until November 12, 2026 nothing read an
// audience: a commissioner decided on another season thirty days after delivery, from how the season turned out, before
// it had aired. Now a season that is going out on television or a streaming service is decided on once it has been
// shown, from its audience (seasonAudience, read by continuation.ts). No agreement pays by audience yet. Not built:
// reach and promotion, competition from other programmes, ratings points, share, demographic ratings, completion,
// rankings, sponsor or licence receipts tied to an audience, and recorded figures of real programmes.
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
/**
 * How much of the audience the next episode keeps, from how this one was received: four fifths at worst; past a
 * reception of about 85 it grows, by word of mouth, up to 5% an episode. Until November 13, 2026 it never passed 98%,
 * so every season lost viewers episode by episode whatever it was. A modeled assumption.
 */
export const retention = (reception: number): number => Math.min(1.05, Math.max(0.8, 0.86 + (reception - 50) / 250));
/**
 * What the time between two first showings does to the audience that comes back (from November 13, 2026): episodes a
 * day apart keep the habit, a break of over two weeks loses some of it. Weekly is the measure. Modeled assumptions.
 */
export const STRIP_HABIT = 1.03;
export const BREAK_LOSS = 0.92;
export const gapEffect = (daysApart: number): number => (daysApart <= 1 ? STRIP_HABIT : daysApart > 14 ? BREAK_LOSS : 1);

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
/**
 * What a week stands against (the owner's goal: "tv ratings being fresh and different each week"; November 13, 2026):
 * - a late slot leaves a broadcast about three fifths of the audience an earlier one gets;
 * - summer weeks draw fewer viewers and winter weeks more, as television seasons go;
 * - the week's competition is drawn once for the calendar week, from the save's seed, so every show that week meets the
 *   same week, and a busy week for one is a busy week for all.
 * Game calibration, each factor shown with the figure it moved.
 */
export const LATE_SLOT_AUDIENCE = 0.6;
export const seasonFactor = (date: string): number => { const m = Number(date.slice(5, 7)); return m >= 6 && m <= 8 ? 0.88 : m === 12 || m <= 2 ? 1.08 : 1; };
export const weekCompetition = (seed: number, weekFrom: string): number => Math.round((0.85 + stream(seed, 'tv-week', weekFrom)() * 0.3) * 100) / 100;

export function observeWeek(seed: number, projectId: string, o: Pick<DistributionOffer, 'id' | 'route' | 'slot'>, week: number, opened: string, showings: Showing[], territories: number): AudienceObservation[] {
  const { from, to } = audienceWeekDates(opened, week);
  const out: AudienceObservation[] = [];
  const reach = Math.sqrt(Math.max(1, territories));
  const noise = (what: string) => 0.95 + stream(seed, 'audience', projectId, o.id, String(week), what)() * 0.1;
  const context = { slot: o.route === 'broadcast' && o.slot === 'late' ? LATE_SLOT_AUDIENCE : 1, season: seasonFactor(from), competition: weekCompetition(seed, from) };
  const against = context.slot * context.season * context.competition;
  const base = { week, from, to, territories, context };
  if (o.route === 'broadcast') {
    // Each episode first shown this week; what it keeps of the audience depends on the episodes shown before it.
    showings.forEach((s, i) => {
      if (s.date < from || s.date > to) return;
      // Each earlier episode passes on what it keeps, and the time to the next showing what comes back after it.
      const kept = showings.slice(0, i).reduce((k, earlier, j) => k * retention(earlier.reception) * (j + 1 <= i ? gapEffect(days(earlier.date, showings[j + 1].date)) : 1), 1);
      out.push({ ...base, metric: 'viewers', value: thousand(BROADCAST_BASE * appeal(s.reception) * reach * kept * against * noise(`v${s.number ?? 0}`)), scope: s.number === null ? 'title' : 'episode', ...(s.number === null ? {} : { episode: s.number }) });
    });
  } else if (o.route === 'streaming') {
    const available = showings.filter((s) => s.date <= to);
    if (!available.length) return out;
    const hours = thousand(available.reduce((n, s) => n + STREAMING_BASE * appeal(s.reception) * reach * (s.runtimeMin / 60) * Math.pow(STREAMING_DECAY, week - Math.max(1, weekOf(opened, s.date))), 0) * against * noise('h'));
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

/**
 * What a commissioner looks for before paying for another season. Modeled assumptions, not measured renewal rates:
 * a first showing has to draw two fifths of what one at full appeal would in the same territories, and the season has
 * to keep 88% of its audience from one episode to the next; a streamed season has to be watched, over the weeks
 * counted, for 1.2 times the views a week at full appeal brings.
 */
export const OPENING_BAR = 0.4;
export const KEEP_BAR = 0.88;
export const STREAMING_BAR = 1.2;
/** A streamed season is judged once every episode is out and this many weeks have been reported from the last one's. */
export const STREAMING_WEEKS_COUNTED = 4;

export interface SeasonAudience {
  distributor: string;
  /** Every episode has been shown and its audience reported: there is nothing more to wait for. */
  complete: boolean;
  /** Whether what has been reported so far meets what a commissioner looks for. */
  renew: boolean;
  /** The figures and the bars they are held against, as a sentence. */
  says: string;
}

/** The deal a season is going out under on television or a streaming service: the first one accepted that reports an audience. */
export const airingDeal = (p: Project): DistributionOffer | null => p.offers.find((o) => o.status === 'accepted' && routeMetrics(o.route).length > 0) ?? null;

/** A season's audience as a commissioner reads it, or null while nothing has been reported. */
export function seasonAudience(p: Project, o: DistributionOffer, raise = 1): SeasonAudience | null {
  const a = o.audience ?? [];
  const n = (x: number) => Math.round(x).toLocaleString('en-US');
  const places = (t: number) => (t === 1 ? 'one territory' : `${t} territories`);
  if (o.route === 'broadcast') {
    const v = a.filter((x) => x.metric === 'viewers' && x.episode !== undefined).sort((x, y) => x.episode! - y.episode!);
    if (!v.length) return null;
    const first = v[0]; const last = v.at(-1)!;
    const bar = raise * OPENING_BAR * BROADCAST_BASE * Math.sqrt(Math.max(1, first.territories));
    const kept = v.length > 1 && first.value > 0 ? Math.pow(last.value / first.value, 1 / (v.length - 1)) : 1;
    return {
      distributor: o.distributor, complete: v.length >= p.episodes.length, renew: first.value >= bar && kept >= KEEP_BAR,
      says: `Its first showing on ${o.distributor} drew an average audience of ${n(first.value)}, against the ${n(bar)} a commissioner looks for in ${places(first.territories)}${v.length > 1 ? `, and it kept ${Math.round(kept * 100)}% of its audience from one episode to the next, against ${Math.round(KEEP_BAR * 100)}%` : ''}.`,
    };
  }
  const hours = a.filter((x) => x.metric === 'hours');
  if (!hours.length) return null;
  const shown = showingsOf(p, o);
  const opened = shown[0]?.date;
  const runtimeHours = shown.reduce((s, x) => s + x.runtimeMin / 60, 0);
  const total = hours.reduce((s, x) => s + x.value, 0);
  const through = runtimeHours > 0 ? total / runtimeHours : 0;
  const territories = hours.at(-1)!.territories;
  const bar = raise * STREAMING_BAR * STREAMING_BASE * Math.sqrt(Math.max(1, territories));
  const lastOut = opened ? weekOf(opened, shown.at(-1)!.date) : 1;
  return {
    distributor: o.distributor, complete: shown.length >= p.episodes.length && Math.max(...hours.map((x) => x.week)) >= lastOut + STREAMING_WEEKS_COUNTED - 1, renew: through >= bar,
    says: `On ${o.distributor} it was watched for ${n(total)} hours in ${hours.length} ${hours.length === 1 ? 'week' : 'weeks'}, which the service counts as ${n(through)} views of what is out, against the ${n(bar)} a commissioner looks for in ${places(territories)}.`,
  };
}
