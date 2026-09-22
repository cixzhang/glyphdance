// agent-tools.ts — the single source of truth for the agent's tools.
//
// The SAME AgentToolDef objects drive both surfaces:
//   - WebMCP: webmcp.ts registers each def as a navigator.modelContext tool.
//   - In-app co-pilot: agent.ts renders each def into the system prompt and
//     parses the model's {"name","arguments"} tool calls back through the
//     same executor — buildAction + validate for document actions, run(rt)
//     for runtime tools (undo/redo, transport).
//
// The SAME defs also power the human UI: tool-parity.ts maps toolbar and
// panel controls onto catalog tool names, so a capability can't exist for
// the agent but not the human (or vice versa).
//
// To add or change a tool, edit it here once — every surface follows.

import type { Action, PaintCell, RecolorCell } from './actions.ts';
import type { CustomStamp, DocState } from './document.ts';

/** The live app surface runtime tools run against. The in-app agent,
 *  WebMCP, and the human UI all reach undo/redo/transport through this
 *  same object, so a capability behaves identically no matter who invokes
 *  it. */
export interface ToolRuntime {
  /** The live document, for tools that need to read it. */
  getDoc: () => DocState;
  /** Dispatch a validated document action (the human edit path). */
  dispatch: (a: Action) => void;
  /** Store commands — the same functions behind the toolbar buttons and
   *  keyboard shortcuts. Safe no-ops when the stacks are empty. */
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  /** Transport — the same state behind the timeline play button. */
  play: () => void;
  pause: () => void;
  isPlaying: () => boolean;
}

export interface AgentToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
}

export interface AgentToolDef {
  /** snake_case tool name — the WebMCP tool name and the co-pilot's call name. */
  name: string;
  description: string;
  /** JSON Schema for the tool's arguments — the contract for both surfaces. */
  inputSchema: Record<string, unknown>;
  annotations?: AgentToolAnnotations;
  /** Arguments that exercise the schema, used by tests and docs. */
  exampleArgs: Record<string, unknown>;
  /** Document-action tools build a typed Action, which is then validated
   *  and dispatched through the same path as every human edit. */
  actionType?: Action['type'];
  buildAction?: (args: Record<string, unknown>) => Action;
  /** Runtime tools run against live app state instead of building an
   *  Action (undo/redo, transport). Returns a short human-readable
   *  result line for the op log. Exactly one of buildAction/run is set. */
  run?: (rt: ToolRuntime, args: Record<string, unknown>) => string;
}

// --- argument coercion (throws on bad shape; callers report it) ---

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const str = (v: unknown): string | null =>
  typeof v === 'string' ? v : null;

const reqNum = (args: Record<string, unknown>, key: string): number => {
  const v = num(args[key]);
  if (v === null) throw new Error(`"${key}" must be a number`);
  return v;
};

const reqStr = (args: Record<string, unknown>, key: string): string => {
  const v = str(args[key]);
  if (v === null) throw new Error(`"${key}" must be a string`);
  return v;
};

const reqCellArray = (
  args: Record<string, unknown>,
): Array<Record<string, unknown>> => {
  const cells = args.cells;
  if (!Array.isArray(cells)) throw new Error('"cells" must be an array');
  return cells as Array<Record<string, unknown>>;
};

const paintCellSchema = {
  type: 'object',
  properties: {
    x: { type: 'number', description: '0-based column' },
    y: { type: 'number', description: '0-based row, y=0 is the top row' },
    ch: { type: 'string', description: 'exactly one character; " " erases' },
    fg: { type: 'string', description: 'foreground hex color, e.g. "#4ade80"' },
    bg: {
      type: 'string',
      description: 'background hex color, or "" for transparent',
    },
  },
  required: ['x', 'y', 'ch', 'fg'],
};

const frameIndexDesc =
  '0-based frame index; the UI calls frame N+1 "frame 1", and the document context below lists every frame with its index';

