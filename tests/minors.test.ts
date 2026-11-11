// Child performers (src/engine/minors.ts, November 11, 2026): the rules of the place a production is based, and what
// they do downstream: shoot days, who must be on set, licences, rest after a night shoot, and the trust set-aside.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getPlace, type Place } from '../src/data/places';
import { PLAYABLE_COUNTRIES } from '../src/world/gazetteer/gazetteer';
import { costBreakdown } from '../src/engine/estimate';
import { childrenIn, neededRoles } from '../src/engine/hiring';
import { ADULT_SHOOT_HOURS, RULES_READ, ageInDays, bandFor, childShare, ensureLicence, isSchoolDay, licenceReady, minorFor, projectRules, rulesFor, setAsideOf, supervisionFor, type Minor } from '../src/engine/minors';
import { FIRST_START_YEAR } from '../src/engine/state';
import { candidates, personAge, playingAgeAt } from '../src/engine/people';
import { groupShootDays } from '../src/engine/production/schedule';
import { runShootDay } from '../src/engine/production/shoot';
import { approvedScenes } from '../src/engine/projects';
import { addDaysToKey, dateKey } from '../src/engine/time';
import { formatStoryAge, shiftStoryAge, storyAge } from '../src/engine/story-age';
import { continueProject, defaultStoryYears } from '../src/engine/sequel';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, castAll, runDays, startLife, startProduction } from './helpers';

const YEAR = 365.25;
const kid = (rules = rulesFor(getPlace('us-los-angeles')).rules, years = 10, personId: string | null = 'np_actor_US_40'): Minor =>
  ({ characterId: 'c1', name: 'Mia', personId, ageDays: Math.round(years * YEAR), band: bandFor(rules, Math.round(years * YEAR))!, rules });

/** A short film with a ten-year-old in every scene, and an adult; or the same script with the child written as an adult. */
function script(tag: string, miaAge: string, place = 'gb-london', night = false): { s: GameState; p: Project } {
  const s = startLife(tag, place);
  const p = buildProject(s, { title: 'Kite Season', format: 'short', medium: 'live-action', runtime: 12 },
    [{ name: 'Mia', patch: { roleSize: 'lead', ageInStory: miaAge } }, { name: 'Tom', patch: { roleSize: 'supporting', ageInStory: '40' } }],
    [1, 2, 3, 4].map((i) => ({ place: 'Kitchen', chars: ['Mia', 'Tom'], minutes: 3, ...(night && i === 4 ? { time: 'NIGHT' as const } : {}) })));
  approve(s, p);
  return { s, p };
}

