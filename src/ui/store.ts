import { useSyncExternalStore } from 'react';
import {
  ActiveClock, advanceTargetInstant, browserStore, canTakeLock, clearDraft, deleteSave, emptyDraft, listSaves, newGame, processUntil, readDraft,
  readLock, readSave, releaseLock, renameSave, startSleep, takeLock, wakeEarly, writeDraft, writeSave, type AdvanceTarget, type KeyValueStore,
  type SaveSummary,
} from '../engine';
import type { CreationDraft, GameState, Route } from '../engine/types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export interface Notice {
  title: string;
  text: string;
  route?: Route;
  kind: 'arrival' | 'interrupt' | 'wake' | 'info';
  snooze?: boolean;
}

const TAB_ID = Math.random().toString(36).slice(2);

class Store {
  kv: KeyValueStore;
  state: GameState | null = null;
  version = 0;
  clockVersion = 0;
  saveStatus: SaveStatus = 'idle';
  saveError = '';
  readOnly = false;
  busy: string | null = null;
  notice: Notice | null = null;
  route: Route = { view: 'home' };
  history: Route[] = [];
  screen: 'startup' | 'creation' | 'loading' | 'load-error' | 'game' = 'startup';
  loadErrorSave: string | null = null;
  draft: CreationDraft | null = null;
  private listeners = new Set<() => void>();
  private clockListeners = new Set<() => void>();
  private clock = new ActiveClock(() => performance.now());
  private timer: ReturnType<typeof setInterval> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private lastPeriodicSave = 0;

  constructor() {
    this.kv = browserStore();
    this.draft = readDraft(this.kv);
    document.addEventListener('visibilitychange', () => this.onVisibility());
    window.addEventListener('pagehide', () => this.suspend());
    window.addEventListener('storage', (e) => this.onStorage(e));
  }

  // ---------- subscriptions ----------
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  subscribeClock = (fn: () => void) => {
    this.clockListeners.add(fn);
    return () => this.clockListeners.delete(fn);
  };
  emit() {
    this.version += 1;
    this.listeners.forEach((l) => l());
  }
  private emitClock() {
    this.clockVersion += 1;
    this.clockListeners.forEach((l) => l());
  }

  // ---------- saves list ----------
  saves(): SaveSummary[] {
    return listSaves(this.kv);
  }

