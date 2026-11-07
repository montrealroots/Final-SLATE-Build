// What the script's fields drive downstream, beyond the breakdown (November 7, 2026). The rule from the screenwriting
// audit holds: prose is never read for meaning and never raises quality. Prose counts by presence (the pitch documents
// backers, festivals and distributors ask for) and by length (spoken minutes, page count, subtitling words). Structured
// choices drive engines directly: award placement, booking, ratings, scouting, edit structure.
import type { Project, Scene, StoryCharacter } from './types';

/** Comedy and musical genres: the categories that split drama from comedy read these (awards.ts). */
export const COMEDY_MUSICAL = ['comedy', 'musical', 'romantic-comedy', 'action-comedy', 'buddy-comedy', 'screwball-comedy', 'slapstick', 'farce', 'parody', 'satire', 'black-comedy', 'stoner-comedy', 'horror-comedy', 'backstage-musical', 'jukebox-musical'];

/** Where the project competes where awards split drama from comedy: the producer's choice, else its genres. */
export function competesAs(p: Project): 'comedy' | 'drama' {
  if (p.axes.register) return p.axes.register;
  return p.axes.genres.some((g) => COMEDY_MUSICAL.includes(g.id)) ? 'comedy' : 'drama';
}

/** Story functions that put a part in the leading acting categories, whatever its size on the page. */
export const LEAD_FUNCTIONS = ['protagonist', 'deuteragonist', 'antagonist'];

/** The acting category a character's performer is considered for: leading, supporting, or neither (cameo, background). */
export function castPlacement(c: Pick<StoryCharacter, 'roleSize' | 'functions'>): 'lead' | 'supporting' | null {
  if (c.roleSize === 'background') return null;
  if (['lead', 'co-lead', 'ensemble-lead'].includes(c.roleSize) || c.functions.some((f) => LEAD_FUNCTIONS.includes(f))) return 'lead';
  return c.roleSize === 'supporting' || c.roleSize === 'featured' ? 'supporting' : null;
}

export type AgeRating = 'All Ages' | '12+' | '15+' | '18+';

/** The project's age rating, from its intended audience and what its scenes contain (modeled, not a ratings board). */
export function ageRating(p: Project, scenes: Scene[]): AgeRating {
  const intimate = scenes.some((s) => s.intimacy);
  const action = scenes.some((s) => s.stunts.trim().length > 0);
  if (/adult/i.test(p.axes.audience) && intimate) return '18+';
  if (intimate) return '15+';
  if (action || /adult|young/i.test(p.axes.audience)) return '12+';
  return 'All Ages';
}

/** Rough words for length, never for meaning. */
export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Spoken words a minute, and script words a page (about a page a minute on screen). Modeled. */
export const WORDS_PER_MINUTE = 150;
export const WORDS_PER_PAGE = 180;

/** How long the scene's dialogue takes to say, in minutes. */
export function spokenMinutes(s: Scene): number {
  return s.dialogue.reduce((n, d) => n + wordCount(d.text), 0) / WORDS_PER_MINUTE;
}

/** The script's length in pages, from its action and dialogue. */
export function scriptPages(scenes: Scene[]): number {
  const words = scenes.reduce((n, s) => n + wordCount(s.action) + s.dialogue.reduce((m, d) => m + wordCount(d.text), 0), 0);
  return words / WORDS_PER_PAGE;
}

/** Dialogue words in each language: subtitling and captioning for a territory is priced by the words not in its language. */
export function dialogueWords(scenes: Scene[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of scenes) for (const d of s.dialogue) out[d.language] = (out[d.language] ?? 0) + wordCount(d.text);
  return out;
}

/** Subtitling cost per thousand words of dialogue in another language. Simulation assumption. */
export const SUBTITLE_PER_THOUSAND_WORDS = 250;

/** What the pitch still needs before backers, festivals or distributors take it: a logline and a premise (the synopsis). */
export function pitchMissing(p: Project): string | null {
  if (!p.story.logline.trim() && !p.story.premise.trim()) return 'Write a logline and a premise in the Story panel first: they read a pitch.';
  if (!p.story.logline.trim()) return 'Write a logline in the Story panel first: they read a pitch.';
  if (!p.story.premise.trim()) return 'Write a premise in the Story panel first: it is the synopsis they read.';
  return null;
}

/** A grant application asks for more than a pitch: the stakes and the theme, as a statement of intent. */
export function grantApplicationMissing(p: Project): string | null {
  const pitch = pitchMissing(p);
  if (pitch) return pitch;
  if (!p.story.stakes.trim() || !p.story.theme.trim()) return 'Write the stakes and the theme in the Story panel first: a grant application asks for them.';
  return null;
}

/** A character's casting breakdown is complete when the description, wants and fears are written. */
export function breakdownComplete(c: Pick<StoryCharacter, 'description' | 'wants' | 'fears'>): boolean {
  return !!(c.description.trim() && c.wants.trim() && c.fears.trim());
}

/** A scene with a turning point written is a structural beat: losing it costs the edit more (finish.ts). */
export const isTurningPoint = (s: Scene): boolean => s.turningPoint.trim().length > 0;
export const LOST_TURNING_POINT_COST = 6;

/** A character's pronouns as written (He, She or They; anything else, or nothing, is open to anyone). */
export function characterPronouns(c: Pick<StoryCharacter, 'pronouns'>): 'he' | 'she' | 'they' | null {
  const m = /^\s*(he|she|they)\b/i.exec(c.pronouns);
  return m ? (m[1].toLowerCase() as 'he' | 'she' | 'they') : null;
}

/** Whether a performer's pronouns match the part's; parts open to anyone match everyone. Casting sorts and marks by it. */
export function pronounsMatch(c: Pick<StoryCharacter, 'pronouns'>, performerPronouns: 'he' | 'she' | 'they'): boolean {
  const want = characterPronouns(c);
  return want === null || want === performerPronouns;
}
