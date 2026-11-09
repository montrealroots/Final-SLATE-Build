// Songs and screen time (songs.ts, song-actions.ts, screen-time.ts; November 9, 2026): the Production tab's Songs, the
// Edit tab's Screen Time, and a version's own songs. Loaded with the project pages, not at startup.
import { useState } from 'react';
import { approvedCharacters, approvedScenes, isEpisodic, sceneLabel } from '../engine';
import { editScenes } from '../engine/finish';
import { personById } from '../engine/people';
import { clearScreenTime, minutesWords, recordFor, recordScreenTime, screenTotal } from '../engine/screen-time';
import { PLACEMENT_LABELS, attachSong, changeVersionSong, createSong, detachSong, endCreditUses, playFirstOverEndCredits, removeSong, restoreVersionSong, setSongPerformers, type SongSource } from '../engine/song-actions';
import { songStatus, songUses, songsOf } from '../engine/songs';
import { versionScenes } from '../engine/versions';
import type { StoryCharacter as Character, GameState, Project, ProjectVersion, Scene, Song, SongUse } from '../engine/types';
import { Check, SelectField, TextField, longLocal } from './components';
import { getPlace } from '../data/places';
import { store, useGame } from './store';

const SOURCES: { value: SongSource; label: string }[] = [
  { value: 'write', label: 'Write It Yourself' },
  { value: 'commission', label: 'Commission It From A Songwriter' },
  { value: 'public-domain', label: 'An Existing Song In The Public Domain' },
  { value: 'licensed', label: 'An Existing Song, Licensed' },
];
const LYRICS = [
  { value: 'with-music' as const, label: 'With The Music, By The Same Writer' },
  { value: 'you' as const, label: 'Written By You' },
  { value: 'commission' as const, label: 'Commissioned From A Lyricist' },
  { value: 'none' as const, label: 'No Lyrics (Instrumental)' },
];

const names = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);

/** Where a song plays among the end credits' songs: some awards take only the first. */
function creditOrder(p: Project, s: Song, sceneId: string, episode: number): string {
  const order = endCreditUses(p, episode);
  const n = order.findIndex((x) => x.song === s && x.sceneId === sceneId) + 1;
  return order.length === 1 ? 'the only song over the end credits' : n === 1 ? 'the first song over the end credits' : `song ${n} of ${order.length} over the end credits`;
}

/** What a new song will take, before it is added (songs.ts songTasks; the clearance is production/rates.ts). */
function workPreview(source: SongSource, lyrics: (typeof LYRICS)[number]['value']): string {
  const record = 'then, once it is in a scene, a day for a music producer to record it (before the shoot if it is performed on screen)';
  const words = lyrics === 'you' ? ', you the lyrics in about 2 days' : lyrics === 'commission' ? ', a lyricist the lyrics in about 2 days' : '';
  if (source === 'write') return `You write ${lyrics === 'with-music' ? 'it' : 'the music'} in about 4 working days${words.replace(', you the', ' and the')}; ${record}.`;
  if (source === 'commission') return `A songwriter you hire writes ${lyrics === 'with-music' ? 'it' : 'the music'} in about 4 working days${words}; ${record}. Hire them under Crew.`;
  if (source === 'public-domain') return `No writing or rights to clear: ${record.replace('then, ', '')}.`;
  return 'Once it is in a scene, the music supervisor clears it in about 2 days, and the clearance costs about $8,000. It comes with its recording.';
}

function writersWords(g: GameState, s: Song): string {
  if (!s.writers.length) return s.plan ? 'Credited to whoever writes it, once the writing is done.' : 'Writers not recorded.';
  const who = (w: Song['writers'][number]) => (w.who === 'player' ? 'You' : w.who ? personById(g, w.who).name : w.name);
  const music = s.writers.filter((w) => w.music).map(who);
  const lyrics = s.writers.filter((w) => w.lyrics).map(who);
  const same = music.join() === lyrics.join();
  return same ? `Written by ${music.join(', ')}.` : [music.length ? `Music by ${music.join(', ')}.` : '', lyrics.length ? `Lyrics by ${lyrics.join(', ')}.` : ''].filter(Boolean).join(' ');
}

