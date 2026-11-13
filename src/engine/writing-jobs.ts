// Work commissioned from hired writers (the Creative Depth package, milestone D, 03-PEOPLE-CASTING-AND-HIRING.md: scope
// and deliverables, work milestones, review, notes, accepted revisions, payment, credit). Until November 11, 2026 an
// episode writer, a co-writer or a script editor was hired, changed the script's assessment and took a credit without a
// day's work or a day's pay. Now each is asked for a pass with a scope, works its days and is paid for each, delivers it,
// and the player accepts it or asks for a revision. Only accepted work is credited or counted. The player's brief and
// notes are kept as written and never read: the standard of a pass is drawn around the writer's level, not from words.
import { getPlace } from '../data/places';
import { extend, money, settle } from './budget';
import { personById, roleLabel } from './people';
import { isWorkingDay, nextWorkingDay } from './production/schedule';
import { approvedScenes, assignEpisodeRole } from './projects';
import { gaussian, stream } from './rng';
import { addLog, newId, registerHandler, schedule } from './state';
import { addDaysToKey, dateKey, formatDateKey, localToInstant, parseYmd } from './time';
import type { GameState, Hire, Project, WritingJob, WritingPass, WritingScope } from './types';

export const WRITER_ROLES = ['episode-writer', 'co-writer', 'script-editor'];

/** What each writing job may be asked for: only the writer of an episode writes a draft of their own. */
export const SCOPES_FOR: Record<string, WritingScope[]> = { 'episode-writer': ['draft', 'rewrite', 'polish'], 'co-writer': ['rewrite', 'polish'], 'script-editor': ['polish'] };

export const SCOPE: Record<WritingScope, { label: string; hint: string; minutesPerDay: number; minDays: number; weight: number }> = {
  draft: { label: 'Their Own Draft', hint: 'They write the episode afresh from your approved script.', minutesPerDay: 4, minDays: 3, weight: 1 },
  rewrite: { label: 'A Rewrite', hint: 'They rework your approved script scene by scene.', minutesPerDay: 8, minDays: 2, weight: 0.6 },
  polish: { label: 'A Polish', hint: 'They tighten what is there without restructuring it.', minutesPerDay: 15, minDays: 1, weight: 0.3 },
};

/** What a revision can be asked to look at. A label for the record: the game reads none of it. */
export const REVISION_FOCUS = ['Structure', 'Character', 'Dialogue', 'Pace', 'Tone', 'Something Else'];
/** A contract covers the pass and two revisions of it; more is a new commission. */
export const MAX_REVISIONS = 2;
/** A revision takes two fifths of the pass's days. */
export const REVISION_SHARE = 0.4;
/** How far a delivered pass can stand from the writer's level (one standard deviation): a first pass, then a revision. */
export const READ_SPREAD = [10, 5];

const today = (state: GameState, p: Project): string => dateKey(state.now, getPlace(p.axes.basePlaceId).zone);
const jobs = (p: Project): WritingJob[] => p.writing ?? [];
const hireOf = (p: Project, j: WritingJob): Hire | undefined => p.hires.find((h) => h.id === j.hireId);
const current = (j: WritingJob): WritingPass => j.passes[j.passes.length - 1];

/** The approved script's minutes in an episode: what the days of a pass are counted from. */
export function episodeMinutes(p: Project, episode: number): number {
  return approvedScenes(p).filter((s) => s.episode === episode).reduce((a, s) => a + s.estMinutes, 0);
}

/** The days a pass of a scope takes on an episode: its approved minutes at the scope's pace, never fewer than its least. */
export const passDays = (p: Project, scope: WritingScope, episode: number): number => Math.max(SCOPE[scope].minDays, Math.ceil(episodeMinutes(p, episode) / SCOPE[scope].minutesPerDay));

/** The days and the cost of a pass, before it is commissioned. */
export function writingTerms(p: Project, h: Hire, scope: WritingScope, episode: number): { days: number; cost: number } {
  const days = passDays(p, scope, episode);
  return { days, cost: days * h.dayRate };
}

/** The days and the cost of a revision of a job's pass. */
export function revisionTerms(p: Project, j: WritingJob): { days: number; cost: number } {
  const days = Math.max(1, Math.ceil(j.passes[0].days * REVISION_SHARE));
  return { days, cost: days * (hireOf(p, j)?.dayRate ?? 0) };
}

