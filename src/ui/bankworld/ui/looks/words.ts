/**
 * SLATE — joining things the way a person says them.
 *
 * A look’s summary is a sentence, so a list inside one is spoken, not
 * comma-separated: "morale, nourishment and hygiene", never "morale and
 * nourishment and hygiene", which is what naive joining produces and what
 * shipped in the first draft of the readiness sentence.
 */

/** "a", "a and b", "a, b and c": the engine’s own, from 2026-10-17, so a sentence there joins a list the same way. */
export { spokenList } from '../../../../engine/bankworld/core/text';

/** Agreement for a list that becomes the subject of a sentence. */
export const isAre = (n: number): string => (n === 1 ? 'is' : 'are');

/**
 * A count and its noun, spelled the way a person says it.
 *
 * Numbers under ten are words in prose and figures in facts, which is the
 * house rule and the thing four of these files each wrote their own list for.
 * `zero` is the word for none of them, because "no towns", "nought" and
 * "none" are all right in different sentences and none of them is right in
 * all three.
 */
const SMALL = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] as const;

export function said(count: number, one: string, many = `${one}s`, zero = 'no'): string {
  const n = Math.round(count);
  // A fraction is a figure. "Half an hour" is the caller’s to say, not this.
  if (!Number.isInteger(count)) return `${count} ${many}`;
  const figure = n === 0 ? zero : (n > 0 && n < SMALL.length ? SMALL[n]! : n.toLocaleString('en-US'));
  return `${figure} ${n === 1 ? one : many}`;
}

/**
 * The same words, capitalized for the front of a sentence.
 *
 * `said` spells small numbers out, which is right in the middle of a sentence
 * and wrong at the start of one: the household shipped reading "four people
 * live under the one roof". Only the first letter is touched, so a name or an
 * acronym already in place comes back unchanged.
 */
export function toStart(words: string): string {
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * A figure on the nought-to-a-hundred scale, written the way it is read.
 *
 * "82/100", never "82 out of a hundred". The words were four times the width
 * of the figure and said nothing the slash does not, and a column of them next
 * to each other could not be scanned: nine dials each ending in the same five
 * words is a wall, and nine ending in /100 is a list.
 */
export function outOf(value: number): string {
  return `${Math.round(value)}/100`;
}

/**
 * Whether a string can stand as a look’s name: no underscore, slash or run of
 * four digits, no lowercase word running into a capital, and a capital
 * (accented ones too) or a digit first. The rule in docs/DRILL-DOWN.md, once.
 */
export const nameable = (text: string): boolean => !/_|\/|\d{4}/.test(text) && !/\b[a-z]+[A-Z]/.test(text) && /^[\p{Lu}0-9]/u.test(text);
