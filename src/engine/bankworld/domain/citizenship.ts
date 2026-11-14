/**
 * SLATE — citizenship.
 *
 * A person is a citizen of one country: the one they were born in. It is not
 * asked. The place of birth decides it, creation says it back, and the save
 * keeps it on the person.
 *
 * "The country" means the state whose citizenship a place gives, which is not
 * always the entry the place is listed under. The gazetteer lists territories
 * beside countries, the way a map does, and somebody born in San Juan is a
 * citizen of the United States, not of Puerto Rico. `TERRITORY_CITIZENSHIP`
 * says which is which.
 *
 * There used to be a second passport here, for somebody naturalized where
 * they live now, and beside it a work-permit rule, which went first. Neither
 * decided anything by the end, so both went. The right to work came back with
 * the day job (`mayWorkIn`), which it decided, and went with it on
 * 2026-09-26: free movement in the EEA, the Common Travel Area and across the
 * Tasman, and a work visa anywhere else.
 */

import { countryOfPlace } from '../content/geography';

/**
 * Territories whose people hold another country's citizenship, by the country
 * that gives it. Public reference: each territory's standing under the
 * nationality law of the state it belongs to.
 *
 * Two are not quite citizenship, and are here because the country is still
 * the right answer to which one somebody is under: American Samoa gives United
 * States nationality without citizenship, and Hong Kong and Macao issue their
 * own passports on Chinese nationality. The places with a nationality of their
 * own, recognized or not, are left as themselves: Taiwan, Kosovo, Palestine
 * and Western Sahara among them. So are the entries nobody can be born in,
 * such as Antarctica and the countries that have dissolved.
 */
export const TERRITORY_CITIZENSHIP: Readonly<Record<string, string>> = {
  // The United States.
  pr: 'us', gu: 'us', vi: 'us', mp: 'us', as: 'us', um: 'us',
  // France.
  re: 'fr', gp: 'fr', mq: 'fr', gf: 'fr', yt: 'fr', pf: 'fr', nc: 'fr',
  bl: 'fr', mf: 'fr', pm: 'fr', wf: 'fr', tf: 'fr',
  // The United Kingdom, its overseas territories and the Crown dependencies.
  ai: 'uk', bm: 'uk', io: 'uk', vg: 'uk', ky: 'uk', fk: 'uk', gi: 'uk',
  ms: 'uk', pn: 'uk', sh: 'uk', gs: 'uk', tc: 'uk', gg: 'uk', je: 'uk', im: 'uk',
  // The Netherlands.
  aw: 'nl', cw: 'nl', sx: 'nl', bq: 'nl',
  // Denmark, Finland and Norway.
  gl: 'dk', fo: 'dk', ax: 'fi', sj: 'no', bv: 'no',
  // Australia and New Zealand.
  cx: 'au', cc: 'au', nf: 'au', hm: 'au', ck: 'nz', nu: 'nz', tk: 'nz',
  // China.
  hk: 'cn', mo: 'cn',
};

/**
 * The country somebody born in this place is a citizen of, or undefined when
 * the place names no real country.
 */
export function citizenshipFor(birthplaceId: string): string | undefined {
  const listed = countryOfPlace(birthplaceId);
  return listed ? TERRITORY_CITIZENSHIP[listed] ?? listed : undefined;
}
