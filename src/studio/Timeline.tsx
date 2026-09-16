import * as stylex from '@stylexjs/stylex';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import Transport from './Transport.tsx';
import { AsciiThumb } from './Canvas.tsx';
import { STUB_FRAMES } from './document.ts';

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
  addIcon: {
    fontSize: 16,
    lineHeight: 1,
  },
});

interface TimelineProps {
  frameIndex: number;
  playing: boolean;
  onionOn: boolean;
  onSelectFrame: (i: number) => void;
  onJumpStart: () => void;
  onStepBack: () => void;
  onTogglePlay: () => void;
  onStepFwd: () => void;
  onJumpEnd: () => void;
  onToggleOnion: () => void;
}

export default function Timeline(props: TimelineProps) {
  const { frameIndex, playing, onionOn } = props;
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
        {STUB_FRAMES.map((f, i) => (
          <button
            key={f.id}
            {...stylex.props(styles.thumb, i === frameIndex && styles.thumbActive)}
            onClick={() => props.onSelectFrame(i)}
            role="option"
            aria-selected={i === frameIndex}
            title={`Frame ${f.id} · hold ${f.holdMs}ms`}
          >
            <AsciiThumb frameIndex={i} />
            <Text
              type="code"
              size="3xs"
              color={i === frameIndex ? 'accent' : 'secondary'}
            >
              {f.id} · {f.holdMs}ms
            </Text>
          </button>
        ))}
        <IconButton
          label="Add frame"
          icon={
            <span {...stylex.props(styles.addIcon)} aria-hidden="true">
              +
            </span>
          }
          variant="ghost"
          size="md"
          tooltip="Add frame — soon"
          isDisabled
        />
      </div>
      <div {...stylex.props(styles.cluster)}>
        <IconButton
          label="Toggle onion skinning"
          icon={
            <span {...stylex.props(styles.addIcon)} aria-hidden="true">
              ◑
            </span>
          }
          variant={onionOn ? 'primary' : 'ghost'}
          size="sm"
          tooltip="Toggle onion skinning"
          onClick={props.onToggleOnion}
        />
        <div {...stylex.props(styles.meta)}>
          <Text type="code" size="3xs" color="disabled">
            12 fps
          </Text>
          <Text type="code" size="3xs" color="disabled">
            1–{STUB_FRAMES.length}
          </Text>
        </div>
      </div>
    </div>
  );
}
