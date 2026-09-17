// Brush state shared by the tool rail, the glyph/color panel, and the canvas.
export interface Brush {
  tool: string;
  glyph: string;
  fg: string;
  bg: string;
}

export const DEFAULT_BRUSH: Brush = {
  tool: 'brush',
  glyph: '█',
  fg: '#f8f8f2',
  bg: '',
};
