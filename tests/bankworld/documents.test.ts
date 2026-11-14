/**
 * Papers, and what they let a person do (docs/WORLD.md, stage 1): entering a
 * country on a passport and the authorization or visa its rule for their
 * citizenship asks, and driving on a license where the road's rules allow.
 */
import { describe, expect, it } from 'vitest';
import { createSave, loadSave, quickSave } from '../../src/engine/bankworld';
import { newLifeConfig } from '../../src/engine/bankworld/world/bootstrap';
import { deserialise, serialise } from '../../src/engine/bankworld/persistence/adapter';
import { MS_DAY } from '../../src/engine/bankworld/core/time';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { STARTING, documentsOf, inForce, mayDrive, mayEnter, passportOf, type PersonDocument } from '../../src/engine/bankworld/systems/documents';
import { ENTRY } from '../../src/engine/bankworld/content/entry';

const YEAR = 365.25 * MS_DAY;
/** A life with no papers yet, so each test hands it exactly the ones it means. */
const life = (seed: string, born = 'us-ny-newyork') => { const sim = quickSave({ startLocationId: 'us-ny-newyork', homeRegionId: born, livesWhereBorn: born === 'us-ny-newyork', wealth: 'wealthy' }, seed); sim.player.documents = []; return sim; };
function holds(sim: Simulation, doc: Partial<PersonDocument> & Pick<PersonDocument, 'kind' | 'issuer'>): PersonDocument {
  const d: PersonDocument = { id: `d${documentsOf(sim.player).length}`, name: doc.kind, number: 'X1', status: 'valid', issuedAt: sim.now - YEAR, expiresAt: sim.now + 5 * YEAR, ...doc };
  documentsOf(sim.player).push(d);
  return d;
}

describe('entering a country', () => {
  it('asks a US citizen for a passport, then the UK’s ETA at its £20, and an ETA held lets them in', () => {
    const sim = life('entry-gb');
    expect(sim.player.citizenshipId).toBeDefined();
    const none = mayEnter(sim.player, 'GB', sim.now);
    expect(none.ok).toBe(false);
    expect(none.missing[0]).toMatch(/passport/i);
    holds(sim, { kind: 'passport', issuer: 'US' });
    const noEta = mayEnter(sim.player, 'GB', sim.now);
    expect(noEta.missing.join(' ')).toMatch(/ETA/);
    expect(ENTRY.GB!.authorizations.ETA!.fee).toBe(20);
    // Test setup: an ETA a save from before 2026-10-09 holds; applying for one went with travel.
    holds(sim, { kind: 'authorization', issuer: 'GB', name: 'ETA', destination: 'GB', passportId: passportOf(sim.player, sim.now)!.id });
    const answer = mayEnter(sim.player, 'GB', sim.now);
    expect(answer.ok).toBe(true);
    expect(answer.stay).toMatch(/180 days/);
    // Tied to the passport: lost, the ETA goes with it.
    const passport = passportOf(sim.player, sim.now)!;
    expect(sim.execute({ kind: 'documents.report_lost', payload: { documentId: passport.id } }).ok).toBe(true);
    expect(mayEnter(sim.player, 'GB', sim.now).ok).toBe(false);
  });

  it('holds a passport to Schengen’s rule: three months past leaving, issued within ten years; and ETIAS, not live, asks nothing', () => {
    const sim = life('entry-schengen');
    const passport = holds(sim, { kind: 'passport', issuer: 'US', expiresAt: sim.now + 60 * MS_DAY });
    expect(mayEnter(sim.player, 'FR', sim.now, 7).missing.join(' ')).toMatch(/3 months/);
    passport.expiresAt = sim.now + 5 * YEAR;
    passport.issuedAt = sim.now - 11 * YEAR;
    expect(mayEnter(sim.player, 'FR', sim.now, 7).missing.join(' ')).toMatch(/10 years/);
    passport.issuedAt = sim.now - YEAR;
    expect(mayEnter(sim.player, 'FR', sim.now, 7).ok).toBe(true);
    // The UK asks validity only for the stay.
    passport.expiresAt = sim.now + 20 * MS_DAY;
    holds(sim, { kind: 'authorization', issuer: 'GB', destination: 'GB', passportId: passport.id, expiresAt: passport.expiresAt });
    expect(mayEnter(sim.player, 'GB', sim.now, 7).ok).toBe(true);
    // A visit longer than the rule allows is not a visit.
    expect(mayEnter(sim.player, 'FR', sim.now, 100).missing.join(' ')).toMatch(/90 days/);
  });

  it('asks a Mexican citizen for a US visa, lets an Irish citizen into the UK freely, and says when it has no rule', () => {
    const mx = life('entry-mx', 'mx-cmx-mexicocity');
    holds(mx, { kind: 'passport', issuer: 'MX' });
    expect(mayEnter(mx.player, 'US', mx.now).missing.join(' ')).toMatch(/visa/i);
    // Permission to work in the US, held in force, is what its holder travels back on: SLATE's stand-in for the consulate's stamp.
    holds(mx, { kind: 'permit', issuer: 'US', destination: 'US' });
    expect(mayEnter(mx.player, 'US', mx.now).ok).toBe(true);
    const ie = life('entry-ie', 'ie-lei-dublin');
    holds(ie, { kind: 'passport', issuer: 'IE' });
    expect(mayEnter(ie.player, 'GB', ie.now).ok).toBe(true);
    expect(mayEnter(ie.player, 'GB', ie.now).stay).toMatch(/Free movement/);
    expect(mayEnter(ie.player, 'NG', ie.now).missing.join(' ')).toMatch(/doesn’t have/);
    // A British citizen, to Australia: its eVisitor, which costs nothing.
    const gb = life('entry-gb-au', 'uk-eng-london');
    holds(gb, { kind: 'passport', issuer: 'GB' });
    expect(mayEnter(gb.player, 'AU', gb.now).missing.join(' ')).toMatch(/citizens of the United Kingdom for [^:]+: no fee/);
  });
});

