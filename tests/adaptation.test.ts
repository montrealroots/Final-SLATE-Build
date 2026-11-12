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
    forgetSourceWork(p);
    expect(p.source).toEqual({ kind: 'adapted', work: 'Quixote, moved to a motorway service station' });
  });
});

import { adaptationBlocker, chainOfTitle, exerciseOption, needsOption, optionStanding, optionTerms, renewOption, takeOption } from '../src/engine/adaptation';
import { ledgerTotals } from '../src/engine/budget';
import { generatePlan } from '../src/engine/production/schedule';
import { addLocal, DAY } from '../src/engine/time';

/** The option: this story's own agreement on a work whose rights are not recorded as public domain (V3-A05). */
describe('an option on the work a script adapts', () => {
  const protectedWork: SourceWork = { ...quixote, id: 'wd:Q999999999', title: 'A Protected Novel', creators: [{ id: 'wd:Q1', name: 'Ana Ruiz', role: 'author' }], copyright: [{ status: 'copyrighted' }] };
  const funded = () => { const x = game(); x.p.funding.extra.push({ label: 'A backer, for the test', amount: 100_000, approvalRights: [] }); adaptFrom(x.g, x.p, protectedWork); return x; };

  it('is not asked of a work recorded as public domain, and is asked of one recorded as copyrighted or not recorded at all', () => {
    const { g, p } = game();
    adaptFrom(g, p, { ...quixote, copyright: [{ status: 'public domain', where: 'United States' }] });
    expect([needsOption(p), optionStanding(p, g.now), adaptationBlocker(p, g.now)]).toEqual([false, 'not-needed', null]);
    expect(() => takeOption(g, p)).toThrow("the game asks no option of you. That is the game's rule, not advice.");
    adaptFrom(g, p, { ...quixote, copyright: [] });
    expect([needsOption(p), optionStanding(p, g.now)]).toEqual([true, 'none']);
    expect(adaptationBlocker(p, g.now)).toBe("This script is adapted from Don Quixote, which has no rights status recorded. Take an option on it and exercise the option before planning production (Budget, Adaptation Rights). This is the game's rule for its own story, not advice about the real work.");
  });

  it('prices itself from the production and nothing about the work: 2.5% of the starting fund, a tenth of that for the option', () => {
    const { p } = funded();
    const t = optionTerms(p);
    expect(t.fee * 10).toBe(t.price);
    expect(t).toMatchObject({ months: 18, renewalMonths: 12, territory: 'Worldwide', media: 'film', renewalFee: t.fee, credit: 'Based On A Protected Novel By Ana Ruiz' });
    expect(t.price).toBeGreaterThanOrEqual(2_000);
    // The same production adapting a different work is quoted the same.
    const other = funded();
    adaptFrom(other.g, other.p, { ...protectedWork, title: 'Another', wikipedias: 300 });
    expect(optionTerms(other.p).price).toBe(t.price);
  });

  it('is taken for its fee, renewed once, and exercised for the rest of the price, each paid from the project', () => {
    const { g, p } = funded();
    const t = optionTerms(p);
    const before = ledgerTotals(p).available;
    takeOption(g, p);
    expect(ledgerTotals(p).available).toBe(before - t.fee);
    expect(optionStanding(p, g.now)).toBe('held');
    expect(p.source!.option!.expires).toBe(addLocal(g.now, 'Europe/London', { months: 18 }));
    expect(() => takeOption(g, p)).toThrow('You already hold an option on this work.');
    renewOption(g, p);
    expect(ledgerTotals(p).available).toBe(before - t.fee - t.renewalFee);
    expect(p.source!.option!.expires).toBe(addLocal(addLocal(g.now, 'Europe/London', { months: 18 }), 'Europe/London', { months: 12 }));
    expect(() => renewOption(g, p)).toThrow('This option has been renewed once, which is all it allows.');
    exerciseOption(g, p);
    // The fee counted towards the price; the renewal did not.
    expect(ledgerTotals(p).available).toBe(before - t.price - t.renewalFee);
    expect(optionStanding(p, g.now)).toBe('exercised');
    expect(adaptationBlocker(p, g.now)).toBeNull();
    expect(() => exerciseOption(g, p)).toThrow('The option has been exercised already.');
    expect(p.obligations.filter((o) => o.category === 'licensing').map((o) => o.label)).toEqual(['Option On A Protected Novel', 'Option Renewal: A Protected Novel', 'Rights To A Protected Novel']);
    const chain = chainOfTitle(p, () => 'that day');
    expect(chain).toHaveLength(4);
    expect(chain[3]).toContain('The credit agreed: Based On A Protected Novel By Ana Ruiz.');
  });

  it('runs out: it can no longer be renewed or exercised, production stays refused, and a new one costs its fee again', () => {
    const { g, p } = funded();
    takeOption(g, p);
    const first = p.source!.option!.takenAt;
    g.now = p.source!.option!.expires + DAY;
    expect(optionStanding(p, g.now)).toBe('expired');
    expect(() => exerciseOption(g, p)).toThrow('The option ran out. Take a new one before buying the rights.');
    expect(() => renewOption(g, p)).toThrow('There is no option running to renew.');
    expect(adaptationBlocker(p, g.now)).toContain('The option ran out: take a new one and exercise it before planning production');
    const before = ledgerTotals(p).available;
    takeOption(g, p);
    expect(p.source!.option!.takenAt).not.toBe(first);
    expect(ledgerTotals(p).available).toBe(before - optionTerms(p).fee);
  });

  it('refuses the fee the project cannot pay, and leaves no option behind', () => {
    const { g, p } = game();
    adaptFrom(g, p, protectedWork);
    expect(ledgerTotals(p).available).toBeLessThan(optionTerms(p).fee);
    expect(() => takeOption(g, p)).toThrow();
    expect(p.source!.option).toBeUndefined();
    expect(p.obligations.filter((o) => o.category === 'licensing')).toEqual([]);
  });

  it('holds production until the rights are bought: planning is refused with the reason, then allowed', () => {
    const { g, p } = funded();
    p.approvedDraft = 1 as never;
    expect(() => generatePlan(g, p, '2030-01-01')).toThrow('This script is adapted from A Protected Novel, which is recorded as copyrighted. Take an option on it and exercise the option before planning production');
    takeOption(g, p);
    expect(() => generatePlan(g, p, '2030-01-01')).toThrow('Exercise the option before planning production');
    exerciseOption(g, p);
    // Past the rights, planning goes on to its own rules (this bare project has no approved script to plan from).
    let said = '';
    try { generatePlan(g, p, '2030-01-01'); } catch (e) { said = (e as Error).message; }
    expect(said).not.toContain('adapted from');
  });
});
