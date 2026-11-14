/**
 * SLATE — how the game writes things down.
 *
 * Titles, labels and headings are Title Case: every word starts with a
 * capital. Prose is not — a sentence stays a sentence, with its punctuation.
 * Keeping the rule in one place means the interface, the engine and the
 * migration that repairs older saves all agree on what a label looks like.
 */

/**
 * Capitalises one word, leaving alone anything spelled the way it is on
 * purpose: acronyms (LA, VFX, P&L), mixed-case names (McKinsey, iPhone), and
 * anything with no letters in it at all.
 */
function capitaliseWord(word: string): string {
  if (!/[a-z]/.test(word)) return word;

  // Leading brackets and quotes are skipped; a leading digit is not. '97th' is
  // an ordinal, and '97Th' is nothing at all.
  const first = word.search(/[A-Za-z0-9]/);
  if (first < 0) return word;
  const lead = word[first] as string;
  if (lead >= '0' && lead <= '9') return word;
  if (/[A-Z]/.test(word.slice(first + 1))) return word;

  return word.slice(0, first) + lead.toUpperCase() + word.slice(first + 1);
}

/**
 * Whether a string is prose rather than a label.
 *
 * A full stop, question mark or exclamation at the end means somebody wrote a
 * sentence, and so does anything long enough to be one. Title-casing those
 * makes them worse, so they are left as they are.
 */
export function readsAsProse(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  if (/[.?!]$/.test(trimmed)) return true;
  return trimmed.split(/\s+/).length > 9;
}

/** Title Case for a label. Prose is returned untouched. */
export function titleCaseLabel(value: string): string {
  if (readsAsProse(value)) return value;
  return value.replace(/\S+/g, capitaliseWord);
}

/**
 * A count with its noun, agreeing with itself.
 *
 * Nothing in the game should ever print "1 things". Pass the plural only when
 * it is not the singular with an s on the end.
 */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * A count under ten in words, as prose says it: two, six, 12 (the leave's notices and the Standing And Craft tab's say
 * theirs with it). It was `systems/school.ts`'s until 2026-10-21, when the agent's sentences read it as their module
 * loaded and the showcase's call into the agent made the School load the agent first: here it needs nothing loaded.
 */
export const countWords = (n: number): string => ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] ?? String(n);

/**
 * A place in an order, "1st", "2nd", "11th", "23rd" (from 2026-10-17, brief 14's editorial review, for Home's place in
 * the class, which read "1 of 16 in the class" where the School's look said "1st of 16").
 */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`;
}

/**
 * "a", "a and b", "a, b and c". No Oxford comma; the house does not use one. Moved here from `ui/looks/words.ts` on
 * 2026-10-17 (brief 14), so the engine's sentences join a list as the screens' do; the looks import it from there still.
 */
export function spokenList(items: readonly string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
