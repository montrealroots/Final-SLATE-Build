// The data pack file (November 11, 2026, docs/DATA-PACKS.md): what a player installs in Settings to add the film catalog
// or the cinemas to their game. Written by tools/pack.mjs and by the browser tests; read by src/catalog/packs.ts.
//
// Layout: the bytes "SLATEPACK1\n", a 4-byte little-endian header length, the header as JSON, then each record gzipped,
// one after another. The header lists each record's path and where its bytes are, so a reader slices the file rather
// than unpacking it, and keeps each record compressed until a page asks for it.
import { gzipSync } from 'node:zlib';

export const MAGIC = 'SLATEPACK1\n';

/**
 * @param {{ kind: 'catalog' | 'cinemas', name: string, source: string, builtAt: string,
 *   retrieved?: { from: string, to: string, maxAgeDays: number } }} meta
 * @param {Iterable<[string, string]>} files path (as the game asks for it, e.g. "titles/movie-1.json") and its JSON text
 * @returns {Buffer}
 */
export function writePack(meta, files) {
  const parts = [];
  const entries = [];
  let offset = 0;
  for (const [path, text] of files) {
    const gz = gzipSync(Buffer.from(text, 'utf8'));
    entries.push([path, offset, gz.length]);
    parts.push(gz);
    offset += gz.length;
  }
  const header = Buffer.from(JSON.stringify({ format: 1, ...meta, entries }), 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(header.length);
  return Buffer.concat([Buffer.from(MAGIC, 'utf8'), len, header, ...parts]);
}
