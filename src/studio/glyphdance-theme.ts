import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

/**
 * glyphdance studio theme: neutral extended with pixel typography.
 *
 * The studio is a darkroom — always rendered in dark mode (see main.tsx).
 * Two type roles:
 *   body/heading -> Pixelify Sans (rounded pixel sans for UI chrome)
 *   code         -> Cozette (bitmap programmer font for ASCII canvas work)
 *
 * The font FILES are shipped by the app itself (src/studio/fonts.css
 * @font-face, bundled + inlined at build); the theme only names them.
 *
 * Built with the Astryx CLI — do not edit the generated glyphdance.css /
 * glyphdance.js by hand. Re-run after every edit:
 *   ./node_modules/.bin/astryx theme build src/studio/glyphdance-theme.ts
 */
export const glyphdanceTheme = defineTheme({
  name: 'glyphdance',
  extends: neutralTheme,
  typography: {
    body: {
      family: 'Pixelify Sans',
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    heading: {
      family: 'Pixelify Sans',
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    code: {
      family: "'Cozette'",
      fallbacks: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    },
  },
});