describe('the rules, from their official texts', () => {
  it('takes the rules of the place the production is based, and says when it uses another place\'s', () => {
    expect(rulesFor(getPlace('gb-london'))).toMatchObject({ rules: { id: 'GB-ENG' }, standIn: null });
    expect(rulesFor(getPlace('us-los-angeles'))).toMatchObject({ rules: { id: 'US-CA' }, standIn: null });
    expect(rulesFor(getPlace('us-new-york'))).toMatchObject({ rules: { id: 'US-NY' }, standIn: null });
    expect(rulesFor(getPlace('us-austin')).rules.id).toBe('US-CA');
    expect(rulesFor(getPlace('us-austin')).standIn).toBe("Texas's own rules aren't recorded, so California's are used.");
    expect(rulesFor(getPlace('jp-tokyo')).standIn).toContain("so England's are used");
  });

  it('gives each age its hours: more on a day without school where the rules allow it', () => {
    const ca = rulesFor(getPlace('us-los-angeles')).rules;
    expect(childShare(kid(ca, 10), true)).toBe(5 / ADULT_SHOOT_HOURS); // 8 CCR §11760: 9 to 15, five hours of work
    expect(childShare(kid(ca, 10), false)).toBe(7 / ADULT_SHOOT_HOURS);
    expect(childShare(kid(ca, 0.2), true)).toBeCloseTo(1 / 30, 5); // a baby: twenty minutes
    const ny = rulesFor(getPlace('us-new-york')).rules;
    expect(childShare(kid(ny, 16), false)).toBe(9 / ADULT_SHOOT_HOURS); // LS 559: 16 and 17, nine hours with no school
    const en = rulesFor(getPlace('gb-london')).rules;
    expect(childShare(kid(en, 7), true)).toBe(3 / ADULT_SHOOT_HOURS); // regulation 22: 5 to 8, three hours
    expect(childShare(kid(en, 7), false)).toBe(3 / ADULT_SHOOT_HOURS); // England gives no more on a day without school
    expect(bandFor(en, Math.round(16 * YEAR))).toBeNull(); // past compulsory school age, England's rules end
    expect(bandFor(ca, Math.round(16 * YEAR))?.label).toBe('16 and 17');
  });

  it('knows a school day: a weekday, not a holiday, outside the long breaks', () => {
    const london = getPlace('gb-london');
    expect(isSchoolDay(london, '2026-03-11')).toBe(true); // a Wednesday in term
    expect(isSchoolDay(london, '2026-03-14')).toBe(false); // a Saturday
    expect(isSchoolDay(london, '2026-08-05')).toBe(false); // the summer break
    expect(isSchoolDay(london, '2026-12-25')).toBe(false);
    expect(isSchoolDay(getPlace('us-los-angeles'), '2026-07-01')).toBe(false);
    expect(isSchoolDay(getPlace('us-los-angeles'), '2026-09-02')).toBe(true);
    expect(isSchoolDay(getPlace('au-sydney'), '2026-01-14')).toBe(false); // the southern summer
  });

  it('names who must be with the children: a studio teacher for each ten in California, a chaperone and a tutor in England', () => {
    const ca = rulesFor(getPlace('us-los-angeles')).rules;
    const eleven = Array.from({ length: 11 }, () => kid(ca, 10));
    expect(supervisionFor(eleven, true)).toEqual([expect.objectContaining({ roleId: 'studio-teacher', count: 2 })]);
    expect(supervisionFor(eleven, false)).toEqual([expect.objectContaining({ roleId: 'studio-teacher', count: 1 })]); // one for each twenty
    expect(supervisionFor([kid(ca, 0.2)], false).map((w) => w.roleId)).toEqual(['studio-teacher', 'set-nurse']);
    const en = rulesFor(getPlace('gb-london')).rules;
    expect(supervisionFor([kid(en, 10)], true).map((w) => [w.roleId, w.count])).toEqual([['chaperone', 1], ['tutor', 1]]);
    expect(supervisionFor([kid(en, 10)], false).map((w) => w.roleId)).toEqual(['chaperone']); // no teaching without school
    expect(supervisionFor([kid(en, 3)], true).map((w) => w.roleId)).toEqual(['chaperone']); // too young for school
  });

  it('needs a licence before the first day, England\'s asked for 21 days ahead, and approval for night work', () => {
    const en = rulesFor(getPlace('gb-london')).rules;
    const p = { childLicences: [] } as unknown as Project;
    const m = kid(en, 10);
    expect(licenceReady(p, m, '2026-03-02', false).ok).toBe(false);
    ensureLicence(p, m, '2026-03-02', false);
    expect(licenceReady(p, m, '2026-03-22', false)).toEqual({ ok: false, reason: "Mia's licence isn't granted until 2026-03-23." });
    expect(licenceReady(p, m, '2026-03-23', false).ok).toBe(true);
    expect(licenceReady(p, m, '2026-03-23', true).ok).toBe(false); // no night work asked for
    ensureLicence(p, m, '2026-03-23', true);
    expect(licenceReady(p, m, '2026-03-24', true).ok).toBe(false);
    expect(licenceReady(p, m, '2026-04-13', true).ok).toBe(true);
    expect(licenceReady(p, m, '2026-03-24', false).ok).toBe(true); // day scenes go on meanwhile
  });

  it('sets aside 15% of a child\'s pay in California and New York, and nothing in England', () => {
    expect(setAsideOf(rulesFor(getPlace('us-los-angeles')).rules, 700)).toBe(105);
    expect(setAsideOf(rulesFor(getPlace('us-new-york')).rules, 700)).toBe(105);
    expect(setAsideOf(rulesFor(getPlace('gb-london')).rules, 700)).toBe(0);
  });
});

