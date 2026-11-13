// The Release Plan (the owner's v5 brief, 6; built November 13, 2026). What was read first, and what is left out, is in
// docs/v5/RELEASE-PLAN.md.
//
// Until then a delivered project waited for distributors to make offers, or was released "yourself" online, which earned
// nothing at all. Now the player plans:
// - the routes they intend, the territories, the date, a festival hold, the version abroad and the promotion;
// - and works each route as it works:
//   - a buyer (a distributor, a broadcaster, a streaming service) is sent a licence proposal, which it accepts,
//     counters or rejects in its own time, and a selective service only through a sales agent;
//   - the routes the player runs themselves (a booking partner's service deal, an aggregator to the stores, their own
//     storefront) have their own requirements and costs, and nobody to accept them.
// Every route ends as an accepted deal (DistributionOffer), so each one reports, settles, opens later windows and builds
// the record as a distributor's deal always did (distribution.ts, box-office.ts, audiences.ts).
// Buyers, the sales agent and the services are fictional; amounts are game calibration, labelled so where they show.
import { cancel, closeSettled, ledgerTotals, money, reserve, settle } from './budget';
import { heldTerritories } from './distribution';
import { DELIVERY_MATERIALS, DISTRIBUTORS, EXCLUSIVE_DAYS, festivalHold, planRelease, setReleaseVersion, subtitlingCost, versionRefusal } from './finish';
import { isEpisodic, isNonfiction } from './projects';
import { contentLevel, documentsNeeded } from './script-effects';
import { getPlace } from '../data/places';
import { countryName } from '../world/gazetteer/gazetteer';
import { addLog, newId, registerHandler, schedule } from './state';
import { DAY, addDaysToKey, dateKey, formatDateKey, isDateKey } from './time';
import type { BuyerRoute, DistributionOffer, GameState, LicenceProposal, PlanRoute, Project, ReleasePlan } from './types';

export const PLAN_ROUTES: Record<PlanRoute, { label: string; kind: 'festival' | 'buyer' | 'self'; how: string; films?: true }> = {
  'festival-first': { label: 'Festival-First', kind: 'festival', how: 'Festivals first, entered from the Festivals page: nothing is released publicly before the date you hold it for, so it can premiere there.' },
  'partner-theatrical': { label: 'Partner-Assisted Theatrical', kind: 'self', films: true, how: 'A booking partner books screens for you on a service deal. Nobody has to accept it, but you pay up front: the partner\'s fee and each territory\'s screen rental. You keep the film rental, less the partner\'s 10%.' },
  'distributor-sales': { label: 'Distributor Sales', kind: 'buyer', films: true, how: 'A licence proposal to a distributor, for its cinemas. It accepts, counters or rejects it. It pays a guarantee, and overages after its 35% fee.' },
  'broadcast-licence': { label: 'Broadcast Licence', kind: 'buyer', how: 'A licence proposal to a broadcaster. It accepts, counters or rejects it, and pays a licence fee.' },
  'streaming-licence': { label: 'Streaming Licence', kind: 'buyer', how: 'Selective streaming services take submissions only from distributors and sales agents they know, so a sales agent sends your proposal and takes 20% of the fee. You can\'t upload a film to one.' },
  transactional: { label: 'Transactional Digital', kind: 'self', how: 'Rent and buy in the digital stores, through an aggregator. The stores take files only from an approved encoding house, which the aggregator arranges for its fee. It needs your content declaration and captions in each territory\'s language. The stores keep 30% of each sale.' },
  direct: { label: 'Direct To Audience', kind: 'self', how: 'Your own storefront page, which needs a pitch and your content declaration. The storefront keeps 10%. Few people find it without promotion.' },
};
export const PLAN_ORDER: PlanRoute[] = ['festival-first', 'partner-theatrical', 'distributor-sales', 'broadcast-licence', 'streaming-licence', 'transactional', 'direct'];

