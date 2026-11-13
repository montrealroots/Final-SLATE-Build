// The real music catalog (src/data/music.json, tools/music/catalog.mjs; src/engine/music-catalog.ts; the owner's v5
// brief, 3). The catalog is Wikidata's records; these tests read it as committed, and the save that uses it is a fixture.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyMusicCatalog, composerRecord, considerComposer, licenseRecording, searchMusic, type MusicCatalog } from '../src/engine/music-catalog';
import { asPerson, considerPerson, recordEnds, realPerson } from '../src/engine/guests';
import { deserialize, serialize } from '../src/engine/save';
import { buildProject, startLife } from './helpers';

const cat = applyMusicCatalog(JSON.parse(readFileSync('src/data/music.json', 'utf8'))) as MusicCatalog;
const person = (name: string) => cat.people.find((x) => x.name === name)!;

describe('the catalog', () => {
  it('is Wikidata\'s, CC0, with every record\'s QID, and keeps the music roles apart', () => {
    expect([cat.source, cat.licence]).toEqual(['Wikidata', 'CC0 1.0']);
    expect(cat.people.length).toBeGreaterThan(800);
    expect(cat.recordings.length).toBeGreaterThan(1000);
    expect([...cat.people, ...cat.recordings].every((x) => /^Q\d+$/.test(x.id))).toBe(true);
    const roles = new Set(cat.people.flatMap((x) => x.roles ?? []));
    for (const r of ['composer', 'songwriter', 'lyricist', 'recording-artist', 'performer', 'music-producer', 'conductor']) expect(roles.has(r as never)).toBe(true);
    // Recorded facts, as recorded: a composer's film scores, and a group's years.
    expect(person('Ennio Morricone')).toMatchObject({ kind: 'person', born: '1928-11-10', died: '2020-07-06', tmdb: 1259 });
    expect(person('Ennio Morricone').scores!.films).toBeGreaterThan(100);
    expect(person('The Beatles')).toMatchObject({ kind: 'group', roles: ['recording-artist'] });
    // Nothing the game makes up is in it: no fee, rate, availability, audio or lyrics.
    expect(JSON.stringify(cat)).not.toMatch(/"(fee|rate|price|available|audio|lyrics)"/);
  });

  it('finds people by name and role, and recordings by title or performer', () => {
    expect(searchMusic(cat, 'zimmer', 'composer').people.map((x) => x.name)).toContain('Hans Zimmer');
    expect(searchMusic(cat, 'zimmer', 'lyricist').people.map((x) => x.name)).not.toContain('Hans Zimmer');
    expect(searchMusic(cat, 'queen').recordings.length).toBeGreaterThan(0);
  });
});

describe('in a save', () => {
  it('licenses a real recording as a licensed song carrying its record, its writers as recorded', () => {
    const s = startLife('mc-license');
    const p = buildProject(s, { title: 'Harbour', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ada' }], [{ place: 'Pier', chars: ['Ada'] }]);
    const r = cat.recordings.find((x) => x.title === 'The Show Must Go On')!;
    const song = licenseRecording(s, p, cat, r);
    expect(song).toMatchObject({ title: 'The Show Must Go On', origin: 'existing', rights: 'licensed', license: { holder: "The rights holders of Queen's recording" } });
    expect(song.writers.find((w) => w.name === 'Freddie Mercury')).toMatchObject({ music: true, lyrics: true });
    expect(song.recording).toMatchObject({ id: r.id, performers: ['Queen'], writersRecorded: true, retrieved: cat.retrieved });
    expect(song.performers.map((x) => x.name)).toEqual(['Queen']);
    expect(() => licenseRecording(s, p, cat, r)).toThrow('There is already a song called');
    expect(deserialize(serialize(s)).projects[0].songs![0].recording).toEqual(song.recording);
  });

  it('brings a composer in under the one identity the film catalog gives them, and never replaces a film-catalog record', () => {
    const s = startLife('mc-composer');
    const m = person('Hans Zimmer');
    const rec = composerRecord(m)!;
    expect(rec.id).toBe(947);
    const real = considerComposer(s, cat, m);
    expect(real.id).toBe('tp_947'); // the film catalog's identity, not a second profile
    expect(real.sim.jobs.composer.exp).toBe(5); // a level from his recorded scores, the game's calibration
    expect(real.rec!.cc0).toBe(true);
    expect(recordEnds(real)).toBe(Number.POSITIVE_INFINITY); // TMDB's six months don't bind a CC0 record
    // The record's source is named as it is, not as the film catalog (a phone screenshot of November 13, 2026 caught it).
    expect(asPerson(s, real.id, 'composer').samples).toMatch(/^\d+ recorded credits in the music catalog \(Wikidata\)\.$/);
    // The film catalog's own record, once in the save, stands: the music catalog's copy doesn't replace it.
    const s2 = startLife('mc-composer-2');
    considerPerson(s2, { id: 947, name: 'Hans Zimmer', details: { birthday: '1957-09-12', deathday: null, retrievedAt: '2026-11-01' }, credits: [{ kind: 'crew', role: 'Original Music Composer', date: '2010-07-16' }] }, '2026-11-01');
    considerComposer(s2, cat, m);
    expect(realPerson(s2, 'tp_947')!.rec!.cc0).toBeUndefined();
    // Someone with no TMDB ID or no recorded score has no identity to join.
    expect(composerRecord(person('The Beatles'))).toBeNull();
  });
});