  // ---------- creation draft ----------
  startCreation(fresh: boolean) {
    if (fresh || !this.draft) {
      this.draft = { ...emptyDraft(), updatedAt: Date.now() };
      writeDraft(this.kv, this.draft);
    }
    this.screen = 'creation';
    this.emit();
  }
  updateDraft(patch: Partial<CreationDraft>) {
    if (!this.draft) return;
    this.draft = { ...this.draft, ...patch, updatedAt: Date.now() };
    writeDraft(this.kv, this.draft);
    this.emit();
  }
  discardDraft() {
    clearDraft(this.kv);
    this.draft = null;
    this.emit();
  }
  begin(): string | null {
    if (!this.draft) return 'Your choices could not be found.';
    const saveId = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    let state: GameState;
    try {
      state = newGame(this.draft, Date.now(), saveId);
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
    const res = writeSave(this.kv, state, Date.now());
    if (!res.ok) return "Your game couldn't be saved, so it hasn't started. Free some browser storage and try again.";
    clearDraft(this.kv);
    this.draft = null;
    this.enter(state);
    this.saveStatus = 'saved';
    return null;
  }

  // ---------- open / exit ----------
  open(saveId: string) {
    this.screen = 'loading';
    this.emit();
    setTimeout(() => {
      try {
        const state = readSave(this.kv, saveId);
        this.enter(state);
      } catch {
        this.screen = 'load-error';
        this.loadErrorSave = saveId;
        this.emit();
      }
    }, 0);
  }

  private enter(state: GameState) {
    this.state = state;
    this.screen = 'game';
    this.route = { view: 'home' };
    this.history = [];
    this.notice = null;
    this.readOnly = !canTakeLock(this.kv, state.saveId, TAB_ID, Date.now());
    if (!this.readOnly) this.holdLock();
    document.documentElement.dataset.theme = state.settings.theme;
    this.resume();
    this.emit();
  }

  takeOver() {
    if (!this.state) return;
    // Pick up the latest saved world from the other tab before running it here.
    try {
      this.state = readSave(this.kv, this.state.saveId);
    } catch {
      /* keep what we have */
    }
    this.readOnly = false;
    this.holdLock();
    this.resume();
    this.emit();
  }

  private holdLock() {
    if (!this.state) return;
    takeLock(this.kv, this.state.saveId, TAB_ID, Date.now());
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = setInterval(() => {
      if (!this.state || this.readOnly) return;
      const lock = readLock(this.kv, this.state.saveId);
      if (lock && lock.tabId !== TAB_ID) {
        this.loseLock();
        return;
      }
      takeLock(this.kv, this.state.saveId, TAB_ID, Date.now());
    }, 2000);
  }

  private loseLock() {
    this.readOnly = true;
    this.suspendClock();
    this.emit();
  }

  private onStorage(e: StorageEvent) {
    if (!this.state || !e.key || !e.key.endsWith(`lock.${this.state.saveId}`) || this.readOnly) return;
    const lock = readLock(this.kv, this.state.saveId);
    if (lock && lock.tabId !== TAB_ID) this.loseLock();
  }

  async saveAndExit(): Promise<boolean> {
    if (!this.state) return true;
    this.suspendClock();
    const ok = this.saveNow();
    if (!ok) {
      this.resume();
      return false;
    }
    releaseLock(this.kv, this.state.saveId, TAB_ID);
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.state = null;
    this.screen = 'startup';
    this.emit();
    return true;
  }

  backToStartup() {
    this.screen = 'startup';
    this.loadErrorSave = null;
    this.emit();
  }

  deleteSave(saveId: string) {
    deleteSave(this.kv, saveId);
    this.emit();
  }
  renameSave(saveId: string, name: string): string | null {
    try {
      const r = renameSave(this.kv, saveId, name);
      this.emit();
      return r.ok ? null : r.error === 'Enter a name.' ? r.error : "The new name couldn't be saved.";
    } catch {
      return "That save couldn't be opened to rename it.";
    }
  }

  // ---------- clock ----------
  private resume() {
    if (!this.state || this.readOnly) return;
    if (document.visibilityState !== 'visible') return;
    this.clock.start(this.state.now);
    if (!this.timer) this.timer = setInterval(() => this.tick(), 250);
  }
  private suspendClock() {
    this.clock.suspend();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  private suspend() {
    if (!this.state || this.readOnly) return;
    this.suspendClock();
    this.saveNow();
  }
  private onVisibility() {
    if (document.visibilityState === 'hidden') this.suspend();
    else this.resume();
  }

  private tick() {
    const s = this.state;
    if (!s || this.busy || this.readOnly) return;
    const target = this.clock.target();
    if (target === null) return;
    const before = s.log.length > 0 ? s.log[0].id : '';
    const res = processUntil(s, target, 'tick', 200);
    if (!res.done) this.clock.start(s.now); // re-anchor if processing was bounded
    this.emitClock();
    if (res.processed > 0 || (s.log[0]?.id ?? '') !== before) this.changed();
    if (Date.now() - this.lastPeriodicSave > 30000) {
      this.lastPeriodicSave = Date.now();
      this.saveNow();
    }
  }

  // ---------- mutations ----------
  /** Run an engine action. Returns an error message for the caller to show beside the control. */
  act(fn: (s: GameState) => void): string | null {
    if (!this.state) return 'No game is open.';
    if (this.readOnly) return 'This game is open in another tab. Take over here to make changes.';
    try {
      fn(this.state);
    } catch (e) {
      this.emit();
      return e instanceof Error ? e.message : String(e);
    }
    this.changed();
    return null;
  }

  private changed() {
    this.emit();
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 1200);
  }

  saveNow(): boolean {
    if (!this.state || this.readOnly) return false;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveStatus = 'saving';
    this.emit();
    const res = writeSave(this.kv, this.state, Date.now());
    this.saveStatus = res.ok ? 'saved' : 'error';
    this.saveError = res.ok ? '' : res.error;
    this.emit();
    return res.ok;
  }

  // ---------- Advance & Sleep: same event rules, bounded and truthful progress ----------
  async advance(target: AdvanceTarget | { at: number }, mode: 'advance' | 'sleep' = 'advance'): Promise<void> {
    const s = this.state;
    if (!s || this.readOnly || this.busy) return;
    const to = mode === 'sleep' ? s.sleep.wakeAt ?? s.now : advanceTargetInstant(s, target as AdvanceTarget);
    this.suspendClock();
    this.busy = mode === 'sleep' ? 'Sleeping' : 'Advancing';
    this.emit();
    let result = processUntil(s, to, mode, 400);
    while (!result.done && !result.interruptedBy) {
      this.emitClock();
      await new Promise((r) => setTimeout(r, 0));
      result = processUntil(s, to, mode, 400);
    }
    this.busy = null;
    if (result.interruptedBy) {
      const ev = result.interruptedBy.event;
      if (mode === 'sleep' && ev.kind !== 'wake') wakeEarly(s);
      this.notice = {
        title: ev.kind === 'wake' ? 'Good Morning' : mode === 'sleep' ? 'You Woke Up' : 'Advance Stopped',
        text: result.interruptedBy.message || 'Something needs your attention.',
        kind: ev.kind === 'wake' ? 'wake' : 'interrupt',
        snooze: ev.kind === 'wake' && s.sleep.alarm,
      };
    } else if (mode === 'advance') {
      this.notice = null;
    }
    this.changed();
    this.saveNow();
    this.resume();
  }

  sleep(wakeAt: number, alarm: boolean): string | null {
    const err = this.act((s) => startSleep(s, wakeAt, alarm));
    if (err) return err;
    void this.advance({ at: wakeAt }, 'sleep');
    return null;
  }

  dismissNotice() {
    this.notice = null;
    this.emit();
  }

  // ---------- navigation ----------
  go(route: Route) {
    this.history.push(this.route);
    if (this.history.length > 50) this.history.shift();
    this.route = route;
    this.emit();
    requestAnimationFrame(() => document.getElementById('main')?.focus({ preventScroll: false }));
  }
  back() {
    const r = this.history.pop();
    if (r) {
      this.route = r;
      this.emit();
    }
  }

  setTheme(theme: 'dark' | 'light') {
    document.documentElement.dataset.theme = theme;
    if (this.state) this.act((s) => (s.settings.theme = theme));
    try {
      localStorage.setItem('slate.v1.theme', theme);
    } catch {
      /* per-viewer convenience only */
    }
    this.emit();
  }
}

export const store = new Store();

try {
  const t = localStorage.getItem('slate.v1.theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch {
  /* ignore */
}

export function useStore(): Store {
  useSyncExternalStore(store.subscribe, () => store.version);
  return store;
}

export function useClock(): number {
  useSyncExternalStore(store.subscribeClock, () => store.clockVersion);
  return store.state?.now ?? 0;
}

export function useGame(): GameState {
  useSyncExternalStore(store.subscribe, () => store.version);
  if (!store.state) throw new Error('No game open');
  return store.state;
}

export { TAB_ID };
