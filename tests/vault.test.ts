import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine';
import { memoryStore, openSave, recordMeta, serialize, writeSave, deserialize, listRecoveryCopies } from '../src/engine/save';
import { LocalBackend, MemoryBackend, Vault, migrateFromLocal } from '../src/engine/vault';
import type { GameState } from '../src/engine/types';
import { draft } from './fixtures';

const game = (id = 'r1'): GameState => newGame(draft(), 1, id);
const KEY = 'slate.v1.save.r1';

async function vaultWith(backend = new MemoryBackend()) {
  return { backend, vault: await Vault.open(backend) };
}

describe('the save vault', () => {
  it('reads version and save time from a stored save without parsing it', () => {
    const s = game();
    s.updatedAtReal = 123456;
    expect(recordMeta(serialize(s))).toEqual({ version: s.version, savedAtReal: 123456 });
    expect(recordMeta('garbage')).toEqual({ version: null, savedAtReal: null });
  });

  it('commits a save, its backup and the index together, and reports nothing saved when the commit fails', async () => {
    const { backend, vault } = await vaultWith();
    const s = game();
    expect((await vault.forSave('r1', (kv) => writeSave(kv, s, 1))).value?.ok).toBe(true);
    s.saveName = 'Second';
    expect((await vault.forSave('r1', (kv) => writeSave(kv, s, 2))).commitError).toBeUndefined();
    expect(backend.commits).toBe(2);
    expect([...backend.data.keys()].sort()).toEqual(['slate.v1.index', KEY, `${KEY}.bak`]);
    const before = new Map(backend.data);
    s.saveName = 'Third';
    backend.failNext = Object.assign(new Error('full'), { name: 'QuotaExceededError' });
    const r = await vault.forSave('r1', (kv) => writeSave(kv, s, 3));
    expect(r.value?.ok).toBe(true); // the engine step worked in memory...
    expect(r.commitError).toBeTruthy(); // ...but nothing was stored
    expect(backend.data).toEqual(before);
    expect(deserialize(backend.data.get(KEY)!).saveName).toBe('Second');
  });

  it('refuses to read a record the operation did not load, so a missing load is caught, not silently empty', async () => {
    const { vault } = await vaultWith();
    await vault.forSave('r1', (kv) => writeSave(kv, game(), 1));
    await vault.forSave('r10', (kv) => writeSave(kv, game('r10'), 1));
    const r = await vault.forSave('r1', (kv) => kv.getItem('slate.v1.save.r10'));
    expect(String(r.error)).toMatch(/was not loaded/);
  });

  it('opens a damaged save from its backup and keeps the damaged copy in the vault', async () => {
    const { backend, vault } = await vaultWith();
    const s = game();
    await vault.forSave('r1', (kv) => writeSave(kv, s, 1));
    await vault.forSave('r1', (kv) => writeSave(kv, s, 2));
    await vault.forSave('r1', (kv) => kv.setItem(KEY, 'garbage'));
    const r = await vault.forSave('r1', (kv) => openSave(kv, 'r1', 5));
    expect(r.value?.recovery?.source).toBe('backup');
    expect(backend.data.get(r.value!.recovery!.damagedKey!)).toBe('garbage');
    expect(vault.recoveryCopies().map((c) => c.kind)).toEqual(['damaged']);
  });

  it('lists saves from the index and rebuilds the list when the index is missing or damaged', async () => {
    const { backend, vault } = await vaultWith();
    await vault.forSave('r1', (kv) => writeSave(kv, game(), 1));
    await vault.forSave('r2', (kv) => writeSave(kv, game('r2'), 2));
    expect((await vault.saves()).map((x) => x.saveId)).toEqual(['r2', 'r1']);
    backend.data.set('slate.v1.index', '{broken');
    const v2 = await Vault.open(backend);
    expect((await v2.saves()).map((x) => x.saveId).sort()).toEqual(['r1', 'r2']);
  });

  it('runs operations one at a time, in the order they were asked for', async () => {
    const { backend, vault } = await vaultWith();
    const s = game();
    const names = ['A', 'B', 'C'];
    await Promise.all(names.map((n, i) => vault.forSave('r1', (kv) => { s.saveName = n; return writeSave(kv, s, i + 1); })));
    expect(deserialize(backend.data.get(KEY)!).saveName).toBe('C');
  });
});

