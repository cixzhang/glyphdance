import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as stylex from '@stylexjs/stylex';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { Kbd } from '@astryxdesign/core/Kbd';
import { IconSparkles, IconGrid, IconZoomIn, IconZoomOut, IconPanels, IconClose } from './icons';
import Transport from './Transport.tsx';
import { TOOLS } from './ToolRail.tsx';
import {
  cellIndex,
  inBounds,
  type Cell,
  type DocState,
} from './document.ts';
import type { PaintCell } from './actions.ts';
import { toSupportedText } from './glyphs.ts';
import { themeById } from './scene.ts';
import { resolveStamp, kindSwatchKey } from './stamps.ts';
import type { Brush, ToolId } from './brush.ts';

const styles = stylex.create({
  wrap: {
    // Fill the grid area exactly. height:100% can resolve against the
    // viewport in iOS PWA, making the canvas viewport-tall and its
    // Dracula background show as a dead band below the toolbar.
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  wrapZoomed: {
    overflow: 'auto',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 24,
  },
  // When zoomed the grid pins to the top-left so every corner stays
  // reachable by scrolling (margin: auto would center it and clip the
  // start edge).
  gridZoomed: {
    margin: 0,
  },
  grid: {
    fontFamily: 'var(--font-family-code)',
    // Cell size comes from --gd-cell (responsive), zoom multiplies it.
    // AsciiThumb overrides fontSize inline, so thumbnails are unaffected.
    '--gd-cell': 'clamp(10px, 1.9vw, 22px)',
    fontSize: 'calc(var(--gd-cell) * var(--gd-zoom, 1))',
    // 1.083 = Cozette's natural line box: hhea ascent 853 + descent 256 over
    // 1024 upm (USE_TYPO_METRICS is off, so `normal` resolves the same).
    // Block/shade glyphs span the full box, so rows at exactly this height
    // sit directly adjacent — fills connect vertically with no gaps — and
    // nothing clips, because every glyph fits inside the hhea box.
    lineHeight: 1.083,
    letterSpacing: 0,
    margin: 'auto',
    userSelect: 'none',
    whiteSpace: 'pre',
    touchAction: 'none',
    cursor: 'crosshair',
    '@media (max-width: 760px)': {
      '--gd-cell': 'clamp(15px, 5vw, 24px)',
    },
  },
  // Cell grid lines drawn as a background: each tile is exactly one cell
  // (1ch wide, 1.083em tall — Cozette's natural line box), so the lines
  // fall between characters.
  gridLines: {
    backgroundImage:
      'linear-gradient(to bottom, var(--gd-gridline) 1px, transparent 1px),' +
      'linear-gradient(to right, var(--gd-gridline) 1px, transparent 1px)',
    backgroundSize: '1ch 1.083em',
  },
  row: { display: 'block', height: '1.083em' },
  // Each cell is an inline-block tile exactly 1ch × 1.083em — the same tile
  // the grid-lines background and rows use — so painted backgrounds tile
  // seamlessly: no vertical gaps between rows, fills connect.
  cell: {
    display: 'inline-block',
    width: '1ch',
    height: '1.083em',
    lineHeight: '1.083',
    textAlign: 'center',
    verticalAlign: 'top',
    overflow: 'hidden',
  },
  fab: {
    position: 'absolute',
    top: 10,
    right: 10,
    display: 'flex',
    gap: 4,
    backgroundColor: 'var(--gd-float)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: 4,
    backdropFilter: 'blur(6px)',
    zIndex: 2,
  },
  // Mobile only: playback floats top-left so the timeline strip can give
  // the frame filmstrip the full width.
  transportFab: {
    position: 'absolute',
    top: 10,
    left: 10,
    display: 'flex',
    gap: 4,
    backgroundColor: 'var(--gd-float)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: 4,
    backdropFilter: 'blur(6px)',
    zIndex: 2,
    '@media (min-width: 761px)': { display: 'none' },
  },
  // Mobile only: the active tool, as icon + label, bottom-right.
  toolBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'var(--gd-float)',
    border: '1px solid var(--color-border)',
    borderRadius: 999,
    padding: '5px 12px 5px 8px',
    backdropFilter: 'blur(6px)',
    zIndex: 2,
    pointerEvents: 'none',
    '@media (min-width: 761px)': { display: 'none' },
  },
  // Shown only on mobile (inside the floating view bar).
  mobileOnly: {
    display: 'none',
    '@media (max-width: 760px)': { display: 'contents' },
  },
  textBar: {
    position: 'absolute',
    bottom: 44,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'var(--gd-float)',
    border: '1px solid var(--gd-accent)',
    borderRadius: 8,
    padding: 8,
    zIndex: 2,
    backdropFilter: 'blur(6px)',
  },
  textField: {
    width: 170,
    fontFamily: 'var(--font-family-code)',
  },
  pill: {
    position: 'absolute',
    top: 14,
    left: '50%',
    transform: 'translateX(-50%)',
    borderRadius: 999,
    // On mobile the top bar's Agent button is the entry point — the pill
    // would just eat canvas space.
    '@media (max-width: 760px)': { display: 'none' },
    backdropFilter: 'blur(6px)',
    zIndex: 2,
  },
  status: {
    position: 'absolute',
    left: 14,
    bottom: 12,
    fontFamily: 'var(--font-family-code)',
    fontSize: 11,
    color: 'var(--color-text-secondary)',
    backgroundColor: 'var(--gd-float)',
    border: '1px solid var(--color-border)',
    borderRadius: 6,
    padding: '4px 9px',
  },
  phase: {
    position: 'absolute',
    right: 14,
    bottom: 12,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-text-disabled)',
    border: '1px dashed var(--color-border)',
    borderRadius: 6,
    padding: '4px 8px',
    // Scaffold chrome — hidden on mobile where space is precious.
    '@media (max-width: 760px)': { display: 'none' },
  },
});

