// Editing, delivery, credits, quality (a labeled game model), release and distribution.

import { pairChemistry } from './auditions';
import { coverageEdit, editPerformance } from './takes';
import { recordHistory } from './relationships';
import { scheduleOpportunity } from './opportunities';
import { laterWindowTerritories, onDealReleased } from './distribution';
import { EFFECTS_REVISION_GAIN, REVOICE_GAIN } from './revisions';
import { scheduleRenewal } from './continuation';
import { approvedTake, captureCredit } from './mocap';
import { BROADCAST_EDIT_COST, ESSENTIAL_CUT_COST, LATE_SLOT_SHARE, SUBTITLE_PER_MINUTE, broadcastSlotFor, contentLevel, documentsNeeded } from './script-effects';
import { financeCredits, onProjectDelivered, receiveIncome } from './finance';
import { getPlace } from '../data/places';
import { cancel, closeSettled, ledgerTotals, money, reserve, settle } from './budget';
import { countryLanguage, personById, roleLabel } from './people';
import {
  approvedCharacters, approvedScenes, isEpisodic, isNonfiction, projectModules, scriptIssues, sceneLabel,
} from './projects';
import { ensureWorkEvent } from './production';
import { gaussian, pick, stream } from './rng';
import { addLog, cancelEvents, newId, registerHandler, schedule } from './state';
import { redactionComplete } from './unscripted';
import { songCredits, songUses } from './songs';
import { DAY, addDaysToKey, dateKey, formatDateKey, isDateKey, localToInstant, parseYmd } from './time';
import type { Credit, DistributionOffer, GameState, Project, ReleaseRecord, Scene } from './types';

// ---------------- Editing ----------------

export function assemblyComplete(p: Project): boolean {
  const asm = p.tasks.filter((t) => t.kind === 'post:assembly');
  return asm.length > 0 && asm.every((t) => t.status === 'done');
}

export function cutScenes(p: Project): Set<string> {
  return new Set(p.edit.cutSceneIds ?? []);
}

/** The approved scenes still in the edit. */
export function editScenes(p: Project): Scene[] {
  const cut = cutScenes(p);
  return approvedScenes(p).filter((s) => !cut.has(s.id));
}

/**
 * Cut a scene from the edit instead of shooting it or picking it up: the revised edit plan. It leaves any shoot day it was
 * scheduled on (an emptied day is cancelled), stops blocking assembly and picture lock, and its consequences
 * (script-explain.ts cutConsequences) apply. The script is unchanged; Restore puts it back.
 */
export function cutFromEdit(state: GameState, p: Project, sceneId: string): void {
  if (p.edit.pictureLocked) throw new Error('The picture is locked. Unlock it to change the edit plan.');
  if (p.delivered) throw new Error('This project is delivered.');
  const s = approvedScenes(p).find((x) => x.id === sceneId);
  if (!s) throw new Error('That scene isn\'t in the approved script.');
  p.edit.cutSceneIds = [...cutScenes(p), sceneId];
  p.edit.pickupsNeeded = p.edit.pickupsNeeded.filter((x) => x !== sceneId);
  for (const d of p.schedule.days.filter((x) => x.status === 'scheduled' && x.sceneIds.includes(sceneId))) {
    d.sceneIds = d.sceneIds.filter((x) => x !== sceneId);
    if (!d.sceneIds.length) { d.status = 'cancelled'; d.result = 'Cancelled: its scenes were cut from the edit.'; }
  }
  ensureWorkEvent(state, p);
  addLog(state, `You cut ${sceneLabel(p, s)} from the edit of ${p.title}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'edit' } });
  p.history.push({ at: state.now, text: `${sceneLabel(p, s)} cut from the edit.` });
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
  // Approval of how they appear (documentary.ts): only for contributors still in the cut.
  const inEdit = new Set(editScenes(p).flatMap((s) => s.contributorIds));
  for (const c of p.contributors.filter((x) => x.consent === 'given' && x.restrictions?.includes('approval') && inEdit.has(x.id) && x.cutApproval?.status !== 'approved')) {
    out.push(c.cutApproval?.status === 'refused' ? `${c.name} didn't approve how they appear. Cut their scenes to deliver.` : c.cutApproval?.status === 'shown' ? `${c.name} is reviewing the cut.` : `${c.name} approves how they appear: show them the locked cut.`);
  }
  if (isNonfiction(p.axes.format) && p.evidence.some((e) => e.status !== 'dramatized' && !e.verified)) out.push('Some claims haven\'t been verified.');
  return out;
}

