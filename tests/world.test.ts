// The industry's recorded dates at a save's date (src/catalog/world.ts): which events fall in a span, which are news, which
// belong to this story, and how each is told before and after it happens. Made-up records; no TMDB data is in the repository.
import { describe, expect, it } from 'vitest';
import { describe as tell, eventsBetween, inStory, isNews, onCalendar, type WorldSeed } from '../src/catalog/world';

const w: WorldSeed = {
  version: 1, builtAt: '2026-11-10T12:00:00Z', horizon: '2026-11-10', from: '2025-10-01',
  events: [
    { d: '2025-12-30', k: 'film', r: 'movie:1', t: 'Paper Lanterns', ci: ['company:pixar'] },
    { d: '2026-01-05', k: 'season', r: 'tv:2:s:1', t: 'Harbour Watch', s: 1, first: true, eps: 8, net: ['Disney+'], ci: ['company:fx-productions'] },
    { d: '2026-01-05', k: 'episode', r: 'tv:2:s:1:e:1', t: 'Harbour Watch', s: 1, e: 1, n: 'Low Tide', net: ['Disney+'] },
    { d: '2026-02-23', k: 'episode', r: 'tv:2:s:1:e:8', t: 'Harbour Watch', s: 1, e: 8, n: 'Spring Tide', f: 1, net: ['Disney+'] },
    { d: '2026-04-01', k: 'season', r: 'tv:3:s:4', t: 'Old Mill', s: 4, eps: 10, net: ['ABC'] },
    { d: '2026-04-01', k: 'season', r: 'tv:6:s:30', t: 'Morning Desk', s: 30, eps: 240, net: ['ABC'], daily: 1 },
    { d: '2026-05-01', k: 'season', r: 'tv:7:s:2', t: 'Night Shift', s: 2, eps: 8, drop: 1, net: ['Disney+'] },
    { d: '2026-11-10', k: 'end', r: 'tv:4', t: 'Short Run', st: 'Canceled', la: '2026-03-01', net: ['Hulu'] },
    { d: '2026-11-10', k: 'end', r: 'tv:5', t: 'Long Gone', st: 'Ended', la: '2025-11-20' },
  ],
};

describe('the industry at the save\'s date', () => {
  it('finds the events of a span, both ends included, in date order', () => {
    expect(eventsBetween(w, '2026-01-05', '2026-02-23').map((e) => e.r)).toEqual(['tv:2:s:1', 'tv:2:s:1:e:1', 'tv:2:s:1:e:8']);
    expect(eventsBetween(w, '2026-01-06', '2026-02-22')).toEqual([]);
    expect(eventsBetween(w, '2020-01-01', '2030-01-01')).toHaveLength(9);
  });

  it('tells releases, premieres, finales and endings as news, and leaves single episodes to the calendar', () => {
    expect(w.events.filter(isNews).map((e) => e.r)).toEqual(['movie:1', 'tv:2:s:1', 'tv:2:s:1:e:8', 'tv:3:s:4', 'tv:7:s:2', 'tv:4', 'tv:5']);
  });

  it('leaves a continuous programme (talk, soap, news) out of the news and the calendar, and endings off the calendar', () => {
    const daily = w.events.find((e) => e.daily)!;
    expect([isNews(daily), onCalendar(daily)]).toEqual([false, false]);
    expect(w.events.filter(onCalendar).map((e) => e.k)).toEqual(['film', 'season', 'episode', 'episode', 'season', 'season']);
  });

  it('tells an ending only if the series ran into the story: one that ended before it began is already history', () => {
    const start = '2026-01-05';
    expect(inStory(w.events[7], start)).toBe(true);
    expect(inStory(w.events[8], start)).toBe(false);
    expect(inStory(w.events[0], start)).toBe(true); // anything but an ending belongs
  });

  it('is told in the future before it happens and in the past after, naming the studio and the network', () => {
    expect(tell(w.events[0], '2025-12-01')).toBe('Paper Lanterns, from Pixar, is due to come out.');
    expect(tell(w.events[0], '2025-12-30')).toBe('Paper Lanterns, from Pixar, came out.');
    expect(tell(w.events[1], '2026-01-05')).toBe('Harbour Watch premiered on Disney+.');
    expect(tell(w.events[3], '2026-01-10')).toBe('The Season 1 finale of Harbour Watch, "Spring Tide", is due to air on Disney+.');
    expect(tell(w.events[4], '2026-04-02')).toBe('Season 4 of Old Mill began on ABC.');
    expect(tell(w.events[6], '2026-05-02')).toBe('All 8 episodes of Season 2 of Night Shift came out on Disney+.');
    expect(tell(w.events[7], '2026-11-10')).toBe("Short Run has been cancelled. Its last episode aired March 1, 2026; when this was announced isn't recorded.");
  });
});