const GHOST_DARK = 'rgba(180,140,232,0.4)';
const GHOST_LIGHT = 'rgba(124,58,237,0.5)';
const VIGNETTE_DARK =
  'radial-gradient(circle at 50% 40%, transparent 0%, rgba(0,0,0,0.4) 100%)';
const VIGNETTE_LIGHT =
  'radial-gradient(circle at 50% 40%, transparent 0%, rgba(60,50,40,0.14) 100%)';

type Mode = 'light' | 'dark';

/** Bresenham cells for a line — shared by the line tool and stroke smoothing. */
function lineCells(x0: number, y0: number, x1: number, y1: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return out;
}

/** Flood fill from (x, y): every connected cell identical to the target
 *  (char + fg + bg) becomes the brush cell. */
function floodFill(
  cells: Cell[],
  x: number,
  y: number,
  brush: Brush,
  w: number,
  h: number,
): PaintCell[] {
  if (!inBounds(x, y, w, h)) return [];
  const target = cells[cellIndex(x, y, w)];
  const repl: Cell = { ch: brush.glyph, fg: brush.fg, bg: brush.bg };
  const same = (c: Cell) =>
    c.ch === target.ch && c.fg === target.fg && c.bg === target.bg;
  if (same(repl)) return [];
  const seen = new Set<number>();
  const out: PaintCell[] = [];
  const stack: Array<[number, number]> = [[x, y]];
  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    if (!inBounds(cx, cy, w, h)) continue;
    const i = cellIndex(cx, cy, w);
    if (seen.has(i) || !same(cells[i])) continue;
    seen.add(i);
    out.push({ x: cx, y: cy, cell: repl });
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return out;
}

/** Full-size character grid for the canvas. Empty cells render the theme's
 *  dot so the grid reads as graph paper; the document only stores real marks. */
