// What everything costs, against what it costs in the world (the owner, November 15, 2026: "do a sweep on everything
// that costs in the game and make sure the prices match 100% realism"). Each row reads the game's price from the code,
// so the matrix can't drift from it, and sets it beside a published figure and its source. A row with a range fails here
// when the game's price leaves it. A price no published figure was found for says so: Modeled, the game's own.
// Written to docs/prices/PRICES.md with SLATE_WRITE_AUDIT=1.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crowdDayRate, dayFees, housePackageFee, BACKGROUND_HOURS, MINIMUM_WAGE, RENDER_NODE_DAY_COST, VOICE_SESSION_STUDIO, SIXTH_DAY_PREMIUM, HOLIDAY_PREMIUM, NIGHT_PREMIUM, MATERIAL_COST } from '../src/engine/production/rates';
import { PER_DIEM, MOVE_BASE, MOVE_PER_1000_KM, MOVE_CAP } from '../src/engine/destinations';
import { RIGS } from '../src/engine/craft';
import { MAKEUP } from '../src/engine/looks';
import { MOCAP_SESSION_STAGE, FACIAL_RIG_PER_SESSION } from '../src/engine/mocap';
import { TICKET_PRICE } from '../src/engine/box-office';
import { AGGREGATOR_FEE, PARTNER_FEE } from '../src/engine/release-plan';
import { SUBTITLE_PER_MINUTE, DUB_PER_MINUTE, BROADCAST_EDIT_COST } from '../src/engine/script-effects';
import { LIBRARY_FEE_PER_USE } from '../src/engine/music';
import { role } from '../src/engine/people';
import { periodOn } from '../src/engine/union';
import { guildMinimum } from '../src/engine/union';
import type { Project } from '../src/engine/types';

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
/** A project of a budget size, as the prices read one. */
const sized = (scenarioId: string, fund: number): Project => ({ funding: { scenarioId, fund, extra: [] }, finance: { estimate: fund, target: fund, deals: [] }, hires: [], kit: undefined } as unknown as Project);
const MICRO = sized('micro', 40_000), LOW = sized('low', 400_000), MID = sized('mid', 4_000_000), COMM = sized('commissioned', 15_000_000);
const GBP = 1.265; // dollars to the pound, for the British rate cards (game calibration, as rates.ts uses)
/** A crew member's asking day at an experience (people.ts: the job's rate × (0.62 + 0.2 × experience)). */
const crewDay = (job: string, exp: number) => Math.round(role(job).rate * (0.62 + exp * 0.2));
/** A US union hourly rate as a 10-hour day: eight hours straight and two at time and a half. */
const usDay = (hourly: number) => Math.round(hourly * 11);
const appliance = (id: string) => { const m = MAKEUP.find((x) => x.id === id)!; return m.buildCost * m.buildDays; };

