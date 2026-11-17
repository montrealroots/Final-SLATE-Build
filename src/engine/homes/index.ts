// Homes & Property on the game's clock (from November 17, 2026): every housing event is one kind, 'home', carrying its
// step. The main clock runs them in order with everything else, once each; a reload resumes from the saved queue, and
// a closed game runs none. This module registers it at startup (engine/index.ts imports it), so a save with housing
// events pending runs them as soon as it's opened.
import { getPlace } from '../../data/places';
import { newId, registerCommitmentSource, registerHandler } from '../state';
import type { GameState } from '../types';
import { answerOffer, buyerOffer, complete, completeSale, decideFinance, inspect, mortgageDue } from './buying';
import { applicantsArrive, lettingEnds, receiveRent } from './letting';
import { decideClaim, deliver, monthlyBill, warrantyRepair, workDone, workStart } from './living';
import { decideApproval, fixDefect, investigationReport, stageEnd } from './building';
import { decideApplication, decidePermission, depositInstalment, endTenancy, rentDue, repairVisit, settleDeposit } from './renting';
import { WORK, type Home } from './model';
import { addDaysToKey, formatDateKey, homesOf, instantOn, note, pin, scheduleHome, todayAt } from './core';

registerHandler('home', (state, ev) => {
  const hs = homesOf(state);
  const p = ev.payload as Record<string, string | number>;
  const id = String(p.id ?? '');
  switch (p.step) {
    case 'viewing': { const v = hs.viewings.find((x) => x.id === id); if (v) view(state, v); break; }
    case 'rent-decision': { const t = hs.tenancies.find((x) => x.id === id); if (t) decideApplication(state, t); break; }
    case 'rent-due': { const t = hs.tenancies.find((x) => x.id === id); if (t) rentDue(state, t, Number(p.n)); break; }
    case 'deposit-instalment': { const t = hs.tenancies.find((x) => x.id === id); if (t) depositInstalment(state, t, Number(p.n)); break; }
    case 'repair-visit': { const r = hs.repairs.find((x) => x.id === id); if (r) repairVisit(state, r); break; }
    case 'permission-decision': { const x = hs.permissions.find((y) => y.id === id); if (x) decidePermission(state, x); break; }
    case 'tenancy-end': { const t = hs.tenancies.find((x) => x.id === id); if (t) endTenancy(state, t); break; }
    case 'deposit-settle': { const t = hs.tenancies.find((x) => x.id === id); if (t) settleDeposit(state, t); break; }
    case 'offer-answer': { const x = hs.purchases.find((y) => y.id === id); if (x) answerOffer(state, x); break; }
    case 'inspection': { const x = hs.purchases.find((y) => y.id === id); if (x) inspect(state, x); break; }
    case 'finance-decision': { const x = hs.purchases.find((y) => y.id === id); if (x) decideFinance(state, x); break; }
    case 'completion': { const x = hs.purchases.find((y) => y.id === id); if (x) complete(state, x); break; }
    case 'mortgage-due': mortgageDue(state, String(p.homeId), Number(p.n)); break;
    case 'buyer-offer': { const s = hs.sales.find((y) => y.id === id); if (s) buyerOffer(state, s); break; }
    case 'sale-completion': { const s = hs.sales.find((y) => y.id === id); if (s) completeSale(state, s); break; }
    case 'delivery': { const it = hs.items.find((y) => y.id === id); if (it) deliver(state, it); break; }
    case 'warranty-repair': { const it = hs.items.find((y) => y.id === id); if (it) warrantyRepair(state, it); break; }
    case 'work-start': { const j = hs.jobs.find((y) => y.id === id); if (j) workStart(state, j); break; }
    case 'work-done': { const j = hs.jobs.find((y) => y.id === id); if (j) workDone(state, j); break; }
    case 'claim-decision': decideClaim(state, String(p.policyId), String(p.repairId)); break;
    case 'bill': monthlyBill(state, String(p.homeId)); break;
    case 'investigation': investigationReport(state, String(p.landId), p.kind as never); break;
    case 'build-permission': { const b = hs.builds.find((y) => y.id === id); if (b) decideApproval(state, b, Number(p.revision)); break; }
    case 'build-stage-end': { const b = hs.builds.find((y) => y.id === id); if (b) stageEnd(state, b, Number(p.stage), Number(p.attempt)); break; }
    case 'defect-fix': { const b = hs.builds.find((y) => y.id === id); if (b) fixDefect(state, b, String(p.defect)); break; }
    case 'let-applicants': { const l = hs.lettings.find((y) => y.id === id); if (l) applicantsArrive(state, l); break; }
    case 'let-rent': { const l = hs.lettings.find((y) => y.id === id); if (l) receiveRent(state, l, Number(p.n)); break; }
    case 'let-end': { const l = hs.lettings.find((y) => y.id === id); if (l) lettingEnds(state, l); break; }
  }
  return { suppressInterrupt: ev.attention === 'silent' };
});

