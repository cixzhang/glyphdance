import { useMemo, useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { IconSparkles } from './icons';
import {
  GRID_W,
  GRID_H,
  cellIndex,
  inBounds,
  type Cell,
  type DocState,
} from './document.ts';
import type { PaintCell } from './actions.ts';
import { themeById } from './scene.ts';
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
  grid: {
    fontFamily: 'var(--gd-mono)',
    fontSize: 'clamp(10px, 1.9vw, 22px)',
    lineHeight: 1.35,
    letterSpacing: 0,
    margin: 0,
    userSelect: 'none',
    whiteSpace: 'pre',
    touchAction: 'none',
    cursor: 'crosshair',
  },
  // Phones get a much larger grid — the canvas is the whole stage on mobile.
  // (Kept separate from `grid` so thumbnails are unaffected.)
  gridMobile: {
    '@media (max-width: 760px)': {
      fontSize: 'clamp(15px, 5vw, 24px)',
    },
  },
  row: { display: 'block', height: '1.35em' },
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

/** Full-size character grid for the canvas. Empty cells render the theme's
 *  dot so the grid reads as graph paper; the document only stores real marks. */
export function AsciiGrid({
  doc,
  frame,
  onionOn,
  mode,
  brush,
  onPaint,
  onPick,
}: {
  doc: DocState;
  frame: number;
  onionOn: boolean;
  mode: Mode;
  brush: Brush;
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

  const paintLine = (x0: number, y0: number, x1: number, y1: number, id: string, painted: Set<string>) => {
    // Bresenham so fast drags don't leave dotted strokes.
    const out: PaintCell[] = [];
    let x = x0;
    let y = y0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      const key = `${x},${y}`;
      if (inBounds(x, y) && !painted.has(key)) {
        painted.add(key);
        const cell: Cell =
          brush.tool === 'erase'
            ? { ch: ' ', fg: brush.fg, bg: '' }
            : { ch: brush.glyph, fg: brush.fg, bg: brush.bg };
        out.push({ x, y, cell });
      }
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    if (out.length > 0) onPaint(out, id);
  };

  const beginStroke = (x: number, y: number) => {
    if (brush.tool === 'pick') {
      if (inBounds(x, y)) onPick(cells[cellIndex(x, y)]);
      return;
    }
    if (brush.tool !== 'brush' && brush.tool !== 'erase') return;
    const id = `s${++strokeSeq.current}`;
    const painted = new Set<string>();
    strokeRef.current = { id, painted, last: [x, y] };
    paintLine(x, y, x, y, id, painted);
  };

  const continueStroke = (x: number, y: number) => {
    const s = strokeRef.current;
    if (s === null) return;
    paintLine(s.last[0], s.last[1], x, y, s.id, s.painted);
    s.last = [x, y];
  };

  const endStroke = () => {
    strokeRef.current = null;
  };

  return (
    <pre
      {...stylex.props(styles.grid, styles.gridMobile)}
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
            return (
              <span
                key={c}
                onPointerDown={(e) => {
                  e.preventDefault();
                  beginStroke(c, r);
                }}
                onPointerEnter={(e) => {
                  if (e.buttons & 1) continueStroke(c, r);
                }}
                style={{
                  color: ghost
                    ? mode === 'dark'
                      ? GHOST_DARK
                      : GHOST_LIGHT
                    : empty
                      ? theme.dot
                      : cell.fg,
                  backgroundColor: !empty && cell.bg ? cell.bg : undefined,
                  textShadow:
                    ghost || empty ? 'none' : `0 0 10px ${cell.fg}66`,
                }}
              >
                {ghost && ghostCell ? ghostCell.ch : empty ? '·' : cell.ch}
              </span>
            );
          })}
          {'\n'}
        </span>
      ))}
    </pre>
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
  onPaint: (cells: PaintCell[], stroke: string) => void;
  onPick: (cell: Cell) => void;
  onOpenAgent: () => void;
}

export default function Canvas({ doc, onionOn, mode, brush, onPaint, onPick, onOpenAgent }: CanvasProps) {
  const theme = themeById(doc.themeId)[mode];
  return (
    <div
      {...stylex.props(styles.wrap)}
      style={{
        backgroundColor: theme.bg,
        backgroundImage: mode === 'dark' ? VIGNETTE_DARK : VIGNETTE_LIGHT,
      }}
    >
      <AsciiGrid
        doc={doc}
        frame={doc.active}
        onionOn={onionOn}
        mode={mode}
        brush={brush}
        onPaint={onPaint}
        onPick={onPick}
      />
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
      </div>
      <div {...stylex.props(styles.phase)}>Phase 1</div>
    </div>
  );
}
