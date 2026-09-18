// Canvas font options for the ASCII grid.

export interface CanvasFont {
  id: string;
  /** Display name, rendered in the font itself for WYSIWYG picking. */
  name: string;
  /** CSS font-family stack. */
  family: string;
  /** Advance width as a fraction of em (for cell sizing). */
  advanceEm: number;
}

export const CANVAS_FONTS: CanvasFont[] = [
  {
    id: 'cozette',
    name: 'Cozette',
    family: '"Cozette", monospace',
    advanceEm: 0.5,
  },
  {
    id: 'vga',
    name: 'IBM VGA',
    family: '"IBM VGA", monospace',
    advanceEm: 0.5,
  },
  {
    id: 'system',
    name: 'System Mono',
    family: 'ui-monospace, "SF Mono", Menlo, monospace',
    advanceEm: 0.6,
  },
];

export function canvasFontById(id: string): CanvasFont {
  return CANVAS_FONTS.find((f) => f.id === id) ?? CANVAS_FONTS[0];
}
