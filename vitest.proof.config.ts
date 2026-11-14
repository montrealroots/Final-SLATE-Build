import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/proof/**/*.proof.ts'], environment: 'node', testTimeout: 3_600_000, setupFiles: ['tests/setup.ts'] } });