export function deliver(state: GameState, p: Project): void {
  const b = deliveryBlockers(p);
  if (b.length) throw new Error(b[0]);
  const runtime = Math.round(editScenes(p).reduce((a, s) => a + s.estMinutes, 0));
  p.delivered = { at: state.now, runtimeMin: runtime };
  onProjectDelivered(state, p);
  scheduleRenewal(state, p);
  scheduleOpportunity(state, p);
  p.phase = 'delivered';
  p.quality = assessQuality(state, p);
  if (isEpisodic(p.axes.format)) p.episodeQuality = assessEpisodes(state, p, p.quality);
  p.credits = computeCredits(state, p);
  // Everyone who worked on it through to delivery has that on record with you (relationships.ts).
  for (const h of p.hires.filter((x) => x.status === 'accepted' && x.daysWorked > 0)) recordHistory(state, h.personId, p, roleLabel(h.roleId), 'completed');
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
  // Whoever wrote or directed an episode before being replaced keeps that credit beside their successor's (assignEpisodeRole).
  const wrote = (who: string) => p.episodes.filter((e) => e.writer === who || e.formerWriters?.includes(who)).map((e) => e.number);
  const directed = (who: string) => p.episodes.filter((e) => e.director === who || e.formerDirectors?.includes(who)).map((e) => e.number);
  const playerWroteEps = wrote('player');
  if (playerWroteEps.length && !nonfiction) add({ person: 'player', personName: me, contribution: 'Written By', roleId: 'writer', episodes: episodic ? playerWroteEps : 'all' });
  for (const who of [...new Set(p.episodes.flatMap((e) => [e.writer, ...(e.formerWriters ?? [])]))].filter((x) => x !== 'player')) {
    add({ person: who, personName: personById(state, who).name, contribution: 'Written By', roleId: 'episode-writer', episodes: wrote(who) });
  }
  for (const h of p.hires.filter((x) => x.roleId === 'co-writer' && x.daysWorked > 0)) {
    add({ person: h.personId, personName: personById(state, h.personId).name, contribution: 'Co-Written By', roleId: 'co-writer', episodes: h.episodes });
  }
  const playerDirectedEps = directed('player');
  if (playerDirectedEps.length) add({ person: 'player', personName: me, contribution: 'Directed By', roleId: 'director', episodes: episodic ? playerDirectedEps : 'all' });
  for (const who of [...new Set(p.episodes.flatMap((e) => [e.director, ...(e.formerDirectors ?? [])]))].filter((x) => x !== 'player')) {
    add({ person: who, personName: personById(state, who).name, contribution: 'Directed By', roleId: 'episode-director', episodes: directed(who) });
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
  // Documentary contributors in the cut, under the name they agreed to (documentary.ts): withheld when they asked.
  if (nonfiction) {
    const inCut = new Set(editScenes(p).flatMap((s) => s.contributorIds));
    for (const c of p.contributors.filter((x) => x.consent === 'given' && inCut.has(x.id))) {
      add({ person: `contributor:${c.id}`, personName: c.restrictions?.includes('name') ? 'Name withheld at their request' : c.name, contribution: 'Featuring', roleId: 'contributor', episodes: 'all' });
    }
  }
  // Songwriters and lyricists are credited for the songs they wrote, not as crew (songs.ts).
  for (const h of p.hires.filter((x) => x.kind === 'crew' && x.daysWorked > 0 && !['co-writer', 'episode-writer', 'episode-director', 'songwriter', 'lyricist'].includes(x.roleId))) {
    add({ person: h.personId, personName: personById(state, h.personId).name, contribution: roleLabel(h.roleId), roleId: h.roleId, episodes: h.episodes });
  }
  // Each song in the cut or a version: its writers, music and lyrics apart, and its performers. The score composer is
  // credited for the score above, and only writes a song they were credited with.
  songCredits(p, editScenes(p), (p.versions ?? []).map((v) => ({ v, scenes: editScenes(p).filter((sc) => !v.leaveOut.includes(sc.id)) })), add, me, (characterId) => {
    const a = p.cast.find((x) => x.characterId === characterId);
    return a ? { person: a.performer, name: a.performer === 'player' ? me : personById(state, a.performer).name } : null;
  });
  return out;
}

// ---------------- Quality: a labeled game model ----------------

const avg = (xs: number[], d = 50) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : d);
const clamp = (x: number) => Math.round(Math.max(0, Math.min(100, x)));

