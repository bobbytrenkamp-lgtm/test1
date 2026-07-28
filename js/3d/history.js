/* js/3d/history.js
 * Pure-logic undo/redo command stack for the 3D object editor. No DOM, no
 * THREE — callers push { undo, redo, label } command objects after they've
 * already performed an action once (the "redo" function re-performs it).
 * Node-testable (see tests/scene3d.test.js).
 */
window.SCENE3D_HISTORY = (function () {
  'use strict';

  const DEFAULT_MAX = 50;

  function createHistory(maxSize) {
    const cap = maxSize || DEFAULT_MAX;
    let undoStack = [];
    let redoStack = [];

    /* command: { undo: fn, redo: fn, label?: string }. Pushing a new command
     * clears the redo stack — the standard "new action invalidates future
     * redo" rule every undo/redo implementation follows. */
    function push(command) {
      if (!command || typeof command.undo !== 'function' || typeof command.redo !== 'function') {
        throw new Error('history.push requires { undo, redo } functions');
      }
      undoStack.push(command);
      if (undoStack.length > cap) undoStack.shift();
      redoStack = [];
    }

    function undo() {
      const cmd = undoStack.pop();
      if (!cmd) return false;
      cmd.undo();
      redoStack.push(cmd);
      return true;
    }

    function redo() {
      const cmd = redoStack.pop();
      if (!cmd) return false;
      cmd.redo();
      undoStack.push(cmd);
      return true;
    }

    function canUndo() { return undoStack.length > 0; }
    function canRedo() { return redoStack.length > 0; }
    function clear() { undoStack = []; redoStack = []; }
    function counts() { return { undo: undoStack.length, redo: redoStack.length }; }
    function peekUndoLabel() { return undoStack.length ? (undoStack[undoStack.length - 1].label || null) : null; }
    function peekRedoLabel() { return redoStack.length ? (redoStack[redoStack.length - 1].label || null) : null; }

    return { push, undo, redo, canUndo, canRedo, clear, counts, peekUndoLabel, peekRedoLabel };
  }

  return { createHistory };
})();
