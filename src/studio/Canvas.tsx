import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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
  GRID_W,
  GRID_H,
  cellIndex,
  inBounds,
  type Cell,
  type DocState,
} from './document.ts';
import type { PaintCell } from './actions.ts';
import { themeById } from './scene.ts';
import { resolveStamp, stampCellsFor } from './stamps.ts';
import type { Brush, ToolId } from './brush.ts';

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
    backgroundColor: 'var(--gd-float)',
    border: '1px solid var(--gd-border)',
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
    border: '1px solid var(--gd-border)',
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
    border: '1px solid var(--gd-border)',
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
    fontFamily: 'var(--gd-mono)',
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
    fontFamily: 'var(--gd-mono)',
    fontSize: 11,
    color: 'var(--gd-dim)',
    backgroundColor: 'var(--gd-float)',
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

/** Stamp a sprite centered on (ax, ay), painting its real characters. */
function stampCells(
  rows: string[],
  ax: number,
  ay: number,
  fg: string,
): PaintCell[] {
  return stampCellsFor(rows, ax, ay, fg, '');
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

  // Per-tool dispose: when a tool is toggled off, run its cleanup so no
  // in-progress state (a text draft, a line preview) lingers after the
  // switch. Tools without draft state need no case.
  const disposeTool = (tool: ToolId) => {
    switch (tool) {
      case 'text':
        setTextAnchor(null);
        setTextValue('');
        break;
      case 'line':
        setLineAnchor(null);
        setLineEnd(null);
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
    if (!brush.stampId) return;
    const stamp = resolveStamp(brush.stampId, doc.stamps);
    if (!stamp) return;
    const fg =
      stamp.fg ?? (stamp.kind === 'player' ? theme.player : theme.invader);
    const out = stampCells(stamp.frames[0], x, y, fg);
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
          <TextInput
            label="Text to place on the canvas"
            isLabelHidden
            hasAutoFocus
            size="sm"
            value={textValue}
            onChange={(v) => setTextValue(v.slice(0, GRID_W - textAnchor[0]))}
            onEnter={placeText}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setTextAnchor(null);
                setTextValue('');
              }
            }}
            placeholder="Type text…"
            xstyle={styles.textField}
          />
          <Button
            label="Place text on canvas"
            variant="primary"
            size="sm"
            onClick={placeText}
          >
            Place
          </Button>
          {/* Dismiss without placing — mobile keyboards have no Escape. */}
          <IconButton
            label="Discard text"
            icon={<IconClose />}
            variant="ghost"
            size="sm"
            tooltip="Discard the text"
            onClick={() => disposeTool('text')}
          />
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
        {doc.name} · {GRID_W} × {GRID_H} · frame {doc.active + 1}/{doc.frames.length}
        {onionOn ? ' · onion on' : ''}
        {zoom !== 1 ? ` · ${Math.round(zoom * 100)}%` : ''}
      </div>
      <div {...stylex.props(styles.phase)}>Phase 1</div>
    </div>
  );
}
