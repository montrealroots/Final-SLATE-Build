// Guide Me (the v4 package, 01: "Provide Guide Me and Manual controls per department ... It may complete routine in-game
// actions only within an explicitly approved mandate. Major spending, binding contracts, changed creative intent and
// overruns return for approval."; ledger V4-006). Built November 12, 2026, for crew departments first.
//
// A crew department set to Guide Me is staffed on the player's behalf inside a mandate the player approved after reading
// the plan: a spending ceiling for that department's hires. Inside it the game does only routine things, each an
// ordinary in-game action that takes its time: it offers the plan's people at their asking rate, tries the next person
// when one declines (never the same person twice), and accepts a counteroffer that still fits under the ceiling. Every
// offer reserves its money on the project's ledger under a line that says Guide Me. Nothing is completed instantly:
// answers take days, and the people hired still do their work.
//
// What falls outside the mandate is returned to the player, once each: a counteroffer that would break the ceiling, a
// role nobody free can take, a role nobody free fits within what remains. The player then acts on the Crew page as
// always, or approves a new mandate with a higher ceiling. Back To Manual ends the mandate; offers already sent stay.
//
// The money a mandate has committed is never stored: it is the sum of what its live hires hold on the ledger.
//
// Casting (from November 13, 2026, dept CAST): the plan is a performer for each part and stage nobody plays, free in the
// production window, of the part's age (or an adult where none is written), the cheapest who fits. Casting is creative
// intent, so the mandate offers the performers the player approved and no one else: one who declines, or can't be
// offered the part, returns it to the player on the Cast page.
import { ledgerTotals, money } from './budget';
import { acceptCounter, castRoleFor, estimateDays, makeOffer, productionWindow, requiredCrewPlan, roleCandidates } from './hiring';
import { isAvailable, personAge, personById, playingAgeAt, roleLabel, type Person } from './people';
import { openParts, partName, samePart, stageById } from './parts';
import { approvedCharacters, isEpisodic } from './projects';
import { storyAge } from './story-age';
import { dateKey } from './time';
import { getPlace } from '../data/places';
import { addLog, newId, registerHandler, schedule } from './state';
import { DAY } from './time';
import type { GameState, Hire, Mandate, Project, WritingScope } from './types';
import { REVISION_SHARE, SCOPE, acceptWriting, commissionRefusal, commissionWriting, episodeMinutes, passDays, requestRevision, revisionRefusal, revisionTerms, writingTerms } from './writing-jobs';

/** How often a mandate looks again at its department: a day, the shortest an offer takes to be answered. */
export const GUIDE_ME_LOOK_DAYS = 1;

export const activeMandate = (p: Project, dept: string): Mandate | undefined => (p.mandates ?? []).find((m) => m.dept === dept && m.endedAt === undefined);
const hiresOf = (p: Project, m: Mandate): Hire[] => p.hires.filter((h) => h.guided === m.id);
const live = (h: Hire) => h.status === 'offered' || h.status === 'accepted' || h.status === 'countered';
/** What a mandate has committed: the money its live hires hold on the ledger. Never stored. */
export const mandateCommitted = (p: Project, m: Mandate): number => hiresOf(p, m).filter(live).reduce((a, h) => a + (p.obligations.find((o) => o.id === h.obligationId)?.amount ?? 0), 0);

/** The department's required roles still to fill, with whoever is free and cheapest who fits, skipping anyone who already said no to this mandate. */
/** The department name Guide Me uses for casting. */
export const CAST = 'Cast';
/** The department name Guide Me uses for writing (from November 13, 2026, the owner's v5 brief, 1). */
export const WRITING = 'Writing';
/**
 * The read a delivered pass must reach for Guide Me to accept it: below it, the pass is revised while the contract
 * allows (writing-jobs.ts MAX_REVISIONS), then returned to the player. Game calibration: the middle of the craft scale
 * and a little more, so a writer at the median level gets through about half the time on a first pass.
 */
export const WRITING_STANDARD = 55;
/** What a Guide Me revision is asked to look at: a label for the record, like the player's own (writing-jobs.ts). */
const GUIDE_FOCUS = 'Structure';