describe('the rules across the map', () => {
  it('uses the recorded rules of British Columbia, Germany, France and New South Wales, and a neighbour\'s elsewhere, saying so', () => {
    expect(rulesFor(getPlace('ca-vancouver'))).toMatchObject({ rules: { id: 'CA-BC' }, standIn: null });
    expect(rulesFor(getPlace('de-berlin'))).toMatchObject({ rules: { id: 'DE' }, standIn: null });
    expect(rulesFor(getPlace('fr-paris'))).toMatchObject({ rules: { id: 'FR' }, standIn: null });
    expect(rulesFor(getPlace('au-sydney'))).toMatchObject({ rules: { id: 'AU-NSW' }, standIn: null });
    expect(rulesFor(getPlace('ca-toronto'))).toMatchObject({ rules: { id: 'CA-ON' }, standIn: null });
    expect(rulesFor({ ...getPlace('ca-vancouver'), region: 'Alberta', regionCode: 'CA-AB' }).standIn).toBe("Alberta's own rules aren't recorded, so British Columbia's are used.");
    expect(rulesFor(getPlace('au-melbourne')).rules.id).toBe('AU-NSW');
    expect(rulesFor(getPlace('nz-auckland')).rules.id).toBe('AU-NSW');
    expect(rulesFor(getPlace('es-madrid'))).toMatchObject({ rules: { id: 'DE' } });
    expect(rulesFor(getPlace('es-madrid')).standIn).toContain("so Germany's are used");
    // Scotland, Wales and Northern Ireland have their own (read November 11, 2026); the gazetteer gives a region's name.
    expect(rulesFor(getPlace('gb-edinburgh'))).toMatchObject({ rules: { id: 'GB-SCT' }, standIn: null });
    expect(rulesFor({ ...getPlace('gb-london'), region: 'Wales', regionCode: '' })).toMatchObject({ rules: { id: 'GB-WLS' }, standIn: null });
    expect(rulesFor({ ...getPlace('gb-london'), region: 'Northern Ireland', regionCode: '' })).toMatchObject({ rules: { id: 'GB-NIR' }, standIn: null });
    expect(rulesFor({ ...getPlace('gb-london'), region: '', regionCode: '' }).standIn).toContain("so England's are used");
  });

  it("gives Scotland, Wales and Northern Ireland their own figures, as read", () => {
    const sct = rulesFor(getPlace('gb-edinburgh')).rules;
    const wls = rulesFor({ ...getPlace('gb-london'), region: 'Wales', regionCode: 'GB-WLS' }).rules;
    const nir = rulesFor({ ...getPlace('gb-london'), region: 'Northern Ireland', regionCode: 'GB-NIR' }).rules;
    const eng = rulesFor(getPlace('gb-london')).rules;
    const y = (n: number) => Math.round(n * 365.25);
    // Scotland: 4 hours performing from 9 (England 5), 10 children to a chaperone (England 12).
    expect(bandFor(sct, y(10))).toMatchObject({ atPlace: 9.5, work: 4 });
    expect(bandFor(eng, y(10))).toMatchObject({ atPlace: 9.5, work: 5 });
    expect(sct.supervisor.perGroup).toBe(10);
    // Wales: England's figures, under its own name.
    expect({ ...wls, id: 'GB-ENG', place: 'England' }).toEqual(eng);
    // Northern Ireland: bands 5 to 12 and 13 to 15, 5 days in 7, 30 days' notice, 14 hours between days.
    expect(bandFor(nir, y(12) + 100)).toMatchObject({ label: '5 to 12', atPlace: 7.5, work: 3, days: 5 });
    expect(bandFor(nir, y(13) + 1)).toMatchObject({ label: '13 to 15', atPlace: 8, work: 3.5, days: 5 });
    expect(nir.licence.leadDays).toBe(30);
    expect(nir.restHours).toBe(14);
  });

  it('gives every playable country a set, as docs/child-rules/COVERAGE.md lists it', () => {
    const ledger = new Map(readFileSync('docs/child-rules/COVERAGE.md', 'utf8').split('\n')
      .map((l) => /^\| ([A-Z]{2}) \| [^|]+ \| ([^|]+) \| (Own|By region|Stand-in) \|$/.exec(l)).filter((m) => m)
      .map((m) => [m![1], { place: m![2].trim(), status: m![3] }]));
    expect(ledger.size).toBe(PLAYABLE_COUNTRIES.length);
    const byRegion = new Set(['US', 'CA', 'AU', 'GB']);
    for (const c of PLAYABLE_COUNTRIES) {
      const r = rulesFor({ country: c.code, countryName: c.name, region: '', regionCode: '' } as Place);
      const status = byRegion.has(c.code) ? 'By region' : r.standIn ? 'Stand-in' : 'Own';
      expect(ledger.get(c.code), c.code).toEqual({ place: r.rules.place, status });
    }
  });

  it('gives New South Wales\' hours by age, capped at four on a school day, and its days a week', () => {
    const nsw = rulesFor(getPlace('au-sydney')).rules;
    expect(childShare(kid(nsw, 10), false)).toBe(8 / ADULT_SHOOT_HOURS); // 8 to under 16: 8 hours of work
    expect(childShare(kid(nsw, 10), true)).toBe(4 / ADULT_SHOOT_HOURS); // at most 4 on a school day
    expect(childShare(kid(nsw, 5), false)).toBe(6 / ADULT_SHOOT_HOURS);
    expect(bandFor(nsw, Math.round(0.3 * YEAR))?.days).toBe(1);
    expect(bandFor(nsw, Math.round(2 * YEAR))?.days).toBe(2);
    expect(bandFor(nsw, Math.round(5 * YEAR))?.days).toBe(4);
    expect(bandFor(nsw, Math.round(10 * YEAR))?.days).toBe(5);
    // A nurse under 3, as well as the supervisor; none from 3.
    expect(supervisionFor([kid(nsw, 2)], false).map((x) => x.roleId)).toContain('set-nurse');
    expect(supervisionFor([kid(nsw, 2)], false).find((x) => x.roleId === 'set-nurse')!.why).toBe("New South Wales's rules require a nurse with children under 3.");
    expect(supervisionFor([kid(nsw, 4)], false).map((x) => x.roleId)).not.toContain('set-nurse');
  });

  it('gives British Columbia\'s chaperones by age, one for each child under 6, three each to 12, five each to 15, and no tutor', () => {
    const bc = rulesFor(getPlace('ca-vancouver')).rules;
    const many = (years: number, n: number) => Array.from({ length: n }, (_, i) => ({ ...kid(bc, years), characterId: `c${i}` }));
    expect(supervisionFor(many(4, 2), true)).toEqual([{ roleId: 'chaperone', count: 2, why: "British Columbia's rules require one with children under 15." }]);
    expect(supervisionFor(many(8, 4), true)[0].count).toBe(2);
    expect(supervisionFor(many(13, 5), true)[0].count).toBe(1);
    expect(supervisionFor([...many(4, 1), ...many(8, 3)], true)[0].count).toBe(2);
    expect(supervisionFor(many(14.9, 1), true)).toHaveLength(1);
    expect(bandFor(bc, Math.round(15 * YEAR))).toBeNull(); // the Division covers children under 15
    expect(bandFor(bc, 14)).toBeNull(); // no one under 15 days
  });

  it('sets aside a quarter of a child\'s earnings over $2,000 on a production in British Columbia, only on what is over', () => {
    const bc = rulesFor(getPlace('ca-vancouver')).rules;
    expect(setAsideOf(bc, 1000)).toBe(0);
    expect(setAsideOf(bc, 1500, 1000)).toBe(125); // 500 over the threshold
    expect(setAsideOf(bc, 500, 3000)).toBe(125); // all of it over
    expect(setAsideOf(rulesFor(getPlace('de-berlin')).rules, 5000)).toBe(0);
    expect(setAsideOf(rulesFor(getPlace('fr-paris')).rules, 5000)).toBe(0);
  });

  it('in Ontario sets aside a quarter of all a child earns on a production once it passes $2,000, and has a chaperone for each child', () => {
    const on = rulesFor(getPlace('ca-toronto')).rules;
    expect(setAsideOf(on, 1500)).toBe(0);
    expect(setAsideOf(on, 1000, 1500)).toBe(625); // passing $2,000 sets aside a quarter of all $2,500
    expect(setAsideOf(on, 1000, 3000)).toBe(250);
    expect(setAsideOf(on, 500, 2000)).toBe(625);
    expect(setAsideOf(on, 0, 2000)).toBe(0); // exactly $2,000 isn't more than it
    const two = [kid(on, 8), { ...kid(on, 9), characterId: 'c2' }];
    expect(supervisionFor(two, true)).toEqual([{ roleId: 'chaperone', count: 2, why: "Ontario's rules require one with children under 16." }]);
    expect(supervisionFor([kid(on, 16.5)], true)).toEqual([]); // a 16-year-old needs no chaperone, though the Act covers them
    // Under 3: 8 hours, less camera breaks (s. 11(1) as amended in 2017; the Act as passed allowed 4 under 2).
    expect(childShare(kid(on, 1), false)).toBe(3.4 / ADULT_SHOOT_HOURS);
    expect(childShare(kid(on, 17), false)).toBe(7.4 / ADULT_SHOOT_HOURS);
    expect(bandFor(on, Math.round(10 * YEAR))?.days).toBe(5); // 48 hours free a week
    expect(bandFor(on, 14)).toBeNull();
  });

  it('in Ireland licenses children to 16, 21 days ahead, with 2, 3 and 4 hours\' work by age, 5 days in 7, and a chaperone per 12', () => {
    const dublin = { ...getPlace('gb-london'), id: 'x-dublin', country: 'IE', countryName: 'Ireland', region: 'Leinster', regionCode: '' };
    const ie = rulesFor(dublin);
    expect(ie).toMatchObject({ rules: { id: 'IE' }, standIn: null });
    expect(childShare(kid(ie.rules, 5), false)).toBe(2 / ADULT_SHOOT_HOURS);
    expect(childShare(kid(ie.rules, 10), false)).toBe(3 / ADULT_SHOOT_HOURS);
    expect(childShare(kid(ie.rules, 14), false)).toBe(4 / ADULT_SHOOT_HOURS);
    expect(bandFor(ie.rules, Math.round(16 * YEAR))).toBeNull();
    expect(bandFor(ie.rules, Math.round(10 * YEAR))?.days).toBe(5);
    expect(ie.rules.licence.leadDays).toBe(21);
    const thirteen = Array.from({ length: 13 }, (_, i) => ({ ...kid(ie.rules, 10), characterId: `c${i}` }));
    expect(supervisionFor(thirteen, true)).toEqual([{ roleId: 'chaperone', count: 2, why: "Ireland's rules require one with children under 16." }]);
    expect(setAsideOf(ie.rules, 5000)).toBe(0);
  });

  it('in Georgia gives the Schedule\'s hours, a coordinator and a studio teacher per ten minors to 18, a nurse for infants, and no trust', () => {
    const ga = rulesFor(getPlace('us-atlanta'));
    expect(ga).toMatchObject({ rules: { id: 'US-GA' }, standIn: null });
    expect(childShare(kid(ga.rules, 10), true)).toBe(5 / ADULT_SHOOT_HOURS);
    expect(childShare(kid(ga.rules, 10), false)).toBe(7 / ADULT_SHOOT_HOURS); // two hours more without tutoring
    expect(childShare(kid(ga.rules, 17), false)).toBe(10 / ADULT_SHOOT_HOURS);
    expect(bandFor(ga.rules, 14)).toBeNull(); // not before 15 days
    const eleven = Array.from({ length: 11 }, (_, i) => ({ ...kid(ga.rules, 17), characterId: `c${i}` }));
    expect(supervisionFor(eleven, true)).toEqual([
      { roleId: 'chaperone', count: 2, why: "Georgia's rules require one with children under 18." },
      { roleId: 'studio-teacher', count: 2, why: "Georgia's rules require 3 hours of teaching on a school day." },
    ]);
    expect(supervisionFor([kid(ga.rules, 0.2)], false).map((x) => x.roleId)).toContain('set-nurse');
    expect(setAsideOf(ga.rules, 5000)).toBe(0);
  });

  it('takes no child of 3 or under in Germany, gives 2 hours to 6 and 3 hours after, 14 hours\' rest, and asks 14 days for approval', () => {
    const de = rulesFor(getPlace('de-berlin')).rules;
    expect(bandFor(de, Math.round(3 * YEAR))).toBeNull();
    expect(childShare(kid(de, 4), false)).toBe(2 / ADULT_SHOOT_HOURS);
    expect(childShare(kid(de, 10), false)).toBe(3 / ADULT_SHOOT_HOURS);
    expect(childShare(kid(de, 16.5), false)).toBe(8 / ADULT_SHOOT_HOURS);
    expect(de.restHours).toBe(14);
    expect(de.licence.leadDays).toBe(14);
    expect(supervisionFor([kid(de, 10)], true).map((x) => x.roleId)).toEqual(['chaperone']); // no teaching rule
    const fr = rulesFor(getPlace('fr-paris')).rules;
    expect(fr.licence.leadDays).toBe(30); // the prefect has a month
    expect(supervisionFor([kid(fr, 10)], true).map((x) => x.roleId)).toEqual(['chaperone']);
  });
});

