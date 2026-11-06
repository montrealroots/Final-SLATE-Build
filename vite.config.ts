import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    // World data is fetched when needed; never inline it into the startup bundle.
    assetsInlineLimit: (file: string) => (/\.(tsv|json)$/.test(file) ? false : undefined),
    rolldownOptions: {
      output: { advancedChunks: { groups: [{ name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ }] } },
    },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', setupFiles: ['tests/setup.ts'] },
});
