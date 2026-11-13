import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { adaptFrom, adaptRefusal, basedOn, forgetSourceWork } from '../src/engine/adaptation';
import { applySources, rightsLine, type SourceWork } from '../src/engine/sources';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import type { Format } from '../src/engine/types';
import { createProject } from '../src/engine/projects';
import { draft } from './fixtures';

/** Adapting a catalog work (the v3 package, 02; acceptance T05): what choosing one changes, and what it never claims. */
const catalog = applySources(JSON.parse(readFileSync('src/data/sources.json', 'utf8')));
const quixote = catalog.records.find((w) => w.title === 'Don Quixote')!;
const make = (g: ReturnType<typeof newGame>, title: string, format: Format) => createProject(g, { title, axes: { format, medium: 'live-action', episodeCount: 1 }, scenarioId: 'low' });
const game = () => { const g = newGame(draft(), 0, 'save-adapt'); const p = make(g, 'A Film', 'feature'); return { g, p }; };

describe('adapting a work from the catalog', () => {
  it('changes Source Material and Adapted From and nothing else, and keeps the record as it stood', () => {
    const { g, p } = game();
    p.story.logline = 'Mine.';
    const before = JSON.stringify({ ...p, source: undefined });
    adaptFrom(g, p, quixote);
    expect(p.source).toEqual({ kind: 'adapted', work: 'Don Quixote by Miguel de Cervantes', ref: { id: quixote.id, title: 'Don Quixote', medium: 'novel', year: 1605, creators: ['Miguel de Cervantes'], standing: quixote.copyright.length ? expect.any(String) : 'not-recorded', recorded: rightsLine(quixote), at: g.now } });
    expect(JSON.stringify({ ...p, source: undefined })).toBe(before);
    // It survives a save and a load as it was recorded.
    const again = deserialize(serialize(g)).projects[0];
    expect(again.source).toEqual(p.source);
  });

  it('never calls a work free to use: the standing is what was recorded, and a record that changes later does not change the save', () => {
    const { g, p } = game();
    const copy: SourceWork = { ...quixote, copyright: [] };
    adaptFrom(g, p, copy);
    expect(p.source!.ref!.standing).toBe('not-recorded');
    expect(p.source!.ref!.recorded).toBe('Wikidata records no copyright status for it. Its rights are unknown to the game.');
    copy.copyright.push({ status: 'public domain', where: 'United States' });
    expect(p.source!.ref!.standing).toBe('not-recorded');
  });

  it('names a credit from the record: authors by name, a game by its developer, nobody where none is recorded', () => {
    expect(basedOn({ title: 'A Book', creators: [{ id: 'wd:Q1', name: 'Ana Ruiz', role: 'author' }, { id: 'wd:Q2', name: 'Li Wei', role: 'author' }] })).toBe('A Book by Ana Ruiz and Li Wei');
    expect(basedOn({ title: 'A Game', creators: [{ id: 'wd:Q3', name: 'Quiet Studio', role: 'developer' }] })).toBe('A Game, developed by Quiet Studio');
    expect(basedOn({ title: 'An Old Epic', creators: [] })).toBe('An Old Epic');
  });

  it('refuses a delivered project and a documentary, each with its reason, and changes nothing', () => {
    const { g, p } = game();
    p.delivered = { at: g.now } as never;
    expect(adaptRefusal(p)).toBe('This project is delivered. What it was adapted from is part of its record now.');
    expect(() => adaptFrom(g, p, quixote)).toThrow('This project is delivered');
    expect(p.source).toBeUndefined();
    const doc = make(g, 'A Documentary', 'documentary-feature');
    expect(adaptRefusal(doc)).toContain("A documentary isn't adapted from a work of fiction.");
  });

  it('lets the work go and keeps the writer\'s own words', () => {
    const { g, p } = game();
    adaptFrom(g, p, quixote);
    p.source!.work = 'Quixote, moved to a motorway service station';
    forgetSourceWork(g, p);
    expect(p.source).toEqual({ kind: 'adapted', work: 'Quixote, moved to a motorway service station' });
  });
});

import { APPROACHES, APPROACH_ORDER, chainOfTitle, creditLine, participationPaid } from '../src/engine/adaptation';
import { money } from '../src/engine/budget';
import { receiveIncome } from '../src/engine/finance';
import { generatePlan } from '../src/engine/production/schedule';
import { continueProject as startContinuation } from '../src/engine/sequel';
import { processUntil, schedule } from '../src/engine/state';
import { DAY } from '../src/engine/time';
import type { SourceOption } from '../src/engine/types';

const protectedWork: SourceWork = { ...quixote, id: 'wd:Q999999999', title: 'A Protected Novel', creators: [{ id: 'wd:Q1', name: 'Ana Ruiz', role: 'author' }], copyright: [{ status: 'copyrighted' }] };
const funded = () => { const x = game(); x.p.funding.extra.push({ label: 'A backer, for the test', amount: 100_000, approvalRights: [] }); adaptFrom(x.g, x.p, protectedWork); return x; };
/** Labelled fixture: an agreement as a save made it between November 12 and 13, 2026, when the game asked for one. */
const agreement = (at: number, exercised: boolean): SourceOption => ({
  terms: { approach: 'faithful', participation: 0.025, price: 5_000, fee: 500, renewalFee: 500, months: 18, renewalMonths: 12, territory: 'Worldwide', media: 'film', credit: 'Based On A Protected Novel By Ana Ruiz' },
  takenAt: at, ...(exercised ? { exercisedAt: at } : {}),
});

