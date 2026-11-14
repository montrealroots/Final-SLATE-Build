// Papers: a work permit applied for, paid, decided and worked under, on a film shot abroad.
import type { Probe } from '../probe';
import { DAY, processUntil } from '../../engine-api';
import { setFilmedAt } from '../../../src/engine/destinations';
import { applications, applyForPermit } from '../../../src/engine/papers';
import { travelTo } from '../../../src/engine/state';
import { approvedScenes } from '../../engine-api';
import type { GameState, Project } from '../../../src/engine/types';

/** The film's places are filmed in Los Angeles, and the player is there for the shoot. */
const inLosAngeles = (_s: GameState, p: Project) => {
  for (const label of [...new Set(approvedScenes(p).map((x) => x.storyLocation ?? x.heading.place))]) setFilmedAt(p, label, { placeId: 'us-los-angeles', kind: 'street' });
};
const travel = (s: GameState) => { if (s.locationId !== 'us-los-angeles') { const at = travelTo(s, 'us-los-angeles'); processUntil(s, Math.max(at, s.now) + DAY, 'tick', 1_000_000); } };
/** The player applies for leave to direct in the United States and waits for the decision before the shoot. */
const permitFirst = (s: GameState, p: Project) => {
  inLosAngeles(s, p);
  const a = applyForPermit(s, 'US', 'direct');
  processUntil(s, a.decideAt + DAY, 'tick', 5_000_000);
};

const measure = (s: GameState, projects: Project[]) => ({
  lateDays: projects.reduce((a, p) => a + p.schedule.days.filter((d) => d.late).length, 0),
  permits: applications(s).filter((x) => x.kind === 'permit' && x.stage === 'issued').length,
});

export const PROBES: Probe[] = [
  {
    id: 'work-permit',
    features: ['action:papers.applyForPermit', 'scheduled:papers-decision'],
    decision: 'Apply for leave to direct in the United States before shooting a film there',
    reads: ['src/engine/papers.ts#applyForPermit', 'src/engine/papers.ts#workRight', 'src/engine/production/shoot.ts#runShootDay'],
    base: { years: 1, decide: (s, p) => { inLosAngeles(s, p); }, beforeShoot: travel },
    variant: { years: 1, decide: permitFirst, beforeShoot: travel },
    measure,
    bites: ['permits', 'lateDays'],
    downstream: ['shootDays', 'daysToDeliver', 'spent', 'quality.direction', 'overall'],
  },
];
