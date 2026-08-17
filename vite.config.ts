import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Project Pages live at /gravix-react/, not at the domain root. Local `npm run
  // dev` still uses `/`. Relative `./` would also work, but an explicit repo
  // prefix matches what GitHub serves and makes a missing base fail loudly.
  base: process.env.GITHUB_PAGES === 'true' ? '/gravix-react/' : '/',
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
  },
  optimizeDeps: {
    include: ['@babylonjs/core'],
    exclude: ['@giraphics/gravix-engine'],
  },
});
