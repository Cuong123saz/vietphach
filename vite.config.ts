import { defineConfig } from 'vite';

// The default node_modules/.vite cache was created by another tool's sandbox account, so this
// Windows user cannot replace it. Keep Vite's dev dependency cache in a fresh folder instead.
export default defineConfig({ cacheDir: 'node_modules/.vite-cache',
  build: { rolldownOptions: { input: ['index.html', 'outputs/melee-models/review.html'] } },
});
