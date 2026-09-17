// glyphs.ts — the canvas font's actual repertoire.
//
// Cozette only draws these characters; anything else renders as an empty
// box (tofu). This list is the single source of truth: the agent's prompt
// (agent-skills.ts) renders it into GLYPH_ADVICE, and the action layer
// (actions.ts) rejects addStamp/paintCells payloads that use anything else
// — so the agent can never emit a missing character, and instead has to
// design a stamp out of glyphs that exist.

/** Every non-space character the canvas font can draw, in display order. */
export const SUPPORTED_GLYPHS =
  '█▓▒░·●◆✦◉❄♥♦♣♠▲▼◀▶✚♪♫+×*/\\|-_^~=:;!?%$()[]<>oO#@';

/** True for space (transparent) and every glyph in SUPPORTED_GLYPHS. */
export function isSupportedGlyph(ch: string): boolean {
  return ch === ' ' || SUPPORTED_GLYPHS.includes(ch);
}

/** Space-separated repertoire line, for prompt text. */
export function repertoireLine(): string {
  return [...SUPPORTED_GLYPHS].join(' ');
}
