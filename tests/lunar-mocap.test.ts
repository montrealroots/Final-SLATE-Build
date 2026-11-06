import { describe, expect, it } from 'vitest';
import { holidaysForYear, buildTasks, isWorkingDay, approvedScenes } from './engine-api';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';
import { processUntil, DAY } from './engine-api';

describe('sourced 2026 lunar-calendar holidays', () => {
  it('China 2026 follows the State Council notice, including make-up working days', () => {
    const cn = holidaysForYear('CN', undefined, 2026).map((h) => h.date);
    for (const d of ['2026-02-15', '2026-02-23', '2026-04-04', '2026-05-05', '2026-06-19', '2026-09-25', '2026-10-07']) expect(cn).toContain(d);
    expect(cn).not.toContain('2026-02-24');
    const s = startLife('cn');
    const p = buildProject(s, { title: 'X', format: 'short', medium: 'live-action', runtime: 5 }, [{ name: 'A' }], [{ place: 'Room', chars: ['A'] }]);
    p.axes.basePlaceId = 'cn-shanghai';
    expect(isWorkingDay(p, '2026-02-14')).toBe(true); // Saturday make-up working day
    expect(isWorkingDay(p, '2026-02-16')).toBe(false); // Spring Festival
    expect(isWorkingDay(p, '2026-05-09')).toBe(true);
  });
  it('South Korea 2026 includes Seollal, Buddha’s Birthday with substitute, Chuseok, and the new Labour and Constitution days', () => {
    const kr = holidaysForYear('KR', undefined, 2026);
    const on = (d: string) => kr.filter((h) => h.date === d).map((h) => h.name);
    expect(on('2026-02-17').join()).toMatch(/Seollal/);
    expect(on('2026-05-25').length).toBeGreaterThan(0);
    expect(on('2026-09-25').join()).toMatch(/Chuseok/);
    expect(on('2026-05-01')).toContain('Labour Day');
    expect(on('2026-07-17')).toContain('Constitution Day');
    expect(holidaysForYear('KR', undefined, 2025).some((h) => h.name === 'Constitution Day')).toBe(false);
  });
  it('Eid dates are included for 2026 and marked as expected, not official', () => {
    for (const c of ['EG', 'MA', 'AE', 'SA', 'TR', 'NG', 'BF', 'KE']) {
      const fitr = holidaysForYear(c, undefined, 2026).find((h) => /Eid al-Fitr/.test(h.name));
      expect(fitr?.date, c).toBe('2026-03-20');
      expect(fitr?.estimated, c).toBe(true);
    }
    // Years without a sourced table don't invent lunar dates.
    expect(holidaysForYear('EG', undefined, 2028).some((h) => /Eid/.test(h.name))).toBe(false);
  });
});

describe('motion capture', () => {
  it('capture sessions feed animation and the capture performer is paid and credited', () => {
    const s = startLife('mocap');
    const p = buildProject(s, { title: 'Golem', format: 'short', medium: 'animation', technique: '3d-cg', runtime: 3, quality: 'limited' },
      [{ name: 'Golem', patch: { roleSize: 'lead', entity: 'monster', methods: ['voice', 'motion-capture'] } }, { name: 'Child', patch: { roleSize: 'supporting' } }],
      [{ place: 'Quarry', chars: ['Golem', 'Child'], minutes: 1 }]);
    approve(s, p);
    const golem = p.characters.find((c) => c.name === 'Golem')!;
    const tasks = buildTasks(p);
    const cap = tasks.find((t) => t.kind === 'anim:mocap');
    expect(cap?.assetRef).toBe(golem.id);
    const anim = tasks.find((t) => t.kind === 'anim:animation')!;
    expect(anim.dependsOn).toContain(cap!.id);
    // Captured performance reduces keyframe work for that shot.
    const plain = buildProject(s, { title: 'Golem2', format: 'short', medium: 'animation', technique: '3d-cg', runtime: 3, quality: 'limited' },
      [{ name: 'Golem', patch: { roleSize: 'lead', entity: 'monster', methods: ['voice'] } }, { name: 'Child', patch: { roleSize: 'supporting' } }],
      [{ place: 'Quarry', chars: ['Golem', 'Child'], minutes: 1 }]);
    approve(s, plain);
    expect(anim.units).toBeLessThan(buildTasks(plain).find((t) => t.kind === 'anim:animation')!.units);
    castAll(s, p);
    staffAll(s, p);
    for (let i = 0; i < 10; i++) {
      manage(s, p);
      processUntil(s, s.now + DAY, 'tick', 100000);
    }
    startProduction(s, p, 3);
    runDays(s, p, 300);
    expect(p.delivered).not.toBeNull();
    const credit = p.credits.find((c) => c.contribution === 'Performance Capture');
    expect(credit?.characterName).toBe('Golem');
    const h = p.hires.find((x) => x.method === 'motion-capture');
    expect(h?.daysWorked).toBeGreaterThan(0);
    expect(approvedScenes(p).length).toBe(1);
  }, 60000);
});
