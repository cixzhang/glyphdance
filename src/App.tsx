import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Theme } from '@astryxdesign/core/theme';
import { Button } from '@astryxdesign/core/Button';
import { useToast, ToastViewport } from '@astryxdesign/core/Toast';
import { glyphdanceTheme } from './studio/glyphdance.js';
import { applySyntaxChrome } from './studio/syntax-chrome.ts';
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
import { resolveStamp } from './studio/stamps.ts';
import type { Cell } from './studio/document.ts';
import type { PaintCell } from './studio/actions.ts';

const styles = stylex.create({
  root: {
    // Full-viewport app shell. The html/body/#root chain uses
    // -webkit-fill-available (see index.css), so height:100% fills the
    // actual visible viewport in iOS PWA. No position:fixed needed.
    width: '100%',
    height: '100%',
    // Explicit fallback: if the theme variable doesn't resolve (scoped
    // theme CSS), the root must still be opaque.
    backgroundColor: 'var(--color-background-body, #1b1b1b)',
    // In the installed PWA there is no browser chrome: pad for the notch /
    // status bar and the home indicator. Zero elsewhere.
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    display: 'grid',
    overflow: 'hidden',
    // PWA standalone: ensure the root fills the full screen viewport.
    '@media (display-mode: standalone)': {
      height: '-webkit-fill-available',
      minHeight: '-webkit-fill-available',
    },
    gridTemplateRows: '52px minmax(0, 1fr) 148px',
    gridTemplateColumns: '60px minmax(0, 1fr) 300px',
    gridTemplateAreas: '"topbar topbar topbar" "rail canvas inspector" "timeline timeline timeline"',
    color: 'var(--color-text-primary)',
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
  canvas: {
    gridArea: 'canvas',
    minWidth: 0,
    minHeight: 0,
    position: 'relative',
  },
  inspector: {
    gridArea: 'inspector',
    minHeight: 0,
    minWidth: 0,
  },
  timeline: { gridArea: 'timeline', minWidth: 0 },
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

  // The canvas theme selector re-skins the whole studio: push the active
  // syntax swatch's colors into the Astryx Theme container as inline custom
  // properties (they beat the built theme's :scope rule on the same
  // element). Runs after mount and on every theme/mode change.
  useEffect(() => {
    applySyntaxChrome(doc.themeId, mode);
  }, [doc.themeId, mode]);

  // Autosave: debounce 1.5s so a drag stroke writes once, not per pointer event.
  useEffect(() => {
    const timer = window.setTimeout(() => saveAutosavedDoc(doc), 1500);
    return () => window.clearTimeout(timer);
  }, [doc]);

  // The studio boots into playback: the seeded document is a real
  // multi-frame animation, so the first thing a new user sees is motion.
  const [playing, setPlaying] = useState(true);
  const [onionOn, setOnionOn] = useState(true);
  const [agentOpen, setAgentOpen] = useState(true);
  const [agentWorking, setAgentWorking] = useState(false);
  // Mobile only: the agent chat lives in a bottom sheet, and the control
  // cards (document, glyph/color, stamps) live in a side drawer.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Agent-done notification: set when an assistant turn finishes while the
  // chat isn't visible. An Astryx toast deep-links to the chat message;
  // tapping a token inside the message jumps to the stamp or frame it affected.
  const [agentDone, setAgentDone] = useState<{
    id: string;
    summary: string;
    error?: boolean;
  } | null>(null);
  const [scrollToMessage, setScrollToMessage] = useState<string | null>(null);
  const handleAgentDone = useCallback(
    (info: { id: string; summary: string; error?: boolean }) => setAgentDone(info),
    [],
  );
  const handleAgentScrolled = useCallback(() => setScrollToMessage(null), []);
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

  // Desktop undo/redo shortcuts: Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z (or
  // Ctrl+Y). Skipped inside text fields so the field's native undo wins.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      )
        return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // Canvas painting: one paintCells action per pointer event; the store
  // merges a stroke's actions into a single undo step.
  const onPaint = useCallback(
    (cells: PaintCell[], stroke: string) =>
      dispatch({ type: 'paintCells', frame: doc.active, cells, stroke }),
    [dispatch, doc.active],
  );
  // Stamp placement: a multi-frame stamp animates itself. One tap paints
  // the stamp's frames across consecutive document frames from the active
  // frame to the end, cycling — so a ghost wobbles through the whole
  // timeline instead of sitting static on one frame. Each frame's paint
  // stays its own undo step, via the validated placeStamp action.
  const onPlaceStamp = useCallback(
    (stampId: string, x: number, y: number, fg: string) => {
      const stamp = resolveStamp(stampId, doc.stamps);
      if (!stamp) return;
      const n = stamp.frames.length;
      for (let f = doc.active; f < doc.frames.length; f++) {
        dispatch({
          type: 'placeStamp',
          stampId,
          frame: f,
          x,
          y,
          fg,
          bg: '',
          stampFrame: (f - doc.active) % n,
        });
      }
    },
    [dispatch, doc],
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

  // Fire the Astryx toast when an agent turn finishes out of sight. Errors
  // stay up until dismissed; the badge on the Agent button persists either
  // way, so the deep link is never lost.
  const showToast = useToast();
  const lastToastedId = useRef<string | null>(null);
  useEffect(() => {
    if (!agentDone || lastToastedId.current === agentDone.id) return;
    lastToastedId.current = agentDone.id;
    const dismiss = showToast({
      type: agentDone.error ? 'error' : 'info',
      body: (
        <span
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {agentDone.error ? agentDone.summary : `Agent finished: ${agentDone.summary}`}
        </span>
      ),
      endContent: (
        <Button
          label="View agent result"
          size="sm"
          onClick={() => {
            dismiss();
            viewAgentDone();
          }}
        >
          View
        </Button>
      ),
      isAutoHide: !agentDone.error,
      autoHideDuration: 12000,
    });
  }, [agentDone, showToast, viewAgentDone]);

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

  // On mobile the Inspector is only overlays (Panels drawer + Agent sheet),
  // both fixed-position. Rendering it inside the grid creates an implicit
  // grid track (its gridArea doesn't exist in the mobile template), which
  // manifests as a dead band below the toolbar. Render it outside the grid
  // on mobile; on desktop it stays in the sidebar area.
  const inspectorEl = (
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
      onAgentScrolled={handleAgentScrolled}
      onSelectStamp={selectStamp}
      onWorkingChange={setAgentWorking}
    />
  );

  return (
    <Theme theme={glyphdanceTheme} mode={mode}>
    <ToastViewport position="bottomEnd" inset={{ bottom: isMobile ? 210 : 170 }}>
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.topbar)}>
        <TopBar
          isMobile={isMobile}
          playing={playing}
          frameLabel={frameLabel}
          agentOpen={isMobile ? sheetOpen : agentOpen}
          agentWorking={agentWorking}
          onJumpStart={jumpStart}
          onStepBack={stepBack}
          onTogglePlay={togglePlay}
          onStepFwd={stepFwd}
          onJumpEnd={jumpEnd}
          onToggleAgent={togglePanels}
          agentDone={agentDone !== null}
          mode={mode}
          onToggleMode={toggleMode}
        />
      </div>
      <div {...stylex.props(styles.rail)}>
        <ToolRail
          isMobile={isMobile}
          brush={brush}
          onBrushChange={patchBrush}
          doc={doc}
          dispatch={dispatch}
          mode={mode}
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
          onPlaceStamp={onPlaceStamp}
          onOpenAgent={openPanels}
          playing={playing}
          onJumpStart={jumpStart}
          onStepBack={stepBack}
          onTogglePlay={togglePlay}
          onStepFwd={stepFwd}
          onJumpEnd={jumpEnd}
          onOpenControls={() => setDrawerOpen(true)}
        />
      </div>
      {!isMobile && (
        <div {...stylex.props(styles.inspector)}>{inspectorEl}</div>
      )}
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
      </div>
      {isMobile && inspectorEl}
    </ToastViewport>
    </Theme>
  );
}
