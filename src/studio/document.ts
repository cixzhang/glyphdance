// Real document model: a document is an ordered list of frames; each frame
// owns its cells (character + foreground + background). Nothing mutates the
// document directly — humans and the agent go through typed actions
// (actions.ts), which are validated, undoable, and logged.

export const GRID_W = 24;
export const GRID_H = 14;
export const DOC_NAME = 'starfield-01';

export interface Cell {
  /** Single character; ' ' means empty (the canvas dot-grid shows through). */
  ch: string;
  fg: string;
  /** '' means transparent — the canvas background shows through. */
  bg: string;
}

export interface Frame {
  id: string;
  holdMs: number;
  /** Row-major, GRID_W * GRID_H entries. */
  cells: Cell[];
}

export interface DocState {
  name: string;
  /** Canvas theme id (background + dot grid) — chrome, not cell data. */
  themeId: string;
  frames: Frame[];
  /** Index of the selected frame. */
  active: number;
}

export const cellIndex = (x: number, y: number): number => y * GRID_W + x;

export const inBounds = (x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < GRID_W && y < GRID_H;

export const emptyCell = (): Cell => ({ ch: ' ', fg: '#f8f8f2', bg: '' });

let frameSeq = 0;
const nextFrameId = (): string =>
  `f${Date.now().toString(36)}${(frameSeq++).toString(36)}`;

export function blankFrame(holdMs = 400): Frame {
  return {
    id: nextFrameId(),
    holdMs,
    cells: Array.from({ length: GRID_W * GRID_H }, emptyCell),
  };
}

export function cloneFrame(frame: Frame): Frame {
  return {
    ...frame,
    id: nextFrameId(),
    cells: frame.cells.map((c) => ({ ...c })),
  };
}

/** Frame the pointer is on — convenience for paint actions. */
export function cellAt(frame: Frame, x: number, y: number): Cell {
  return frame.cells[cellIndex(x, y)];
}