describe('moving saves out of localStorage', () => {
  function localWithTwoSaves() {
    const local = memoryStore();
    const a = game();
    writeSave(local, a, 1);
    a.saveName = 'Newest';
    writeSave(local, a, 2);
    writeSave(local, game('r10'), 3);
    local.setItem('slate.v1.lock.r1', 'tab');
    local.setItem('slate.v1.creationDraft', '{}');
    return local;
  }

  it('moves every save and copy, verifies, then clears them from localStorage, leaving locks and drafts', async () => {
    const local = localWithTwoSaves();
    const original = new Map(local.data);
    const { backend, vault } = await vaultWith();
    const report = await migrateFromLocal(local, vault, 99);
    expect(report.kept).toEqual([]);
    for (const [k, v] of original) if (k.startsWith('slate.v1.save.')) expect(backend.data.get(k)).toBe(v);
    expect(local.keys().sort()).toEqual(['slate.v1.creationDraft', 'slate.v1.lock.r1']);
    expect((await vault.saves()).map((x) => x.saveName).sort()).toEqual(['Newest', deserialize(original.get('slate.v1.save.r10')!).saveName].sort());
    // Running it again changes nothing.
    const again = await migrateFromLocal(local, vault, 100);
    expect(again).toEqual({ moved: [], conflicts: [], kept: [] });
  });

  it('after an interruption between storing and clearing, finishes without duplicating anything', async () => {
    const local = localWithTwoSaves();
    const { backend, vault } = await vaultWith();
    for (const k of local.keys()) if (k.startsWith('slate.v1.save.')) backend.data.set(k, local.getItem(k)!); // stored, not yet cleared
    const v = await Vault.open(backend);
    const report = await migrateFromLocal(local, v, 99);
    expect(report.conflicts).toEqual([]);
    expect(local.keys().filter((k) => k.startsWith('slate.v1.save.'))).toEqual([]);
    expect([...backend.data.keys()].some((k) => k.includes('conflict'))).toBe(false);
    void vault;
  });

  it('when another tab kept writing to localStorage, keeps the newer save and the other as a conflict copy', async () => {
    const { backend, vault } = await vaultWith();
    const s = game();
    await vault.forSave('r1', (kv) => writeSave(kv, s, 1));
    const local = memoryStore();
    s.saveName = 'From the other tab';
    writeSave(local, s, 5);
    const older = backend.data.get(KEY)!;
    const report = await migrateFromLocal(local, vault, 77);
    expect(report.conflicts).toHaveLength(1);
    expect(deserialize(backend.data.get(KEY)!).saveName).toBe('From the other tab');
    expect(backend.data.get(report.conflicts[0])).toBe(older);
    expect(listRecoveryCopies({ ...memoryStore(), keys: () => [...backend.data.keys()], getItem: (k: string) => backend.data.get(k) ?? null } as never).map((c) => c.kind)).toContain('conflict');
  });

  it('keeps everything in localStorage when the vault has no room, and moves it once there is', async () => {
    const local = localWithTwoSaves();
    const before = new Map(local.data);
    const backend = new MemoryBackend(100);
    const vault = await Vault.open(backend);
    const report = await migrateFromLocal(local, vault, 99);
    expect(report.moved).toEqual([]);
    expect(local.data).toEqual(before);
    backend.quota = Infinity;
    const ok = await migrateFromLocal(local, vault, 100);
    expect(ok.kept).toEqual([]);
    expect(local.keys().filter((k) => k.startsWith('slate.v1.save.'))).toEqual([]);
  });

  it('localStorage still works as the store where the vault cannot use IndexedDB', async () => {
    const local = memoryStore();
    const vault = await Vault.open(new LocalBackend(local));
    const s = game();
    await vault.forSave('r1', (kv) => writeSave(kv, s, 1));
    s.saveName = 'Again';
    await vault.forSave('r1', (kv) => writeSave(kv, s, 2));
    expect(deserialize(local.getItem(KEY)!).saveName).toBe('Again');
    expect(local.getItem(`${KEY}.bak`)).not.toBeNull();
  });
});

