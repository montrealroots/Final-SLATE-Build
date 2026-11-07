import { Fragment, useState } from 'react';
import { languageName } from '../data/identity';
import { getPlace } from '../data/places';
import {
  BACKERS, EXPERIENCE, acceptCounter, acceptDeal, approachBacker, approvedCharacters, approvedScenes, backerOptions, castPlayer, dealTerms, deals, financeSummary, refuseDeal, setFinanceTarget, castRoleFor, categoryTotals,
  coachingNeeded, dateKey, declineCounter, estimateDays, fitNotes, forecast, formatDateKey, generatePlan, isAvailable, isEpisodic, keepWeatherPlan,
  ledgerTotals, makeOffer, money, neededRoles, personById, productionWindow, sharedHeritages, observance, proposeStaffing, puppetStatus, releaseHire, roleCandidates, roleLabel,
  sceneLabel, sceneTechnique, sendStaffingOffers, skillLabel, moveShootDay, swapWithInteriorDay, uncastPlayer, withdrawOffer, addDaysToKey, type Person,
  type StaffingProposal, covers,
} from '../engine';
import { breakdownComplete, characterPronouns, pronounsMatch } from '../engine/script-explain';
import type { FinanceDeal, GameState, Hire, PerformanceMethod, Project } from '../engine/types';
import { Check, Modal, NumberField, SelectField, TextField, plural } from './components';
import { store, useGame } from './store';

function NeedsApproval({ p, what }: { p: Project; what: string }) {
  return (
    <div className="card">
      <h2>Approve A Draft First</h2>
      <p>{what} comes from your approved script. {p.drafts.length ? 'Approve a draft in the Script section.' : 'Save a draft in the Script section, then approve it.'}</p>
      <button className="btn" onClick={() => { store.route = { ...store.route, tab: 'script' }; store.emit(); }}>Open Script</button>
    </div>
  );
}

const STATUS_LABEL: Record<Hire['status'], string> = { offered: 'Offer Sent', accepted: 'Accepted', declined: 'Declined', released: 'Released', countered: 'Counteroffer' };

function HireRow({ p, h }: { p: Project; h: Hire }) {
  const g = useGame();
  const person = personById(g, h.personId);
  const [err, setErr] = useState<string | null>(null);
  const zone = getPlace(p.axes.basePlaceId).zone;
  return (
    <tr>
      <td data-label="Person">{person.name}</td>
      <td data-label="Role">{h.characterId ? `${approvedCharacters(p).find((c) => c.id === h.characterId)?.name ?? 'Role'} (${h.method === 'voice' ? 'Voice' : 'On Camera'})` : roleLabel(h.roleId)}</td>
      <td data-label="Rate">{money(h.dayRate)} a day, about {plural(h.estDays, 'day')}</td>
      <td data-label="Status">
        <span className={`chip ${h.status === 'accepted' ? 'chip-positive' : h.status === 'declined' ? 'chip-negative' : h.status === 'countered' ? 'chip-warning' : ''}`}>{STATUS_LABEL[h.status]}</span>
        {h.status === 'offered' && <div className="dim">Answer by about {formatDateKey(dateKey(h.responseAt, zone))}</div>}
        {h.status === 'countered' && <div className="dim">Asks {money(h.counterRate ?? 0)} a day</div>}
        {h.daysWorked > 0 && <div className="dim">{plural(h.daysWorked, 'day')} worked</div>}
        {err && <div role="alert" style={{ color: 'var(--negative)' }}>{err}</div>}
      </td>
      <td data-label="">
        <div className="row gap-2 wrap">
          {h.status === 'countered' && <><button className="btn btn-sm btn-primary" onClick={() => setErr(store.act((s) => void acceptCounter(s, p, h.id)))}>Accept Counteroffer</button><button className="btn btn-sm" onClick={() => setErr(store.act((s) => declineCounter(s, p, h.id)))}>Decline Counteroffer</button></>}
          {h.status === 'offered' && <button className="btn btn-sm" onClick={() => setErr(store.act((s) => withdrawOffer(s, p, h.id)))}>Withdraw Offer</button>}
          {h.status === 'accepted' && !p.delivered && <button className="btn btn-sm btn-danger" onClick={() => setErr(store.act((s) => releaseHire(s, p, h.id)))}>Release</button>}
        </div>
      </td>
    </tr>
  );
}

