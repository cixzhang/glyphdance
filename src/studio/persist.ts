// persist.ts — localStorage autosave for the document.
//
// The document is plain JSON-serializable data, so autosave is just a
// debounced JSON dump under a versioned key. Deserialization re-validates
// the shape and falls back to null on anything unexpected.

import {
  GRID_H,
  GRID_W,
  MAX_CANVAS_H,
  MAX_CANVAS_W,
  MIN_CANVAS_H,
  MIN_CANVAS_W,
  emptyCell,
  type Cell,
  type CustomStamp,
  type DocState,
  type Frame,
} from './document.ts';

export const DOC_STORAGE_KEY = 'glyphdance.doc.v1';
// v2 adds canvas width/height; v1 saves are accepted and default to 24x14.
const FORMAT_VERSION = 2;

function isCell(c: unknown): c is Cell {
  if (typeof c !== 'object' || c === null) return false;
  const o = c as Record<string, unknown>;
  return (
    typeof o.ch === 'string' &&
    o.ch.length <= 1 &&
    typeof o.fg === 'string' &&
    typeof o.bg === 'string'
  );
}

function sanitizeStamp(s: unknown): CustomStamp | null {
  if (typeof s !== 'object' || s === null) return null;
  const o = s as Record<string, unknown>;
  if (typeof o.id !== 'string' || !/^[a-z0-9-]{1,20}$/.test(o.id)) return null;
  if (typeof o.fg !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(o.fg)) return null;
  if (!Array.isArray(o.frames) || o.frames.length < 1 || o.frames.length > 4)
    return null;
  const frames: string[][] = [];
  for (const f of o.frames) {
    if (!Array.isArray(f) || f.length < 1 || f.length > 8) return null;
    const rows: string[] = [];
    for (const r of f) {
      if (typeof r !== 'string') return null;
      const len = [...r].length;
      if (len < 1 || len > 12) return null;
      rows.push(r);
    }
    frames.push(rows);
  }
  return { id: o.id, fg: o.fg, frames };
}

function sanitizeFrame(
  f: unknown,
  index: number,
  width: number,
  height: number,
): Frame | null {
  if (typeof f !== 'object' || f === null) return null;
  const o = f as Record<string, unknown>;
  if (!Array.isArray(o.cells) || o.cells.length !== width * height) return null;
  if (!o.cells.every(isCell)) return null;
  const holdMs =
    typeof o.holdMs === 'number' && o.holdMs > 0 ? Math.min(10000, o.holdMs) : 400;
  const id =
    typeof o.id === 'string' && o.id.length > 0 ? o.id : `restored-${index}`;
  return { id, cells: o.cells as Cell[], holdMs };
}

/** Parse a stored JSON string back into a DocState, or null if invalid. */
export function deserializeDoc(json: string): DocState | null {
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    if (typeof o !== 'object' || o === null) return null;
    // v1 saves predate canvas width/height — they were always 24x14.
    const v = o.v === 1 ? 1 : o.v === FORMAT_VERSION ? 2 : null;
    if (v === null) return null;
    const width =
      v === 2 &&
      Number.isInteger(o.width) &&
      (o.width as number) >= MIN_CANVAS_W &&
      (o.width as number) <= MAX_CANVAS_W
        ? (o.width as number)
        : GRID_W;
    const height =
      v === 2 &&
      Number.isInteger(o.height) &&
      (o.height as number) >= MIN_CANVAS_H &&
      (o.height as number) <= MAX_CANVAS_H
        ? (o.height as number)
        : GRID_H;
    if (typeof o.name !== 'string' || o.name.length === 0) return null;
    if (!Array.isArray(o.frames) || o.frames.length === 0) return null;
    const frames: Frame[] = [];
    for (let i = 0; i < o.frames.length; i++) {
      const sf = sanitizeFrame(o.frames[i], i, width, height);
      if (!sf) return null;
      frames.push(sf);
    }
    const active =
      typeof o.active === 'number' &&
      Number.isInteger(o.active) &&
      o.active >= 0 &&
      o.active < frames.length
        ? o.active
        : 0;
    const themeId = typeof o.themeId === 'string' ? o.themeId : 'dracula';
    const fontId = typeof o.fontId === 'string' ? o.fontId : 'cozette';
    const stamps: CustomStamp[] = [];
    if (Array.isArray(o.stamps)) {
      const seen = new Set<string>();
      for (const s of o.stamps) {
        const ss = sanitizeStamp(s);
        if (!ss || seen.has(ss.id)) return null;
        seen.add(ss.id);
        stamps.push(ss);
      }
    }
    return { name: o.name, frames, active, themeId, fontId, stamps, width, height };
  } catch {
    return null;
  }
}

/** Serialize a DocState for storage. */
export function serializeDoc(doc: DocState): string {
  return JSON.stringify({
    v: FORMAT_VERSION,
    name: doc.name,
    themeId: doc.themeId,
    width: doc.width,
    height: doc.height,
    active: doc.active,
    frames: doc.frames.map((f) => ({ id: f.id, cells: f.cells, holdMs: f.holdMs })),
    stamps: doc.stamps,
  });
}

/** Read the autosaved document, or null when there is none / it's invalid. */
export function loadAutosavedDoc(): DocState | null {
  try {
    const raw = localStorage.getItem(DOC_STORAGE_KEY);
    if (!raw) return null;
    return deserializeDoc(raw);
  } catch {
    return null;
  }
}

/** Write the autosaved document. Failures (private mode, quota) are silent. */
export function saveAutosavedDoc(doc: DocState): void {
  try {
    localStorage.setItem(DOC_STORAGE_KEY, serializeDoc(doc));
  } catch {
    /* storage unavailable — the session just won't persist */
  }
}

/** Clear the autosaved document (used by "reset to demo"). */
export function clearAutosavedDoc(): void {
  try {
    localStorage.removeItem(DOC_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** A blank single-frame document, for "new" flows. */
export function blankDoc(name = 'untitled'): DocState {
  const cells: Cell[] = [];
  for (let i = 0; i < GRID_W * GRID_H; i++) cells.push(emptyCell());
  return {
    name,
    width: GRID_W,
    height: GRID_H,
    frames: [{ id: 'restored-0', cells, holdMs: 400 }],
    active: 0,
    stamps: [],
    themeId: 'dracula',
    fontId: 'cozette',
  };
}
