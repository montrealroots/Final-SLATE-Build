// Types for pack-format.mjs, for the tests.
export declare const MAGIC: string;
export declare function writePack(
  meta: { kind: 'catalog' | 'cinemas' | 'images'; name: string; source: string; builtAt: string; retrieved?: { from: string; to: string; maxAgeDays: number } },
  files: Iterable<[string, string | Buffer]>,
): Buffer;