export interface GuidePick { roleId: string; personId: string; name: string; dayRate: number; days: number; total: number; characterId?: string; method?: import('./types').PerformanceMethod; stage?: string; part?: string; episodes?: number[]; scope?: WritingScope }

export function guideMePlan(state: GameState, p: Project, dept: string, m?: Mandate): { picks: GuidePick[]; gaps: string[]; total: number } {
  if (dept === CAST) return castPlan(state, p);
  if (dept === WRITING) return writingPlan(state, p);
  const room = m ? m.ceiling - mandateCommitted(p, m) : Infinity;
  const refused = new Set(m ? hiresOf(p, m).filter((h) => h.status === 'declined').map((h) => h.personId) : []);
  const win = productionWindow(state, p);
  let left = room;
  const picks: GuidePick[] = [];
  const gaps: string[] = [];
  for (const { nr } of requiredCrewPlan(state, p).filter((x) => x.nr.dept === dept)) {
    const days = estimateDays(p, nr.roleId, undefined, undefined, state);
    const pool = roleCandidates(state, p, nr.roleId).filter((c) => c.experience >= 2 && !refused.has(c.id) && isAvailable(state, c, win.from, win.to, p.id).ok).sort((a, b) => a.dayRate - b.dayRate);
    const pick = pool.find((c) => c.dayRate * days <= left);
    if (!pick) { gaps.push(pool.length ? `${roleLabel(nr.roleId)}: nobody free fits within what remains${m ? ` of the ${money(m.ceiling)} ceiling` : ''}.` : `${roleLabel(nr.roleId)}: nobody free can take it in your production window.`); continue; }
    left -= pick.dayRate * days;
    picks.push({ roleId: nr.roleId, personId: pick.id, name: pick.name, dayRate: pick.dayRate, days, total: pick.dayRate * days });
  }
  return { picks, gaps, total: picks.reduce((a, x) => a + x.total, 0) };
}

/**
 * Writing's plan (the owner's v5 brief, 1: "commission/delegate development, drafts and revisions within an approved
 * mandate, with actual work, time, costs, review and delivery"). A series: an episode writer for each episode, each
 * writing its own draft, a different writer for each where enough are free. A film: a co-writer for a rewrite of the
 * approved script, then a script editor for a polish of it. Each the cheapest free who has worked before; each total
 * is the contract's day and the pass's days, with one revision allowed for in the money the plan asks.
 */
function writingPlan(state: GameState, p: Project): { picks: GuidePick[]; gaps: string[]; total: number } {
  const win = productionWindow(state, p);
  const used = new Set<string>();
  const picks: GuidePick[] = [];
  const gaps: string[] = [];
  const series = isEpisodic(p.axes.format);
  const jobs: { roleId: string; scope: WritingScope; episode: number }[] = series
    ? p.episodes.map((e) => ({ roleId: 'episode-writer', scope: 'draft' as WritingScope, episode: e.number }))
    : [{ roleId: 'co-writer', scope: 'rewrite', episode: 1 }, { roleId: 'script-editor', scope: 'polish', episode: 1 }];
  for (const j of jobs) {
    const what = `${roleLabel(j.roleId)}${series ? `, Episode ${j.episode}` : ''}`;
    if (!episodeMinutes(p, j.episode)) { gaps.push(`${what}: there is nothing in the approved script to write from yet.`); continue; }
    const pool = roleCandidates(state, p, j.roleId).filter((c) => c.experience >= 2 && isAvailable(state, c, win.from, win.to, p.id).ok).sort((a, b) => a.dayRate - b.dayRate);
    const pick = pool.find((c) => !used.has(c.id)) ?? pool[0];
    if (!pick) { gaps.push(`${what}: nobody free can take it in your production window.`); continue; }
    used.add(pick.id);
    const pass = passDays(p, j.scope, j.episode);
    const days = 1 + pass + Math.max(1, Math.ceil(pass * REVISION_SHARE));
    picks.push({ roleId: j.roleId, personId: pick.id, name: pick.name, dayRate: pick.dayRate, days, total: pick.dayRate * days, part: `${what}: ${SCOPE[j.scope].label}`, episodes: [j.episode], scope: j.scope });
  }
  return { picks, gaps, total: picks.reduce((a, x) => a + x.total, 0) };
}

