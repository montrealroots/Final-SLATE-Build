// First-look deals with the studios the save's world follows (the owner's v5 brief, 5). Built November 13, 2026.
//
// What a first look is, from what was read before modelling it (industry explainers and encyclopedia entries, listed in
// docs/v5/FIRST-LOOK.md): a studio pays a producer's overhead, and sometimes a development fund, for the first chance to
// consider the projects the deal covers. It is not an option on one work (the right to buy one property's rights), not a
// distribution deal (one finished picture released), not an overall deal (the producer's services exclusively), and not
// a first refusal (the right to match an offer someone else has made). The producer must submit a covered project to the
// studio before taking it anywhere else, and the studio has a negotiated number of days to say yes or pass. On a pass the
// project goes into turnaround: the producer may set it up elsewhere, and any development money the studio spent on it is
// repaid when it is (a "burdened" turnaround). The deal runs for a term, is renewed or ends, and what was developed with
// its money stays bound by that after it ends.
//
// What the game does with that:
// - an offer comes from one followed studio, after delivered work it would want more of (genre fit with the studio's
//   recorded films, and how the work was received or what it won). Nothing arrives that the player didn't earn;
// - its terms follow the studio's recorded scale: term, days to consider, monthly overhead, development fund, and the
//   projects it covers (films; only animated films for a studio that makes little else). Amounts are game calibration;
// - nothing binds the player until they accept. They may ask once for more overhead, decline, or let it lapse;
// - one deal at a time. A covered project is submitted to the studio first, as a pitch it reads with its own days to
//   consider; while it has it, or before it has seen it, no other studio can be pitched it;
// - overhead is paid monthly into the player's company, or their own account if they have none;
// - development money goes into a covered project as a backer line; if another studio or a commissioner takes the
//   project after the first-look studio passed, it is repaid from what they put in, a line on the project's ledger;
// - the deal ends at its term (renewed if the studio took a project or the record still counts) or early, if the player
//   ends it. Submissions it has in hand are still answered; development money stays owed.
import { closeSettled, money, reserve, settle } from './budget';
import { deals, projectFamilies, trackRecord } from './finance';
import dealModel from '../data/deal-model.json';
import { postPersonal } from './personal';
import { postCompany } from './company';
import { FILM_FORMATS, TV_FORMATS } from './blueprints';
import { ANIMATION_HOUSE, FAMILY_AS_RECORDED, fitWeight, strategyOf, type StudioStrategy } from './strategy';
import { addLog, cancelEvents, newId, registerHandler, schedule } from './state';
import { DAY, formatDateKey } from './time';
import { asTelevision, type StudioProfile } from './studios';
import type { FinanceDeal, GameState, Project } from './types';

export interface FirstLookTerms {
  /** How long it runs from acceptance, in months of thirty days. */
  months: number;
  /** How long the studio has to answer a submission. */
  considerDays: number;
  /** Paid every month it runs. */
  overhead: number;
  /** Development money the player may put into covered projects, in total. */
  fund: number;
  /** Animated films only, for a studio that makes little else; otherwise any film. */
  animatedOnly: boolean;
  /**
   * What the deal covers: films, or series (the owner's v6 package, 04, "Film and television scope are separate"; from
   * November 13, 2026). Absent on deals made before then, which were all for films.
   */
  scope?: 'film' | 'television';
  /** The track record the terms were set for, and the yearly overhead they came from (from November 14, 2026). */
  tier?: DealTier;
  annualOverhead?: number;
  /**
   * An overall deal (from November 17, 2026; the owner's v8 package, 04, and A14): the studio has your services
   * exclusively, films and series both, and pays a guaranteed yearly sum for them, a twelfth a month, as your pay. Its
   * overhead is nothing: the guarantee isn't overhead, and its headline over the term is never paid at signing.
   */
  overall?: { annual: number };
}
export const scopeOf = (t: FirstLookTerms): 'film' | 'television' => t.scope ?? 'film';
const formatsOf = (scope: 'film' | 'television') => (scope === 'television' ? TV_FORMATS : FILM_FORMATS);
/** Whether a deal covers series: a television first look, or an overall deal, which covers both. */
export const coversSeries = (t: FirstLookTerms): boolean => scopeOf(t) === 'television' || !!t.overall;
/** What the player calls the deal. */
export const dealName = (t: FirstLookTerms): string => (t.overall ? 'overall deal' : 'first-look deal');
export interface FirstLook {
  id: string;
  /** Who its overhead is paid to: the company, for a deal signed while the player had one (save version 11); else you. */
  payee?: 'company';
  company: string;
  name: string;
  status: 'offered' | 'active' | 'declined' | 'lapsed' | 'ended' | 'ended-early';
  offeredAt: number;
  answerBy: number;
  terms: FirstLookTerms;
  /** Why the studio offered it, as it said. */
  why: string;
  startsAt?: number;
  endsAt?: number;
  /** The one request an offer allows (more overhead, or to match a rival's offer: `match`), and the answer. */
  counter?: { askedAt: number; answerAt: number; outcome?: 'agreed' | 'held'; match?: string };
  /** The other studio's offer made at the same time, to weigh against this one (from November 18, 2026). */
  competing?: string;
  /** The pitches made to it under the deal (finance.ts pitchToStudio), by deal id. */
  submissions: { projectId: string; dealId: string; at: number }[];
  /** Development money put into projects, by the backer line it made. */
  drawn: { projectId: string; dealId: string; amount: number }[];
  /** The deal this one renews. */
  renews?: string;
}

