// Phase 0 stub document: a fixed 24×14 scene — a space invader under twinkling stars.
// Phase 1 replaces this with the real editable document model
// (frames of {ch, fg, bg} cells + per-frame hold times, stamps, palettes).

export const GRID_W = 24;
export const GRID_H = 14;
export const DOC_NAME = 'starfield-01';

export type CellKind = 'bg' | 'inv' | 'star';

export interface Cell {
  ch: string;
  kind: CellKind;
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

const INV_A = [
  '  ██      ██  ',
  '   ████████   ',
  '  ██████████  ',
  ' ██ ██████ ██ ',
  ' ████████████ ',
  '   ████████   ',
  '  ██  ██  ██  ',
  ' ███      ███ ',
];

const INV_B = [
  '  ██      ██  ',
  '   ████████   ',
  '  ██████████  ',
  ' ██ ██████ ██ ',
  ' ████████████ ',
  '   ████████   ',
  '   ██    ██   ',
  '  ██      ██  ',
];

// [row, col] star positions; twinkle is a deterministic function of the frame index.
const STARS: Array<[number, number]> = [
  [0, 2],
  [0, 20],
  [1, 22],
  [3, 1],
  [5, 20],
  [7, 21],
  [11, 3],
  [11, 8],
  [11, 21],
  [12, 11],
  [12, 15],
  [13, 6],
  [13, 17],
];

/** Render the stub frame at `frameIndex` into a grid of cells. */
export function frameCells(frameIndex: number): Cell[][] {
  const inv = STUB_FRAMES[frameIndex].legs === 0 ? INV_A : INV_B;
  const rows: Cell[][] = [];
  for (let r = 0; r < GRID_H; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < GRID_W; c++) {
      let ch = '·';
      let kind: CellKind = 'bg';
      const ir = r - 3;
      const ic = c - 5;
      if (ir >= 0 && ir < 8 && ic >= 0 && ic < 14 && inv[ir][ic] !== ' ') {
        ch = '█';
        kind = 'inv';
      }
      row.push({ ch, kind });
    }
    rows.push(row);
  }
  for (const [sr, sc] of STARS) {
    if ((sr * 7 + sc + frameIndex) % 3 > 0) {
      rows[sr][sc] = { ch: '*', kind: 'star' };
    }
  }
  return rows;
}
