// Editing, delivery, credits, quality (a labeled game model), release and distribution.

import { approvedTake, captureCredit } from './mocap';
import { LOST_TURNING_POINT_COST, SUBTITLE_PER_THOUSAND_WORDS, ageRating, dialogueWords, isTurningPoint, pitchMissing } from './script-effects';
import { financeCredits, onProjectDelivered, receiveIncome } from './finance';
import { getPlace } from '../data/places';
import { cancel, closeSettled, ledgerTotals, money, reserve, settle } from './budget';
import { AUTHENTIC_CASTING_BONUS, countryLanguage, personById, roleLabel, sharedHeritages } from './people';
import {
  approvalRights, approvedCharacters, approvedScenes, isEpisodic, isNonfiction, projectModules, scriptIssues, sceneLabel, sceneTechnique,
} from './projects';
import { composeGenres } from './genres';
import { ensureWorkEvent, schedulePickups } from './production';
import { gaussian, pick, stream } from './rng';
import { addLog, cancelEvents, newId, registerHandler, schedule } from './state';
import { redactionComplete } from './unscripted';
import { DAY, addDaysToKey, dateKey, formatDateKey, isDateKey, localToInstant, parseYmd } from './time';
import type { Credit, DistributionOffer, GameState, Project, ReleaseRecord, Task } from './types';

// ---------------- Editing ----------------

export function assemblyComplete(p: Project): boolean {
  const asm = p.tasks.filter((t) => t.kind === 'post:assembly');
  return asm.length > 0 && asm.every((t) => t.status === 'done');
}

export function startCutPass(state: GameState, p: Project): Task {
  if (!assemblyComplete(p)) throw new Error('The assembly edit isn\'t finished yet.');
  if (p.edit.pictureLocked) throw new Error('The picture is locked. Unlock it before cutting again.');
  if (p.tasks.some((t) => t.kind === 'post:cutpass' && t.status !== 'done')) throw new Error('A cut pass is already in progress.');
  const n = p.edit.cutPasses + 1;
  const minutes = approvedScenes(p).reduce((a, s) => a + s.estMinutes, 0);
  const task: Task = {
    id: `post:cutpass:${n}`, kind: 'post:cutpass', label: `Cut Pass ${n}`, dept: 'Post Production', roleId: 'editor', units: Math.max(2, Math.round(minutes / 12)),
    unitLabel: 'days', done: 0, dependsOn: [], status: 'waiting', episode: 1, sceneIds: [], workedDays: 0,
  };
  p.tasks.push(task);
  ensureWorkEvent(state, p);
  addLog(state, `Cut pass ${n} on ${p.title} has started.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'edit' } });
  return task;
}

export function coverageGaps(p: Project): { sceneId: string; label: string; reason: string }[] {
  const out: { sceneId: string; label: string; reason: string }[] = [];
  for (const s of approvedScenes(p)) {
    const c = p.captures.find((x) => x.sceneId === s.id);
    const tech = sceneTechnique(p, s);
    if (tech !== 'live' && !c) continue; // animated scenes are tracked through their tasks
    if (s.kind === 'archival' || s.kind === 'narration') continue;
    if (!c || c.captured < 0.8) out.push({ sceneId: s.id, label: sceneLabel(p, s), reason: 'Not enough material was captured.' });
    else if (c.version !== p.approvedDraft) out.push({ sceneId: s.id, label: sceneLabel(p, s), reason: 'It was shot from an older draft.' });
    else if (c.weatherCompromised) out.push({ sceneId: s.id, label: sceneLabel(p, s), reason: 'It was shot in bad weather.' });
  }
  return out;
}

export function requestPickups(state: GameState, p: Project, sceneIds: string[]): number {
  if (p.edit.pictureLocked) throw new Error('The picture is locked. Unlock it to add pickups.');
  const live = sceneIds.filter((id) => {
    const s = approvedScenes(p).find((x) => x.id === id);
    return s && sceneTechnique(p, s) === 'live';
  });
  if (!live.length) throw new Error('Choose live-action scenes to reshoot.');
  for (const id of live) {
    const c = p.captures.find((x) => x.sceneId === id);
    if (c) {
      c.captured = Math.min(c.captured, 0.5);
      c.weatherCompromised = false;
    }
  }
  p.edit.pickupsNeeded = [...new Set([...p.edit.pickupsNeeded, ...live])];
  return schedulePickups(state, p, live);
}

export function lockBlockers(p: Project): string[] {
  const out: string[] = [];
  if (!assemblyComplete(p)) out.push('Finish the assembly edit.');
  const needed = approvalRights(p).includes('Picture Approval') ? 2 : 1;
  if (p.edit.cutPasses < needed) {
    out.push(needed === 2 ? 'The commissioner approves the cut after at least two cut passes.' : 'Complete at least one cut pass.');
  }
  if (p.tasks.some((t) => t.kind === 'post:cutpass' && t.status !== 'done')) out.push('Wait for the current cut pass to finish.');
  if (p.schedule.days.some((d) => d.status === 'scheduled')) out.push('Some shoot days are still scheduled.');
  const gaps = coverageGaps(p).filter((g) => g.reason === 'Not enough material was captured.');
  if (gaps.length) out.push(`${gaps[0].label} is missing coverage.`);
  return out;
}

export function lockPicture(state: GameState, p: Project): void {
  const b = lockBlockers(p);
  if (b.length) throw new Error(b[0]);
  p.edit.pictureLocked = true;
  p.edit.lockedAt = state.now;
  ensureWorkEvent(state, p);
  addLog(state, `You locked picture on ${p.title}. Sound, music, color and captions can now finish.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'edit' } });
  p.history.push({ at: state.now, text: 'Picture locked.' });
}