/**
 * Modeled assessments used by festival programmers and award voters. These are explicit game
 * assumptions built from inspectable facts (script structure, staffing, coverage, schedule
 * outcomes, edit passes). They are not a claim that software can measure artistic merit.
 *
 * With `episode`, the same model reads only that episode's work (November 9, 2026): its scenes in the cut and their
 * captures and takes, its shoot days, the setups it plants or pays off, who wrote and directed it, the crew and cast who
 * worked on it. Work done once for every episode (cut passes, the script's open notes, crew hired for the whole season)
 * counts for each. Nothing is drawn at random per episode: two episodes differ only where their work differs.
 */
export function assessQuality(state: GameState, p: Project, episode?: number): Record<string, number> {
  const inEp = (n: number | undefined) => episode === undefined || n === episode;
  const covers = (eps: number[] | 'all') => episode === undefined || eps === 'all' || eps.includes(episode);
  const allApproved = approvedScenes(p);
  const approved = allApproved.filter((s) => inEp(s.episode));
  const scenes = editScenes(p).filter((s) => inEp(s.episode)); // what is in the cut
  const issues = scriptIssues({ ...p, scenes: allApproved, characters: approvedCharacters(p) } as Project);
  // Advisory prompts only check that a text field is filled (or suggest a fit), so they neither cost nor earn anything.
  const notes = issues.filter((i) => i.severity === 'note' && !i.advisory).length;
  // A setup counts when the scenes that plant and pay it off are both in the cut; an episode counts those it plants or pays.
  const cutIds = new Set(editScenes(p).map((s) => s.id));
  const inCut = new Set(scenes.map((s) => s.id));
  const episodeOf = (id: string | null) => allApproved.find((s) => s.id === id)?.episode;
  const mine = p.setups.filter((x) => episode === undefined || inEp(episodeOf(x.plantedIn)) || inEp(episodeOf(x.paidIn)));
  const setups = mine.length ? mine.filter((x) => x.plantedIn && x.paidIn && cutIds.has(x.plantedIn) && cutIds.has(x.paidIn)).length / mine.length : 0.6;
  // Only notes the readiness checks raised count, once a revision pass has addressed them. Notes you write yourself are
  // for your own process, and a pass with nothing to address adds nothing: repeating passes can't manufacture quality.
  // ...and only when the check it came from is gone from the script's readiness checks, and wasn't advice.
  const open = new Set(issues.map((i) => i.text));
  const addressed = p.notes.filter((n) => n.status === 'addressed' && n.source === 'readiness' && !n.advisory && !open.has(n.text)).length;
  const writerHelp = p.hires.filter((h) => ['co-writer', 'script-editor'].includes(h.roleId) && h.status !== 'declined' && covers(h.episodes)).map((h) => personById(state, h.personId).capability);
  // Who wrote and directed each episode, from November 9, 2026: a hired episode writer or director moves that episode's
  // script or direction by a quarter of how far their capability is from 50; your own work is the baseline, as it always
  // was. Before, who wrote or directed an episode changed no assessment. The season weighs its episodes by running time.
  const epMinutes = new Map<number, number>();
  for (const sc of scenes) epMinutes.set(sc.episode, (epMinutes.get(sc.episode) ?? 0) + sc.estMinutes);
  const byWho = (role: 'writer' | 'director') => {
    const parts = [...epMinutes].map(([n, m]) => {
      const e = p.episodes.find((x) => x.number === n);
      const who = e ? [e[role], ...((role === 'writer' ? e.formerWriters : e.formerDirectors) ?? [])] : ['player'];
      return { m, v: avg(who.map((w) => (w === 'player' ? 0 : (personById(state, w).capability - 50) / 4)), 0) };
    });
    const total = parts.reduce((a, x) => a + x.m, 0);
    return total ? parts.reduce((a, x) => a + x.v * x.m, 0) / total : 0;
  };
  // Text earns nothing: until the review of November 7, 2026 a filled objective was worth up to 6 and answered genre
  // questions up to 4, which writing anything satisfied, and every empty-field prompt cost 1.5. The base went from 40 to
  // 42, set so the balance suite's mean quality per family stays where it was (docs/balance-results.json); what moves
  // the score is structure the engine can follow (setups planted and paid off in named scenes, both in the cut),
  // readiness notes resolved by revision, skilled writing help, and open structural notes.
  const script = clamp(42 + setups * 10 + Math.min(10, addressed * 2) - Math.min(20, notes * 1.5) + (writerHelp.length ? (avg(writerHelp) - 50) / 3 : 0) + byWho('writer'));
  const caps = p.captures.filter((c) => inCut.has(c.sceneId));
  // A finished effects revision counts once toward its scene's capture (revisions.ts).
  const revised = (sceneId: string) => p.tasks.some((x) => x.id === `post:vfx-rev:${sceneId}` && x.status === 'done') ? EFFECTS_REVISION_GAIN : 0;
  const captureQ = avg(caps.map((c) => Math.min(100, c.quality + revised(c.sceneId))), 60);
  const days = p.schedule.days.filter((d) => episode === undefined || d.episode === episode || d.episodes?.includes(episode));
  const lostDays = days.filter((d) => d.status === 'lost').length;
  const totalDays = Math.max(1, days.length);
  const crewCap = (r: string) => {
    const h = p.hires.find((x) => x.roleId === r && x.daysWorked > 0 && covers(x.episodes));
    return h ? personById(state, h.personId).capability : null;
  };
  const cut = Math.min(10, p.edit.cutPasses * 4);
  const direction = clamp(captureQ * 0.7 + 18 + cut - (lostDays / totalDays) * 20 + byWho('director'));
  const anim = ['animator', 'stopmo-animator', 'layout-artist', 'lighting-artist'].map(crewCap).filter((x): x is number => x !== null);
  const craftRoles = ['dop', 'production-designer', 'costume-designer', 'sound-designer', 'editor', 'composer', 'colorist', 'visdev-artist'];
  const craftCaps = craftRoles.map(crewCap).filter((x): x is number => x !== null);
  const craft = clamp(avg([...craftCaps, ...anim], 50) * 0.85 + 8);
  // A scene the producer declared essential and then cut from the edit leaves a gap (cutConsequences). The turning-point
  // text did this until the review of November 7, 2026; picture lock already required coverage, so it never applied.
  const gapsLeft = approved.filter((s) => s.essential && !inCut.has(s.id)).length;
  const out: Record<string, number> = { script, direction, craft, editing: clamp((crewCap('editor') ?? 50) * 0.7 + cut * 2 + 10 - gapsLeft * ESSENTIAL_CUT_COST + coverageEdit(p, [...inCut])), music: clamp((crewCap('composer') ?? 45) * 0.9 + 5) };
  if (anim.length) out.animation = clamp(avg(anim) * 0.9 + 6);
  // Each credited craft on its own, for craft awards (docs/awards/DESIGN.md rule 3), on the same scale as `craft`.
  for (const h of p.hires.filter((x) => x.kind === 'crew' && x.daysWorked > 0 && covers(x.episodes))) out[`craft:${h.roleId}`] = Math.max(out[`craft:${h.roleId}`] ?? 0, clamp(personById(state, h.personId).capability * 0.85 + 8));
  // Each song heard in the cut, on its writing: its writers' capability on the craft scale (you count as 50). The score
  // composer has no part in it unless they wrote it (songs.ts).
  for (const song of new Set(songUses(p, scenes).map((x) => x.song))) {
    if (song.writers.some((w) => w.who)) out[`song:${song.id}`] = clamp(avg(song.writers.filter((w) => w.who).map((w) => (w.who === 'player' ? 50 : personById(state, w.who!).capability))) * 0.85 + 8);
  }
  for (const a of p.cast) {
    // A take's performance side, where takes were recorded (takes.ts); else the capture's quality, as before.
    // Directing 2: with singles, the editor cuts between takes for the best usable moments (takes.ts editPerformance).
    const theirs = scenes.filter((s) => s.participants.includes(a.characterId));
    if (episode !== undefined && !theirs.length) continue; // not in this episode: nothing of theirs to assess
    const sc = theirs.map((s) => { const c = p.captures.find((x) => x.sceneId === s.id); return (c ? editPerformance(p, c) : undefined) ?? c?.quality ?? 60; });
    const base = a.performer === 'player' ? 58 + Math.min(14, p.schedule.rehearsalDays * 2) : personById(state, a.performer).capability;
    // A shared background never scores a performance: ability isn't inferred from ethnicity. It added 6 until the review
    // of November 7, 2026; casting still shows who shares one, as information.
    // How they play with the others in each of their scenes (auditions.ts pairChemistry, -8 to +8), at half weight; a
    // chemistry read only reveals it. From November 8, 2026: before, performances ignored who they played against.
    const chem = theirs.map((s) => {
      const others = p.cast.filter((b) => b.performer !== a.performer && b.characterId !== a.characterId && s.participants.includes(b.characterId));
      return avg(others.map((b) => pairChemistry(state, a.performer, b.performer)), 0);
    });
    // Re-recorded lines, once the session is done, count once toward the part's performance (revisions.ts).
    const revoiced = p.tasks.some((x) => x.id === `post:revoice:${a.characterId}` && x.status === 'done') ? REVOICE_GAIN : 0;
    out[`performance:${a.characterId}:${a.performer}`] = clamp(base * 0.6 + avg(sc, 60) * 0.4 + avg(chem, 0) * 0.5 + revoiced);
  }
  const perf = avg(Object.entries(out).filter(([k]) => k.startsWith('performance:')).map(([, v]) => v), 55);
  // Rounded to the nearest whole value; never derived from genre labels, budget size or identity.
  out.overall = clamp(script * 0.3 + direction * 0.25 + craft * 0.2 + perf * 0.25);
  if (episode === undefined) {
    const r = stream(state.seed, 'reception', p.id);
    out.reception = clamp(out.overall + gaussian(r, 0, 8)); // audiences and critics vary
  }
  return out;
}