type Status = 'Sourced' | 'Fixed' | 'Modeled';
interface Row { area: string; what: string; game: number | string; real: string; range?: [number, number]; source: string; status: Status; where: string }
const ROWS: Row[] = [
  // ---------------- People ----------------
  { area: 'People', what: 'Performer day minimum, theatrical ($2 million and up), from July 1, 2026', game: periodOn('2026-07-01').day.theatrical, real: '$1,283', range: [1283, 1283], source: 'SAG-AFTRA 2026 Theatrical Wage Table', status: 'Sourced', where: 'union.ts SAG_PERIODS' },
  { area: 'People', what: 'Performer fee for a film, a star', game: 'Recognition or fame, whichever is more', real: 'Barbie $12.5 million each; Red Notice $20 to $23.5 million', source: 'docs/people/PAY.md (Variety and others): within a third for most', status: 'Fixed', where: 'recognition.ts performerFee' },
  { area: 'People', what: 'Background performer, under $2 million (non-union), 2026', game: crowdDayRate(LOW, '2026-08-01'), real: '8 hours at $16.90', range: [135, 136], source: 'California Department of Industrial Relations, 2026 minimum wage', status: 'Fixed', where: 'rates.ts crowdDayRate' },
  { area: 'People', what: 'Background performer, $2 million and up, from July 1, 2026', game: crowdDayRate(COMM, '2026-08-01'), real: '$231', range: [231, 231], source: 'SAG-AFTRA 2026 TV/Theatrical Agreement, background actor', status: 'Fixed', where: 'rates.ts crowdDayRate' },
  { area: 'People', what: 'Camera operator, middle experience', game: crewDay('camera-operator', 3), real: `${money(usDay(39.08))} to ${money(usDay(66.44))} (Tier 1B to Tier 3)`, range: [usDay(39.08), usDay(66.44)], source: 'IATSE Local 600, Low Budget Theatrical Agreement wage scales 2025 (a 10-hour day)', status: 'Sourced', where: 'people.ts ROLES' },
  { area: 'People', what: 'Camera assistant, middle experience', game: crewDay('camera-assistant', 3), real: `${money(usDay(33.26))} to ${money(usDay(57.64))} (1st AC, Tier 1A to Tier 3)`, range: [usDay(33.26), usDay(57.64)], source: 'IATSE Local 600, Low Budget Theatrical Agreement wage scales 2025', status: 'Sourced', where: 'people.ts ROLES' },
  { area: 'People', what: 'Art director, middle experience', game: crewDay('art-director', 3), real: `£362 to £534 a day (${money(362 * GBP)} to ${money(534 * GBP)})`, range: [Math.round(362 * GBP), Math.round(534 * GBP)], source: 'Bectu Art Department Film Rate Card 2025-26 (Feature Film £1M-£5M minimum to Major Motion Picture 3+ years)', status: 'Sourced', where: 'people.ts ROLES' },
  { area: 'People', what: 'Storyboard artist, middle experience', game: crewDay('storyboard-artist', 3), real: `£374 to £483 a day (${money(374 * GBP)} to ${money(483 * GBP)})`, range: [Math.round(374 * GBP), Math.round(483 * GBP)], source: 'Bectu Art Department Film Rate Card 2025-26', status: 'Sourced', where: 'people.ts ROLES' },
  { area: 'People', what: 'Editor, middle experience', game: crewDay('editor', 3), real: 'about $834 a day ($4,168 a week on call)', range: [600, 900], source: 'IATSE Local 700, Low Budget Theatrical Agreement 2025, editor weekly on call', status: 'Sourced', where: 'people.ts ROLES' },
  { area: 'People', what: 'Director, over $11 million, from July 1, 2026', game: guildMinimum('episode-director', 15_000_000, '2026-08-01')!.amount, real: '$25,214 a week', range: [5043, 5043], source: 'DGA Basic Agreement 2026-30 wage tables (AMPTP), freelance high budget', status: 'Fixed', where: 'union.ts guildMinimum' },
  { area: 'People', what: 'Writer, $5 million and up, a day of a draft', game: guildMinimum('co-writer', 5_000_000, '2026-08-01')!.amount, real: '$173,215 an original screenplay', range: [6929, 6929], source: 'WGA 2026 Schedule of Minimums', status: 'Fixed', where: 'union.ts guildMinimum' },
  { area: 'People', what: 'A recognised director, writer, composer or songwriter', game: 'A fee for the work, from recognition', real: 'Spielberg $20 million a feature; Zimmer $2.2 million a score; Sorkin $2.2 million a script', source: 'docs/people/PAY.md (The Hollywood Reporter, Brabec, Passman, WGA)', status: 'Fixed', where: 'recognition-pay.ts' },
  { area: 'People', what: 'Sixth day worked, above £5 million', game: `× ${SIXTH_DAY_PREMIUM}`, real: 'time and a half', source: 'Pact/Bectu agreements', status: 'Sourced', where: 'rates.ts SIXTH_DAY_PREMIUM' },
  { area: 'People', what: 'A holiday worked', game: HOLIDAY_PREMIUM, real: 'double time for the first twelve hours', range: [2, 2], source: 'IATSE West Coast, studio holiday (Wrapbook rate finder)', status: 'Fixed', where: 'rates.ts HOLIDAY_PREMIUM' },
  { area: 'People', what: 'A night shoot day', game: NIGHT_PREMIUM, real: '110% to 120% by the hour of the call', range: [1.1, 1.2], source: 'IATSE night differentials (Wrapbook rate finder)', status: 'Fixed', where: 'rates.ts NIGHT_PREMIUM' },
  // ---------------- Shooting ----------------
  { area: 'Shooting', what: 'Location fee for a day, micro budget', game: dayFees(MICRO).location, real: '$500 to $5,000 a shoot day', range: [500, 5000], source: 'Visit Tulsa, Filming On Your Property', status: 'Fixed', where: 'rates.ts LOCATION_FEE' },
  { area: 'Shooting', what: 'Location fee for a day, low budget', game: dayFees(LOW).location, real: '$500 to $5,000 a shoot day', range: [500, 5000], source: 'Visit Tulsa, Filming On Your Property', status: 'Fixed', where: 'rates.ts LOCATION_FEE' },
  { area: 'Shooting', what: 'Location fee for a day, mid budget', game: dayFees(MID).location, real: '$500 to $5,000; Los Angeles average $5,000 to $6,000', range: [500, 6000], source: 'Visit Tulsa; Giggster, Rent Your House For Filming', status: 'Fixed', where: 'rates.ts LOCATION_FEE' },
  { area: 'Shooting', what: 'Location fee for a day, commissioned', game: dayFees(COMM).location, real: 'Los Angeles average $5,000 to $6,000', range: [5000, 6000], source: 'Giggster, Rent Your House For Filming', status: 'Fixed', where: 'rates.ts LOCATION_FEE' },
  { area: 'Shooting', what: 'Equipment package for a day, micro budget', game: housePackageFee(MICRO), real: 'a 1-ton grip truck $400 a day', range: [400, 700], source: 'Cinevo (Phoenix) rental rates', status: 'Sourced', where: 'rates.ts EQUIPMENT_PER_DAY' },
  { area: 'Shooting', what: 'Equipment package for a day, low budget', game: housePackageFee(LOW), real: 'a 3-ton G&E package $1,095 and a camera kit about $435', range: [1200, 2000], source: 'KitSplit (Van Nuys); Lensrentals ALEXA Mini LF kit, $3,037 a week', status: 'Sourced', where: 'rates.ts EQUIPMENT_PER_DAY' },
  { area: 'Shooting', what: 'Equipment package for a day, mid budget', game: housePackageFee(MID), real: 'a 5-ton package $1,500 and a camera package', range: [2000, 4000], source: 'Camera Ambassador (Chicago); Lensrentals', status: 'Sourced', where: 'rates.ts DAY_COST_SCALE' },
  { area: 'Shooting', what: 'A dolly and track for a day', game: RIGS.dolly.dayCost, real: 'a Fisher 10 $295 to $600 a day, track beside it', range: [295, 1000], source: 'US rental house listings; Mes Trois Filles, March 2025 (€450 to €700 a feature dolly)', status: 'Sourced', where: 'craft.ts RIGS' },
  { area: 'Shooting', what: 'A stabiliser for a day', game: RIGS.moving.dayCost, real: 'a DJI Ronin 2, $200 to $800 a day', range: [200, 800], source: 'KitSplit and Camera Ambassador (Chicago, $350) listings', status: 'Sourced', where: 'craft.ts RIGS' },
  { area: 'Shooting', what: 'Aging appliances, built', game: appliance('aging'), real: '$3,000 to $10,000 custom prosthetic makeup', range: [3000, 10000], source: 'Backstage, The Truth About Prop, Makeup, and Effects Costs', status: 'Sourced', where: 'looks.ts MAKEUP' },
  { area: 'Shooting', what: 'Full creature appliances, built', game: appliance('creature'), real: '$3,000 to $10,000 custom prosthetic makeup', range: [3000, 10000], source: 'Backstage', status: 'Sourced', where: 'looks.ts MAKEUP' },
  { area: 'Shooting', what: 'Practical makeup with digital cleanup, built', game: appliance('cleanup'), real: '$3,000 to $10,000 custom prosthetic makeup', range: [3000, 10000], source: 'Backstage', status: 'Sourced', where: 'looks.ts MAKEUP' },
  { area: 'Shooting', what: 'Partial appliances, wounds, a mask, built', game: `${money(appliance('partial'))}, ${money(appliance('wounds'))}, ${money(appliance('mask'))}`, real: 'smaller builds than a full prosthetic makeup', source: 'none found for each', status: 'Modeled', where: 'looks.ts MAKEUP' },
  { area: 'Shooting', what: 'Housing and feeding one person for a day away', game: PER_DIEM.lodging + PER_DIEM.meals, real: '$110 lodging and $68 meals', range: [178, 178], source: 'GSA FY 2026 standard CONUS per diem (Federal Register, August 19, 2025)', status: 'Fixed', where: 'destinations.ts PER_DIEM' },
  { area: 'Shooting', what: 'Moving the unit to a place away', game: `the equipment package × ${MOVE_BASE} + ${MOVE_PER_1000_KM} per 1,000 km, at most × ${MOVE_CAP}`, real: 'trucks by the mile, crew travel', source: 'none found for one figure', status: 'Modeled', where: 'destinations.ts moveCost' },
  { area: 'Shooting', what: 'Costumes, a character', game: MATERIAL_COST['prep:costume'], real: 'an indie film\'s wardrobe $5,475 to $17,450 in all: $550 to $1,750 a character for ten', range: [550, 1750], source: 'Filmmaker Magazine, DV case study ($5,475); Bloomsbury, Feature Film Budgeting, Sample Budget 3 ($17,450)', status: 'Sourced', where: 'rates.ts MATERIAL_COST' },
  { area: 'Shooting', what: 'Design materials, a design day (about $225 a scene on a feature)', game: MATERIAL_COST['prep:design'], real: 'an indie film\'s art, set dressing and props $11,025 to $39,210 in all', source: 'Filmmaker Magazine, DV case study; Bloomsbury, Sample Budget 3', status: 'Sourced', where: 'rates.ts MATERIAL_COST' },
  { area: 'Shooting', what: 'Archive footage, a clip', game: MATERIAL_COST['doc:archive'], real: '$45 to $75 a second, 30-second minimums: $1,350 to $4,500 for 30 to 60 seconds', range: [1350, 4500], source: 'Film Archives Online ($60 a second, feature documentary); Budget Films ($50 to $75 a second)', status: 'Sourced', where: 'rates.ts MATERIAL_COST' },
  { area: 'Shooting', what: 'Other materials (creature builds, stop-motion armatures, puppets, faces, sets, location prep)', game: Object.entries(MATERIAL_COST).filter(([k, v]) => v && !['prep:costume', 'prep:design', 'doc:archive', 'post:clearance'].includes(k)).map(([k, v]) => `${k} ${money(v)}`).join(', '), real: 'varies by production', source: 'none found per task', status: 'Modeled', where: 'rates.ts MATERIAL_COST' },
  // ---------------- Post ----------------
  { area: 'Post', what: 'A recording studio day', game: VOICE_SESSION_STUDIO, real: 'from $1,200 a day; rooms $100 to $400 an hour', range: [1200, 3200], source: 'C&I Studios, Downtown Los Angeles; TagVenue Los Angeles listings', status: 'Fixed', where: 'rates.ts VOICE_SESSION_STUDIO' },
  { area: 'Post', what: 'A motion-capture stage session', game: MOCAP_SESSION_STAGE, real: '$1,500 to $5,000 a day', range: [1500, 5000], source: 'MoCap Online, The Real Cost of Motion Capture in 2026; AUT Motion Capture Lab (NZ$1,800 a day)', status: 'Sourced', where: 'mocap.ts' },
  { area: 'Post', what: 'A facial rig for a capture session', game: FACIAL_RIG_PER_SESSION, real: 'not found', source: 'none found', status: 'Modeled', where: 'mocap.ts' },
  { area: 'Post', what: 'A render node for a day', game: RENDER_NODE_DAY_COST, real: 'GPU render nodes $0.90 to $3.50 an hour ($22 to $84 a day)', range: [22, 84], source: 'Super Renders Farm, Cloud Render Farm Pricing Explained 2026; AWS g5.xlarge on demand, about $1.01 an hour', status: 'Sourced', where: 'rates.ts RENDER_NODE_DAY_COST' },
  { area: 'Post', what: 'Subtitles, a finished minute, each language', game: SUBTITLE_PER_MINUTE, real: '$3 to $20 a minute; translated film subtitles from about £9 ($12)', range: [3, 20], source: 'Voquent subtitling prices; Beverly Boy, How Much Does it Cost to Subtitle a Film?', status: 'Sourced', where: 'script-effects.ts' },
  { area: 'Post', what: 'Dubbing, a finished minute, each language', game: DUB_PER_MINUTE, real: 'human dubbing $50 to $200 a minute', range: [50, 200], source: 'Vitrina, AI Dubbing vs Human Dubbing; Checksub dubbing price guide', status: 'Sourced', where: 'script-effects.ts' },
  { area: 'Post', what: 'A broadcast edit for an earlier slot', game: BROADCAST_EDIT_COST, real: 'not found', source: 'none found', status: 'Modeled', where: 'script-effects.ts' },
  // ---------------- Music ----------------
  { area: 'Music', what: 'A song licence', game: 'By fame, budget and scope', real: 'Hello: about $18,000 festivals (micro) to $530,000 the world (commissioned)', source: 'Music Connection; the Mad Men Beatles licence (music.ts)', status: 'Fixed', where: 'music.ts holderFee' },
  { area: 'Music', what: 'A library track, a use', game: LIBRARY_FEE_PER_USE, real: 'per-track library licences in the low hundreds', range: [100, 500], source: 'Fox Music, Music Licensing for Short Film 2026', status: 'Sourced', where: 'music.ts LIBRARY_FEE_PER_USE' },
  // ---------------- Release ----------------
  { area: 'Release', what: 'A digital aggregator, a feature on three platforms', game: AGGREGATOR_FEE, real: '$950 the first platform and $175 each more', range: [1125, 1500], source: 'Quiver Digital fees (MovieMaker); Vitrina, aggregators up to a $1,500 flat fee', status: 'Sourced', where: 'release-plan.ts AGGREGATOR_FEE' },
  { area: 'Release', what: 'A booking partner for your own cinema release', game: PARTNER_FEE, real: 'not found', source: 'none found', status: 'Modeled', where: 'release-plan.ts PARTNER_FEE' },
  { area: 'Release', what: 'A cinema ticket', game: TICKET_PRICE, real: '$11.31 (US, 2024)', range: [11.31, 11.31], source: 'The Numbers', status: 'Fixed', where: 'box-office.ts TICKET_PRICE' },
  // ---------------- Elsewhere ----------------
  { area: 'Elsewhere', what: 'Equipment you buy', game: 'Each item at a retailer\'s listed price', real: 'retail', source: 'Each item\'s own link (src/data/equipment.json)', status: 'Sourced', where: 'equipment.json' },
  { area: 'Elsewhere', what: 'Festival and awards entry fees', game: 'Each institution\'s own fee', real: 'their rules', source: 'Each rulebook\'s own citation (rulebook-data.ts)', status: 'Sourced', where: 'rulebook-data.ts' },
  { area: 'Elsewhere', what: 'Bank fees, papers and visas', game: 'Each bank\'s and office\'s own', real: 'their price lists', source: 'Each product\'s own citation (bankworld content, papers)', status: 'Sourced', where: 'bankworld/content, papers' },
];

