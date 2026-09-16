import * as stylex from '@stylexjs/stylex';
import { IconButton } from '@astryxdesign/core/IconButton';

const styles = stylex.create({
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  glyph: {
    fontSize: 13,
    lineHeight: 1,
  },
});

interface TransportProps {
  playing: boolean;
  onJumpStart: () => void;
  onStepBack: () => void;
  onTogglePlay: () => void;
  onStepFwd: () => void;
  onJumpEnd: () => void;
}

function Glyph({ children }: { children: string }) {
  return <span {...stylex.props(styles.glyph)}>{children}</span>;
}

/** Playback transport cluster, shared by the top bar and the timeline. */
export default function Transport({
  playing,
  onJumpStart,
  onStepBack,
  onTogglePlay,
  onStepFwd,
  onJumpEnd,
}: TransportProps) {
  return (
    <div {...stylex.props(styles.row)} role="group" aria-label="Playback transport">
      <IconButton
        label="Jump to first frame"
        icon={<Glyph>⏮</Glyph>}
        variant="ghost"
        size="sm"
        tooltip="Jump to first frame"
        onClick={onJumpStart}
      />
      <IconButton
        label="Previous frame"
        icon={<Glyph>◀</Glyph>}
        variant="ghost"
        size="sm"
        tooltip="Previous frame"
        onClick={onStepBack}
      />
      <IconButton
        label={playing ? 'Pause' : 'Play'}
        icon={<Glyph>{playing ? '❚❚' : '▶'}</Glyph>}
        variant="secondary"
        size="sm"
        tooltip={playing ? 'Pause' : 'Play'}
        onClick={onTogglePlay}
      />
      <IconButton
        label="Next frame"
        icon={<Glyph>▶</Glyph>}
        variant="ghost"
        size="sm"
        tooltip="Next frame"
        onClick={onStepFwd}
      />
      <IconButton
        label="Jump to last frame"
        icon={<Glyph>⏭</Glyph>}
        variant="ghost"
        size="sm"
        tooltip="Jump to last frame"
        onClick={onJumpEnd}
      />
    </div>
  );
}
