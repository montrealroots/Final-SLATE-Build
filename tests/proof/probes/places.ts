// Where it's filmed (destinations.ts, locations-actions.ts): a place in the script filmed abroad rather than at the
// base, and a scouted place shot on a stage set built to match. Each changes what a day costs and what weather can stop.
import type { Probe } from '../probe';
import { setFilmedAt } from '../../../src/engine/destinations';
import { chooseSite } from '../../../src/engine/locations-actions';
import { scoutedPlaces } from '../../../src/engine/locations';
import { travelTo } from '../../../src/engine/state';
import { DAY, processUntil } from '../../engine-api';
import type { GameState, Project } from '../../../src/engine/types';

/** Every place of the script filmed in Paris (a citizen of France may work there: no papers needed), before approval's money is raised. */
const inParis = (_s: GameState, p: Project) => { for (const label of [...new Set(p.scenes.map((x) => x.storyLocation ?? x.heading.place))]) setFilmedAt(p, label, { placeId: 'fr-paris', kind: 'street' }); };
/** Each day: every place scouting has found sites for, shot on a stage set. */
const onStages = (s: GameState) => { for (const p of s.projects.filter((x) => !x.delivered)) for (const place of scoutedPlaces(p)) if (p.locationChoices?.[place]?.main !== 'stage') chooseSite(p, place, 'main', 'stage'); };

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
    variant: { decide: inParis, beforeShoot: (s) => { if (s.locationId !== 'fr-paris') { const at = travelTo(s, 'fr-paris'); processUntil(s, at + DAY, 'tick', 1_000_000); } } },
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
];