/** How long an offer stays open, and how long a studio takes to answer a request for more. */
export const FIRST_LOOK_OPEN_DAYS = 30;
export const FIRST_LOOK_COUNTER_DAYS = 7;
/** How long after a delivery studios have seen enough of it to make an offer. */
export const FIRST_LOOK_NOTICE_DAYS = 45;
/** What the work needs to have done for a studio to want more: received at least this well, or won something. */
export const FIRST_LOOK_RECEPTION = 60;
/** Fit below this, the studio wouldn't want the films the player makes. */
export const FIRST_LOOK_FIT = 0.1;
const MONTH = 30 * DAY;

export type DealTier = 'emerging' | 'proven' | 'established' | 'elite';
/**
 * Your track record as studios read it for a deal: delivered work, how it was received and what it won. Money is no part
 * of it: an inheritance buys things and not a studio's trust (the owner's v8 package, 02 and 04; A13).
 */
export function dealTier(state: GameState): DealTier {
  const r = trackRecord(state);
  const rec = r.reception ?? 0;
  if (r.works >= 8 && r.wins >= 3) return 'elite';
  if (r.works >= 4 && (rec >= 70 || r.wins >= 2)) return 'established';
  if (r.works >= 2 && (rec >= FIRST_LOOK_RECEPTION || r.wins >= 1)) return 'proven';
  return 'emerging';
}
const TIER_WORDS: Record<DealTier, string> = { emerging: 'a record that is just starting', proven: 'a record of work that has been received well', established: 'an established record', elite: 'one of the strongest records there is' };
/** Each tier's term (the package's termYears 1, 2, 3 and 5). */
export const TIER_MONTHS: Record<DealTier, number> = { emerging: 12, proven: 24, established: 36, elite: 60 };

/**
 * The terms a studio offers: the yearly overhead from the package's calibration for your tier (src/data/deal-model.json;
 * "original game calibration, not published company rates"), placed in its range by the studio's scale, and paid a
 * twelfth a month: a yearly amount is never multiplied twice. Until November 14, 2026 it was one of three monthly sizes
 * ($1,500, $3,500, $6,000) by scale alone.
 */
export function firstLookTerms(s: StudioStrategy, scope: 'film' | 'television' = 'film', tier: DealTier = 'emerging'): FirstLookTerms {
  // A film studio's scale is its films a year; a television deal's, the series the world follows that credit it.
  const big = scope === 'television' ? s.pace >= 30 : s.pace >= 8;
  const mid = scope === 'television' ? s.pace >= 10 : s.pace >= 3;
  const [lo, hi] = (dealModel.firstLookAnnualOverhead as Record<DealTier, [number, number]>)[tier];
  // Kept a multiple of $1,200 (a month in whole dollars) and never past its band: until November 18, 2026 the rounding
  // could put a large studio's offer above its tier's top (a $1m band offered $1,000,800).
  const annual = Math.min(bandTop(hi, 1200), Math.round((lo + (hi - lo) * (big ? 1 : mid ? 0.5 : 0)) / 1200) * 1200);
  return {
    months: TIER_MONTHS[tier], considerDays: big ? 90 : mid ? 60 : 30,
    overhead: annual / 12, fund: big ? 100_000 : mid ? 50_000 : 25_000,
    animatedOnly: scope === 'film' && s.animation >= ANIMATION_HOUSE && s.families[0]?.genre === 'Animation',
    ...(scope === 'television' ? { scope } : {}), tier, annualOverhead: annual,
  };
}

/**
 * An overall deal's terms, or null where a studio wouldn't offer one: only a studio of at least eight films a year, and
 * only for a record past its start (the package's calibration has no emerging band for overall deals). The guarantee is
 * the yearly figure for your tier (deal-model.json overallAnnualGuarantee, "original game calibration, not published
 * company rates"), placed in its range by the studio's scale, from eight films a year to thirty.
 */
export function overallTerms(s: StudioStrategy, tier: DealTier): FirstLookTerms | null {
  const range = (dealModel.overallAnnualGuarantee as Partial<Record<DealTier, [number, number]>>)[tier];
  if (!range || s.pace < 8) return null;
  const [lo, hi] = range;
  // Never past its band: until November 18, 2026 thirty films a year were offered $5,004,000 in a $5m band.
  const annual = Math.min(bandTop(hi, 12_000), Math.round((lo + (hi - lo) * Math.min(1, (s.pace - 8) / 22)) / 12_000) * 12_000);
  return { months: TIER_MONTHS[tier], considerDays: 90, overhead: 0, fund: 100_000, animatedOnly: false, tier, overall: { annual } };
}
/** A band's top in whole steps, never above it: the most a yearly figure in that band can be. */
const bandTop = (hi: number, step: number): number => Math.floor(hi / step) * step;
/** The most a studio pays a year under an overall deal for this tier: a request for more never goes past it. */
const overallCeiling = (tier: DealTier | undefined): number => bandTop(((dealModel.overallAnnualGuarantee as Partial<Record<DealTier, [number, number]>>)[tier ?? 'proven'] ?? [0, 0])[1], 12_000);

export const firstLooks = (state: GameState): FirstLook[] => state.firstLooks ?? [];
/** The overall deal running now, if the deal running is one. */
export const activeOverall = (state: GameState): FirstLook | null => { const fl = activeFirstLook(state); return fl?.terms.overall ? fl : null; };
export const activeFirstLook = (state: GameState): FirstLook | null => firstLooks(state).find((x) => x.status === 'active') ?? null;
export const openFirstLookOffer = (state: GameState): FirstLook | null => firstLooks(state).find((x) => x.status === 'offered') ?? null;
/** Every offer open now: one, or two studios bidding at once (from November 18, 2026). */
export const openFirstLookOffers = (state: GameState): FirstLook[] => firstLooks(state).filter((x) => x.status === 'offered');

