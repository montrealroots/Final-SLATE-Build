// The series bible and the season plan (SLATE-07-01.02 and 07-02.02, November 8, 2026). Before this a series' world
// rules and relationships could only be added or removed, silently, and its episodes were numbered in the order they
// were created, titled "Episode N" for good. Now:
// - A world rule can name the scenes that rely on it. Changing or removing a rule, or a relationship (which touches
//   every scene its two characters share), first lists the episodes and scenes it touches, and which are recorded
//   already: recorded footage stays as it was shot, so the change is the writer's to reconcile, never rewritten.
// - A season has an arc, each episode a title and a line on what it moves. They are the writer's plan and score nothing;
//   the arc's notes are advice only, and the next season starts with the last one's arc to build on.
// - Episodes can be put in a different order while nothing is planned, hired or recorded for them; the scenes, drafts
//   and the episode's writer and director move with it.
import { assertEditable, isEpisodic, sceneLabel, sceneNumber } from './projects';
import type { Project, Relationship, WorldRule } from './types';

export interface FactImpact { episode: number; title: string; scenes: { id: string; label: string; short: string; recorded: boolean }[] }

export type SharedFact = { kind: 'rule'; id: string } | { kind: 'relationship'; id: string };

/** The scenes a shared fact touches, by episode, with whether each is recorded already. */
export function sharedFactImpact(p: Project, fact: SharedFact): FactImpact[] {
  let ids: string[] = [];
  if (fact.kind === 'rule') ids = p.worldRules.find((r) => r.id === fact.id)?.sceneIds ?? [];
  else {
    const r = p.relationships.find((x) => x.id === fact.id);
    if (r) ids = p.scenes.filter((s) => s.participants.includes(r.a) && s.participants.includes(r.b)).map((s) => s.id);
  }
  const out: FactImpact[] = [];
  for (const s of p.scenes.filter((x) => ids.includes(x.id))) {
    let e = out.find((x) => x.episode === s.episode);
    if (!e) out.push((e = { episode: s.episode, title: p.episodes.find((x) => x.number === s.episode)?.title ?? `Episode ${s.episode}`, scenes: [] }));
    e.scenes.push({ id: s.id, label: sceneLabel(p, s), short: `Scene ${sceneNumber(p, s.id)}${s.heading.place ? ` (${s.heading.place})` : ''}`, recorded: p.captures.some((c) => c.sceneId === s.id && c.captured > 0) });
  }
  return out.sort((a, b) => a.episode - b.episode);
}

/** The preview in words: what the change touches, before it is made. */
export function sharedFactPreview(p: Project, fact: SharedFact): string[] {
  const impact = sharedFactImpact(p, fact);
  if (!impact.length) return ['No scene relies on it yet, so nothing else changes.'];
  const lines = impact.map((e) => `${isEpisodic(p.axes.format) ? `${e.title}: ` : ''}${e.scenes.map((s) => (isEpisodic(p.axes.format) ? s.short : s.label) + (s.recorded ? ' (recorded)' : '')).join('; ')}.`);
  if (impact.some((e) => e.scenes.some((s) => s.recorded))) lines.push('Recorded scenes stay as they were shot. Rewrite or reshoot them if they no longer fit.');
  return lines;
}

const ruleOf = (p: Project, id: string): WorldRule => {
  const r = p.worldRules.find((x) => x.id === id);
  if (!r) throw new Error('That rule no longer exists.');
  return r;
};

export function updateWorldRule(p: Project, id: string, patch: Partial<Pick<WorldRule, 'rule' | 'limit' | 'sceneIds'>>): WorldRule {
  assertEditable(p);
  const r = ruleOf(p, id);
  if (patch.rule !== undefined && !patch.rule.trim()) throw new Error('Say what the rule is.');
  if (patch.sceneIds?.some((s) => !p.scenes.some((x) => x.id === s))) throw new Error('That scene no longer exists.');
  if (patch.rule !== undefined) r.rule = patch.rule.trim();
  if (patch.limit !== undefined) r.limit = patch.limit.trim();
  if (patch.sceneIds !== undefined) r.sceneIds = [...new Set(patch.sceneIds)];
  return r;
}

export function removeWorldRule(p: Project, id: string): void {
  assertEditable(p);
  ruleOf(p, id);
  p.worldRules = p.worldRules.filter((x) => x.id !== id);
}

export function updateRelationship(p: Project, id: string, patch: Partial<Pick<Relationship, 'kind' | 'start' | 'end'>>): Relationship {
  assertEditable(p);
  const r = p.relationships.find((x) => x.id === id);
  if (!r) throw new Error('That relationship no longer exists.');
  if (patch.kind !== undefined && !patch.kind.trim()) throw new Error('Say what the relationship is.');
  if (patch.kind !== undefined) r.kind = patch.kind.trim();
  if (patch.start !== undefined) r.start = patch.start.trim();
  if (patch.end !== undefined) r.end = patch.end.trim();
  return r;
}

export function removeRelationship(p: Project, id: string): void {
  assertEditable(p);
  p.relationships = p.relationships.filter((x) => x.id !== id);
}

// ---------------- The season plan ----------------

const episodeOf = (p: Project, n: number) => {
  const e = p.episodes.find((x) => x.number === n);
  if (!e) throw new Error('That episode no longer exists.');
  return e;
};

export function setSeasonArc(p: Project, text: string): void {
  assertEditable(p);
  p.seasonArc = text.slice(0, 2000);
}

export function setEpisodeTitle(p: Project, n: number, title: string): void {
  assertEditable(p);
  const t = title.trim();
  if (!t) throw new Error('Give the episode a title.');
  episodeOf(p, n).title = t.slice(0, 120);
}

export function setEpisodeArc(p: Project, n: number, arc: string): void {
  assertEditable(p);
  const e = episodeOf(p, n);
  if (arc.trim()) e.arc = arc.slice(0, 400);
  else delete e.arc;
}

/** Why the episodes can't be put in another order now, or null when they can. */
export function reorderRefusal(p: Project): string | null {
  if (p.schedule.startDate || p.schedule.days.length) return 'The shoot is planned by episode already. Reorder the episodes before you plan it.';
  if (p.captures.some((c) => c.captured > 0) || p.tasks.some((t) => t.status === 'done' || t.status === 'active')) return 'Work is recorded against these episodes already.';
  if (p.hires.some((h) => h.episodes !== 'all' && ['offered', 'accepted', 'countered'].includes(h.status))) return 'People are booked for particular episodes. Reorder the episodes before you hire for them.';
  return null;
}

/** Move an episode one place earlier (-1) or later (+1). Its scenes, in every draft, and its writer and director go with it. */
export function moveEpisode(p: Project, n: number, by: -1 | 1): void {
  assertEditable(p);
  const why = reorderRefusal(p);
  if (why) throw new Error(why);
  const m = n + by;
  const a = episodeOf(p, n);
  const b = p.episodes.find((x) => x.number === m);
  if (!b) throw new Error(by < 0 ? 'It is the first episode already.' : 'It is the last episode already.');
  const swap = (x: number) => (x === n ? m : x === m ? n : x);
  for (const s of [...p.scenes, ...p.drafts.flatMap((d) => d.scenes)]) s.episode = swap(s.episode);
  for (const t of p.tasks) t.episode = swap(t.episode);
  // A title left at its default follows the position, so the episode now second isn't still called "Episode 1".
  for (const [e, to] of [[a, m], [b, n]] as const) if (e.title === `Episode ${e.number}`) e.title = `Episode ${to}`;
  a.number = m;
  b.number = n;
  p.episodes.sort((x, y) => x.number - y.number);
}