export function AsciiGrid({
  doc,
  frame,
  onionOn,
  mode,
  brush,
  gridOn,
  zoom,
  onPaint,
  onPick,
  onPlaceStamp,
  playing,
  onTogglePlay,
}: {
  doc: DocState;
  frame: number;
  onionOn: boolean;
  mode: Mode;
  brush: Brush;
  gridOn: boolean;
  zoom: number;
  onPaint: (cells: PaintCell[], stroke: string) => void;
  onPick: (cell: Cell) => void;
  /** Stamp tap: the App spreads the stamp's frames across document frames. */
  onPlaceStamp: (stampId: string, x: number, y: number, fg: string) => void;
  /** Pausing playback when a text session anchors (typing while frames
   *  advance strands keystrokes across frames). */
  playing: boolean;
  onTogglePlay: () => void;
}) {
  const theme = themeById(doc.themeId)[mode];
  const cells = doc.frames[frame].cells;
  // Canvas size aliases — the grid renders at the document's size, not the
  // historical 24×14 constants.
  const W = doc.width;
  const H = doc.height;
  const prevCells = useMemo(() => {
    if (!onionOn || doc.frames.length < 2) return null;
    return doc.frames[(frame - 1 + doc.frames.length) % doc.frames.length].cells;
  }, [doc.frames, frame, onionOn]);

  // One stroke = one undo step: the store merges paintCells actions that
  // share a stroke id into a single history entry.
  const strokeRef = useRef<{ id: string; painted: Set<string>; last: [number, number] } | null>(null);
  const strokeSeq = useRef(0);
  const nextStroke = () => `s${++strokeSeq.current}`;

  // Text tool: tap a cell to anchor; keystrokes paint LIVE into the grid.
  // The whole session shares one stroke id → a single undo step.
  // Backspace restores each cell's pre-session content.
  // textCaret is the insertion index into textValue; arrow keys move it
  // (and the outlined grid caret follows), typing inserts at it,
  // Backspace/Delete remove around it, Up/Down nudge the line between rows.
  const [textAnchor, setTextAnchor] = useState<[number, number] | null>(null);
  const [textValue, setTextValue] = useState('');
  const [textCaret, setTextCaret] = useState(0);
  const textStroke = useRef<string | null>(null);
  const textOrig = useRef(new Map<string, Cell>());
  const textInputRef = useRef<HTMLInputElement>(null);
  const clearTextSession = useCallback(() => {
    setTextAnchor(null);
    setTextValue('');
    setTextCaret(0);
    textStroke.current = null;
    textOrig.current = new Map();
  }, []);
  // Switching frames commits the live text (paints are already on the grid).
  const frameRef = useRef(frame);
  useEffect(() => {
    if (frameRef.current !== frame) {
      frameRef.current = frame;
      clearTextSession();
    }
  }, [frame, clearTextSession]);

  // Mirror the input into the grid on every keystroke: restore the
  // session's previous paints, then paint the new string. Originals are
  // captured once per cell (first touch wins from the fresh grid), so
  // backspace always restores the pre-session content and the store
  // merges the session into one undo step.
  // setText paints `str` at `anchor` and moves the caret; the native
  // input cursor is synced to match so the two never disagree.
  const setText = (anchor: [number, number], v: string, caret: number) => {
    const id = textStroke.current;
    if (!id) return;
    const [ax, ay] = anchor;
    // The font can't draw everything (emoji, ★, …) — filter the input so
    // the field and the grid never disagree, and a rejected paintCells
    // batch can never swallow the whole keystroke.
    const clean = toSupportedText(v, caret);
    const str = clean.text.slice(0, W - ax);
    const restore: PaintCell[] = [];
    textOrig.current.forEach((orig, key) => {
      const [x, y] = key.split(',').map(Number);
      restore.push({ x, y, cell: { ...orig } });
    });
    const paint: PaintCell[] = [];
    [...str].forEach((ch, i) => {
      const x = ax + i;
      if (!inBounds(x, ay, W, H)) return;
      const key = `${x},${ay}`;
      if (!textOrig.current.has(key)) {
        textOrig.current.set(key, cells[cellIndex(x, ay, W)]);
      }
      paint.push({ x, y: ay, cell: { ch, fg: brush.fg, bg: brush.bg } });
    });
    if (restore.length > 0 || paint.length > 0) {
      onPaint([...restore, ...paint], id);
    }
    const c = Math.max(0, Math.min(clean.caret, [...str].length));
    setTextValue(str);
    setTextCaret(c);
    requestAnimationFrame(() => {
      const el = textInputRef.current;
      if (el && document.activeElement === el) {
        try {
          el.setSelectionRange(c, c);
        } catch {
          /* non-text inputs — ignore */
        }
      }
    });
  };
  const syncTextLive = (v: string) => {
    if (textAnchor) setText(textAnchor, v, v.length);
  };
  /** Commit: keep the live paints, dismiss the bar. */
  const commitText = () => clearTextSession();
  /** Cancel: paint every touched cell back to its pre-session content. */
  const cancelText = () => {
    const id = textStroke.current;
    if (id && textOrig.current.size > 0) {
      const restore: PaintCell[] = [];
      textOrig.current.forEach((orig, key) => {
        const [x, y] = key.split(',').map(Number);
        restore.push({ x, y, cell: { ...orig } });
      });
      // Same stroke id → merges into the session's undo step (a no-op
      // entry), so the grid is exactly as before the session.
      onPaint(restore, id);
    }
    clearTextSession();
  };

  // Per-tool dispose: when a tool is toggled off, run its cleanup so no
  // in-progress state (a text draft) lingers after the switch. Tools
  // without draft state need no case.
  const disposeTool = (tool: ToolId) => {
    switch (tool) {
      case 'text':
        // Live paints stay — switching tools commits the text.
        commitText();
        break;
    }
  };
  const prevToolRef = useRef<ToolId>(brush.tool);
  useEffect(() => {
    if (prevToolRef.current !== brush.tool) {
      disposeTool(prevToolRef.current);
      prevToolRef.current = brush.tool;
    }
  }, [brush.tool]);

  const paintFreehand = (x0: number, y0: number, x1: number, y1: number, id: string, painted: Set<string>) => {
    // Bresenham so fast drags don't leave dotted strokes.
    const out: PaintCell[] = [];
    for (const [x, y] of lineCells(x0, y0, x1, y1)) {
      const key = `${x},${y}`;
      if (inBounds(x, y, W, H) && !painted.has(key)) {
        painted.add(key);
        const cell: Cell =
          brush.tool === 'erase'
            ? { ch: ' ', fg: brush.fg, bg: '' }
            : { ch: brush.glyph, fg: brush.fg, bg: brush.bg };
        out.push({ x, y, cell });
      }
    }
    if (out.length > 0) onPaint(out, id);
  };

  const placeStamp = (x: number, y: number, id: string, placed: Set<string>) => {
    const key = `${x},${y}`;
    if (placed.has(key)) return;
    placed.add(key);
    if (!brush.stampId) return;
    const stamp = resolveStamp(brush.stampId, doc.stamps);
    if (!stamp) return;
    const fg = stamp.fg ?? theme[kindSwatchKey(stamp.kind)];
    // The App spreads the stamp's animation frames across the document
    // frames — one tap and the stamp animates to the end of the timeline.
    onPlaceStamp(brush.stampId, x, y, fg);
  };

  const beginStroke = (x: number, y: number) => {
    if (!inBounds(x, y, W, H)) return;
    switch (brush.tool) {
      case 'pick':
        onPick(cells[cellIndex(x, y, W)]);
        return;
      case 'fill': {
        const out = floodFill(cells, x, y, brush, W, H);
        if (out.length > 0) onPaint(out, nextStroke());
        return;
      }
      case 'text':
        // Tapping a new cell commits the previous session (paints are
        // already live) and starts a fresh one anchored here. Pause
        // playback first: typing while frames advance strands keystrokes
        // across frames.
        if (playing) onTogglePlay();
        clearTextSession();
        setTextAnchor([x, y]);
        setTextCaret(0);
        textStroke.current = nextStroke();
        return;
      case 'stamp': {
        const id = nextStroke();
        const placed = new Set<string>();
        strokeRef.current = { id, painted: placed, last: [x, y] };
        placeStamp(x, y, id, placed);
        return;
      }
      case 'select':
        return;
      default: {
        // brush + erase: freehand.
        const id = nextStroke();
        const painted = new Set<string>();
        strokeRef.current = { id, painted, last: [x, y] };
        paintFreehand(x, y, x, y, id, painted);
      }
    }
  };

  const continueStroke = (x: number, y: number, buttons: number) => {
    if (!(buttons & 1)) return;
    const s = strokeRef.current;
    if (s === null) return;
    if (brush.tool === 'stamp') {
      if (inBounds(x, y, W, H)) placeStamp(x, y, s.id, s.painted);
      return;
    }
    if (brush.tool === 'brush' || brush.tool === 'erase') {
      paintFreehand(s.last[0], s.last[1], x, y, s.id, s.painted);
      s.last = [x, y];
    }
  };

  const endStroke = () => {
    strokeRef.current = null;
  };

  const cursor =
    brush.tool === 'text' ? 'text' : brush.tool === 'pick' ? 'copy' : 'crosshair';

  return (
    <>
      <pre
        {...stylex.props(styles.grid, gridOn && styles.gridLines, zoom > 1 && styles.gridZoomed)}
        style={{ '--gd-zoom': zoom, cursor } as CSSProperties}
        aria-label="Animation canvas"
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onDragStart={(e) => e.preventDefault()}
      >
        {Array.from({ length: H }, (_, r) => (
          <span key={r} {...stylex.props(styles.row)}>
            {Array.from({ length: W }, (_, c) => {
              const cell = cells[cellIndex(c, r, W)];
              const empty = cell.ch === ' ';
              const ghost =
                onionOn &&
                empty &&
                prevCells !== null &&
                prevCells[cellIndex(c, r, W)].ch !== ' ';
              const ghostCell = ghost && prevCells ? prevCells[cellIndex(c, r, W)] : null;
              const shownCh = ghost && ghostCell ? ghostCell.ch : empty ? '·' : cell.ch;
              // Caret: the next cell the text tool will type into.
              const caret =
                textAnchor !== null &&
                textAnchor[0] + textCaret === c &&
                textAnchor[1] === r;
              return (
                <span
                  key={c}
                  {...stylex.props(styles.cell)}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    beginStroke(c, r);
                  }}
                  onPointerEnter={(e) => continueStroke(c, r, e.buttons)}
                  style={{
                    color: ghost
                      ? mode === 'dark'
                        ? GHOST_DARK
                        : GHOST_LIGHT
                      : empty
                        ? theme.dot
                        : cell.fg,
                    backgroundColor: !empty && cell.bg ? cell.bg : undefined,
                    textShadow: ghost || empty ? 'none' : `0 0 10px ${cell.fg}66`,
                    outline: caret ? '1px solid var(--gd-accent)' : undefined,
                    outlineOffset: caret ? -1 : undefined,
                  }}
                >
                  {shownCh}
                </span>
              );
            })}
            {'\n'}
          </span>
        ))}
      </pre>
      {textAnchor !== null && (
        <div {...stylex.props(styles.textBar)}>
          <TextInput
            label="Text to place on the canvas"
            isLabelHidden
            hasAutoFocus
            size="sm"
            ref={textInputRef}
            value={textValue}
            onChange={syncTextLive}
            onEnter={commitText}
            onPaste={(e) => {
              const anchor = textAnchor;
              if (!anchor) return;
              e.preventDefault();
              const clip = e.clipboardData?.getData('text') ?? '';
              if (!clip) return;
              const el = e.currentTarget as unknown as HTMLInputElement;
              const pos =
                typeof el.selectionStart === 'number'
                  ? el.selectionStart
                  : textCaret;
              setText(
                anchor,
                textValue.slice(0, pos) + clip + textValue.slice(pos),
                pos + clip.length,
              );
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelText();
                return;
              }
              // Let IME composition and modified keys through untouched.
              const native = e.nativeEvent as unknown as {
                isComposing?: boolean;
              };
              if (native.isComposing || e.ctrlKey || e.metaKey || e.altKey)
                return;
              const anchor = textAnchor;
              if (!anchor) return;
              // Read the live native cursor so a mouse/touch reposition
              // can't desync it from the grid caret.
              const el = e.currentTarget;
              const pos =
                typeof el.selectionStart === 'number'
                  ? el.selectionStart
                  : textCaret;
              // An active selection (e.g. select-all) spans [pos, selEnd);
              // edits must operate on the selection, not just the caret.
              const selEnd =
                typeof el.selectionEnd === 'number'
                  ? el.selectionEnd
                  : textCaret;
              const hasSel = selEnd !== pos;
              const move = (c: number) => {
                e.preventDefault();
                setText(anchor, textValue, c);
              };
              switch (e.key) {
                case 'ArrowLeft':
                  move(Math.max(0, pos - 1));
                  return;
                case 'ArrowRight':
                  move(Math.min(textValue.length, pos + 1));
                  return;
                case 'ArrowUp':
                case 'ArrowDown': {
                  // Nudge the whole line between rows; caret index stays.
                  e.preventDefault();
                  const ny = Math.max(
                    0,
                    Math.min(
                      H - 1,
                      anchor[1] + (e.key === 'ArrowUp' ? -1 : 1),
                    ),
                  );
                  if (ny !== anchor[1]) {
                    const next: [number, number] = [anchor[0], ny];
                    setTextAnchor(next);
                    setText(next, textValue, pos);
                  }
                  return;
                }
                case 'Home':
                  move(0);
                  return;
                case 'End':
                  move(textValue.length);
                  return;
                case 'Backspace':
                  e.preventDefault();
                  if (hasSel) {
                    setText(
                      anchor,
                      textValue.slice(0, pos) + textValue.slice(selEnd),
                      pos,
                    );
                  } else if (pos > 0) {
                    setText(
                      anchor,
                      textValue.slice(0, pos - 1) + textValue.slice(pos),
                      pos - 1,
                    );
                  }
                  return;
                case 'Delete':
                  e.preventDefault();
                  if (hasSel) {
                    setText(
                      anchor,
                      textValue.slice(0, pos) + textValue.slice(selEnd),
                      pos,
                    );
                  } else if (pos < textValue.length) {
                    setText(
                      anchor,
                      textValue.slice(0, pos) + textValue.slice(pos + 1),
                      pos,
                    );
                  }
                  return;
                default:
                  // Printable character: replace any selection, insert at caret.
                  if (e.key.length === 1) {
                    e.preventDefault();
                    setText(
                      anchor,
                      textValue.slice(0, pos) + e.key + textValue.slice(selEnd),
                      pos + 1,
                    );
                  }
              }
            }}
            placeholder={`Type up to ${W - textAnchor[0]} characters — live on the canvas…`}
            xstyle={styles.textField}
          />
          <Button
            label="Done typing"
            variant="primary"
            size="sm"
            onClick={commitText}
          >
            Done
          </Button>
          {/* Discard restores the pre-session cells — mobile keyboards have no Escape. */}
          <IconButton
            label="Discard text"
            icon={<IconClose />}
            variant="ghost"
            size="sm"
            tooltip="Discard the text"
            onClick={cancelText}
          />
        </div>
      )}
    </>
  );
}

