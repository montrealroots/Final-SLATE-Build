import { readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import registry from '../src/data/genre-registry.json';
import { proposeFromSource } from '../src/engine/proposal';
const GENRES = new Set((registry as { records: { id: string }[] }).records.map((r) => r.id));
it('look', () => {
  const c = JSON.parse(readFileSync('src/data/sources.json', 'utf8'));
  const st = JSON.parse(readFileSync('src/data/plots.json', 'utf8'));
  const out: string[] = [];
  for (const t of (process.env.LOOK ?? 'The Hobbit|Portal|Nineteen Eighty-Four').split('|')) {
    const w = c.records.find((x: { title: string }) => x.title === t);
    for (const f of ['feature', 'series'] as const) {
      const p = proposeFromSource({ work: { ...w, plot: st.plots[w.id] }, format: f, approach: 'faithful', gameYear: 2027, episodes: 4, genres: GENRES });
      const b = p.blueprint;
      const nm = (s: string) => b.characters.reduce((a, ch) => a.split(`{${ch.key}}`).join(ch.name), s);
      out.push(`== ${t} ${f}: lead ${b.characters[0].name}, rival ${b.characters[1]?.name}, ally ${b.characters[2]?.name}; tone ${b.tone}; logline ${nm(b.logline).slice(0, 120)}`);
      out.push(`   why scenes: ${p.why.scenes?.slice(0, 300)}`);
      for (const s of b.scenes) out.push(`   [ep${s.episode ?? '-'} ${s.act}] ${s.objective} | ${s.place} | ${nm(s.action).slice(0, 110)} | turn:${s.turn ? 'y' : 'n'}`);
      if (b.tv) for (const e of b.tv.eps) out.push(`   EP${e.n} ${e.title}: ${nm(e.moves).slice(0, 140)}`);
      out.push(`   rel: ${b.relationships.map((r) => `${r.kind}: ${nm(r.start).slice(0, 70)} -> ${nm(r.end).slice(0, 70)}`).join(' || ')}`);
      out.push(`   premise: ${nm(b.premise).slice(0, 200)}`);
    }
  }
  writeFileSync('/tmp/claude-0/-home-user/e6445717-2fc5-5aca-be83-6a6ec1ac02c2/scratchpad/look.txt', out.join('\n'));
});
