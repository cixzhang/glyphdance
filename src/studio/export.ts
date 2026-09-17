// Export: render frames to downloadable TXT and PNG files.
// Pure rendering helpers are exported for testing; the download helpers use
// the DOM and run only in the browser.

import { GRID_H, GRID_W, cellIndex, type Frame } from './document.ts';

/** The active frame as plain text rows (trailing spaces trimmed per row). */
export function frameToText(frame: Frame): string {
  const rows: string[] = [];
  for (let y = 0; y < GRID_H; y++) {
    let row = '';
    for (let x = 0; x < GRID_W; x++) {
      row += frame.cells[cellIndex(x, y)].ch;
    }
    rows.push(row.replace(/\s+$/, ''));
  }
  // Trim trailing empty rows.
  while (rows.length > 0 && rows[rows.length - 1] === '') rows.pop();
  return rows.join('\n');
}

/** The whole document as text: frames separated by a form-feed line. */
export function docToText(frames: Frame[]): string {
  return frames.map(frameToText).join('\n\f\n');
}

export interface PngOptions {
  /** CSS px per cell before the device scale multiplier. */
  cellPx?: number;
  /** Integer scale multiplier for crispness. */
  scale?: number;
  /** Page background when no cell bg and not transparent. */
  pageBg?: string;
  transparent?: boolean;
}

/**
 * Render a frame to an offscreen canvas. Each cell is painted as a filled
 * rect (its bg, or page/transparent) with its glyph drawn in its fg color.
 */
export function renderFrameToCanvas(
  frame: Frame,
  opts: PngOptions = {},
): HTMLCanvasElement {
  const cellPx = opts.cellPx ?? 16;
  const scale = opts.scale ?? 2;
  const w = GRID_W * cellPx * scale;
  const h = GRID_H * cellPx * scale;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  if (!opts.transparent) {
    ctx.fillStyle = opts.pageBg ?? '#0d0f12';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.font = `${cellPx * scale}px "Cozette", "IBM VGA", monospace`;
  ctx.textBaseline = 'top';
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const cell = frame.cells[cellIndex(x, y)];
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
): void {
  const text = frameToText(frame);
  downloadBlob(
    new Blob([text + '\n'], { type: 'text/plain;charset=utf-8' }),
    `${docName}-f${frameIndex + 1}.txt`,
  );
}

export function downloadAllFramesText(docName: string, frames: Frame[]): void {
  const text = docToText(frames);
  downloadBlob(
    new Blob([text + '\n'], { type: 'text/plain;charset=utf-8' }),
    `${docName}-all.txt`,
  );
}

export function downloadFramePng(
  docName: string,
  frameIndex: number,
  frame: Frame,
  opts: PngOptions = {},
): void {
  const canvas = renderFrameToCanvas(frame, opts);
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `${docName}-f${frameIndex + 1}.png`);
  }, 'image/png');
}
