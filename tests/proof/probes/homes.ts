// Homes And Property (from November 17, 2026; the owner's Homes & Property package): each decision a screen offers,
// played over the same seeds with and without it. The career is the game's own (a film a year in London); housing runs
// beside it on the same clock and the same bank, so a housing decision's downstream effect is the money the career
// ends with, and the interest it earns. Offers are drawn from the packs as the screens draw them, on the career's first
// day; every step after is an engine call a screen makes, in the order a player would make it.
import type { Probe } from '../probe';
import type { GameState } from '../../../src/engine/types';
import { applianceCatalog, marketEvidence, offersIn, type MarketEvidence } from '../../../src/engine/homes/market';
import { homesOf, todayAt, type Payment } from '../../../src/engine/homes/core';
import { COMPONENT_WORDS, type Home, type WorkKind } from '../../../src/engine/homes/model';
import { applyToRent, approveRepair, askPermission, disputeDeductions, giveNotice, moveIn, moveInRefusal, payArrears, reportRepair, signLease } from '../../../src/engine/homes/renting';
import { acceptCounter, acceptSaleOffer, declineSaleOffer, listForSale, makeOffer, valuation, withdrawPurchase, type Plan } from '../../../src/engine/homes/buying';
import { GENERIC_FURNITURE, bookStay, buyInsurance, buyItem, cancelWork, claimRepair, disposeItem, installItem, measureForInstall, restoreChange, returnItem, startWork, type CatalogItem } from '../../../src/engine/homes/living';
import { applyForApproval, investigate, resumeBuild, saveDesign, signBuild, startDesign } from '../../../src/engine/homes/building';
import { advertise, approveLandlordRepair, changeRent, chooseTenant, endLetting, fairRent } from '../../../src/engine/homes/letting';
import { mortgageOwed } from '../../../src/engine/bank';
import { bankMeasures } from './bank';

const START = '2026-01-05';
const PLACES = ['gb-london', 'us-los-angeles', 'us-austin'] as const;
type PlaceId = (typeof PLACES)[number];
const EV = Object.fromEntries(await Promise.all(PLACES.map(async (p) => [p, await marketEvidence(p, START)] as const))) as Record<PlaceId, MarketEvidence>;
const WASHERS = (await applianceCatalog('washers', '', 500)).items;
/** A washer EPA records with its depth, and one it records without (the installer measures first). */
const WASHER = WASHERS.find((c) => c.depthIn !== null && c.widthIn !== null && c.widthIn < 28 && (c.onMarketFrom ?? '') < START)!;
const WASHER_NO_DEPTH = WASHERS.find((c) => c.depthIn === null && c.widthIn !== null && c.widthIn < 28 && (c.onMarketFrom ?? '') < START);

const offers = (s: GameState, place: PlaceId) => offersIn(s.seed, EV[place], todayAt(s, { placeId: place }));
const DESK = GENERIC_FURNITURE.find((c) => c.name === 'Desk')!;

// ---------------- What a career's housing comes to ----------------

const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);
const total = (ps: Payment[], kinds: Payment['kind'][]) => sum(ps.filter((p) => kinds.includes(p.kind)), (p) => p.minor) / 100;
export function homeMeasures(s: GameState): Record<string, number> {
  const hs = homesOf(s);
  return {
    rentsPaid: sum(hs.tenancies, (t) => t.payments.filter((p) => p.kind === 'paid' && /^rent:[^:]+:\d+$/.test(p.key)).length),
    arrears: sum(hs.tenancies, (t) => t.arrearsMinor) / 100,
    depositKept: sum(hs.tenancies, (t) => t.keptMinor ?? 0) / 100,
    depositBack: sum(hs.tenancies, (t) => t.refundedMinor ?? 0) / 100,
    tenanciesEnded: hs.tenancies.filter((t) => t.stage === 'ended').length,
    repairSpend: sum(hs.repairs, (r) => (r.who === 'you' && (r.stage === 'booked' || r.stage === 'fixed') ? r.quoteMinor ?? 0 : 0)) / 100,
    repairsFixed: hs.repairs.filter((r) => r.stage === 'fixed').length,
    homesOwned: hs.owned.filter((o) => !o.soldAt).length,
    pricePaid: sum(hs.owned, (o) => o.costMinor) / 100,
    mortgageLoan: sum(hs.owned, (o) => o.mortgage?.principalMinor ?? 0) / 100,
    mortgagePayment: sum(hs.owned, (o) => o.mortgage?.paymentMinor ?? 0) / 100,
    mortgageOwed: sum(hs.owned, (o) => (o.mortgage ? mortgageOwed(s, o.mortgage.name) : 0)),
    inspections: hs.purchases.filter((p) => p.inspection).length,
    purchasesEnded: hs.purchases.filter((p) => p.stage === 'withdrawn' || p.stage === 'failed').length,
    sold: hs.sales.filter((x) => x.stage === 'completed').length,
    saleProceeds: sum(hs.sales, (x) => x.proceedsMinor ?? 0) / 100,
    saleOffer: sum(hs.sales, (x) => (x.stage === 'completed' ? x.offerMinor ?? 0 : 0)) / 100,
    soldAtDay: sum(hs.owned.filter((o) => o.soldAt), (o) => (o.soldAt! - Date.parse(`${START}T00:00:00Z`)) / 86_400_000),
    jobsDone: hs.jobs.filter((j) => j.stage === 'done').length,
    workPaid: sum(hs.jobs, (j) => j.paidMinor) / 100,
    designRevisions: sum(Object.values(hs.homes), (h) => h.design.revision - 1),
    itemsInstalled: hs.items.filter((i) => i.stage === 'installed').length,
    itemsGone: hs.items.filter((i) => i.stage === 'returned' || i.stage === 'disposed').length,
    itemSpend: sum(hs.items, (i) => total(i.payments, ['paid']) - total(i.payments, ['refunded'])),
    policies: hs.policies.length,
    claimsPaid: sum(hs.policies, (p) => sum(p.claims, (c) => c.paidMinor ?? 0)) / 100,
    staySpend: sum(hs.stays, (x) => x.paidMinor) / 100,
    buildsDone: hs.builds.filter((b) => b.stage === 'complete').length,
    buildStagesDone: sum(hs.builds, (b) => b.stages.filter((x) => x.done).length),
    buildQuote: sum(hs.builds, (b) => b.quoteMinor) / 100,
    buildSpend: sum(hs.builds, (b) => total(b.payments, ['paid'])),
    letRents: sum(hs.lettings, (l) => l.rentsReceived),
    letIncome: sum(hs.lettings, (l) => total(l.payments.filter((p) => p.key.includes(':rent:')), ['received'])),
    letCosts: sum(hs.lettings, (l) => total(l.payments, ['paid'])),
    lettingsEnded: hs.lettings.filter((l) => l.stage === 'ended').length,
  };
}
const measure = (s: GameState) => ({ ...homeMeasures(s), ...bankMeasures(s) });

