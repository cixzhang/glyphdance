import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Theme } from '@astryxdesign/core/theme';
import { glyphdanceTheme } from './studio/glyphdance.js';
import TopBar from './studio/TopBar.tsx';
import ToolRail from './studio/ToolRail.tsx';
import Canvas from './studio/Canvas.tsx';
import Inspector from './studio/Inspector.tsx';
import Timeline from './studio/Timeline.tsx';
import { useIsMobile } from './studio/responsive.ts';
import { useDocument } from './studio/store.ts';
import { seedDocument } from './studio/seed.ts';
import {
  clearAutosavedDoc,
  loadAutosavedDoc,
  saveAutosavedDoc,
} from './studio/persist.ts';
import { DEFAULT_BRUSH, type Brush, type ToolId } from './studio/brush.ts';
import type { Cell } from './studio/document.ts';
import type { PaintCell } from './studio/actions.ts';

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
  // Agent-done toast: tappable, deep-links into the chat message.
  toast: {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: 160,
    '@media (max-width: 760px)': { bottom: 190 },
    zIndex: 60,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    maxWidth: '92vw',
    padding: '10px 14px',
    borderRadius: 14,
    border: '1px solid var(--gd-border)',
    backgroundColor: 'var(--gd-bg1)',
    color: 'var(--gd-text)',
    fontFamily: 'var(--gd-ui)',
    fontSize: 12,
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  toastCheck: { color: 'var(--gd-accent)', flexShrink: 0 },
  toastText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '52vw',
  },
  toastView: {
    color: 'var(--gd-accent)',
    fontWeight: 700,
    flexShrink: 0,
  },
});

type ThemeMode = 'light' | 'dark';

const MODE_KEY = 'glyphdance:mode';