/** Tiny render of a frame for the timeline filmstrip. */
export function AsciiThumb({
  cells,
  width,
  height,
  dot,
  bg,
}: {
  cells: Cell[];
  width: number;
  height: number;
  dot: string;
  bg: string;
}) {
  return (
    <pre
      {...stylex.props(styles.grid)}
      style={{ fontSize: 4.5, lineHeight: 1.083, backgroundColor: bg }}
      aria-hidden="true"
    >
      {Array.from({ length: height }, (_, r) => (
        <span key={r} {...stylex.props(styles.row)}>
          {Array.from({ length: width }, (_, c) => {
            const cell = cells[cellIndex(c, r, width)];
            const empty = cell.ch === ' ';
            return (
              <span
                key={c}
                {...stylex.props(styles.cell)}
                style={{
                  color: empty ? dot : cell.fg,
                  backgroundColor: !empty && cell.bg ? cell.bg : undefined,
                }}
              >
                {empty ? '·' : cell.ch}
              </span>
            );
          })}
          {'\n'}
        </span>
      ))}
    </pre>
  );
}

interface CanvasProps {
  doc: DocState;
  onionOn: boolean;
  mode: Mode;
  brush: Brush;
  gridOn: boolean;
  zoom: number;
  onToggleGrid: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPaint: (cells: PaintCell[], stroke: string) => void;
  onPick: (cell: Cell) => void;
  /** Stamp tap: the App spreads the stamp's frames across document frames. */
  onPlaceStamp: (stampId: string, x: number, y: number, fg: string) => void;
  onOpenAgent: () => void;
  /** Mobile only: the playback transport floats top-left of the canvas. */
  playing: boolean;
  onJumpStart: () => void;
  onStepBack: () => void;
  onTogglePlay: () => void;
  onStepFwd: () => void;
  onJumpEnd: () => void;
  /** Mobile only: opens the control-panels drawer. */
  onOpenControls: () => void;
}

