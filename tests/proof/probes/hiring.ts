// Hiring and casting (hiring.ts): playing a part yourself, stepping out of it, letting someone go, taking back an offer.
import type { Probe } from '../probe';
import { castPlayer, releaseHire, uncastPlayer, withdrawOffer } from '../../../src/engine/hiring';
import { approvedCharacters } from '../../../src/engine/projects';
import type { GameState, Project } from '../../../src/engine/types';

const lead = (p: Project) => approvedCharacters(p)[0];
/** Cast yourself in the first part, before anyone is offered it (casting runs each day; this runs before money is raised). */
const castSelf = (s: GameState, p: Project) => { const c = lead(p); if (c && !p.cast.some((x) => x.characterId === c.id)) castPlayer(s, p, c.id, 'on-camera'); };
/** Once: on the first day the project has its cast, step out of your own part, so it's cast with someone else. */
const stepOut = () => { const done = new WeakSet<Project>(); return (s: GameState) => { for (const p of s.projects.filter((x) => !x.delivered && !done.has(x))) { const c = lead(p); if (c && p.cast.some((x) => x.characterId === c.id && x.performer === 'player')) { uncastPlayer(p, c.id); done.add(p); } } }; };
/** Once per project: release the first crew member who accepted, on the day they do. */
const releaseFirst = () => { const done = new WeakSet<Project>(); return (s: GameState) => { for (const p of s.projects.filter((x) => !x.delivered && !done.has(x))) { const h = p.hires.find((x) => x.status === 'accepted' && x.kind === 'crew'); if (h) { releaseHire(s, p, h.id); done.add(p); } } }; };
/** Once per project: withdraw the first open offer to a performer. */
const withdrawFirst = () => { const done = new WeakSet<Project>(); return (s: GameState) => { for (const p of s.projects.filter((x) => !x.delivered && !done.has(x))) { const h = p.hires.find((x) => x.status === 'offered' && x.characterId); if (h) { withdrawOffer(s, p, h.id); done.add(p); } } }; };

const measure = (_s: GameState, projects: Project[]) => ({
  playerParts: projects.reduce((a, p) => a + p.cast.filter((c) => c.performer === 'player').length, 0),
  released: projects.reduce((a, p) => a + p.hires.filter((h) => h.status === 'released').length, 0),
  // A withdrawn offer is kept as declined (hiring.ts withdrawOffer).
  withdrawn: projects.reduce((a, p) => a + p.hires.filter((h) => h.status === 'declined' && h.characterId).length, 0),
  offersMade: projects.reduce((a, p) => a + p.hires.length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'cast-yourself',
    features: ['action:hiring.castPlayer'],
    decision: 'Play the lead part yourself, instead of casting someone',
    reads: ['src/engine/hiring.ts#castPlayer', 'src/engine/production/shoot.ts#runShootDay'],
    variant: { decide: castSelf },
    measure,
    bites: ['playerParts', 'castRates'],
    downstream: ['spent', 'standing.acting', 'overall', 'money'],
  },
  {
    id: 'uncast-yourself',
    features: ['action:hiring.uncastPlayer'],
    decision: 'Step out of the lead part you cast yourself in, so it is cast with someone else',
    reads: ['src/engine/hiring.ts#uncastPlayer'],
    base: { decide: castSelf },
    variant: { decide: castSelf, daily: stepOut() },
    measure,
    bites: ['playerParts'],
    downstream: ['castRates', 'spent', 'standing.acting', 'overall'],
  },
  {
    id: 'release-hire',
    features: ['action:hiring.releaseHire'],
    decision: 'Let go the first crew member who accepts, on the day they accept',
    reads: ['src/engine/hiring.ts#releaseHire'],
    variant: { daily: releaseFirst() },
    measure,
    bites: ['released'],
    downstream: ['offersMade', 'spent', 'quality.craft', 'daysToDeliver'],
  },
  {
    id: 'withdraw-offer',
    features: ['action:hiring.withdrawOffer'],
    decision: 'Take back the first offer made to a performer before they answer',
    reads: ['src/engine/hiring.ts#withdrawOffer'],
    variant: { daily: withdrawFirst() },
    measure,
    bites: ['withdrawn'],
    downstream: ['offersMade', 'castRates', 'spent', 'daysToDeliver'],
  },
];