/** Each episode's assessment, with the season's reception carried over by the same margin: no draw of its own. */
export function assessEpisodes(state: GameState, p: Project, season: Record<string, number>): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (let e = 1; e <= p.axes.episodeCount; e++) {
    if (!editScenes(p).some((s) => s.episode === e)) continue;
    const q = assessQuality(state, p, e);
    q.reception = clamp(q.overall + (season.reception - season.overall));
    out[e] = q;
  }
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
  // A distributor's release reports its earnings and opens later windows (distribution.ts).
  if (r.offerId) onDealReleased(state, p, r.offerId);
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
  // Offers come from the film itself. Until the review of November 7, 2026 a missing pitch stopped every offer and 18+ work
  // got no broadcast offers; the pitch is now a deliverable checked on acceptance, and declared content sets a broadcast's
  // slot (offerTerms). Neither draws from the random stream, so offers for the same film are the same as before.
  const slot = broadcastSlotFor(p);
  const count = appeal >= 80 ? 3 : appeal >= 65 ? 2 : appeal >= 50 ? 1 : 0;
  const runtimeFactor = Math.min(1, (p.delivered.runtimeMin) / 90);
  const made: DistributionOffer[] = [];
  let held = 0; // later-window offers with nothing left once earlier deals' rights are taken out
  for (let i = 0; i < count; i++) {
    const route = pick(r, ['streaming', 'theatrical', 'digital', 'broadcast'] as const);
    const mg = Math.round(((appeal - 40) * 6000 * runtimeFactor * (0.6 + r() * 0.8) * (route === 'theatrical' ? 1.4 : 1)) / 1000) * 1000;
    if (mg <= 0) continue;
    // Content declared strong can't air before the watershed: the broadcaster offers a late slot, which pays less, or the
    // full guarantee for an earlier slot if you deliver a broadcast edit (script-effects.ts).
    const late = route === 'broadcast' && slot === 'late';
    // Territories and exclusivity (SLATE-16-01.02, November 8, 2026), drawn from a stream of their own so that the
    // offers a film got before keep their distributor, route, guarantee and window.
    const terms = offerScope(state.seed, p, wave, i, route);
    // A later window offers only what no exclusive deal holds and this route hasn't already released (distribution.ts).
    if (wave.startsWith('window:')) {
      terms.territories = laterWindowTerritories(p, route, terms.territories, dateKey(state.now, getPlace(p.axes.basePlaceId).zone));
      if (!terms.territories.length) { held += 1; continue; }
      terms.factor = Math.min(2.5, 1 + 0.25 * (terms.territories.length - 1));
    }
    const scaled = Math.round((mg * terms.factor) / 1000) * 1000;
    const offer: DistributionOffer = {
      id: newId(state, 'do'), distributor: pick(r, DISTRIBUTORS), route, minimumGuarantee: late ? Math.round((scaled * LATE_SLOT_SHARE) / 1000) * 1000 : scaled, territories: terms.territories,
      ...(terms.exclusive ? { exclusive: true } : {}), ...(wave.startsWith('window:') ? { laterWindow: true as const } : {}),
      releaseWindowDays: 60 + Math.floor(r() * 90), expiresAt: state.now + 21 * DAY, status: 'open',
      ...(route === 'broadcast' ? { slot: late ? 'late' as const : 'any' as const } : {}), ...(late ? { editedGuarantee: scaled } : {}),
    };
    p.offers.push(offer);
    made.push(offer);
  }
  // A later window says so, and says when earlier deals' rights left nothing to offer (until November 8, 2026 it read as
  // the first offers did, so a window that came and went looked like no interest at all).
  const later = wave.startsWith('window:');
  const text = made.length
    ? `${made.length === 1 ? `${made[0].distributor} made an offer` : `${made.length} distributors made offers`} for ${later ? `a later window of ${p.title}` : p.title}. Offers stay open for three weeks.`
    : !later ? `No distributors have made an offer for ${p.title} yet. You can still release it yourself.`
      : held ? `Distributors looked at a later window of ${p.title}, but your earlier deals still hold the rights they wanted, so there is nothing to accept.`
        : `No distributor made an offer for a later window of ${p.title}.`;
  addLog(state, text, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  return { message: text };
});

