/**
 * SLATE — depth, assembled.
 *
 * Importing this registers every kind the game knows how to open. A screen
 * imports `Open`, `LookRegion` and `at` from here and nothing else; it never
 * imports a declaration, because a screen never writes what is inside a thing.
 *
 * The registrations live in ./all, one line per kind, so the whole graph can
 * be loaded by a test without loading React alongside it.
 */

import './all';

export { LookRegion, Open } from './Look';
export { at, subjectKey, parseSubject, subjectForRef, sameSubject, type Subject } from './subject';
export {
  defineLook, lookKinds, lookExists, resolveLook, trailTo, hasKind, seedsFor,
  type Looked, type LookView, type Way, type Facet,
} from './registry';