/** Copyright is credited, not cleared (the owner, November 13, 2026; adaptation.ts "Copyright"). */
describe('a copyrighted work is credited, and nothing blocks the production', () => {
  it('the credit says what it is based on, who made it, and its recorded copyright, for each standing', () => {
    const { g, p } = funded();
    expect(creditLine(p)).toBe('Based on A Protected Novel, by Ana Ruiz. A Protected Novel is recorded as copyrighted; its rights belong to their holders.');
    adaptFrom(g, p, { ...quixote, copyright: [{ status: 'public domain', where: 'United States' }] });
    expect(creditLine(p)).toBe(`Based on Don Quixote, by ${quixote.creators.map((c) => c.name).join(' and ')}. Don Quixote is recorded as public domain.`);
    adaptFrom(g, p, { ...quixote, copyright: [] });
    expect(creditLine(p)).toBe(`Based on Don Quixote, by ${quixote.creators.map((c) => c.name).join(' and ')}. No copyright status is recorded for Don Quixote.`);
    forgetSourceWork(g, p);
    expect(creditLine(p)).toBe(`Based on ${p.source!.work}.`);
    const own = game();
    expect(creditLine(own.p)).toBeNull();
  });

  it('plans a copyrighted work\'s production with no option, purchase or approval', () => {
    const { g, p } = funded();
    p.approvedDraft = 1 as never;
    let said = '';
    try { generatePlan(g, p, '2030-01-01'); } catch (e) { said = (e as Error).message; }
    // This bare project has no approved script to plan from; what stops it is that, never the work's rights.
    expect(said).not.toContain('rights holder');
    expect(said).not.toContain('adapted from');
    expect(said).not.toContain('option');
  });

  it('a sequel carries the work and its credit, and asks nothing either', () => {
    const { g, p } = funded();
    p.delivered = { at: g.now, runtimeMin: 90 }; // labelled fixture: delivered
    const next = startContinuation(g, p);
    expect(next.source).toEqual({ kind: 'adapted', work: p.source!.work, ref: p.source!.ref });
    expect(creditLine(next)).toBe(creditLine(p));
  });

  it('the approaches still shape the proposal, and say what each keeps', () => {
    expect(APPROACH_ORDER.map((a) => APPROACHES[a].label)).toEqual(['Faithful', 'Moved To Another Time Or Place', 'Freely Adapted']);
  });
});

describe('an agreement a save made while the game asked for one stands as it was made', () => {
  it('its rights holder is still paid their share once the rights were bought, each payment a statement, and nothing before', () => {
    const { g, p } = funded();
    p.source!.option = agreement(g.now, false);
    expect(receiveIncome(g, p, 10_000, 'a distributor')).toBe(10_000);
    expect(participationPaid(p)).toBe(0);
    p.source!.option.exercisedAt = g.now;
    expect(receiveIncome(g, p, 40_000, 'Northgate Films')).toBe(39_000);
    expect(receiveIncome(g, p, 8_000, 'Northgate Films')).toBe(7_800);
    expect(p.source!.option.statements).toEqual([{ at: g.now, from: 'Northgate Films', income: 40_000, share: 1_000 }, { at: g.now, from: 'Northgate Films', income: 8_000, share: 200 }]);
    expect(participationPaid(p)).toBe(1_200);
    expect(g.log[0].text).toContain('$200 to the rights holder of A Protected Novel (their share)');
    expect(chainOfTitle(p, () => 'that day')).toContain('Statement that day: $1,000 to the rights holder, their share of $40,000 from Northgate Films.');
    // What they have been paid is the statements added up: change one and it changes.
    p.source!.option.statements![0].share = 1;
    expect(participationPaid(p)).toBe(201);
    expect(deserialize(serialize(g)).projects.find((x) => x.id === p.id)!.source).toEqual(p.source);
  });

  it('a draft that was out for approval needs no answer, and its scheduled answer changes nothing', () => {
    const { g, p } = funded();
    p.source!.option = agreement(g.now, true);
    p.source!.approval = { draft: 1, sentAt: g.now };
    schedule(g, g.now + 7 * DAY, 'source-approval', { projectId: p.id, sentAt: g.now });
    const before = JSON.stringify(p.source);
    processUntil(g, g.now + 8 * DAY, 'tick', 100000);
    expect(JSON.stringify(p.source)).toBe(before);
    expect(chainOfTitle(p, () => 'that day')).toContain('Draft 1 sent to the rights holder that day. No answer is needed now.');
  });

  it('stays in the record when the project changes its work: what was paid stays paid, and a draft out no longer counts', () => {
    const { g, p } = funded();
    p.source!.option = agreement(g.now, false);
    p.source!.approval = { draft: 1, sentAt: g.now };
    adaptFrom(g, p, protectedWork); // the same work again changes nothing
    expect(p.source!.option).toBeDefined();
    adaptFrom(g, p, { ...protectedWork, id: 'wd:Q999999998', title: 'Another Protected Novel' });
    expect(p.sourceHistory).toEqual([{ ref: expect.objectContaining({ title: 'A Protected Novel' }), option: expect.objectContaining({ takenAt: g.now }), approval: expect.objectContaining({ draft: 1 }), endedAt: g.now }]);
    expect(p.source!.option).toBeUndefined();
    expect(chainOfTitle(p, () => 'today').at(-1)).toBe(`Earlier: A Protected Novel. Option taken today; ${money(0)} paid, which stays paid. Let go today: no right to it remains. Draft 1 was with its rights holder; their answer no longer applies.`);
    forgetSourceWork(g, p);
    expect(p.sourceHistory!.length).toBe(1);
    expect(deserialize(serialize(g)).projects[0].sourceHistory).toEqual(p.sourceHistory);
  });
});
