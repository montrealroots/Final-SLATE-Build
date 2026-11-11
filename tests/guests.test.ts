// Real people from the film catalog as people in a save (src/engine/guests.ts; the Creative Depth package, milestone D).
// Every person here is made up and labelled a fixture: no real person's name, date or credit is in the repository, and
// nothing here asserts anything about anyone real.
import { describe, expect, it } from 'vitest';
import { DAY, addLog } from './engine-api';
import {
  RECORD_DAYS, WITHDRAWN, asPerson, canApproach, considerFor, consideredOn, considerPerson, stopConsidering, evidenceOf, expireRecords, isReal, jobsOf, levelFrom, realId, realPeople, realPerson, recordEnds, restoreNames, tmdbIdOf, treatAsAdult,
  type RecordedCredit, type RecordedPerson,
} from '../src/engine/guests';
import { deserialize, serialize } from '../src/engine/save';
import { buildProject, startLife } from './helpers';

const GATHERED = '2026-11-10T12:00:00.000Z';
const cast = (_title: string, date: string, role: string, kind = 'cast'): RecordedCredit => ({ kind, role, date, ...(kind === 'series-cast' ? { episodes: 8 } : {}) });
const crew = (date: string, role: string, department: string, kind = 'crew'): RecordedCredit => ({ kind, role, department, date });
/** A performer credited under two companies' titles: one record, since TMDB's person ID is the same in both. */
const ADA: RecordedPerson = {
  id: 800001, name: 'Ada Quill (Fixture)', details: { birthday: '1980-04-02', deathday: null, retrievedAt: GATHERED },
  credits: [cast('The Lantern Keeper', '2019-06-14', 'Mara Venn'), cast('Harbour Lights', '2023-03-03', 'Juno'), cast('Tidewater Station', '2021-09-01', 'Ida Marsh', 'series-cast'), cast('Paper Boats', '2024-02-02', 'The Gull (voice)')],
};
const BEN: RecordedPerson = {
  id: 800002, name: 'Ben Rook (Fixture)', details: null,
  credits: [crew('2019-06-14', 'Director', 'Directing'), crew('2021-09-01', 'Director', 'Directing', 'episode-crew'), crew('2022-01-01', 'Screenplay', 'Writing'), crew('2022-05-05', 'Executive Producer', 'Production'), { kind: 'creator', role: 'Creator', date: '2021-09-01' }],
};
const OLD: RecordedPerson = { id: 800003, name: 'Wren Calder (Fixture)', details: { birthday: '1931-02-02', deathday: '2026-06-01', retrievedAt: GATHERED }, credits: [cast('Old Tom', '1975-01-01', 'Old Tom')] };
const KID: RecordedPerson = { id: 800004, name: 'Pip Marlow (Fixture)', details: { birthday: '2017-03-03', deathday: null, retrievedAt: GATHERED }, credits: [cast('Small Hours', '2025-05-05', 'The Child')] };