/** The songs of a project: make them, credit who performs them, use them in scenes, take them out (songs.ts). */
export function SongsCard({ p, onError }: { p: Project; onError: (e: string | null) => void }) {
  useGame();
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<SongSource>('write');
  const [lyrics, setLyrics] = useState<(typeof LYRICS)[number]['value']>('with-music');
  const [holder, setHolder] = useState('');
  const [musicBy, setMusicBy] = useState('');
  const [lyricsBy, setLyricsBy] = useState('');
  const songs = songsOf(p);
  const open = !p.delivered;
  const made = source === 'write' || source === 'commission';
  const create = () => {
    const writers = [...new Set([...names(musicBy), ...names(lyricsBy)])].map((n) => ({ name: n, music: names(musicBy).includes(n), lyrics: names(lyricsBy).includes(n) }));
    const e = store.act((s) => void createSong(s, s.projects.find((x) => x.id === p.id)!, { title, source, lyrics, holder, writers }));
    onError(e);
    if (!e) { setTitle(''); setHolder(''); setMusicBy(''); setLyricsBy(''); }
  };
  return (
    <section className="card" aria-labelledby="songs-h">
      <h2 id="songs-h">Songs</h2>
      <p className="dim">Each song is a work of its own, apart from the composer's score. Write one yourself or commission it: the writing is work for you or for a songwriter and lyricist you hire, and its credits go to whoever writes it. A song performed on screen is recorded before its scene is shot. An existing song is credited to its writers; a licensed one needs a music clearance before the mix. Only a song written for this project can be entered for an original song award.</p>
      {songs.length > 0 && <ul className="list">{songs.map((s) => <SongRow key={s.id} p={p} s={s} onError={onError} />)}</ul>}
      {open && (
        <fieldset className="spaced" style={{ border: 0, padding: 0 }}>
          <legend style={{ fontWeight: 600 }}>New Song</legend>
          <div className="grid grid-2 form">
            <TextField label="Song Title" value={title} onChange={setTitle} />
            <SelectField label="Where It Comes From" value={source} options={SOURCES} onChange={setSource} />
            {made && <SelectField label="Lyrics" value={lyrics} options={LYRICS} onChange={setLyrics} hint={source === 'commission' && lyrics === 'with-music' ? 'One songwriter writes both.' : undefined} />}
            {!made && <TextField label="Music By" hint="Separate names with commas." value={musicBy} onChange={setMusicBy} />}
            {!made && <TextField label="Lyrics By" hint="Separate names with commas; the same names if they wrote both." value={lyricsBy} onChange={setLyricsBy} />}
            {source === 'licensed' && <TextField label="Rights Holder" value={holder} onChange={setHolder} />}
          </div>
          <p className="dim small">{workPreview(source, lyrics)}</p>
          <button className="btn" disabled={!title.trim()} onClick={create}>Add Song</button>
          {!title.trim() && <p className="dim small">Give the song a title to add it.</p>}
        </fieldset>
      )}
    </section>
  );
}

