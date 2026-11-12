// Licences for existing songs (engine/music.ts; the v4 package, 03; ledger V4-024, V4-026.01, V4-026.02).
import { describe, expect, it } from 'vitest';
import {
  LICENCE_ANSWER_DAYS, RENEWAL_SHARE, agreeLicence, holderFee, licenceTotal, releaseLicenceRefusal, renewLicence, renewalFee, requestLicence, requestRefusal, standingLicence,
  type LicenceScope,
} from '../src/engine/music';
import { attachSong, createSong, detachSong } from '../src/engine/song-actions';
import { deliveryBlockers } from '../src/engine/finish';
import { ledgerTotals } from '../src/engine/budget';
import { deserialize, serialize } from '../src/engine/save';
import { processUntil } from '../src/engine/state';
import { DAY } from '../src/engine/time';
import type { GameState, Project } from '../src/engine/types';
import { agreedFunding, approve, buildProject, startLife } from './helpers';

const US: LicenceScope = { territories: ['US'], media: ['festival', 'digital'], years: 3 };
function film(tag: string) {
  const s = startLife(tag, 'us-los-angeles');
  const p = buildProject(s, { title: 'Night Ferry', format: 'short', medium: 'live-action', runtime: 12 }, [{ name: 'Lena' }], [{ place: 'Pier', chars: ['Lena'], minutes: 6 }]);
  const song = createSong(s, p, { title: 'Harbour Lights', source: 'licensed', holder: 'Tidewater Records', writers: [{ name: 'Ada Brook', music: true, lyrics: true }] });
  attachSong(p, song.id, p.scenes[0].id, 'background', 2);
  approve(s, p);
  agreedFunding(p, 200_000); // labelled fixture: money to pay licences from
  p.finance!.deals.at(-1)!.id = 'fd1'; // an id a save accepts
  return { s, p, song };
}
const answer = (s: GameState) => processUntil(s, s.now + (LICENCE_ANSWER_DAYS + 1) * DAY, 'tick', 100000);
/** Labelled fixture: asked again until the holders give this outcome (their answers are the world seed's). */
function until(s: GameState, p: Project, songId: string, scope: LicenceScope, want: 'quoted' | 'refused' | 'countered') {
  for (let i = 0; i < 40; i++) {
    const l = requestLicence(s, p, songId, scope);
    answer(s);
    if (l.status === want) return l;
    if (l.status === 'quoted' || l.status === 'countered') l.status = 'declined'; // labelled fixture: let it go and ask again
  }
  throw new Error(`no ${want} in forty requests`);
}

describe('asking for a licence', () => {
  it('is asked of the composition\'s publisher and the recording\'s owner apart, each pricing the scope; never a real price', () => {
    const { s, p, song } = film('lic-ask');
    const l = requestLicence(s, p, song.id, US);
    expect(l.composition.holder).toBe('The publisher of Ada Brook');
    expect(l.recording.holder).toBe('Tidewater Records');
    expect(requestRefusal(p, song.id, US)).toBe('A request for it is already open.');
    // More of the world, more media, more years: each costs more. The same request costs what it costs.
    const one = holderFee(p, song, US);
    expect(holderFee(p, song, { ...US, territories: 'worldwide' })).toBeGreaterThan(one);
    expect(holderFee(p, song, { ...US, media: ['festival', 'digital', 'streaming'] })).toBeGreaterThan(one);
    expect(holderFee(p, song, { ...US, years: 10 })).toBeGreaterThan(one);
    expect(holderFee(p, song, US)).toBe(one);
    expect(requestRefusal(p, song.id, { ...US, media: [] })).toBe('Choose at least one way it will be shown.');
    const own = createSong(s, p, { title: 'Lantern', source: 'write' });
    expect(requestRefusal(p, own.id, US)).toBe('"Lantern" isn\'t licensed: the production holds its rights.');
  });

  it('answered yes by both, is agreed and paid once; saved and loaded, it is not paid again', () => {
    const { s, p, song } = film('lic-agree');
    const l = until(s, p, song.id, US, 'quoted');
    expect(licenceTotal(l)).toBe((l.composition.fee ?? 0) + (l.recording.fee ?? 0));
    const before = ledgerTotals(p).settled;
    agreeLicence(s, p, l.id);
    expect(ledgerTotals(p).settled - before).toBe(licenceTotal(l));
    expect(() => agreeLicence(s, p, l.id)).toThrow('That quote is no longer open.');
    const back = deserialize(serialize(s));
    const q = back.projects[0];
    expect(ledgerTotals(q).settled).toBe(ledgerTotals(p).settled);
    expect(standingLicence(q, song.id, back.now)?.id).toBe(l.id);
  });

  it('refused, it says who said no and to what, and the song can be asked again for less, replaced or taken out', () => {
    const { s, p, song } = film('lic-refuse');
    const l = until(s, p, song.id, { territories: ['US', 'CA'], media: ['festival', 'theatrical', 'streaming', 'broadcast', 'digital'], years: 10 }, 'refused');
    expect(l.reason).toMatch(/said no to festivals, cinemas, streaming, television, digital sale and rental in US, CA for 10 years\.$/);
    expect(requestRefusal(p, song.id, US)).toBeNull(); // asking again is open
    expect(deliveryBlockers(p, s.now)).toContain('"Harbour Lights" has no licence: ask for one on the Music page, or replace it.');
    // Taken out of the cut, nothing is owed and nothing blocks.
    detachSong(p, song.id, p.scenes[0].id);
    expect(deliveryBlockers(p, s.now).some((x) => x.includes('Harbour Lights'))).toBe(false);
  });

  it('a worldwide request refused can come back narrower, for the production\'s own country', () => {
    const { s, p, song } = film('lic-counter');
    const l = until(s, p, song.id, { territories: 'worldwide', media: ['festival'], years: 1 }, 'countered');
    expect(l.scope.territories).toEqual(['US']);
    expect(licenceTotal(l)).toBe(2 * holderFee(p, song, l.scope));
  });
});

