// Search -> shortlist -> offer -> response (accept, counter, decline) -> assignment -> work -> credit.
// Responses are deterministic per offer, arrive after a delay on the shared clock, and depend on
// availability for the production window and the offered rate. Offers reserve (not spend) funds.

import { getPlace } from '../data/places';
import { cancel, commit, ledgerTotals, money, reserve, FundsError } from './budget';
import { genre } from './genres';
import { candidates, countryLanguage, isAvailable, personById, role, roleLabel, type Person } from './people';
import { buildTasks, coachingNeeded, estimatedShootDays, planShootDays } from './production';
import { approvalRights, approvedCharacters, approvedScenes, isNonfiction, projectModules, sceneTechnique } from './projects';
import { stream } from './rng';
import { addLog, newId, registerHandler, schedule } from './state';
import { DAY, HOUR, addDaysToKey, dateKey, formatDateKey, weekdayName, weekdayOfKey } from './time';
import type { CastAssignment, GameState, Hire, PerformanceMethod, Project } from './types';
import { PRONOUNS } from '../data/identity';

export interface NeededRole {
  roleId: string;
  reason: string;
  required: boolean;
  dept: string;
}

const LIVE_CORE: [string, string, boolean][] = [
  ['dop', 'Shoots every live-action day.', true],
  ['sound-mixer', 'Records dialogue on set. Without one, dialogue must be replaced in post.', false],
  ['gaffer', 'Lights interiors and night scenes.', false],
  ['first-ad', 'Runs the set. Days move slower without one.', false],
  ['hair-makeup', 'Prepares the cast each day.', false],
  ['editor', 'Cuts the picture.', true],
];

export function neededRoles(p: Project, state?: GameState): NeededRole[] {
  if (p.approvedDraft === null) return [];
  const out = new Map<string, NeededRole>();
  const add = (roleId: string, reason: string, required: boolean) => {
    if (roleId === 'director' || roleId === 'producer' || roleId === 'writer' || roleId === 'render') return;
    if (!out.has(roleId)) out.set(roleId, { roleId, reason, required, dept: role(roleId).dept });
  };
  const scenes = approvedScenes(p);
  const live = scenes.some((s) => sceneTechnique(p, s) === 'live' && s.kind !== 'archival');
  if (live) for (const [r, why, req] of LIVE_CORE) add(r, why, req);
  const tasks = p.tasks.length ? p.tasks : buildTasks(p);
  for (const t of tasks) add(t.roleId, `Needed for ${t.label.toLowerCase()}.`, true);
  const mods = projectModules(p);
  for (const s of scenes) {
    if (sceneTechnique(p, s) !== 'live') continue;
    if (s.stunts.trim()) add('stunt-coordinator', 'Required for scenes with stunts.', true);
    if (s.stunts.trim() && mods.has('combat')) add('fight-choreographer', 'Fight scenes need choreography.', true);
    if (s.animals.length) add('animal-wrangler', 'Required for scenes with animals.', true);
    if (s.vehicles.length) add('vehicle-coordinator', 'Required for scenes with picture vehicles.', true);
    if (s.water) add('marine-coordinator', 'Required for water work.', true);
    if (s.intimacy) add('intimacy-coordinator', 'Required for intimate scenes.', true);
    if (s.crowd > 20) add('extras-casting', 'Large crowds need background casting.', true);
    if (s.dance) add('choreographer', 'Dance scenes need a choreographer.', true);
  }
  if (p.cast.some((c) => c.performer === 'player') && live && p.episodes.some((e) => e.director === 'player')) {
    add('video-assist', "You're acting and directing. Playback helps you review your own takes.", false);
  }
  if (state && coachingNeeded(state, p).length) add('dialect-coach', 'Some performers need coaching in a dialogue language.', true);
  return [...out.values()].sort((a, b) => a.dept.localeCompare(b.dept) || roleLabel(a.roleId).localeCompare(roleLabel(b.roleId)));
}

