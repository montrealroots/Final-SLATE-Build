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
