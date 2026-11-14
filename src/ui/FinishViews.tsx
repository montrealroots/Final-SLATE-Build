import { Fragment, useState } from 'react';
import { ReleasePlanCard } from './ReleasePlan';
import { creditLine } from '../engine/adaptation';
import { approveDesign, askForDesignChanges } from '../engine/designs-actions';
import { showCut } from '../engine/documentary-actions';
import { chooseTake } from '../engine/takes-actions';
import { getPlace, placeLabel } from '../data/places';
import {
  ROUTE_LABELS, acceptDistribution, approvedCharacters, assemblyComplete, checkEligibility, dateKey, declineDistribution, deliver,
  deliveryBlockers, edition, formatDateKey, institution, isEpisodic, ledgerTotals, money, planRelease, puppetStatus,
  qualityWords, CUT_REVIEW_DAYS, depsMet, addDaysToKey, categoryRecipients, type Category,
  categoriesFor, categoryDeadline, categoryRuleStatus, categoryRules, rulebook, screeningTravel, travelTo, cancelRelease, releaseCancelTerms, FACIAL_RIG_PER_SESSION, approveTake, bookMocap, captureCredit, sessionCost, bookingCost, cancelMocapBooking, cancellationTerms, requestRetake, takeChangeImpact,
  approvedScenes, subtitlingCost, offerNeeds, offerMaterials, BROADCAST_EDIT_COST, cutFromEdit, cutScenes, entryNeeds, castPlacement, sceneLabel, addPlan,
  EPISODE_ROUTES, PATTERN_LABELS, orderNotes, presetDates, setEpisodeDates } from '../engine';
// What a schedule change affects: only the Release tab asks (November 10, 2026).
import { scheduleChangeEffects } from '../engine/release-schedule';
// A series delivered an episode at a time: only the Edit and Release tabs ask (November 10, 2026, after #59).
import { deliverEpisode, episodeDeliveryBlockers, episodeLockBlockers, episodeLocked, lockEpisode, startEpisodeCutPass } from '../engine/episode-delivery';
import { coverageGaps, lockBlockers, lockPicture, requestPickups, pickupIntegration, cutPassDays, startCutPass, unlockImpact, unlockPicture, restoreToEdit } from '../engine/edit-actions';
import { rsvpScreening, screeningConflicts, submitEntry, withdrawEntry } from '../engine/awards-actions';
import { publicResult } from '../engine/awards-results';
import { enterable, entryEpisodes, festivalListFor } from '../engine/awards';
import { FORMAT_LABELS } from '../engine/projects';
import { roleLabel } from '../engine/people';
import { applyFix, dailies } from '../engine/directing';
import { isDirecting2 } from '../engine/takes';
import { contentSummary, cutConsequences, placementExplained, watershedRule } from '../engine/script-explain';
import type { AudienceObservation, CapturePart, Credit, Edition, EditionEntry, Format, GameState, Project, ReleaseRecord } from '../engine/types';
import { Check, Modal, NumberField, PageHead, SelectField, TextField, longLocal, plural } from './components';
import { Breadcrumbs } from './Shell';
import { ReleaseCinemas } from './Cinemas';
import { store, useGame } from './store';
import { FollowButton } from './Places';
import { ReadRules, RecordedResults } from './RecordedResults';
import { editScenes } from '../engine/finish';
import { animaticRevisionImpact, reviseAnimatic, reviseEffects, rerecordLines } from '../engine/revisions';
import { forecastFinish } from '../engine/production/forecast';
import { formatDuration } from '../engine/time';
import { deals } from '../engine/finance';
import { countryName } from '../world/gazetteer/gazetteer';
import { EXCLUSIVE_DAYS, dubbingCost, offerConflicts, setReleaseVersion, versionLanguages, versionRefusal } from '../engine/finish';
import { DUBBED_REACH } from '../engine/script-effects';
import { studioFilms } from '../engine/studios';

import { DISTRIBUTOR_FEE, REPORT_MONTHS } from '../engine/distribution';
import { RENTAL_SHARE, TICKET_PRICE, weekMoney } from '../engine/box-office';
import { METRICS, audienceSummary, routeMetrics } from '../engine/audiences';
import { personById } from '../engine/people';
import { VERSION_LABELS, addVersion, removeVersion, versionCredits, versionRuntime } from '../engine/versions';
import { designStatus, designsToReview, type DesignStatus } from '../engine/designs';
import { ScreenTimeCard, SongsCard, VersionSongs } from './WorkViews';
import { shareCheck } from '../engine/screen-time';
import { originalSongs, songProblems } from '../engine/awards-rules';
import { assessedWords } from '../engine/awards-results';
import { songsOf } from '../engine/songs';

// ---------------- Production ----------------

/** Each character's design waits for the producer before it is built (designs.ts, SLATE-11-03.02). */
function DesignsPanel({ p }: { p: Project }) {
  const [err, setErr] = useState<string | null>(null);
  const words: Record<DesignStatus, string> = { designing: 'Being designed', awaiting: 'Ready for your approval', approved: 'Approved: building can start', changes: 'Changes asked for: being redrawn' };
  return (
    <section className="card" aria-labelledby="designs-h">
      <h2 id="designs-h">Designs</h2>
      <p className="dim">Nothing is built until you approve its design. Asking for changes adds a day of visual development that every build waits for, so it costs time and money before anything is made rather than after.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      <ul className="list">{designsToReview(p).map((cid) => {
        const c = p.characters.find((x) => x.id === cid)!;
        const st = designStatus(p, cid);
        return (
          <li key={cid} className="row-wrap">
            <span className="grow"><strong>{c.name}</strong> <span className="dim">· {words[st]}</span></span>
            {st === 'awaiting' && !p.delivered && (
              <div className="row gap-2 wrap">
                <button className="btn btn-sm btn-primary" aria-label={`Approve ${c.name}'s Design`} onClick={() => setErr(store.act(() => approveDesign(p, cid)))}>Approve Design</button>
                <button className="btn btn-sm" aria-label={`Ask For Changes To ${c.name}'s Design`} onClick={() => setErr(store.act(() => askForDesignChanges(p, cid)))}>Ask For Changes</button>
              </div>
            )}
          </li>
        );
      })}</ul>
    </section>
  );
}


