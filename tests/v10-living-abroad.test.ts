// Living abroad takes real papers (the owner, November 14, 2026: "make living abroad need real papers"). Until then the
// game assumed a life might live and work wherever it was lived. Now: citizenship, free movement, or a work visa. A life
// that starts abroad arrives on the visa (the owner chose that over arriving without one), its fee paid on the first day;
// it covers all four kinds of work and the stay, runs out on its real term, and can be renewed as its end nears.
import { describe, expect, it } from 'vitest';
import { DAY, processUntil } from './engine-api';
import { acceptRefusal } from '../src/engine/jobs';
import { applications, applyForPermit, applyForVisa, entryRight, homeVisa, moveRefusal, moveTo, permitCheck, refusalChance, sponsorsFor, visaCheck, workRight } from '../src/engine/papers';
import { bankSim } from '../src/engine/bankworld';
import { armHomeAccounts } from '../src/engine/bankworld/systems/abroad';
import { AGENTS } from '../src/engine/representation';
import { travelRefusal } from '../src/engine/state';
import { personalPostings } from '../src/engine/personal';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { draft } from './fixtures';
import { sponsorIn, startLife } from './helpers';
import type { GameState } from '../src/engine/types';

const O1 = 'O-1 (extraordinary ability in the arts, or extraordinary achievement in motion pictures or television)';
const french = (startPlaceId: string, tag: string, over = {}) => newGame(draft({ startPlaceId, birthplaceId: 'fr-paris', nationalities: ['FR'], ...over }), 0, `save-${tag}`);
const four = (s: GameState, c: string) => (['act', 'direct', 'produce', 'write'] as const).map((a) => workRight(s, c, a).can);

describe('a life abroad arrives on the work visa it needs', () => {
  it('a French actress starting in Los Angeles holds the O-1 from the first day, its fee paid, for its three years', () => {
    const s = french('us-los-angeles', 'abroad-la');
    const [visa] = applications(s);
    expect(visa).toMatchObject({ kind: 'permit', all: true, arrival: true, country: 'US', route: O1, stage: 'issued', fee: { minor: 165_500, currency: 'USD', paidUsdMinor: 165_500 } });
    expect(visa.expiresAt! - s.now).toBe(1095 * DAY);
    expect(personalPostings(s).map((p) => [p.kind, p.amount])).toEqual([['inheritance', 25_000_000], ['papers', -1_655]]);
    expect(four(s, 'US')).toEqual([true, true, true, true]); // one visa where you live covers all four kinds of work
    expect(entryRight(s, 'US')).toMatchObject({ kind: 'lives' });
    expect(entryRight(s, 'US').why).toMatch(/^You live in the United States on your O-1 .+, good until \d{4}-\d{2}-\d{2}\.$/);
  });

  it('a citizen at home, or with free movement, holds no visa and pays nothing', () => {
    const paris = french('fr-paris', 'abroad-paris');
    const berlin = french('de-berlin', 'abroad-berlin');
    for (const s of [paris, berlin]) {
      expect(applications(s)).toEqual([]);
      expect(personalPostings(s).map((p) => p.kind)).toEqual(['inheritance']);
    }
    expect(four(berlin, 'DE')).toEqual([true, true, true, true]);
    expect(entryRight(berlin, 'DE').why).toBe('You live in Germany: your passport from France gives you the right to live and work there.');
  });

  it('a life that begins with less than the fee holds the visa, its fee paid before the story began', () => {
    const s = french('us-los-angeles', 'abroad-poor', { inheritance: { currency: 'USD', amountMinor: 0 } });
    expect(applications(s)[0]).toMatchObject({ stage: 'issued', fee: { paidUsdMinor: 0 } });
    expect(personalPostings(s)).toEqual([]);
  });
});

