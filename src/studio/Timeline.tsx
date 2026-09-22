import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Button } from '@astryxdesign/core/Button';
import { Popover } from '@astryxdesign/core/Popover';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import { Text } from '@astryxdesign/core/Text';
import {
  IconOnion,
  IconPlus,
  IconMinus,
  IconDuplicate,
  IconTrash,
  IconPanels,
  IconStepBack,
  IconStepForward,
  IconEraser,
} from './icons';
import Transport from './Transport.tsx';
import { AsciiThumb } from './Canvas.tsx';
import type { DocState } from './document.ts';
import { themeById } from './scene.ts';
import type { Action } from './actions.ts';

const styles = stylex.create({
  bar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    height: '100%',
    padding: '10px 14px',
    // Exact canvas bg, like the top nav (see --gd-chrome-bg).
    backgroundColor: 'var(--gd-chrome-bg, var(--color-background-surface))',
    borderTop: '1px solid var(--color-border)',
    '@media (max-width: 760px)': {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 8,
      padding: '8px 10px',
      // On mobile the bar sits in an auto-sized grid row; height:100%
      // can resolve against the grid container and stretch the Dracula
      // background into a dead band below the toolbar. Size to content.
      height: 'auto',
    },
  },
  cluster: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    '@media (max-width: 760px)': {
      gap: 4,
    },
  },
  // The playback transport floats on the canvas on mobile — hide it here
  // so the filmstrip gets the full width.
  hideOnMobile: {
    '@media (max-width: 760px)': { display: 'none' },
  },
  // Desktop: transport + frame ops share a row above the filmstrip, so the
  // divider line isn't needed. Mobile: contents (children join the bar row).
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    '@media (max-width: 760px)': { display: 'contents' },
  },
  // Frame ops + onion skin: horizontal in the desktop controls row,
  // vertical on the right edge on mobile.
  sideCluster: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    '@media (max-width: 760px)': { flexDirection: 'column' },
  },
  // Frame-rate / range readouts — hidden on mobile where every pixel counts.
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    '@media (max-width: 760px)': { display: 'none' },
  },
  frameMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 12,
    minWidth: 210,
  },
  menuRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  holdValue: {
    fontFamily: 'var(--font-family-code)',
    fontSize: 12,
    minWidth: 52,
    textAlign: 'center',
  },
  filmstrip: {
    flex: 1,
    display: 'flex',
    alignItems: 'stretch',
    gap: 8,
    overflowX: 'auto',
    padding: '2px',
    minWidth: 0,
    // Mobile: controlsRow is display:contents, so the filmstrip and the
    // frame-ops cluster are siblings — frames first, ops on the right.
    '@media (max-width: 760px)': { order: -1 },
    // Let touch do what it expects: horizontal pans scroll the strip,
    // vertical pans scroll the page. Without this the strip competes with
    // the browser's gesture handling and swipe-scrolling feels stuck.
    touchAction: 'pan-x pan-y',
    WebkitOverflowScrolling: 'touch',
  },
  // Frame thumbnails are the app's domain (character cells) — kept custom.
  thumb: {
    appearance: 'none',
    backgroundColor: 'var(--color-background-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '6px 8px 4px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    // Breathing room for the active outline: without it, scrollIntoView with
    // `inline: nearest` parks the thumb flush against the strip's edge and
    // the focus ring gets clipped.
    scrollMarginInline: 12,
    ':hover': { borderColor: 'var(--color-text-disabled)' },
  },
  thumbActive: {
    borderColor: 'var(--gd-theme-accent, var(--gd-invader))',
    boxShadow: '0 0 0 1px var(--gd-theme-accent, var(--gd-invader))',
  },
  // The "add frame" cell: reads as a frame, but it's a + button.
  addFrame: {
    appearance: 'none',
    backgroundColor: 'transparent',
    border: '1px dashed var(--color-text-disabled)',
    borderRadius: 8,
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    scrollMarginInline: 12,
    ':hover': { borderColor: 'var(--gd-accent)', color: 'var(--gd-accent)' },
  },
});

