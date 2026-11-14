/**
 * The visit an application waits on (`systems/papervisits.ts`, from
 * 2026-10-06): a US visa's interview, the green card's biometrics, Britain's
 * enrolment and Canada's biometrics, each booked on the calendar where the
 * applicant lives, the decision waiting on it, and a miss ending or delaying
 * the application as its authority says.
 *
 * Nothing books one since the connected world of 2026-10-09 (the visas' and the
 * residence routes' applications went), so what's tested is a visit a save
 * from before already has booked: kept, missed and booked again, or missed and
 * the application ended. The applications that booked them were tested here
 * until then.
 */
import { quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY,MS_HOUR } from '../../src/engine/bankworld/core/time';
import { documentsOf,type PersonDocument } from '../../src/engine/bankworld/systems/documents';
import { VISITS, VISIT_KIND, type VisitRule } from '../../src/engine/bankworld/systems/papervisits';
import { describe,expect,it } from 'vitest';

function citizen(city: string, citizenship: string, seed: string): Simulation {
  const sim = quickSave({ startLocationId: city, homeRegionId: city, livesWhereBorn: true, wealth: 'wealthy' }, seed);
  sim.player.citizenshipId = citizenship;
  for (const d of documentsOf(sim.player)) if (d.kind === 'passport') d.status = 'cancelled';
  documentsOf(sim.player).push({ id: 'pp', kind: 'passport', issuer: citizenship.toUpperCase(), name: 'Passport', number: 'P1', status: 'valid', issuedAt: sim.now - MS_DAY, expiresAt: sim.now + 3650 * MS_DAY });
  return sim;
}
/** Out of town through a visit, and back: away on the day, as a trip would leave them. */
function awayFor(sim: Simulation, doc: PersonDocument): void {
  const home = sim.player.currentLocationId;
  sim.advanceTo(doc.visit!.at - MS_HOUR);
  sim.player.currentLocationId = home === 'us-ny-newyork' ? 'us-ca-losangeles' : 'us-ny-newyork';
  sim.advanceTo(doc.visit!.at + MS_HOUR);
  sim.player.currentLocationId = home;
}
const visits = (sim: Simulation) => sim.universe.scheduled.filter((i) => i.kind === VISIT_KIND && i.status === 'pending');
/** Test setup: a visa a save from before 2026-10-09 applied for, its visit booked at ten on a weekday some days on, as the application left it. */
function pendingVisa(sim: Simulation, destination: string, rule: VisitRule, inDays: number, after?: number): PersonDocument {
  const base = new Date(sim.now + inDays * MS_DAY);
  while ([0, 6].includes(base.getUTCDay())) base.setUTCDate(base.getUTCDate() + 1);
  const at = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 16);
  const doc: PersonDocument = { id: `visa-${destination}`, kind: 'visa', issuer: destination, name: destination === 'US' ? 'B-1/B-2 Visitor Visa' : 'Visitor Visa', number: 'V1', status: 'pending', appliedAt: sim.now, readyAt: at + 7 * MS_DAY, destination, passportId: 'pp', visit: { rule, at, cityId: sim.player.currentLocationId, ...(after ? { after } : {}) } };
  documentsOf(sim.player).push(doc);
  sim.schedule({ at, kind: VISIT_KIND, label: VISITS[rule].what, category: 'personal', priority: 33, requiresPlayer: true, durationMinutes: 60, locationId: doc.visit!.cityId, payload: { personId: sim.player.id, documentId: doc.id } });
  sim.schedule({ at: doc.readyAt!, kind: 'documents.decided', label: 'Decided', category: 'system', priority: 20, payload: { personId: sim.player.id } });
  return doc;
}

describe('a US visa’s interview', () => {
  it('kept, decides the visa its week after; missed, a no-show ends the application', () => {
    const kept = citizen('mx-cmx-mexicocity', 'mx', 'visit-us-kept');
    const visa = pendingVisa(kept, 'US', 'us-interview', 14);
    expect(visits(kept)).toHaveLength(1);
    expect(visits(kept)[0]).toMatchObject({ label: 'Visa Interview At The Consulate', locationId: 'mx-cmx-mexicocity', requiresPlayer: true, at: visa.visit!.at });
    kept.advanceTo(visa.visit!.at + 8 * MS_DAY);
    expect(visa.visit!.keptAt).toBe(visa.visit!.at);
    expect(visa.status).toBe('valid');

    const missed = citizen('mx-cmx-mexicocity', 'mx', 'visit-us-missed');
    const no = pendingVisa(missed, 'US', 'us-interview', 14);
    awayFor(missed, no);
    expect(no.status).toBe('cancelled');
    expect(missed.universe.notifications.at(-1)?.body).toMatch(/no-show closes the application/);
  });
});

describe('Canada’s biometrics', () => {
  it('for a visitor visa: missed, booked again inside the letter’s 30 days, and the 18 days run from the day given', () => {
    const sim = citizen('mx-cmx-mexicocity', 'mx', 'visit-ca');
    const applied = sim.now;
    const visa = pendingVisa(sim, 'CA', 'ca-biometrics', 14, 18);
    awayFor(sim, visa);
    expect(visa.status).toBe('pending');
    expect(visa.visit!.at).toBeLessThanOrEqual(applied + 30 * MS_DAY);
    sim.advanceTo(visa.visit!.at + MS_HOUR);
    expect(visa.visit!.keptAt).toBe(visa.visit!.at);
    expect(visa.readyAt).toBe(visa.visit!.at + 18 * MS_DAY);
    sim.advanceTo(visa.readyAt! + MS_HOUR);
    expect(visa.status).toBe('valid');
  });
});
