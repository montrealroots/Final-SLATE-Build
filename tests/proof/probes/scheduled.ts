// The systems that run as time passes: each kind of event a played career runs (docs/v10/census.json), switched off in
// the variant (tests/proof/probe.ts `disable`). The falsifiability test at its plainest: with the system gone, does the
// career turn out differently, at once and later?
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { enterEverything } from './awards';
import { askAll, checkClaims, doc } from './documentary';
import { audition, castBest, fund } from './casting';
import { bankMeasures } from './bank';
import { firstLooks } from '../../../src/engine/first-look';
import { industryStanding } from '../../../src/engine/productions';
import { scheduled } from '../register';
import { unfunded } from '../career';
import { buildProject } from '../../helpers';
import { financeSummary, trackRecord } from '../../../src/engine/finance';
import { acceptDistribution } from '../../../src/engine/finish';
import { STUDIOS, answerFirstLooks } from './career-wide';
import { answer as answerOpportunities } from './opportunities';
import { personalPostings } from '../../../src/engine/personal';

/** Where each kind's handler is, so a proof reads (and is hashed against) the system it switches off. */
const HANDLER = Object.fromEntries(scheduled().map((f) => [f.name, f.module]));

const measure = (s: GameState, projects: Project[]) => {
  const mine = s.editions.flatMap((ed) => ed.entries.filter((e) => projects.some((p) => p.id === e.projectId)));
  return {
    ...bankMeasures(s),
    entries: mine.length,
    selected: mine.filter((e) => ['selected', 'nominated', 'won', 'mention'].includes(e.status)).length,
    won: mine.filter((e) => e.status === 'won').length,
    decided: mine.filter((e) => ['won', 'lost', 'mention', 'not-selected', 'not-nominated', 'nominated', 'selected'].includes(e.status)).length,
    finalised: mine.filter((e) => ['won', 'lost', 'mention'].includes(e.status)).length,
    // How backers weigh your record (finance.ts trackRecord): its bonus to a backer's yes, which a win raises.
    backerBonus: trackRecord(s).bonus,
    screenings: s.editions.reduce((a, ed) => a + (ed.screenings ?? []).filter((sc) => projects.some((p) => p.id === sc.projectId)).length, 0),
    offers: projects.reduce((a, p) => a + p.offers.length, 0),
    editionsOpen: s.editions.filter((e) => e.status !== 'upcoming').length,
    firstLookOffers: firstLooks(s).length,
    opportunities: (s.opportunities ?? []).length,
    openOpportunities: (s.opportunities ?? []).filter((o) => (o as { status?: string }).status === 'open' || (o as { status?: string }).status === 'offered').length,
    openOffers: (s.jobs ?? []).filter((j) => j.status === 'offered').length,
    industryStanding: industryStanding(s),
    productionsChanged: (s.productions ?? []).filter((p) => p.cancelled || (p.delayedDays ?? 0) > 0).length,
    jobsCancelled: (s.jobs ?? []).filter((j) => j.status === 'cancelled').length,
    overheadPaid: personalPostings(s).filter((x) => x.kind === 'overhead').reduce((a, x) => a + x.amount, 0),
    commissioned: (s.opportunities ?? []).filter((o) => (o as { status?: string }).status === 'accepted').length,
    // The commissioner's renewal decision: days after delivery it was made, and whether it renewed (continuation.ts).
    renewalWait: projects.filter((p) => p.renewal && p.delivered).reduce((a, p) => a + (p.renewal!.decidedAt - p.delivered!.at) / 86_400_000, 0),
    renewed: projects.filter((p) => p.renewal?.outcome === 'renewed').length,
    aired: projects.filter((p) => p.offers.some((o) => o.status === 'accepted' && (o.route === 'broadcast' || o.route === 'streaming'))).length,
    productionResults: Object.values(s.productions ?? {}).filter((p) => (p as { result?: unknown }).result).length,
  };
};

