// Which kinds of event a played career runs, and how often (tests/proof/probes/scheduled.ts proves each by switching it
// off). Four careers: the default short; one financed by backers with awards entered over three years; one abroad.
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { DEFAULT_POLICY, playCareer, type Policy } from './career';
import { enterEverything } from './probes/awards';
import { handlerOf, registerHandler } from '../../src/engine/state';
import { scheduled } from './register';

it('counts every kind of event a played career runs', () => {
  const kinds = scheduled().map((f) => f.name);
  const count: Record<string, number> = Object.fromEntries(kinds.map((k) => [k, 0]));
  const saved = kinds.map((k) => [k, handlerOf(k)] as const);
  for (const [k, h] of saved) registerHandler(k, (s, ev) => { count[k]++; return h?.(s, ev); });
  const policies: Partial<Policy>[] = [{}, { ownShare: 0, years: 3, daily: enterEverything }, { placeId: 'us-los-angeles', years: 2 }];
  try { for (const [i, pol] of policies.entries()) for (const seed of ['a', 'b']) playCareer(`census-${i}-${seed}`, { ...DEFAULT_POLICY, ...pol }); }
  finally { for (const [k, h] of saved) if (h) registerHandler(k, h); }
  writeFileSync('docs/v10/census.json', JSON.stringify(count, null, 1) + '\n');
});