describe('downstream', () => {
  it('a child\'s part takes more shoot days than the same script with an adult, and needs a chaperone and a tutor', () => {
    const child = script('min-days-child', '10');
    const adult = script('min-days-adult', '30');
    expect(groupShootDays(child.p, child.s).length).toBeGreaterThan(groupShootDays(adult.p, adult.s).length);
    const roles = neededRoles(child.p, child.s).map((r) => r.roleId);
    expect(roles).toEqual(expect.arrayContaining(['chaperone', 'tutor']));
    expect(neededRoles(adult.p, adult.s).map((r) => r.roleId)).not.toContain('chaperone');
    // Priced in the estimate: more days at the location, and the chaperone's days.
    const lines = costBreakdown(child.s, child.p).toCome;
    expect(lines.some((l) => l.label === 'Licensed Chaperone' && l.amount > 0)).toBe(true);
    const shoot = (x: { s: GameState; p: Project }) => costBreakdown(x.s, x.p).toCome.filter((l) => l.area === 'shoot').reduce((a, l) => a + l.amount, 0);
    expect(shoot(child)).toBeGreaterThan(shoot(adult));
  });

  it('reckons a part not yet cast from the character\'s age, and a cast child from their own', () => {
    const { s, p } = script('min-cast', '10');
    const on = dateKey(s.now, 'UTC');
    const mia = p.characters.find((c) => c.name === 'Mia')!;
    expect(minorFor(s, p, mia.id, on)).toMatchObject({ personId: null, band: { label: '9 to 15' } });
    castAll(s, p);
    const cast = p.hires.find((h) => h.characterId === mia.id)!;
    const person = candidates(s, 'actor', 'GB').find((x) => x.id === cast.personId)!;
    const plays = playingAgeAt(person, on)!;
    expect(plays[0]).toBeLessThanOrEqual(10);
    expect(plays[1]).toBeGreaterThanOrEqual(10);
    expect(personAge(person, on)).toBeLessThan(16);
  });

  it('runs the shoot under the rules: a licence first, the chaperone on set, the child\'s hours, and rest after a night', () => {
    const { s, p } = script('min-run', '10', 'gb-london', true);
    // A week of producing, as a player would: offers out, answers in, counters accepted (helpers.ts runDays).
    runDays(s, p, 8);
    const mia = p.characters.find((c) => c.name === 'Mia')!;
    expect(childrenIn(p, s).map((m) => m.characterId)).toEqual([mia.id]);
    startProduction(s, p, 3);
    const licence = p.childLicences!.find((l) => l.characterId === mia.id)!;
    expect(licence.night).toBe(true);
    // No day with Mia before her licence is granted, 21 days after it was asked for.
    const miaDays = p.schedule.days.filter((d) => approvedScenes(p).some((x) => d.sceneIds.includes(x.id) && x.participants.includes(mia.id)));
    expect(miaDays.length).toBeGreaterThan(0);
    for (const d of miaDays) expect(d.date >= licence.ready).toBe(true);
    // Without a chaperone her scenes aren't shot.
    for (const t of p.tasks) if (t.kind.startsWith('prep:')) t.status = 'done'; // prep is another test's business
    const chaperone = p.hires.find((h) => h.roleId === 'chaperone' && h.status === 'accepted')!;
    chaperone.status = 'released';
    const day = miaDays.find((d) => !d.night)!;
    const before = { ...day };
    const performer = candidates(s, 'actor', 'GB').find((x) => x.id === p.cast.find((c) => c.characterId === mia.id)!.performer)!;
    expect(runShootDay(s, p, day)).toContain(`${performer.name} can't work without a licensed chaperone on set.`);
    // With the chaperone back, the day runs, and Mia's scenes stop at the hours a ten-year-old may work.
    chaperone.status = 'accepted';
    // Every one of her day scenes on this one day: more than a ten-year-old may work in a day, so the day stops at her hours.
    const allHers = approvedScenes(p).filter((x) => x.participants.includes(mia.id) && x.heading.time !== 'NIGHT').map((x) => x.id);
    Object.assign(day, before, { status: 'scheduled', result: undefined, sceneIds: allHers });
    const ran = runShootDay(s, p, day);
    expect(ran).not.toContain('chaperone');
    expect(day.status).toBe('partial');
    // The day stops at her hours (five of the ten a day stands for), with the rest of her scenes moved to another day.
    expect(ran).toContain(`ran out of time: ${performer.name} had worked all the hours they may work today.`);
    expect(p.captures.filter((c) => allHers.includes(c.sceneId)).reduce((a, c) => a + c.captured, 0)).toBeLessThan(allHers.length);
    expect(projectRules(p).rules.id).toBe('GB-ENG');
  });

  /** A script cast and crewed, the schedule built and prep done: ready to run its days. */
  function ready(tag: string, place: string, night = false) {
    const x = script(tag, '10', place, night);
    runDays(x.s, x.p, 8);
    startProduction(x.s, x.p, 3);
    for (const t of x.p.tasks) if (t.kind.startsWith('prep:')) t.status = 'done';
    const mia = x.p.characters.find((c) => c.name === 'Mia')!;
    const days = x.p.schedule.days.filter((d) => approvedScenes(x.p).some((sc) => d.sceneIds.includes(sc.id) && sc.participants.includes(mia.id)));
    return { ...x, mia, days, hire: x.p.hires.find((h) => h.characterId === mia.id && h.status === 'accepted')! };
  }

  it('sets aside 15% of the child\'s pay for each day they work in Los Angeles, and none in London', () => {
    const la = ready('min-la', 'us-los-angeles');
    expect(projectRules(la.p).rules.id).toBe('US-CA');
    expect(la.p.hires.some((h) => h.roleId === 'studio-teacher' && h.status === 'accepted')).toBe(true);
    runShootDay(la.s, la.p, la.days[0]);
    expect(la.hire.daysWorked).toBe(1);
    expect(la.hire.trustSetAside).toBe(Math.round(la.hire.dayRate * 0.15));
    const ldn = ready('min-ldn', 'gb-london');
    runShootDay(ldn.s, ldn.p, ldn.days[0]);
    expect(ldn.hire.daysWorked).toBe(1);
    expect(ldn.hire.trustSetAside ?? 0).toBe(0);
  });

  it('in British Columbia sets aside a quarter of what a child is paid past $2,000 on the production, and nothing before', () => {
    const bc = ready('min-bc', 'ca-vancouver');
    expect(projectRules(bc.p).rules.id).toBe('CA-BC');
    const ob = bc.p.obligations.find((o) => o.id === bc.hire.obligationId)!;
    expect(bc.hire.dayRate).toBeLessThan(2000);
    ob.settled = 0;
    runShootDay(bc.s, bc.p, bc.days[0]);
    expect(bc.hire.trustSetAside ?? 0).toBe(0); // the first day is under the threshold
    // Paid $2,000 already on this production: the next day's pay is all over it.
    const next = bc.days.find((d) => d.status !== 'shot' && d.status !== 'partial') ?? bc.days[0];
    Object.assign(next, { status: 'scheduled', result: undefined });
    ob.settled = 2000;
    runShootDay(bc.s, bc.p, next);
    expect(bc.hire.trustSetAside).toBe(Math.round(bc.hire.dayRate * 0.25));
  });

  it('gives a child twelve hours\' rest after a night shoot: the schedule leaves a day, and a day call the morning after waits', () => {
    const x = ready('min-night', 'gb-london', true);
    const night = x.days.find((d) => d.night)!;
    const next = x.p.schedule.days.find((d) => d.date > night.date && !d.night && x.days.includes(d));
    // Planned: no day call for her the working day after her night.
    if (next) expect(next.date > addDaysToKey(night.date, 1)).toBe(true);
    // And if one is moved there anyway, her scenes wait.
    night.status = 'shot';
    const day = x.days.find((d) => !d.night)!;
    day.date = addDaysToKey(night.date, 1);
    expect(runShootDay(x.s, x.p, day)).toContain("needs 12 hours' rest after last night's shoot.");
  });
});

