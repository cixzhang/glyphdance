// agent-skills.ts — the agent's skills: domain knowledge the model needs to
// use the editor tools well. This is prompt text, kept separate from agent.ts
// so it reads like a skill book rather than plumbing. The stamp catalog is
// generated from the real sprite data so it can't drift out of sync.

import {
  ET_SPRITES,
  PLAYER_SPRITES,
  CRITTER_SPRITES,
  SPACE_SPRITES,
  NATURE_SPRITES,
  PLAY_SPRITES,
  type Sprite,
} from './scene.ts';
import { PALETTE } from './glyphs.ts';

function renderSprite(s: Sprite, kind: string): string {
  const frames = s.frames
    .map((rows, i) => `frame ${i + 1}:\n${rows.join('\n')}`)
    .join('\n');
  return `${s.id} (${kind}, ${s.frames.length} frame${
    s.frames.length > 1 ? 's' : ''
  }):\n${frames}`;
}

/** The built-in stamp catalog, generated from the real sprite data. */
export const STAMP_CATALOG: string = [
  ...ET_SPRITES.map((s) => renderSprite(s, 'invader')),
  ...PLAYER_SPRITES.map((s) => renderSprite(s, 'ship')),
  ...CRITTER_SPRITES.map((s) => renderSprite(s, 'critter')),
  ...SPACE_SPRITES.map((s) => renderSprite(s, 'space')),
  ...NATURE_SPRITES.map((s) => renderSprite(s, 'nature')),
  ...PLAY_SPRITES.map((s) => renderSprite(s, 'play')),
].join('\n\n');

export const STAMP_SKILL = `Stamps
Finding the right stamp — when the user names a thing ("add snowflakes", "put a ufo here"):
1. SEARCH the built-in catalog below and their stamp list for a match — be generous with plurals and synonyms ("snowflakes"→no match; "kitty"→cat; "ufo"→saucer; "ship"→dart/rocket/dish; "ghost"→ghost).
2. Match found → placeStamp it. Never re-create a stamp that already exists.
3. No match → CREATE it with addStamp, designing the art from the glyph advice below, then placeStamp it in the SAME reply so the user sees it immediately.
   If the user named a specific character, emoji, or symbol that ISN'T in the glyph repertoire (e.g. 🐉, ★, ❅), do NOT emit that character anywhere — it renders as an empty box and the action layer will reject it. Instead invent a custom stamp that evokes it using ONLY supported glyphs (a dragon from █ ▲ ● ~, a star from ✦, a snowflake from ❄), then addStamp + placeStamp it in the SAME reply.
4. No placement given ("add snowflakes") → don't stall and don't emit empty actions: place 2-4 copies across empty areas of the active frame — on every frame with slight offsets for weather/falling effects — and say what you chose in "message".

To USE a stamp from the catalog, emit a placeStamp action — never hand-draw a stamp's cells:
{"type":"placeStamp","stampId":"crab","frame":0,"x":12,"y":7,"fg":"<invader color>","bg":""}
x,y is the CENTER of the stamp on the 24x14 grid, and the WHOLE stamp must fit inside the grid — placements that would clip at the edge are rejected, so keep the full stamp extent in bounds. bg "" keeps the background transparent. Use the theme's stamp colors given above for fg so stamps match the scene (invaders/nature: invader color; ships/play: player color; critters/space: star color).

To CREATE a new stamp the user can keep and reuse from their Stamps panel, emit addStamp:
{"type":"addStamp","stamp":{"id":"cat","fg":"#ffd75e","frames":[[" /\\\\_/\\\\ ","( o.o )"," > ^ < "],[" /\\\\_/\\\\ ","( -.- )"," > ^ < "]]}}
Rules:
- id: lowercase letters/digits/dashes, 1-20 chars; must not collide with built-ins or the user's existing stamps.
- frames: 1-4 frames; each frame 1-8 rows; each row 1-12 characters; spaces are transparent.
- Give 2 frames for anything animated (blink, tail wag, leg shuffle) — change only 2-3 characters between frames, like the crab's legs in the catalog.
- fg: a hex color that reads on the background color given above.
- After addStamp, ALWAYS placeStamp it onto the canvas so the user sees it. Creating without placing is incomplete.
- To animate a custom stamp across document frames, placeStamp its stampFrame 0 on one frame and stampFrame 1 on the next (duplicateFrame first if you need more frames).`;

