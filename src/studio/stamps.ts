// stamps.ts — stamp resolution shared by the canvas, the action layer, and
// the agent. Built-in sprites live in scene.ts; user/agent-created stamps live
// in the document (doc.stamps).

import {
  ET_SPRITES,
  PLAYER_SPRITES,
  CRITTER_SPRITES,
  SPACE_SPRITES,
  NATURE_SPRITES,
  PLAY_SPRITES,
  type Sprite,
} from './scene.ts';
import {
  GRID_H,
  GRID_W,
  type CustomStamp,
} from './document.ts';
import type { PaintCell } from './actions.ts';

export type StampKind =
  | 'invader'
  | 'player'
  | 'critter'
  | 'space'
  | 'nature'
  | 'play'
  | 'custom';

export interface ResolvedStamp {
  id: string;
  frames: string[][];
  /** Null for built-ins (they use theme invader/player colors). */
  fg: string | null;
  builtin: boolean;
  kind: StampKind;
}

const BUILTIN: Array<{ sprites: Sprite[]; kind: StampKind }> = [
  { sprites: ET_SPRITES, kind: 'invader' },
  { sprites: PLAYER_SPRITES, kind: 'player' },
  { sprites: CRITTER_SPRITES, kind: 'critter' },
  { sprites: SPACE_SPRITES, kind: 'space' },
  { sprites: NATURE_SPRITES, kind: 'nature' },
  { sprites: PLAY_SPRITES, kind: 'play' },
];

/**
 * Which theme-swatch role paints a stamp kind — the single source of truth
 * for panel previews and canvas placement, so built-ins always follow the
 * document's theme: critters/space read pale (star), nature reads green
 * (invader), play reads candy (player).
 */
export function kindSwatchKey(kind: StampKind): 'invader' | 'player' | 'star' {
  switch (kind) {
    case 'player':
    case 'play':
      return 'player';
    case 'nature':
      return 'invader';
    case 'critter':
    case 'space':
      return 'star';
    default:
      return 'invader';
  }
}

/** All built-in stamp ids (invaders + ships + the new variety packs). */
export function builtinStampIds(): string[] {
  return BUILTIN.flatMap((b) => b.sprites.map((s) => s.id));
}

/** Find a stamp by id across built-ins and the document's custom stamps. */
export function resolveStamp(
  id: string,
  custom: CustomStamp[],
): ResolvedStamp | null {
  for (const b of BUILTIN) {
    const s = b.sprites.find((s) => s.id === id);
    if (s)
      return {
        id: s.id,
        frames: s.frames,
        fg: null,
        builtin: true,
        kind: b.kind,
      };
  }
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
  w: number = GRID_W,
  h: number = GRID_H,
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
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      out.push({ x, y, cell: { ch, fg, bg } });
    }
  }
  return out;
}
