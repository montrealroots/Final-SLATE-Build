/**
 * SLATE — what a kind of thing opens into, declared once.
 *
 * A screen names a subject; it never writes a body. The body is declared here,
 * per kind, so the same calendar entry opens the same way on Home, on the
 * Calendar, and from a notification about it. Openability belongs to the
 * thing, not to the screen that happens to be printing it.
 *
 * The shape of a declaration is data, not markup, wherever it can be: `ways`
 * is an array of addresses rather than JSX, which is what lets a test crawl
 * the whole graph and prove every way in opens onto something. A body may
 * still be markup — some things are best said in a paragraph — but the edges
 * are never buried inside it.
 */

import type { ReactNode } from 'react';
import type { Simulation } from '../../../../engine/bankworld/index';
import type { Subject } from './subject';

/** A way further in. `detail` says what is behind it before you take it. */
export interface Way {
  to: Subject;
  label: string;
  detail: string;
  /**
   * What the cell shows when the ways are laid out as a strip.
   *
   * The edges stay data either way — this says how one is drawn, not where it
   * goes — so the crawl still walks the whole graph. A picture is always
   * beside the word and never instead of it, and it is hidden from a screen
   * reader, which has the word and the lines.
   */
  glance?: {
    icon?: string;
    lines?: readonly string[];
    /**
     * Whether this cell is the one the level is about.
     *
     * A strip of seven bands with no mark on the one you are standing in is a
     * chart of somebody else’s life: the sentence said which rung you were on
     * and the picture did not, so the eye had to go back to the prose to find
     * out. Marked cells still open like any other.
     */
    marked?: boolean;
  };
}

/** Another face of the same thing. Costs no depth and has no address. */
export interface Facet {
  id: string;
  label: string;
  body: ReactNode;
  ways?: readonly Way[];
}

/** What a look says about its subject. */
export interface Looked {
  /** The world’s word for it, Title Case. The only string a trail prints. */
  name: string;
  /** What kind of thing this is, in the world’s words: 'The Day', 'One Of Nine'. */
  kind: string;
  /** One sentence, second person, present tense, true at this instant. */
  summary: string;
  /** What this hangs beneath, for the trail and for where it opens. */
  parent?: Subject;
  body?: ReactNode;
  facets?: readonly Facet[];
  ways?: readonly Way[];
  /**
   * How the ways are laid out.
   *
   * A list by default: a name and a line saying what is behind it. A strip
   * goes across the way a week of weather does on Home — a name, a picture
   * and the figures under it — for a set whose members are a sequence and
   * whose whole point is being compared side by side.
   */
  waysAs?: 'list' | 'strip';
  /** One footnote line. Never a level, never openable. */
  provenance?: string;
}

export interface LookView<T> {
  /** Read from the live world every time. undefined means it is not there. */
  resolve(sim: Simulation, id: string): T | undefined;
  /** What the world says when it is not there. A sentence, in voice. */
  gone: string;
  look(subject: T, ctx: { sim: Simulation; id: string }): Looked;
  /**
   * Ids worth crawling in a test, for a kind whose ids are not enumerable
   * from the save alone. A dial cannot be discovered by reading a universe;
   * it has to say what its nine are.
   */
  seeds?(sim: Simulation): readonly string[];
}

const REGISTRY = new Map<string, LookView<unknown>>();

/**
 * Whether the module graph is being swapped under a running page.
 *
 * Two declarations of one kind is a real mistake and throwing on it is right —
 * but a hot reload re-runs a declaration file, which is the same call a second
 * time and not a mistake at all. Left throwing, every save of a look file took
 * the registry down and the page with it: the first drill through Home
 * recorded five of them. In dev the later declaration wins, which is what
 * "reload this file" means; in a build there is no `hot` and the guard stands.
 */
const swapping = (): boolean =>
  typeof import.meta !== 'undefined' && Boolean((import.meta as { hot?: unknown }).hot);

export function defineLook<T>(kind: string, view: LookView<T>): void {
  if (REGISTRY.has(kind) && !swapping()) throw new Error(`Two declarations for the same kind: ${kind}`);
  REGISTRY.set(kind, view as LookView<unknown>);
}

/** Every registered kind. The crawl and the coverage matrix read this. */
export function lookKinds(): string[] {
  return [...REGISTRY.keys()].sort();
}

export function hasKind(kind: string): boolean {
  return REGISTRY.has(kind);
}

/** The ids of a kind worth crawling, where the kind can say. */
export function seedsFor(kind: string, sim: Simulation): readonly string[] {
  return REGISTRY.get(kind)?.seeds?.(sim) ?? [];
}

/**
 * What is behind a subject right now, or nothing.
 *
 * Returns `gone` rather than throwing when the subject has left the world: a
 * person who moved out, an account that closed, a day that passed. The screen
 * says what became of it in the world’s own words instead of blanking.
 */
export function resolveLook(sim: Simulation, subject: Subject): Looked | { gone: string } | undefined {
  const view = REGISTRY.get(subject.kind);
  if (!view) return undefined;
  const found = view.resolve(sim, subject.id);
  if (found === undefined) return { gone: view.gone };
  return view.look(found, { sim, id: subject.id });
}

/** Whether a subject would open onto anything. A name is not painted as a way in unless it would. */
export function lookExists(sim: Simulation, subject: Subject): boolean {
  const view = REGISTRY.get(subject.kind);
  if (!view) return false;
  return view.resolve(sim, subject.id) !== undefined;
}

/**
 * The chain of names from the outermost thing down to this one.
 *
 * Walked from `parent` rather than replayed from clicks, so arriving at the
 * stress dial from Home and arriving at it from inside yourself give the same
 * trail. Stops at twelve, which no real chain reaches, so a view that
 * accidentally parents itself fails loudly here instead of hanging.
 */
export function trailTo(sim: Simulation, subject: Subject): { subject: Subject; name: string }[] {
  const chain: { subject: Subject; name: string }[] = [];
  const seen = new Set<string>();
  let current: Subject | undefined = subject;
  for (let guard = 0; current && guard < 12; guard++) {
    const key = `${current.kind}:${current.id}`;
    if (seen.has(key)) throw new Error(`A look parents itself: ${key}`);
    seen.add(key);
    const found: Looked | { gone: string } | undefined = resolveLook(sim, current);
    if (!found || 'gone' in found) break;
    chain.unshift({ subject: current, name: found.name });
    current = found.parent;
  }
  return chain;
}

/** Only for tests: forget every declaration. */
export function resetLooks(): void {
  REGISTRY.clear();
}