/** Estimated paid days for a role, from the current plan or the approved breakdown. */
export function estimateDays(p: Project, roleId: string, characterId?: string, method?: PerformanceMethod): number {
  const tasks = p.tasks.length ? p.tasks : buildTasks(p);
  const shootDays = p.schedule.days.length ? p.schedule.days.filter((d) => d.status === 'scheduled' || d.status === 'shot' || d.status === 'partial').length : estimatedShootDays(p);
  if (characterId) {
    if (method === 'voice') return Math.max(1, tasks.filter((t) => t.kind === 'anim:voice' && t.assetRef === characterId).length);
    const scenes = approvedScenes(p).filter((s) => s.participants.includes(characterId) && sceneTechnique(p, s) === 'live');
    const ratio = scenes.length / Math.max(1, approvedScenes(p).filter((s) => sceneTechnique(p, s) === 'live').length);
    return Math.max(1, Math.ceil(shootDays * Math.max(ratio, 0.15)) + Math.ceil(p.schedule.rehearsalDays / 2));
  }
  const own = tasks.filter((t) => t.roleId === roleId).reduce((a, t) => a + Math.max(1, Math.ceil(t.units)), 0);
  const onSet = ['dop', 'sound-mixer', 'gaffer', 'first-ad', 'hair-makeup', 'camera-operator', 'video-assist', 'script-supervisor', 'boom-operator', 'key-grip', 'camera-assistant'].includes(roleId);
  const specialist = ['stunt-coordinator', 'animal-wrangler', 'vehicle-coordinator', 'marine-coordinator', 'intimacy-coordinator', 'extras-casting', 'choreographer', 'fight-choreographer', 'dialect-coach'].includes(roleId);
  let days = own;
  if (onSet) days += shootDays + 1;
  if (specialist) days += Math.max(1, Math.ceil(shootDays / 3));
  return Math.max(1, Math.min(own > 0 ? own + (onSet ? shootDays : 0) + 2 : days, 400));
}

export function productionWindow(state: GameState, p: Project): { from: string; to: string } {
  const zone = getPlace(p.axes.basePlaceId).zone;
  const today = dateKey(state.now, zone);
  const from = p.schedule.startDate && p.schedule.startDate > today ? p.schedule.startDate : addDaysToKey(today, 14);
  const lastShoot = p.schedule.days.reduce((m, d) => (d.date > m ? d.date : m), from);
  const length = Math.max(20, Math.ceil(estimateDays(p, 'editor') * 1.4));
  const to = lastShoot > addDaysToKey(from, length) ? lastShoot : addDaysToKey(from, length);
  return { from, to };
}

export function roleCandidates(state: GameState, p: Project, roleId: string): Person[] {
  return candidates(state, roleId, getPlace(p.axes.basePlaceId).country);
}

export function castRoleFor(method: PerformanceMethod): 'actor' | 'voice-actor' {
  return method === 'voice' ? 'voice-actor' : 'actor';
}

export interface OfferInput {
  personId: string;
  roleId: string;
  dayRate: number;
  characterId?: string;
  method?: PerformanceMethod;
  episodes?: number[] | 'all';
}

export function activeHireFor(p: Project, input: { roleId: string; characterId?: string; method?: PerformanceMethod; personId?: string }): Hire | undefined {
  return p.hires.find((h) =>
    (h.status === 'offered' || h.status === 'accepted' || h.status === 'countered') &&
    (input.personId ? h.personId === input.personId && h.roleId === input.roleId : false || (input.characterId ? h.characterId === input.characterId && h.method === input.method : false)));
}