/** A performer's credit as an entry form names it: who, and the part, with its stage (parts.ts). */
const performerLabel = (c: Credit): string => `${c.personName} as ${c.characterName}${c.stage ? ` (${c.stage})` : ''}`;
export function ProductionTab({ p }: { p: Project }) {
  const g = useGame();
  const [songErr, setSongErr] = useState<string | null>(null);
  // Songs are made before production as well as during it (songs.ts).
  const songs = <>{songErr && <div className="callout callout-negative" role="alert"><p>{songErr}</p></div>}<SongsCard p={p} onError={setSongErr} /></>;
  if (!p.tasks.length) {
    return (
      <>
        <div className="card">
          <h2>Nothing Scheduled Yet</h2>
          <p>{p.approvedDraft === null ? 'Approve a draft, hire your team and build a schedule to start production.' : 'Build a schedule to turn the breakdown into production work.'}</p>
          <button className="btn" onClick={() => { store.route = { ...store.route, tab: p.approvedDraft === null ? 'script' : 'schedule' }; store.emit(); }}>{p.approvedDraft === null ? 'Open Script' : 'Open Schedule'}</button>
        </div>
        {songs}
      </>
    );
  }
  const depts = [...new Set(p.tasks.map((t) => t.dept))];
  const done = p.tasks.filter((t) => t.status === 'done').length;
  const today = dateKey(g.now, getPlace(p.axes.basePlaceId).zone);
  const notStarted = !!p.schedule.startDate && today < p.schedule.startDate;
  // Every waiting task states its real reason, even before the first working day has run.
  const why = (t: Project['tasks'][number]) => {
    if (t.status === 'done') return '';
    if (notStarted) return `Production starts on ${formatDateKey(p.schedule.startDate!, true)}.`;
    if (t.status === 'waiting') return depsMet(p, t).reason ?? 'Ready for the next working day.';
    return t.blockedReason ?? '';
  };
  const blocked = p.tasks.filter((t) => t.status === 'blocked');
  const puppets = p.assets.filter((a) => a.kind === 'puppet');
  return (
    <>
      <section className="card">
        <h2>Progress</h2>
        <p>{done} of {plural(p.tasks.length, 'task')} finished.</p>
        <ForecastLines p={p} today={notStarted ? p.schedule.startDate! : today} />
        <div className="meter" role="img" aria-label={`${Math.round((done / p.tasks.length) * 100)} percent of tasks finished`}><span style={{ width: `${(done / p.tasks.length) * 100}%` }} /></div>
        {blocked.length > 0 && (
          <div className="callout callout-warning spaced">
            <p><strong>{plural(blocked.length, 'task')} can't move today.</strong></p>
            <ul>{blocked.slice(0, 5).map((t) => <li key={t.id}>{t.label}: {t.blockedReason}</li>)}</ul>
          </div>
        )}
        <p className="dim">Work happens on working days at the production base. Advance or let time pass to see it move.</p>
      </section>
      {designsToReview(p).length > 0 && <DesignsPanel p={p} />}
      {p.changeOrders.length > 0 && (
        <section className="card" aria-labelledby="changes-h">
          <h2 id="changes-h">Design Changes</h2>
          <ul className="list">{[...p.changeOrders].reverse().map((c) => (
            <li key={c.id}>{c.summary} <span className="dim">{longLocal(c.at, getPlace(p.axes.basePlaceId).zone).date}. {c.affectedTasks.length ? `${plural(c.affectedTasks.length, 'task')} sent back: ${c.affectedTasks.map((id) => p.tasks.find((t) => t.id === id)?.label ?? 'work since removed').slice(0, 4).join(', ')}${c.affectedTasks.length > 4 ? ', and more' : ''}.` : 'No work had started on it.'}{c.decision === 'kept-old' ? ' Finished shots kept the old design.' : ''}</span></li>
          ))}</ul>
        </section>
      )}
      {p.tasks.some((t) => t.id === 'anim:animatic:all') && <AnimaticCard p={p} />}
      {songs}
      {p.tasks.some((t) => t.kind === 'anim:mocap') && <MocapPanel p={p} />}
      {puppets.length > 0 && (
        <section className="card">
          <h2>Puppets</h2>
          <ul className="list">{puppets.map((a) => <li key={a.id}><strong>{a.label}</strong> ({plural(a.copies, 'copy', 'copies')}): {puppetStatus(p, a.characterId!)}</li>)}</ul>
        </section>
      )}
      {p.assets.some((a) => a.kind !== 'puppet') && (
        <section className="card">
          <h2>Assets</h2>
          <ul className="list">{p.assets.filter((a) => a.kind !== 'puppet').map((a) => <li key={a.id}>{a.label}: {a.ready ? 'Ready' : a.stage}</li>)}</ul>
        </section>
      )}
      {depts.map((d) => (
        <section key={d} className="card">
          <h2>{d}</h2>
          <ul className="list">
            {p.tasks.filter((t) => t.dept === d).map((t) => (
              <li key={t.id}>
                <div className="row-wrap">
                  <span className="grow">{t.label}</span>
                  <span className={`chip ${t.status === 'done' ? 'chip-positive' : t.status === 'blocked' ? 'chip-negative' : t.status === 'active' ? 'chip-accent' : ''}`}>{{ waiting: 'Waiting', ready: 'Ready', active: 'Underway', done: 'Done', blocked: 'Blocked' }[t.status]}</span>
                </div>
                <div className="meter" style={{ marginTop: 6 }} role="img" aria-label={`${Math.round((t.done / t.units) * 100)} percent done`}><span style={{ width: `${(t.done / t.units) * 100}%` }} /></div>
                <div className="dim">{Math.round(t.done * 10) / 10} of {Math.round(t.units * 10) / 10} {t.unitLabel}{why(t) ? ` · ${why(t)}` : ''}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

/**
 * When the work left finishes at today's pace, what sets it, and any backer's delivery date it runs past (forecast.ts;
 * the owner's v6 package, J06; from November 14, 2026). A rig fault, the render farm's size or the people hired move it.
 */
function ForecastLines({ p, today }: { p: Project; today: string }) {
  const fc = forecastFinish(p, today);
  if (!fc) return null;
  const zone = getPlace(p.axes.basePlaceId).zone;
  const late = deals(p).filter((d) => (d.status === 'accepted' || d.status === 'breached') && d.terms.deliverBy && dateKey(d.terms.deliverBy, zone) < fc.finish);
  return (
    <>
      <p>At today&apos;s pace, the work left finishes around {formatDateKey(fc.finish, true)}, {plural(fc.workingDays, 'working day')} away. It waits first on {fc.chain.slice(0, 3).join(', then ')}.</p>
      {late.map((d) => <p key={d.id} className="callout callout-warning">That is after {formatDateKey(dateKey(d.terms.deliverBy!, zone), true)}, when {d.backer} expects delivery.</p>)}
    </>
  );
}

/** Revising the animatic (revisions.ts; the owner's v6 package, J05): what starts over, and the days lost, before anything is reset. */
function AnimaticCard({ p }: { p: Project }) {
  const g = useGame();
  const [preview, setPreview] = useState<{ names: string[]; days: number; cost: number; from?: string; to?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const a = p.tasks.find((t) => t.id === 'anim:animatic:all')!;
  return (
    <section className="card" aria-labelledby="animatic-h">
      <h2 id="animatic-h">Animatic</h2>
      <p className="dim">{a.status === 'done' ? 'The animatic is cut.' : a.done > 0 ? 'The animatic is being cut.' : 'The animatic hasn\'t been started.'} Revised before animation, the animatic is cut again, with any layouts and backgrounds begun on it. Revised after, the animation and everything built on it start over too. You see what starts over before anything does.</p>
      {a.done > 0 && !p.edit.pictureLocked && (
        <button className="btn" onClick={() => {
          const i = animaticRevisionImpact(p);
          // The finish it moves, read on a copy with the revision applied (forecast.ts); nothing is reset until confirmed.
          const today = dateKey(g.now, getPlace(p.axes.basePlaceId).zone);
          const copy = structuredClone(p);
          reviseAnimatic(copy);
          setPreview({ names: i.reset.map((x) => x.label), days: i.days, cost: i.cost, from: forecastFinish(p, today)?.finish, to: forecastFinish(copy, today)?.finish });
        }}>Revise The Animatic</button>
      )}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      {preview && (
        <Modal title="Revise The Animatic?" onClose={() => setPreview(null)} footer={
          <>
            <button className="btn" onClick={() => setPreview(null)}>Keep The Animatic</button>
            <button className="btn btn-danger" onClick={() => { setErr(store.act((s) => void reviseAnimatic(s.projects.find((x) => x.id === p.id)!))); setPreview(null); }}>Revise It</button>
          </>
        }>
          <p>This work starts over, and the {plural(preview.days, 'day')} already worked on it are lost:</p>
          <ul aria-label="Work That Starts Over">{preview.names.map((n) => <li key={n}>{n}</li>)}</ul>
          {preview.cost > 0 && <p>Doing it again costs about {money(preview.cost)} at your team&apos;s rates.</p>}
          {preview.from && preview.to && <p>{preview.to === preview.from ? `The work left still finishes around ${formatDateKey(preview.from, true)}.` : `The work left then finishes around ${formatDateKey(preview.to, true)}, not ${formatDateKey(preview.from, true)}.`}</p>}
        </Modal>
      )}
    </section>
  );
}

// ---------------- Edit and delivery ----------------

/** Effects revisions and re-recorded lines, before picture lock (revisions.ts, SLATE-15-03.02). */
function AdditionalWorkCard({ p, onError }: { p: Project; onError: (e: string | null) => void }) {
  const g = useGame();
  const vfxScenes = editScenes(p).filter((s) => s.vfx.length && p.tasks.some((x) => x.id === `post:vfx:${s.episode}`));
  const parts = p.cast.filter((a, i) => p.cast.findIndex((b) => b.characterId === a.characterId) === i && editScenes(p).some((s) => s.participants.includes(a.characterId) && s.dialogue.length));
  const state = (id: string) => p.tasks.find((x) => x.id === id)?.status;
  if (!vfxScenes.length && !parts.length) return null;
  return (
    <section className="card" aria-labelledby="additional-h">
      <h2 id="additional-h">Additional Work</h2>
      <p className="dim">Before picture is locked you can send a scene's effects back for a revision, or bring a performer back to re-record a part's lines. Each is paid work that takes days: the effects artist's time, or a dialogue session at the performer's day rate. Once it is done, that scene or performance is a little stronger.</p>
      <ul className="list">
        {vfxScenes.map((s) => {
          const st = state(`post:vfx-rev:${s.id}`);
          return <li key={s.id} className="row-wrap"><span className="grow">{sceneLabel(p, s)} <span className="dim">· effects{st ? ` revision ${st === 'done' ? 'done' : 'underway'}` : ''}</span></span>{!st && <button className="btn btn-sm" aria-label={`Revise The Effects In ${sceneLabel(p, s)}`} onClick={() => onError(store.act(() => reviseEffects(p, s.id)))}>Revise Effects</button>}</li>;
        })}
        {parts.map((a) => {
          const c = p.characters.find((x) => x.id === a.characterId)!;
          const st = state(`post:revoice:${c.id}`);
          return <li key={c.id} className="row-wrap"><span className="grow">{c.name} <span className="dim">· {a.performer === 'player' ? 'you' : personById(g, a.performer).name}{st ? `, re-recording ${st === 'done' ? 'done' : 'booked'}` : ''}</span></span>{!st && <button className="btn btn-sm" aria-label={`Re-Record ${c.name}'s Lines`} onClick={() => onError(store.act((s) => rerecordLines(s, s.projects.find((x) => x.id === p.id)!, c.id)))}>Re-Record Lines</button>}</li>;
        })}
      </ul>
    </section>
  );
}

/** Festival and distribution versions conformed from the locked cut (versions.ts, SLATE-15-05.03). */
function VersionsCard({ p, onError }: { p: Project; onError: (e: string | null) => void }) {
  const g = useGame();
  const [label, setLabel] = useState<string>(VERSION_LABELS[0]);
  const [leaveOut, setLeaveOut] = useState<string[]>([]);
  const scenes = editScenes(p);
  const preview = Math.round(scenes.filter((s) => !leaveOut.includes(s.id)).reduce((a, s) => a + s.estMinutes, 0));
  const main = Math.round(scenes.reduce((a, s) => a + s.estMinutes, 0));
  return (
    <section className="card" aria-labelledby="versions-h">
      <h2 id="versions-h">Versions</h2>
      <p className="dim">Besides the main cut ({main} minutes), the editor can conform a Festival Cut or a Distribution Cut that leaves scenes out: a day of their work that delivery waits for. A version has its own runtime, which festival rules read when it is the one entered, and its own credits, without anyone whose scenes it leaves out.</p>
      {(p.versions ?? []).length > 0 && <ul className="list">{p.versions!.map((v) => (
        <li key={v.id}>
          <div className="row-wrap">
            <span className="grow"><strong>{v.label}</strong> <span className="dim">· {versionRuntime(p, v)} minutes · {plural(versionCredits(g, p, v).length, 'credit')}{p.tasks.find((x) => x.id === `post:version:${v.id}`)?.status === 'done' ? ' · Ready' : ''}</span></span>
            {!p.delivered && <button className="btn btn-sm" aria-label={`Remove The ${v.label}`} onClick={() => onError(store.act(() => removeVersion(p, v.id)))}>Remove</button>}
          </div>
          <VersionSongs p={p} v={v} onError={onError} />
        </li>
      ))}</ul>}
      {p.edit.pictureLocked && !p.delivered && (
        <>
          <SelectField label="Version" value={label} options={VERSION_LABELS.filter((l) => !(p.versions ?? []).some((v) => v.label === l)).map((l) => ({ value: l, label: l }))} onChange={setLabel} />
          <fieldset style={{ border: 0, padding: 0 }}>
            <legend className="small">Scenes It Leaves Out</legend>
            <div className="chip-row">{scenes.map((s) => <Check key={s.id} label={sceneLabel(p, s)} checked={leaveOut.includes(s.id)} onChange={(v) => setLeaveOut(v ? [...leaveOut, s.id] : leaveOut.filter((x) => x !== s.id))} />)}</div>
          </fieldset>
          <p className="dim">This version would run {preview} minutes, and conforming it takes the editor a day after picture lock.{(p.versions ?? []).some((v) => v.label === label) ? ` There is a ${label} already; remove it first to make another.` : ''}</p>
          <button className="btn" disabled={!VERSION_LABELS.some((l) => l === label && !(p.versions ?? []).some((v) => v.label === l))} onClick={() => { const e = store.act((s) => void addVersion(s, p, label, leaveOut)); onError(e); if (!e) setLeaveOut([]); }}>Add Version</button>
        </>
      )}
    </section>
  );
}

/** Contributors who approve how they appear (documentary.ts, SLATE-14-02.02): show them the locked cut, or cut them. */
function ApprovalsCard({ p, onError, onCut }: { p: Project; onError: (e: string | null) => void; onCut: (sceneId: string) => void }) {
  useGame();
  const inCut = editScenes(p);
  const zone = getPlace(p.axes.basePlaceId).zone;
  return (
    <section className="card" aria-labelledby="approvals-h">
      <h2 id="approvals-h">Contributors' Approval</h2>
      <p className="dim">These contributors agreed on condition they approve how they appear. They see the locked cut; unlocking it later means showing them again. If one doesn't approve, cut their scenes to deliver. Each answers {CUT_REVIEW_DAYS} days after you show them the cut.</p>
      <ul className="list">{p.contributors.filter((c) => c.consent === 'given' && c.restrictions?.includes('approval')).map((c) => {
        const theirs = inCut.filter((s) => s.contributorIds.includes(c.id));
        const st = c.cutApproval?.status;
        return (
          <li key={c.id}>
            <div className="row-wrap">
              <span className="grow"><strong>{c.name}</strong> <span className="dim">· {!theirs.length ? 'Not in the cut' : st === 'approved' ? 'Approved the cut' : st === 'refused' ? "Didn't approve the cut" : st === 'shown' ? `Reviewing the cut; answer due ${formatDateKey(dateKey(c.cutApproval!.answerAt, zone))}` : 'Not shown the cut yet'}</span></span>
              {theirs.length > 0 && !st && p.edit.pictureLocked && !p.delivered && <button className="btn btn-sm" aria-label={`Show ${c.name} The Cut`} onClick={() => onError(store.act((s) => showCut(s, s.projects.find((x) => x.id === p.id)!, c.id)))}>Show Them The Cut</button>}
            </div>
            {st === 'refused' && theirs.length > 0 && (
              p.edit.pictureLocked
                ? <p className="dim">Unlock picture to cut their scenes.</p>
                : <ul className="list">{theirs.map((sc) => <li key={sc.id} className="row-wrap"><span className="grow">{sceneLabel(p, sc)}</span><button className="btn btn-sm" aria-label={`Cut ${sceneLabel(p, sc)} From The Edit`} onClick={() => onCut(sc.id)}>Cut It From The Edit</button></li>)}</ul>
            )}
          </li>
        );
      })}</ul>
    </section>
  );
}

/** The takes of each scene, and the one the cut uses (takes.ts, SLATE-12-03). Choosing trades performance against craft. */
const TAKE_ISSUE_WORDS = { performance: 'performance falls short', camera: 'camera problem', sound: 'sound unusable' } as const;

/**
 * The day's material and what to do about it (directing.ts): for each shot scene, what it needs and what was filmed, its
 * takes with any problem, and each issue with the fixes that fit it and what they cost.
 */
function DailiesCard({ p, onError }: { p: Project; onError: (e: string | null) => void }) {
  useGame();
  const ds = dailies(p);
  if (!ds.length) return null;
  return (
    <section className="card" aria-labelledby="dailies-h">
      <h2 id="dailies-h">Dailies</h2>
      <p className="dim">What each scene needs, what was filmed and the takes. Fix what matters to the edit: use another take, replace lines in post, shoot a pickup of just what is missing, or keep it and move on.</p>
      <ul className="list">{ds.map((d) => (
        <li key={d.sceneId} aria-label={`Dailies For ${d.label}`}>
          <strong>{d.label}</strong>
          <div className="dim small">Needs {d.needed.map((n) => n.setup).join(', ')}. Filmed {d.setups.join(', ') || 'nothing yet'}.</div>
          <ul className="list">{d.takes.map((t) => (
            <li key={t.n} className="row-wrap">
              <span className="grow">Take {t.n}: performance {qualityWords(t.perf).toLowerCase()}, technical {qualityWords(t.tech).toLowerCase()}{t.issue ? ` · ${TAKE_ISSUE_WORDS[t.issue]}` : ''}{t.inCut ? ' · In the cut' : ''}</span>
              {!t.inCut && !p.edit.pictureLocked && <button className="btn btn-sm" aria-label={`Use Take ${t.n} Of ${d.label}`} onClick={() => onError(store.act(() => chooseTake(p, d.sceneId, t.n - 1)))}>Use This Take</button>}
            </li>
          ))}</ul>
          {d.issues.map((iss) => (
            <div key={iss.text} className="callout callout-warning spaced">
              <p>{iss.text}</p>
              <ul className="list">{iss.fixes.map((f) => (
                <li key={f.label} className="row-wrap">
                  <button className="btn btn-sm" onClick={() => onError(store.act((s) => void applyFix(s, s.projects.find((x) => x.id === p.id)!, d.sceneId, f)))}>{f.label}</button>
                  {f.detail && <span className="dim small grow">{f.detail}</span>}
                </li>
              ))}</ul>
            </div>
          ))}
          {!d.issues.length && <p className="dim small">Nothing to fix.</p>}
        </li>
      ))}</ul>
      <p className="dim small">Uncommitted money: {money(ledgerTotals(p).available)}. A pickup isn't booked without the money for its day.</p>
    </section>
  );
}

function TakesCard({ p, onError }: { p: Project; onError: (e: string | null) => void }) {
  const scenes = approvedScenes(p).filter((s) => (p.captures.find((c) => c.sceneId === s.id)?.takes?.length ?? 0) > 1);
  return (
    <section className="card" aria-labelledby="takes-h">
      <h2 id="takes-h">Takes</h2>
      <p className="dim">The cut uses each scene's best balanced take. Another may have the stronger performance, or the cleaner camera and sound: the performance side counts toward the performances, the technical side toward the direction. You can change takes until picture is locked.</p>
      <ul className="list">{scenes.map((s) => {
        const c = p.captures.find((x) => x.sceneId === s.id)!;
        return (
          <li key={s.id}>
            <strong>{sceneLabel(p, s)}</strong>
            <ul className="list">{c.takes!.map((t, i) => (
              <li key={i} className="row-wrap">
                <span className="grow">Take {i + 1}: performance {qualityWords(t.perf).toLowerCase()}, technical {qualityWords(t.tech).toLowerCase()}{c.chosenTake === i ? ' · In the cut' : ''}</span>
                {c.chosenTake !== i && !p.edit.pictureLocked && <button className="btn btn-sm" aria-label={`Use Take ${i + 1} Of ${sceneLabel(p, s)}`} onClick={() => onError(store.act(() => chooseTake(p, s.id, i)))}>Use This Take</button>}
              </li>
            ))}</ul>
          </li>
        );
      })}</ul>
    </section>
  );
}

export function EditTab({ p }: { p: Project }) {
  const g = useGame();
  const [err, setErr] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState<string[] | null>(null);
  const [pick, setPick] = useState<string[]>([]);
  const [cutting2, setCutting2] = useState<string | null>(null);
  const gaps = coverageGaps(p);
  const cut = [...cutScenes(p)].map((id) => approvedScenes(p).find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);
  const lb = lockBlockers(p);
  const db = deliveryBlockers(p, g.now);
  const cutting = p.tasks.find((t) => t.kind === 'post:cutpass' && t.status !== 'done');
  return (
    <>
      {err && <div className="callout callout-negative" role="alert"><p>{err}</p></div>}
      <section className="card">
        <h2>Cut</h2>
        <dl className="kv">
          <dt>Assembly</dt><dd>{assemblyComplete(p) ? 'Finished' : 'Not finished yet. It starts when the material for each episode is in.'}</dd>
          <dt>Cut Passes</dt><dd>{p.edit.cutPasses}{cutting ? ` (pass ${p.edit.cutPasses + 1} underway, ${Math.round((cutting.done / cutting.units) * 100)}%)` : ''}</dd>
          <dt>Picture</dt><dd>{p.edit.pictureLocked ? `Locked${p.edit.lockedAt ? ` on ${longLocal(p.edit.lockedAt, getPlace(p.axes.basePlaceId).zone).date}` : ''}` : 'Not locked'}</dd>
        </dl>
        <div className="row gap-2 wrap spaced">
          <button className="btn" disabled={!assemblyComplete(p) || p.edit.pictureLocked || !!cutting} onClick={() => setErr(store.act((s) => void startCutPass(s, p)))}>Start Cut Pass</button>
          {!p.edit.pictureLocked ? (
            <button className="btn btn-primary" disabled={lb.length > 0} onClick={() => setErr(store.act((s) => lockPicture(s, p)))}>Lock Picture</button>
          ) : !p.delivered && <button className="btn" onClick={() => setUnlocking(unlockImpact(p).map((t) => t.label))}>Unlock Picture</button>}
        </div>
        {unlocking && (
          <Modal title="Unlock The Picture?" onClose={() => setUnlocking(null)} footer={<>
            <button className="btn" onClick={() => setUnlocking(null)}>Keep It Locked</button>
            <button className="btn btn-danger" onClick={() => { setErr(store.act((s) => void unlockPicture(s, s.projects.find((x) => x.id === p.id)!))); setUnlocking(null); }}>Unlock It</button>
          </>}>
            {unlocking.length ? <>
              <p>The finishing work done on this cut starts over:</p>
              <ul aria-label="Work That Starts Over">{unlocking.map((n) => <li key={n}>{n}</li>)}</ul>
            </> : <p>No finishing work has started on this cut, so nothing starts over.</p>}
            {p.contributors.some((c) => c.cutApproval && c.cutApproval.status !== 'refused') && <p>Contributors who approved this cut are shown the new one again.</p>}
          </Modal>
        )}
        {!p.edit.pictureLocked && !assemblyComplete(p) && <p className="dim">A cut pass starts once the assembly edit is finished.</p>}
        {!p.edit.pictureLocked && assemblyComplete(p) && <p className="dim">A cut pass takes the editor about {plural(cutPassDays(p), 'day')}. Locking the picture starts the finishing work that waits for it{(() => { const n = p.tasks.filter((t) => t.status !== 'done' && t.dependsOn.some((d) => d.startsWith('milestone:lock'))).length; return n ? ` (${plural(n, 'task')})` : ''; })()}.</p>}
        {!p.edit.pictureLocked && lb.length > 0 && <p className="dim">Before you lock: {lb.join(' ')}</p>}
        {p.edit.versions.length > 0 && (
          <details className="spaced"><summary>Versions</summary><ul>{p.edit.versions.map((v) => <li key={v.number}>Version {v.number}: {v.note}, about {v.runtimeMin} minutes <span className="dim">({longLocal(v.at, getPlace(p.axes.basePlaceId).zone).date})</span></li>)}</ul></details>
        )}
      </section>
      {(assemblyComplete(p) || !!p.delivered) && <ScreenTimeCard p={p} onError={setErr} />}
      {isDirecting2(p) ? <DailiesCard p={p} onError={setErr} /> : p.captures.some((c) => (c.takes?.length ?? 0) > 1) && <TakesCard p={p} onError={setErr} />}
      {!p.delivered && !p.edit.pictureLocked && p.tasks.length > 0 && <AdditionalWorkCard p={p} onError={setErr} />}
      {(p.edit.pictureLocked || (p.versions?.length ?? 0) > 0) && <VersionsCard p={p} onError={setErr} />}
      {p.contributors.some((c) => c.consent === 'given' && c.restrictions?.includes('approval')) && <ApprovalsCard p={p} onError={setErr} onCut={setCutting2} />}
      <section className="card">
        <h2>Coverage</h2>
        {gaps.length ? (
          <>
            <p>Scenes without enough material yet. A scheduled scene is shot on its day; for any other, request a pickup (a shoot day after the main shoot, paid like any other). You can also cut a scene from the edit and accept what that does to the story.</p>
            <ul className="list">{gaps.map((g) => (
              <li key={g.sceneId}>
                {g.scheduled ? <p><strong>{g.label}</strong>: {g.reason}</p> : <Check label={`${g.label}: ${g.reason}`} checked={pick.includes(g.sceneId)} onChange={(v) => setPick(v ? [...pick, g.sceneId] : pick.filter((x) => x !== g.sceneId))} />}
                {!p.edit.pictureLocked && <button className="btn btn-sm" onClick={() => setCutting2(g.sceneId)} aria-label={`Cut ${g.label} From The Edit`}>Cut It From The Edit</button>}
              </li>
            ))}</ul>
            {(() => { const redo = pickupIntegration(p, pick); return redo.length ? <p className="callout callout-warning">New plates restart {redo.map((t) => t.label).join(', ')}: about {plural(Math.ceil(redo.reduce((a, t) => a + t.units, 0)), 'compositor day')} worked again.</p> : null; })()}
            <button className="btn" disabled={!pick.length || p.edit.pictureLocked} onClick={() => { setErr(store.act((s) => void requestPickups(s, p, pick))); setPick([]); }}>Request Pickups</button>
          </>
        ) : <p className="muted">No coverage gaps found.</p>}
        {cut.length > 0 && (
          <div className="spaced">
            <h3>Cut From The Edit</h3>
            <ul className="list">{cut.map((sc) => (
              <li key={sc.id} className="row-wrap">
                <span className="grow"><strong>{sceneLabel(p, sc)}</strong>{sc.essential ? ' · marked essential: the edit carries the gap' : ''}</span>
                {!p.edit.pictureLocked && !p.delivered && <button className="btn btn-sm" onClick={() => setErr(store.act((s) => restoreToEdit(s, p, sc.id)))} aria-label={`Restore ${sceneLabel(p, sc)}`}>Restore It</button>}
              </li>
            ))}</ul>
          </div>
        )}
      </section>
      {cutting2 && (() => {
        const sc = approvedScenes(p).find((x) => x.id === cutting2)!;
        return (
          <Modal title="Cut This Scene From The Edit?" onClose={() => setCutting2(null)} footer={<>
            <button className="btn" onClick={() => setCutting2(null)}>Keep It</button>
            <button className="btn btn-danger" onClick={() => { setErr(store.act((s) => void cutFromEdit(s, s.projects.find((x) => x.id === p.id)!, cutting2))); setCutting2(null); }}>Cut It</button>
          </>}>
            <p><strong>{sceneLabel(p, sc)}</strong> leaves the edit. The script keeps it, and you can restore it until picture lock.</p>
            <ul>{cutConsequences(p, cutting2).map((c) => <li key={c}>{c}</li>)}</ul>
            {p.schedule.days.some((d) => d.status === 'scheduled' && d.sceneIds.includes(cutting2)) && <p className="dim">It comes off its scheduled shoot day; a day left with nothing to shoot is cancelled.</p>}
          </Modal>
        );
      })()}
      {isEpisodic(p.axes.format) && !p.delivered && p.approvedDraft !== null && <EpisodeDelivery p={p} onError={setErr} />}
      <section className="card">
        <h2>Delivery</h2>
        {p.delivered ? <p>Delivered at {p.delivered.runtimeMin} minutes. Spent {money(ledgerTotals(p).settled)}.</p> : (
          <>
            {db.length ? <ul>{db.map((x) => <li key={x}>{x}</li>)}</ul> : <p>Everything is ready to deliver.</p>}
            <button className="btn btn-primary" disabled={db.length > 0} onClick={() => setErr(store.act((s) => deliver(s, p)))}>Deliver Project</button>
            <p className="dim">Delivery locks the script, finalizes credits and releases anyone still under contract.</p>
          </>
        )}
      </section>
    </>
  );
}

/**
 * A series cut, locked and delivered an episode at a time (episode-delivery.ts): what each episode has done, what is
 * holding it back, and the next step for it. The season is still delivered whole below.
 */
function EpisodeDelivery({ p, onError }: { p: Project; onError: (e: string | null) => void }) {
  const zone = getPlace(p.axes.basePlaceId).zone;
  return (
    <section className="card" aria-labelledby="by-episode-h">
      <h2 id="by-episode-h">Delivering Episode By Episode</h2>
      <p className="dim">A finished episode can be delivered and come out while later ones are still being made. It needs its own assembly, a cut pass, a locked picture, then its sound, music, color and any songs it uses. Work the whole season shares holds back only the episodes that use it.</p>
      <ul className="list">
        {p.episodes.map((e) => {
          const n = e.number;
          const done = p.episodeDeliveries?.[n];
          const locked = episodeLocked(p, n);
          const lockWhy = episodeLockBlockers(p, n);
          const why = episodeDeliveryBlockers(p, n);
          const assembled = p.tasks.find((t) => t.id === `post:assembly:${n}`)?.status === 'done';
          const cutting = p.tasks.some((t) => t.kind.startsWith('post:cutpass') && t.status !== 'done' && (t.kind === 'post:cutpass' || t.episode === n));
          return (
            <li key={n} aria-label={`Episode ${n}`}>
              <div className="row-wrap">
                <span className="grow"><strong>{e.title === `Episode ${n}` ? e.title : `Episode ${n}. ${e.title}`}</strong> <span className="chip">{done ? 'Delivered' : !why.length ? 'Ready To Deliver' : locked ? 'Picture Locked' : 'In Production'}</span></span>
                {!done && !locked && assembled && <button className="btn btn-sm" disabled={cutting} onClick={() => onError(store.act((s) => void startEpisodeCutPass(s, s.projects.find((x) => x.id === p.id)!, n)))}>Cut Pass On Episode {n}</button>}
                {!done && !locked && <button className="btn btn-sm" disabled={lockWhy.length > 0} onClick={() => onError(store.act((s) => lockEpisode(s, s.projects.find((x) => x.id === p.id)!, n)))}>Lock Episode {n}</button>}
                {!done && <button className="btn btn-sm btn-primary" disabled={why.length > 0} onClick={() => onError(store.act((s) => deliverEpisode(s, s.projects.find((x) => x.id === p.id)!, n)))}>Deliver Episode {n}</button>}
              </div>
              {done ? <p className="dim">Delivered {longLocal(done.at, zone).date}, at {done.runtimeMin} minutes. Its script and picture are final.</p>
                : <p className="dim">{locked ? 'Held back by: ' : 'Before it can be locked: '}{(locked ? why : lockWhy).join(' ') || 'nothing.'}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------- Release ----------------

export function ReleaseTab({ p }: { p: Project }) {
  const g = useGame();
  const place = getPlace(p.axes.basePlaceId);
  const today = dateKey(g.now, place.zone);
  const [route, setRoute] = useState<ReleaseRecord['route']>('digital');
  const [cut, setCut] = useState('');
  const [date, setDate] = useState(addDaysToKey(today, 30));
  const [terr, setTerr] = useState(place.country);
  const [err, setErr] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  // A series' episode dates: a preset until you change one, then your own (episode-releases.ts).
  const [pattern, setPattern] = useState<'all' | 'weekly' | 'daily' | 'premiere-weekly'>('weekly');
  const [onPremiere, setOnPremiere] = useState(2);
  const [own, setOwn] = useState<string[] | null>(null);
  const [editing, setEditing] = useState<{ id: string; dates: string[] } | null>(null);
  const [effects, setEffects] = useState<string[] | null>(null);
  const someEpisodes = Object.keys(p.episodeDeliveries ?? {}).length > 0;
  if (!p.delivered && !someEpisodes) return <div className="card"><h2>Not Delivered Yet</h2><p>{isEpisodic(p.axes.format) ? 'Release plans become available once an episode is delivered (on the Edit tab), and credits once the whole season is.' : 'Credits and release plans become available once the project is delivered.'}</p></div>;
  const episodic = isEpisodic(p.axes.format);
  const scheduled = episodic && EPISODE_ROUTES.includes(route);
  const count = Math.max(1, p.axes.episodeCount);
  const planned = own ? [date, ...own.slice(1)] : presetDates(pattern, date, count, onPremiere);
  const review = () => { try { setEffects(scheduleChangeEffects(g, p, editing!.id, editing!.dates)); setErr(null); } catch (e) { setErr((e as Error).message); } };
  const open = p.offers.filter((o) => o.status === 'open' && o.expiresAt > g.now);
  return (
    <>
      {err && <div className="callout callout-negative" role="alert"><p>{err}</p></div>}
      {p.delivered ? <section className="card">
        <h2>Credits</h2>
        {p.producedBy && <p><strong>A {p.producedBy} Production.</strong></p>}
        {creditLine(p) && <p>{creditLine(p)}</p>}
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Credit</th><th>Name</th><th>Details</th></tr></thead>
            <tbody>
              {p.credits.map((c) => (
                <tr key={c.id}>
                  <td data-label="Credit">{c.contribution}</td>
                  <td data-label="Name">{c.person === 'player' ? <strong>{g.character.portrait && <img className="headshot headshot-sm" src={g.character.portrait} alt="" />}{c.personName}</strong> : c.personName}</td>
                  <td data-label="Details">{c.characterName ? `as ${c.characterName}${c.stage ? ` (${c.stage})` : ''}` : ''}{episodic && c.episodes !== 'all' ? `${c.characterName ? ', ' : ''}Episodes ${c.episodes.join(', ')}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section> : <p className="callout">Episodes {Object.keys(p.episodeDeliveries ?? {}).join(', ')} {Object.keys(p.episodeDeliveries ?? {}).length === 1 ? 'is' : 'are'} delivered. Credits are settled when the whole season is delivered, on the Edit tab.</p>}
      <ReleasePlanCard p={p} />
      <section className="card">
        <h2>Distribution Offers</h2>
        <p className="muted">Declared content: {contentSummary(p)}. This is your declaration, not a rating: before release a classification body rates the film where the territory requires one.</p>
        {open.length ? (
          <ul className="list">
            {open.map((o) => {
              const needs = offerNeeds(p, o);
              const subs = subtitlingCost(p, o.territories);
              return (
                <li key={o.id}>
                  <div className="row-wrap">
                    <span className="grow"><strong>{o.distributor}</strong>{o.exclusive ? <> <span className="chip">Exclusive</span></> : null}: {o.route === 'digital' ? 'Digital' : ROUTE_LABELS[o.route]} release in {o.territories.length > 6 ? `${o.territories.length} territories (${o.territories.slice(0, 3).map(countryName).join(', ')} and others)` : o.territories.map(countryName).join(', ')} for a minimum guarantee of {money(o.minimumGuarantee)}{o.slot === 'late' ? ' in a late-evening slot' : ''}, releasing about {o.releaseWindowDays} days after you accept. The contract requires delivery materials, about {money(offerMaterials(p, o))}{subs ? `, including ${money(subs)} of subtitles for languages the dialogue isn't in` : ''}, held from your budget until release.<span className="dim"> Distributors in this game are fictional.</span></span>
                    <div className="row gap-2 wrap">
                      <button className="btn btn-sm btn-primary" disabled={!!needs} onClick={() => setErr(store.act((s) => void acceptDistribution(s, p, o.id)))}>{o.slot === 'late' ? 'Accept The Late Slot' : 'Accept Offer'}</button>
                      {o.slot === 'late' && <button className="btn btn-sm" disabled={!!needs} onClick={() => setErr(store.act((s) => void acceptDistribution(s, p, o.id, { broadcastEdit: true })))}>Accept With A Broadcast Edit</button>}
                      <button className="btn btn-sm" onClick={() => setErr(store.act(() => declineDistribution(p, o.id)))}>Decline Offer</button>
                    </div>
                  </div>
                  {o.slot === 'late' && <p className="dim">You declared strong content. {watershedRule(o.territories[0])} The late slot pays {money(o.minimumGuarantee)}. A broadcast edit, cut for an earlier slot, costs about {money(BROADCAST_EDIT_COST)} more in delivery materials and earns the full {money(o.editedGuarantee ?? o.minimumGuarantee)}.</p>}
                  {needs && <p className="dim" style={{ color: 'var(--warning)' }}>{needs}</p>}
                  {(() => { const ends = offerConflicts(p, o); return ends.length ? <p className="dim">Accepting it ends {ends.map((x) => `${x.distributor}'s ${ROUTE_LABELS[x.route].toLowerCase()} offer`).join(' and ')}{o.exclusive ? ': its rights are exclusive there' : ': they cover the same territories'}.</p> : null; })()}
                  {o.laterWindow && <p className="dim">A later window: it covers only territories and routes your earlier deals don't hold.</p>}
                  {o.proposalId && <p className="dim">From your Release Plan: {o.distributor} answered your licence proposal with this offer.{o.agentShare ? ` ${Math.round(o.agentShare * 100)}% of the guarantee goes to the sales agent who sent it.` : ''}</p>}
                  {o.exclusive && <p className="dim">Exclusive for {EXCLUSIVE_DAYS} days from its release: no other deal in its territories until then.</p>}
                </li>
              );
            })}
          </ul>
        ) : <p className="muted">No open offers. Festival selections can bring interest. You can always release it yourself.</p>}
      </section>
      {p.offers.some((o) => o.status === 'accepted') && (
        <section className="card" aria-labelledby="earnings-h">
          <h2 id="earnings-h">Earnings</h2>
          {(() => {
            // From November 14, 2026 (the owner's v6 package, 05 voice): said only when it is so, with the amounts from the deals.
            const earned = p.offers.filter((o) => o.status === 'accepted').reduce((a, o) => a + o.minimumGuarantee + (o.reported?.overagePaid ?? 0), 0);
            const owing = deals(p).filter((d) => (d.status === 'accepted' || d.status === 'breached') && d.terms.recoup > d.repaid);
            const left = owing.reduce((a, d) => a + d.terms.recoup - d.repaid, 0);
            return earned > 0 && left > 0 ? <p>Your {isEpisodic(p.axes.format) ? 'series' : 'film'} earned revenue, but the proceeds are still repaying its backers: {money(left)} is still owed to {owing.map((d) => d.backer).join(' and ')} before the rest reaches you.</p> : null;
          })()}
          <p className="dim">What each distributor reports is not what you receive. Their fee comes off what they report first, and what is left repays the guarantee they already paid you. Only what they report beyond that reaches you, as an overage. They report monthly for {REPORT_MONTHS} months after release.</p>
          <ul className="list">{p.offers.filter((o) => o.status === 'accepted').map((o) => (
            <li key={o.id}>
              <strong>{o.distributor}</strong> <span className="dim">· {ROUTE_LABELS[o.route]}</span>
              <dl className="kv">
                <dt>Reported Earnings</dt><dd>{money(o.reported?.gross ?? 0)}</dd>
                <dt>After Their Fee</dt><dd>{money(o.reported?.net ?? 0)}</dd>
                <dt>Guarantee Recouped</dt><dd>{money(Math.min(o.reported?.net ?? 0, o.minimumGuarantee))} of {money(o.minimumGuarantee)}</dd>
                <dt>Received By You</dt><dd>{money(o.minimumGuarantee + (o.reported?.overagePaid ?? 0))}</dd>
              </dl>
              {o.weeks?.length ? <WeeksInCinemas o={o} /> : null}
              {o.audience?.length ? <WeeklyAudience o={o} /> : routeMetrics(o.route).length ? <p className="dim">No audience figures are available for this reporting period. They come the day each week on {o.distributor} ends.</p> : null}
            </li>
          ))}</ul>
        </section>
      )}
      <section className="card">
        <h2>Plan A Release</h2>
        <div className="grid grid-3 form">
          <SelectField label="Route" value={route} options={(['digital', 'streaming', 'theatrical', 'broadcast'] as const).map((r) => ({ value: r, label: ROUTE_LABELS[r] }))} onChange={setRoute} />
          <TextField label="Release Date" type="date" value={date} onChange={(v) => { setDate(v); setOwn(null); }} />
          <TextField label="Territory Code" value={terr} maxLength={2} hint="Two-letter country code, such as US or GB." onChange={(v) => setTerr(v.toUpperCase())} />
          {(p.versions ?? []).length > 0 && <SelectField label="Which Cut" hint="Each cut's songs must be licensed for this release." value={cut} options={[{ value: '', label: 'The Main Cut' }, ...(p.versions ?? []).map((v) => ({ value: v.id, label: `The ${v.label}` }))]} onChange={setCut} />}
        </div>
        {scheduled && (
          <fieldset className="form" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="small" style={{ padding: 0 }}>Episode Dates</legend>
            <div className="grid grid-3 form">
              <SelectField label="Episode Schedule" value={pattern} options={(['all', 'weekly', 'daily', 'premiere-weekly'] as const).map((x) => ({ value: x, label: PATTERN_LABELS[x] }))} onChange={(v) => { setPattern(v); setOwn(null); }} />
              {pattern === 'premiere-weekly' && <NumberField label="Episodes On The Premiere" value={onPremiere} min={1} max={count} onChange={(v) => { setOnPremiere(v); setOwn(null); }} />}
            </div>
            <p className="dim">Episode 1 comes out on the release date. Change any other date for a break or a split season{own ? '; these are now dates of your own' : ''}. Award rules read when each episode comes out.</p>
            <div className="grid grid-3 form">
              {planned.slice(1).map((d, i) => <TextField key={i} label={`Episode ${i + 2}`} type="date" value={d} onChange={(v) => { const next = [...planned]; next[i + 1] = v; setOwn(next); }} />)}
            </div>
            {orderNotes(planned).map((n) => <p key={n} className="dim">{n}</p>)}
            {!p.delivered && <p className="dim">Episodes not delivered by their day are held back, and you choose a new day for them. Delivered so far: {Object.keys(p.episodeDeliveries ?? {}).map((k) => `episode ${k}`).join(', ')}.</p>}
          </fieldset>
        )}
        <p className="dim">Theatrical and broadcast releases need a distributor or broadcaster. Release choices affect premiere status for festivals.</p>
        <button className="btn btn-primary" onClick={() => setErr(store.act((s) => void planRelease(s, p, { route, date, territories: [terr], ...(cut ? { cut } : {}), ...(scheduled ? (own ? { episodeDates: planned } : { pattern, onPremiere }) : {}) })))}>Plan Release</button>
      </section>
      <section className="card">
        <h2>Release History</h2>
        {p.premiere && <p>Premiered {formatDateKey(p.premiere.date)} at {p.premiere.venue}.</p>}
        {p.releases.length ? <ul className="list">{p.releases.map((r) => (
          <li key={r.id}>
            <div className="row-wrap"><span className="grow">{ROUTE_LABELS[r.route]}{r.cut ? ` of the ${p.versions?.find((v) => v.id === r.cut)?.label ?? 'version'}` : ''} in {r.territories.join(', ')} on {formatDateKey(r.date)}{r.distributor ? ` with ${r.distributor}` : ''}{r.note ? <span className="dim"> {r.note}</span> : null} <span className="chip">{{ released: 'Released', planned: 'Planned', cancelled: 'Cancelled' }[r.status]}</span></span>{r.status === 'planned' && !p.offers.find((o) => o.id === r.offerId)?.studioDeal && <button className="btn btn-sm btn-danger" onClick={() => setCancelling(r.id)}>Cancel Release</button>}</div>
            <ReleaseVersion p={p} r={r} />
            <ReleaseCinemas p={p} r={r} />
            {r.episodes?.length ? (
              <details className="small">
                <summary>Episode Dates: {r.pattern === 'assumed' ? 'Assumed From An Older Save' : r.pattern ? PATTERN_LABELS[r.pattern] : 'Dates Of My Own'}</summary>
                {r.pattern === 'assumed' && <p className="dim">This save was made before episode dates were kept. These are the dates the game assumed then ({r.route === 'broadcast' ? 'weekly on television' : 'all at once online'}), not dates recorded at the time.</p>}
                <ul>{r.episodes.map((e) => <li key={e.id} className="dim">Episode {e.number}: {formatDateKey(e.date)}, {r.status === 'cancelled' ? 'cancelled' : e.status === 'released' ? 'out' : e.held ? 'held back: it wasn\'t delivered in time. Choose a new day for it' : 'to come'}{e.assumed ? ' (assumed date)' : ''}</li>)}</ul>
                {orderNotes(r.episodes.map((e) => e.date)).map((n) => <p key={n} className="dim">{n.replace(' would come out ', ' comes out ')}</p>)}
                {r.status !== 'cancelled' && r.episodes.some((e) => e.status === 'planned') && editing?.id !== r.id && <button className="btn btn-sm" onClick={() => { setEditing({ id: r.id, dates: r.episodes!.map((e) => e.date) }); setEffects(null); }}>Change Episode Dates</button>}
                {editing?.id === r.id && (
                  <div className="form">
                    <p className="dim">Episodes already out keep their dates. Moving one changes the calendar, and may change which year's awards it counts for: you'll see what changes before anything does.</p>
                    <div className="grid grid-3 form">
                      {r.episodes.map((e, i) => e.status === 'released' ? null : <TextField key={e.id} label={`New Date For Episode ${e.number}`} type="date" value={editing.dates[i]} onChange={(v) => setEditing({ id: r.id, dates: editing.dates.map((x, j) => (j === i ? v : x)) })} />)}
                    </div>
                    <div className="row gap-2 wrap">
                      <button className="btn btn-sm btn-primary" onClick={review}>Review The Change</button>
                      <button className="btn btn-sm" onClick={() => { setEditing(null); setEffects(null); }}>Keep The Dates</button>
                    </div>
                  </div>
                )}
              </details>
            ) : null}
          </li>
        ))}</ul> : <p className="muted">No releases yet.</p>}
        {p.quality && <p className="dim">Reception in this game: {qualityWords(p.quality.reception)}.</p>}
      </section>
      {editing && effects && (
        <Modal title="Change These Episode Dates?" onClose={() => setEffects(null)} footer={
          <>
            <button className="btn" onClick={() => setEffects(null)}>Go Back</button>
            <button className="btn btn-primary" onClick={() => { const e = store.act((s) => void setEpisodeDates(s, s.projects.find((x) => x.id === p.id)!, editing.id, editing.dates)); setErr(e); setEffects(null); if (!e) setEditing(null); }}>Confirm The New Dates</button>
          </>
        }>
          <ul>{effects.map((l) => <li key={l}>{l}</li>)}</ul>
        </Modal>
      )}
      {cancelling && (
        <Modal title="Cancel This Release?" onClose={() => setCancelling(null)} footer={
          <>
            <button className="btn" onClick={() => setCancelling(null)}>Keep The Release</button>
            <button className="btn btn-danger" onClick={() => { setErr(store.act((s) => cancelRelease(s, s.projects.find((x) => x.id === p.id)!, cancelling))); setCancelling(null); }}>Cancel Release</button>
          </>
        }>
          <p>{releaseCancelTerms(p, cancelling)}</p>
        </Modal>
      )}
    </>
  );
}

// ---------------- Festivals and awards (project view) ----------------

export function FestivalsTab({ p }: { p: Project }) {
  const g = useGame();
  const zone = getPlace(g.locationId).zone;
  const relevant = g.editions.filter((e) => e.deadline > g.now && e.submissionOpens < g.now + 400 * 86400000).slice(0, 60);
  const entries = g.editions.flatMap((e) => e.entries.filter((x) => x.projectId === p.id).map((x) => ({ e, x })));
  const [show, setShow] = useState<'all' | 'open' | 'festival' | 'award'>('all');
  return (
    <>
      <section className="card">
        <h2>Your Entries</h2>
        {entries.length ? (
          <ul className="list">
            {entries.map(({ e, x }) => {
              const cat = institution(e.institutionId).categories.find((c) => c.id === x.categoryId)!;
              return (
                <li key={x.id} className="row-wrap">
                  <span className="grow"><strong><button className="link" onClick={() => store.go({ view: 'event', editionId: e.id, projectId: p.id })}>{e.label}</button></strong>: {cat.name}{entryVersion(p, x.versionId)}{entryEpisode(p, x.episode)}{entrySong(p, x)} <span className="chip">{entryStatus(x, e)}</span>{x.via === 'selection' ? <span className="dim"> Considered from its selection; no entry or fee.</span> : null}{x.reason ? <span className="dim"> {x.reason}</span> : null}</span>
                </li>
              );
            })}
          </ul>
        ) : <p className="muted">No entries yet.</p>}
      </section>
      <section className="card">
        <h2>Open And Upcoming</h2>
        {!p.delivered && <p className="muted">Deliver the project to enter it. You can still see what it could qualify for.</p>}
        <div className="grid grid-2 form">
          <SelectField label="Show" value={show} options={[{ value: 'all', label: 'Every Event' }, { value: 'open', label: 'Open To This Project' }, { value: 'festival', label: 'Festivals' }, { value: 'award', label: 'Awards' }]} onChange={setShow} />
        </div>
        <ul className="list">
          {relevant.map((e) => {
            const inst = institution(e.institutionId);
            if ((show === 'festival' || show === 'award') && inst.kind !== show) return null;
            // Prizes and honorary awards aren't entered: a festival's prizes come with selection for a section.
            const fits = categoriesFor(inst, e.year).filter((c) => enterable(c) && c.formats.includes(p.axes.format));
            if (!fits.length) return null;
            const elig = fits.map((c) => ({ c, r: checkEligibility(g, p, e, c) }));
            const ok = elig.filter((x) => x.r.eligible);
            if (show === 'open' && !ok.length) return null;
            return (
              <li key={e.id}>
                <div className="row-wrap">
                  <span className="grow"><strong><button className="link" onClick={() => store.go({ view: 'event', editionId: e.id, projectId: p.id })}>{e.label}</button></strong><span className="dim"> · Entries close {formatDateKey(dateKey(e.deadline, zone))}</span></span>
                  <span className={`chip ${ok.length ? 'chip-positive' : ''}`}>{ok.length ? `${plural(ok.length, 'Category', 'Categories')} Open To You` : 'Not Eligible Now'}</span>
                </div>
                {!ok.length && <div className="dim">{elig[0].r.reasons[0]}</div>}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

/**
 * An entry's status in the player's words. A selection for a section whose prizes are still to be decided is In
 * Competition; once results are in it stays Selected, and each prize says Winner, Special Mention or Did Not Win.
 */
function entryStatus(x: EditionEntry, ed: Edition): string {
  if (x.status === 'selected') {
    const prizes = institution(ed.institutionId).categories.some((c) => c.parents?.includes(x.categoryId));
    return prizes && ed.status !== 'complete' ? 'In Competition' : 'Selected';
  }
  return ({ submitted: 'Submitted', 'needs-correction': 'Needs Correction', rejected: 'Not Accepted', withdrawn: 'Withdrawn', disqualified: 'Disqualified', accepted: 'Accepted For Consideration', 'not-selected': 'Not Selected', nominated: 'Nominated', 'not-nominated': 'Not Nominated', won: 'Winner', lost: 'Did Not Win', mention: 'Special Mention' } as Record<string, string>)[x.status] ?? x.status;
}

const KIND_WORDS: Partial<Record<NonNullable<Category['kind']>, string>> = { section: 'Section', prize: 'Prize', audience: 'Audience Award', partner: 'Partner Award', honorary: 'Honorary', juried: 'Juried Award', area: 'Area Award' };

const RECIPIENT_WORDS: Record<Category['recipient'], string> = {
  project: 'the credited producers', producer: 'the credited producers', director: 'the credited director', writer: 'the credited writers',
  lead: 'a credited leading performance', supporting: 'a credited supporting performance', guest: 'a credited guest performance', performer: 'a credited leading or supporting performance',
  voice: 'a credited voice performance', ensemble: 'the credited cast', host: 'the credited host', narrator: 'the credited narrator', craft: '', song: 'the writers of one original song written for the work',
  national: "the director, once the production country's committee puts the film forward", career: 'a career, chosen by the organizer',
};

/** Who receives an award, in the player's words: only people credited for that contribution. */
export function recipientWords(c: Category): string {
  const one = (r: Category['recipient']) => (r === 'craft' ? `the credited ${(c.crafts ?? []).map((x) => roleLabel(x).toLowerCase()).join(' or ')}` : RECIPIENT_WORDS[r]);
  const who = [c.recipient, ...(c.with ?? [])].map(one).join(' and ');
  const billed = c.actingTitle ? `, billed as ${c.actingTitle.toLowerCase()}` : '';
  const first = c.need?.includes('breakthrough') ? ' in a first credited role' : '';
  return `${who}${billed}${first}`;
}

/** What an edition shows for a category: its selection or nominees, and the winners or honoree once known. */
function ResultLine({ g, ed, c }: { g: GameState; ed: Edition; c: Category }) {
  const res = publicResult(g, ed, c);
  if (!res) return null;
  const festival = institution(ed.institutionId).kind === 'festival' || c.kind === 'section';
  const list = (xs: string[]) => `${xs.slice(0, 8).join(', ')}${xs.length > 8 ? ', and others' : ''}`;
  return (
    <div className="dim">
      {res.honoree === 'player' ? 'Honorary: you, for your body of work. ' : res.honoree ? `Given to ${res.honoree}. ` : ''}
      {res.winners.length === 1 ? `Winner: ${res.winners[0]}. ` : res.winners.length > 1 ? `Winners: ${res.winners.join(' and ')}. ` : res.none ? 'No award was given this year. ' : ''}
      {res.field.length > 0 && `${festival ? 'Selected' : 'Nominees'}: ${list(res.field)}.`}
      {res.about.length > 0 && <details className="small"><summary>About The Other Works</summary><ul>{res.about.map((a) => <li key={a}>{a}.</li>)}</ul></details>}
    </div>
  );
}

// ---------------- Event detail ----------------

export function EventDetail() {
  const g = useGame();
  const ed = edition(g, store.route.editionId!);
  const inst = institution(ed.institutionId);
  const place = getPlace(inst.placeId);
  const myZone = getPlace(g.locationId).zone;
  const [preparing, setPreparing] = useState<{ projectId: string; cat: Category } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const startL = longLocal(ed.start, place.zone);
  const endL = longLocal(ed.end, place.zone);
  const dlOrg = longLocal(ed.deadline, place.zone);
  const dlMine = longLocal(ed.deadline, myZone);
  return (
    <>
      <Breadcrumbs items={[{ label: 'Calendar', route: { view: 'calendar' } }, { label: ed.label }]} />
      <PageHead eyebrow="Your Day" title={ed.label} lede={inst.description} />
      <div className="row gap-2 wrap" style={{ marginBottom: 'var(--s4)' }}><FollowButton id={inst.id} /></div>
      {err && <div className="callout callout-negative" role="alert"><p>{err}</p></div>}
      <div className="card-grid">
        <section className="card">
          <h2>When And Where</h2>
          <dl className="kv">
            <dt>Where</dt><dd>{placeLabel(place)}</dd>
            <dt>{inst.kind === 'festival' ? 'Dates' : 'Ceremony'}</dt><dd>{inst.kind === 'festival' ? `${startL.date} to ${endL.date}` : `${startL.weekday}, ${startL.date}, ${startL.time} local time`}</dd>
            <dt>Entries Close</dt><dd>{dlOrg.date}, {dlOrg.time} local time ({dlMine.weekday} {dlMine.time} your time)</dd>
            {inst.kind === 'award' && <><dt>Eligibility Period</dt><dd>{formatDateKey(ed.eligibility.from)} to {formatDateKey(ed.eligibility.to)}</dd></>}
            <dt>Status</dt><dd>{{ upcoming: 'Entries Not Open Yet', open: 'Open For Entries', closed: 'Entries Closed', judging: 'Judging', announced: inst.kind === 'festival' ? 'Selection Announced' : 'Nominations Announced', complete: 'Finished' }[ed.status]}</dd>
          </dl>
          <p className="dim">{ed.provenance === 'official' ? `These dates were announced by the organizer.${ed.deadlinePlanned ? ' The entry deadline is a planning date.' : ''}` : "Dates haven't been announced. Planning dates are shown."} {rulebook(ed.rulesId) ? `${inst.kind === 'festival' ? 'Sections' : 'Categories'} marked Official Rules follow the organizer's rules for this edition; Projected Rules carry last year's forward until this year's are published. Everything else is simulated.` : 'Rules in this game are simulated.'}</p>
        </section>
        <RecordedResults ed={ed} today={dateKey(g.now, myZone)} />
        <ReadRules ed={ed} projects={g.projects} />
        {(ed.screenings ?? []).length > 0 && <ScreeningsPanel editionId={ed.id} />}
        <CategoryBrowser ed={ed} onPrepare={(projectId, cat) => setPreparing({ projectId, cat })} />
        <section className="card">
          <h2>Your Entries</h2>
          {ed.entries.length ? (
            <ul className="list">
              {ed.entries.map((x) => {
                const p = g.projects.find((pp) => pp.id === x.projectId);
                const cat = inst.categories.find((c) => c.id === x.categoryId);
                return (
                  <li key={x.id} className="row-wrap">
                    <span className="grow">{p?.title}: {cat?.name}{p ? entryVersion(p, x.versionId) + entryEpisode(p, x.episode) + entrySong(p, x) : ''} <span className="chip">{entryStatus(x, ed)}</span>{x.via === 'selection' ? <div className="dim">Considered from its selection; no entry or fee.</div> : null}{x.reason ? <div className="dim">{x.reason}</div> : null}{x.revises ? <div className="dim">Entered again after the earlier entry was withdrawn; that one stays withdrawn.</div> : null}{x.snapshot && p ? <EntryAsEntered x={x} p={p} /> : null}</span>
                    {['submitted', 'accepted'].includes(x.status) && <button className="btn btn-sm" onClick={() => setErr(store.act((s) => withdrawEntry(s, ed.id, x.id)))}>Withdraw Entry</button>}
                  </li>
                );
              })}
            </ul>
          ) : <p className="muted">You haven't entered anything here.</p>}
          {(ed.entries.some((x) => x.status === 'selected' || x.status === 'nominated')) && ed.start > g.now && (
            <button className="btn spaced" onClick={() => setErr(store.act((s) => {
              if (s.plans.some((pl) => pl.title === `Attend ${ed.label}` && pl.status === 'upcoming')) throw new Error("You've already planned to attend.");
              // Until November 9, 2026 this plan was pushed by hand: its day-before reminder was never scheduled.
              const projectId = ed.entries.find((x) => x.status === 'selected' || x.status === 'nominated')!.projectId;
              addPlan(s, { title: `Attend ${ed.label}`, start: ed.start, durationMin: 180, remindMin: 1440, placeId: inst.placeId, projectId });
            }))}>Plan To Attend</button>
          )}
          <p className="dim">Attending is optional. Results don't depend on it.</p>
        </section>
      </div>
      {preparing && <SubmissionDialog editionId={ed.id} cat={preparing.cat} initialProject={preparing.projectId} onClose={() => setPreparing(null)} onError={setErr} />}
    </>
  );
}

type Show = 'all' | 'taking' | 'open' | 'entered' | 'decided';

/**
 * An edition's sections or categories, grouped under the organizer's headings, with filters for the large rosters (the
 * Emmys hold over a hundred): by project, format, eligibility, deadline and what you entered. Prizes and honorary awards
 * are shown, but only categories that take entries can be entered.
 */
function CategoryBrowser({ ed, onPrepare }: { ed: Edition; onPrepare: (projectId: string, cat: Category) => void }) {
  const g = useGame();
  const inst = institution(ed.institutionId);
  const place = getPlace(inst.placeId);
  const delivered = g.projects.filter((p) => p.delivered);
  // Opened from a project's Festivals And Awards tab: that project is checked against every category, and every
  // heading is open (a large roster otherwise starts with its headings closed).
  const [projectId, setProjectId] = useState(delivered.some((x) => x.id === store.route.projectId) ? store.route.projectId! : '');
  const [format, setFormat] = useState('');
  const [show, setShow] = useState<Show>('all');
  const [query, setQuery] = useState('');
  const p = delivered.find((x) => x.id === projectId);
  const all = categoriesFor(inst, ed.year);
  const formats = [...new Set(all.flatMap((c) => c.formats))];
  const word = inst.kind === 'festival' ? 'Sections' : 'Categories';
  // Only while a category still takes entries: after its deadline, "it's too late" would be all it says.
  const elig = (c: Category) => (p && enterable(c) && categoryDeadline(ed, c, p) > g.now ? checkEligibility(g, p, ed, c) : null);
  const hasPrizes = (c: Category) => inst.categories.some((x) => x.parents?.includes(c.id));
  const shown = all.filter((c) => {
    if (format && !c.formats.includes(format as Format)) return false;
    if (query && !c.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (show === 'taking') return enterable(c) && categoryDeadline(ed, c, p) > g.now;
    if (show === 'open') return !!elig(c)?.eligible;
    if (show === 'entered') return ed.entries.some((x) => x.categoryId === c.id) || !!ed.results[c.id]?.honoree;
    if (show === 'decided') return !enterable(c);
    return true;
  });
  const groups = [...new Set(shown.map((c) => c.section ?? word))];
  const filtering = !!(format || query || show !== 'all' || projectId);
  return (
    <section className="card card-wide" aria-labelledby="categories-h">
      <h2 id="categories-h">{word}</h2>
      {(ed.status === 'announced' || ed.status === 'complete') && <p>Simulated results from {formatDateKey(dateKey(ed.announce, getPlace(inst.placeId).zone))}: the game decides them among the work it follows. They are not the recorded results, which are shown apart where there are any.</p>}
      <p className="dim">{all.length} {all.length === 1 ? (inst.kind === 'festival' ? 'section or award' : 'category') : (inst.kind === 'festival' ? 'sections and awards' : 'categories')} this edition. {inst.kind === 'festival' ? 'Sections select work; selection is not a win. Prizes are decided among the films selected for their sections, and honorary awards are chosen by the organizer: neither takes an entry.' : 'Honorary awards are chosen by the organizer and take no entries.'}</p>
      <div className="grid grid-2 form">
        <SelectField label="Project" value={projectId} options={[{ value: '', label: 'Any Project' }, ...delivered.map((x) => ({ value: x.id, label: x.title }))]} onChange={setProjectId} hint={delivered.length ? 'Shows what keeps the project out of each category.' : 'Deliver a project to check it against these.'} />
        <SelectField label="Show" value={show} onChange={setShow} options={[
          { value: 'all', label: `Every ${inst.kind === 'festival' ? 'Section And Award' : 'Category'}` }, { value: 'taking', label: 'Still Taking Entries' },
          ...(p ? [{ value: 'open' as const, label: `Open To ${p.title}` }] : []), { value: 'entered', label: 'Yours' }, { value: 'decided', label: 'Prizes And Honorary Awards' }]} />
        <SelectField label="Format" value={format} options={[{ value: '', label: 'Any Format' }, ...formats.map((f) => ({ value: f, label: FORMAT_LABELS[f] }))]} onChange={setFormat} />
        <TextField label={`Find ${inst.kind === 'festival' ? 'A Section Or Award' : 'A Category'}`} value={query} onChange={setQuery} />
      </div>
      {!shown.length && <p className="muted">Nothing here matches these filters.</p>}
      {groups.map((group) => {
        const cats = shown.filter((c) => (c.section ?? word) === group);
        return (
          <details key={group} className="spaced" open={filtering || groups.length <= 3}>
            <summary><strong>{group}</strong> <span className="dim">({cats.length})</span></summary>
            <ul className="list">
              {cats.map((c) => {
                const el = elig(c);
                // The chosen project's own deadline where the rules give it one (the EFA's two submission periods).
                const dl = categoryDeadline(ed, c, p);
                const parents = c.parents?.map((id) => inst.categories.find((x) => x.id === id)?.name).filter(Boolean) ?? [];
                const st = categoryRuleStatus(rulebook(ed.rulesId), c.id);
                return (
                  <li key={c.id}>
                    <div className="row-wrap">
                      <span className="grow"><strong>{c.name}</strong>{' '}
                        <span className="chips-after">
                        {c.kind && KIND_WORDS[c.kind] ? <span className="chip">{KIND_WORDS[c.kind]}</span> : null}
                        {!c.competitive && c.kind !== 'honorary' && !hasPrizes(c) ? <span className="chip">Not Competitive</span> : null}
                        {st === 'simulated' ? null : <span className="chip">{st === 'verified' ? 'Official Rules' : 'Projected Rules'}</span>}
                        {c.verified === false && st === 'simulated' ? <span className="chip">Rules Not Read</span> : null}
                        {el ? <span className={`chip ${el.eligible ? 'chip-positive' : ''}`}>{el.eligible ? `Open To ${p!.title}` : 'Not Eligible'}</span> : null}
                        </span>
                        <div className="dim">
                          {c.kind === 'honorary' ? 'Chosen by the organizer from a body of work. It takes no entries and no fee. '
                            : !enterable(c) ? `Decided among the work selected for ${parents.length ? parents.join(', ') : 'the festival'}${c.kind === 'audience' ? ', by audiences' : c.kind === 'partner' ? ', by a partner jury' : ''}. It takes no entries and no fee. `
                            : `${c.judging === 'audience' ? 'Decided by audiences.' : c.judging === 'jury' ? 'Decided by a jury.' : c.judging === 'members' ? 'Voted by members.' : 'Chosen by programmers.'}${c.kind === 'area' || c.kind === 'juried' ? ' It can give one award, several or none.' : ''}${c.fee ? ` Entry fee ${money(c.fee)}.` : ''}${c.premiere === 'world' ? ' World premieres only.' : c.premiere === 'international' ? ' International premieres only.' : ''}${dl === ed.deadline ? '' : (() => { const t = longLocal(dl, place.zone); return ` Entries close ${t.date}, ${t.time} local time.`; })()} `}
                          Goes to {recipientWords(c)}.
                          {c.verified === false && st === 'simulated' ? " The organizer's rules for it weren't read; the game's rules apply." : ''}
                        </div>
                        {el && !el.eligible && <div className="dim">{el.reasons[0]}</div>}
                        <RuleNotes ed={ed} categoryId={c.id} />
                      </span>
                      {delivered.length > 0 && enterable(c) && dl > g.now && <button className="btn btn-sm" onClick={() => onPrepare(p?.id ?? delivered[0].id, c)}>Prepare Submission</button>}
                    </div>
                    <ResultLine g={g} ed={ed} c={c} />
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </section>
  );
}

/** Which episode an entry is for, when the category takes one episode (the Emmys' directing and writing). */
const entryEpisode = (p: Project, n?: number) => (n ? `, ${p.episodes[n - 1]?.title ?? `Episode ${n}`}` : '');
/** What an entry was entered with, kept from submission (awards-actions.ts entrySnapshot), against the project now. */
function EntryAsEntered({ x, p }: { x: EditionEntry; p: Project }) {
  const n = x.snapshot!;
  const gone = n.recipients.filter((r) => !p.credits.some((c) => c.id === r.id));
  return (
    <details className="small">
      <summary>As Entered</summary>
      <p className="dim">Entered {longLocal(x.submittedAt, getPlace(p.axes.basePlaceId).zone).date}{x.fee ? `, with a fee of ${money(x.fee)}` : ', with no fee'}. {n.assessed} The cut entered ran {n.runtimeMin} minutes. Credited: {n.recipients.map((r) => `${r.name}, ${r.contribution}${r.characterName ? `, as ${r.characterName}` : ''}`).join('; ') || 'no one'}.{n.song ? ` Song: "${n.song.title}", by ${n.song.writers.join(' and ') || 'writers not recorded'}.` : ''}</p>
      {gone.length > 0 && <p className="dim">No longer in the credits: {gone.map((r) => r.name).join(', ')}. The entry stands as entered.</p>}
      {n.song && !p.songs?.some((s) => s.id === n.song!.id) && <p className="dim">"{n.song.title}" has since been removed from the project. The entry stands as entered.</p>}
      {n.screen?.length ? <ul>{n.screen.map((t) => <li key={t.creditId} className="dim">{t.text}</li>)}</ul> : null}
      {n.airing?.length ? <p className="dim">Episode dates when entered: {n.airing.map((a) => `${a.number}, ${formatDateKey(a.date)} (${a.status === 'released' ? 'out' : a.held ? 'held back, not delivered' : 'to come'}${a.assumed ? ', assumed' : ''})`).join('; ')}.</p> : null}
    </details>
  );
}

/** Which song an entry is for (songs.ts): the title it was entered with. */
const entrySong = (p: Project, x: EditionEntry) => (x.songId ? `, "${x.snapshot?.song?.title ?? p.songs?.find((s) => s.id === x.songId)?.title ?? 'a song'}"` : '');

/** Which cut an entry is, when it isn't the main one. */
const entryVersion = (p: Project, versionId?: string) => { const v = versionId && p.versions?.find((x) => x.id === versionId); return v ? `, ${v.label}` : ''; };

function SubmissionDialog({ editionId, cat, initialProject, onClose, onError }: { editionId: string; cat: Category; initialProject?: string; onClose: () => void; onError: (e: string | null) => void }) {
  const g = useGame();
  const ed = edition(g, editionId);
  const delivered = g.projects.filter((p) => p.delivered);
  const [projectId, setProjectId] = useState(initialProject && delivered.some((x) => x.id === initialProject) ? initialProject : delivered[0]?.id ?? '');
  const p = delivered.find((x) => x.id === projectId);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [versionId, setVersionId] = useState('');
  const [episode, setEpisode] = useState('');
  const [songId, setSongId] = useState('');
  if (!p) return null;
  // Entered for one episode: the choice, else the first episode anyone credited for the category worked on. A performer
  // category measuring screen time per episode is entered for one too: the choice, else the part's best.
  const rules = categoryRules(ed, cat.id, p);
  const screen = rules?.screenShare?.value;
  const candidates = screen ? categoryRecipients(g, p, cat, undefined, undefined) : [];
  const episodes = isEpisodic(p.axes.format)
    ? rules?.oneEpisode ? entryEpisodes(g, p, cat, rules)
      : screen?.per === 'episode' ? [...new Set(editScenes(p).filter((s) => s.participants.some((id) => approvedCharacters(p).some((c) => c.id === id && candidates.some((k) => k.characterName === c.name)))).map((s) => s.episode))].sort((a, b) => a - b) : []
    : [];
  const ep = episodes.length ? Number(episode) || (rules?.oneEpisode ? episodes[0] : undefined) : undefined;
  // A song category: the song entered, by default the first written for the work.
  const songs = cat.recipient === 'song' ? songsOf(p) : [];
  const entered = new Set(ed.entries.filter((e) => e.projectId === p.id && e.categoryId === cat.id && e.status !== 'withdrawn').map((e) => e.songId));
  const song = songId || originalSongs(p, versionId || undefined, rules?.song?.value).find((x) => !entered.has(x.id))?.id;
  const el = checkEligibility(g, p, ed, cat, recipients.length ? recipients : undefined, versionId || undefined, ep, song);
  const pool = categoryRecipients(g, p, cat, undefined, rules, ep, { versionId: versionId || undefined });
  const personal = ['lead', 'supporting', 'voice'].includes(cat.recipient);
  const docs = entryNeeds(p);
  // Acting categories: where each cast part is placed, and why (script-effects.ts placementExplained).
  const castParts = cat.recipient === 'lead' || cat.recipient === 'supporting'
    ? approvedCharacters(p).filter((c) => p.cast.some((a) => a.characterId === c.id && a.method !== 'voice')) : [];
  return (
    <Modal title="Prepare Submission" onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" disabled={!el.eligible || !!docs} onClick={() => { const e = store.act((s) => void submitEntry(s, p, editionId, cat.id, recipients.length ? recipients : undefined, versionId || undefined, ep, song)); onError(e); if (!e) onClose(); }}>Submit Entry</button>
    </>}>
      <p><strong>{cat.name}</strong>, {ed.label}</p>
      <SelectField label="Project" value={projectId} options={delivered.map((x) => ({ value: x.id, label: x.title }))} onChange={(v) => { setProjectId(v); setRecipients([]); setVersionId(''); setEpisode(''); setSongId(''); }} />
      {episodes.length > 0 && <SelectField label="Episode To Enter" value={ep === undefined ? '' : String(ep)} hint={rules?.oneEpisode ? 'This category is entered for one episode, and goes to the people credited on it.' : 'Screen time is measured against the episode entered. Unchosen, it is the performer\'s best.'} options={[...(rules?.oneEpisode ? [] : [{ value: '', label: 'Their Best Episode' }]), ...episodes.map((n) => ({ value: String(n), label: p.episodes[n - 1]?.title ?? `Episode ${n}` }))]} onChange={(v) => { setEpisode(v); setRecipients([]); }} />}
      {songs.length > 0 && <SelectField label="Song To Enter" value={song ?? ''} hint="An original song award takes one song written for the work, and goes to its writers." options={[...(song ? [] : [{ value: '', label: 'Choose A Song' }]), ...songs.map((x) => ({ value: x.id, label: `"${x.title}"${entered.has(x.id) ? ' (Entered)' : ''}` }))]} onChange={(v) => { setSongId(v); setRecipients([]); }} />}
      {cat.recipient === 'song' && song && songProblems(p, song, versionId || undefined, rules?.song?.value).length === 0 && <p className="dim">{assessedWords(p, cat, { songId: song })}</p>}
      {(p.versions ?? []).length > 0 && <SelectField label="Version To Enter" value={versionId} options={[{ value: '', label: `The Main Cut (${p.delivered!.runtimeMin} Minutes)` }, ...p.versions!.map((v) => ({ value: v.id, label: `${v.label} (${versionRuntime(p, v)} Minutes)` }))]} onChange={setVersionId} />}
      {personal && pool.length > 0 && (
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend style={{ fontWeight: 600 }}>Performance To Enter</legend>
          {pool.map((c) => <Check key={c.id} label={performerLabel(c)} checked={recipients.includes(c.id)} onChange={(v) => setRecipients(v ? [c.id] : [])} />)}
        </fieldset>
      )}
      {screen && candidates.length > 0 && (
        <div className="spaced" aria-label="Screen Time Calculation">
          <p><strong>Screen time.</strong> This category needs {Math.round(screen.atLeast * 100)}% of the running time on screen ({screen.per === 'episode' ? 'of the episode entered' : 'of the cut entered'}), from the screen time recorded in the Edit tab:</p>
          <ul>{candidates.map((c) => { const r = shareCheck(p, c, screen.atLeast, screen.per, { episode: ep, versionId: versionId || undefined }); return <li key={c.id}>{r.text}</li>; })}</ul>
        </div>
      )}
      {(ep !== undefined || isEpisodic(p.axes.format)) && cat.recipient !== 'song' && <p className="dim">{assessedWords(p, cat, { episode: ep })}</p>}
      {castParts.length > 0 && (
        <details className="spaced" open={!pool.length}>
          <summary>How Parts Are Placed</summary>
          <ul>{castParts.map((c) => <li key={c.id}>{placementExplained(c)}{castPlacement(c) === cat.recipient ? '' : ' Not in this category.'}</li>)}</ul>
          <p className="dim">Story functions such as protagonist or antagonist don't decide the category. Organizers that decide placement themselves aren't modeled.</p>
        </details>
      )}
      {docs && <div className="callout callout-warning"><p>{docs}</p></div>}
      {el.eligible ? (
        <div className="callout callout-positive"><p>{(() => {
          const st = categoryRuleStatus(rulebook(ed.rulesId), cat.id);
          return st === 'verified' ? "This entry meets the organizer's published rules for this category." : st === 'projected' ? "This entry meets last year's rules, carried forward until this year's are published." : "This entry meets the game's rules for this category.";
        })()}{el.provisional ? ` ${el.provisionalNote?.replace(/^Entered provisionally\. /, '') ?? 'It counts on a planned release that must happen within the eligibility period.'}` : ''}</p></div>
      ) : (
        <div className="callout callout-warning"><p>This entry can't be submitted yet:</p><ul>{el.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
      )}
      {cat.fee > 0 ? <p>Entry fee: {money(cat.fee)}, paid from the project's budget when you submit. Withdrawing doesn't refund it; entering again in this category doesn't charge it twice.</p> : <p>This category has no entry fee.</p>}
      <p>This award goes to {recipientWords(cat)}. Credited for this entry: {el.recipients.map((r) => r.personName).join(', ') || 'No one yet'}.</p>
      {cat.kind === 'section' && <p className="dim">Selection is not a win. {institution(ed.institutionId).categories.some((c) => c.parents?.includes(cat.id)) ? "If it's selected, its prizes are decided among the films selected for this section, with no further entry." : 'This section has no prizes of its own.'}</p>}
      {cat.recipient === 'national' && <p className="dim">The production country's selection committee chooses one film at the entry deadline, and a country puts forward only one. A win of an award on the qualifying list below qualifies a film without the committee.</p>}
      {(() => {
        const list = festivalListFor(ed, cat.id);
        if (!list) return null;
        return (
          <details className="spaced">
            <summary>Qualifying Festival Awards</summary>
            <p>Won from {formatDateKey(list.window.from)} to {formatDateKey(list.window.to)}{list.projectedFrom ? ", carried forward from the newest list the organizer has published" : ''}. Only these awards count: another prize at the same festival, a selection, a mention or an audience award doesn't.</p>
            <ul>{list.awards.map((a) => <li key={`${a.institution}:${a.category}`}>{a.listed}</li>)}</ul>
          </details>
        );
      })()}
      <p className="dim">Eligibility is necessary but doesn't guarantee selection or a win.</p>
    </Modal>
  );
}

export { Fragment, approvedCharacters };

/** Motion capture by character: booking, takes, the approved take and retakes. */
function MocapPanel({ p }: { p: Project }) {
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ charId: string; takeId: string; names: string[] } | null>(null);
  const [parts, setParts] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<Record<string, string>>({});
  const caps = p.tasks.filter((t) => t.kind === 'anim:mocap' && t.assetRef);
  const PARTS: Record<string, CapturePart[]> = { both: ['body', 'face'], body: ['body'], face: ['face'] };
  const act = (fn: (s: GameState, proj: Project) => void) => setError(store.act((s) => fn(s, s.projects.find((x) => x.id === p.id)!)));
  return (
    <section className="card" aria-labelledby="mocap-h">
      <h2 id="mocap-h">Motion Capture</h2>
      <p className="dim">Book the capture stage, rehearse and calibrate, then capture. Sessions are dated and go on your calendar; dates when the performer is shooting, or the stage is taken, are passed over. Choose the take that goes forward; cleanup and retargeting start from it.</p>
      {error && <p role="alert" className="error">{error}</p>}
      {caps.map((cap) => {
        const charId = cap.assetRef!;
        const name = p.characters.find((c) => c.id === charId)?.name ?? 'Character';
        const rec = p.mocap?.[charId];
        const booked = rec?.status === 'booked';
        return (
          <article key={charId} className="spaced" aria-label={`Motion Capture For ${name}`}>
            <h3>{name}</h3>
            <p>
              {booked ? 'The capture stage is booked.' : rec?.status === 'cancelled' ? 'The booking was cancelled.' : 'The capture stage isn\'t booked yet.'}{' '}
              {cap.done} of {plural(cap.units, 'session')} captured{rec?.retakes ? `, including ${plural(rec.retakes, 'retake')}` : ''}.
            </p>
            {/* A field beside its buttons, level with them (the UI audit, November 13, 2026: 2.6 px apart in a row). */}
            <div className="inline-form">
              {!booked && cap.status !== 'done' && (
                <>
                  <SelectField label={`What To Capture For ${name}`} value={parts[charId] ?? 'both'} onChange={(v) => setParts({ ...parts, [charId]: v })}
                    options={[{ value: 'both', label: 'Performance Capture (Body And Face)' }, { value: 'body', label: 'Motion Capture (Body Only)' }, { value: 'face', label: 'Facial Capture Only' }]} />
                  <button className="btn btn-primary" onClick={() => act((s, proj) => {
                    const passed = bookMocap(s, proj, charId, PARTS[parts[charId] ?? 'both']);
                    setSkipped({ ...skipped, [charId]: passed.length ? `Passed over: ${passed.slice(0, 4).map((x) => `${formatDateKey(x.date)} (${x.reason})`).join('; ')}.` : '' });
                  })}>Book Capture Stage ({money(bookingCost(p, charId, PARTS[parts[charId] ?? 'both']))})</button>
                </>
              )}
              {booked && (
                <>
                  <button className="btn" onClick={() => act((s, proj) => requestRetake(s, proj, charId))}>Request A Retake ({money(sessionCost(p, charId))})</button>
                  {cap.status !== 'done' && <button className="btn btn-danger" onClick={() => act((s, proj) => { cancelMocapBooking(s, proj, charId); })}>Cancel Booking</button>}
                </>
              )}
            </div>
            {booked && cap.status !== 'done' && <p className="dim">{cancellationTerms(p, charId)}</p>}
            {rec?.parts && <p className="muted">{captureCredit(rec.parts)}{rec.parts.includes('face') ? `: each session includes a facial rig (${money(FACIAL_RIG_PER_SESSION)}), and a facial solve follows cleanup.` : '.'}</p>}
            {skipped[charId] && <p className="dim">{skipped[charId]}</p>}
            {rec?.sessions && rec.sessions.length > 0 && (
              <ul className="list" aria-label={`Capture Sessions For ${name}`}>
                {[...rec.sessions].sort((a, b) => (a.date < b.date ? -1 : 1)).map((x, i) => (
                  <li key={`${x.date}-${i}`} className="row-wrap">
                    <span className="grow">{formatDateKey(x.date, true)}: {x.kind === 'calibration' ? 'Calibration' : 'Capture'}{x.note ? ` (${x.note})` : ''}</span>
                    <span className={`chip ${x.status === 'done' ? 'chip-positive' : x.status === 'missed' ? 'chip-negative' : ''}`}>{x.status === 'booked' ? 'Booked' : x.status === 'done' ? 'Done' : 'Missed, Rebooked'}</span>
                  </li>
                ))}
              </ul>
            )}
            {rec && rec.takes.length > 0 && (
              <ul className="list" aria-label={`Takes For ${name}`}>
                {rec.takes.map((t, i) => (
                  <li key={t.id} className="row-wrap">
                    <span className="grow">Take {i + 1}{t.retake ? ' (Retake)' : ''}: quality {t.quality} · {formatDateKey(t.date, true)}</span>
                    {rec.approvedTakeId === t.id ? <span className="chip chip-positive">Approved</span> : (
                      <button className="btn btn-sm" aria-label={`Approve Take ${i + 1} For ${name}`} onClick={() => {
                        const impact = takeChangeImpact(p, charId);
                        if (impact.length) setConfirm({ charId, takeId: t.id, names: impact.map((x) => x.label) });
                        else act((_, proj) => { approveTake(proj, charId, t.id); });
                      }}>Approve This Take</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
      {confirm && (
        <Modal title="Change The Approved Take?" onClose={() => setConfirm(null)} footer={
          <>
            <button className="btn" onClick={() => setConfirm(null)}>Keep The Current Take</button>
            <button className="btn btn-danger" onClick={() => { act((_, proj) => { approveTake(proj, confirm.charId, confirm.takeId); }); setConfirm(null); }}>Change Take</button>
          </>
        }>
          <p>Work already built on the current take will start over:</p>
          <ul>{confirm.names.map((n) => <li key={n}>{n}</li>)}</ul>
        </Modal>
      )}
    </section>
  );
}

// ---------------- Screening invitations ----------------

function ScreeningsPanel({ editionId }: { editionId: string }) {
  const g = useGame();
  const [err, setErr] = useState<string | null>(null);
  const ed = g.editions.find((x) => x.id === editionId)!;
  const inst = institution(ed.institutionId);
  const venue = getPlace(inst.placeId);
  return (
    <section className="card" aria-labelledby="scr-h">
      <h2 id="scr-h">Screenings</h2>
      {err && <p role="alert" className="error">{err}</p>}
      <ul className="list">
        {(ed.screenings ?? []).map((sc) => {
          const p = g.projects.find((x) => x.id === sc.projectId);
          const when = longLocal(sc.at, venue.zone);
          const travel = screeningTravel(g, ed, sc);
          const conflicts = sc.done ? [] : screeningConflicts(g, ed, sc);
          const late = sc.rsvpBy !== undefined && g.now > sc.rsvpBy;
          const open = !sc.done && (sc.rsvp ?? 'pending') === 'pending' && !late;
          const accept = () => setErr(store.act((s) => rsvpScreening(s, ed.id, sc.projectId, sc.at, true)));
          const decline = () => setErr(store.act((s) => rsvpScreening(s, ed.id, sc.projectId, sc.at, false)));
          const travelThere = () => setErr(store.act((s) => { rsvpScreening(s, ed.id, sc.projectId, sc.at, true); travelTo(s, inst.placeId); }));
          return (
            <li key={sc.at} aria-label={`Screening Of ${p?.title ?? 'Your Film'} On ${when.date}`}>
              <div><strong>{p?.title ?? 'Your film'}</strong>: {when.weekday}, {when.date}, {when.time} at the {ed.label}, {venue.name}.{!sc.done && sc.at > g.now ? ` The screening starts in ${formatDuration(sc.at - g.now)}.` : ''}</div>
              <div className="dim">
                {sc.done ? (sc.attended ? 'You attended.' : 'It screened without you.')
                  : sc.rsvp === 'accepted' ? (travel.here ? "You're attending, and you're here." : `You're attending. The trip takes about ${Math.round(travel.hours)} hours.`)
                  : sc.rsvp === 'declined' ? 'You declined. It still screens.'
                  : late || sc.rsvp === 'expired' ? 'The reply deadline has passed. It still screens.'
                  : `Reply by ${longLocal(sc.rsvpBy ?? sc.at, venue.zone).date}.`}
              </div>
              {!sc.done && conflicts.map((c) => <p key={c} className="warn">{c}</p>)}
              {!sc.done && !travel.here && !travel.arrivesInTime && sc.rsvp !== 'declined' && <p className="dim">You couldn't arrive in time from where you are: the trip takes about {Math.round(travel.hours)} hours.</p>}
              {!sc.done && (
                <div className="row gap-2 wrap">
                  {open && travel.here && <button className="btn btn-primary btn-sm" onClick={accept}>Attend Screening</button>}
                  {open && !travel.here && travel.arrivesInTime && <button className="btn btn-primary btn-sm" onClick={accept}>Accept Invitation</button>}
                  {sc.rsvp === 'accepted' && !travel.here && travel.arrivesInTime && !g.travel && <button className="btn btn-sm" onClick={travelThere}>Travel To The Screening</button>}
                  {conflicts.length > 0 && p && <button className="btn btn-sm" onClick={() => store.go({ view: 'project', projectId: p.id, tab: 'schedule' })}>View Schedule</button>}
                  {(open || sc.rsvp === 'accepted') && <button className="btn btn-sm" onClick={decline}>Decline Invitation</button>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="dim">Declining to attend doesn't change the selection.</p>
    </section>
  );
}

/** How SLATE applies an organizer's rules where the game is simpler than the real process. Short, and only when there are notes. */
function RuleNotes({ ed, categoryId }: { ed: Parameters<typeof categoryRules>[0]; categoryId: string }) {
  const rules = categoryRules(ed, categoryId);
  // In the player's words: without the documents' section numbers, and the game named as the game.
  const plain = (n: string) => n.replace(/ \((?:[IVX]+\.|[0-9]+\.|Art\.|Eligibility|Required|II?\.)[^)]*\)/g, '').replace(/\bSLATE's\b/g, "the game's").replace(/\bSLATE\b/g, 'the game').replace(/^the game/, 'The game');
  const notes = rules ? [...new Set(Object.values(rules).map((r) => (r as { note?: string }).note).filter((n): n is string => !!n).map(plain))] : [];
  if (!notes.length) return null;
  return (
    <details className="dim">
      <summary>How These Rules Apply</summary>
      <ul>{notes.map((n) => <li key={n}>{n}</li>)}</ul>
    </details>
  );
}

/**
 * The version a distributor's release opens in where the territories' language isn't the film's, and the studios' films
 * opening the same week (finish.ts setReleaseVersion; studios.ts). The second is information: it changes no figure.
 */
function ReleaseVersion({ p, r }: { p: Project; r: ReleaseRecord }) {
  const g = useGame();
  const [err, setErr] = useState<string | null>(null);
  const languages = versionLanguages(p, r);
  const rivals = r.route === 'theatrical' && r.status !== 'cancelled' ? studioFilms(g, addDaysToKey(r.date, -7), addDaysToKey(r.date, 7)) : [];
  const name = (c: string) => g.industry?.studios?.find((x) => x.c === c)?.name ?? 'a studio';
  if (!r.offerId || (!languages.length && !rivals.length)) return null;
  const why = versionRefusal(p, r);
  const cost = dubbingCost(p, r);
  return (
    <div className="dim">
      {languages.length > 0 && (r.status === 'planned' && !why ? (
        <div className="inline-form">
          <SelectField label={`Version In ${r.territories.map(countryName).join(', ')}`} value={r.version ?? 'subtitled'}
            options={[{ value: 'subtitled', label: 'Subtitled' }, { value: 'dubbed', label: `Dubbed (${money(cost)})` }]}
            onChange={(v) => setErr(store.act((s) => setReleaseVersion(s, s.projects.find((x) => x.id === p.id)!, r.id, v as 'subtitled' | 'dubbed')))}
            hint={`Subtitles come with ${r.distributor}'s materials. A dubbed version is yours to pay for: ${money(cost)}, set aside now and paid on release. Where it is dubbed, a territory counts for ${DUBBED_REACH} in ${r.distributor}'s reports, against 1 subtitled.`} />
        </div>
      ) : <p style={{ margin: 0 }}>Shown {r.version ?? 'subtitled'} where the language isn't the film's.</p>)}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      {rivals.length > 0 && <p style={{ margin: 0 }}>Opening within a week of it: {rivals.slice(0, 4).map((f) => `${f.title} (${name(f.company)})`).join(', ')}{rivals.length > 4 ? `, and ${rivals.length - 4} more` : ''}. For your information: it changes no figure.</p>}
    </div>
  );
}


/**
 * A cinema run week by week (engine/box-office.ts): ticket sales, who keeps what of them, and what is left towards the
 * guarantee. Every figure is the game's own simulation and says so.
 */
function WeeksInCinemas({ o }: { o: Project['offers'][number] }) {
  const weeks = o.weeks ?? [];
  const rows = weeks.map((w) => ({ w, m: weekMoney(w, o.fee ?? DISTRIBUTOR_FEE) }));
  const total = rows.reduce((a, { m }) => ({ gross: a.gross + m.gross, admissions: a.admissions + m.admissions, cinemas: a.cinemas + m.cinemas, rental: a.rental + m.rental, fee: a.fee + m.fee, net: a.net + m.net }), { gross: 0, admissions: 0, cinemas: 0, rental: 0, fee: 0, net: 0 });
  const n = (x: number) => x.toLocaleString('en-US');
  return (
    <details className="small">
      <summary>Weeks In Cinemas ({weeks.length})</summary>
      <p className="dim">Simulated by the game: no real box office is shown here. Ticket sales are not what you earn. Cinemas keep {Math.round((1 - RENTAL_SHARE) * 100)}% of them; the rest is the film rental {o.distributor} receives, its fee of {Math.round((o.fee ?? DISTRIBUTOR_FEE) * 100)}% comes off that, and what is left repays the guarantee before any of it reaches you. Admissions are ticket sales at {money(TICKET_PRICE)} a ticket. A week is provisional until the month's report settles it. Each week the cinemas decide from its takings a screen, less what other wide releases took, whether to expand it, hold it, cut its screens or withdraw it; the screens it ends a month on decide what the next month can earn.</p>
      <div className="table-wrap">
        <table className="data" aria-label={`Weeks In Cinemas, ${o.distributor}`}>
          <thead><tr><th>Week</th><th>Dates</th><th>Territories Open</th><th>Screens</th><th>Other Wide Releases</th><th>Next Week</th><th>Admissions</th><th>Ticket Sales</th><th>Cinemas Keep</th><th>Film Rental</th><th>Distributor's Fee</th><th>Towards The Guarantee</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map(({ w, m }) => (
              <tr key={w.week}>
                <td data-label="Week">{w.week}</td>
                <td data-label="Dates">{formatDateKey(w.from)} to {formatDateKey(w.to)}</td>
                <td data-label="Territories Open">{w.territories}</td>
                <td data-label="Screens">{w.screens ?? '—'}</td>
                <td data-label="Other Wide Releases">{w.competitors ?? '—'}</td>
                <td data-label="Next Week">{w.next ? { expanded: 'Expanded', held: 'Held', cut: 'Screens Cut', withdrawn: 'Withdrawn' }[w.next] : '—'}</td>
                <td data-label="Admissions">{n(m.admissions)}</td>
                <td data-label="Ticket Sales">{money(m.gross)}</td>
                <td data-label="Cinemas Keep">{money(m.cinemas)}</td>
                <td data-label="Film Rental">{money(m.rental)}</td>
                <td data-label="Distributor's Fee">{money(m.fee)}</td>
                <td data-label="Towards The Guarantee">{money(m.net)}</td>
                <td data-label="Status">{w.status === 'final' ? 'Final' : 'Provisional'}{w.first !== undefined ? `; first reported as ${money(w.first)} in rental` : ''}{w.late ? '; reported with its month' : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><th scope="row">All</th><td /><td /><td /><td /><td /><td>{n(total.admissions)}</td><td>{money(total.gross)}</td><td>{money(total.cinemas)}</td><td>{money(total.rental)}</td><td>{money(total.fee)}</td><td>{money(total.net)}</td><td /></tr></tfoot>
        </table>
      </div>
    </details>
  );
}

/**
 * What a broadcast or streaming release reported of its audience, week by week (engine/audiences.ts). Each measure is
 * said for what it is, none is turned into another, and every figure is the game's own simulation.
 */
/** A week's slot, season and competition, as what each did to the figure. */
function weekWords(c: AudienceObservation['context']): string {
  if (!c) return 'Not recorded';
  const pct = (x: number) => `${x >= 1 ? '+' : '−'}${Math.round(Math.abs(x - 1) * 100)}%`;
  return [c.slot !== 1 ? `A late slot, ${pct(c.slot)}` : null, c.season !== 1 ? `${c.season < 1 ? 'Summer' : 'Winter'}, ${pct(c.season)}` : null, `${c.competition < 0.95 ? 'A crowded week' : c.competition > 1.05 ? 'A quiet week' : 'An ordinary week'}, ${pct(c.competition)}`].filter(Boolean).join('; ');
}

function WeeklyAudience({ o }: { o: Project['offers'][number] }) {
  const rows = o.audience ?? [];
  const n = (x: number) => x.toLocaleString('en-US');
  const weeks = new Set(rows.map((r) => r.week)).size;
  return (
    <details className="small">
      <summary>Weekly Audience ({weeks})</summary>
      <p className="dim">Simulated by the game: no real audience figure is shown here. {audienceSummary(o)} A figure is recorded the day its week ends and is not changed afterwards; a week with none has none, which is not the same as nobody watching. Nothing you are paid depends on these.</p>
      <ul className="dim">{routeMetrics(o.route).map((m) => <li key={m}><strong>{METRICS[m].label}:</strong> {METRICS[m].says}</li>)}</ul>
      <div className="table-wrap">
        <table className="data" aria-label={`Weekly Audience, ${o.distributor}`}>
          <thead><tr><th>Week</th><th>Dates</th><th>Of</th><th>Measure</th><th>Figure</th><th>Territories Open</th><th>What The Week Stood Against</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.week}:${r.metric}:${r.episode ?? 0}`}>
                <td data-label="Week">{r.week}</td>
                <td data-label="Dates">{formatDateKey(r.from)} to {formatDateKey(r.to)}</td>
                <td data-label="Of">{r.scope === 'episode' ? `Episode ${r.episode}` : 'Everything Available'}</td>
                <td data-label="Measure">{METRICS[r.metric].label}</td>
                <td data-label="Figure">{n(r.value)}</td>
                <td data-label="Territories Open">{r.territories}</td>
                <td data-label="What The Week Stood Against">{weekWords(r.context)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
