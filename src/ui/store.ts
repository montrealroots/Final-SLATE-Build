import { useSyncExternalStore } from 'react';
import {
  ActiveClock, advanceTargetInstant, browserStore, canTakeLock, clearDraft, deleteSave, emptyDraft, listSaves, newGame, processUntil, readDraft,
  readLock, openSave, releaseLock, repairSave, serialize, MissingPlacesError, renameSave, startSleep, takeLock, wakeEarly, writeDraft, writeSave, type AdvanceTarget, type KeyValueStore,
  type SaveSummary,
} from '../engine';
import { deleteRecoveryCopy, listRecoveryCopies, storageUse, type RecoveryCopy, type StorageUse } from '../engine/save';
import type { CreationDraft, GameState, Route } from '../engine/types';
import type { Place } from '../data/places';
import { loadWorldHolidays, worldHolidaysLoaded } from '../world/holidays/holidays';

/** Offers text as a downloaded file named after the save. */
function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^\p{L}\p{N} _()-]+/gu, '').trim() || 'SLATE save'}.slate-save.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A real-world time in the player's words, for messages about saves. */
function realTime(ms: number): string {
  return new Date(ms).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });
}

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
  /** The last save failed because browser storage is full (the player can free space in Saved Games). */
  saveStorageFull = false;
  readOnly = false;
  busy: string | null = null;
  notice: Notice | null = null;
  route: Route = { view: 'home' };
  history: Route[] = [];
  screen: 'startup' | 'creation' | 'loading' | 'load-error' | 'repair' | 'game' = 'startup';
  /** A save that needs places chosen before it can open. */
  repair: { saveId: string; ids: string[]; uses: Record<string, string[]> } | null = null;
  loadErrorSave: string | null = null;
  /** Why the last save couldn't be opened, in the player's words. */
  loadErrorMessage = '';
  /** Set when processing time failed. The game was rolled back and time stays paused until the player tries again. */
  processingProblem: string | null = null;
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
    // Holiday rules for the whole world are fetched once, in the background, from the start.
    this.holidays = loadWorldHolidays().catch(() => undefined);
  }
  private holidays: Promise<void>;

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
        const { state, recovery } = openSave(this.kv, saveId);
        // The notice travels with the entry: entering can wait for holiday rules, and entering clears old notices.
        this.enter(state, recovery ? {
          title: 'Opened The Last Good Copy',
          text: `${recovery.damagedKey ? `Your latest save couldn't be used (${recovery.problem.replace(/\.$/, '')})` : "Your latest save couldn't be found"}, so ${recovery.source === 'backup' ? 'the previous save' : recovery.source === 'migration-backup' ? 'the copy kept before this save was updated' : 'a complete copy from an interrupted save'}, from ${realTime(state.updatedAtReal)}, was opened.${recovery.damagedKey ? ' The damaged save is kept, not deleted.' : ''}`,
          kind: 'info',
        } : null);
      } catch (e) {
        if (e instanceof MissingPlacesError) {
          this.repair = { saveId, ids: e.ids, uses: e.uses };
          this.screen = 'repair';
        } else {
          this.screen = 'load-error';
          this.loadErrorSave = saveId;
          this.loadErrorMessage = e instanceof Error ? e.message : String(e);
        }
        this.emit();
      }
    }, 0);
  }

  /** Open a save after replacing the places it couldn't resolve. The untouched save is kept as a backup first. */
  repairAndOpen(replacements: Record<string, Place>): string | null {
    if (!this.repair) return 'There is nothing to repair.';
    try {
      const state = repairSave(this.kv, this.repair.saveId, replacements, Date.now());
      this.repair = null;
      this.enter(state);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }

  private enter(state: GameState, notice: Notice | null = null) {
    // Production checks holidays as time passes, so wait for the rules (or their failure, which the Place view explains).
    if (!worldHolidaysLoaded()) {
      this.screen = 'loading';
      this.emit();
      void this.holidays.then(() => this.enterNow(state, notice));
      return;
    }
    this.enterNow(state, notice);
  }

  private enterNow(state: GameState, notice: Notice | null = null) {
    this.state = state;
    this.screen = 'game';
    this.route = { view: 'home' };
    this.history = [];
    this.notice = notice;
    // A paused clock belongs to the game that failed, never to the one being opened.
    this.processingProblem = null;
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
      this.state = openSave(this.kv, this.state.saveId).state;
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

  /** Save and leave this game, then open another. Stays in this game if it couldn't be saved. */
  async switchTo(saveId: string): Promise<boolean> {
    if (!(await this.saveAndExit())) return false;
    this.open(saveId);
    return true;
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
  recoveryCopies(): RecoveryCopy[] {
    return listRecoveryCopies(this.kv);
  }
  storageUse(): StorageUse {
    return storageUse(this.kv);
  }
  deleteRecoveryCopy(key: string) {
    deleteRecoveryCopy(this.kv, key);
    this.emit();
  }
  /** Download one recovery copy exactly as stored, so it can be kept before it is deleted. */
  exportRecoveryCopy(copy: RecoveryCopy): string | null {
    const text = this.kv.getItem(copy.key);
    if (text === null) return 'That copy could not be found.';
    const name = this.saves().find((x) => x.saveId === copy.saveId)?.saveName ?? 'SLATE save';
    download(text, `${name} (${copy.kind} copy)`);
    return null;
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
    if (!this.state || this.readOnly || this.processingProblem) return;
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
    let res: ReturnType<typeof processUntil>;
    try {
      res = processUntil(s, target, 'tick', 200);
    } catch (e) {
      this.halt(e);
      return;
    }
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
    this.saveStorageFull = !res.ok && !!res.storageFull;
    this.emit();
    return res.ok;
  }

  /** Download a save as a file: the game being played (from memory, so it works when storage is full) or a stored one. */
  exportSave(saveId?: string): string | null {
    const text = saveId && saveId !== this.state?.saveId ? this.kv.getItem(`slate.v1.save.${saveId}`) : this.state ? serialize(this.state) : null;
    if (!text) return 'That save could not be found.';
    const name = (saveId ? this.saves().find((x) => x.saveId === saveId)?.saveName : this.state?.saveName) ?? 'SLATE save';
    download(text, name);
    return null;
  }

  // ---------- Advance & Sleep: same event rules, bounded and truthful progress ----------
  async advance(target: AdvanceTarget | { at: number }, mode: 'advance' | 'sleep' = 'advance'): Promise<void> {
    const s = this.state;
    if (!s || this.readOnly || this.busy) return;
    const to = mode === 'sleep' ? s.sleep.wakeAt ?? s.now : advanceTargetInstant(s, target as AdvanceTarget);
    if (this.processingProblem) return;
    this.suspendClock();
    this.busy = mode === 'sleep' ? 'Sleeping' : 'Advancing';
    this.emit();
    let result: ReturnType<typeof processUntil>;
    try {
      result = processUntil(s, to, mode, 400);
      while (!result.done && !result.interruptedBy) {
        this.emitClock();
        await new Promise((r) => setTimeout(r, 0));
        if (this.state !== s) return; // the game was closed meanwhile
        result = processUntil(s, to, mode, 400);
      }
    } catch (e) {
      this.halt(e);
      return;
    } finally {
      this.busy = null;
      this.emit();
    }
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

  /** Processing failed: keep the rolled-back state, save it, pause time and explain. Never resume on its own. */
  private halt(e: unknown) {
    this.suspendClock();
    this.processingProblem = e instanceof Error ? e.message : String(e);
    this.notice = { title: 'Time Is Paused', text: this.processingProblem, kind: 'info' };
    this.saveNow();
    this.emit();
  }

  /** Try running time again after a processing failure. */
  retryTime() {
    this.processingProblem = null;
    this.notice = null;
    this.resume();
    this.emit();
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