describe('days a week', () => {
  it('stops a child\'s scenes once they have worked the days a week New South Wales allows at their age', () => {
    const x = script('min-nsw', '10', 'au-sydney');
    runDays(x.s, x.p, 8);
    startProduction(x.s, x.p, 3);
    for (const t of x.p.tasks) if (t.kind.startsWith('prep:')) t.status = 'done';
    const mia = x.p.characters.find((c) => c.name === 'Mia')!;
    const day = x.p.schedule.days.find((d) => approvedScenes(x.p).some((sc) => d.sceneIds.includes(sc.id) && sc.participants.includes(mia.id)))!;
    const licence = x.p.childLicences!.find((l) => l.characterId === mia.id)!;
    // A Saturday well after the licence, after five weekdays she worked that week.
    let sat = addDaysToKey(licence.ready, 14);
    while (new Date(`${sat}T12:00:00Z`).getUTCDay() !== 6) sat = addDaysToKey(sat, 1);
    const fresh = { ...day };
    const week = [5, 4, 3, 2, 1].map((n, i) => ({ ...fresh, id: `wk${i}`, date: addDaysToKey(sat, -n), status: 'shot' as const }));
    x.p.schedule.days.push(...week);
    Object.assign(day, { date: sat, status: 'scheduled', result: undefined });
    expect(runShootDay(x.s, x.p, day)).toContain("days a week New South Wales's rules allow at that age.");
    // With four of the five, she works.
    x.p.schedule.days.splice(x.p.schedule.days.indexOf(week[0]), 1);
    Object.assign(day, { ...fresh, date: sat, status: 'scheduled', result: undefined });
    expect(runShootDay(x.s, x.p, day)).not.toContain('days a week');
  });
});