export function unlockPicture(state: GameState, p: Project): string[] {
  if (!p.edit.pictureLocked) throw new Error('The picture isn\'t locked.');
  if (p.delivered) throw new Error('A delivered project can\'t be unlocked.');
  p.edit.pictureLocked = false;
  const reset: string[] = [];
  for (const t of p.tasks) {
    if (t.dependsOn.some((d) => d.startsWith('milestone:lock')) && t.done > 0) {
      t.done = 0;
      t.status = 'waiting';
      reset.push(t.label);
    }
  }
  addLog(state, `You unlocked picture on ${p.title}.${reset.length ? ` ${reset.length} finishing ${reset.length === 1 ? 'task restarts' : 'tasks restart'}.` : ''}`, 'project', { projectId: p.id });
  return reset;
}

// ---------------- Delivery ----------------

export function deliveryBlockers(p: Project): string[] {
  const out: string[] = [];
  if (!p.edit.pictureLocked) out.push('Lock picture first.');
  const open = p.tasks.filter((t) => t.status !== 'done');
  if (open.length) out.push(`${open.length} production ${open.length === 1 ? 'task is' : 'tasks are'} unfinished, including ${open[0].label}.`);
  const contributorsUsed = new Set(approvedScenes(p).flatMap((s) => s.contributorIds));
  const noConsent = p.contributors.filter((c) => contributorsUsed.has(c.id) && c.consent !== 'given' && c.consent !== 'withdrawn');
  if (noConsent.length) out.push(`${noConsent[0].name} hasn't given consent to appear.`);
  const unredacted = p.contributors.filter((c) => c.consent === 'withdrawn' && contributorsUsed.has(c.id) && !redactionComplete(p, c.id));
  if (unredacted.length) out.push(`${unredacted[0].name} withdrew; their footage still has to be redacted.`);
  if (isNonfiction(p.axes.format) && p.evidence.some((e) => e.status !== 'dramatized' && !e.verified)) out.push('Some claims haven\'t been verified.');
  return out;
}

