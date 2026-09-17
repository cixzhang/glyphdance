// Starter document: the old demo scene (drifting invader, bobbing player,
// twinkling stars) baked into real editable cells. New documents start here;
// "Reset demo" in the Document panel re-seeds.

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
  PLAYER_SPRITES,
  STARS,
  spriteById,
  themeById,
} from './scene.ts';

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
      if (line[c] === ' ') continue;
      const x = x0 + c;
      const y = y0 + r;
      if (!inBounds(x, y)) continue;
      frame.cells[cellIndex(x, y)] = { ch: '█', fg, bg: '' };
    }
  }
}

export function seedDocument(mode: 'light' | 'dark'): DocState {
  const sw = themeById('dracula')[mode];
  const et = spriteById(ET_SPRITES, 'crab');
  const player = spriteById(PLAYER_SPRITES, 'dart');
  const holds = [400, 150, 400, 150];
  const frames: Frame[] = [];

  for (let f = 0; f < 4; f++) {
    const frame = blankFrame(holds[f]);

    // ET drifts gently across the top, legs shuffling each frame.
    const etArt = et.frames[f % et.frames.length];
    const etW = Math.max(...etArt.map((l) => l.length));
    const drift = [0, 1, 2, 1][f];
    stampArt(frame, etArt, Math.round((GRID_W - etW) / 2) + drift, 2, sw.invader);

    // The player bobs along the bottom.
    const pArt = player.frames[0];
    const pW = Math.max(...pArt.map((l) => l.length));
    const bob = [0, 1, 0, -1][f];
    stampArt(
      frame,
      pArt,
      Math.round((GRID_W - pW) / 2) + bob,
      GRID_H - pArt.length - 1,
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

  return { name: DOC_NAME, themeId: 'dracula', frames, active: 0, stamps: [] };
}