function SongRow({ p, s, onError }: { p: Project; s: Song; onError: (e: string | null) => void }) {
  const g = useGame();
  const scenes = p.approvedDraft !== null ? approvedScenes(p) : p.scenes;
  const [sceneId, setSceneId] = useState(scenes.find((x) => !s.uses.some((u) => u.sceneId === x.id))?.id ?? '');
  const [placement, setPlacement] = useState<SongUse['placement']>('background');
  const [minutes, setMinutes] = useState('');
  const parts = approvedCharacters(p).length ? approvedCharacters(p) : p.characters;
  const performing = s.performers.filter((x) => x.characterId).map((x) => x.characterId!);
  const tasks = p.tasks.filter((x) => x.id.endsWith(`:${s.id}`) && x.id.startsWith('song:'));
  const act = (fn: (q: Project) => void) => onError(store.act((st) => fn(st.projects.find((x) => x.id === p.id)!)));
  const open = !p.delivered;
  return (
    <li aria-label={`Song: ${s.title}`}>
      <div className="row-wrap">
        <span className="grow"><strong>{s.title}</strong> <span className="chip">{songStatus(s)}</span>{s.license ? <span className="dim"> · Licensed from {s.license.holder}</span> : null}<span className="dim small"> · Added {longLocal(s.createdAt, getPlace(p.axes.basePlaceId).zone).date}</span></span>
        {open && !s.uses.length && <button className="btn btn-sm" aria-label={`Remove The Song ${s.title}`} onClick={() => act((q) => removeSong(q, s.id))}>Remove Song</button>}
      </div>
      <div className="dim small">{writersWords(g, s)}{s.performers.length ? ` Performed by ${s.performers.map((x) => x.name).join(', ')}.` : ''}</div>
      {tasks.length > 0 && <div className="dim small">{tasks.map((t) => `${t.label}: ${t.status === 'done' ? 'Done' : t.status === 'active' ? 'Underway' : 'Waiting'}`).join(' · ')}</div>}
      {s.uses.length > 0 ? (
        <ul className="list">{s.uses.map((u) => {
          const sc = scenes.find((x) => x.id === u.sceneId);
          return (
            <li key={u.sceneId} className="row-wrap">
              <span className="grow">{sc ? sceneLabel(p, sc) : 'A scene no longer in the script'} · {PLACEMENT_LABELS[u.placement]}{u.placement === 'end-credits' && sc ? ` · ${creditOrder(p, s, u.sceneId, sc.episode)}` : ''}{u.minutes !== null ? ` · plays ${minutesWords(u.minutes)}` : ''}</span>
              {open && !p.edit.pictureLocked && u.placement === 'end-credits' && sc && endCreditUses(p, sc.episode)[0]?.song !== s && <button className="btn btn-sm" aria-label={`Play ${s.title} First Over The End Credits`} onClick={() => act((q) => playFirstOverEndCredits(q, s.id, u.sceneId))}>Play It First</button>}
              {open && !p.edit.pictureLocked && <button className="btn btn-sm" aria-label={`Take ${s.title} Out Of ${sc ? sceneLabel(p, sc) : 'The Scene'}`} onClick={() => act((q) => detachSong(q, s.id, u.sceneId))}>Take It Out</button>}
            </li>
          );
        })}</ul>
      ) : <p className="dim small">Not in any scene yet.</p>}
      {open && !p.edit.pictureLocked && scenes.length > 0 && (
        <div className="row-wrap spaced">
          <SelectField label={`Scene For ${s.title}`} value={sceneId} options={scenes.map((x) => ({ value: x.id, label: sceneLabel(p, x) }))} onChange={setSceneId} />
          <SelectField label="How It Plays" value={placement} options={(Object.keys(PLACEMENT_LABELS) as SongUse['placement'][]).map((k) => ({ value: k, label: PLACEMENT_LABELS[k] }))} onChange={setPlacement} />
          <TextField label="Minutes It Plays" hint="Leave blank if not known." inputMode="decimal" value={minutes} onChange={setMinutes} />
          <button className="btn btn-sm" aria-label={`Use ${s.title} In This Scene`} disabled={!sceneId} onClick={() => act((q) => attachSong(q, s.id, sceneId, placement, minutes.trim() === '' ? null : Number(minutes)))}>Use In Scene</button>
          {!sceneId && <span className="dim small">Choose a scene for it.</span>}
          {placement === 'performed' && <span className="dim small">Performed on screen: its recording comes before the scene is shot.</span>}
        </div>
      )}
      {open && parts.length > 0 && (
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend className="small">Performed By</legend>
          <div className="chip-row">{parts.map((c: Character) => (
            <Check key={c.id} label={`${c.name} Performs ${s.title}`} checked={performing.includes(c.id)} onChange={(v) => act((q) => setSongPerformers(q, s.id, [...s.performers.filter((x) => !x.characterId), ...(v ? [...performing, c.id] : performing.filter((x) => x !== c.id)).map((id) => ({ characterId: id }))]))} />
          ))}</div>
        </fieldset>
      )}
    </li>
  );
}

/** What a version plays where the cut has a song: the same song, nothing, or another (song-actions.ts changeVersionSong). */
export function VersionSongs({ p, v, onError }: { p: Project; v: ProjectVersion; onError: (e: string | null) => void }) {
  const inCut = songUses(p, editScenes(p)).filter((x) => !v.leaveOut.includes(x.use.sceneId));
  if (!inCut.length) return null;
  const finished = p.tasks.some((x) => x.id === `post:version:${v.id}` && x.status === 'done');
  const songs = songsOf(p);
  const scenes = versionScenes(p, v);
  return (
    <ul className="list">{inCut.map(({ song, use }) => {
      const change = v.songChanges?.find((c) => c.sceneId === use.sceneId && c.songId === song.id);
      const value = change ? change.replaceWith ?? '' : song.id;
      const sc = scenes.find((x) => x.id === use.sceneId)!;
      return (
        <li key={`${use.sceneId}:${song.id}`} className="row-wrap">
          {finished || p.delivered ? <span>{sceneLabel(p, sc)}: {change ? (change.replaceWith ? `plays "${songs.find((x) => x.id === change.replaceWith)?.title}" instead of "${song.title}"` : `"${song.title}" taken out`) : `"${song.title}"`}</span> : (
            <SelectField label={`${v.label}: ${sceneLabel(p, sc)}, In Place Of "${song.title}"`} value={value}
              options={[{ value: song.id, label: `"${song.title}", As In The Cut` }, { value: '', label: 'No Song' }, ...songs.filter((x) => x.id !== song.id).map((x) => ({ value: x.id, label: `"${x.title}" Instead` }))]}
              onChange={(nv) => onError(store.act((st) => { const q = st.projects.find((x) => x.id === p.id)!; if (nv === song.id) restoreVersionSong(q, v.id, use.sceneId, song.id); else changeVersionSong(q, v.id, use.sceneId, song.id, nv || null); }))} />
          )}
        </li>
      );
    })}</ul>
  );
}

