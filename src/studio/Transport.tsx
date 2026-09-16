import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  btn: {
    appearance: 'none',
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    color: 'var(--gd-dim)',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': { backgroundColor: 'var(--gd-bg3)', color: 'var(--gd-text)' },
  },
  play: {
    color: 'var(--gd-text)',
    backgroundColor: 'var(--gd-bg3)',
    borderColor: 'var(--gd-border)',
  },
});

interface TransportProps {
  playing: boolean;
  size?: number;
  onJumpStart: () => void;
  onStepBack: () => void;
  onTogglePlay: () => void;
  onStepFwd: () => void;
  onJumpEnd: () => void;
}

/** Playback transport cluster, shared by the top bar and the timeline. */
export default function Transport({
  playing,
  size = 15,
  onJumpStart,
  onStepBack,
  onTogglePlay,
  onStepFwd,
  onJumpEnd,
}: TransportProps) {
  const box = { width: 30, height: 30, fontSize: size };
  return (
    <div {...stylex.props(styles.row)} role="group" aria-label="Playback transport">
      <button
        {...stylex.props(styles.btn)}
        style={box}
        onClick={onJumpStart}
        title="Jump to first frame"
        aria-label="Jump to first frame"
      >
        ⏮
      </button>
      <button
        {...stylex.props(styles.btn)}
        style={box}
        onClick={onStepBack}
        title="Previous frame"
        aria-label="Previous frame"
      >
        ◀
      </button>
      <button
        {...stylex.props(styles.btn, styles.play)}
        style={box}
        onClick={onTogglePlay}
        title={playing ? 'Pause' : 'Play'}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <button
        {...stylex.props(styles.btn)}
        style={box}
        onClick={onStepFwd}
        title="Next frame"
        aria-label="Next frame"
      >
        ▶
      </button>
      <button
        {...stylex.props(styles.btn)}
        style={box}
        onClick={onJumpEnd}
        title="Jump to last frame"
        aria-label="Jump to last frame"
      >
        ⏭
      </button>
    </div>
  );
}
