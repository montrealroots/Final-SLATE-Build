// Cycles closed on November 10, 2026, after an audit of every outcome the game produces for what reads it next. Four
// stopped short: backers counted delivered projects but not how they did; the money a finished project kept went nowhere;
// attending a festival screening changed nothing; and the player's own craft never grew. Each test compares the same
// world with the one input changed. Labelled fixtures: earlier work is set delivered and assessed directly, as other
// engine tests do, because making it is the work of the journeys.
import { describe, expect, it } from 'vitest';
import { DAY, acceptDeal, approachBacker, backerOptions, createProject, deals, financeSummary, institution, ledgerTotals, processUntil, spend } from '../src/engine';
import { earningsKept, trackRecord } from '../src/engine/finance';
import { assessQuality, playerExperience } from '../src/engine/finish';
import { screeningHappens } from '../src/engine/awards-results';
import { deserialize, serialize } from '../src/engine/save';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife, writePitch } from './helpers';

const wait = (s: GameState, days: number) => processUntil(s, s.now + days * DAY, 'tick', 100_000);

/** Earlier work of the player's, delivered and assessed (labelled fixture). */
function earlier(s: GameState, reception: number, won = 0, title = 'Earlier'): Project {
  const p = buildProject(s, { title, format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
  p.delivered = { at: s.now - DAY, runtimeMin: 10 };
  p.phase = 'delivered';
  p.quality = { overall: reception, reception, script: reception, direction: reception, craft: reception };
  const ed = s.editions[0];
  for (let i = 0; i < won; i++) ed.entries.push({ id: `${p.id}:won${i}`, projectId: p.id, categoryId: `cat${i}`, submittedAt: s.now, status: 'won', recipients: [], fee: 0 });
  return p;
}
/** A new project with an approved script and a written pitch, nothing raised yet. */
function next(s: GameState): Project {
  const p = createProject(s, { title: 'Next One', scenarioId: 'low', axes: { format: 'short', medium: 'live-action', targetRuntimeMin: 10 } });
  const q = buildProject(s, { title: 'tmp', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Pier', chars: ['Ada'], minutes: 3 }]);
  p.characters = q.characters;
  p.scenes = q.scenes;
  writePitch(p);
  s.projects = s.projects.filter((x) => x.id !== q.id);
  approve(s, p);
  return p;
}

describe('a track record counts with backers, not only a count of delivered work', () => {
  it('reads reception and wins: a cool record lowers the odds, a well-received one with prizes raises them', () => {
    const s = startLife('cyc-record');
    expect(trackRecord(s)).toMatchObject({ works: 0, reception: null, wins: 0, bonus: 0, note: '' });
    earlier(s, 40);
    expect(trackRecord(s)).toMatchObject({ works: 1, reception: 40, wins: 0, bonus: -0.075, note: 'How coolly your delivered work was received counted against you.' });
    const t = startLife('cyc-record-2');
    earlier(t, 85, 2);
    expect(trackRecord(t)).toMatchObject({ works: 1, reception: 85, wins: 2, bonus: 0.2, note: 'The 2 awards your work has won counted for you.' });
  });

  it('the same investor, asked for the same next project in the same worlds, backs it more often after work that did well', () => {
    // Before November 10, 2026 both records gave the same answers: only the count of delivered projects was read.
    const offers = (reception: number, won: number) => {
      let n = 0;
      for (let i = 0; i < 30; i++) {
        const s = startLife(`cyc-inv-${i}`);
        earlier(s, reception, won);
        const p = next(s);
        approachBacker(s, p, 'investor');
        wait(s, 20);
        if (deals(p).some((d) => d.kind === 'investor' && d.status === 'offered')) n++;
      }
      return n;
    };
    const cool = offers(40, 0);
    const warm = offers(85, 2);
    expect(warm).toBeGreaterThan(cool);
  }, 120_000);
});

describe('what a finished project kept can fund the next one', () => {
  it('offers it as Your Earnings, moves it through both ledgers on acceptance, and survives a reload', () => {
    // Before November 10, 2026 the money a delivered project kept stayed in its budget for good: nothing read it.
    const s = startLife('cyc-earn');
    const old = earlier(s, 70);
    const kept = ledgerTotals(old).available;
    expect(kept).toBeGreaterThan(0);
    const p = next(s);
    expect(earningsKept(s, p.id)).toBe(kept);
    expect(backerOptions(s, p).find((o) => o.kind === 'earnings')).toMatchObject({ ready: true, needs: '' });
    const d = approachBacker(s, p, 'earnings');
    expect(d.status).toBe('offered');
    const amount = Math.min(kept, financeSummary(p).stillToRaise);
    expect(d.amount).toBe(amount);
    expect(d.terms).toMatchObject({ recoup: 0, incomeShare: 0, approvalRights: [], credit: null });
    acceptDeal(s, p, d.id);
    expect(ledgerTotals(p).available).toBe(amount);
    expect(ledgerTotals(old).available).toBe(kept - amount);
    const out = old.obligations.find((o) => o.label === 'Put Into Next One')!;
    expect(out.postings.map((x) => x.kind)).toEqual(['reserve', 'settle']);
    const back = deserialize(serialize(s));
    expect(ledgerTotals(back.projects.find((x) => x.id === old.id)!).available).toBe(kept - amount);
  });

  it('with nothing kept it is not offered; if what was kept is spent before acceptance, nothing moves', () => {
    const s = startLife('cyc-earn-none');
    const p0 = next(s);
    expect(backerOptions(s, p0).find((o) => o.kind === 'earnings')).toMatchObject({ ready: false, needs: 'Your delivered projects have kept no money yet.' });
    const old = earlier(s, 70);
    const p = next(s);
    const d = approachBacker(s, p, 'earnings');
    spend(s, old, 'Something else', 'materials', ledgerTotals(old).available - 1, 'cyc-spent');
    expect(() => acceptDeal(s, p, d.id)).toThrow(/Your delivered projects keep \$1 now, less than the/);
    expect(d.status).toBe('offered');
    expect(ledgerTotals(p).available).toBe(0);
  });
});

describe('being at your festival screening', () => {
  it('brings distributors\' attention only when you are there', () => {
    // Before November 10, 2026 attending changed one line in the log and nothing else.
    const run = (there: boolean) => {
      const s = startLife(`cyc-screen-${there}`);
      const p = earlier(s, 70);
      const ed = s.editions.find((e) => institution(e.institutionId).kind === 'festival' && institution(e.institutionId).placeId)!;
      const at = s.now + DAY;
      (ed.screenings ??= []).push({ projectId: p.id, at, done: false, rsvpBy: at - DAY, rsvp: there ? 'accepted' : 'declined' });
      if (there) s.locationId = institution(ed.institutionId).placeId!;
      screeningHappens(s, { id: 'ev', at, kind: 'screening', priority: 31, attention: 'notify', payload: { editionId: ed.id, projectId: p.id, at } });
      return s.events.filter((e) => e.kind === 'distribution-offer' && String(e.payload.wave).includes(':screening:'));
    };
    const present = run(true);
    expect(present).toHaveLength(1);
    expect(present[0].payload.exposure as number).toBeGreaterThan(0);
    expect(run(false)).toHaveLength(0);
  });
});

describe('your own craft grows with your delivered work', () => {
  it('earlier credited work as writer and director raises the script and direction of the same film; uncredited work does not', () => {
    // Before November 10, 2026 your writing and directing were the baseline on every film, however many you had made.
    const credit = (x: Project, contribution: string, roleId: string) => x.credits.push({ id: `${x.id}:${roleId}`, person: 'player', personName: 'You', contribution, roleId, episodes: 'all', billing: 1 });
    const score = (prior: number, credited: boolean) => {
      const s = startLife('cyc-craft');
      for (let i = 0; i < prior; i++) {
        const x = earlier(s, 60, 0, `Earlier ${i}`);
        if (credited) { credit(x, 'Written By', 'writer'); credit(x, 'Directed By', 'director'); }
      }
      const p = next(s);
      return { q: assessQuality(s, p), w: playerExperience(s, p, 'writer'), d: playerExperience(s, p, 'director') };
    };
    const first = score(0, false);
    const third = score(3, true);
    const uncredited = score(3, false);
    expect([third.w, third.d, uncredited.w]).toEqual([3, 3, 0]);
    expect(third.q.script).toBeGreaterThan(first.q.script);
    expect(third.q.direction).toBeGreaterThan(first.q.direction);
    expect(uncredited.q.script).toBe(first.q.script);
    expect(score(9, true).w).toBe(5); // capped
  });
});
