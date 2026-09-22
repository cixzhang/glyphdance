// agent.ts — the glyphdance co-pilot's OpenRouter client.
//
// The browser calls OpenRouter directly with the user's own BYO key (see
// agent-settings.ts). The model replies with a single JSON object containing
// a human-readable message plus a list of tool calls; every call resolves
// through the shared agent-tools catalog — document actions are re-validated
// by the typed action layer before dispatch, runtime tools (undo/redo,
// transport) hit the same functions the human UI uses — so the agent can
// only do what the catalog allows, through the same paths a human takes.

import {
  cellIndex,
  type DocState,
} from './document.ts';
import { validate, type Action } from './actions.ts';
import {
  agentToolByName,
  renderToolDocs,
  type ToolRuntime,
} from './agent-tools.ts';
import type { AgentSettings } from './agent-settings.ts';
import {
  PIXEL_ART_SKILL,
  STAMP_CATALOG,
  STAMP_SKILL,
  GLYPH_ADVICE,
  COLOR_SKILL,
} from './agent-skills.ts';
import { themeById } from './scene.ts';
import { canvasFontById } from './canvasFonts.ts';

/** Per-font glyph limitation notes for the agent's prompt. */
function fontNote(fontId: string): string {
  switch (fontId) {
    case 'vga':
      return 'cannot draw ● ◆ ★ ✦ ❄ ♥ — stick to ASCII plus █ ▓ ▒ ░ ─ │ ┌ ┐ └ ┘ and arrows';
    case 'jetbrains':
    case 'system':
      return 'cannot draw ★ ☆ ❅ ❆ ✦ — use ❄ for snowflakes; all other palette glyphs fine';
    default:
      return 'widest repertoire — all palette glyphs fine except ★ ☆ ❅ ❆ (use ✦ for ★, ❄ for snowflakes)';
  }
}

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
  toolCalls: ToolCall[];
}

/** One tool invocation from the model: a shared-catalog tool + arguments. */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

const colRuler = (width: number): string =>
  Array.from({ length: width }, (_, x) => String(x % 10)).join('');

/** Compact color legend for a frame: distinct ch/fg pairs actually in use. */
function frameColors(doc: DocState, index: number): string {
  const seen = new Map<string, string>();
  for (const c of doc.frames[index].cells) {
    if (c.ch === ' ') continue;
    const key = `${c.ch}${c.fg}${c.bg}`;
    if (!seen.has(key)) {
      seen.set(
        key,
        `'${c.ch}' fg ${c.fg || '(theme)'}${c.bg ? ` bg ${c.bg}` : ''}`,
      );
    }
    if (seen.size >= 16) break;
  }
  return seen.size > 0 ? [...seen.values()].join(', ') : '(empty)';
}

function frameAsText(doc: DocState, index: number): string {
  const frame = doc.frames[index];
  const rows: string[] = [`    ${colRuler(doc.width)}`];
  for (let y = 0; y < doc.height; y++) {
    let row = '';
    for (let x = 0; x < doc.width; x++) {
      row += frame.cells[cellIndex(x, y, doc.width)].ch;
    }
    rows.push(`${String(y).padStart(2, '0')}  ${row}`);
  }
  return rows.join('\n');
}

/** Full multi-frame canvas description: every frame with ruler + colors. */
export function describeDocument(
  doc: DocState,
  mode: 'light' | 'dark' = 'dark',
): string {
  const theme = themeById(doc.themeId)[mode];
  const font = canvasFontById(doc.fontId);
  const parts = [
    `name: ${doc.name}`,
    `canvas: ${doc.width} wide x ${doc.height} tall cells (x is 0..${doc.width - 1}, y is 0..${doc.height - 1})`,
    `frames: ${doc.frames.length}, active: frame ${doc.active + 1} (in tool calls, use index ${doc.active})`,
    `theme: ${doc.themeId} (background ${theme.bg}; stamp colors: invaders/nature ${theme.invader}, ships/play ${theme.player}, critters/space ${theme.star})`,
    `canvas font: ${font.name} — ${fontNote(doc.fontId)}`,
    `user-created stamps: ${doc.stamps.length > 0 ? doc.stamps.map((s) => s.id).join(', ') : '(none yet)'}`,
    '',
    ...doc.frames.flatMap((f, i) => [
      `Frame ${i + 1} of ${doc.frames.length}${i === doc.active ? ' — ACTIVE' : ''} (hold ${f.holdMs}ms; in tool calls, this frame is index ${i}):`,
      '```',
      frameAsText(doc, i),
      '```',
      `colors: ${frameColors(doc, i)}`,
      '',
    ]),
  ];
  return parts.join('\n');
}

