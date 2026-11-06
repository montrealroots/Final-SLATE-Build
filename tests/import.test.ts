import { describe, expect, it } from 'vitest';
import { hashString } from '../src/engine/rng';
import {
  IMPORT_LIMIT_CHARS, ImportConflictError, SaveFormatError, SaveTooNewError, deserialize, importSave, listSaves, memoryStore, openSave, readImport,
  serialize, writeSave,
} from '../src/engine/save';
import { LocalBackend, MemoryBackend, Vault } from '../src/engine/vault';
import { SAVE_VERSION, type GameState } from '../src/engine/types';
import { processUntil, DAY } from '../src/engine';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';

function hireUp(s: GameState, p: GameState['projects'][number], days: number): void {
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < days; i++) {
    manage(s, p);
    processUntil(s, s.now + DAY, 'tick', 100000);
  }
}

/** A game with a project made, staffed and shot for a while: history, credits, money, places, events and editions. */
function playedGame(tag: string): GameState {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: 'The Long Platform', format: 'short', medium: 'live-action', runtime: 8 }, [{ name: 'Wren', patch: { roleSize: 'lead' } }], [{ place: 'Station', chars: ['Wren'], minutes: 3 }]);
  approve(s, p);
  hireUp(s, p, 10);
  startProduction(s, p, 5);
  runDays(s, p, 20);
  return s;
}

/** What a player would mind losing, compared as stored. */
function essentials(s: GameState) {
  return JSON.stringify({
    character: s.character, now: s.now, location: s.locationId, places: s.places, log: s.log, events: s.events, editions: s.editions,
    projects: s.projects.map((p) => ({ id: p.id, title: p.title, credits: p.credits, obligations: p.obligations, history: p.history, funding: p.funding, tasks: p.tasks.length })),
  });
}

