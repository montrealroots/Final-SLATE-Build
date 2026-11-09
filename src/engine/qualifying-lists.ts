// The organizers' qualifying-festival lists, edition by edition (types and rules in rulebooks.ts). Loaded with the
// festival and awards catalog through awards-rules.ts, not at startup.
import type { QualifyingAward, QualifyingList } from './rulebooks';

const exact = (institution: string, category: string, listed: string): QualifyingAward => ({ institution, category, listed, match: 'exact' });

/** Every qualifying list ever shipped. Append only. */
export const QUALIFYING_LISTS: QualifyingList[] = [
  {
    id: 'aa99-shorts', institutionId: 'oscars', year: 2027, window: { from: '2025-10-01', to: '2026-09-30' },
    source: 'aa99-shorts-festivals', section: 'Short Films Qualifying Festival List (combined list for all three Short Films categories, updated April 10, 2026); Rules Eight, Fourteen and Seventeen, paragraph II.A.2',
    awards: [
      exact('annecy', 'short-cristal', 'Annecy: Cristal for a Short Film'),
      exact('annecy', 'short-jury', 'Annecy: Best Jury Award – Short Films Competition'),
      exact('berlinale', 'shorts-golden-bear', 'Berlinale: Golden Bear for Best Short Film'),
      exact('canadian-screen', 'short-animated', 'Canadian Screen Awards: Best Animated Short'),
      exact('canadian-screen', 'short-drama', 'Canadian Screen Awards: Best Live Action Short Drama'),
      exact('canadian-screen', 'short-documentary', 'Canadian Screen Awards: Best Short Documentary'),
      exact('cannes', 'short-palme', 'Cannes: Palme d\u2019Or – Best Short Film'),
      exact('cesar', 'short-fiction', 'César: Best Short Fiction Film'),
      exact('cesar', 'short-animation', 'César: Best Animated Short Film'),
      exact('cesar', 'short-documentary', 'César: Best Documentary Short Film'),
      exact('clermont', 'grand-prix', 'Clermont-Ferrand: Grand Prix (International)'),
      exact('goya', 'short-animation', 'Goya Awards: Best Animated Short Film'),
      exact('goya', 'short-documentary', 'Goya Awards: Best Documentary Short Film'),
      exact('goya', 'short-fiction', 'Goya Awards: Best Fiction Short Film'),
      exact('sitges', 'short', 'Sitges: SOFC Best Short Film Award'),
      exact('sitges', 'animat-short', 'Sitges: Best Animated Short Film'),
      exact('sundance', 'shorts-grand-jury', 'Sundance: Short Film Grand Jury Prize'),
      exact('tiff', 'short-cuts-international', 'Toronto: Best International Short Film'),
      exact('tiff', 'short-cuts-canadian', 'Toronto: Best Canadian Short Film'),
      exact('venice', 'orizzonti-short', 'Venice: Orizzonti Award for Best Short Film'),
    ],
    notInGame: [
      'Clermont-Ferrand: Grand Prix (National – French Competition)',
      'Sundance: Short Film Jury Awards for International Fiction, US Fiction, Animation and Nonfiction',
      'South by Southwest: Animated, Documentary and Narrative Shorts Competition Jury Awards',
      'Hot Docs: Best International Short Documentary; Betty Youson Award for Best Canadian Short Documentary',
      'IDFA: IDFA Award for Best Short Documentary',
      'FESPACO: Golden Foal – Documentary Short',
      'Locarno: Pardino d\u2019Oro Swiss Life and Pardino d\u2019Oro SRG SSR',
      'BAFTA: British Short Film; British Short Animation',
      'Busan International Short Film Festival (a different festival from Busan International Film Festival): both Grand Prix',
      'Every other festival on the list, none of which SLATE holds',
    ],
    note: 'The list no longer names a Toronto animated-short award, and none of SLATE\u2019s audience awards. Rule Fourteen adds that a documentary short must qualify within two years of its completion; SLATE doesn\u2019t check that yet.',
  },
  {
    id: 'aa99-documentary', institutionId: 'oscars', year: 2027, window: { from: '2025-10-01', to: '2026-09-30' },
    source: 'aa99-documentary-festivals', section: 'Documentary Feature Film Qualifying Festival List (updated April 10, 2026); Rule Thirteen, paragraph II.A.2',
    awards: [
      exact('berlinale', 'documentary-award', 'Berlinale: Berlinale Best Documentary Award'),
      { institution: 'idfa', category: 'international-award', listed: 'IDFA: IDFA Award for Best Feature-Length Documentary', match: 'interpreted', note: 'SLATE\u2019s IDFA roster names the International Competition\u2019s top award "IDFA Award for Best Film"; SLATE reads it as the award the list names.' },
    ],
    notInGame: [
      'Berlinale: The TEDDY Award – Best Documentary Feature',
      'Cannes: Golden Eye Documentary Prize',
      'Hot Docs: Best International Feature Documentary',
      'FESPACO: Golden Stallion – Documentary Feature',
      'Every other festival on the list, none of which SLATE holds',
    ],
  },
  {
    id: 'aa99-international', institutionId: 'oscars', year: 2027, window: { from: '2025-10-01', to: '2026-09-29' },
    source: 'aa99-international-faq', section: 'International Feature Film FAQs, "How does a film get submitted": qualifying festivals for the 99th Oscars; Rule Sixteen, paragraph II.A.2',
    awards: [
      exact('berlinale', 'golden-bear', 'Berlin: Golden Bear for Best Film'),
      exact('cannes', 'palme', 'Cannes: Palme d\u2019Or'),
      { institution: 'sundance', category: 'world-dramatic-grand-jury', listed: 'Sundance: World Cinema Grand Jury Prize', match: 'interpreted', note: 'The list doesn\u2019t say which World Cinema competition; SLATE accepts the Dramatic and the Documentary prize.' },
      { institution: 'sundance', category: 'world-documentary-grand-jury', listed: 'Sundance: World Cinema Grand Jury Prize', match: 'interpreted', note: 'The list doesn\u2019t say which World Cinema competition; SLATE accepts the Dramatic and the Documentary prize.' },
      exact('tiff', 'platform-award', 'Toronto: Platform Award'),
      exact('venice', 'golden-lion', 'Venice: Golden Lion'),
    ],
    notInGame: ['Busan: Busan Award – Best Film Award (SLATE\u2019s Busan roster holds no competition prize)'],
    note: 'The FAQ says the award must be won "before September 30, 2026" and gives no first day; SLATE uses the theatrical window\u2019s October 1, 2025.',
  },
];

const listsById = new Map(QUALIFYING_LISTS.map((l) => [l.id, l]));

/** A qualifying list by id. */
export function qualifyingList(id: string): QualifyingList | undefined {
  return listsById.get(id);
}

const shiftYears = (key: string, n: number) => `${Number(key.slice(0, 4)) + n}${key.slice(4)}`;

/**
 * The list for an edition the organizer hasn't published one for: the newest earlier list of the same kind (its id after
 * the edition prefix), its window moved by the years between them, labelled projected. Undefined before the first list.
 */
export function projectedList(kind: 'shorts' | 'documentary' | 'international', institutionId: string, year: number): { list: QualifyingList; status: 'verified' | 'projected' } | undefined {
  const same = QUALIFYING_LISTS.filter((l) => l.institutionId === institutionId && l.id.endsWith(`-${kind}`) && l.year <= year).sort((a, b) => b.year - a.year)[0];
  if (!same) return undefined;
  if (same.year === year) return { list: same, status: 'verified' };
  const n = year - same.year;
  return { list: { ...same, year, window: { from: shiftYears(same.window.from, n), to: shiftYears(same.window.to, n) }, projectedFrom: same.id }, status: 'projected' };
}
