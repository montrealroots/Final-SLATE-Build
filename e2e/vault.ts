import type { Page } from '@playwright/test';

// Browser tests reach saves where the game keeps them: IndexedDB 'slate-saves', each record gzip-compressed with its
// metadata (src/ui/idb.ts). These helpers read and write that format directly, for setting up failure cases.

export async function readRecord(page: Page, key: string): Promise<string | null> {
  return page.evaluate(async (k) => {
    const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('slate-saves', 1); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const v = await new Promise<{ data: ArrayBuffer | string; gz: boolean } | undefined>((res, rej) => { const r = db.transaction('data').objectStore('data').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    db.close();
    if (!v) return null;
    return v.gz ? new Response(new Blob([v.data as ArrayBuffer]).stream().pipeThrough(new DecompressionStream('gzip'))).text() : (v.data as string);
  }, key);
}

export async function listRecords(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('slate-saves', 1); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const keys = await new Promise<IDBValidKey[]>((res, rej) => { const r = db.transaction('meta').objectStore('meta').getAllKeys(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    db.close();
    return keys.map(String);
  });
}

/** Write (or with null, delete) records exactly as the game stores them. The page should be reloaded afterwards. */
export async function writeRecords(page: Page, records: Record<string, string | null>): Promise<void> {
  await page.evaluate(async (recs) => {
    const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('slate-saves', 1); r.onupgradeneeded = () => { r.result.createObjectStore('data'); r.result.createObjectStore('meta'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const packed = await Promise.all(Object.entries(recs).map(async ([k, text]) => {
      if (text === null) return [k, null, null] as const;
      const blob = await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
      const v = /^\{"format":"slate-save","version":(\d+)/.exec(text);
      const t = /\\"updatedAtReal\\":(\d+)/.exec(text);
      return [k, { data: blob, gz: true }, { chars: text.length, bytes: k.length + blob.byteLength, version: v ? Number(v[1]) : null, savedAtReal: t ? Number(t[1]) : null }] as const;
    }));
    const tx = db.transaction(['data', 'meta'], 'readwrite');
    for (const [k, d, m] of packed) {
      if (d === null) { tx.objectStore('data').delete(k); tx.objectStore('meta').delete(k); } else { tx.objectStore('data').put(d, k); tx.objectStore('meta').put(m, k); }
    }
    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    db.close();
  }, records);
}

/** The game's id of the first listed save. */
export async function firstSaveId(page: Page): Promise<string> {
  const keys = await listRecords(page);
  const main = keys.find((k) => /^slate\.v1\.save\.[^.]+$/.test(k));
  if (!main) throw new Error('No save in IndexedDB.');
  return main.slice('slate.v1.save.'.length);
}

/** Clear everything the game stores: IndexedDB saves and localStorage. */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((res) => { const r = indexedDB.deleteDatabase('slate-saves'); r.onsuccess = () => res(); r.onerror = () => res(); r.onblocked = () => res(); });
  });
}

/**
 * Failure injection (test fixture): while on, every save write is refused with the browser's QuotaExceededError, as a
 * full IndexedDB would. The game's own save code runs unchanged.
 */
export async function refuseSaveWrites(page: Page, on: boolean): Promise<void> {
  await page.evaluate((flag) => {
    const w = window as unknown as { __refuseSaves?: boolean; __refusePatched?: boolean };
    w.__refuseSaves = flag;
    if (w.__refusePatched) return;
    w.__refusePatched = true;
    const real = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (w.__refuseSaves && this.name === 'data') throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      return real.apply(this, args);
    };
  }, on);
}
