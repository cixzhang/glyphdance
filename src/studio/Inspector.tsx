import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Card } from '@astryxdesign/core/Card';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Switch } from '@astryxdesign/core/Switch';
import { Badge } from '@astryxdesign/core/Badge';
import { VStack } from '@astryxdesign/core/Stack';
import { BottomSheet } from '@astryxdesign/core/BottomSheet';
import { MobileNav } from '@astryxdesign/core/MobileNav';
import { IconCheck, IconSparkles } from './icons';
import DocumentPanel from './DocumentPanel.tsx';
import { ET_SPRITES } from './scene.ts';
import type { DocState } from './document.ts';
import type { Action } from './actions.ts';
import type { Brush } from './brush.ts';

const styles = stylex.create({
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    height: '100%',
    padding: 10,
    backgroundColor: 'var(--gd-bg1)',
    borderLeft: '1px solid var(--gd-border)',
    overflowY: 'auto',
  },
  // The BottomSheet owns the panel, handle, scrim, swipe-to-dismiss, and
  // focus trap — this just stacks the cards inside its scrollable area.
  sheetContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    paddingBottom: 8,
  },
  // The MobileNav drawer's content area scrolls on its own — this stacks the
  // control cards inside it.
  drawerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    paddingBottom: 8,
  },
  agentName: { color: 'var(--gd-accent)', fontWeight: 600 },
  opLog: {
    fontFamily: 'var(--gd-mono)',
    fontSize: 10,
    color: 'var(--gd-dim)',
    marginTop: 4,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: 'var(--gd-bubble)',
    borderRadius: '12px 12px 3px 12px',
    padding: '7px 10px',
    maxWidth: '92%',
  },
  bubbleAgent: {
    alignSelf: 'flex-start',
    backgroundColor: 'var(--gd-bg3)',
    border: '1px solid var(--gd-border)',
    borderRadius: '12px 12px 12px 3px',
    padding: '7px 10px',
    maxWidth: '94%',
  },
  // Domain-specific pickers below (glyph cells, color swatches, stamp
  // thumbnails) have no Astryx equivalent — kept as plain buttons.
  glyphGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: 4,
  },
  glyph: {
    appearance: 'none',
    border: '1px solid transparent',
    backgroundColor: 'var(--gd-bg1)',
    color: 'var(--gd-dim)',
    borderRadius: 6,
    fontFamily: 'var(--gd-mono)',
    fontSize: 14,
    height: 30,
    cursor: 'pointer',
    ':hover': { borderColor: 'var(--gd-border)', color: 'var(--gd-text)' },
  },
  glyphActive: { borderColor: 'var(--gd-invader)', color: 'var(--gd-invader)' },
  swatchRow: { display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' },
  swatch: {
    appearance: 'none',
    width: 22,
    height: 22,
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.14)',
    cursor: 'pointer',
    padding: 0,
  },
  swatchActive: { outline: '2px solid var(--gd-text)', outlineOffset: 1 },
  stampGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  stamp: {
    appearance: 'none',
    backgroundColor: 'var(--gd-bg1)',
    border: '1px solid var(--gd-border)',
    borderRadius: 8,
    padding: 8,
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    ':hover': { borderColor: 'var(--gd-faint)' },
  },
  stampArt: {
    fontFamily: 'var(--gd-mono)',
    fontSize: 11,
    lineHeight: 1.25,
    color: 'var(--gd-invader)',
    margin: 0,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'pre',
  },
});

const GLYPHS = ['█', '▓', '▒', '░', '·', '●', '◆', '✦', '◉', '+', '×', '/', '\\', '|', '(', ')', '[', ']', 'o', 'O', '#', '@', '<', '>'];
const FG = ['#4ade80', '#7cc7ff', '#ffd75e', '#ff8a8a', '#b48ce8', '#ff9f5a', '#d7dce2', '#8b94a0'];
const BG = ['#0d0f12', '#1d2126', '#2b3a4a', '#3a2b4a', '#4a2b2b', '#2b4a2f', '#4a3d1e', '#101215'];