// ---------------- The steps a player takes, each as its screen takes it ----------------

/** Rent the first London home on offer (or the first `pick` finds): apply, sign when approved, move in on the day. */
function rent(s: GameState, day: number, pick: (h: Home) => boolean = (h) => h.market === 'rent') {
  const hs = homesOf(s);
  if (day === 0) { const h = offers(s, 'gb-london').find(pick); if (h) applyToRent(s, h); }
  const t = hs.tenancies[0];
  if (!t) return undefined;
  if (t.stage === 'approved') signLease(s, t.id);
  if (t.stage === 'signed' && !moveInRefusal(s, t.homeId)) moveIn(s, t.homeId);
  return t;
}
/** Buy the first home for sale in a place (or land), at a share of its price, on a plan. */
function buy(s: GameState, day: number, plan: Plan, o: { share?: number; place?: PlaceId; land?: boolean; pick?: (h: Home) => boolean } = {}) {
  const hs = homesOf(s);
  if (day === 0) {
    const h = offers(s, o.place ?? 'us-los-angeles').find((x) => x.market === 'sale' && (o.land ? x.form === 'land' : x.form !== 'land') && (!o.pick || o.pick(x)));
    if (h) makeOffer(s, h, Math.round((h.priceMinor * (o.share ?? 1)) / 100) * 100, plan);
  }
  const p = hs.purchases[0];
  if (p?.stage === 'countered') acceptCounter(s, p.id);
  return p;
}
const CASH: Plan = { finance: 'cash', inspect: false };
const owned = (s: GameState) => homesOf(s).owned.find((o) => !o.soldAt);
const tryIt = (fn: () => void) => { try { fn(); } catch { /* refused today, as the screen would say: the player tries again tomorrow */ } };

/** Sell a home a while after it's yours, at a share of what it's worth; accept offers, or decline the first. */
function sell(s: GameState, day: number, o: { ask?: number; declineFirst?: boolean } = {}) {
  const mine = owned(s);
  const hs = homesOf(s);
  if (mine && day > 0 && !hs.sales.length && s.now - mine.since > 30 * 86_400_000) {
    const home = hs.homes[mine.homeId];
    listForSale(s, home.id, Math.round((valuation(s, home) * (o.ask ?? 1)) / 100) * 100);
  }
  const sale = hs.sales[0];
  if (sale?.stage === 'offer') {
    if (o.declineFirst && !(sale as { declined?: boolean }).declined) { (sale as { declined?: boolean }).declined = true; declineSaleOffer(s, sale.id); }
    else tryIt(() => acceptSaleOffer(s, sale.id));
  }
}

/** Let an owned home: advertise at a share of the fair rent, take the first applicant, and approve what's asked. */
function letIt(s: GameState, o: { share?: number; manager?: boolean; capUsd?: number; approve?: boolean; changeTo?: number; endAfterRents?: number } = {}) {
  const mine = owned(s);
  const hs = homesOf(s);
  if (!mine) return;
  // A home isn't let until what's poor is put right: the owner gets each quoted and pays for it.
  const home = hs.homes[mine.homeId];
  for (const k of Object.keys(home.condition) as (keyof Home['condition'])[]) {
    if (home.condition[k] !== 'poor') continue;
    const word = COMPONENT_WORDS[k];
    if (!hs.repairs.some((r) => r.homeId === home.id && r.component === word && r.stage !== 'fixed')) tryIt(() => { const r = reportRepair(s, home.id, word); approveRepair(s, r.id); });
  }
  if (!hs.lettings.length) tryIt(() => void advertise(s, mine.homeId, Math.round((fairRent(s, mine.homeId) * (o.share ?? 1)) / 100) * 100, !!o.manager, (o.capUsd ?? 0) * 100));
  const l = hs.lettings[0];
  if (!l) return;
  if (l.stage === 'applicants' && o.changeTo && l.rentMinor !== Math.round((fairRent(s, mine.homeId) * o.changeTo) / 100) * 100) changeRent(s, l.id, Math.round((fairRent(s, mine.homeId) * o.changeTo) / 100) * 100);
  if (l.stage === 'applicants' && l.applicants.length) chooseTenant(s, l.id, 0);
  if (o.approve) l.repairs.forEach((r, i) => { if (r.stage === 'awaiting-you') tryIt(() => approveLandlordRepair(s, l.id, i)); });
  if (o.endAfterRents && l.stage === 'let' && l.rentsReceived >= o.endAfterRents) endLetting(s, l.id);
}