export function makeOffer(state: GameState, p: Project, input: OfferInput): Hire {
  if (p.approvedDraft === null) throw new Error('Approve a draft before hiring.');
  if (p.delivered) throw new Error('This project has already been delivered.');
  const person = personById(state, input.personId);
  if (person.roleId !== input.roleId) throw new Error(`${person.name} doesn't work as ${roleLabel(input.roleId).toLowerCase()}.`);
  if (!(input.dayRate > 0) || !Number.isFinite(input.dayRate)) throw new Error('Offer a day rate above zero.');
  if (input.dayRate > person.dayRate * 3) throw new Error('That offer is far above any reasonable rate for this role.');
  if (p.hires.some((h) => h.personId === input.personId && h.roleId === input.roleId && h.characterId === input.characterId && ['offered', 'accepted', 'countered'].includes(h.status))) {
    throw new Error(`${person.name} already has an offer for this.`);
  }
  if (input.characterId) {
    const existing = p.cast.find((c) => c.characterId === input.characterId && c.method === (input.method ?? 'on-camera'));
    if (existing) throw new Error('That role is already cast. Release the current performer first.');
    if (p.hires.some((h) => h.characterId === input.characterId && h.method === (input.method ?? 'on-camera') && (h.status === 'offered' || h.status === 'countered'))) {
      throw new Error('There is already an open offer for this role.');
    }
  }
  if (input.characterId) {
    // One performer may play several characters, but never two who share a scene in the same way.
    const method = input.method ?? 'on-camera';
    const theirs = [
      ...p.cast.filter((c) => c.performer === input.personId && c.method === method).map((c) => c.characterId),
      ...p.hires.filter((h) => h.personId === input.personId && h.method === method && (h.status === 'offered' || h.status === 'countered') && h.characterId).map((h) => h.characterId!),
    ];
    const clash = approvedScenes(p).find((s) => s.participants.includes(input.characterId!) && theirs.some((c) => c !== input.characterId && s.participants.includes(c)));
    if (clash) {
      const other = approvedCharacters(p).find((c) => theirs.includes(c.id) && clash.participants.includes(c.id));
      throw new Error(`${person.name} can't play both roles. ${other?.name ?? 'Their other character'} is in the same scene.`);
    }
  }
  const days = estimateDays(p, input.roleId, input.characterId, input.method);
  const amount = input.dayRate * days;
  const label = input.characterId
    ? `${person.name} as ${approvedCharacters(p).find((c) => c.id === input.characterId)?.name ?? 'cast'}`
    : `${person.name}, ${roleLabel(input.roleId)}`;
  const o = reserve(state, p, label, role(input.roleId).cast ? 'cast' : 'crew', amount);
  const r = stream(state.seed, 'offer-delay', p.id, input.personId, p.hires.length);
  const lead = input.characterId && ['lead', 'co-lead', 'ensemble-lead'].includes(approvedCharacters(p).find((c) => c.id === input.characterId)?.roleSize ?? '');
  const approvalDelay = lead && approvalRights(p).includes('Casting Approval') ? 2 * DAY : 0;
  const responseAt = state.now + DAY + Math.floor(r() * 2 * DAY) + approvalDelay;
  const hire: Hire = {
    id: newId(state, 'h'), personId: input.personId, roleId: input.roleId, kind: role(input.roleId).cast ? 'cast' : 'crew', characterId: input.characterId,
    method: input.characterId ? input.method ?? 'on-camera' : undefined, episodes: input.episodes ?? 'all', dayRate: Math.round(input.dayRate), estDays: days,
    status: 'offered', offeredAt: state.now, responseAt, obligationId: o.id, daysWorked: 0,
  };
  o.ref = hire.id;
  p.hires.push(hire);
  schedule(state, responseAt, 'offer-response', { projectId: p.id, hireId: hire.id }, { attention: 'notify', priority: 35 });
  return hire;
}

registerHandler('offer-response', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const h = p?.hires.find((x) => x.id === ev.payload.hireId);
  if (!p || !h || h.status !== 'offered') return { suppressInterrupt: true };
  const message = resolveOffer(state, p, h);
  return { message };
});

