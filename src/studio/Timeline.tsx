import { useEffect, useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { IconButton } from '@astryxdesign/core/IconButton';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import { Text } from '@astryxdesign/core/Text';
import { IconOnion, IconPlus, IconDuplicate, IconTrash } from './icons';
import Transport from './Transport.tsx';
import { AsciiThumb } from './Canvas.tsx';
import type { DocState } from './document.ts';
import { themeById } from './scene.ts';
import type { Action } from './actions.ts';

const styles = stylex.create({
  bar: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 12,
    height: '100%',
    padding: '10px 14px',
    backgroundColor: 'var(--gd-bg1)',
    borderTop: '1px solid var(--gd-border)',
    '@media (max-width: 760px)': {
      gap: 8,
      padding: '8px 10px',
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
  // Frame-rate / range readouts — hidden on mobile where every pixel counts.
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    '@media (max-width: 760px)': { display: 'none' },
  },
  filmstrip: {
    flex: 1,
    display: 'flex',
    alignItems: 'stretch',
    gap: 8,
    overflowX: 'auto',
    padding: '2px',
    minWidth: 0,
  },
  // Frame thumbnails are the app's domain (character cells) — kept custom.
  thumb: {
    appearance: 'none',
    backgroundColor: 'var(--gd-bg2)',
    border: '1px solid var(--gd-border)',
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
    ':hover': { borderColor: 'var(--gd-faint)' },
  },
  thumbActive: {
    borderColor: 'var(--gd-invader)',
    boxShadow: '0 0 0 1px var(--gd-invader)',
  },
  playhead: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: 'var(--gd-invader)',
    borderRadius: 2,
    opacity: 0.85,
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

  // In play mode, keep the focused frame visible as the playhead advances.
  // `nearest` is a no-op when the frame is already fully in view.
  useEffect(() => {
    if (playing) {
      activeThumbRef.current?.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
        block: 'nearest',
      });
    }
  }, [active, playing]);

  return (
    <div {...stylex.props(styles.bar)} aria-label="Frame timeline">
      <div {...stylex.props(styles.cluster)}>
        <Transport
          playing={playing}
          onJumpStart={props.onJumpStart}
          onStepBack={props.onStepBack}
          onTogglePlay={props.onTogglePlay}
          onStepFwd={props.onStepFwd}
          onJumpEnd={props.onJumpEnd}
        />
      </div>
      <div {...stylex.props(styles.playhead)} aria-hidden="true" />
      <div {...stylex.props(styles.filmstrip)} role="listbox" aria-label="Frames">
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
            <AsciiThumb cells={f.cells} dot={swatch.dot} bg={swatch.bg} />
            <Text
              type="code"
              size="3xs"
              color={i === active ? 'accent' : 'secondary'}
            >
              {i + 1} · {f.holdMs}ms
            </Text>
          </button>
        ))}
        <IconButton
          label="Add frame"
          icon={<IconPlus />}
          variant="ghost"
          size="md"
          tooltip="Add frame after the current one"
          onClick={() => dispatch({ type: 'addFrame', after: active })}
        />
        <IconButton
          label="Duplicate frame"
          icon={<IconDuplicate />}
          variant="ghost"
          size="md"
          tooltip="Duplicate the current frame"
          onClick={() => dispatch({ type: 'duplicateFrame', index: active })}
        />
        <IconButton
          label="Delete frame"
          icon={<IconTrash />}
          variant="ghost"
          size="md"
          tooltip={
            doc.frames.length > 1
              ? 'Delete the current frame'
              : 'Cannot delete the last frame'
          }
          isDisabled={doc.frames.length <= 1}
          onClick={() => dispatch({ type: 'deleteFrame', index: active })}
        />
      </div>
      <div {...stylex.props(styles.cluster)}>
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
  );
}