/**
 * Writing's look: offer each approved writer their job; once they accept, commission their pass; accept a delivered
 * pass that reaches the standard, revise one that doesn't while the contract allows, and return the rest. A script
 * editor's polish waits for the rewrite it polishes to be accepted.
 */
function runWriting(state: GameState, p: Project, m: Mandate): void {
  for (const w of m.writers ?? []) {
    const what = `${roleLabel(w.roleId)}${isEpisodic(p.axes.format) ? `, Episode ${w.episodes[0]}` : ''}`;
    if (m.told.some((t) => t.startsWith(`${what}:`))) continue;
    const h = hiresOf(p, m).find((x) => x.personId === w.personId && x.roleId === w.roleId);
    const person = roleCandidates(state, p, w.roleId).find((c) => c.id === w.personId);
    if (!h) {
      if (!person) { tell(state, p, m, `${what}: the approved writer can no longer be offered it. Hire someone in Writing on the Crew page.`); continue; }
      if (mandateCommitted(p, m) + person.dayRate > m.ceiling) { tell(state, p, m, `${what}: offering it would go past the ceiling. Hire on the Crew page, or approve a higher ceiling.`); continue; }
      try {
        const made = makeOffer(state, p, { personId: w.personId, roleId: w.roleId, dayRate: person.dayRate, episodes: w.episodes });
        made.guided = m.id;
        const o = p.obligations.find((y) => y.id === made.obligationId);
        if (o) o.label = `${o.label} (Guide Me)`;
      } catch (e) { tell(state, p, m, `${what}: ${(e as Error).message}`); }
      continue;
    }
    if (h.status === 'declined' || h.status === 'released') { tell(state, p, m, `${what}: ${personById(state, w.personId, w.roleId).name} said no. Hire someone in Writing on the Crew page.`); continue; }
    if (h.status !== 'accepted') continue;
    for (const ep of w.episodes) {
      const job = (p.writing ?? []).filter((j) => j.hireId === h.id && j.episode === ep && j.scope === w.scope && j.status !== 'cancelled').at(-1);
      if (!job) {
        // The polish is of the rewrite: it waits until a rewrite of the episode has been accepted. Where the rewrite came
        // back to the player, so does the polish: Guide Me can't know when, or whether, they will accept it. Until
        // November 13, 2026 it waited, and the mandate never finished (found playing guide-me.spec).
        const rewrite = (m.writers ?? []).find((x) => x.scope === 'rewrite' && x.episodes.includes(ep));
        if (w.scope === 'polish' && rewrite && !(p.writing ?? []).some((j) => j.scope === 'rewrite' && j.episode === ep && j.status === 'accepted')) {
          const back = m.told.some((t) => t.startsWith(`${roleLabel(rewrite.roleId)}${isEpisodic(p.axes.format) ? `, Episode ${ep}` : ''}:`));
          if (back) tell(state, p, m, `${what}: the polish waits on the rewrite that came back to you. Commission it under Writing Work once you accept the rewrite.`);
          continue;
        }
        const why = commissionRefusal(p, h, w.scope, ep);
        if (why) { tell(state, p, m, `${what}: ${why}`); continue; }
        const cost = writingTerms(p, h, w.scope, ep).cost;
        if (mandateCommitted(p, m) + cost > m.ceiling) { tell(state, p, m, `${what}: the pass would go past the ceiling. Commission it under Writing Work, or approve a higher ceiling.`); continue; }
        commissionWriting(state, p, h.id, { scope: w.scope, episode: ep });
        continue;
      }
      if (job.status !== 'delivered') continue;
      const read = job.passes.at(-1)!.read ?? 0;
      if (read >= WRITING_STANDARD) { acceptWriting(state, p, job.id); continue; }
      const cost = revisionTerms(p, job).cost;
      if (!revisionRefusal(p, job) && mandateCommitted(p, m) + cost <= m.ceiling) { requestRevision(state, p, job.id, { focus: GUIDE_FOCUS, text: `Guide Me: it read ${read}, below the ${WRITING_STANDARD} it accepts.` }); continue; }
      tell(state, p, m, `${what}: the pass reads ${read}, below the ${WRITING_STANDARD} Guide Me accepts, ${revisionRefusal(p, job) ? 'and its revisions are used' : 'and another revision would go past the ceiling'}. Accept it or commission more under Writing Work.`);
    }
  }
}