describe('what the record shows', () => {
  it('counts credits by the game\'s jobs, with their years, and supposes nothing', () => {
    expect(evidenceOf(ADA.credits)).toEqual({ actor: { n: 4, first: 2019, last: 2024 }, 'voice-actor': { n: 1, first: 2024, last: 2024 } });
    const ben = evidenceOf(BEN.credits);
    expect(ben['episode-director']).toEqual({ n: 2, first: 2019, last: 2021 });
    // A screenplay and a created series are evidence of writing; an executive producer credit is evidence of no job here.
    expect(ben['episode-writer']).toEqual({ n: 2, first: 2021, last: 2022 });
    expect(ben['co-writer']).toEqual({ n: 2, first: 2021, last: 2022 });
    expect(Object.keys(ben).sort()).toEqual(['co-writer', 'episode-director', 'episode-writer']);
    expect(ben.actor).toBeUndefined();
    expect(evidenceOf([{ kind: 'crew', role: 'Best Boy', department: 'Lighting', date: null }])).toEqual({});
    expect(evidenceOf([{ kind: 'cast', role: null, date: null }])).toEqual({ actor: { n: 1 } });
    expect([1, 2, 3, 7, 8, 19, 20, 39, 40, 400].map(levelFrom)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
});

describe('considering someone', () => {
  it('makes one person of one ID, wherever they were found, and freezes what the game makes up about them', () => {
    const s = startLife('guests');
    const a = considerPerson(s, ADA, GATHERED);
    expect(a.id).toBe('tp_800001');
    expect([isReal(a.id), isReal('np_actor_GB_3'), tmdbIdOf(a.id), realId(800001)]).toEqual([true, false, 800001, 'tp_800001']);
    expect(a.rec).toEqual({ name: 'Ada Quill (Fixture)', born: '1980-04-02', ev: evidenceOf(ADA.credits), from: '2026-11-10' });
    expect(a.sim.jobs.actor.exp).toBe(2);
    expect(jobsOf(a).sort()).toEqual(['actor', 'voice-actor']);
    const frozen = structuredClone(a.sim);
    // Found again from another company's page, with a longer record and another spelling: the same person, one diary.
    const again = considerPerson(s, { ...ADA, name: 'Ada Quill-Marsh (Fixture)', credits: [...ADA.credits, ...Array.from({ length: 40 }, (_, i) => cast('More', `20${10 + (i % 9)}-01-01`, `Part ${i}`))] }, '2027-01-01T00:00:00Z');
    expect(again).toBe(a);
    expect(realPeople(s)).toHaveLength(1);
    expect(a.rec!.name).toBe('Ada Quill-Marsh (Fixture)');
    expect(a.rec!.ev.actor.n).toBe(44);
    // What the game made up for this story didn't move with the record.
    expect(a.sim).toEqual(frozen);
    expect(deserialize(serialize(s))).toMatchObject({ real: { tp_800001: { sim: frozen } } });
  });

  it('draws their capability and rate from this save\'s seed, by the same rule as anyone in the game', () => {
    const one = considerPerson(startLife('guests-a'), ADA, GATHERED).sim;
    const same = considerPerson(startLife('guests-a'), ADA, GATHERED).sim;
    const other = considerPerson(startLife('guests-b'), ADA, GATHERED).sim;
    expect(same).toEqual({ ...one, at: same.at });
    expect([other.jobs.actor.cap, other.jobs.actor.rate]).not.toEqual([one.jobs.actor.cap, one.jobs.actor.rate]);
    for (const sim of [one, other]) {
      expect(sim.jobs.actor.cap).toBeGreaterThanOrEqual(30);
      expect(sim.jobs.actor.cap).toBeLessThanOrEqual(98);
      // 700 a day for a performer, at the second level: between 0.9 and 1.1 of 700 x 1.02.
      expect(sim.jobs.actor.rate).toBeGreaterThanOrEqual(640);
      expect(sim.jobs.actor.rate).toBeLessThanOrEqual(790);
    }
  });

  it('as a person in the game: their name and birth date from the record, everything else this story\'s, and nothing guessed', () => {
    const s = startLife('guests');
    considerPerson(s, ADA, GATHERED);
    const p = asPerson(s, 'tp_800001', 'actor');
    expect(p).toMatchObject({ id: 'tp_800001', name: 'Ada Quill (Fixture)', roleId: 'actor', born: '1980-04-02', experience: 2, samples: '4 recorded credits in the film catalog.' });
    // No background, nationality, language or pronoun is supposed from a name or a birthplace.
    expect([p.languages, p.heritages, p.nationalities, p.homeCountry, p.pronouns, p.skills]).toEqual([[], [], [], '', 'they', []]);
    // 45 when the story begins, playing a range around that.
    expect(p.playingAge![0]).toBeLessThanOrEqual(45);
    expect(p.playingAge![1]).toBeGreaterThanOrEqual(45);
    expect(asPerson(s, 'tp_800001', 'voice-actor')).toMatchObject({ roleId: 'voice-actor', samples: '1 recorded credit in the film catalog.' });
    expect(() => asPerson(s, 'tp_1')).toThrow('Unknown person');
    considerPerson(s, BEN, GATHERED);
    expect(asPerson(s, 'tp_800002', 'episode-director')).toMatchObject({ roleId: 'episode-director', born: '' });
    expect(asPerson(s, 'tp_800002', 'episode-director').playingAge).toBeUndefined();
  });
});

describe('whether they can be approached', () => {
  const s = startLife('guests-approach');
  for (const r of [ADA, BEN, OLD, KID]) considerPerson(s, r, GATHERED);

  it('for the jobs the record shows, and says there is nothing to go on for the rest', () => {
    expect(canApproach(s, 'tp_800001', 'actor', '2026-12-01')).toMatchObject({ ok: true });
    expect(canApproach(s, 'tp_800001', 'actor', '2026-12-01').notes).toEqual([
      "The languages they work in aren't recorded, and none is assumed.",
      "4 recorded credits in this catalog, from 2019 to 2024. Work the catalog doesn't cover isn't counted.",
    ]);
    const directing = canApproach(s, 'tp_800001', 'episode-director', '2026-12-01');
    expect(directing).toMatchObject({ ok: false, reason: "The catalog records no credit for Ada Quill (Fixture) as an episode director. That isn't a judgement of them: there is nothing to go on." });
    // A director with no acting credit isn't offered a part on the strength of directing.
    treatAsAdult(s, 'tp_800002', true);
    expect(canApproach(s, 'tp_800002', 'actor', '2026-12-01').ok).toBe(false);
    expect(canApproach(s, 'tp_800002', 'episode-director', '2026-12-01').ok).toBe(true);
    expect(canApproach(s, 'tp_800002', 'line-producer', '2026-12-01').reason).toMatch(/records no credit .* as a line producer/);
    treatAsAdult(s, 'tp_800002', false);
    expect(canApproach(s, 'tp_999', 'actor', '2026-12-01').reason).toMatch(/aren't in your story yet/);
  });

  it('never after a recorded death, and their page stays', () => {
    expect(canApproach(s, 'tp_800003', 'actor', '2026-05-31').ok).toBe(true);
    expect(canApproach(s, 'tp_800003', 'actor', '2026-06-01')).toMatchObject({ ok: false, reason: 'Wren Calder (Fixture) died on 2026-06-01. Their page stays for reference.' });
    expect(realPerson(s, 'tp_800003')!.rec!.name).toBe('Wren Calder (Fixture)');
  });

  it('with no recorded birth date, not until the player says to treat them as an adult, and never by assuming it', () => {
    const before = canApproach(s, 'tp_800002', 'episode-director', '2026-12-01');
    expect(before.ok).toBe(false);
    expect(before.reason).toMatch(/date of birth isn't recorded, so the game can't tell whether the rules for children apply/);
    treatAsAdult(s, 'tp_800002', true);
    const after = canApproach(s, 'tp_800002', 'episode-director', '2026-12-01');
    expect(after.ok).toBe(true);
    expect(after.notes[0]).toBe("Ben Rook (Fixture)'s age isn't recorded. You marked them as an adult in this story.");
    // Someone whose birth date is recorded is reckoned from it: the mark isn't offered.
    expect(() => treatAsAdult(s, 'tp_800001', true)).toThrow("date of birth is recorded");
    // A recorded child is a child: their birth date reaches the rules that read it.
    expect(asPerson(s, 'tp_800004', 'actor').born).toBe('2017-03-03');
    // Eight when the story begins, playing within two years either way.
    expect(asPerson(s, 'tp_800004', 'actor').playingAge).toEqual([6, 10]);
  });
});

describe('a project\'s list of people being considered', () => {
  it('holds a real person for a part or a job, once, offers nothing, and refuses with the reason when they can\'t be approached', () => {
    const s = startLife('guests-list');
    const p = buildProject(s, { title: 'Fixture Film', format: 'short', medium: 'live-action' }, [{ name: 'Mara' }], [{ place: 'Room', chars: ['Mara'] }]);
    const mara = p.characters[0].id;
    for (const r of [ADA, BEN, OLD]) considerPerson(s, r, GATHERED);
    considerFor(s, p, { personId: 'tp_800001', roleId: 'actor', characterId: mara }, '2026-12-01');
    considerFor(s, p, { personId: 'tp_800001', roleId: 'actor', characterId: mara }, '2026-12-01');
    expect(consideredOn(p)).toEqual([{ personId: 'tp_800001', roleId: 'actor', characterId: mara, method: 'on-camera' }]);
    expect([p.hires, p.obligations, p.cast]).toEqual([[], [], []]);
    expect(() => considerFor(s, p, { personId: 'tp_800002', roleId: 'episode-director' }, '2026-12-01')).toThrow("date of birth isn't recorded");
    expect(() => considerFor(s, p, { personId: 'tp_800003', roleId: 'actor', characterId: mara }, '2026-12-01')).toThrow('died on 2026-06-01');
    expect(() => considerFor(s, p, { personId: 'tp_800001', roleId: 'actor', characterId: 'gone' }, '2026-12-01')).toThrow('no longer in the script');
    stopConsidering(p, { personId: 'tp_800001', roleId: 'actor', characterId: mara });
    expect(consideredOn(p)).toEqual([]);
  });
});

describe('TMDB\'s six months', () => {
  const setup = () => {
    const s = startLife('guests-expire');
    const p = buildProject(s, { title: 'Fixture Film', format: 'short', medium: 'live-action' }, [{ name: 'Ada Quill (Fixture)' }], [{ place: 'Room', chars: ['Ada Quill (Fixture)'] }]);
    const a = considerPerson(s, ADA, GATHERED);
    addLog(s, 'Ada Quill (Fixture) accepted the role.', 'project', { projectId: p.id });
    p.history.push({ at: s.now, text: 'Offered the part to Ada Quill (Fixture).' });
    p.credits.push({ id: 'cr1', person: a.id, personName: 'Ada Quill (Fixture)', contribution: 'Cast', roleId: 'actor', episodes: 'all', billing: 1 });
    p.story.premise = 'A part written for Ada Quill (Fixture), in my own words.';
    return { s, p, a };
  };

  it('keeps a copied record 180 days from when it was gathered, to the day', () => {
    const { s, a } = setup();
    const ends = recordEnds(a)!;
    expect(new Date(ends).toISOString().slice(0, 10)).toBe('2027-05-09');
    expect(RECORD_DAYS).toBe(180);
    expect(expireRecords(s, ends - 1, () => undefined)).toEqual({ renewed: 0, removed: 0 });
    expect(a.rec).toBeTruthy();
  });

  it('with no catalog installed, removes the record and the name wherever the game wrote it, and nothing the player wrote or the save decided', () => {
    const { s, p, a } = setup();
    const sim = structuredClone(a.sim);
    expect(expireRecords(s, recordEnds(a)!, () => undefined)).toEqual({ renewed: 0, removed: 1 });
    expect(a.rec).toBeUndefined();
    expect(a.sim).toEqual(sim);
    expect(s.log.map((e) => e.text)).toContain(`${WITHDRAWN} accepted the role.`);
    expect(p.history.at(-1)!.text).toBe(`Offered the part to ${WITHDRAWN}.`);
    expect(p.credits[0]).toMatchObject({ person: 'tp_800001', personName: WITHDRAWN });
    // The player's own writing is theirs: a character's name and a premise are never altered.
    expect(p.story.premise).toBe('A part written for Ada Quill (Fixture), in my own words.');
    expect(p.characters[0].name).toBe('Ada Quill (Fixture)');
    // Nothing the game wrote still carries the name.
    const written = JSON.stringify([s.log, p.history, p.credits, p.schedule, p.tasks, (s as unknown as { real: unknown }).real]);
    expect(written).not.toContain('Ada Quill');
    expect(asPerson(s, a.id, 'actor').name).toBe(WITHDRAWN);
    expect(canApproach(s, a.id, 'actor', '2027-06-01')).toMatchObject({ ok: false });
    expect(canApproach(s, a.id, 'actor', '2027-06-01').reason).toMatch(/withdrawn when the film catalog's six months passed/);
    // Nothing more to remove the next time.
    expect(expireRecords(s, recordEnds({ ...a, rec: undefined }) ?? Date.now(), () => undefined)).toEqual({ renewed: 0, removed: 0 });
  });

  it('with a newer catalog installed, renews the copy instead, and a later one brings a withdrawn name back to their credits', () => {
    const { s, p, a } = setup();
    const fresh = { record: { ...ADA, details: { ...ADA.details!, retrievedAt: '2027-05-01T00:00:00Z' } }, gathered: '2027-05-01T00:00:00Z' };
    expect(expireRecords(s, recordEnds(a)!, () => fresh)).toEqual({ renewed: 1, removed: 0 });
    expect(a.rec!.from).toBe('2027-05-01');
    expect(p.credits[0].personName).toBe('Ada Quill (Fixture)');
    // An equally old copy from an expired catalog renews nothing: the record goes.
    const stale = { record: ADA, gathered: GATHERED };
    expect(expireRecords(s, recordEnds(a)! + DAY, () => stale)).toEqual({ renewed: 0, removed: 1 });
    expect(p.credits[0].personName).toBe(WITHDRAWN);
    // Installed again later: considered afresh from the new record, with the same made-up profile, and credited by name.
    const sim = structuredClone(a.sim);
    // The expiry pass itself brings it back once the installed catalog is newer; a stale one still brings nothing.
    const later = Date.parse('2028-01-02T00:00:00Z');
    expect(expireRecords(s, later, () => stale)).toEqual({ renewed: 0, removed: 0 });
    expect(a.rec).toBeUndefined();
    const again = { record: { ...ADA, details: { ...ADA.details!, retrievedAt: '2028-01-01T00:00:00Z' } }, gathered: '2028-01-01T00:00:00Z' };
    expect(expireRecords(s, later, () => again)).toEqual({ renewed: 1, removed: 0 });
    expect(a.sim).toEqual(sim);
    expect(a.rec!.from).toBe('2028-01-01');
    expect(p.credits[0].personName).toBe('Ada Quill (Fixture)');
    // Asked for by hand, the same: the record on the person's page.
    delete a.rec;
    p.credits[0].personName = WITHDRAWN;
    considerPerson(s, again.record, again.gathered);
    restoreNames(s);
    expect(p.credits[0].personName).toBe('Ada Quill (Fixture)');
  });
});
