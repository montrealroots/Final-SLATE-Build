// Songs as works (src/engine/songs.ts, song-actions.ts; November 9, 2026). Until then a song was a title and a "licensed"
// flag on a scene, and the original song award went to the score composer of any project with an unlicensed one. These
// tests play songs through the production loop: commissioned and written, recorded, shot, credited and entered.
import { describe, expect, it } from 'vitest';
import { DAY, buildTasks, checkEligibility, institution, processUntil } from './engine-api';
import { attachSong, changeVersionSong, createSong, detachSong, removeSong, setSongPerformers, setSongWriters } from '../src/engine/song-actions';
import { migrateV7toV8, songUses, writtenForProject } from '../src/engine/songs';
import { addVersion, versionScenes } from '../src/engine/versions';
import { editScenes } from '../src/engine/finish';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';
import type { GameState, Project } from '../src/engine/types';

const oscarSong = () => institution('oscars').categories.find((c) => c.id === 'song')!;

/**
 * A short with three songs: "Salt Water", commissioned with music and lyrics by separate writers and performed on screen
 * by Lena; "Harbour Lights", licensed; "Lantern", written by you, over the end credits.
 */
function songFilm(tag: string, deliver = true): { s: GameState; p: Project; ids: Record<string, string> } {
  const s = startLife(tag, 'us-los-angeles');
  const p = buildProject(s, { title: 'Night Ferry', format: 'short', medium: 'live-action', runtime: 12 }, [{ name: 'Lena', patch: { roleSize: 'lead' } }],
    [{ place: 'Ferry', chars: ['Lena'], minutes: 6 }, { place: 'Pier', chars: ['Lena'], minutes: 6 }]);
  const [ferry, pier] = p.scenes;
  const salt = createSong(s, p, { title: 'Salt Water', source: 'commission', lyrics: 'commission' });
  const lights = createSong(s, p, { title: 'Harbour Lights', source: 'licensed', holder: 'Tidewater Music', writers: [{ name: 'Ada Brook', music: true, lyrics: true }] });
  const lantern = createSong(s, p, { title: 'Lantern', source: 'write', lyrics: 'with-music' });
  attachSong(p, salt.id, ferry.id, 'performed', 3);
  setSongPerformers(p, salt.id, [{ characterId: p.characters[0].id }]);
  attachSong(p, lights.id, pier.id, 'background', 2);
  attachSong(p, lantern.id, pier.id, 'end-credits');
  approve(s, p);
  castAll(s, p);
  staffAll(s, p);
  if (deliver) {
    for (let i = 0; i < 6; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
    startProduction(s, p, 5);
    runDays(s, p, 260);
  }
  return { s, p, ids: { salt: salt.id, lights: lights.id, lantern: lantern.id, ferry: ferry.id, pier: pier.id } };
}

describe('songs are works with their own writers, rights and uses', () => {
  it('a commissioned song is written by a songwriter and a lyricist, recorded before the scene that performs it is shot', () => {
    const { p, ids } = songFilm('song-tasks', false);
    const tasks = buildTasks(p);
    const by = (id: string) => tasks.find((x) => x.id === id);
    expect(by(`song:music:${ids.salt}`)?.roleId).toBe('songwriter');
    expect(by(`song:lyrics:${ids.salt}`)?.roleId).toBe('lyricist');
    expect(by(`song:record:${ids.salt}`)).toMatchObject({ kind: 'prep:song', roleId: 'music-producer', dependsOn: [`song:music:${ids.salt}`, `song:lyrics:${ids.salt}`], sceneIds: [ids.ferry] });
    expect(by(`song:music:${ids.lantern}`)?.roleId).toBe('writer'); // yours: you work it, like the script
    expect(by(`song:record:${ids.lantern}`)?.kind).toBe('post:song'); // not performed on screen: recorded before the mix
    expect(by(`song:record:${ids.lights}`)).toBeUndefined(); // licensed with its recording
    expect(by('post:clearance:all')?.units).toBe(2); // one licensed song to clear
    expect(by('post:mix:1')?.dependsOn).toEqual(expect.arrayContaining([`song:record:${ids.salt}`, `song:record:${ids.lantern}`, 'post:clearance:all']));
    // Score and songs are separate work: the composer scores, the songwriters write.
    expect(by('post:music:1')?.roleId).toBe('composer');
  });

  it('played to delivery: writers are whoever wrote, apart from the score; the licensed song isn\'t an original song', () => {
    const { s, p, ids } = songFilm('song-play');
    expect(p.delivered).not.toBeNull();
    const salt = p.songs!.find((x) => x.id === ids.salt)!;
    const songwriter = p.hires.find((h) => h.roleId === 'songwriter')!;
    const lyricist = p.hires.find((h) => h.roleId === 'lyricist')!;
    expect(songwriter.personId).not.toBe(lyricist.personId);
    expect(salt.writers).toEqual([expect.objectContaining({ who: songwriter.personId, music: true }), expect.objectContaining({ who: lyricist.personId, lyrics: true })]);
    expect(salt.writers.find((w) => w.who === songwriter.personId)!.lyrics).toBeUndefined();
    expect(writtenForProject(p, salt)).toBe(true);
    const credits = (song: string) => p.credits.filter((c) => c.songId === song).map((c) => `${c.contribution} ${c.personName}`);
    expect(credits(ids.salt)).toEqual([expect.stringMatching(/^Song Music By \("Salt Water"\) /), expect.stringMatching(/^Song Lyrics By \("Salt Water"\) /), expect.stringMatching(/^Song Performed By \("Salt Water"\) /)]);
    expect(credits(ids.lantern)).toEqual([`Song Written By ("Lantern") ${s.character.name}`]);
    expect(credits(ids.lights)).toEqual(['Song Written By ("Harbour Lights") Ada Brook']);
    // The composer's credit is for the score; it is no song's writing credit.
    const composer = p.credits.find((c) => c.roleId === 'composer');
    expect(composer?.songId).toBeUndefined();
    expect(p.credits.filter((c) => c.songId && c.person === composer?.person && c.roleId !== 'song-performer')).toEqual([]);
    // Each song is judged on its own writing.
    expect(p.quality![`song:${ids.salt}`]).toBeGreaterThan(0);
    expect(p.quality![`song:${ids.lights}`]).toBeUndefined(); // not this production's writers: never judged
    // The Oscar for Original Song: Salt Water's two writers, or Lantern's one; never Harbour Lights.
    const osc = s.editions.find((x) => x.id === 'oscars-2027')!;
    const writers = (songId?: string) => checkEligibility(s, p, osc, oscarSong(), undefined, undefined, undefined, songId);
    expect(writers(ids.salt).recipients.map((c) => c.roleId)).toEqual(['songwriter', 'lyricist']);
    expect(writers(ids.lantern).recipients.map((c) => c.personName)).toEqual([s.character.name]);
    expect(writers(ids.lights).reasons).toContain('"Harbour Lights" is licensed; an original song award takes a song written for the work.');
    expect(writers(ids.lights).recipients).toEqual([]);
  }, 120000);

  it('the Oscars\' song limits apply where they were read: three writers at most, and its own deadline', () => {
    const { s, p, ids } = songFilm('song-limits', false);
    const osc = s.editions.find((x) => x.id === 'oscars-2027')!;
    expect(osc.rulesId).toBe('oscars-2027@4');
    // Labelled fixture: a delivered film whose song four writers wrote.
    const salt = p.songs!.find((x) => x.id === ids.salt)!;
    salt.writers = ['A', 'B', 'C', 'D'].map((n, i) => ({ who: `w${i}`, name: `Writer ${n}`, music: true, lyrics: true }));
    for (const t of p.tasks.filter((x) => x.id.includes(ids.salt))) t.status = 'done';
    p.credits = salt.writers.map((w, i) => ({ id: `c${i}`, person: w.who!, personName: w.name, contribution: 'Song Written By ("Salt Water")', roleId: 'songwriter', songId: salt.id, episodes: 'all', billing: i }));
    p.tasks = buildTasks(p).map((t) => (t.id.includes(ids.salt) ? { ...t, status: 'done' } : t));
    expect(checkEligibility(s, p, osc, oscarSong(), undefined, undefined, undefined, ids.salt).recipients.map((c) => c.personName)).toEqual(['Writer A', 'Writer B', 'Writer C']);
  });

  it('a version can take a song out or play another; the main cut keeps its own', () => {
    const { s, p, ids } = songFilm('song-version', false);
    p.edit.pictureLocked = true;
    const fest = addVersion(s, p, 'Festival Cut', []);
    const dist = addVersion(s, p, 'Distribution Cut', []);
    changeVersionSong(p, dist.id, ids.pier, ids.lights, ids.lantern); // the distributor's cut can't use the licensed song
    changeVersionSong(p, fest.id, ids.ferry, ids.salt, null); // the festival cut drops it
    const heard = (v?: typeof fest) => songUses(p, v ? versionScenes(p, v) : editScenes(p), v).map((x) => `${x.use.sceneId === ids.ferry ? 'ferry' : 'pier'}:${p.songs!.find((y) => y === x.song)!.title}`).sort();
    expect(heard()).toEqual(['ferry:Salt Water', 'pier:Harbour Lights', 'pier:Lantern']);
    expect(heard(dist)).toEqual(['ferry:Salt Water', 'pier:Lantern', 'pier:Lantern']);
    expect(heard(fest)).toEqual(['pier:Harbour Lights', 'pier:Lantern']);
    expect(() => changeVersionSong(p, fest.id, ids.ferry, ids.salt, ids.salt)).toThrow('Choose a different song to play instead.');
    // A song entered in a version must be heard in that version.
    p.delivered = { at: s.now, runtimeMin: 12 };
    const osc = s.editions.find((x) => x.id === 'oscars-2027')!;
    expect(checkEligibility(s, p, osc, oscarSong(), undefined, fest.id, undefined, ids.salt).reasons).toContain('"Salt Water" isn\'t heard in the Festival Cut entered.');
  });

  it('controls refuse what can\'t be: a duplicate title, a performed song in footage already shot, a song still in use', () => {
    const { s, p, ids } = songFilm('song-guard', false);
    expect(() => createSong(s, p, { title: 'salt water', source: 'write' })).toThrow('There is already a song called "salt water".');
    expect(() => createSong(s, p, { title: 'X', source: 'licensed', writers: [{ name: 'A', music: true, lyrics: true }] })).toThrow('Name who holds the rights you are licensing it from.');
    expect(() => createSong(s, p, { title: 'Y', source: 'public-domain' })).toThrow(/Name who wrote it/);
    expect(() => attachSong(p, ids.lantern, ids.pier, 'background')).toThrow('"Lantern" is already in that scene.');
    expect(() => attachSong(p, ids.salt, ids.pier, 'background', 7)).toThrow("The scene runs 6 minutes; the song can't play longer than that in it.");
    expect(() => removeSong(p, ids.salt)).toThrow('Take "Salt Water" out of its scenes first.');
    p.captures.push({ sceneId: ids.pier, captured: 1, quality: 60, version: 1, weatherCompromised: false });
    expect(() => attachSong(p, ids.salt, ids.pier, 'performed')).toThrow('That scene was shot without the song being performed. Use it in the background, or reshoot the scene.');
    detachSong(p, ids.lights, ids.pier); // background music can come out of a shot scene
    removeSong(p, ids.lights);
    expect(p.songs!.map((x) => x.title)).toEqual(['Salt Water', 'Lantern']);
  });
});

describe('saves from before songs were works (v7 to v8)', () => {
  it('each title becomes a song used where it was; origin and writers stay unknown, so none is an original song', () => {
    const scenes = [
      { id: 'sc1', songs: [{ title: 'Old Tune', licensed: false }] },
      { id: 'sc2', songs: [{ title: 'Old Tune', licensed: false }, { title: 'Radio Hit', licensed: true }] },
    ];
    const raw = { version: 7, projects: [{ id: 'p1', createdAt: 5, approvedDraft: 1, drafts: [{ number: 1, scenes }], scenes }] };
    const out = migrateV7toV8(raw) as { projects: Project[] };
    const songs = out.projects[0].songs!;
    expect(songs.map((x) => [x.title, x.origin, x.rights, x.writers.length, x.uses.map((u) => u.sceneId)])).toEqual([
      ['Old Tune', 'unrecorded', 'production', 0, ['sc1', 'sc2']],
      ['Radio Hit', 'existing', 'licensed', 0, ['sc2']],
    ]);
    expect(songs.every((x) => x.uses.every((u) => u.minutes === null))).toBe(true); // durations weren't kept: unknown
    expect(out.projects[0].scenes[0].songs).toEqual(scenes[0].songs); // the scenes keep their old lists untouched
    expect(writtenForProject({ tasks: [] } as unknown as Project, songs[0])).toBe(false);
  });

  it('naming the writers of an old song afterwards doesn\'t make it written for the project', () => {
    const { s, p } = songFilm('song-old', false);
    const raw = migrateV7toV8({ projects: [{ id: 'x', createdAt: 0, approvedDraft: 1, drafts: [{ number: 1, scenes: [{ id: p.scenes[0].id, songs: [{ title: 'Old Tune', licensed: false }] }] }] }] }) as { projects: Project[] };
    const old = raw.projects[0].songs![0];
    p.songs!.push({ ...old, id: 'old-tune' });
    setSongWriters(p, 'old-tune', [{ name: 'Someone', music: true, lyrics: true }]);
    expect(writtenForProject(p, p.songs!.find((x) => x.id === 'old-tune')!)).toBe(false);
    expect(() => setSongWriters(p, p.songs![0].id, [{ name: 'X', music: true, lyrics: true }])).toThrow('A song written for the project is credited to whoever writes it.');
    void s;
  });
});