/** Each part's time on screen in each scene of the cut, recorded from the cut (screen-time.ts). */
export function ScreenTimeCard({ p, onError }: { p: Project; onError: (e: string | null) => void }) {
  useGame();
  const cast = new Set(p.cast.map((a) => a.characterId));
  const chars = approvedCharacters(p).filter((c) => cast.has(c.id));
  const scenes = editScenes(p).filter((s) => s.participants.some((c) => cast.has(c)));
  if (!chars.length || !scenes.length) return null;
  const episodic = isEpisodic(p.axes.format);
  const episodes = [...new Set(editScenes(p).map((s) => s.episode))].sort((a, b) => a - b);
  return (
    <section className="card" aria-labelledby="screen-h">
      <h2 id="screen-h">Screen Time</h2>
      <p className="dim">How long each part is seen, and heard without being seen, in each scene of the cut. Nothing measures the footage for you: watch the cut and record it. A scene you haven't recorded stays unknown, anywhere from none of it to all of it. Several parts can be on screen in the same minutes. Award rules that ask for a share of the running time read these, and only time on screen counts toward them. Cut scenes count for nothing.</p>
      {episodes.map((e) => {
        const eScenes = editScenes(p).filter((s) => s.episode === e);
        const of = eScenes.reduce((a, s) => a + s.estMinutes, 0);
        return (
          <details key={e} className="spaced" open={episodes.length === 1}>
            <summary>{episodic ? `Episode ${e}` : 'The Cut'} ({minutesWords(of)})</summary>
            <ul className="list">{chars.filter((c) => eScenes.some((s) => s.participants.includes(c.id))).map((c) => {
              const t = screenTotal(p, c.id, eScenes);
              return <li key={c.id}><strong>{c.name}</strong>: {minutesWords(t.recorded)} on screen recorded, {Math.round((t.recorded / Math.max(1, of)) * 1000) / 10}% of {minutesWords(of)}{t.heardOnly ? `; ${minutesWords(t.heardOnly)} heard only` : ''}{t.unrecordedScenes ? `; ${t.unrecordedScenes} of ${t.scenes} scenes not recorded (up to ${minutesWords(t.unknown)} more)` : ''}.</li>;
            })}</ul>
            <ul className="list">{scenes.filter((s) => s.episode === e).map((s) => (
              <li key={s.id} aria-label={`Screen Time In ${sceneLabel(p, s)}`}>
                <strong>{sceneLabel(p, s)}</strong> <span className="dim">· {minutesWords(s.estMinutes)}</span>
                {chars.filter((c) => s.participants.includes(c.id)).map((c) => <ScreenTimeRow key={c.id} p={p} s={s} c={c} onError={onError} />)}
              </li>
            ))}</ul>
          </details>
        );
      })}
    </section>
  );
}

function ScreenTimeRow({ p, s, c, onError }: { p: Project; s: Scene; c: Character; onError: (e: string | null) => void }) {
  const r = recordFor(p, s.id, c.id);
  const [on, setOn] = useState(r ? String(r.rec.onScreen) : '');
  const [heard, setHeard] = useState(r ? String(r.rec.heardOnly) : '');
  const status = !r ? 'Not recorded: unknown' : r.stale ? `The scene ran ${minutesWords(r.rec.sceneMinutes)} when this was recorded and runs ${minutesWords(s.estMinutes)} now: record it again` : `Recorded: ${minutesWords(r.rec.onScreen)} on screen${r.rec.heardOnly ? `, ${minutesWords(r.rec.heardOnly)} heard only` : ''}, on ${longLocal(r.rec.at, getPlace(p.axes.basePlaceId).zone).date}`;
  const save = () => onError(store.act((st) => recordScreenTime(st, st.projects.find((x) => x.id === p.id)!, s.id, c.id, Number(on || 0), Number(heard || 0))));
  return (
    <div className="row-wrap spaced" role="group" aria-label={`${c.name} In ${sceneLabel(p, s)}`}>
      <span className="grow">{c.name} <span className="dim small">· {status}</span></span>
      <TextField label={`${c.name} On Screen (Minutes)`} inputMode="decimal" value={on} onChange={setOn} />
      <TextField label={`${c.name} Heard Only (Minutes)`} inputMode="decimal" value={heard} onChange={setHeard} />
      <button className="btn btn-sm" disabled={on.trim() === '' && heard.trim() === ''} onClick={save}>Record</button>
      {!r && on.trim() === '' && heard.trim() === '' && <span className="dim small">Enter the minutes to record them.</span>}
      {r && <button className="btn btn-sm" onClick={() => { onError(store.act((st) => clearScreenTime(st.projects.find((x) => x.id === p.id)!, s.id, c.id))); setOn(''); setHeard(''); }}>Clear</button>}
    </div>
  );
}
