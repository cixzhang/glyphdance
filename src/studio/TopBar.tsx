import * as stylex from '@stylexjs/stylex';
import { TopNav, TopNavHeading, TopNavRenderContext } from '@astryxdesign/core/TopNav';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { IconMoon, IconPanels, IconSparkles, IconSun } from './icons';
import { Text } from '@astryxdesign/core/Text';
import Transport from './Transport.tsx';
import { DOC_NAME } from './document.ts';

const styles = stylex.create({
  topNav: {
    backgroundColor: 'var(--gd-bg1)',
    borderBottom: '1px solid var(--gd-border)',
    height: '100%',
  },
  logo: {
    color: 'var(--gd-invader)',
    fontSize: 16,
    lineHeight: 1,
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
  // Mobile-only controls.
  mobileOnly: {
    display: 'none',
    '@media (max-width: 760px)': { display: 'flex' },
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
  onJumpStart: () => void;
  onStepBack: () => void;
  onTogglePlay: () => void;
  onStepFwd: () => void;
  onJumpEnd: () => void;
  onToggleAgent: () => void;
  onOpenControls: () => void;
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
            logo={<span {...stylex.props(styles.logo)}>◈</span>}
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
          <div {...stylex.props(styles.stubs)}>
            <Button
              label="Grid"
              variant="ghost"
              size="sm"
              tooltip="Toggle grid overlay (soon)"
              isDisabled
            />
            <Button
              label="100%"
              variant="ghost"
              size="sm"
              tooltip="Canvas zoom (soon)"
              isDisabled
            />
          </div>
          <div {...stylex.props(styles.desktopOnly)}>
            <Button
              label="Export"
              variant="primary"
              size="sm"
              tooltip="Export GIF / PNG / TXT — coming in Phase 1"
              isDisabled
            />
          </div>
          <div {...stylex.props(styles.mobileOnly)}>
            <IconButton
              label="Control panels"
              icon={<IconPanels />}
              variant="ghost"
              size="sm"
              tooltip="Open the control panels"
              onClick={props.onOpenControls}
            />
          </div>
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
              icon={<IconSparkles />}
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