function HireTable({ p, hires }: { p: Project; hires: Hire[] }) {
  if (!hires.length) return null;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead><tr><th>Person</th><th>Role</th><th>Rate</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{hires.map((h) => <HireRow key={h.id} p={p} h={h} />)}</tbody>
      </table>
    </div>
  );
}

function CandidateList({ p, roleId, characterId, method, onDone }: { p: Project; roleId: string; characterId?: string; method?: PerformanceMethod; onDone: () => void }) {
  const g = useGame();
  const win = productionWindow(g, p);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [err, setErr] = useState<Record<string, string>>({});
  const [onlyFree, setOnlyFree] = useState(true);
  const [pronounsFirst, setPronounsFirst] = useState(false);
  const part = characterId ? approvedCharacters(p).find((x) => x.id === characterId) : undefined;
  const fits = (c: Person) => !part || pronounsMatch(part, c.pronouns);
  // Matching the part's written pronouns is marked, and listing matches first is the producer's choice: it is a casting
  // preference, never a measure of ability, and nobody is filtered out (until the review of November 7, 2026 it always sorted).
  const list = roleCandidates(g, p, roleId).map((c) => ({ c, av: isAvailable(g, c, win.from, win.to, p.id) })).filter((x) => !onlyFree || x.av.ok)
    .sort((a, b) => (pronounsFirst ? Number(fits(b.c)) - Number(fits(a.c)) : 0) || b.c.experience - a.c.experience || a.c.dayRate - b.c.dayRate);
  const days = estimateDays(p, roleId, characterId, method);
  return (
    <div className="spaced">
      <p className="muted">Production window: {formatDateKey(win.from)} to {formatDateKey(win.to)}. About {plural(days, 'paid day')}. Uncommitted funds: {money(ledgerTotals(p).available)}.</p>
      {part && <p className="dim">{breakdownComplete(part) ? `Offers include ${part.name}'s casting breakdown (description, wants and fears).` : `Offers go with the script pages. ${part.name}'s casting breakdown isn't written yet (description, wants and fears on the Characters page); it doesn't change who accepts.`}</p>}
      <Check label="Only Show People Who Are Free" checked={onlyFree} onChange={setOnlyFree} />
      {part && characterPronouns(part) && <Check label="List Matching Pronouns First" checked={pronounsFirst} onChange={setPronounsFirst} />}
      <ul className="list">
        {list.map(({ c, av }) => {
          const notes = characterId ? fitNotes(g, p, c, characterId) : [];
          const rate = rates[c.id] ?? c.dayRate;
          return (
            <li key={c.id}>
              <div className="row-wrap">
                <div className="grow">
                  <strong>{c.name}</strong> <span className="chip">{EXPERIENCE[c.experience - 1]}</span>{part && characterPronouns(part) && fits(c) && <> <span className="chip chip-positive">Pronouns Match</span></>}
                  <div className="dim">{c.samples} Speaks {c.languages.map(languageName).join(', ')}.{c.playingAge ? ` Plays ages ${c.playingAge[0]} to ${c.playingAge[1]}.` : ''} Background: {c.heritages.join(', ')}. Asks {money(c.dayRate)} a day.</div>
                  {characterId && sharedHeritages(g, p, characterId, c.id).length > 0 && <div><span className="chip">Shares A Background: {sharedHeritages(g, p, characterId, c.id).join(', ')}</span></div>}
                  {!av.ok && <div className="dim" style={{ color: 'var(--warning)' }}>{av.reason}</div>}
                  {notes.map((n) => <div key={n} className="dim" style={{ color: 'var(--warning)' }}>{n}</div>)}
                </div>
                <div className="inline-form" style={{ maxWidth: 320 }}>
                  <NumberField label={`Day Rate For ${c.name}`} value={rate} min={1} onChange={(v) => setRates({ ...rates, [c.id]: v })} />
                  <button className="btn btn-primary" onClick={() => {
                    const e = store.act((s) => void makeOffer(s, p, { personId: c.id, roleId, dayRate: rate, characterId, method }));
                    if (e) setErr({ ...err, [c.id]: e });
                    else onDone();
                  }}>Make Offer</button>
                </div>
              </div>
              {err[c.id] && <p role="alert" style={{ color: 'var(--negative)' }}>{err[c.id]}</p>}
            </li>
          );
        })}
      </ul>
      {!list.length && <p>No one is free for this production window. Try showing everyone, or move your start date.</p>}
    </div>
  );
}

