// The story library: one text file for each genre (and one for each supported pair of genres), each fetched the first
// time its stories are asked for. Nothing here is in the startup bundle; `counts.json` (tests/v3-content.test.ts writes
// it) says how many stories each file has without opening it.
import { parseBlueprints, type Blueprint } from '../engine/blueprints';
import counts from './counts.json';

const FILES = import.meta.glob('./*.bp', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const loaded = new Map<string, Promise<Blueprint[]>>();

/** Stories in each file, by film and series: `{ heist: { film: 1, tv: 0 } }`. */
export const STORY_COUNTS = counts as Record<string, { film: number; tv: number }>;

/** The files that have stories for a genre: its own, and each pair it is half of. */
export const filesFor = (genreId: string): string[] => Object.keys(STORY_COUNTS).filter((f) => f === genreId || f.split('+').includes(genreId));

export function loadStories(file: string): Promise<Blueprint[]> {
  if (!loaded.has(file)) {
    const get = FILES[`./${file}.bp`];
    loaded.set(file, get ? get().then((text) => parseBlueprints(text).blueprints) : Promise.resolve([]));
  }
  return loaded.get(file)!;
}
