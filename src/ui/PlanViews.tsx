import { Fragment, useState } from 'react';
import { setShotPlan } from '../engine/takes-actions';
import { RIGS, rigOf, type Rig } from '../engine/craft';
import { chooseSite } from '../engine/locations-actions';
import { languageName } from '../data/identity';
import { getPlace } from '../data/places';
import { countryName } from '../world/gazetteer/gazetteer';
import {
  BACKERS, EXPERIENCE, betterTerms, COUNTER_DAYS, type BetterTerm, assignEpisodeRole, backerDocuments, moneyKept, ownMoney, ownMoneyNotes, OWN_MONEY, acceptCounter, acceptDeal, approachBacker, approvedCharacters, approvedScenes, backerOptions, castPlayer, dealTerms, deals, financeSummary, refuseDeal, setFinanceTarget, castRoleFor, categoryTotals,
  coachingNeeded, dateKey, declineCounter, estimateDays, forecast, formatDateKey, generatePlan, isAvailable, isEpisodic, keepWeatherPlan,
  ledgerTotals, makeOffer, money, neededRoles, personById, productionWindow, sharedHeritages, observance, proposeStaffing, puppetStatus, releaseHire, roleLabel,
  sceneLabel, sceneTechnique, sendStaffingOffers, skillLabel, moveShootDay, swapWithInteriorDay, uncastPlayer, withdrawOffer, addDaysToKey, type Person,
  type StaffingProposal, covers, fundingScenario,
} from '../engine';
import { breakdownComplete, characterPronouns, pronounsMatch } from '../engine/script-explain';
import { AUDITION_NOTICE_DAYS, auditionsFor, callBack, chemistryPartners, inviteRefusal, inviteToAudition, setShortlisted } from '../engine/casting-calls';
import { chemistryWords, qualityWords } from '../engine';
import { callSheet } from '../engine/callsheet';
import { costCuts, estimateAgainstSpending, type CostCut } from '../engine/cost-cuts';
import { CONTINGENCY, costBreakdown, projectedCost, type CostArea } from '../engine/estimate';
import { askForBetterTerms, askRefusal } from '../engine/negotiation-actions';
import { SITES, scoutedPlaces, site } from '../engine/locations';
import { currentZone, dayFees, estimatedShootDays, personAge, playingAgeAt, willingness } from '../engine';
import { candidatesFor, childrenIn } from '../engine/hiring';
import { consideredOn, isReal, jobLabel, stopConsidering } from '../engine/guests';
import { storyAge, storyAgeWords } from '../engine/story-age';
import { RULES_READ, licenceReady, projectRules, supervisionFor } from '../engine/minors';
import { RULE_WORDS, ageWords, fitNotes, hoursWords } from '../engine/casting-notes';
import { COVERAGE, EMPHASIS, SETUPS_OF, TAKES, TAKE_RULES, isDirecting2, planTime, requiredSetups, shotPlan, type Coverage, type Emphasis, type TakePolicy } from '../engine/takes';
import type { Audition, FinanceDeal, GameState, Hire, Obligation, PerformanceMethod, Project } from '../engine/types';
import { Check, Modal, NumberField, SelectField, TextField, longLocal, plural } from './components';
import { store, useGame } from './store';
import { WritingWork } from './WritingWork';
import { FilmedAtCard } from './FilmedAt';

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
      <td data-label="Role">{h.characterId ? `${approvedCharacters(p).find((c) => c.id === h.characterId)?.name ?? 'Role'} (${h.method === 'voice' ? 'Voice' : 'On Camera'})` : jobLabel(p, h.roleId)}</td>
      <td data-label="Rate">{money(h.dayRate)} a day, about {plural(h.estDays, 'day')}</td>
      <td data-label="Status">
        <span className={`chip ${h.status === 'accepted' ? 'chip-positive' : h.status === 'declined' ? 'chip-negative' : h.status === 'countered' ? 'chip-warning' : ''}`}>{STATUS_LABEL[h.status]}</span>
        {h.status === 'offered' && <div className="dim">Offered {formatDateKey(dateKey(h.offeredAt, zone))}; answer by about {formatDateKey(dateKey(h.responseAt, zone))}</div>}
        {h.status === 'countered' && <div className="dim">Asks {money(h.counterRate ?? 0)} a day{h.counterUntil ? `, until ${formatDateKey(dateKey(h.counterUntil, zone))}` : ''}</div>}
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
  const [ageFirst, setAgeFirst] = useState(false);
  const part = characterId ? approvedCharacters(p).find((x) => x.id === characterId) : undefined;
  const partAge = storyAge(part?.ageInStory);
  // Someone from the film catalog has no recorded pronouns, so they are never marked as matching and never sorted on it.
  const fits = (c: Person) => !isReal(c.id) && (!part || pronounsMatch(part, c.pronouns));
  // Ages on today's date, so they move on each person's birthday (people.ts).
  const today = dateKey(g.now, currentZone(g));
  const plays = (c: Person) => playingAgeAt(c, today);
  // Plays the part's age (story-age.ts): a preference for the list's order, as pronouns are; nobody is filtered out.
  const playsPart = (c: Person) => { const r = plays(c); return !!partAge && !!r && partAge.max >= r[0] && partAge.min <= r[1]; };
  // Matching the part's written pronouns is marked, and listing matches first is the producer's choice: it is a casting
  // preference, never a measure of ability, and nobody is filtered out (until the review of November 7, 2026 it always sorted).
  // People from the film catalog the player is considering for this (guests.ts) come first and are always shown, free or
  // not: the player put them there. The game's own follow, as before.
  const list = candidatesFor(g, p, roleId, characterId).map((c) => ({ c, av: isAvailable(g, c, win.from, win.to, p.id) })).filter((x) => !onlyFree || x.av.ok || isReal(x.c.id))
    .sort((a, b) => Number(isReal(b.c.id)) - Number(isReal(a.c.id)) || (ageFirst ? Number(playsPart(b.c)) - Number(playsPart(a.c)) : 0) || (pronounsFirst ? Number(fits(b.c)) - Number(fits(a.c)) : 0) || b.c.experience - a.c.experience || a.c.dayRate - b.c.dayRate);
  const days = estimateDays(p, roleId, characterId, method, g);
  return (
    <div className="spaced">
      <p className="muted">Production window: {formatDateKey(win.from)} to {formatDateKey(win.to)}. About {plural(days, 'paid day')}. Uncommitted funds: {money(ledgerTotals(p).available)}.</p>
      {part && part.roleSize !== 'background' && <p className="dim">Invite people to read before you choose: auditions are on the next working day {AUDITION_NOTICE_DAYS} days ahead, and a read shows how strong they'd be in the part, as a range. The comparison is on the Cast page.</p>}
      {part && <p className="dim">{breakdownComplete(part) ? `Offers include ${part.name}'s casting breakdown (description, wants and fears).` : `Offers go with the script pages. ${part.name}'s casting breakdown isn't written yet (description, wants and fears on the Characters page); it doesn't change who accepts.`}</p>}
      <Check label="Only Show People Who Are Free" checked={onlyFree} onChange={setOnlyFree} />
      {part && characterPronouns(part) && <Check label="List Matching Pronouns First" checked={pronounsFirst} onChange={setPronounsFirst} />}
      {partAge && <Check label="List Performers Who Play This Age First" hint={`${part!.name} is ${storyAgeWords(partAge)}.`} checked={ageFirst} onChange={setAgeFirst} />}
      <ul className="list">
        {list.map(({ c, av }) => {
          const notes = characterId ? fitNotes(g, p, c, characterId) : [];
          const rate = rates[c.id] ?? c.dayRate;
          return (
            <li key={c.id}>
              <div className="row-wrap">
                <div className="grow">
                  <strong>{c.name}</strong> <span className="chip">{EXPERIENCE[c.experience - 1]}</span>{isReal(c.id) && <> <span className="chip chip-info">From The Film Catalog</span></>}{part && characterPronouns(part) && fits(c) && <> <span className="chip chip-positive">Pronouns Match</span></>}
                  {isReal(c.id)
                    ? <div className="dim">{c.samples}{c.born ? ` Age ${personAge(c, today)}.` : ' Date of birth not recorded.'}{plays(c) ? ` In this story they play ages ${plays(c)![0]} to ${plays(c)![1]}.` : ''} Languages, background and nationality aren't recorded, and none is assumed. In this story they ask {money(c.dayRate)} a day.</div>
                    : <div className="dim">{c.samples} Speaks {c.languages.map(languageName).join(', ')}.{` Age ${personAge(c, today)}.`}{plays(c) ? ` Plays ages ${plays(c)![0]} to ${plays(c)![1]}.` : ''}{c.heritages.length ? ` Ethnicity: ${c.heritages.join(', ')}.` : ''} Nationality: {c.nationalities.map(countryName).join(', ')}. Asks {money(c.dayRate)} a day.</div>}
                  {characterId && sharedHeritages(g, p, characterId, c.id).length > 0 && <div><span className="chip">Shares A Background: {sharedHeritages(g, p, characterId, c.id).join(', ')}</span></div>}
                  {!av.ok && <div className="dim" style={{ color: 'var(--warning)' }}>{av.reason}</div>}
                  {willingness(g, c.id).reason && <div className="dim">{willingness(g, c.id).reason}</div>}
                  {notes.map((n) => <div key={n} className="dim" style={{ color: 'var(--warning)' }}>{n}</div>)}
                </div>
                <div className="inline-form" style={{ maxWidth: 320 }}>
                  <NumberField label={`Day Rate For ${c.name}`} value={rate} min={1} onChange={(v) => setRates({ ...rates, [c.id]: v })} />
                  <button className="btn btn-primary" onClick={() => {
                    const e = store.act((s) => void makeOffer(s, p, { personId: c.id, roleId, dayRate: rate, characterId, method }));
                    if (e) setErr({ ...err, [c.id]: e });
                    else onDone();
                  }}>Make Offer</button>
                  {isReal(c.id) && <button className="btn" aria-label={`Stop Considering ${c.name}`} onClick={() => void store.act((s) => stopConsidering(s.projects.find((x) => x.id === p.id)!, { personId: c.id, roleId, characterId, method }))}>Stop Considering</button>}
                  {characterId && method && part?.roleSize !== 'background' && (() => {
                    const why = inviteRefusal(g, p, characterId, method, c.id);
                    return why === 'They have been asked to read for this part already.'
                      ? <span className="chip">Asked To Read</span>
                      : <button className="btn" aria-label={`Invite ${c.name} To Read`} disabled={!!why} title={why ?? undefined} onClick={() => { const e = store.act((s) => void inviteToAudition(s, p, characterId, method, c.id)); if (e) setErr({ ...err, [c.id]: e }); }}>Invite To Read</button>;
                  })()}
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
      <ChildrenCard p={p} />
      {(p.continues?.returning ?? []).filter((r) => chars.some((c) => c.id === r.characterId) && !p.cast.some((a) => a.characterId === r.characterId && a.method === r.method)).length > 0 && (
        <section className="card" aria-labelledby="back-h">
          <h2 id="back-h">Ask Them Back</h2>
          <p className="dim">Who played these parts last time, at the rate they were paid then. Asking is an offer like any other: they may be booked elsewhere, may ask for more, and are paid again.</p>
          <ul className="list">{p.continues!.returning.filter((r) => chars.some((c) => c.id === r.characterId) && !p.cast.some((a) => a.characterId === r.characterId && a.method === r.method)).map((r) => {
            const c = chars.find((x) => x.id === r.characterId)!;
            const who = personById(g, r.personId);
            const pending = p.hires.some((h) => h.personId === r.personId && h.characterId === r.characterId && (h.status === 'offered' || h.status === 'countered'));
            return (
              <li key={`${r.characterId}-${r.method}`} className="row-wrap">
                <span className="grow">{who.name} as {c.name} <span className="dim">· {money(r.rate)} a day last time</span></span>
                {pending ? <span className="chip">Offer Sent</span> : <button className="btn btn-sm" onClick={() => setErr(store.act((s) => { makeOffer(s, p, { personId: r.personId, roleId: castRoleFor(r.method), dayRate: r.rate, characterId: r.characterId, method: r.method }); }))}>Ask {who.name} Back</button>}
              </li>
            );
          })}</ul>
        </section>
      )}
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
                    <strong>{c.name}</strong> <span className="dim">{c.roleSize.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} · {plural(approvedScenes(p).filter((s) => s.participants.includes(c.id)).length, 'scene')}</span>
                    {c.roleSize === 'background' && <div className="dim">Background performers are booked per shoot day.</div>}
                    {!!c.aliases?.length && <div className="dim">Also called {c.aliases.join(', ')}.</div>}
                    {!!(c.heritages?.length || c.nationalities?.length) && <div className="dim">Written as {[...(c.heritages ?? []), ...(c.nationalities ?? []).map(countryName)].join(', ')}.{sharedHeritages(g, p, c.id, 'player').length ? ' You share a background with this part.' : ''}</div>}
                  </div>
                </div>
                {methods.map((m) => {
                  const a = p.cast.find((x) => x.characterId === c.id && x.method === m);
                  const pending = p.hires.find((h) => h.characterId === c.id && h.method === m && (h.status === 'offered' || h.status === 'countered'));
                  return (
                    <div key={m} className="row-wrap spaced">
                      <span className="grow">{m === 'voice' ? 'Voice' : m === 'motion-capture' ? 'Performance Capture' : 'On Camera'}: {a ? (a.performer === 'player' ? <strong>You</strong> : <strong>{personById(g, a.performer).name}</strong>) : pending ? <span className="muted">Offer out to {personById(g, pending.personId).name}</span> : <span className="muted">Not cast</span>}{a && sharedHeritages(g, p, c.id, a.performer).length > 0 && <> <span className="chip">Shares A Background</span></>}{a?.note && <div className="dim small">{a.note}</div>}</span>
                      <div className="row gap-2 wrap">
                        {!a && !pending && <button className="btn btn-sm" onClick={() => setSearching({ characterId: c.id, method: m })}>Find Performers</button>}
                        {!a && !pending && <button className="btn btn-sm" onClick={() => setErr(store.act((s) => void castPlayer(s, p, c.id, m)))}>Cast Yourself</button>}
                        {a?.performer === 'player' && !p.delivered && <button className="btn btn-sm" onClick={() => setErr(store.act(() => uncastPlayer(p, c.id)))}>Step Out Of This Role</button>}
                      </div>
                      {auditionsFor(p, c.id, m).length > 0 && <AuditionList p={p} characterId={c.id} method={m} cast={!!a} pending={!!pending} onError={setErr} />}
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

/** The reads for a part, side by side: never one score, so the choice is yours (auditions.ts). */
function AuditionList({ p, characterId, method, cast, pending, onError }: { p: Project; characterId: string; method: PerformanceMethod; cast: boolean; pending: boolean; onError: (e: string | null) => void }) {
  const g = useGame();
  const [partner, setPartner] = useState<Record<string, string>>({});
  const part = p.characters.find((c) => c.id === characterId)!;
  const range = (r: [number, number]) => (qualityWords(r[0]) === qualityWords(r[1]) ? qualityWords(r[0]) : `${qualityWords(r[0])} to ${qualityWords(r[1])}`);
  const when = (a: Audition): string => {
    if (a.callback) return a.callback.status === 'scheduled' ? `Called back for ${formatDateKey(a.callback.date)}` : a.callback.status === 'missed' ? `Missed the callback on ${formatDateKey(a.callback.date)}` : `Called back on ${formatDateKey(a.callback.date)}`;
    return { invited: `Reads on ${formatDateKey(a.date)}`, declined: a.reason ?? 'Declined', missed: `Didn't come on ${formatDateKey(a.date)}`, seen: `Read on ${formatDateKey(a.date)}` }[a.status];
  };
  const list = [...auditionsFor(p, characterId, method)].sort((x, y) => Number(!!y.shortlisted) - Number(!!x.shortlisted));
  const open = !cast && !pending && !p.delivered;
  return (
    <div className="table-wrap" style={{ flexBasis: '100%' }}>
      {open && list.some((a) => a.status === 'seen' && !a.callback) && <p className="dim small">Shortlist the ones you want to see again: callbacks are for the shortlist.</p>}
      <table className="data">
        <caption className="sr-only">Auditions For {part.name}</caption>
        <thead><tr><th>Person</th><th>When</th><th>Their Read</th><th>Asks</th><th>Notes</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{list.map((a) => {
          const who = personById(g, a.personId);
          const notes = fitNotes(g, p, who, characterId);
          const partners = a.status === 'seen' && !a.callback ? chemistryPartners(g, p, a) : [];
          const chem = a.callback?.chemistry !== undefined && a.callback.partnerId ? `${chemistryWords(a.callback.chemistry)}, reading with ${a.callback.partnerId === 'player' ? 'you' : personById(g, a.callback.partnerId).name}.` : '';
          return (
            <tr key={a.id}>
              <td>{who.name}{a.shortlisted && <> <span className="chip chip-accent">Shortlisted</span></>}</td>
              <td>{when(a)}</td>
              <td>{a.read ? range(a.read) : '—'}{chem && <div className="dim">{chem}</div>}</td>
              <td>{money(who.dayRate)} a day</td>
              <td>{notes.length ? notes.join(' ') : 'No fit notes.'}</td>
              <td>{open && (
                <div className="row gap-2 wrap">
                  {a.status === 'seen' && <button className="btn btn-sm" onClick={() => onError(store.act(() => setShortlisted(p, a.id, !a.shortlisted)))}>{a.shortlisted ? 'Take Off Shortlist' : 'Shortlist'}</button>}
                  {a.status === 'seen' && a.shortlisted && !a.callback && partners.length > 0 && (
                    <SelectField label={`Read ${who.name} With`} value={partner[a.id] ?? ''} options={[{ value: '', label: 'Nobody' }, ...partners.map((x) => ({ value: x.personId, label: x.label }))]} onChange={(v) => setPartner({ ...partner, [a.id]: v })} />
                  )}
                  {a.status === 'seen' && a.shortlisted && !a.callback && <button className="btn btn-sm" aria-label={`Call Back ${who.name}`} onClick={() => onError(store.act((s) => void callBack(s, p, a.id, partner[a.id] || undefined)))}>Call Back</button>}
                  {a.status === 'seen' && <button className="btn btn-sm btn-primary" aria-label={`Offer ${part.name} To ${who.name}`} onClick={() => onError(store.act((s) => void makeOffer(s, p, { personId: a.personId, roleId: castRoleFor(method), dayRate: who.dayRate, characterId, method })))}>Make Offer</button>}
                  {a.status === 'missed' && <button className="btn btn-sm" aria-label={`Ask ${who.name} To Read Again`} onClick={() => onError(store.act((s) => void inviteToAudition(s, p, characterId, method, a.personId)))}>Ask Again</button>}
                </div>
              )}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
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
  // Crew jobs someone from the film catalog is being considered for that the script doesn't call for (guests.ts). The
  // writer's and the director's are hired in their own card.
  const extra = [...new Set(consideredOn(p).filter((c) => !c.characterId && !['episode-writer', 'episode-director'].includes(c.roleId) && !needed.some((r) => r.roleId === c.roleId)).map((c) => c.roleId))];
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
      {p.delivered && <div className="callout callout-info"><p>This project has been delivered, so its crew can't change.</p></div>}
      {/* A single film has one writer and one director too (its one episode record). Until the Creative Depth package's
          milestone D the table showed for series only, so nobody could be hired to direct or write a film. */}
      {p.episodes.length > 0 && <EpisodeAssignments p={p} />}
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
      {/* A job the script doesn't call for has no row above, so someone considered for one is offered it here. */}
      {extra.length > 0 && (
        <section className="card">
          <h2>Jobs You Are Considering Someone For</h2>
          <p className="muted">The approved script doesn't call for these jobs, so they aren't listed above. Someone from the film catalog is on this project's list for each; hiring them is your choice, and they are paid for their days like anyone.</p>
          <ul className="list spaced">
            {extra.map((roleId) => {
              const st = status(roleId);
              return (
                <li key={roleId} className="row-wrap">
                  <div className="grow"><strong>{roleLabel(roleId)}</strong> <span className={`chip ${st.cls}`}>{st.label}</span> <span className="chip">Optional</span></div>
                  <button className="btn btn-sm" disabled={!!p.delivered} aria-label={`Find Candidates For ${roleLabel(roleId)}`} onClick={() => setFinding(roleId)}>Find Candidates</button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <section className="card">
        <h2>Crew Offers And Contracts</h2>
        <HireTable p={p} hires={p.hires.filter((h) => h.kind === 'crew')} />
        {!p.hires.some((h) => h.kind === 'crew') && <p className="muted">No crew offers yet.</p>}
      </section>
      {finding && (
        <Modal title={`Hire ${/^[AEIOU]/.test(roleLabel(finding)) ? 'An' : 'A'} ${roleLabel(finding)}`} onClose={() => setFinding(null)} footer={<button className="btn" onClick={() => setFinding(null)}>Close</button>}>
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
          ) : proposal.skipped.length ? null : <p>Every role here already has someone or an offer out.</p>}
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
  const series = isEpisodic(p.axes.format);
  const you = { value: 'player', label: 'You' };
  const directorOptions = [you, ...directors.map((h) => ({ value: h.personId, label: personById(g, h.personId).name }))];
  const writerOptions = [you, ...writers.map((h) => ({ value: h.personId, label: personById(g, h.personId).name }))];
  return (
    <section className="card">
      <h2>{series ? 'Episode Writers And Directors' : 'Writer And Director'}</h2>
      <p className="muted">{series ? 'As showrunner you can write and direct every episode, or hire episode writers and directors in Writing and Direction.' : 'You write and direct this yourself unless you hire someone to.'}{p.writing ? ' A director is chosen here once they accept and is paid for each day they direct. A writer is chosen once you accept a draft or a rewrite from them, under Writing Work.' : ' Once they accept, choose them here.'}</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>{series ? 'Episode' : 'Title'}</th><th>Written By</th><th>Directed By</th></tr></thead>
          <tbody>
            {p.episodes.map((e) => (
              <tr key={e.number}>
                <td data-label={series ? 'Episode' : 'Title'}>{series ? `${e.number}. ${e.title}` : p.title}</td>
                <td data-label="Written By">
                  {series
                    ? <SelectField label={`Writer For Episode ${e.number}`} value={e.writer} options={writerOptions} onChange={(v) => setErr(store.act(() => assignEpisodeRole(p, e.number, 'writer', v)))} />
                    : <SelectField label="Writer" value={e.writer} options={writerOptions} onChange={(v) => setErr(store.act(() => assignEpisodeRole(p, e.number, 'writer', v)))} />}
                </td>
                <td data-label="Directed By">
                  {series
                    ? <SelectField label={`Director For Episode ${e.number}`} value={e.director} options={directorOptions} onChange={(v) => setErr(store.act(() => assignEpisodeRole(p, e.number, 'director', v)))} />
                    : <SelectField label="Director" value={e.director} options={directorOptions} onChange={(v) => setErr(store.act(() => assignEpisodeRole(p, e.number, 'director', v)))} />}
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
          {/* Writing help is hired here too, from November 11, 2026: until then no page offered these two jobs. */}
          {p.writing && <HireExtra p={p} roleId="co-writer" />}
          {p.writing && <HireExtra p={p} roleId="script-editor" />}
        </div>
      )}
      <WritingWork p={p} />
    </section>
  );
}

function HireExtra({ p, roleId }: { p: Project; roleId: string }) {
  const [open, setOpen] = useState(false);
  // On a single film the job is simply the writer's or the director's.
  const label = `Hire ${/^[AEIOU]/.test(jobLabel(p, roleId)) ? 'An' : 'A'} ${jobLabel(p, roleId)}`;
  return (
    <>
      <button className="btn btn-sm" onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <Modal title={label} onClose={() => setOpen(false)} footer={<button className="btn" onClick={() => setOpen(false)}>Close</button>}>
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
        {p.episodes.length > 1 && <Check label="Shoot Episodes In Blocks" hint="Scenes at the same place in episodes with the same director share days, so fewer days are paid for. Episodes with different directors keep their own days. Takes effect when the schedule is built." checked={!!p.schedule.blockEpisodes} onChange={(v) => set(() => { if (v) p.schedule.blockEpisodes = true; else delete p.schedule.blockEpisodes; })} />}
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
        {p.delivered && <p className="dim">This project has been delivered; its schedule is final.</p>}
        {!p.delivered && approvedScenes(p).some((s) => sceneTechnique(p, s) === 'live') && <p className="dim">About {plural(estimatedShootDays(p, g), 'shoot day')}, each about {money(dayFees(p).location + dayFees(p).equipment)} for the location and equipment, reserved when the schedule is built.</p>}
        <button className="btn btn-primary" disabled={!!p.delivered} onClick={() => setErr(store.act((s) => void generatePlan(s, p, start)))}>{p.schedule.startDate ? 'Rebuild Schedule' : 'Build Schedule'}</button>
        {p.schedule.startDate && <p className="dim">Rebuilding keeps finished work and moves only what hasn't happened yet.</p>}
      </section>
      <FilmedAtCard p={p} />
      {scoutedPlaces(p).length > 0 && <LocationsCard p={p} />}
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
                    {d.status === 'scheduled' && (() => {
                      const cs = callSheet(g, p, d.id);
                      return (
                        <details className="section-fold">
                          <summary>Call Sheet</summary>
                          <dl className="kv">
                            <dt>Call</dt><dd>{cs.call}</dd>
                            <dt>Wrap</dt><dd>{cs.wrap}</dd>
                            <dt>Where</dt><dd>{cs.where}</dd>
                            <dt>Scenes</dt><dd>{cs.scenes.join(', ') || 'None'}</dd>
                          </dl>
                          <h4>Cast</h4>
                          {cs.cast.length ? <ul className="list">{cs.cast.map((c) => <li key={c.part}>{c.who} as {c.part} <span className="dim">· {c.scenes.join(', ')}</span></li>)}</ul> : <p className="muted">No one cast is called.</p>}
                          {cs.uncast.map((u) => <p key={u} className="dim" style={{ color: 'var(--warning)' }}>{u}</p>)}
                          <h4>Crew</h4>
                          {cs.crew.length ? <ul className="list">{cs.crew.map((c) => <li key={c.role + c.who}>{c.role}: {c.who}</li>)}</ul> : <p className="muted">No shoot crew hired yet.</p>}
                          {cs.notes.length > 0 && <><h4>Notes</h4><ul className="list">{cs.notes.map((n) => <li key={n}>{n}</li>)}</ul></>}
                          {p.takesModel && <ShotPlans p={p} sceneIds={d.sceneIds} />}
                        </details>
                      );
                    })()}
                  </div>
                  {fc && !d.interior && fc.chanceOfPrecip >= 40 && (
                    <div className="row gap-2 wrap">
                      <p className="dim small" style={{ flexBasis: '100%', margin: 0 }}>Move the Shoot puts this day after the last scheduled shoot day; Film an Interior Scene swaps dates with the next interior day. Agreed costs stay as they are.</p>
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

/** How each scene of a day is shot: coverage and takes, against the day's time (takes.ts, SLATE-12-02.02). */
function ShotPlans({ p, sceneIds }: { p: Project; sceneIds: string[] }) {
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <h4>Shot Plan</h4>
      <p className="dim small">{isDirecting2(p)
        ? 'Each setup costs a reset and each take its running time, so more of either fits fewer scenes in the day. Coverage the scene needs is what the edit cuts with; more than it needs earns options, not a better film; less leaves a gap a pickup can fill later. A usable take is enough: more can still disappoint.'
        : 'More coverage gives the editor more to cut with; more takes give more to choose from, with diminishing returns. Both use more of the day, so fewer scenes fit and the shoot can run longer.'}</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      {sceneIds.map((id) => {
        const s = approvedScenes(p).find((x) => x.id === id);
        const plan = shotPlan(p, id);
        if (!s || !plan) return null;
        return (
          <div key={id} className="grid grid-3 form">
            {isDirecting2(p) && <SelectField label={`Emphasis For ${sceneLabel(p, s)}`} value={plan.emphasis} options={(Object.keys(EMPHASIS) as Emphasis[]).map((k) => ({ value: k, label: EMPHASIS[k] }))} onChange={(v) => setErr(store.act(() => setShotPlan(p, id, { emphasis: v })))} />}
            <SelectField label={`Camera For ${sceneLabel(p, s)}`} value={rigOf(p, id)} options={(Object.keys(RIGS) as Rig[]).map((k) => ({ value: k, label: RIGS[k].label }))} hint={`${RIGS[rigOf(p, id)].hint}${RIGS[rigOf(p, id)].dayCost ? ` Rented kit: ${money(RIGS[rigOf(p, id)].dayCost)} for each shoot day with a scene on it. Rebuild the schedule to set the money aside.` : ''}`} onChange={(v) => setErr(store.act(() => setShotPlan(p, id, { rig: v as Rig })))} />
            <SelectField label={`Coverage For ${sceneLabel(p, s)}`} value={plan.coverage} options={(Object.keys(COVERAGE) as Coverage[]).map((k) => ({ value: k, label: COVERAGE[k].label }))} onChange={(v) => setErr(store.act(() => setShotPlan(p, id, { coverage: v })))} />
            <SelectField label={`Takes For ${sceneLabel(p, s)}`} value={plan.takes} options={(Object.keys(TAKES) as TakePolicy[]).map((k) => ({ value: k, label: isDirecting2(p) ? TAKE_RULES[k].label : TAKES[k].label }))} onChange={(v) => setErr(store.act(() => setShotPlan(p, id, { takes: v })))} />
            {isDirecting2(p) && (() => {
              const need = requiredSetups(p, s);
              const has = SETUPS_OF[plan.coverage];
              const missing = need.filter((x) => !has.includes(x.setup));
              const extra = has.filter((x) => !need.some((n) => n.setup === x));
              return <ul className="dim small">
                {need.map((n) => <li key={n.setup}>Needs {n.setup}: {n.reason}</li>)}
                {missing.map((n) => <li key={'m' + n.setup} style={{ color: 'var(--warning)' }}>This plan has no {n.setup}: the edit will lack them unless a pickup shoots them.</li>)}
                {extra.length > 0 && <li>More than it needs ({extra.join(', ')}): options in the edit, at the cost of the day's time.</li>}
              </ul>;
            })()}
            <p className="dim small">About {Math.round(planTime(p, s) * 100)}% of the standard plan's time{isDirecting2(p) ? `, planning ${TAKE_RULES[plan.takes].planned} ${TAKE_RULES[plan.takes].planned === 1 ? 'take' : 'takes'} a setup` : ''}.</p>
          </div>
        );
      })}
    </>
  );
}

/** The sites scouting found for each place, the one chosen and a backup (locations.ts, SLATE-11-02.02). */
function LocationsCard({ p }: { p: Project }) {
  const [err, setErr] = useState<string | null>(null);
  const fee = dayFees(p).location;
  return (
    <section className="card" aria-labelledby="locations-h">
      <h2 id="locations-h">Locations</h2>
      <p className="dim">Scouting found three sites for each place. A site can fall through on the morning of a shoot: with a backup the day goes ahead there, without one the day is lost and its scenes move later. Until you choose, each place is the real one at {money(fee)} a day.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      <ul className="list">{scoutedPlaces(p).map((place) => {
        const rec = p.locationChoices?.[place] ?? {};
        const opts = (exclude?: string) => SITES.filter((o) => !rec.lost?.includes(o.id) && o.id !== exclude).map((o) => ({ value: o.id, label: `${o.name}: ${money(Math.round(fee * o.factor))} a day` }));
        return (
          <li key={place}>
            <strong>{place}</strong>
            {!!rec.lost?.length && <div className="dim" style={{ color: 'var(--warning)' }}>Fell through: {rec.lost.map((x) => site(x)!.name).join(', ')}.</div>}
            <div className="grid grid-3 form">
              <SelectField label={`Site For ${place}`} value={rec.main ?? ''} options={[{ value: '', label: rec.lost?.length ? 'Choose A Site' : 'The Real Place (Not Chosen Yet)' }, ...opts(rec.backup)]} onChange={(v) => setErr(store.act(() => chooseSite(p, place, 'main', (v || null) as never)))} />
              <SelectField label={`Backup For ${place}`} value={rec.backup ?? ''} options={[{ value: '', label: 'No Backup' }, ...opts(rec.main)]} onChange={(v) => setErr(store.act(() => chooseSite(p, place, 'backup', (v || null) as never)))} />
            </div>
            {rec.main && <p className="dim small">{site(rec.main)!.note}</p>}
          </li>
        );
      })}</ul>
    </section>
  );
}

// ---------------- Budget ----------------

/** Ways to cost less, worked out when asked: each is the estimate again without that thing (SLATE-03-03.02). */
const AREA_WORDS: Record<CostArea, string> = { crew: 'Crew', cast: 'Cast', shoot: 'Shoot Days', builds: 'Builds And Materials', facilities: 'Studio, Render And Capture' };

/**
 * What the estimate is made of (estimate.ts costBreakdown): money by how sure it is, the work still to come by area and
 * what drives it, what is uncertain and how to resolve it, and the risks the contingency is for.
 */
function WhatItCostsCard({ p }: { p: Project }) {
  const g = useGame();
  const b = costBreakdown(g, p);
  const toCome = b.toCome.reduce((a, x) => a + x.amount, 0);
  const contingency = Math.round(b.total * CONTINGENCY);
  const top = [...b.toCome].sort((x, y) => y.amount - x.amount).slice(0, 5);
  const vs = estimateAgainstSpending(p);
  const areas = (Object.keys(AREA_WORDS) as CostArea[]).filter((a) => b.toCome.some((x) => x.area === a));
  return (
    <section className="card" aria-labelledby="costs-h">
      <h2 id="costs-h">What It Costs</h2>
      <p className="dim">The estimate is built from the work the approved script needs, priced by the same rules the production pays by. It is a projection, not a quote.</p>
      <dl className="kv">
        <dt>Spent</dt><dd>{money(b.spent)}</dd>
        <dt>Agreed, Not Yet Paid</dt><dd>{money(b.committed)}</dd>
        <dt>Held For Plans And Offers</dt><dd>{money(b.reserved)}</dd>
        <dt>Still To Come, Estimated</dt><dd>{money(toCome)}</dd>
        <dt>Contingency ({Math.round(CONTINGENCY * 100)}%)</dt><dd>{money(contingency)}</dd>
        <dt>Shoot Days Still To Come</dt><dd>{b.shootDays}</dd>
      </dl>
      {top.length > 0 && <>
        <h3>What Makes It Expensive</h3>
        <ul className="list">{top.map((x) => <li key={x.area + x.label}><strong>{x.label}</strong>: {money(x.amount)} <span className="dim">· {x.driver}</span></li>)}</ul>
        <details className="spaced"><summary>Everything Still To Come ({plural(b.toCome.length, 'line')})</summary>
          {areas.map((a) => <Fragment key={a}><h4>{AREA_WORDS[a]}: {money(b.toCome.filter((x) => x.area === a).reduce((s, x) => s + x.amount, 0))}</h4>
            <ul className="list">{b.toCome.filter((x) => x.area === a).map((x) => <li key={x.label}>{x.label}: {money(x.amount)} <span className="dim">· {x.driver}</span></li>)}</ul></Fragment>)}
        </details>
      </>}
      {b.uncertain.length > 0 && <div className="callout callout-warning spaced"><p><strong>Uncertain</strong></p><ul>{b.uncertain.map((u) => <li key={u.item}>{u.item} {u.resolve}</li>)}</ul></div>}
      {b.risks.length > 0 && <>
        <h3>What The Contingency Is For</h3>
        <ul className="list">{b.risks.map((r) => <li key={r.item}>{r.item}{r.cost ? ` One costs about ${money(r.cost)}${r.cost <= contingency ? `; the contingency covers about ${Math.floor(contingency / r.cost)}.` : ', more than the contingency.'}` : ''}</li>)}</ul>
      </>}
      {vs && vs.rows.some((r) => r.actual) && <>
        <h3>Estimate Against Spending</h3>
        <p className="dim">Estimated at {money(vs.total)} in all when draft {p.approvedDraft} was approved, on {longLocal(vs.at, getPlace(p.axes.basePlaceId).zone).date}.</p>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Area</th><th>Estimated At Approval</th><th>Spent Or Agreed</th></tr></thead>
          <tbody>{vs.rows.map((r) => <tr key={r.area}><td data-label="Area">{r.label}</td><td data-label="Estimated At Approval">{money(r.estimated)}</td><td data-label="Spent Or Agreed">{money(r.actual)}</td></tr>)}</tbody>
        </table></div>
        {vs.reasons.length > 0 && <ul className="list">{vs.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
      </>}
    </section>
  );
}

function CostCutsCard({ p }: { p: Project }) {
  const g = useGame();
  const [cuts, setCuts] = useState<CostCut[] | null>(null);
  return (
    <section className="card" aria-labelledby="cuts-h">
      <h2 id="cuts-h">Ways To Cost Less</h2>
      <p className="dim">What the estimate would save without each of these. They change the film, so they are choices, not advice; make one in the Script and approve a new draft.</p>
      {cuts === null ? <button className="btn" onClick={() => setCuts(costCuts(g, p))}>Work Out Savings</button>
        : cuts.length ? (
          <ul className="list">{cuts.map((c) => <li key={c.label}><strong>{c.label}</strong>: saves about {money(c.saving)}{c.days ? `, ${c.days < 0 ? `${plural(-c.days, 'shoot day')} fewer` : `${plural(c.days, 'shoot day')} more`}` : ''}. <span className="dim">{c.how}</span></li>)}</ul>
        ) : <p className="muted">Nothing here would save $1,000 or more. Essential scenes aren't offered.</p>}
    </section>
  );
}

const POSTING_WORDS: Record<Obligation['postings'][number]['kind'], string> = { reserve: 'Held', commit: 'Agreed at', settle: 'Paid', cancel: 'Released' };

/** A delivered project's uncommitted money, by whose it is and what it may do (finance.ts moneyKept). */
function MoneyKeptCard({ p }: { p: Project }) {
  const m = moneyKept(p);
  return (
    <section className="card" aria-labelledby="kept-h">
      <h2 id="kept-h">What This Project Has Left</h2>
      <dl className="kv">
        <dt>Production Funding Left</dt><dd>{money(m.restricted)}</dd>
        <dt>Held For Bills To Pay</dt><dd>{money(m.held)}</dd>
        <dt>Your Earnings</dt><dd>{money(m.earnings)}</dd>
        {(m.capital > 0 || m.moved.capital > 0) && <><dt>Your Unspent Money</dt><dd>{money(m.capital)}</dd></>}
        {m.moved.earnings > 0 && <><dt>Earnings Put Into Other Projects</dt><dd>{money(m.moved.earnings)}</dd></>}
        {m.moved.capital > 0 && <><dt>Unspent Money Put Into Other Projects</dt><dd>{money(m.moved.capital)}</dd></>}
      </dl>
      <p className="dim">Production funding stays with this project: its backers paid it in to make it. Your earnings are the income it kept after its backers were repaid and paid their shares, and they can go into a new project{m.capital > 0 ? ', as can money you put in that it didn\'t spend' : ''}. What it spends comes out of production funding first.</p>
      {m.oldMove && <p className="callout callout-warning">{money(m.oldMove.settled)} was moved out of this project under the earlier rule, which didn't tell its income from its production funding. That move stands, and no more money can move out of it.</p>}
    </section>
  );
}

export function BudgetTab({ p }: { p: Project }) {
  useGame();
  const t = ledgerTotals(p);
  const cats = categoryTotals(p);
  const kept = moneyKept(p);
  const movedOut = kept.moved.earnings + kept.moved.capital;
  return (
    <>
      <section className="card">
        <h2>Summary</h2>
        <dl className="kv">
          <dt>Received From Backers</dt><dd>{money(p.funding.fund)}</dd>
          {p.funding.extra.map((e) => <Fragment key={e.label}><dt>{e.label}</dt><dd>{money(e.amount)}</dd></Fragment>)}
          {p.revenue > 0 && <><dt>Distribution Income</dt><dd>{money(p.revenue)}</dd></>}
          <dt>Spent</dt><dd>{money(t.settled - movedOut)}</dd>
          {movedOut > 0 && <><dt>Put Into Other Projects</dt><dd>{money(movedOut)}</dd></>}
          <dt>Agreed But Unpaid</dt><dd>{money(t.committedOutstanding)}</dd>
          <dt>Held For Open Offers</dt><dd>{money(t.reserved)}</dd>
          <dt>Uncommitted</dt><dd><strong>{money(t.available)}</strong></dd>
        </dl>
        <div className="meter spaced" role="img" aria-label={`${Math.round(((t.settled - movedOut) / Math.max(1, t.fund)) * 100)} percent spent`}><span style={{ width: `${Math.min(100, ((t.settled - movedOut) / Math.max(1, t.fund)) * 100)}%` }} /></div>
        <p className="dim">Rates and fees are game assumptions, not quoted industry prices.</p>
      </section>
      {p.delivered && <MoneyKeptCard p={p} />}
      {p.approvedDraft !== null && !p.delivered && <WhatItCostsCard p={p} />}
      {p.approvedDraft !== null && !p.delivered && <CostCutsCard p={p} />}
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
              <li key={o.id} className="row-wrap"><span className="grow">{o.label}
                {/* The line's own postings: every amount held, agreed, paid or released, with its date (budget.ts). */}
                <details className="small"><summary>How It Moved</summary><ul className="dim">{o.postings.map((x) => <li key={x.key}>{POSTING_WORDS[x.kind]} {money(x.amount)} on {longLocal(x.at, getPlace(p.axes.basePlaceId).zone).date}</li>)}</ul></details>
              </span><span>{money(o.settled)} of {money(o.amount)} <span className="chip">{{ reserved: 'Held', committed: 'Agreed', settled: 'Paid', cancelled: 'Cancelled' }[o.state]}</span></span></li>
            ))}
          </ul>
        </details>
      </section>
      <FinancingPanel p={p} />
    </>
  );
}

/** How much of your own money is there, where it is, and (under Your Earnings) why the rest of your projects' money isn't. */
function OwnMoneyLines({ p, kind }: { p: Project; kind: 'earnings' | 'capital' }) {
  const g = useGame();
  const from = ownMoney(g, p.id)[kind];
  const total = from.reduce((s, x) => s + x.amount, 0);
  const notes = kind === 'earnings' ? ownMoneyNotes(g, p) : [];
  return (
    <>
      <p className="muted">{total ? `${money(total)} can go in: ${from.map((x) => `${money(x.amount)} from ${x.p.title}`).join(', ')}.` : 'Nothing can go in yet.'}</p>
      {notes.length > 0 && <ul className="dim">{notes.map((n) => <li key={n}>{n}</li>)}</ul>}
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
  const [asks, setAsks] = useState<Record<string, BetterTerm>>({});
  const zone = getPlace(p.axes.basePlaceId).zone;
  const status: Record<FinanceDeal['status'], string> = { considering: 'Considering', offered: 'Offer Made', declined: 'Said No', refused: 'You Turned Down', accepted: 'Backing', breached: 'Repayment Owed', lapsed: 'Lapsed', withdrawn: 'Offer Taken Back' };
  const live = (s: GameState) => s.projects.find((x) => x.id === p.id)!;
  return (
    <>
      <section className="card" aria-labelledby="fin-h">
        <h2 id="fin-h">Financing</h2>
        <p className="muted">
          {p.approvedDraft === null
            ? 'Until a script is approved, the estimate is your budget size. '
            : `The estimate is what the approved script needs at ${fundingScenario(p.funding.scenarioId).label.toLowerCase()} size: the crew and cast still to hire at the lowest rates, materials, shoot days, studio and render time, what's already spent or agreed, and a tenth more for what goes wrong. It's never below the budget size. `}
          Money arrives only from backers whose terms you accept.
        </p>
        <dl className="kv">
          <dt>Budget Estimate</dt><dd>{money(f.estimate)}</dd>
          <dt>Financing Target</dt><dd>{money(f.target)}</dd>
          <dt>Promised By Backers</dt><dd>{money(f.promised)}</dd>
          <dt>Received</dt><dd>{money(f.received)}{f.owedOnDelivery > 0 ? ` (${money(f.owedOnDelivery)} more on delivery)` : ''}</dd>
          <dt>Still To Raise</dt><dd><strong>{money(f.stillToRaise)}</strong></dd>
        </dl>
        {(() => {
          const unpriced = p.approvedDraft === null || p.delivered ? [] : projectedCost(g, p).uncertain;
          return unpriced.length ? <p className="callout callout-warning">The estimate can't price {unpriced.join(', ')}: no one available can take {unpriced.length === 1 ? 'it' : 'them'} on now, so the real cost is likely higher.</p> : null;
        })()}
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
                  <span className="grow"><strong>{d.backer}</strong>{d.amount ? `: ${money(d.amount)}` : ''} <span className="dim small">{OWN_MONEY.has(d.kind) ? 'Put In' : 'Approached'} {formatDateKey(dateKey(d.askedAt, zone))}</span></span>
                  <span className={`chip ${d.status === 'accepted' ? 'chip-positive' : d.status === 'declined' || d.status === 'breached' || d.status === 'withdrawn' || d.status === 'lapsed' ? 'chip-negative' : d.status === 'offered' ? 'chip-accent' : ''}`}>{status[d.status]}</span>
                </div>
                {d.sent?.length ? <p className="dim">Sent with the approved script{d.sentCopy?.draft ? ` (draft ${d.sentCopy.draft})` : ''}: {d.sent.join(', ')}. They read it; the game doesn't judge it.</p> : null}
                {d.sentCopy && (
                  <details className="section-fold">
                    <summary>What You Sent</summary>
                    <p className="dim small">As it was when you sent it. Later changes to your script aren't in it.</p>
                    {d.sentCopy.documents.map((doc) => (
                      <div key={doc.name}>
                        <h4>{doc.name}</h4>
                        <dl className="dl">{doc.fields.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.text || '—'}</dd></div>)}</dl>
                      </div>
                    ))}
                  </details>
                )}
                {d.status === 'considering' && <p className="muted">Their answer is due {formatDateKey(dateKey(d.decideAt ?? g.now, getPlace(p.axes.basePlaceId).zone))}.</p>}
                {d.reason && <p className="muted">{d.reason}</p>}
                {d.transfer && <p className="dim">Moved from {d.transfer.sources.map((x) => `${g.projects.find((y) => y.id === x.projectId)?.title ?? 'a project'} (${money(x.amount)})`).join(', ')}.</p>}
                {(d.status === 'offered' || d.status === 'accepted' || d.status === 'breached') && <ul className="dim">{dealTerms(d).map((t) => <li key={t}>{t}</li>)}</ul>}
                {(d.status === 'accepted' || d.status === 'breached') && d.terms.recoup > 0 && <p className="dim">Repaid so far: {money(d.repaid)} of {money(d.terms.recoup)}.</p>}
                {d.status === 'offered' && d.expiresAt !== undefined && <p className="muted">Open until {formatDateKey(dateKey(d.expiresAt, zone))}. After that it lapses, and they aren't asked again for this project.</p>}
                {d.counter && (
                  <p className="muted">{(() => {
                    const what = { share: 'a smaller share of income', recoup: 'less to repay first', signing: 'more on signing', approval: 'no casting approval' }[d.counter.term];
                    const asked = `On ${formatDateKey(dateKey(d.counter.askedAt, zone))} you asked for ${what}`;
                    if (!d.counter.outcome) return `${asked}. Their answer is due ${formatDateKey(dateKey(d.counter.answerAt, zone))}; until then the offer can't be accepted.`;
                    return { agreed: `${asked}, and they agreed: the terms above include it.`, held: `${asked}. They kept their terms; the offer is open as it was.`, withdrawn: `${asked}, and they took the offer back.` }[d.counter.outcome];
                  })()}</p>
                )}
                {d.status === 'offered' && (
                  <div className="row gap-2 wrap">
                    <button className="btn btn-primary" disabled={!!d.counter && !d.counter.outcome} onClick={() => setAccepting(d)}>Accept Offer</button>
                    <button className="btn" onClick={() => setErr(store.act((s) => refuseDeal(s, live(s), d.id)))}>Turn Down</button>
                  </div>
                )}
                {d.status === 'offered' && !d.counter && betterTerms(d).length > 0 && (() => {
                  const options = betterTerms(d);
                  const pick = asks[d.id] ?? options[0].term;
                  const why = askRefusal(g, d);
                  return (
                    <div className="spaced">
                      <div className="inline-form">
                        <SelectField label={`Ask The ${d.backer} For`} value={pick} options={options.map((o) => ({ value: o.term, label: o.label }))} onChange={(v) => setAsks({ ...asks, [d.id]: v })} />
                        <button className="btn" disabled={!!why} onClick={() => setErr(store.act((s) => askForBetterTerms(s, live(s), d.id, pick)))}>Ask For Better Terms</button>
                      </div>
                      <p className="dim small">{options.find((o) => o.term === pick)!.change} You can ask once. They answer in {COUNTER_DAYS} days and may agree, keep their terms, or take the offer back; a script with fewer open notes, delivered work and another offer open make agreement likelier.</p>
                      {why && <p className="dim small">{why}</p>}
                    </div>
                  );
                })()}
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
                <p className="muted">{BACKERS[o.kind].who} {BACKERS[o.kind].why}{o.needs.includes('Still to write') ? '' : ` ${backerDocuments(o.kind)}`}{OWN_MONEY.has(o.kind) ? '' : BACKERS[o.kind].decideDays ? ` They answer within ${plural(BACKERS[o.kind].decideDays, 'day')}.` : ''}</p>
                {o.kind === 'earnings' || o.kind === 'capital' ? <OwnMoneyLines p={p} kind={o.kind} /> : null}
                {!o.ready && <p className="dim">{o.needs}</p>}
              </div>
              <button className="btn btn-sm" disabled={!o.ready} onClick={() => setErr(store.act((s) => void approachBacker(s, live(s), o.kind)))} aria-label={OWN_MONEY.has(o.kind) ? `Put In ${BACKERS[o.kind].name}` : `Approach ${BACKERS[o.kind].name}`}>{o.kind === 'starting' ? 'Ask For The Agreed Backing' : OWN_MONEY.has(o.kind) ? `Put In ${BACKERS[o.kind].name}` : 'Approach'}</button>
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

/**
 * The children in the cast, or in parts not yet cast (minors.ts): their age and hours, their licence, who must be with
 * them, and what has been set aside from their pay. Shown with the rules it comes from.
 */
function ChildrenCard({ p }: { p: Project }) {
  const g = useGame();
  const kids = childrenIn(p, g);
  if (!kids.length) return null;
  const today = dateKey(g.now, currentZone(g));
  const { rules, standIn } = projectRules(p, today);
  const crew = supervisionFor(kids, true);
  const hired = (roleId: string) => p.hires.filter((h) => h.roleId === roleId && h.status === 'accepted').length;
  return (
    <section className="card" aria-labelledby="children-h">
      <h2 id="children-h">Children In The Cast</h2>
      <p className="dim">Under {RULE_WORDS[rules.id].name}, a child's hours are limited,{rules.supervisor.underAge > 0 ? ' someone must be with them,' : ''} and they need {RULE_WORDS[rules.id].licence} first. Their scenes take more shoot days for it.{standIn ? ` ${standIn}` : ''} These are the rules as read on {formatDateKey(RULES_READ)}; later changes to them aren't known to the game.</p>
      <ul className="list">
        {kids.map((m) => {
          const lic = m.personId ? (p.childLicences ?? []).find((l) => l.personId === m.personId && l.characterId === m.characterId) : undefined;
          const ready = m.personId ? licenceReady(p, m, today, false) : null;
          const hire = m.personId ? p.hires.find((h) => h.personId === m.personId && h.characterId === m.characterId && h.status === 'accepted') : undefined;
          const part = p.characters.find((c) => c.id === m.characterId)?.name ?? 'A part';
          return (
            <li key={m.characterId} className="list-item">
              <div className="grow">
                <strong>{part}</strong>: {m.personId ? `${m.name}, ${ageWords(m.ageDays)}` : `not cast yet; reckoned as ${ageWords(m.ageDays)} from the part's age`}. They {hoursWords(m)}.
                {m.personId && <div className="dim">{lic ? (ready?.ok ? `Licence granted ${formatDateKey(lic.ready)}.` : `Licence applied for ${formatDateKey(lic.applied)}; granted ${formatDateKey(lic.ready)}.`) : `No licence yet: it is applied for when the shoot is scheduled, ${rules.licence.leadDays === 1 ? 'a day' : `${rules.licence.leadDays} days`} ahead.`}{lic?.night ? ' Night work asked for.' : ''}</div>}
                {hire && rules.setAside && <div className="dim">{rules.setAside.percent}% of their pay goes to {RULE_WORDS[rules.id].setAside}: {money(hire.trustSetAside ?? 0)} so far.</div>}
              </div>
            </li>
          );
        })}
      </ul>
      <h3 className="spaced">Who Must Be With Them</h3>
      <ul className="list">
        {crew.map((w) => (
          <li key={w.roleId} className="list-item">
            <span className="grow">{roleLabel(w.roleId)}: {w.count} {w.why}</span>
            <span className={hired(w.roleId) >= w.count ? 'chip chip-positive' : 'chip'}>{hired(w.roleId) >= w.count ? 'Hired' : 'Hire In Crew'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
