// Typed action layer: every document mutation is a plain-data action that is
// validated before it runs and carries its own inverse for undo. Humans
// (toolbar, canvas, timeline) and the agent dispatch the same actions, so the
// agent can do everything the user can — visibly, in the op log.

import {
  blankFrame,
  cellIndex,
  cloneFrame,
  inBounds,
  type Cell,
  type DocState,
  type Frame,
} from './document.ts';
import { SYNTAX_THEMES } from './scene.ts';

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
  | { type: 'moveFrame'; from: number; to: number }
  | { type: 'setHold'; index: number; holdMs: number }
  | { type: 'setTheme'; themeId: string }
  | { type: 'rename'; name: string }
  /** Selection — applies, but is never recorded for undo. */
  | { type: 'setActive'; index: number }
  /** Whole-document replace (import, demo reset) — clears history. */
  | { type: 'load'; doc: DocState };

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
        if (!inBounds(c.x, c.y)) return `cell (${c.x},${c.y}) out of bounds`;
        if (typeof c.cell.ch !== 'string' || c.cell.ch.length !== 1)
          return `cell (${c.x},${c.y}) needs a single character`;
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
    case 'rename':
      if (!a.name.trim()) return 'name cannot be empty';
      return null;
    case 'setActive':
      if (!validFrame(doc, a.index)) return `no frame ${a.index}`;
      return null;
    case 'load':
      if (a.doc.frames.length === 0) return 'document needs at least one frame';
      return null;
  }
}

export interface Applied {
  doc: DocState;
  /** How to undo this action; null when the action isn't undoable. */
  inverse: Action | null;
}

function setCells(doc: DocState, frameIdx: number, cells: PaintCell[]): DocState {
  const frames = doc.frames.slice();
  const frameCells = frames[frameIdx].cells.slice();
  for (const c of cells) frameCells[cellIndex(c.x, c.y)] = { ...c.cell };
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
        cell: { ...doc.frames[a.frame].cells[cellIndex(c.x, c.y)] },
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
      frames.splice(a.after + 1, 0, blankFrame());
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
  }
}
