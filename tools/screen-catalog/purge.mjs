// Deletes every copy of TMDB's content this machine holds (November 11, 2026): the importer's cache, the built catalog
// and any build left half-done. TMDB's API Terms 1.D require it when use of TMDB ends; it is also how a catalog is
// withdrawn. The pictures gathered for the optional picture pack are TMDB's too, and go with it. The cinemas (Wikidata,
// CC0) aren't TMDB's and are left alone.
//   npm run screen-catalog:purge
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const cache = resolve(process.env.SCREEN_CATALOG_CACHE ?? '.screen-catalog-cache');
const out = resolve(process.env.SCREEN_CATALOG_OUT ?? '.screen-catalog');
const pictures = resolve(process.env.SCREEN_IMAGES ?? '.screen-images');
const gone = [cache, out, `${out}.building`, `${out}.old`, pictures].filter((d) => existsSync(d));
for (const d of gone) rmSync(d, { recursive: true, force: true });
console.log(gone.length ? `Deleted ${gone.join(', ')}.` : 'Nothing from TMDB was held here.');
