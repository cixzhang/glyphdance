// Document store: the single useDocument hook owns the document, the undo
// stack (past inverses) and the redo stack. Dispatch validates every action;
// invalid actions are rejected with a console warning and never touch state.
//
// Pointer strokes dispatch one paintCells action per pointer event, tagged
// with a stroke id. Consecutive actions of the same stroke on the same frame
// merge into a single undo step, so a whole drag undoes at once.

import { useCallback, useRef, useState } from 'react';
import type { DocState } from './document.ts';
import { applyAction, validate, type Action } from './actions.ts';

const HISTORY_CAP = 100;

function coordKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Merge a new stroke action's inverse into the previous one: earliest cell
 *  values win, so undo restores the state from before the stroke began. */
function mergeStrokeInverse(
  prev: Action,
  next: Action,
): Action | null {
  if (
    prev.type !== 'paintCells' ||
    next.type !== 'paintCells' ||
    prev.stroke === undefined ||
    prev.stroke !== next.stroke ||
    prev.frame !== next.frame
  ) {
    return null;
  }
  const seen = new Set(prev.cells.map((c) => coordKey(c.x, c.y)));
  const cells = prev.cells.concat(
    next.cells.filter((c) => !seen.has(coordKey(c.x, c.y))),
  );
  return { ...prev, cells };
}

export interface DocumentStore {
  doc: DocState;
  dispatch: (action: Action) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useDocument(initial: DocState): DocumentStore {
  // Refs mirror the state so dispatch/undo/redo never read stale closures
  // and never put side effects inside setState updaters (StrictMode-safe).
  const docRef = useRef(initial);
  const pastRef = useRef<Action[]>([]);
  const futureRef = useRef<Action[]>([]);
  const [doc, setDoc] = useState(initial);
  const [past, setPast] = useState<Action[]>([]);
  const [future, setFuture] = useState<Action[]>([]);

  const dispatch = useCallback((action: Action) => {
    const prev = docRef.current;
    const err = validate(prev, action);
    if (err) {
      console.warn(`[glyphdance] rejected action ${action.type}: ${err}`);
      return;
    }
    const { doc: next, inverse } = applyAction(prev, action);
    docRef.current = next;
    setDoc(next);
    if (action.type === 'load') {
      pastRef.current = [];
      futureRef.current = [];
      setPast([]);
      setFuture([]);
      return;
    }
    if (inverse === null) return; // setActive and friends aren't undoable
    const last = pastRef.current[pastRef.current.length - 1];
    const merged = last === undefined ? null : mergeStrokeInverse(last, inverse);
    pastRef.current =
      merged !== null
        ? [...pastRef.current.slice(0, -1), merged]
        : [...pastRef.current.slice(-HISTORY_CAP + 1), inverse];
    futureRef.current = [];
    setPast(pastRef.current);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    const last = pastRef.current[pastRef.current.length - 1];
    if (last === undefined) return;
    // The inverse is itself a legal action; applying it yields the redo.
    const { doc: next, inverse } = applyAction(docRef.current, last);
    docRef.current = next;
    pastRef.current = pastRef.current.slice(0, -1);
    if (inverse !== null) {
      futureRef.current = [...futureRef.current.slice(-HISTORY_CAP + 1), inverse];
      setFuture(futureRef.current);
    }
    setDoc(next);
    setPast(pastRef.current);
  }, []);

  const redo = useCallback(() => {
    const last = futureRef.current[futureRef.current.length - 1];
    if (last === undefined) return;
    const { doc: next, inverse } = applyAction(docRef.current, last);
    docRef.current = next;
    futureRef.current = futureRef.current.slice(0, -1);
    if (inverse !== null) {
      pastRef.current = [...pastRef.current.slice(-HISTORY_CAP + 1), inverse];
      setPast(pastRef.current);
    }
    setDoc(next);
    setFuture(futureRef.current);
  }, []);

  return { doc, dispatch, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}
