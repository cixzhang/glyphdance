import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { astryxStylex } from '@astryxdesign/build/vite';

export default defineConfig({
  plugins: [...astryxStylex(), react()],
  // Inline font files as data URIs: the standalone HTML must stay a single
  // self-contained file (make-standalone.py rejects any /assets/ reference).
  build: { assetsInlineLimit: 1024 * 1024 },
});