/** Whether a deal's terms cover this project. */
export const covers = (fl: FirstLook, p: Project): boolean => (fl.terms.overall ? [...FILM_FORMATS, ...TV_FORMATS] : formatsOf(scopeOf(fl.terms))).includes(p.axes.format) && (!fl.terms.animatedOnly || p.axes.medium === 'animation');

/**
 * The first-look deal this project is bound to now, if any: the active deal if it covers it, or an ended one whose
 * development money it holds (that obligation survives the deal).
 */
export function bindingFor(state: GameState, p: Project): FirstLook | null {
  const active = activeFirstLook(state);
  if (active && covers(active, p) && (active.startsAt ?? 0) <= state.now) return active;
  return firstLooks(state).find((x) => x.drawn.some((d) => d.projectId === p.id)) ?? null;
}

/** Where a project stands with the deal it is bound to. */
export function submissionStanding(state: GameState, p: Project): { fl: FirstLook; stage: 'not-submitted' | 'considering' | 'offered' | 'taken' | 'turnaround'; deal?: FinanceDeal } | null {
  const fl = bindingFor(state, p);
  if (!fl) return null;
  const subs = fl.submissions.filter((x) => x.projectId === p.id);
  const deal = subs.length ? deals(p).find((d) => d.id === subs[subs.length - 1].dealId) : undefined;
  if (!deal) return { fl, stage: 'not-submitted' };
  if (deal.status === 'considering') return { fl, stage: 'considering', deal };
  if (deal.status === 'offered') return { fl, stage: 'offered', deal };
  if (deal.status === 'accepted' || deal.status === 'breached') return { fl, stage: 'taken', deal };
  return { fl, stage: 'turnaround', deal };
}

/**
 * Why another studio can't be pitched this project now, because of a first look (finance.ts studioOption), or ''. The
 * first-look studio itself is pitched as usual: that is the submission.
 */
export function firstLookHold(state: GameState, p: Project, company: string): string {
  const s = submissionStanding(state, p);
  if (!s || s.fl.company === company) return '';
  const deal = dealName(s.fl.terms);
  if (s.stage === 'not-submitted') return `Your ${deal} gives ${s.fl.name} the first chance at ${p.title}: submit it to them first.`;
  if (s.stage === 'considering') return `${s.fl.name} is considering it under your ${deal}, until ${dateOf(s.deal!.decideAt!)}.`;
  if (s.stage === 'offered') return `${s.fl.name} made an offer for it under your ${deal}: accept or refuse it first.`;
  if (s.stage === 'taken') return `${s.fl.name} took it under your ${deal}.`;
  return '';
}
// Written out, as the rest of the game writes dates (until November 14, 2026 these were ISO keys).
const dateOf = (t: number) => formatDateKey(new Date(t).toISOString().slice(0, 10));

/**
 * Why a commissioner can't be approached for this series now, because of a television first look, or ''. The deal's
 * company is asked first (finance.ts submitSeries); once it passes, the series is free to go to a commissioner.
 */
export function commissionerHold(state: GameState, p: Project): string {
  const s = submissionStanding(state, p);
  if (!s || !coversSeries(s.fl.terms)) return '';
  const deal = dealName(s.fl.terms);
  if (s.stage === 'not-submitted') return `Your ${deal} gives ${s.fl.name} the first chance at ${p.title}: submit it to them first.`;
  if (s.stage === 'considering') return `${s.fl.name} is considering it under your ${deal}, until ${dateOf(s.deal!.decideAt!)}.`;
  if (s.stage === 'offered') return `${s.fl.name} made an offer for it under your ${deal}: accept or refuse it first.`;
  if (s.stage === 'taken') return `${s.fl.name} commissioned it under your ${deal}.`;
  return '';
}

/** How long the first-look studio has to answer this project's submission, in days, or null if it isn't bound. */
export function considerDaysFor(state: GameState, p: Project, company: string): number | null {
  const fl = bindingFor(state, p);
  return fl && fl.company === company ? fl.terms.considerDays : null;
}

/** Record a pitch to the first-look studio as the project's submission under the deal. */
export function noteSubmission(state: GameState, p: Project, deal: FinanceDeal): void {
  const fl = bindingFor(state, p);
  if (!fl || !((deal.kind === 'studio' && deal.studio?.company === fl.company) || (deal.kind === 'commissioner' && deal.firstLook === fl.id))) return;
  fl.submissions.push({ projectId: p.id, dealId: deal.id, at: state.now });
}

// ---------------- Offers ----------------