/** Land in Austin, bought for cash; its survey; a design (changed by `design`); approval; the contract; and paused stages resumed. */
function build(s: GameState, day: number, o: { design?: Parameters<typeof saveDesign>[2]; resume?: boolean; stopAt?: 'design' } = {}) {
  buy(s, day, CASH, { place: 'us-austin', land: true });
  const land = owned(s);
  const hs = homesOf(s);
  if (!land || hs.homes[land.homeId]?.form !== 'land') return;
  const plot = hs.homes[land.homeId];
  if (!plot.land?.investigated.includes('survey') && !hs.builds.length) tryIt(() => investigate(s, plot.id, 'survey'));
  if (!plot.land?.investigated.includes('survey')) return;
  let b = hs.builds.find((x) => x.landId === plot.id);
  if (!b) { b = startDesign(s, plot.id); if (o.design) saveDesign(s, b.id, o.design); }
  if (o.stopAt === 'design') return;
  if (b.stage === 'designing') tryIt(() => applyForApproval(s, b!.id));
  if (b.stage === 'permitted') tryIt(() => signBuild(s, b!.id));
  if (b.stage === 'paused' && o.resume) tryIt(() => resumeBuild(s, b!.id));
}

// ---------------- The probes ----------------

const R = 'src/engine/homes/renting.ts';
const B = 'src/engine/homes/buying.ts';
const L = 'src/engine/homes/living.ts';
const BU = 'src/engine/homes/building.ts';
const LE = 'src/engine/homes/letting.ts';
const F = (label: string, n = 1) => `field:Homes.tsx#${label}#${n}`;
const money = ['money', 'moneyChange', 'interestIn', 'worth'];
const LA = { place: 'us-los-angeles' as const };