export const AGENT_TOOLS: AgentToolDef[] = [
  {
    name: 'paint_cells',
    actionType: 'paintCells',
    description:
      'Paint cells on one frame (brush/eraser/fill/line). Batch ALL cells for one frame into a single call. Coordinates are 0-based with y=0 at the top row; out-of-bounds cells are rejected. Paint in color — vary fg across elements, never a whole piece in one fg.',
    inputSchema: {
      type: 'object',
      properties: {
        frame: { type: 'number', description: frameIndexDesc },
        cells: {
          type: 'array',
          items: paintCellSchema,
          description: 'cells to paint on that frame',
        },
      },
      required: ['frame', 'cells'],
    },
    buildAction: (args) => {
      const painted: PaintCell[] = reqCellArray(args).map((c) => ({
        x: reqNum(c, 'x'),
        y: reqNum(c, 'y'),
        cell: {
          ch: reqStr(c, 'ch'),
          fg: reqStr(c, 'fg'),
          bg: str(c.bg) ?? '',
        },
      }));
      return {
        type: 'paintCells',
        frame: reqNum(args, 'frame'),
        cells: painted,
      };
    },
    exampleArgs: {
      frame: 0,
      cells: [
        { x: 1, y: 2, ch: '█', fg: '#4ade80', bg: '' },
        { x: 2, y: 2, ch: '●', fg: '#f472b6', bg: '' },
      ],
    },
  },
  {
    name: 'recolor_cells',
    actionType: 'recolorCells',
    description:
      'Change ONLY the colors of existing cells on one frame, keeping their characters (the Paint tool). Use this to recolor art that is already drawn.',
    inputSchema: {
      type: 'object',
      properties: {
        frame: { type: 'number', description: frameIndexDesc },
        cells: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              fg: { type: 'string' },
              bg: { type: 'string' },
            },
            required: ['x', 'y', 'fg', 'bg'],
          },
        },
      },
      required: ['frame', 'cells'],
    },
    buildAction: (args) => {
      const recolored: RecolorCell[] = reqCellArray(args).map((c) => ({
        x: reqNum(c, 'x'),
        y: reqNum(c, 'y'),
        fg: reqStr(c, 'fg'),
        bg: reqStr(c, 'bg'),
      }));
      return {
        type: 'recolorCells',
        frame: reqNum(args, 'frame'),
        cells: recolored,
      };
    },
    exampleArgs: {
      frame: 0,
      cells: [{ x: 1, y: 2, fg: '#4ade80', bg: '' }],
    },
  },
  {
    name: 'add_frame',
    actionType: 'addFrame',
    description: 'Insert a blank frame after the given 0-based frame index.',
    inputSchema: {
      type: 'object',
      properties: { after: { type: 'number', description: frameIndexDesc } },
      required: ['after'],
    },
    buildAction: (args) => ({ type: 'addFrame', after: reqNum(args, 'after') }),
    exampleArgs: { after: 1 },
  },
  {
    name: 'duplicate_frame',
    actionType: 'duplicateFrame',
    description: 'Duplicate a frame, inserting the copy right after it.',
    inputSchema: {
      type: 'object',
      properties: { index: { type: 'number', description: frameIndexDesc } },
      required: ['index'],
    },
    buildAction: (args) => ({
      type: 'duplicateFrame',
      index: reqNum(args, 'index'),
    }),
    exampleArgs: { index: 1 },
  },
  {
    name: 'delete_frame',
    actionType: 'deleteFrame',
    description:
      'Delete a frame. The document must keep at least one frame, so deleting the last remaining frame is rejected.',
    inputSchema: {
      type: 'object',
      properties: { index: { type: 'number', description: frameIndexDesc } },
      required: ['index'],
    },
    annotations: { destructiveHint: true },
    buildAction: (args) => ({
      type: 'deleteFrame',
      index: reqNum(args, 'index'),
    }),
    exampleArgs: { index: 1 },
  },
  {
    name: 'clear_frame',
    actionType: 'clearFrame',
    description:
      'Erase every cell in a frame (keeps its holdMs). To hand the user a blank slate, clear every frame instead of deleting them.',
    inputSchema: {
      type: 'object',
      properties: { frame: { type: 'number', description: frameIndexDesc } },
      required: ['frame'],
    },
    annotations: { destructiveHint: true },
    buildAction: (args) => ({
      type: 'clearFrame',
      frame: reqNum(args, 'frame'),
    }),
    exampleArgs: { frame: 0 },
  },
  {
    name: 'move_frame',
    actionType: 'moveFrame',
    description: 'Move a frame from one 0-based position to another.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'number', description: frameIndexDesc },
        to: { type: 'number', description: frameIndexDesc },
      },
      required: ['from', 'to'],
    },
    buildAction: (args) => ({
      type: 'moveFrame',
      from: reqNum(args, 'from'),
      to: reqNum(args, 'to'),
    }),
    exampleArgs: { from: 2, to: 0 },
  },
  {
    name: 'set_hold',
    actionType: 'setHold',
    description: 'Set how long a frame displays during playback, in milliseconds.',
    inputSchema: {
      type: 'object',
      properties: {
        index: { type: 'number', description: frameIndexDesc },
        holdMs: { type: 'number', description: 'display time in milliseconds' },
      },
      required: ['index', 'holdMs'],
    },
    buildAction: (args) => ({
      type: 'setHold',
      index: reqNum(args, 'index'),
      holdMs: reqNum(args, 'holdMs'),
    }),
    exampleArgs: { index: 0, holdMs: 400 },
  },
  {
    name: 'set_theme',
    actionType: 'setTheme',
    description:
      'Switch the document theme (canvas background + stamp colors). Only use when the user asks for a different mood or palette.',
    inputSchema: {
      type: 'object',
      properties: {
        themeId: {
          type: 'string',
          description: 'one of: dracula, monokai, nord, solarized, tokyo, onedark',
        },
      },
      required: ['themeId'],
    },
    buildAction: (args) => ({
      type: 'setTheme',
      themeId: reqStr(args, 'themeId'),
    }),
    exampleArgs: { themeId: 'dracula' },
  },
  {
    name: 'rename_document',
    actionType: 'rename',
    description: 'Rename the document.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
    buildAction: (args) => ({ type: 'rename', name: reqStr(args, 'name') }),
    exampleArgs: { name: 'my-piece' },
  },
  {
    name: 'resize_canvas',
    actionType: 'resizeCanvas',
    description:
      'Resize the canvas (width 4-64, height 4-48). Existing art is re-centered on the new canvas; art that does not fit is cropped.',
    inputSchema: {
      type: 'object',
      properties: {
        width: { type: 'number' },
        height: { type: 'number' },
      },
      required: ['width', 'height'],
    },
    buildAction: (args) => ({
      type: 'resizeCanvas',
      width: reqNum(args, 'width'),
      height: reqNum(args, 'height'),
    }),
    exampleArgs: { width: 32, height: 20 },
  },
  {
    name: 'set_active_frame',
    actionType: 'setActive',
    description:
      'Select which frame is active in the timeline (does not change any art).',
    inputSchema: {
      type: 'object',
      properties: { index: { type: 'number', description: frameIndexDesc } },
      required: ['index'],
    },
    annotations: { readOnlyHint: true },
    buildAction: (args) => ({
      type: 'setActive',
      index: reqNum(args, 'index'),
    }),
    exampleArgs: { index: 2 },
  },
  {
    name: 'add_stamp',
    actionType: 'addStamp',
    description:
      "Create a reusable stamp the user keeps in their Stamps panel. id: lowercase letters/digits/dashes, 1-20 chars, unique across built-in and user stamps. frames: the stamp art — each frame is an array of equal-length row strings, spaces are transparent. Any size, any frame count. Search the catalog (below) before creating: if a built-in stamp fits, place it instead.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        fg: {
          type: 'string',
          description: 'default foreground hex color for the stamp',
        },
        frames: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'string' },
            description: 'one animation frame: rows of characters',
          },
          description: 'animation frames of the stamp',
        },
      },
      required: ['id', 'fg', 'frames'],
    },
    buildAction: (args) => {
      const frames = args.frames;
      if (
        !Array.isArray(frames) ||
        frames.some(
          (f) =>
            !Array.isArray(f) ||
            (f as unknown[]).some((r) => typeof r !== 'string'),
        )
      )
        throw new Error(
          '"frames" must be an array of frames, each an array of row strings',
        );
      const stamp: CustomStamp = {
        id: reqStr(args, 'id'),
        fg: reqStr(args, 'fg'),
        frames: frames as string[][],
      };
      return { type: 'addStamp', stamp };
    },
    exampleArgs: {
      id: 'cat',
      fg: '#ffd75e',
      frames: [[' /\\_/\\ ', '( o.o )', ' > ^ < ']],
    },
  },
  {
    name: 'delete_stamp',
    actionType: 'deleteStamp',
    description:
      'Remove a user-created stamp by id. Built-in stamps cannot be deleted.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
    annotations: { destructiveHint: true },
    buildAction: (args) => ({ type: 'deleteStamp', id: reqStr(args, 'id') }),
    exampleArgs: { id: 'cat' },
  },
  {
    name: 'place_stamp',
    actionType: 'placeStamp',
    description:
      "Paint a stamp (built-in or user-created) CENTERED on x,y on one frame — this is how you USE stamps, never hand-draw a stamp's cells. Art that extends past the grid edge is clipped to the grid, so placements near the edge partially apply. stampFrame picks which of the stamp's art frames to use (default 0). Coordinates are 0-based with y=0 at the top row.",
    inputSchema: {
      type: 'object',
      properties: {
        stampId: { type: 'string', description: 'built-in id or user stamp id' },
        frame: { type: 'number', description: frameIndexDesc },
        x: { type: 'number', description: 'center column, 0-based' },
        y: { type: 'number', description: 'center row, 0-based, y=0 is top' },
        fg: { type: 'string', description: 'foreground hex color for the placed art' },
        bg: { type: 'string', description: 'background hex color, or "" for transparent' },
        stampFrame: {
          type: 'number',
          description: "which art frame of the stamp to use (default 0)",
        },
      },
      required: ['stampId', 'frame', 'x', 'y', 'fg', 'bg'],
    },
    buildAction: (args) => {
      const stampFrameRaw = args.stampFrame;
      const stampFrame =
        stampFrameRaw === undefined ? undefined : reqNum(args, 'stampFrame');
      return {
        type: 'placeStamp',
        stampId: reqStr(args, 'stampId'),
        frame: reqNum(args, 'frame'),
        x: reqNum(args, 'x'),
        y: reqNum(args, 'y'),
        fg: reqStr(args, 'fg'),
        bg: reqStr(args, 'bg'),
        ...(stampFrame === undefined ? {} : { stampFrame }),
      };
    },
    exampleArgs: {
      stampId: 'crab',
      frame: 0,
      x: 12,
      y: 7,
      fg: '#ff79c6',
      bg: '',
    },
  },
  {
    name: 'undo',
    description:
      'Undo the last change to the document — the same undo stack as the toolbar Undo button and keyboard shortcut. Reports "nothing to undo" when the stack is empty.',
    inputSchema: { type: 'object', properties: {} },
    exampleArgs: {},
    run: (rt) => {
      if (!rt.canUndo()) return 'nothing to undo';
      rt.undo();
      return 'undid the last change';
    },
  },
  {
    name: 'redo',
    description:
      'Redo the last undone change — the same redo stack as the toolbar Redo button and keyboard shortcut. Reports "nothing to redo" when the stack is empty.',
    inputSchema: { type: 'object', properties: {} },
    exampleArgs: {},
    run: (rt) => {
      if (!rt.canRedo()) return 'nothing to redo';
      rt.redo();
      return 'redid the last undone change';
    },
  },
  {
    name: 'set_font',
    actionType: 'setFont',
    description:
      'Set the canvas pixel font — the same font picker as the Document panel. fontId is one of: "cozette" (default, widest glyph coverage), "vga" (authentic IBM VGA 8x16), "jetbrains" (JetBrains Mono), "system" (system monospace).',
    inputSchema: {
      type: 'object',
      properties: {
        fontId: {
          type: 'string',
          description: 'one of cozette, vga, jetbrains, system',
        },
      },
      required: ['fontId'],
    },
    buildAction: (args) => ({ type: 'setFont', fontId: reqStr(args, 'fontId') }),
    exampleArgs: { fontId: 'vga' },
  },
  {
    name: 'play',
    description:
      'Start playing the animation — the same state as the timeline play button. Reports "already playing" when playback is already running.',
    inputSchema: { type: 'object', properties: {} },
    exampleArgs: {},
    run: (rt) => {
      if (rt.isPlaying()) return 'already playing';
      rt.play();
      return 'started playback';
    },
  },
  {
    name: 'pause',
    description:
      'Pause the animation — the same state as the timeline pause button. Pausing leaves the playhead on the current frame so you can inspect or edit it. Reports "already paused" when playback is already stopped.',
    inputSchema: { type: 'object', properties: {} },
    exampleArgs: {},
    run: (rt) => {
      if (!rt.isPlaying()) return 'already paused';
      rt.pause();
      return 'paused playback';
    },
  },
];

export function agentToolByName(name: string): AgentToolDef | undefined {
  return AGENT_TOOLS.find((t) => t.name === name);
}

/** Render the tool catalog for the co-pilot's system prompt. */
export function renderToolDocs(): string {
  return AGENT_TOOLS.map((t) => {
    const required =
      (t.inputSchema.required as string[] | undefined) ?? [];
    return [
      `- ${t.name}: ${t.description}`,
      `  required: ${required.join(', ') || '(none)'}`,
      `  example: ${JSON.stringify({ name: t.name, arguments: t.exampleArgs })}`,
    ].join('\n');
  }).join('\n');
}

// Re-exported for tests that want a doc without importing the store.
export type { DocState };