export function deliver(state: GameState, p: Project): void {
  const b = deliveryBlockers(p);
  if (b.length) throw new Error(b[0]);
  const runtime = Math.round(approvedScenes(p).reduce((a, s) => a + s.estMinutes, 0));
  p.delivered = { at: state.now, runtimeMin: runtime };
  onProjectDelivered(state, p);
  p.phase = 'delivered';
  p.quality = assessQuality(state, p);
  p.credits = computeCredits(state, p);
  // Remaining agreed days that were never worked are released, not paid.
  for (const h of p.hires.filter((x) => x.status === 'accepted')) {
    if (h.obligationId) cancel(state, p, h.obligationId);
  }
  for (const o of p.obligations.filter((x) => x.state === 'reserved' || (x.ref?.startsWith('plan:') && x.state === 'committed'))) cancel(state, p, o.id);
  const ps = Object.values(state.people);
  for (const x of ps) x.bookings = x.bookings.filter((b2) => b2.projectId !== p.id);
  addLog(state, `${p.title} is delivered. It runs ${runtime} ${runtime === 1 ? 'minute' : 'minutes'}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  p.history.push({ at: state.now, text: `Delivered at ${runtime} minutes. Spent ${money(ledgerTotals(p).settled)}.` });
  // Distributors hear about it.
  schedule(state, state.now + 5 * DAY, 'distribution-offer', { projectId: p.id, wave: 'delivery' }, { attention: 'notify', priority: 55 });
}

// ---------------- Credits ----------------

export function computeCredits(state: GameState, p: Project): Credit[] {
  const out: Credit[] = [];
  const me = state.character.name;
  let billing = 0;
  const add = (c: Omit<Credit, 'id' | 'billing'>) => out.push({ ...c, id: `cr${out.length + 1}`, billing: billing++ });
  const episodic = isEpisodic(p.axes.format);
  const nonfiction = isNonfiction(p.axes.format);
  // Writing: the player wrote unless an episode writer was hired for an episode.
  const playerWroteEps = p.episodes.filter((e) => e.writer === 'player').map((e) => e.number);
  if (playerWroteEps.length && !nonfiction) add({ person: 'player', personName: me, contribution: 'Written By', roleId: 'writer', episodes: episodic ? playerWroteEps : 'all' });
  for (const e of p.episodes.filter((x) => x.writer !== 'player')) {
    add({ person: e.writer, personName: personById(state, e.writer).name, contribution: 'Written By', roleId: 'episode-writer', episodes: [e.number] });
  }
  for (const h of p.hires.filter((x) => x.roleId === 'co-writer' && x.daysWorked > 0)) {
    add({ person: h.personId, personName: personById(state, h.personId).name, contribution: 'Co-Written By', roleId: 'co-writer', episodes: h.episodes });
  }
  const playerDirectedEps = p.episodes.filter((e) => e.director === 'player').map((e) => e.number);
  if (playerDirectedEps.length) add({ person: 'player', personName: me, contribution: 'Directed By', roleId: 'director', episodes: episodic ? playerDirectedEps : 'all' });
  for (const e of p.episodes.filter((x) => x.director !== 'player')) {
    add({ person: e.director, personName: personById(state, e.director).name, contribution: 'Directed By', roleId: 'episode-director', episodes: [e.number] });
  }
  add({ person: 'player', personName: me, contribution: episodic ? 'Executive Producer And Showrunner' : 'Produced By', roleId: 'producer', episodes: 'all' });
  for (const x of p.funding.extra) add({ person: 'partner', personName: x.label, contribution: 'Co-Production Partner', roleId: 'co-producer', episodes: 'all' });
  for (const c of financeCredits(p)) add({ person: 'backer', personName: c.backer, contribution: c.label, roleId: 'backer', episodes: 'all' });
  const chars = approvedCharacters(p);
  const sizeOrder = ['lead', 'co-lead', 'ensemble-lead', 'supporting', 'featured', 'cameo', 'background'];
  const cast = [...p.cast].sort((a, b) => sizeOrder.indexOf(chars.find((c) => c.id === a.characterId)?.roleSize ?? 'background') - sizeOrder.indexOf(chars.find((c) => c.id === b.characterId)?.roleSize ?? 'background'));
  for (const a of cast) {
    const c = chars.find((x) => x.id === a.characterId);
    if (!c) continue;
    const eps = [...new Set(approvedScenes(p).filter((s) => s.participants.includes(c.id)).map((s) => s.episode))];
    if (!eps.length) continue;
    // A series regular is credited in every episode; everyone else in the episodes they appear in.
    const credited = episodic && c.seriesInvolvement === 'regular' ? 'all' : episodic ? eps : 'all';
    const name = a.performer === 'player' ? me : personById(state, a.performer).name;
    add({ person: a.performer, personName: name, contribution: a.method === 'voice' ? 'Voice Cast' : a.method === 'motion-capture' ? captureCredit(p.mocap?.[c.id]?.parts) : 'Cast', roleId: a.method === 'voice' ? 'voice-actor' : 'actor', characterName: c.name, episodes: credited });
  }
  // Performers replaced after contributing keep their credit while their work is still in the film: a capture of a
  // scene they performed, or the approved motion-capture take.
  for (const h of p.hires.filter((x) => x.kind === 'cast' && x.status === 'released' && x.daysWorked > 0 && x.characterId)) {
    const c = chars.find((x) => x.id === h.characterId);
    if (!c || p.cast.some((a) => a.characterId === c.id && a.performer === h.personId)) continue;
    const scenesOf = approvedScenes(p).filter((s) => s.participants.includes(c.id));
    const inCapture = h.method !== 'voice' && h.method !== 'motion-capture' && p.captures.some((cp) => scenesOf.some((s) => s.id === cp.sceneId) && cp.performers?.includes(h.personId));
    const inTake = h.method === 'motion-capture' && approvedTake(p, c.id)?.performer === h.personId;
    if (!inCapture && !inTake) continue;
    const eps = [...new Set(scenesOf.map((s) => s.episode))];
    add({ person: h.personId, personName: personById(state, h.personId).name, contribution: h.method === 'motion-capture' ? captureCredit(p.mocap?.[c.id]?.parts) : 'Cast', roleId: 'actor', characterName: c.name, episodes: episodic ? eps : 'all' });
  }
  for (const h of p.hires.filter((x) => x.kind === 'crew' && x.daysWorked > 0 && x.roleId !== 'co-writer' && x.roleId !== 'episode-writer' && x.roleId !== 'episode-director')) {
    add({ person: h.personId, personName: personById(state, h.personId).name, contribution: roleLabel(h.roleId), roleId: h.roleId, episodes: h.episodes });
  }
  return out;
}

// ---------------- Quality: a labeled game model ----------------

const avg = (xs: number[], d = 50) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : d);
const clamp = (x: number) => Math.round(Math.max(0, Math.min(100, x)));

/**
 * Modeled assessments used by festival programmers and award voters. These are explicit game
 * assumptions built from inspectable facts (script structure, staffing, coverage, schedule
 * outcomes, edit passes). They are not a claim that software can measure artistic merit.
 */
export function assessQuality(state: GameState, p: Project): Record<string, number> {
  const scenes = approvedScenes(p);
  const issues = scriptIssues({ ...p, scenes, characters: approvedCharacters(p) } as Project);
  const notes = issues.filter((i) => i.severity === 'note').length;
  const objectives = scenes.filter((s) => s.kind !== 'scripted' || s.objective.trim()).length / Math.max(1, scenes.length);
  const setups = p.setups.length ? p.setups.filter((x) => x.plantedIn && x.paidIn).length / p.setups.length : 0.6;
  const { questions } = composeGenres(p.axes.genres.map((g) => g.id));
  const answered = questions.length ? questions.filter((q) => (p.genreNotes[q.key] ?? '').trim()).length / questions.length : 0.7;
  // Only notes the readiness checks raised count, once a revision pass has addressed them. Notes you write yourself are
  // for your own process, and a pass with nothing to address adds nothing: repeating passes can't manufacture quality.
  // ...and only when the check it came from is gone from the script's readiness checks.
  const open = new Set(issues.map((i) => i.text));
  const addressed = p.notes.filter((n) => n.status === 'addressed' && n.source === 'readiness' && !open.has(n.text)).length;
  const writerHelp = p.hires.filter((h) => ['co-writer', 'script-editor'].includes(h.roleId) && h.status !== 'declined').map((h) => personById(state, h.personId).capability);
  // Free text is checked for presence only (objectives, answers to genre questions), so it weighs little; structure the
  // engine can follow (setups planted and paid off in named scenes), addressed readiness notes and skilled writing help
  // weigh more. Filling every field on your own tops out around 70 of 100.
  const script = clamp(40 + objectives * 6 + setups * 10 + answered * 4 + Math.min(10, addressed * 2) - Math.min(20, notes * 1.5) + (writerHelp.length ? (avg(writerHelp) - 50) / 3 : 0));
  const caps = p.captures.filter((c) => scenes.some((s) => s.id === c.sceneId));
  const captureQ = avg(caps.map((c) => c.quality), 60);
  const lostDays = p.schedule.days.filter((d) => d.status === 'lost').length;
  const totalDays = Math.max(1, p.schedule.days.length);
  const crewCap = (r: string) => {
    const h = p.hires.find((x) => x.roleId === r && x.daysWorked > 0);
    return h ? personById(state, h.personId).capability : null;
  };
  const cut = Math.min(10, p.edit.cutPasses * 4);
  const direction = clamp(captureQ * 0.7 + 18 + cut - (lostDays / totalDays) * 20);
  const anim = ['animator', 'stopmo-animator', 'layout-artist', 'lighting-artist'].map(crewCap).filter((x): x is number => x !== null);
  const craftRoles = ['dop', 'production-designer', 'costume-designer', 'sound-designer', 'editor', 'composer', 'colorist', 'visdev-artist'];
  const craftCaps = craftRoles.map(crewCap).filter((x): x is number => x !== null);
  const craft = clamp(avg([...craftCaps, ...anim], 50) * 0.85 + 8);
  // A turning point the shoot never captured leaves a hole the edit can't cover (script-effects.ts).
  const lostBeats = scenes.filter((s) => isTurningPoint(s) && sceneTechnique(p, s) === 'live' && !p.captures.some((c) => c.sceneId === s.id)).length;
  const out: Record<string, number> = { script, direction, craft, editing: clamp((crewCap('editor') ?? 50) * 0.7 + cut * 2 + 10 - lostBeats * LOST_TURNING_POINT_COST), music: clamp((crewCap('composer') ?? 45) * 0.9 + 5) };
  if (anim.length) out.animation = clamp(avg(anim) * 0.9 + 6);
  for (const a of p.cast) {
    const sc = scenes.filter((s) => s.participants.includes(a.characterId)).map((s) => p.captures.find((c) => c.sceneId === s.id)?.quality ?? 60);
    const base = a.performer === 'player' ? 58 + Math.min(14, p.schedule.rehearsalDays * 2) : personById(state, a.performer).capability;
    // Authentic casting: a performer who shares a background the character is written with brings lived experience to it.
    // Never a penalty: a character written without backgrounds, or played by someone who doesn't share them, scores as before.
    const lived = sharedHeritages(state, p, a.characterId, a.performer).length ? AUTHENTIC_CASTING_BONUS : 0;
    out[`performance:${a.characterId}:${a.performer}`] = clamp(base * 0.6 + avg(sc, 60) * 0.4 + lived);
  }
  const perf = avg(Object.entries(out).filter(([k]) => k.startsWith('performance:')).map(([, v]) => v), 55);
  // Rounded to the nearest whole value; never derived from genre labels or budget size, and identity only ever adds (authentic casting).
  out.overall = clamp(script * 0.3 + direction * 0.25 + craft * 0.2 + perf * 0.25);
  const r = stream(state.seed, 'reception', p.id);
  out.reception = clamp(out.overall + gaussian(r, 0, 8)); // audiences and critics vary
  return out;
}

export function qualityWords(n: number): string {
  if (n >= 85) return 'Exceptional';
  if (n >= 72) return 'Strong';
  if (n >= 60) return 'Solid';
  if (n >= 45) return 'Uneven';
  return 'Weak';
}

// ---------------- Release ----------------

export const ROUTE_LABELS: Record<ReleaseRecord['route'], string> = {
  'festival-premiere': 'Festival Premiere', theatrical: 'Theatrical', streaming: 'Streaming', broadcast: 'Broadcast', digital: 'Digital Self-Release',
};

export function planRelease(state: GameState, p: Project, input: { route: ReleaseRecord['route']; date: string; territories: string[]; distributor?: string | null }): ReleaseRecord {
  if (!p.delivered) throw new Error('Deliver the project before planning a release.');
  if (input.route === 'festival-premiere') throw new Error('Festival premieres come from festival selection.');
  if (!input.territories.length) throw new Error('Choose at least one territory.');
  const zone = getPlace(p.axes.basePlaceId).zone;
  const today = dateKey(state.now, zone);
  if (!isDateKey(input.date)) throw new Error('Choose a real release date.');
  if (input.date < today) throw new Error('Choose a release date from today onward.');
  if ((input.route === 'theatrical' || input.route === 'broadcast') && !input.distributor) {
    throw new Error(input.route === 'theatrical' ? 'A theatrical release needs a distributor. Accept a distribution offer first.' : 'A broadcast needs a broadcaster. Accept an offer first.');
  }
  const rec: ReleaseRecord = { id: newId(state, 'r'), route: input.route, date: input.date, territories: input.territories, distributor: input.distributor ?? null, note: '', status: 'planned' };
  p.releases.push(rec);
  const { year, month, day } = parseYmd(input.date);
  schedule(state, localToInstant(zone, year, month, day, 9).instant, 'release', { projectId: p.id, releaseId: rec.id }, { attention: 'notify', priority: 30 });
  addLog(state, `${p.title} will be released (${ROUTE_LABELS[rec.route].toLowerCase()}) on ${formatDateKey(input.date)}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  return rec;
}

registerHandler('release', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const r = p?.releases.find((x) => x.id === ev.payload.releaseId);
  if (!p || !r || r.status !== 'planned') return { suppressInterrupt: true };
  r.status = 'released';
  p.phase = 'released';
  // The contract's delivery materials are paid now, once.
  if (r.obligationId) {
    const ob = p.obligations.find((x) => x.id === r.obligationId);
    if (ob && (ob.state === 'reserved' || ob.state === 'committed')) {
      settle(state, p, ob.id, ob.amount - ob.settled, `${ob.id}:release`);
      closeSettled(p, ob.id);
    }
  }
  if (!p.premiere) p.premiere = { kind: 'world', date: r.date, country: r.territories[0], venue: ROUTE_LABELS[r.route] };
  const text = `${p.title} is out today (${ROUTE_LABELS[r.route].toLowerCase()}).`;
  addLog(state, text, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  p.history.push({ at: state.now, text: `Released: ${ROUTE_LABELS[r.route]} on ${r.date}.` });
  return { message: text };
});

/** Release history before a date, for festival premiere and award qualification rules. */
export function publicShowingsBefore(p: Project, date: string): { date: string; country: string }[] {
  const out = p.releases.filter((r) => r.status === 'released' || r.date <= date).filter((r) => r.date < date).flatMap((r) => r.territories.map((c) => ({ date: r.date, country: c })));
  if (p.premiere && p.premiere.date < date) out.push({ date: p.premiere.date, country: p.premiere.country });
  return out;
}

// ---------------- Distribution offers (simulated distributors) ----------------

const DISTRIBUTORS = ['Northlight Pictures', 'Meridian Releasing', 'Harbor & Vine', 'Blue Hour Films', 'Kestrel Media', 'Lanternfish Distribution', 'Cobalt Screen', 'Open Field Releasing'];

registerHandler('distribution-offer', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  if (!p || !p.delivered || !p.quality) return { suppressInterrupt: true };
  const wave = String(ev.payload.wave);
  const r = stream(state.seed, 'distribution', p.id, wave);
  const exposure = (ev.payload.exposure as number | undefined) ?? 0;
  const appeal = p.quality.reception + exposure;
  // Distributors market from the logline and synopsis: without them, no one makes an offer.
  const pitch = pitchMissing(p);
  if (pitch) {
    const text = `No distributor could market ${p.title} without a logline and a premise. ${pitch.replace(': they read a pitch', '').replace(': it is the synopsis they read', '')} Offers can follow your next festival screening.`;
    addLog(state, text, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'script' } });
    return { message: text };
  }
  const rating = ageRating(p, approvedScenes(p));
  const count = appeal >= 80 ? 3 : appeal >= 65 ? 2 : appeal >= 50 ? 1 : 0;
  const runtimeFactor = Math.min(1, (p.delivered.runtimeMin) / 90);
  const made: DistributionOffer[] = [];
  for (let i = 0; i < count; i++) {
    // Broadcasters in this model don't carry 18+ work: those offers go to the other routes.
    const route = pick(r, rating === '18+' ? ['streaming', 'theatrical', 'digital', 'digital'] as const : ['streaming', 'theatrical', 'digital', 'broadcast'] as const);
    const mg = Math.round(((appeal - 40) * 6000 * runtimeFactor * (0.6 + r() * 0.8) * (route === 'theatrical' ? 1.4 : 1)) / 1000) * 1000;
    if (mg <= 0) continue;
    const offer: DistributionOffer = {
      id: newId(state, 'do'), distributor: pick(r, DISTRIBUTORS), route, minimumGuarantee: mg, territories: [getPlace(p.axes.basePlaceId).country],
      releaseWindowDays: 60 + Math.floor(r() * 90), expiresAt: state.now + 21 * DAY, status: 'open',
    };
    p.offers.push(offer);
    made.push(offer);
  }
  const text = made.length
    ? `${made.length === 1 ? `${made[0].distributor} made an offer` : `${made.length} distributors made offers`} for ${p.title}. Offers stay open for three weeks.`
    : `No distributors have made an offer for ${p.title} yet. You can still release it yourself.`;
  addLog(state, text, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  return { message: text };
});

