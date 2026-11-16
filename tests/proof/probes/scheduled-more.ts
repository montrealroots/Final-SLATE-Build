// More of the systems that run as time passes, each switched off in a career where it runs (tests/proof/probe.ts
// `disable`). Each is built on a proof that already plays the career where the system fires, with its measure: Guide
// Me running the writing, a writer's days, waking from a night's sleep, a studio's release, a buyer's answer to a
// licence proposal, a work permit's decision, a season's episodes going out, a first-look deal's end and the industry's
// own series being decided.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { scheduled } from '../register';
import { acceptFirstLook, firstLooks } from '../../../src/engine/first-look';
import { approachAgent, signWith } from '../../../src/engine/representation';
import { acceptDeal, pitchToStudio, studioOptions } from '../../../src/engine/finance';
import { DAY, processUntil } from '../../engine-api';
import { STUDIOS as STUDIO_FIXTURES } from './career-wide';
import { feature } from './script';
import { personalPostings } from '../../../src/engine/personal';
import { agreedFunding, approve, writePitch } from '../../helpers';
import { continueProject } from '../../../src/engine/sequel';
import { addScene, updateScene } from '../../engine-api';
import { SERIES } from './scheduled';
import { unfunded } from '../career';
import { shelveProject } from '../../../src/engine/shelve';
import { approvedCharacters, makeOffer, roleCandidates } from '../../engine-api';
import { fund } from './casting';
import { RAINY, onLoggedWarning } from './weather';
import { STAYS_BASE, staysMeasure } from './stays';
import { PROBES as HELPERS } from './helpers-people';
import { PROBES as WRITING } from './writing';
import { PROBES as DAYS } from './day';
import { PROBES as STUDIOS } from './studios';
import { PROBES as RELEASE } from './release';
import { PROBES as PAPERS } from './papers';
import { PROBES as CAREER_WIDE } from './career-wide';
import { PROBES as SERIES_PROBES } from './series';

const HANDLER = Object.fromEntries(scheduled().map((f) => [f.name, f.module]));
const ALL = [...HELPERS, ...WRITING, ...DAYS, ...STUDIOS, ...RELEASE, ...PAPERS, ...CAREER_WIDE, ...SERIES_PROBES];

/** The kind switched off in the career the proof `from` plays (its variant), read by that proof's measure unless another is given. */
const offIn = (from: string, kind: string, decision: string, bites: string[], downstream: string[], o: { measure?: Probe['measure']; seeds?: number; over?: Probe['base'] } = {}): Probe => {
  const src = ALL.find((p) => p.id === from)!;
  const pol = { ...(src.variant ?? {}), ...(o.over ?? {}) };
  return {
    id: `off-${kind}`, features: [`scheduled:${kind}`], decision: `Switch off ${decision}`,
    reads: [`${HANDLER[kind]}#handler:${kind}`], disable: [kind], base: pol, variant: pol,
    measure: o.measure ?? src.measure, bites, downstream, ...(o.seeds ?? src.seeds ? { seeds: o.seeds ?? src.seeds } : {}),
  };
};
/** One career's own policy, with the kind switched off. */
const offOn = (base: Probe['base'], kind: string, decision: string, bites: string[], downstream: string[], measure: Probe['measure'], seeds?: number): Probe => ({
  id: `off-${kind}`, features: [`scheduled:${kind}`], decision: `Switch off ${decision}`,
  reads: [`${HANDLER[kind]}#handler:${kind}`], disable: [kind], base: base ?? {}, variant: base ?? {}, measure, bites, downstream, ...(seeds ? { seeds } : {}),
});

