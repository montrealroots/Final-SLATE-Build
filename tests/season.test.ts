import { describe, expect, it } from 'vitest';
import { institution, processUntil, upcomingCommitments, DAY, seasonSlate, announceEdition, rsvpScreening, screeningTravel, travelTo } from './engine-api';
import { approve, buildProject, startLife } from './helpers';

describe('festival screenings', () => {
  it('a selection creates screenings inside the festival dates that happen whether or not you attend', () => {
    const s = startLife('screen');
    const ed = s.editions.find((e) => e.institutionId === 'venice' && e.year === 2026)!;
    const proj = buildProject(s, { title: 'Salt Road', format: 'feature', medium: 'live-action', runtime: 100 }, [{ name: 'A' }], [{ place: 'Room', chars: ['A'], minutes: 50 }]);
    approve(s, proj);
    proj.id = 'px';
    proj.delivered = { at: s.now, runtimeMin: 100 };
    proj.quality = { overall: 90, reception: 90, direction: 90, script: 90 };
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

describe('screening invitations', () => {
  function selected(tag: string) {
    const s = startLife(tag);
    const ed = s.editions.find((e) => e.institutionId === 'venice' && e.year === 2026)!;
    const proj = buildProject(s, { title: 'Salt Road', format: 'feature', medium: 'live-action', runtime: 100 }, [{ name: 'A' }], [{ place: 'Room', chars: ['A'], minutes: 50 }]);
    approve(s, proj);
    proj.id = 'px';
    proj.delivered = { at: s.now, runtimeMin: 100 };
    proj.quality = { overall: 90, reception: 90, direction: 90, script: 90 };
    ed.entries.push({ id: 'en1', projectId: 'px', categoryId: 'competition', submittedAt: 0, status: 'selected', recipients: [], fee: 0 });
    ed.results.competition = { stage: 'selection', projectIds: ['px'], rivalIds: [], revealed: true };
    ed.status = 'announced';
    processUntil(s, ed.start + 1, 'tick', 100000);
    return { s, ed, venue: institution(ed.institutionId).placeId };
  }

  it('invites with a reply deadline; travel must arrive in time; declining keeps the selection', () => {
    const { s, ed } = selected('rsvp');
    const [first, second] = ed.screenings!;
    expect(first.rsvp).toBe('pending');
    expect(first.rsvpBy).toBe(first.at - DAY);
    // From London the trip to Venice is a few hours; accepting works while there's time.
    const t = screeningTravel(s, ed, first);
    expect(t.here).toBe(false);
    expect(t.arrivesInTime).toBe(true);
    rsvpScreening(s, ed.id, 'px', first.at, true);
    expect(first.rsvp).toBe('accepted');
    rsvpScreening(s, ed.id, 'px', second.at, false);
    expect(second.rsvp).toBe('declined');
    expect(ed.entries[0].status).toBe('selected'); // declining attendance keeps the selection
    // Go there, see the 30-minute reminder, attend.
    travelTo(s, institution(ed.institutionId).placeId);
    processUntil(s, first.at + 60_000, 'tick', 100000);
    expect(s.log.some((l) => l.text === 'Your screening starts in 30 minutes.')).toBe(true);
    expect(first.attended).toBe(true);
    processUntil(s, ed.end + DAY, 'tick', 100000);
    expect(second.attended).toBe(false);
  });

  it("refuses a trip that can't arrive in time, and an answer after the deadline", () => {
    const { s, ed } = selected('rsvp-late');
    const sc = ed.screenings![0];
    // Just before the screening, from London: too late to get there.
    processUntil(s, sc.at - 2 * 3600_000, 'tick', 100000);
    expect(() => rsvpScreening(s, ed.id, 'px', sc.at, true)).toThrow(/deadline has passed|couldn't arrive in time/);
    expect(s.locationId).not.toBe(institution(ed.institutionId).placeId);
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
      return new Set(ed.rivals.map((r) => s.rivalFilms[r.film].title));
    };
    const fest = new Set([...titles('venice-2026'), ...titles('tiff-2026')]);
    const awards = new Set([...titles('oscars-2027'), ...titles('golden-globes-2027')]);
    expect([...awards].some((t) => fest.has(t))).toBe(true); // festival films return in awards season
    const venice = s.editions.find((e) => e.id === 'venice-2026')!;
    const oscars = s.editions.find((e) => e.id === 'oscars-2027')!;
    const title = (r: { film: string }) => s.rivalFilms[r.film].title;
    const shared = venice.rivals.find((r) => oscars.rivals.some((o) => title(o) === title(r)));
    if (shared) {
      // The same film is stored once and shared by both events, so its people and details can't drift apart.
      const again = oscars.rivals.find((o) => title(o) === title(shared))!;
      expect(again.film).toBe(shared.film);
    }
    expect(institution('venice').kind).toBe('festival');
  });
});