/** What's coming in the calendar: viewings, decisions, payments and dates that matter, from the housing queue. */
const LABEL: Record<string, (state: GameState, p: Record<string, unknown>) => string | null> = {
  viewing: (s, p) => { const v = homesOf(s).viewings.find((x) => x.id === p.id); return v ? `Viewing: ${homesOf(s).homes[v.homeId]?.title}` : null; },
  'rent-decision': () => 'Landlord Decides Your Application',
  'rent-due': () => 'Rent Due',
  'tenancy-end': () => 'Your Tenancy Ends',
  'offer-answer': () => 'Seller Answers Your Offer',
  inspection: () => 'Home Inspection',
  completion: () => 'Purchase Completion',
  'mortgage-due': () => 'Mortgage Payment',
  'sale-completion': () => 'Sale Completion',
  delivery: (s, p) => `Delivery: ${homesOf(s).items.find((x) => x.id === p.id)?.name ?? 'An Item'}`,
  'work-start': (s, p) => { const j = homesOf(s).jobs.find((x) => x.id === p.id); return j ? `Work Starts: ${WORK[j.work].label}` : null; },
  'work-done': (s, p) => { const j = homesOf(s).jobs.find((x) => x.id === p.id); return j ? `Work Finishes: ${WORK[j.work].label}` : null; },
  'build-permission': () => 'Building Approval Decision',
  'build-stage-end': () => 'Building Stage Due To Finish',
  'let-end': () => "Your Tenant's Tenancy Ends",
  bill: () => 'Household Bills',
};
registerCommitmentSource((state, from, to) => state.events
  .filter((e) => e.kind === 'home' && e.at >= from && e.at <= to)
  .flatMap((e) => { const l = LABEL[String(e.payload.step)]?.(state, e.payload); return l ? [{ id: e.id, at: e.at, label: l, route: { view: 'homes' } as never, kind: 'event' as const }] : []; }));

// ---------------- Viewing and favorites ----------------

/** Arrange to see a home: in person, at 11:00 on the day you choose. What a casual viewing can and can't tell you. */
export function arrangeViewing(state: GameState, offer: Home, day: string): void {
  const home = pin(state, offer);
  const today = todayAt(state, home);
  if (day < today) throw new Error('Choose a day from today on.');
  if (day > home.validUntil) throw new Error(`This offer stands until ${formatDateKey(home.validUntil)}: choose a day before then.`);
  const hs = homesOf(state);
  if (hs.viewings.some((v) => v.homeId === home.id && !v.seen)) throw new Error('You already have a viewing booked here.');
  if (getPlace(home.placeId).id !== state.locationId && getPlace(home.placeId).name !== getPlace(state.locationId).name) note(state, home.id, `${home.title} is in ${getPlace(home.placeId).name}: be there on the day.`);
  const id = newId(state, 'view');
  const at = instantOn(home, day, 11);
  hs.viewings.push({ id, homeId: home.id, at });
  scheduleHome(state, at, 'viewing', { id }, 'notify', `home-view:${id}`);
  note(state, home.id, `Viewing booked: ${home.title}, ${formatDateKey(day)} at 11:00.`);
}
function view(state: GameState, v: { id: string; homeId: string; at: number; seen?: boolean; notes?: string[] }): void {
  if (v.seen) return;
  const home = homesOf(state).homes[v.homeId];
  if (!home) return;
  v.seen = true;
  const visible = (Object.entries(home.condition) as [string, string][]).filter(([k, g]) => g !== 'good' && (k === 'finishes' || k === 'roof' || k === 'heating'));
  v.notes = [
    ...(visible.length ? visible.map(([k, g]) => `${k === 'finishes' ? 'Floors and walls' : k[0].toUpperCase() + k.slice(1)} look ${g}.`) : ['Nothing obviously wrong to see.']),
    ...(home.sharedAmenities.length ? [`Shared with the building: ${home.sharedAmenities.join(', ')}.`] : []),
    'A viewing shows what can be seen: the wiring, plumbing and structure need an inspection.',
  ];
  note(state, home.id, `You viewed ${home.title}. ${v.notes[0]}`);
}
export function toggleFavorite(state: GameState, offer: Home): boolean {
  const hs = homesOf(state);
  const i = hs.favorites.indexOf(offer.id);
  if (i >= 0) { hs.favorites.splice(i, 1); return false; }
  pin(state, offer);
  hs.favorites.push(offer.id);
  return true;
}
export { addDaysToKey, scheduleHome };
