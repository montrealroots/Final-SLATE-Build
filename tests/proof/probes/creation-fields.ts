// The new game's own fields (Creation.tsx), each changed in the draft a career starts from (helpers.ts startLife): the
// date it starts, the holidays you keep, and how well you speak a language a part you play is written in.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { castPlayer } from '../../../src/engine/hiring';
import { OBSERVANCES } from '../../../src/engine/observances';
import { short } from './script';
import { CG } from './plan-fields';
import { schedule } from '../../../src/engine/state';
import { DAY } from '../../../src/engine/time';
import { measure as careerMeasure } from './score';

const C = (label: string) => `field:Creation.tsx#${label}#1`;
/** Before the money is raised: the player cast as the lead, on camera. */
export const castSelf = (s: GameState, p: Project) => { const c = p.characters.find((x) => x.name === 'Lead'); if (c && !p.cast.some((x) => x.characterId === c.id)) try { castPlayer(s, p, c.id, 'on-camera'); } catch { /* not castable */ } };
/** The default short written in French, its lead a French speaker. */
const FRENCH = short({ axes: { dialogueLanguages: ['fr'] }, lead: { languages: ['fr'] } });
/** startLife's languages (helpers.ts) with French at `level`. */
const french = (level: 'Fluent' | 'Basic') => ({ languages: [{ code: 'ja', proficiency: 'Fluent' as const }, { code: 'fr', proficiency: level }] });

/**
 * A labelled fixture: as shooting starts on the years in `years`, a broadcaster commissions the film for $20,000, to be
 * delivered `days` after that day or the money repaid (finance.ts finance-deadline). A deadline is where a date moved
 * by the calendar costs something; the careers have none of their own that falls near their delivery.
 */
const commissioned = (days: number, years: number[]) => (s: GameState, p: Project, y: number) => {
  if (!years.includes(y)) return;
  const deliverBy = s.now + days * DAY;
  const id = `${p.id}-deadline`;
  (p.finance ??= { estimate: 20_000, target: 20_000, deals: [] }).deals.push({ id, kind: 'commissioner', backer: 'A Broadcaster (Fixture)', amount: 20_000, status: 'accepted', askedAt: s.now, reason: 'Labelled fixture: commissioned with a delivery date.', received: 20_000, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy } });
  schedule(s, deliverBy, 'finance-deadline', { projectId: p.id, dealId: id }, { attention: 'notify', priority: 35 });
};
/** What the films' deadlines decided: breached, and what must be repaid for it. */
const deadlines = (s: GameState, projects: Project[]) => ({
  ...careerMeasure(s, projects),
  breached: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.status === 'breached').length, 0),
  repaymentDue: projects.reduce((a, p) => a + p.obligations.filter((o) => o.ref?.startsWith('finance:') && /^Repay /.test(o.label)).reduce((b, o) => b + o.amount, 0), 0),
});

export const PROBES: Probe[] = [
  // A life starts in a year from 2026 to 2050 (state.ts validateDraft): the world as it is then, its prices and people.
  { id: 'start-2040', features: [C('"Starting Date"')], decision: 'Start the career in January 2040 rather than January 2026', reads: ['src/engine/state.ts#newGame'],
    variant: { creation: { startDate: '2040-01-09' } }, measure: (s) => ({ year: new Date(s.now).getUTCFullYear() }),
    // At four careers the final balance was $355,000 higher, and nothing the films spent or earned moved measurably.
    bites: ['year'], downstream: ['money'] },
  // A holiday you keep is a day off wherever you work (production/schedule.ts isWorkingDay): on the 3D short, whose
  // animation runs for months, every holiday in the list.
  // With a delivery date to meet (a labelled commission, due 234.5 days after the first year's shoot starts, which the
  // 3D short meets in most careers keeping no holidays): every holiday kept puts it 7 to 14 days later, past the date.
  { id: 'observances-kept', features: [C('{o.name}')], decision: 'Keep every holiday the game lists, on the 3D short commissioned with a delivery date', reads: ['src/engine/production/schedule.ts#isWorkingDay', 'src/engine/observances.ts#observancesOn'],
    base: { project: CG, beforeShoot: commissioned(234.5, [0]) }, variant: { project: CG, beforeShoot: commissioned(234.5, [0]), creation: { observances: OBSERVANCES.map((o) => o.id) } }, measure: deadlines, bites: ['daysToDeliver'], downstream: ['breached', 'repaymentDue', 'money'] },
  // A part in a language you speak only a little is coached (production/language.ts personLanguagesFit).
  { id: 'french-basic', features: [C("{`${languageName(l.code)} Proficiency`}")], decision: 'Speak basic French rather than fluent, then play the French-speaking lead yourself', reads: ['src/engine/production/language.ts#personLanguagesFit'],
    base: { project: FRENCH, decide: castSelf, creation: french('Fluent') }, variant: { project: FRENCH, decide: castSelf, creation: french('Basic') }, bites: ['hired'], downstream: ['spent', 'ownIn'] },
  // The hour the clock starts on the first day (state.ts newGame).
  { id: 'start-evening', features: [C('"Starting Time"')], decision: 'Start the career at eight in the evening rather than eight in the morning', reads: ['src/engine/state.ts#newGame'],
    // The career's days run from the start, so each falls twelve hours later on the calendar (4 careers: 1.4 days sooner
    // delivered, the final balance lower).
    // With a delivery date to meet (a labelled commission, due 30.5 days after each shoot starts): the evening start
    // delivers a day sooner, inside it.
    base: { beforeShoot: commissioned(30.5, [0, 1]) }, variant: { creation: { startTime: '20:00' }, beforeShoot: commissioned(30.5, [0, 1]) }, measure: deadlines, bites: ['daysToDeliver'], downstream: ['breached', 'repaymentDue', 'money'] },
];
