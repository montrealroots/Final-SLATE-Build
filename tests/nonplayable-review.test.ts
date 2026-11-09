// The review of nonplayable roster entries (November 9, 2026, docs/awards/NONPLAYABLE-REVIEW.md). Two entries said the game
// couldn't make the work they recognize, and both were wrong: a part whose story function is Narrator is cast and records
// its narration in post, and New Project offers the Music Video format. These tests play each one into its category.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DAY, buildTasks, checkEligibility, institution, processUntil, requestConsent } from './engine-api';
import { categoryRecipients } from '../src/engine/awards';
import { playerScore } from '../src/engine/awards-results';
import { categoryRuleStatus, rulebook } from '../src/engine';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';
import type { GameState, Project } from '../src/engine/types';

const emmy = (id: string) => institution('emmys').categories.find((c) => c.id === id)!;

function blankDoc(id: string) {
  return {
    id, episode: 1, heading: { intExt: 'INT' as const, place: 'Booth', time: 'DAY' as const }, storyLocation: 'Booth', participants: [] as string[], objective: '', action: '', dialogue: [],
    turningPoint: '', estMinutes: 3, props: [], animals: [], vehicles: [], stunts: '', crowd: 0, intimacy: false, water: false, vfx: [], songs: [], dance: false,
    kind: 'interview' as 'interview' | 'actuality' | 'narration' | 'reconstruction', basis: 'sourced' as const, contributorIds: [] as string[], evidenceIds: [] as string[], intentionalDiscontinuity: false,
  };
}

/**
 * A documentary short shot and delivered through the engine's own production loop, with a cast Narrator and a cast
 * young farmer in a reconstruction. With `narration` the Narrator reads a narration sequence; without it they appear only
 * in the reconstruction, so they are still credited as cast but have narrated nothing.
 */
function narrated(tag: string, narration: boolean): { s: GameState; p: Project } {
  const s = startLife(tag, 'us-los-angeles');
  const p = buildProject(s, { title: 'Salt Roads', format: 'documentary-short', medium: 'live-action', genres: ['documentary'], runtime: 15 },
    [{ name: 'The Narrator', patch: { roleSize: 'small', functions: ['narrator'] } }, { name: 'Young Rosa', patch: { roleSize: 'small', functions: ['protagonist'] } }], []);
  const [narrator, rosa] = p.characters.map((c) => c.id);
  p.contributors.push({ id: 'ct1', name: 'Rosa Delgado', role: 'Salt Farmer', consent: 'not-asked' });
  p.scenes.push(
    { ...blankDoc('a1'), heading: { intExt: 'EXT', place: 'Salt Flats', time: 'DAY' }, storyLocation: 'Salt Flats', kind: 'interview', contributorIds: ['ct1'] },
    { ...blankDoc('a2'), heading: { intExt: 'EXT', place: 'Salt Flats', time: 'DAY' }, storyLocation: 'Salt Flats', kind: 'actuality' },
  );
  p.scenes.push({ ...blankDoc('a3'), heading: { intExt: 'EXT', place: 'Salt Flats', time: 'DAY' }, storyLocation: 'Salt Flats', kind: 'reconstruction', basis: 'dramatized' as never, participants: narration ? [rosa] : [rosa, narrator] });
  if (narration) p.scenes.push({ ...blankDoc('a4'), kind: 'narration', participants: [narrator] });
  approve(s, p);
  requestConsent(s, p, 'ct1');
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < 10; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
  p.contributors[0].consent = 'given';
  startProduction(s, p, 5);
  runDays(s, p, 260);
  return { s, p };
}

describe('Emmys, Category 76: Outstanding Narrator', () => {
  it('a delivered documentary with a cast Narrator and a narration sequence names that narrator; without the sequence, nobody', () => {
    const { s, p } = narrated('narr-yes', true);
    expect(p.delivered).not.toBeNull();
    expect(buildTasks(p).some((t) => t.kind === 'post:narration')).toBe(true); // the narrator records in post
    const got = categoryRecipients(s, p, emmy('narrator'));
    expect(p.credits.filter((c) => c.contribution === 'Cast').map((c) => c.characterName).sort()).toEqual(['The Narrator', 'Young Rosa']);
    expect(got.map((c) => c.characterName)).toEqual(['The Narrator']); // Young Rosa is cast too, but isn't the narrator
    expect(got[0].contribution).toMatch(/Cast/);
    // Judged on the narrator's own performance, not the program's overall quality.
    const own = Object.entries(p.quality!).find(([k]) => k.startsWith(`performance:${p.characters[0].id}:`))![1];
    expect(own).not.toBe(p.quality!.overall);
    expect(playerScore(p, emmy('narrator'), [got[0].id], 'jury')).toBe(own);

    const { s: s2, p: p2 } = narrated('narr-no', false);
    expect(p2.delivered).not.toBeNull();
    expect(p2.credits.filter((c) => c.contribution === 'Cast').map((c) => c.characterName).sort()).toEqual(['The Narrator', 'Young Rosa']);
    expect(categoryRecipients(s2, p2, emmy('narrator'))).toEqual([]); // credited, but read no narration
  }, 120000);

  it('enters under the general rules from version 3; version 2 left it simulated', () => {
    expect(categoryRuleStatus(rulebook('emmys-2026@3'), 'narrator')).toBe('verified');
    expect(categoryRuleStatus(rulebook('emmys-2026@2'), 'narrator')).toBe('simulated');
    expect(categoryRuleStatus(rulebook('emmys-2027@3'), 'narrator')).toBe('projected');
    // A scripted series' narrator isn't a documentary narration (the category's formats).
    expect(emmy('narrator').formats).not.toContain('series');
  });

  it('says what is missing in the player\'s words', () => {
    const { s, p } = narrated('narr-why', false);
    const el = checkEligibility(s, p, s.editions.find((e) => e.id === 'emmys-2027')!, emmy('narrator'));
    expect(el.reasons.join(' ')).toMatch(/No credited narrator: cast a part whose story function is Narrator, and give the program a narration sequence\./);
  }, 120000);
});

