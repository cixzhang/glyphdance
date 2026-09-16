import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { IconButton } from '@astryxdesign/core/IconButton';

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
    // Mobile: the rail becomes a horizontal tool strip docked at the bottom.
    '@media (max-width: 760px)': {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 6,
      height: 'auto',
      padding: '8px 12px calc(8px + env(safe-area-inset-bottom))',
      overflowX: 'auto',
      overflowY: 'hidden',
      borderRight: 'none',
      borderTop: '1px solid var(--gd-border)',
      // Hide the scrollbar on the strip; it still scrolls by touch.
      scrollbarWidth: 'none',
    },
  },
  tool: {
    // Base value is the flex default; the media query pins buttons at full
    // size inside the scrolling strip. (StyleX requires a non-conditional
    // property alongside conditional ones.)
    flexShrink: 1,
    '@media (max-width: 760px)': { flexShrink: 0 },
  },
  toolIcon: {
    fontSize: 17,
    lineHeight: 1,
  },
  spacer: {
    flex: 1,
    // In the scrolling strip the spacer would collapse to nothing — the
    // undo/redo buttons simply follow the tools.
    '@media (max-width: 760px)': { display: 'none' },
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

// NOTE: IconButton has no selected/pressed state, so the active tool is shown
// via the primary variant — a workaround worth revisiting (SideNavItem has
// isSelected but is built for labeled rows, not an icon-only rail).
export default function ToolRail() {
  const [active, setActive] = useState<string>('brush');
  return (
    <div {...stylex.props(styles.rail)} role="toolbar" aria-label="Tools">
      {TOOLS.map((t) => (
        <IconButton
          key={t.id}
          xstyle={styles.tool}
          label={t.label}
          icon={
            <span {...stylex.props(styles.toolIcon)} aria-hidden="true">
              {t.icon}
            </span>
          }
          variant={active === t.id ? 'primary' : 'ghost'}
          size="md"
          tooltip={`${t.label} (stub — painting arrives in Phase 1)`}
          onClick={() => setActive(t.id)}
        />
      ))}
      <div {...stylex.props(styles.spacer)} />
      <IconButton
        label="Undo"
        xstyle={styles.tool}
        icon={
          <span {...stylex.props(styles.toolIcon)} aria-hidden="true">
            ↺
          </span>
        }
        variant="ghost"
        size="md"
        tooltip="Undo — soon"
        isDisabled
      />
      <IconButton
        label="Redo"
        xstyle={styles.tool}
        icon={
          <span {...stylex.props(styles.toolIcon)} aria-hidden="true">
            ↻
          </span>
        }
        variant="ghost"
        size="md"
        tooltip="Redo — soon"
        isDisabled
      />
    </div>
  );
}