/** The buyers each licence route can be proposed to. Fictional, as the game's distributors are. */
export const BUYERS: Record<BuyerRoute, string[]> = {
  'distributor-sales': DISTRIBUTORS,
  'broadcast-licence': ['Channel Meridian', 'Northern Broadcasting', 'Harbour Television', 'Public Screen Network'],
  'streaming-licence': ['Streamline Plus', 'Cobalt Stream', 'Night Owl Streaming', 'Open Field Online'],
};
export const SALES_AGENT = 'Wayfarer Sales';
export const AGENT_SHARE = 0.2;
/** The reception each kind of buyer works to, and how long it takes to answer. Game calibration. */
export const BUYER_BAR: Record<BuyerRoute, number> = { 'distributor-sales': 50, 'broadcast-licence': 55, 'streaming-licence': 65 };
export const ANSWER_DAYS: Record<BuyerRoute, number> = { 'distributor-sales': 21, 'broadcast-licence': 21, 'streaming-licence': 28 };
const RELEASE_ROUTE: Record<BuyerRoute, DistributionOffer['route']> = { 'distributor-sales': 'theatrical', 'broadcast-licence': 'broadcast', 'streaming-licence': 'streaming' };
/** What the routes you run yourself cost and keep. Game calibration. */
export const AGGREGATOR_FEE = 1_300;
export const PARTNER_FEE = 5_000;
export const SCREEN_RENTAL = 7_000;
export const SELF_SHARE: Record<'partner-theatrical' | 'transactional' | 'direct', number> = { 'partner-theatrical': 0.1, transactional: 0.3, direct: 0.1 };
const SELF_NAMES: Record<'partner-theatrical' | 'transactional' | 'direct', string> = {
  'partner-theatrical': 'Your Booking Partner', transactional: 'The Digital Stores, Through Your Aggregator', direct: 'Your Own Storefront',
};
const SELF_RELEASE: Record<'partner-theatrical' | 'transactional' | 'direct', DistributionOffer['route']> = { 'partner-theatrical': 'theatrical', transactional: 'digital', direct: 'digital' };

const todayOf = (state: GameState, p: Project) => dateKey(state.now, getPlace(p.axes.basePlaceId).zone);
const overlaps = (a: string[], b: string[]) => a.some((x) => b.includes(x));

/** The plan, or the one a project starts from: its home country, a month out, subtitled, no promotion. */
export function planOf(state: GameState, p: Project): ReleasePlan {
  return p.releasePlan ?? { routes: [], territories: [getPlace(p.axes.basePlaceId).country], date: addDaysToKey(todayOf(state, p), 30), festivalUntil: null, version: 'subtitled', promo: 0, proposals: [] };
}

/** Why this plan can't be set, or null. */
export function planRefusal(state: GameState, p: Project, plan: Omit<ReleasePlan, 'proposals'>): string | null {
  if (!p.delivered) return isEpisodic(p.axes.format) ? 'Deliver the season first.' : 'Deliver the project first.';
  if (!plan.routes.length) return 'Choose at least one route.';
  const films = plan.routes.find((r) => PLAN_ROUTES[r].films && isEpisodic(p.axes.format));
  if (films) return `${PLAN_ROUTES[films].label} is for films. A series goes to broadcasters, streaming services, or the stores and your own storefront.`;
  if (!plan.territories.length) return 'Choose at least one territory.';
  const unknown = plan.territories.find((t) => countryName(t) === t);
  if (unknown !== undefined) return `Choose countries by their two-letter codes, such as GB or US.${unknown ? ` ${unknown} isn't one.` : ''}`;
  if (!isDateKey(plan.date) || plan.date < todayOf(state, p)) return 'Choose a release date from today onward.';
  if (plan.routes.includes('festival-first') && (!plan.festivalUntil || !isDateKey(plan.festivalUntil) || plan.festivalUntil > plan.date)) return 'Say until when festivals hold it: a date on or before the release date.';
  if (!(plan.promo >= 0) || !Number.isFinite(plan.promo)) return 'Say how much promotion to pay for, or nothing.';
  return null;
}

