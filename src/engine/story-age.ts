// A character's age in the story (November 11, 2026). It was free text read only for a leading number, so "30s" read as
// 30 and "late forties" wasn't read at all. The Characters page now writes it with numbers, as one age ("12") or a range
// ("10-12"), and everything that uses it reads it here. Text written before that is still read where it can be (a
// number, a range, a decade such as "30s"), and anything else is kept as written and read as no age.

export interface StoryAge { min: number; max: number }

const MAX_AGE = 120;

/** The age or range a character's written age gives, or null when it gives none. */
export function storyAge(text: string | undefined): StoryAge | null {
  const t = (text ?? '').trim().toLowerCase();
  if (!t) return null;
  const range = /^(\d{1,3})\s*(?:-|–|to)\s*(\d{1,3})$/.exec(t);
  if (range) {
    const [a, b] = [Number(range[1]), Number(range[2])].sort((x, y) => x - y);
    return b <= MAX_AGE ? { min: a, max: b } : null;
  }
  const decade = /^(\d)0'?s$/.exec(t); // "30s": thirty to thirty-nine
  if (decade) return { min: Number(decade[1]) * 10, max: Number(decade[1]) * 10 + 9 };
  const one = /^(\d{1,3})$/.exec(t);
  if (one && Number(one[1]) <= MAX_AGE) return { min: Number(one[1]), max: Number(one[1]) };
  return null;
}

/** The written form of an age or range: "12", or "10-12". */
export function formatStoryAge(a: StoryAge | null): string {
  if (!a) return '';
  return a.min === a.max ? String(a.min) : `${a.min}-${a.max}`;
}

/** The same age the given number of years later, for a series character between seasons; text with no age is kept. */
export function shiftStoryAge(text: string, years: number): string {
  const a = storyAge(text);
  if (!a || !years) return text;
  return formatStoryAge({ min: Math.min(MAX_AGE, a.min + years), max: Math.min(MAX_AGE, a.max + years) });
}

/** In words, for the screen: "12", "10 to 12". */
export function storyAgeWords(a: StoryAge): string {
  return a.min === a.max ? String(a.min) : `${a.min} to ${a.max}`;
}
