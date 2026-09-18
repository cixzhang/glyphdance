// glyphdance-renderer.ts — Standalone renderer for glyphdance frame JSON.
//
// Renders the `glyphdance-frames` format (exported via "JSON · all frames")
// to an HTML canvas, with animation support. Framework-free: works in any
// web page, no dependencies.
//
// Usage:
//   import { renderFrames, playFrames } from './glyphdance-renderer.js';
//
//   // Static: draw frame 0 into a canvas
//   renderFrames(canvas, data);
//
//   // Animated: play all frames, returns a stop function
//   const stop = playFrames(canvas, data);
//
// The JSON format:
// {
//   "kind": "glyphdance-frames",
//   "name": "my-animation",
//   "width": 24, "height": 14,
//   "fontId": "cozette",
//   "frames": [["row1", "row2", ...], ...],
//   "holdMs": [500, 500, ...],
//   "fg": "#e8e6df", "bg": "#1b1b1b",
//   "fgMap": [[["#fff", "", ...], ...], ...],
//   "bgMap": [[["#000", "", ...], ...], ...],
//   "palette": { "fg": [...], "bg": [...] }
// }

export interface GlyphdanceFrames {
  kind: 'glyphdance-frames';
  name: string;
  width: number;
  height: number;
  fontId?: string;
  frames: string[][];
  holdMs: number[];
  fg: string | null;
  bg: string | null;
  fgMap: string[][][];
  bgMap: string[][][];
  palette: { fg: string[]; bg: string[] };
}

export interface RenderOptions {
  /** CSS px per cell (before scale). Default 16. */
  cellPx?: number;
  /** Integer scale for crispness. Default 2. */
  scale?: number;
  /** CSS font-family. Default matches the app's canvas font stack. */
  fontFamily?: string;
  /** Page background when transparent is false. Default '#1b1b1b'. */
  pageBg?: string;
  /** If true, don't paint the page background. Default false. */
  transparent?: boolean;
  /** Frame index to render (for renderFrames). Default 0. */
  frame?: number;
}

// Cell aspect ratio tuned to match the glyphdance canvas display
// (1ch × 1.35em tiles; ch ≈ 0.95em for Cozette).
const CELL_W_EM = 0.95;
const CELL_H_EM = 1.35;

function cellDims(opts: RenderOptions): { cw: number; ch: number; fontPx: number } {
  const cellPx = opts.cellPx ?? 16;
  const scale = opts.scale ?? 2;
  return {
    cw: cellPx * CELL_W_EM * scale,
    ch: cellPx * CELL_H_EM * scale,
    fontPx: cellPx * scale,
  };
}

/**
 * Render a single frame into the canvas. The canvas is resized to fit.
 * Returns the canvas for chaining.
 */
export function renderFrames(
  canvas: HTMLCanvasElement,
  data: GlyphdanceFrames,
  opts: RenderOptions = {},
): HTMLCanvasElement {
  const { cw, ch, fontPx } = cellDims(opts);
  const fi = opts.frame ?? 0;
  if (fi < 0 || fi >= data.frames.length) {
    throw new Error(`frame ${fi} out of range (0..${data.frames.length - 1})`);
  }
  canvas.width = Math.round(data.width * cw);
  canvas.height = Math.round(data.height * ch);
  const ctx = canvas.getContext('2d')!;
  if (!opts.transparent) {
    ctx.fillStyle = opts.pageBg ?? '#1b1b1b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.font = `${fontPx}px ${opts.fontFamily ?? '"Cozette", "IBM VGA", monospace'}`;
  ctx.textBaseline = 'top';

  const rows = data.frames[fi];
  const fgRows = data.fgMap[fi];
  const bgRows = data.bgMap[fi];
  for (let y = 0; y < data.height; y++) {
    const row = rows[y] ?? '';
    for (let x = 0; x < data.width; x++) {
      const chStr = row[x] ?? ' ';
      const px = x * cw;
      const py = y * ch;
      const bg = bgRows?.[y]?.[x] || '';
      if (bg) {
        ctx.fillStyle = bg;
        ctx.fillRect(px, py, cw, ch);
      }
      if (chStr !== ' ') {
        ctx.fillStyle = fgRows?.[y]?.[x] || data.fg || '#fff';
        ctx.fillText(chStr, px, py);
      }
    }
  }
  return canvas;
}

export interface PlaybackHandle {
  /** Stop the animation loop. */
  stop: () => void;
  /** Jump to a specific frame. */
  goto: (frame: number) => void;
  /** Currently displayed frame index. */
  readonly current: number;
}

/**
 * Play all frames in a loop, respecting each frame's holdMs.
 * Returns a handle to stop or seek. Call stop() to clean up.
 */
export function playFrames(
  canvas: HTMLCanvasElement,
  data: GlyphdanceFrames,
  opts: RenderOptions = {},
): PlaybackHandle {
  let frame = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const draw = (fi: number) => {
    frame = fi;
    renderFrames(canvas, data, { ...opts, frame: fi });
  };

  const schedule = () => {
    if (stopped) return;
    const hold = data.holdMs[frame] ?? 500;
    timer = setTimeout(() => {
      if (stopped) return;
      draw((frame + 1) % data.frames.length);
      schedule();
    }, hold);
  };

  draw(0);
  schedule();

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
    goto: (fi: number) => {
      if (fi >= 0 && fi < data.frames.length) draw(fi);
    },
    get current() {
      return frame;
    },
  };
}
