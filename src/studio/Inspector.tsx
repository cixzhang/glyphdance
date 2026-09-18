import { memo, useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Card } from '@astryxdesign/core/Card';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Token } from '@astryxdesign/core/Token';
import { BottomSheet } from '@astryxdesign/core/BottomSheet';
import { MobileNav } from '@astryxdesign/core/MobileNav';
import { IconCheck, IconGithub, IconSparkles } from './icons';
import DocumentPanel from './DocumentPanel.tsx';
import { downloadFramesGif } from './gif.ts';
import { canvasFontById } from './canvasFonts.ts';
import {
  downloadAllFramesText,
  downloadFramePng,
  downloadFrameText,
  downloadStampJson,
} from './export.ts';
import {
  buildRepairPrompt,
  buildSystemPrompt,
  callOpenRouter,
  opText,
  parseModelReply,
  runAgentActions,
  type ChatMessage,
  type OpLine,
  type OpTarget,
} from './agent.ts';
import {
  DEFAULT_MODEL,
  loadAgentSettings,
  saveAgentSettings,
  type AgentSettings,
} from './agent-settings.ts';
import type { DocState } from './document.ts';
import { docContentEqual } from './document.ts';
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
    paddingInline: 16,
    // Clear the drag handle at the top of the sheet.
    paddingTop: 20,
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
  version: {
    fontFamily: 'var(--font-family-code)',
    fontSize: 10,
    color: 'var(--color-text-secondary)',
    textAlign: 'center',
    paddingTop: 8,
  },
  versionLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    color: 'inherit',
    textDecoration: 'none',
    ':hover': { color: 'var(--color-text)', textDecoration: 'underline' },
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
});


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
  onWorkingChange,
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
  /** Fired whenever the agent starts/stops working (drives the top-bar icon). */
  onWorkingChange: (working: boolean) => void;
}) {
  const [settings, setSettings] = useState<AgentSettings>(() => loadAgentSettings());
  const [keyDraft, setKeyDraft] = useState(settings.apiKey);
  const [modelDraft, setModelDraft] = useState(settings.model);
  const [settingsOpen, setSettingsOpen] = useState(settings.apiKey === '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [working, setWorking] = useState(false);
  // Let the top bar animate its agent icon while a turn is in flight.
  const [promptHist, setPromptHist] = useState<string[]>([]);
  const histPos = useRef<number | null>(null);
  useEffect(() => {
    onWorkingChange(working);
  }, [working, onWorkingChange]);
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
    // Terminal-style history: Up/Down in the input cycles sent prompts.
    setPromptHist((h) => [...h, prompt]);
    histPos.current = null;
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
      const appendOp = (id: string, op: OpLine) =>
        setMessages((ms) =>
          ms.map((m) =>
            m.id === id ? { ...m, ops: [...(m.ops ?? []), op] } : m,
          ),
        );
      // Dispatch one action at a time so each edit lands visibly on the
      // canvas and stays individually undoable.
      const runPass = (id: string, actions: Action[]) =>
        runAgentActions(
          actions,
          () => docRef.current,
          dispatch,
          (op) => appendOp(id, op),
        );

      let assistantMsg: ChatMessage = {
        id: msgId(),
        role: 'assistant',
        text: reply.message,
        ops: [],
      };
      setMessages([...history, assistantMsg]);
      let result = await runPass(assistantMsg.id, reply.actions);

      // Repair pass: feed validation failures back to the model with a
      // fresh canvas and let it correct them, once. Best-effort — the
      // first pass's results stand if the repair call fails.
      if (result.skipped.length > 0) {
        try {
          const repairRaw = await callOpenRouter(
            settings,
            buildSystemPrompt(docRef.current, mode),
            [...history, assistantMsg],
            buildRepairPrompt(
              docRef.current,
              mode,
              result.applied,
              result.skipped,
            ),
          );
          const repair = parseModelReply(repairRaw);
          if (repair && repair.actions.length > 0) {
            const repairMsg: ChatMessage = {
              id: msgId(),
              role: 'assistant',
              text: repair.message,
              ops: [],
            };
            setMessages((ms) => [...ms, repairMsg]);
            const r2 = await runPass(repairMsg.id, repair.actions);
            result = {
              applied: [...result.applied, ...r2.applied],
              skipped: [...result.skipped, ...r2.skipped],
            };
            assistantMsg = repairMsg;
          }
        } catch {
          // ignore — first pass results stand
        }
      }

      // Grounded summary: describe what actually applied, not what the
      // model claimed. This is what the done toast shows.
      const summary =
        result.applied.length === 0
          ? result.skipped.length > 0
            ? `No edits applied (${result.skipped[0]})`
            : 'No edits made.'
          : result.applied.map(opText).join('; ') +
            (result.skipped.length > 0
              ? ` (${result.skipped.length} couldn't be applied)`
              : '');
      // Notify when done, especially if the chat isn't open — the toast
      // deep-links back to this message.
      if (!panelOpenRef.current)
        onDone({ id: assistantMsg.id, summary });
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
      {messages.length === 0 && (
        <Text type="supporting" color="secondary">
          Describe the art you want — the agent draws it on your canvas with
          real brush strokes you can undo, across one frame or many. It can
          also create custom stamps to help you build the canvas.
        </Text>
      )}
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
          if (e.key === 'Enter') {
            send();
            return;
          }
          // Cycle sent prompts with Up/Down, terminal-style.
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            if (promptHist.length === 0) return;
            e.preventDefault();
            if (e.key === 'ArrowUp') {
              const next =
                histPos.current === null
                  ? promptHist.length - 1
                  : Math.max(0, histPos.current - 1);
              histPos.current = next;
              setInput(promptHist[next]);
            } else {
              if (histPos.current === null) return;
              const next = histPos.current + 1;
              if (next >= promptHist.length) {
                histPos.current = null;
                setInput('');
              } else {
                histPos.current = next;
                setInput(promptHist[next]);
              }
            }
          }
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
  onWorkingChange,
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
  onWorkingChange: (working: boolean) => void;
}) {
  // Inside the mobile bottom sheet the card is always expanded — the sheet
  // itself is the thing that opens and closes.
  if (isMobile) {
    return (
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
          onWorkingChange={onWorkingChange}
        />
      </VStack>
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
              onWorkingChange={onWorkingChange}
            />
      </Collapsible>
    </Card>
  );
}

function ExportPanel({ doc, getActive }: { doc: DocState; getActive: () => number }) {
  // The selected frame is read live at click time: the inspector skips
  // re-rendering on playback ticks (memo below), so a render-time snapshot
  // of doc.active would export a stale frame.
  const exportFrameText = () => {
    const i = getActive();
    downloadFrameText(doc.name, i, doc.frames[i], doc.width, doc.height);
  };
  const exportFramePng = () => {
    const i = getActive();
    const font = canvasFontById(doc.fontId);
    downloadFramePng(doc.name, i, doc.frames[i], doc.width, doc.height, {
      fontFamily: font.family,
      advanceEm: font.advanceEm,
    });
  };
  return (
    <Card padding={3}>
      <VStack gap={2}>
        <Heading level={4}>Export</Heading>
        <VStack gap={1}>
          <Button
            label="Download current frame as text"
            variant="secondary"
            size="sm"
            onClick={exportFrameText}
          >
            TXT · this frame
          </Button>
          <Button
            label="Download all frames as text"
            variant="secondary"
            size="sm"
            onClick={() => downloadAllFramesText(doc.name, doc.frames, doc.width, doc.height)}
          >
            TXT · all frames
          </Button>
          <Button
            label="Download current frame as PNG"
            variant="secondary"
            size="sm"
            onClick={exportFramePng}
          >
            PNG · this frame
          </Button>
          <Button
            label="Download the animation as GIF"
            variant="secondary"
            size="sm"
            onClick={() => {
              const font = canvasFontById(doc.fontId);
              downloadFramesGif(doc.name, doc.frames, doc.width, doc.height, {
                fontFamily: font.family,
                advanceEm: font.advanceEm,
              });
            }}
          >
            GIF · all frames
          </Button>
          <Button
            label="Download all frames as JSON"
            variant="secondary"
            size="sm"
            onClick={() => downloadStampJson(doc.name, doc.frames, doc.width, doc.height, doc.fontId)}
          >
            JSON · all frames
          </Button>
        </VStack>
        <Text type="supporting" color="disabled">
          PNG renders at 2× for crispness. GIF loops forever at each frame's
          hold time. JSON is a full representation of all frames — send it to
          the agent to turn frames into a stamp.
        </Text>
      </VStack>
    </Card>
  );
}

interface InspectorProps {
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
  onWorkingChange: (working: boolean) => void;
}

function Inspector({
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
  onWorkingChange,
}: InspectorProps) {
  // Live doc for event-time reads: the inspector skips re-rendering on
  // playback ticks (memo at the bottom), so handlers that need the current
  // frame read it from this ref instead of a render-time snapshot.
  const docRef = useRef(doc);
  docRef.current = doc;
  const getActive = () => docRef.current.active;
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
          header="Document"
        >
          <div {...stylex.props(styles.drawerContent)}>
            <DocumentPanel doc={doc} dispatch={dispatch} mode={mode} />
            <ExportPanel doc={doc} getActive={getActive} />
            <div {...stylex.props(styles.version)}>
              <a
                href="https://github.com/cixzhang/glyphdance"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="glyphdance on GitHub"
                title="glyphdance on GitHub"
                {...stylex.props(styles.versionLink)}
              >
                <IconGithub />
                build {typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev'}
              </a>
            </div>
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
              onWorkingChange={onWorkingChange}
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
              onWorkingChange={onWorkingChange}
            />
      <DocumentPanel doc={doc} dispatch={dispatch} mode={mode} />
      <ExportPanel doc={doc} getActive={getActive} />
      <div {...stylex.props(styles.version)}>
        <a
          href="https://github.com/cixzhang/glyphdance"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="glyphdance on GitHub"
          title="glyphdance on GitHub"
          {...stylex.props(styles.versionLink)}
        >
          <IconGithub />
          build {typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev'}
        </a>
      </div>
    </div>
  );
}

// Playback ticks only advance doc.active: none of the inspector's panels
// render the selected frame (ExportPanel reads it live at click time via
// getActive; the agent chat reads docRef at send time), so content equality
// is enough to keep the whole sidebar — including long chat histories —
// from re-rendering on every animation tick.
export function inspectorEqual(prev: InspectorProps, next: InspectorProps): boolean {
  return (
    prev.isMobile === next.isMobile &&
    prev.agentOpen === next.agentOpen &&
    prev.onToggleAgent === next.onToggleAgent &&
    prev.sheetOpen === next.sheetOpen &&
    prev.onSheetOpenChange === next.onSheetOpenChange &&
    prev.drawerOpen === next.drawerOpen &&
    prev.onDrawerOpenChange === next.onDrawerOpenChange &&
    docContentEqual(prev.doc, next.doc) &&
    prev.dispatch === next.dispatch &&
    prev.brush === next.brush &&
    prev.onBrushChange === next.onBrushChange &&
    prev.mode === next.mode &&
    prev.onAgentDone === next.onAgentDone &&
    prev.scrollToMessage === next.scrollToMessage &&
    prev.onAgentScrolled === next.onAgentScrolled &&
    prev.onSelectStamp === next.onSelectStamp &&
    prev.onWorkingChange === next.onWorkingChange
  );
}

export default memo(Inspector, inspectorEqual);