const episodes = (_s: GameState, projects: Project[]) => ({
  episodesOut: projects.reduce((a, p) => a + p.releases.reduce((b, r) => b + (r.episodes ?? []).filter((e) => e.status === 'released').length, 0), 0),
  audience: projects.reduce((a, p) => a + p.offers.flatMap((o) => o.audience ?? []).reduce((b, x) => b + (x.metric === 'views' ? 0 : x.value), 0), 0),
  renewalWait: projects.filter((p) => p.renewal && p.delivered).reduce((a, p) => a + (p.renewal!.decidedAt - p.delivered!.at) / 86_400_000, 0),
  renewed: projects.filter((p) => p.renewal?.outcome === 'renewed').length,
});
const deals = (s: GameState) => ({
  overheadPaid: personalPostings(s).filter((x) => x.kind === 'overhead').reduce((a, x) => a + x.amount, 0),
  firstLookEnded: firstLooks(s).filter((f) => f.status === 'ended' || f.status === 'ended-early').length,
  firstLookOffers: firstLooks(s).length,
});

// Letting the first offer go: each player below leaves the first offer unanswered and takes a later one. An offer that
// lapses frees the way; one that never does is still "offered" and holds it: an approach open blocks another agent
// approach (representation.ts approachRefusal), an open first-look offer blocks every other (first-look.ts
// firstLookCandidate), and a studio with the film in front of it can't be pitched it again (finance.ts studioOption).
/** Each day: approach Vale when no approach is open; leave the first offer unanswered, and sign any later one. */
const agentSecondTime = (s: GameState) => {
  const r = s.representation;
  if (r?.current) return;
  const offers = (r?.approaches ?? []).filter((a) => a.status !== 'asked' && a.status !== 'declined');
  const open = (r?.approaches ?? []).find((a) => a.status === 'offered');
  if (open && offers.length > 1) { try { signWith(s, open.agentId); } catch { /* not open */ } return; }
  try { approachAgent(s, 'vale'); } catch { /* one approach at a time */ }
};
const agentMeasure = (s: GameState) => ({
  represented: Number(!!s.representation?.current),
  viaAgent: (s.jobs ?? []).filter((j) => j.viaAgent).length,
  agentApproaches: (s.representation?.approaches ?? []).length,
});
/** Each day: the first first-look offer left to lapse, any later one signed. */
const firstLookSecond = (s: GameState) => {
  const all = firstLooks(s);
  const open = all.find((f) => f.status === 'offered');
  if (open && all.indexOf(open) > 0) try { acceptFirstLook(s, open.id); } catch { /* one running */ }
};
/** Before the money is raised: pitched to the studio that reads it best, its first offer left; once it lapses, a revised draft approved and pitched again, and that offer taken. */
const pitchTwice = (s: GameState, p: Project) => {
  const best = studioOptions(s, p).find((o) => !o.needs);
  if (!best) return;
  try { pitchToStudio(s, p, best.company); } catch { return; }
  for (let i = 0; i < 120; i++) {
    processUntil(s, s.now + DAY, 'tick', 1_000_000);
    const again = studioOptions(s, p).find((o) => o.company === best.company);
    const mine = (p.finance?.deals ?? []).filter((d) => d.kind === 'studio');
    const offered = mine.find((d) => d.status === 'offered');
    if (offered && mine.length > 1) { try { acceptDeal(s, p, offered.id); } catch { /* lapsed */ } return; }
    // It reads a project again only with a newer approved draft: the player approves a revised one, then pitches again.
    if (again && mine.length === 1 && mine[0].status === 'lapsed') { approve(s, p); try { pitchToStudio(s, p, best.company); } catch { /* not now */ } }
  }
};
const studioMeasure = (_s: GameState, projects: Project[]) => ({
  studioIn: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind === 'studio' && d.status === 'accepted').reduce((b, d) => b + d.amount, 0), 0),
  pitches: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind === 'studio').length, 0),
});

/**
 * A commissioned season continued the next year (sequel.ts continueProject), its four scenes written again; a season the
 * commissioner renewed comes with their offer to fund it, which is taken. The first year is the scheduled proofs' series.
 */
