// Real services' release routes (the owner's v7 package, REL01-REL08 and decision 4; from November 13, 2026). Each is a
// different door, as its own page described it when read: Netflix takes no unsolicited material, Prime Video separates a
// reviewed rent-or-buy submission from subscription licensing it solicits, Apple's stores take titles through an
// aggregator, YouTube pays nothing for an upload by itself, and Vimeo On Demand closed on November 20, 2026.
//
// What a film's standing with each says is worked out from the save: whether the player has an agent, whether the film
// was selected at a festival, whether it is delivered, and the date. None of it is a contract or a price: the game's own
// routes (release-plan.ts) are how a film is actually released, and each service names the one it would go through.
// Every policy was read on November 13, 2026, and what held before then isn't recorded; the card says so.
import platformRoutes from '../data/platform-routes.json';
import { representedBy } from './representation';
import type { GameState, PlanRoute, Project } from './types';

export interface PlatformRoute { id: string; company: string; route_type: string; source_id: string; requirements: string[]; current_policy_observed_on: string; policy_effective_to: string | null; source: { url: string; title: string; checked: string } }
export const PLATFORM_ROUTES = (platformRoutes as { routes: PlatformRoute[] }).routes;

export interface RouteStanding {
  route: PlatformRoute;
  /** open: the door is there for this film (not a promise it is accepted); needs: something is missing first; closed: not for it; unknown: no record of the policy then. */
  standing: 'open' | 'needs' | 'closed' | 'unknown';
  /** What the door is, in a sentence. */
  door: string;
  /** Why it stands so for this film. */
  why: string;
  /** The game's route a release through it would go by, or null. */
  inGame: PlanRoute | null;
}

/** Each real service's door for this film on `today` (YYYY-MM-DD in the player's calendar). */
export function routeStandings(state: GameState, p: Project, today: string): RouteStanding[] {
  const agent = representedBy(state);
  const selected = state.editions.some((e) => e.entries.some((x) => x.projectId === p.id && (x.status === 'selected' || x.status === 'nominated' || x.status === 'won')));
  const delivered = !!p.delivered;
  const one = (id: string, s: Omit<RouteStanding, 'route'>): RouteStanding => ({ route: PLATFORM_ROUTES.find((r) => r.id === id)!, ...s });
  const vimeoEnd = PLATFORM_ROUTES.find((r) => r.id === 'vimeo_legacy')!.policy_effective_to!;
  return [
    one('netflix_pitch', {
      door: 'Netflix takes no unsolicited material: a representative it already knows must submit it.',
      standing: agent ? 'open' : 'needs',
      why: agent ? `${agent.agent.name} represents you and can submit it. Netflix may still pass.` : 'You have no agent. Find one on your Profile first.',
      inGame: 'streaming-licence',
    }),
    one('netflix_festival', {
      door: 'Netflix also acquires films it sees at festivals and other established venues.',
      standing: selected ? 'open' : 'needs',
      why: selected ? 'It was selected at a festival, where buyers see it. Nobody is obliged to make an offer.' : 'A festival selection first: that is where it can be seen.',
      inGame: 'festival-first',
    }),
    one('prime_tvod', {
      door: 'Prime Video Direct takes rent-and-buy submissions with no submission fee, then reviews each for licensing.',
      standing: delivered ? 'open' : 'needs',
      why: delivered ? 'It can be submitted. Publication is at Prime Video\'s discretion, with no date promised, and a title can be removed after review. Delivery still costs money.' : 'Deliver it first.',
      inGame: 'transactional',
    }),
    one('prime_svod', {
      door: 'Prime Video\'s subscription licensing is by its invitation only, a different door from rent and buy.',
      standing: 'closed',
      why: 'No invitation has come. Uploading for rent and buy doesn\'t put a film on the subscription service.',
      inGame: null,
    }),
    one('apple_transactional', {
      door: 'Apple\'s stores take films through an approved aggregator or a direct agreement, delivered by an approved encoding house, with each storefront\'s language assets.',
      standing: delivered ? 'open' : 'needs',
      why: delivered ? 'Through your aggregator, as the Transactional Digital route does. The aggregator is paid by Apple first and pays you after.' : 'Deliver it first.',
      inGame: 'transactional',
    }),
    one('youtube', {
      door: 'Anyone can upload to YouTube; earning from ads needs the Partner Program: 1,000 subscribers and 4,000 public watch hours in a year, or 10 million Shorts views in 90 days, then a review.',
      standing: delivered ? 'open' : 'needs',
      why: delivered ? 'It can be uploaded, but an upload earns nothing by itself, and this game doesn\'t keep a channel for you.' : 'Deliver it first.',
      inGame: 'direct',
    }),
    one('vimeo_legacy', today >= vimeoEnd
      ? { door: 'Vimeo On Demand was a storefront where sellers kept 90% after transaction costs.', standing: 'closed', why: `It closed on November 20, 2026.`, inGame: null }
      : today >= '2026-11-13'
        ? { door: 'Vimeo On Demand is a storefront where sellers keep 90% after transaction costs.', standing: 'closed', why: 'It is closing on November 20, 2026, and has taken no new sellers since September 21. Vimeo points new sellers to Vimeo OTT.', inGame: null }
        // When the closure was announced isn't recorded, so before the page was read nothing of it is shown.
        : { door: 'Vimeo On Demand is a storefront where sellers keep 90% after transaction costs.', standing: 'unknown', why: 'Its terms before November 13, 2026 aren\'t recorded.', inGame: 'direct' }),
  ];
}
