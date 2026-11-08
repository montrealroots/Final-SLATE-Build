// Unscripted television families (Gap Completion Package, section 2): talk, observational, competition, factual and
// studio variety. Each family adds only its own rules on top of the shared pipeline (segments, contributors, consent,
// logging, story producing, assembly). These are the supported families, not every TV format there is.
// Competition results are decided once, deterministically, when an episode's recording is complete, and stored.
// A contributor may withdraw before delivery: their footage is redacted by an editor before the episode can deliver.

import { addLog } from './state';
import { approvedScenes, sceneLabel, type Issue } from './projects';
import { stream } from './rng';
import type { CompetitionResult, GameState, Project, Task, UnscriptedFamily, UnscriptedSetup } from './types';

export const FAMILIES: Record<UnscriptedFamily, { label: string; description: string }> = {
  talk: { label: 'Interview Or Talk', description: 'A host talks with guests. Each episode needs a host and at least one guest.' },
  observational: { label: 'Observational Or Docuseries', description: 'Real people followed as things happen. Everyone shown needs a signed release.' },
  competition: { label: 'Competition', description: 'Contestants compete in rounds; results decide who advances each episode.' },
  factual: { label: 'Factual Or Lifestyle', description: 'Information and advice. Every claim is checked before delivery.' },
  'studio-variety': { label: 'Studio Variety', description: 'Acts and segments recorded in a studio. Each episode needs at least two acts.' },
};

/** Older shows have no family recorded; they behave as observational, the base pipeline. */
export function unscriptedOf(p: Project): UnscriptedSetup {
  p.unscripted ??= { family: 'observational', redactions: [] };
  p.unscripted.redactions ??= [];
  return p.unscripted;
}

export function setFamily(p: Project, family: UnscriptedFamily): void {
  if (p.axes.format !== 'unscripted-series') throw new Error('Only unscripted series have a format family.');
  if (p.delivered) throw new Error('This show is already delivered.');
  const u = unscriptedOf(p);
  u.family = family;
  if (family === 'competition') u.competition ??= { contestants: [], eliminatePerEpisode: 1, results: [] };
}

export function setupCompetition(p: Project, contestants: string[], eliminatePerEpisode: number): void {
  const u = unscriptedOf(p);
  if (u.family !== 'competition') throw new Error('Choose the competition family first.');
  if (u.competition?.results.length) throw new Error('Results are in; the contestants and rules are fixed for this season.');
  if (!Number.isInteger(eliminatePerEpisode) || eliminatePerEpisode < 1) throw new Error('At least one contestant leaves each episode.');
  const known = new Set(p.contributors.map((c) => c.id));
  if (contestants.some((c) => !known.has(c))) throw new Error('Every contestant must be one of your participants.');
  u.competition = { contestants: [...new Set(contestants)], eliminatePerEpisode, results: [] };
}

/** Contestants still in the competition at the start of an episode. */
export function stillIn(p: Project, episode: number): string[] {
  const c = unscriptedOf(p).competition;
  if (!c) return [];
  const out = new Set(c.results.filter((r) => r.episode < episode).flatMap((r) => r.eliminated));
  return c.contestants.filter((id) => !out.has(id));
}

const isHost = (role: string) => /\bhost/i.test(role);

/** Family rules, as script issues (blocking ones stop approval). */
export function unscriptedIssues(p: Project): Issue[] {
  if (p.axes.format !== 'unscripted-series') return [];
  const u = unscriptedOf(p);
  const out: Issue[] = [];
  const name = (id: string) => p.contributors.find((c) => c.id === id)?.name ?? 'A participant';
  for (let e = 1; e <= p.axes.episodeCount; e++) {
    const segs = p.scenes.filter((s) => s.episode === e && s.kind === 'segment');
    const people = new Set(segs.flatMap((s) => s.contributorIds));
    if (u.family === 'talk') {
      const hosts = [...people].filter((id) => isHost(p.contributors.find((c) => c.id === id)?.role ?? ''));
      if (!hosts.length || people.size - hosts.length < 1) out.push({ severity: 'blocking', area: 'structure', text: `Episode ${e} needs a host and at least one guest.` });
    }
    if (u.family === 'studio-variety' && segs.length < 2) out.push({ severity: 'blocking', area: 'structure', text: `Episode ${e} needs at least two acts.` });
    if (u.family === 'competition') {
      const remaining = new Set(stillIn(p, e));
      for (const s of segs) {
        for (const id of s.contributorIds) {
          if (u.competition?.contestants.includes(id) && !remaining.has(id)) {
            out.push({ severity: 'blocking', area: 'continuity', text: `${name(id)} left the competition before Episode ${e}; remove them from ${sceneLabel(p, s)}.`, sceneId: s.id });
          }
        }
      }
    }
  }
  if (u.family === 'competition') {
    const c = u.competition;
    const needed = (c?.eliminatePerEpisode ?? 1) * (p.axes.episodeCount - 1) + 2;
    if (!c || c.contestants.length < needed) {
      out.push({ severity: 'blocking', area: 'structure', text: `A ${p.axes.episodeCount}-episode competition with ${c?.eliminatePerEpisode ?? 1} leaving each episode needs at least ${needed} contestants.` });
    }
  }
  if (u.family === 'factual' && !p.evidence.length) out.push({ severity: 'blocking', area: 'structure', text: 'A factual show needs at least one claim to check.' });
  return out;
}

