import { useMemo } from 'react';
import * as stylex from '@stylexjs/stylex';
import { IconSparkles } from './icons';
import { GRID_W, GRID_H, type Cell } from './document.ts';
import {
  sceneCells,
  themeById,
  DEFAULT_SCENE,
  type SceneConfig,
} from './scene.ts';

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

const GHOST = 'rgba(180,140,232,0.4)';

/** Full-size character grid for the canvas. */
export function AsciiGrid({
  frameIndex,
  onionOn,
  scene,
}: {
  frameIndex: number;
  onionOn: boolean;
  scene: SceneConfig;
}) {
  const cells = useMemo(
    () => sceneCells(frameIndex, scene),
    [frameIndex, scene],
  );
  const prev = useMemo(
    () => (onionOn ? sceneCells((frameIndex + 3) % 4, scene) : null),
    [frameIndex, onionOn, scene],
  );
  return (
    <pre {...stylex.props(styles.grid, styles.gridMobile)} aria-label="Animation canvas">
      {cells.map((row: Cell[], r: number) => (
        <span key={r} {...stylex.props(styles.row)}>
          {row.map((cell, c) => {
            const ghost =
              onionOn &&
              cell.kind === 'bg' &&
              prev !== null &&
              prev[r][c].kind !== 'bg';
            return (
              <span
                key={c}
                style={{
                  color: ghost ? GHOST : cell.fg,
                  textShadow:
                    ghost || cell.kind === 'bg'
                      ? 'none'
                      : `0 0 10px ${cell.fg}66`,
                }}
              >
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
export function AsciiThumb({
  frameIndex,
  scene = DEFAULT_SCENE,
}: {
  frameIndex: number;
  scene?: SceneConfig;
}) {
  const cells = useMemo(
    () => sceneCells(frameIndex, scene),
    [frameIndex, scene],
  );
  return (
    <pre
      {...stylex.props(styles.grid)}
      style={{ fontSize: 4.5, lineHeight: 1.3 }}
      aria-hidden="true"
    >
      {cells.map((row: Cell[], r: number) => (
        <span key={r} {...stylex.props(styles.row)}>
          {row.map((cell, c) => (
            <span key={c} style={{ color: cell.fg }}>
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
  scene: SceneConfig;
  onOpenAgent: () => void;
}

export default function Canvas({ frameIndex, frameCount, onionOn, scene, onOpenAgent }: CanvasProps) {
  const theme = themeById(scene.theme);
  return (
    <div
      {...stylex.props(styles.wrap)}
      style={{
        backgroundColor: theme.bg,
        backgroundImage:
          'radial-gradient(circle at 50% 40%, transparent 0%, rgba(0,0,0,0.4) 100%)',
      }}
    >
      <AsciiGrid frameIndex={frameIndex} onionOn={onionOn} scene={scene} />
      <button
        {...stylex.props(styles.pill)}
        onClick={onOpenAgent}
        title="Open the agent panel"
      >
        <IconSparkles {...stylex.props(styles.pillAccent)} /> Ask the agent…
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
