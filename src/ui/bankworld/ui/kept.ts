/**
 * SLATE — what a screen keeps while the player is elsewhere: its tab, its
 * filters, its page, what was typed, and how far down it was scrolled
 * (from 2026-10-08). Kept for the session in memory, by a key a screen names,
 * so going to a person and coming back finds the list where it was. Until
 * then every screen opened at its first tab, at the top, its filters cleared.
 * The rail can set a key too (`keep`): a section chosen there opens its
 * screen at that tab, and a screen already open turns to it.
 *
 * Not saved with the game: it's where the player was looking, not anything in
 * the world.
 */

import { useCallback, useEffect, useLayoutEffect, useSyncExternalStore } from 'react';

const KEPT = new Map<string, unknown>();
const LISTENERS = new Map<string, Set<() => void>>();

/** Set a kept value from outside the screen that keeps it, and tell that screen. */
export function keep(key: string, value: unknown): void {
  KEPT.set(key, value);
  for (const l of LISTENERS.get(key) ?? []) l();
}

/** A kept value, read without subscribing. */
export const kept = <T,>(key: string): T | undefined => KEPT.get(key) as T | undefined;

/** A screen's state, kept by key across leaving it and coming back. */
export function useKept<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const subscribe = useCallback((onChange: () => void) => {
    const set = LISTENERS.get(key) ?? new Set();
    set.add(onChange);
    LISTENERS.set(key, set);
    return () => { set.delete(onChange); };
  }, [key]);
  const value = useSyncExternalStore(subscribe, () => (KEPT.has(key) ? (KEPT.get(key) as T) : initial));
  const put = useCallback((next: T | ((prev: T) => T)) => {
    const prev = (KEPT.has(key) ? KEPT.get(key) : initial) as T;
    keep(key, typeof next === 'function' ? (next as (p: T) => T)(prev) : next);
  }, [key, initial]);
  return [value, put];
}

/** The page's scroll kept by key: put back when the screen opens, remembered as it closes. */
export function useKeptScroll(key: string, enabled = true): void {
  useLayoutEffect(() => {
    if (!enabled) return;
    const main = document.getElementById('main');
    const at = KEPT.get(`scroll:${key}`);
    // A screen not looked at before opens at its top, not wherever the last one was scrolled to.
    if (main) main.scrollTop = typeof at === 'number' ? at : 0;
  }, [key, enabled]);
  useEffect(() => {
    const main = document.getElementById('main');
    if (!main || !enabled) return undefined;
    const save = () => { KEPT.set(`scroll:${key}`, main.scrollTop); };
    main.addEventListener('scroll', save, { passive: true });
    return () => { save(); main.removeEventListener('scroll', save); };
  }, [key, enabled]);
}
