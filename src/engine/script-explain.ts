// Explanations and helpers only the project screens use (loaded with them, not at startup). They describe the rules in
// script-effects.ts for the player; none of them changes an outcome.
import { editScenes } from './finish';
import { approvedScenes, sceneLabel } from './projects';
import { ESSENTIAL_CUT_COST, castPlacement, contentLevel } from './script-effects';
import type { ContentIssue, Project, RoleSize, StoryCharacter } from './types';

const SIZE_WORDS: Record<RoleSize, string> = {
  lead: 'Lead', 'co-lead': 'Co-Lead', 'ensemble-lead': 'Ensemble Lead', supporting: 'Supporting', featured: 'Featured', cameo: 'Cameo', background: 'Background',
};
/** Where a part is placed and why, in the player's words. */
export function placementExplained(c: Pick<StoryCharacter, 'name' | 'roleSize' | 'awardPlacement'>): string {
  const where = castPlacement(c);
  const word = where === 'lead' ? 'leading' : where === 'supporting' ? 'supporting' : null;
  if (c.awardPlacement) return word ? `${c.name} is entered in the ${word} categories, as you placed the part.` : `${c.name} isn't entered in acting categories, as you chose.`;
  return word
    ? `${c.name} is entered in the ${word} categories, from the part's size (${SIZE_WORDS[c.roleSize]}). Change Awards Placement on the character to enter it elsewhere.`
    : `${c.name} isn't entered in acting categories: a ${SIZE_WORDS[c.roleSize].toLowerCase()} part. Change Awards Placement on the character to enter it.`;
}

// ---------------- Content ----------------

export const CONTENT_ISSUES: { id: ContentIssue; label: string }[] = [
  { id: 'violence', label: 'Violence' }, { id: 'threat', label: 'Threat And Horror' }, { id: 'sexual-content', label: 'Sexual Content' },
  { id: 'nudity', label: 'Nudity' }, { id: 'language', label: 'Language' }, { id: 'drugs', label: 'Drug Use' },
];
/** The declaration in words: "Strong violence, mild language". */
export function contentSummary(p: Project): string {
  const c = p.axes.content;
  if (!c) return 'Not declared yet';
  const parts = CONTENT_ISSUES.filter((i) => c[i.id]).map((i) => `${c[i.id]} ${i.label.toLowerCase()}`);
  return parts.length ? parts.join(', ').replace(/^./, (x) => x.toUpperCase()) : 'Declared as containing none of these';
}

/** Scenes whose structured flags suggest something to declare. Suggestions only: an intimacy flag isn't a level. */
export function contentSuggestions(p: Project, label: (sceneId: string) => string): string[] {
  const c = p.axes.content ?? {};
  const out: string[] = [];
  const intimate = p.scenes.filter((s) => s.intimacy);
  if (intimate.length && !c['sexual-content'] && !c.nudity) out.push(`${label(intimate[0].id)} is marked as an intimate scene. If it shows sexual content or nudity, declare it.`);
  const stunts = p.scenes.filter((s) => s.stunts.trim());
  if (stunts.length && !c.violence) out.push(`${label(stunts[0].id)} has a stunt. If it shows violence, declare it.`);
  return out;
}

/** Declared content beyond what a young audience usually expects: advice, never a block or a penalty. */
export function audienceContentNote(p: Project): string | null {
  const level = contentLevel(p);
  if (!/child|famil|preschool/i.test(p.axes.audience) || (level !== 'moderate' && level !== 'strong')) return null;
  return `You aim this at a ${p.axes.audience.toLowerCase()} audience and declared ${level} content. Outlets that program for that audience usually expect milder content. Nothing stops you, and a broadcaster may still offer a later slot.`;
}

/**
 * Broadcast scheduling rules for content unsuitable for children, by territory. GB and US are researched rules; anywhere
 * else the game assumes a broadcaster keeps strong content to late evening, and says so.
 */
const WATERSHED: Record<string, string> = {
  GB: "Ofcom's Broadcasting Code keeps material unsuitable for children until after the 9pm watershed on free-to-air television.",
  US: 'FCC rules keep indecent material on broadcast television to between 10pm and 6am.',
};
export function watershedRule(country: string): string {
  return WATERSHED[country] ?? "In this game a broadcaster here keeps strong content to late evening (a simulation assumption: local rules aren't modeled).";
}

// ---------------- Lengths (shown, never scored) ----------------

/** Rough words for length, never for meaning. */
export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Spoken words a minute at a typical pace. A rule of thumb shown to the writer, never a check. */
export const WORDS_PER_MINUTE = 150;

/** How long the scene's written dialogue takes to say at a typical pace, in minutes. */
export function spokenMinutes(s: Pick<Project['scenes'][number], 'dialogue'>): number {
  return s.dialogue.reduce((n, d) => n + wordCount(d.text), 0) / WORDS_PER_MINUTE;
}

// ---------------- Casting ----------------

/** A character's casting breakdown is written when the description, wants and fears are. Shown with offers; never timed. */
export function breakdownComplete(c: Pick<StoryCharacter, 'description' | 'wants' | 'fears'>): boolean {
  return !!(c.description.trim() && c.wants.trim() && c.fears.trim());
}

/** A character's pronouns as written (He, She or They; anything else, or nothing, is open to anyone). */
export function characterPronouns(c: Pick<StoryCharacter, 'pronouns'>): 'he' | 'she' | 'they' | null {
  const m = /^\s*(he|she|they)\b/i.exec(c.pronouns);
  return m ? (m[1].toLowerCase() as 'he' | 'she' | 'they') : null;
}

/** Whether a performer's pronouns match the part's; parts open to anyone match everyone. Casting can mark and filter by it. */
export function pronounsMatch(c: Pick<StoryCharacter, 'pronouns'>, performerPronouns: 'he' | 'she' | 'they'): boolean {
  const want = characterPronouns(c);
  return want === null || want === performerPronouns;
}

// ---------------- Structure ----------------

/**
 * What cutting a scene from the edit would do, from what the player declared: whether it is essential, and the setups,
 * clues and reveals it plants or pays off in scenes that stay. Story order isn't read: a nonlinear structure costs nothing.
 */
export function cutConsequences(p: Project, sceneId: string): string[] {
  const s = approvedScenes(p).find((x) => x.id === sceneId);
  if (!s) return [];
  const label = sceneLabel(p, s);
  const kept = new Set(editScenes(p).map((x) => x.id).filter((id) => id !== sceneId));
  const name = (id: string) => { const x = p.scenes.find((y) => y.id === id); return x ? sceneLabel(p, x) : 'another scene'; };
  const out: string[] = [];
  if (s.essential) out.push(`${label} is marked essential to the story: without it the edit has a gap the audience notices (editing ${ESSENTIAL_CUT_COST} points lower in this game's model).`);
  for (const sp of p.setups) {
    if (sp.plantedIn === sceneId && sp.paidIn && kept.has(sp.paidIn)) out.push(`It plants "${sp.label}", which pays off in ${name(sp.paidIn)}: that payoff would have no setup.`);
    if (sp.paidIn === sceneId && sp.plantedIn && kept.has(sp.plantedIn)) out.push(`It pays off "${sp.label}", planted in ${name(sp.plantedIn)}: that setup would never pay off.`);
  }
  const minutes = s.estMinutes;
  out.push(`The cut runs about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} shorter.`);
  return out;
}