// ---------------- Cast ----------------

export function CastTab({ p }: { p: Project }) {
  const g = useGame();
  const [searching, setSearching] = useState<{ characterId: string; method: PerformanceMethod } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (p.approvedDraft === null) return <NeedsApproval p={p} what="The cast list" />;
  const chars = approvedCharacters(p).filter((c) => approvedScenes(p).some((s) => s.participants.includes(c.id)));
  const coaching = coachingNeeded(g, p);
  return (
    <>
      {err && <div className="callout callout-negative" role="alert"><p>{err}</p></div>}
      {coaching.length > 0 && <div className="callout callout-warning"><p>{coaching.join(' and ')} {coaching.length === 1 ? 'needs' : 'need'} coaching in a dialogue language. Hire a dialect and language coach in Crew.</p></div>}
      <section className="card">
        <h2>Roles</h2>
        <p className="muted">You can cast yourself in any role, or stay behind the camera. Writing a character doesn't earn an acting credit.</p>
        <ul className="list">
          {chars.map((c) => {
            const methods: PerformanceMethod[] = c.roleSize === 'background' ? [] : p.axes.medium === 'animation'
              ? ['voice', ...(c.methods.includes('motion-capture') ? ['motion-capture' as const] : [])]
              : c.methods.filter((m) => m === 'on-camera' || m === 'voice' || m === 'motion-capture');
            return (
              <li key={c.id}>
                <div className="row-wrap">
                  <div className="grow">
                    <strong>{c.name}</strong> <span className="dim">{c.roleSize} · {plural(approvedScenes(p).filter((s) => s.participants.includes(c.id)).length, 'scene')}</span>
                    {c.roleSize === 'background' && <div className="dim">Background performers are booked per shoot day.</div>}
                    {!!c.heritages?.length && <div className="dim">Written as {c.heritages.join(', ')}.{sharedHeritages(g, p, c.id, 'player').length ? ' You share a background with this part.' : ''}</div>}
                  </div>
                </div>
                {methods.map((m) => {
                  const a = p.cast.find((x) => x.characterId === c.id && x.method === m);
                  const pending = p.hires.find((h) => h.characterId === c.id && h.method === m && (h.status === 'offered' || h.status === 'countered'));
                  return (
                    <div key={m} className="row-wrap spaced">
                      <span className="grow">{m === 'voice' ? 'Voice' : m === 'motion-capture' ? 'Performance Capture' : 'On Camera'}: {a ? (a.performer === 'player' ? <strong>You</strong> : <strong>{personById(g, a.performer).name}</strong>) : pending ? <span className="muted">Offer out to {personById(g, pending.personId).name}</span> : <span className="muted">Not cast</span>}{a && sharedHeritages(g, p, c.id, a.performer).length > 0 && <> <span className="chip">Shares A Background</span></>}</span>
                      <div className="row gap-2 wrap">
                        {!a && !pending && <button className="btn btn-sm" onClick={() => setSearching({ characterId: c.id, method: m })}>Find Performers</button>}
                        {!a && !pending && <button className="btn btn-sm" onClick={() => setErr(store.act((s) => void castPlayer(s, p, c.id, m)))}>Cast Yourself</button>}
                        {a?.performer === 'player' && !p.delivered && <button className="btn btn-sm" onClick={() => setErr(store.act(() => uncastPlayer(p, c.id)))}>Step Out Of This Role</button>}
                      </div>
                    </div>
                  );
                })}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="card">
        <h2>Offers And Contracts</h2>
        <HireTable p={p} hires={p.hires.filter((h) => h.kind === 'cast')} />
        {!p.hires.some((h) => h.kind === 'cast') && <p className="muted">No offers yet.</p>}
      </section>
      {searching && (
        <Modal title={`Cast ${approvedCharacters(p).find((c) => c.id === searching.characterId)?.name}`} onClose={() => setSearching(null)} footer={<button className="btn" onClick={() => setSearching(null)}>Close</button>}>
          <CandidateList p={p} roleId={castRoleFor(searching.method)} characterId={searching.characterId} method={searching.method} onDone={() => setSearching(null)} />
        </Modal>
      )}
    </>
  );
}

// ---------------- Crew ----------------

export function CrewTab({ p }: { p: Project }) {
  const g = useGame();
  const [finding, setFinding] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ dept: string; proposals: StaffingProposal[]; skipped: string[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (p.approvedDraft === null) return <NeedsApproval p={p} what="The crew list" />;
  const needed = neededRoles(p, g);
  const depts = [...new Set(needed.map((r) => r.dept))];
  const status = (roleId: string) => {
    const hs = p.hires.filter((h) => h.roleId === roleId);
    if (hs.some((h) => h.status === 'accepted')) return { label: `Hired (${hs.filter((h) => h.status === 'accepted').length})`, cls: 'chip-positive' };
    const cover = p.hires.find((h) => h.status === 'accepted' && covers(h.roleId, roleId));
    if (cover) return { label: `Covered By Your ${roleLabel(cover.roleId)}`, cls: 'chip-positive' };
    if (hs.some((h) => h.status === 'offered' || h.status === 'countered')) return { label: 'Offer Out', cls: 'chip-warning' };
    return { label: 'Not Hired', cls: '' };
  };
  return (
    <>
      {msg && <div className="callout callout-info" role="status"><p>{msg}</p></div>}
      {isEpisodic(p.axes.format) && <EpisodeAssignments p={p} />}
      {depts.map((d) => (
        <section key={d} className="card">
          <div className="row-between wrap">
            <h2 style={{ margin: 0 }}>{d}</h2>
            <button className="btn btn-sm" disabled={!!p.delivered} onClick={() => setProposal({ dept: d, ...proposeStaffing(g, p, d) })}>Staff This Department</button>
          </div>
          <ul className="list spaced">
            {needed.filter((r) => r.dept === d).map((r) => {
              const st = status(r.roleId);
              return (
                <li key={r.roleId} className="row-wrap">
                  <div className="grow">
                    <strong>{roleLabel(r.roleId)}</strong> <span className={`chip ${st.cls}`}>{st.label}</span> {!r.required && <span className="chip">Optional</span>}
                    <div className="dim">{r.reason}</div>
                  </div>
                  <button className="btn btn-sm" disabled={!!p.delivered} onClick={() => setFinding(r.roleId)}>Find Candidates</button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <section className="card">
        <h2>Crew Offers And Contracts</h2>
        <HireTable p={p} hires={p.hires.filter((h) => h.kind === 'crew')} />
        {!p.hires.some((h) => h.kind === 'crew') && <p className="muted">No crew offers yet.</p>}
      </section>
      {finding && (
        <Modal title={`Hire A ${roleLabel(finding)}`} onClose={() => setFinding(null)} footer={<button className="btn" onClick={() => setFinding(null)}>Close</button>}>
          <CandidateList p={p} roleId={finding} onDone={() => setFinding(null)} />
        </Modal>
      )}
      {proposal && (
        <Modal title={`Staff ${proposal.dept}`} onClose={() => setProposal(null)} footer={<>
          <button className="btn" onClick={() => setProposal(null)}>Cancel</button>
          <button className="btn btn-primary" disabled={!proposal.proposals.length} onClick={() => {
            let res = { sent: 0, failed: [] as string[] };
            store.act((s) => { res = sendStaffingOffers(s, p, proposal.proposals); });
            setMsg(`${plural(res.sent, 'offer')} sent.${res.failed.length ? ` ${res.failed[0]}` : ''}`);
            setProposal(null);
          }}>Send Offers</button>
        </>}>
          <p className="muted">Review these suggestions before any offers go out. They're the most affordable available people with some experience.</p>
          {proposal.proposals.length ? (
            <ul className="list">{proposal.proposals.map((x) => <li key={x.roleId}><strong>{roleLabel(x.roleId)}</strong>: {x.name}, {money(x.dayRate)} a day for about {plural(x.days, 'day')} ({money(x.total)})</li>)}</ul>
          ) : <p>Every role here already has someone or an offer out.</p>}
          {proposal.skipped.map((x) => <p key={x} className="dim" style={{ color: 'var(--warning)' }}>{x}</p>)}
        </Modal>
      )}
    </>
  );
}

function EpisodeAssignments({ p }: { p: Project }) {
  const g = useGame();
  const [err, setErr] = useState<string | null>(null);
  const writers = p.hires.filter((h) => h.roleId === 'episode-writer' && h.status === 'accepted');
  const directors = p.hires.filter((h) => h.roleId === 'episode-director' && h.status === 'accepted');
  return (
    <section className="card">
      <h2>Episode Writers And Directors</h2>
      <p className="muted">As showrunner you can write and direct every episode, or hire episode writers and directors in Writing and Direction.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Episode</th><th>Written By</th><th>Directed By</th></tr></thead>
          <tbody>
            {p.episodes.map((e) => (
              <tr key={e.number}>
                <td data-label="Episode">{e.number}. {e.title}</td>
                <td data-label="Written By">
                  <SelectField label={`Writer For Episode ${e.number}`} value={e.writer} options={[{ value: 'player', label: 'You' }, ...writers.map((h) => ({ value: h.personId, label: personById(g, h.personId).name }))]}
                    onChange={(v) => setErr(store.act(() => { if (p.delivered) throw new Error('This project has been delivered.'); e.writer = v; }))} />
                </td>
                <td data-label="Directed By">
                  <SelectField label={`Director For Episode ${e.number}`} value={e.director} options={[{ value: 'player', label: 'You' }, ...directors.map((h) => ({ value: h.personId, label: personById(g, h.personId).name }))]}
                    onChange={(v) => setErr(store.act(() => { if (p.delivered) throw new Error('This project has been delivered.'); e.director = v; }))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!neededRoles(p, g).some((r) => r.roleId === 'episode-director') && (
        <div className="row gap-2 wrap">
          <HireExtra p={p} roleId="episode-writer" />
          <HireExtra p={p} roleId="episode-director" />
        </div>
      )}
    </section>
  );
}

function HireExtra({ p, roleId }: { p: Project; roleId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-sm" onClick={() => setOpen(true)}>Hire An {roleLabel(roleId)}</button>
      {open && (
        <Modal title={`Hire An ${roleLabel(roleId)}`} onClose={() => setOpen(false)} footer={<button className="btn" onClick={() => setOpen(false)}>Close</button>}>
          <CandidateList p={p} roleId={roleId} onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

// ---------------- Schedule ----------------

export function ScheduleTab({ p }: { p: Project }) {
  const g = useGame();
  const place = getPlace(p.axes.basePlaceId);
  const today = dateKey(g.now, place.zone);
  const [start, setStart] = useState(p.schedule.startDate ?? addDaysToKey(today, 14));
  const [err, setErr] = useState<string | null>(null);
  if (p.approvedDraft === null) return <NeedsApproval p={p} what="The schedule" />;
  const animChars = approvedCharacters(p).filter((c) => approvedScenes(p).some((s) => s.participants.includes(c.id) && sceneTechnique(p, s) === 'stop-motion'));
  const has3d = approvedScenes(p).some((s) => sceneTechnique(p, s) === '3d-cg');
  const set = (fn: () => void) => setErr(store.act(fn));
  const days = [...p.schedule.days].sort((a, b) => (a.date < b.date ? -1 : 1));
  return (
    <>
      <section className="card">
        <h2>Plan</h2>
        <div className="grid grid-3 form">
          <TextField label="Production Start" type="date" value={start} onChange={setStart} />
          <NumberField label="Rehearsal Days" value={p.schedule.rehearsalDays} min={0} max={20} onChange={(v) => set(() => (p.schedule.rehearsalDays = Math.max(0, Math.min(20, Math.round(v || 0)))))} />
          {animChars.length > 0 && <NumberField label="Stop-Motion Stages" value={p.schedule.stages} min={1} max={20} hint="Each stage holds one shot at a time." onChange={(v) => set(() => (p.schedule.stages = Math.max(1, Math.min(20, Math.round(v || 1)))))} />}
          {has3d && <NumberField label="Render Nodes" value={p.schedule.renderNodes} min={1} max={500} hint="Finite render capacity, paid per node day." onChange={(v) => set(() => (p.schedule.renderNodes = Math.max(1, Math.min(500, Math.round(v || 1)))))} />}
        </div>
        <Check label="Six-Day Weeks" checked={p.schedule.sixDayWeeks} onChange={(v) => set(() => (p.schedule.sixDayWeeks = v))} />
        <Check label="Work On Public Holidays" hint={`Holiday work is paid at 1.5 times the day rate in this game. Holidays follow ${place.countryName}${p.schedule.observances?.length ? `, and the holidays you keep (${p.schedule.observances.map((id) => observance(id)?.name).filter(Boolean).join(', ')}) are kept free too` : ''}.`} checked={p.schedule.workHolidays} onChange={(v) => set(() => (p.schedule.workHolidays = v))} />
        {animChars.length > 0 && (
          <>
            <h3>Puppets</h3>
            <p className="dim">A puppet can only be on one stage at a time. Duplicates let more shots run at once but cost more to build.</p>
            <div className="grid grid-3 form">
              {animChars.map((c) => (
                <div key={c.id}>
                  <NumberField label={`${c.name} Puppet Copies`} value={p.schedule.puppetCopies[c.id] ?? 1} min={1} max={6} onChange={(v) => set(() => (p.schedule.puppetCopies[c.id] = Math.max(1, Math.min(6, Math.round(v || 1)))))} />
                  {p.tasks.length > 0 && <p className="dim">{puppetStatus(p, c.id)}</p>}
                </div>
              ))}
            </div>
          </>
        )}
        {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
        <button className="btn btn-primary" disabled={!!p.delivered} onClick={() => setErr(store.act((s) => void generatePlan(s, p, start)))}>{p.schedule.startDate ? 'Rebuild Schedule' : 'Build Schedule'}</button>
        {p.schedule.startDate && <p className="dim">Rebuilding keeps finished work and moves only what hasn't happened yet.</p>}
      </section>
      <section className="card">
        <h2>Shoot Days</h2>
        {!days.length && <p className="muted">{p.schedule.startDate ? 'This project has no live-action shoot days.' : 'Build a schedule to see shoot days.'}</p>}
        <ul className="list">
          {days.map((d) => {
            const fc = d.status === 'scheduled' && d.date >= today ? forecast(g.seed, place, d.date, today) : null;
            return (
              <li key={d.id}>
                <div className="row-wrap">
                  <div className="grow">
                    <strong>{formatDateKey(d.date, true)}</strong>{isEpisodic(p.axes.format) ? ` · Episode ${d.episode}` : ''} · {d.locationLabel} ({d.interior ? 'Interior' : 'Exterior'}{d.night ? ', Night' : ''}) <span className={`chip ${d.status === 'shot' ? 'chip-positive' : d.status === 'lost' ? 'chip-negative' : d.status === 'partial' ? 'chip-warning' : ''}`}>{{ scheduled: 'Scheduled', shot: 'Shot', partial: 'Partly Shot', lost: 'Lost', moved: 'Moved', cancelled: 'Cancelled' }[d.status]}</span>
                    <div className="dim">{d.sceneIds.map((id) => { const sc = approvedScenes(p).find((s) => s.id === id); return sc ? sceneLabel(p, sc) : 'Removed scene'; }).join(', ')}{d.playerActing ? ' · You act today' : ''}</div>
                    {fc && !d.interior && fc.leadDays <= 10 && <div className="dim">Forecast: {fc.summary}, {fc.chanceOfPrecip}% chance of rain or snow.</div>}
                    {d.result && <div className="dim">{d.result}</div>}
                    {d.conflicts.map((c) => <div key={c} className="dim" style={{ color: 'var(--warning)' }}>{c}</div>)}
                  </div>
                  {fc && !d.interior && fc.chanceOfPrecip >= 40 && (
                    <div className="row gap-2 wrap">
                      <button className="btn btn-sm" onClick={() => setErr(store.act((s) => void moveShootDay(s, p, d.id)))}>Move the Shoot</button>
                      {p.schedule.days.some((o) => o.interior && o.status === 'scheduled' && o.date > d.date) && <button className="btn btn-sm" onClick={() => setErr(store.act((s) => void swapWithInteriorDay(s, p, d.id)))}>Film an Interior Scene</button>}
                      <button className="btn btn-sm" aria-pressed={!!d.weatherAnyway} onClick={() => setErr(store.act((s) => keepWeatherPlan(s, p, d.id)))}>{d.weatherAnyway ? 'Shooting In Any Weather' : 'Keep The Plan'}</button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

// ---------------- Budget ----------------

export function BudgetTab({ p }: { p: Project }) {
  useGame();
  const t = ledgerTotals(p);
  const cats = categoryTotals(p);
  return (
    <>
      <section className="card">
        <h2>Summary</h2>
        <dl className="kv">
          <dt>Received From Backers</dt><dd>{money(p.funding.fund)}</dd>
          {p.funding.extra.map((e) => <Fragment key={e.label}><dt>{e.label}</dt><dd>{money(e.amount)}</dd></Fragment>)}
          {p.revenue > 0 && <><dt>Distribution Income</dt><dd>{money(p.revenue)}</dd></>}
          <dt>Spent</dt><dd>{money(t.settled)}</dd>
          <dt>Agreed But Unpaid</dt><dd>{money(t.committedOutstanding)}</dd>
          <dt>Held For Open Offers</dt><dd>{money(t.reserved)}</dd>
          <dt>Uncommitted</dt><dd><strong>{money(t.available)}</strong></dd>
        </dl>
        <div className="meter spaced" role="img" aria-label={`${Math.round((t.settled / Math.max(1, t.fund)) * 100)} percent spent`}><span style={{ width: `${Math.min(100, (t.settled / Math.max(1, t.fund)) * 100)}%` }} /></div>
        <p className="dim">Rates and fees are game assumptions, not quoted industry prices.</p>
      </section>
      <section className="card">
        <h2>By Category</h2>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Category</th><th>Planned</th><th>Paid</th></tr></thead>
            <tbody>{Object.entries(cats).map(([k, v]) => <tr key={k}><td data-label="Category">{k.charAt(0).toUpperCase() + k.slice(1)}</td><td data-label="Planned">{money(v.planned)}</td><td data-label="Paid">{money(v.settled)}</td></tr>)}</tbody>
          </table>
        </div>
        {!Object.keys(cats).length && <p className="muted">Nothing has been committed yet.</p>}
      </section>
      <section className="card">
        <h2>Budget Lines</h2>
        <details>
          <summary>{plural(p.obligations.length, 'line')}</summary>
          <ul className="list">
            {[...p.obligations].reverse().slice(0, 120).map((o) => (
              <li key={o.id} className="row-wrap"><span className="grow">{o.label}</span><span>{money(o.settled)} of {money(o.amount)} <span className="chip">{{ reserved: 'Held', committed: 'Agreed', settled: 'Paid', cancelled: 'Cancelled' }[o.state]}</span></span></li>
            ))}
          </ul>
        </details>
      </section>
      <FinancingPanel p={p} />
    </>
  );
}

/** Financing: the estimate, the target, what backers promised and paid, and who to approach next. */
function FinancingPanel({ p }: { p: Project }) {
  const g = useGame();
  const f = financeSummary(p);
  const [target, setTarget] = useState(f.target);
  const [targetErr, setTargetErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<FinanceDeal | null>(null);
  const status: Record<FinanceDeal['status'], string> = { considering: 'Considering', offered: 'Offer Made', declined: 'Said No', refused: 'You Turned Down', accepted: 'Backing', breached: 'Repayment Owed' };
  const live = (s: GameState) => s.projects.find((x) => x.id === p.id)!;
  return (
    <>
      <section className="card" aria-labelledby="fin-h">
        <h2 id="fin-h">Financing</h2>
        <p className="muted">Your budget size is an estimate. Money arrives only from backers whose terms you accept.</p>
        <dl className="kv">
          <dt>Budget Estimate</dt><dd>{money(f.estimate)}</dd>
          <dt>Financing Target</dt><dd>{money(f.target)}</dd>
          <dt>Promised By Backers</dt><dd>{money(f.promised)}</dd>
          <dt>Received</dt><dd>{money(f.received)}{f.owedOnDelivery > 0 ? ` (${money(f.owedOnDelivery)} more on delivery)` : ''}</dd>
          <dt>Still To Raise</dt><dd><strong>{money(f.stillToRaise)}</strong></dd>
        </dl>
        <div className="inline-form spaced">
          <NumberField label="Change Financing Target" value={target} min={1000} step={1000} error={targetErr} onChange={setTarget} />
          <button className="btn" onClick={() => setTargetErr(store.act((s) => setFinanceTarget(live(s), target)))}>Set Target</button>
        </div>
      </section>
      {deals(p).length > 0 && (
        <section className="card" aria-labelledby="backers-h">
          <h2 id="backers-h">Backers</h2>
          <ul className="list">
            {deals(p).map((d) => (
              <li key={d.id}>
                <div className="row-wrap">
                  <span className="grow"><strong>{d.backer}</strong>{d.amount ? `: ${money(d.amount)}` : ''}</span>
                  <span className={`chip ${d.status === 'accepted' ? 'chip-positive' : d.status === 'declined' || d.status === 'breached' ? 'chip-negative' : d.status === 'offered' ? 'chip-accent' : ''}`}>{status[d.status]}</span>
                </div>
                {d.status === 'considering' && <p className="muted">Their answer is due {formatDateKey(dateKey(d.decideAt ?? g.now, getPlace(p.axes.basePlaceId).zone))}.</p>}
                {d.reason && <p className="muted">{d.reason}</p>}
                {(d.status === 'offered' || d.status === 'accepted' || d.status === 'breached') && <ul className="dim">{dealTerms(d).map((t) => <li key={t}>{t}</li>)}</ul>}
                {(d.status === 'accepted' || d.status === 'breached') && d.terms.recoup > 0 && <p className="dim">Repaid so far: {money(d.repaid)} of {money(d.terms.recoup)}.</p>}
                {d.status === 'offered' && (
                  <div className="row gap-2 wrap">
                    <button className="btn btn-primary" onClick={() => setAccepting(d)}>Accept Offer</button>
                    <button className="btn" onClick={() => setErr(store.act((s) => refuseDeal(s, live(s), d.id)))}>Turn Down</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="card" aria-labelledby="raise-h">
        <h2 id="raise-h">Raise Money</h2>
        <ul className="list">
          {backerOptions(g, p).map((o) => (
            <li key={o.kind} className="row-wrap">
              <div className="grow">
                <strong>{BACKERS[o.kind].name}</strong>{o.kind === 'starting' ? <> <span className="chip">Agreed Starting Scenario</span></> : null}
                <p className="muted">{BACKERS[o.kind].who} {BACKERS[o.kind].why}</p>
                {!o.ready && <p className="dim">{o.needs}</p>}
              </div>
              <button className="btn btn-sm" disabled={!o.ready} onClick={() => setErr(store.act((s) => void approachBacker(s, live(s), o.kind)))} aria-label={`Approach ${BACKERS[o.kind].name}`}>{o.kind === 'starting' ? 'Ask For The Agreed Backing' : 'Approach'}</button>
            </li>
          ))}
        </ul>
        {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      </section>
      {accepting && (
        <Modal title="Accept These Terms?" onClose={() => setAccepting(null)} footer={<>
          <button className="btn" onClick={() => setAccepting(null)}>Not Yet</button>
          <button className="btn btn-primary" onClick={() => { setErr(store.act((s) => acceptDeal(s, live(s), accepting.id))); setAccepting(null); }}>Accept {money(accepting.amount)}</button>
        </>}>
          <p>The {accepting.backer.toLowerCase()} backs {p.title} with {money(accepting.amount)} on these terms:</p>
          <ul>{dealTerms(accepting).map((t) => <li key={t}>{t}</li>)}</ul>
          <p className="muted">These terms apply for the life of the project.</p>
        </Modal>
      )}
    </>
  );
}

export type { Person };
export { skillLabel };
