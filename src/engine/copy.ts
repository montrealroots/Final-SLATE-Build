// The rollback snapshot taken before events run. Game state is plain data (it is saved as JSON), and copying plain
// objects and arrays directly is several times faster than structuredClone (measured in docs/perf/). Anything that
// isn't a plain object or array (a Date, Map, class instance) is still copied by structuredClone, so the copy stays
// exact. Unlike structuredClone, a value referenced twice is copied twice; saved games never share references.

export function copyPlain<T>(v: T): T {
  if (typeof v !== 'object' || v === null) return v;
  if (Array.isArray(v)) {
    const n = v.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = copyPlain(v[i]);
    return out as T;
  }
  if (Object.getPrototypeOf(v) !== Object.prototype) return structuredClone(v);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v)) out[k] = copyPlain((v as Record<string, unknown>)[k]);
  return out as T;
}
