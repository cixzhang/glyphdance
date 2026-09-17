import { glyphdanceTheme } from './glyphdance.js';
import { themeById, type ThemeSwatch } from './scene.ts';

/**
 * The canvas theme selector (Dracula, Monokai, …) re-skins the whole studio,
 * not just the canvas. This derives an Astryx theme object from the active
 * syntax swatch: app backgrounds march with the swatch bg, text marches with
 * its star color, borders use its dot color, and the accent follows the
 * player color. Surfaces always lift toward the text color, which reads as
 * elevation in both dark and light swatches.
 *
 * It spreads the CLI-built glyphdance theme and overrides only color tokens,
 * so fonts, spacing, and radii stay exactly as built. The swatch is already
 * mode-correct (themeById(id)[mode]), so no light-dark() is needed here.
 */
export function chromeThemeFor(
  themeId: string,
  mode: 'light' | 'dark',
): typeof glyphdanceTheme {
  const sw: ThemeSwatch = themeById(themeId)[mode];
  const { bg, dot, star, player } = sw;
  const mix = (a: string, pct: number, b: string): string =>
    `color-mix(in srgb, ${a} ${pct}%, ${b})`;
  const tokens: Record<string, string> = {
    '--color-background-body': bg,
    '--color-background-muted': mix(bg, 92, star),
    '--color-background-surface': mix(bg, 84, star),
    '--color-background-card': mix(bg, 76, star),
    '--color-background-popover': mix(bg, 68, star),
    '--color-border': dot,
    '--color-text-primary': star,
    '--color-text-secondary': mix(star, 70, bg),
    '--color-text-disabled': mix(star, 45, bg),
    '--color-accent': player,
    '--color-accent-muted': mix(player, 22, bg),
    '--color-text-accent': player,
    // Domain tokens that were hardcoded: selection + agent bubble follow.
    '--gd-accent': player,
    '--gd-bubble': mix(bg, 70, star),
  };
  return {
    ...glyphdanceTheme,
    tokens: { ...glyphdanceTheme.tokens, ...tokens },
  };
}