export function resolveOffer(state: GameState, p: Project, h: Hire): string {
  const person = personById(state, h.personId);
  const subject = PRONOUNS[person.pronouns].subject;
  const cap = subject.charAt(0).toUpperCase() + subject.slice(1);
  const r = stream(state.seed, 'offer', h.id)();
  const win = productionWindow(state, p);
  const avail = isAvailable(state, person, win.from, win.to, p.id);
  const roleWord = h.characterId ? `the role of ${approvedCharacters(p).find((c) => c.id === h.characterId)?.name}` : `the ${roleLabel(h.roleId).toLowerCase()} job`;
  const lead = h.characterId && ['lead', 'co-lead', 'ensemble-lead'].includes(approvedCharacters(p).find((c) => c.id === h.characterId)?.roleSize ?? '');
  let text: string;
  if (!avail.ok) {
    decline(state, p, h);
    text = `${person.name} turned down ${roleWord}. ${cap} ${person.pronouns === 'they' ? "aren't" : "isn't"} free during your production.`;
  } else if (lead && approvalRights(p).includes('Casting Approval') && person.experience < 3) {
    decline(state, p, h);
    text = `Your ${p.funding.scenarioId === 'commissioned' ? 'commissioner' : 'co-production partner'} didn't approve ${person.name} for ${roleWord}. They want a more experienced lead.`;
  } else {
    const ratio = h.dayRate / person.dayRate;
    if (ratio >= 1 || (ratio >= 0.9 && r < 0.6)) {
      try {
        accept(state, p, h, h.dayRate);
        text = acceptedText(state, p, h, person.name, person.pronouns);
      } catch (e) {
        decline(state, p, h);
        text = e instanceof Error ? e.message : 'The offer could not be completed.';
      }
    } else if (ratio >= 0.7) {
      h.status = 'countered';
      h.counterRate = person.dayRate;
      text = `${person.name} would take ${roleWord} at ${money(person.dayRate)} a day instead of ${money(h.dayRate)}.`;
    } else {
      decline(state, p, h);
      text = `${person.name} turned down ${roleWord}. The rate was too low.`;
    }
  }
  addLog(state, text, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: h.kind === 'cast' ? 'cast' : 'crew' } });
  return text;
}

function acceptedText(state: GameState, p: Project, h: Hire, name: string, pronouns: 'he' | 'she' | 'they'): string {
  const first = name.split(' ')[0];
  const poss = PRONOUNS[pronouns].possessive;
  const Poss = poss.charAt(0).toUpperCase() + poss.slice(1);
  if (h.characterId && h.method === 'voice') {
    const task = p.tasks.find((t) => t.kind === 'anim:voice' && t.assetRef === h.characterId);
    if (task && task.status !== 'done') {
      const day = upcomingWorkingDate(state, p);
      return `${first} accepted the role. ${Poss} recording session is scheduled for ${weekdayName(weekdayOfKey(day))}.`;
    }
    return `${first} accepted the role.`;
  }
  if (h.characterId) {
    const d = p.schedule.days.find((x) => x.status === 'scheduled' && approvedScenes(p).some((s) => x.sceneIds.includes(s.id) && s.participants.includes(h.characterId!)));
    return d ? `${first} accepted the role. ${Poss} first shoot day is ${formatDateKey(d.date, true)}.` : `${first} accepted the role.`;
  }
  return `${name} accepted the ${roleLabel(h.roleId).toLowerCase()} job on ${p.title}.`;
}

function upcomingWorkingDate(state: GameState, p: Project): string {
  const zone = getPlace(p.axes.basePlaceId).zone;
  let k = addDaysToKey(dateKey(state.now, zone), 1);
  if (p.schedule.startDate && p.schedule.startDate > k) k = p.schedule.startDate;
  while (weekdayOfKey(k) === 0 || weekdayOfKey(k) === 6) k = addDaysToKey(k, 1);
  return k;
}

