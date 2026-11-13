// The people an article lists, for a work whose story names too few (the owner, November 13, 2026: the works with one
// person or none were to be fixed). tools/sources/plots.mjs castOf reads a Characters section or a "List of …
// characters" article; proposal.ts adds those people after the story's own, credits the article, and sets none of them
// against or beside the lead unless the story shows it or a review says so.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { castOf } from '../tools/sources/plots.mjs';
import { createFromSource, proposeFromSource } from '../src/engine/proposal';
import { blueprintProblems } from '../src/engine/blueprints';
import { startLife } from './helpers';
import { creditLine } from '../src/engine/adaptation';
import type { SourceWork } from '../src/engine/sources';
import type { Project } from '../src/engine/types';

const catalog = JSON.parse(readFileSync('src/data/sources.json', 'utf8')) as { records: SourceWork[] };
const stories = JSON.parse(readFileSync('src/data/plots.json', 'utf8')) as { plots: Record<string, SourceWork['plot']> };
const GENRES = new Set((JSON.parse(readFileSync('src/data/genre-registry.json', 'utf8')) as { records: { id: string }[] }).records.map((r) => r.id));
const work = (title: string) => { const w = catalog.records.find((x) => x.title === title)!; return { ...w, plot: stories.plots[w.id] }; };
const propose = (title: string) => proposeFromSource({ work: work(title), format: 'feature', approach: 'faithful', gameYear: 2027, genres: GENRES });

describe('the people an article lists', () => {
  it('reads each way a characters section is written, and nothing that is not a name', () => {
    // A name, then a dash or a colon; a comma before "a"; a character's own heading; "voiced by" lines; an actor "as" a part.
    expect(castOf('Rip Van Winkle – A henpecked husband\nDame Van Winkle – his wife\nWolf – his dog', 'Rip Van Winkle').map((x) => x.name)).toEqual(['Dame Van Winkle', 'Wolf']);
    expect(castOf('Prince Raoden: the prince of Arelon.\nThe cursed cannot die, except by burning.', 'Elantris')).toEqual([{ name: 'Prince Raoden' }]);
    expect(castOf('Cameron "Cam" Walden, a human woman.\nZill, a student. Carefree, friendly and kind.', 'ZooPhobia')).toEqual([{ name: 'Cameron Walden', also: ['Cam'] }, { name: 'Zill' }]);
    expect(castOf("=== The doctor's wife ===\nThe only one who keeps her sight.\n=== The doctor ===\nAn eye doctor.", 'Blindness').map((x) => x.name)).toEqual(["The doctor's wife", 'The doctor']);
    expect(castOf('Linden (린덴) / Ron (론)\nVoiced by: Yōhei Azakami\nThe crown prince of the empire.', 'Doctor Elise')).toEqual([{ name: 'Linden', also: ['Ron'] }]);
    expect(castOf('Kenji Akabane as Mi Liu (弥流)\nEri Kitamura as Anji (左安琪)', 'Time Prisoners', { actorsAs: true }).map((x) => x.name)).toEqual(['Mi Liu', 'Anji']);
    // A group heading with headings under it, and a deeper group, are not people.
    expect(castOf('=== Kunugigaoka Junior High School ===\n==== Teachers ====\nTadaomi Karasuma\nVoiced by: Kazuhiro Nakaya', 'Assassination Classroom').map((x) => x.name)).toEqual(['Tadaomi Karasuma']);
    // A paragraph listing people between semicolons; sentence openers aren't names.
    const prose = `${'These freedom fighters include his grandfather, who is usually just referred to by a nickname that the family uses'}; Bastille, Grandpa's bodyguard; Sing Sing - Sing for short - a cousin; and Quentin, another cousin. Unfortunately, the Librarians are many and they rule the world in secret, as the book tells it at length.`;
    expect(castOf(prose, 'Alcatraz Versus the Evil Librarians').map((x) => x.name)).toEqual(['Bastille', 'Sing Sing', 'Quentin']);
  });

  it('gives the works whose story names one person or none the people their article lists, credited, in no role the story doesn\'t show', () => {
    const rip = propose('Rip Van Winkle');
    const people = rip.blueprint.characters.map((c) => c.name);
    expect(people.slice(0, 3)).toEqual(['Rip Van Winkle', 'Dame Van Winkle', 'Rip Van Winkle Jr.']); // the son is not the father
    expect(rip.blueprint.characters.slice(1).every((c) => c.functions[0] === 'none')).toBe(true);
    // A story too short to read sets no one against anyone: the co-host listed second isn't Uramichi's antagonist.
    expect(propose('Life Lessons with Uramichi Oniisan').blueprint.characters.slice(1).map((c) => c.functions[0])).toEqual(['none', 'none', 'none', 'none', 'none']);
    expect(rip.why.characters).toContain('listed in the Characters section of the English Wikipedia article "Rip Van Winkle" (CC BY-SA 4.0)');
    expect(rip.why.characters).toContain('the brief says "they" until you set them');
    // One person under another name is not added twice; two who share a family name are two people.
    expect(propose('Persepolis').blueprint.characters.map((c) => c.name)).not.toContain('Marjane');
    expect(propose('Fox Spirit Matchmaker').blueprint.characters.map((c) => c.name)).toEqual(expect.arrayContaining(['Tushan Susu', 'Tushan Yaya']));
    // Reviewed: Elantris is Raoden's story, against Hrathen, beside Sarene; Hoid stays, and the magic system is no one.
    const elantris = propose('Elantris').blueprint.characters.map((c) => [c.name, c.functions[0]]);
    expect(elantris.slice(0, 3)).toEqual([['Prince Raoden', 'protagonist'], ['Gyorn Hrathen', 'antagonist'], ['Princess Sarene', 'ally']]);
    expect(elantris.map((x) => x[0])).not.toContain('Aons');
    // The project's credits name the article the names came from.
    const p = { source: { kind: 'adapted', ref: { id: work('Rip Van Winkle').id, title: 'Rip Van Winkle', creators: [], standing: 'public-domain-recorded' } }, proposal: { workId: work('Rip Van Winkle').id, cast: rip.blueprint.origin!.cast } } as unknown as Project;
    expect(creditLine(p)).toContain('Some of its characters\' names are from the Characters section of the English Wikipedia article "Rip Van Winkle" (CC BY-SA 4.0).');
  }, 30_000);

  it('a story with one person has that one, no antagonist, and says so; the project is whole with one character', () => {
    const r = propose('The Mystery of Marie Rogêt');
    expect(r.blueprint.characters.map((c) => [c.name, c.functions[0]])).toEqual([['C. Auguste Dupin', 'protagonist']]);
    expect(r.notes).toContain("This story doesn't identify another character. You can add one or continue.");
    expect(blueprintProblems(r.blueprint, GENRES)).toEqual([]);
    const s = startLife('one-person');
    const p = createFromSource(s, { work: work('The Mystery of Marie Rogêt'), axes: { format: 'feature', medium: 'live-action' }, scenarioId: 'low', approach: 'faithful', genres: GENRES });
    expect(p.characters.map((c) => c.name)).toEqual(['C. Auguste Dupin']);
    expect(p.relationships).toEqual([]);
    expect(p.scenes.length).toBeGreaterThan(0);
    expect(p.scenes.every((x) => x.participants.every((id) => p.characters.some((c) => c.id === id)))).toBe(true);
  }, 30_000);
});