// ---------------- Territories and exclusivity (SLATE-16-01.02) ----------------

/** How long an exclusive deal holds its territories after its release. Simulation assumption. */
export const EXCLUSIVE_DAYS = 365;
const BIG_MARKETS = ['US', 'GB', 'FR', 'DE', 'ES', 'IT', 'JP', 'BR', 'CA', 'AU', 'KR', 'MX', 'IN'];

/**
 * An offer's territories and exclusivity, and what wider rights pay: the home country, a few large markets besides it,
 * or worldwide for a streamer or digital seller. Theatrical deals are exclusive in their territories; a streamer taking
 * more than home is too. Each extra territory adds a quarter to the guarantee, up to two and a half times.
 */
export function offerScope(seed: number, p: Project, wave: string, i: number, route: DistributionOffer['route']): { territories: string[]; exclusive: boolean; factor: number } {
  const r = stream(seed, 'distribution-terms', p.id, wave, String(i));
  const home = getPlace(p.axes.basePlaceId).country;
  const roll = r();
  const others = BIG_MARKETS.filter((c) => c !== home);
  let territories = [home];
  if ((route === 'streaming' || route === 'digital') && roll > 0.8) territories = [home, ...others];
  else if (roll > 0.55) territories = [home, ...others.filter((_, k) => k % 4 === Math.floor(r() * 4)).slice(0, 3)];
  const exclusive = route === 'theatrical' || (route === 'streaming' && territories.length > 1) || r() < 0.3;
  return { territories, exclusive, factor: Math.min(2.5, 1 + 0.25 * (territories.length - 1)) };
}