export default function Canvas({
  doc,
  onionOn,
  mode,
  brush,
  gridOn,
  zoom,
  onToggleGrid,
  onZoomIn,
  onZoomOut,
  onPaint,
  onPick,
  onPlaceStamp,
  onOpenAgent,
  playing,
  onJumpStart,
  onStepBack,
  onTogglePlay,
  onStepFwd,
  onJumpEnd,
  onOpenControls,
}: CanvasProps) {
  const theme = themeById(doc.themeId)[mode];
  const activeTool = TOOLS.find((t) => t.id === brush.tool) ?? TOOLS[1];
  return (
    <div
      {...stylex.props(styles.wrap, zoom > 1 && styles.wrapZoomed)}
      style={{
        backgroundColor: theme.bg,
        backgroundImage: mode === 'dark' ? VIGNETTE_DARK : VIGNETTE_LIGHT,
        '--gd-gridline': mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
      } as CSSProperties}
    >
      <AsciiGrid
        doc={doc}
        frame={doc.active}
        onionOn={onionOn}
        mode={mode}
        brush={brush}
        gridOn={gridOn}
        zoom={zoom}
        onPaint={onPaint}
        onPick={onPick}
        onPlaceStamp={onPlaceStamp}
        playing={playing}
        onTogglePlay={onTogglePlay}
      />
      <div {...stylex.props(styles.fab)} role="toolbar" aria-label="Canvas view">
        <IconButton
          label="Toggle grid"
          icon={<IconGrid />}
          variant={gridOn ? 'primary' : 'ghost'}
          size="sm"
          tooltip={gridOn ? 'Hide grid' : 'Show grid'}
          onClick={onToggleGrid}
        />
        <IconButton
          label="Zoom out"
          icon={<IconZoomOut />}
          variant="ghost"
          size="sm"
          tooltip="Zoom out"
          isDisabled={zoom <= 0.5}
          onClick={onZoomOut}
        />
        <IconButton
          label="Zoom in"
          icon={<IconZoomIn />}
          variant="ghost"
          size="sm"
          tooltip="Zoom in"
          isDisabled={zoom >= 3}
          onClick={onZoomIn}
        />
        {/* Mobile: the control-panels entry lives here, right of the view
            controls, instead of crowding the top bar. */}
        <span {...stylex.props(styles.mobileOnly)}>
          <IconButton
            label="Control panels"
            icon={<IconPanels />}
            variant="ghost"
            size="sm"
            tooltip="Open the control panels"
            onClick={onOpenControls}
          />
        </span>
      </div>
      {/* Mobile: playback floats top-left of the canvas. */}
      <div
        {...stylex.props(styles.transportFab)}
        role="toolbar"
        aria-label="Playback"
      >
        <Transport
          playing={playing}
          onJumpStart={onJumpStart}
          onStepBack={onStepBack}
          onTogglePlay={onTogglePlay}
          onStepFwd={onStepFwd}
          onJumpEnd={onJumpEnd}
        />
      </div>
      {/* Mobile: what tool is active, as icon + label. */}
      <div {...stylex.props(styles.toolBadge)} aria-live="polite">
        {activeTool.icon}
        <Text type="label">{activeTool.label}</Text>
      </div>
      <Button
        label="Open the agent panel"
        variant="ghost"
        size="sm"
        icon={<IconSparkles />}
        xstyle={styles.pill}
        onClick={onOpenAgent}
        tooltip="Open the agent panel"
      >
        Ask the agent… <Kbd keys="⌘K" />
      </Button>
      <div {...stylex.props(styles.status)}>
        {doc.name} · {doc.width} × {doc.height} · frame {doc.active + 1}/{doc.frames.length}
        {onionOn ? ' · onion on' : ''}
        {zoom !== 1 ? ` · ${Math.round(zoom * 100)}%` : ''}
      </div>
      <div {...stylex.props(styles.phase)}>Phase 1</div>
    </div>
  );
}
