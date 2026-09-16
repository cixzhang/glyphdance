import { useCallback, useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import TopBar from './studio/TopBar.tsx';
import ToolRail from './studio/ToolRail.tsx';
import Canvas from './studio/Canvas.tsx';
import Inspector from './studio/Inspector.tsx';
import Timeline from './studio/Timeline.tsx';
import { STUB_FRAMES } from './studio/document.ts';

const styles = stylex.create({
  root: {
    height: '100vh',
    display: 'grid',
    gridTemplateRows: '52px minmax(0, 1fr) 148px',
    gridTemplateColumns: '60px minmax(0, 1fr) 300px',
    gridTemplateAreas: '"topbar topbar topbar" "rail canvas inspector" "timeline timeline timeline"',
    backgroundColor: 'var(--gd-bg0)',
    color: 'var(--gd-text)',
    fontSize: 13,
  },
  topbar: { gridArea: 'topbar', minWidth: 0 },
  rail: { gridArea: 'rail', minHeight: 0 },
  canvas: { gridArea: 'canvas', minWidth: 0, minHeight: 0 },
  inspector: { gridArea: 'inspector', minHeight: 0, minWidth: 0 },
  timeline: { gridArea: 'timeline', minWidth: 0 },
});

const LAST = STUB_FRAMES.length - 1;

export default function App() {
  const [frameIndex, setFrameIndex] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [onionOn, setOnionOn] = useState(true);
  const [agentOpen, setAgentOpen] = useState(true);
  const timer = useRef<number | null>(null);

  const jumpStart = useCallback(() => setFrameIndex(0), []);
  const jumpEnd = useCallback(() => setFrameIndex(LAST), []);
  const stepBack = useCallback(
    () => setFrameIndex((i) => (i - 1 + STUB_FRAMES.length) % STUB_FRAMES.length),
    [],
  );
  const stepFwd = useCallback(
    () => setFrameIndex((i) => (i + 1) % STUB_FRAMES.length),
    [],
  );
  const togglePlay = useCallback(() => setPlaying((p) => !p), []);
  const toggleOnion = useCallback(() => setOnionOn((o) => !o), []);
  const toggleAgent = useCallback(() => setAgentOpen((o) => !o), []);

  // Playback honors each frame's hold time (the stub's stand-in for real timing).
  useEffect(() => {
    if (!playing) return;
    timer.current = window.setTimeout(() => {
      setFrameIndex((i) => (i + 1) % STUB_FRAMES.length);
    }, STUB_FRAMES[frameIndex].holdMs);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [playing, frameIndex]);

  const frameLabel = `${frameIndex + 1} / ${STUB_FRAMES.length}`;

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.topbar)}>
        <TopBar
          playing={playing}
          frameLabel={frameLabel}
          agentOpen={agentOpen}
          onJumpStart={jumpStart}
          onStepBack={stepBack}
          onTogglePlay={togglePlay}
          onStepFwd={stepFwd}
          onJumpEnd={jumpEnd}
          onToggleAgent={toggleAgent}
        />
      </div>
      <div {...stylex.props(styles.rail)}>
        <ToolRail />
      </div>
      <div {...stylex.props(styles.canvas)}>
        <Canvas
          frameIndex={frameIndex}
          frameCount={STUB_FRAMES.length}
          onionOn={onionOn}
          onOpenAgent={() => setAgentOpen(true)}
        />
      </div>
      <div {...stylex.props(styles.inspector)}>
        <Inspector agentOpen={agentOpen} onToggleAgent={toggleAgent} />
      </div>
      <div {...stylex.props(styles.timeline)}>
        <Timeline
          frameIndex={frameIndex}
          playing={playing}
          onionOn={onionOn}
          onSelectFrame={setFrameIndex}
          onJumpStart={jumpStart}
          onStepBack={stepBack}
          onTogglePlay={togglePlay}
          onStepFwd={stepFwd}
          onJumpEnd={jumpEnd}
          onToggleOnion={toggleOnion}
        />
      </div>
    </div>
  );
}
