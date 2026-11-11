// Real people from the film catalog through the game's own hiring (the Creative Depth package, milestone D,
// 03-PEOPLE-CASTING-AND-HIRING.md "Essential proof"): one person credited under two studios, considered, auditioned,
// offered, countered, contracted, found booked by a second project, shot with, paid, credited, and still there after a
// save and reload. Then a director, a voice part, a release and replacement, dates they can't do, a missing age and a
// death. Every person is a made-up fixture: nothing here is recorded about, or asserted of, anyone real.
import { describe, expect, it } from 'vitest';
import { DAY, acceptCounter, approvedCharacters, assignEpisodeRole, candidatesFor, deserialize, makeOffer, processUntil, productionWindow, releaseHire, roleCandidates, serialize } from './engine-api';
import { inviteToAudition } from '../src/engine/casting-calls';
import { fitNotes } from '../src/engine/casting-notes';
import { considerFor, considerPerson, consideredOn, realPerson, storyCredits, treatAsAdult, type RecordedCredit, type RecordedPerson } from '../src/engine/guests';
import { isAvailable, personById } from '../src/engine/people';
import { historyWith, willingness } from '../src/engine/relationships';
import type { GameState, Hire, Project } from '../src/engine/types';
import { approve, buildProject, castAll, runDays, staffAll, startLife, startProduction, summary } from './helpers';

const GATHERED = '2026-01-02T12:00:00.000Z';
const credit = (kind: string, role: string, date: string, department?: string): RecordedCredit => ({ kind, role, date, ...(department ? { department } : {}) });
// Credited in a film from one studio and a series from another: the catalog holds one record, under one ID.
const ADA: RecordedPerson = { id: 800001, name: 'Ada Quill (Fixture)', details: { birthday: '1980-04-02', deathday: null, retrievedAt: GATHERED },
  credits: [credit('cast', 'Mara Venn', '2019-06-14'), credit('cast', 'Juno', '2023-03-03'), credit('series-cast', 'Ida Marsh', '2021-09-01'), credit('cast', 'The Gull (voice)', '2024-02-02')] };
const BEN: RecordedPerson = { id: 800002, name: 'Ben Rook (Fixture)', details: null,
  credits: [credit('crew', 'Director', '2019-06-14', 'Directing'), credit('episode-crew', 'Director', '2021-09-01', 'Directing'), credit('crew', 'Director', '2023-03-03', 'Directing')] };
const LATE: RecordedPerson = { id: 800003, name: 'Wren Calder (Fixture)', details: { birthday: '1950-02-02', deathday: '2026-03-20', retrievedAt: GATHERED }, credits: [credit('cast', 'Old Tom', '1999-01-01')] };

const today = (s: GameState) => new Date(s.now).toISOString().slice(0, 10);
const days = (s: GameState, n: number) => processUntil(s, s.now + n * DAY, 'tick', 100000);
const short = (s: GameState, title: string, parts = ['Mara', 'Tom']) => {
  const p = buildProject(s, { title, format: 'short', medium: 'live-action' }, parts.map((name, i) => ({ name, patch: { roleSize: i === 0 ? 'lead' : 'supporting' } })),
    [{ place: 'Harbour Office', chars: parts }, { place: 'Quay', intExt: 'EXT', chars: [parts[0]] }]);
  approve(s, p);
  return p;
};
const idOf = (p: Project, name: string) => approvedCharacters(p).find((c) => c.name === name)!.id;
const ADA_ID = 'tp_800001';