/** Whether every approved writer's work is accepted or has come back to the player. */
function writingSettled(p: Project, m: Mandate): boolean {
  return (m.writers ?? []).every((w) => {
    const what = `${roleLabel(w.roleId)}${isEpisodic(p.axes.format) ? `, Episode ${w.episodes[0]}` : ''}`;
    if (m.told.some((t) => t.startsWith(`${what}:`))) return true;
    return w.episodes.every((ep) => (p.writing ?? []).some((j) => j.personId === w.personId && j.episode === ep && j.scope === w.scope && j.status === 'accepted'));
  });
}

/** A performer for each part nobody plays: free, of the part's age, the cheapest who fits; one person for one part. */
function castPlan(state: GameState, p: Project): { picks: GuidePick[]; gaps: string[]; total: number } {
  const win = productionWindow(state, p);
  const today = dateKey(state.now, getPlace(p.axes.basePlaceId).zone);
  const used = new Set<string>();
  const picks: GuidePick[] = [];
  const gaps: string[] = [];
  for (const part of openParts(p)) {
    const c = approvedCharacters(p).find((x) => x.id === part.characterId)!;
    const roleId = castRoleFor(part.method);
    const age = stageById(p, part.stage)?.age;
    const want = age !== undefined ? { min: age, max: age } : storyAge(c.ageInStory);
    const suits = (x: Person) => { const plays = playingAgeAt(x, today); return want ? !!plays && want.max >= plays[0] && want.min <= plays[1] : personAge(x, today) >= 18; };
    const days = estimateDays(p, roleId, part.characterId, part.method, state, part.stage);
    const name = partName(p, part.characterId, part.stage);
    const pick = roleCandidates(state, p, roleId).filter((x) => !used.has(x.id) && x.experience >= (want && want.max < 16 ? 1 : 3) && suits(x) && isAvailable(state, x, win.from, win.to, p.id).ok).sort((a, b) => a.dayRate - b.dayRate)[0];
    if (!pick) { gaps.push(`${name}: nobody free plays the part's age in your production window.`); continue; }
    used.add(pick.id);
    picks.push({ roleId, personId: pick.id, name: pick.name, dayRate: pick.dayRate, days, total: pick.dayRate * days, ...part, part: name });
  }
  return { picks, gaps, total: picks.reduce((a, x) => a + x.total, 0) };
}

/** Why a mandate can't be approved, or null. */
export function guideMeRefusal(p: Project, dept: string, ceiling: number): string | null {
  if (p.approvedDraft === null) return 'Approve a draft before hiring.';
  if (p.delivered) return 'This project has been delivered.';
  if (activeMandate(p, dept)) return 'Guide Me is already staffing this department. Take it back to manual first to set another ceiling.';
  if (!(ceiling > 0) || !Number.isFinite(ceiling)) return 'Set a spending ceiling above zero.';
  const available = ledgerTotals(p).available;
  if (ceiling > available) return `A ceiling of ${money(ceiling)} is more than the ${money(available)} uncommitted. Raise the rest first, or set a lower ceiling.`;
  return null;
}

