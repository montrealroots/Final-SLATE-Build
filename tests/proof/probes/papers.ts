// Papers: a work permit applied for, paid, decided and worked under, on a film shot abroad.
import type { Probe } from '../probe';
import { DAY, processUntil } from '../../engine-api';
import { setFilmedAt } from '../../../src/engine/destinations';
import { applications, applyForPermit, applyForVisa, heldFromAbroadCount, moveTo, visaCheck, workRight } from '../../../src/engine/papers';
import { travelRefusal, travelTo } from '../../../src/engine/state';
import { bankMeasures } from './bank';
import { bankSim } from '../../../src/engine/bankworld';
import { bankById } from '../../../src/engine/bankworld/content/banks';
import { defaultProject } from '../career';
import type { GameState, Project } from '../../../src/engine/types';

/** The film's places are filmed in Los Angeles, chosen before the script is approved (so its budget includes them), and the player is there for the shoot. */
const inLosAngeles = (_s: GameState, p: Project) => {
  for (const label of [...new Set(p.scenes.map((x) => x.storyLocation ?? x.heading.place))]) setFilmedAt(p, label, { placeId: 'us-los-angeles', kind: 'street' });
};
const abroad = (s: GameState, y: number) => { const p = defaultProject(s, y); inLosAngeles(s, p); return p; };
/**
 * The player goes to Los Angeles for the shoot: entering takes an authorization for a visitor on their passport (from
 * November 14, 2026, when travel began asking), applied for and waited on, unless a work visa there lets them in. A
 * refused authorization keeps them home, as it would.
 */
const travel = (s: GameState) => {
  if (s.locationId === 'us-los-angeles') return;
  if (visaCheck(s, 'US').ok) { const v = applyForVisa(s, 'US'); processUntil(s, v.decideAt + DAY, 'tick', 5_000_000); }
  if (travelRefusal(s, 'us-los-angeles')) return;
  const at = travelTo(s, 'us-los-angeles');
  processUntil(s, Math.max(at, s.now) + DAY, 'tick', 1_000_000);
};
/** The player applies for leave to direct in the United States and waits for the decision before the shoot. */
const permitFirst = (s: GameState, _p: Project) => {
  if (workRight(s, 'US', 'direct').can) return; // the second year's film: the first year's permit still runs
  const a = applyForPermit(s, 'US', 'direct');
  processUntil(s, a.decideAt + DAY, 'tick', 5_000_000);
};

/** Accounts open at a bank in France: the one moving opens, where the home bank's closing sends her money. */
const frenchAccounts = (s: GameState) => { const sim = bankSim(s.bank!); return sim.ledger.accountsOf(sim.universe.playerId).filter((a) => !a.nominal && !a.closedAt && a.bankId && bankById(a.bankId)?.iso === 'FR').length; };

const measure = (s: GameState, projects: Project[]) => ({
  lateDays: projects.reduce((a, p) => a + p.schedule.days.filter((d) => d.late).length, 0),
  permits: applications(s).filter((x) => x.kind === 'permit' && x.stage === 'issued').length,
});

export const PROBES: Probe[] = [
  {
    id: 'work-permit',
    seeds: 100,
    features: ['action:papers.applyForPermit', 'scheduled:papers-decision'],
    decision: 'Apply for leave to direct in the United States before shooting a film there',
    reads: ['src/engine/papers.ts#applyForPermit', 'src/engine/papers.ts#workRight', 'src/engine/production/shoot.ts#runShootDay'],
    // Two years: since travel asked for papers (November 14, 2026) the first trip waits on an authorization, and in one
    // year neither career delivered its film, so nothing later could move.
    base: { years: 2, project: abroad, beforeShoot: travel },
    variant: { years: 2, project: abroad, decide: permitFirst, beforeShoot: travel },
    measure,
    bites: ['permits', 'lateDays'],
    downstream: ['shootDays', 'daysToDeliver', 'spent', 'quality.direction', 'overall'],
  },
  {
    id: 'move-home',
    features: ['action:papers.moveTo'],
    decision: 'Move home from London to Paris on the first day (a citizen of France, so no visa is needed)',
    reads: ['src/engine/papers.ts#moveTo', 'src/engine/bankworld/systems/abroad.ts#heldFromAbroad', 'src/engine/production/shoot.ts#runShootDay'],
    variant: { daily: (s, day) => { if (day === 0) moveTo(s, 'fr-paris'); } },
    measure: (s) => ({ ...bankMeasures(s), heldAbroad: heldFromAbroadCount(s), livesInLondon: Number(s.character.livesIn === 'gb-london'), frenchAccounts: frenchAccounts(s) }),
    bites: ['livesInLondon', 'frenchAccounts'],
    downstream: ['bankFees', 'lostDays', 'overall', 'quality.direction', 'money', 'daysToDeliver'],
  },
];
