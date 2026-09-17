import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { IconButton } from '@astryxdesign/core/IconButton';
import { ToggleButton, ToggleButtonGroup } from '@astryxdesign/core/ToggleButton';
import {
  Brush,
  Eraser,
  MousePointer2,
  PaintBucket,
  Pipette,
  Redo2,
  Slash,
  Stamp,
  Type,
  Undo2,
} from 'lucide-react';

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
  // The group lays out its own buttons; it just must not shrink inside the
  // scrolling mobile strip. (StyleX needs a non-conditional base property.)
  group: {
    flexShrink: 1,
    '@media (max-width: 760px)': { flexShrink: 0 },
  },
  tool: {
    // Keep the undo/redo buttons at full size inside the scrolling strip.
    flexShrink: 1,
    '@media (max-width: 760px)': { flexShrink: 0 },
  },
  spacer: {
    flex: 1,
    // In the scrolling strip the spacer would collapse to nothing — the
    // undo/redo buttons simply follow the tools.
    '@media (max-width: 760px)': { display: 'none' },
  },
});

const TOOLS = [
  { id: 'select', icon: <MousePointer2 size={16} />, label: 'Select' },
  { id: 'brush', icon: <Brush size={16} />, label: 'Brush' },
  { id: 'erase', icon: <Eraser size={16} />, label: 'Eraser' },
  { id: 'fill', icon: <PaintBucket size={16} />, label: 'Fill' },
  { id: 'line', icon: <Slash size={16} />, label: 'Line' },
  { id: 'text', icon: <Type size={16} />, label: 'Text' },
  { id: 'stamp', icon: <Stamp size={16} />, label: 'Stamp' },
  { id: 'pick', icon: <Pipette size={16} />, label: 'Eyedropper' },
] as const;

// The tool rail is a textbook single-select toolbar: exactly one tool is
// active, so it maps directly onto ToggleButtonGroup (vertical on desktop,
// horizontal in the mobile strip). Undo/redo are momentary actions, not
// toggles, so they stay as plain IconButtons outside the group.
export default function ToolRail({ isMobile }: { isMobile: boolean }) {
  const [active, setActive] = useState<string>('brush');
  return (
    <div {...stylex.props(styles.rail)} role="toolbar" aria-label="Tools">
      <ToggleButtonGroup
        label="Tools"
        type="single"
        orientation={isMobile ? 'horizontal' : 'vertical'}
        value={active}
        onChange={(v) => {
          if (typeof v === 'string') setActive(v);
        }}
        xstyle={styles.group}
      >
        {TOOLS.map((t) => (
          <ToggleButton
            key={t.id}
            value={t.id}
            label={t.label}
            icon={t.icon}
            isIconOnly
            tooltip={`${t.label} (stub — painting arrives in Phase 1)`}
          />
        ))}
      </ToggleButtonGroup>
      <div {...stylex.props(styles.spacer)} />
      <IconButton
        label="Undo"
        xstyle={styles.tool}
        icon={<Undo2 size={18} />}
        variant="ghost"
        size="md"
        tooltip="Undo — soon"
        isDisabled
      />
      <IconButton
        label="Redo"
        xstyle={styles.tool}
        icon={<Redo2 size={18} />}
        variant="ghost"
        size="md"
        tooltip="Redo — soon"
        isDisabled
      />
    </div>
  );
}
