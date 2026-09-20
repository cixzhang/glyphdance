import * as stylex from '@stylexjs/stylex';
import { IconButton } from '@astryxdesign/core/IconButton';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import {
  IconPause,
  IconPlay,
  IconSkipBack,
  IconSkipForward,
  IconStepBack,
  IconStepForward,
} from './icons';

const styles = stylex.create({
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
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

/** Playback transport cluster, shared by the timeline and the mobile canvas overlay. */
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
        icon={<IconSkipBack />}
        variant="ghost"
        size="sm"
        tooltip="Jump to first frame"
        onClick={onJumpStart}
      />
      <IconButton
        label="Previous frame"
        icon={<IconStepBack />}
        variant="ghost"
        size="sm"
        tooltip="Previous frame"
        onClick={onStepBack}
      />
      {/* Play/pause is persistent binary state — a ToggleButton with an
          icon swap, not a momentary IconButton. */}
      <ToggleButton
        label={playing ? 'Pause' : 'Play'}
        icon={<IconPlay />}
        pressedIcon={<IconPause />}
        isPressed={playing}
        onPressedChange={() => onTogglePlay()}
        size="sm"
        tooltip={playing ? 'Pause' : 'Play'}
        isIconOnly
      />
      <IconButton
        label="Next frame"
        icon={<IconStepForward />}
        variant="ghost"
        size="sm"
        tooltip="Next frame"
        onClick={onStepFwd}
      />
      <IconButton
        label="Jump to last frame"
        icon={<IconSkipForward />}
        variant="ghost"
        size="sm"
        tooltip="Jump to last frame"
        onClick={onJumpEnd}
      />
    </div>
  );
}
