// Typed action layer: every document mutation is a plain-data action that is
// validated before it runs and carries its own inverse for undo. Humans
// (toolbar, canvas, timeline) and the agent dispatch the same actions, so the
// agent can do everything the user can — visibly, in the op log.

import {
  blankFrame,
  cellIndex,
  cloneFrame,
  inBounds,
  MAX_CANVAS_H,
  MAX_CANVAS_W,
  MIN_CANVAS_H,
  MIN_CANVAS_W,
  resizeCells,
  type Cell,
  type CustomStamp,
  type DocState,
  type Frame,
} from './document.ts';
import { SYNTAX_THEMES } from './scene.ts';
import { builtinStampIds, resolveStamp, stampCellsFor } from './stamps.ts';
import { isSupportedGlyph } from './glyphs.ts';

export interface PaintCell {
  x: number;
  y: number;
  cell: Cell;
}

export type Action =
  /** Paint cells (brush stroke, eraser, fill, line, stamp — batched). */
  | { type: 'paintCells'; frame: number; cells: PaintCell[]; stroke?: string }
  | { type: 'addFrame'; after: number }
  /** Inverse-only: re-insert a previously removed frame. */
  | { type: 'insertFrame'; at: number; frame: Frame; active: number }
  | { type: 'duplicateFrame'; index: number }
  | { type: 'deleteFrame'; index: number }
  /** Erase every cell in a frame, keeping its holdMs. The blank-slate action. */
  | { type: 'clearFrame'; frame: number }
  | { type: 'moveFrame'; from: number; to: number }
  | { type: 'setHold'; index: number; holdMs: number }
  | { type: 'setTheme'; themeId: string }
  | { type: 'rename'; name: string }
  /**
   * Resize the canvas. Existing art is re-centered by default (dx/dy
   * override the placement offset; the inverse carries the negation so
   * undo restores cells exactly). Crops art that doesn't fit.
   */
  | {
      type: 'resizeCanvas';
      width: number;
      height: number;
      dx?: number;
      dy?: number;
    }
  /** Selection — applies, but is never recorded for undo. */
  | { type: 'setActive'; index: number }
  /** Whole-document replace (import, demo reset) — clears history. */
  | { type: 'load'; doc: DocState }
  /** Define a reusable stamp in the document's stamp library. */
  | { type: 'addStamp'; stamp: CustomStamp }
  /** Remove a user-created stamp (built-ins can't be deleted). */
  | { type: 'deleteStamp'; id: string }
  /**
   * Paint a stamp's art centered on (x, y). The agent's way to *use* stamps
   * without hand-emitting every cell; fg/bg are explicit so the action
   * stays theme-independent.
   */
  | {
      type: 'placeStamp';
      stampId: string;
      frame: number;
      x: number;
      y: number;
      fg: string;
      bg: string;
      stampFrame?: number;
    };

const frameCount = (doc: DocState): number => doc.frames.length;
const validFrame = (doc: DocState, i: number): boolean =>
  Number.isInteger(i) && i >= 0 && i < frameCount(doc);

