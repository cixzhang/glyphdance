import * as stylex from '@stylexjs/stylex';
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
  },
  cluster: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
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
  thumbLabel: {
    fontFamily: 'var(--gd-mono)',
    fontSize: 9,
    color: 'var(--gd-dim)',
  },
  thumbLabelActive: { color: 'var(--gd-invader)' },
  addBtn: {
    appearance: 'none',
    backgroundColor: 'transparent',
    border: '1px dashed var(--gd-border)',
    borderRadius: 8,
    color: 'var(--gd-faint)',
    fontSize: 18,
    minWidth: 52,
    cursor: 'not-allowed',
  },
  toggle: {
    appearance: 'none',
    border: '1px solid var(--gd-border)',
    backgroundColor: 'transparent',
    color: 'var(--gd-dim)',
    borderRadius: 6,
    fontSize: 11,
    padding: '6px 10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    ':hover': { backgroundColor: 'var(--gd-bg3)', color: 'var(--gd-text)' },
  },
  toggleOn: { color: 'var(--gd-onion)', borderColor: 'var(--gd-onion)' },
  meta: {
    fontFamily: 'var(--gd-mono)',
    fontSize: 10,
    color: 'var(--gd-faint)',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
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
          size={13}
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
            <span {...stylex.props(styles.thumbLabel, i === frameIndex && styles.thumbLabelActive)}>
              {f.id} · {f.holdMs}ms
            </span>
          </button>
        ))}
        <button {...stylex.props(styles.addBtn)} title="Add frame — soon" disabled aria-label="Add frame (coming soon)">
          +
        </button>
      </div>
      <div {...stylex.props(styles.cluster)}>
        <button
          {...stylex.props(styles.toggle, onionOn && styles.toggleOn)}
          onClick={props.onToggleOnion}
          aria-pressed={onionOn}
          title="Toggle onion skinning"
        >
          ◑ Onion
        </button>
        <span {...stylex.props(styles.meta)}>12 fps</span>
        <span {...stylex.props(styles.meta)}>1–{STUB_FRAMES.length}</span>
      </div>
    </div>
  );
}
