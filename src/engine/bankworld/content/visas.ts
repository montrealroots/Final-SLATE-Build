/**
 * SLATE — the visitor visas SLATE's pairs of citizenship and destination
 * need (from 2026-09-29), researched and kept in
 * `docs/research/world/research-openitems.json`; Mexico's and Brazil's
 * electronic visas read the same day from the press and the consulates.
 * Keyed destination, then the citizenship: "US<MX".
 *
 * Until 2026-09-29 SLATE named the visa a citizenship needed and didn't take
 * the application. Canada's eTA for a Mexican or Brazilian holding a US visa,
 * the US's $250 Visa Integrity Fee (enacted, its collection at these posts
 * unconfirmed) and a refusal at interview aren't kept.
 *
 * From the scope reset of 2026-10-09 nothing took an application, so `days` was read by nothing, and `years` and
 * `validDays` only by a visa a save from before then still had pending. From November 14, 2026 SLATE's Your Papers takes
 * an application on these records again (engine/papers.ts `visaFor`), and reads all three. Until 2026-10-20 (brief 17) the bases Going
 * Abroad shows said how long the game took to decide one, "In the game it takes 30 days to decide", and that the game
 * used Mexico's waits for Brazil's; they say the published figures, and what wasn't found, alone.
 */

export interface VisaRule {
  name: string;
  fee: number;
  currency: string;
  /** Days from applying to the decision: the interview's wait and the processing. */
  days: number;
  /** How long it's good for: years, or days where it's short. */
  years?: number;
  validDays?: number;
  basis: string;
  source: string;
}

const US_B1B2 = (who: string): VisaRule => ({
  name: 'B-1/B-2 Visitor Visa',
  fee: 185, currency: 'USD',
  days: 150 + 7,
  years: 10,
  basis: `The application fee is $185. The interview is about five months away at the Mexico City consulate (as of September 29, 2026, from a secondary source)${who === 'BR' ? '. The waits at Brazil’s posts weren’t found' : ''}. It’s good for ten years, for multiple entries, by reciprocity.`,
  source: 'https://travel.state.gov (fees); waitvisa.com (the wait, citing the State Department)',
});
const CA_TRV = (who: string): VisaRule => ({
  name: 'Visitor Visa (Canada)',
  fee: 100 + 85, currency: 'CAD',
  days: 18,
  years: 10,
  basis: `CAD 100, and CAD 85 for biometrics. A decision takes about 18 days after biometrics for a Mexican applicant (from a secondary source)${who === 'BR' ? '. The time for a Brazilian applicant wasn’t found' : ''}. It’s good for up to ten years, or until the passport runs out.`,
  source: 'IRCC fee schedule; immigration.ca',
});
const AU_600: VisaRule = {
  name: 'Visitor Visa (Subclass 600)',
  fee: 250, currency: 'AUD',
  days: 30,
  years: 1,
  basis: 'AUD 250 from July 1, 2026 (from a secondary source, since Home Affairs’ own pages couldn’t be read). It’s granted for three, six or twelve months.',
  source: 'austmss.com.au, July 2026',
};
const BR_EVISA: VisaRule = {
  name: 'Brazil e-Visa',
  fee: 80.9, currency: 'USD',
  days: 14,
  years: 10,
  basis: 'US$80.90 through VFS Global, decided within ten business days. It’s good for ten years, for multiple entries, for a US citizen (from a secondary source), and the game uses the same for Canadians and Australians.',
  source: 'https://brazil.vfsevisa.com; press guides, 2026',
};

export const VISAS: Readonly<Record<string, VisaRule>> = {
  'US<MX': US_B1B2('MX'),
  'US<BR': US_B1B2('BR'),
  'CA<MX': CA_TRV('MX'),
  'CA<BR': CA_TRV('BR'),
  'AU<MX': AU_600,
  'AU<BR': AU_600,
  'MX<BR': {
    name: 'Mexico Electronic Visa',
    fee: 10, currency: 'USD',
    days: 3,
    validDays: 180,
    basis: 'US$10 from February 5, 2026, for a stay under 180 days, flying in (from Deloitte and the press, secondary sources).',
    source: 'https://www.deloitte.com/latam/es/services/legal/perspectives/restablecimiento-de-la-visa-electronica-de-visitante-de-visa-para-nacionales-de-brasil.html',
  },
  'BR<US': BR_EVISA,
  'BR<CA': BR_EVISA,
  'BR<AU': BR_EVISA,
};
