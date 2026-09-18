// stamps.ts — stamp resolution shared by the canvas, the action layer, and
// the agent. Built-in sprites live in scene.ts; user/agent-created stamps live
// in the document (doc.stamps).

import {
  ET_SPRITES,
  CRITTER_SPRITES,
  NATURE_SPRITES,
  FACE_SPRITES,
  ITEM_SPRITES,
  OBJECT_SPRITES,
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
  | 'critter'
  | 'nature'
  | 'face'
  | 'item'
  | 'object'
  | 'custom';

export interface ResolvedStamp {
  id: string;
  frames: string[][];
  /** Null for built-ins (they use theme invader/player colors). */
  fg: string | null;
  /** Fixed background, or null for transparent. */
  bg: string | null;
  /** Per-cell colors for multicolor stamps, parallel to frames. */
  fgMap: string[][][] | null;
  bgMap: string[][][] | null;
  builtin: boolean;
  kind: StampKind;
}

const BUILTIN: Array<{ sprites: Sprite[]; kind: StampKind }> = [
  { sprites: ET_SPRITES, kind: 'invader' },
  { sprites: CRITTER_SPRITES, kind: 'critter' },
  { sprites: NATURE_SPRITES, kind: 'nature' },
  { sprites: FACE_SPRITES, kind: 'face' },
  { sprites: ITEM_SPRITES, kind: 'item' },
  { sprites: OBJECT_SPRITES, kind: 'object' },
];

/**
 * Which theme-swatch role paints a stamp kind — the single source of truth
 * for panel previews and canvas placement, so built-ins always follow the
 * document's theme: critters/faces read pale (star), nature reads green
 * (invader), items/objects read candy (player).
 */
export function kindSwatchKey(kind: StampKind): 'invader' | 'player' | 'star' {
  switch (kind) {
    case 'item':
    case 'object':
      return 'player';
    case 'nature':
      return 'invader';
    case 'critter':
    case 'face':
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
        fg: s.fg ?? null,
        bg: s.bg ?? null,
        fgMap: s.fgMap ?? null,
        bgMap: s.bgMap ?? null,
        builtin: true,
        kind: b.kind,
      };
  }
  const c = custom.find((s) => s.id === id);
  if (c)
    return { id: c.id, frames: c.frames, fg: c.fg, bg: null, fgMap: null, bgMap: null, builtin: false, kind: 'custom' };
  return null;
}

/**
 * Expand one stamp art frame into painted cells, centered on (cx, cy).
 * Spaces are transparent; art is clipped to the grid. If fgMap/bgMap are
 * provided (parallel to rows), per-cell colors override the single fg/bg.
 */
export function stampCellsFor(
  rows: string[],
  cx: number,
  cy: number,
  fg: string,
  bg: string,
  w: number = GRID_W,
  h: number = GRID_H,
  fgMap?: string[][] | null,
  bgMap?: string[][] | null,
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
      const cellFg = fgMap?.[r]?.[c] || fg;
      const cellBg = bgMap?.[r]?.[c] || bg;
      out.push({ x, y, cell: { ch, fg: cellFg, bg: cellBg } });
    }
  }
  return out;
}
