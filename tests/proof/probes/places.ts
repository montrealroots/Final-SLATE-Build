// Where it's filmed (destinations.ts, locations-actions.ts): a place in the script filmed abroad rather than at the
// base, and a scouted place shot on a stage set built to match. Each changes what a day costs and what weather can stop.
import type { Probe } from '../probe';
import { setFilmedAt } from '../../../src/engine/destinations';
import { chooseSite } from '../../../src/engine/locations-actions';
import { scoutedPlaces } from '../../../src/engine/locations';
import { travelTo } from '../../../src/engine/state';
import { DAY, processUntil } from '../../engine-api';
import type { GameState, Project } from '../../../src/engine/types';
import { putInOwnMoney } from '../../../src/engine/personal';
import { requiredCrewPlan } from '../../../src/engine/hiring';
import { ledgerTotals } from '../../../src/engine/budget';
import { setPlannedBudget } from '../../../src/engine/project-budget';
import { financeSummary } from '../../../src/engine/finance';

/** Every place of the script filmed in Paris (a citizen of France may work there: no papers needed), before approval's money is raised. */
const inParis = (_s: GameState, p: Project, kind: 'street' | 'station' = 'street') => { for (const label of [...new Set(p.scenes.map((x) => x.storyLocation ?? x.heading.place))]) setFilmedAt(p, label, { placeId: 'fr-paris', kind }); };
/**
 * Each day: when the crew still to hire costs more than is uncommitted, the planned budget raised by the difference and
 * that much put in from your own money. The staffing screen asks to "raise the rest" (hiring.ts proposeStaffing), but a
 * target already promised takes no more money (personal.ts putInRefusal: "nothing left to raise") until the planned
 * budget is raised (project-budget.ts setPlannedBudget), which is the player's way through.
 */
const topUp = (s: GameState, p: Project) => {
  if (p.delivered) return;
  const short = Math.ceil(requiredCrewPlan(s, p).filter((x) => !x.noCandidate).reduce((a, x) => a + x.cost, 0) - ledgerTotals(p).available);
  if (short <= 0) return;
  try {
    setPlannedBudget(s, p, (financeSummary(p).target + short) * 100, 'The crew costs more than is uncommitted.');
    putInOwnMoney(s, p, financeSummary(p).stillToRaise);
  } catch { /* not allowed now */ }
};
const toParis = (s: GameState) => { if (s.locationId !== 'fr-paris') { const at = travelTo(s, 'fr-paris'); processUntil(s, at + DAY, 'tick', 1_000_000); } };
/** Each day: every place scouting has found sites for, shot on a stage set. */
const onStages = (s: GameState) => { for (const p of s.projects.filter((x) => !x.delivered)) for (const place of scoutedPlaces(p)) if (p.locationChoices?.[place]?.main !== 'stage') chooseSite(p, place, 'main', 'stage'); };
/**
 * Each day: every scouted place shot at the cheaper stand-in, with the real place as its backup or with none. A place
 * whose site fell through with no backup gets the next site not lost, the next day, as a player would choose one.
 */
const standIn = (backup: boolean) => (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered)) for (const place of scoutedPlaces(p)) {
    const rec = p.locationChoices?.[place];
    try {
      if (!rec?.main) chooseSite(p, place, 'main', (['standin', 'real', 'stage'] as const).find((id) => !rec?.lost?.includes(id))!);
      if (backup && !p.locationChoices![place].lost?.length && p.locationChoices![place].backup !== 'real') chooseSite(p, place, 'backup', 'real');
    } catch { /* not now */ }
  }
};

