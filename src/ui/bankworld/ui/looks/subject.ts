/**
 * SLATE — the address of a thing you can look at.
 *
 * A subject is a kind and an id. The kind says what sort of thing it is and
 * picks the declaration that knows how to open it; the id is opaque to
 * everything except that declaration. `at('dial', 'stress')` is the stress
 * dial; `at('place', 'is-39-reykjavik')` is Reykjavík; `at('person', id)` is
 * somebody.
 *
 * Deliberately not a route. There is no URL in this build — `route` is React
 * state in the game provider and react-router is in package.json and imported
 * nowhere — so a subject addresses a thing in the world, not a location in an
 * application. If routing ever arrives, `?look=` can carry a subject key
 * without any of this changing.
 */

/** A thing you can look at. */
export interface Subject {
  readonly kind: string;
  readonly id: string;
}

/** The short way to write one. An id is optional for things there is only one of. */
export const at = (kind: string, id = ''): Subject => ({ kind, id });

/** One string, for keying React children and comparing two subjects. */
export const subjectKey = (s: Subject): string => (s.id ? `${s.kind}:${s.id}` : s.kind);

export const sameSubject = (a: Subject | null, b: Subject | null): boolean =>
  a !== null && b !== null && a.kind === b.kind && a.id === b.id;

/** Back from a key. Returns undefined rather than a half-made subject. */
export function parseSubject(key: string): Subject | undefined {
  if (!key) return undefined;
  const cut = key.indexOf(':');
  if (cut < 0) return { kind: key, id: '' };
  const kind = key.slice(0, cut);
  return kind ? { kind, id: key.slice(cut + 1) } : undefined;
}

/**
 * The typed pointer five record types carry, resolved into a subject.
 *
 * `refType` and `refId` are declared on five record shapes — a decision, a
 * notification, a ledger transaction, a scheduled item and a calendar entry.
 * The engine writes four on decisions: `'account'`, which has a look;
 * `'unclaimed-notice'`, whose id is the account’s, so it opens the account
 * (from 2026-10-10; until then it opened nothing); and `'return'` and
 * `'us-status'`, which have no look, their decision routing to Papers
 * instead. An older save carries the film side’s `'project'`, `'audition'`
 * and `'property'`, none of which has a look in this build. This said until
 * 2026-10-10 that nothing in the engine wrote one.
 *
 * This returns the subject regardless rather than guessing, and every caller
 * guards on `lookExists` before painting a way, so a kind with no look paints
 * nothing rather than a dead link.
 */
export function subjectForRef(ref: { refType?: string; refId?: string }): Subject | undefined {
  if (!ref.refType || !ref.refId) return undefined;
  if (ref.refType === 'unclaimed-notice') return at('account', ref.refId);
  return at(ref.refType, ref.refId);
}