describe('the visa runs out, and is renewed', () => {
  it('ran out, she lives there without the right to, can\'t work there, and can\'t take a job there', () => {
    const s = french('us-los-angeles', 'abroad-lapse');
    const visa = applications(s)[0];
    processUntil(s, visa.expiresAt! + 1000, 'tick', 5_000_000);
    expect(visa.stage).toBe('expired');
    expect(four(s, 'US')).toEqual([false, false, false, false]);
    expect(entryRight(s, 'US')).toMatchObject({ kind: 'unpermitted' });
    expect(s.log.some((l) => l.text.startsWith(`Your ${O1} for the United States has run out. You live there without the right to now`))).toBe(true);
    (s.jobs ??= []).push({ id: 'la-job', role: 'acting', production: 'Harbour', company: 'Fixture Pictures', productionId: 'x', part: 'A part', dayRate: 400, days: ['2030-01-07'], placeId: 'us-los-angeles', zone: 'America/Los_Angeles', status: 'offered', offeredAt: s.now, answerBy: s.now + 7 * DAY, attended: [], missed: [] } as never);
    expect(acceptRefusal(s, 'la-job')).toMatch(/^To act in the United States you need O-1/);
    // Falsifiable: in force, the same job can be taken.
    const fresh = french('us-los-angeles', 'abroad-lapse');
    (fresh.jobs ??= []).push({ ...s.jobs.at(-1)!, answerBy: fresh.now + 7 * DAY, offeredAt: fresh.now } as never);
    expect(acceptRefusal(fresh, 'la-job')).toBeNull();
  }, 120_000);

  it('can be renewed once its end is nearer than its decision and a month, and the new one covers all four kinds of work', () => {
    const s = french('us-los-angeles', 'abroad-renew');
    sponsorIn(s, 'us-los-angeles'); // renewing needs a sponsor there
    const visa = applications(s)[0];
    expect(homeVisa(s)).toMatchObject({ renewable: false });
    expect(permitCheck(s, 'US')).toMatchObject({ ok: false });
    // The O-1 is decided in 135 days: renewable from 165 days before it runs out.
    processUntil(s, visa.expiresAt! - 166 * DAY, 'tick', 5_000_000);
    expect(homeVisa(s)!.renewable).toBe(false);
    processUntil(s, visa.expiresAt! - 164 * DAY, 'tick', 5_000_000);
    expect(homeVisa(s)!.renewable).toBe(true);
    const renewal = applyForPermit(s, 'US');
    expect(renewal).toMatchObject({ all: true, stage: 'applied', fee: { paidUsdMinor: 165_500 } });
    expect(permitCheck(s, 'US')).toEqual({ ok: false, why: 'Your application is being decided.' });
    processUntil(s, visa.expiresAt! + DAY, 'tick', 5_000_000);
    expect([visa.stage, renewal.stage]).toEqual(['expired', 'issued']);
    expect(four(s, 'US')).toEqual([true, true, true, true]);
    expect(entryRight(s, 'US')).toMatchObject({ kind: 'lives' });
  }, 120_000);
});

describe('a story from before', () => {
  it('a save abroad from before living there took papers holds the visa it arrived on, its fee taken as settled, once', () => {
    const s = french('us-los-angeles', 'abroad-old');
    s.paperApplications = [];
    delete s.papersArrival;
    s.events = s.events.filter((e) => e.kind !== 'papers-expiry');
    const postings = personalPostings(s).length;
    const back = deserialize(serialize(s));
    expect(applications(back)).toHaveLength(1);
    expect(applications(back)[0]).toMatchObject({ country: 'US', all: true, fee: { paidUsdMinor: 0 } });
    expect(personalPostings(back)).toHaveLength(postings); // no fee charged on loading
    expect(applications(deserialize(serialize(back)))).toHaveLength(1);
  });
});

