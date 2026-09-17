// Phase 0 stub document model: grid dimensions, frame timing, and the cell
// type. Scene content (sprites, themes) lives in scene.ts; Phase 1 replaces
// both with the real editable document model
// (frames of {ch, fg, bg} cells + per-frame hold times, stamps, palettes).

export const GRID_W = 24;
export const GRID_H = 14;
export const DOC_NAME = 'starfield-01';

export type CellKind = 'bg' | 'inv' | 'star' | 'player';

export interface Cell {
  ch: string;
  kind: CellKind;
  /** Resolved foreground color — the active theme bakes it in per frame. */
  fg: string;
}

export interface StubFrame {
  id: number;
  holdMs: number;
  legs: 0 | 1;
}

export const STUB_FRAMES: StubFrame[] = [
  { id: 1, holdMs: 400, legs: 0 },
  { id: 2, holdMs: 150, legs: 1 },
  { id: 3, holdMs: 400, legs: 0 },
  { id: 4, holdMs: 150, legs: 1 },
];
