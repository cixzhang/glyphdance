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
import { AsciiThumb } from './Canvas.tsx';

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
    // Mobile: the whole inspector becomes a bottom sheet, parked off-screen
    // until opened.
    '@media (max-width: 760px)': {
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      top: 'auto',
      height: 'auto',
      maxHeight: '74dvh',
      zIndex: 60,
      padding: '6px 14px calc(14px + env(safe-area-inset-bottom))',
      borderLeft: 'none',
      borderTop: '1px solid var(--gd-border)',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      boxShadow: '0 -16px 48px rgba(0,0,0,0.55)',
      transform: 'translateY(calc(100% + 16px))',
      transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
      overscrollBehavior: 'contain',
    },
  },
  colOpen: {
    '@media (max-width: 760px)': { transform: 'translateY(0)' },
  },
  // Dimmed backdrop behind the sheet; tapping it closes the sheet.
  scrim: {
    display: 'none',
    '@media (max-width: 760px)': {
      display: 'block',
      position: 'fixed',
      inset: 0,
      zIndex: 55,
      backgroundColor: 'rgba(0,0,0,0.5)',
      opacity: 0,
      pointerEvents: 'none',
      transition: 'opacity 0.25s ease',
    },
  },
  scrimOpen: {
    '@media (max-width: 760px)': { opacity: 1, pointerEvents: 'auto' },
  },
  // Sheet chrome: grabber + close button. Desktop never sees it.
  sheetBar: {
    display: 'none',
    '@media (max-width: 760px)': {
      display: 'flex',
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px 0 8px',
      flexShrink: 0,
    },
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'var(--gd-border)',
  },
  closeBtn: {
    appearance: 'none',
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 30,
    height: 30,
    borderRadius: '50%',
    border: '1px solid var(--gd-border)',
    backgroundColor: 'var(--gd-bg2)',
    color: 'var(--gd-dim)',
    fontSize: 15,
    lineHeight: 1,
    cursor: 'pointer',
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
    backgroundColor: '#2b3a4a',
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

const GLYPHS = ['█', '▓', '▒', '░', '·', '●', '◆', '★', '✧', '+', '×', '/', '\\', '|', '(', ')', '[', ']', 'o', 'O', '#', '@', '<', '>'];
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
          <span {...stylex.props(styles.agentName)}>✓</span> Inserted frame 3
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
            <span {...stylex.props(styles.agentName)}>✦</span> Agent
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
            <span {...stylex.props(styles.agentName)}>✦</span> Agent
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

function GlyphColorPanel() {
  const [glyph, setGlyph] = useState('█');
  const [fg, setFg] = useState(FG[0]);
  const [bg, setBg] = useState(BG[0]);
  const [transparentBg, setTransparentBg] = useState(false);
  return (
    <Card padding={3}>
      <VStack gap={2}>
        <Heading level={4}>Glyph & Color</Heading>
        <div {...stylex.props(styles.glyphGrid)}>
          {GLYPHS.map((g) => (
            <button
              key={g}
              {...stylex.props(styles.glyph, glyph === g && styles.glyphActive)}
              onClick={() => setGlyph(g)}
              title={`Glyph ${g}`}
              aria-pressed={glyph === g}
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
                {...stylex.props(styles.swatch, fg === c && styles.swatchActive)}
                style={{ backgroundColor: c }}
                onClick={() => setFg(c)}
                title={`Foreground ${c}`}
                aria-label={`Foreground ${c}`}
                aria-pressed={fg === c}
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
                {...stylex.props(styles.swatch, bg === c && styles.swatchActive)}
                style={{ backgroundColor: c, opacity: transparentBg ? 0.35 : 1 }}
                onClick={() => {
                  setBg(c);
                  setTransparentBg(false);
                }}
                title={`Background ${c}`}
                aria-label={`Background ${c}`}
                aria-pressed={bg === c && !transparentBg}
              />
            ))}
          </div>
          <Switch
            label="Transparent background"
            value={transparentBg}
            onChange={setTransparentBg}
            size="sm"
          />
        </VStack>
      </VStack>
    </Card>
  );
}

const TREE = '  *\n ***\n*****\n  |';
const GHOST = ' .--.\n|o o|\n|___|';

function StampsPanel() {
  const stamps: Array<{
    name: string;
    thumb: boolean;
    art?: string;
    tag: string;
    animated: boolean;
  }> = [
    { name: 'invader', thumb: true, tag: 'static · soon', animated: false },
    { name: 'star', thumb: false, art: '★', tag: 'static · soon', animated: false },
    { name: 'ghost', thumb: false, art: GHOST, tag: '▶ animated · soon', animated: true },
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
                <AsciiThumb frameIndex={0} />
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
  onCloseSheet,
}: {
  isMobile: boolean;
  agentOpen: boolean;
  onToggleAgent: () => void;
  sheetOpen: boolean;
  onCloseSheet: () => void;
}) {
  return (
    <>
      {isMobile && (
        <div
          {...stylex.props(styles.scrim, sheetOpen && styles.scrimOpen)}
          onClick={onCloseSheet}
          aria-hidden="true"
        />
      )}
      <div
        {...stylex.props(styles.col, sheetOpen && styles.colOpen)}
        role={isMobile ? 'dialog' : undefined}
        aria-label={isMobile ? 'Panels' : undefined}
        aria-hidden={isMobile && !sheetOpen}
        inert={isMobile && !sheetOpen}
      >
        {isMobile && (
          <div {...stylex.props(styles.sheetBar)}>
            <div {...stylex.props(styles.grabber)} aria-hidden="true" />
            <button
              {...stylex.props(styles.closeBtn)}
              onClick={onCloseSheet}
              aria-label="Close panels"
            >
              ×
            </button>
          </div>
        )}
        <AgentPanel open={agentOpen} onToggle={onToggleAgent} isMobile={isMobile} />
        <GlyphColorPanel />
        <StampsPanel />
      </div>
    </>
  );
}
