const vscode = require('vscode');
const { render } = require('./panel');
const { createGraphEnricher } = require('./enrich-graph');
const { liveSnapshot } = require('./live-match');
const { diagnosticSnapshot } = require('./diagnostics');

/** Open an interactive map for a selected flow or a pre-scanned application. */
function showMap(context, live, graph, root, options = {}) {
  const first = graph.nodes.values().next().value;
  const { enrich, classes } = createGraphEnricher(vscode, graph);
  const title = options.app?.selectedFile || options.app?.name || root.name;
  const panel = vscode.window.createWebviewPanel('executionFlow', title, vscode.ViewColumn.Beside, {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
  });
  let disposed = false;
  let busy = false;
  const send = (error) => {
    if (!disposed)
      panel.webview.postMessage({
        type: 'graph',
        root: first.id,
        ...graph.snapshot(),
        capabilities: { live: true },
        app: options.app && {
          name: options.app.name,
          framework: options.app.framework,
          selectedFile: options.app.selectedFile,
        },
        warnings: options.warnings || [],
        error,
      });
    if (!disposed) panel.webview.postMessage(liveSnapshot(graph, live.state));
    if (!disposed)
      panel.webview.postMessage(
        diagnosticSnapshot(graph, (uri) => vscode.languages.getDiagnostics(uri)),
      );
  };
  const liveListener = live.subscribe(() => {
    if (!disposed) panel.webview.postMessage(liveSnapshot(graph, live.state));
  });
  const diagnosticsListener = vscode.languages.onDidChangeDiagnostics(() => {
    if (!disposed)
      panel.webview.postMessage(
        diagnosticSnapshot(graph, (uri) => vscode.languages.getDiagnostics(uri)),
      );
  });
  const listener = panel.webview.onDidReceiveMessage(async (message) => {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'startLive') {
      await live.start(root.uri, options.app);
      return;
    }
    if (message.type === 'ready') {
      await enrich();
      send();
      return;
    }
    if (
      typeof message.id !== 'string' ||
      (!graph.items.has(message.id) && !classes.locations.has(message.id))
    )
      return;
    try {
      if (message.type === 'open') {
        const item = graph.items.get(message.id) || classes.locations.get(message.id);
        await vscode.window.showTextDocument(item.uri, {
          selection: item.selectionRange,
          viewColumn: vscode.ViewColumn.One,
        });
      } else if (message.type === 'expand' && graph.nodes.has(message.id) && !busy) {
        busy = true;
        await graph.expand(message.id);
        await enrich();
        send();
      }
    } catch {
      send(
        message.type === 'open'
          ? 'Could not open this source location.'
          : 'Could not load calls. Check language support, then retry.',
      );
    } finally {
      if (message.type === 'expand') busy = false;
    }
  });
  panel.onDidDispose(() => {
    disposed = true;
    listener.dispose();
    liveListener.dispose();
    diagnosticsListener.dispose();
  });
  panel.webview.html = render(panel.webview, context.extensionUri);
}

module.exports = { showMap };