function initialMode(): ThemeMode {
  try {
    return window.localStorage.getItem(MODE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export default function App() {
  const isMobile = useIsMobile();
  // The studio is a darkroom by default; the switch persists the choice.
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const toggleMode = useCallback(() => {
    setMode((m) => {
      const next = m === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(MODE_KEY, next);
      } catch {
        /* private mode — the toggle still works for the session */
      }
      return next;
    });
  }, []);

  // The document: every mutation goes through typed actions (store.dispatch),
  // so painting, the timeline, and eventually the agent share one validated,
  // undoable path. On launch we restore the autosaved document when one
  // exists; otherwise we seed the demo scene.
  const [seedDoc] = useState(() => loadAutosavedDoc() ?? seedDocument(initialMode()));
  const { doc, dispatch, undo, redo, canUndo, canRedo } = useDocument(seedDoc);

  // Autosave: debounce 1.5s so a drag stroke writes once, not per pointer event.
  useEffect(() => {
    const timer = window.setTimeout(() => saveAutosavedDoc(doc), 1500);
    return () => window.clearTimeout(timer);
  }, [doc]);

  const [playing, setPlaying] = useState(false);
  const [onionOn, setOnionOn] = useState(true);
  const [agentOpen, setAgentOpen] = useState(true);
  // Mobile only: the agent chat lives in a bottom sheet, and the control
  // cards (document, glyph/color, stamps) live in a side drawer.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Agent-done notification: set when an assistant turn finishes while the
  // chat isn't visible. The toast deep-links to the chat message; tapping a
  // token inside the message jumps to the stamp or frame it affected.
  const [agentDone, setAgentDone] = useState<{ id: string; summary: string } | null>(null);
  const [scrollToMessage, setScrollToMessage] = useState<string | null>(null);
  const handleAgentDone = useCallback(
    (info: { id: string; summary: string }) => setAgentDone(info),
    [],
  );
  // The brush: active tool plus the glyph and colors it paints with.
  const [brush, setBrush] = useState<Brush>(DEFAULT_BRUSH);
  const patchBrush = useCallback(
    (patch: Partial<Brush>) => setBrush((b) => ({ ...b, ...patch })),
    [],
  );
  // A stamp token was tapped: arm the stamp tool and reveal the Stamps panel
  // (mobile drawer; the desktop inspector is already visible).
  const selectStamp = useCallback(
    (id: string) => {
      patchBrush({ tool: 'stamp', stampId: id });
      if (isMobile) setDrawerOpen(true);
    },
    [patchBrush, isMobile],
  );
  // Canvas view: grid overlay + zoom.
  const [gridOn, setGridOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const toggleGrid = useCallback(() => setGridOn((g) => !g), []);
  const zoomIn = useCallback(() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2))), []);
  const timer = useRef<number | null>(null);

  const frameCount = doc.frames.length;
  const jumpStart = useCallback(() => dispatch({ type: 'setActive', index: 0 }), [dispatch]);
  const jumpEnd = useCallback(
    () => dispatch({ type: 'setActive', index: frameCount - 1 }),
    [dispatch, frameCount],
  );
  const stepBack = useCallback(
    () => dispatch({ type: 'setActive', index: (doc.active - 1 + frameCount) % frameCount }),
    [dispatch, doc.active, frameCount],
  );
  const stepFwd = useCallback(
    () => dispatch({ type: 'setActive', index: (doc.active + 1) % frameCount }),
    [dispatch, doc.active, frameCount],
  );
  const togglePlay = useCallback(() => setPlaying((p) => !p), []);
  const toggleOnion = useCallback(() => setOnionOn((o) => !o), []);
  const toggleAgent = useCallback(() => setAgentOpen((o) => !o), []);

  // Canvas painting: one paintCells action per pointer event; the store
  // merges a stroke's actions into a single undo step.
  const onPaint = useCallback(
    (cells: PaintCell[], stroke: string) =>
      dispatch({ type: 'paintCells', frame: doc.active, cells, stroke }),
    [dispatch, doc.active],
  );
  // Eyedropper: lift the cell's glyph and colors into the brush, then go
  // back to the brush so the next touch paints.
  const onPick = useCallback(
    (cell: Cell) =>
      setBrush((b) => ({
        tool: 'brush',
        glyph: cell.ch === ' ' ? b.glyph : cell.ch,
        fg: cell.fg,
        bg: cell.bg,
        stampId: b.stampId,
      })),
    [],
  );

  // The top bar's Agent button and the canvas "Ask the agent" pill share one
  // entry point. On desktop they toggle the agent card; on mobile they open
  // the agent bottom sheet. The mobile control-panels button opens the side
  // drawer instead.
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
  const viewAgentDone = useCallback(() => {
    setScrollToMessage(agentDone?.id ?? null);
    setAgentDone(null);
    openPanels();
  }, [agentDone, openPanels]);

  // Playback honors each frame's hold time.
  useEffect(() => {
    if (!playing) return;
    timer.current = window.setTimeout(() => {
      dispatch({ type: 'setActive', index: (doc.active + 1) % frameCount });
    }, doc.frames[doc.active].holdMs);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [playing, doc.active, frameCount, dispatch, doc.frames]);

  const frameLabel = useMemo(
    () => `${doc.active + 1} / ${frameCount}`,
    [doc.active, frameCount],
  );

  return (
    <Theme theme={glyphdanceTheme} mode={mode}>
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
          agentDone={agentDone !== null}
          onOpenControls={() => setDrawerOpen(true)}
          mode={mode}
          onToggleMode={toggleMode}
        />
      </div>
      <div {...stylex.props(styles.rail)}>
        <ToolRail
          isMobile={isMobile}
          tool={brush.tool}
          onToolChange={(tool) => patchBrush({ tool: tool as ToolId })}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
        />
      </div>
      <div {...stylex.props(styles.canvas)}>
        <Canvas
          doc={doc}
          onionOn={onionOn}
          mode={mode}
          brush={brush}
          gridOn={gridOn}
          zoom={zoom}
          onToggleGrid={toggleGrid}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onPaint={onPaint}
          onPick={onPick}
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
          drawerOpen={drawerOpen}
          onDrawerOpenChange={setDrawerOpen}
          doc={doc}
          dispatch={dispatch}
          brush={brush}
          onBrushChange={patchBrush}
          mode={mode}
          onAgentDone={handleAgentDone}
          scrollToMessage={scrollToMessage}
          onAgentScrolled={() => setScrollToMessage(null)}
          onSelectStamp={selectStamp}
        />
      </div>
      <div {...stylex.props(styles.timeline)}>
        <Timeline
          doc={doc}
          dispatch={dispatch}
          playing={playing}
          onionOn={onionOn}
          mode={mode}
          onJumpStart={jumpStart}
          onStepBack={stepBack}
          onTogglePlay={togglePlay}
          onStepFwd={stepFwd}
          onJumpEnd={jumpEnd}
          onToggleOnion={toggleOnion}
        />
      </div>
      {agentDone && (
        <button
          {...stylex.props(styles.toast)}
          onClick={viewAgentDone}
          aria-label={`Agent finished. View result: ${agentDone.summary}`}
        >
          <span {...stylex.props(styles.toastCheck)}>✓</span>
          <span {...stylex.props(styles.toastText)}>{agentDone.summary}</span>
          <span {...stylex.props(styles.toastView)}>View</span>
        </button>
      )}
    </div>
    </Theme>
  );
}