const overlaps = (a: string[], b: string[]) => a.some((x) => b.includes(x));

/** The open offers accepting `o` would end. */
export function offerConflicts(p: Project, o: DistributionOffer): DistributionOffer[] {
  return p.offers.filter((x) => x.id !== o.id && x.status === 'open' && overlaps(x.territories, o.territories) && (x.route === o.route || !!o.exclusive || !!x.exclusive));
}

/** Why `o` can't be signed because an accepted exclusive deal still holds some of its territories, or null. */
export function exclusiveHolder(p: Project, o: DistributionOffer, today: string): string | null {
  const h = p.offers.find((x) => x.status === 'accepted' && x.exclusive && x.exclusiveUntil && today < x.exclusiveUntil && overlaps(x.territories, o.territories));
  return h ? `${h.distributor} holds exclusive rights in ${h.territories.filter((c) => o.territories.includes(c)).join(', ')} until ${h.exclusiveUntil}.` : null;
}

/**
 * What a distribution contract needs from you before you can sign it, or null. The delivery list includes a logline and
 * synopsis for marketing (a Pitch), and a streaming service's includes content advisories, so your content declaration.
 */
export function offerNeeds(p: Project, o: DistributionOffer): string | null {
  const pitch = documentsNeeded(p, ['pitch'], isNonfiction(p.axes.format), "The contract's delivery list");
  if (pitch) return pitch;
  if (o.route === 'streaming' && contentLevel(p) === null) return "A streaming service's delivery list includes content advisories. Declare the content on the Script page first.";
  return null;
}

