// Starter document: circular motes dancing in a ring, baked into real
// editable cells. New documents start here; "Reset demo" in the Document
// panel re-seeds.

import {
  GRID_W,
  GRID_H,
  DOC_NAME,
  blankFrame,
  cellIndex,
  type DocState,
  type Frame,
} from './document.ts';
import { themeById } from './scene.ts';

// Mote glyphs, ordered small → large for a pulsing feel.
const MOTES = ['°', 'o', 'O', '•'];
const MOTES_PER_RING = 8;

export function seedDocument(mode: 'light' | 'dark'): DocState {
  const sw = themeById('dracula')[mode];
  const colors = [sw.invader, sw.player, sw.star];
  const cx = GRID_W / 2;
  const cy = GRID_H / 2;
  const baseRadius = Math.min(GRID_W, GRID_H) / 2 - 2;
  const holds = [300, 300, 300, 300, 300, 300, 300, 300];
  const frames: Frame[] = [];

  for (let f = 0; f < MOTES_PER_RING; f++) {
    const frame = blankFrame(holds[f]);
    for (let i = 0; i < MOTES_PER_RING; i++) {
      // Each mote orbits the ring at its own pace and bobs in and out —
      // a loose dance, not a rigid rotation. Glyph size pulses with the
      // bob for a lively feel.
      const speed = 1 + (i % 3) * 0.5; // some motes lap faster
      const step = (i + f * speed) / MOTES_PER_RING;
      const angle = step * Math.PI * 2 - Math.PI / 2;
      const bob = Math.sin((f * 0.9 + i * 1.7)) * 1.5; // in/out wobble
      const radius = baseRadius + bob;
      const x = Math.round(cx + Math.cos(angle) * radius);
      const y = Math.round(cy + Math.sin(angle) * radius * 0.7);
      const pulse = Math.sin(f * 1.1 + i * 2.3) > 0 ? 1 : 0;
      const ch = MOTES[(i + f + pulse) % MOTES.length];
      const fg = colors[(i + f) % colors.length];
      if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) {
        frame.cells[cellIndex(x, y)] = { ch, fg, bg: '' };
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
