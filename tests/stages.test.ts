// SLATE-03-05: the stages a project will go through, shown on the New Script form, follow the choices that decide its work.
import { describe, expect, it } from 'vitest';
import { projectStages } from '../src/engine/stages';

const needs = (a: Parameters<typeof projectStages>[0], stage: string) => projectStages(a).find((x) => x.name === stage)!.needs;

describe('what a project goes through', () => {
  it('lists the five stages for every kind of project, each saying what it needs', () => {
    for (const a of [{ format: 'short', medium: 'live-action', technique: 'none' }, { format: 'documentary-feature', medium: 'live-action', technique: 'none' }, { format: 'series', medium: 'animation', technique: 'stop-motion', episodes: 4 }] as const) {
      expect(projectStages(a).map((x) => x.name)).toEqual(['Development', 'Pre-Production', 'Production', 'Post-Production', 'Delivery And Release']);
    }
  });

  it('changes with the medium, technique and format, as the work built for them does', () => {
    expect(needs({ format: 'short', medium: 'live-action', technique: 'none' }, 'Production')).toMatch(/^Shoot days on location/);
    expect(needs({ format: 'short', medium: 'live-action', technique: 'none' }, 'Pre-Production')).toContain('scout locations');
    expect(needs({ format: 'short', medium: 'animation', technique: 'stop-motion' }, 'Pre-Production')).toContain('build armatures, puppets and sets');
    expect(needs({ format: 'short', medium: 'animation', technique: 'stop-motion' }, 'Production')).toContain('puppets can be damaged');
    expect(needs({ format: 'short', medium: 'animation', technique: '3d-cg' }, 'Production')).toContain('motion capture');
    expect(needs({ format: 'short', medium: 'animation', technique: '2d-drawn' }, 'Production')).not.toContain('motion capture');
    expect(needs({ format: 'short', medium: 'hybrid', technique: '3d-cg' }, 'Production')).toContain('integrating the animated and live-action scenes');
    expect(needs({ format: 'documentary-feature', medium: 'live-action', technique: 'none' }, 'Pre-Production')).toContain('ask contributors for consent');
    expect(needs({ format: 'documentary-feature', medium: 'live-action', technique: 'none' }, 'Post-Production')).toContain('fact checks');
    expect(needs({ format: 'unscripted-series', medium: 'live-action', technique: 'none', episodes: 6 }, 'Pre-Production')).toMatch(/^Write the format rules/);
    expect(needs({ format: 'series', medium: 'live-action', technique: 'none', episodes: 6 }, 'Production')).toContain('for each of the 6 episodes');
    expect(needs({ format: 'feature', medium: 'live-action', technique: 'none' }, 'Production')).not.toContain('episodes');
  });
});
