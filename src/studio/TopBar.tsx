import * as stylex from '@stylexjs/stylex';
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav';
import { Button } from '@astryxdesign/core/Button';
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
          <Button
            label="Export"
            variant="primary"
            size="sm"
            tooltip="Export GIF / PNG / TXT — coming in Phase 1"
            isDisabled
          />
          <Button
            label="Agent"
            icon={<span>✦</span>}
            variant={agentOpen ? 'primary' : 'ghost'}
            size="sm"
            tooltip="Toggle the agent panel"
            onClick={props.onToggleAgent}
          />
        </div>
      }
    />
  );
}
