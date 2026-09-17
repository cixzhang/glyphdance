// Brush state shared by the tool rail, the glyph/color panel, the stamp
// library, and the canvas.
export type ToolId =
  | 'select'
  | 'brush'
  | 'erase'
  | 'fill'
  | 'line'
  | 'text'
  | 'stamp'
  | 'pick';

export interface Brush {
  tool: ToolId;
  glyph: string;
  fg: string;
  bg: string;
  /** Selected stamp sprite id when tool === 'stamp'. */
  stampId: string | null;
}

export const DEFAULT_BRUSH: Brush = {
  tool: 'brush',
  glyph: '█',
  fg: '#f8f8f2',
  bg: '',
  stampId: null,
};
