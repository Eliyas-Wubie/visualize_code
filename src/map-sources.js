/** Debounce changed mapped/catalog documents across panels, retaining invalidations while a scan is busy. */
function observeMapSources(vscode, state, editing, refresh, timers = { setTimeout, clearTimeout }) {
  const pending = new Map();
  let timer;
  let disposed = false;
  const flush = () => {
    if (disposed) return;
    if (state().busy || editing.applying) {
      timer = timers.setTimeout(flush, 250);
      return;
    }
    const uris = [...pending.values()];
    pending.clear();
    refresh(uris).catch(() => {});
  };
  const listener = vscode.workspace.onDidChangeTextDocument?.((event) => {
    // Dirty/save/encoding notifications can contain no text edits and must not rebuild the map.
    if (disposed || editing.applying || event.contentChanges?.length === 0) return;
    const id = event.document.uri.toString();
    if (
      !editing.resolve(id) &&
      ![...state().graph.items.values()].some((item) => item.uri.toString() === id)
    )
      return;
    pending.set(id, event.document.uri);
    timers.clearTimeout(timer);
    timer = timers.setTimeout(flush, 600);
  });
  return {
    dispose() {
      disposed = true;
      timers.clearTimeout(timer);
      listener?.dispose();
    },
  };
}

module.exports = { observeMapSources };
