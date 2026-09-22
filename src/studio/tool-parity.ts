// tool-parity.ts — the registry that binds human UI surfaces to the shared
// agent tool catalog (agent-tools.ts).
//
// The toolbar renders its buttons FROM this registry (order, ids, labels),
// and every entry names the catalog tools it exercises. The parity tests
// assert both directions:
//   - every catalog tool is reachable from at least one human UI surface,
//   - every capability named here exists in the catalog.
// Add a tool to the catalog without wiring a human surface (or vice versa)
// and the tests fail — that is the enforcement.

import type { ToolId } from './brush.ts';
import { AGENT_TOOLS } from './agent-tools.ts';

export interface ToolbarEntry {
  /** Canvas ToolId for the toggle tools; plain ids for the momentary ones. */
  id: ToolId | 'colors' | 'undo' | 'redo';
  label: string;
  /** Catalog tool names this entry exercises. Empty means interaction-only
   *  (selection marquee, eyedropper sampling, color picking) — there is no
   *  document capability to keep in parity. */
  capabilities: string[];
}

/** The toolbar, in render order. ToolRail renders from this array; the
 *  labels here are what the buttons show. */
export const TOOLBAR: ToolbarEntry[] = [
  { id: 'select', label: 'Select', capabilities: [] },
  { id: 'brush', label: 'Brush', capabilities: ['paint_cells'] },
  { id: 'stamp', label: 'Stamp', capabilities: ['place_stamp'] },
  { id: 'text', label: 'Text', capabilities: ['paint_cells'] },
  // Paint recolors existing cells in place. It dispatches paintCells (so a
  // drag stays one undo step) but its capability is recoloring, which the
  // catalog also expresses as recolor_cells — both names stay reachable.
  { id: 'paint', label: 'Paint', capabilities: ['paint_cells', 'recolor_cells'] },
  { id: 'fill', label: 'Fill', capabilities: ['paint_cells'] },
  { id: 'pick', label: 'Eyedropper', capabilities: [] },
  { id: 'erase', label: 'Eraser', capabilities: ['paint_cells'] },
  { id: 'colors', label: 'Colors', capabilities: [] },
  { id: 'undo', label: 'Undo', capabilities: ['undo'] },
  { id: 'redo', label: 'Redo', capabilities: ['redo'] },
];

/** True for the canvas toggle tools (rendered in the ToggleButtonGroup);
 *  false for the momentary buttons rendered separately (Colors, Undo, Redo). */
export function isCanvasTool(
  e: ToolbarEntry,
): e is ToolbarEntry & { id: ToolId } {
  return e.id !== 'colors' && e.id !== 'undo' && e.id !== 'redo';
}

/** Label for a toolbar entry id (e.g. for the momentary buttons). */
export function toolbarLabel(id: ToolbarEntry['id']): string {
  return TOOLBAR.find((e) => e.id === id)?.label ?? id;
}

export interface UISurface {
  id: string;
  label: string;
  /** Catalog tool names a human can invoke from this surface. */
  capabilities: string[];
}

/** Every human surface that invokes catalog capabilities. */
export const UI_SURFACES: UISurface[] = [
  {
    id: 'toolbar',
    label: 'Toolbar',
    capabilities: [...new Set(TOOLBAR.flatMap((e) => e.capabilities))],
  },
  {
    id: 'timeline',
    label: 'Timeline',
    capabilities: [
      'add_frame',
      'duplicate_frame',
      'delete_frame',
      'clear_frame',
      'move_frame',
      'set_hold',
      'set_active_frame',
    ],
  },
  {
    id: 'transport',
    label: 'Transport',
    capabilities: ['play', 'pause', 'set_active_frame'],
  },
  {
    id: 'document-panel',
    label: 'Document panel',
    capabilities: ['rename_document', 'resize_canvas', 'set_theme', 'set_font'],
  },
  {
    id: 'stamp-panel',
    label: 'Stamp panel',
    capabilities: ['add_stamp', 'delete_stamp', 'place_stamp'],
  },
  {
    id: 'selection',
    label: 'Selection bar',
    capabilities: ['paint_cells', 'add_stamp'],
  },
];

/** Every catalog tool name reachable by a human somewhere in the UI. */
export function humanReachableTools(): string[] {
  return [...new Set(UI_SURFACES.flatMap((s) => s.capabilities))];
}

/** Catalog tools with no human UI surface — the parity test requires this
 *  to be empty. */
export function agentOnlyTools(): string[] {
  const reachable = new Set(humanReachableTools());
  return AGENT_TOOLS.map((t) => t.name).filter((n) => !reachable.has(n));
}

/** Capability names referenced by the UI that don't exist in the catalog —
 *  the parity test requires this to be empty. */
export function unknownCapabilities(): string[] {
  const names = new Set(AGENT_TOOLS.map((t) => t.name));
  return humanReachableTools().filter((n) => !names.has(n));
}
