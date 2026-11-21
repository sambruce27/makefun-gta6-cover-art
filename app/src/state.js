// Vice Cover Studio — cover state and its undo/redo history.
//
// The state is plain data, so a history entry is just a JSON snapshot of
// everything except the photo images themselves (those live in `photos` and
// are never undone away: loading a photo is not an edit to take back).

export function freshPanels() {
  return [
    { photo: 0, scale: 1, dx: 0, dy: 0 },
    { photo: 1, scale: 1, dx: 0, dy: 0 },
    { photo: 0, scale: 1, dx: 0, dy: 0 },
    { photo: 1, scale: 1, dx: 0, dy: 0 },
  ];
}

export function freshState() {
  return {
    layout: 'quad',
    grade: 'sunset',
    kicker: 'VICE HEAT',
    title: 'SUNSET HEIST',
    subtitle: 'LEONIDA - ONE LAST SCORE',
    panels: freshPanels(),
  };
}

function snapshot(state) {
  return JSON.stringify(state);
}

function restore(state, snap) {
  const parsed = JSON.parse(snap);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, parsed);
}

// A bounded undo/redo stack over snapshots. `commit` records the state
// before an edit; `undo`/`redo` swap the live state in place so the UI
// keeps its references.
export function createHistory(state) {
  let past = [];
  let future = [];
  const LIMIT = 60;

  return {
    commit() {
      past.push(snapshot(state));
      if (past.length > LIMIT) past.shift();
      future = [];
    },
    // Records a snapshot taken before an edit (for drags and text fields,
    // where the edit happens before the event that ends it fires).
    pushSnapshot(snap) {
      past.push(snap);
      if (past.length > LIMIT) past.shift();
      future = [];
    },
    undo() {
      if (!past.length) return false;
      future.push(snapshot(state));
      restore(state, past.pop());
      return true;
    },
    redo() {
      if (!future.length) return false;
      past.push(snapshot(state));
      restore(state, future.pop());
      return true;
    },
    canUndo() { return past.length > 0; },
    canRedo() { return future.length > 0; },
  };
}
