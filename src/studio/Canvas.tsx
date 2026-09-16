import { useMemo } from 'react';
import * as stylex from '@stylexjs/stylex';
import { frameCells, GRID_W, GRID_H, type Cell } from './document.ts';

const styles = stylex.create({
  wrap: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d0f12',
    backgroundImage: 'radial-gradient(circle at 50% 40%, #131720 0%, #0d0f12 70%)',
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
  },
  row: { display: 'block', height: '1.35em' },
  bg: { color: '#232a33' },
  inv: { color: 'var(--gd-invader)', textShadow: '0 0 12px rgba(74,222,128,0.35)' },
  star: { color: 'var(--gd-star)', textShadow: '0 0 10px rgba(255,215,94,0.5)' },
  onion: { color: 'rgba(180,140,232,0.4)' },
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
  },
});

const kindStyle = { bg: styles.bg, inv: styles.inv, star: styles.star } as const;

function cellStyle(kind: string, onionGhost: boolean) {
  if (onionGhost) return styles.onion;
  return kindStyle[kind as keyof typeof kindStyle] ?? styles.bg;
}

/** Full-size character grid for the canvas. */
export function AsciiGrid({
  frameIndex,
  onionOn,
}: {
  frameIndex: number;
  onionOn: boolean;
}) {
  const cells = useMemo(() => frameCells(frameIndex), [frameIndex]);
  const prev = useMemo(
    () => (onionOn ? frameCells((frameIndex + 3) % 4) : null),
    [frameIndex, onionOn],
  );
  return (
    <pre {...stylex.props(styles.grid)} aria-label="Animation canvas">
      {cells.map((row: Cell[], r: number) => (
        <span key={r} {...stylex.props(styles.row)}>
          {row.map((cell, c) => {
            const ghost =
              onionOn &&
              cell.kind === 'bg' &&
              prev !== null &&
              prev[r][c].kind !== 'bg';
            return (
              <span key={c} {...stylex.props(cellStyle(cell.kind, ghost))}>
                {ghost && prev ? prev[r][c].ch : cell.ch}
              </span>
            );
          })}
          {'\n'}
        </span>
      ))}
    </pre>
  );
}

/** Tiny render of a frame for the timeline filmstrip and stamp cards. */
export function AsciiThumb({ frameIndex }: { frameIndex: number }) {
  const cells = useMemo(() => frameCells(frameIndex), [frameIndex]);
  return (
    <pre
      {...stylex.props(styles.grid)}
      style={{ fontSize: 4.5, lineHeight: 1.3 }}
      aria-hidden="true"
    >
      {cells.map((row: Cell[], r: number) => (
        <span key={r} {...stylex.props(styles.row)}>
          {row.map((cell, c) => (
            <span key={c} {...stylex.props(cellStyle(cell.kind, false))}>
              {cell.ch}
            </span>
          ))}
          {'\n'}
        </span>
      ))}
    </pre>
  );
}

interface CanvasProps {
  frameIndex: number;
  frameCount: number;
  onionOn: boolean;
  onOpenAgent: () => void;
}

export default function Canvas({ frameIndex, frameCount, onionOn, onOpenAgent }: CanvasProps) {
  return (
    <div {...stylex.props(styles.wrap)}>
      <AsciiGrid frameIndex={frameIndex} onionOn={onionOn} />
      <button
        {...stylex.props(styles.pill)}
        onClick={onOpenAgent}
        title="Open the agent panel"
      >
        <span {...stylex.props(styles.pillAccent)}>✦</span> Ask the agent…
        <span {...stylex.props(styles.kbd)}>⌘K</span>
      </button>
      <div {...stylex.props(styles.status)}>
        {GRID_W} × {GRID_H} · frame {frameIndex + 1}/{frameCount}
        {onionOn ? ' · onion on' : ''}
      </div>
      <div {...stylex.props(styles.phase)}>Phase 0 shell</div>
    </div>
  );
}
