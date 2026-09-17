import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';

/**
 * glyphdance studio theme: theme-neutral extended with a terminal-flavored
 * type ramp. Always rendered in dark mode — the studio is a darkroom.
 */
export const glyphdanceTheme = defineTheme({
  name: 'glyphdance',
  extends: neutralTheme,
  typography: {
    body: {
      family: "'Pixelify Sans'",
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    heading: {
      family: "'Pixelify Sans'",
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    code: {
      family: "'Cozette'",
      fallbacks: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    },
  },
});
