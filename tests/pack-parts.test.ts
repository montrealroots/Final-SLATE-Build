// A pack too big to send whole, cut into pieces and joined back when the pieces are picked together (packs.ts joinParts;
// the owner, November 19, 2026, installing on a phone from files sent in a chat that takes at most 500 MB a file).
import { describe, expect, it } from 'vitest';
import { joinParts } from '../src/catalog/packs';

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