/** The studio that would offer a first look now, and why, or null. Pure: the same save gives the same answer. */
export function firstLookCandidate(state: GameState, scope: 'film' | 'television' = 'film'): { company: string; strategy: StudioStrategy; why: string } | null {
  if (activeFirstLook(state) || openFirstLookOffer(state)) return null;
  return candidates(state, scope)[0] ?? null;
}
/** Every studio that would offer now, the best fit first. */
function candidates(state: GameState, scope: 'film' | 'television'): { company: string; strategy: StudioStrategy; why: string }[] {
  const record = trackRecord(state);
  if (!record.works || !(record.wins > 0 || (record.reception ?? 0) >= FIRST_LOOK_RECEPTION)) return [];
  // A television deal follows delivered series, a film deal delivered films: neither stands in for the other.
  const works = state.projects.filter((x) => x.delivered && x.quality && formatsOf(scope).includes(x.axes.format));
  if (!works.length) return [];
  // A studio declined or let lapse in the last year doesn't ask again yet.
  const recent = new Set(firstLooks(state).filter((x) => (x.status === 'declined' || x.status === 'lapsed') && state.now - x.answerBy < 365 * DAY).map((x) => x.company));
  // A television deal comes only from a company the series the world follows credit, read on those series; until
  // November 14, 2026 it was read on the company's films, so a film-only studio could offer one, and a company with a few
  // films a year (HBO) counted as too thin to read and won on the alphabet.
  const pool = (state.industry?.studios ?? []).filter((x) => x.name && !recent.has(x.c)).map((x) => (scope === 'television' ? asTelevision(x) : x)).filter((x): x is StudioProfile => !!x);
  // Studios too thin to read score alike (strategy.ts THIN_FIT): among equals, the one whose few credits are nearer the
  // work, then the larger record, comes first, and the name only after both (until November 14, 2026 the name came
  // straight after the fit, so a thin studio's genres never counted).
  const near = (profile: StudioProfile) => works.reduce((a, p) => {
    const names = projectFamilies(p).flatMap((f) => FAMILY_AS_RECORDED[f] ?? []);
    return a + strategyOf(profile).families.filter((f) => names.includes(f.genre)).reduce((n, f) => n + f.share, 0);
  }, 0) / works.length;
  return pool.map((profile) => {
    const fit = works.reduce((a, p) => a + fitWeight(profile, projectFamilies(p), p.axes.medium), 0) / works.length;
    return { profile, fit, near: near(profile) };
  }).filter((x) => x.fit >= FIRST_LOOK_FIT).sort((a, b) => b.fit - a.fit || b.near - a.near || b.profile.n - a.profile.n || a.profile.c.localeCompare(b.profile.c)).map((best) => {
    const strategy = strategyOf(best.profile);
    const led = strategy.families[0]?.genre;
    const kind = scope === 'television' ? 'series' : works.length === 1 ? 'film' : 'films';
    const why = `Your ${works.length === 1 ? kind : `${works.length} ${kind}`} sit${works.length === 1 ? 's' : ''} with what ${strategy.name} makes${led ? `, most of all ${led.toLowerCase()}` : ''}. ${record.wins ? `${record.wins === 1 ? 'The award' : `The ${record.wins} awards`} your work won counted.` : 'How well your work was received counted.'}`;
    return { company: best.profile.c, strategy, why };
  });
}

/** Make the offer, if a studio would. Nothing binds the player until they accept. */
export function offerFirstLook(state: GameState, renews?: FirstLook, scope: 'film' | 'television' = 'film'): FirstLook | null {
  const c = renews ? (() => { const p = state.industry?.studios?.find((x) => x.c === renews.company); return p ? { company: p.c, strategy: strategyOf(p), why: renews.submissions.some((x) => isTaken(state, x)) ? `${renews.name} took a project you submitted, and wants to keep going.` : 'Your record still counts with it, and it wants to keep going.' } : null; })() : firstLookCandidate(state, scope);
  if (!c) return null;
  // A renewal keeps the terms it renews; a new offer is set for your record now: an overall deal where the studio is
  // large enough and your record past its start (from November 17, 2026), otherwise a first look.
  const tier = dealTier(state);
  const kind = renews ? scopeOf(renews.terms) : scope;
  const fl = makeOffer(state, c, renews ? { ...renews.terms, ...(renews.terms.overall ? { overall: { ...renews.terms.overall } } : {}) } : overallTerms(c.strategy, tier) ?? firstLookTerms(c.strategy, scope, tier), renews);
  // A record past its start draws more than one studio (from November 18, 2026): the next studio that fits offers too,
  // at the same time and on its own terms, so the player can weigh them and ask one to match the other. A record just
  // starting gets the one offer, as before.
  if (tier !== 'emerging') {
    const r = candidates(state, kind).find((x) => x.company !== c.company);
    if (r) {
      const rival = makeOffer(state, { ...r, why: `${r.why} It knows ${c.strategy.name} has made you an offer.` }, overallTerms(r.strategy, tier) ?? firstLookTerms(r.strategy, kind, tier));
      fl.competing = rival.id;
      rival.competing = fl.id;
    }
  }
  return fl;
}
function makeOffer(state: GameState, c: { company: string; strategy: StudioStrategy; why: string }, terms: FirstLookTerms, renews?: FirstLook): FirstLook {
  const fl: FirstLook = {
    id: newId(state, 'fl'), company: c.company, name: c.strategy.name, status: 'offered', offeredAt: state.now, answerBy: state.now + FIRST_LOOK_OPEN_DAYS * DAY,
    terms, why: c.why, submissions: [], drawn: [], ...(renews ? { renews: renews.id } : {}),
  };
  (state.firstLooks ??= []).push(fl);
  schedule(state, fl.answerBy, 'first-look-lapse', { id: fl.id }, { attention: 'silent', priority: 60, id: `fl-lapse:${fl.id}` });
  addLog(state, terms.overall
    ? `${fl.name} offered you a${renews ? ' renewed' : 'n'} overall deal: ${money(terms.overall.annual)} a year for your services, paid monthly, for ${terms.months} months. It has all your films and series, and your work, exclusively. It is open for ${FIRST_LOOK_OPEN_DAYS} days.`
    : `${fl.name} offered you a${renews ? ' renewed' : ''} first-look deal: ${money(terms.overhead)} a month for ${terms.months} months, for the first chance at your ${coveredWords(terms)}. It is open for ${FIRST_LOOK_OPEN_DAYS} days.`, 'money', { route: { view: 'profile' } });
  return fl;
}
const isTaken = (state: GameState, s: FirstLook['submissions'][number]) => {
  const p = state.projects.find((x) => x.id === s.projectId);
  return !!p && deals(p).some((d) => d.id === s.dealId && (d.status === 'accepted' || d.status === 'breached'));
};

