// The box-office feed contract (src/engine/box-office-feed.ts; the owner's research recovery package of November 19,
// 2026, docs/05-BOX-OFFICE.md, "Acceptance cases"), on a SYNTHETIC fixture: these test the software, not any real
// coverage. No licensed dataset is installed, and FEED says so.
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/box-office-synthetic.json';
import { FEED, asOf, ingest, totalAsOf, type BoxOfficeReport, type Store } from '../src/engine/box-office-feed';

const reports = fixture.reports as BoxOfficeReport[];
const loaded = (): Store => { const s: Store = { reports: [] }; ingest(s, reports); return s; };

describe('the box-office feed contract (synthetic fixture)', () => {
  it('says no licensed dataset is installed', () => {
    expect(FEED.installed).toBe(false);
    expect(fixture.about).toMatch(/^SYNTHETIC\./);
  });

  it('shows a report from its publication only, and a correction only from its own date', () => {
    const s = loaded();
    expect(asOf(s, '2026-03-06', (r) => r.title === 'Synthetic Film A')).toEqual([]);
    expect(totalAsOf(s, '2026-03-07', 'Synthetic Film A', 'US')).toMatchObject({ amountMinor: 400000000, from: 'day' });
    expect(totalAsOf(s, '2026-03-16', 'Synthetic Film A', 'US')).toMatchObject({ amountMinor: 1800000000, from: 'cumulative', through: '2026-03-15' });
    // Corrected on March 20: before then the first figure stands, from then the second.
    expect(totalAsOf(s, '2026-03-19', 'Synthetic Film A', 'US').amountMinor).toBe(1800000000);
    expect(totalAsOf(s, '2026-03-20', 'Synthetic Film A', 'US').amountMinor).toBe(1850000000);
  });

  it('never adds daily, weekend and cumulative figures together', () => {
    const s = loaded();
    // March 9: two days and a weekend are published, no cumulative yet. The total is the days' sum, said so; not 1.75bn.
    expect(totalAsOf(s, '2026-03-09', 'Synthetic Film A', 'US')).toMatchObject({ amountMinor: 750000000, from: 'day' });
  });

  it('imports the same report once, and refuses a changed revision, an orphan correction and a currency the territory doesn\'t use', () => {
    const s = loaded();
    expect(ingest(s, reports)).toMatchObject({ added: 0, skipped: reports.length, refused: [] });
    const changed = { ...reports[0], amountMinor: 1 };
    expect(ingest(s, [changed]).refused[0].why).toMatch(/held with different figures/);
    const orphan = { ...reports[0], revision: 3 };
    expect(ingest(s, [orphan]).refused[0].why).toMatch(/corrects revision 2, which isn't held/);
    const wrong = { ...reports[5], currency: 'USD' };
    expect(ingest({ reports: [] }, [wrong]).refused[0].why).toBe('GB reports in GBP, not USD; nothing is converted.');
    expect(ingest({ reports: [] }, [{ ...reports[0], territory: 'XX' }]).refused[0].why).toMatch(/isn't one the contract defines/);
  });

  it('keeps each territory apart and names the dataset release each figure came in', () => {
    const s = loaded();
    expect(totalAsOf(s, '2026-11-20', 'Synthetic Film A', 'GB')).toMatchObject({ amountMinor: 120000000, currency: 'GBP', from: 'weekend' });
    expect(new Set(asOf(s, '2026-11-20').map((r) => r.release))).toEqual(new Set(['synthetic-1']));
  });
});
