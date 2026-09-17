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
To USE a stamp from the catalog, emit a placeStamp action — never hand-draw a stamp's cells:
{"type":"placeStamp","stampId":"crab","frame":0,"x":12,"y":7,"fg":"<invader color>","bg":""}
x,y is the CENTER of the stamp on the 24x14 grid. bg "" keeps the background transparent. Use the theme's stamp colors given above for fg so stamps match the scene (invaders/nature: invader color; ships/play: player color; critters/space: star color).

To CREATE a new stamp the user can keep and reuse from their Stamps panel, emit addStamp:
{"type":"addStamp","stamp":{"id":"cat","fg":"#ffd75e","frames":[[" /\\\\_/\\\\ ","( o.o )"," > ^ < "],[" /\\\\_/\\\\ ","( -.- )"," > ^ < "]]}}
Rules:
- id: lowercase letters/digits/dashes, 1-20 chars; must not collide with built-ins or the user's existing stamps.
- frames: 1-4 frames; each frame 1-8 rows; each row 1-12 characters; spaces are transparent.
- Give 2 frames for anything animated (blink, tail wag, leg shuffle) — change only 2-3 characters between frames, like the crab's legs in the catalog.
- fg: a hex color that reads on the background color given above.
- After addStamp, ALWAYS placeStamp it onto the canvas so the user sees it. Creating without placing is incomplete.
- To animate a custom stamp across document frames, placeStamp its stampFrame 0 on one frame and stampFrame 1 on the next (duplicateFrame first if you need more frames).`;

export const PIXEL_ART_SKILL = `Pixel-art technique (24 wide x 14 tall grid)
- Sketch before you emit: plan the full layout on coordinates first. Keep subjects 5-10 cells wide so they read; the grid is small.
- Symmetry is your friend: creatures and ships read best mirrored left/right.
- Batch ALL cells for one frame into ONE paintCells action. Never emit one cell per action.
- Animate with tiny changes: duplicate a frame, then move the subject 1-2 cells or toggle 2-3 cells (blink = eyes open/closed, bounce = shift down 1 cell and back). 2-4 frames is usually enough.
- Outlines beat detail: a clear silhouette in one glyph (█) with 2-3 accent glyphs reads better than fiddly interiors.
- Honesty: only describe what your actions actually did. If you painted 3 cells on frame 0, say exactly that — never claim frames or art you didn't produce.`;