describe('importing a save file', () => {
  it('an exported save imports into an empty browser, opens, plays on and saves, with everything that matters intact', () => {
    const s = playedGame('imp-roundtrip');
    const file = serialize(s);
    const fresh = memoryStore();
    const imported = readImport(file);
    const { saveId, result } = importSave(fresh, imported, 'new', 5_000);
    expect(result.ok).toBe(true);
    expect(saveId).toBe(s.saveId);
    const opened = openSave(fresh, saveId).state;
    expect(essentials(opened)).toBe(essentials(s));
    expect(listSaves(fresh).map((x) => x.saveName)).toEqual([s.saveName]);
    // Play on and save again: the imported save behaves like any other.
    runDays(opened, opened.projects[0], 5);
    expect(writeSave(fresh, opened, 6_000).ok).toBe(true);
    expect(openSave(fresh, saveId).state.now).toBe(opened.now);
  }, 60_000);

  it('older save versions are upgraded on import; the file text is left as it was', () => {
    const s = playedGame('imp-old');
    const raw = JSON.parse(JSON.stringify(s));
    raw.version = 3;
    const data = JSON.stringify(raw);
    const file = JSON.stringify({ format: 'slate-save', version: 3, checksum: hashString(data), data });
    const copy = file.slice();
    const imported = readImport(file);
    expect(imported.version).toBe(SAVE_VERSION);
    expect(file).toBe(copy);
    const store = memoryStore();
    expect(importSave(store, imported, 'new', 1).result.ok).toBe(true);
    expect(deserialize(store.getItem(`slate.v1.save.${s.saveId}`)!).version).toBe(SAVE_VERSION);
  }, 60_000);

  it('a save from a newer version is refused with a message, and nothing is stored', () => {
    const s = startLife('imp-new');
    const raw = { ...JSON.parse(JSON.stringify(s)), version: SAVE_VERSION + 1 };
    const data = JSON.stringify(raw);
    const file = JSON.stringify({ format: 'slate-save', version: SAVE_VERSION + 1, checksum: hashString(data), data });
    expect(() => readImport(file)).toThrow(SaveTooNewError);
    expect(() => readImport(file)).toThrow(/newer version of SLATE/);
  });

  it('malformed files are refused with a message a player understands', () => {
    const s = startLife('imp-bad');
    const good = serialize(s);
    const cases: [string, RegExp][] = [
      ['', /empty/],
      ['not json at all', /not readable/],
      [JSON.stringify({ hello: 'world' }), /not a SLATE save/],
      [good.replace('"checksum":', '"checksum":1'), /incomplete or damaged/],
      [good.slice(0, good.length / 2), /not readable/],
    ];
    for (const [text, why] of cases) {
      expect(() => readImport(text), text.slice(0, 30)).toThrow(SaveFormatError);
      expect(() => readImport(text)).toThrow(why);
    }
    // A file that validates as JSON but describes an impossible game is refused by validation.
    const raw = JSON.parse(JSON.parse(good).data);
    raw.projects = 'nope';
    const data = JSON.stringify(raw);
    expect(() => readImport(JSON.stringify({ format: 'slate-save', version: raw.version, checksum: hashString(data), data }))).toThrow(/damaged/);
    expect(() => readImport('x'.repeat(IMPORT_LIMIT_CHARS + 1))).toThrow(/too large/);
  });

  it('a save whose ID is taken is never replaced silently: a separate copy, or a replacement that keeps the old one as backup', () => {
    const s = startLife('imp-dup');
    const store = memoryStore();
    expect(writeSave(store, s, 1).ok).toBe(true);
    const here = store.getItem(`slate.v1.save.${s.saveId}`);
    const later = JSON.parse(JSON.stringify(s)) as GameState;
    later.saveName = 'From The Other Computer';
    const imported = readImport(serialize(later));
    expect(() => importSave(store, imported, 'new', 2)).toThrow(ImportConflictError);
    expect(store.getItem(`slate.v1.save.${s.saveId}`)).toBe(here);
    // A separate copy: a new ID and name; the save here is untouched.
    const copy = importSave(store, imported, 'copy', 3);
    expect(copy.result.ok).toBe(true);
    expect(copy.saveId).not.toBe(s.saveId);
    expect(store.getItem(`slate.v1.save.${s.saveId}`)).toBe(here);
    expect(listSaves(store).map((x) => x.saveName).sort()).toEqual([s.saveName, 'From The Other Computer (Imported Copy)'].sort());
    // A second copy of the same file gets yet another ID.
    expect(importSave(store, imported, 'copy', 3).saveId).not.toBe(copy.saveId);
    // Replacement: the file's game becomes the save, and the one it replaced is its backup.
    expect(importSave(store, imported, 'replace', 4).result.ok).toBe(true);
    expect(openSave(store, s.saveId).state.saveName).toBe('From The Other Computer');
    expect(store.getItem(`slate.v1.save.${s.saveId}.bak`)).toBe(here);
  });

  it('a save here from a newer version is never replaced by an import', () => {
    const s = startLife('imp-newer-here');
    const store = memoryStore();
    const raw = { ...JSON.parse(JSON.stringify(s)), version: SAVE_VERSION + 1 };
    const data = JSON.stringify(raw);
    const newer = JSON.stringify({ format: 'slate-save', version: SAVE_VERSION + 1, checksum: hashString(data), data });
    store.setItem(`slate.v1.save.${s.saveId}`, newer);
    const r = importSave(store, readImport(serialize(s)), 'replace', 5).result;
    expect(r.ok).toBe(false);
    expect(store.getItem(`slate.v1.save.${s.saveId}`)).toBe(newer);
  });

  it('through the vault: a failed or full commit stores nothing, and the localStorage fallback imports the same way', async () => {
    const s = startLife('imp-vault');
    const file = serialize(s);
    const backend = new MemoryBackend();
    const vault = await Vault.open(backend);
    backend.failNext = Object.assign(new Error('full'), { name: 'QuotaExceededError' });
    const failed = await vault.forImport(s.saveId, (kv) => importSave(kv, readImport(file), 'new', 1));
    expect(failed.commitError).toBeTruthy();
    expect(backend.data.size).toBe(0);
    const tiny = new MemoryBackend(1000);
    const small = await Vault.open(tiny);
    expect((await small.forImport(s.saveId, (kv) => importSave(kv, readImport(file), 'new', 1))).commitError).toBeTruthy();
    expect(tiny.data.size).toBe(0);
    expect((await vault.forImport(s.saveId, (kv) => importSave(kv, readImport(file), 'new', 2))).value?.result.ok).toBe(true);
    expect(deserialize(backend.data.get(`slate.v1.save.${s.saveId}`)!).saveName).toBe(s.saveName);
    // localStorage fallback (no IndexedDB): the same import through the same vault code.
    const local = memoryStore();
    const lv = await Vault.open(new LocalBackend(local));
    expect((await lv.forImport(s.saveId, (kv) => importSave(kv, readImport(file), 'new', 3))).value?.result.ok).toBe(true);
    expect(openSave(local, s.saveId).state.saveName).toBe(s.saveName);
  });
});
