// Browser storage measurements for long careers (docs/STORAGE.md). For each save file given, in Chromium and WebKit:
// gzip size, time to compress and commit a save plus its backup in one IndexedDB transaction (as src/ui/idb.ts does),
// and time to read, decompress and parse it back. Usage: node scripts/perf-storage.mjs <save files...>
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { chromium, webkit } from 'playwright';

const files = process.argv.slice(2);
const server = createServer((_q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end('<p>x</p>'); });
await new Promise((r) => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}/`;
const webkitPath = '/opt/pw-browsers/webkit-2386/pw_run.sh';
const out = [];
for (const [name, type, opts] of [['chromium', chromium, {}], ['webkit', webkit, { executablePath: webkitPath }]]) {
  let browser;
  try { browser = await type.launch(opts); } catch { browser = await type.launch(); }
  const page = await browser.newPage();
  await page.goto(url);
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    const r = await page.evaluate(async (t) => {
      const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
      const db = await new Promise((res, rej) => { const q = indexedDB.open('m', 1); q.onupgradeneeded = () => q.result.createObjectStore('d'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
      const gz = async (s) => new Response(new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
      const write = [];
      const read = [];
      let size = 0;
      for (let i = 0; i < 3; i++) {
        let t0 = performance.now();
        const [a, b] = await Promise.all([gz(t), gz(t)]);
        size = a.byteLength;
        await new Promise((res, rej) => { const tx = db.transaction('d', 'readwrite'); tx.objectStore('d').put(a, 'main'); tx.objectStore('d').put(b, 'bak'); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
        write.push(performance.now() - t0);
        t0 = performance.now();
        const blob = await new Promise((res, rej) => { const q = db.transaction('d').objectStore('d').get('main'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
        const back = await new Response(new Blob([blob]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
        JSON.parse(JSON.parse(back).data);
        read.push(performance.now() - t0);
        if (back !== t) throw new Error('round trip changed the save');
      }
      db.close();
      return { gzKB: Math.round(size / 1024), writeMs: Math.round(median(write)), readAndParseMs: Math.round(median(read)) };
    }, text);
    out.push({ browser: name, save: basename(f), rawKB: Math.round(text.length / 1024), ...r });
    console.log(JSON.stringify(out.at(-1)));
  }
  await browser.close();
}
server.close();
