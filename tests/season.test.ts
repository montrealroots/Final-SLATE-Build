import { describe, expect, it } from 'vitest';
import { institution, processUntil, upcomingCommitments, DAY, seasonSlate, announceEdition } from './engine-api';
import { startLife } from './helpers';

describe('festival screenings', () => {
  it('a selection creates screenings inside the festival dates that happen whether or not you attend', () => {
    const s = startLife('screen');
    const ed = s.editions.find((e) => e.institutionId === 'venice' && e.year === 2026)!;
    const p = { id: 'px', title: 'Salt Road' } as never;
    s.projects.push({ ...(p as object), credits: [], releases: [], premiere: null, history: [], offers: [], quality: { overall: 90, reception: 90, direction: 90, script: 90 }, delivered: { at: 0, runtimeMin: 100 }, axes: { basePlaceId: 'it-rome', format: 'feature', medium: 'live-action', genres: [] }, drafts: [], approvedDraft: null, noticeKeys: [] } as never);
    ed.entries.push({ id: 'en1', projectId: 'px', categoryId: 'competition', submittedAt: 0, status: 'selected', recipients: [], fee: 0 });
    ed.results.competition = { stage: 'selection', projectIds: ['px'], rivalIds: [], revealed: true };
    ed.status = 'announced';
    processUntil(s, ed.start + DAY, 'tick', 100000);
    const screenings = ed.screenings ?? [];
    expect(screenings.length).toBeGreaterThan(0);
    for (const sc of screenings) {
      expect(sc.at).toBeGreaterThanOrEqual(ed.start);
      expect(sc.at).toBeLessThanOrEqual(ed.end);
    }
    const listed = upcomingCommitments(s, ed.start, ed.end).filter((c) => c.label.startsWith('Screening'));
    expect(listed.length).toBeGreaterThan(0);
    processUntil(s, ed.end + DAY, 'tick', 100000);
    expect(s.log.some((l) => l.text.includes('Salt Road screened at'))).toBe(true);
  });
});

describe('rival slate across a season', () => {
  it('rivals come from one deterministic slate per season and keep their strength across events', () => {
    const s = startLife('slate');
    const a = seasonSlate(s.seed, 2026);
    const b = seasonSlate(s.seed, 2026);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(40);
    // Run festival announcements in 2026 and award announcements for the 2027 ceremonies.
    for (const id of ['venice-2026', 'tiff-2026', 'oscars-2027', 'golden-globes-2027']) {
      const ed = s.editions.find((e) => e.id === id)!;
      announceEdition(s, ed);
    }
    const titles = (id: string) => {
      const ed = s.editions.find((e) => e.id === id)!;
      return new Set(ed.rivals.map((r) => r.title));
    };
    const fest = new Set([...titles('venice-2026'), ...titles('tiff-2026')]);
    const awards = new Set([...titles('oscars-2027'), ...titles('golden-globes-2027')]);
    expect([...awards].some((t) => fest.has(t))).toBe(true); // festival films return in awards season
    const venice = s.editions.find((e) => e.id === 'venice-2026')!;
    const oscars = s.editions.find((e) => e.id === 'oscars-2027')!;
    const shared = venice.rivals.find((r) => oscars.rivals.some((o) => o.title === r.title));
    if (shared) {
      const again = oscars.rivals.find((o) => o.title === shared.title)!;
      expect(again.people).toEqual(shared.people);
    }
    expect(institution('venice').kind).toBe('festival');
  });
});