/** Approve Guide Me for a department with a ceiling: it acts at once, then looks again each day until the department is staffed. */
export function approveGuideMe(state: GameState, p: Project, dept: string, ceiling: number): Mandate {
  const no = guideMeRefusal(p, dept, ceiling);
  if (no) throw new Error(no);
  const m: Mandate = { id: newId(state, 'gm'), dept, ceiling: Math.round(ceiling), approvedAt: state.now, told: [] };
  // Casting: the performers in the plan the player read are the only ones it may offer.
  if (dept === CAST) m.picks = castPlan(state, p).picks.map((x) => ({ characterId: x.characterId!, method: x.method!, ...(x.stage ? { stage: x.stage } : {}), personId: x.personId }));
  // Writing: the writers in the plan the player read, each for their episodes and pass.
  if (dept === WRITING) m.writers = writingPlan(state, p).picks.map((x) => ({ roleId: x.roleId, personId: x.personId, episodes: x.episodes!, scope: x.scope! }));
  (p.mandates ??= []).push(m);
  addLog(state, dept === WRITING
    ? `Guide Me is writing ${p.title} within ${money(m.ceiling)}. It offers the writers you approved their jobs, commissions their passes, accepts a pass that reads ${WRITING_STANDARD} or more, asks for a revision of one that doesn't, and brings you anything over the ceiling or still short.`
    : dept === CAST
    ? `Guide Me is casting ${p.title} within ${money(m.ceiling)}. It offers the performers you approved at their asking rates, and brings you any who decline and anything over that.`
    : `Guide Me is staffing ${dept} on ${p.title} within ${money(m.ceiling)}. It sends offers at asking rates, tries someone else when one declines, and brings you anything over that.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: dept === CAST ? 'cast' : 'crew' } });
  runMandate(state, p, m);
  return m;
}

/** Back to manual: the mandate ends, and offers it already sent stay as they are. */
export function endGuideMe(state: GameState, p: Project, dept: string): void {
  const m = activeMandate(p, dept);
  if (!m) throw new Error('Guide Me is not staffing this department.');
  m.endedAt = state.now; m.ended = 'manual';
  addLog(state, `${dept} on ${p.title} is back to manual. Offers already sent stay open.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'crew' } });
}

const tell = (state: GameState, p: Project, m: Mandate, text: string) => {
  if (m.told.includes(text)) return;
  m.told.push(text);
  addLog(state, `Guide Me, ${m.dept} on ${p.title}: ${text}`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: m.dept === CAST ? 'cast' : 'crew' } });
};

/** Casting's look: the approved performers for parts still open, once each; a decline or a refusal is the player's. */
function runCasting(state: GameState, p: Project, m: Mandate): void {
  for (const x of m.picks ?? []) {
    const name = partName(p, x.characterId, x.stage);
    const mine = hiresOf(p, m).filter((h) => h.personId === x.personId && samePart(h, x.characterId, x.method, x.stage));
    if (mine.some((h) => h.status === 'declined')) { tell(state, p, m, `${name}: they declined. Choose someone on the Cast page.`); continue; }
    if (mine.length || !openParts(p).some((o) => samePart(o, x.characterId, x.method, x.stage))) continue;
    const roleId = castRoleFor(x.method);
    const days = estimateDays(p, roleId, x.characterId, x.method, state, x.stage);
    const person = roleCandidates(state, p, roleId).find((c) => c.id === x.personId);
    if (!person) { tell(state, p, m, `${name}: the approved performer can no longer be offered it. Choose someone on the Cast page.`); continue; }
    if (mandateCommitted(p, m) + person.dayRate * days > m.ceiling) { tell(state, p, m, `${name}: ${person.name}'s offer would go past the ceiling now. Offer it on the Cast page, or approve a higher ceiling.`); continue; }
    try {
      const h = makeOffer(state, p, { personId: x.personId, roleId, dayRate: person.dayRate, characterId: x.characterId, method: x.method, ...(x.stage ? { stage: x.stage } : {}) });
      h.guided = m.id;
      const o = p.obligations.find((y) => y.id === h.obligationId);
      if (o) o.label = `${o.label} (Guide Me)`;
    } catch (e) {
      tell(state, p, m, `${name}: ${(e as Error).message} Choose someone on the Cast page.`);
    }
  }
}

