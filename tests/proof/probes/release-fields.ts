// The Release Plan's own fields, each changed on the plan the player runs themselves (release.ts selfRelease): where it
// goes, when it first goes out, how long festivals hold it, and whether it is dubbed abroad. And the release the
// career plans when the film is finished (career.ts): its route and territories.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { setReleasePlan } from '../../../src/engine/release-plan';
import { addDaysToKey, dateKey } from '../../../src/engine/time';
import { plan, selfRelease } from './release';

const R = (label: string) => `field:ReleasePlan.tsx#"${label}"#1`;
const SELF = { takeDistribution: false };
const today = (s: GameState) => dateKey(s.now, 'Europe/London');
/** Kept for festivals until `days` from now, with the public release that day: distribution offers that would release it sooner can't be taken (finish.ts festivalHold). */
const holdFor = (days: number) => (s: GameState, p: Project) => {
  setReleasePlan(s, p, plan(s, { routes: ['festival-first', 'transactional'], festivalUntil: addDaysToKey(today(s), days), date: addDaysToKey(today(s), days) }));
};

export const PROBES: Probe[] = [
  { id: 'plan-territories', features: [R('Plan Territories')], decision: 'Sell your own release in Britain, the United States and Australia rather than Britain alone', reads: ['src/engine/release-plan.ts#releaseYourself'],
    // The stores' fees are a share of what it earns, so more territories cost nothing more up front (4 careers).
    base: { ...SELF, afterDelivery: selfRelease() }, variant: { ...SELF, afterDelivery: selfRelease({ territories: ['GB', 'US', 'AU'] }) }, bites: ['revenue'], downstream: ['money'] },
  { id: 'first-public-date', features: [R('First Public Date')], decision: 'Put your own release out a year after it is finished rather than in twenty days', reads: ['src/engine/release-plan.ts#releaseYourself'],
    base: { ...SELF, afterDelivery: selfRelease() }, variant: { ...SELF, afterDelivery: (s, p) => selfRelease({ date: addDaysToKey(today(s), 365) })(s, p) }, bites: ['revenue'], downstream: ['money'] },
  { id: 'festival-hold', features: [R('Held For Festivals Until')], decision: 'Hold the film for festivals for a year, as distribution offers come in', reads: ['src/engine/finish.ts#festivalHold', 'src/engine/finish.ts#acceptDistribution'],
    base: { afterDelivery: holdFor(14) }, variant: { afterDelivery: holdFor(365) }, bites: ['distributed'], downstream: ['revenue', 'money'] },
  // An English film released in France: dubbed, the player pays for the French version (finish.ts setReleaseVersion).
  { id: 'version-dubbed', features: [R('Version Abroad')], decision: 'Dub your own release in France rather than subtitle it', reads: ['src/engine/release-plan.ts#releaseYourself', 'src/engine/finish.ts#dubbingCost'],
    base: { ...SELF, afterDelivery: selfRelease({ territories: ['FR'] }) }, variant: { ...SELF, afterDelivery: selfRelease({ territories: ['FR'], version: 'dubbed' }) }, bites: ['spent'], downstream: ['money', 'revenue'] },
];