/**
 * A deal that covers series is renewed on how the series it commissioned did (the v6 package, J13: "the deal's renewal
 * judged on the series' results"; from November 17, 2026): once a commissioner has decided on one of them, a series
 * renewed keeps the deal and series all cancelled end it. A season you ended as planned says nothing either way. Until
 * then, or with no series it took decided, it is judged as every deal was before: a project taken, or a record that
 * counts. Null when no series it took has been decided.
 */
export function seriesJudgement(state: GameState, fl: FirstLook): { keep: boolean; why: string } | null {
  if (!fl.terms.overall && scopeOf(fl.terms) !== 'television') return null;
  const taken = fl.submissions.filter((x) => isTaken(state, x)).map((x) => state.projects.find((p) => p.id === x.projectId)!)
    .filter((p) => TV_FORMATS.includes(p.axes.format) && (p.renewal?.outcome === 'renewed' || p.renewal?.outcome === 'cancelled'));
  if (!taken.length) return null;
  const renewed = taken.find((p) => p.renewal!.outcome === 'renewed');
  return renewed
    ? { keep: true, why: `${renewed.title}, a series it commissioned under the deal, was renewed.` }
    : { keep: false, why: `${taken.map((p) => p.title).join(' and ')}, which it commissioned under the deal, ${taken.length > 1 ? 'weren\'t' : 'wasn\'t'} renewed.` };
}

/** What a deal covers, in a few words: "films", "animated films" or "series". */
export const coveredWords = (t: FirstLookTerms): string => (t.overall ? 'films and series' : scopeOf(t) === 'television' ? 'series' : t.animatedOnly ? 'animated films' : 'films');

/** Every term of a first-look offer, in the words shown before accepting. */
export function firstLookWords(fl: FirstLook): string[] {
  const t = fl.terms;
  if (t.overall) {
    return [
      `It runs ${t.months} months from the day you accept.`,
      `${fl.name} pays you ${money(t.overall.annual)} a year for your services, ${money(t.overall.annual / 12)} a month into your own account. That is ${money(t.overall.annual * t.months / 12)} over the term, paid as each month comes, never at signing. It is set for ${TIER_WORDS[t.tier ?? 'proven']}, and is the game's own calibration, not any studio's published rate.`,
      `Your services are ${fl.name}'s alone while it runs: no other company can hire you, and work offered by one can't be taken.`,
      `It covers the films and series you make while it runs. You submit each one to ${fl.name} before you take it anywhere else, and it has ${t.considerDays} days to answer. If it passes, you may take the project elsewhere.`,
      `Up to ${money(t.fund)} of development money for your projects, kept apart from your pay. If another studio or a commissioner later takes a project ${fl.name} passed on, what it put in is repaid from their money.`,
      'It ends at its term unless it is renewed. You may end it early: the pay stops, and what it has in hand is still answered.',
    ];
  }
  const tv = scopeOf(t) === 'television';
  return [
    `It runs ${t.months} months from the day you accept.`,
    `${fl.name} pays ${money(t.overhead)} a month toward your overhead, into your company's account if you have one, or your own.${t.annualOverhead ? ` That is ${money(t.annualOverhead)} a year, set for ${TIER_WORDS[t.tier ?? 'emerging']}; it pays for an office and development, not you, and is the game's own calibration, not any studio's published rate.` : ''}`,
    tv ? `It covers the series you make while it runs, not films. You submit each one to ${fl.name} before you take it to any commissioner.`
      : `It covers ${t.animatedOnly ? 'the animated films' : 'the films'} you make while it runs, not series. You submit each one to ${fl.name} before you pitch it to any other studio.`,
    `${fl.name} has ${t.considerDays} days to answer each one. If it passes, you may take the project elsewhere.`,
    `Up to ${money(t.fund)} of development money for covered projects. If another studio or a commissioner later takes a project it passed on, what it put in is repaid from their money.`,
    'It ends at its term unless it is renewed. You may end it early: the overhead stops, and what it has in hand is still answered.',
  ];
}

function offerOf(state: GameState, id: string): FirstLook {
  const fl = firstLooks(state).find((x) => x.id === id);
  if (!fl || fl.status !== 'offered' || state.now >= fl.answerBy) throw new Error('That offer is no longer open.');
  return fl;
}

/** Accept: the deal binds from today, its overhead paid monthly and its end scheduled. */
export function acceptFirstLook(state: GameState, id: string): void {
  const fl = offerOf(state, id);
  if (fl.counter && !fl.counter.outcome) throw new Error(`${fl.name} is considering the overhead you asked for. Wait for its answer.`);
  const other = activeFirstLook(state);
  if (other) throw new Error(`You already have ${other.terms.overall ? 'an overall' : 'a first-look'} deal with ${other.name}. End it first.`);
  fl.status = 'active';
  fl.startsAt = state.now;
  fl.endsAt = state.now + fl.terms.months * MONTH;
  cancelEvents(state, (e) => e.id === `fl-lapse:${fl.id}`);
  payOverhead(state, fl, 1);
  // Signing one turns down any other studio's offer still open: one deal at a time.
  for (const other of openFirstLookOffers(state)) {
    other.status = 'declined';
    cancelEvents(state, (e) => e.id === `fl-lapse:${other.id}` || e.id === `fl-counter:${other.id}`);
    addLog(state, `You turned down ${other.name}'s ${dealName(other.terms)} by signing with ${fl.name}.`, 'money', { route: { view: 'profile' } });
  }
  schedule(state, fl.endsAt, 'first-look-end', { id: fl.id }, { attention: 'notify', priority: 45, id: `fl-end:${fl.id}` });
  addLog(state, fl.terms.overall
    ? `You signed an overall deal with ${fl.name}. Your services are its alone, and your films and series go to it first, until ${dateOf(fl.endsAt)}.`
    : `You signed a first-look deal with ${fl.name}. Submit your ${coveredWords(fl.terms)} to it first until ${dateOf(fl.endsAt)}.`, 'money', { route: { view: 'profile' } });
}

