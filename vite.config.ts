import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { astryxStylex } from '@astryxdesign/build/vite';
import { execSync } from 'node:child_process';

// Short commit hash for the version indicator in the Panels drawer.
// Falls back to 'dev' if git is unavailable.
let commitHash = 'dev';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  // ignore
}

export default defineConfig({
  plugins: [...astryxStylex(), react()],
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  // Inline font files as data URIs: the standalone HTML must stay a single
  // self-contained file (make-standalone.py rejects any /assets/ reference).
  build: { assetsInlineLimit: 1024 * 1024 },
});