// Phase 0 stub — the full Chat component arrives in Phase 2.
function AgentBody() {
  return (
    <VStack gap={2}>
      <div {...stylex.props(styles.bubbleUser)}>
        <Text type="body" size="sm">
          add a blink frame after frame 2
        </Text>
      </div>
      <div {...stylex.props(styles.bubbleAgent)}>
        <Text type="body" size="sm">
          <span {...stylex.props(styles.agentName)}>
            <IconCheck />
          </span>{' '}
          Inserted frame 3
          (blink variant of frame 2).
        </Text>
        <div {...stylex.props(styles.opLog)}>2 ops · undo available</div>
      </div>
      <TextInput
        label="Ask the agent"
        isLabelHidden
        value=""
        placeholder="Agent arrives in Phase 2…"
        isDisabled
      />
      <Text type="supporting" color="disabled">
        Sample exchange — the live co-pilot lands in Phase 2.
      </Text>
    </VStack>
  );
}

function AgentPanel({
  open,
  onToggle,
  isMobile,
}: {
  open: boolean;
  onToggle: () => void;
  isMobile: boolean;
}) {
  // Inside the mobile bottom sheet the card is always expanded — the sheet
  // itself is the thing that opens and closes.
  if (isMobile) {
    return (
      <Card padding={3}>
        <VStack gap={2}>
          <Heading level={4}>
            <IconSparkles {...stylex.props(styles.agentName)} /> Agent
          </Heading>
          <AgentBody />
        </VStack>
      </Card>
    );
  }
  return (
    <Card padding={3}>
      <Collapsible
        trigger={
          <Heading level={4}>
            <IconSparkles {...stylex.props(styles.agentName)} /> Agent
          </Heading>
        }
        isOpen={open}
        onOpenChange={onToggle}
        chevronPosition="end"
      >
        <AgentBody />
      </Collapsible>
    </Card>
  );
}

function GlyphColorPanel({
  brush,
  onChange,
}: {
  brush: Brush;
  onChange: (patch: Partial<Brush>) => void;
}) {
  const transparentBg = brush.bg === '';
  return (
    <Card padding={3}>
      <VStack gap={2}>
        <Heading level={4}>Glyph & Color</Heading>
        <div {...stylex.props(styles.glyphGrid)}>
          {GLYPHS.map((g) => (
            <button
              key={g}
              {...stylex.props(styles.glyph, brush.glyph === g && styles.glyphActive)}
              onClick={() => onChange({ glyph: g })}
              title={`Glyph ${g}`}
              aria-pressed={brush.glyph === g}
            >
              {g}
            </button>
          ))}
        </div>
        <VStack gap={1}>
          <Text type="label" color="disabled">
            FG
          </Text>
          <div {...stylex.props(styles.swatchRow)}>
            {FG.map((c) => (
              <button
                key={c}
                {...stylex.props(styles.swatch, brush.fg === c && styles.swatchActive)}
                style={{ backgroundColor: c }}
                onClick={() => onChange({ fg: c })}
                title={`Foreground ${c}`}
                aria-label={`Foreground ${c}`}
                aria-pressed={brush.fg === c}
              />
            ))}
          </div>
        </VStack>
        <VStack gap={1}>
          <Text type="label" color="disabled">
            BG
          </Text>
          <div {...stylex.props(styles.swatchRow)}>
            {BG.map((c) => (
              <button
                key={c}
                {...stylex.props(styles.swatch, brush.bg === c && styles.swatchActive)}
                style={{ backgroundColor: c, opacity: transparentBg ? 0.35 : 1 }}
                onClick={() => onChange({ bg: c })}
                title={`Background ${c}`}
                aria-label={`Background ${c}`}
                aria-pressed={brush.bg === c && !transparentBg}
              />
            ))}
          </div>
          <Switch
            label="Transparent background"
            value={transparentBg}
            onChange={(v) => onChange({ bg: v ? '' : BG[0] })}
            size="sm"
          />
        </VStack>
      </VStack>
    </Card>
  );
}

