// webmcp.ts — express the agent's action layer as WebMCP tools.
//
// WebMCP (W3C Web Machine Learning Community Group draft) lets a page
// register structured, schema-validated tools at navigator.modelContext so
// that agents running in the browser can invoke them directly instead of
// driving the DOM. Every tool here is a thin wrapper over the same typed
// action layer the in-app co-pilot uses: validate() runs first, then
// dispatch() applies the change through the normal undoable path — so a
// browser agent gets exactly the same capabilities (and the same guardrails)
// as the built-in agent and the human UI.

import {
  type Action,
  type PaintCell,
  type RecolorCell,
  validate,
} from './actions.ts';
import { describeDocument, opText, summarizeAction } from './agent.ts';
import type { CustomStamp, DocState } from './document.ts';

/** MCP CallToolResult shape WebMCP execute handlers return. */
export interface WebMCPResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface WebMCPToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
}

export interface WebMCPToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for the tool's input. */
  inputSchema: Record<string, unknown>;
  annotations?: WebMCPToolAnnotations;
  execute: (args: Record<string, unknown>) => Promise<WebMCPResult>;
}

/** Minimal typing for the draft navigator.modelContext API. */
export interface ModelContext {
  registerTool(tool: WebMCPToolDefinition): void | Promise<void>;
  unregisterTool(name: string): void | Promise<void>;
}

declare global {
  interface Navigator {
    modelContext?: ModelContext;
  }
}

const ok = (text: string): WebMCPResult => ({
  content: [{ type: 'text', text }],
});

const err = (text: string): WebMCPResult => ({
  content: [{ type: 'text', text }],
  isError: true,
});

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

/**
 * Build the full WebMCP tool set. getDoc must return the live document at
 * call time; dispatch applies an already-validated action through the
 * undoable store.
 */
