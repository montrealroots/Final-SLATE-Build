// A project's Music page (engine/music.ts; the v4 package, 03). Licences for its existing songs: ask both holders for a
// scope, read their answer, agree it, renew it, and when they say no, take one of the routes: ask for less, replace the
// song, or leave its scenes silent. Songs themselves are made on the Production page.
import { useState } from 'react';
import { money } from '../engine/budget';
import { formatDateKey, dateKey } from '../engine/time';
import { getPlace } from '../data/places';
import {
  LICENCE_MEDIA, LICENCE_MEDIUM_LABELS, SCOPE_YEARS, agreeLicence, libraryFee, libraryRefusal, replaceWithLibrary, declineQuote, holderFee, licenceTotal, licencesOf, licensesSongs, renewLicence, renewalFee, requestLicence, requestRefusal, scopeWords, standingLicence,
  type LicenceMedium, type LicenceScope, type SongLicence,
} from '../engine/music';
import { detachSong, syncMusicTasks, syncSongTasks } from '../engine/song-actions';
import { songsOf } from '../engine/songs';
import { APPROACH_LABELS, PURPOSE_LABELS, applyBrief, proposeCues, approveThemes, cueSeconds, cuesToConform, editCue, giveThemeNotes, proposeBrief, scoreMinutes, scoreStyleLabel, type MusicApproach, type MusicBrief } from '../engine/cues';
import { SCORES, type Score } from '../engine/craft';
import { approvedScenes, sceneLabel } from '../engine/projects';
import type { GameState, Project, Song } from '../engine/types';
import { Check, NumberField, SelectField, TextField } from './components';
import { activeMandate, approveGuideMe, guideMePlan, guideMeRefusal } from '../engine/mandates';
import { roleLabel } from '../engine/people';
import { GuideMeStanding } from './PlanViews';
import { store, useGame } from './store';

const STATUS: Record<SongLicence['status'], string> = { requested: 'Asked', quoted: 'Quoted', countered: 'Counteroffer', refused: 'Refused', agreed: 'Agreed', expired: 'Run Out', declined: 'Declined' };

export function MusicTab({ p }: { p: Project }) {
  useGame();
  const licensed = songsOf(p).filter((s) => s.rights === 'licensed');
  return (
    <>
    {p.music && !p.delivered && <MusicGuideMe p={p} />}
    {p.music && <BriefCard p={p} />}
    {p.music?.brief && <CuePlan p={p} />}
    <section className="card" aria-labelledby="licences-h">
      <h2 id="licences-h">Licences For Existing Songs</h2>
      {!licensesSongs(p) ? (
        <p className="muted">This project was made before licences, and clears its songs as it always has: the music supervisor's days and one fee.</p>
      ) : !licensed.length ? (
        <p className="muted">No licensed songs. Add an existing song on the Production page, and license it here.</p>
      ) : (
        <>
          <p className="dim small">An existing recording is two works with two owners: the composition, through its publisher, and the recording. Both are asked, and both must say yes. The holders, their answers and their prices are the game's invention; nothing agreed here is permission to use a real recording.</p>
          {licensed.map((s) => <SongLicences key={s.id} p={p} s={s} />)}
        </>
      )}
    </section>
    </>
  );
}

/**
 * Guide Me for music (the v4 package, 03: "Guide Me can propose the complete cue plan and shortlist composers/supervisors
 * within the approved budget. The player can approve once ... or delegate routine review"; November 13, 2026): one
 * approval takes the proposed brief and its cue plan, if none is taken yet, and staffs the Music department within a
 * ceiling (mandates.ts). Licences, notes on the themes (unless handed over) and anything over the ceiling stay yours.
 */