describe('driving', () => {
  it('lets a New York license drive in Connecticut, in London for a year, and in Tokyo only with a permit', () => {
    const sim = life('drive');
    expect(mayDrive(sim.player, 'us-ny-newyork', sim.now).ok).toBe(false);
    holds(sim, { kind: 'license', issuer: 'us-ny' });
    expect(mayDrive(sim.player, 'us-ny-newyork', sim.now).ok).toBe(true);
    expect(mayDrive(sim.player, 'us-ct-newhaven', sim.now).ok).toBe(true);
    expect(mayDrive(sim.player, 'uk-eng-london', sim.now, sim.now - 30 * MS_DAY).ok).toBe(true);
    expect(mayDrive(sim.player, 'uk-eng-london', sim.now, sim.now - 400 * MS_DAY).ok).toBe(false);
    const tokyo = mayDrive(sim.player, 'jp-13-tokyo', sim.now);
    expect(tokyo.ok).toBe(false);
    expect(tokyo.why).toMatch(/International Driving Permit/);
    holds(sim, { kind: 'idp', issuer: 'us' });
    expect(mayDrive(sim.player, 'jp-13-tokyo', sim.now).ok).toBe(true);
  });
});

describe('a passport', () => {
  it('is applied for at the office’s fee and issued in its days, expedited faster for more; the new one cancels the old and what was issued on it', () => {
    const sim = life('passport-us');
    const bank = () => Object.values(sim.universe.accounts).filter((a) => a.ownerId === sim.player.id && !a.nominal && (a.kind === 'checking' || a.kind === 'savings')).reduce((x, a) => x + a.balance, 0);
    const before = bank();
    const a = sim.execute<{ readyAt: number; fee: number }>({ kind: 'documents.apply_passport', payload: {} });
    expect(a.ok).toBe(true);
    expect(a.value!.fee).toBe(165_00);
    expect(before - bank()).toBe(165_00);
    expect(Math.round((a.value!.readyAt - sim.now) / MS_DAY)).toBe(42);
    expect(sim.execute({ kind: 'documents.apply_passport', payload: {} }).error).toMatch(/already applied/);
    sim.advanceBy(43 * MS_DAY);
    const first = passportOf(sim.player, sim.now)!;
    expect(Math.round((first.expiresAt! - first.issuedAt!) / YEAR)).toBe(10);
    // To the date, as the office dates it: ten years on, the same day of the same month.
    const issued = new Date(first.issuedAt!).toISOString().slice(0, 10);
    expect(new Date(first.expiresAt!).toISOString().slice(0, 10)).toBe(`${Number(issued.slice(0, 4)) + 10}${issued.slice(4)}`);
    const esta = holds(sim, { kind: 'authorization', issuer: 'US', destination: 'US', passportId: first.id });
    const b = sim.execute<{ readyAt: number; fee: number }>({ kind: 'documents.apply_passport', payload: { expedite: true } });
    // A renewal by mail on Form DS-82, $130 with no acceptance fee, and the $60 to expedite (from 2026-10-16: until then
    // every US application paid the first passport's $165, so this was $225; `US_RENEWAL`).
    expect(b.value!.fee).toBe(190_00);
    expect(Math.round((b.value!.readyAt - sim.now) / MS_DAY)).toBe(21);
    sim.advanceBy(22 * MS_DAY);
    expect(first.status).toBe('cancelled');
    expect(esta.status).toBe('cancelled');
    expect(passportOf(sim.player, sim.now)!.id).not.toBe(first.id);
  });

  it('runs five years for a Spaniard under thirty, as Spain issues it', () => {
    const sim = life('passport-es', 'es-md-madrid');
    expect(sim.execute({ kind: 'documents.apply_passport', payload: {} }).ok).toBe(true);
    // Living in New York, she applies at the consulate, which doesn't issue it on the spot: about three weeks (from
    // 2026-10-16, `PASSPORTS_ABROAD`; until then Madrid's same day, and this waited two days).
    sim.advanceBy(22 * MS_DAY);
    const p = passportOf(sim.player, sim.now)!;
    expect(Math.round((p.expiresAt! - p.issuedAt!) / YEAR)).toBe(5);
  });
});

