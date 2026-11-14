// Equipment: a kit of your own instead of the rental house's package, bought, rented, serviced, sold and approved.
// The kit is completed the way the shop's own fixes say (equipment.ts `kitProblems`), so no probe picks gear by hand.
import type { Probe } from '../probe';
import { addToKit, buyGear, kitProblems, ownedGear, removeFromKit, sellGear, serviceGear, setPackageApproval } from '../../../src/engine/equipment';
import { SERVICE_BELOW } from '../../../src/engine/gear-catalog';
import type { GameState, Project } from '../../../src/engine/types';

/** Buys (or rents) what the kit lacks, problem by problem, until the shop's checks find nothing missing. */
function completeKit(s: GameState, p: Project, how: 'buy' | 'rent'): void {
  for (let i = 0; i < 20; i++) {
    const need = p.kit ? kitProblems(p)[0] : { fix: kitProblemsForEmpty() };
    if (!need) return;
    const gearId = need.fix[0];
    if (!gearId) return;
    if (how === 'buy') addToKit(s, p, { itemId: buyGear(s, gearId).id });
    else addToKit(s, p, { gearId });
  }
}
/** An empty kit's first need: a camera, as the shop lists them (kitProblems on a kit with nothing in it). */
const kitProblemsForEmpty = (): string[] => kitProblems({ kit: { items: [] } } as unknown as Project, [])[0].fix;

const owned = (s: GameState) => ownedGear(s).filter((g) => !g.sold).length;
const measure = (s: GameState, projects: Project[]) => ({
  gearOwned: owned(s),
  kitItems: projects.reduce((a, p) => a + (p.kit?.items.length ?? 0), 0),
  kitPostponed: projects.reduce((a, p) => a + p.schedule.days.filter((d) => d.status === 'lost' && /^Postponed: /.test(d.result ?? '') && !/weather/i.test(d.result ?? '')).length, 0),
  worn: ownedGear(s).filter((g) => !g.sold && g.condition < SERVICE_BELOW).length,
});
const buyKit = (s: GameState, p: Project) => completeKit(s, p, 'buy');
/** A labelled fixture: the kit bought second-hand, a few shoot days above its service point, so three short films wear it. */
const buyUsedKit = (s: GameState, p: Project) => { buyKit(s, p); for (const g of ownedGear(s)) g.condition = SERVICE_BELOW + 3; };
const reuseKit = (s: GameState, p: Project) => { for (const g of ownedGear(s).filter((x) => !x.sold)) addToKit(s, p, { itemId: g.id }); };
const rentKit = (s: GameState, p: Project) => completeKit(s, p, 'rent');

export const PROBES: Probe[] = [
  {
    id: 'own-kit',
    features: ['action:equipment.buyGear', 'action:equipment.addToKit'],
    decision: 'Buy a complete kit of your own and shoot on it, instead of hiring the rental house\'s package each day',
    reads: ['src/engine/equipment.ts#buyGear', 'src/engine/equipment.ts#addToKit', 'src/engine/production/shoot.ts#runShootDay'],
    variant: { decide: buyKit },
    measure,
    bites: ['gearOwned', 'kitItems'],
    downstream: ['spent', 'money', 'quality.craft', 'overall'],
  },
  {
    id: 'rent-kit',
    features: ['action:equipment.addToKit'],
    decision: 'Rent a complete kit item by item, instead of the rental house\'s package',
    reads: ['src/engine/equipment.ts#addToKit', 'src/engine/equipment.ts#kitDayRate', 'src/engine/production/shoot.ts#runShootDay'],
    variant: { decide: rentKit },
    measure,
    bites: ['kitItems'],
    downstream: ['spent', 'money', 'quality.craft', 'overall'],
  },
  {
    id: 'sell-gear',
    features: ['action:equipment.sellGear'],
    decision: 'Sell the kit you bought once the first film is delivered',
    reads: ['src/engine/equipment.ts#sellGear', 'src/engine/equipment.ts#resaleValue'],
    seeds: 30,
    base: { decide: (s, p, y) => { if (y === 0) buyKit(s, p); else for (const g of ownedGear(s).filter((x) => !x.sold)) addToKit(s, p, { itemId: g.id }); } },
    variant: {
      decide: (s, p, y) => { if (y === 0) buyKit(s, p); else rentKit(s, p); },
      afterDelivery: (s) => { for (const g of ownedGear(s).filter((x) => !x.sold)) { try { sellGear(s, g.id); } catch { /* booked or away: kept */ } } },
    },
    measure,
    bites: ['gearOwned'],
    downstream: ['money', 'spent'],
  },
  {
    id: 'service-gear',
    features: ['action:equipment.serviceGear'],
    decision: 'Service worn kit between films, or keep shooting on it',
    reads: ['src/engine/equipment.ts#serviceGear', 'src/engine/equipment.ts#dayKitProblems'],
    seeds: 30,
    base: { years: 3, decide: (s, p, y) => { if (y === 0) buyUsedKit(s, p); else reuseKit(s, p); } },
    variant: {
      years: 3,
      decide: (s, p, y) => { if (y === 0) buyUsedKit(s, p); else reuseKit(s, p); },
      daily: (s) => { for (const g of ownedGear(s).filter((x) => !x.sold && x.condition < SERVICE_BELOW && !(x.awayUntil && x.awayUntil > s.now))) { try { serviceGear(s, g.id); } catch { /* not now */ } } },
    },
    measure,
    bites: ['worn'],
    downstream: ['kitPostponed', 'lostDays', 'daysToDeliver', 'spent', 'money'],
  },
  {
    id: 'remove-from-kit',
    features: ['action:equipment.removeFromKit'],
    decision: 'Take the camera out of a kit you rented (the rental house\'s package approved for days the kit can\'t serve, in both)',
    reads: ['src/engine/equipment.ts#removeFromKit', 'src/engine/production/shoot.ts#runShootDay'],
    base: { decide: (s, p) => { rentKit(s, p); setPackageApproval(p, true); } },
    variant: { decide: (s, p) => { rentKit(s, p); removeFromKit(p, p.kit!.items[0].id); setPackageApproval(p, true); } },
    measure,
    bites: ['kitItems'],
    downstream: ['spent', 'money', 'quality.craft'],
  },
  {
    id: 'package-approval',
    features: ['action:equipment.setPackageApproval'],
    decision: 'Approve the rental house\'s package for the days a kit without a camera can\'t serve, or leave those days postponed',
    reads: ['src/engine/equipment.ts#setPackageApproval', 'src/engine/production/shoot.ts#runShootDay'],
    base: { decide: (s, p) => { rentKit(s, p); removeFromKit(p, p.kit!.items[0].id); } },
    variant: { decide: (s, p) => { rentKit(s, p); removeFromKit(p, p.kit!.items[0].id); setPackageApproval(p, true); } },
    measure,
    bites: ['kitPostponed'],
    downstream: ['lostDays', 'daysToDeliver', 'delivered', 'spent'],
  },
];
