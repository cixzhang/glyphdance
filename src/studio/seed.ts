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

// Follower mote glyphs: dots and asterisks, ordered small → large.
// (The diamond leader keeps its own ◆.)
const MOTES = ['·', '.', '*', '°'];
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
    // The diamond's angle this frame — followers trail behind it.
    const leaderAngle = -Math.PI / 2 + (f / MOTES_PER_RING) * Math.PI * 2;
    for (let i = 0; i < MOTES_PER_RING; i++) {
      if (i === 0) {
        // Diamond leader: yellow diamond on dark yellow, clean clockwise
        // orbit (angle increases → top → right → bottom on screen).
        const x = Math.round(cx + Math.cos(leaderAngle) * baseRadius);
        const y = Math.round(cy + Math.sin(leaderAngle) * baseRadius * 0.7);
        if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) {
          frame.cells[cellIndex(x, y)] = { ch: '◆', fg: '#f1fa8c', bg: '#665500' };
        }
        continue;
      }
      // Followers trail behind the diamond along its path: densest near
      // the leader, spreading looser further back on its tail. Angular lag
      // grows with i; jitter (angular + radial) grows too, so the tail
      // feels loose, not rigid. Glyphs shrink toward the tail tip.
      const lag = 0.22 * i + Math.sin(f * 0.7 + i * 2.1) * 0.05 * i;
      const angle = leaderAngle - lag;
      const radialJitter = Math.sin(f * 0.9 + i * 1.7) * (0.5 + i * 0.3);
      const radius = baseRadius + radialJitter;
      const x = Math.round(cx + Math.cos(angle) * radius);
      const y = Math.round(cy + Math.sin(angle) * radius * 0.7);
      const pulse = Math.sin(f * 1.1 + i * 2.3) > 0 ? 1 : 0;
      const ch = MOTES[Math.max(0, Math.min(MOTES.length - 1, 2 - Math.floor(i / 3) + pulse))];
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