const TREE = '  *\n ***\n*****\n  |';
const GHOST = ' .--.\n|o o|\n|___|';

function StampsPanel({ mode }: { mode: 'light' | 'dark' }) {
  const stamps: Array<{
    name: string;
    thumb: boolean;
    art?: string;
    tag: string;
    animated: boolean;
  }> = [
    { name: 'invader', thumb: true, tag: 'static · soon', animated: false },
    { name: 'star', thumb: false, art: '✦', tag: 'static · soon', animated: false },
    { name: 'ghost', thumb: false, art: GHOST, tag: 'animated · soon', animated: true },
    { name: 'tree', thumb: false, art: TREE, tag: 'static · soon', animated: false },
  ];
  return (
    <Card padding={3}>
      <VStack gap={2}>
        <Heading level={4}>Stamps</Heading>
        <div {...stylex.props(styles.stampGrid)}>
          {stamps.map((s) => (
            <button
              key={s.name}
              {...stylex.props(styles.stamp)}
              title={`Stamp: ${s.name} (soon)`}
            >
              {s.thumb ? (
                <pre {...stylex.props(styles.stampArt)} aria-hidden="true">
                  {ET_SPRITES[0].frames[0].join('\n')}
                </pre>
              ) : (
                <pre {...stylex.props(styles.stampArt)}>{s.art}</pre>
              )}
              <Text type="label">{s.name}</Text>
              <span>
                <Badge
                  variant={s.animated ? 'warning' : 'neutral'}
                  label={s.tag}
                />
              </span>
            </button>
          ))}
        </div>
      </VStack>
    </Card>
  );
}

export default function Inspector({
  isMobile,
  agentOpen,
  onToggleAgent,
  sheetOpen,
  onSheetOpenChange,
  drawerOpen,
  onDrawerOpenChange,
  doc,
  dispatch,
  brush,
  onBrushChange,
  mode,
}: {
  isMobile: boolean;
  agentOpen: boolean;
  onToggleAgent: () => void;
  sheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  doc: DocState;
  dispatch: (a: Action) => void;
  brush: Brush;
  onBrushChange: (patch: Partial<Brush>) => void;
  mode: 'light' | 'dark';
}) {
  // Mobile splits the inspector by pattern: the control cards (document,
  // glyph & color, stamps) live in an Astryx MobileNav side drawer so the
  // canvas stays visible while tweaking, and the agent chat keeps the bottom
  // sheet.
  if (isMobile) {
    return (
      <>
        <MobileNav
          isOpen={drawerOpen}
          onOpenChange={onDrawerOpenChange}
          side="end"
          header="Panels"
        >
          <div {...stylex.props(styles.drawerContent)}>
            <DocumentPanel doc={doc} dispatch={dispatch} mode={mode} />
            <GlyphColorPanel brush={brush} onChange={onBrushChange} />
            <StampsPanel mode={mode} />
          </div>
        </MobileNav>
        <BottomSheet
          isOpen={sheetOpen}
          onOpenChange={onSheetOpenChange}
          label="Agent"
          height="72dvh"
          snapPoints={[0.45]}
        >
          <div {...stylex.props(styles.sheetContent)}>
            <AgentPanel open={agentOpen} onToggle={onToggleAgent} isMobile={isMobile} />
          </div>
        </BottomSheet>
      </>
    );
  }
  return (
    <div {...stylex.props(styles.col)}>
      <AgentPanel open={agentOpen} onToggle={onToggleAgent} isMobile={isMobile} />
      <DocumentPanel doc={doc} dispatch={dispatch} mode={mode} />
      <GlyphColorPanel brush={brush} onChange={onBrushChange} />
      <StampsPanel mode={mode} />
    </div>
  );
}
