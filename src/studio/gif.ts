// gif.ts — export the animation as an animated GIF.
//
// Each frame is rendered with renderFrameToCanvas (same pixels as the PNG
// export), then all frames share one global 256-color palette so colors don't
// flicker between frames. gifenc does the LZW encoding.

import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { renderFrameToCanvas, type PngOptions } from './export.ts';
import type { Frame } from './document.ts';

export interface GifOptions extends PngOptions {
  /** Max width/height in px; frames are downscaled if larger. GIFs get big fast. */
  maxDimension?: number;
}

type RGB = [number, number, number];

/** Global palette: unique colors across every frame, capped at 256. */
function buildPalette(pixels: Uint8ClampedArray[]): RGB[] {
  const seen = new Map<number, RGB>();
  for (const px of pixels) {
    for (let i = 0; i < px.length; i += 4) {
      const key = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
      if (!seen.has(key)) {
        seen.set(key, [px[i], px[i + 1], px[i + 2]]);
        if (seen.size > 512) break;
      }
    }
    if (seen.size > 512) break;
  }
  const colors = [...seen.values()];
  if (colors.length <= 256) return colors;
  // Too many distinct colors (heavy agent art): quantize the union.
  const total = pixels.reduce((n, p) => n + p.length, 0);
  const joined = new Uint8Array(total);
  let off = 0;
  for (const p of pixels) {
    joined.set(p, off);
    off += p.length;
  }
  return quantize(joined, 256).palette as RGB[];
}

export function exportFramesToGif(frames: Frame[], opts: GifOptions = {}): Blob {
  if (frames.length === 0) throw new Error('no frames to export');
  let canvases = frames.map((f) => renderFrameToCanvas(f, opts));
  const maxDim = opts.maxDimension ?? 768;
  let w = canvases[0].width;
  let h = canvases[0].height;
  if (Math.max(w, h) > maxDim) {
    const k = maxDim / Math.max(w, h);
    w = Math.max(1, Math.floor(w * k));
    h = Math.max(1, Math.floor(h * k));
    canvases = canvases.map((src) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      // Keep it crisp: no smoothing on downscale.
      c.getContext('2d')!.imageSmoothingEnabled = false;
      c.getContext('2d')!.drawImage(src, 0, 0, w, h);
      return c;
    });
  }
  const pixels = canvases.map((c) => {
    const ctx = c.getContext('2d')!;
    return ctx.getImageData(0, 0, w, h).data;
  });
  const palette = buildPalette(pixels);

  const gif = new GIFEncoder();
  frames.forEach((frame, i) => {
    const index = applyPalette(pixels[i], palette, 'rgb444');
    gif.writeFrame(index, w, h, {
      palette,
      delay: frame.holdMs,
      first: i === 0,
      repeat: 0, // loop forever
    });
  });
  gif.finish();
  const bytes = gif.bytes();
  // slice() copies into a fresh ArrayBuffer so the BlobPart typing is happy.
  return new Blob([bytes.slice().buffer], { type: 'image/gif' });
}

export function downloadFramesGif(
  docName: string,
  frames: Frame[],
  opts: GifOptions = {},
): void {
  const blob = exportFramesToGif(frames, opts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${docName}.gif`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
