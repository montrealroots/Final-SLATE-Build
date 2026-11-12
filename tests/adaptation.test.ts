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

import {
  APPROACHES, APPROACH_ORDER, APPROVAL_DAYS, CHANGE_ORDER, PARTICIPATION, adaptationBlocker, approvalRefusal, approvalStanding, chainOfTitle, changesOutsideGrant, exerciseOption, needsOption,
  optionStanding, optionTerms, participationPaid, renewOption, sendForApproval, setSourceChange, takeOption, widenAgreement, widenCost,
} from '../src/engine/adaptation';
import { ledgerTotals } from '../src/engine/budget';
import { receiveIncome } from '../src/engine/finance';
import { generatePlan } from '../src/engine/production/schedule';
import { continueProject as startContinuation } from '../src/engine/sequel';
import { processUntil } from '../src/engine/state';
import { addLocal, DAY } from '../src/engine/time';
import type { GameState } from '../src/engine/types';

const protectedWork: SourceWork = { ...quixote, id: 'wd:Q999999999', title: 'A Protected Novel', creators: [{ id: 'wd:Q1', name: 'Ana Ruiz', role: 'author' }], copyright: [{ status: 'copyrighted' }] };
const funded = () => { const x = game(); x.p.funding.extra.push({ label: 'A backer, for the test', amount: 100_000, approvalRights: [] }); adaptFrom(x.g, x.p, protectedWork); return x; };

/** The option: this story's own agreement on a work whose rights are not recorded as public domain (V3-A05). */
describe('an option on the work a script adapts', () => {

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
    // Bought, and still to be read by the rights holder before production (the approval tests below).
    expect(adaptationBlocker(p, g.now)).toContain("hasn't read this script");
    expect(() => exerciseOption(g, p)).toThrow('The option has been exercised already.');
    expect(p.obligations.filter((o) => o.category === 'licensing').map((o) => o.label)).toEqual(['Option On A Protected Novel', 'Option Renewal: A Protected Novel', 'Rights To A Protected Novel']);
    const chain = chainOfTitle(p, () => 'that day');
    expect(chain).toEqual([
      expect.stringContaining('The work: A Protected Novel, by Ana Ruiz.'),
      `Option taken that day for $${t.fee.toLocaleString('en-US')}: 18 months, worldwide, film only, this project only.`,
      "It is for a faithful adaptation. The work's story, its people, its time and place and its ending, kept. The rights holder reads the approved draft before production, and takes 2.5% of what the project earns, as it arrives.",
      `Renewed that day for $${t.renewalFee.toLocaleString('en-US')}: 12 months more.`,
      `Exercised that day: $${(t.price - t.fee).toLocaleString('en-US')} more paid, $${t.price.toLocaleString('en-US')} in all. The credit agreed: Based On A Protected Novel By Ana Ruiz.`,
      'A sequel or another season is not covered: it needs an agreement of its own.',
    ]);
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
    expect(() => generatePlan(g, p, '2030-01-01')).toThrow("The rights holder of A Protected Novel hasn't read this script. Send them the approved draft before planning production");
    sendForApproval(g, p);
    expect(() => generatePlan(g, p, '2030-01-01')).toThrow('is reading the draft you sent');
    processUntil(g, g.now + (APPROVAL_DAYS + 1) * DAY, 'tick', 100000);
    expect(approvalStanding(p)).toBe('approved');
    // Past the rights and the approval, planning goes on to its own rules (this bare project has no approved script to plan from).
    let said = '';
    try { generatePlan(g, p, '2030-01-01'); } catch (e) { said = (e as Error).message; }
    expect(said).not.toContain('rights holder');
    expect(said).not.toContain('adapted from');
  });
});