interface TimelineProps {
  doc: DocState;
  dispatch: (a: Action) => void;
  playing: boolean;
  onionOn: boolean;
  mode: 'light' | 'dark';
  onJumpStart: () => void;
  onStepBack: () => void;
  onTogglePlay: () => void;
  onStepFwd: () => void;
  onJumpEnd: () => void;
  onToggleOnion: () => void;
}

export default function Timeline(props: TimelineProps) {
  const { doc, dispatch, playing, onionOn, mode } = props;
  const active = doc.active;
  const activeThumbRef = useRef<HTMLButtonElement | null>(null);
  const swatch = themeById(doc.themeId)[mode];
  // Timestamp of the last touch/pointer interaction with the filmstrip.
  const lastStripTouch = useRef(0);

  // In play mode, keep the focused frame visible as the playhead advances.
  // `nearest` is a no-op when the frame is already fully in view. While the
  // user is swiping the strip (or just was), stay out of the way — the
  // smooth scrollIntoView otherwise fights their gesture.
  useEffect(() => {
    if (!playing) return;
    if (Date.now() - lastStripTouch.current < 1500) return;
    activeThumbRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'nearest',
      block: 'nearest',
    });
  }, [active, playing]);
  const markStripTouch = () => {
    lastStripTouch.current = Date.now();
  };
  // Frame options popover: the catalog's frame tools that have no
  // always-visible button — hold time, reorder, clear. Same actions the
  // agent's set_hold/move_frame/clear_frame tools dispatch.
  const [frameMenuOpen, setFrameMenuOpen] = useState(false);
  const holdMs = doc.frames[active]?.holdMs ?? 400;
  const nudgeHold = (delta: number) =>
    dispatch({
      type: 'setHold',
      index: active,
      holdMs: Math.min(5000, Math.max(50, holdMs + delta)),
    });
  const moveFrameEarlier = () => {
    if (active > 0) {
      dispatch({ type: 'moveFrame', from: active, to: active - 1 });
      setFrameMenuOpen(false);
    }
  };
  const moveFrameLater = () => {
    if (active < doc.frames.length - 1) {
      dispatch({ type: 'moveFrame', from: active, to: active + 1 });
      setFrameMenuOpen(false);
    }
  };
  const clearActiveFrame = () => {
    dispatch({ type: 'clearFrame', frame: active });
    setFrameMenuOpen(false);
  };

  return (
    <div
      {...stylex.props(styles.bar)}
      style={{ '--gd-theme-accent': swatch.invader } as React.CSSProperties}
      aria-label="Frame timeline"
    >
      <div {...stylex.props(styles.controlsRow)}>
        <div {...stylex.props(styles.cluster, styles.hideOnMobile)}>
          <Transport
            playing={playing}
            onJumpStart={props.onJumpStart}
            onStepBack={props.onStepBack}
            onTogglePlay={props.onTogglePlay}
            onStepFwd={props.onStepFwd}
            onJumpEnd={props.onJumpEnd}
          />
        </div>
      <div {...stylex.props(styles.sideCluster)}>
              <IconButton
                label="Duplicate frame"
                icon={<IconDuplicate />}
                variant="ghost"
                size="sm"
                tooltip="Duplicate the current frame"
                onClick={() => dispatch({ type: 'duplicateFrame', index: active })}
              />
              <IconButton
                label="Delete frame"
                icon={<IconTrash />}
                variant="ghost"
                size="sm"
                tooltip={
                  doc.frames.length > 1
                    ? 'Delete the current frame'
                    : 'Cannot delete the last frame'
                }
                isDisabled={doc.frames.length <= 1}
                onClick={() => dispatch({ type: 'deleteFrame', index: active })}
              />
              {/* Frame options: hold time, reorder, clear — the catalog's
                  frame tools that don't have an always-visible button. */}
              <Popover
                isOpen={frameMenuOpen}
                onOpenChange={setFrameMenuOpen}
                placement="above"
                alignment="start"
                label="Frame options"
                content={
                  <div {...stylex.props(styles.frameMenu)}>
                    <div {...stylex.props(styles.menuRow)}>
                      <Text>Hold</Text>
                      <div {...stylex.props(styles.menuRow)}>
                        <IconButton
                          label="Shorter hold"
                          icon={<IconMinus />}
                          variant="ghost"
                          size="sm"
                          tooltip="Hold this frame for less time"
                          isDisabled={holdMs <= 50}
                          onClick={() => nudgeHold(-100)}
                        />
                        <span {...stylex.props(styles.holdValue)}>
                          {holdMs}ms
                        </span>
                        <IconButton
                          label="Longer hold"
                          icon={<IconPlus />}
                          variant="ghost"
                          size="sm"
                          tooltip="Hold this frame for longer"
                          isDisabled={holdMs >= 5000}
                          onClick={() => nudgeHold(100)}
                        />
                      </div>
                    </div>
                    <div {...stylex.props(styles.menuRow)}>
                      <Button
                        label="Move frame earlier"
                        variant="ghost"
                        size="sm"
                        isDisabled={active === 0}
                        onClick={moveFrameEarlier}
                      >
                        <IconStepBack /> Earlier
                      </Button>
                      <Button
                        label="Move frame later"
                        variant="ghost"
                        size="sm"
                        isDisabled={active === doc.frames.length - 1}
                        onClick={moveFrameLater}
                      >
                        Later <IconStepForward />
                      </Button>
                    </div>
                    <Button
                      label="Clear frame"
                      variant="ghost"
                      size="sm"
                      onClick={clearActiveFrame}
                    >
                      <IconEraser /> Clear frame
                    </Button>
                  </div>
                }
              >
                <IconButton
                  label="Frame options"
                  icon={<IconPanels />}
                  variant="ghost"
                  size="sm"
                  tooltip="Frame options: hold time, reorder, clear"
                  onClick={() => setFrameMenuOpen(true)}
                />
              </Popover>
              {/* Onion skinning is persistent binary state — a ToggleButton. */}
              <ToggleButton
                label="Toggle onion skinning"
                icon={<IconOnion />}
                isPressed={onionOn}
                onPressedChange={() => props.onToggleOnion()}
                size="sm"
                tooltip="Toggle onion skinning"
                isIconOnly
              />
              <div {...stylex.props(styles.meta)}>
                <Text type="code" size="3xs" color="disabled">
                  12 fps
                </Text>
                <Text type="code" size="3xs" color="disabled">
                  1–{doc.frames.length}
                </Text>
              </div>
            </div>
      </div>
      <div
        {...stylex.props(styles.filmstrip)}
        role="listbox"
        aria-label="Frames"
        onPointerDown={markStripTouch}
        onPointerUp={markStripTouch}
        onPointerCancel={markStripTouch}
      >
        {doc.frames.map((f, i) => (
          <button
            key={f.id}
            ref={i === active ? activeThumbRef : undefined}
            {...stylex.props(styles.thumb, i === active && styles.thumbActive)}
            onClick={() => dispatch({ type: 'setActive', index: i })}
            role="option"
            aria-selected={i === active}
            title={`Frame ${i + 1} · hold ${f.holdMs}ms`}
          >
            <AsciiThumb cells={f.cells} width={doc.width} height={doc.height} dot={swatch.dot} bg={swatch.bg} />
            <Text
              type="code"
              size="3xs"
              color={i === active ? 'accent' : 'secondary'}
            >
              {i + 1} · {f.holdMs}ms
            </Text>
          </button>
        ))}
        <button
          {...stylex.props(styles.addFrame)}
          onClick={() => dispatch({ type: 'addFrame', after: active })}
          title="Add frame after the current one"
          aria-label="Add frame"
        >
          <IconPlus />
        </button>
      </div>
          </div>
  );
}