describe('one real person, from the catalog to the credits', () => {
  const s = startLife('real-hire');
  const p = short(s, 'Harbour Song');
  const mara = idOf(p, 'Mara');
  let hire: Hire;

  it('is one person however they were found, and joins the list for a part without anything being offered', () => {
    // Opened from a film's cast list, then from a series' at another studio: the same record, the same ID.
    considerPerson(s, ADA, GATHERED);
    considerPerson(s, ADA, GATHERED);
    expect(Object.keys(s.real!)).toEqual([ADA_ID]);
    considerFor(s, p, { personId: ADA_ID, roleId: 'actor', characterId: mara }, today(s));
    const list = candidatesFor(s, p, 'actor', mara);
    expect(list[0]).toMatchObject({ id: ADA_ID, name: 'Ada Quill (Fixture)', roleId: 'actor' });
    // The game's own performers are all still there after her, and she isn't among the ones it would choose by itself.
    expect(list.slice(1).map((x) => x.id)).toEqual(roleCandidates(s, p, 'actor').map((x) => x.id));
    expect(roleCandidates(s, p, 'actor').some((x) => x.id === ADA_ID)).toBe(false);
    expect(candidatesFor(s, p, 'actor', idOf(p, 'Tom'))[0].id).not.toBe(ADA_ID);
    expect([p.hires.length, p.obligations.length]).toEqual([0, 0]);
    // What casting says about her says only what is recorded, and what isn't.
    expect(fitNotes(s, p, personById(s, ADA_ID, 'actor'), mara)).toEqual(["The languages they work in aren't recorded. A dialect coach is yours to hire if you want one."]);
  });

  it('reads for the part once: asking again for the same read is refused, so a result can\'t be rerolled', () => {
    let a = inviteToAudition(s, p, mara, 'on-camera', ADA_ID);
    days(s, 6);
    // One in twelve doesn't come (auditions.ts); if she didn't, she can be asked again, once.
    if (a.status === 'missed') { a = inviteToAudition(s, p, mara, 'on-camera', ADA_ID); days(s, 6); }
    expect(a.status).toBe('seen');
    expect(a.read![0]).toBeLessThanOrEqual(a.read![1]);
    const read = [...a.read!];
    expect(() => inviteToAudition(s, p, mara, 'on-camera', ADA_ID)).toThrow('They have been asked to read for this part already.');
    days(s, 3);
    expect(a.read).toEqual(read);
  });

  it('answers a low offer with a counteroffer, and the contract holds her dates and the money once', () => {
    const rate = personById(s, ADA_ID, 'actor').dayRate;
    hire = makeOffer(s, p, { personId: ADA_ID, roleId: 'actor', dayRate: Math.round(rate * 0.75), characterId: mara, method: 'on-camera' });
    expect(() => makeOffer(s, p, { personId: ADA_ID, roleId: 'actor', dayRate: rate, characterId: mara, method: 'on-camera' })).toThrow('already has an offer for this');
    days(s, 4);
    expect(hire.status).toBe('countered');
    expect(hire.counterRate).toBe(rate);
    acceptCounter(s, p, hire.id);
    expect(hire).toMatchObject({ status: 'accepted', dayRate: rate });
    expect(p.cast.find((c) => c.characterId === mara)).toMatchObject({ performer: ADA_ID, note: 'Cast after an audition.' });
    // One line in the budget for her, committed at the agreed rate: the first offer's money wasn't kept as well.
    const lines = p.obligations.filter((o) => o.ref === hire.id);
    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe(rate * hire.estDays);
    const win = productionWindow(s, p);
    expect(s.people[ADA_ID].bookings).toEqual([{ from: win.from, to: win.to, projectId: p.id }]);
  });

  it('is found booked by a second project, which is refused for those dates and can have her afterwards', () => {
    const q = short(s, 'Second Tide', ['Nell', 'Bo']);
    const nell = idOf(q, 'Nell');
    considerFor(s, q, { personId: ADA_ID, roleId: 'actor', characterId: nell }, today(s));
    const rate = personById(s, ADA_ID, 'actor').dayRate;
    const win = productionWindow(s, q);
    expect(isAvailable(s, personById(s, ADA_ID, 'actor'), win.from, win.to, q.id)).toMatchObject({ ok: false, reason: 'Ada Quill (Fixture) is already working on another of your projects then.' });
    const second = makeOffer(s, q, { personId: ADA_ID, roleId: 'actor', dayRate: rate, characterId: nell, method: 'on-camera' });
    days(s, 4);
    expect(second.status).toBe('declined');
    expect(s.log.some((e) => /Ada Quill \(Fixture\) turned down the role of Nell\. They aren't free during your production\./.test(e.text))).toBe(true);
    // The refusal cost nothing and booked nothing.
    expect(q.obligations.find((o) => o.ref === second.id)!.state).toBe('cancelled');
    expect(s.people[ADA_ID].bookings.map((b) => b.projectId)).toEqual([p.id]);
    // Still one person, with one diary.
    expect(Object.keys(s.real!)).toEqual([ADA_ID]);
  });

  it('is shot with, paid for the days she worked, and credited by name in the part', () => {
    castAll(s, p);
    staffAll(s, p);
    runDays(s, p, 30);
    startProduction(s, p);
    runDays(s, p, 300);
    expect(summary(p)).toMatchObject({ delivered: true });
    expect(hire.daysWorked).toBeGreaterThan(0);
    const line = p.obligations.find((o) => o.ref === hire.id)!;
    expect(line.settled).toBe(hire.dayRate * hire.daysWorked);
    // Each day paid once.
    const paid = line.postings.map((x) => x.key);
    expect(new Set(paid).size).toBe(paid.length);
    expect(p.credits.find((c) => c.person === ADA_ID)).toMatchObject({ personName: 'Ada Quill (Fixture)', characterName: 'Mara' });
  });

  it('has this story\'s work on her own page, apart from her record, and remembers the collaboration', () => {
    expect(storyCredits(s, ADA_ID).find((c) => c.projectId === p.id)).toMatchObject({ title: 'Harbour Song', as: 'Mara', status: 'credited' });
    // The recorded credits are the catalog's and are exactly as they were.
    expect(realPerson(s, ADA_ID)!.rec!.ev.actor.n).toBe(4);
    expect(historyWith(s, ADA_ID).map((h) => h.kind)).toEqual(['completed']);
    expect(willingness(s, ADA_ID)).toMatchObject({ refuses: false, minRatio: 0.9 });
    // The second project, once the first is done: she is free, and takes a fair offer.
    const q = s.projects.find((x) => x.title === 'Second Tide')!;
    const rate = personById(s, ADA_ID, 'actor').dayRate;
    const again = makeOffer(s, q, { personId: ADA_ID, roleId: 'actor', dayRate: rate, characterId: idOf(q, 'Nell'), method: 'on-camera' });
    days(s, 4);
    expect(again.status).toBe('accepted');
  });

  it('is all still there after a save and a reload', () => {
    const back = deserialize(serialize(s));
    expect(back.real).toEqual(s.real);
    expect(back.people[ADA_ID]).toEqual(s.people[ADA_ID]);
    const p2 = back.projects.find((x) => x.id === p.id)!;
    expect(consideredOn(p2)).toEqual(consideredOn(p));
    expect(p2.credits.find((c) => c.person === ADA_ID)).toEqual(p.credits.find((c) => c.person === ADA_ID));
    expect(storyCredits(back, ADA_ID)).toEqual(storyCredits(s, ADA_ID));
    expect(personById(back, ADA_ID, 'actor')).toEqual(personById(s, ADA_ID, 'actor'));
  });
});

describe('other jobs, and what stops a hire', () => {
  it('a director is approached as a director, directs the episode given them, and is credited for it', () => {
    const s = startLife('real-director');
    const p = buildProject(s, { title: 'Two Tides', format: 'limited-series', medium: 'live-action', episodes: 2 }, [{ name: 'Mara', patch: { roleSize: 'lead' } }],
      [{ place: 'Office', chars: ['Mara'] }, { place: 'Quay', chars: ['Mara'], extra: { episode: 2 } }]);
    approve(s, p);
    considerPerson(s, BEN, GATHERED);
    // No recorded birth date: nothing can be offered until the player says to treat them as an adult in this story.
    expect(() => considerFor(s, p, { personId: 'tp_800002', roleId: 'episode-director' }, today(s))).toThrow("date of birth isn't recorded");
    expect(() => makeOffer(s, p, { personId: 'tp_800002', roleId: 'episode-director', dayRate: 2000 })).toThrow("can't tell whether the rules for children apply");
    treatAsAdult(s, 'tp_800002', true);
    considerFor(s, p, { personId: 'tp_800002', roleId: 'episode-director' }, today(s));
    // A director isn't offered a part: there is no acting credit to go on.
    expect(() => makeOffer(s, p, { personId: 'tp_800002', roleId: 'actor', dayRate: 700, characterId: idOf(p, 'Mara'), method: 'on-camera' })).toThrow('records no credit for Ben Rook (Fixture) as a performer');
    const ben = personById(s, 'tp_800002', 'episode-director');
    expect(ben).toMatchObject({ roleId: 'episode-director', experience: 2 });
    const h = makeOffer(s, p, { personId: 'tp_800002', roleId: 'episode-director', dayRate: ben.dayRate });
    days(s, 4);
    expect(h.status).toBe('accepted');
    assignEpisodeRole(p, 2, 'director', 'tp_800002');
    castAll(s, p);
    staffAll(s, p);
    runDays(s, p, 30);
    startProduction(s, p);
    runDays(s, p, 400);
    expect(summary(p)).toMatchObject({ delivered: true });
    const c = p.credits.find((x) => x.person === 'tp_800002')!;
    expect(c).toMatchObject({ personName: 'Ben Rook (Fixture)', contribution: 'Directed By', episodes: [2] });
    expect(storyCredits(s, 'tp_800002')[0]).toMatchObject({ as: 'Episode Director', status: 'credited' });
  }, 60_000);

  it('a voice part is a voice part: asked as a voice performer, recorded in a session, with nothing of a shoot day', () => {
    const s = startLife('real-voice');
    const p = buildProject(s, { title: 'Paper Boats', format: 'short', medium: 'animation', technique: '2d-rigged', quality: 'limited' }, [{ name: 'The Gull', patch: { roleSize: 'lead', methods: ['voice'] } }], [{ place: 'Harbour', chars: ['The Gull'], minutes: 1 }]);
    approve(s, p);
    considerPerson(s, ADA, GATHERED);
    const gull = idOf(p, 'The Gull');
    considerFor(s, p, { personId: ADA_ID, roleId: 'voice-actor', characterId: gull, method: 'voice' }, today(s));
    const ada = personById(s, ADA_ID, 'voice-actor');
    expect(ada).toMatchObject({ roleId: 'voice-actor', samples: '1 recorded credit in the film catalog.' });
    const h = makeOffer(s, p, { personId: ADA_ID, roleId: 'voice-actor', dayRate: ada.dayRate, characterId: gull, method: 'voice' });
    days(s, 4);
    expect(h.status).toBe('accepted');
    expect(p.cast.find((c) => c.characterId === gull)).toMatchObject({ performer: ADA_ID, method: 'voice' });
    staffAll(s, p);
    runDays(s, p, 30);
    startProduction(s, p);
    runDays(s, p, 400);
    expect(summary(p)).toMatchObject({ delivered: true, shootDays: 0 });
    expect(p.tasks.find((t) => t.kind === 'anim:voice' && t.assetRef === gull)!.status).toBe('done');
    expect(p.credits.find((c) => c.person === ADA_ID)).toMatchObject({ personName: 'Ada Quill (Fixture)', characterName: 'The Gull' });
  }, 60_000);

  it('released before the work is done, she is replaced, the money is freed, and she asks more next time', () => {
    const s = startLife('real-release');
    const p = short(s, 'Harbour Song');
    const mara = idOf(p, 'Mara');
    considerPerson(s, ADA, GATHERED);
    const rate = personById(s, ADA_ID, 'actor').dayRate;
    const h = makeOffer(s, p, { personId: ADA_ID, roleId: 'actor', dayRate: rate, characterId: mara, method: 'on-camera' });
    days(s, 4);
    expect(h.status).toBe('accepted');
    releaseHire(s, p, h.id);
    expect(p.cast.some((c) => c.characterId === mara)).toBe(false);
    expect(p.obligations.find((o) => o.ref === h.id)!.state).toBe('cancelled');
    expect(s.people[ADA_ID].bookings).toEqual([]);
    // Someone else takes the part.
    castAll(s, p);
    days(s, 4);
    expect(p.cast.find((c) => c.characterId === mara)!.performer).not.toBe(ADA_ID);
    // What happened between them in this story is this story's: it changes her answer to this player, and is no claim about her.
    expect(willingness(s, ADA_ID)).toMatchObject({ minRatio: 1.15, reason: 'You let them go from Harbour Song, so they ask for more.' });
    expect(storyCredits(s, ADA_ID)[0]).toMatchObject({ status: 'ended' });
  });

  it('dates she can\'t do in this story are refused like anyone\'s, and said to be this story\'s', () => {
    const s = startLife('real-busy');
    const p = short(s, 'Harbour Song');
    considerPerson(s, ADA, GATHERED);
    const win = productionWindow(s, p);
    // Other work that keeps her busy, as the game makes it up for everyone: placed over the production here.
    realPerson(s, ADA_ID)!.sim.busy = [{ from: win.from, to: win.to }];
    const rate = personById(s, ADA_ID, 'actor').dayRate;
    const h = makeOffer(s, p, { personId: ADA_ID, roleId: 'actor', dayRate: rate, characterId: idOf(p, 'Mara'), method: 'on-camera' });
    days(s, 4);
    expect(h.status).toBe('declined');
    expect(isAvailable(s, personById(s, ADA_ID, 'actor'), win.from, win.to, p.id).ok).toBe(false);
  });

  it('nobody is approached after a recorded death, and someone contracted before it is unavailable from that day', () => {
    const s = startLife('real-death'); // the story begins January 5, 2026; the record says March 20, 2026
    const p = short(s, 'Harbour Song');
    considerPerson(s, LATE, GATHERED);
    const id = 'tp_800003';
    const tom = idOf(p, 'Tom');
    // In January they are alive, the production is over before March, and they take the part.
    const h = makeOffer(s, p, { personId: id, roleId: 'actor', dayRate: personById(s, id, 'actor').dayRate, characterId: tom, method: 'on-camera' });
    days(s, 4);
    expect(h.status).toBe('accepted');
    expect(isAvailable(s, personById(s, id, 'actor'), '2026-03-19', '2026-03-19', p.id).ok).toBe(true);
    // From the day the record gives, they are unavailable for good: a shoot day then goes without them (production/shoot.ts
    // asks isAvailable), and the part is the player's to recast.
    expect(isAvailable(s, personById(s, id, 'actor'), '2026-03-20', '2026-03-20', p.id)).toEqual({ ok: false, reason: 'Wren Calder (Fixture) died on 2026-03-20.' });
    expect(isAvailable(s, personById(s, id, 'actor'), '2026-03-01', '2026-04-02')).toEqual({ ok: false, reason: 'Wren Calder (Fixture) died on 2026-03-20.' });
    processUntil(s, Date.parse('2026-03-21T12:00:00Z'), 'advance', 100000);
    const q = short(s, 'Second Tide', ['Nell', 'Bo']);
    expect(() => makeOffer(s, q, { personId: id, roleId: 'actor', dayRate: 700, characterId: idOf(q, 'Bo'), method: 'on-camera' })).toThrow('Wren Calder (Fixture) died on 2026-03-20. Their page stays for reference.');
    expect(() => inviteToAudition(s, q, idOf(q, 'Bo'), 'on-camera', id)).toThrow('died on 2026-03-20');
    // The page, and what they did in this story, stay.
    expect(realPerson(s, id)!.rec!.name).toBe('Wren Calder (Fixture)');
    expect(storyCredits(s, id)).toHaveLength(1);
  });
});