export function declineFirstLook(state: GameState, id: string): void {
  const fl = offerOf(state, id);
  fl.status = 'declined';
  cancelEvents(state, (e) => e.id === `fl-lapse:${fl.id}` || e.id === `fl-counter:${fl.id}`);
  addLog(state, `You declined ${fl.name}'s ${dealName(fl.terms)}.`, 'money', { route: { view: 'profile' } });
}

/** Ask once for half as much overhead again. The studio answers in a week; the offer stays open until then. */
export function askMoreOverhead(state: GameState, id: string): void {
  const fl = offerOf(state, id);
  if (fl.counter) throw new Error('You have asked once already.');
  if (fl.terms.overall && fl.terms.overall.annual >= overallCeiling(fl.terms.tier)) throw new Error(`${fl.name} already offers the most it pays for ${TIER_WORDS[fl.terms.tier ?? 'proven']}.`);
  fl.counter = { askedAt: state.now, answerAt: state.now + FIRST_LOOK_COUNTER_DAYS * DAY };
  fl.answerBy = Math.max(fl.answerBy, fl.counter.answerAt + FIRST_LOOK_COUNTER_DAYS * DAY);
  cancelEvents(state, (e) => e.id === `fl-lapse:${fl.id}`);
  schedule(state, fl.answerBy, 'first-look-lapse', { id: fl.id }, { attention: 'silent', priority: 60, id: `fl-lapse:${fl.id}` });
  schedule(state, fl.counter.answerAt, 'first-look-counter', { id: fl.id }, { attention: 'notify', priority: 50, id: `fl-counter:${fl.id}` });
  addLog(state, fl.terms.overall
    ? `You asked ${fl.name} for ${money(raisedGuarantee(fl.terms))} a year. It will answer in about ${FIRST_LOOK_COUNTER_DAYS} days.`
    : `You asked ${fl.name} for ${money(Math.round(fl.terms.overhead * 1.5))} a month. It will answer in about ${FIRST_LOOK_COUNTER_DAYS} days.`, 'money', { route: { view: 'profile' } });
}

/** An offer's figure a year: the guarantee of an overall deal, the overhead of a first look. */
const yearly = (t: FirstLookTerms): number => (t.overall ? t.overall.annual : (t.annualOverhead ?? t.overhead * 12));
const figureWords = (t: FirstLookTerms): string => (t.overall ? `${money(t.overall.annual)} a year` : `${money(t.overhead)} a month`);
/** A studio matches a rival's offer up to a quarter above its own, never past its tier's top (the game's calibration). */
export const MATCH_REACH = 1.25;
const tierTop = (t: FirstLookTerms): number => (t.overall ? overallCeiling(t.tier) : bandTop(((dealModel.firstLookAnnualOverhead as Record<DealTier, [number, number]>)[t.tier ?? 'emerging'] ?? [0, 0])[1], 1200));

/** Why this offer can't be set against the other studio's, or null when it can. */
export function matchRefusal(state: GameState, fl: FirstLook): string | null {
  const rival = fl.competing ? firstLooks(state).find((x) => x.id === fl.competing) : undefined;
  if (!rival || rival.status !== 'offered' || state.now >= rival.answerBy) return 'No other studio has an offer open to set against it.';
  if (fl.counter) return 'You have asked once already.';
  if (!!fl.terms.overall !== !!rival.terms.overall || scopeOf(fl.terms) !== scopeOf(rival.terms)) return `${rival.name}'s is a different kind of deal: ${fl.name} can't match it.`;
  if (yearly(rival.terms) <= yearly(fl.terms)) return `${fl.name} already offers as much as ${rival.name}.`;
  return null;
}
/** Tell the studio about the other's higher offer and ask it to match. The one request the offer allows; answered in a week. */
export function askToMatch(state: GameState, id: string): void {
  const fl = offerOf(state, id);
  const why = matchRefusal(state, fl);
  if (why) throw new Error(why);
  const rival = firstLooks(state).find((x) => x.id === fl.competing)!;
  fl.counter = { askedAt: state.now, answerAt: state.now + FIRST_LOOK_COUNTER_DAYS * DAY, match: rival.id };
  fl.answerBy = Math.max(fl.answerBy, fl.counter.answerAt + FIRST_LOOK_COUNTER_DAYS * DAY);
  cancelEvents(state, (e) => e.id === `fl-lapse:${fl.id}`);
  schedule(state, fl.answerBy, 'first-look-lapse', { id: fl.id }, { attention: 'silent', priority: 60, id: `fl-lapse:${fl.id}` });
  schedule(state, fl.counter.answerAt, 'first-look-counter', { id: fl.id }, { attention: 'notify', priority: 50, id: `fl-counter:${fl.id}` });
  addLog(state, `You told ${fl.name} about ${rival.name}'s offer of ${figureWords(rival.terms)} and asked it to match. It will answer in about ${FIRST_LOOK_COUNTER_DAYS} days.`, 'money', { route: { view: 'profile' } });
}

