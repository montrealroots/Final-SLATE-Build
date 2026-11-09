import { describe, expect, it } from 'vitest';
import { categoriesFor, institution } from './engine-api';

describe('category audit corrections (November 6, 2026)', () => {
  it("Gotham's Breakthrough Series is only in the editions that held it (2015-2023), but old entries still resolve", () => {
    const g = institution('gotham');
    expect(categoriesFor(g, 2026).map((c) => c.id)).not.toContain('series');
    expect(categoriesFor(g, 2023).map((c) => c.id)).toContain('series');
    expect(g.categories.find((c) => c.id === 'series')).toBeDefined(); // lookups by ID for older saves
  });

  it('the Emmys split directing, writing and lead acting into drama and comedy', () => {
    const e = institution('emmys');
    const byId = new Map(e.categories.map((c) => [c.id, c]));
    expect(byId.get('directing')!.name).toBe('Outstanding Directing For A Drama Series');
    // From November 9, 2026 the split is the category's class, read from where the project says it competes.
    expect(byId.get('directing')!.class).toBe('drama');
    expect(byId.get('directing-comedy')!.class).toBe('comedy');
    for (const id of ['writing', 'lead-actor', 'lead-actress']) {
      expect(byId.get(id)!.name).toMatch(/Drama Series$/);
      expect(byId.get(`${id}-comedy`)!.name).toMatch(/Comedy Series$/);
    }
  });
});