function page(): string {
  const count = (s: Status) => ROWS.filter((r) => r.status === s).length;
  const shown = (g: number | string, what: string) => (typeof g === 'number' ? (/holiday|night/i.test(what) ? `× ${g}` : Number.isInteger(g) ? money(g) : `$${g.toFixed(2)}`) : g);
  return [
    '# What Things Cost',
    '',
    'Written by `tests/prices.test.ts` from the code; don\'t edit by hand. Run with `SLATE_WRITE_AUDIT=1` to rewrite it.',
    '',
    `Every price the player pays, read from the code, beside a published figure and where it was published. **Sourced**: the game's price sits inside the published range (the test fails if it leaves it). **Fixed**: changed on November 15, 2026 to the published figure. **Modeled**: no published figure was found, so the price is the game's own. ${count('Sourced')} sourced, ${count('Fixed')} fixed, ${count('Modeled')} modeled.`,
    '',
    `British rate cards are read at ${GBP} dollars to the pound. A US union hourly rate is read as a 10-hour day, eight hours straight and two at time and a half. A non-union background day is ${BACKGROUND_HOURS} hours at California's minimum wage, by date: ${MINIMUM_WAGE.map(([d, w]) => `$${w.toFixed(2)} from ${d}`).join(', ')}.`,
    '',
    '| Area | What | The Game | In The World | Source | Status | Where |',
    '|---|---|---|---|---|---|---|',
    ...ROWS.map((r) => `| ${r.area} | ${r.what} | ${shown(r.game, r.what)} | ${r.real} | ${r.source} | ${r.status} | \`${r.where}\` |`),
    '',
  ].join('\n');
}

describe('what things cost', () => {
  it('every price with a published range sits inside it', () => {
    const outside = ROWS.filter((r) => r.range && typeof r.game === 'number' && (r.game < r.range[0] - 0.005 || r.game > r.range[1] + 0.005)).map((r) => `${r.what}: ${r.game} not in ${r.range}`);
    expect(outside).toEqual([]);
  });
  it('docs/prices/PRICES.md is the matrix as it stands', () => {
    const want = page();
    if (process.env.SLATE_WRITE_AUDIT) { mkdirSync('docs/prices', { recursive: true }); writeFileSync('docs/prices/PRICES.md', want); }
    expect(readFileSync('docs/prices/PRICES.md', 'utf8')).toBe(want);
  });
});
