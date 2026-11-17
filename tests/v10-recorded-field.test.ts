// Judging the recorded field (src/engine/awards-results.ts recordedField; the owner's v8 package, A18; from November 17,
// 2026). Where the record has a category's nominees, published by the day it's judged, your entry competes with them,
// and the recorded winner, once published, is the strongest of them. Before the record's date the game's own field is
// judged, as every category was before. Each case changes only the day, or the work's strength, and reads the outcome.
import { describe, expect, it } from 'vitest';
import { announce, editionResults, recordedField, rivalsFor } from '../src/engine/awards-results';
import { institution, rivalTitle } from '../src/engine/awards';
import type { GameState } from '../src/engine/types';
import { buildProject, startLife } from './helpers';

const NOMINEES = ['One Battle after Another', 'Bugonia', 'F1', 'Frankenstein', 'Hamnet', 'Marty Supreme', 'The Secret Agent', 'Sentimental Value', 'Sinners', 'Train Dreams'];

function oscars(tag: string) {
  const s = startLife(tag, 'us-los-angeles', { startDate: '2026-01-01' });
  const ed = s.editions.find((e) => e.institutionId === 'oscars' && e.year === 2026)!;
  const cat = institution('oscars').categories.find((c) => c.id === 'picture')!;
  return { s, ed, cat };
}
const at = (s: GameState, day: string) => { s.now = Date.parse(`${day}T20:00:00Z`); };

describe('the recorded field', () => {
  it('is the recorded nominees from the day they were published, and the game\'s own field before', () => {
    const { s, ed, cat } = oscars('rec-field-dates');
    at(s, '2026-01-21');
    expect(recordedField(s, ed, cat)).toEqual([]);
    expect(rivalsFor(s, ed, cat).map((x) => x.film.title)).not.toContain('Hamnet');
    at(s, '2026-01-22');
    expect(rivalsFor(s, ed, cat).map((x) => x.film.title)).toEqual(NOMINEES);
  });

  it('is what an entry is judged against: a weak picture isn\'t nominated, a strong one takes a recorded nominee\'s place', () => {
    const run = (overall: number) => {
      const { s, ed, cat } = oscars(`rec-field-${overall}`);
      const p = buildProject(s, { title: 'Glass Orchard', format: 'feature', medium: 'live-action' }, [{ name: 'Ada' }], [{ place: 'Pier', chars: ['Ada'] }]);
      p.delivered = { at: s.now, runtimeMin: 100 };
      p.quality = Object.fromEntries(['overall', 'direction', 'script', 'reception'].map((k) => [k, overall]));
      // Labelled fixture: an accepted entry, as submitEntry and its review leave one.
      ed.entries.push({ id: 'en', projectId: p.id, categoryId: cat.id, submittedAt: 0, status: 'accepted', recipients: [], fee: 0 });
      at(s, '2026-01-22');
      announce(s, ed);
      const res = ed.results[cat.id]!;
      return { status: ed.entries[0].status, rivals: res.rivalIds.map((id) => rivalTitle(s, ed, id)), s, ed, cat };
    };
    const weak = run(40);
    expect(weak.status).toBe('not-nominated');
    expect(weak.rivals).toEqual(NOMINEES);
    const strong = run(99);
    expect(strong.status).toBe('nominated');
    expect(strong.rivals).toEqual(NOMINEES.slice(0, 9)); // the last-listed, Train Dreams, makes way, as the history shows it

    // At the ceremony the recorded winner, published that day, is the strongest: it wins over a good nominated picture.
    for (const k of ['overall', 'direction', 'script', 'reception']) strong.s.projects[0].quality![k] = 85;
    at(strong.s, '2026-03-16');
    editionResults(strong.s, strong.ed);
    const won = strong.ed.results[strong.cat.id]!;
    expect(rivalTitle(strong.s, strong.ed, won.winner!) ?? 'Glass Orchard').toBe('One Battle after Another');
  });
});