describe('how closely it follows the work, and the rights holder reading it', () => {
  const wait = (g: GameState, days: number) => processUntil(g, g.now + days * DAY, 'tick', 100000);
  const bought = (approach: 'faithful' | 'updated' | 'free' = 'faithful') => {
    const w = funded();
    w.p.approvedDraft = 1 as never; // labelled fixture: an approved draft to send
    takeOption(w.g, w.p, approach);
    exerciseOption(w.g, w.p);
    return w;
  };

  it('latitude is priced: a freer adaptation costs more, by the same rule for every production', () => {
    const { p } = funded();
    const [a, b, c] = APPROACH_ORDER.map((x) => optionTerms(p, x));
    expect([a.approach, b.approach, c.approach]).toEqual(['faithful', 'updated', 'free']);
    expect(b.price).toBe(Math.round((a.price * 1.15) / 100) * 100);
    expect(c.price).toBe(Math.round((a.price * 1.4) / 100) * 100);
    expect([a, b, c].every((t) => t.fee === Math.round(t.price / 10) && t.participation === PARTICIPATION)).toBe(true);
    expect(APPROACHES.faithful.allows).toEqual([]);
    expect(APPROACHES.updated.allows).toEqual(['setting', 'period']);
    expect(APPROACHES.free.allows).toEqual(CHANGE_ORDER);
  });

  it('they approve a draft whose declared changes the agreement allows, and refuse one that goes past it, naming what', () => {
    const { g, p } = bought('updated');
    setSourceChange(p, 'period', true);
    setSourceChange(p, 'setting', true);
    expect(changesOutsideGrant(p)).toEqual([]);
    sendForApproval(g, p);
    expect(approvalRefusal(p, g.now)).toBe('They are reading the draft you sent.');
    wait(g, APPROVAL_DAYS + 1);
    expect(p.source!.approval).toMatchObject({ draft: 1, changes: ['setting', 'period'], outcome: 'approved' });
    expect(adaptationBlocker(p, g.now)).toBeNull();
    expect(g.log.some((l) => l.text === 'The rights holder of A Protected Novel approved draft 1 of ' + p.title + '.')).toBe(true);

    const other = bought('faithful');
    setSourceChange(other.p, 'ending', true);
    setSourceChange(other.p, 'period', true);
    sendForApproval(other.g, other.p);
    wait(other.g, APPROVAL_DAYS + 1);
    expect(other.p.source!.approval).toMatchObject({ outcome: 'refused', reason: 'Your agreement is for a faithful adaptation, and the script changes when it happens and how it ends. Keep those as the work has them, or widen the agreement.' });
    expect(adaptationBlocker(other.p, other.g.now)).toContain("didn't approve the draft. Your agreement is for a faithful adaptation");
    // Kept as the work has them, and sent again: approved.
    setSourceChange(other.p, 'ending', false);
    setSourceChange(other.p, 'period', false);
    sendForApproval(other.g, other.p);
    wait(other.g, APPROVAL_DAYS + 1);
    expect(approvalStanding(other.p)).toBe('approved');
  });

  it('an approval is for the draft and the changes they read: a later draft, or a change declared since, is sent again', () => {
    const { g, p } = bought('free');
    sendForApproval(g, p);
    wait(g, APPROVAL_DAYS + 1);
    expect(approvalStanding(p)).toBe('approved');
    expect(approvalRefusal(p, g.now)).toBe('They have approved this draft.');
    setSourceChange(p, 'ending', true);
    expect(approvalStanding(p)).toBe('stale');
    expect(adaptationBlocker(p, g.now)).toContain('The script has changed since the rights holder of A Protected Novel approved it.');
    setSourceChange(p, 'ending', false);
    expect(approvalStanding(p)).toBe('approved');
    p.approvedDraft = 2 as never;
    expect(approvalStanding(p)).toBe('stale');
    sendForApproval(g, p);
    wait(g, APPROVAL_DAYS + 1);
    expect(p.source!.approval).toMatchObject({ draft: 2, outcome: 'approved' });
  });

  it('widening the agreement costs the difference, before or after the rights are bought, and lets a refused draft pass', () => {
    const held = funded();
    takeOption(held.g, held.p, 'faithful');
    const t0 = held.p.source!.option!.terms;
    const free = optionTerms(held.p, 'free');
    expect(widenCost(held.p, 'free')).toBe(free.fee - t0.fee);
    expect(widenCost(held.p, 'faithful')).toBeNull();
    const before = ledgerTotals(held.p).available;
    widenAgreement(held.g, held.p, 'free');
    expect(ledgerTotals(held.p).available).toBe(before - (free.fee - t0.fee));
    expect(held.p.source!.option!.terms).toMatchObject({ approach: 'free', price: free.price, fee: free.fee });
    expect(() => widenAgreement(held.g, held.p, 'updated')).toThrow('The agreement already allows that much.');
    // Exercised after widening: the whole of the wider price has been paid, no more and no less.
    exerciseOption(held.g, held.p);
    const paid = held.p.obligations.filter((o) => o.category === 'licensing').reduce((n, o) => n + o.settled, 0);
    expect(paid).toBe(free.price);
    expect(chainOfTitle(held.p, () => 'that day')).toContain(`Option taken that day for $${t0.fee.toLocaleString('en-US')}: 18 months, worldwide, film only, this project only.`);
    expect(chainOfTitle(held.p, () => 'that day')).toContain(`Widened that day to freely adapted for $${(free.fee - t0.fee).toLocaleString('en-US')}.`);

    const { g, p } = bought('faithful');
    setSourceChange(p, 'ending', true);
    sendForApproval(g, p);
    wait(g, APPROVAL_DAYS + 1);
    expect(approvalStanding(p)).toBe('refused');
    const cost = widenCost(p, 'free')!;
    expect(cost).toBe(optionTerms(p, 'free').price - optionTerms(p, 'faithful').price);
    widenAgreement(g, p, 'free');
    expect(p.obligations.filter((o) => o.category === 'licensing').reduce((n, o) => n + o.settled, 0)).toBe(optionTerms(p, 'free').price);
    sendForApproval(g, p);
    wait(g, APPROVAL_DAYS + 1);
    expect(approvalStanding(p)).toBe('approved');
  });

  it('an agreement from before approaches existed asks no approval and pays no share', () => {
    const { g, p } = funded();
    takeOption(g, p);
    exerciseOption(g, p);
    delete p.source!.option!.terms.approach; delete p.source!.option!.terms.participation; // labelled fixture: as #75 saved it
    expect(approvalStanding(p)).toBe('not-needed');
    expect(adaptationBlocker(p, g.now)).toBeNull();
    expect(receiveIncome(g, p, 10_000, 'a distributor')).toBe(10_000);
    expect(participationPaid(p)).toBe(0);
  });
});