/** Why a pass can't be commissioned from this hire, or null. */
export function commissionRefusal(p: Project, h: Hire | undefined, scope: WritingScope, episode: number): string | null {
  if (!p.writing) return 'This project was started before writers were commissioned by the pass. Its writers work as they were hired.';
  if (p.delivered) return 'This project has been delivered.';
  if (!h || h.status !== 'accepted') return 'Only someone who has accepted a writing job can be commissioned.';
  if (!(SCOPES_FOR[h.roleId] ?? []).includes(scope)) return `${roleLabel(h.roleId)} isn't asked for ${SCOPE[scope].label.toLowerCase()}.`;
  if (!p.episodes.some((e) => e.number === episode)) return 'That episode no longer exists.';
  if (h.episodes !== 'all' && !h.episodes.includes(episode)) return "Their contract doesn't cover that episode.";
  if (!episodeMinutes(p, episode)) return 'There is nothing in the approved script for that episode yet.';
  if (jobs(p).some((j) => j.hireId === h.id && (j.status === 'working' || j.status === 'delivered'))) return 'They are on a pass for you already. Accept it or ask for a revision first.';
  return null;
}

function startWork(state: GameState, p: Project, j: WritingJob): void {
  const first = nextWorkingDay(p, addDaysToKey(today(state, p), 1));
  const { year, month, day } = parseYmd(first);
  schedule(state, localToInstant(getPlace(p.axes.basePlaceId).zone, year, month, day, 18).instant, 'writing-day', { projectId: p.id, jobId: j.id, date: first }, { priority: 58 });
}