const AWARDS = { years: 3, daily: enterEverything };
/** As AWARDS, with films made to win: cast from auditions and rehearsed eight days, so prizes come often enough to follow. */
const AWARDS_STRONG = { ...AWARDS, decide: (s: GameState, p: Project) => { p.schedule.rehearsalDays = 8; fund(s, p); audition(s, p); castBest(s, p); } };
/**
 * A commissioned two-episode limited series each year (a labelled fixture commissioner, as tests/audiences.test.ts's),
 * sold to whoever will air it: the only careers where a season's audience is read, for the commissioner's renewal
 * (continuation.ts season-decision). The career's short is never aired, so its audience weeks reached nothing.
 */
export const SERIES = {
  years: 2,
  takeDistribution: false,
  project: (s: GameState, year: number) => {
    const p = unfunded(buildProject(s, { title: `Season ${year + 1}`, format: 'limited-series', medium: 'live-action', scenario: 'micro', genres: ['drama'], episodes: 2, runtime: 20 }, [{ name: 'Mara', patch: { roleSize: 'lead' } }],
      [{ place: 'Pier', chars: ['Mara'], minutes: 3, extra: { episode: 1 } }, { place: 'Quay', intExt: 'EXT' as const, chars: ['Mara'], minutes: 3, extra: { episode: 1 } },
        { place: 'Pier', chars: ['Mara'], minutes: 3, extra: { episode: 2 } }, { place: 'Quay', intExt: 'EXT' as const, chars: ['Mara'], minutes: 3, extra: { episode: 2 } }]));
    const amount = Math.max(1, financeSummary(p).stillToRaise);
    (p.finance ??= { estimate: amount, target: amount, deals: [] }).deals.push({ id: `${p.id}-commission`, kind: 'commissioner', backer: 'A Broadcaster (Fixture)', amount, status: 'accepted', askedAt: s.now, reason: 'Labelled fixture: the season is commissioned.', received: amount, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null } });
    p.funding.fund += amount;
    return p;
  },
  /** Each day, the best open offer to air it (television or streaming) taken, as a commissioned season is sold. */
  daily: (s: GameState) => {
    for (const p of s.projects.filter((x) => x.delivered && !x.offers.some((o) => o.status === 'accepted'))) {
      for (const o of p.offers.filter((x) => x.status === 'open' && (x.route === 'broadcast' || x.route === 'streaming')).sort((a, b) => b.minimumGuarantee - a.minimumGuarantee)) { try { acceptDistribution(s, p, o.id); break; } catch { /* the next */ } }
    }
  },
};
const off = (kind: string, decision: string, bites: string[], downstream: string[], base: Probe['base'] = {}): Probe => ({
  id: `off-${kind}`, features: [`scheduled:${kind}`], decision: `Switch off ${decision}`,
  reads: [`${HANDLER[kind]}#handler:${kind}`], disable: [kind], base, variant: base, measure, bites, downstream,
});

/** A documentary short whose contributors are all asked for consent, one with approval over the cut (documentary.ts). */
const DOC = { project: doc, decide: askAll, beforeManage: checkClaims };

