// Stage 5 of the gameplay-depth package: auditions, callbacks and chemistry reads (SLATE-09-02).
import { describe, expect, it } from 'vitest';
import { CALLBACK_SPREAD, DAY, FIRST_SPREAD, castPlayer, assessQuality, pairChemistry, personById, processUntil, roleCandidates, upcomingCommitments } from '../src/engine';
import { AUDITION_NOTICE_DAYS, callBack, chemistryPartners, inviteRefusal, inviteToAudition, setShortlisted } from '../src/engine/casting-calls';
import { deserialize, serialize } from '../src/engine/save';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

function twoParts(tag: string): { s: GameState; p: Project } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Night Ferry', format: 'short', medium: 'live-action', runtime: 10 },
    [{ name: 'Ines', patch: { roleSize: 'lead' } }, { name: 'Marco', patch: { roleSize: 'supporting' } }, { name: 'Crowd', patch: { roleSize: 'background' } }],
    [{ place: 'Dock', chars: ['Ines', 'Marco', 'Crowd'], minutes: 3 }]);
  approve(s, p);
  return { s, p };
}
const wait = (s: GameState, days: number) => processUntil(s, s.now + days * DAY, 'tick', 100_000);
const ines = (p: Project) => p.characters.find((c) => c.name === 'Ines')!.id;
const marco = (p: Project) => p.characters.find((c) => c.name === 'Marco')!.id;

describe('inviting performers to read', () => {
  it('a read is a range that contains their real capability; a callback narrows it, still containing it', () => {
    const { s, p } = twoParts('aud-read');
    const people = roleCandidates(s, p, 'actor').slice(0, 6);
    const invited = people.map((x) => inviteToAudition(s, p, ines(p), 'on-camera', x.id));
    expect(upcomingCommitments(s, s.now, s.now + 10 * DAY).filter((c) => c.label.startsWith('Audition: ')).length).toBe(invited.filter((a) => a.status === 'invited').length);
    wait(s, AUDITION_NOTICE_DAYS + 4);
    const seen = invited.filter((a) => a.status === 'seen');
    expect(seen.length).toBeGreaterThan(0);
    for (const a of seen) {
      const cap = personById(s, a.personId).capability;
      expect(a.read![1] - a.read![0]).toBe(FIRST_SPREAD);
      expect(cap).toBeGreaterThanOrEqual(a.read![0]);
      expect(cap).toBeLessThanOrEqual(a.read![1]);
    }
    const a = seen[0];
    callBack(s, p, a.id);
    expect(() => callBack(s, p, a.id)).toThrow('They have been called back already.');
    wait(s, AUDITION_NOTICE_DAYS + 4);
    if (a.callback!.status === 'seen') {
      expect(a.read![1] - a.read![0]).toBe(CALLBACK_SPREAD);
      expect(personById(s, a.personId).capability).toBeGreaterThanOrEqual(a.read![0]);
      expect(personById(s, a.personId).capability).toBeLessThanOrEqual(a.read![1]);
    } else expect(a.callback!.status).toBe('missed');
  });

  it('background parts, cast parts and repeat invitations are refused with a reason; someone who missed can be asked again', () => {
    const { s, p } = twoParts('aud-refuse');
    const who = roleCandidates(s, p, 'actor')[0];
    const crowd = p.characters.find((c) => c.name === 'Crowd')!.id;
    expect(inviteRefusal(s, p, crowd, 'on-camera', who.id)).toBe('Background parts are covered by the crowd budget, without auditions.');
    inviteToAudition(s, p, ines(p), 'on-camera', who.id);
    expect(inviteRefusal(s, p, ines(p), 'on-camera', who.id)).toBe('They have been asked to read for this part already.');
    p.auditions![0].status = 'missed'; // labelled fixture: they didn't come
    expect(inviteRefusal(s, p, ines(p), 'on-camera', who.id)).toBeNull();
    castPlayer(s, p, marco(p), 'on-camera');
    expect(inviteRefusal(s, p, marco(p), 'on-camera', who.id)).toBe('Marco is cast already.');
  });

  it('someone booked on the session day declines, saying so, and the others still read', () => {
    const { s, p } = twoParts('aud-busy');
    const [busy, free] = roleCandidates(s, p, 'actor');
    busy.busy.push({ from: '2026-01-01', to: '2026-12-31' }); // labelled fixture: booked all year elsewhere
    const a = inviteToAudition(s, p, ines(p), 'on-camera', busy.id);
    const b = inviteToAudition(s, p, ines(p), 'on-camera', free.id);
    expect(a.status).toBe('declined');
    expect(a.reason).toMatch(/is booked on another production .* They can't come to read on \d{4}-\d{2}-\d{2}\./);
    wait(s, AUDITION_NOTICE_DAYS + 4);
    expect(['seen', 'missed']).toContain(b.status);
  });

  it('a shortlist and a pending callback survive a save', () => {
    const { s, p } = twoParts('aud-save');
    const a = inviteToAudition(s, p, ines(p), 'on-camera', roleCandidates(s, p, 'actor')[0].id);
    a.status = 'seen'; a.read = [50, 72]; // labelled fixture: they read
    setShortlisted(p, a.id, true);
    callBack(s, p, a.id);
    const back = deserialize(serialize(s)).projects.find((x) => x.id === p.id)!.auditions![0];
    expect(back).toEqual(a);
  });
});

describe('chemistry', () => {
  it('a chemistry read reveals the pair\'s modeled chemistry, which moves their performances in shared scenes', () => {
    const { s, p } = twoParts('aud-chem');
    castPlayer(s, p, marco(p), 'on-camera');
    const a = inviteToAudition(s, p, ines(p), 'on-camera', roleCandidates(s, p, 'actor')[0].id);
    a.status = 'seen'; a.read = [40, 62]; // labelled fixture: they read
    expect(chemistryPartners(s, p, a)).toEqual([{ personId: 'player', label: 'You (cast as Marco)' }]);
    callBack(s, p, a.id, 'player');
    wait(s, AUDITION_NOTICE_DAYS + 4);
    if (a.callback!.status === 'seen') expect(a.callback!.chemistry).toBe(pairChemistry(s, a.personId, 'player'));
    // The effect, whether read or not: half the pair's chemistry, in the scene they share.
    p.cast.push({ characterId: ines(p), performer: a.personId, method: 'on-camera', note: '' });
    const chem = pairChemistry(s, a.personId, 'player');
    expect(pairChemistry(s, 'player', a.personId)).toBe(chem);
    const q = assessQuality(s, p);
    const alone = JSON.parse(JSON.stringify(p)) as Project;
    alone.scenes = alone.scenes.map((x) => ({ ...x, participants: x.participants.filter((c) => c !== marco(p)) }));
    alone.drafts.forEach((d) => d.scenes.forEach((x) => { x.participants = x.participants.filter((c) => c !== marco(p)); }));
    const q2 = assessQuality(s, alone);
    expect(chem).not.toBe(0); // this world seed's pair has some chemistry, so the effect is visible
    // Scores are whole numbers, so the half-weighted chemistry arrives rounded: within one point.
    expect(Math.abs(q[`performance:${ines(p)}:${a.personId}`] - q2[`performance:${ines(p)}:${a.personId}`] - chem * 0.5)).toBeLessThanOrEqual(1);
  });
});
