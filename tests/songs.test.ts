// Songs as works (src/engine/songs.ts, song-actions.ts; November 9, 2026). Until then a song was a title and a "licensed"
// flag on a scene, and the original song award went to the score composer of any project with an unlicensed one. These
// tests play songs through the production loop: commissioned and written, recorded, shot, credited and entered.
import { describe, expect, it } from 'vitest';
import { DAY, announce, buildTasks, categoryRuleStatus, categoryRules, checkEligibility, institution, processUntil, rulebook, submitEntry } from './engine-api';
import { attachSong, changeVersionSong, createSong, detachSong, playFirstOverEndCredits, removeSong, setSongPerformers, setSongWriters } from '../src/engine/song-actions';
import { migrateV7toV8, songUses, writtenForProject } from '../src/engine/songs';
import { songProblems, songRecipients } from '../src/engine/awards-rules';
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
    expect(osc.rulesId).toBe('oscars-2027@5'); // version 5 adds the rest of Rule Nineteen; writers with no recorded days count as equal
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

/**
 * Labelled fixture: the song film delivered, its songs written (Salt Water by a songwriter in 8 days and a lyricist in
 * `lyricDays`; Lantern by you), credited as delivery credits them, and released in US cinemas in 2026.
 */
function deliveredSongs(tag: string, lyricDays = 4) {
  const { s, p, ids } = songFilm(tag, false);
  const salt = p.songs!.find((x) => x.id === ids.salt)!;
  const lantern = p.songs!.find((x) => x.id === ids.lantern)!;
  salt.writers = [{ who: 'np_songwriter_US_1', name: 'Teo Holt', music: true, days: 8 }, { who: 'np_lyricist_US_1', name: 'Mina Okoro', lyrics: true, days: lyricDays }];
  lantern.writers = [{ who: 'player', name: 'You', music: true, lyrics: true, days: 4 }];
  p.tasks = buildTasks(p).map((t) => ({ ...t, status: 'done' as const, done: t.units }));
  p.axes.format = 'feature';
  p.delivered = { at: s.now, runtimeMin: 100 };
  p.quality = { overall: 70, script: 70, direction: 70, craft: 70, music: 70, reception: 70, [`song:${ids.salt}`]: 99, [`song:${ids.lantern}`]: 98 };
  const w = (id: string, person: string, name: string, contribution: string, roleId: string, songId: string) => ({ id, person, personName: name, contribution, roleId, songId, episodes: 'all' as const, billing: 1 });
  p.credits = [
    { id: 'pr', person: 'player', personName: 'You', contribution: 'Produced By', roleId: 'producer', episodes: 'all', billing: 0 },
    w('m', 'np_songwriter_US_1', 'Teo Holt', 'Song Music By ("Salt Water")', 'songwriter', ids.salt),
    w('l', 'np_lyricist_US_1', 'Mina Okoro', 'Song Lyrics By ("Salt Water")', 'lyricist', ids.salt),
    w('y', 'player', 'You', 'Song Written By ("Lantern")', 'songwriter', ids.lantern),
  ];
  p.releases.push({ id: 'r1', route: 'theatrical', date: '2026-08-01', territories: ['US'], distributor: 'D', note: '', status: 'released' });
  s.now = Math.max(s.now, s.editions.find((x) => x.id === 'oscars-2027')!.submissionOpens + DAY); // the Oscars take entries
  return { s, p, ids, ed: (id: string) => s.editions.find((x) => x.id === id)! };
}
const song = (inst: string, id = 'song') => institution(inst).categories.find((c) => c.id === id)!;

