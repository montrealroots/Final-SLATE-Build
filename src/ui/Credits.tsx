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
