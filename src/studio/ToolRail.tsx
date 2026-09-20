import { memo, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react';
import * as stylex from '@stylexjs/stylex';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Popover } from '@astryxdesign/core/Popover';
import { BottomSheet } from '@astryxdesign/core/BottomSheet';
import { ToggleButton, ToggleButtonGroup } from '@astryxdesign/core/ToggleButton';
import {
  IconBrush,
  IconEraser,
  IconEyedropper,
  IconFill,
  IconPaint,
  IconRedo,
  IconSelect,
  IconStamp,
  IconText,
  IconUndo,
} from './icons';
import {
  ColorPopoverContent,
  GlyphPopoverContent,
  StampPopoverContent,
} from './tool-popovers.tsx';
import type { Brush, ToolId } from './brush.ts';
import type { DocState } from './document.ts';
import { docContentEqual } from './document.ts';
import type { Action } from './actions.ts';

const styles = stylex.create({
  rail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    height: '100%',
    paddingTop: 10,
    paddingBottom: 10,
    // Exact canvas bg, like the top nav and timeline (see --gd-chrome-bg in
    // syntax-chrome.ts): the chrome melts into the stage instead of floating
    // a different hue beside it.
    backgroundColor: 'var(--gd-chrome-bg, var(--color-background-body))',
    borderRight: '1px solid var(--color-border)',
    // Mobile: the rail becomes a horizontal tool strip docked at the bottom.
    '@media (max-width: 760px)': {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 2,
      height: 'auto',
      // The app root already pads for the home indicator; don't double it.
      // Tight start padding so all tools fit without scrolling.
      padding: '8px 4px',
      overflowX: 'auto',
      overflowY: 'hidden',
      borderRight: 'none',
      borderTop: '1px solid var(--color-border)',
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
  // The color button's icon: the current BG with the FG overlaid, so the
  // toolbar always shows what painting will lay down.
  colorIcon: {
    position: 'relative',
    width: 14,
    height: 14,
    display: 'inline-block',
  },
  colorBg: {
    position: 'absolute',
    inset: 0,
    borderRadius: 3,
    // The BG tile is usually near-black: a fixed light hairline keeps it
    // readable against the toolbar in both color modes. Longhands, not the
    // `border` shorthand: StyleX drops shorthand colors with comma
    // functions like rgba().
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  colorFg: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 9,
    height: 9,
    borderRadius: 2,
    border: '1px solid var(--color-border)',
  },
});

// Every tool paints today except Select, which stays an honest stub until
// region selection lands.
const LIVE_TOOLS = new Set(['select', 'brush', 'paint', 'erase', 'fill', 'text', 'stamp', 'pick']);

// Shared with the canvas: the mobile tool badge shows the active tool's
// icon + label, so this list is the single source of truth. Order is the
// toolbar order: brush, stamp, text, paint, eraser, fill, eyedropper, then
// the Colors button (rendered separately, right after the group).
export const TOOLS = [  { id: 'select', icon: <IconSelect />, label: 'Select' },
  { id: 'brush', icon: <IconBrush />, label: 'Brush' },
  { id: 'stamp', icon: <IconStamp />, label: 'Stamp' },
  { id: 'text', icon: <IconText />, label: 'Text' },
  { id: 'paint', icon: <IconPaint />, label: 'Paint' },
  { id: 'fill', icon: <IconFill />, label: 'Fill' },
  { id: 'pick', icon: <IconEyedropper />, label: 'Eyedropper' },
  { id: 'erase', icon: <IconEraser />, label: 'Eraser' },
] as const;

export function ColorSwatchIcon({ fg, bg }: { fg: string; bg: string }) {
  const transparent = bg === '';
  return (
    <span {...stylex.props(styles.colorIcon)} aria-hidden="true">
      <span
        {...stylex.props(styles.colorBg)}
        style={{
          backgroundColor: transparent ? 'transparent' : bg,
          borderStyle: transparent ? 'dashed' : 'solid',
        }}
      />
      <span {...stylex.props(styles.colorFg)} style={{ backgroundColor: fg }} />
    </span>
  );
}

// The tool rail is a textbook single-select toolbar: exactly one tool is
// active, so it maps directly onto ToggleButtonGroup (vertical on desktop,
// horizontal in the mobile strip). Undo/redo are momentary actions, not
// toggles, so they stay as plain IconButtons outside the group.
//
// Brush, stamp, and colors carry their option menus on their toolbar
// buttons: the glyph picker, the stamp library, and the FG/BG swatches all
// live where the tools live instead of the side panel. On desktop the menus
// are popovers (anchorRef mode so the toggle buttons stay direct flex items
// of the group — the auto-mode wrapper would break the group's stretch
// layout); on mobile they share one bottom sheet, which fits the thumb
// strip better than a floating popover.
interface ToolRailProps {
  isMobile: boolean;
  brush: Brush;
  onBrushChange: (patch: Partial<Brush>) => void;
  doc: DocState;
  dispatch: (a: Action) => void;
  mode: 'light' | 'dark';
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  colorOpen: boolean;
  onColorOpenChange: (open: boolean) => void;
}

function ToolRail({
  isMobile,
  brush,
  onBrushChange,
  doc,
  dispatch,
  mode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  colorOpen,
  onColorOpenChange,
}: ToolRailProps) {
  const [open, setOpen] = useState<'glyph' | 'stamp' | null>(null);
  const brushRef = useRef<HTMLButtonElement>(null);
  const stampRef = useRef<HTMLButtonElement>(null);
  // Popover's anchorRef is typed RefObject<HTMLElement> and only reads
  // .current — adapt the button refs.
  const brushAnchor = brushRef as unknown as RefObject<HTMLElement>;
  const stampAnchor = stampRef as unknown as RefObject<HTMLElement>;
  // Desktop rail sits left of the canvas → popovers open toward it ('end');
  // the mobile strip is docked at the bottom → popovers open upward.
  const placement = isMobile ? 'above' : 'end';

  const handleGroupChange = (v: string | null) => {
    if (v === null) {
      // Re-tapped the active tool: toggle its menu. (On mobile the bottom
      // sheet has no anchor toggle of its own, so this is the only way
      // back out via the toolbar.)
      if (brush.tool === 'brush') setOpen(open === 'glyph' ? null : 'glyph');
      else if (brush.tool === 'stamp') setOpen(open === 'stamp' ? null : 'stamp');
      return;
    }
    onBrushChange({ tool: v as ToolId });
    // Opening a menu straight from the tool switch: tapping another menu
    // button while one menu is open swaps to it instead of needing a
    // second tap (the open menu's light-dismiss eats the first click).
    // Paint no longer auto-opens Colors — the swatch in the tool pill is
    // the way in.
    if (v === 'brush') setOpen('glyph');
    else if (v === 'stamp') setOpen('stamp');
    else {
      setOpen(null);
      onColorOpenChange(false);
    }
  };

  const closeSheet = () => {
    setOpen(null);
    onColorOpenChange(false);
  };

  const toolButton = (
    id: ToolId,
    label: string,
    icon: ReactNode,
    ref?: Ref<HTMLButtonElement>,
  ) => (
    <ToggleButton
      key={id}
      ref={ref}
      value={id}
      label={label}
      icon={icon}
      isIconOnly
      tooltip={label}
    />
  );

  return (
    <div {...stylex.props(styles.rail)} role="toolbar" aria-label="Tools">
      <ToggleButtonGroup
        label="Tools"
        type="single"
        orientation={isMobile ? 'horizontal' : 'vertical'}
        value={brush.tool}
        onChange={handleGroupChange}
        xstyle={styles.group}
      >
        {TOOLS.filter((t) => LIVE_TOOLS.has(t.id)).map((t) => {
          // 'select' never passes the filter, so the cast is honest.
          const id = t.id as ToolId;
          if (id === 'brush') return toolButton(id, t.label, t.icon, brushRef);
          if (id === 'stamp') return toolButton(id, t.label, t.icon, stampRef);
          return toolButton(id, t.label, t.icon);
        })}
      </ToggleButtonGroup>
      {/* Mobile: Colors lives in the toolbar (tappable), opening the sheet. */}
      {isMobile && (
        <IconButton
          label="Colors"
          icon={<ColorSwatchIcon fg={brush.fg} bg={brush.bg} />}
          variant="ghost"
          size="md"
          tooltip={`Colors — FG ${brush.fg}, BG ${brush.bg === '' ? 'transparent' : brush.bg}`}
          xstyle={styles.tool}
          onClick={() => onColorOpenChange(!colorOpen)}
        />
      )}
      {/* Tool option menus: popovers anchored to their toolbar buttons on
          desktop, a bottom sheet on mobile. */}
      {isMobile ? (
        <>
          <BottomSheet
            isOpen={open !== null || colorOpen}
            onOpenChange={(o) => {
              if (!o) closeSheet();
            }}
            purpose="info"
            label={
              colorOpen
                ? 'Colors'
                : open === 'glyph'
                  ? 'Brush glyph'
                  : 'Stamp library'
            }
            height="hug"
          >
            {open === 'glyph' && (
              <GlyphPopoverContent brush={brush} onChange={onBrushChange} />
            )}
            {colorOpen && (
              <ColorPopoverContent brush={brush} onChange={onBrushChange} />
            )}
            {open === 'stamp' && (
              <StampPopoverContent
                brush={brush}
                onBrushChange={onBrushChange}
                doc={doc}
                dispatch={dispatch}
                mode={mode}
              />
            )}
          </BottomSheet>
        </>
      ) : (
        <>
          <Popover
            anchorRef={brushAnchor}
            isOpen={open === 'glyph'}
            onOpenChange={(o) => setOpen(o ? 'glyph' : null)}
            placement={placement}
            alignment="start"
            label="Brush glyph"
            content={
              <GlyphPopoverContent brush={brush} onChange={onBrushChange} />
            }
          />
          <Popover
            anchorRef={stampAnchor}
            isOpen={open === 'stamp'}
            onOpenChange={(o) => setOpen(o ? 'stamp' : null)}
            placement={placement}
            alignment="start"
            label="Stamps"
            content={
              <StampPopoverContent
                brush={brush}
                onBrushChange={onBrushChange}
                doc={doc}
                dispatch={dispatch}
                mode={mode}
              />
            }
          />
          <Popover
            isOpen={colorOpen}
            onOpenChange={onColorOpenChange}
            placement={placement}
            alignment="start"
            label="Colors"
            content={
              <ColorPopoverContent brush={brush} onChange={onBrushChange} />
            }
          >
            <IconButton
              label="Colors"
              icon={<ColorSwatchIcon fg={brush.fg} bg={brush.bg} />}
              variant="ghost"
              size="md"
              tooltip={`Colors — FG ${brush.fg}, BG ${brush.bg === '' ? 'transparent' : brush.bg}`}
              xstyle={styles.tool}
              onClick={() => onColorOpenChange(true)}
            />
          </Popover>
        </>
      )}
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

// Playback ticks only advance doc.active, which the rail never renders
// (the stamp library reads stamps/theme — both content-stable), so the
// toolbar skips re-rendering on every animation tick.
export function toolRailEqual(prev: ToolRailProps, next: ToolRailProps): boolean {
  return (
    prev.isMobile === next.isMobile &&
    prev.brush === next.brush &&
    prev.onBrushChange === next.onBrushChange &&
    docContentEqual(prev.doc, next.doc) &&
    prev.dispatch === next.dispatch &&
    prev.mode === next.mode &&
    prev.canUndo === next.canUndo &&
    prev.canRedo === next.canRedo &&
    prev.onUndo === next.onUndo &&
    prev.onRedo === next.onRedo &&
    prev.colorOpen === next.colorOpen &&
    prev.onColorOpenChange === next.onColorOpenChange
  );
}

export default memo(ToolRail, toolRailEqual);