describe('what a licence covers', () => {
  it('a release outside its media, its territories or its years is refused with the reason; inside, it goes', () => {
    const { s, p, song } = film('lic-release');
    const l = until(s, p, song.id, US, 'quoted');
    agreeLicence(s, p, l.id);
    const used = [song];
    const soon = '2026-06-01';
    expect(releaseLicenceRefusal(p, used, { route: 'digital', territories: ['US'], date: soon }, s.now)).toBeNull();
    expect(releaseLicenceRefusal(p, used, { route: 'theatrical', territories: ['US'], date: soon }, s.now)).toBe('"Harbour Lights" is licensed for festivals, digital sale and rental, not cinemas. Ask for that on the Music page, or replace the song on the Production page.');
    expect(releaseLicenceRefusal(p, used, { route: 'digital', territories: ['US', 'GB'], date: soon }, s.now)).toBe('"Harbour Lights" is licensed for US, not GB. Ask for more on the Music page, or replace the song on the Production page.');
    expect(releaseLicenceRefusal(p, used, { route: 'digital', territories: ['US'], date: '2031-01-01' }, s.now)).toMatch(/licence runs out on 2029-\d\d-\d\d, before this release\. Renew it on the Music page\.$/);
  });

  it('runs out after its years, blocks a new release, and is renewed for a share of its price, paid once each time', () => {
    const { s, p, song } = film('lic-expiry');
    const l = until(s, p, song.id, { ...US, years: 1 }, 'quoted');
    agreeLicence(s, p, l.id);
    processUntil(s, l.expires! + DAY, 'tick', 100000);
    expect(l.status).toBe('expired');
    expect(standingLicence(p, song.id, s.now)).toBeUndefined();
    expect(releaseLicenceRefusal(p, [song], { route: 'digital', territories: ['US'], date: '2028-01-01' }, s.now)).toBe('"Harbour Lights" has no licence standing. Renew it, or replace it, on the Music page.');
    const before = ledgerTotals(p).settled;
    renewLicence(s, p, l.id);
    expect(ledgerTotals(p).settled - before).toBe(renewalFee(l));
    expect(renewalFee(l)).toBe(Math.round(licenceTotal(l) * RENEWAL_SHARE));
    expect(l.status).toBe('agreed');
    expect(standingLicence(p, song.id, s.now)?.id).toBe(l.id);
    // The old expiry event, delivered late, doesn't end the renewed licence.
    processUntil(s, s.now + DAY, 'tick', 100000);
    expect(l.status).toBe('agreed');
  });
});

describe('a project from before licences', () => {
  it('clears its songs as it always did: no licence asked, nothing blocked', () => {
    const { s, p, song } = film('lic-old');
    delete p.music; // labelled fixture: a project made before November 12, 2026
    expect(requestRefusal(p, song.id, US)).toBe('This project clears its songs the way it always has.');
    expect(deliveryBlockers(p, s.now).some((x) => x.includes('licence'))).toBe(false);
    expect(releaseLicenceRefusal(p, [song], { route: 'theatrical', territories: ['FR'], date: '2030-01-01' }, s.now)).toBeNull();
  });
});
