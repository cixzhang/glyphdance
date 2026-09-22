// webmcp.ts — expose the agent's tools through WebMCP.
//
// WebMCP (W3C Web Machine Learning Community Group draft) lets a page
// register structured, schema-validated tools at navigator.modelContext so
// that agents running in the browser can invoke them directly instead of
// driving the DOM.
//
// The tool definitions live in agent-tools.ts — the SAME objects the in-app
// co-pilot uses. This file only adapts them to the WebMCP registration API
// and adds one read-only tool, describe_document (the co-pilot gets the same
// document description injected into its prompt context, so the capability
// exists on both surfaces).

import { validate, type Action } from './actions.ts';
import {
  AGENT_TOOLS,
  type AgentToolDef,
  type ToolRuntime,
} from './agent-tools.ts';
import { describeDocument, opText, summarizeAction } from './agent.ts';

/** MCP CallToolResult shape WebMCP execute handlers return. */
export interface WebMCPResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface WebMCPToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for the tool's input. */
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
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

/**
 * Build the full WebMCP tool set from the shared agent tool catalog.
 * The ToolRuntime carries the live document getter, the validated dispatch
 * path, and the store/transport functions — the same object the in-app
 * agent and the human UI use.
 */
export function buildWebMCPTools(rt: ToolRuntime): WebMCPToolDefinition[] {
  /** Run one action through validate + dispatch, like the in-app agent. */
  const run = (action: Action): WebMCPResult => {
    const problem = validate(rt.getDoc(), action);
    if (problem) return err(`rejected: ${problem}`);
    rt.dispatch(action);
    return ok(opText(summarizeAction(action)));
  };

  const fromDef = (def: AgentToolDef): WebMCPToolDefinition => ({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema,
    annotations: def.annotations,
    execute: async (args) => {
      if (def.run !== undefined) {
        // Runtime tool (undo/redo, transport): same function the human UI
        // calls; no-ops report themselves as plain text, not errors.
        return ok(def.run(rt, args));
      }
      if (def.buildAction === undefined) {
        return err('tool has no executor');
      }
      let action: Action;
      try {
        action = def.buildAction(args);
      } catch (e) {
        return err(
          `invalid arguments: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      return run(action);
    },
  });

  return [
    ...AGENT_TOOLS.map(fromDef),
    {
      name: 'describe_document',
      description:
        'Read the current document: canvas size, frame count, active frame, theme, canvas font, user stamps, and every frame rendered as text with a column ruler, row numbers, and a color legend. Call this first to see what you are editing. Frame indices in actions are 0-based; the UI shows them 1-based.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => ok(describeDocument(rt.getDoc(), 'dark')),
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
export function registerWebMCPTools(rt: ToolRuntime): () => void {
  if (!webMCPavailable()) {
    console.info(
      '[glyphdance] WebMCP not available in this browser — agent tools not exposed via navigator.modelContext',
    );
    return () => {};
  }
  const mc = navigator.modelContext!;
  const tools = buildWebMCPTools(rt);
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
