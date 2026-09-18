// Export: render frames to downloadable TXT and PNG files.
// Pure rendering helpers are exported for testing; the download helpers use
// the DOM and run only in the browser.

import { cellIndex, type Frame } from './document.ts';

/** The active frame as plain text rows (trailing spaces trimmed per row). */
export function frameToText(frame: Frame, width: number, height: number): string {
  const rows: string[] = [];
  for (let y = 0; y < height; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      row += frame.cells[cellIndex(x, y, width)].ch;
    }
    rows.push(row.replace(/\s+$/, ''));
  }
  // Trim trailing empty rows.
  while (rows.length > 0 && rows[rows.length - 1] === '') rows.pop();
  return rows.join('\n');
}

/** The whole document as text: frames separated by a form-feed line. */
export function docToText(
  frames: Frame[],
  width: number,
  height: number,
): string {
  return frames.map((f) => frameToText(f, width, height)).join('\n\f\n');
}

/**
 * Frames as stamp-ready JSON: cropped to the bounding box of non-empty
 * cells (shared across frames so animation alignment is preserved), with
 * per-cell fg/bg colors plus the dominant colors. Paste this to the agent
 * to turn art into a stamp.
 */
export function framesToStampJson(
  name: string,
  frames: Frame[],
  width: number,
  height: number,
): string {
  // Bounding box across all frames.
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  const fgCount = new Map<string, number>();
  const bgCount = new Map<string, number>();
  for (const f of frames) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const c = f.cells[cellIndex(x, y, width)];
        if (c.ch === ' ') continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        fgCount.set(c.fg, (fgCount.get(c.fg) ?? 0) + 1);
        if (c.bg) bgCount.set(c.bg, (bgCount.get(c.bg) ?? 0) + 1);
      }
    }
  }
  const top = (m: Map<string, number>): string | null => {
    let best: string | null = null, n = 0;
    for (const [k, v] of m) if (v > n) { best = k; n = v; }
    return best;
  };
  const out: {
    kind: string;
    name: string;
    width: number;
    height: number;
    frames: string[][];
    fg: string | null;
    bg: string | null;
    /** Per-cell colors, parallel to frames: [frame][row] = string of fg/bg
        chars? No — parallel 2D arrays of color strings, '' = default. */
    fgMap: string[][][];
    bgMap: string[][][];
    palette: { fg: string[]; bg: string[] };
  } = {
    kind: 'glyphdance-stamp',
    name,
    width: 0,
    height: 0,
    frames: [],
    fg: top(fgCount),
    bg: top(bgCount),
    fgMap: [],
    bgMap: [],
    palette: { fg: [...fgCount.keys()], bg: [...bgCount.keys()] },
  };
  if (x1 >= x0) {
    out.width = x1 - x0 + 1;
    out.height = y1 - y0 + 1;
    for (const f of frames) {
      const rows: string[] = [];
      const fgRows: string[][] = [];
      const bgRows: string[][] = [];
      for (let y = y0; y <= y1; y++) {
        let row = '';
        const fgRow: string[] = [];
        const bgRow: string[] = [];
        for (let x = x0; x <= x1; x++) {
          const c = f.cells[cellIndex(x, y, width)];
          row += c.ch;
          fgRow.push(c.ch === ' ' ? '' : c.fg);
          bgRow.push(c.ch === ' ' ? '' : c.bg || '');
        }
        rows.push(row);
        fgRows.push(fgRow);
        bgRows.push(bgRow);
      }
      out.frames.push(rows);
      out.fgMap.push(fgRows);
      out.bgMap.push(bgRows);
    }
  }
  return JSON.stringify(out, null, 2);
}

export interface PngOptions {
  /** CSS px per cell before the device scale multiplier. */
  cellPx?: number;
  /** Integer scale multiplier for crispness. */
  scale?: number;
  /** Page background when no cell bg and not transparent. */
  pageBg?: string;
  transparent?: boolean;
  /** CSS font-family for glyphs — must match the canvas display font. */
  fontFamily?: string;
}

/**
 * Render a frame to an offscreen canvas. Each cell is painted as a filled
 * rect (its bg, or page/transparent) with its glyph drawn in its fg color.
 */
export function renderFrameToCanvas(
  frame: Frame,
  width: number,
  height: number,
  opts: PngOptions = {},
): HTMLCanvasElement {
  const cellPx = opts.cellPx ?? 16;
  const scale = opts.scale ?? 2;
  const w = width * cellPx * scale;
  const h = height * cellPx * scale;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  if (!opts.transparent) {
    ctx.fillStyle = opts.pageBg ?? '#1b1b1b';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.font = `${cellPx * scale}px ${opts.fontFamily ?? '"Cozette", "IBM VGA", monospace'}`;
  ctx.textBaseline = 'top';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = frame.cells[cellIndex(x, y, width)];
      const px = x * cellPx * scale;
      const py = y * cellPx * scale;
      if (cell.bg) {
        ctx.fillStyle = cell.bg;
        ctx.fillRect(px, py, cellPx * scale, cellPx * scale);
      }
      if (cell.ch !== ' ') {
        ctx.fillStyle = cell.fg;
        ctx.fillText(cell.ch, px, py);
      }
    }
  }
  return canvas;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadFrameText(
  docName: string,
  frameIndex: number,
  frame: Frame,
  width: number,
  height: number,
): void {
  const text = frameToText(frame, width, height);
  downloadBlob(
    new Blob([text + '\n'], { type: 'text/plain;charset=utf-8' }),
    `${docName}-f${frameIndex + 1}.txt`,
  );
}

export function downloadAllFramesText(
  docName: string,
  frames: Frame[],
  width: number,
  height: number,
): void {
  const text = docToText(frames, width, height);
  downloadBlob(
    new Blob([text + '\n'], { type: 'text/plain;charset=utf-8' }),
    `${docName}-all.txt`,
  );
}

export function downloadStampJson(
  docName: string,
  frames: Frame[],
  width: number,
  height: number,
): void {
  const json = framesToStampJson(docName, frames, width, height);
  downloadBlob(
    new Blob([json + '\n'], { type: 'application/json;charset=utf-8' }),
    `${docName}-stamp.json`,
  );
}

export function downloadFramePng(
  docName: string,
  frameIndex: number,
  frame: Frame,
  width: number,
  height: number,
  opts: PngOptions = {},
): void {
  const canvas = renderFrameToCanvas(frame, width, height, opts);
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `${docName}-f${frameIndex + 1}.png`);
  }, 'image/png');
}