describe('the papers a life begins with', () => {
  // Not ported: 1221's student status, school and scholarships are excluded (no Yale-only assumptions).
  it.skip('give a student from abroad their passport and an F-1 visa to the degree and its grace, which lets them back into the US', () => {
    const sim = createSave(1, 'start-gb', { ...newLifeConfig(), homeRegionId: 'uk-eng-london', tutorial: false });
    const docs = documentsOf(sim.player);
    expect(docs.some((d) => d.kind === 'passport' && d.issuer === 'GB' && inForce(d, sim.now))).toBe(true);
    const visa = docs.find((d) => d.kind === 'visa' && d.destination === 'US')!;
    expect(new Date(visa.expiresAt!).toISOString().slice(0, 10)).toBe('2029-07-30');
    expect(mayEnter(sim.player, 'US', sim.now).ok).toBe(true);
  });

  it('give a US citizen a passport and a license at the shares that hold them', () => {
    let passports = 0;
    let licenses = 0;
    const n = 400;
    for (let i = 0; i < n; i += 1) {
      const sim = createSave(1, `start-us-${i}`, { ...newLifeConfig(), homeRegionId: 'us-ny-newyork', tutorial: false });
      if (documentsOf(sim.player).some((d) => d.kind === 'passport')) passports += 1;
      if (documentsOf(sim.player).some((d) => d.kind === 'license' && d.issuer === 'us-ny' && inForce(d, sim.now))) licenses += 1;
    }
    expect(passports / n).toBeGreaterThan(STARTING.usPassportShare - 0.07);
    expect(passports / n).toBeLessThan(STARTING.usPassportShare + 0.07);
    expect(licenses / n).toBeGreaterThan(STARTING.usLicenseShare - 0.06);
    expect(licenses / n).toBeLessThan(STARTING.usLicenseShare + 0.06);
  }, 120_000);

  // Not ported: 1221's own old-save migrations aren't ported: no SLATE save was ever a 1221 save.
  it.skip('are given to a save from before papers when it is opened', () => {
    const sim = createSave(1, 'start-old', { ...newLifeConfig(), homeRegionId: 'uk-eng-london', tutorial: false });
    const old = deserialise(serialise(sim.universe));
    delete old.people[old.playerId]!.documents;
    const opened = loadSave(old);
    expect(documentsOf(opened.player).some((d) => d.kind === 'passport')).toBe(true);
  });
});