export const PROBES: Probe[] = [
  {
    id: 'rent-a-home',
    features: ['action:homes/renting.applyToRent', 'action:homes/renting.signLease', 'action:homes/renting.moveIn'],
    decision: 'Rent the first London home on offer: apply, sign the lease when approved, and move in',
    reads: [`${R}#applyToRent`, `${R}#signLease`, `${R}#moveIn`, `${R}#rentDue`],
    variant: { daily: (s, d) => void rent(s, d) },
    measure, bites: ['rentsPaid'], downstream: money,
  },
  {
    id: 'housing-clock',
    features: ['scheduled:home'],
    decision: "Rent a home, with the housing clock running or switched off (the landlord's decision, rent days, deposits)",
    reads: ['src/engine/homes/index.ts#handler:home', `${R}#decideApplication`, `${R}#rentDue`],
    base: { daily: (s, d) => void rent(s, d) },
    variant: { daily: (s, d) => void rent(s, d) },
    disable: ['home'],
    measure, bites: ['rentsPaid'], downstream: money,
  },
  {
    id: 'report-your-repair',
    features: ['action:homes/renting.reportRepair', 'action:homes/renting.approveRepair', F('"Something Broken"')],
    decision: "Report the desk you bought as broken, rather than the landlord's heating, and pay for its repair",
    reads: [`${R}#reportRepair`, `${R}#approveRepair`, `${R}#repairVisit`],
    base: { daily: (s, d) => { const t = rent(s, d); if (t?.stage === 'active' && !homesOf(s).items.length) buyItem(s, t.homeId, DESK, homesOf(s).homes[t.homeId].rooms[0].id); if (d === 60 && t?.stage === 'active') tryIt(() => void reportRepair(s, t.homeId, 'Heating')); } },
    variant: { daily: (s, d) => { const t = rent(s, d); if (t?.stage === 'active' && !homesOf(s).items.length) buyItem(s, t.homeId, DESK, homesOf(s).homes[t.homeId].rooms[0].id); if (d === 60 && t?.stage === 'active') tryIt(() => { const r = reportRepair(s, t.homeId, 'Desk'); approveRepair(s, r.id); }); } },
    measure, bites: ['repairSpend'], downstream: money,
  },
  {
    id: 'owner-repairs-roof',
    features: [F('"Something Broken"', 2)],
    decision: 'Have the roof of the house you own quoted and repaired',
    reads: [`${R}#reportRepair`, `${R}#approveRepair`, `${R}#repairVisit`],
    base: { daily: (s, d) => void buy(s, d, CASH, { pick: (h) => h.form === 'detached' || h.form === 'townhouse' }) },
    variant: { daily: (s, d) => { buy(s, d, CASH, { pick: (h) => h.form === 'detached' || h.form === 'townhouse' }); const o = owned(s); if (o && !homesOf(s).repairs.length) tryIt(() => { const r = reportRepair(s, o.homeId, 'Roof'); approveRepair(s, r.id); }); } },
    measure, bites: ['repairSpend', 'repairsFixed'], downstream: money,
  },
  {
    id: 'ask-to-paint',
    features: ['action:homes/renting.askPermission', 'action:homes/living.startWork', F('"Ask Permission For"'), F('"Work"')],
    decision: 'Ask the landlord to paint the rented home, and paint it once they agree',
    reads: [`${R}#askPermission`, `${R}#decidePermission`, `${L}#startWork`, `${L}#workDone`],
    base: { daily: (s, d) => void rent(s, d) },
    variant: { daily: (s, d) => { const t = rent(s, d); if (t?.stage !== 'active') return; const hs = homesOf(s); if (!hs.permissions.length) askPermission(s, t.homeId, 'paint'); if (hs.permissions[0]?.stage === 'granted' && !hs.jobs.length) startWork(s, t.homeId, 'paint'); } },
    measure, bites: ['jobsDone', 'workPaid'], downstream: money,
  },
  {
    id: 'give-notice',
    features: ['action:homes/renting.giveNotice'],
    decision: 'Give notice a month after moving in, rather than staying on',
    reads: [`${R}#giveNotice`, `${R}#endTenancy`, `${R}#settleDeposit`],
    base: { daily: (s, d) => void rent(s, d) },
    variant: { daily: (s, d) => { const t = rent(s, d); if (t?.stage === 'active' && t.movedIn && s.now - t.movedIn > 30 * 86_400_000) giveNotice(s, t.id); } },
    measure, bites: ['rentsPaid', 'depositBack'], downstream: money,
  },
  {
    id: 'undo-the-paint',
    features: ['action:homes/living.restoreChange'],
    decision: 'Put the paint back as agreed before leaving, rather than leave it to the deposit',
    reads: [`${L}#restoreChange`, `${R}#endTenancy`, `${R}#settleDeposit`],
    base: { daily: paintThenLeave(false) },
    variant: { daily: paintThenLeave(true) },
    measure, bites: ['depositKept'], downstream: money,
  },
  {
    id: 'dispute-deductions',
    seeds: 120,
    features: ['action:homes/renting.disputeDeductions'],
    decision: "Dispute what the landlord keeps from the deposit for damage at move-out",
    reads: [`${R}#disputeDeductions`, `${R}#endTenancy`, `${R}#settleDeposit`],
    base: { daily: leaveAfterAYear(false) },
    variant: { daily: leaveAfterAYear(true) },
    measure, bites: ['depositKept'], downstream: money,
  },
  {
    id: 'pay-rent-owed',
    seeds: 60,
    features: ['action:homes/renting.payArrears'],
    decision: 'Pay rent that failed as soon as the money is there, rather than let it stand',
    reads: [`${R}#payArrears`, `${R}#rentDue`],
    // Labelled fixture: the rent is made to fail once (the bank refusing it is what fails rent in play); the decision is what follows.
    base: { daily: (s, d) => { const t = rent(s, d); if (t && t.rentsPaid === 2 && !t.arrearsMinor && !t.payments.some((p) => p.kind === 'failed')) failNextRent(t); } },
    variant: { daily: (s, d) => { const t = rent(s, d); if (t && t.rentsPaid === 2 && !t.arrearsMinor && !t.payments.some((p) => p.kind === 'failed')) failNextRent(t); if (t?.arrearsMinor) tryIt(() => payArrears(s, t.id)); } },
    measure, bites: ['arrears'], downstream: money,
  },
  {
    id: 'buy-a-home',
    features: ['action:homes/buying.makeOffer'],
    decision: 'Buy the first Los Angeles home for sale, in cash, at its asking price',
    reads: [`${B}#makeOffer`, `${B}#answerOffer`, `${B}#complete`],
    variant: { daily: (s, d) => void buy(s, d, CASH) },
    measure, bites: ['homesOwned', 'pricePaid'], downstream: money,
  },
  {
    id: 'offer-below-asking',
    features: ['action:homes/buying.acceptCounter', F('{`Your Offer (${home.currency})`}')],
    decision: "Offer 92% of the asking price and take the seller's counter-offer, rather than offer the asking price",
    reads: [`${B}#makeOffer`, `${B}#answerOffer`, `${B}#acceptCounter`, `${B}#complete`],
    base: { daily: (s, d) => void buy(s, d, CASH) },
    variant: { daily: (s, d) => void buy(s, d, CASH, { share: 0.92 }) },
    measure, bites: ['pricePaid'], downstream: money,
  },
  {
    id: 'mortgage-not-cash',
    features: [F('"Paying With"')],
    decision: 'Buy with a mortgage (20% down over 25 years) rather than cash',
    reads: [`${B}#purchaseQuote`, `${B}#decideFinance`, `${B}#complete`, `${B}#mortgageDue`],
    base: { daily: (s, d) => void buy(s, d, CASH) },
    variant: { daily: (s, d) => void buy(s, d, { finance: 'mortgage', depositShare: 0.2, years: 25, inspect: false }) },
    measure, bites: ['mortgageLoan', 'mortgageOwed'], downstream: money,
  },
  {
    id: 'bigger-deposit',
    features: [F('"Your Deposit (%)"')],
    decision: 'Put down 50% rather than 20%',
    reads: [`${B}#purchaseQuote`, `${B}#complete`, `${B}#mortgageDue`],
    base: { daily: (s, d) => void buy(s, d, { finance: 'mortgage', depositShare: 0.2, years: 25, inspect: false }) },
    variant: { daily: (s, d) => void buy(s, d, { finance: 'mortgage', depositShare: 0.5, years: 25, inspect: false }) },
    measure, bites: ['mortgageLoan', 'mortgagePayment'], downstream: money,
  },
  {
    id: 'shorter-mortgage',
    features: [F('"Mortgage Term"')],
    decision: 'Take the mortgage over 15 years rather than 30',
    reads: [`${B}#purchaseQuote`, `${B}#mortgageDue`],
    base: { daily: (s, d) => void buy(s, d, { finance: 'mortgage', depositShare: 0.2, years: 30, inspect: false }) },
    variant: { daily: (s, d) => void buy(s, d, { finance: 'mortgage', depositShare: 0.2, years: 15, inspect: false }) },
    measure, bites: ['mortgagePayment', 'mortgageOwed'], downstream: money,
  },
  {
    id: 'inspect-first',
    features: [F('"Have It Inspected"')],
    decision: 'Have the home inspected before buying',
    reads: [`${B}#makeOffer`, `${B}#inspect`],
    base: { daily: (s, d) => void buy(s, d, CASH) },
    variant: { daily: (s, d) => void buy(s, d, { finance: 'cash', inspect: true }) },
    measure, bites: ['inspections'], downstream: money,
  },
  {
    id: 'withdraw-purchase',
    features: ['action:homes/buying.withdrawPurchase'],
    decision: 'Withdraw from the purchase once the offer is accepted',
    reads: [`${B}#withdrawPurchase`],
    base: { daily: (s, d) => void buy(s, d, CASH) },
    variant: { daily: (s, d) => { const p = buy(s, d, CASH); if (p && ['accepted', 'inspecting', 'financing', 'ready'].includes(p.stage)) withdrawPurchase(s, p.id); } },
    measure, bites: ['homesOwned', 'purchasesEnded'], downstream: money,
  },
  {
    id: 'sell-the-home',
    features: ['action:homes/buying.listForSale', 'action:homes/buying.acceptSaleOffer'],
    decision: 'Sell the home a month after buying it, at what it is worth, and accept the offer',
    reads: [`${B}#listForSale`, `${B}#buyerOffer`, `${B}#acceptSaleOffer`, `${B}#completeSale`],
    base: { daily: (s, d) => void buy(s, d, CASH) },
    variant: { daily: (s, d) => { buy(s, d, CASH); sell(s, d); } },
    measure, bites: ['sold', 'homesOwned'], downstream: money,
  },
  {
    id: 'ask-more',
    features: [F('{`Asking Price (${cur})`}')],
    decision: 'Ask 25% more than the home is worth, rather than its worth',
    reads: [`${B}#listForSale`, `${B}#buyerOffer`, `${B}#completeSale`],
    base: { daily: (s, d) => { buy(s, d, CASH); sell(s, d); } },
    variant: { daily: (s, d) => { buy(s, d, CASH); sell(s, d, { ask: 1.25 }); } },
    measure, bites: ['saleOffer', 'soldAtDay'], downstream: money,
  },
  {
    id: 'decline-first-offer',
    features: ['action:homes/buying.declineSaleOffer'],
    decision: "Decline the first buyer's offer and wait for the next",
    reads: [`${B}#declineSaleOffer`, `${B}#buyerOffer`, `${B}#completeSale`],
    base: { daily: (s, d) => { buy(s, d, CASH); sell(s, d); } },
    variant: { daily: (s, d) => { buy(s, d, CASH); sell(s, d, { declineFirst: true }); } },
    measure, bites: ['soldAtDay'], downstream: money,
  },
  {
    id: 'paint-the-outside',
    features: [F('"New Colour"')],
    decision: 'Repaint the outside of the home you own sage, rather than leave it',
    reads: [`${L}#startWork`, `${L}#workDone`, 'src/engine/homes/illustration.ts#exteriorFor'],
    base: { daily: (s, d) => void buy(s, d, CASH) },
    variant: { daily: (s, d) => { buy(s, d, CASH); const o = owned(s); if (o && !homesOf(s).jobs.length) tryIt(() => void startWork(s, o.homeId, 'exterior-paint', { color: 'sage' })); } },
    measure, bites: ['designRevisions', 'workPaid'], downstream: money,
  },
  {
    id: 'cancel-work',
    features: ['action:homes/living.cancelWork'],
    decision: 'Cancel a new kitchen before it starts',
    reads: [`${L}#cancelWork`, `${L}#startWork`],
    base: { daily: workThen(false) },
    variant: { daily: workThen(true) },
    measure, bites: ['jobsDone', 'workPaid'], downstream: money,
  },
  {
    id: 'buy-furniture',
    features: ['action:homes/living.buyItem'],
    decision: 'Buy a desk for the rented home',
    reads: [`${L}#buyItem`, `${L}#deliver`],
    base: { daily: (s, d) => void rent(s, d) },
    variant: { daily: (s, d) => { const t = rent(s, d); if (t?.stage === 'active' && !homesOf(s).items.length) buyItem(s, t.homeId, DESK, homesOf(s).homes[t.homeId].rooms[0].id); } },
    measure, bites: ['itemSpend', 'itemsInstalled'], downstream: money,
  },
  {
    id: 'washer-in-the-laundry',
    features: [F('"For The Room"')],
    decision: 'Choose the laundry for a washing machine, rather than a bedroom without water or a drain',
    reads: [`${L}#itemCheck`, `${L}#buyItem`],
    base: { daily: washerIn('bedroom') },
    variant: { daily: washerIn('laundry') },
    measure, bites: ['itemSpend'], downstream: money,
  },
  {
    id: 'install-appliance',
    features: ['action:homes/living.installItem'],
    decision: 'Have the washing machine installed once delivered',
    reads: [`${L}#installItem`, `${L}#installRefusal`],
    base: { daily: washerIn('laundry', false) },
    variant: { daily: washerIn('laundry', true) },
    measure, bites: ['itemsInstalled'], downstream: money,
  },
  {
    id: 'measure-for-install',
    features: ['action:homes/living.measureForInstall'],
    decision: "Have the installer measure for a washing machine EPA records no depth for, then install it",
    reads: [`${L}#measureForInstall`, `${L}#installItem`],
    base: { daily: dishwasher(false) },
    variant: { daily: dishwasher(true) },
    measure, bites: ['itemsInstalled'], downstream: money,
  },
  {
    id: 'return-item',
    features: ['action:homes/living.returnItem'],
    decision: 'Return the desk within the 30 days',
    reads: [`${L}#returnItem`],
    base: { daily: deskThen(() => undefined) },
    variant: { daily: deskThen((s, id) => returnItem(s, id)) },
    measure, bites: ['itemSpend', 'itemsGone'], downstream: money,
  },
  {
    id: 'dispose-item',
    features: ['action:homes/living.disposeItem'],
    decision: 'Have the desk collected for recycling',
    reads: [`${L}#disposeItem`],
    base: { daily: deskThen(() => undefined) },
    variant: { daily: deskThen((s, id) => disposeItem(s, id)) },
    measure, bites: ['itemsGone'], downstream: money,
  },
  {
    id: 'insure-belongings',
    features: ['action:homes/living.buyInsurance'],
    decision: 'Insure your belongings in the rented home',
    reads: [`${L}#buyInsurance`, `${L}#monthlyBill`],
    base: { daily: (s, d) => void rent(s, d) },
    variant: { daily: (s, d) => { const t = rent(s, d); if (t?.stage === 'active' && !homesOf(s).policies.length) buyInsurance(s, t.homeId, 'contents'); } },
    measure, bites: ['policies'], downstream: money,
  },
  {
    id: 'claim-on-insurance',
    features: ['action:homes/living.claimRepair'],
    decision: 'Claim on the buildings cover for a roof repair you paid for',
    reads: [`${L}#claimRepair`, `${L}#decideClaim`],
    base: { daily: roofRepair(false) },
    variant: { daily: roofRepair(true) },
    measure, bites: ['claimsPaid'], downstream: money,
  },
  {
    id: 'stay-longer',
    features: ['action:homes/living.bookStay', F('"Nights"')],
    decision: 'Book six nights somewhere to stay rather than two',
    reads: [`${L}#bookStay`],
    base: { daily: (s, d) => { if (d === 3) bookStay(s, 2, 'Between homes'); } },
    variant: { daily: (s, d) => { if (d === 3) bookStay(s, 6, 'Between homes'); } },
    measure, bites: ['staySpend'], downstream: money,
  },
  {
    id: 'build-a-house',
    features: ['action:homes/building.investigate', 'action:homes/building.startDesign', 'action:homes/building.applyForApproval', 'action:homes/building.signBuild'],
    decision: 'Survey the Austin plot you bought, design a house, have it approved and build it',
    reads: [`${BU}#investigate`, `${BU}#startDesign`, `${BU}#applyForApproval`, `${BU}#signBuild`, `${BU}#stageEnd`],
    base: { daily: (s, d) => void buy(s, d, CASH, { place: 'us-austin', land: true }) },
    variant: { daily: (s, d) => build(s, d) },
    measure, bites: ['buildStagesDone', 'buildSpend'], downstream: money,
  },
  {
    id: 'double-garage',
    features: ['action:homes/building.saveDesign', F('{label}')],
    decision: 'Design the house with a double garage rather than a single',
    reads: [`${BU}#saveDesign`, `${BU}#buildQuote`],
    base: { daily: (s, d) => build(s, d) },
    variant: { daily: (s, d) => build(s, d, { design: { design: { garage: 'double' } } }) },
    measure, bites: ['buildQuote'], downstream: money,
  },
  {
    id: 'bigger-house',
    features: [F('"Floors"'), F('"Width (m)"'), F('"Depth (m)"'), F('"Floor Area (m²)"'), F('{`${ROOM_WORDS[r.kind]} ${i + 1} (m²)`}')],
    decision: 'Design a bigger house: 180 m² on two floors, 12 by 7.5 metres, a larger living room',
    reads: [`${BU}#saveDesign`, `${BU}#designProblems`, `${BU}#buildQuote`],
    base: { daily: (s, d) => build(s, d) },
    variant: { daily: (s, d) => build(s, d, { design: { floorAreaM2: 180, design: { floors: 2, widthM: 12, depthM: 7.5 }, rooms: [{ kind: 'living', areaM2: 40 }, { kind: 'kitchen', areaM2: 16 }, { kind: 'dining', areaM2: 14 }, { kind: 'bedroom', areaM2: 16 }, { kind: 'bedroom', areaM2: 13 }, { kind: 'bedroom', areaM2: 12 }, { kind: 'bathroom', areaM2: 8 }, { kind: 'half-bath', areaM2: 3 }, { kind: 'laundry', areaM2: 5 }] } }) },
    measure, bites: ['buildQuote'], downstream: money,
  },
  {
    id: 'balconies',
    features: [F('"Balconies"')],
    decision: 'Design the house with two balconies rather than none',
    reads: [`${BU}#saveDesign`, `${BU}#buildQuote`],
    base: { daily: (s, d) => build(s, d) },
    variant: { daily: (s, d) => build(s, d, { design: { design: { balconies: 2 } } }) },
    measure, bites: ['buildQuote'], downstream: money,
  },
  {
    id: 'a-porch',
    features: [F('{title(o)}')],
    decision: 'Design the house with a porch and a fence',
    reads: [`${BU}#saveDesign`, `${BU}#buildQuote`],
    base: { daily: (s, d) => build(s, d) },
    variant: { daily: (s, d) => build(s, d, { design: { design: { outdoor: ['porch', 'fence'] } } }) },
    measure, bites: ['buildQuote'], downstream: money,
  },
  {
    id: 'resume-building',
    seeds: 40,
    features: ['action:homes/building.resumeBuild'],
    decision: 'Resume a building paused for want of money, once the money is there',
    reads: [`${BU}#resumeBuild`, `${BU}#startStage`],
    // Labelled fixture: the build is paused as it would be when a stage can't be paid; the decision is to resume it.
    base: { daily: pauseThen(false) },
    variant: { daily: pauseThen(true) },
    measure, bites: ['buildStagesDone'], downstream: money,
  },
  {
    id: 'let-the-home',
    features: ['action:homes/letting.advertise', 'action:homes/letting.chooseTenant', F('{`Rent A Month (${cur})`}')],
    decision: 'Let the Los Angeles home at the fair rent, to the first applicant',
    reads: [`${LE}#advertise`, `${LE}#chooseTenant`, `${LE}#receiveRent`],
    base: { daily: (s, d) => void buy(s, d, CASH) },
    variant: { daily: (s, d) => { buy(s, d, CASH); letIt(s); } },
    measure, bites: ['letRents', 'letIncome'], downstream: money,
  },
  {
    id: 'cheaper-rent',
    features: [F('{`New Rent (${cur})`}'), 'action:homes/letting.changeRent'],
    decision: 'Lower the advertised rent to 80% of the fair rent when applicants come, rather than keep it',
    reads: [`${LE}#changeRent`, `${LE}#chooseTenant`, `${LE}#receiveRent`],
    base: { daily: (s, d) => { buy(s, d, CASH); letIt(s); } },
    variant: { daily: (s, d) => { buy(s, d, CASH); letIt(s, { changeTo: 0.8 }); } },
    measure, bites: ['letIncome'], downstream: money,
  },
  {
    id: 'agent-manages',
    features: [F('"Have An Agent Manage It"')],
    decision: 'Have an agent manage the letting, for 10% of the rent',
    reads: [`${LE}#advertise`, `${LE}#receiveRent`],
    base: { daily: (s, d) => { buy(s, d, CASH); letIt(s, { approve: true }); } },
    variant: { daily: (s, d) => { buy(s, d, CASH); letIt(s, { manager: true, capUsd: 500, approve: true }); } },
    measure, bites: ['letCosts'], downstream: money,
  },
  {
    id: 'repair-limit',
    seeds: 80,
    features: [F('{`Repair Limit (${cur})`}')],
    decision: "Let the agent repair up to $2,000 without asking, rather than nothing",
    reads: [`${LE}#receiveRent`, `${LE}#approveLandlordRepair`],
    base: { daily: (s, d) => { buy(s, d, CASH); letIt(s, { manager: true, capUsd: 0 }); } },
    variant: { daily: (s, d) => { buy(s, d, CASH); letIt(s, { manager: true, capUsd: 2000 }); } },
    measure, bites: ['letCosts'], downstream: money,
  },
  {
    id: 'approve-tenant-repair',
    seeds: 80,
    features: ['action:homes/letting.approveLandlordRepair'],
    decision: "Approve the repairs your tenant asks for",
    reads: [`${LE}#approveLandlordRepair`, `${LE}#receiveRent`],
    base: { daily: (s, d) => { buy(s, d, CASH); letIt(s); } },
    variant: { daily: (s, d) => { buy(s, d, CASH); letIt(s, { approve: true }); } },
    measure, bites: ['letCosts'], downstream: money,
  },
  {
    id: 'end-the-letting',
    features: ['action:homes/letting.endLetting'],
    decision: 'Give the tenant notice after six rents',
    reads: [`${LE}#endLetting`, `${LE}#lettingEnds`],
    base: { daily: (s, d) => { buy(s, d, CASH); letIt(s); } },
    variant: { daily: (s, d) => { buy(s, d, CASH); letIt(s, { endAfterRents: 6 }); } },
    measure, bites: ['letRents', 'lettingsEnded'], downstream: money,
  },
];

