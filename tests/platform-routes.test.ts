// Real services' doors (src/engine/platform-routes.ts; the owner's v7 package, REL01-REL08): each film's standing comes
// from the save, not a promise. Netflix needs a representative or a festival; Prime's subscription side is by invitation
// only; uploading anywhere needs a delivered film; Vimeo On Demand's closure shows only once its page was read.
import { describe, expect, it } from 'vitest';
import { AGENTS } from '../src/engine/representation';
import { PLATFORM_ROUTES, routeStandings } from '../src/engine/platform-routes';
import { buildProject, startLife } from './helpers';

const standing = (rows: ReturnType<typeof routeStandings>) => Object.fromEntries(rows.map((r) => [r.route.id, r.standing]));

describe('real services\' release routes', () => {
  it('stand for a film by what the save holds: an agent, a festival selection, delivery, and the date', () => {
    const s = startLife('routes');
    const p = buildProject(s, { title: 'Harbour Lights', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Pier', chars: ['Ada'], minutes: 3 }]);
    expect(standing(routeStandings(s, p, '2026-03-01'))).toEqual({ netflix_pitch: 'needs', netflix_festival: 'needs', prime_tvod: 'needs', prime_svod: 'closed', apple_transactional: 'needs', youtube: 'needs', vimeo_legacy: 'unknown' });
    // Labelled fixtures: an agent signed, the film delivered and selected at a festival.
    s.representation = { approaches: [], past: [], current: { agentId: AGENTS[0].id, signedAt: s.now, until: s.now + 1e10 } } as never;
    p.delivered = { at: s.now, runtimeMin: 10 };
    s.editions[0].entries.push({ id: 'x', projectId: p.id, categoryId: 'c', status: 'selected' } as never);
    const now = routeStandings(s, p, '2026-11-14');
    expect(standing(now)).toEqual({ netflix_pitch: 'open', netflix_festival: 'open', prime_tvod: 'open', prime_svod: 'closed', apple_transactional: 'open', youtube: 'open', vimeo_legacy: 'closed' });
    expect(now.find((r) => r.route.id === 'netflix_pitch')!.why).toContain(`${AGENTS[0].name} represents you and can submit it. Netflix may still pass.`);
    expect(now.find((r) => r.route.id === 'youtube')!.why).toContain('an upload earns nothing by itself');
    expect(now.find((r) => r.route.id === 'vimeo_legacy')!.why).toContain('closing on November 20, 2026');
    expect(routeStandings(s, p, '2026-11-20').find((r) => r.route.id === 'vimeo_legacy')!.why).toBe('It closed on November 20, 2026.');
  });

  it('name a source for each, read on its date, and promise no income', () => {
    expect(PLATFORM_ROUTES).toHaveLength(7);
    for (const r of PLATFORM_ROUTES) {
      expect(r.source.url).toMatch(/^https:\/\//);
      expect(r.source.checked).toBe('2026-11-13');
      expect((r as unknown as { guaranteed_income: boolean }).guaranteed_income).toBe(false);
    }
  });
});
