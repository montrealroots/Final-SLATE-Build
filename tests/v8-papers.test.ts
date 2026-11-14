// Papers for working abroad, and where a story is set apart from where it is filmed (src/engine/papers.ts,
// destinations.ts; the owner's v8 package, 05 and 06; A16, A17).
import { describe, expect, it } from 'vitest';
import { processUntil } from './engine-api';
import { applyForPermit, applyForVisa, entryRight, passportFor, permitCheck, permitRefusal, recordWorkDay, visaCheck, workRight, applications } from '../src/engine/papers';
import { personalBalance, personalPostings } from '../src/engine/personal';
import { filmPlace, setFilmedAt } from '../src/engine/destinations';
import { schedule } from '../src/engine/state';
import { approve, buildProject, startLife } from './helpers';

import type { GameState } from '../src/engine/types';
/** What SLATE has posted to the bank, in dollars at each day's rate: a balance held in pounds moves with the rate, and this doesn't. */
const posted = (x: GameState) => Math.round(personalPostings(x).reduce((a, p) => a + p.amount, 0) * 100) / 100;

// The fixture player is Japanese and French and lives in London.
describe('A16: a passport lets you travel; it doesn\'t let you work', () => {
  it('reads citizenship, where you live, a treaty right, and the permit everyone else needs', () => {
    const s = startLife('papers');
    expect(workRight(s, 'FR')).toMatchObject({ can: true, why: 'You are a citizen of France.' });
    expect(workRight(s, 'GB')).toMatchObject({ can: true, assumed: true }); // where you live: the game's assumption, said as one
    expect(workRight(s, 'NO')).toMatchObject({ can: true, why: 'Your passport from France gives you the right to live and work in Norway.' }); // the shared market
    const us = workRight(s, 'US');
    expect(us).toMatchObject({ can: false, route: 'O-1 (extraordinary ability in the arts, or extraordinary achievement in motion pictures or television)', missing: [] });
  });

  it('acting isn\'t directing or producing: the work records are a performer\'s', () => {
    const s = startLife('papers-activity');
    // Japanese and French: free in Norway for all of it, by the shared market; in Australia, a performer's route only.
    expect(['act', 'direct', 'produce'].map((a) => workRight(s, 'NO', a as never).can)).toEqual([true, true, true]);
    expect(workRight(s, 'AU', 'act').can).toBe(false);
    // The records name a performer's route only; the game takes it for directing too, and says it is its assumption.
    expect(workRight(s, 'AU', 'direct')).toMatchObject({ can: false, route: 'Temporary Activity visa (subclass 408), Entertainment Activities stream' });
    expect((workRight(s, 'AU', 'direct') as { why: string }).why).toMatch(/its assumption\.$/);
  });

  it('a short engagement is worked without a permit up to its days, and not one more', () => {
    const s = startLife('papers-days');
    // The United Kingdom lets a performer work 30 days without the Creative Worker visa: a fixture life that lives elsewhere.
    s.character.livesIn = 'fr-paris';
    s.character.nationalities = ['JP'];
    const gb = workRight(s, 'GB');
    expect(gb).toMatchObject({ can: true });
    for (let i = 0; i < 30; i++) { s.now += 86_400_000; recordWorkDay(s, 'GB'); }
    expect(workRight(s, 'GB')).toMatchObject({ can: false, route: 'Temporary Work – Creative Worker visa' });
  });

  it('a work permit with a researched fee and time: paid from the bank, decided on its day, worked under, and expired', () => {
    // The United States' O-1: the fee from the USCIS fee schedule, $1,655, decided in between 90 and 180 days (the middle, 135).
    const s = startLife('papers-permit');
    const before = posted(s);
    const c = permitCheck(s, 'US');
    expect(c).toMatchObject({ ok: true, feeText: '1,655 USD', terms: { days: 135, estimate: null, stayDays: 1095 } });
    expect((c as { terms: { sources: { kind: string }[] } }).terms.sources[0].kind).toBe('official');
    const a = applyForPermit(s, 'US');
    expect(posted(s)).toBe(before - 1655);
    expect(permitRefusal(s, 'US')).toBe('Your application is being decided.');
    expect(workRight(s, 'US').can).toBe(false); // applied for isn't issued
    processUntil(s, a.decideAt + 1, 'tick', 1_000_000);
    expect(applications(s).find((x) => x.id === a.id)?.stage).toBe('issued');
    expect(workRight(s, 'US')).toMatchObject({ can: true });
    expect(workRight(s, 'US', 'direct').can).toBe(false); // a permit to act isn't one to direct
    processUntil(s, a.decideAt + 1096 * 86_400_000, 'tick', 5_000_000);
    expect(applications(s).find((x) => x.id === a.id)?.stage).toBe('expired');
    expect(workRight(s, 'US').can).toBe(false);
  }, 120_000);

  it('a permit no research covers is taken on the game\'s estimate, from the continent\'s researched routes, and says so', () => {
    const s = startLife('papers-estimate');
    // South Korea's E-6-1: no researched fee yet. Asia has none researched either, so all researched routes are its basis.
    const c = permitCheck(s, 'KR');
    expect(c.ok).toBe(true);
    const t = (c as { terms: { estimate: { where: string } | null; fee: { currency: string }; basis: string } }).terms;
    expect(t.estimate?.where).toBe('all researched routes');
    expect(t.fee.currency).toBe('USD');
    expect(t.basis).toMatch(/^The game's estimate/);
    // In Europe the estimate is the middle of Europe's researched routes.
    s.character.nationalities = ['JP'];
    const it = permitCheck(s, 'IT');
    expect((it as { terms: { estimate: { where: string; from: string[] } } }).terms.estimate).toMatchObject({ where: 'researched routes in Europe', from: ['GB', 'IE', 'FR', 'DE'] });
    const before = personalBalance(s);
    const a = applyForPermit(s, 'IT');
    expect(a.estimate).toBe(true);
    expect(personalBalance(s)).toBeLessThan(before);
  });

  it('a visa with a recorded fee and time: checked, paid from the bank, decided on its day, used, and expired', () => {
    // A Brazilian in Mexico City, visiting the United States: 1221's B-1/B-2 record, $185 and 157 days.
    const s = startLife('papers-visa', 'mx-mexico-city', { nationalities: ['BR'], birthplaceId: 'br-sao-paulo' } as never);
    expect(entryRight(s, 'US')).toMatchObject({ kind: 'needs', entry: 'visa' });
    // Where you live asks no visa of you: the game's assumption, said as one (the owner, November 14, 2026).
    expect(entryRight(s, 'MX')).toMatchObject({ kind: 'lives' });
    expect(entryRight(s, 'MX').why).toMatch(/^You live in Mexico: .*not a checked permission\.$/);
    // A visa with no record says what's missing once, without repeating the entry sentence above it.
    const unrecorded = visaCheck(s, 'IN');
    if (!unrecorded.ok) expect(unrecorded.why).not.toContain(entryRight(s, 'IN').why);
    expect(passportFor(s)).toBeDefined();
    const c = visaCheck(s, 'US');
    expect(c).toMatchObject({ ok: true, feeText: '185 USD' });
    const before = personalBalance(s);
    const a = applyForVisa(s, 'US');
    expect(personalBalance(s)).toBe(before - 185);
    expect(visaCheck(s, 'US')).toEqual({ ok: false, why: 'Your application is being decided.' });
    expect(entryRight(s, 'US').kind).toBe('needs'); // applied for isn't issued
    processUntil(s, a.decideAt - 1000, 'tick', 1_000_000);
    expect(applications(s)[0].stage).toBe('applied');
    processUntil(s, a.decideAt + 1000, 'tick', 1_000_000);
    expect(applications(s)[0].stage).toBe('issued');
    expect(entryRight(s, 'US').kind).toBe('held');
    // A visa to visit isn't leave to work.
    expect(workRight(s, 'US').can).toBe(false);
    processUntil(s, applications(s)[0].expiresAt! + 1000, 'tick', 5_000_000);
    expect(applications(s)[0].stage).toBe('expired');
    expect(entryRight(s, 'US').kind).toBe('needs');
  }, 120_000);

  it('a visa no record gives a fee or time for is taken on the game\'s estimate, and says so', () => {
    const s = startLife('papers-novisa');
    const c = visaCheck(s, 'IN'); // India asks a Japanese or French visitor for an e-Visa: no researched fee or time yet
    expect(c.ok).toBe(true);
    expect((c as { terms: { estimate: unknown; basis: string } }).terms.basis).toMatch(/^The game's estimate/);
  });

  it('on a day filmed where you may not work, the day starts without you, even when you are there', () => {
    const s = startLife('papers-call');
    const p = buildProject(s, { title: 'Harbour', format: 'short', medium: 'live-action' }, [{ name: 'Wren' }], [{ place: 'Quay', intExt: 'EXT', chars: ['Wren'] }]);
    approve(s, p);
    setFilmedAt(p, 'Quay', { placeId: 'us-los-angeles', kind: 'port' });
    // Labelled fixture: a scheduled day at the Quay, and you are in Los Angeles for it.
    const d = { id: 'day-1', date: '2026-01-20', sceneIds: [p.scenes[0].id], locationLabel: 'Quay', status: 'scheduled', episode: 1, interior: false, playerActing: true } as never as (typeof p.schedule.days)[number];
    p.schedule.days.push(d);
    s.locationId = 'us-los-angeles';
    schedule(s, s.now + 1, 'shoot-call', { projectId: p.id, dayId: 'day-1' });
    processUntil(s, s.now + 2, 'tick', 1000);
    expect(d.late).toBe(true);
    expect(s.log[0].text).toMatch(/^You can't work in Los Angeles: To act in the United States you need O-1/);
  });
});

describe('A17: where the story is set and where it is filmed are two things', () => {
  it('changing one never changes the other', () => {
    const s = startLife('setting-filmed');
    const p = buildProject(s, { title: 'Harbour', format: 'short', medium: 'live-action' }, [{ name: 'Wren' }], [{ place: 'Quay', intExt: 'EXT', chars: ['Wren'] }]);
    Object.assign(p.axes, { storySetting: 'Port Venn, a made-up harbour town', settingPlaceId: 'no-tromso' }); // as the brief sets them
    approve(s, p);
    setFilmedAt(p, 'Quay', { placeId: 'us-los-angeles', kind: 'port' });
    expect([p.axes.storySetting, p.axes.settingPlaceId, filmPlace(p, 'Quay').id]).toEqual(['Port Venn, a made-up harbour town', 'no-tromso', 'us-los-angeles']);
    p.axes.storySetting = 'Port Venn, years later'; // the player rewrites the setting
    expect(filmPlace(p, 'Quay').id).toBe('us-los-angeles');
    setFilmedAt(p, 'Quay', null);
    expect([p.axes.storySetting, p.axes.settingPlaceId]).toEqual(['Port Venn, years later', 'no-tromso']);
  });
});

describe('a passport from SLATE-REBUILD\'s records, where 1221 has no office', () => {
  it('is applied for by a recorded route, its fee paid from the bank, and issued after its recorded time, valid its years', async () => {
    const { passportOffers, applyForRecordedPassport, passports } = await import('../src/engine/papers');
    // A Swede living in Stockholm: the standard route, 500 kronor, a week, five years for an adult.
    const s = startLife('papers-se', 'se-stockholm', { nationalities: ['SE'], birthplaceId: 'se-stockholm' } as never);
    const offers = passportOffers(s);
    const i = offers.findIndex((o) => o.route.id === 'standard');
    expect(offers[i]).toMatchObject({ issuer: 'SE', fee: { minor: 50000, currency: 'SEK' }, validYears: 5, missing: [] });
    const before = personalBalance(s);
    applyForRecordedPassport(s, i);
    expect(before - personalBalance(s)).toBeGreaterThan(40); // 500 kronor at the day's reference rate, about $50
    expect(before - personalBalance(s)).toBeLessThan(60);
    const pending = passports(s).find((p) => p.doc.status === 'pending')!;
    expect(pending).toBeDefined();
    processUntil(s, s.now + 6 * 86_400_000, 'tick', 1_000_000);
    expect(passports(s).find((p) => p.doc.id === pending.doc.id)!.inForce).toBe(false); // not before its week
    processUntil(s, s.now + 2 * 86_400_000, 'tick', 1_000_000);
    const issued = passports(s).find((p) => p.doc.id === pending.doc.id)!;
    expect(issued.inForce).toBe(true);
    expect(Math.round((issued.doc.expiresAt! - issued.doc.issuedAt!) / 86_400_000 / 365.25)).toBe(5);
    // A route whose time isn't recorded is taken on the game's estimate, from Africa's recorded offices, and says so: Kenya's
    // (until November 14, 2026, later that day, it was never taken).
    const ke = startLife('papers-ke', 'ke-nairobi', { nationalities: ['KE'], birthplaceId: 'ke-nairobi' } as never);
    const o = passportOffers(ke)[0];
    expect(o).toMatchObject({ missing: [], estimated: ['how long it takes', 'how long it lasts'] });
    expect(o.basis).toMatch(/the game estimates them from the recorded passport offices in Africa, the middle of each\.$/);
    const keBefore = personalBalance(ke);
    applyForRecordedPassport(ke, 0);
    expect(personalBalance(ke)).toBeLessThan(keBefore);
    expect(passports(ke).some((p) => p.doc.status === 'pending')).toBe(true);
  });
});
