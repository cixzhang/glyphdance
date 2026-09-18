import * as stylex from '@stylexjs/stylex';
import { TopNav, TopNavHeading, TopNavRenderContext } from '@astryxdesign/core/TopNav';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { IconMoon, IconSparkles, IconSun } from './icons';
import { Text } from '@astryxdesign/core/Text';
import Transport from './Transport.tsx';
import { DOC_NAME } from './document.ts';

// NOTE: the slow spin for the agent icon lives in ./animations.css as the
// plain .gd-agent-spin class — the Astryx build wrapper drops
// stylex.keyframes, so keyframes are defined in CSS instead.

const styles = stylex.create({
  topNav: {
    // Exact canvas bg: the chrome melts into the stage instead of floating
    // a lifted neutral above it (see --gd-chrome-bg in syntax-chrome.ts).
    backgroundColor: 'var(--gd-chrome-bg, var(--color-background-surface))',
    borderBottom: '1px solid var(--color-border)',
    height: '100%',
  },
  logo: {
    width: 20,
    height: 20,
    display: 'inline-block',
    verticalAlign: '-4px',
  },
  doc: {
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
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  end: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  // Disabled stubs — hidden on mobile to keep the bar compact.
  stubs: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    '@media (max-width: 760px)': { display: 'none' },
  },
  // Desktop-only controls.
  desktopOnly: {
    '@media (max-width: 760px)': { display: 'none' },
  },
  agentWrap: { position: 'relative', display: 'inline-flex' },
  // Badge dot: the agent finished while the chat was closed. Astryx
  // StatusDot with positioning; the label keeps it accessible.
  agentDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    pointerEvents: 'none',
  },
});

interface TopBarProps {
  isMobile: boolean;
  playing: boolean;
  frameLabel: string;
  agentOpen: boolean;
  /** The agent finished a turn while the chat was closed — show a badge. */
  agentDone?: boolean;
  /** The agent is working on a turn — spin its button icon slowly. */
  agentWorking?: boolean;
  onJumpStart: () => void;
  onStepBack: () => void;
  onTogglePlay: () => void;
  onStepFwd: () => void;
  onJumpEnd: () => void;
  onToggleAgent: () => void;
  mode: 'light' | 'dark';
  onToggleMode: () => void;
}

export default function TopBar(props: TopBarProps) {
  const { isMobile, playing, frameLabel, agentOpen, mode, onToggleMode } = props;
  // On mobile, TopNav's own mobile-bar mode renders heading + endContent
  // only — the doc name and transport move out of the way instead of
  // overlapping. (Transport also lives in the timeline.)
  return (
    <TopNavRenderContext.Provider value={isMobile ? 'mobile-bar' : 'default'}>
      <TopNav
        xstyle={styles.topNav}
        heading={
          <TopNavHeading
            heading="glyphdance"
            logo={<img src="/favicon.svg" alt="glyphdance" {...stylex.props(styles.logo)} />}
          />
        }
      startContent={
        <div {...stylex.props(styles.doc)}>
          <span {...stylex.props(styles.dirty)} title="Unsaved changes" />
          <Text type="supporting" color="secondary">
            {DOC_NAME}
          </Text>
        </div>
      }
      centerContent={
        <div {...stylex.props(styles.center)}>
          <Transport
            playing={playing}
            onJumpStart={props.onJumpStart}
            onStepBack={props.onStepBack}
            onTogglePlay={props.onTogglePlay}
            onStepFwd={props.onStepFwd}
            onJumpEnd={props.onJumpEnd}
          />
          <Text type="code" color="secondary">
            {frameLabel}
          </Text>
        </div>
      }
      endContent={
        <div {...stylex.props(styles.end)}>
          <IconButton
            label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            icon={mode === 'dark' ? <IconSun /> : <IconMoon />}
            variant="ghost"
            size="sm"
            tooltip={mode === 'dark' ? 'Light mode' : 'Dark mode'}
            onClick={onToggleMode}
          />
          <span {...stylex.props(styles.agentWrap)}>
            <Button
              label="Agent"
              icon={
                <span className={props.agentWorking ? 'gd-agent-spin' : undefined}>
                  <IconSparkles />
                </span>
              }
              variant={agentOpen ? 'primary' : 'ghost'}
              size="sm"
              tooltip={isMobile ? 'Open the agent' : 'Toggle the agent panel'}
              onClick={props.onToggleAgent}
            />
            {props.agentDone && (
              <StatusDot
                variant="accent"
                label="The agent finished while the chat was closed"
                xstyle={styles.agentDot}
              />
            )}
          </span>
        </div>
      }
      />
    </TopNavRenderContext.Provider>
  );
}