describe('the organizers\' own song rules', () => {
  it('the Oscars: a song only over the end credits must be their first; playing it first makes it eligible', () => {
    const { s, p, ids, ed } = deliveredSongs('sr-credits');
    const osc = ed('oscars-2027');
    expect(osc.rulesId).toBe('oscars-2027@5');
    const why = () => checkEligibility(s, p, osc, song('oscars'), undefined, undefined, undefined, ids.lantern).reasons;
    expect(why()).toEqual([]); // the only song over the end credits: their first
    p.delivered = null; // labelled: back before delivery to add another end-credits song
    attachSong(p, ids.salt, ids.pier, 'end-credits');
    playFirstOverEndCredits(p, ids.salt, ids.pier);
    p.delivered = { at: s.now, runtimeMin: 100 };
    expect(why()).toContain('"Lantern" plays only over the end credits, and isn\'t their first song; this award takes a song in the body of the film or the first new song once the end credits begin.');
    // Salt Water is performed in the body too, so its place over the credits doesn't matter.
    expect(checkEligibility(s, p, osc, song('oscars'), undefined, undefined, undefined, ids.salt).reasons).toEqual([]);
    p.delivered = null;
    playFirstOverEndCredits(p, ids.lantern, ids.pier);
    p.delivered = { at: s.now, runtimeMin: 100 };
    expect(why()).toEqual([]);
    // The Canadian Screen Awards take no song from the closing credits at all.
    const csa = ed('canadian-screen-2027');
    expect(csa.rulesId).toBe('canadian-screen-2027@2');
    expect(checkEligibility(s, p, csa, song('canadian-screen'), undefined, undefined, undefined, ids.lantern).reasons).toContain('"Lantern" plays only over the end credits, which this award doesn\'t take.');
  });

  it('who receives it follows how much each wrote: the Oscars\' essentially equal writers, the Emmys\' 20%, the Globes\' every credited writer', () => {
    const { s, p, ids, ed } = deliveredSongs('sr-share', 3); // the lyricist wrote 3 days to the composer's 8
    const names = (edition: string, inst: string, cat = 'song') => checkEligibility(s, p, ed(edition), song(inst, cat), undefined, undefined, undefined, ids.salt).recipients.map((c) => c.personName);
    expect(names('oscars-2027', 'oscars')).toEqual(['Teo Holt']); // under half the main writer's days: a partial contributor
    expect(names('golden-globes-2027', 'golden-globes')).toEqual(['Teo Holt', 'Mina Okoro']);
    p.songs!.find((x) => x.id === ids.salt)!.writers[1].days = 4;
    expect(names('oscars-2027', 'oscars')).toEqual(['Teo Holt', 'Mina Okoro']); // half: essentially equal
    // The Emmys' smallest eligible contribution is 20% of the writing.
    p.songs!.find((x) => x.id === ids.salt)!.writers[1].days = 1; // 1 of 9 days: 11%
    expect(ed('emmys-2027').rulesId).toBe('emmys-2027@5');
    const emmyCat = institution('emmys').categories.find((c) => c.id === 'original-music-lyrics')!;
    const emmyRule = categoryRules(ed('emmys-2027'), emmyCat.id)?.song?.value;
    expect(emmyRule?.minShare).toBe(0.2);
    const salt = p.songs!.find((x) => x.id === ids.salt)!;
    expect(songRecipients(p, salt, emmyRule).map((c) => c.personName)).toEqual(['Teo Holt']);
    salt.writers[1].days = 2; // 2 of 10 days: 20%
    expect(songRecipients(p, salt, emmyRule).map((c) => c.personName)).toEqual(['Teo Holt', 'Mina Okoro']);
  });

  it('a film enters several songs, each its own entry, up to the organizer\'s limit; the same writers once at the Canadian Screen Awards', () => {
    const { s, p, ids, ed } = deliveredSongs('sr-many');
    const third = createSongDelivered(s, p, 'Harbour Wind', ids.ferry);
    const osc = ed('oscars-2027');
    s.now = osc.submissionOpens + 1;
    const a = submitEntry(s, p, osc.id, 'song', undefined, undefined, undefined, ids.salt);
    const b = submitEntry(s, p, osc.id, 'song', undefined, undefined, undefined, ids.lantern);
    expect([a.songId, b.songId]).toEqual([ids.salt, ids.lantern]);
    expect(a.id).not.toBe(b.id);
    expect(() => submitEntry(s, p, osc.id, 'song', undefined, undefined, undefined, ids.salt)).toThrow('This song is already entered in that category.');
    submitEntry(s, p, osc.id, 'song', undefined, undefined, undefined, third);
    expect(osc.entries.filter((e) => e.categoryId === 'song').length).toBe(3);
    // The Canadian Screen Awards take two, and the same writers once.
    const csa = ed('canadian-screen-2027');
    s.now = Math.max(s.now, csa.submissionOpens + 1);
    p.axes.basePlaceId = 'ca-toronto'; // labelled: the Canadian Screen Awards take Canadian productions
    p.releases.push({ id: 'r2', route: 'theatrical', date: '2026-08-01', territories: ['CA'], distributor: 'D', note: '', status: 'released' });
    submitEntry(s, p, csa.id, 'song', undefined, undefined, undefined, ids.salt);
    const wind = p.songs!.find((x) => x.id === third)!;
    const own = wind.writers;
    wind.writers = p.songs!.find((x) => x.id === ids.salt)!.writers; // labelled: the same team wrote it
    expect(() => submitEntry(s, p, csa.id, 'song', undefined, undefined, undefined, third)).toThrow('The same writers can enter only one song from a work at the Canadian Screen Awards.');
    wind.writers = own;
    submitEntry(s, p, csa.id, 'song', undefined, undefined, undefined, third);
    const fourth = createSongDelivered(s, p, 'Low Tide', ids.ferry);
    expect(() => submitEntry(s, p, csa.id, 'song', undefined, undefined, undefined, fourth)).toThrow('Canadian Screen Awards takes at most 2 songs from one work in this category.');
  });

  it('the Oscars nominate at most two songs from one film; each song keeps its own result', () => {
    const { s, p, ids, ed } = deliveredSongs('sr-nominate');
    const third = createSongDelivered(s, p, 'Harbour Wind', ids.ferry);
    p.quality![`song:${third}`] = 97;
    const osc = ed('oscars-2027');
    s.now = osc.submissionOpens + 1;
    for (const id of [ids.salt, ids.lantern, third]) submitEntry(s, p, osc.id, 'song', undefined, undefined, undefined, id).status = 'accepted';
    announce(s, osc);
    const nominated = osc.entries.filter((e) => e.categoryId === 'song' && e.status === 'nominated');
    expect(nominated.length).toBeLessThanOrEqual(2);
    expect(osc.results.song.projectIds.every((k) => k.startsWith(`${p.id}~`))).toBe(true);
    expect(osc.results.song.projectIds.length).toBe(nominated.length);
    // Each song is named in what was announced.
    expect(s.log.some((l) => /"(Salt Water|Lantern|Harbour Wind)" from Night Ferry (was nominated|wasn't nominated)/.test(l.text))).toBe(true);
  });

  it('length and title themes: the Goyas\' 30 seconds at once or 60 in all; the Emmys\' series title theme', () => {
    const { s, p, ids, ed } = deliveredSongs('sr-length');
    const goya = song('goya');
    const why = () => checkEligibility(s, p, ed('goya-2027'), goya, undefined, undefined, undefined, ids.lantern).reasons.join(' ');
    expect(ed('goya-2027').rulesId).toBe('goya-2027@3');
    expect(why()).toMatch(/How long "Lantern" plays isn't recorded in every scene; this award needs it heard for 30 seconds at once or 60 seconds in all/);
    p.songs!.find((x) => x.id === ids.lantern)!.uses[0].minutes = 0.4; // 24 seconds
    expect(why()).toMatch(/"Lantern" plays for 24 seconds at most at once, 24 in all; this award needs 30 seconds at once or 60 seconds in all\./);
    p.songs!.find((x) => x.id === ids.lantern)!.uses[0].minutes = 0.5;
    expect(why()).not.toMatch(/Lantern/);
    // Two 20-second uses: 40 seconds in all, never 30 at once: short of both.
    const lantern = p.songs!.find((x) => x.id === ids.lantern)!;
    lantern.uses = [{ ...lantern.uses[0], minutes: 1 / 3 }, { sceneId: ids.ferry, placement: 'background', minutes: 1 / 3 }];
    expect(why()).toMatch(/"Lantern" plays for 20 seconds at most at once, 40 in all/);
    // A series' main title theme: the Emmys and the AACTA send it elsewhere or refuse it; a film's opening song is in its body.
    lantern.uses = [{ sceneId: ids.pier, placement: 'opening-titles', minutes: 1 }];
    expect(songProblems(p, ids.lantern, undefined, { noTitleTheme: true })).toEqual([]);
    p.axes.format = 'series';
    expect(songProblems(p, ids.lantern, undefined, { noTitleTheme: true })).toEqual(['"Lantern" plays only as the main title theme, which this award doesn\'t take.']);
    // The AACTA's song rule was first read without its release windows, which kept the category on SLATE's rules; its
    // windows now come per format (byFormat), so it is the organizer's. A song rule alone still isn't eligibility.
    expect(categoryRuleStatus(rulebook('aacta-2027@2'), 'song')).toBe('verified');
    expect(categoryRuleStatus({ ...rulebook('aacta-2027@2')!, categories: { song: { song: rulebook('aacta-2027@2')!.categories.song!.song } } }, 'song')).toBe('simulated');
  });

  it('the AACTA\'s soundtrack: five songs apart from the score, each heard five seconds; to the music supervisor', () => {
    const { s, p, ids, ed } = deliveredSongs('sr-soundtrack');
    const aacta = ed('aacta-2027');
    expect(aacta.rulesId).toBe('aacta-2027@5'); // version 3 added the soundtrack's rules; 4 the online series, 5 where effects are made
    const st = song('aacta', 'soundtrack');
    const check = () => checkEligibility(s, p, aacta, st);
    const why = () => check().reasons.find((r) => r.includes('soundtrack')) ?? '';
    // Salt Water (3 minutes) and Harbour Lights (2) count; Lantern's minutes over the credits aren't recorded.
    expect(why()).toBe('2 songs are heard for 5 seconds or more; this award\'s soundtrack needs 5. How long 1 more plays isn\'t recorded: record its minutes under Songs.');
    p.songs!.find((x) => x.id === ids.lantern)!.uses[0].minutes = 4 / 60; // 4 seconds: short of 5
    expect(why()).toBe('2 songs are heard for 5 seconds or more; this award\'s soundtrack needs 5.');
    p.songs!.find((x) => x.id === ids.lantern)!.uses[0].minutes = 5 / 60;
    const more = ['Low Tide', 'Harbour Wind'].map((t) => createSongDelivered(s, p, t, ids.ferry));
    expect(why()).toBe('');
    // Every song heard counts, licensed or written for the work: one fewer is one short.
    p.songs!.find((x) => x.id === more[0])!.uses[0].minutes = null;
    expect(why()).toBe('4 songs are heard for 5 seconds or more; this award\'s soundtrack needs 5. How long 1 more plays isn\'t recorded: record its minutes under Songs.');
    p.songs!.find((x) => x.id === more[0])!.uses[0].minutes = 1;
    // Received by the music supervisor (10.4(b)), never the score composer.
    p.credits.push({ id: 'cmp', person: 'np_composer_US_1', personName: 'Ravi Shah', contribution: 'Music By', roleId: 'composer', episodes: 'all', billing: 4 });
    p.credits.push({ id: 'ms', person: 'np_music-supervisor_US_1', personName: 'June Park', contribution: 'Music Supervisor', roleId: 'music-supervisor', episodes: 'all', billing: 5 });
    expect(check().recipients.map((c) => c.id)).toEqual(['ms']);
    // The shared crafts take a work's own format's rules: a film's Australian release in 2026.
    expect(categoryRules(aacta, 'vfx-animation', p)?.release?.value.countries).toEqual(['AU']);
    expect(categoryRules(aacta, 'hair-makeup', p)?.runtime?.value).toEqual({ atLeast: 60 });
    p.axes.format = 'series';
    expect(categoryRules(aacta, 'soundtrack', p)?.release?.value.routes).toEqual(['broadcast', 'streaming']);
    for (const id of ['hair-makeup', 'soundtrack', 'vfx-animation']) expect(categoryRuleStatus(rulebook('aacta-2027@3'), id)).toBe('verified');
  });
});

/** Labelled fixture: one more song written for the film by another writer, used in a scene, its writing done. */
function createSongDelivered(s: GameState, p: Project, title: string, sceneId: string): string {
  const d = p.delivered;
  p.delivered = null;
  const x = createSong(s, p, { title, source: 'commission', lyrics: 'with-music' });
  attachSong(p, x.id, sceneId, 'background', 1);
  p.delivered = d;
  x.writers = [{ who: 'np_songwriter_US_2', name: 'Iris Varga', music: true, lyrics: true, days: 4 }];
  for (const t of buildTasks(p).filter((t) => t.id.endsWith(x.id))) {
    const have = p.tasks.find((y) => y.id === t.id);
    if (have) Object.assign(have, { status: 'done', done: have.units }); else p.tasks.push({ ...t, status: 'done', done: t.units });
  }
  p.credits.push({ id: `c-${x.id}`, person: 'np_songwriter_US_2', personName: 'Iris Varga', contribution: `Song Written By ("${title}")`, roleId: 'songwriter', songId: x.id, episodes: 'all', billing: 3 });
  return x.id;
}
