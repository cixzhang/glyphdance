import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Card } from '@astryxdesign/core/Card';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Switch } from '@astryxdesign/core/Switch';
import { VStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Token } from '@astryxdesign/core/Token';
import { BottomSheet } from '@astryxdesign/core/BottomSheet';
import { MobileNav } from '@astryxdesign/core/MobileNav';
import { IconCheck, IconClose, IconSparkles } from './icons';
import DocumentPanel from './DocumentPanel.tsx';
import {
  ET_SPRITES,
  PLAYER_SPRITES,
  CRITTER_SPRITES,
  SPACE_SPRITES,
  NATURE_SPRITES,
  PLAY_SPRITES,
  themeById,
} from './scene.ts';
import { kindSwatchKey } from './stamps.ts';
import { downloadFramesGif } from './gif.ts';
import {
  downloadAllFramesText,
  downloadFramePng,
  downloadFrameText,
} from './export.ts';
import {
  buildSystemPrompt,
  callOpenRouter,
  parseModelReply,
  runAgentActions,
  type ChatMessage,
  type OpTarget,
} from './agent.ts';
import {
  DEFAULT_MODEL,
  loadAgentSettings,
  saveAgentSettings,
  type AgentSettings,
} from './agent-settings.ts';
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
    backgroundColor: 'var(--color-background-surface)',
    borderLeft: '1px solid var(--color-border)',
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
    fontFamily: 'var(--font-family-code)',
    fontSize: 10,
    color: 'var(--color-text-secondary)',
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
    backgroundColor: 'var(--color-background-muted)',
    border: '1px solid var(--color-border)',
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
    backgroundColor: 'var(--color-background-surface)',
    color: 'var(--color-text-secondary)',
    borderRadius: 6,
    fontFamily: 'var(--font-family-code)',
    fontSize: 14,
    height: 30,
    cursor: 'pointer',
    ':hover': { borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' },
  },
  glyphActive: { borderColor: 'var(--gd-invader)', color: 'var(--gd-invader)' },
  swatchRow: { display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' },
  swatch: {
    appearance: 'none',
    width: 22,
    height: 22,
    borderRadius: 6,
    border: '1px solid var(--color-border)',
    cursor: 'pointer',
    padding: 0,
  },
  swatchActive: { outline: '2px solid var(--color-text-primary)', outlineOffset: 1 },
  stampGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    // Mobile: 4-up so a whole category fits in a row or two.
    '@media (max-width: 760px)': {
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 6,
    },
  },
  stamp: {
    appearance: 'none',
    backgroundColor: 'var(--color-background-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: 8,
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    ':hover': { borderColor: 'var(--color-text-disabled)' },
    '@media (max-width: 760px)': {
      padding: 6,
      gap: 0,
      borderRadius: 6,
      alignItems: 'center',
    },
  },
  stampActive: {
    borderColor: 'var(--gd-accent)',
    boxShadow: '0 0 0 1px var(--gd-accent)',
  },
  stampArt: {
    fontFamily: 'var(--font-family-code)',
    fontSize: 11,
    lineHeight: 1.25,
    // Color comes from the section (theme actor color) or the custom stamp's
    // own fg, set inline — never a hardcoded token here.
    margin: 0,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'pre',
    '@media (max-width: 760px)': {
      fontSize: 8,
      lineHeight: 1.2,
      minHeight: 40,
    },
  },
  // Stamp id labels hide on mobile (4-up grid); the button keeps an
  // aria-label so the name is still announced.
  stampName: {
    '@media (max-width: 760px)': { display: 'none' },
  },
  // Delete control on a custom stamp card: positioned overlay.
  customDel: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
});

const GLYPHS = ['█', '▓', '▒', '░', '·', '●', '◆', '✦', '◉', '+', '×', '/', '\\', '|', '(', ')', '[', ']', 'o', 'O', '#', '@', '<', '>'];
const FG = ['#4ade80', '#7cc7ff', '#ffd75e', '#ff8a8a', '#b48ce8', '#ff9f5a', '#d7dce2', '#8b94a0'];
const BG = ['#0d0f12', '#1d2126', '#2b3a4a', '#3a2b4a', '#4a2b2b', '#2b4a2f', '#4a3d1e', '#101215'];