const nextSeason = (s: GameState, year: number): Project => {
  const prev = [...s.projects].reverse().find((x) => x.delivered && !x.continuedBy);
  if (year === 0 || !prev) return SERIES.project(s, year);
  const p = continueProject(s, prev, `Season ${year + 1}`);
  agreedFunding(p);
  writePitch(p);
  const mara = p.characters.find((c) => c.name === 'Mara')!.id;
  for (const [place, ep, ext] of [['Pier', 1, false], ['Quay', 1, true], ['Pier', 2, false], ['Quay', 2, true]] as const) {
    const x = addScene(s, p, ep);
    updateScene(p, x.id, { heading: { intExt: ext ? 'EXT' : 'INT', place, time: 'DAY' }, storyLocation: place, participants: [mara], objective: 'Move the story forward.', action: 'Action.', estMinutes: 3 } as never);
  }
  return unfunded(p);
};
const takeRenewal = (s: GameState, p: Project) => { for (const d of (p.finance?.deals ?? []).filter((x) => x.kind === 'commissioner' && x.status === 'offered')) try { acceptDeal(s, p, d.id); } catch { /* lapsed */ } };
const renewals = (_s: GameState, projects: Project[]) => ({
  renewed: projects.filter((p) => p.renewal?.outcome === 'renewed').length,
  renewalFunding: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind === 'commissioner' && d.status === 'accepted' && p.continues).reduce((b, d) => b + d.amount, 0), 0),
});

/** The first year's feature, its studio money taken, shelved before the shoot and never taken up: its deadline passes. */
const shelveFirst = (s: GameState, p: Project, year: number) => { if (year === 0) try { shelveProject(s, p); } catch { /* not shelvable */ } };
const deadlines = (_s: GameState, projects: Project[]) => ({
  breached: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.status === 'breached').length, 0),
  repaymentDue: projects.reduce((a, p) => a + p.obligations.filter((o) => o.ref?.startsWith('finance:') && /^Repay /.test(o.label)).reduce((b, o) => b + o.amount, 0), 0),
});
/** As pitch-to-studio: pitched, the answer waited for, the offer taken. */
const pitchOnce = (s: GameState, p: Project) => {
  const best = studioOptions(s, p).find((o) => !o.needs);
  if (!best) return;
  try { pitchToStudio(s, p, best.company); } catch { return; }
  for (let i = 0; i < 60; i++) {
    processUntil(s, s.now + DAY, 'tick', 1_000_000);
    const d = (p.finance?.deals ?? []).find((x) => x.kind === 'studio' && x.status === 'offered');
    if (d) { try { acceptDeal(s, p, d.id); } catch { /* lapsed */ } return; }
  }
};

/**
 * Funded, then each speaking part offered to the cheapest experienced adult at four fifths of their rate (they counter),
 * and ten days left without looking: a counteroffer is open for seven (hiring.ts COUNTER_OPEN_DAYS).
 */
const lowOffersLeft = (s: GameState, p: Project) => {
  fund(s, p);
  const pool = roleCandidates(s, p, 'actor').filter((x) => x.experience >= 3).sort((a, b) => a.dayRate - b.dayRate);
  approvedCharacters(p).filter((c) => c.roleSize !== 'background').forEach((c, i) => {
    const x = pool[i];
    if (x) try { makeOffer(s, p, { personId: x.id, roleId: 'actor', dayRate: Math.round(x.dayRate * 0.8), characterId: c.id, method: 'on-camera' }); } catch { /* clash */ }
  });
  processUntil(s, s.now + 10 * DAY, 'tick', 1_000_000);
};
const counters = (_s: GameState, projects: Project[]) => ({
  countersTaken: projects.reduce((a, p) => a + p.hires.filter((h) => h.characterId && h.counterRate !== undefined && h.status === 'accepted').length, 0),
});