export const PROBES: Probe[] = [
  // Delivery waits on every contributor's answer, and on the cut being approved by one who has approval over it.
  { ...off('consent-response', 'contributors answering a request for consent', ['delivered'], ['revenue', 'money'], DOC), seeds: 20 },
  { ...off('contributor-cut', 'contributors answering the cut they were shown', ['delivered'], ['revenue', 'money'], DOC), seeds: 20 },
  off('edition-open', 'awards editions opening for entries', ['entries'], ['selected', 'money'], AWARDS),
  off('edition-deadline', 'entry deadlines closing', ['selected'], ['standing.producing', 'won'], AWARDS),
  // An edition's opening is when a selected film screens (awards-results.ts festivalOpens), and its screening is what
  // brings buyers; an announcement before it is what has the film selected by then. The results step announces anything
  // not yet announced, so neither was missed by what was decided (until November 14, 2026 these looked only there).
  off('edition-start', 'editions starting', ['screenings'], ['offers', 'distributed', 'revenue'], AWARDS),
  off('edition-announce', 'selections and nominations being announced', ['screenings'], ['offers', 'distributed', 'revenue'], AWARDS),
  // Results decide the prizes too (awards-results.ts decidePrizes), and a prize brings buyers' offers.
  // Films made to win (until November 14, 2026 the career's shorts won once in twenty careers, too seldom for what a win
  // brings to show): a win counts in the opportunities its film draws and the record a studio reads. Two hundred careers
  // left those too small to tell apart from none (November 15, 2026: backer bonus -0.003, its interval reaching 0); a
  // win is first an honour in the player's standing (reputation.ts HONOUR_SCORE, 95 against a selection's 70).
  { ...off('edition-results', 'results being decided', ['finalised', 'won'], ['standing.producing', 'standing.directing', 'backerBonus', 'opportunities', 'offers'], AWARDS_STRONG), seeds: 200 },
  off('editions-roll', 'next year\'s editions being made', ['editionsOpen'], ['entries', 'selected'], AWARDS),
  off('screening', 'awards screenings', ['logLines'], ['selected'], AWARDS),
  off('work-day', 'the production\'s working days', ['delivered'], ['revenue', 'money']),
  off('shoot-wrap', 'shoot days wrapping', ['delivered'], ['revenue', 'money']),
  off('offer-response', 'people answering your offers of work', ['hired'], ['delivered', 'revenue']),
  off('box-office-week', 'the weeks of a cinema run', ['gross'], ['revenue', 'money']),
  off('distribution-report', 'distributors reporting what a release earned', ['revenue'], ['money']),
  off('distribution-offer', 'distributors making offers', ['distributed'], ['revenue', 'money']),
  // On a commissioned series that airs: the weeks it is watched are what the commissioner decides another season on.
  { ...off('audience-week', 'the weeks a release is watched', ['renewalWait'], ['renewed'], SERIES), seeds: 40 },
  off('release', 'releases going out', ['released'], ['revenue', 'money']),
  off('job-offer', 'outside work being offered', ['jobsOffered'], ['jobPay', 'money']),
  off('job-day', 'outside work\'s working days', ['jobsDone'], ['jobPay', 'money']),
  off('job-lapse', 'unanswered outside work lapsing', ['openOffers'], ['jobsOffered'], { takeJobs: false }),
  // One in twenty productions is cancelled before it shoots and one in ten put back (productions.ts): rare, so 100 careers of three years.
  { ...off('production-confirm', 'industry productions being confirmed, cancelled or put back', ['productionsChanged'], ['jobsDone', 'jobPay', 'jobsCancelled'], { years: 3 }), seeds: 100 },
  // A production coming out is a result on your record (productions.ts); standing and offers follow from it.
  { ...off('production-release', 'industry productions coming out', ['productionResults'], ['industryStanding', 'jobsOffered', 'jobPay'], { years: 3 }), seeds: 60 },
  // With studios in the world and the player accepting what they offer (until November 14, 2026 this career had no
  // studios, so nobody could offer and switching the check off changed nothing).
  off('first-look-check', 'companies considering a first-look deal', ['firstLookOffers'], ['overheadPaid', 'money'], { years: 3, studios: STUDIOS, daily: answerFirstLooks('accept') }),
  // With the player taking what is offered: an opportunity nobody answers changes nothing (until November 14, 2026).
  off('opportunity', 'opportunities after well-received work', ['opportunities'], ['commissioned', 'money'], { daily: answerOpportunities('accept') }),
  off('opportunity-expire', 'unanswered opportunities expiring', ['openOpportunities'], ['opportunities']),
  off('finance-decision', 'backers deciding', ['backerIn', 'ownIn'], ['money']),
];
// finance-decision needs a career that asks backers.
PROBES.find((p) => p.id === 'off-finance-decision')!.base = { ownShare: 0 };
PROBES.find((p) => p.id === 'off-finance-decision')!.variant = { ownShare: 0 };
