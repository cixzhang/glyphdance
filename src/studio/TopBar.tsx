import * as stylex from '@stylexjs/stylex';
import Transport from './Transport.tsx';
import { DOC_NAME } from './document.ts';

const styles = stylex.create({
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    height: '100%',
    paddingLeft: 14,
    paddingRight: 12,
    backgroundColor: 'var(--gd-bg1)',
    borderBottom: '1px solid var(--gd-border)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 600,
    fontSize: 14,
    whiteSpace: 'nowrap',
  },
  logo: { color: 'var(--gd-invader)', fontSize: 16 },
  doc: {
    color: 'var(--gd-dim)',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
  },
  dirty: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: 'var(--gd-amber)',
    display: 'inline-block',
  },
  center: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minWidth: 0,
  },
  frameLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    color: 'var(--gd-dim)',
    minWidth: 44,
    textAlign: 'center',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    appearance: 'none',
    border: '1px solid var(--gd-border)',
    backgroundColor: 'transparent',
    color: 'var(--gd-dim)',
    borderRadius: 6,
    fontSize: 12,
    padding: '5px 10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    ':hover': { backgroundColor: 'var(--gd-bg3)', color: 'var(--gd-text)' },
  },
  chipOn: {
    color: 'var(--gd-accent)',
    borderColor: 'var(--gd-accent)',
  },
  exportBtn: {
    appearance: 'none',
    border: '1px solid transparent',
    backgroundColor: 'var(--gd-invader)',
    color: '#0c1410',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 12px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
    ':hover': { filter: 'brightness(1.08)' },
  },
  soon: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 4,
    padding: '2px 5px',
  },
});

interface TopBarProps {
  playing: boolean;
  frameLabel: string;
  agentOpen: boolean;
  onJumpStart: () => void;
  onStepBack: () => void;
  onTogglePlay: () => void;
  onStepFwd: () => void;
  onJumpEnd: () => void;
  onToggleAgent: () => void;
}

export default function TopBar(props: TopBarProps) {
  const { playing, frameLabel, agentOpen } = props;
  return (
    <div {...stylex.props(styles.bar)}>
      <div {...stylex.props(styles.brand)}>
        <span {...stylex.props(styles.logo)}>◈</span>
        <span>glyphdance</span>
      </div>
      <div {...stylex.props(styles.doc)}>
        <span {...stylex.props(styles.dirty)} title="Unsaved changes" />
        {DOC_NAME}
      </div>
      <div {...stylex.props(styles.center)}>
        <Transport
          playing={playing}
          onJumpStart={props.onJumpStart}
          onStepBack={props.onStepBack}
          onTogglePlay={props.onTogglePlay}
          onStepFwd={props.onStepFwd}
          onJumpEnd={props.onJumpEnd}
        />
        <span {...stylex.props(styles.frameLabel)}>{frameLabel}</span>
      </div>
      <div {...stylex.props(styles.right)}>
        <button {...stylex.props(styles.chip)} title="Toggle grid overlay (soon)">
          Grid
        </button>
        <button {...stylex.props(styles.chip)} title="Canvas zoom (soon)">
          100%
        </button>
        <button
          {...stylex.props(styles.exportBtn)}
          title="Export GIF / PNG / TXT — coming in Phase 1"
        >
          Export <span {...stylex.props(styles.soon)}>soon</span>
        </button>
        <button
          {...stylex.props(styles.chip, agentOpen && styles.chipOn)}
          onClick={props.onToggleAgent}
          title="Toggle the agent panel"
          aria-pressed={agentOpen}
        >
          ✦ Agent
        </button>
      </div>
    </div>
  );
}
