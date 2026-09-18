// Starter document: the ghost mascot drifting over a mixed-style scene,
// baked into real editable cells. New documents start here; "Reset demo"
// in the Document panel re-seeds.

import {
  GRID_W,
  GRID_H,
  DOC_NAME,
  blankFrame,
  cellIndex,
  inBounds,
  type DocState,
  type Frame,
} from './document.ts';
import {
  ET_SPRITES,
  NATURE_SPRITES,
  CRITTER_SPRITES,
  STARS,
  spriteById,
  themeById,
} from './scene.ts';

/**
 * Paint sprite art onto a frame, preserving each character as drawn.
 * (The old version replaced every glyph with a full block — fine for the
 * invader set, wrong for character-based art.)
 */
function stampArt(
  frame: Frame,
  art: string[],
  x0: number,
  y0: number,
  fg: string,
): void {
  for (let r = 0; r < art.length; r++) {
    const line = art[r];
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === ' ') continue;
      const x = x0 + c;
      const y = y0 + r;
      if (!inBounds(x, y)) continue;
      frame.cells[cellIndex(x, y)] = { ch, fg, bg: '' };
    }
  }
}

export function seedDocument(mode: 'light' | 'dark'): DocState {
  const sw = themeById('dracula')[mode];
  const ghost = spriteById(ET_SPRITES, 'ghost');
  const cloud = spriteById(NATURE_SPRITES, 'cloud');
  const pine = spriteById(NATURE_SPRITES, 'pine');
  const cat = spriteById(CRITTER_SPRITES, 'cat');
  const holds = [400, 400, 400, 400];
  const frames: Frame[] = [];

  const ghostW = Math.max(...ghost.frames[0].map((l) => l.length));
  const cloudW = Math.max(...cloud.frames[0].map((l) => l.length));
  const pineW = Math.max(...pine.frames[0].map((l) => l.length));
  const catW = Math.max(...cat.frames[0].map((l) => l.length));

  for (let f = 0; f < 4; f++) {
    const frame = blankFrame(holds[f]);

    // The ghost mascot hovers center-stage, bobbing gently; its bottom
    // wave alternates each frame.
    const ghostArt = ghost.frames[f % ghost.frames.length];
    const bob = [0, -1, 0, 1][f];
    stampArt(
      frame,
      ghostArt,
      Math.round((GRID_W - ghostW) / 2),
      3 + bob,
      sw.invader,
    );

    // A shaded cloud drifts across the top.
    const cloudArt = cloud.frames[f % cloud.frames.length];
    const drift = [0, 2, 4, 6][f];
    stampArt(frame, cloudArt, 2 + drift, 1, sw.star);

    // A pine anchors the bottom-left; a cat blinks beside it.
    const pineArt = pine.frames[0];
    stampArt(frame, pineArt, 2, GRID_H - pineArt.length - 1, sw.invader);
    const catArt = cat.frames[f % cat.frames.length];
    stampArt(
      frame,
      catArt,
      4 + pineW,
      GRID_H - catArt.length - 1,
      sw.player,
    );

    // Stars twinkle over empty cells only, so they never stomp the actors.
    for (const [sr, sc] of STARS) {
      if (
        frame.cells[cellIndex(sc, sr)].ch === ' ' &&
        (sr * 7 + sc + f) % 3 > 0
      ) {
        frame.cells[cellIndex(sc, sr)] = { ch: '*', fg: sw.star, bg: '' };
      }
    }
    frames.push(frame);
  }

  return { name: DOC_NAME, themeId: 'dracula', fontId: 'cozette', width: GRID_W, height: GRID_H, frames, active: 0, stamps: [] };
}

/** A fresh blank document: one empty frame, default dimensions. */
export function blankDocument(): DocState {
  return {
    name: DOC_NAME,
    themeId: 'dracula',
    fontId: 'cozette',
    width: GRID_W,
    height: GRID_H,
    frames: [blankFrame(400)],
    active: 0,
    stamps: [],
  };
}
