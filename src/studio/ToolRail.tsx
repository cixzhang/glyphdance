import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  rail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    height: '100%',
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'var(--gd-bg1)',
    borderRight: '1px solid var(--gd-border)',
  },
  tool: {
    appearance: 'none',
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    color: 'var(--gd-dim)',
    borderRadius: 8,
    width: 42,
    height: 42,
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': { backgroundColor: 'var(--gd-bg3)', color: 'var(--gd-text)' },
  },
  toolActive: {
    backgroundColor: 'var(--gd-bg3)',
    color: 'var(--gd-invader)',
    borderColor: 'var(--gd-border)',
  },
  spacer: { flex: 1 },
  soon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--gd-faint)',
    fontSize: 16,
    cursor: 'not-allowed',
  },
});

const TOOLS = [
  { id: 'select', icon: '⌖', label: 'Select' },
  { id: 'brush', icon: '✎', label: 'Brush' },
  { id: 'erase', icon: '⌫', label: 'Eraser' },
  { id: 'fill', icon: '◨', label: 'Fill' },
  { id: 'line', icon: '╱', label: 'Line' },
  { id: 'text', icon: 'T', label: 'Text' },
  { id: 'stamp', icon: '❖', label: 'Stamp' },
  { id: 'pick', icon: '◉', label: 'Eyedropper' },
] as const;

export default function ToolRail() {
  const [active, setActive] = useState<string>('brush');
  return (
    <div {...stylex.props(styles.rail)} role="toolbar" aria-label="Tools">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          {...stylex.props(styles.tool, active === t.id && styles.toolActive)}
          onClick={() => setActive(t.id)}
          title={`${t.label} (stub — painting arrives in Phase 1)`}
          aria-pressed={active === t.id}
          aria-label={t.label}
        >
          {t.icon}
        </button>
      ))}
      <div {...stylex.props(styles.spacer)} />
      <span {...stylex.props(styles.soon)} title="Undo — soon">
        ↺
      </span>
      <span {...stylex.props(styles.soon)} title="Redo — soon">
        ↻
      </span>
    </div>
  );
}
