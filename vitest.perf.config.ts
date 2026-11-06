import { defineConfig } from 'vitest/config';

// Engine timing harness (`npm run perf:engine`). One fork with --expose-gc so heap deltas are measurable.
export default defineConfig({
  test: {
    include: ['tests/perf/**/*.perf.ts'], environment: 'node', testTimeout: 600000, setupFiles: ['tests/setup.ts'],
    pool: 'forks', execArgv: ['--expose-gc'],
  },
});
