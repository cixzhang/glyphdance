import { useMemo, useRef, useState, type CSSProperties } from 'react';
import * as stylex from '@stylexjs/stylex';
import { IconButton } from '@astryxdesign/core/IconButton';
import { IconSparkles, IconGrid, IconZoomIn, IconZoomOut } from './icons';
import {
  GRID_W,
  GRID_H,
  cellIndex,
  inBounds,
  type Cell,
  type DocState,
} from './document.ts';
import type { PaintCell } from './actions.ts';
import { themeById, ET_SPRITES, PLAYER_SPRITES, type Sprite } from './scene.ts';
import type { Brush } from './brush.ts';

const styles = stylex.create({
  wrap: {
    position: 'relative',
    height: '100%',
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
    fontFamily: 'var(--gd-mono)',
    // Cell size comes from --gd-cell (responsive), zoom multiplies it.
    // AsciiThumb overrides fontSize inline, so thumbnails are unaffected.
    '--gd-cell': 'clamp(10px, 1.9vw, 22px)',
    fontSize: 'calc(var(--gd-cell) * var(--gd-zoom, 1))',
    lineHeight: 1.35,
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
  // (1ch wide, 1.35em tall), so the lines fall between characters.
  gridLines: {
    backgroundImage:
      'linear-gradient(to bottom, var(--gd-gridline) 1px, transparent 1px),' +
      'linear-gradient(to right, var(--gd-gridline) 1px, transparent 1px)',
    backgroundSize: '1ch 1.35em',
  },
  row: { display: 'block', height: '1.35em' },
  fab: {
    position: 'absolute',
    top: 10,
    right: 10,
    display: 'flex',
    gap: 4,
    backgroundColor: 'rgba(20,22,26,0.85)',
    border: '1px solid var(--gd-border)',
    borderRadius: 8,
    padding: 4,
    backdropFilter: 'blur(6px)',
    zIndex: 2,
  },
  textBar: {
    position: 'absolute',
    bottom: 44,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 6,
    backgroundColor: 'rgba(20,22,26,0.95)',
    border: '1px solid var(--gd-accent)',
    borderRadius: 8,
    padding: 8,
    zIndex: 2,
    backdropFilter: 'blur(6px)',
  },
  textInput: {
    fontFamily: 'var(--gd-mono)',
    fontSize: 14,
    backgroundColor: 'var(--gd-bg2)',
    color: 'var(--gd-text)',
    border: '1px solid var(--gd-border)',
    borderRadius: 6,
    padding: '6px 10px',
    width: 160,
    outline: 'none',
  },
  textPlace: {
    appearance: 'none',
    fontFamily: 'var(--gd-mono)',
    fontSize: 13,
    backgroundColor: 'var(--gd-accent)',
    color: '#0d0f12',
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  pill: {
    position: 'absolute',
    top: 14,
    left: '50%',
    transform: 'translateX(-50%)',
    appearance: 'none',
    border: '1px solid var(--gd-border)',
    backgroundColor: 'rgba(29,33,38,0.92)',
    color: 'var(--gd-dim)',
    borderRadius: 999,
    fontSize: 12,
    padding: '7px 14px',
    cursor: 'pointer',
    // On mobile the top bar's Agent button is the entry point — the pill
    // would just eat canvas space.
    '@media (max-width: 760px)': { display: 'none' },
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backdropFilter: 'blur(6px)',
    ':hover': { color: 'var(--gd-text)', borderColor: 'var(--gd-accent)' },
  },
  pillAccent: { color: 'var(--gd-accent)' },
  kbd: {
    fontFamily: 'var(--gd-mono)',
    fontSize: 10,
    border: '1px solid var(--gd-border)',
    borderRadius: 4,
    padding: '1px 5px',
    color: 'var(--gd-faint)',
  },
  status: {
    position: 'absolute',
    left: 14,
    bottom: 12,
    fontFamily: 'var(--gd-mono)',
    fontSize: 11,
    color: 'var(--gd-faint)',
    backgroundColor: 'rgba(20,22,26,0.85)',
    border: '1px solid var(--gd-border)',
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
    color: 'var(--gd-faint)',
    border: '1px dashed var(--gd-border)',
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
function floodFill(cells: Cell[], x: number, y: number, brush: Brush): PaintCell[] {
  if (!inBounds(x, y)) return [];
  const target = cells[cellIndex(x, y)];
  const repl: Cell = { ch: brush.glyph, fg: brush.fg, bg: brush.bg };
  const same = (c: Cell) =>
    c.ch === target.ch && c.fg === target.fg && c.bg === target.bg;
  if (same(repl)) return [];
  const seen = new Set<number>();
  const out: PaintCell[] = [];
  const stack: Array<[number, number]> = [[x, y]];
  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    if (!inBounds(cx, cy)) continue;
    const i = cellIndex(cx, cy);
    if (seen.has(i) || !same(cells[i])) continue;
    seen.add(i);
    out.push({ x: cx, y: cy, cell: repl });
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return out;
}

const ET_IDS = new Set(ET_SPRITES.map((s) => s.id));
const ALL_SPRITES: Sprite[] = [...ET_SPRITES, ...PLAYER_SPRITES];
export function spriteById(id: string | null): Sprite | null {
  if (!id) return null;
  return ALL_SPRITES.find((s) => s.id === id) ?? null;
}

/** Stamp a sprite centered on (ax, ay), painting its real characters. */
function stampCells(sprite: Sprite, ax: number, ay: number, fg: string): PaintCell[] {
  const art = sprite.frames[0];
  const w = Math.max(...art.map((l) => [...l].length));
  const ox = ax - Math.floor(w / 2);
  const oy = ay - Math.floor(art.length / 2);
  const out: PaintCell[] = [];
  art.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      if (ch === ' ') return;
      const x = ox + c;
      const y = oy + r;
      if (inBounds(x, y)) out.push({ x, y, cell: { ch, fg, bg: '' } });
    });
  });
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
}) {
  const theme = themeById(doc.themeId)[mode];
  const cells = doc.frames[frame].cells;
  const prevCells = useMemo(() => {
    if (!onionOn || doc.frames.length < 2) return null;
    return doc.frames[(frame - 1 + doc.frames.length) % doc.frames.length].cells;
  }, [doc.frames, frame, onionOn]);

  // One stroke = one undo step: the store merges paintCells actions that
  // share a stroke id into a single history entry.
  const strokeRef = useRef<{ id: string; painted: Set<string>; last: [number, number] } | null>(null);
  const strokeSeq = useRef(0);
  const nextStroke = () => `s${++strokeSeq.current}`;

  // Line tool: anchor on pointer-down, live preview while dragging, commit
  // as a single action on release.
  const [lineAnchor, setLineAnchor] = useState<[number, number] | null>(null);
  const [lineEnd, setLineEnd] = useState<[number, number] | null>(null);
  const linePreview = useMemo(() => {
    if (!lineAnchor || !lineEnd) return null;
    const set = new Set<string>();
    for (const [x, y] of lineCells(lineAnchor[0], lineAnchor[1], lineEnd[0], lineEnd[1])) {
      if (inBounds(x, y)) set.add(`${x},${y}`);
    }
    return set;
  }, [lineAnchor, lineEnd]);

  // Text tool: tap a cell to anchor, type in the floating bar, place.
  const [textAnchor, setTextAnchor] = useState<[number, number] | null>(null);
  const [textValue, setTextValue] = useState('');

  const paintFreehand = (x0: number, y0: number, x1: number, y1: number, id: string, painted: Set<string>) => {
    // Bresenham so fast drags don't leave dotted strokes.
    const out: PaintCell[] = [];
    for (const [x, y] of lineCells(x0, y0, x1, y1)) {
      const key = `${x},${y}`;
      if (inBounds(x, y) && !painted.has(key)) {
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
    const sprite = spriteById(brush.stampId);
    if (!sprite) return;
    const fg = ET_IDS.has(sprite.id) ? theme.invader : theme.player;
    const out = stampCells(sprite, x, y, fg);
    if (out.length > 0) onPaint(out, id);
  };

  const beginStroke = (x: number, y: number) => {
    if (!inBounds(x, y)) return;
    switch (brush.tool) {
      case 'pick':
        onPick(cells[cellIndex(x, y)]);
        return;
      case 'fill': {
        const out = floodFill(cells, x, y, brush);
        if (out.length > 0) onPaint(out, nextStroke());
        return;
      }
      case 'line':
        setLineAnchor([x, y]);
        setLineEnd([x, y]);
        return;
      case 'text':
        setTextAnchor([x, y]);
        setTextValue('');
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
    if (brush.tool === 'line') {
      if (inBounds(x, y)) setLineEnd([x, y]);
      return;
    }
    const s = strokeRef.current;
    if (s === null) return;
    if (brush.tool === 'stamp') {
      if (inBounds(x, y)) placeStamp(x, y, s.id, s.painted);
      return;
    }
    if (brush.tool === 'brush' || brush.tool === 'erase') {
      paintFreehand(s.last[0], s.last[1], x, y, s.id, s.painted);
      s.last = [x, y];
    }
  };

  const endStroke = () => {
    if (lineAnchor && lineEnd) {
      const out: PaintCell[] = [];
      for (const [x, y] of lineCells(lineAnchor[0], lineAnchor[1], lineEnd[0], lineEnd[1])) {
        if (inBounds(x, y)) {
          out.push({ x, y, cell: { ch: brush.glyph, fg: brush.fg, bg: brush.bg } });
        }
      }
      if (out.length > 0) onPaint(out, nextStroke());
    }
    setLineAnchor(null);
    setLineEnd(null);
    strokeRef.current = null;
  };

  const placeText = () => {
    if (textAnchor && textValue.length > 0) {
      const [ax, ay] = textAnchor;
      const out: PaintCell[] = [];
      [...textValue].forEach((ch, i) => {
        const x = ax + i;
        if (inBounds(x, ay)) {
          out.push({ x, y: ay, cell: { ch, fg: brush.fg, bg: brush.bg } });
        }
      });
      if (out.length > 0) onPaint(out, nextStroke());
    }
    setTextAnchor(null);
    setTextValue('');
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
        {Array.from({ length: GRID_H }, (_, r) => (
          <span key={r} {...stylex.props(styles.row)}>
            {Array.from({ length: GRID_W }, (_, c) => {
              const cell = cells[cellIndex(c, r)];
              const empty = cell.ch === ' ';
              const ghost =
                onionOn &&
                empty &&
                prevCells !== null &&
                prevCells[cellIndex(c, r)].ch !== ' ';
              const ghostCell = ghost && prevCells ? prevCells[cellIndex(c, r)] : null;
              const preview = linePreview !== null && linePreview.has(`${c},${r}`);
              const anchored =
                textAnchor !== null && textAnchor[0] === c && textAnchor[1] === r;
              const shownCh = preview ? brush.glyph : ghost && ghostCell ? ghostCell.ch : empty ? '·' : cell.ch;
              return (
                <span
                  key={c}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    beginStroke(c, r);
                  }}
                  onPointerEnter={(e) => continueStroke(c, r, e.buttons)}
                  style={{
                    color: preview
                      ? brush.fg
                      : ghost
                        ? mode === 'dark'
                          ? GHOST_DARK
                          : GHOST_LIGHT
                        : empty
                          ? theme.dot
                          : cell.fg,
                    backgroundColor: !empty && cell.bg ? cell.bg : undefined,
                    textShadow:
                      preview || ghost || empty ? 'none' : `0 0 10px ${cell.fg}66`,
                    outline: anchored ? '1px solid var(--gd-accent)' : undefined,
                    outlineOffset: anchored ? -1 : undefined,
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
          <input
            {...stylex.props(styles.textInput)}
            autoFocus
            value={textValue}
            maxLength={GRID_W - textAnchor[0]}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') placeText();
              if (e.key === 'Escape') {
                setTextAnchor(null);
                setTextValue('');
              }
            }}
            placeholder="Type text…"
            aria-label="Text to place on the canvas"
          />
          <button {...stylex.props(styles.textPlace)} onClick={placeText}>
            Place
          </button>
        </div>
      )}
    </>
  );
}

/** Tiny render of a frame for the timeline filmstrip. */
export function AsciiThumb({
  cells,
  dot,
  bg,
}: {
  cells: Cell[];
  dot: string;
  bg: string;
}) {
  return (
    <pre
      {...stylex.props(styles.grid)}
      style={{ fontSize: 4.5, lineHeight: 1.3, backgroundColor: bg }}
      aria-hidden="true"
    >
      {Array.from({ length: GRID_H }, (_, r) => (
        <span key={r} {...stylex.props(styles.row)}>
          {Array.from({ length: GRID_W }, (_, c) => {
            const cell = cells[cellIndex(c, r)];
            const empty = cell.ch === ' ';
            return (
              <span
                key={c}
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
  onOpenAgent: () => void;
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
  onOpenAgent,
}: CanvasProps) {
  const theme = themeById(doc.themeId)[mode];
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
      </div>
      <button
        {...stylex.props(styles.pill)}
        onClick={onOpenAgent}
        title="Open the agent panel"
      >
        <IconSparkles {...stylex.props(styles.pillAccent)} /> Ask the agent…
        <span {...stylex.props(styles.kbd)}>⌘K</span>
      </button>
      <div {...stylex.props(styles.status)}>
        {doc.name} · {GRID_W} × {GRID_H} · frame {doc.active + 1}/{doc.frames.length}
        {onionOn ? ' · onion on' : ''}
        {zoom !== 1 ? ` · ${Math.round(zoom * 100)}%` : ''}
      </div>
      <div {...stylex.props(styles.phase)}>Phase 1</div>
    </div>
  );
}