/** Decide each episode's competition result once its recording is done. Stored, so reopening never rerolls it. */
export function decideCompetition(state: GameState, p: Project, recorded: (episode: number) => boolean): CompetitionResult[] {
  const u = unscriptedOf(p);
  const c = u.competition;
  if (u.family !== 'competition' || !c) return [];
  const made: CompetitionResult[] = [];
  for (let e = 1; e <= p.axes.episodeCount; e++) {
    if (c.results.some((r) => r.episode === e) || !recorded(e)) continue;
    if (c.results.length < e - 1) break; // results follow episode order
    const inPlay = stillIn(p, e).filter((id) => approvedScenes(p).some((s) => s.episode === e && s.contributorIds.includes(id)));
    const scores: Record<string, number> = {};
    for (const id of inPlay) scores[id] = Math.round(40 + stream(state.seed, 'competition', p.id, e, id)() * 60);
    const ranked = [...inPlay].sort((a, b) => scores[b] - scores[a] || a.localeCompare(b));
    const last = e === p.axes.episodeCount;
    const eliminated = last ? ranked.slice(1) : ranked.slice(Math.max(1, ranked.length - c.eliminatePerEpisode));
    const result = { episode: e, scores, advancing: ranked.filter((id) => !eliminated.includes(id)), eliminated };
    c.results.push(result);
    made.push(result);
    const nm = (id: string) => p.contributors.find((x) => x.id === id)?.name ?? 'A contestant';
    addLog(state, last
      ? `${p.title}: ${nm(ranked[0])} wins the competition in Episode ${e}.`
      : `${p.title}, Episode ${e}: ${eliminated.map(nm).join(' and ')} ${eliminated.length === 1 ? 'leaves' : 'leave'} the competition.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'script' } });
  }
  return made;
}

/**
 * A contributor withdraws their release before delivery. Their recorded segments must be redacted: an editor's task per
 * episode, which assembly then waits for. After delivery the picture is final and can't be changed here. Until November
 * 8, 2026 only unscripted shows could record this (SLATE-14-02); a documentary contributor could not withdraw once
 * filmed. Now a documentary's scenes with them that have footage are redacted the same way.
 */
export function withdrawRelease(state: GameState, p: Project, contributorId: string): Task[] {
  const unscripted = p.axes.format === 'unscripted-series';
  if (p.delivered) throw new Error(`This ${unscripted ? 'show' : 'project'} is delivered; its footage is final.`);
  const c = p.contributors.find((x) => x.id === contributorId);
  if (!c) throw new Error(`That ${unscripted ? 'participant is no longer in the show' : 'contributor is no longer in the project'}.`);
  if (c.consent === 'withdrawn') throw new Error(`${c.name} has already withdrawn.`);
  const affected = approvedScenes(p).filter((s) => s.contributorIds.includes(contributorId));
  // Only footage that exists can be taken out: an unscripted episode being logged, or a documentary scene already shot.
  const filmed = (e: number) => unscripted
    ? p.tasks.some((t) => t.id === `unscripted:logging:${e}`)
    : affected.some((s) => s.episode === e && (p.captures.find((x) => x.sceneId === s.id)?.captured ?? 0) > 0);
  const recorded = [...new Set(affected.map((s) => s.episode))].filter(filmed);
  // Checked before anything changes: a refused withdrawal leaves the project as it was.
  if (recorded.length && p.edit.pictureLocked) throw new Error(`Unlock the picture first; ${c.name}'s footage has to be taken out of ${p.episodes.length > 1 ? `Episode ${recorded[0]}` : 'the cut'}.`);
  c.consent = 'withdrawn';
  const made: Task[] = [];
  for (const e of recorded) {
    const sceneIds = affected.filter((s) => s.episode === e && (unscripted || (p.captures.find((x) => x.sceneId === s.id)?.captured ?? 0) > 0)).map((s) => s.id);
    const kind = unscripted ? 'unscripted:redact' : 'doc:redact';
    const id = `${kind}:${contributorId}:${e}`;
    const task: Task = {
      id, kind, label: `Redact ${c.name}${p.episodes.length > 1 ? `: Episode ${e}` : ''}`, dept: 'Post Production', roleId: 'editor', units: Math.max(1, sceneIds.length),
      unitLabel: 'days', done: 0, dependsOn: unscripted ? [`unscripted:logging:${e}`] : [], status: 'waiting', episode: e, sceneIds, workedDays: 0,
    };
    p.tasks.push(task);
    const assembly = p.tasks.find((t) => t.id === `post:assembly:${e}`);
    if (assembly) {
      assembly.dependsOn.push(id);
      if (assembly.status === 'done') { assembly.status = 'waiting'; assembly.done = Math.max(0, assembly.units - 1); }
    }
    if (unscripted) unscriptedOf(p).redactions.push({ contributorId, episode: e, sceneIds, taskId: id });
    made.push(task);
  }
  const where = p.episodes.length > 1 ? (made.length === 1 ? 'one episode' : `${made.length} episodes`) : 'the film';
  addLog(state, `${c.name} withdrew from ${p.title}. ${made.length ? `Their footage is being redacted from ${where}.` : 'They were not recorded.'}`, 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'script' } });
  return made;
}

/** A withdrawn contributor no longer blocks delivery once every redaction of their footage is done. */
export function redactionComplete(p: Project, contributorId: string): boolean {
  const reds = (p.unscripted?.redactions ?? []).filter((r) => r.contributorId === contributorId);
  const docs = p.tasks.filter((t) => t.kind === 'doc:redact' && t.id.startsWith(`doc:redact:${contributorId}:`));
  return reds.every((r) => p.tasks.find((t) => t.id === r.taskId)?.status === 'done') && docs.every((t) => t.status === 'done');
}