describe('SXSW: the Music Video Competition', () => {
  it('takes a music video and nothing else; its jury award goes to the director', () => {
    const sxsw = institution('sxsw');
    const section = sxsw.categories.find((c) => c.id === 'music-videos')!;
    const jury = sxsw.categories.find((c) => c.id === 'music-videos-jury')!;
    expect(section.formats).toEqual(['music-video']);
    expect(jury.parents).toEqual(['music-videos']);
    expect(jury.recipient).toBe('director');
    expect(sxsw.categories.find((c) => c.id === 'shorts')!.formats).not.toContain('music-video');
  });

  it('a delivered music video is eligible for the section; a short film is not', () => {
    const s = startLife('mv', 'us-los-angeles');
    const make = (format: Project['axes']['format'], title: string) => {
      const p = buildProject(s, { title, format, medium: 'live-action', runtime: 4 }, [{ name: 'Singer', patch: { roleSize: 'lead' } }], [{ place: 'Rooftop', chars: ['Singer'], minutes: 4 }]);
      approve(s, p);
      castAll(s, p);
      staffAll(s, p);
      for (let i = 0; i < 6; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
      startProduction(s, p, 5);
      runDays(s, p, 200);
      expect(p.delivered).not.toBeNull();
      return p;
    };
    const mv = make('music-video', 'Night Bus');
    const short = make('short', 'Day Bus');
    const sxsw = institution('sxsw');
    const e = s.editions.filter((x) => x.institutionId === 'sxsw').sort((a, b) => b.start - a.start)[0];
    const section = sxsw.categories.find((c) => c.id === 'music-videos')!;
    const fmt = (p: Project) => checkEligibility(s, p, e, section).reasons.join(' ');
    expect(fmt(mv)).not.toMatch(/format|music video/i);
    expect(fmt(short)).not.toBe('');
  }, 120000);
});

describe('International Emmys: Sports Documentary', () => {
  it('takes a documentary with the Sports genre; without it, says how to declare one', () => {
    const s = startLife('sportsdoc', 'gb-london');
    const doc = (genres: string[]) => {
      const p = buildProject(s, { title: `Final Whistle ${s.projects.length}`, format: 'documentary-feature', medium: 'live-action', genres, runtime: 90 }, [], [{ place: 'Stadium', chars: [], minutes: 3, extra: { kind: 'actuality' } }]);
      approve(s, p);
      return p;
    };
    const cat = institution('international-emmys').categories.find((c) => c.id === 'sports-documentary')!;
    expect(cat.need).toEqual(['sports']);
    const e = s.editions.filter((x) => x.institutionId === 'international-emmys').sort((a, b) => b.start - a.start)[0];
    const why = (p: Project) => checkEligibility(s, p, e, cat).reasons.join(' ');
    expect(why(doc(['documentary', 'sports']))).not.toMatch(/about sport/);
    expect(why(doc(['documentary']))).toMatch(/This award is for documentaries about sport; give the project the Sports genre if it is one\./);
  });
});

describe('the review document', () => {
  it('lists every nonplayable roster entry, so a new one can\'t go unreviewed', () => {
    const review = readFileSync('docs/awards/NONPLAYABLE-REVIEW.md', 'utf8');
    const entries = readdirSync('docs/awards/roster').filter((f) => f.endsWith('.txt')).flatMap((f) =>
      readFileSync(`docs/awards/roster/${f}`, 'utf8').split('\n').filter((l) => l.startsWith('- ')).map((l) => `| ${f.slice(0, -4)} | ${l.slice(2).split(' | ')[0]} |`));
    expect(entries.length).toBe(123);
    expect(entries.filter((e) => !review.includes(e))).toEqual([]);
  });
});
