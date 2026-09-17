import { themeById, type ThemeSwatch } from './scene.ts';

/**
 * The canvas theme selector (Dracula, Monokai, …) re-skins the whole studio,
 * not just the canvas. These tokens are applied as inline custom properties
 * on the Astryx Theme container ([data-astryx-theme="glyphdance"]): the
 * CLI-built theme CSS sets the same variables on that container via a
 * `:scope` rule, and inline properties on the same element win, so the app
 * chrome (backgrounds, text, borders, accent) marches with the canvas.
 *
 * (Passing a derived theme object to <Theme> does NOT work — the pre-built
 * CSS wins there. This DOM application is the mechanism that actually
 * re-themes.)
 *
 * App backgrounds march with the swatch bg, text marches with its star
 * color, borders use its dot color, and the accent follows the player
 * color. Surfaces always lift toward the text color, which reads as
 * elevation in both dark and light swatches. The swatch is already
 * mode-correct (themeById(id)[mode]), so no light-dark() is needed.
 */
function chromeTokens(
  themeId: string,
  mode: 'light' | 'dark',
): Record<string, string> {
  const sw: ThemeSwatch = themeById(themeId)[mode];
  const { bg, dot, star, player } = sw;
  const mix = (a: string, pct: number, b: string): string =>
    `color-mix(in srgb, ${a} ${pct}%, ${b})`;
  return {
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
}

/** Re-skin the studio chrome for the active syntax theme. Safe to call on
 *  every themeId/mode change; a no-op if the Theme container isn't mounted. */
export function applySyntaxChrome(
  themeId: string,
  mode: 'light' | 'dark',
): void {
  const el = document.querySelector('[data-astryx-theme="glyphdance"]');
  if (!(el instanceof HTMLElement)) return;
  const tokens = chromeTokens(themeId, mode);
  for (const [name, value] of Object.entries(tokens)) {
    el.style.setProperty(name, value);
  }
}
