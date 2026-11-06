import { Fragment, useState } from 'react';
import { getPlace, placeLabel } from '../data/places';
import {
  ROUTE_LABELS, acceptDistribution, approvedCharacters, assemblyComplete, checkEligibility, coverageGaps, dateKey, declineDistribution, deliver,
  deliveryBlockers, edition, formatDateKey, institution, isEpisodic, ledgerTotals, lockBlockers, lockPicture, money, planRelease, puppetStatus,
  qualityWords, requestPickups, depsMet, startCutPass, submitEntry, unlockPicture, withdrawEntry, addDaysToKey, categoryRecipients, type Category,
  categoriesFor, rsvpScreening, screeningConflicts, screeningTravel, travelTo, DELIVERY_MATERIALS, cancelRelease, releaseCancelTerms, MOCAP_SESSION_STAGE, approveTake, bookMocap, bookingCost, cancelMocapBooking, cancellationTerms, requestRetake, takeChangeImpact,
} from '../engine';
import type { GameState, Project, ReleaseRecord } from '../engine/types';
import { Check, Modal, SelectField, TextField, longLocal, plural } from './components';
import { Breadcrumbs } from './Shell';
import { store, useGame } from './store';
import { FollowButton } from './World';

// ---------------- Production ----------------

export function ProductionTab({ p }: { p: Project }) {
  const g = useGame();
  if (!p.tasks.length) {
    return (
      <div className="panel">
        <h2>Nothing Scheduled Yet</h2>
        <p>{p.approvedDraft === null ? 'Approve a draft, hire your team and build a schedule to start production.' : 'Build a schedule to turn the breakdown into production work.'}</p>
        <button className="btn" onClick={() => { store.route = { ...store.route, tab: p.approvedDraft === null ? 'script' : 'schedule' }; store.emit(); }}>{p.approvedDraft === null ? 'Open Script' : 'Open Schedule'}</button>
      </div>
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
      <section className="panel">
        <h2>Progress</h2>
        <p>{done} of {plural(p.tasks.length, 'task')} finished.</p>
        <div className="meter" role="img" aria-label={`${Math.round((done / p.tasks.length) * 100)} percent of tasks finished`}><span style={{ width: `${(done / p.tasks.length) * 100}%` }} /></div>
        {blocked.length > 0 && (
          <div className="alert spaced">
            <p><strong>{plural(blocked.length, 'task')} can't move today.</strong></p>
            <ul>{blocked.slice(0, 5).map((t) => <li key={t.id}>{t.label}: {t.blockedReason}</li>)}</ul>
          </div>
        )}
        <p className="dim">Work happens on working days at the production base. Advance or let time pass to see it move.</p>
      </section>
      {p.tasks.some((t) => t.kind === 'anim:mocap') && <MocapPanel p={p} />}
      {puppets.length > 0 && (
        <section className="panel">
          <h2>Puppets</h2>
          <ul className="list">{puppets.map((a) => <li key={a.id}><strong>{a.label}</strong> ({plural(a.copies, 'copy', 'copies')}): {puppetStatus(p, a.characterId!)}</li>)}</ul>
        </section>
      )}
      {p.assets.some((a) => a.kind !== 'puppet') && (
        <section className="panel">
          <h2>Assets</h2>
          <ul className="list">{p.assets.filter((a) => a.kind !== 'puppet').map((a) => <li key={a.id}>{a.label}: {a.ready ? 'Ready' : a.stage}</li>)}</ul>
        </section>
      )}
      {depts.map((d) => (
        <section key={d} className="panel">
          <h2>{d}</h2>
          <ul className="list">
            {p.tasks.filter((t) => t.dept === d).map((t) => (
              <li key={t.id}>
                <div className="row">
                  <span className="grow">{t.label}</span>
                  <span className={`chip ${t.status === 'done' ? 'good' : t.status === 'blocked' ? 'bad' : t.status === 'active' ? 'gold' : ''}`}>{{ waiting: 'Waiting', ready: 'Ready', active: 'Underway', done: 'Done', blocked: 'Blocked' }[t.status]}</span>
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

// ---------------- Edit and delivery ----------------

export function EditTab({ p }: { p: Project }) {
  useGame();
  const [err, setErr] = useState<string | null>(null);
  const [pick, setPick] = useState<string[]>([]);
  const gaps = coverageGaps(p);
  const lb = lockBlockers(p);
  const db = deliveryBlockers(p);
  const cutting = p.tasks.find((t) => t.kind === 'post:cutpass' && t.status !== 'done');
  return (
    <>
      {err && <div className="alert bad" role="alert"><p>{err}</p></div>}
      <section className="panel">
        <h2>Cut</h2>
        <dl className="kv">
          <dt>Assembly</dt><dd>{assemblyComplete(p) ? 'Finished' : 'Not finished yet. It starts when the material for each episode is in.'}</dd>
          <dt>Cut Passes</dt><dd>{p.edit.cutPasses}{cutting ? ` (pass ${p.edit.cutPasses + 1} underway, ${Math.round((cutting.done / cutting.units) * 100)}%)` : ''}</dd>
          <dt>Picture</dt><dd>{p.edit.pictureLocked ? 'Locked' : 'Not locked'}</dd>
        </dl>
        <div className="btn-row spaced">
          <button className="btn" disabled={!assemblyComplete(p) || p.edit.pictureLocked || !!cutting} onClick={() => setErr(store.act((s) => void startCutPass(s, p)))}>Start Cut Pass</button>
          {!p.edit.pictureLocked ? (
            <button className="btn btn-primary" disabled={lb.length > 0} onClick={() => setErr(store.act((s) => lockPicture(s, p)))}>Lock Picture</button>
          ) : !p.delivered && <button className="btn" onClick={() => setErr(store.act((s) => void unlockPicture(s, p)))}>Unlock Picture</button>}
        </div>
        {!p.edit.pictureLocked && lb.length > 0 && <p className="dim">Before you lock: {lb.join(' ')}</p>}
        {p.edit.versions.length > 0 && (
          <details className="spaced"><summary>Versions</summary><ul>{p.edit.versions.map((v) => <li key={v.number}>Version {v.number}: {v.note}, about {v.runtimeMin} minutes</li>)}</ul></details>
        )}
      </section>
      <section className="panel">
        <h2>Coverage</h2>
        {gaps.length ? (
          <>
            <p>These scenes may need more material:</p>
            <ul className="list">{gaps.map((g) => <li key={g.sceneId}><Check label={`${g.label}: ${g.reason}`} checked={pick.includes(g.sceneId)} onChange={(v) => setPick(v ? [...pick, g.sceneId] : pick.filter((x) => x !== g.sceneId))} /></li>)}</ul>
            <button className="btn" disabled={!pick.length || p.edit.pictureLocked} onClick={() => { setErr(store.act((s) => void requestPickups(s, p, pick))); setPick([]); }}>Request Pickups</button>
          </>
        ) : <p className="muted">No coverage gaps found.</p>}
      </section>
      <section className="panel">
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

// ---------------- Release ----------------

export function ReleaseTab({ p }: { p: Project }) {
  const g = useGame();
  const place = getPlace(p.axes.basePlaceId);
  const today = dateKey(g.now, place.zone);
  const [route, setRoute] = useState<ReleaseRecord['route']>('digital');
  const [date, setDate] = useState(addDaysToKey(today, 30));
  const [terr, setTerr] = useState(place.country);
  const [err, setErr] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  if (!p.delivered) return <div className="panel"><h2>Not Delivered Yet</h2><p>Credits and release plans become available once the project is delivered.</p></div>;
  const episodic = isEpisodic(p.axes.format);
  const open = p.offers.filter((o) => o.status === 'open' && o.expiresAt > g.now);
  return (
    <>
      {err && <div className="alert bad" role="alert"><p>{err}</p></div>}
      <section className="panel">
        <h2>Credits</h2>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Credit</th><th>Name</th><th>Details</th></tr></thead>
            <tbody>
              {p.credits.map((c) => (
                <tr key={c.id}>
                  <td data-label="Credit">{c.contribution}</td>
                  <td data-label="Name">{c.person === 'player' ? <strong>{c.personName}</strong> : c.personName}</td>
                  <td data-label="Details">{c.characterName ? `as ${c.characterName}` : ''}{episodic && c.episodes !== 'all' ? `${c.characterName ? ', ' : ''}Episodes ${c.episodes.join(', ')}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Distribution Offers</h2>
        {open.length ? (
          <ul className="list">
            {open.map((o) => (
              <li key={o.id} className="row">
                <span className="grow"><strong>{o.distributor}</strong>: {ROUTE_LABELS[o.route]} release in {o.territories.join(', ')} for a minimum guarantee of {money(o.minimumGuarantee)}, releasing about {o.releaseWindowDays} days after you accept. The contract requires delivery materials, about {money(DELIVERY_MATERIALS[o.route])}, held from your budget until release.<span className="dim"> Distributors in this game are fictional.</span></span>
                <div className="btn-row">
                  <button className="btn btn-small btn-primary" onClick={() => setErr(store.act((s) => void acceptDistribution(s, p, o.id)))}>Accept Offer</button>
                  <button className="btn btn-small" onClick={() => setErr(store.act(() => declineDistribution(p, o.id)))}>Decline Offer</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="muted">No open offers. Festival selections can bring interest. You can always release it yourself.</p>}
      </section>
      <section className="panel">
        <h2>Plan A Release</h2>
        <div className="grid3">
          <SelectField label="Route" value={route} options={(['digital', 'streaming', 'theatrical', 'broadcast'] as const).map((r) => ({ value: r, label: ROUTE_LABELS[r] }))} onChange={setRoute} />
          <TextField label="Release Date" type="date" value={date} onChange={setDate} />
          <TextField label="Territory Code" value={terr} maxLength={2} hint="Two-letter country code, such as US or GB." onChange={(v) => setTerr(v.toUpperCase())} />
        </div>
        <p className="dim">Theatrical and broadcast releases need a distributor or broadcaster. Release choices affect premiere status for festivals.</p>
        <button className="btn btn-primary" onClick={() => setErr(store.act((s) => void planRelease(s, p, { route, date, territories: [terr] })))}>Plan Release</button>
      </section>
      <section className="panel">
        <h2>Release History</h2>
        {p.premiere && <p>Premiered {formatDateKey(p.premiere.date)} at {p.premiere.venue}.</p>}
        {p.releases.length ? <ul className="list">{p.releases.map((r) => <li key={r.id} className="row"><span className="grow">{ROUTE_LABELS[r.route]} in {r.territories.join(', ')} on {formatDateKey(r.date)}{r.distributor ? ` with ${r.distributor}` : ''} <span className="chip">{{ released: 'Released', planned: 'Planned', cancelled: 'Cancelled' }[r.status]}</span></span>{r.status === 'planned' && <button className="btn btn-small btn-danger" onClick={() => setCancelling(r.id)}>Cancel Release</button>}</li>)}</ul> : <p className="muted">No releases yet.</p>}
        {p.quality && <p className="dim">Reception in this game: {qualityWords(p.quality.reception)}.</p>}
      </section>
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
  return (
    <>
      <section className="panel">
        <h2>Your Entries</h2>
        {entries.length ? (
          <ul className="list">
            {entries.map(({ e, x }) => {
              const cat = institution(e.institutionId).categories.find((c) => c.id === x.categoryId)!;
              return (
                <li key={x.id} className="row">
                  <span className="grow"><button className="btn btn-quiet" onClick={() => store.go({ view: 'event', editionId: e.id })}>{e.label}</button>: {cat.name} <span className="chip">{entryStatus(x.status)}</span>{x.reason ? <span className="dim"> {x.reason}</span> : null}</span>
                </li>
              );
            })}
          </ul>
        ) : <p className="muted">No entries yet.</p>}
      </section>
      <section className="panel">
        <h2>Open And Upcoming</h2>
        {!p.delivered && <p className="muted">Deliver the project to enter it. You can still see what it could qualify for.</p>}
        <ul className="list">
          {relevant.map((e) => {
            const inst = institution(e.institutionId);
            const fits = categoriesFor(inst, e.year).filter((c) => c.formats.includes(p.axes.format));
            if (!fits.length) return null;
            const elig = fits.map((c) => ({ c, r: checkEligibility(g, p, e, c) }));
            const ok = elig.filter((x) => x.r.eligible);
            return (
              <li key={e.id}>
                <div className="row">
                  <span className="grow"><button className="btn btn-quiet" onClick={() => store.go({ view: 'event', editionId: e.id })}>{e.label}</button><span className="dim"> · Entries close {formatDateKey(dateKey(e.deadline, zone))}</span></span>
                  <span className={`chip ${ok.length ? 'good' : ''}`}>{ok.length ? `${plural(ok.length, 'Category', 'Categories')} Open To You` : 'Not Eligible Now'}</span>
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

function entryStatus(s: string): string {
  return ({ submitted: 'Submitted', 'needs-correction': 'Needs Correction', rejected: 'Not Accepted', withdrawn: 'Withdrawn', accepted: 'Accepted For Consideration', selected: 'Selected', 'not-selected': 'Not Selected', nominated: 'Nominated', 'not-nominated': 'Not Nominated', won: 'Won', lost: 'Did Not Win' } as Record<string, string>)[s] ?? s;
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
  const delivered = g.projects.filter((p) => p.delivered);
  const startL = longLocal(ed.start, place.zone);
  const endL = longLocal(ed.end, place.zone);
  const dlOrg = longLocal(ed.deadline, place.zone);
  const dlMine = longLocal(ed.deadline, myZone);
  return (
    <>
      <Breadcrumbs items={[{ label: 'Calendar', route: { view: 'calendar' } }, { label: ed.label }]} />
      <h1>{ed.label}</h1>
      <p className="muted">{inst.description}</p>
      <div className="btn-row" style={{ marginBottom: 16 }}><FollowButton id={inst.id} /></div>
      {err && <div className="alert bad" role="alert"><p>{err}</p></div>}
      <div className="panel-grid">
        <section className="panel">
          <h2>When And Where</h2>
          <dl className="kv">
            <dt>Where</dt><dd>{placeLabel(place)}</dd>
            <dt>{inst.kind === 'festival' ? 'Dates' : 'Ceremony'}</dt><dd>{inst.kind === 'festival' ? `${startL.date} to ${endL.date}` : `${startL.weekday}, ${startL.date}, ${startL.time} local time`}</dd>
            <dt>Entries Close</dt><dd>{dlOrg.date}, {dlOrg.time} local time ({dlMine.weekday} {dlMine.time} your time)</dd>
            {inst.kind === 'award' && <><dt>Eligibility Period</dt><dd>{formatDateKey(ed.eligibility.from)} to {formatDateKey(ed.eligibility.to)}</dd></>}
            <dt>Status</dt><dd>{{ upcoming: 'Entries not open yet', open: 'Open for entries', closed: 'Entries closed', judging: 'Judging', announced: inst.kind === 'festival' ? 'Selection announced' : 'Nominations announced', complete: 'Finished' }[ed.status]}</dd>
          </dl>
          <p className="dim">{ed.provenance === 'official' ? `These dates were announced by the organizer.${ed.deadlinePlanned ? ' The entry deadline is a planning date.' : ''} Rules in this game are simulated.` : "Dates haven't been announced. Planning dates are shown. Rules in this game are simulated."}</p>
        </section>
        {(ed.screenings ?? []).length > 0 && <ScreeningsPanel editionId={ed.id} />}
        <section className="panel">
          <h2>{inst.kind === 'festival' ? 'Sections' : 'Categories'}</h2>
          <ul className="list">
            {categoriesFor(inst, ed.year).map((c) => {
              const res = ed.results[c.id];
              return (
                <li key={c.id}>
                  <div className="row">
                    <span className="grow"><strong>{c.name}</strong>{!c.competitive ? <span className="chip"> Not Competitive</span> : null}<div className="dim">{c.judging === 'audience' ? 'Decided by audiences.' : c.judging === 'jury' ? 'Decided by a jury.' : c.judging === 'members' ? 'Voted by members.' : 'Chosen by programmers.'}{c.fee ? ` Entry fee ${money(c.fee)}.` : ''}{c.premiere === 'world' ? ' World premieres only.' : c.premiere === 'international' ? ' International premieres only.' : ''}{c.actingTitle ? ` For performers credited as ${c.actingTitle.toLowerCase()}.` : ''}</div></span>
                    {delivered.length > 0 && ed.deadline > g.now && <button className="btn btn-small" onClick={() => setPreparing({ projectId: delivered[0].id, cat: c })}>Prepare Submission</button>}
                  </div>
                  {res?.revealed && (
                    <div className="dim">
                      {res.winner ? `Winner: ${g.projects.find((x) => x.id === res.winner)?.title ?? ed.rivals.find((r) => r.id === res.winner)?.title}. ` : ''}
                      {inst.kind === 'festival' ? 'Selected' : 'Nominees'}: {[...res.projectIds.map((id) => g.projects.find((x) => x.id === id)?.title), ...res.rivalIds.slice(0, 8).map((id) => ed.rivals.find((r) => r.id === id)?.title)].filter(Boolean).join(', ')}{res.rivalIds.length > 8 ? ', and others' : ''}.
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <section className="panel">
          <h2>Your Entries</h2>
          {ed.entries.length ? (
            <ul className="list">
              {ed.entries.map((x) => {
                const p = g.projects.find((pp) => pp.id === x.projectId);
                const cat = inst.categories.find((c) => c.id === x.categoryId);
                return (
                  <li key={x.id} className="row">
                    <span className="grow">{p?.title}: {cat?.name} <span className="chip">{entryStatus(x.status)}</span>{x.reason ? <div className="dim">{x.reason}</div> : null}</span>
                    {['submitted', 'accepted'].includes(x.status) && <button className="btn btn-small" onClick={() => setErr(store.act((s) => withdrawEntry(s, ed.id, x.id)))}>Withdraw Entry</button>}
                  </li>
                );
              })}
            </ul>
          ) : <p className="muted">You haven't entered anything here.</p>}
          {(ed.entries.some((x) => x.status === 'selected' || x.status === 'nominated')) && ed.start > g.now && (
            <button className="btn spaced" onClick={() => setErr(store.act((s) => {
              if (s.plans.some((pl) => pl.title === `Attend ${ed.label}` && pl.status === 'upcoming')) throw new Error("You've already planned to attend.");
              s.plans.push({ id: `p-${ed.id}`, title: `Attend ${ed.label}`, start: ed.start, durationMin: 180, remindMin: 1440, placeId: inst.placeId, kind: 'project', status: 'upcoming' });
            }))}>Plan To Attend</button>
          )}
          <p className="dim">Attending is optional. Results don't depend on it.</p>
        </section>
      </div>
      {preparing && <SubmissionDialog editionId={ed.id} cat={preparing.cat} onClose={() => setPreparing(null)} onError={setErr} />}
    </>
  );
}

function SubmissionDialog({ editionId, cat, onClose, onError }: { editionId: string; cat: Category; onClose: () => void; onError: (e: string | null) => void }) {
  const g = useGame();
  const ed = edition(g, editionId);
  const delivered = g.projects.filter((p) => p.delivered);
  const [projectId, setProjectId] = useState(delivered[0]?.id ?? '');
  const p = delivered.find((x) => x.id === projectId);
  const [recipients, setRecipients] = useState<string[]>([]);
  if (!p) return null;
  const el = checkEligibility(g, p, ed, cat, recipients.length ? recipients : undefined);
  const pool = categoryRecipients(g, p, cat);
  const personal = ['lead', 'supporting', 'voice'].includes(cat.recipient);
  return (
    <Modal title="Prepare Submission" onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" disabled={!el.eligible} onClick={() => { const e = store.act((s) => void submitEntry(s, p, editionId, cat.id, recipients.length ? recipients : undefined)); onError(e); if (!e) onClose(); }}>Submit Entry</button>
    </>}>
      <p><strong>{cat.name}</strong>, {ed.label}</p>
      <SelectField label="Project" value={projectId} options={delivered.map((x) => ({ value: x.id, label: x.title }))} onChange={(v) => { setProjectId(v); setRecipients([]); }} />
      {personal && pool.length > 0 && (
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend style={{ fontWeight: 600 }}>Performance To Enter</legend>
          {pool.map((c) => <Check key={c.id} label={`${c.personName} as ${c.characterName}`} checked={recipients.includes(c.id)} onChange={(v) => setRecipients(v ? [c.id] : [])} />)}
        </fieldset>
      )}
      {el.eligible ? (
        <div className="alert good"><p>This entry meets the game's rules for this category.{el.provisional ? ' It counts on a planned release that must happen within the eligibility period.' : ''}</p></div>
      ) : (
        <div className="alert"><p>This entry can't be submitted yet:</p><ul>{el.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
      )}
      {cat.fee > 0 && <p>Entry fee: {money(cat.fee)}, paid from the project's budget.</p>}
      <p>Credited for this category: {el.recipients.map((r) => r.personName).join(', ') || 'No one yet'}.</p>
      <p className="dim">Eligibility is necessary but doesn't guarantee selection or a win.</p>
    </Modal>
  );
}

export { Fragment, approvedCharacters };

/** Motion capture by character: booking, takes, the approved take and retakes. */
function MocapPanel({ p }: { p: Project }) {
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ charId: string; takeId: string; names: string[] } | null>(null);
  const caps = p.tasks.filter((t) => t.kind === 'anim:mocap' && t.assetRef);
  const act = (fn: (s: GameState, proj: Project) => void) => setError(store.act((s) => fn(s, s.projects.find((x) => x.id === p.id)!)));
  return (
    <section className="panel" aria-labelledby="mocap-h">
      <h2 id="mocap-h">Motion Capture</h2>
      <p className="dim">Book the capture stage, rehearse and calibrate, then capture. Choose the take that goes forward; cleanup and retargeting start from it.</p>
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
            <div className="btn-row">
              {!booked && cap.status !== 'done' && (
                <button className="btn btn-primary" onClick={() => act((s, proj) => bookMocap(s, proj, charId))}>Book Capture Stage ({money(bookingCost(p, charId))})</button>
              )}
              {booked && (
                <>
                  <button className="btn" onClick={() => act((s, proj) => requestRetake(s, proj, charId))}>Request A Retake ({money(MOCAP_SESSION_STAGE)})</button>
                  {cap.status !== 'done' && <button className="btn btn-danger" onClick={() => act((s, proj) => { cancelMocapBooking(s, proj, charId); })}>Cancel Booking</button>}
                </>
              )}
            </div>
            {booked && cap.status !== 'done' && <p className="dim">{cancellationTerms(p, charId)}</p>}
            {rec && rec.takes.length > 0 && (
              <ul className="list" aria-label={`Takes For ${name}`}>
                {rec.takes.map((t, i) => (
                  <li key={t.id} className="row">
                    <span className="grow">Take {i + 1}{t.retake ? ' (Retake)' : ''}: quality {t.quality} · {formatDateKey(t.date, true)}</span>
                    {rec.approvedTakeId === t.id ? <span className="chip good">Approved</span> : (
                      <button className="btn btn-small" aria-label={`Approve Take ${i + 1} For ${name}`} onClick={() => {
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
    <section className="panel" aria-labelledby="scr-h">
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
              <div><strong>{p?.title ?? 'Your film'}</strong>: {when.weekday}, {when.date}, {when.time} at the {ed.label}, {venue.name}.</div>
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
                <div className="btn-row">
                  {open && travel.here && <button className="btn btn-primary btn-small" onClick={accept}>Attend Screening</button>}
                  {open && !travel.here && travel.arrivesInTime && <button className="btn btn-primary btn-small" onClick={accept}>Accept Invitation</button>}
                  {sc.rsvp === 'accepted' && !travel.here && travel.arrivesInTime && !g.travel && <button className="btn btn-small" onClick={travelThere}>Travel to the Venue</button>}
                  {conflicts.length > 0 && p && <button className="btn btn-small" onClick={() => store.go({ view: 'project', projectId: p.id, tab: 'schedule' })}>View Schedule</button>}
                  {(open || sc.rsvp === 'accepted') && <button className="btn btn-small" onClick={decline}>Decline Invitation</button>}
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
