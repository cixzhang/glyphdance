import { useCallback, useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import TopBar from './studio/TopBar.tsx';
import ToolRail from './studio/ToolRail.tsx';
import Canvas from './studio/Canvas.tsx';
import Inspector from './studio/Inspector.tsx';
import Timeline from './studio/Timeline.tsx';
import { useIsMobile } from './studio/responsive.ts';
import { STUB_FRAMES } from './studio/document.ts';
import { DEFAULT_SCENE, type SceneConfig } from './studio/scene.ts';

const styles = stylex.create({
  root: {
    // dvh keeps the app clear of the iOS Safari toolbar.
    height: '100dvh',
    display: 'grid',
    gridTemplateRows: '52px minmax(0, 1fr) 148px',
    gridTemplateColumns: '60px minmax(0, 1fr) 300px',
    gridTemplateAreas: '"topbar topbar topbar" "rail canvas inspector" "timeline timeline timeline"',
    backgroundColor: 'var(--gd-bg0)',
    color: 'var(--gd-text)',
    fontSize: 13,
    // Mobile: single column. The tool rail becomes a bottom strip ("tools")
    // and the inspector becomes a bottom sheet (position: fixed, so the
    // wrapper collapses via display: contents).
    '@media (max-width: 760px)': {
      gridTemplateRows: '52px minmax(0, 1fr) auto auto',
      gridTemplateColumns: 'minmax(0, 1fr)',
      gridTemplateAreas: '"topbar" "canvas" "timeline" "tools"',
    },
  },
  topbar: { gridArea: 'topbar', minWidth: 0 },
  rail: {
    gridArea: 'rail',
    minHeight: 0,
    '@media (max-width: 760px)': { gridArea: 'tools', minHeight: 'auto' },
  },
  canvas: { gridArea: 'canvas', minWidth: 0, minHeight: 0 },
  inspector: {
    gridArea: 'inspector',
    minHeight: 0,
    minWidth: 0,
    '@media (max-width: 760px)': { display: 'contents' },
  },
  timeline: { gridArea: 'timeline', minWidth: 0 },
});

const LAST = STUB_FRAMES.length - 1;

export default function App() {
  const isMobile = useIsMobile();
  const [frameIndex, setFrameIndex] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [onionOn, setOnionOn] = useState(true);
  const [agentOpen, setAgentOpen] = useState(true);
  // Mobile only: the inspector (agent + scene + glyph/color + stamps) lives
  // in a bottom sheet instead of a side column.
  const [sheetOpen, setSheetOpen] = useState(false);
  // Demo scene: ET's sprite, the player's sprite, and the syntax-theme palette.
  const [scene, setScene] = useState<SceneConfig>(DEFAULT_SCENE);
  const patchScene = useCallback(
    (patch: Partial<SceneConfig>) => setScene((s) => ({ ...s, ...patch })),
    [],
  );
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

  // The top bar's Agent button and the canvas "Ask the agent" pill share one
  // entry point. On desktop they toggle the agent card; on mobile they open
  // or close the inspector bottom sheet.
  const togglePanels = useCallback(() => {
    if (isMobile) {
      setSheetOpen((v) => !v);
    } else {
      setAgentOpen((o) => !o);
    }
  }, [isMobile]);
  const openPanels = useCallback(() => {
    if (isMobile) {
      setSheetOpen(true);
    } else {
      setAgentOpen(true);
    }
  }, [isMobile]);

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
          isMobile={isMobile}
          playing={playing}
          frameLabel={frameLabel}
          agentOpen={isMobile ? sheetOpen : agentOpen}
          onJumpStart={jumpStart}
          onStepBack={stepBack}
          onTogglePlay={togglePlay}
          onStepFwd={stepFwd}
          onJumpEnd={jumpEnd}
          onToggleAgent={togglePanels}
        />
      </div>
      <div {...stylex.props(styles.rail)}>
        <ToolRail isMobile={isMobile} />
      </div>
      <div {...stylex.props(styles.canvas)}>
        <Canvas
          frameIndex={frameIndex}
          frameCount={STUB_FRAMES.length}
          onionOn={onionOn}
          scene={scene}
          onOpenAgent={openPanels}
        />
      </div>
      <div {...stylex.props(styles.inspector)}>
        <Inspector
          isMobile={isMobile}
          agentOpen={agentOpen}
          onToggleAgent={toggleAgent}
          sheetOpen={sheetOpen}
          onSheetOpenChange={setSheetOpen}
          scene={scene}
          onSceneChange={patchScene}
        />
      </div>
      <div {...stylex.props(styles.timeline)}>
        <Timeline
          frameIndex={frameIndex}
          playing={playing}
          onionOn={onionOn}
          scene={scene}
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