function MusicGuideMe({ p }: { p: Project }) {
  const g = useGame();
  const [open, setOpen] = useState(false);
  const [delegate, setDelegate] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const live = () => store.state!.projects.find((x) => x.id === p.id)!;
  const brief = p.music!.brief ?? proposeBrief(p, g.now);
  // The staff are priced as the work will be once the brief is taken (spotting, themes, the cued minutes, stems): a
  // copy of the project with the brief and its cues, built aside; the game is not touched until Approve.
  const preview = p.music!.brief ? p : (() => {
    const q: Project = { ...p, axes: { ...p.axes, ...(brief.approach === 'score' || brief.approach === 'mixed' ? { score: brief.style } : {}) }, music: { ...p.music!, brief }, tasks: [] };
    q.music!.cues = proposeCues({ idCounter: 0 } as GameState, q);
    return q;
  })();
  const plan = guideMePlan(g, preview, 'Music');
  const [ceiling, setCeiling] = useState(plan.total);
  const staffing = plan.picks.length > 0 && !activeMandate(p, 'Music');
  const no = staffing ? guideMeRefusal(p, 'Music', ceiling) : null;
  return (
    <section className="card" aria-labelledby="music-guide-h">
      <h2 id="music-guide-h">Guide Me For Music</h2>
      <GuideMeStanding p={p} dept="Music" />
      {!open ? (
        <>
          <p className="muted">One approval: {p.music!.brief ? 'your brief stands' : "the brief the game proposes, and its cue plan"}{staffing ? ', and a composer and music supervisor within a ceiling you set' : ''}. Licences, and anything over the ceiling, stay yours.</p>
          {(!p.music!.brief || staffing) && <button className="btn" onClick={() => { setCeiling(plan.total); setOpen(true); }}>Guide Me</button>}
        </>
      ) : (
        <>
          {!p.music!.brief && <p><strong>The Brief:</strong> {APPROACH_LABELS[brief.approach]}{brief.approach === 'score' || brief.approach === 'mixed' ? `, ${scoreStyleLabel(brief.style).toLowerCase()}, on about ${Math.round(brief.density * 100)}% of the scenes` : ''}. {brief.why.join(' ')}</p>}
          {staffing && (
            <>
              <ul className="list" aria-label="Who Guide Me Would Offer">{plan.picks.map((x) => <li key={x.roleId} className="list-item"><span className="grow"><strong>{roleLabel(x.roleId)}</strong>: {x.name}, {money(x.dayRate)} a day for {x.days} {x.days === 1 ? 'day' : 'days'}</span><span>{money(x.total)}</span></li>)}</ul>
              {plan.gaps.map((x) => <p key={x} className="callout small">{x}</p>)}
              <NumberField label="Music Spending Ceiling" value={ceiling} min={0} max={100_000_000} onChange={setCeiling} hint="The most Guide Me may commit for the Music department's hires. It tries someone else when one says no." />
            </>
          )}
          {!p.music!.brief && brief.approach !== 'silence' && <Check label="Let The Composer's Themes Stand Without My Review" hint="Otherwise they wait for you to approve them, or give notes for a round of revision." checked={delegate} onChange={setDelegate} />}
          {no && <p className="small">{no}</p>}
          <div className="row gap-2 wrap">
            <button className="btn btn-primary" disabled={!!no} onClick={() => { const e = store.act((s) => {
              const q = live();
              if (!q.music!.brief) { applyBrief(s, q, { ...brief, ...(delegate ? { delegateReview: true } : {}) }); syncMusicTasks(q); }
              if (staffing) approveGuideMe(s, q, 'Music', ceiling);
            }); setErr(e); if (!e) setOpen(false); }}>Approve</button>
            <button className="btn" onClick={() => setOpen(false)}>Keep It Manual</button>
          </div>
          {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
        </>
      )}
    </section>
  );
}

const DENSITIES = [{ value: '0.25', label: 'Sparse: A Quarter Of The Scenes' }, { value: '0.5', label: 'Moderate: Half Of The Scenes' }, { value: '0.75', label: 'Generous: Three Quarters' }, { value: '0.9', label: 'Nearly Throughout' }];

/** The brief: proposed from the project, said with why, changed as the player likes, and taken. Silence is a brief. */
function BriefCard({ p }: { p: Project }) {
  const g = useGame();
  const [draft, setDraft] = useState<MusicBrief | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const brief = p.music!.brief;
  const live = () => store.state!.projects.find((x) => x.id === p.id)!;
  const open = () => setDraft(brief ? { ...brief } : proposeBrief(p, g.now));
  return (
    <section className="card" aria-labelledby="brief-h">
      <h2 id="brief-h">Music Brief</h2>
      {brief && !draft && (
        <>
          <p><strong>{APPROACH_LABELS[brief.approach]}</strong>{brief.approach === 'score' || brief.approach === 'mixed' ? `, ${scoreStyleLabel(brief.style).toLowerCase()}, on about ${Math.round(brief.density * 100)}% of the scenes` : ''}.</p>
          <ul className="small">{brief.why.map((w) => <li key={w}>{w}</li>)}</ul>
        </>
      )}
      {!brief && !draft && <p className="muted">The game proposes a brief from this project's genres, period, dialogue, pace, songs and budget, with why. It is yours to change, and silence is a choice.</p>}
      {draft ? (
        <>
          {!brief && <ul className="small" aria-label="Why This Brief">{draft.why.map((w) => <li key={w}>{w}</li>)}</ul>}
          <div className="field-row">
            <SelectField label="What Music It Has" value={draft.approach} options={(Object.keys(APPROACH_LABELS) as MusicApproach[]).map((k) => ({ value: k, label: APPROACH_LABELS[k] }))} onChange={(v) => setDraft({ ...draft, approach: v })} />
            {(draft.approach === 'score' || draft.approach === 'mixed') && <SelectField label="The Score's Sound" value={draft.style} options={(Object.keys(SCORES) as Score[]).map((k) => ({ value: k, label: SCORES[k].label }))} onChange={(v) => setDraft({ ...draft, style: v })} />}
            {(draft.approach === 'score' || draft.approach === 'mixed') && <SelectField label="How Much Of It Is Scored" value={String(draft.density)} options={DENSITIES.some((d) => d.value === String(draft.density)) ? DENSITIES : [{ value: String(draft.density), label: `As Proposed: ${Math.round(draft.density * 100)}%` }, ...DENSITIES]} onChange={(v) => setDraft({ ...draft, density: Number(v) })} />}
          </div>
          {(draft.approach === 'score' || draft.approach === 'mixed') && <Check label="Let The Composer's Themes Stand Without My Review" hint="Composition then starts when the themes are written. Otherwise you approve them, or give notes for a round of revision." checked={!!draft.delegateReview} onChange={(v) => setDraft({ ...draft, delegateReview: v || undefined })} />}
          <div className="row gap-2 wrap">
            <button className="btn btn-primary" disabled={!!p.delivered} onClick={() => { const e = store.act((st) => { applyBrief(st, live(), draft); syncMusicTasks(live()); }); setErr(e); if (!e) setDraft(null); }}>Take This Brief</button>
            <button className="btn" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </>
      ) : <button className="btn" disabled={!!p.delivered} onClick={open}>{brief ? 'Change The Brief' : 'Propose A Brief'}</button>}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </section>
  );
}

const time = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/** The cues the brief placed: where each plays, how long, what for, and what it is. */
function CuePlan({ p }: { p: Project }) {
  const [err, setErr] = useState<string | null>(null);
  const cues = p.music!.cues ?? [];
  const live = () => store.state!.projects.find((x) => x.id === p.id)!;
  const episodes = [...new Set(cues.map((c) => c.episode))].sort((a, b) => a - b);
  return (
    <section className="card" aria-labelledby="cues-h">
      <h2 id="cues-h">Cue Plan</h2>
      <p className="small">{episodes.map((e) => `${p.episodes.length > 1 ? `Episode ${e}: ` : ''}${scoreMinutes(p, e) ?? 0} minutes of score for the composer`).join('; ') || 'No cues: nothing is scored.'}. A cue is part of its scene, so its length follows the cut; one under dialogue adds to the mix.</p>
      <ThemesReview p={p} />
      <ScoreJudgedOn p={p} />
      <ul className="list" aria-label="Cues">
        {cues.map((c) => {
          const scene = approvedScenes(p).find((x) => x.id === c.sceneId) ?? p.scenes.find((x) => x.id === c.sceneId);
          const sec = cueSeconds(p, c);
          const start = Math.round((scene?.estMinutes ?? 0) * 60 * c.from);
          return (
            <li key={c.id} className="list-item" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}>
              <div className="grow" style={{ minWidth: 0 }}>
                <strong>{c.code}</strong> {scene ? sceneLabel(p, scene) : 'A scene no longer in the script'}, {time(start)} to {time(start + sec)} ({time(sec)})
                <div className="dim small">{PURPOSE_LABELS[c.purpose]}; {c.source === 'song' ? `the song "${songsOf(p).find((x) => x.id === c.songId)?.title ?? ''}"` : 'score'}, {c.layer === 'source' ? 'heard in the scene' : c.layer}{c.underDialogue ? ', under dialogue' : ''}{c.motif ? `; ${c.motif}` : ''}.</div>
              </div>
              {c.source === 'score' && !p.delivered && (
                <>
                  <SelectField label={`Intensity Of ${c.code}`} value={String(c.intensity)} options={[{ value: '1', label: 'Low' }, { value: '2', label: 'Middle' }, { value: '3', label: 'High' }]} onChange={(v) => setErr(store.act(() => editCue(live(), c.id, { intensity: Number(v) as 1 | 2 | 3 })))} />
                  <button className="btn btn-sm" aria-label={`Take Out ${c.code}`} onClick={() => setErr(store.act(() => editCue(live(), c.id, { remove: true })))}>Take Out</button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </section>
  );
}

/** What the score will be judged on that the player can still change (engine/cues.ts judgeScore), in plain words. */
function ScoreJudgedOn({ p }: { p: Project }) {
  const brief = p.music!.brief!;
  if (brief.approach === 'silence' || brief.approach === 'songs') return null;
  const loud = (p.music!.cues ?? []).filter((c) => c.source === 'score' && c.underDialogue && c.intensity === 3);
  const late = [...new Set(approvedScenes(p).map((s) => s.episode))].flatMap((e) => cuesToConform(p, e));
  const lines = [
    loud.length ? `${loud.map((c) => c.code).join(', ')} ${loud.length === 1 ? 'plays' : 'play'} at high intensity under dialogue, covering lines: the score is judged lower for it. Lower the intensity to keep the lines clear.` : null,
    late.length ? `${late.map((c) => c.code).join(', ')} no longer ${late.length === 1 ? 'fits its scene' : 'fit their scenes'}, which changed length: judged out of time until conformed.` : null,
    brief.delegateReview ? 'Nobody reviews the themes: they stand as the composer read the brief, which the score is judged against.' : 'Themes you review, and give notes on, come closer to what you asked for; the score is judged on that.',
  ].filter((x): x is string => !!x);
  return <ul className="small" aria-label="What The Score Is Judged On">{lines.map((l) => <li key={l}>{l}</li>)}</ul>;
}

function SongLicences({ p, s }: { p: Project; s: Song }) {
  const g = useGame();
  const [err, setErr] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const all = licencesOf(p, s.id);
  const standing = standingLicence(p, s.id, g.now);
  const open = all.find((l) => l.status === 'requested' || l.status === 'quoted' || l.status === 'countered');
  const last = all.at(-1);
  const zone = getPlace(p.axes.basePlaceId).zone;
  const live = () => store.state!.projects.find((x) => x.id === p.id)!;
  const inCut = s.uses.length > 0;
  return (
    <article className="card" aria-label={`Licence For ${s.title}`} style={{ marginTop: 'var(--s3)' }}>
      <h3 style={{ marginTop: 0 }}>{s.title}</h3>
      <p className="small">{standing ? `Licensed for ${scopeWords(standing.scope)}, until ${formatDateKey(dateKey(standing.expires!, zone))}.` : inCut ? 'No licence stands: delivery waits for one.' : 'Not in the cut; no licence is needed unless it goes back in.'}</p>
      {all.length > 0 && (
        <ul className="list" aria-label={`Requests For ${s.title}`}>
          {all.map((l) => (
            <li key={l.id} className="list-item" style={{ display: 'block' }}>
              <strong>{STATUS[l.status]}:</strong> {l.status === 'refused' ? l.reason : `${scopeWords(l.scope)}.`}{' '}
              {(l.status === 'quoted' || l.status === 'countered' || l.status === 'agreed' || l.status === 'expired') && <span>{l.composition.holder} {money(l.composition.fee ?? 0)}, {l.recording.holder} {money(l.recording.fee ?? 0)}: {money(licenceTotal(l))}.</span>}
              {l.status === 'requested' && <span className="dim"> Answers due {formatDateKey(dateKey(l.answerAt, zone))}.</span>}
              {l.status === 'countered' && <span> They would not license it worldwide; this is what they offer instead.</span>}
              {(l.status === 'quoted' || l.status === 'countered') && (
                <div className="row gap-2 wrap" style={{ marginTop: 'var(--s2)' }}>
                  <button className="btn btn-sm btn-primary" aria-label={`Agree ${s.title} For ${money(licenceTotal(l))}`} onClick={() => setErr(store.act((st) => agreeLicence(st, live(), l.id)))}>Agree For {money(licenceTotal(l))}</button>
                  <button className="btn btn-sm" aria-label={`Decline The Quote For ${s.title}`} onClick={() => setErr(store.act(() => declineQuote(live(), l.id)))}>Decline</button>
                </div>
              )}
              {(l.status === 'agreed' || l.status === 'expired') && (
                <div className="row gap-2 wrap" style={{ marginTop: 'var(--s2)' }}>
                  <button className="btn btn-sm" aria-label={`Renew ${s.title} For ${money(renewalFee(l))}`} onClick={() => setErr(store.act((st) => renewLicence(st, live(), l.id)))}>Renew For {money(renewalFee(l))}</button>
                  <span className="dim small">The same scope for {l.scope.years} {l.scope.years === 1 ? 'year' : 'years'} more, from when it runs out.</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {s.library && <p className="dim small">From a production music library, which licenses its tracks on its own terms{s.replaces ? `, in place of "${songsOf(p).find((x) => x.id === s.replaces!.songId)?.title ?? 'a song no longer in the project'}"` : ''}. The library and its fee are the game's invention.</p>}
      {(last?.status === 'refused' || (last?.status === 'expired' && !standing)) && inCut && !s.library && (
        <div role="region" aria-label={`Other Routes For ${s.title}`}>
          <p className="small">Other routes: ask again for less below; replace it with another song or an original on the Production page; put a library track in its place; or leave its scenes without it.</p>
          <div className="row gap-2 wrap">
            <button className="btn btn-sm" disabled={!!libraryRefusal(p, s.id)} aria-label={`Replace ${s.title} With Library Music For ${money(libraryFee(p, s))}`} onClick={() => setErr(store.act((st) => { replaceWithLibrary(st, live(), s.id); syncSongTasks(live()); }))}>Replace With Library Music For {money(libraryFee(p, s))}</button>
            <button className="btn btn-sm" disabled={p.edit.pictureLocked} aria-label={`Leave ${s.title}'s Scenes Silent`} onClick={() => setErr(store.act(() => { for (const u of [...s.uses]) detachSong(live(), s.id, u.sceneId); }))}>Leave Its Scenes Silent</button>
          </div>
          {libraryRefusal(p, s.id) && <p className="dim small">{libraryRefusal(p, s.id)}</p>}
          <p className="dim small">A library track licenses every medium, worldwide, for 10 years. It can go in after the picture is locked; a finished mix takes half a day to lay it in.{p.edit.pictureLocked ? ' The picture is locked: unlock it to take the song out instead.' : ''}</p>
        </div>
      )}
      {!open && !s.library && (asking ? <AskForm p={p} s={s} onDone={() => setAsking(false)} /> : <button className="btn btn-sm" style={{ marginTop: 'var(--s2)' }} aria-label={`Ask To License ${s.title}`} onClick={() => setAsking(true)}>{all.length ? 'Ask Again' : 'Ask To License It'}</button>)}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </article>
  );
}

function AskForm({ p, s, onDone }: { p: Project; s: Song; onDone: () => void }) {
  const home = getPlace(p.axes.basePlaceId).country;
  const [media, setMedia] = useState<LicenceMedium[]>(['festival', 'digital']);
  const [world, setWorld] = useState(false);
  const [codes, setCodes] = useState(home);
  const [years, setYears] = useState('3');
  const [err, setErr] = useState<string | null>(null);
  const scope: LicenceScope = { territories: world ? 'worldwide' : codes.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean), media, years: Number(years) };
  const no = requestRefusal(p, s.id, scope);
  return (
    <fieldset style={{ border: 0, padding: 0, marginTop: 'var(--s3)' }}>
      <legend style={{ fontWeight: 600 }}>What To Ask For</legend>
      <div className="chip-row">{LICENCE_MEDIA.map((m) => <Check key={m} label={LICENCE_MEDIUM_LABELS[m]} checked={media.includes(m)} onChange={(on) => setMedia(on ? [...media, m] : media.filter((x) => x !== m))} />)}</div>
      <Check label="The Whole World" checked={world} onChange={setWorld} />
      {!world && <TextField label="Countries, By Two-Letter Code" hint="Separated by commas, such as US, GB." value={codes} onChange={setCodes} />}
      <SelectField label="For How Long" value={years} options={SCOPE_YEARS.map((y) => ({ value: String(y), label: `${y} ${y === 1 ? 'Year' : 'Years'}` }))} onChange={setYears} />
      <p className="small">{no ?? `If both say yes, likely about ${money(2 * holderFee(p, s, scope))} in all. They answer in days; a broad request is refused more often. Game calibration.`}</p>
      <div className="row gap-2 wrap">
        <button className="btn btn-primary" disabled={!!no} onClick={() => { const e = store.act((st) => void requestLicence(st, st.projects.find((x) => x.id === p.id)!, s.id, scope)); setErr(e); if (!e) onDone(); }}>Ask Both Holders</button>
        <button className="btn" onClick={onDone}>Cancel</button>
      </div>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </fieldset>
  );
}

/** The composer's themes, when they wait for you: approve them, or give notes for a round of revision. */
function ThemesReview({ p }: { p: Project }) {
  const g = useGame();
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const th = p.music?.themes;
  if (!th) return null;
  const live = () => store.state!.projects.find((x) => x.id === p.id)!;
  return (
    <div role="region" aria-label="The Composer's Themes" className="callout" style={{ marginBottom: 'var(--s3)' }}>
      <p style={{ marginTop: 0 }}><strong>The Composer's Themes:</strong> {th.status === 'approved' ? `approved${th.rounds ? ` after ${th.rounds} ${th.rounds === 1 ? 'round' : 'rounds'} of notes` : ''}; composition goes on.` : th.status === 'notes' ? 'being revised after your notes.' : 'written, and waiting for you. Composition starts when you approve them.'}</p>
      {th.notes.length > 0 && <ul className="small">{th.notes.map((n, i) => <li key={i}>Round {i + 1}: {n}</li>)}</ul>}
      {th.status === 'awaiting' && (
        <>
          <TextField label="Your Notes On The Themes" value={note} maxLength={300} multiline onChange={setNote} />
          <div className="row gap-2 wrap">
            <button className="btn btn-primary" onClick={() => setErr(store.act(() => approveThemes(live(), g.now)))}>Approve The Themes</button>
            <button className="btn" disabled={!note.trim()} onClick={() => { const e = store.act(() => giveThemeNotes(live(), note, g.now, () => syncMusicTasks(live()))); setErr(e); if (!e) setNote(''); }}>Give Notes</button>
          </div>
          <p className="dim small">A round of notes is days of the composer's work, and the themes come back to you.</p>
        </>
      )}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </div>
  );
}
