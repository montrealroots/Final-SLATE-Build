// One awards history per save (src/engine/awards-history.ts; the owner's v8 package, decision 7; A18). The record's
// results stand where it has them, shown only from their date; the player's own work changes them only through a
// result the save decided; and the merge is read, never written, so a reload shows the same.
import { describe, expect, it } from 'vitest';
import { savedResult } from '../src/engine/awards-history';
import { institution } from '../src/engine/awards';
import { deserialize, serialize } from '../src/engine/save';
import { buildProject, startLife } from './helpers';

const setup = () => {
  const s = startLife('one-history', 'us-los-angeles', { startDate: '2026-01-01' });
  const ed = s.editions.find((e) => e.label.includes('83rd Golden Globe'))!;
  const cat = institution(ed.institutionId).categories.find((c) => c.name === 'Best Motion Picture – Drama')!;
  return { s, ed, cat };
};

describe('A18: one history, from the record and the save', () => {
  it('shows nothing recorded before its date, then the record as this save\'s own', () => {
    const { s, ed, cat } = setup();
    expect(savedResult(s, ed, cat, '2026-01-05')?.winners ?? []).not.toContain('Hamnet');
    const after = savedResult(s, ed, cat, '2026-01-12')!;
    expect([after.winners, after.from]).toEqual([['Hamnet'], 'record']);
  });

  it('a win the save decided for your work replaces the recorded win, and nothing is written into the save', () => {
    const { s, ed, cat } = setup();
    const p = buildProject(s, { title: 'Glass Orchard', format: 'feature', medium: 'live-action' }, [{ name: 'Ada' }], [{ place: 'Pier', chars: ['Ada'] }]);
    ed.results[cat.id] = { stage: 'winner', projectIds: [p.id], rivalIds: [], winner: p.id, revealed: true }; // labelled fixture: the save decided it
    const r = savedResult(s, ed, cat, '2026-01-12')!;
    expect([r.winners, r.from]).toEqual([['Glass Orchard'], 'record-changed']);
    const back = deserialize(serialize(s));
    const again = savedResult(back, back.editions.find((e) => e.id === ed.id)!, cat, '2026-01-12')!;
    expect(again).toEqual(r); // the same after a reload: nothing rerolled
    expect(serialize(s)).not.toContain('Hamnet'); // the record is read, never stored
  });
});