/** What a request for more asks under an overall deal: half as much again, never past the tier's top. */
const raisedGuarantee = (t: FirstLookTerms): number => Math.min(overallCeiling(t.tier), Math.round(t.overall!.annual * 1.5 / 12_000) * 12_000);

/** End the deal early: the overhead stops; submissions in hand are still answered, and development money stays owed. */
export function endFirstLook(state: GameState, id: string): void {
  const fl = firstLooks(state).find((x) => x.id === id);
  if (!fl || fl.status !== 'active') throw new Error('That deal isn\'t running.');
  fl.status = 'ended-early';
  fl.endsAt = state.now;
  cancelEvents(state, (e) => e.id.startsWith(`fl-oh:${fl.id}:`) || e.id === `fl-end:${fl.id}`);
  addLog(state, `You ended your ${dealName(fl.terms)} with ${fl.name}. Its ${fl.terms.overall ? 'pay' : 'overhead'} stops.${fl.drawn.length ? ' The development money it put in is still repaid if another studio takes those projects.' : ''}`, 'money', { route: { view: 'profile' } });
}

function payOverhead(state: GameState, fl: FirstLook, month: number): void {
  // An overall deal's guarantee is your pay for your services, a twelfth of the year each month: a kind of its own, never
  // overhead, and never the term's headline paid at once (A14).
  if (fl.terms.overall) postPersonal(state, 'guarantee', fl.terms.overall.annual / 12, `Guarantee From ${fl.name}, Month ${month}`, `overall:${fl.id}:${month}`);
  if (fl.terms.overall) { scheduleNextMonth(state, fl, month); return; }
  const label = `Overhead From ${fl.name}, Month ${month}`;
  const key = `first-look:${fl.id}:${month}`;
  // Paid to the company only under a deal signed while the company held it (cash/migrate11.ts `payee`): the company left
  // play on November 14, 2026, and a deal made since pays you. No signed deal's payee is rewritten.
  if (fl.payee === 'company' && state.company) postCompany(state, 'overhead', fl.terms.overhead, label, key);
  else postPersonal(state, 'overhead', fl.terms.overhead, label, key);
  scheduleNextMonth(state, fl, month);
}
const scheduleNextMonth = (state: GameState, fl: FirstLook, month: number) => {
  if (month < fl.terms.months) schedule(state, state.now + MONTH, 'first-look-overhead', { id: fl.id, month: month + 1 }, { attention: 'silent', priority: 60, id: `fl-oh:${fl.id}:${month + 1}` });
};

/** Development money left under the deal. */
export const fundLeft = (fl: FirstLook): number => fl.terms.fund - fl.drawn.reduce((a, x) => a + x.amount, 0);

/** Why development money can't go into this project now, or null. */
export function developmentRefusal(state: GameState, p: Project, amount: number): string | null {
  const fl = activeFirstLook(state);
  if (!fl) return 'You have no first-look deal running.';
  if (!covers(fl, p)) return `Your deal with ${fl.name} doesn't cover ${p.title}.`;
  if (p.delivered) return 'This project is delivered.';
  const s = submissionStanding(state, p);
  if (s && s.stage !== 'not-submitted') return `${p.title} is already submitted to ${fl.name}.`;
  if (!(amount > 0) || !Number.isFinite(amount)) return 'Say how much to put in.';
  if (amount > fundLeft(fl)) return `The deal has ${money(fundLeft(fl))} of development money left.`;
  return null;
}

/** Put development money into a covered project: a backer line, repaid only if another studio later takes the project. */
export function drawDevelopment(state: GameState, p: Project, amount: number): FinanceDeal {
  const no = developmentRefusal(state, p, amount);
  if (no) throw new Error(no);
  const fl = activeFirstLook(state)!;
  const a = Math.round(amount);
  const d: FinanceDeal = {
    id: newId(state, 'fd'), kind: 'first-look', backer: fl.name, amount: a, status: 'accepted', askedAt: state.now, reason: `Development money under your first-look deal with ${fl.name}.`,
    received: a, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null, unspent: 'stays' },
  };
  (p.finance ??= { estimate: p.funding.fund, target: p.funding.fund, deals: [] }).deals.push(d);
  p.funding.fund += a;
  fl.drawn.push({ projectId: p.id, dealId: d.id, amount: a });
  addLog(state, `${fl.name} put ${money(a)} of development money into ${p.title}.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
  return d;
}

/**
 * A burdened turnaround (finance.ts acceptDeal): another studio or a commissioner took a project the first-look studio
 * passed on, so the development money the first-look studio put in is repaid from what arrived. Once.
 */
export function repayTurnaround(state: GameState, p: Project, by: FinanceDeal): void {
  if (by.kind !== 'studio' && by.kind !== 'commissioner') return;
  for (const fl of firstLooks(state)) {
    if (by.kind === 'studio' && by.studio?.company === fl.company) continue;
    if (by.kind === 'commissioner' && by.firstLook === fl.id) continue; // its own commission under the deal
    const owed = fl.drawn.filter((x) => x.projectId === p.id).reduce((a, x) => a + x.amount, 0);
    const ref = `turnaround:${fl.id}:${p.id}`;
    if (!owed || p.obligations.some((o) => o.ref === ref)) continue;
    const o = reserve(state, p, `Development Money Repaid To ${fl.name}`, 'finance', owed, ref);
    settle(state, p, o.id, owed, ref);
    closeSettled(p, o.id);
    p.history.push({ at: state.now, text: `${money(owed)} of development money was repaid to ${fl.name} when ${by.backer} took the project.` });
    addLog(state, `${money(owed)} from ${by.backer}'s money repaid ${fl.name}'s development money on ${p.title}.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
  }
}

