// Routes through a genre (src/ideas/routes.ts; the Creative Depth package, milestone C). Every genre in the catalog is
// offered several; a route sets what it names and the work follows; and a route promises nothing about quality.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyIdea, previewIdea } from '../src/engine/brief';
import { LIGHTS, SCORES, SOUNDS, lightOf, scoreOf, soundsOf } from '../src/engine/craft';
import { IDEAS, ideaById, ideasFor } from '../src/ideas';
import { FAMILIES } from '../src/ideas/routes';
import { assessQuality, buildTasks } from './engine-api';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

const catalog = JSON.parse(readFileSync('src/data/genre-catalog.json', 'utf8')).records as { id: string; legacy_parent_label: string }[];
const ROUTES = ideasFor('genre-route');

function film(genre: string): { s: GameState; p: Project } {
  const s = startLife('routes');
  const p = buildProject(s, { title: 'Routes Fixture', format: 'feature', medium: 'live-action' }, [{ name: 'Wren' }], [{ place: 'Office', chars: ['Wren'], minutes: 40 }]);
  p.axes.genres = [{ id: genre, emphasis: 'primary' }];
  return { s, p };
}

describe('routes through a genre', () => {
  it('the families are the catalog\'s own grouping, with every genre in exactly one', () => {
    const key = (label: string) => label.toLowerCase().replace(/ /g, '-');
    const fromCatalog: Record<string, string[]> = {};
    for (const r of catalog) (fromCatalog[key(r.legacy_parent_label)] ??= []).push(r.id);
    for (const k of Object.keys(fromCatalog)) fromCatalog[k].sort();
    expect(FAMILIES).toEqual(fromCatalog);
    expect(Object.values(FAMILIES).flat().length).toBe(149);
  });

  it('every genre in the catalog is offered at least four routes', () => {
    expect(ROUTES).toHaveLength(68);
    for (const g of catalog) {
      const mine = ROUTES.filter((r) => r.fits?.genres?.includes(g.id));
      expect(mine.length, g.id).toBeGreaterThanOrEqual(4);
    }
    // Written once each: no two routes share a label, a tone or a first scene.
    for (const pick of [(r: (typeof ROUTES)[number]) => r.label, (r: (typeof ROUTES)[number]) => r.text, (r: (typeof ROUTES)[number]) => JSON.stringify(r.patch.find((c) => c.op === 'beats'))]) {
      expect(new Set(ROUTES.map(pick)).size).toBe(ROUTES.length);
    }
  });

  it('each route names only a light, sound choices and a score the game has, and offers three scenes', () => {
    for (const r of ROUTES) {
      for (const c of r.patch) {
        if (c.op === 'light') expect(LIGHTS[c.light], r.id).toBeTruthy();
        if (c.op === 'sound') expect(SOUNDS[c.add], r.id).toBeTruthy();
        if (c.op === 'score') expect(SCORES[c.score], r.id).toBeTruthy();
        if (c.op === 'beats') expect(c.beats, r.id).toHaveLength(3);
      }
      expect(r.patch.filter((c) => c.op === 'tone'), r.id).toHaveLength(1);
      expect(r.kind).toBe('mechanical');
    }
  });

  it('a route sets the light, the sound and the score it names, and the work follows', () => {
    const route = ideaById('route.horror-siege-till-morning')!;
    const plain = film('horror');
    const chosen = film('horror');
    const pre = previewIdea(chosen.p, route, {});
    expect(pre.changes.join(' ')).toMatch(/The Light It Is Shot In: High Contrast/);
    expect(pre.changes.join(' ')).toMatch(/3 scenes are offered\. None is added unless you tick it\./);
    applyIdea(chosen.s, chosen.p, route, {});
    expect([lightOf(chosen.p), soundsOf(chosen.p), scoreOf(chosen.p)]).toEqual(['contrast', ['creature', 'clarity'], 'synth']);
    expect(chosen.p.axes.tone).toBe('Loud and close: a few people, a few doors, and the hours until light.');
    expect(chosen.p.scenes).toHaveLength(1); // nothing ticked, nothing added
    approve(plain.s, plain.p); approve(chosen.s, chosen.p);
    const units = (p: Project, kind: string) => buildTasks(p).filter((t) => t.kind === kind).reduce((a, t) => a + t.units, 0);
    expect(units(chosen.p, 'prep:camera-test')).toBe(2);
    expect(units(plain.p, 'prep:camera-test')).toBe(0);
    expect(units(chosen.p, 'post:color')).toBeCloseTo(units(plain.p, 'post:color') * 1.5, 1);
    // A scene ticked is a scene added, with its place and time.
    const more = film('horror');
    applyIdea(more.s, more.p, route, { beats: [1] });
    expect(more.p.scenes.map((sc) => `${sc.heading.intExt} ${sc.heading.place} ${sc.heading.time}`)).toEqual(['INT Office DAY', 'EXT Yard NIGHT']);
  });

  it('a route promises nothing: with the same work done, the assessment is the same whichever was chosen', () => {
    const a = film('horror');
    const b = film('horror');
    applyIdea(b.s, b.p, ideaById('route.horror-slow-dread-in-one-house')!, {});
    approve(a.s, a.p); approve(b.s, b.p);
    expect(assessQuality(b.s, b.p)).toEqual(assessQuality(a.s, a.p));
  });

  it('is recommended for its own family and not for another', () => {
    const western = ROUTES.filter((r) => r.fits!.genres!.includes('spaghetti-western')).map((r) => r.id);
    expect(western).toEqual(ROUTES.filter((r) => r.id.startsWith('route.western-')).map((r) => r.id));
    expect(IDEAS.filter((x) => x.field === 'genre-route' && x.fits!.genres!.includes('horror')).every((x) => x.id.startsWith('route.horror-'))).toBe(true);
  });
});