const measure = (_s: GameState, projects: Project[]) => ({
  filmedAway: projects.reduce((a, p) => a + Object.values(p.locationChoices ?? {}).filter((c) => c.at).length, 0),
  onStage: projects.reduce((a, p) => a + Object.values(p.locationChoices ?? {}).filter((c) => c.main === 'stage').length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'filmed-abroad',
    features: ['action:destinations.setFilmedAt'],
    decision: 'Film every place in the script in Paris rather than at the London base',
    reads: ['src/engine/destinations.ts#setFilmedAt', 'src/engine/production/shoot.ts#runShootDay', 'src/engine/production/schedule.ts#prepWorkingDays'],
    // The player goes to Paris for the shoot, as a director would.
    variant: { decide: (s, p) => inParis(s, p), beforeShoot: (s) => { if (s.locationId !== 'fr-paris') { const at = travelTo(s, 'fr-paris'); processUntil(s, at + DAY, 'tick', 1_000_000); } } },
    measure,
    bites: ['filmedAway'],
    downstream: ['spent', 'daysToDeliver', 'lostDays', 'money'],
  },
  {
    id: 'stage-sets',
    features: ['action:locations-actions.chooseSite'],
    decision: 'Shoot every scouted place on a stage set built to match',
    reads: ['src/engine/locations-actions.ts#chooseSite', 'src/engine/locations.ts#siteFactor'],
    variant: { daily: onStages },
    measure,
    bites: ['onStage'],
    downstream: ['spent', 'lostDays', 'daysToDeliver', 'money'],
  },
  // What kind of site it is decides its fee, how long the permit takes and how often noise spoils a day (destinations.ts
  // SITE_KINDS): a rail station against a street, both in Paris. The career raises its money once, to the estimate,
  // which doesn't follow where it is filmed; the station's dearer days left no crew affordable, and without a new
  // planned budget and the money for it, the shoot was lost day after day (4 careers, November 15, 2026: 697 days lost
  // and nothing delivered). Both arms top up the same way.
  {
    id: 'site-station', features: ['field:FilmedAt.tsx#"Kind Of Site"#1'],
    decision: 'Film every place in Paris at a rail station rather than on a street',
    reads: ['src/engine/destinations.ts#kindFee', 'src/engine/destinations.ts#permitWork', 'src/engine/destinations.ts#noisyDay'],
    base: { decide: (s, p) => inParis(s, p), beforeShoot: toParis, beforeManage: topUp }, variant: { decide: (s, p) => inParis(s, p, 'station'), beforeShoot: toParis, beforeManage: topUp }, measure,
    bites: ['daysToDeliver', 'ownIn'], downstream: ['spent', 'money'],
  },
  // The way through when the crew costs more than the money promised: a new planned budget, and the money for it.
  {
    id: 'new-planned-budget', features: ['field:PlanViews.tsx#"New Planned Budget (US Dollars)"#1'],
    decision: 'Raise the planned budget by what the crew still costs, and put that in, when filming at a Paris rail station',
    reads: ['src/engine/project-budget.ts#setPlannedBudget', 'src/engine/personal.ts#putInRefusal', 'src/engine/hiring.ts#proposeStaffing'],
    base: { decide: (s, p) => inParis(s, p, 'station'), beforeShoot: toParis }, variant: { decide: (s, p) => inParis(s, p, 'station'), beforeShoot: toParis, beforeManage: topUp }, measure,
    bites: ['ownIn', 'hired'], downstream: ['delivered', 'lostDays', 'revenue'],
  },
  // A site that falls through on the day goes to the backup, at its fee; with none the day is lost (locations.ts
  // siteOnTheDay). The stand-in falls through most often.
  {
    id: 'site-backup', features: ['field:PlanViews.tsx#{`Backup For ${place}`}#1'],
    decision: 'Keep the real place as the backup for each place shot at the cheaper stand-in, rather than none',
    reads: ['src/engine/locations.ts#siteOnTheDay', 'src/engine/locations-actions.ts#chooseSite'],
    base: { daily: standIn(false) }, variant: { daily: standIn(true) }, measure,
    bites: ['lostDays'], downstream: ['daysToDeliver', 'spent', 'money'],
  },
];