export function acceptDistribution(state: GameState, p: Project, offerId: string): ReleaseRecord {
  const o = p.offers.find((x) => x.id === offerId);
  if (!o || o.status !== 'open') throw new Error('That offer is no longer open.');
  if (o.expiresAt < state.now) {
    o.status = 'expired';
    throw new Error('That offer has expired.');
  }
  // The contract obliges you to supply delivery materials; their cost is reserved now and paid on release.
  const materials = reserve(state, p, `Delivery Materials For ${o.distributor}`, 'post', DELIVERY_MATERIALS[o.route] + subtitlingCost(p, o.territories), `release-offer:${o.id}`);
  o.status = 'accepted';
  for (const other of p.offers.filter((x) => x.status === 'open' && x.route === o.route)) other.status = 'declined';
  p.revenue += receiveIncome(state, p, o.minimumGuarantee, o.distributor); // backers are repaid first
  const zone = getPlace(p.axes.basePlaceId).zone;
  const date = addDaysToKey(dateKey(state.now, zone), o.releaseWindowDays);
  addLog(state, `You accepted ${o.distributor}'s offer of ${money(o.minimumGuarantee)} for ${p.title}.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  const rec = planRelease(state, p, { route: o.route, date, territories: o.territories, distributor: o.distributor });
  rec.offerId = o.id;
  rec.obligationId = materials.id;
  return rec;
}

/** Subtitles for every territory whose language isn't the dialogue's, priced by the dialogue's words (script-effects.ts). */
export function subtitlingCost(p: Project, territories: string[]): number {
  const words = dialogueWords(approvedScenes(p));
  let cost = 0;
  for (const t of new Set(territories.map(countryLanguage))) {
    const foreign = Object.entries(words).filter(([lang]) => lang !== t).reduce((n, [, w]) => n + w, 0);
    cost += Math.ceil(foreign / 1000) * SUBTITLE_PER_THOUSAND_WORDS;
  }
  return cost;
}

/** Delivery materials a distributor's contract requires (captions, music and effects track, artwork), by route. Simulation assumption. */
export const DELIVERY_MATERIALS: Record<DistributionOffer['route'], number> = { theatrical: 6000, streaming: 4000, broadcast: 3000, digital: 1500 };

/** What cancelling a planned release does, in words, for the confirmation. */
export function releaseCancelTerms(p: Project, releaseId: string): string {
  const r = p.releases.find((x) => x.id === releaseId);
  const o = r?.offerId ? p.offers.find((x) => x.id === r.offerId) : undefined;
  if (!r || r.status !== 'planned') return '';
  if (!o) return 'The planned release is removed from your calendar.';
  return `${o.distributor}'s minimum guarantee of ${money(o.minimumGuarantee)} is returned and the delivery-materials budget is released.`;
}

/** Cancel a release before it happens. A contracted release returns the minimum guarantee and frees its reserved materials budget. */
export function cancelRelease(state: GameState, p: Project, releaseId: string): void {
  const r = p.releases.find((x) => x.id === releaseId);
  if (!r) throw new Error('That release is no longer planned.');
  if (r.status !== 'planned') throw new Error(r.status === 'released' ? 'This release has already happened.' : 'This release was already cancelled.');
  const offer = r.offerId ? p.offers.find((x) => x.id === r.offerId) : undefined;
  if (offer) {
    const ob = r.obligationId ? p.obligations.find((x) => x.id === r.obligationId) : undefined;
    const freed = ob && (ob.state === 'reserved' || ob.state === 'committed') ? ob.amount - ob.settled : 0;
    if (ledgerTotals(p).available + freed < offer.minimumGuarantee) {
      throw new Error(`Cancelling means returning ${money(offer.minimumGuarantee)} to ${offer.distributor}, and only ${money(ledgerTotals(p).available + freed)} would be free.`);
    }
  }
  r.status = 'cancelled';
  cancelEvents(state, (e) => e.kind === 'release' && e.payload.releaseId === r.id);
  if (r.obligationId) cancel(state, p, r.obligationId);
  const o = r.offerId ? p.offers.find((x) => x.id === r.offerId) : undefined;
  if (o) {
    o.status = 'cancelled';
    p.revenue -= o.minimumGuarantee;
  }
  addLog(state, `The ${ROUTE_LABELS[r.route].toLowerCase()} release of ${p.title} is cancelled.${o ? ` ${money(o.minimumGuarantee)} goes back to ${o.distributor}.` : ''}`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  p.history.push({ at: state.now, text: `Cancelled: ${ROUTE_LABELS[r.route]} release planned for ${r.date}.` });
}

export function declineDistribution(p: Project, offerId: string): void {
  const o = p.offers.find((x) => x.id === offerId);
  if (!o || o.status !== 'open') throw new Error('That offer is no longer open.');
  o.status = 'declined';
}

export { projectModules };