/** Returns an error message, or null when the action is legal. */
export function validate(doc: DocState, a: Action): string | null {
  switch (a.type) {
    case 'paintCells':
      if (!validFrame(doc, a.frame)) return `no frame ${a.frame}`;
      if (a.cells.length === 0) return 'nothing to paint';
      for (const c of a.cells) {
        if (!inBounds(c.x, c.y, doc.width, doc.height))
          return `cell (${c.x},${c.y}) out of bounds`;
        if (typeof c.cell.ch !== 'string' || [...c.cell.ch].length !== 1)
          return `cell (${c.x},${c.y}) needs a single character`;
        const ch = [...c.cell.ch][0];
        // The canvas font can't draw this — reject it instead of painting
        // tofu, and point the agent at inventing a stamp from glyphs that
        // exist.
        if (!isSupportedGlyph(ch))
          return `cell (${c.x},${c.y}) uses "${ch}", which the canvas font can't draw — design a custom stamp from supported glyphs with addStamp instead of painting it directly`;
      }
      return null;
    case 'addFrame':
      if (!validFrame(doc, a.after)) return `no frame ${a.after}`;
      return null;
    case 'insertFrame':
      if (a.at < 0 || a.at > frameCount(doc)) return `bad insert index ${a.at}`;
      return null;
    case 'duplicateFrame':
      if (!validFrame(doc, a.index)) return `no frame ${a.index}`;
      return null;
    case 'deleteFrame':
      if (!validFrame(doc, a.index)) return `no frame ${a.index}`;
      if (frameCount(doc) === 1) return 'cannot delete the last frame';
      return null;
    case 'clearFrame':
      if (!validFrame(doc, a.frame)) return `no frame ${a.frame}`;
      return null;
    case 'moveFrame':
      if (!validFrame(doc, a.from) || !validFrame(doc, a.to))
        return `bad move ${a.from} -> ${a.to}`;
      return null;
    case 'setHold':
      if (!validFrame(doc, a.index)) return `no frame ${a.index}`;
      if (!Number.isFinite(a.holdMs) || a.holdMs < 50 || a.holdMs > 5000)
        return 'hold must be 50–5000ms';
      return null;
    case 'setTheme':
      if (!SYNTAX_THEMES.some((t) => t.id === a.themeId))
        return `unknown theme ${a.themeId}`;
      return null;
    case 'resizeCanvas': {
      for (const [label, v] of [
        ['width', a.width],
        ['height', a.height],
      ] as const) {
        if (!Number.isInteger(v)) return `canvas ${label} must be a whole number`;
      }
      if (a.width < MIN_CANVAS_W || a.width > MAX_CANVAS_W)
        return `canvas width must be ${MIN_CANVAS_W}–${MAX_CANVAS_W}`;
      if (a.height < MIN_CANVAS_H || a.height > MAX_CANVAS_H)
        return `canvas height must be ${MIN_CANVAS_H}–${MAX_CANVAS_H}`;
      if (a.dx !== undefined && !Number.isInteger(a.dx))
        return 'canvas dx must be a whole number';
      if (a.dy !== undefined && !Number.isInteger(a.dy))
        return 'canvas dy must be a whole number';
      if (a.width === doc.width && a.height === doc.height)
        return `canvas is already ${doc.width}×${doc.height}`;
      return null;
    }
    case 'rename':
      if (!a.name.trim()) return 'name cannot be empty';
      return null;
    case 'setActive':
      if (!validFrame(doc, a.index)) return `no frame ${a.index}`;
      return null;
    case 'load':
      if (a.doc.frames.length === 0) return 'document needs at least one frame';
      if (
        !Number.isInteger(a.doc.width) ||
        a.doc.width < MIN_CANVAS_W ||
        a.doc.width > MAX_CANVAS_W ||
        !Number.isInteger(a.doc.height) ||
        a.doc.height < MIN_CANVAS_H ||
        a.doc.height > MAX_CANVAS_H
      )
        return 'document has an invalid canvas size';
      if (
        !a.doc.frames.every((f) => f.cells.length === a.doc.width * a.doc.height)
      )
        return 'document frames do not match the canvas size';
      return null;
    case 'addStamp':
      return validateStamp(doc, a.stamp);
    case 'deleteStamp':
      if (!doc.stamps.some((s) => s.id === a.id)) return `no stamp ${a.id}`;
      return null;
    case 'placeStamp': {
      if (!validFrame(doc, a.frame)) return `no frame ${a.frame}`;
      if (!inBounds(a.x, a.y, doc.width, doc.height))
        return `cell (${a.x},${a.y}) out of bounds`;
      const stamp = resolveStamp(a.stampId, doc.stamps);
      if (!stamp) return `no stamp ${a.stampId}`;
      const sf = a.stampFrame ?? 0;
      if (!Number.isInteger(sf) || sf < 0 || sf >= stamp.frames.length)
        return `stamp ${a.stampId} has no frame ${sf}`;
      // Reject clipped placements instead of silently cutting the stamp off:
      // the repair loop can then move it inward.
      const rows = stamp.frames[sf];
      const w = Math.max(...rows.map((r) => [...r].length));
      const h = rows.length;
      const x0 = a.x - Math.floor(w / 2);
      const y0 = a.y - Math.floor(h / 2);
      if (x0 < 0 || y0 < 0 || x0 + w > doc.width || y0 + h > doc.height)
        return `stamp "${a.stampId}" (${w}x${h}) centered at (${a.x},${a.y}) would be clipped by the canvas edge — center it further inward`;
      if (!/^#[0-9a-fA-F]{6}$/.test(a.fg)) return `bad fg ${a.fg}`;
      if (a.bg !== '' && !/^#[0-9a-fA-F]{6}$/.test(a.bg)) return `bad bg ${a.bg}`;
      return null;
    }
  }
}

/** Shared shape validation for a new custom stamp (used by addStamp). */
export function validateStamp(doc: DocState, stamp: CustomStamp): string | null {
  if (typeof stamp !== 'object' || stamp === null) return 'stamp must be an object';
  if (!/^[a-z0-9-]{1,20}$/.test(stamp.id))
    return 'stamp id must be 1-20 lowercase letters, digits, or dashes';
  if (builtinStampIds().includes(stamp.id)) return `stamp id ${stamp.id} is built-in`;
  if (doc.stamps.some((s) => s.id === stamp.id))
    return `stamp ${stamp.id} already exists`;
  if (!/^#[0-9a-fA-F]{6}$/.test(stamp.fg)) return `bad stamp fg ${stamp.fg}`;
  if (!Array.isArray(stamp.frames) || stamp.frames.length < 1 || stamp.frames.length > 4)
    return 'stamp needs 1-4 frames';
  for (const rows of stamp.frames) {
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 8)
      return 'stamp frames need 1-8 rows';
    for (const row of rows) {
      if (typeof row !== 'string') return 'stamp rows must be strings';
      const len = [...row].length;
      if (len < 1 || len > 12) return 'stamp rows must be 1-12 characters';
      for (const ch of row) {
        if (ch === '\n' || ch === '\r' || ch === '\t')
          return 'stamp rows must not contain whitespace control chars';
        // A missing glyph would render as an empty box — reject it so the
        // agent redesigns the stamp out of characters the font can draw.
        if (!isSupportedGlyph(ch))
          return `stamp "${stamp.id}" uses "${ch}", which the canvas font can't draw — redesign the stamp using only supported glyphs`;
      }
    }
  }
  return null;
}

export interface Applied {
  doc: DocState;
  /** How to undo this action; null when the action isn't undoable. */
  inverse: Action | null;
}

function setCells(doc: DocState, frameIdx: number, cells: PaintCell[]): DocState {
  const frames = doc.frames.slice();
  const frameCells = frames[frameIdx].cells.slice();
  for (const c of cells)
    frameCells[cellIndex(c.x, c.y, doc.width)] = { ...c.cell };
  frames[frameIdx] = { ...frames[frameIdx], cells: frameCells };
  return { ...doc, frames };
}

/** Active-frame bookkeeping when frame `index` is removed. */
function activeAfterDelete(doc: DocState, index: number): number {
  if (doc.active === index) return Math.max(0, index - 1);
  return doc.active > index ? doc.active - 1 : doc.active;
}

/** Active-frame bookkeeping when a frame moves from -> to. */
function activeAfterMove(active: number, from: number, to: number): number {
  if (active === from) return to;
  if (from < to && active > from && active <= to) return active - 1;
  if (from > to && active >= to && active < from) return active + 1;
  return active;
}

export function applyAction(doc: DocState, a: Action): Applied {
  switch (a.type) {
    case 'paintCells': {
      const before: PaintCell[] = a.cells.map((c) => ({
        x: c.x,
        y: c.y,
        cell: { ...doc.frames[a.frame].cells[cellIndex(c.x, c.y, doc.width)] },
      }));
      const next = setCells(doc, a.frame, a.cells);
      const inverse: Action = {
        type: 'paintCells',
        frame: a.frame,
        cells: before,
        stroke: a.stroke,
      };
      return { doc: next, inverse };
    }
    case 'addFrame': {
      const frames = doc.frames.slice();
      frames.splice(a.after + 1, 0, blankFrame(400, doc.width, doc.height));
      const next: DocState = { ...doc, frames, active: a.after + 1 };
      return { doc: next, inverse: { type: 'deleteFrame', index: a.after + 1 } };
    }
    case 'insertFrame': {
      const frames = doc.frames.slice();
      frames.splice(a.at, 0, a.frame);
      const next: DocState = { ...doc, frames, active: a.active };
      return { doc: next, inverse: { type: 'deleteFrame', index: a.at } };
    }
    case 'duplicateFrame': {
      const frames = doc.frames.slice();
      frames.splice(a.index + 1, 0, cloneFrame(doc.frames[a.index]));
      const next: DocState = { ...doc, frames, active: a.index + 1 };
      return { doc: next, inverse: { type: 'deleteFrame', index: a.index + 1 } };
    }
    case 'deleteFrame': {
      const removed = doc.frames[a.index];
      const frames = doc.frames.slice();
      frames.splice(a.index, 1);
      const inverse: Action = {
        type: 'insertFrame',
        at: a.index,
        frame: removed,
        active: doc.active,
      };
      const next: DocState = {
        ...doc,
        frames,
        active: activeAfterDelete(doc, a.index),
      };
      return { doc: next, inverse };
    }
    case 'clearFrame': {
      const frame = doc.frames[a.frame];
      const before: PaintCell[] = frame.cells.map((cell, i) => ({
        x: i % doc.width,
        y: Math.floor(i / doc.width),
        cell: { ...cell },
      }));
      const frames = doc.frames.slice();
      frames[a.frame] = {
        ...frame,
        cells: blankFrame(frame.holdMs, doc.width, doc.height).cells,
      };
      const inverse: Action = {
        type: 'paintCells',
        frame: a.frame,
        cells: before,
      };
      return { doc: { ...doc, frames }, inverse };
    }
    case 'moveFrame': {
      const frames = doc.frames.slice();
      const [moved] = frames.splice(a.from, 1);
      frames.splice(a.to, 0, moved);
      const next: DocState = {
        ...doc,
        frames,
        active: activeAfterMove(doc.active, a.from, a.to),
      };
      return { doc: next, inverse: { type: 'moveFrame', from: a.to, to: a.from } };
    }
    case 'setHold': {
      const frames = doc.frames.slice();
      const old = frames[a.index].holdMs;
      frames[a.index] = { ...frames[a.index], holdMs: a.holdMs };
      return { doc: { ...doc, frames }, inverse: { type: 'setHold', index: a.index, holdMs: old } };
    }
    case 'setTheme':
      return { doc: { ...doc, themeId: a.themeId }, inverse: { type: 'setTheme', themeId: doc.themeId } };
    case 'rename':
      return { doc: { ...doc, name: a.name }, inverse: { type: 'rename', name: doc.name } };
    case 'setActive':
      return { doc: { ...doc, active: a.index }, inverse: null };
    case 'load':
      return { doc: a.doc, inverse: null };
    case 'addStamp': {
      const next: DocState = { ...doc, stamps: [...doc.stamps, a.stamp] };
      return { doc: next, inverse: { type: 'deleteStamp', id: a.stamp.id } };
    }
    case 'deleteStamp': {
      const removed = doc.stamps.find((s) => s.id === a.id)!;
      const next: DocState = {
        ...doc,
        stamps: doc.stamps.filter((s) => s.id !== a.id),
      };
      return { doc: next, inverse: { type: 'addStamp', stamp: removed } };
    }
    case 'placeStamp': {
      const stamp = resolveStamp(a.stampId, doc.stamps)!;
      const rows = stamp.frames[a.stampFrame ?? 0];
      const cells = stampCellsFor(rows, a.x, a.y, a.fg, a.bg, doc.width, doc.height);
      if (cells.length === 0) {
        // Stamp is all transparent — a legal no-op.
        const noop: Action = { type: 'paintCells', frame: a.frame, cells: [] };
        return { doc, inverse: noop };
      }
      const before: PaintCell[] = cells.map((c) => ({
        x: c.x,
        y: c.y,
        cell: { ...doc.frames[a.frame].cells[cellIndex(c.x, c.y, doc.width)] },
      }));
      const next = setCells(doc, a.frame, cells);
      const inverse: Action = { type: 'paintCells', frame: a.frame, cells: before };
      return { doc: next, inverse };
    }
    case 'resizeCanvas': {
      const dx = a.dx ?? Math.floor((a.width - doc.width) / 2);
      const dy = a.dy ?? Math.floor((a.height - doc.height) / 2);
      const frames = doc.frames.map((f) => ({
        ...f,
        cells: resizeCells(f.cells, doc.width, doc.height, a.width, a.height, dx, dy),
      }));
      const next: DocState = { ...doc, width: a.width, height: a.height, frames };
      // Undo re-centers with the negated offset, restoring cells exactly —
      // even for odd size differences, where centering isn't symmetric.
      const inverse: Action = {
        type: 'resizeCanvas',
        width: doc.width,
        height: doc.height,
        dx: -dx,
        dy: -dy,
      };
      return { doc: next, inverse };
    }
  }
}