describe('the rights holder\'s share, statements and what a sequel needs', () => {
  it('takes 2.5% of income off the top once the rights are bought, each payment a statement, and nothing before', () => {
    const { g, p } = funded();
    takeOption(g, p, 'faithful');
    expect(receiveIncome(g, p, 10_000, 'a distributor')).toBe(10_000);
    expect(participationPaid(p)).toBe(0);
    exerciseOption(g, p);
    expect(receiveIncome(g, p, 40_000, 'Northgate Films')).toBe(39_000);
    expect(receiveIncome(g, p, 8_000, 'Northgate Films')).toBe(7_800);
    expect(p.source!.option!.statements).toEqual([{ at: g.now, from: 'Northgate Films', income: 40_000, share: 1_000 }, { at: g.now, from: 'Northgate Films', income: 8_000, share: 200 }]);
    expect(participationPaid(p)).toBe(1_200);
    expect(g.log[0].text).toContain('$200 to the rights holder of A Protected Novel (their share)');
    expect(chainOfTitle(p, () => 'that day')).toContain('Statement that day: $1,000 to the rights holder, their share of $40,000 from Northgate Films.');
    // What they have been paid is the statements added up: change one and it changes.
    p.source!.option!.statements![0].share = 1;
    expect(participationPaid(p)).toBe(201);
    expect(deserialize(serialize(g)).projects.find((x) => x.id === p.id)!.source).toEqual(p.source);
  });

  it('a sequel carries the work and none of the agreement: it needs its own option and its own approval', () => {
    const { g, p } = funded();
    takeOption(g, p, 'free');
    exerciseOption(g, p);
    p.delivered = { at: g.now, runtimeMin: 90 }; // labelled fixture: delivered
    const next = startContinuation(g, p);
    expect(next.source).toEqual({ kind: 'adapted', work: p.source!.work, ref: p.source!.ref });
    expect(optionStanding(next, g.now)).toBe('none');
    expect(adaptationBlocker(next, g.now)).toContain('Take an option on it and exercise the option before planning production');
  });
});
