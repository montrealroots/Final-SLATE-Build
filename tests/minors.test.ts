// Child performers (src/engine/minors.ts, November 11, 2026): the rules of the place a production is based, and what
// they do downstream: shoot days, who must be on set, licences, rest after a night shoot, and the trust set-aside.
import { describe, expect, it } from 'vitest';
import { getPlace } from '../src/data/places';
import { costBreakdown } from '../src/engine/estimate';
import { childrenIn, neededRoles } from '../src/engine/hiring';
import { ADULT_SHOOT_HOURS, bandFor, childShare, ensureLicence, isSchoolDay, licenceReady, minorFor, projectRules, rulesFor, setAsideOf, supervisionFor, type Minor } from '../src/engine/minors';
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
    expect(rulesFor(getPlace('us-atlanta')).rules.id).toBe('US-CA');
    expect(rulesFor(getPlace('us-atlanta')).standIn).toBe("Georgia's own rules aren't recorded, so California's are used.");
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
