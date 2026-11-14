/**
 * Visitor visas (`content/visas.ts`, from 2026-09-29): what a country asks of a citizenship, and entry on a visa held.
 * Applying for one on Papers (`documents.apply_visa`) and its interview were tested here until the connected world of
 * 2026-10-09 retired the applications: nothing crosses a border since travel went in the scope reset, so a visa bought
 * was a fee for a document nothing reads. One pending in a save from before is still decided.
 */
import { describe, expect, it } from 'vitest';
import { quickSave } from '../../src/engine/bankworld';
import { MS_DAY } from '../../src/engine/bankworld/core/time';
import { documentsOf, mayEnter } from '../../src/engine/bankworld/systems/documents';

function citizen(city: string, citizenship: string, seed: string) {
  const sim = quickSave({ startLocationId: city, homeRegionId: city, livesWhereBorn: true, wealth: 'wealthy' }, seed);
  sim.player.citizenshipId = citizenship;
  const iso = citizenship.toUpperCase();
  for (const d of documentsOf(sim.player)) if (d.kind === 'passport') d.status = 'cancelled';
  documentsOf(sim.player).push({ id: 'pp', kind: 'passport', issuer: iso, name: 'Passport', number: 'P1', status: 'valid', issuedAt: sim.now - MS_DAY, expiresAt: sim.now + 3650 * MS_DAY });
  return sim;
}

describe('a visitor visa', () => {
  it('is what the US asks of a Mexican, issued by its consulate, and a visa held lets them in', () => {
    const sim = citizen('mx-cmx-mexicocity', 'mx', 'visa-us');
    expect(mayEnter(sim.player, 'US', sim.now).ok).toBe(false);
    expect(mayEnter(sim.player, 'US', sim.now).missing.join(' ')).toMatch(/B-1\/B-2 Visitor Visa, issued by its consulate/);
    // Test setup: a visa a save from before 2026-10-09 holds.
    documentsOf(sim.player).push({ id: 'v1', kind: 'visa', issuer: 'US', name: 'B-1/B-2 Visitor Visa', number: 'V1', status: 'valid', issuedAt: sim.now - MS_DAY, expiresAt: sim.now + 3650 * MS_DAY, destination: 'US', passportId: 'pp' });
    expect(mayEnter(sim.player, 'US', sim.now).ok).toBe(true);
  });

  it('isn’t applied for since travel went, and one pending from before is still decided', () => {
    const sim = citizen('br-27-saopaulo', 'br', 'visa-mx');
    expect(sim.commandKinds()).not.toContain('documents.apply_visa');
    expect(sim.commandKinds()).not.toContain('documents.apply_authorization');
    // Test setup: Mexico's e-visa, applied for in a save from before 2026-10-09 and waiting on its decision.
    documentsOf(sim.player).push({ id: 'v2', kind: 'visa', issuer: 'MX', name: 'Visa Electrónica', number: 'V2', status: 'pending', appliedAt: sim.now, readyAt: sim.now + MS_DAY, destination: 'MX', passportId: 'pp' });
    sim.schedule({ at: sim.now + MS_DAY, kind: 'documents.decided', label: 'Decided', category: 'system', priority: 20, payload: { personId: sim.player.id } });
    sim.advanceBy(2 * MS_DAY);
    expect(documentsOf(sim.player).find((d) => d.id === 'v2')!.status).toBe('valid');
  });
});