/** One look at the department: counters, then offers for what is still open, then done or tomorrow. */
export function runMandate(state: GameState, p: Project, m: Mandate): void {
  if (m.endedAt !== undefined) return;
  if (p.delivered || p.shelved) { m.endedAt = state.now; m.ended = 'manual'; return; }
  // A counteroffer it may accept: the extra still fits under the ceiling and in the money. Otherwise it is the player's.
  for (const h of hiresOf(p, m).filter((x) => x.status === 'countered' && x.counterRate)) {
    const held = p.obligations.find((o) => o.id === h.obligationId)?.amount ?? 0;
    const extra = h.counterRate! * h.estDays - held;
    if (mandateCommitted(p, m) + extra <= m.ceiling && extra <= ledgerTotals(p).available) acceptCounter(state, p, h.id);
    else tell(state, p, m, `${h.characterId ? partName(p, h.characterId, h.stage) : roleLabel(h.roleId)}: the counteroffer of ${money(h.counterRate!)} a day needs ${money(extra)} more, beyond the ceiling. Accept or decline it on the ${m.dept === CAST ? 'Cast' : 'Crew'} page, or approve a higher ceiling.`);
  }
  if (m.dept === WRITING) {
    runWriting(state, p, m);
    if (writingSettled(p, m)) {
      m.endedAt = state.now; m.ended = 'done';
      addLog(state, `Guide Me finished writing ${p.title}: ${money(mandateCommitted(p, m))} of the ${money(m.ceiling)} ceiling committed.${m.told.length ? ' Some of it came back to you.' : ''}`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'crew' } });
      return;
    }
    schedule(state, state.now + GUIDE_ME_LOOK_DAYS * DAY, 'guide-me', { projectId: p.id, mandateId: m.id }, { attention: 'silent', priority: 40, id: `guide-me:${m.id}:${state.now + GUIDE_ME_LOOK_DAYS * DAY}` });
    return;
  }
  if (m.dept === CAST) {
    runCasting(state, p, m);
    const waiting = hiresOf(p, m).some((h) => h.status === 'offered' || h.status === 'countered');
    const pending = (m.picks ?? []).some((x) => !hiresOf(p, m).some((h) => h.personId === x.personId && samePart(h, x.characterId, x.method, x.stage)) && openParts(p).some((o) => samePart(o, x.characterId, x.method, x.stage)) && !m.told.some((t) => t.startsWith(`${partName(p, x.characterId, x.stage)}:`)));
    if (!waiting && !pending) {
      m.endedAt = state.now; m.ended = 'done';
      addLog(state, `Guide Me finished casting ${p.title}: ${money(mandateCommitted(p, m))} of the ${money(m.ceiling)} ceiling committed.${m.told.length ? ' Some parts came back to you.' : ''}`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'cast' } });
      return;
    }
    schedule(state, state.now + GUIDE_ME_LOOK_DAYS * DAY, 'guide-me', { projectId: p.id, mandateId: m.id }, { attention: 'silent', priority: 40, id: `guide-me:${m.id}:${state.now + GUIDE_ME_LOOK_DAYS * DAY}` });
    return;
  }
  const { picks, gaps } = guideMePlan(state, p, m.dept, m);
  for (const x of picks) {
    const h = makeOffer(state, p, { personId: x.personId, roleId: x.roleId, dayRate: x.dayRate });
    h.guided = m.id;
    const o = p.obligations.find((y) => y.id === h.obligationId);
    if (o) o.label = `${o.label} (Guide Me)`;
  }
  for (const g of gaps) tell(state, p, m, g);
  const open = requiredCrewPlan(state, p).filter((x) => x.nr.dept === m.dept).length;
  const waiting = hiresOf(p, m).some((h) => h.status === 'offered' || h.status === 'countered');
  if (!open && !waiting) {
    m.endedAt = state.now; m.ended = 'done';
    addLog(state, `Guide Me finished staffing ${m.dept} on ${p.title}: ${money(mandateCommitted(p, m))} of the ${money(m.ceiling)} ceiling committed.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'crew' } });
    return;
  }
  schedule(state, state.now + GUIDE_ME_LOOK_DAYS * DAY, 'guide-me', { projectId: p.id, mandateId: m.id }, { attention: 'silent', priority: 40, id: `guide-me:${m.id}:${state.now + GUIDE_ME_LOOK_DAYS * DAY}` });
}

registerHandler('guide-me', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const m = p?.mandates?.find((x) => x.id === ev.payload.mandateId);
  if (p && m) runMandate(state, p, m);
  return { suppressInterrupt: true };
});
