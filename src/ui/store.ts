import { useSyncExternalStore } from 'react';
import {
  ActiveClock, advanceTargetInstant, browserStore, canTakeLock, clearDraft, deleteSave, emptyDraft, newGame, processUntil, readDraft,
  readLock, openSave, releaseLock, repairSave, serialize, MissingPlacesError, renameSave, startSleep, takeLock, wakeEarly, writeDraft, writeSave, type AdvanceTarget, type KeyValueStore,
  type SaveSummary,
} from '../engine';
export type StorageReport = StorageUse & { backend?: string; quotaKnown?: boolean };
import { BROWSER_STORAGE_CHARS, deleteRecoveryCopy, existingSave, importSave, isQuotaError, readImport, LOCK_STALE_MS, type ImportMode, type RecoveryCopy, type SaveResult, type StorageUse } from '../engine/save';
import { journalKey, type Vault } from '../engine/vault';
import { openVault } from './idb';
import type { CreationDraft, GameState, Route } from '../engine/types';
import type { Place } from '../data/places';
import { loadWorldHolidays, worldHolidaysLoaded } from '../world/holidays/holidays';
import { genreCatalogLoaded, loadGenreCatalog } from '../engine/genres';

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
  /** Set by go(): the shell moves focus to the new screen in the commit that shows it (Shell.tsx). */
  focusMain = false;
  private listeners = new Set<() => void>();
  private clockListeners = new Set<() => void>();
  private clock = new ActiveClock(() => performance.now());
  private timer: ReturnType<typeof setInterval> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private lastPeriodicSave = 0;

  /** Where saves live (IndexedDB, or localStorage where that can't open); null until opened. */
  vault: Vault | null = null;
  /** Saves have been looked up; until then the start screen says so instead of offering New Game as if there were none. */
  storageReady = false;
  /** Shown on the start screen when saves couldn't be moved or opened. */
  storageNote = '';
  private saveList: SaveSummary[] = [];
  private copies: RecoveryCopy[] = [];
  private use: StorageReport | null = null;
  private ready: Promise<void>;
  private saving: Promise<boolean> | null = null;
  private lastWriteMs = 0;
  /** Counts changes to the game, so a save asked for while one is running is repeated only if something changed. */
  private changes = 0;
  private saveAgain = false;

  constructor() {
    this.kv = browserStore();
    this.draft = readDraft(this.kv);
    this.ready = openVault(this.kv).then(async ({ vault, kept }) => {
      this.vault = vault;
      if (kept) this.storageNote = "Some saved games couldn't be moved to this browser's larger storage yet. They are still kept and will be moved next time.";
      await this.refresh();
    }).catch(() => {
      this.storageNote = "Saved games couldn't be opened in this browser. Reload to try again.";
    }).finally(() => {
      this.storageReady = true;
      this.emit();
    });
    document.addEventListener('visibilitychange', () => this.onVisibility());
    window.addEventListener('pagehide', () => this.suspend());
    window.addEventListener('storage', (e) => this.onStorage(e));
    // Holiday rules for the whole world are fetched once, in the background, from the start.
    this.holidays = loadWorldHolidays().catch(() => undefined);
    // So is the genre catalog, which every game needs (a failure is retried when a game opens).
    void loadGenreCatalog().catch(() => undefined);
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
    return this.saveList;
  }

  private async v(): Promise<Vault> {
    await this.ready;
    if (!this.vault) throw new Error("Saved games aren't available in this browser.");
    return this.vault;
  }

  /** Re-read the list of saves, recovery copies and storage use after anything that changed them. */
  async refresh() {
    if (!this.vault) return;
    this.saveList = await this.vault.saves();
    this.copies = this.vault.recoveryCopies();
    this.use = await this.vault.storageUse();
    this.emit();
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
  async begin(): Promise<string | null> {
    if (!this.draft) return 'Your choices could not be found.';
    const saveId = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    let state: GameState;
    try {
      state = newGame(this.draft, Date.now(), saveId);
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
    const res = await this.write(state);
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
    void (async () => {
      try {
        const v = await this.v();
        const r = await v.forSave(saveId, (kv) => openSave(kv, saveId));
        if (r.error) throw r.error;
        // A backup or damaged copy made while opening must be stored before the game can change the save.
        if (r.commitError) throw new Error("This save needs a backup before it opens, and there isn't room in browser storage. Free some space and try again.");
        void this.refresh();
        const { state, recovery } = r.value!;
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
    })();
  }

  /** Open a save after replacing the places it couldn't resolve. The untouched save is kept as a backup first. */
  async repairAndOpen(replacements: Record<string, Place>): Promise<string | null> {
    if (!this.repair) return 'There is nothing to repair.';
    const id = this.repair.saveId;
    const r = await (await this.v()).forSave(id, (kv) => repairSave(kv, id, replacements, Date.now()));
    if (r.error) return r.error instanceof Error ? r.error.message : String(r.error);
    if (r.commitError) return "The repaired save couldn't be stored. Free some browser storage and try again.";
    this.repair = null;
    this.enter(r.value!);
    void this.refresh();
    return null;
  }

  private enter(state: GameState, notice: Notice | null = null) {
    // Production checks holidays as time passes, so wait for the rules (or their failure, which the Place view explains),
    // and for the genre catalog, without which no project can be read: that failure stops here, with Try Again.
    if (!worldHolidaysLoaded() || !genreCatalogLoaded()) {
      this.screen = 'loading';
      this.emit();
      void Promise.all([this.holidays, loadGenreCatalog()]).then(() => this.enterNow(state, notice), () => {
        this.screen = 'load-error';
        this.loadErrorSave = state.saveId;
        this.loadErrorMessage = "The game's genre catalog couldn't be loaded. Check your connection and try again.";
        this.emit();
      });
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

  async takeOver() {
    if (!this.state) return;
    // Pick up the latest saved world from the other tab before running it here.
    const id = this.state.saveId;
    const r = await (await this.v()).forSave(id, (kv) => openSave(kv, id).state);
    if (r.value && !r.error && this.state?.saveId === id) this.state = r.value;
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
    const ok = await this.saveNow();
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

  async deleteSave(saveId: string) {
    await (await this.v()).forSave(saveId, (kv) => deleteSave(kv, saveId));
    await this.refresh();
  }
  recoveryCopies(): RecoveryCopy[] {
    return this.copies;
  }
  storageUse(): StorageReport {
    return this.use ?? { usedChars: 0, limitChars: BROWSER_STORAGE_CHARS, bySave: {} };
  }
  async deleteRecoveryCopy(key: string) {
    await (await this.v()).work((k) => k === key, (kv) => deleteRecoveryCopy(kv, key));
    await this.refresh();
  }
  /** Download one recovery copy exactly as stored, so it can be kept before it is deleted. */
  async exportRecoveryCopy(copy: RecoveryCopy): Promise<string | null> {
    const text = await (await this.v()).readText(copy.key);
    if (text === null) return 'That copy could not be found.';
    const name = this.saves().find((x) => x.saveId === copy.saveId)?.saveName ?? 'SLATE save';
    download(text, `${name} (${copy.kind} copy)`);
    return null;
  }
  async renameSave(saveId: string, name: string): Promise<string | null> {
    const r = await (await this.v()).forSave(saveId, (kv) => renameSave(kv, saveId, name));
    if (r.error) return "That save couldn't be opened to rename it.";
    await this.refresh();
    if (r.commitError) return "The new name couldn't be saved.";
    return r.value!.ok ? null : r.value!.error === 'Enter a name.' ? r.value!.error : "The new name couldn't be saved.";
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
    this.writeJournal();
    void this.saveNow();
  }

  /** The page may close before IndexedDB finishes: keep the game synchronously in localStorage until it does (vault.ts). */
  private writeJournal() {
    if (!this.state || this.readOnly) return;
    try {
      this.state.updatedAtReal = Date.now();
      this.kv.setItem(journalKey(this.state.saveId), serialize(this.state));
    } catch {
      /* too large or full: the last stored save (at most about 30 seconds old) is what opens next time */
    }
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
      void this.saveNow();
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
    this.changes += 1;
    this.emit();
    if (this.saveTimer) clearTimeout(this.saveTimer);
    // A long career's save takes longer to write (docs/STORAGE.md): wait longer before saving again after a change, so
    // a burst of actions isn't followed by a write each. The 30-second save and the closing-page journal still apply.
    this.saveTimer = setTimeout(() => void this.saveNow(), Math.min(10_000, Math.max(1200, this.lastWriteMs * 10)));
  }

  /** Write a game through the vault. "Saved" only when the vault has committed the save, its backup and the index. */
  private async write(state: GameState): Promise<SaveResult> {
    let v: Vault;
    try {
      v = await this.v();
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    const r = await v.forWrite(state.saveId, (kv) => writeSave(kv, state, Date.now()));
    if (r.commitError) {
      return isQuotaError(r.commitError) ? { ok: false, storageFull: true, error: 'The browser storage for SLATE is full.' } : { ok: false, error: r.commitError instanceof Error ? r.commitError.message : String(r.commitError) };
    }
    if (r.error) return { ok: false, error: r.error instanceof Error ? r.error.message : String(r.error) };
    return r.value!;
  }

  /**
   * Save the game being played. Saves never overlap: a request while one is being written runs once more afterwards,
   * with the game as it is then, and every caller's promise settles after the last of them.
   */
  saveNow(): Promise<boolean> {
    if (!this.state || this.readOnly) return Promise.resolve(false);
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.saving) {
      this.saveAgain = true;
      return this.saving;
    }
    this.saving = (async () => {
      let ok = false;
      let written = { changes: -1, now: -1 };
      do {
        this.saveAgain = false;
        const state = this.state;
        if (!state || this.readOnly) break;
        if (ok && written.changes === this.changes && written.now === state.now) break; // nothing new since the last write
        written = { changes: this.changes, now: state.now };
        this.saveStatus = 'saving';
        this.emit();
        const t0 = performance.now();
        const res = await this.write(state);
        this.lastWriteMs = performance.now() - t0;
        ok = res.ok;
        if (ok) this.kv.removeItem(journalKey(state.saveId));
        this.saveStatus = res.ok ? 'saved' : 'error';
        this.saveError = res.ok ? '' : res.error;
        this.saveStorageFull = !res.ok && !!res.storageFull;
        this.emit();
      } while (this.saveAgain);
      this.saving = null;
      void this.refresh();
      return ok;
    })();
    return this.saving;
  }

  /**
   * Import a save file. Without a mode it only stores a save whose ID is new; if the ID is taken it returns the save
   * that has it, so the player chooses a separate copy or a confirmed replacement. The file is never changed, and
   * nothing already stored changes unless the whole import commits.
   */
  async importSaveFile(text: string, mode: ImportMode = 'new'): Promise<
    { ok: true; saveId: string; name: string } | { ok: false; error: string } | { ok: false; conflict: SaveSummary }
  > {
    let state: GameState;
    try {
      state = readImport(text);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    const id = state.saveId;
    if (mode === 'replace') {
      if (this.state?.saveId === id) return { ok: false, error: 'That save is the game you are playing. Save And Exit first, then import it.' };
      const lock = readLock(this.kv, id);
      if (lock && Date.now() - lock.beat <= LOCK_STALE_MS) return { ok: false, error: 'That save is open in another tab. Close it there, then import it.' };
    }
    let v: Vault;
    try {
      v = await this.v();
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    if (mode === 'new') {
      const taken = await v.forImport(id, (kv) => existingSave(kv, id) ?? (kv.keys().includes(`slate.v1.save.${id}`) ? { saveId: id } as SaveSummary : null));
      if (taken.value) return { ok: false, conflict: taken.value };
    }
    const r = await v.forImport(id, (kv) => importSave(kv, state, mode, Date.now()));
    await this.refresh();
    if (r.commitError) {
      return { ok: false, error: isQuotaError(r.commitError) ? "There isn't room in this browser's storage to import it. Nothing was changed. Free up space and try again." : `It couldn't be stored, so nothing was changed. (${r.commitError instanceof Error ? r.commitError.message : String(r.commitError)})` };
    }
    if (r.error) {
      const msg = r.error instanceof Error ? r.error.message : String(r.error);
      return { ok: false, error: /newer version/.test(msg) ? 'The save here was made by a newer version of SLATE, so it was not replaced.' : msg };
    }
    const { saveId, result } = r.value!;
    if (!result.ok) return { ok: false, error: result.storageFull ? "There isn't room in this browser's storage to import it. Nothing was changed. Free up space and try again." : result.error };
    return { ok: true, saveId, name: mode === 'copy' ? `${state.saveName} (Imported Copy)`.slice(0, 80) : state.saveName };
  }

  /** Download a save as a file: the game being played (from memory, so it works when storage is full) or a stored one. */
  async exportSave(saveId?: string): Promise<string | null> {
    const text = saveId && saveId !== this.state?.saveId ? await (await this.v()).readText(`slate.v1.save.${saveId}`) : this.state ? serialize(this.state) : null;
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
    void this.saveNow();
    this.resume();
  }

  /** Processing failed: keep the rolled-back state, save it, pause time and explain. Never resume on its own. */
  private halt(e: unknown) {
    this.suspendClock();
    this.processingProblem = e instanceof Error ? e.message : String(e);
    this.notice = { title: 'Time Is Paused', text: this.processingProblem, kind: 'info' };
    void this.saveNow();
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
    // Until November 7, 2026 focus moved here a frame later: on a busy device that frame came after the player had
    // started typing in the new screen's first field, and the rest of what they typed went nowhere.
    this.focusMain = true;
    this.emit();
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