// The live co-pilot: chat with a model on OpenRouter (user's own BYO key)
// and watch it edit the document through the same typed, validated,
// undoable action layer the human tools use.
function AgentBody({
  doc,
  dispatch,
  mode,
  panelOpen,
  onDone,
  scrollToId,
  onScrolled,
  onSelectStamp,
}: {
  doc: DocState;
  dispatch: (a: Action) => void;
  mode: 'light' | 'dark';
  /** Whether the chat is currently visible (sheet on mobile, card on desktop). */
  panelOpen: boolean;
  /** Fired when an assistant turn finishes while the chat is not visible. */
  onDone: (info: { id: string; summary: string; error?: boolean }) => void;
  /** Message id to scroll to (from the done toast), or null. */
  scrollToId: string | null;
  onScrolled: () => void;
  /** A stamp token was tapped: arm the stamp tool and show the Stamps panel. */
  onSelectStamp: (id: string) => void;
}) {
  const [settings, setSettings] = useState<AgentSettings>(() => loadAgentSettings());
  const [keyDraft, setKeyDraft] = useState(settings.apiKey);
  const [modelDraft, setModelDraft] = useState(settings.model);
  const [settingsOpen, setSettingsOpen] = useState(settings.apiKey === '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [working, setWorking] = useState(false);
  const docRef = useRef(doc);
  docRef.current = doc;
  const panelOpenRef = useRef(panelOpen);
  panelOpenRef.current = panelOpen;
  const msgRefs = useRef(new Map<string, HTMLDivElement>());
  const msgId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Deep link: the done toast hands us a message id to scroll to.
  useEffect(() => {
    if (!scrollToId) return;
    // Let the sheet/card finish opening before scrolling.
    const timer = window.setTimeout(() => {
      const el = msgRefs.current.get(scrollToId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        onScrolled();
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [scrollToId, onScrolled]);

  const saveSettings = () => {
    const next: AgentSettings = {
      apiKey: keyDraft.trim(),
      model: modelDraft.trim() || DEFAULT_MODEL,
    };
    setSettings(next);
    saveAgentSettings(next);
    setSettingsOpen(false);
  };

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || working) return;
    if (!settings.apiKey) {
      setSettingsOpen(true);
      return;
    }
    setInput('');
    setWorking(true);
    const userMsg: ChatMessage = { id: msgId(), role: 'user', text: prompt };
    const history = [...messages, userMsg];
    setMessages(history);
    try {
      const raw = await callOpenRouter(
        settings,
        buildSystemPrompt(docRef.current, mode),
        messages,
        prompt,
      );
      const reply = parseModelReply(raw);
      if (!reply) {
        // Not the JSON envelope — show the raw text as a plain answer.
        const rawMsg: ChatMessage = { id: msgId(), role: 'assistant', text: raw };
        setMessages([...history, rawMsg]);
        if (!panelOpenRef.current) onDone({ id: rawMsg.id, summary: raw.slice(0, 120) });
        return;
      }
      const assistantMsg: ChatMessage = {
        id: msgId(),
        role: 'assistant',
        text: reply.message,
        ops: [],
      };
      setMessages([...history, assistantMsg]);
      // Dispatch one action at a time so each edit lands visibly on the
      // canvas and stays individually undoable.
      await runAgentActions(
        reply.actions,
        () => docRef.current,
        dispatch,
        (op) => {
          setMessages((ms) =>
            ms.map((m) =>
              m === assistantMsg
                ? { ...m, ops: [...(m.ops ?? []), op] }
                : m,
            ),
          );
        },
      );
      // Notify when done, especially if the chat isn't open — the toast
      // deep-links back to this message.
      if (!panelOpenRef.current)
        onDone({ id: assistantMsg.id, summary: reply.message });
    } catch (e) {
      const errMsg: ChatMessage = {
        id: msgId(),
        role: 'assistant',
        text: `Something went wrong: ${(e as Error).message}`,
        error: true,
      };
      setMessages([...history, errMsg]);
      if (!panelOpenRef.current)
        onDone({ id: errMsg.id, summary: 'The agent hit an error.', error: true });
    } finally {
      setWorking(false);
    }
  };

  const onToken = (target: OpTarget) => {
    if (target.kind === 'stamp') onSelectStamp(target.id);
    else dispatch({ type: 'setActive', index: target.index });
  };

  return (
    <VStack gap={2}>
      <Collapsible
        trigger={<Text type="label">Agent settings</Text>}
        isOpen={settingsOpen}
        onOpenChange={setSettingsOpen}
        chevronPosition="end"
      >
        <VStack gap={2}>
          <TextInput
            label="OpenRouter API key"
            type="password"
            value={keyDraft}
            onChange={setKeyDraft}
            placeholder="sk-or-…"
          />
          <TextInput
            label="Model"
            value={modelDraft}
            onChange={setModelDraft}
            placeholder={DEFAULT_MODEL}
          />
          <Button
            label="Save agent settings"
            variant="secondary"
            size="sm"
            onClick={saveSettings}
          >
            Save settings
          </Button>
          <Text type="supporting" color="disabled">
            Bring your own OpenRouter key — it's stored only in this browser's
            localStorage and sent only to api.openrouter.ai. Try a{' '}
            <Text type="supporting">:free</Text> model to keep costs at zero.
          </Text>
        </VStack>
      </Collapsible>
      {messages.map((m) => (
        <div
          key={m.id}
          ref={(el) => {
            if (el) msgRefs.current.set(m.id, el);
            else msgRefs.current.delete(m.id);
          }}
          {...stylex.props(
            m.role === 'user' ? styles.bubbleUser : styles.bubbleAgent,
          )}
        >
          <Text type="body" size="sm">
            {m.role === 'assistant' && !m.error && (
              <>
                <span {...stylex.props(styles.agentName)}>
                  <IconCheck />
                </span>{' '}
              </>
            )}
            {m.text}
          </Text>
          {m.ops && m.ops.length > 0 && (
            <div {...stylex.props(styles.opLog)}>
              {m.ops.map((op, j) => (
                <div key={j}>
                  ·
                  {op.segments.map((seg, k) =>
                    seg.kind === 'text' ? (
                      <span key={k}>{seg.text}</span>
                    ) : (
                      <Token
                        key={k}
                        label={seg.label}
                        size="sm"
                        color={seg.target.kind === 'stamp' ? 'purple' : 'blue'}
                        onClick={() => onToken(seg.target)}
                        description={
                          seg.target.kind === 'stamp'
                            ? `Show stamp ${seg.label}`
                            : `Go to ${seg.label}`
                        }
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {working && (
        <Text type="supporting" color="disabled">
          The agent is working…
        </Text>
      )}
      <TextInput
        label="Ask the agent"
        isLabelHidden
        value={input}
        onChange={setInput}
        placeholder={
          settings.apiKey ? 'Describe the edit…' : 'Add your API key first…'
        }
        isDisabled={working}
        onKeyDown={(e) => {
          if (e.key === 'Enter') send();
        }}
      />
      <Button
        label="Send to agent"
        variant="primary"
        size="sm"
        onClick={send}
        isDisabled={working || input.trim() === ''}
      >
        Send
      </Button>
    </VStack>
  );
}

function AgentPanel({
  open,
  onToggle,
  isMobile,
  doc,
  dispatch,
  mode,
  panelOpen,
  onDone,
  scrollToId,
  onScrolled,
  onSelectStamp,
}: {
  open: boolean;
  onToggle: () => void;
  isMobile: boolean;
  doc: DocState;
  dispatch: (a: Action) => void;
  mode: 'light' | 'dark';
  panelOpen: boolean;
  onDone: (info: { id: string; summary: string; error?: boolean }) => void;
  scrollToId: string | null;
  onScrolled: () => void;
  onSelectStamp: (id: string) => void;
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
          <AgentBody
              doc={doc}
              dispatch={dispatch}
              mode={mode}
              panelOpen={panelOpen}
              onDone={onDone}
              scrollToId={scrollToId}
              onScrolled={onScrolled}
              onSelectStamp={onSelectStamp}
            />
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
        <AgentBody
              doc={doc}
              dispatch={dispatch}
              mode={mode}
              panelOpen={panelOpen}
              onDone={onDone}
              scrollToId={scrollToId}
              onScrolled={onScrolled}
              onSelectStamp={onSelectStamp}
            />
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

function ExportPanel({ doc }: { doc: DocState }) {
  const frame = doc.frames[doc.active];
  return (
    <Card padding={3}>
      <VStack gap={2}>
        <Heading level={4}>Export</Heading>
        <VStack gap={1}>
          <Button
            label="Download current frame as text"
            variant="secondary"
            size="sm"
            onClick={() => downloadFrameText(doc.name, doc.active, frame)}
          >
            TXT · this frame
          </Button>
          <Button
            label="Download all frames as text"
            variant="secondary"
            size="sm"
            onClick={() => downloadAllFramesText(doc.name, doc.frames)}
          >
            TXT · all frames
          </Button>
          <Button
            label="Download current frame as PNG"
            variant="secondary"
            size="sm"
            onClick={() => downloadFramePng(doc.name, doc.active, frame)}
          >
            PNG · this frame
          </Button>
          <Button
            label="Download the animation as GIF"
            variant="secondary"
            size="sm"
            onClick={() => downloadFramesGif(doc.name, doc.frames)}
          >
            GIF · all frames
          </Button>
        </VStack>
        <Text type="supporting" color="disabled">
          PNG renders at 2× for crispness. GIF loops forever at each frame's
          hold time.
        </Text>
      </VStack>
    </Card>
  );
}

function StampsPanel({
  brush,
  onBrushChange,
  doc,
  dispatch,
  mode,
}: {
  brush: Brush;
  onBrushChange: (patch: Partial<Brush>) => void;
  doc: DocState;
  dispatch: (a: Action) => void;
  mode: 'light' | 'dark';
}) {
  // Previews use the canvas theme's actor colors so what you see is what
  // placing the stamp paints: invaders in the theme's invader color, ships
  // in the player color. (Custom stamps below keep their own fg.)
  const swatch = themeById(doc.themeId)[mode];
  const sections = [
    { title: 'Invaders', sprites: ET_SPRITES, color: swatch[kindSwatchKey('invader')] },
    { title: 'Ships', sprites: PLAYER_SPRITES, color: swatch[kindSwatchKey('player')] },
    { title: 'Critters', sprites: CRITTER_SPRITES, color: swatch[kindSwatchKey('critter')] },
    { title: 'Space', sprites: SPACE_SPRITES, color: swatch[kindSwatchKey('space')] },
    { title: 'Nature', sprites: NATURE_SPRITES, color: swatch[kindSwatchKey('nature')] },
    { title: 'Play', sprites: PLAY_SPRITES, color: swatch[kindSwatchKey('play')] },
  ];
  return (
    <Card padding={3}>
      <VStack gap={2}>
        <Heading level={4}>Stamps</Heading>
        <Text type="supporting" color="disabled">
          Tap the canvas to place — animated stamps play across frames.
        </Text>
        {sections.map((sec) => (
          <VStack key={sec.title} gap={1} role="group" aria-label={`${sec.title} stamps`}>
            <Text type="label" color="disabled">
              {sec.title}
            </Text>
            <div {...stylex.props(styles.stampGrid)}>
              {sec.sprites.map((s) => {
                const selected = brush.tool === 'stamp' && brush.stampId === s.id;
                return (
                  <button
                    key={s.id}
                    {...stylex.props(styles.stamp, selected && styles.stampActive)}
                    onClick={() => onBrushChange({ tool: 'stamp', stampId: s.id })}
                    title={`Stamp: ${s.id} — tap the canvas to place`}
                    aria-label={`Stamp: ${s.id}`}
                    aria-pressed={selected}
                  >
                    <pre
                      {...stylex.props(styles.stampArt)}
                      aria-hidden="true"
                      style={{ color: sec.color }}
                    >
                      {s.frames[0].join('\n')}
                    </pre>
                    <span {...stylex.props(styles.stampName)}>
                      <Text type="label">{s.id}</Text>
                    </span>
                  </button>
                );
              })}
            </div>
          </VStack>
        ))}
        <VStack gap={1}>
          <Text type="label" color="disabled">
            Yours{doc.stamps.length > 0 ? ` (${doc.stamps.length})` : ''}
          </Text>
          {doc.stamps.length === 0 ? (
            <Text type="supporting" color="disabled">
              Ask the agent to create a stamp — e.g. "make me a cat stamp".
            </Text>
          ) : (
            <div {...stylex.props(styles.stampGrid)}>
              {doc.stamps.map((s) => {
                const selected =
                  brush.tool === 'stamp' && brush.stampId === s.id;
                return (
                  <div
                    key={s.id}
                    {...stylex.props(styles.stamp, selected && styles.stampActive)}
                    style={{ position: 'relative' }}
                  >
                    <button
                      onClick={() =>
                        onBrushChange({ tool: 'stamp', stampId: s.id })
                      }
                      title={`Stamp: ${s.id} — tap the canvas to place`}
                      aria-label={`Stamp: ${s.id}`}
                      aria-pressed={selected}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        display: 'block',
                        width: '100%',
                      }}
                    >
                      <pre
                        {...stylex.props(styles.stampArt)}
                        aria-hidden="true"
                        style={{ color: s.fg }}
                      >
                        {s.frames[0].join('\n')}
                      </pre>
                      <span {...stylex.props(styles.stampName)}>
                        <Text type="label">{s.id}</Text>
                      </span>
                    </button>
                    <IconButton
                      label={`Delete stamp ${s.id}`}
                      icon={<IconClose />}
                      variant="ghost"
                      size="sm"
                      xstyle={styles.customDel}
                      onClick={() => dispatch({ type: 'deleteStamp', id: s.id })}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </VStack>
        <Text type="supporting" color="disabled">
          Pick a stamp, then tap the canvas to place it. Drag to stamp repeatedly.
        </Text>
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
  onAgentDone,
  scrollToMessage,
  onAgentScrolled,
  onSelectStamp,
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
  onAgentDone: (info: { id: string; summary: string; error?: boolean }) => void;
  scrollToMessage: string | null;
  onAgentScrolled: () => void;
  onSelectStamp: (id: string) => void;
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
            <StampsPanel brush={brush} onBrushChange={onBrushChange} doc={doc} dispatch={dispatch} mode={mode} />
            <ExportPanel doc={doc} />
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
            <AgentPanel
              open={agentOpen}
              onToggle={onToggleAgent}
              isMobile={isMobile}
              doc={doc}
              dispatch={dispatch}
              mode={mode}
              panelOpen={isMobile ? sheetOpen : agentOpen}
              onDone={onAgentDone}
              scrollToId={scrollToMessage}
              onScrolled={onAgentScrolled}
              onSelectStamp={onSelectStamp}
            />
          </div>
        </BottomSheet>
      </>
    );
  }
  return (
    <div {...stylex.props(styles.col)}>
      <AgentPanel
              open={agentOpen}
              onToggle={onToggleAgent}
              isMobile={isMobile}
              doc={doc}
              dispatch={dispatch}
              mode={mode}
              panelOpen={isMobile ? sheetOpen : agentOpen}
              onDone={onAgentDone}
              scrollToId={scrollToMessage}
              onScrolled={onAgentScrolled}
              onSelectStamp={onSelectStamp}
            />
      <DocumentPanel doc={doc} dispatch={dispatch} mode={mode} />
      <GlyphColorPanel brush={brush} onChange={onBrushChange} />
      <StampsPanel brush={brush} onBrushChange={onBrushChange} doc={doc} dispatch={dispatch} mode={mode} />
      <ExportPanel doc={doc} />
    </div>
  );
}
