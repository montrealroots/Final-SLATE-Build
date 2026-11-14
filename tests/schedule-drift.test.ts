// Scenes an approved change moves away from the built schedule (production/schedule.ts scheduleDrift; the owner's v6
// package, 05: "Your changes affect six scenes. Review the revised schedule before confirming."). The count is the
// state's, never a typed number.
import { describe, expect, it } from 'vitest';
import { scheduleDrift } from '../src/engine/production/schedule';
import { approvedScenes } from '../src/engine/projects';
import { approve, buildProject, castAll, staffAll, startLife, startProduction } from './helpers';

describe('a schedule an approved change has moved', () => {
  it('counts the scenes no day holds and the days that hold scenes now gone, and nothing before a schedule', () => {
    const s = startLife('drift');
    const p = buildProject(s, { title: 'Pier', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Pier', chars: ['Ada'], minutes: 2 }, { place: 'Kitchen', chars: ['Ada'], minutes: 2 }]);
    approve(s, p);
    expect(scheduleDrift(p)).toEqual([]); // no schedule yet
    castAll(s, p);
    staffAll(s, p);
    startProduction(s, p, 2);
    expect(scheduleDrift(p)).toEqual([]); // built from this draft
    // Labelled fixture: a newly approved scene the schedule doesn't hold, and one the schedule holds that is gone.
    const [pier, kitchen] = approvedScenes(p);
    const added = { ...pier, id: 'sc-added' };
    p.drafts[p.drafts.length - 1].scenes = [added, pier];
    expect(approvedScenes(p).map((x) => x.id)).toEqual(['sc-added', pier.id]);
    expect(scheduleDrift(p).sort()).toEqual(['sc-added', kitchen.id].sort());
  });
});