export const PROBES: Probe[] = [
  offOn({ decide: lowOffersLeft }, 'counter-lapse', 'an unanswered counteroffer lapsing', ['countersTaken'], ['castRates', 'hired'], counters),
  // A studio's money is repaid if its film isn't delivered within STUDIO_DELIVERY_DAYS (finance.ts), seven hundred and twenty.
  offOn({ years: 3, studios: STUDIO_FIXTURES, project: feature(), decide: pitchOnce, beforeShoot: shelveFirst }, 'finance-deadline', 'backers\' delivery deadlines', ['breached'], ['repaymentDue'], deadlines),
  // A commissioner renews about one season in four here, so a hundred careers.
  offOn({ ...SERIES, years: 3, project: nextSeason, decide: takeRenewal }, 'season-decision', 'commissioners deciding on another season', ['renewed'], ['renewalFunding', 'ownIn'], renewals, 100),
  offOn({ years: 3, daily: agentSecondTime }, 'agent-offer-lapse', 'an agent\'s unanswered offer lapsing', ['represented'], ['viaAgent', 'jobsOffered'], agentMeasure),
  offOn({ years: 4, studios: STUDIO_FIXTURES, daily: firstLookSecond }, 'first-look-lapse', 'an unanswered first-look offer lapsing', ['firstLookActive'], ['overheadPaid', 'money'], (s) => ({ ...deals(s), firstLookActive: firstLooks(s).filter((f) => f.status !== 'offered' && f.status !== 'lapsed' && f.status !== 'declined').length, overheadPaid: personalPostings(s).filter((x) => x.kind === 'overhead').reduce((a, x) => a + x.amount, 0) })),
  offOn({ years: 3, studios: STUDIO_FIXTURES, project: feature(), decide: pitchTwice }, 'finance-offer-lapse', 'a backer\'s unanswered offer lapsing', ['studioIn'], ['ownIn', 'money'], studioMeasure),
  // Guide Me hires the writers when it is given the writing; its days are each pass it runs (mandates.ts runMandate).
  offIn('guide-me-writing', 'guide-me', 'Guide Me running the writing it was given', ['writingPasses'], ['quality.script', 'spent']),
  offIn('writing-polish', 'writing-day', 'a hired writer\'s working days', ['passesAccepted'], ['quality.script', 'spent']),
  offIn('sleep-through-call', 'wake', 'waking up from a night\'s sleep', ['lateDays'], ['quality.direction', 'overall']),
  // The call checks you are there for the day (asleep, away, at a plan, or without the right to work): a day you miss
  // starts late without you. Until November 15, 2026 this was measured on a career that never missed one.
  offIn('sleep-through-call', 'shoot-call', 'shoot days checking you are there', ['lateDays'], ['quality.direction', 'overall']),
  // The warning is how a player who doesn't read forecasts learns of the rain; until November 15, 2026 this was measured
  // on a career that never acted on it.
  offOn({ ...RAINY, daily: onLoggedWarning }, 'weather-check', 'the warning of rain on an exterior shoot', ['lostDays'], ['daysToDeliver', 'spent'], undefined, 60),
  // A studio's release earns for the studio (its deal): what the player's film gets is its run and how it is received.
  offIn('pitch-to-studio', 'studio-release', 'a backing studio releasing the film', ['released'], ['gross', 'reception']),
  offIn('licence-proposal', 'release-licence-answer', 'buyers answering a licence proposal', ['licenceDeals'], ['revenue', 'money']),
  // An emerging deal runs twelve months (first-look.ts TIER_MONTHS): four years, so most careers' deals reach their end.
  offIn('first-look-accept', 'first-look-end', 'a first-look deal reaching its end', ['firstLookEnded'], ['overheadPaid', 'money'], { measure: deals, over: { years: 4 } }),
  // Episodes on dates of their own (the episode-dates proof's four-week move), so each goes out by this system.
  offIn('episode-dates', 'episode-release', 'a season\'s episodes going out', ['episodesOut'], ['audience', 'renewalWait'], { measure: episodes }),
  // A visit's last day watched (papers.ts, from November 16, 2026): past it in the United States, the overstay voids the
  // travel authorization and closes the Visa Waiver Program, so the next trip needs a visa first.
  offOn(STAYS_BASE, 'stay-limit', 'a visit\'s last day being watched', ['overstays'], ['usVisas', 'papersPaid', 'secondTripDays'], staysMeasure, 20),
];
