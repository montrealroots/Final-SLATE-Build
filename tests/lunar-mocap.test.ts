import { describe, expect, it } from 'vitest';
import { holidaysForYear, buildTasks, isWorkingDay, approvedScenes } from './engine-api';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';
import { processUntil, DAY, depsMet, ledgerTotals, bookMocap, cancelMocapBooking, stageBlock, requestRetake, approveTake, takeChangeImpact, mocapRecord, obligation, MOCAP_SESSION_STAGE, MOCAP_CANCEL_SHARE } from './engine-api';

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
    // book -> calibrate -> capture -> cleanup and retarget -> animation
    expect(cap!.dependsOn).toContain(`anim:mocap-calib:${golem.id}`);
    const cleanup = tasks.find((t) => t.kind === 'anim:mocap-cleanup')!;
    expect(cleanup.dependsOn).toEqual(expect.arrayContaining([cap!.id, `anim:rig:${golem.id}`]));
    const anim = tasks.find((t) => t.kind === 'anim:animation')!;
    expect(anim.dependsOn).toContain(cleanup.id);
    expect(anim.dependsOn).not.toContain(cap!.id);
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
    // The stage was paid from the booking, one session at a time.
    const rec = p.mocap![golem.id];
    expect(rec.approvedTakeId).not.toBeNull();
    const booking = p.obligations.find((o) => o.ref === `mocap:${golem.id}`)!;
    const sessions = booking.postings.filter((x) => x.kind === 'settle');
    expect(sessions.length).toBe(p.tasks.filter((t) => t.kind === 'anim:mocap' || t.kind === 'anim:mocap-calib').reduce((a, t) => a + t.units, 0));
    expect(new Set(sessions.map((x) => x.key)).size).toBe(sessions.length);
  }, 60000);

  function capturedProject(tag: string) {
    const s = startLife(tag);
    const p = buildProject(s, { title: 'Golem', format: 'short', medium: 'animation', technique: '3d-cg', runtime: 3, quality: 'limited' },
      [{ name: 'Golem', patch: { roleSize: 'lead', entity: 'monster', methods: ['voice', 'motion-capture'] } }, { name: 'Child', patch: { roleSize: 'supporting' } }],
      [{ place: 'Quarry', chars: ['Golem', 'Child'], minutes: 1 }, { place: 'Cave', chars: ['Golem'], minutes: 1 }]);
    approve(s, p);
    castAll(s, p);
    staffAll(s, p);
    for (let i = 0; i < 10; i++) {
      processUntil(s, s.now + DAY, 'tick', 100000);
      castAll(s, p);
      staffAll(s, p);
    }
    startProduction(s, p, 3);
    const golem = p.characters.find((c) => c.name === 'Golem')!;
    return { s, p, golem };
  }

  it('waits for a booking, which reserves the stage; cancelling keeps the stated fee and releases the rest', () => {
    const { s, p, golem } = capturedProject('mocap-book');
    const calib = p.tasks.find((t) => t.id === `anim:mocap-calib:${golem.id}`)!;
    expect(depsMet(p, calib)).toEqual({ ok: false, reason: expect.stringMatching(/Book the capture stage first|Waiting for/) });
    const before = ledgerTotals(p).available;
    bookMocap(s, p, golem.id);
    const cost = 3 * MOCAP_SESSION_STAGE; // calibration plus two scenes
    expect(before - ledgerTotals(p).available).toBe(cost);
    expect(() => bookMocap(s, p, golem.id)).toThrow(/already booked/);
    const { fee, released } = cancelMocapBooking(s, p, golem.id);
    expect(fee).toBe(Math.round(cost * MOCAP_CANCEL_SHARE));
    expect(released).toBe(cost - fee);
    expect(before - ledgerTotals(p).available).toBe(fee);
    expect(stageBlock(p, golem.id)).toMatch(/cancelled/);
    bookMocap(s, p, golem.id); // rebooking works
    expect(stageBlock(p, golem.id)).toBeNull();
  }, 60000);
});

describe('motion capture takes', () => {
  it('a changed take resets cleanup and its animation; a retake adds a session to the booking', () => {
    const s = startLife('mocap-take2');
    const p = buildProject(s, { title: 'Golem', format: 'short', medium: 'animation', technique: '3d-cg', runtime: 3, quality: 'limited' },
      [{ name: 'Golem', patch: { roleSize: 'lead', entity: 'monster', methods: ['voice', 'motion-capture'] } }],
      [{ place: 'Quarry', chars: ['Golem'], minutes: 1 }]);
    approve(s, p);
    castAll(s, p);
    staffAll(s, p);
    for (let i = 0; i < 10; i++) {
      processUntil(s, s.now + DAY, 'tick', 100000);
      castAll(s, p);
      staffAll(s, p);
    }
    startProduction(s, p, 3);
    const golem = p.characters.find((c) => c.name === 'Golem')!;
    bookMocap(s, p, golem.id);
    const cap = p.tasks.find((t) => t.id === `anim:mocap:${golem.id}`)!;
    for (let i = 0; i < 200 && cap.status !== 'done'; i++) processUntil(s, s.now + DAY, 'tick', 100000);
    const rec = mocapRecord(p, golem.id);
    expect(rec.takes.length).toBe(cap.units);
    expect(rec.takes.every((t) => t.quality >= 0 && t.quality <= 100)).toBe(true);
    // Cleanup waits for a chosen take.
    const cleanup = p.tasks.find((t) => t.id === `anim:mocap-cleanup:${golem.id}`)!;
    for (let i = 0; i < 200 && /^Waiting for/.test(depsMet(p, cleanup).reason ?? ''); i++) processUntil(s, s.now + DAY, 'tick', 100000);
    expect(depsMet(p, cleanup).reason).toBe('Choose the approved take first.');
    // A retake adds one session and one session's stage cost to the same booking line.
    const booking = p.obligations.find((o) => o.ref === `mocap:${golem.id}`)!;
    const amount = booking.amount;
    requestRetake(s, p, golem.id);
    expect(booking.amount).toBe(amount + MOCAP_SESSION_STAGE);
    expect(cap.status).toBe('waiting');
    for (let i = 0; i < 60 && cap.status !== 'done'; i++) processUntil(s, s.now + DAY, 'tick', 100000);
    expect(rec.takes.length).toBe(cap.units);
    expect(rec.takes.at(-1)!.retake).toBe(true);
    approveTake(p, golem.id, rec.takes[0].id);
    for (let i = 0; i < 200 && cleanup.done === 0; i++) processUntil(s, s.now + DAY, 'tick', 100000);
    expect(cleanup.done).toBeGreaterThan(0);
    // Changing the take after cleanup started resets it.
    expect(takeChangeImpact(p, golem.id).map((t) => t.id)).toContain(cleanup.id);
    const reset = approveTake(p, golem.id, rec.takes.at(-1)!.id);
    expect(reset.map((t) => t.id)).toContain(cleanup.id);
    expect(cleanup.done).toBe(0);
    // The performer was paid once per working day, never twice, though they also voice the role.
    const h = p.hires.find((x) => x.method === 'motion-capture')!;
    const keys = obligation(p, h.obligationId!).postings.filter((x) => x.kind === 'settle').map((x) => x.key);
    expect(new Set(keys).size).toBe(keys.length);
  }, 60000);
});