/** What the canvas font can actually draw — the agent's ASCII palette. */
export const GLYPH_ADVICE = `Glyph repertoire — the canvas font draws every standard ASCII letter, digit, and punctuation mark, plus THESE workhorse characters:
${PALETTE}
Use the palette above for stamp art and pixel-art glyphs; plain ASCII text ("hello.", "don't", "a,b") always works too. Anything outside the font's repertoire renders as an empty box.
Watch out: ★ ☆ ❅ ❆ and emoji are NOT in the font — never use them (use ✦ instead of ★, ❄ instead of ❅/❆).

Missing-character rule: when the user asks for a character, emoji, or symbol that isn't in the repertoire above, NEVER emit it — not in stamp art, not in paintCells. The action layer rejects unsupported characters, so emitting one means your edit fails. Instead invent a stamp that suggests what they asked for out of the glyphs you do have: addStamp it, then placeStamp it in the SAME reply. A 1-cell stamp (❄ for ❅, ✦ for ★, ♥ for an emoji heart) is a complete answer — create it, place it, done.

Concept → glyph starter kit (adapt freely; keep new stamps 3-7 cells wide so they read on the 24x14 grid):
- snowflake: ❄ on its own reads instantly; a larger flake:
  \\  |  /
   * * *
  --❄--
   * * *
  /  |  \\
- star: ✦, or
      *
     ***
    *****
     ***
      *
- heart:
   ♥♥ ♥♥
  ♥♥♥♥♥♥
  ♥♥♥♥♥♥
   ♥♥♥♥
    ♥♥
     ♥
- tree:
      ▲
     ▲▲▲
    ▲▲▲▲▲
      |
- music: ♪ ♫   suits: ♥ ♦ ♣ ♠   arrows: ▲ ▼ ◀ ▶
When the user names one small thing ("a star", "snowflakes"), a 1-cell stamp straight from the repertoire (❄, ✦, ♥…) is a complete answer — create it, place it, done.`;

export const COLOR_SKILL = `Color — use it deliberately, not decoratively.
- Every paintCells cell carries fg (and optional bg); placeStamp takes fg/bg too. Flat single-color art reads as unfinished — vary fg across elements.
- The document description above lists the current theme and its stamp colors (invaders/nature, ships/play, critters/space, background). Default to those so new art matches the scene.
- Silhouette in one color, accents (eyes, highlights, motion trails) in 1-2 contrasting theme colors. bg "" keeps cells transparent so the theme background shows through; set bg only for solid fills or glow effects.
- setTheme switches the whole palette — use it only when the user asks for a different mood or names a palette, never unprompted.`;

export const PIXEL_ART_SKILL = `Pixel-art technique (24 wide x 14 tall grid)
- Sketch before you emit: plan the full layout on coordinates first. Keep subjects 5-10 cells wide so they read; the grid is small.
- Symmetry is your friend: creatures and ships read best mirrored left/right.
- Batch ALL cells for one frame into ONE paintCells action. Never emit one cell per action.
- Animate with tiny changes: duplicate a frame, then move the subject 1-2 cells or toggle 2-3 cells (blink = eyes open/closed, bounce = shift down 1 cell and back). 2-4 frames is usually enough.
- Outlines beat detail: a clear silhouette in one glyph (█) with 2-3 accent glyphs reads better than fiddly interiors.
- Honesty: only describe what your actions actually did. If you painted 3 cells on frame 0, say exactly that — never claim frames or art you didn't produce.`;
