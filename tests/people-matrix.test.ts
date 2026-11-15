// The coverage matrix of real people's grades and pay (November 15, 2026; the owner's ask for "real grades on their skill
// based off how everybody of importance sees them" and "real SAG payouts"): every performer and crew member the
// industry's record recognises, with what the record says, the capability and grade the game reads from it, and what
// they ask; and the game's fees beside fees that were reported. Written from the code and the data: run with
// SLATE_WRITE_AUDIT=1 to rewrite it; the test fails when the files differ from what the code now says.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyRecognition, capabilityFrom, describeStanding, experienceFrom, filmFeeFrom, recognisedIn, standingOf, BODY_WEIGHT, BODY_NAME, LEAD_DAYS, NOMINATION_SHARE, type Body } from '../src/engine/recognition';
import { crewAskFrom } from '../src/engine/recognition-pay';
import { gradeFrom, gradeScore } from '../src/engine/grades';
import { SAG_PERIODS, AGREEMENT_CEILING, AGREEMENT_NAME } from '../src/engine/union';

const data = applyRecognition(JSON.parse(readFileSync('src/data/recognition.json', 'utf8')));
const YEAR = 2026; // the year the game starts in
const csv = (xs: (string | number)[]) => xs.map((x) => (typeof x === 'string' && /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : String(x))).join(',');
const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const PERFORMING = ['actor', 'voice-actor'];

/** The rows for one job: who, what the record says, and what the game makes of it. */
function rows(job: string): string[] {
  return recognisedIn(job, YEAR).map(({ tmdbId, name, standing }) => {
    const exp = experienceFrom(standing);
    const cap = capabilityFrom(exp, standing.points);
    const day = PERFORMING.includes(job) ? Math.round(filmFeeFrom(standing.points) / LEAD_DAYS) : crewAskFrom(job, exp, standing.points);
    return csv([tmdbId, name, job, describeStanding(standing), standing.points, exp, cap, gradeFrom(gradeScore(exp, cap)), day]);
  });
}

const CREW = [...new Set(data.categories.flatMap((c) => c.jobs))].filter((j) => !PERFORMING.includes(j)).sort();
const HEAD = 'tmdb_person,name,job,recognition (Wikidata),weight,experience,capability,grade,asks a day';

/** Fees reported for a film (Variety, July 2022, as others reported it: Modeled assumption), against the game's for the year of the deal. */
const REPORTED: { tmdb: number; name: string; film: string; year: number; fee: number }[] = [
  { tmdb: 6193, name: 'Leonardo DiCaprio', film: 'Killers of the Flower Moon', year: 2022, fee: 30_000_000 },
  { tmdb: 73421, name: 'Joaquin Phoenix', film: 'Joker: Folie à Deux', year: 2022, fee: 20_000_000 },
  { tmdb: 73421, name: 'Joaquin Phoenix', film: 'Joker', year: 2018, fee: 4_500_000 },
  { tmdb: 234352, name: 'Margot Robbie', film: 'Barbie', year: 2022, fee: 12_500_000 },
  { tmdb: 30614, name: 'Ryan Gosling', film: 'Barbie', year: 2022, fee: 12_500_000 },
  { tmdb: 237405, name: 'Lady Gaga', film: 'Joker: Folie à Deux', year: 2022, fee: 10_000_000 },
  { tmdb: 8784, name: 'Daniel Craig', film: 'Knives Out sequels (each of two)', year: 2021, fee: 50_000_000 },
];

function payPage(): string {
  const lines = [
    '# What People Are Paid',
    '',
    "Written by `tests/people-matrix.test.ts` from the code; don't edit by hand. Run with `SLATE_WRITE_AUDIT=1` to rewrite it.",
    '',
    '## SAG-AFTRA Minimums',
    '',
    "A performer is paid at least the minimum of the SAG-AFTRA agreement the production's budget falls under (`src/engine/union.ts`). Sources and their status are in `docs/depth/PRODUCTION-SOURCES.md`.",
    '',
    `| From | ${AGREEMENT_CEILING.map(([a, max]) => `${AGREEMENT_NAME[a].replace('SAG-AFTRA ', '')}, to ${money(max)}`).join(' | ')} | Theatrical, A Day | Theatrical, A Week | Background, Theatrical |`,
    `|---|${AGREEMENT_CEILING.map(() => '---|').join('')}---|---|---|`,
    ...SAG_PERIODS.map((p) => `| ${p.from} | ${AGREEMENT_CEILING.map(([a]) => money(p.day[a])).join(' | ')} | ${money(p.day.theatrical)} | ${money(p.week)} | ${money(p.background)} |`),
    '',
    '## Fees From Recognition',
    '',
    `A recognised performer's fee for a film is the game's curve on the weight of their recognition: $250,000 × (1 + weight ÷ 4)^1.5, at most $30 million, asked as a day rate over ${LEAD_DAYS} days, and never under the SAG-AFTRA minimum. A win weighs ${Object.entries(BODY_WEIGHT).map(([b, w]) => `${w} at the ${BODY_NAME[b as Body][1]}`).join(', ')}; a nomination weighs ${NOMINATION_SHARE} of a win. The weights and the curve are the game's: Modeled assumption.`,
    '',
    'Beside fees that were reported, at the weight of recognition recorded before the year of each deal. Recognition explains what prestige is paid. It does not explain what drawing an audience is paid, which the game has no record of (it reads no popularity figure), so a star paid for that is under-priced here.',
    '',
    "| Performer | Film | Year | Reported | Weight Then | The Game's Fee | Game ÷ Reported |",
    '|---|---|---|---|---|---|---|',
    ...REPORTED.map((r) => {
      const w = standingOf(r.tmdb, 'actor', r.year)?.points ?? 0;
      const fee = filmFeeFrom(w);
      return `| ${r.name} | ${r.film} | ${r.year} | ${money(r.fee)} | ${w} | ${money(fee)} | ${(fee / r.fee).toFixed(2)} |`;
    }),
    '',
    `Every recognised performer and crew member, with their grade and what they ask: \`docs/people/PERFORMERS.csv\` and \`docs/people/CREW.csv\`. Recognition from ${data.source.provider} (${data.source.licence}), retrieved ${data.source.retrieved}.`,
    '',
  ];
  return lines.join('\n');
}

describe('the coverage matrix of real people', () => {
  const performers = [HEAD, ...PERFORMING.flatMap(rows)].join('\n') + '\n';
  const crew = [HEAD, ...CREW.flatMap(rows)].join('\n') + '\n';
  const pay = payPage();
  if (process.env.SLATE_WRITE_AUDIT) {
    mkdirSync('docs/people', { recursive: true });
    writeFileSync('docs/people/PERFORMERS.csv', performers);
    writeFileSync('docs/people/CREW.csv', crew);
    writeFileSync('docs/people/PAY.md', pay);
  }
  it('lists every recognised performer and crew member with a grade and a price', () => {
    expect(readFileSync('docs/people/PERFORMERS.csv', 'utf8')).toBe(performers);
    expect(readFileSync('docs/people/CREW.csv', 'utf8')).toBe(crew);
    expect(readFileSync('docs/people/PAY.md', 'utf8')).toBe(pay);
  });
  it('covers makeup, hair and costume among the crafts', () => {
    expect(crew).toMatch(/,hair-makeup,/);
    expect(crew).toMatch(/,costume-designer,/);
    expect(CREW).toEqual(expect.arrayContaining(['dop', 'editor', 'production-designer', 'composer', 'sound-mixer', 'vfx-artist']));
  });
});
