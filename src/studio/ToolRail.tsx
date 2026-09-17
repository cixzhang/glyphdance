import * as stylex from '@stylexjs/stylex';
import { IconButton } from '@astryxdesign/core/IconButton';
import { ToggleButton, ToggleButtonGroup } from '@astryxdesign/core/ToggleButton';
import {
  IconBrush,
  IconEraser,
  IconEyedropper,
  IconFill,
  IconLine,
  IconRedo,
  IconSelect,
  IconStamp,
  IconText,
  IconUndo,
} from './icons';

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

// Every tool paints today except Select, which stays an honest stub until
// region selection lands.
const LIVE_TOOLS = new Set(['brush', 'erase', 'fill', 'line', 'text', 'stamp', 'pick']);

// Shared with the canvas: the mobile tool badge shows the active tool's
// icon + label, so this list is the single source of truth.
export const TOOLS = [  { id: 'select', icon: <IconSelect />, label: 'Select' },
  { id: 'brush', icon: <IconBrush />, label: 'Brush' },
  { id: 'erase', icon: <IconEraser />, label: 'Eraser' },
  { id: 'fill', icon: <IconFill />, label: 'Fill' },
  { id: 'line', icon: <IconLine />, label: 'Line' },
  { id: 'text', icon: <IconText />, label: 'Text' },
  { id: 'stamp', icon: <IconStamp />, label: 'Stamp' },
  { id: 'pick', icon: <IconEyedropper />, label: 'Eyedropper' },
] as const;

// The tool rail is a textbook single-select toolbar: exactly one tool is
// active, so it maps directly onto ToggleButtonGroup (vertical on desktop,
// horizontal in the mobile strip). Undo/redo are momentary actions, not
// toggles, so they stay as plain IconButtons outside the group.
export default function ToolRail({
  isMobile,
  tool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  isMobile: boolean;
  tool: string;
  onToolChange: (tool: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div {...stylex.props(styles.rail)} role="toolbar" aria-label="Tools">
      <ToggleButtonGroup
        label="Tools"
        type="single"
        orientation={isMobile ? 'horizontal' : 'vertical'}
        value={tool}
        onChange={(v) => {
          if (typeof v === 'string') onToolChange(v);
        }}
        xstyle={styles.group}
      >
        {TOOLS.map((t) => {
          const live = LIVE_TOOLS.has(t.id);
          return (
            <ToggleButton
              key={t.id}
              value={t.id}
              label={t.label}
              icon={t.icon}
              isIconOnly
              tooltip={live ? t.label : `${t.label} — soon`}
              // Stub tools can't be selected yet; picking one would silently
              // do nothing on the canvas.
              isDisabled={!live}
            />
          );
        })}
      </ToggleButtonGroup>
      <div {...stylex.props(styles.spacer)} />
      <IconButton
        label="Undo"
        xstyle={styles.tool}
        icon={<IconUndo />}
        variant="ghost"
        size="md"
        tooltip={canUndo ? 'Undo' : 'Nothing to undo'}
        isDisabled={!canUndo}
        onClick={onUndo}
      />
      <IconButton
        label="Redo"
        xstyle={styles.tool}
        icon={<IconRedo />}
        variant="ghost"
        size="md"
        tooltip={canRedo ? 'Redo' : 'Nothing to redo'}
        isDisabled={!canRedo}
        onClick={onRedo}
      />
    </div>
  );
}