describe('the index and the vault', () => {
  it('saving still works, and repairs the index, when the index is missing a save', async () => {
    const { backend, vault } = await vaultWith();
    await vault.forSave('r1', (kv) => writeSave(kv, game(), 1));
    await vault.forSave('r2', (kv) => writeSave(kv, game('r2'), 2));
    backend.data.set('slate.v1.index', JSON.stringify([]));
    const v = await Vault.open(backend);
    const r = await v.forSave('r1', (kv) => writeSave(kv, game(), 3));
    expect(r.error).toBeUndefined();
    expect(r.value?.ok).toBe(true);
    expect(JSON.parse(backend.data.get('slate.v1.index')!).map((x: { saveId: string }) => x.saveId).sort()).toEqual(['r1', 'r2']);
  });
});

describe('the journal written as a page closes', () => {
  it('a newer journal entry is saved through the vault, the stored save becomes its backup, and the entry is cleared', async () => {
    const { applyJournal, journalKey } = await import('../src/engine/vault');
    const { backend, vault } = await vaultWith();
    const s = game();
    await vault.forSave('r1', (kv) => writeSave(kv, s, 1000));
    const stored = backend.data.get(KEY)!;
    const local = memoryStore();
    s.saveName = 'Closed Mid-Play';
    s.updatedAtReal = 2000;
    local.setItem(journalKey('r1'), serialize(s));
    const r = await applyJournal(local, vault, 3000);
    expect(r.applied).toEqual(['r1']);
    expect(deserialize(backend.data.get(KEY)!).saveName).toBe('Closed Mid-Play');
    expect(backend.data.get(`${KEY}.bak`)).toBe(stored);
    expect(local.keys()).toEqual([]);
  });

  it('an older journal entry is superseded; an unreadable one is kept as a damaged copy, never dropped', async () => {
    const { applyJournal, journalKey } = await import('../src/engine/vault');
    const { backend, vault } = await vaultWith();
    const s = game();
    await vault.forSave('r1', (kv) => writeSave(kv, s, 5000));
    const local = memoryStore();
    s.updatedAtReal = 4000;
    local.setItem(journalKey('r1'), serialize(s));
    local.setItem(journalKey('r2'), 'half a save');
    await applyJournal(local, vault, 6000);
    expect(local.keys()).toEqual([]);
    expect(deserialize(backend.data.get(KEY)!).updatedAtReal).toBe(5000);
    expect(backend.data.get('slate.v1.save.r2.damaged-6000')).toBe('half a save');
  });
});

describe('saving reads only what it needs', () => {
  it('a write leaves the backup and other copies unread, and still keeps the previous save as the backup', async () => {
    const backend = new MemoryBackend();
    const reads: string[][] = [];
    const read = backend.read.bind(backend);
    backend.read = async (keys: string[]) => { reads.push(keys); return read(keys); };
    const vault = await Vault.open(backend);
    const s = game();
    await vault.forWrite('r1', (kv) => writeSave(kv, s, 1));
    await vault.forWrite('r1', (kv) => writeSave(kv, s, 2));
    await vault.forSave('r1', (kv) => kv.setItem(`${KEY}.backup-v3`, 'old'));
    const prev = backend.data.get(KEY);
    reads.length = 0;
    await vault.forWrite('r1', (kv) => writeSave(kv, s, 3));
    expect(reads.flat().filter((k) => k.endsWith('.bak') || k.includes('.backup-'))).toEqual([]);
    expect(backend.data.get(`${KEY}.bak`)).toBe(prev);
    // A damaged save is still kept exactly once.
    await vault.forSave('r1', (kv) => kv.setItem(KEY, 'garbage'));
    await vault.forWrite('r1', (kv) => writeSave(kv, s, 4));
    await vault.forSave('r1', (kv) => kv.setItem(KEY, 'garbage'));
    await vault.forWrite('r1', (kv) => writeSave(kv, s, 5));
    expect([...backend.data.values()].filter((v) => v === 'garbage')).toHaveLength(1);
  });
});
