// The systems that run as time passes: each kind of event a played career runs (docs/v10/census.json), switched off in
// the variant (tests/proof/probe.ts `disable`). The falsifiability test at its plainest: with the system gone, does the
// career turn out differently, at once and later?
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { enterEverything } from './awards';
import { bankMeasures } from './bank';
import { firstLooks } from '../../../src/engine/first-look';
import { scheduled } from '../register';

/** Where each kind's handler is, so a proof reads (and is hashed against) the system it switches off. */
const HANDLER = Object.fromEntries(scheduled().map((f) => [f.name, f.module]));

const measure = (s: GameState, projects: Project[]) => {
  const mine = s.editions.flatMap((ed) => ed.entries.filter((e) => projects.some((p) => p.id === e.projectId)));
  return {
    ...bankMeasures(s),
    entries: mine.length,
    selected: mine.filter((e) => ['selected', 'nominated', 'won', 'mention'].includes(e.status)).length,
    editionsOpen: s.editions.filter((e) => e.status !== 'upcoming').length,
    firstLookOffers: firstLooks(s).length,
    opportunities: (s.opportunities ?? []).length,
    openOffers: (s.jobs ?? []).filter((j) => j.status === 'offered').length,
    productionResults: Object.values(s.productions ?? {}).filter((p) => (p as { result?: unknown }).result).length,
  };
};

const AWARDS = { years: 3, daily: enterEverything };
const off = (kind: string, decision: string, bites: string[], downstream: string[], base: Probe['base'] = {}): Probe => ({
  id: `off-${kind}`, features: [`scheduled:${kind}`], decision: `Switch off ${decision}`,
  reads: [`${HANDLER[kind]}#handler:${kind}`], disable: [kind], base, variant: base, measure, bites, downstream,
});

export const PROBES: Probe[] = [
  off('edition-open', 'awards editions opening for entries', ['entries'], ['selected', 'money'], AWARDS),
  off('edition-deadline', 'entry deadlines closing', ['selected'], ['money'], AWARDS),
  off('edition-deadline-soon', 'the reminder a deadline is near', ['logLines'], ['entries'], AWARDS),
  off('edition-start', 'editions starting', ['selected'], ['money'], AWARDS),
  off('edition-announce', 'selections and nominations being announced', ['selected'], ['money', 'opportunities'], AWARDS),
  off('edition-results', 'results being decided', ['selected'], ['opportunities', 'money'], AWARDS),
  off('editions-roll', 'next year\'s editions being made', ['editionsOpen'], ['entries', 'selected'], AWARDS),
  off('screening', 'awards screenings', ['logLines'], ['selected'], AWARDS),
  off('screening-reminder', 'the reminder a screening is near', ['logLines'], ['selected'], AWARDS),
  off('work-day', 'the production\'s working days', ['delivered'], ['revenue', 'money']),
  off('shoot-call', 'shoot days being called', ['shootDays', 'delivered'], ['revenue', 'money']),
  off('shoot-wrap', 'shoot days wrapping', ['delivered'], ['revenue', 'money']),
  off('weather-check', 'the weather on shoot days', ['lostDays'], ['daysToDeliver', 'spent']),
  off('offer-response', 'people answering your offers of work', ['hired'], ['delivered', 'revenue']),
  off('box-office-week', 'the weeks of a cinema run', ['gross'], ['revenue', 'money']),
  off('distribution-report', 'distributors reporting what a release earned', ['revenue'], ['money']),
  off('distribution-offer', 'distributors making offers', ['distributed'], ['revenue', 'money']),
  off('audience-week', 'the weeks a release is watched', ['revenue'], ['money']),
  off('release', 'releases going out', ['released'], ['revenue', 'money']),
  off('job-offer', 'outside work being offered', ['jobsOffered'], ['jobPay', 'money']),
  off('job-day', 'outside work\'s working days', ['jobsDone'], ['jobPay', 'money']),
  off('job-lapse', 'unanswered outside work lapsing', ['openOffers'], ['jobsOffered']),
  off('production-confirm', 'industry productions being confirmed', ['jobsOffered'], ['jobPay', 'money']),
  off('production-release', 'industry productions coming out', ['productionResults'], ['jobsOffered', 'offeredDayRate']),
  off('first-look-check', 'companies considering a first-look deal', ['firstLookOffers'], ['money']),
  off('opportunity', 'opportunities after well-received work', ['opportunities'], ['money', 'delivered']),
  off('opportunity-expire', 'unanswered opportunities expiring', ['opportunities'], ['money']),
  off('finance-decision', 'backers deciding', ['backerDeals', 'ownIn'], ['money']),
  off('finance-offer-lapse', 'backers\' unanswered offers lapsing', ['backerDeals'], ['ownIn', 'money'], { ownShare: 0 }),
  off('birthday', 'birthdays', ['logLines'], ['money']),
];
// finance-decision needs a career that asks backers.
PROBES.find((p) => p.id === 'off-finance-decision')!.base = { ownShare: 0 };
PROBES.find((p) => p.id === 'off-finance-decision')!.variant = { ownShare: 0 };
