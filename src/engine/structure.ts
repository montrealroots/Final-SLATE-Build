// Acts and story threads (SLATE-04-02.02 and .03, November 8, 2026). Scenes had turning points and setups but no larger
// shape. Now a writer can group scenes into acts or sequences and follow threads: a story line through chosen scenes
// and characters that resolves in a named scene, or is left open on purpose. These are the writer's structure. They
// never score anything (a thread left open is as valid as one resolved); what they do is make links visible, so that a
// cut, a combined scene or a deleted one says which thread it leaves without its resolution, by scene. The editing
// functions are in structure-edit.ts, loaded with the Script page (the startup JavaScript budget).
import { isEpisodic, sceneLabel } from './projects';
import type { Project, StoryThread } from './types';

/** Keep threads, world rules and arc beats pointing at real scenes when a scene goes (deleted) or is folded into another (combined). */
export function remapThreads(p: Project, goneId: string, intoId: string | null): void {
  for (const t of p.threads ?? []) {
    t.sceneIds = [...new Set(t.sceneIds.map((x) => (x === goneId ? intoId : x)).filter((x): x is string => !!x))];
    if (t.resolvedIn === goneId) t.resolvedIn = intoId;
  }
  for (const r of p.worldRules) if (r.sceneIds) r.sceneIds = [...new Set(r.sceneIds.map((x) => (x === goneId ? intoId : x)).filter((x): x is string => !!x))];
  for (const c of p.characters) {
    if (!c.beats) continue;
    c.beats = c.beats.flatMap((b) => (b.sceneId !== goneId ? [b] : intoId ? [{ ...b, sceneId: intoId }] : []));
  }
}

// ---------------- Arc beats (SLATE-05-04.02) ----------------

/** The arc beats that happen in a scene, by character name. */
export function beatsIn(p: Project, sceneId: string): { character: string; change: string }[] {
  return p.characters.flatMap((c) => (c.beats ?? []).filter((b) => b.sceneId === sceneId).map((b) => ({ character: c.name, change: b.change })));
}

/** Notes about the structure, by scene where there is one. Advice only: nothing here blocks approval or scores. */
export function structureNotes(p: Project): { text: string; sceneId?: string }[] {
  const out: { text: string; sceneId?: string }[] = [];
  const present = new Set(p.scenes.map((s) => s.id));
  for (const t of p.threads ?? []) {
    if (!t.sceneIds.length) out.push({ text: `The thread "${t.name}" isn't in any scene yet.` });
    for (const id of t.sceneIds.filter((x) => !present.has(x))) out.push({ text: `The thread "${t.name}" lists a scene that is no longer in the script.`, sceneId: id });
    if (t.resolution === 'resolves' && !t.resolvedIn) out.push({ text: `The thread "${t.name}" has no resolving scene yet. Choose one, or mark it left open on purpose.` });
    // A thread follows its characters: each one it names should be in at least one of its scenes.
    const inThread = p.scenes.filter((s) => t.sceneIds.includes(s.id));
    for (const c of p.characters.filter((x) => t.characterIds.includes(x.id))) {
      if (inThread.length && !inThread.some((s) => s.participants.includes(c.id))) out.push({ text: `The thread "${t.name}" follows ${c.name}, who isn't in any of its scenes.` });
    }
  }
  for (const a of p.acts ?? []) if (!p.scenes.some((s) => s.act === a.id)) out.push({ text: `${a.name} has no scenes yet.` });
  return out;
}

/** What cutting a scene does to the threads it resolves, for the edit's cut warnings. */
export function threadCutConsequences(p: Project, sceneId: string): string[] {
  return [
    ...(p.threads ?? []).filter((t) => t.resolvedIn === sceneId).map((t) => `It resolves the thread "${t.name}": cut, that thread is left without its resolution.`),
    ...beatsIn(p, sceneId).map((b) => `${b.character} changes here (${b.change}): cut, the audience doesn't see it.`),
  ];
}

/** The threads a scene belongs to, for its card. */
export function threadsOf(p: Project, sceneId: string): StoryThread[] {
  return (p.threads ?? []).filter((t) => t.sceneIds.includes(sceneId));
}

export const resolutionLabel = (p: Project, t: StoryThread): string => {
  if (t.resolution === 'open') return 'Left open on purpose';
  const s = p.scenes.find((x) => x.id === t.resolvedIn);
  return s ? `Resolves in ${sceneLabel(p, s)}` : 'No resolving scene yet';
};

// The season plan's advice (season.ts), here so the readiness notes don't load the season's editing code at startup.
/** Advice on the season plan, for the structure notes. Never blocks or scores. */
export function seasonNotes(p: Project): { text: string }[] {
  if (!isEpisodic(p.axes.format) || p.episodes.length < 2 || !p.seasonArc?.trim()) return [];
  return p.episodes.filter((e) => !e.arc?.trim()).map((e) => ({ text: `${e.title} has no line on what it moves in the season arc.` }));
}