describe('ages in the story', () => {
  it('reads an age, a range or a decade, keeps other text, and moves on by years', () => {
    expect(storyAge('10')).toEqual({ min: 10, max: 10 });
    expect(storyAge('10-12')).toEqual({ min: 10, max: 12 });
    expect(storyAge('12 to 10')).toEqual({ min: 10, max: 12 });
    expect(storyAge('30s')).toEqual({ min: 30, max: 39 });
    expect(storyAge('late forties')).toBeNull();
    expect(formatStoryAge({ min: 10, max: 12 })).toBe('10-12');
    expect(shiftStoryAge('10-12', 2)).toBe('12-14');
    expect(shiftStoryAge('late forties', 2)).toBe('late forties');
  });

  it('ages a series\' characters by the years that pass between seasons: one by default in live action, none in animation', () => {
    const { s, p } = script('min-season', '10');
    p.delivered = { at: s.now, runtimeMin: 12 };
    p.episodes.push({ ...p.episodes[0], number: 2 }); // a series, so it continues as a next season
    expect(defaultStoryYears(p)).toBe(1);
    const next = continueProject(s, p, undefined, 3);
    expect(next.characters.find((c) => c.name === 'Mia')!.ageInStory).toBe('13');
    expect(next.characters.find((c) => c.name === 'Tom')!.ageInStory).toBe('43');
    expect(() => continueProject(s, { ...p, continuedBy: undefined, id: 'x' } as Project, undefined, -1)).toThrow('Choose between 0 and 50 years.');
    expect(defaultStoryYears({ ...p, axes: { ...p.axes, medium: 'animation' } } as Project)).toBe(0);
  });
});

