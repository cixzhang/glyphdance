// agent.ts — the glyphdance co-pilot's OpenRouter client.
//
// The browser calls OpenRouter directly with the user's own BYO key (see
// agent-settings.ts). The model replies with a single JSON object containing
// a human-readable message plus a list of document actions; every action is
// re-validated by the typed action layer before it is dispatched, so the
// agent can only do what the action layer allows — the same actions a human
// can take, through the same undoable path.

import {
  GRID_H,
  GRID_W,
  cellIndex,
  type DocState,
} from './document.ts';
import { validate, type Action } from './actions.ts';
import type { AgentSettings } from './agent-settings.ts';
import {
  PIXEL_ART_SKILL,
  STAMP_CATALOG,
  STAMP_SKILL,
} from './agent-skills.ts';
import { themeById } from './scene.ts';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Human-readable op lines, e.g. "painted 38 cells on frame 1". */
  ops?: OpLine[];
  error?: boolean;
}

/** A tappable token inside an op line — "goes to the thing it affected". */
export type OpTarget =
  | { kind: 'stamp'; id: string }
  | { kind: 'frame'; index: number };

export type OpSegment =
  | { kind: 'text'; text: string }
  | { kind: 'token'; label: string; target: OpTarget };

/** One operation-log line: renderable segments, tokens tappable. */
export interface OpLine {
  segments: OpSegment[];
}

const t = (text: string): OpSegment => ({ kind: 'text', text });
const stampTok = (id: string): OpSegment => ({
  kind: 'token',
  label: id,
  target: { kind: 'stamp', id },
});
const frameTok = (index: number): OpSegment => ({
  kind: 'token',
  label: `frame ${index + 1}`,
  target: { kind: 'frame', index },
});

/** Plain-text rendering of an op line (logs, notifications). */
export function opText(op: OpLine): string {
  return op.segments
    .map((s) => (s.kind === 'text' ? s.text : s.label))
    .join('');
}

interface ModelReply {
  message: string;
  actions: Action[];
}

const THEME_IDS = ['dracula', 'monokai', 'nord', 'solarized', 'tokyo', 'onedark'];

function frameAsText(doc: DocState, index: number): string {
  const frame = doc.frames[index];
  const rows: string[] = [];
  for (let y = 0; y < GRID_H; y++) {
    let row = '';
    for (let x = 0; x < GRID_W; x++) {
      row += frame.cells[cellIndex(x, y)].ch;
    }
    rows.push(row);
  }
  return rows.join('\n');
}

export function buildSystemPrompt(
  doc: DocState,
  mode: 'light' | 'dark' = 'dark',
): string {
  const theme = themeById(doc.themeId)[mode];
  return `You are the glyphdance co-pilot, an assistant inside an ASCII-art animation studio.
The canvas is a ${GRID_W}-wide x ${GRID_H}-tall grid of cells. Each cell holds one character, a foreground color (fg), and a background color (bg; "" means transparent, the theme background shows through).
A document has frames; each frame has cells and a holdMs (how long the frame shows). doc.active is the selected frame index.

You edit ONLY by emitting actions as JSON. Reply with exactly one JSON object and nothing else:
{"message": "short human-readable summary", "actions": [ ... ]}

Action types (every field required):
- {"type":"paintCells","frame":0,"cells":[{"x":1,"y":2,"cell":{"ch":"█","fg":"#4ade80","bg":""}}]}
  ch must be exactly one character. x is 0..${GRID_W - 1}, y is 0..${GRID_H - 1}. Batch ALL painted cells for one frame into ONE paintCells action.
- {"type":"addFrame","after":1} — insert a blank frame after the given frame index.
- {"type":"duplicateFrame","index":1}
- {"type":"deleteFrame","index":1}
- {"type":"moveFrame","from":2,"to":0}
- {"type":"setHold","index":0,"holdMs":400}
- {"type":"setTheme","themeId":"dracula"} — one of: ${THEME_IDS.join(', ')}
- {"type":"rename","name":"my-piece"}
- {"type":"setActive","index":2}
- {"type":"addStamp","stamp":{"id":"cat","fg":"#ffd75e","frames":[[" /\\_/\\ ","( o.o )"," > ^ < "]]}} — CREATE a reusable stamp the user keeps in their Stamps panel (id: lowercase/digits/dashes, 1-20 chars; frames: 1-4, each 1-8 rows of 1-12 chars; spaces transparent)
- {"type":"deleteStamp","id":"cat"} — remove a user-created stamp
- {"type":"placeStamp","stampId":"crab","frame":0,"x":12,"y":7,"fg":"${theme.invader}","bg":""} — paint a stamp CENTERED on x,y (stampFrame picks its art frame, default 0). Use this to USE stamps — never hand-draw a stamp's cells.

${STAMP_SKILL}

Built-in stamp catalog (placeable art):
${STAMP_CATALOG}

${PIXEL_ART_SKILL}

Rules:
- Drawing means paintCells on the active frame, or on a frame you just added/duplicated first. Prefer building on the active frame.
- Coordinates are 0-based with y=0 at the TOP row. Never emit out-of-bounds cells.
- Keep every "ch" to one character. For empty/erase use ch " " with any colors.
- If the request is unclear or impossible, emit NO actions and explain briefly in "message".
- Keep "message" to one or two sentences. Only describe what your actions actually did.

Current document:
name: ${doc.name}
frames: ${doc.frames.length}, active frame index: ${doc.active}
theme: ${doc.themeId} (background ${theme.bg}; stamp colors: invaders ${theme.invader}, ships ${theme.player})
user-created stamps: ${doc.stamps.length > 0 ? doc.stamps.map((s) => s.id).join(', ') : '(none yet)'}
Active frame (y=0 is the top row, x=0 is the left column):
\`\`\`
${frameAsText(doc, doc.active)}
\`\`\``;
}