// The three left undone (the owner, November 14, 2026: "100% perfectly complete everything in 'Not done'"): visas are
// refused at their published rates, work visas need a sponsor, and a life can move to another country. Travel asks your
// papers too, so a refused visa keeps you out.
describe('a visa can be refused', () => {
  const kenyan = (tag: string) => newGame(draft({ startPlaceId: 'ke-nairobi', birthplaceId: 'ke-nairobi', nationalities: ['KE'] }), 0, `save-${tag}`);

  it('a visitor visa is refused at the published rate for the passport applying, drawn once per application', () => {
    const s = kenyan('refuse-rate');
    const c = visaCheck(s, 'US');
    expect(c).toMatchObject({ ok: true, refusal: { chance: 0.6332 } });
    expect((c as { refusal: { basis: string } }).refusal.basis).toMatch(/^Adjusted refusal rate, B visas only, by nationality, fiscal year 2024: your passport's rate/);
    // Monte Carlo over 120 lives: the share refused is the published 63.32%, within the draw's spread.
    let refused = 0;
    for (let i = 0; i < 120; i++) {
      const x = kenyan(`refuse-mc-${i}`);
      const a = applyForVisa(x, 'US');
      processUntil(x, a.decideAt + DAY, 'tick', 2_000_000);
      if (a.stage === 'refused') refused++;
      else expect(a.stage).toBe('issued');
    }
    expect(refused / 120).toBeGreaterThan(0.5);
    expect(refused / 120).toBeLessThan(0.76);
  }, 300_000);

  it('refused, the fee isn\'t returned, entry still needs a visa, and travel there is refused; issued, travel is allowed', () => {
    let refused: GameState | undefined;
    let issued: GameState | undefined;
    for (let i = 0; i < 12 && !(refused && issued); i++) {
      const x = kenyan(`refuse-outcome-${i}`);
      const a = applyForVisa(x, 'US');
      processUntil(x, a.decideAt + DAY, 'tick', 2_000_000);
      if (a.stage === 'refused') refused ??= x; else issued ??= x;
    }
    const paid = applications(refused!)[0].fee.paidUsdMinor / 100;
    expect(personalPostings(refused!).filter((p) => (p.kind as string) === 'papers').map((p) => p.amount)).toEqual([-paid]); // paid, and not returned
    expect(entryRight(refused!, 'US')).toMatchObject({ kind: 'needs' });
    expect(travelRefusal(refused!, 'us-los-angeles')).toMatch(/you need a visa\. Apply under Your Papers before you travel\.$/);
    expect(travelRefusal(issued!, 'us-los-angeles')).toBeNull();
  }, 120_000);

  it('a work visa\'s chance moves with the record: anchored at the O-1\'s 10% for an established standing', () => {
    const s = french('us-los-angeles', 'refuse-work');
    expect(refusalChance(s, 'permit', 'US').chance).toBeCloseTo(0.1 * 2 ** 0.5, 6); // standing 50, no works yet
    expect(refusalChance(s, 'permit', 'US').basis).toMatch(/^USCIS O-1 petitions approved at 90% or more/);
  });
});

describe('a work visa needs a sponsor', () => {
  it('with no job, project or agent there, no work visa can be applied for; an outside job there is a sponsor, and is named', () => {
    const s = startLife('sponsor-none', 'gb-london', { nationalities: ['JP', 'FR'] });
    expect(sponsorsFor(s, 'US')).toEqual([]);
    expect((permitCheck(s, 'US') as { why: string }).why).toMatch(/^It needs a sponsor, and you have none there: An O-1 is petitioned for by a U\.S\. employer or a U\.S\. agent/);
    sponsorIn(s, 'us-los-angeles');
    expect(permitCheck(s, 'US')).toMatchObject({ ok: true });
    expect((permitCheck(s, 'US') as { needs: string[] }).needs).toContain('A sponsor: Fixture Pictures, for A Fixture Feature');
    expect(applyForPermit(s, 'US').sponsor).toBe('Fixture Pictures, for A Fixture Feature');
  });

  it('an agent sponsors an O-1, where an agent may petition, and not a UK Creative Worker visa, which needs a licensed employer', () => {
    const s = startLife('sponsor-agent', 'fr-paris', { nationalities: ['JP'] });
    s.representation = { current: { agentId: AGENTS[0].id, signedAt: s.now, until: s.now + 365 * DAY } } as never;
    expect(sponsorsFor(s, 'US')[0]).toMatch(/^your agent, /);
    expect(sponsorsFor(s, 'GB')).toEqual([]);
  });
});

describe('moving to another country', () => {
  it('a French citizen on an O-1 in Los Angeles moves to Paris: home, bank and papers follow; to Tokyo she has no right to live', () => {
    const s = french('us-los-angeles', 'move-paris');
    expect(moveRefusal(s, 'jp-tokyo')).toBe('To live in Japan you need the right to: citizenship, free movement, or a work visa there. Apply for one under Your Papers; it needs a sponsor there.');
    expect(() => moveTo(s, 'jp-tokyo')).toThrow();
    const bankHomeBefore = bankSim(s.bank!).player.currentLocationId;
    moveTo(s, 'fr-paris');
    expect(s.character.livesIn).toBe('fr-paris');
    expect(s.travel?.to).toBe('fr-paris');
    expect(bankSim(s.bank!).player.currentLocationId).not.toBe(bankHomeBefore);
    expect(entryRight(s, 'FR')).toMatchObject({ kind: 'home' });
    // The O-1 is still in force for the United States, which she now visits on it.
    expect(entryRight(s, 'US')).toMatchObject({ kind: 'held' });
    expect(s.log[0].text).toBe('You moved from Los Angeles to Paris. You opened a current account at BNP Paribas. You set off now.');
  });

  it('moving keeps every cent: the bank at home closes her account and sends it to the one she opened, less its costs', () => {
    const s = french('gb-london', 'move-money');
    const all = (x: GameState) => { const sim = bankSim(x.bank!); return sim.ledger.accountsOf(sim.universe.playerId).filter((a) => !a.nominal && (a.kind === 'checking' || a.kind === 'savings')).reduce((t, a) => t + a.balance, 0); };
    const before = all(s);
    moveTo(s, 'fr-paris');
    processUntil(s, s.now + 400 * DAY, 'tick', 5_000_000);
    expect(all(s)).toBeGreaterThan(before * 0.97); // payment abroad and fees, never the whole of it
  }, 300_000);

  it('a bank at home never closes an account with money in it and nowhere to send it: it waits, and says so once', () => {
    const s = french('gb-london', 'move-nowhere');
    const sim = bankSim(s.bank!);
    sim.player.currentLocationId = 'fr-idf-paris'; // labelled fixture: living in Paris with no account there
    armHomeAccounts(sim);
    const held = sim.ledger.accountsOf(sim.universe.playerId).find((a) => a.kind === 'checking')!;
    const balance = held.balance;
    processUntil(s, s.now + 400 * DAY, 'tick', 5_000_000);
    expect(held.closedAt).toBeUndefined();
    expect(held.balance).toBeGreaterThan(balance * 0.97);
    expect(sim.universe.notifications.filter((n) => /Can’t Close Your Account Yet/.test(n.title))).toHaveLength(1);
  }, 300_000);

  it('with a work visa issued for Japan, she may move there, and it then covers her stay and all four kinds of work', () => {
    const s = french('fr-paris', 'move-tokyo');
    sponsorIn(s, 'jp-tokyo');
    let a = applyForPermit(s, 'JP');
    processUntil(s, a.decideAt + DAY, 'tick', 5_000_000);
    for (let i = 0; a.stage === 'refused' && i < 6; i++) { a = applyForPermit(s, 'JP'); processUntil(s, a.decideAt + DAY, 'tick', 5_000_000); }
    expect(a.stage).toBe('issued');
    expect(moveRefusal(s, 'jp-tokyo')).toBeNull();
    moveTo(s, 'jp-tokyo');
    expect(a.all).toBe(true);
    expect(four(s, 'JP')).toEqual([true, true, true, true]);
    expect(entryRight(s, 'JP')).toMatchObject({ kind: 'lives' });
  }, 120_000);
});
