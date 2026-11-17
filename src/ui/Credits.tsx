// Settings → Credits And Data Sources (the v4 package, 04 "Credits and provenance"; ledger V4-034.01). One place for
// the game's sources and their attributions. It does not replace the attributions that sit beside the data they cover:
// the film catalog and the picture library carry TMDB's notice, and each work's summary names its Wikipedia article.
// docs/DATA-PROVENANCE.md has the developer's detail; this is what a player is owed.
import { GEAR_SOURCE } from '../engine/gear-catalog';
import { formatDateKey } from '../engine/time';

const SOURCES: { what: string; from: string; terms: string }[] = [
  { what: 'Places, towns and cities', from: 'GeoNames (geonames.org)', terms: 'Data from GeoNames, CC BY 4.0.' },
  { what: 'Map outlines', from: 'Natural Earth', terms: 'Public domain.' },
  { what: 'Climate', from: 'World Meteorological Organization climatological normals, by station', terms: 'Daily weather around them is the game\'s model, never an observation.' },
  { what: 'Public holidays', from: 'Each country\'s published holiday laws and lists', terms: 'Years past a government\'s last announcement are projected, and say so.' },
  { what: 'Works you can adapt', from: 'Wikidata', terms: 'CC0. A work\'s summary is its English Wikipedia article\'s, CC BY-SA 4.0, named beside it.' },
  { what: 'Films, series and the people in them, when installed', from: 'The Movie Database (TMDB)', terms: 'This product uses the TMDB API but is not endorsed or certified by TMDB.' },
  { what: 'Equipment', from: 'Makers\' specification pages (Blackmagic Design, Sennheiser, RØDE) and product names', terms: '' },
  { what: 'Home values and rents in the United States, town by town', from: 'U.S. Census Bureau, American Community Survey 5-year estimates, 2019-2023 and 2020-2024 (census.gov); the size of a typical home from the American Housing Survey', terms: 'United States government data. Survey medians of what owners say their homes are worth and what renters pay, not sale prices or asking rents.' },
  { what: 'How house prices moved in the United States', from: "FHFA House Price Index, all transactions, by metro area and state (fhfa.gov); metro areas as the Office of Management and Budget draws them (census.gov)", terms: 'United States government data. An index of repeat sales of the same homes, not a price.' },
  { what: 'Rents in the United States where a town has no Census figure', from: "HUD Fair Market Rents, FY2026 (huduser.gov)", terms: 'United States government data. A 40th-percentile gross rent benchmark for an area, not an asking rent.' },
  { what: 'Rents in the United Kingdom', from: "Office for National Statistics, private rents (ons.gov.uk)", terms: 'UK official statistics. An average across all rented homes, provisional, not an offer for any home.' },
  { what: 'Home sales in France', from: 'Demandes de valeurs foncières, DVF (data.gouv.fr)', terms: 'Open Licence 2.0. Kept only as medians by commune: no address or single sale is in the game, and nothing identifies anyone.' },
  { what: 'HDB resales in Singapore', from: 'Housing & Development Board resale flat prices (data.gov.sg)', terms: 'Under the Singapore Open Data Licence, with this attribution; no endorsement is implied. Block and street only: no unit is recorded.' },
  { what: 'Land, building costs and electricity prices in the United States', from: "NAHB's 2024 construction cost survey; EIA's 2025 average electricity prices by state", terms: 'National and state averages, not a quote for any home.' },
  { what: 'Appliances', from: 'ENERGY STAR certified product records, U.S. EPA (data.energystar.gov)', terms: "EPA data, public domain by default. Sizes and certified test energy only: prices are the game's estimates, and no brand or product is endorsed." },
  { what: 'Housing rules', from: 'The official pages each rule names (gov.uk, ontario.ca, service-public.fr, hdb.gov.sg and others)', terms: 'Applied only where they apply; where none has been researched, the game says it is modeling.' },
  { what: 'Festival and award dates', from: 'Organizers\' announcements and rulebooks, where cited', terms: 'Rules in the game are a model of them; editions without a cited date are simulated and say so.' },
];

export function CreditsAndSources() {
  return (
    <section aria-labelledby="credits-h" style={{ marginTop: 'var(--s5)' }}>
      <h2 id="credits-h">Credits And Data Sources</h2>
      <ul className="list" aria-label="Where The Game's Facts Come From">
        {SOURCES.map((x) => (
          <li key={x.what} className="list-item" style={{ display: 'block' }}>
            <strong>{x.what}:</strong> {x.from}.{' '}
            <span className="dim small">{x.what === 'Equipment' ? `Prices are from ${GEAR_SOURCE.source}, read on ${formatDateKey(GEAR_SOURCE.retrieved)}; rental rates, resale and wear are the game's calibration.` : x.terms}</span>
          </li>
        ))}
      </ul>
      <p className="dim small">Everyone and everything else in the game, from the people you hire to rival films and their results, is invented by the game unless a page says where it is from.</p>
    </section>
  );
}