/** After each delivery, studios that have seen it may offer a first look. */
export function scheduleFirstLookCheck(state: GameState, p: Project): void {
  schedule(state, state.now + FIRST_LOOK_NOTICE_DAYS * DAY, 'first-look-check', { after: p.id }, { attention: 'silent', priority: 70, id: `fl-check:${p.id}` });
}

registerHandler('first-look-check', (state, ev) => {
  // The delivery that prompted the check says which kind of deal a company would offer for it.
  const after = state.projects.find((x) => x.id === ev.payload.after);
  const fl = offerFirstLook(state, undefined, after && TV_FORMATS.includes(after.axes.format) ? 'television' : 'film');
  const rival = fl?.competing ? firstLooks(state).find((x) => x.id === fl.competing) : undefined;
  return fl ? { message: rival ? `${fl.name} and ${rival.name} each offered you a deal.` : `${fl.name} offered you a ${dealName(fl.terms)}.` } : { suppressInterrupt: true };
});
registerHandler('first-look-lapse', (state, ev) => {
  const fl = firstLooks(state).find((x) => x.id === ev.payload.id);
  if (!fl || fl.status !== 'offered') return { suppressInterrupt: true };
  fl.status = 'lapsed';
  addLog(state, `${fl.name}'s first-look offer lapsed unanswered.`, 'money', { route: { view: 'profile' } });
});
registerHandler('first-look-counter', (state, ev) => {
  const fl = firstLooks(state).find((x) => x.id === ev.payload.id);
  if (!fl || fl.status !== 'offered' || !fl.counter || fl.counter.outcome) return { suppressInterrupt: true };
  if (fl.counter.match) {
    // Matching a rival: up to a quarter above its own offer and within its tier's top, while the rival's offer is still open.
    const rival = firstLooks(state).find((x) => x.id === fl.counter!.match);
    const open = !!rival && rival.status === 'offered' && state.now < rival.answerBy;
    const target = rival ? yearly(rival.terms) : 0;
    const agreed = open && target <= Math.min(yearly(fl.terms) * MATCH_REACH, tierTop(fl.terms));
    fl.counter.outcome = agreed ? 'agreed' : 'held';
    if (agreed && fl.terms.overall) fl.terms = { ...fl.terms, overall: { annual: rival!.terms.overall!.annual } };
    else if (agreed) fl.terms = { ...fl.terms, overhead: rival!.terms.overhead, annualOverhead: yearly(rival!.terms) };
    const text = agreed ? `${fl.name} matched ${rival!.name}: ${figureWords(fl.terms)}.`
      : !open ? `${fl.name} kept its offer of ${figureWords(fl.terms)}: ${rival?.name ?? 'the other studio'}'s offer is no longer open. Its offer is still open.`
      : `${fl.name} won't match ${rival!.name}'s ${figureWords(rival!.terms)}: it is more than it will pay. It kept its offer of ${figureWords(fl.terms)}, still open.`;
    addLog(state, text, 'money', { route: { view: 'profile' } });
    return { message: text };
  }
  // It pays more for a record that counts for more than the offer already did: a win, or reception well above the bar.
  const r = trackRecord(state);
  const agreed = r.wins > 0 || (r.reception ?? 0) >= FIRST_LOOK_RECEPTION + 10;
  fl.counter.outcome = agreed ? 'agreed' : 'held';
  if (agreed && fl.terms.overall) fl.terms = { ...fl.terms, overall: { annual: raisedGuarantee(fl.terms) } };
  else if (agreed) { const overhead = Math.round(fl.terms.overhead * 1.5); fl.terms = { ...fl.terms, overhead, annualOverhead: overhead * 12 }; }
  const figure = fl.terms.overall ? `${money(fl.terms.overall.annual)} a year` : `${money(fl.terms.overhead)} a month`;
  const text = agreed ? `${fl.name} agreed to ${figure}.` : `${fl.name} kept its offer of ${figure}. It is still open.`;
  addLog(state, text, 'money', { route: { view: 'profile' } });
  return { message: text };
});
registerHandler('first-look-overhead', (state, ev) => {
  const fl = firstLooks(state).find((x) => x.id === ev.payload.id);
  if (!fl || fl.status !== 'active') return { suppressInterrupt: true };
  payOverhead(state, fl, Number(ev.payload.month));
  return { suppressInterrupt: true };
});
registerHandler('first-look-end', (state, ev) => {
  const fl = firstLooks(state).find((x) => x.id === ev.payload.id);
  if (!fl || fl.status !== 'active') return { suppressInterrupt: true };
  fl.status = 'ended';
  const r = trackRecord(state);
  const judged = seriesJudgement(state, fl);
  const keep = judged ? judged.keep : fl.submissions.some((x) => isTaken(state, x)) || r.bonus > 0;
  const deal = dealName(fl.terms);
  addLog(state, `Your ${deal} with ${fl.name} reached its end.${judged ? ` ${judged.why}` : ''}${keep ? '' : ' It isn\'t renewing it.'}`, 'money', { route: { view: 'profile' } });
  const again = keep ? offerFirstLook(state, fl) : null;
  return { message: again ? `${fl.name} offered to renew your ${deal}.` : `Your ${deal} with ${fl.name} ended.` };
});