export function buildSystemPrompt(
  doc: DocState,
  mode: 'light' | 'dark' = 'dark',
): string {
  return `You are the glyphdance co-pilot, an assistant inside an ASCII-art animation studio.
The canvas is a ${doc.width}-wide x ${doc.height}-tall grid of cells. Each cell holds one character, a foreground color (fg), and a background color (bg; "" means transparent, the theme background shows through).
A document has frames; each frame has cells and a holdMs (how long the frame shows). doc.active is the selected frame index.

You edit ONLY by calling tools. Reply with exactly one JSON object and nothing else:
{"message": "short human-readable summary", "tool_calls": [{"name": "paint_cells", "arguments": {...}}, ...]}

Tools (arguments are JSON; every "required" field must be present; calls apply in order):
${renderToolDocs()}

${STAMP_SKILL}

${GLYPH_ADVICE}

Built-in stamp catalog (placeable art):
${STAMP_CATALOG}

${PIXEL_ART_SKILL}

${COLOR_SKILL}

Rules:
- Drawing means paint_cells on the active frame, or on a frame you just added/duplicated first. Prefer building on the active frame.
- "Clear the canvas" / "blank slate" means clear_frame on every frame — never delete_frame them all; the last frame cannot be deleted.
- Coordinates are 0-based with y=0 at the TOP row. Every frame dump has a column ruler across the top and row numbers down the left — read x/y positions off the ruler, never eyeball them. Never emit out-of-bounds cells.
- place_stamp centers the stamp on x,y; art past the grid edge is clipped, so keep the full stamp extent in bounds when you want the whole stamp visible.
- Frame numbers for the HUMAN are 1-based: the timeline, status pill, and op log all call the first frame "frame 1". In your "message" text always use 1-based frame numbers — never write "frame 0". In tool arguments ("frame", "index", "after", "from", "to") use 0-based indices: human frame N = index N-1. When the user says "frame one" or "the first frame", they mean index 0.
- Keep every "ch" to one character. For empty/erase use ch " " with any colors.
- If the request is truly impossible (contradicts the grid limits or the tool set), emit NO tool calls and explain briefly in "message". If it's merely vague about placement ("add snowflakes", "decorate the sky"), make a reasonable choice per the stamp skill's finding-the-right-stamp steps and say what you chose — a visible best-effort result beats an empty reply. Stay conservative with destructive requests: only clear/delete what the user named.
- Keep "message" to one or two sentences. Only describe what your tool calls actually did.

Current document (all frames shown; use the rulers to locate things):
${describeDocument(doc, mode)}`;
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
      tool_calls?: unknown;
    };
    if (typeof o.message !== 'string' || !Array.isArray(o.tool_calls))
      return null;
    // Keep only well-formed tool calls; unknown tools and bad arguments
    // are reported (not dropped) by runAgentToolCalls.
    const toolCalls = (o.tool_calls as unknown[]).flatMap(
      (c): ToolCall[] =>
        typeof c === 'object' &&
        c !== null &&
        typeof (c as { name?: unknown }).name === 'string' &&
        typeof (c as { arguments?: unknown }).arguments === 'object' &&
        (c as { arguments?: unknown }).arguments !== null
          ? [
              {
                name: (c as { name: string }).name,
                args: (c as { arguments: Record<string, unknown> }).arguments,
              },
            ]
          : [],
    );
    return { message: o.message, toolCalls };
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
      max_tokens: 8000,
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
    case 'recolorCells':
      return {
        segments: [
          t(`recolored ${a.cells.length} cell${a.cells.length === 1 ? '' : 's'} on `),
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
    case 'clearFrame':
      return { segments: [t('cleared '), frameTok(a.frame)] };
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
    case 'resizeCanvas':
      return { segments: [t(`resized canvas to ${a.width}×${a.height}`)] };
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
 * Resolve + validate + dispatch a batch of model-proposed tool calls against
 * the live document, one at a time so each lands visibly (and each stays
 * undoable). Uses the same shared tool definitions as WebMCP: unknown tools,
 * malformed arguments, and validation failures are all reported as skips.
 * Returns what applied and what was skipped (with reasons) — the caller
 * feeds skips back to the model for a repair pass.
 */
export async function runAgentToolCalls(
  calls: ToolCall[],
  rt: ToolRuntime,
  onOp: (op: OpLine) => void,
  delayMs = 350,
): Promise<{ applied: OpLine[]; skipped: string[] }> {
  const applied: OpLine[] = [];
  const skipped: string[] = [];
  for (const call of calls) {
    const def = agentToolByName(call.name);
    if (!def) {
      const line = `skipped: unknown tool "${call.name}"`;
      skipped.push(line);
      onOp({ segments: [t(line)] });
      continue;
    }
    if (def.run !== undefined) {
      // Runtime tool (undo/redo, transport): runs against live app state.
      const op = { segments: [t(def.run(rt, call.args))] };
      applied.push(op);
      onOp(op);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
    if (def.buildAction === undefined) {
      const line = `skipped: ${call.name} — tool has no executor`;
      skipped.push(line);
      onOp({ segments: [t(line)] });
      continue;
    }
    let action: Action;
    try {
      action = def.buildAction(call.args);
    } catch (e) {
      const line = `skipped: ${call.name} — invalid arguments (${e instanceof Error ? e.message : String(e)})`;
      skipped.push(line);
      onOp({ segments: [t(line)] });
      continue;
    }
    const err = validate(rt.getDoc(), action);
    if (err) {
      const line = `skipped: ${err}`;
      skipped.push(describeAction(action) + ' — ' + err);
      onOp({ segments: [t(line)] });
      continue;
    }
    rt.dispatch(action);
    const op = summarizeAction(action);
    applied.push(op);
    onOp(op);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return { applied, skipped };
}

/** Short human description of an action for repair-prompt diagnostics. */
function describeAction(a: Action): string {
  switch (a.type) {
    case 'paintCells':
      return `paintCells(frame ${a.frame}, ${a.cells.length} cells)`;
    case 'recolorCells':
      return `recolorCells(frame ${a.frame}, ${a.cells.length} cells)`;
    case 'placeStamp':
      return `placeStamp("${a.stampId}" frame ${a.frame} at ${a.x},${a.y})`;
    case 'addStamp':
      return `addStamp("${a.stamp.id}")`;
    case 'addFrame':
      return `addFrame(after ${a.after})`;
    case 'duplicateFrame':
      return `duplicateFrame(${a.index})`;
    case 'deleteFrame':
      return `deleteFrame(${a.index})`;
    case 'clearFrame':
      return `clearFrame(${a.frame})`;
    case 'moveFrame':
      return `moveFrame(${a.from}->${a.to})`;
    case 'setHold':
      return `setHold(${a.index}, ${a.holdMs}ms)`;
    case 'setTheme':
      return `setTheme(${a.themeId})`;
    case 'rename':
      return `rename("${a.name}")`;
    case 'resizeCanvas':
      return `resizeCanvas(${a.width}x${a.height})`;
    case 'setActive':
      return `setActive(${a.index})`;
    case 'deleteStamp':
      return `deleteStamp("${a.id}")`;
    default:
      return a.type;
  }
}

/**
 * Follow-up prompt for the repair pass: tells the model exactly which
 * actions failed and why, with a fresh canvas, and asks for ONLY the
 * corrected replacements.
 */
export function buildRepairPrompt(
  doc: DocState,
  mode: 'light' | 'dark',
  applied: OpLine[],
  skipped: string[],
): string {
  return `Some of your actions could not be applied. The canvas below is current — work from it.
Applied (${applied.length}): ${applied.length > 0 ? applied.map(opText).join('; ') : '(none)'}
Failed (${skipped.length}):
${skipped.map((s) => `- ${s}`).join('\n')}

Emit ONE more {"message","tool_calls"} JSON object containing ONLY corrected replacement tool calls for the failed ones (fix the coordinates, ids, colors, or bounds the errors name). Do NOT repeat calls that already applied. If the user's request is already fully satisfied despite the failures, emit {"message":"...","tool_calls":[]} with an empty tool_calls array and say so.

${describeDocument(doc, mode)}`;
}