function accept(state: GameState, p: Project, h: Hire, rate: number): void {
  if (!h.obligationId) throw new Error('Missing budget line.');
  commit(state, p, h.obligationId, rate * h.estDays);
  h.dayRate = rate;
  h.status = 'accepted';
  const win = productionWindow(state, p);
  const ps = (state.people[h.personId] ??= { bookings: [] });
  ps.bookings = ps.bookings.filter((b) => b.projectId !== p.id);
  ps.bookings.push({ from: win.from, to: win.to, projectId: p.id });
  if (h.characterId) {
    p.cast = p.cast.filter((c) => !(c.characterId === h.characterId && c.method === h.method));
    p.cast.push({ characterId: h.characterId, performer: h.personId, method: h.method ?? 'on-camera', note: '', hireId: h.id });
  }
}

function decline(state: GameState, p: Project, h: Hire): void {
  h.status = 'declined';
  if (h.obligationId) cancel(state, p, h.obligationId);
}

export function acceptCounter(state: GameState, p: Project, hireId: string): string {
  const h = p.hires.find((x) => x.id === hireId);
  if (!h || h.status !== 'countered' || !h.counterRate) throw new Error('There is no counteroffer to accept.');
  const o = p.obligations.find((x) => x.id === h.obligationId)!;
  const extra = h.counterRate * h.estDays - o.amount;
  if (extra > ledgerTotals(p).available) throw new FundsError(`Their rate needs ${money(extra)} more than you have uncommitted.`, extra);
  accept(state, p, h, h.counterRate);
  const person = personById(state, h.personId);
  const text = acceptedText(state, p, h, person.name, person.pronouns);
  addLog(state, text, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: h.kind === 'cast' ? 'cast' : 'crew' } });
  return text;
}

export function declineCounter(state: GameState, p: Project, hireId: string): void {
  const h = p.hires.find((x) => x.id === hireId);
  if (!h || h.status !== 'countered') throw new Error('There is no counteroffer to decline.');
  decline(state, p, h);
}

export function withdrawOffer(state: GameState, p: Project, hireId: string): void {
  const h = p.hires.find((x) => x.id === hireId);
  if (!h || h.status !== 'offered') throw new Error('That offer has already been answered.');
  h.status = 'declined';
  if (h.obligationId) cancel(state, p, h.obligationId);
}

/** Release someone. Work already paid stays paid; the rest of their agreement is cancelled. */
export function releaseHire(state: GameState, p: Project, hireId: string): void {
  const h = p.hires.find((x) => x.id === hireId);
  if (!h || h.status !== 'accepted') throw new Error('Only someone who has accepted can be released.');
  h.status = 'released';
  if (h.obligationId) cancel(state, p, h.obligationId);
  p.cast = p.cast.filter((c) => c.hireId !== h.id);
  const ps = state.people[h.personId];
  if (ps) ps.bookings = ps.bookings.filter((b) => b.projectId !== p.id);
  addLog(state, `${personById(state, h.personId).name} was released from ${p.title}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: h.kind === 'cast' ? 'cast' : 'crew' } });
}

/** The player can take any role, or none. Acting in a project is a casting decision, not a title. */
export function castPlayer(state: GameState, p: Project, characterId: string, method: PerformanceMethod): CastAssignment {
  if (p.approvedDraft === null) throw new Error('Approve a draft before casting.');
  const c = approvedCharacters(p).find((x) => x.id === characterId);
  if (!c) throw new Error('That character is not in the approved draft.');
  if (p.cast.some((x) => x.characterId === characterId && x.method === method)) throw new Error('That role is already cast. Release the current performer first.');
  const a: CastAssignment = { characterId, performer: 'player', method, note: '' };
  p.cast.push(a);
  p.playerActing = true;
  for (const d of p.schedule.days) {
    if (approvedScenes(p).some((s) => d.sceneIds.includes(s.id) && s.participants.includes(characterId))) d.playerActing = true;
  }
  addLog(state, `You cast yourself as ${c.name}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'cast' } });
  return a;
}

export function uncastPlayer(p: Project, characterId: string): void {
  p.cast = p.cast.filter((x) => !(x.characterId === characterId && x.performer === 'player'));
  p.playerActing = p.cast.some((x) => x.performer === 'player');
  for (const d of p.schedule.days) {
    d.playerActing = approvedScenes(p).some((s) => d.sceneIds.includes(s.id) && s.participants.some((cid) => p.cast.some((x) => x.characterId === cid && x.performer === 'player')));
  }
}

