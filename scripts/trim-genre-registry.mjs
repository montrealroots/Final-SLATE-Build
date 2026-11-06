// Builds the runtime genre catalog from the full registry, dropping inherited source citations and the research
// mechanic specifications (kept in src/data/genre-registry.json for provenance; the game's mechanics are the module
// mapping in src/engine/genres.ts, and neither text is shown in gameplay).
import { readFileSync, writeFileSync } from 'node:fs';

const full = JSON.parse(readFileSync(new URL('../src/data/genre-registry.json', import.meta.url), 'utf8'));
const records = full.records.map((r) => ({
  id: r.id, name: r.name, classification: r.classification, working_definition: r.working_definition,
  legacy_parent_label: r.legacy_parent_label,
}));
writeFileSync(new URL('../src/data/genre-catalog.json', import.meta.url), `${JSON.stringify({ count: records.length, records })}\n`);
console.log(`genre-catalog.json: ${records.length} records`);