// ---------------- Longer steps ----------------

/** Rent, have the landlord agree to paint (on condition it's put back), paint, give notice; put it back or not. */
function paintThenLeave(undo: boolean) {
  return (s: GameState, d: number) => {
    const t = rent(s, d);
    if (!t || t.stage === 'applied' || t.stage === 'approved' || t.stage === 'signed') return;
    const hs = homesOf(s);
    if (t.stage === 'active' && !hs.permissions.length) askPermission(s, t.homeId, 'paint');
    if (hs.permissions[0]?.stage === 'granted' && !hs.jobs.length) startWork(s, t.homeId, 'paint');
    const painted = hs.jobs[0]?.stage === 'done';
    if (painted && t.stage === 'active') giveNotice(s, t.id);
    if (undo && t.stage === 'notice' && t.changes.some((c) => c.restore && !c.restored)) restoreChange(s, t.id, 'paint');
  };
}
/** Rent, give notice at once (the year's term), and at move-out dispute the deductions or not. */
function leaveAfterAYear(dispute: boolean) {
  return (s: GameState, d: number) => {
    const t = rent(s, d);
    if (t?.stage === 'active') giveNotice(s, t.id);
    if (dispute && t?.stage === 'ended' && t.refundedMinor === undefined && !t.disputed && t.deductions?.some((x) => !x.wear && x.minor > 0)) disputeDeductions(s, t.id);
  };
}
function failNextRent(t: { rentMinor: number; arrearsMinor: number; arrearsSince?: number; rentsPaid: number; payments: Payment[] }) {
  // As rentDue does when the bank refuses a payment: owed, recorded as failed.
  t.arrearsMinor += t.rentMinor; t.arrearsSince = Date.now(); t.rentsPaid += 1;
  t.payments.push({ key: 'probe:failed', at: 0, label: 'Rent not paid (the bank refused it)', minor: t.rentMinor, kind: 'failed' });
}
/** Own the LA home; book a new kitchen (it waits on nothing for an owner), and cancel it before it starts, or let it run. */
function workThen(cancel: boolean) {
  return (s: GameState, d: number) => {
    buy(s, d, CASH);
    const o = owned(s);
    const hs = homesOf(s);
    if (o && !hs.jobs.length) tryIt(() => void startWork(s, o.homeId, 'kitchen-refit' as WorkKind));
    const j = hs.jobs[0];
    if (cancel && j && (j.stage === 'scheduled' || j.stage === 'awaiting-permission')) cancelWork(s, j.id);
  };
}
/** Own the LA home; buy a washer for a room of a kind; install it when it comes, or not. */
function washerIn(kind: 'bedroom' | 'laundry', install = true) {
  return (s: GameState, d: number) => {
    buy(s, d, CASH);
    const o = owned(s);
    const hs = homesOf(s);
    if (!o) return;
    const home = hs.homes[o.homeId];
    const room = home.rooms.find((r) => r.kind === kind) ?? home.rooms.find((r) => kind === 'laundry' ? r.services.includes('drain') && r.services.includes('water') : !r.services.includes('drain'));
    if (room && !hs.items.length && !(hs as { tried?: boolean }).tried) { (hs as { tried?: boolean }).tried = true; tryIt(() => void buyItem(s, home.id, WASHER, room.id)); }
    const it = hs.items[0];
    if (install && it?.stage === 'delivered') tryIt(() => installItem(s, it.id));
  };
}
function dishwasher(measureIt: boolean) {
  return (s: GameState, d: number) => {
    buy(s, d, CASH);
    const o = owned(s);
    const hs = homesOf(s);
    if (!o || !WASHER_NO_DEPTH) return;
    const home = hs.homes[o.homeId];
    const room = home.rooms.find((r) => r.services.includes('water') && r.services.includes('drain') && r.kind !== 'bathroom') ?? home.rooms.find((r) => r.services.includes('drain'));
    if (room && !hs.items.length) tryIt(() => void buyItem(s, home.id, WASHER_NO_DEPTH as CatalogItem, room.id));
    const it = hs.items[0];
    if (measureIt && it?.stage === 'needs-measurements') tryIt(() => measureForInstall(s, it.id));
    if (it?.stage === 'delivered') tryIt(() => installItem(s, it.id));
  };
}
function deskThen(then: (s: GameState, id: string) => void) {
  return (s: GameState, d: number) => {
    const t = rent(s, d);
    const hs = homesOf(s);
    if (t?.stage === 'active' && !hs.items.length) buyItem(s, t.homeId, DESK, hs.homes[t.homeId].rooms[0].id);
    const it = hs.items[0];
    if (it?.stage === 'installed' && !(it as { probed?: boolean }).probed) { (it as { probed?: boolean }).probed = true; then(s, it.id); }
  };
}
/** Own the LA house with buildings cover; report the roof, approve the repair; claim for it or not. */
function roofRepair(claim: boolean) {
  return (s: GameState, d: number) => {
    buy(s, d, CASH, { pick: (h) => h.form === 'detached' || h.form === 'townhouse' });
    const o = owned(s);
    const hs = homesOf(s);
    if (!o) return;
    const home = hs.homes[o.homeId];
    if (!hs.policies.length) tryIt(() => void buyInsurance(s, home.id, 'buildings'));
    if (hs.policies.length && !hs.repairs.length && s.now - o.since > 5 * 86_400_000) tryIt(() => { const r = reportRepair(s, home.id, 'Roof'); approveRepair(s, r.id); });
    const r = hs.repairs[0];
    if (claim && r && !r.claimed && (r.stage === 'booked' || r.stage === 'fixed')) tryIt(() => claimRepair(s, r.id));
  };
}
/** Build in Austin; the first stage is paused as a stage that can't be paid is; resume it or not. */
function pauseThen(resume: boolean) {
  return (s: GameState, d: number) => {
    build(s, d, { resume });
    const b = homesOf(s).builds[0];
    if (b?.stage === 'building' && b.current === 1 && !(b as { pausedOnce?: boolean }).pausedOnce) {
      (b as { pausedOnce?: boolean }).pausedOnce = true;
      b.stage = 'paused'; b.pausedBecause = 'There wasn\'t enough money for the next stage.';
    }
  };
}
void LA;