/** Pull the JSON object out of a model reply (tolerates code fences). */
export function parseModelReply(text: string): ModelReply | null {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const o = JSON.parse(cleaned.slice(start, end + 1)) as {
      message?: unknown;
      actions?: unknown;
    };
    if (typeof o.message !== 'string' || !Array.isArray(o.actions)) return null;
    // Keep only well-formed action objects; the action layer re-validates.
    const actions = (o.actions as unknown[]).filter(
      (a): a is Action =>
        typeof a === 'object' &&
        a !== null &&
        typeof (a as { type?: unknown }).type === 'string',
    );
    return { message: o.message, actions };
  } catch {
    return null;
  }
}

export async function callOpenRouter(
  settings: AgentSettings,
  system: string,
  history: ChatMessage[],
  prompt: string,
): Promise<string> {
  const messages = [
    { role: 'system', content: system },
    ...history.flatMap((m) =>
      m.role === 'user' || (m.role === 'assistant' && !m.error)
        ? [{ role: m.role, content: m.text }]
        : [],
    ),
    { role: 'user', content: prompt },
  ];
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://glyphdance.vercel.app',
      'X-Title': 'glyphdance',
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      max_tokens: 4000,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `OpenRouter ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`,
    );
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (data.error?.message) throw new Error(data.error.message);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('empty reply from model');
  return content;
}

/** One-line human summary of an action for the op log. */
export function summarizeAction(a: Action): OpLine {
  switch (a.type) {
    case 'paintCells':
      return {
        segments: [
          t(`painted ${a.cells.length} cell${a.cells.length === 1 ? '' : 's'} on `),
          frameTok(a.frame),
        ],
      };
    case 'addFrame':
      return { segments: [t('added '), frameTok(a.after + 1)] };
    case 'duplicateFrame':
      return {
        segments: [t(`duplicated frame ${a.index + 1} as `), frameTok(a.index + 1)],
      };
    case 'deleteFrame':
      return { segments: [t(`deleted frame ${a.index + 1}`)] };
    case 'moveFrame':
      return {
        segments: [t('moved '), frameTok(a.from), t(' to position '), frameTok(a.to)],
      };
    case 'setHold':
      return {
        segments: [t('set '), frameTok(a.index), t(` hold to ${a.holdMs}ms`)],
      };
    case 'setTheme':
      return { segments: [t(`switched theme to ${a.themeId}`)] };
    case 'rename':
      return { segments: [t(`renamed document to "${a.name}"`)] };
    case 'setActive':
      return { segments: [t('selected '), frameTok(a.index)] };
    case 'addStamp':
      return {
        segments: [
          t('created stamp '),
          stampTok(a.stamp.id),
          t(
            ` (${a.stamp.frames.length} frame${a.stamp.frames.length === 1 ? '' : 's'})`,
          ),
        ],
      };
    case 'deleteStamp':
      return { segments: [t(`deleted stamp "${a.id}"`)] };
    case 'placeStamp':
      return {
        segments: [t('placed stamp '), stampTok(a.stampId), t(' on '), frameTok(a.frame)],
      };
    default:
      return { segments: [t('applied an edit')] };
  }
}

/**
 * Validate + dispatch a batch of model-proposed actions against the live
 * document, one at a time so each lands visibly (and each stays undoable).
 * Returns op-log lines; invalid actions are reported, not applied.
 */
export async function runAgentActions(
  actions: Action[],
  getDoc: () => DocState,
  dispatch: (a: Action) => void,
  onOp: (op: OpLine) => void,
  delayMs = 350,
): Promise<void> {
  for (const a of actions) {
    const err = validate(getDoc(), a);
    if (err) {
      onOp({ segments: [t(`skipped: ${err}`)] });
      continue;
    }
    dispatch(a);
    onOp(summarizeAction(a));
    await new Promise((r) => setTimeout(r, delayMs));
  }
}
