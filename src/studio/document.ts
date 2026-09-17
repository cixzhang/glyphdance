// Real document model: a document is an ordered list of frames; each frame
// owns its cells (character + foreground + background). Nothing mutates the
// document directly — humans and the agent go through typed actions
// (actions.ts), which are validated, undoable, and logged.

export const GRID_W = 24;
export const GRID_H = 14;
export const DOC_NAME = 'starfield-01';

/** Canvas size limits for the resizeCanvas action. */
export const MIN_CANVAS_W = 4;
export const MAX_CANVAS_W = 64;
export const MIN_CANVAS_H = 4;
export const MAX_CANVAS_H = 48;

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

/**
 * A user/agent-created stamp: reusable ASCII art living in the document
 * (built-in sprites stay in scene.ts). frames[0] is what the stamp tool
 * places; extra frames are animation variants.
 */
export interface CustomStamp {
  /** Lowercase slug, unique across built-in and custom stamps. */
  id: string;
  fg: string;
  /** Animation frames; each frame is an array of equal-ish character rows. */
  frames: string[][];
}

export interface DocState {
  name: string;
  /** Canvas theme id (background + dot grid) — chrome, not cell data. */
  themeId: string;
  /** Canvas size in cells. Frames' cells arrays are always width*height. */
  width: number;
  height: number;
  frames: Frame[];
  /** Index of the selected frame. */
  active: number;
  /** User/agent-created stamps, placeable from the Stamps panel. */
  stamps: CustomStamp[];
}

/**
 * Content equality for render memoization: everything except the selected
 * frame index. The action layer's setActive spreads the doc and keeps the
 * frames/stamps array identities, so during playback this is an O(1)
 * reference check that lets side panels skip re-rendering on every tick —
 * only the canvas and the timeline (which actually show the frame) update.
 */
export function docContentEqual(a: DocState, b: DocState): boolean {
  return (
    a === b ||
    (a.name === b.name &&
      a.themeId === b.themeId &&
      a.width === b.width &&
      a.height === b.height &&
      a.frames === b.frames &&
      a.stamps === b.stamps)
  );
}

export const cellIndex = (x: number, y: number, w: number = GRID_W): number =>
  y * w + x;

export const inBounds = (
  x: number,
  y: number,
  w: number = GRID_W,
  h: number = GRID_H,
): boolean => x >= 0 && y >= 0 && x < w && y < h;

export const emptyCell = (): Cell => ({ ch: ' ', fg: '#f8f8f2', bg: '' });

let frameSeq = 0;
const nextFrameId = (): string =>
  `f${Date.now().toString(36)}${(frameSeq++).toString(36)}`;

export function blankFrame(
  holdMs = 400,
  w: number = GRID_W,
  h: number = GRID_H,
): Frame {
  return {
    id: nextFrameId(),
    holdMs,
    cells: Array.from({ length: w * h }, emptyCell),
  };
}

export function cloneFrame(frame: Frame): Frame {
  return {
    ...frame,
    id: nextFrameId(),
    cells: frame.cells.map((c) => ({ ...c })),
  };
}

/**
 * Reallocate a frame's cells to a new size. Existing content is placed at
 * (dx, dy) in the new grid — pass the centering offsets (or omit them to
 * center). Cells that fall outside the new grid are cropped; new cells are
 * empty. The offsets make undo exact: resizing back with (-dx, -dy)
 * restores every cell, even for odd size differences.
 */
export function resizeCells(
  cells: Cell[],
  oldW: number,
  oldH: number,
  newW: number,
  newH: number,
  dx: number = Math.floor((newW - oldW) / 2),
  dy: number = Math.floor((newH - oldH) / 2),
): Cell[] {
  const out = Array.from({ length: newW * newH }, emptyCell);
  for (let y = 0; y < oldH; y++) {
    for (let x = 0; x < oldW; x++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= newW || ny >= newH) continue;
      out[ny * newW + nx] = { ...cells[y * oldW + x] };
    }
  }
  return out;
}

/** Frame the pointer is on — convenience for paint actions. */
export function cellAt(frame: Frame, x: number, y: number): Cell {
  return frame.cells[cellIndex(x, y)];
}
