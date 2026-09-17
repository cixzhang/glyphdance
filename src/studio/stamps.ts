// stamps.ts — stamp resolution shared by the canvas, the action layer, and
// the agent. Built-in sprites live in scene.ts; user/agent-created stamps live
// in the document (doc.stamps).

import { ET_SPRITES, PLAYER_SPRITES } from './scene.ts';
import {
  GRID_H,
  GRID_W,
  type CustomStamp,
} from './document.ts';
import type { PaintCell } from './actions.ts';

export interface ResolvedStamp {
  id: string;
  frames: string[][];
  /** Null for built-ins (they use theme invader/player colors). */
  fg: string | null;
  builtin: boolean;
  kind: 'invader' | 'player' | 'custom';
}

/** All built-in stamp ids (invaders + ships). */
export function builtinStampIds(): string[] {
  return [...ET_SPRITES, ...PLAYER_SPRITES].map((s) => s.id);
}

/** Find a stamp by id across built-ins and the document's custom stamps. */
export function resolveStamp(
  id: string,
  custom: CustomStamp[],
): ResolvedStamp | null {
  const invader = ET_SPRITES.find((s) => s.id === id);
  if (invader)
    return {
      id: invader.id,
      frames: invader.frames,
      fg: null,
      builtin: true,
      kind: 'invader',
    };
  const player = PLAYER_SPRITES.find((s) => s.id === id);
  if (player)
    return {
      id: player.id,
      frames: player.frames,
      fg: null,
      builtin: true,
      kind: 'player',
    };
  const c = custom.find((s) => s.id === id);
  if (c)
    return { id: c.id, frames: c.frames, fg: c.fg, builtin: false, kind: 'custom' };
  return null;
}

/**
 * Expand one stamp art frame into painted cells, centered on (cx, cy).
 * Spaces are transparent; art is clipped to the grid.
 */
export function stampCellsFor(
  rows: string[],
  cx: number,
  cy: number,
  fg: string,
  bg: string,
): PaintCell[] {
  const out: PaintCell[] = [];
  const startY = cy - Math.floor(rows.length / 2);
  for (let r = 0; r < rows.length; r++) {
    const chars = [...rows[r]];
    const startX = cx - Math.floor(chars.length / 2);
    for (let c = 0; c < chars.length; c++) {
      const ch = chars[c];
      if (ch === ' ') continue;
      const x = startX + c;
      const y = startY + r;
      if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) continue;
      out.push({ x, y, cell: { ch, fg, bg } });
    }
  }
  return out;
}