/** Ask a hired writer for a pass. Its days are added to their agreement, so it is refused when the money isn't there. */
export function commissionWriting(state: GameState, p: Project, hireId: string, input: { scope: WritingScope; episode: number; brief?: string }): WritingJob {
  const h = p.hires.find((x) => x.id === hireId);
  const why = commissionRefusal(p, h, input.scope, input.episode);
  if (why) throw new Error(why);
  const terms = writingTerms(p, h!, input.scope, input.episode);
  const job: WritingJob = { id: newId(state, 'w'), hireId, personId: h!.personId, scope: input.scope, episode: input.episode, status: 'working', passes: [{ days: terms.days, done: 0, askedOn: today(state, p) }] };
  if (input.brief?.trim()) job.brief = input.brief.trim();
  extend(state, p, h!.obligationId!, terms.cost, `${h!.obligationId}:writing:${job.id}:0`);
  p.writing!.push(job);
  startWork(state, p, job);
  const name = personById(state, h!.personId, h!.roleId).name;
  addLog(state, `${name} began ${SCOPE[input.scope].label.toLowerCase().replace('their own', 'a')} of ${episodeName(p, input.episode)}: ${terms.days} working ${terms.days === 1 ? 'day' : 'days'}, ${money(terms.cost)}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'crew' } });
  return job;
}

const episodeName = (p: Project, episode: number): string => (p.episodes.length > 1 ? `episode ${episode} of ${p.title}` : p.title);

/** Accept the delivered pass. A draft or a rewrite from an episode's writer makes the episode theirs to be credited for. */
export function acceptWriting(state: GameState, p: Project, jobId: string): void {
  const j = jobs(p).find((x) => x.id === jobId);
  if (!j || j.status !== 'delivered') throw new Error('There is no delivered pass to accept.');
  j.status = 'accepted';
  j.acceptedOn = today(state, p);
  const h = hireOf(p, j);
  if (h?.roleId === 'episode-writer' && j.scope !== 'polish' && h.status === 'accepted' && !p.delivered) assignEpisodeRole(p, j.episode, 'writer', j.personId);
  addLog(state, `You accepted ${personById(state, j.personId, h?.roleId).name}'s ${SCOPE[j.scope].label.toLowerCase().replace('their own ', '').replace('a ', '')} of ${episodeName(p, j.episode)}.`, 'project', { projectId: p.id });
}

/** Why a revision can't be asked for, or null. */
export function revisionRefusal(p: Project, j: WritingJob | undefined): string | null {
  if (!j || j.status !== 'delivered') return 'A revision is asked for once a pass is delivered.';
  if (j.passes.length > MAX_REVISIONS) return `Their contract covered ${MAX_REVISIONS} revisions, and both are done. Accept the pass, or commission a new one.`;
  if (hireOf(p, j)?.status !== 'accepted') return 'They are no longer on the project.';
  return null;
}

/** Ask for a revision of the delivered pass, with what it should look at. It costs their days, and replaces the pass. */
export function requestRevision(state: GameState, p: Project, jobId: string, input: { focus: string; text?: string }): void {
  const j = jobs(p).find((x) => x.id === jobId);
  const why = revisionRefusal(p, j);
  if (why) throw new Error(why);
  if (!REVISION_FOCUS.includes(input.focus)) throw new Error('Choose what the revision should look at.');
  const h = hireOf(p, j!)!;
  const terms = revisionTerms(p, j!);
  extend(state, p, h.obligationId!, terms.cost, `${h.obligationId}:writing:${j!.id}:${j!.passes.length}`);
  const pass: WritingPass = { focus: input.focus, days: terms.days, done: 0, askedOn: today(state, p) };
  if (input.text?.trim()) pass.text = input.text.trim();
  j!.passes.push(pass);
  j!.status = 'working';
  startWork(state, p, j!);
}

/** Stop a pass that is being written. The days already worked stay paid; nothing of it is credited or counted. */
export function cancelWriting(state: GameState, p: Project, jobId: string): void {
  const j = jobs(p).find((x) => x.id === jobId);
  if (!j || (j.status !== 'working' && j.status !== 'delivered')) throw new Error('That pass is already settled.');
  j.status = 'cancelled';
  addLog(state, `You stopped ${personById(state, j.personId, hireOf(p, j)?.roleId).name}'s work on ${episodeName(p, j.episode)}. The days worked stay paid.`, 'project', { projectId: p.id });
}

registerHandler('writing-day', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const j = p && jobs(p).find((x) => x.id === ev.payload.jobId);
  if (!p || !j || j.status !== 'working') return { suppressInterrupt: true };
  const h = hireOf(p, j);
  // Released, or the project delivered or shelved: the pass stops where it is.
  if (!h || h.status !== 'accepted' || p.delivered || p.shelved) { j.status = 'cancelled'; return { suppressInterrupt: true }; }
  const date = ev.payload.date as string;
  const pass = current(j);
  // One day's pay for one day's work, whatever else they did for the project that day.
  if (isWorkingDay(p, date) && settle(state, p, h.obligationId!, h.dayRate, `${h.id}:${date}`)) { h.daysWorked += 1; pass.done += 1; }
  if (pass.done >= pass.days) {
    pass.deliveredOn = date;
    const level = personById(state, j.personId, h.roleId).capability;
    pass.read = Math.round(Math.min(98, Math.max(5, level + gaussian(stream(state.seed, 'writing', j.id, j.passes.length), 0, READ_SPREAD[Math.min(1, j.passes.length - 1)]))));
    j.status = 'delivered';
    const name = personById(state, j.personId, h.roleId).name;
    addLog(state, `${name} delivered ${j.passes.length > 1 ? 'the revision' : SCOPE[j.scope].label.toLowerCase().replace('their own', 'a')} of ${episodeName(p, j.episode)} on ${formatDateKey(date)}. Accept it or ask for a revision on the Crew page.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'crew' } });
    return {};
  }
  const next = nextWorkingDay(p, addDaysToKey(date, 1));
  const { year, month, day } = parseYmd(next);
  schedule(state, localToInstant(getPlace(p.axes.basePlaceId).zone, year, month, day, 18).instant, 'writing-day', { projectId: p.id, jobId: j.id, date: next }, { priority: 58 });
  return { suppressInterrupt: true };
});

/** The pass as it stands: the last one delivered. */
export const standing = (j: WritingJob): WritingPass | undefined => [...j.passes].reverse().find((x) => x.read !== undefined);

/**
 * How a hired writer's accepted work stands for an episode, on the craft scale and pulled toward the middle by how much
 * of the script the scope covers: a draft in full, a rewrite three fifths, a polish three tenths. Null when they have no
 * accepted work on it.
 */
export function acceptedRead(p: Project, personId: string, episode: number, scopes: WritingScope[] = ['draft', 'rewrite', 'polish']): number | null {
  const mine = jobs(p).filter((j) => j.personId === personId && j.episode === episode && j.status === 'accepted' && scopes.includes(j.scope));
  if (!mine.length) return null;
  // Their latest accepted work on the episode is the work as it stands.
  const j = mine[mine.length - 1];
  return 50 + ((standing(j)?.read ?? 50) - 50) * SCOPE[j.scope].weight;
}

/** Whether a hire has accepted work on the project: what a co-writer's credit rests on. */
export const hasAcceptedWork = (p: Project, hireId: string): boolean => jobs(p).some((j) => j.hireId === hireId && j.status === 'accepted');