/** Casting fit notes: playing age, needed skills and dialogue language. Never identity-based. */
export function fitNotes(state: GameState, p: Project, person: Person | 'player', characterId: string): string[] {
  const out: string[] = [];
  const c = approvedCharacters(p).find((x) => x.id === characterId);
  if (!c) return out;
  const scenes = approvedScenes(p).filter((s) => s.participants.includes(characterId));
  const needsSinging = scenes.some((s) => s.songs.length);
  const needsDance = scenes.some((s) => s.dance);
  const langs = c.languages.length ? c.languages : [p.axes.dialogueLanguages[0]];
  if (person === 'player') {
    const known = [state.character.mainLanguage, ...state.character.languages.filter((l) => l.proficiency !== 'Basic').map((l) => l.code)];
    const missing = langs.filter((l) => !known.includes(l));
    if (missing.length) out.push("You'll need language coaching for this role's dialogue.");
    return out;
  }
  const age = Number.parseInt(c.ageInStory, 10);
  if (person.playingAge && Number.isFinite(age) && (age < person.playingAge[0] || age > person.playingAge[1])) {
    out.push(`Usually plays ages ${person.playingAge[0]} to ${person.playingAge[1]}.`);
  }
  if (needsSinging && !person.skills.includes('singing')) out.push('Not trained in singing, which this role needs.');
  if (needsDance && !person.skills.includes('dance')) out.push('Not trained in dance, which this role needs.');
  if (langs.some((l) => !person.languages.includes(l))) out.push('Will need language coaching for this role\'s dialogue.');
  return out;
}

// ---------------- Department staffing assistance ----------------

export interface StaffingProposal {
  roleId: string;
  personId: string;
  name: string;
  dayRate: number;
  days: number;
  total: number;
}

export function proposeStaffing(state: GameState, p: Project, dept: string): { proposals: StaffingProposal[]; skipped: string[] } {
  const proposals: StaffingProposal[] = [];
  const skipped: string[] = [];
  const win = productionWindow(state, p);
  let budget = ledgerTotals(p).available;
  for (const nr of neededRoles(p, state).filter((r) => r.dept === dept)) {
    if (p.hires.some((h) => h.roleId === nr.roleId && ['offered', 'accepted', 'countered'].includes(h.status))) continue;
    const pool = roleCandidates(state, p, nr.roleId)
      .filter((c) => c.experience >= 2 && isAvailable(state, c, win.from, win.to, p.id).ok)
      .sort((a, b) => a.dayRate - b.dayRate);
    const days = estimateDays(p, nr.roleId);
    const pick = pool.find((c) => c.dayRate * days <= budget);
    if (!pick) {
      skipped.push(`${roleLabel(nr.roleId)}: no available candidate fits the remaining budget.`);
      continue;
    }
    budget -= pick.dayRate * days;
    proposals.push({ roleId: nr.roleId, personId: pick.id, name: pick.name, dayRate: pick.dayRate, days, total: pick.dayRate * days });
  }
  return { proposals, skipped };
}

export function sendStaffingOffers(state: GameState, p: Project, proposals: StaffingProposal[]): { sent: number; failed: string[] } {
  let sent = 0;
  const failed: string[] = [];
  for (const pr of proposals) {
    try {
      makeOffer(state, p, { personId: pr.personId, roleId: pr.roleId, dayRate: pr.dayRate });
      sent += 1;
    } catch (e) {
      failed.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (sent) addLog(state, `You sent ${sent} ${sent === 1 ? 'offer' : 'offers'} for ${p.title}. Answers arrive over the next few days.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'crew' } });
  return { sent, failed };
}

export function homeLanguageOf(country: string): string {
  return countryLanguage(country);
}

export { genre, planShootDays, isNonfiction, HOUR };