export function buildWebMCPTools(
  getDoc: () => DocState,
  dispatch: (a: Action) => void,
): WebMCPToolDefinition[] {
  /** Run one action through validate + dispatch, like the in-app agent. */
  const run = (action: Action): WebMCPResult => {
    const doc = getDoc();
    const problem = validate(doc, action);
    if (problem) return err(`rejected: ${problem}`);
    dispatch(action);
    return ok(opText(summarizeAction(action)));
  };

  const withAction = (
    build: (args: Record<string, unknown>) => Action,
  ): WebMCPToolDefinition['execute'] => {
    return async (args) => {
      try {
        return run(build(args));
      } catch (e) {
        return err(
          `invalid arguments: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    };
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

  const frameIndex = (doc: DocState): string =>
    `0-based frame index (0..${doc.frames.length - 1}; the UI calls frame N+1 "frame ${1}")`;

  return [
    {
      name: 'describe_document',
      description:
        'Read the current document: canvas size, frame count, active frame, theme, canvas font, user stamps, and every frame rendered as text with a column ruler, row numbers, and a color legend. Call this first to see what you are editing. Frame indices in actions are 0-based; the UI shows them 1-based.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => ok(describeDocument(getDoc(), 'dark')),
    },
    {
      name: 'paint_cells',
      description:
        'Paint cells on one frame (brush/eraser/fill/line). Batch ALL cells for one frame into a single call. Coordinates are 0-based with y=0 at the top row; out-of-bounds cells are rejected.',
      inputSchema: {
        type: 'object',
        properties: {
          frame: { type: 'number', description: frameIndex(getDoc()) },
          cells: {
            type: 'array',
            items: paintCellSchema,
            description: 'cells to paint on that frame',
          },
        },
        required: ['frame', 'cells'],
      },
      execute: withAction((args) => {
        const cells = args.cells as Array<Record<string, unknown>> | undefined;
        if (!Array.isArray(cells))
          throw new Error('"cells" must be an array');
        const painted: PaintCell[] = cells.map((c) => ({
          x: reqNum(c, 'x'),
          y: reqNum(c, 'y'),
          cell: {
            ch: reqStr(c, 'ch'),
            fg: reqStr(c, 'fg'),
            bg: str(c.bg) ?? '',
          },
        }));
        return { type: 'paintCells', frame: reqNum(args, 'frame'), cells: painted };
      }),
    },
    {
      name: 'recolor_cells',
      description:
        'Change ONLY the colors of existing cells on one frame, keeping their characters (the Paint tool). Coordinates are 0-based with y=0 at the top row.',
      inputSchema: {
        type: 'object',
        properties: {
          frame: { type: 'number', description: frameIndex(getDoc()) },
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
      execute: withAction((args) => {
        const cells = args.cells as Array<Record<string, unknown>> | undefined;
        if (!Array.isArray(cells))
          throw new Error('"cells" must be an array');
        const recolored: RecolorCell[] = cells.map((c) => ({
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
      }),
    },
    {
      name: 'add_frame',
      description:
        'Insert a blank frame after the given 0-based frame index.',
      inputSchema: {
        type: 'object',
        properties: {
          after: { type: 'number', description: frameIndex(getDoc()) },
        },
        required: ['after'],
      },
      execute: withAction((args) => ({
        type: 'addFrame',
        after: reqNum(args, 'after'),
      })),
    },
    {
      name: 'duplicate_frame',
      description: 'Duplicate a frame, inserting the copy right after it.',
      inputSchema: {
        type: 'object',
        properties: {
          index: { type: 'number', description: frameIndex(getDoc()) },
        },
        required: ['index'],
      },
      execute: withAction((args) => ({
        type: 'duplicateFrame',
        index: reqNum(args, 'index'),
      })),
    },
    {
      name: 'delete_frame',
      description:
        'Delete a frame. The document must keep at least one frame, so deleting the last remaining frame is rejected.',
      inputSchema: {
        type: 'object',
        properties: {
          index: { type: 'number', description: frameIndex(getDoc()) },
        },
        required: ['index'],
      },
      annotations: { destructiveHint: true },
      execute: withAction((args) => ({
        type: 'deleteFrame',
        index: reqNum(args, 'index'),
      })),
    },
    {
      name: 'clear_frame',
      description:
        'Erase every cell in a frame (keeps its holdMs). To hand the user a blank slate, clear every frame instead of deleting them.',
      inputSchema: {
        type: 'object',
        properties: {
          frame: { type: 'number', description: frameIndex(getDoc()) },
        },
        required: ['frame'],
      },
      annotations: { destructiveHint: true },
      execute: withAction((args) => ({
        type: 'clearFrame',
        frame: reqNum(args, 'frame'),
      })),
    },
    {
      name: 'move_frame',
      description: 'Move a frame from one 0-based position to another.',
      inputSchema: {
        type: 'object',
        properties: {
          from: { type: 'number', description: frameIndex(getDoc()) },
          to: { type: 'number', description: frameIndex(getDoc()) },
        },
        required: ['from', 'to'],
      },
      execute: withAction((args) => ({
        type: 'moveFrame',
        from: reqNum(args, 'from'),
        to: reqNum(args, 'to'),
      })),
    },
    {
      name: 'set_hold',
      description:
        'Set how long a frame displays during playback, in milliseconds.',
      inputSchema: {
        type: 'object',
        properties: {
          index: { type: 'number', description: frameIndex(getDoc()) },
          holdMs: { type: 'number', description: 'display time in milliseconds' },
        },
        required: ['index', 'holdMs'],
      },
      execute: withAction((args) => ({
        type: 'setHold',
        index: reqNum(args, 'index'),
        holdMs: reqNum(args, 'holdMs'),
      })),
    },
    {
      name: 'set_theme',
      description:
        'Switch the document theme (canvas background + stamp colors).',
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
      execute: withAction((args) => ({
        type: 'setTheme',
        themeId: reqStr(args, 'themeId'),
      })),
    },
    {
      name: 'rename_document',
      description: 'Rename the document.',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
      execute: withAction((args) => ({
        type: 'rename',
        name: reqStr(args, 'name'),
      })),
    },
    {
      name: 'resize_canvas',
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
      execute: withAction((args) => ({
        type: 'resizeCanvas',
        width: reqNum(args, 'width'),
        height: reqNum(args, 'height'),
      })),
    },
    {
      name: 'set_active_frame',
      description:
        'Select which frame is active in the timeline (does not change any art).',
      inputSchema: {
        type: 'object',
        properties: {
          index: { type: 'number', description: frameIndex(getDoc()) },
        },
        required: ['index'],
      },
      annotations: { readOnlyHint: true },
      execute: withAction((args) => ({
        type: 'setActive',
        index: reqNum(args, 'index'),
      })),
    },
    {
      name: 'add_stamp',
      description:
        'Create a reusable stamp the user keeps in their Stamps panel. id: lowercase letters/digits/dashes, 1-20 chars, unique. frames: the stamp art; each frame is an array of equal-length row strings, spaces are transparent. Any size, any frame count.',
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
      execute: withAction((args) => {
        const frames = args.frames as unknown;
        if (
          !Array.isArray(frames) ||
          frames.some(
            (f) => !Array.isArray(f) || f.some((r) => typeof r !== 'string'),
          )
        )
          throw new Error('"frames" must be an array of frames, each an array of row strings');
        const stamp: CustomStamp = {
          id: reqStr(args, 'id'),
          fg: reqStr(args, 'fg'),
          frames: frames as string[][],
        };
        return { type: 'addStamp', stamp };
      }),
    },
    {
      name: 'delete_stamp',
      description:
        'Remove a user-created stamp by id. Built-in stamps cannot be deleted.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      annotations: { destructiveHint: true },
      execute: withAction((args) => ({
        type: 'deleteStamp',
        id: reqStr(args, 'id'),
      })),
    },
    {
      name: 'place_stamp',
      description:
        'Paint a stamp (built-in or user-created) CENTERED on x,y on one frame. Art that extends past the grid edge is clipped to the grid, so placements near the edge partially apply. stampFrame picks which of the stamp\'s art frames to use (default 0). Coordinates are 0-based with y=0 at the top row.',
      inputSchema: {
        type: 'object',
        properties: {
          stampId: { type: 'string', description: 'built-in id or user stamp id' },
          frame: { type: 'number', description: frameIndex(getDoc()) },
          x: { type: 'number', description: 'center column, 0-based' },
          y: { type: 'number', description: 'center row, 0-based, y=0 is top' },
          fg: {
            type: 'string',
            description: 'foreground hex color for the placed art',
          },
          bg: {
            type: 'string',
            description: 'background hex color, or "" for transparent',
          },
          stampFrame: {
            type: 'number',
            description: 'which art frame of the stamp to use (default 0)',
          },
        },
        required: ['stampId', 'frame', 'x', 'y', 'fg', 'bg'],
      },
      execute: withAction((args) => {
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
      }),
    },
  ];
}

/** True when the browser implements the WebMCP draft API. */
export function webMCPavailable(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.modelContext &&
    typeof navigator.modelContext.registerTool === 'function'
  );
}

/**
 * Register the agent's tools at navigator.modelContext. No-op (with a
 * console note) where the browser doesn't implement WebMCP yet.
 * Returns an unregister function for cleanup.
 */
export function registerWebMCPTools(
  getDoc: () => DocState,
  dispatch: (a: Action) => void,
): () => void {
  if (!webMCPavailable()) {
    console.info(
      '[glyphdance] WebMCP not available in this browser — agent tools not exposed via navigator.modelContext',
    );
    return () => {};
  }
  const mc = navigator.modelContext!;
  const tools = buildWebMCPTools(getDoc, dispatch);
  for (const tool of tools) {
    try {
      mc.registerTool(tool);
    } catch (e) {
      console.warn(`[glyphdance] failed to register WebMCP tool ${tool.name}`, e);
    }
  }
  console.info(
    `[glyphdance] registered ${tools.length} WebMCP tools: ${tools.map((t) => t.name).join(', ')}`,
  );
  return () => {
    for (const tool of tools) {
      try {
        mc.unregisterTool(tool.name);
      } catch {
        /* best effort */
      }
    }
  };
}