// November 11, 2026 (the owner's brief, item 4): the rules applied consistently, and what was read told apart from what wasn't.
describe('ages, dates and what was read', () => {
  it('moves a child into the next age band on the birthday that makes them that age, never a day before or after', () => {
    const sets = ['us-los-angeles', 'gb-london', 'ca-vancouver', 'de-berlin'].map((id) => rulesFor(getPlace(id)).rules);
    const born = ['2014-01-01', '2015-02-28', '2016-02-29', '2017-03-01', '2018-07-15', '2019-12-31', '2020-02-29', '2021-06-30'];
    const ageAt = (b: string, on: string) => personAge({ born: b } as Parameters<typeof personAge>[0], on);
    let changes = 0;
    for (const rules of sets) {
      // A band from a whole year starts on that birthday; one "over" an age (Germany's over 3) starts the day after it.
      const yearOf = (d: number) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].find((y) => Math.round(y * YEAR) === d);
      const startsAt = new Set(rules.bands.map((x) => yearOf(x.fromDays)).filter((y) => y !== undefined));
      const overAt = new Set(rules.bands.map((x) => yearOf(x.fromDays - 1)).filter((y) => y !== undefined));
      for (const b of born) {
        // Every day from the 1st birthday to the 18th: the band changes only when the age in years does.
        let day = addDaysToKey(b, 400);
        let prev = bandFor(rules, ageInDays(b, day));
        for (let n = 0; n < 17 * 366; n++) {
          const next = addDaysToKey(day, 1);
          const band = bandFor(rules, ageInDays(b, next));
          const turned = ageAt(b, next) !== ageAt(b, day);
          const dayAfter = overAt.has(ageAt(b, day)) && ageAt(b, addDaysToKey(day, -1)) !== ageAt(b, day);
          if (band !== prev) {
            expect(turned || dayAfter, `${rules.id}, born ${b}: band changed on ${next}, not a birthday`).toBe(true);
            changes++;
          } else expect(dayAfter, `${rules.id}, born ${b}: no change the day after turning ${ageAt(b, day)}`).toBe(false);
          if (turned) {
            const age = ageAt(b, next);
            const shouldChange = startsAt.has(age) || age === rules.adultAt;
            expect(band !== prev, `${rules.id}, born ${b}: turned ${age} on ${next}`).toBe(shouldChange);
          }
          if (ageAt(b, next) >= rules.adultAt) expect(band).toBeNull();
          prev = band;
          day = next;
        }
      }
    }
    expect(changes).toBeGreaterThan(100);
  });

  it('applies the rules as read, says when they were read, and has no set known to start later than the game', () => {
    expect(RULES_READ).toBe('2026-11-11');
    expect(FIRST_START_YEAR).toBe(2026);
    // The research log's status for each set is the one the engine records: France alone is partly read.
    const log = readFileSync('docs/child-rules/RESEARCH.md', 'utf8');
    const seen = new Set<string>();
    for (const c of PLAYABLE_COUNTRIES) {
      const { rules } = rulesFor({ country: c.code, countryName: c.name, region: '', regionCode: '' } as Place);
      seen.add(rules.id);
    }
    const regional: Record<string, Place> = {
      'US-NY': getPlace('us-new-york'), 'US-GA': getPlace('us-atlanta'), 'CA-ON': getPlace('ca-toronto'), 'GB-SCT': getPlace('gb-edinburgh'),
      'GB-WLS': { ...getPlace('gb-london'), region: 'Wales', regionCode: 'GB-WLS' }, 'GB-NIR': { ...getPlace('gb-london'), region: 'Northern Ireland', regionCode: 'GB-NIR' },
    };
    for (const id of Object.keys(regional)) seen.add(id);
    for (const id of seen) {
      const place = regional[id];
      const rules = place ? rulesFor(place).rules : [...PLAYABLE_COUNTRIES].map((c) => rulesFor({ country: c.code, countryName: c.name, region: '', regionCode: '' } as Place).rules).find((r) => r.id === id)!;
      expect(rules.id).toBe(id);
      const heading = new RegExp(`^## .*\\(${id}\\): (read|partly read)$`, 'm').exec(log);
      expect(heading, id).not.toBeNull();
      expect(rules.read, id).toBe(heading![1] === 'read' ? 'read' : 'partly');
    }
    expect(seen.size).toBe(13);
    // When each took effect, and its latest change found: none in 2026 or later, so applying it from 2026 is the text in force.
    const dates = new Map([...log.matchAll(/^\| [^|]+ \(([A-Z-]+)\) \| (\d{4}(?:-\d{2}-\d{2})?) \| (\d{4}(?:-\d{2}-\d{2})?) \|/gm)].map((m) => [m[1], { from: m[2], latest: m[3] }]));
    expect([...dates.keys()].sort()).toEqual([...seen].sort());
    for (const [id, d] of dates) {
      expect(d.latest < '2026-01-01', id).toBe(true);
      expect(d.from <= d.latest, id).toBe(true);
    }
  });
});
