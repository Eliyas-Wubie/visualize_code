/** Register the validated panel bridge; unknown IDs cannot navigate or mutate arbitrary files. */
function mapMessages(vscode, panel, live, editing, state, actions) {
  return panel.webview.onDidReceiveMessage(async (message) => {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'cancelLoad') {
      actions.cancelLoad();
      return;
    }
    if (message.type === 'retryLoad') {
      await actions.initialize();
      return;
    }
    if (await editing.handle(message)) return;
    if (editing.applying && message.type !== 'open') return;
    if (message.type === 'ready') {
      await actions.initialize();
      return;
    }
    if (message.type === 'refresh') {
      if (!state().busy) await actions.refresh().catch(() => {});
      return;
    }
    if (message.type === 'startLive' || message.type === 'startStep') {
      await live.start(
        state().root.uri,
        state().options.app,
        message.type === 'startStep' ? state().graph : undefined,
        actions.reveal,
      );
      return;
    }
    if (message.type === 'nextStep') {
      await live.next();
      return;
    }
    if (message.type === 'stopStep') {
      await live.stop();
      return;
    }
    const { graph, classes, busy } = state();
    const item =
      graph.items.get(message.id) ||
      classes.locations.get(message.id) ||
      editing.resolve(message.id);
    if (typeof message.id !== 'string' || !item) return;
    try {
      if (message.type === 'open')
        await vscode.window.showTextDocument(item.uri, {
          selection: item.selectionRange,
          viewColumn: vscode.ViewColumn.One,
        });
      else if (message.type === 'expand' && graph.nodes.has(message.id) && !busy)
        await actions.expand(message.id);
    } catch {
      actions.send(
        message.type === 'open'
          ? 'Could not open this source location.'
          : 'Could not load calls. Check language support, then retry.',
      );
    }
  });
}

module.exports = { mapMessages };