/** Set the plan. Proposals already sent stay as they are. */
export function setReleasePlan(state: GameState, p: Project, plan: Omit<ReleasePlan, 'proposals'>): ReleasePlan {
  const no = planRefusal(state, p, plan);
  if (no) throw new Error(no);
  const routes = PLAN_ORDER.filter((r) => plan.routes.includes(r));
  p.releasePlan = { ...plan, routes, territories: [...new Set(plan.territories)], festivalUntil: routes.includes('festival-first') ? plan.festivalUntil : null, promo: Math.round(plan.promo), proposals: p.releasePlan?.proposals ?? [] };
  addLog(state, `You set ${p.title}'s Release Plan: ${routes.map((r) => PLAN_ROUTES[r].label).join(', ')}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  return p.releasePlan;
}

/** Days from today to the plan's date, at least the month a buyer needs to prepare. */
const leadDays = (state: GameState, p: Project, plan: ReleasePlan) =>
  Math.max(30, Math.round((Date.parse(plan.date) - Date.parse(todayOf(state, p))) / DAY));

/**
 * What a buyer of this kind would pay for these rights, by how the work was received, its length, the territories and
 * exclusivity, as distribution offers are priced (finish.ts 'distribution-offer', without its draw). Game calibration.
 */
export function buyerValue(p: Project, route: BuyerRoute, territories: string[], exclusive: boolean): number {
  const reception = p.quality?.reception ?? 0;
  const runtime = Math.min(1, (p.delivered?.runtimeMin ?? 0) / 90);
  const season = isEpisodic(p.axes.format) ? Math.min(2, 1 + 0.1 * (Math.max(1, p.axes.episodeCount) - 1)) : 1;
  const mult = route === 'distributor-sales' ? 1.4 : 1;
  const wide = Math.min(2.5, 1 + 0.25 * (territories.length - 1));
  return Math.max(0, Math.round((Math.max(0, reception - 40) * 6000 * runtime * season * mult * wide * (exclusive ? 1.2 : 1)) / 1000) * 1000);
}

export interface ProposalInput { route: BuyerRoute; buyer: string; territories: string[]; ask: number; exclusive: boolean }

/** Why this proposal can't be sent now, or null. */
export function proposalRefusal(state: GameState, p: Project, x: ProposalInput): string | null {
  const plan = p.releasePlan;
  if (!plan) return 'Set a Release Plan first.';
  if (!plan.routes.includes(x.route)) return `${PLAN_ROUTES[x.route].label} isn't in your plan.`;
  if (!BUYERS[x.route].includes(x.buyer)) return 'Choose a buyer.';
  if (!x.territories.length) return 'Choose at least one territory.';
  if (!(x.ask > 0) || !Number.isFinite(x.ask)) return 'Say what you ask for the licence.';
  const docs = documentsNeeded(p, ['pitch'], isNonfiction(p.axes.format), 'A licence proposal');
  if (docs) return docs;
  if (x.route === 'streaming-licence' && contentLevel(p) === null) return 'A streaming service needs content advisories. Declare the content on the Script page first.';
  const before = plan.proposals.filter((y) => y.buyer === x.buyer && y.route === x.route);
  if (before.some((y) => y.status === 'sent')) return `${x.buyer} has your proposal and answers by ${dateKey(before.find((y) => y.status === 'sent')!.answerAt, getPlace(p.axes.basePlaceId).zone)}.`;
  if (before.some((y) => y.over === 'reception')) return `${x.buyer} turned it down on how it was received. It won't read it again.`;
  if (before.some((y) => (y.status === 'accepted' || y.status === 'countered') && p.offers.some((o) => o.id === y.offerId && (o.status === 'open' || o.status === 'accepted')))) return `${x.buyer} has already made you an offer.`;
  const today = todayOf(state, p);
  const held = heldTerritories(p, x.territories, today);
  if (held.length) return `An exclusive deal holds ${held.map(countryName).join(', ')}.`;
  const taken = p.offers.find((o) => o.status === 'accepted' && o.route === RELEASE_ROUTE[x.route] && overlaps(o.territories, x.territories));
  if (taken) return `${taken.distributor} already has the ${RELEASE_ROUTE[x.route]} rights in ${taken.territories.filter((c) => x.territories.includes(c)).map(countryName).join(', ')}.`;
  return null;
}

/** Send a licence proposal: the buyer answers in its own time, by the facts then. */
export function proposeLicence(state: GameState, p: Project, x: ProposalInput): LicenceProposal {
  const no = proposalRefusal(state, p, x);
  if (no) throw new Error(no);
  const pr: LicenceProposal = {
    id: newId(state, 'lp'), route: x.route, buyer: x.buyer, territories: [...new Set(x.territories)], ask: Math.round(x.ask), exclusive: x.exclusive,
    sentAt: state.now, answerAt: state.now + ANSWER_DAYS[x.route] * DAY, status: 'sent',
  };
  p.releasePlan!.proposals.push(pr);
  schedule(state, pr.answerAt, 'release-licence-answer', { projectId: p.id, proposalId: pr.id }, { attention: 'notify', priority: 50 });
  const via = x.route === 'streaming-licence' ? `${SALES_AGENT} sent` : 'You sent';
  addLog(state, `${via} ${x.buyer} a licence proposal for ${p.title}, asking ${money(pr.ask)}. It answers in about ${ANSWER_DAYS[x.route]} days.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  return pr;
}

/** The buyer's answer. */
export function answerProposal(state: GameState, p: Project, pr: LicenceProposal): void {
  const bar = BUYER_BAR[pr.route];
  const reception = p.quality?.reception ?? 0;
  const value = buyerValue(p, pr.route, pr.territories, pr.exclusive);
  if (reception < bar || value <= 0) {
    pr.status = 'rejected';
    pr.over = 'reception';
    pr.answer = `It takes work received at ${bar} or better, and ${p.title} was received at ${reception}.`;
  } else if (pr.ask > value * 1.5) {
    pr.status = 'rejected';
    pr.over = 'price';
    pr.answer = `You asked ${money(pr.ask)}, more than it pays for rights like these.`;
  } else {
    const amount = Math.min(pr.ask, value);
    pr.status = pr.ask <= value ? 'accepted' : 'countered';
    pr.answer = pr.status === 'accepted' ? `It accepts ${money(amount)}.` : `It won't pay ${money(pr.ask)}, and offers ${money(amount)}.`;
    const plan = p.releasePlan!;
    const route = RELEASE_ROUTE[pr.route];
    const o: DistributionOffer = {
      id: newId(state, 'do'), distributor: pr.buyer, route, minimumGuarantee: amount, territories: pr.territories, releaseWindowDays: leadDays(state, p, plan),
      expiresAt: state.now + 21 * DAY, status: 'open', proposalId: pr.id, ...(pr.exclusive ? { exclusive: true } : {}),
      ...(route === 'broadcast' ? { slot: contentLevel(p) === 'strong' ? 'late' as const : 'any' as const } : {}),
      ...(pr.route === 'streaming-licence' ? { agentShare: AGENT_SHARE } : {}),
    };
    p.offers.push(o);
    pr.offerId = o.id;
  }
  addLog(state, `${pr.buyer} ${pr.status === 'rejected' ? 'turned down' : pr.status === 'accepted' ? 'accepted' : 'countered'} your licence proposal for ${p.title}. ${pr.answer}${pr.offerId ? ' Its offer is on the Release page, open for three weeks.' : ''}`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
}

registerHandler('release-licence-answer', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const pr = p?.releasePlan?.proposals.find((x) => x.id === ev.payload.proposalId);
  if (!p || !pr || pr.status !== 'sent') return { suppressInterrupt: true };
  answerProposal(state, p, pr);
  return { message: `${pr.buyer} answered your licence proposal for ${p.title}.` };
});

/** What a rejected proposal leaves open, in words: other buyers, a lower ask, the routes you run yourself. */
export function alternatives(p: Project, pr: LicenceProposal): string[] {
  const plan = p.releasePlan!;
  const out: string[] = [];
  const asked = new Set(plan.proposals.filter((y) => y.route === pr.route).map((y) => y.buyer));
  const others = BUYERS[pr.route].filter((b) => !asked.has(b));
  if (pr.over === 'price') out.push(`Ask ${pr.buyer} again for less: rights like these sell for about ${money(Math.round(buyerValue(p, pr.route, pr.territories, pr.exclusive) / 5000) * 5000)}.`);
  if (others.length && pr.over === 'price') out.push(`Propose it to ${others.join(', ')}.`);
  if (pr.over === 'reception') {
    const lower = (Object.keys(BUYER_BAR) as BuyerRoute[]).filter((r) => BUYER_BAR[r] <= (p.quality?.reception ?? 0) && !(PLAN_ROUTES[r].films && isEpisodic(p.axes.format)));
    if (lower.length) out.push(`Buyers who work to a lower bar: ${lower.map((r) => PLAN_ROUTES[r].label).join(', ')}.`);
  }
  out.push(`Release it yourself: ${(['transactional', 'direct', ...(isEpisodic(p.axes.format) ? [] : ['partner-theatrical'])] as PlanRoute[]).map((r) => PLAN_ROUTES[r].label).join(', ')}. Add the route to your plan to use it.`);
  return out;
}

// ---------------- The routes you run yourself ----------------

export type SelfRoute = 'partner-theatrical' | 'transactional' | 'direct';

/** What a route you run yourself costs for these territories, each part named, before anything is booked. */
export function selfCosts(p: Project, route: SelfRoute, territories: string[], promo: number): { label: string; amount: number; when: 'now' | 'release' }[] {
  const out: { label: string; amount: number; when: 'now' | 'release' }[] = [];
  if (route === 'partner-theatrical') {
    out.push({ label: 'The Booking Partner\'s Fee', amount: PARTNER_FEE, when: 'now' });
    out.push({ label: `Screen Rental In ${territories.length === 1 ? 'One Territory' : `${territories.length} Territories`}`, amount: SCREEN_RENTAL * territories.length, when: 'now' });
    out.push({ label: 'Cinema Delivery Materials', amount: DELIVERY_MATERIALS.theatrical, when: 'release' });
  }
  if (route === 'transactional') out.push({ label: 'The Aggregator\'s Fee, Encoding And Quality Check', amount: AGGREGATOR_FEE, when: 'now' });
  if (route !== 'direct') {
    const subs = subtitlingCost(p, territories);
    if (subs) out.push({ label: 'Subtitles And Captions', amount: subs, when: 'release' });
  }
  if (promo > 0) out.push({ label: 'Promotion', amount: Math.round(promo), when: 'release' });
  return out;
}

/** Why this route can't be booked from the plan now, or null. */
export function selfRefusal(state: GameState, p: Project, route: SelfRoute): string | null {
  const plan = p.releasePlan;
  if (!plan) return 'Set a Release Plan first.';
  if (!plan.routes.includes(route)) return `${PLAN_ROUTES[route].label} isn't in your plan.`;
  const docs = documentsNeeded(p, ['pitch'], isNonfiction(p.axes.format), route === 'direct' ? 'Your storefront page' : route === 'transactional' ? "The aggregator's delivery list" : "The booking partner's materials");
  if (docs) return docs;
  if (route !== 'partner-theatrical' && contentLevel(p) === null) return 'The stores and your storefront need content advisories. Declare the content on the Script page first.';
  if (p.offers.some((o) => o.self === route && o.status === 'accepted' && p.releases.some((r) => r.offerId === o.id && r.status === 'planned'))) return `Your ${PLAN_ROUTES[route].label.toLowerCase()} release is already booked.`;
  const today = todayOf(state, p);
  const held = heldTerritories(p, plan.territories, today);
  if (held.length) return `An exclusive deal holds ${held.map(countryName).join(', ')}. Take ${held.length === 1 ? 'it' : 'them'} out of the plan's territories, or wait until the deal ends.`;
  const same = p.offers.find((o) => o.status === 'accepted' && o.route === SELF_RELEASE[route] && overlaps(o.territories, plan.territories) && p.releases.some((r) => r.offerId === o.id && r.status !== 'cancelled'));
  if (same) return `${same.distributor} already releases it there on the same route.`;
  const hold = festivalHold(p, plan.date);
  if (hold) return hold;
  if (plan.date < today) return 'The plan\'s date has passed. Choose a new one.';
  const total = selfCosts(p, route, plan.territories, plan.promo).reduce((a, x) => a + x.amount, 0);
  const free = ledgerTotals(p).available;
  if (total > free) return `It costs ${money(total)}, and ${p.title} has ${money(Math.max(0, free))} free. Put money into the project from its Budget page, or spend less on promotion.`;
  return null;
}

/** Book a route you run yourself: costs posted as they fall, a deal with nobody to accept it, and its release planned. */
export function releaseYourself(state: GameState, p: Project, route: SelfRoute): DistributionOffer {
  const no = selfRefusal(state, p, route);
  if (no) throw new Error(no);
  const plan = p.releasePlan!;
  const o: DistributionOffer = {
    id: newId(state, 'do'), distributor: SELF_NAMES[route], route: SELF_RELEASE[route], minimumGuarantee: 0, territories: [...plan.territories],
    releaseWindowDays: 0, expiresAt: state.now, status: 'accepted', self: route, fee: SELF_SHARE[route], ...(plan.promo > 0 ? { promo: plan.promo } : {}),
  };
  const costs = selfCosts(p, route, plan.territories, plan.promo);
  const lines = costs.map((c) => {
    const ob = reserve(state, p, `${c.label}: ${PLAN_ROUTES[route].label}`, 'post', c.amount, `self:${o.id}:${c.label}`);
    if (c.when === 'now') { settle(state, p, ob.id, c.amount, `self:${o.id}:${c.label}`); closeSettled(p, ob.id); }
    return { ob, when: c.when };
  });
  p.offers.push(o);
  let rec;
  try {
    rec = planRelease(state, p, { route: o.route, date: plan.date, territories: plan.territories, distributor: o.distributor, ...(isEpisodic(p.axes.format) ? { pattern: 'weekly' as const } : {}) });
  } catch (e) {
    // Nothing is left half booked: the deal and what was reserved for it go.
    p.offers.pop();
    for (const l of lines.filter((x) => x.when === 'release')) cancel(state, p, l.ob.id);
    throw e;
  }
  rec.offerId = o.id;
  // What is paid on release goes out with the release, as a distributor's materials do (finish.ts 'release').
  const atRelease = lines.filter((l) => l.when === 'release');
  if (atRelease.length === 1) rec.obligationId = atRelease[0].ob.id;
  else if (atRelease.length > 1) {
    const sum = atRelease.reduce((a, l) => a + l.ob.amount, 0);
    for (const l of atRelease) cancel(state, p, l.ob.id);
    rec.obligationId = reserve(state, p, `Paid On Release: ${PLAN_ROUTES[route].label}`, 'post', sum, `self:${o.id}:release`).id;
  }
  rec.note = `${PLAN_ROUTES[route].label}: you run it yourself.${plan.promo > 0 ? ` ${money(plan.promo)} of promotion.` : ''}`;
  // A dubbed version is the player's to pay for, as on any release (finish.ts setReleaseVersion); where it can't be had, the
  // release stays subtitled and says why.
  if (plan.version === 'dubbed') {
    const why = versionRefusal(p, rec);
    if (why) rec.note += ` Subtitled: ${why}`;
    else setReleaseVersion(state, p, rec.id, 'dubbed');
  }
  addLog(state, `${p.title} is booked for ${PLAN_ROUTES[route].label.toLowerCase()} release on ${formatDateKey(plan.date)}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  return o;
}

/** Words for what the plan holds and promises, shown with it. */
export function planWords(plan: ReleasePlan): string[] {
  const out = [`${plan.territories.map(countryName).join(', ')}, from ${formatDateKey(plan.date)}.`];
  if (plan.festivalUntil && plan.routes.includes('festival-first')) out.push(`Held for festivals until ${formatDateKey(plan.festivalUntil)}: nothing is released publicly before then.`);
  out.push(plan.version === 'dubbed' ? 'Dubbed where the dialogue isn\'t the territory\'s language, on the routes you run yourself.' : 'Subtitled where the dialogue isn\'t the territory\'s language.');
  if (plan.promo > 0) out.push(`${money(plan.promo)} of promotion on each route you run yourself. Simulated: it widens how many people find it.`);
  out.push(`An exclusive licence holds its territories for ${EXCLUSIVE_DAYS} days from its release.`);
  return out;
}