/** The delivery materials an offer requires, in money: the route's list, subtitles and, if chosen, a broadcast edit. */
export function offerMaterials(p: Project, o: DistributionOffer, broadcastEdit = false): number {
  return DELIVERY_MATERIALS[o.route] + subtitlingCost(p, o.territories) + (broadcastEdit ? BROADCAST_EDIT_COST : 0);
}

export function acceptDistribution(state: GameState, p: Project, offerId: string, opts: { broadcastEdit?: boolean } = {}): ReleaseRecord {
  const o = p.offers.find((x) => x.id === offerId);
  if (!o || o.status !== 'open') throw new Error('That offer is no longer open.');
  if (o.expiresAt < state.now) {
    o.status = 'expired';
    throw new Error('That offer has expired.');
  }
  const needs = offerNeeds(p, o);
  if (needs) throw new Error(needs);
  const held = exclusiveHolder(p, o, dateKey(state.now, getPlace(p.axes.basePlaceId).zone));
  if (held) throw new Error(held);
  const edit = !!opts.broadcastEdit;
  if (edit && o.slot !== 'late') throw new Error('This broadcaster can already air it in any slot; no broadcast edit is needed.');
  // The contract obliges you to supply delivery materials; their cost is reserved now and paid on release.
  const materials = reserve(state, p, `Delivery Materials For ${o.distributor}`, 'post', offerMaterials(p, o, edit), `release-offer:${o.id}`);
  o.status = 'accepted';
  if (edit) { o.broadcastEdit = true; o.minimumGuarantee = o.editedGuarantee ?? o.minimumGuarantee; }
  // Offers this one ends: the same route where territories overlap, or any route if either is exclusive there.
  for (const other of offerConflicts(p, o)) other.status = 'declined';
  p.revenue += receiveIncome(state, p, o.minimumGuarantee, o.distributor); // backers are repaid first
  const zone = getPlace(p.axes.basePlaceId).zone;
  const date = addDaysToKey(dateKey(state.now, zone), o.releaseWindowDays);
  addLog(state, `You accepted ${o.distributor}'s offer of ${money(o.minimumGuarantee)} for ${p.title}.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  const rec = planRelease(state, p, { route: o.route, date, territories: o.territories, distributor: o.distributor });
  if (o.exclusive) o.exclusiveUntil = addDaysToKey(date, EXCLUSIVE_DAYS);
  rec.offerId = o.id;
  rec.obligationId = materials.id;
  return rec;
}

/**
 * Subtitles for each territory language the dialogue isn't in, priced by the finished runtime and the languages the
 * project declares it is spoken in. Until the review of November 7, 2026 it was priced by the words written in the
 * script, so leaving dialogue unwritten made it cheaper.
 */
export function subtitlingCost(p: Project, territories: string[]): number {
  const spoken = new Set(p.axes.dialogueLanguages);
  if (!spoken.size) return 0; // no dialogue to subtitle
  const minutes = p.delivered?.runtimeMin ?? Math.round(editScenes(p).reduce((a, s) => a + s.estMinutes, 0));
  const needed = [...new Set(territories.map(countryLanguage))].filter((l) => !spoken.has(l));
  return needed.length * Math.ceil(minutes) * SUBTITLE_PER_MINUTE;
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
