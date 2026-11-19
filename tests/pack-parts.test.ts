// A pack too big to send whole, cut into pieces and joined back when the pieces are picked together (packs.ts joinParts;
// the owner, November 19, 2026, installing on a phone from files sent in a chat that takes at most 500 MB a file).
import { describe, expect, it } from 'vitest';
import { joinParts, packsInZip } from '../src/catalog/packs';

const file = (name: string, text: string) => ({ name, blob: new Blob([text]) });

describe('installing packs from several files at once', () => {
  it('joins the pieces of a pack, in their order whatever order they were picked in, beside whole packs', async () => {
    const { packs, problems } = joinParts([file('cat.part2of3.slatepack', 'BB'), file('profile-06.slatepack', 'P'), file('cat.part3of3.slatepack', 'C'), file('cat.part1of3.slatepack', 'AAA')]);
    expect(problems).toEqual([]);
    expect(packs.map((p) => p.name)).toEqual(['profile-06.slatepack', 'cat.slatepack']);
    expect(await packs[1].blob.text()).toBe('AAABBC');
  });

  it("says which pieces are missing, installs nothing of that pack, and still gives the others", () => {
    const { packs, problems } = joinParts([file('cat.part1of3.slatepack', 'A'), file('poster-00.slatepack', 'P')]);
    expect(packs.map((p) => p.name)).toEqual(['poster-00.slatepack']);
    expect(problems).toEqual(["cat comes in 3 pieces, and pieces 2, 3 weren't picked with the rest, so it wasn't installed. Pick all 3 together."]);
  });
});

/** A stored (uncompressed) zip, as `zip -0` writes one: each file's local header and bytes, then the central directory. */
function storedZip(files: [string, string][], method = 0): Blob {
  const enc = new TextEncoder();
  const parts: BlobPart[] = []; const central: BlobPart[] = []; let at = 0, cdSize = 0;
  for (const [name, text] of files) {
    const n = enc.encode(name), data = enc.encode(text);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(8, method, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, n.length, true);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(10, method, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, n.length, true); ch.setUint32(42, at, true);
    parts.push(lh.buffer, n, data); central.push(ch.buffer, n); cdSize += 46 + n.length;
    at += 30 + n.length + data.length;
  }
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, at, true);
  return new Blob([...parts, ...central, end.buffer]);
}

describe('packs picked inside a zip', () => {
  it('opens a stored zip into its packs, skipping folders and anything that is not a pack', async () => {
    const zip = storedZip([['logo-00.slatepack', 'LOGO0'], ['__MACOSX/._logo-00.slatepack', 'x'], ['notes.txt', 'n'], ['sub/logo-01.slatepack', 'LOGO1']]);
    const packs = await packsInZip(zip, 'logos.zip');
    expect(packs.map((p) => p.name)).toEqual(['logo-00.slatepack', 'logo-01.slatepack']);
    expect(await Promise.all(packs.map((p) => p.blob.text()))).toEqual(['LOGO0', 'LOGO1']);
  });

  it('refuses a compressed zip, and a file that is not a zip, with what to do', async () => {
    await expect(packsInZip(storedZip([['a.slatepack', 'A']], 8), 'packed.zip')).rejects.toThrow('packed.zip is compressed, which the game can\'t read. Unzip it in the Files app and pick the packs inside.');
    await expect(packsInZip(new Blob(['not a zip at all']), 'x.zip')).rejects.toThrow("x.zip isn't a zip file, or it was cut short.");
  });
});
