// Papers for working abroad, and where a story is set apart from where it is filmed (src/engine/papers.ts,
// destinations.ts; the owner's v8 package, 05 and 06; A16, A17).
import { describe, expect, it } from 'vitest';
import { processUntil } from './engine-api';
import { applyForPermit, applyForVisa, entryRight, passportFor, permitRefusal, recordWorkDay, visaCheck, workRight, applications } from '../src/engine/papers';
import { personalBalance } from '../src/engine/personal';
import { filmPlace, setFilmedAt } from '../src/engine/destinations';
import { schedule } from '../src/engine/state';
import { approve, buildProject, startLife } from './helpers';

// The fixture player is Japanese and French and lives in London.
describe('A16: a passport lets you travel; it doesn\'t let you work', () => {
  it('reads citizenship, where you live, a treaty right, and the permit everyone else needs', () => {
    const s = startLife('papers');
    expect(workRight(s, 'FR')).toMatchObject({ can: true, why: 'You are a citizen of France.' });
    expect(workRight(s, 'GB')).toMatchObject({ can: true, assumed: true }); // where you live: the game's assumption, said as one
    expect(workRight(s, 'NO')).toMatchObject({ can: true, why: 'Your France passport gives you the right to live and work in Norway.' }); // the shared market
    const us = workRight(s, 'US');
    expect(us).toMatchObject({ can: false, route: 'O-1 (extraordinary ability in the arts, or extraordinary achievement in motion pictures or television)', missing: ["the permit's fee", 'how long the decision takes'] });
  });

  it('acting isn\'t directing or producing: the work records are a performer\'s', () => {
    const s = startLife('papers-activity');
    // Japanese and French: free in Norway for all of it, by the shared market; in Australia, a performer's route only.
    expect(['act', 'direct', 'produce'].map((a) => workRight(s, 'NO', a as never).can)).toEqual([true, true, true]);
    expect(workRight(s, 'AU', 'act').can).toBe(false);
    expect(workRight(s, 'AU', 'direct')).toMatchObject({ can: false, missing: ['what directing there needs'] });
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

  it('a work permit is never taken without the fee and time the records lack, and nothing is charged', () => {
    const s = startLife('papers-permit');
    const before = personalBalance(s);
    expect(() => applyForPermit(s, 'US')).toThrow("The records don't give the permit's fee or how long the decision takes, so the game can't take an application.");
    expect(permitRefusal(s, 'US')).toMatch(/can't take an application/);
    expect(personalBalance(s)).toBe(before);
  });

  it('a visa with a recorded fee and time: checked, paid from the bank, decided on its day, used, and expired', () => {
    // A Brazilian in Mexico City, visiting the United States: 1221's B-1/B-2 record, $185 and 157 days.
    const s = startLife('papers-visa', 'mx-mexico-city', { nationalities: ['BR'], birthplaceId: 'br-sao-paulo' } as never);
    expect(entryRight(s, 'US')).toMatchObject({ kind: 'needs', entry: 'visa' });
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

  it('a visa the records give no fee or time for is never taken, and says what is missing', () => {
    const s = startLife('papers-novisa');
    const c = visaCheck(s, 'IN'); // India asks a Japanese or French visitor for an e-Visa: its fee and time aren't recorded
    expect(c).toMatchObject({ ok: false, missing: ['the fee', 'how long the decision takes'] });
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
    expect(s.log[0].text).toMatch(/^You can't work in Los Angeles: To act in United States you need O-1/);
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
    // A route whose time isn't recorded is never taken: Kenya's.
    const ke = startLife('papers-ke', 'ke-nairobi', { nationalities: ['KE'], birthplaceId: 'ke-nairobi' } as never);
    expect(passportOffers(ke)[0].missing).toEqual(['how long it takes']);
    expect(() => applyForRecordedPassport(ke, 0)).toThrow("The records don't give how long it takes for this route, so the game can't take an application.");
  });
});
