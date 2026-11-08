const vscode = require('vscode');
const { render } = require('./panel');
const { createGraphEnricher } = require('./enrich-graph');
const { liveSnapshot } = require('./live-match');
const { diagnosticSnapshot } = require('./diagnostics');
const { createEditing } = require('./editing');
const { refreshMap } = require('./refresh-map');
const { mapMessages } = require('./map-messages');
const { observeMapSources } = require('./map-sources');
const { sendMapState } = require('./map-state');

/** Open and dispose an editable graph panel; bridge, source invalidation and refactoring retain separate responsibilities. */
function showMap(context, live, graph, root, options = {}) {
  let { enrich, classes } = createGraphEnricher(vscode, graph);
  const title = options.app?.selectedFile || options.app?.name || root.name;
  const panel = vscode.window.createWebviewPanel('executionFlow', title, vscode.ViewColumn.Beside, {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
  });
  let disposed = false;
  let busy = false;
  let loadToken;
  const state = () => ({ graph, classes, root, options, busy });
  const post = (message) => {
    if (!disposed) panel.webview.postMessage(message);
  };
  const send = (error) => {
    if (!disposed) sendMapState(vscode, post, live, state(), editing, error);
  };
  const refresh = async (extras = [], reloadCatalog = true) => {
    if (disposed) return;
    busy = true;
    try {
      if (reloadCatalog && vscode.workspace.isTrusted) await editing.catalog();
      const next = await refreshMap(vscode, graph, root, options, extras);
      if (disposed) return;
      graph = next.graph;
      root = next.root;
      options.canvasScope = next.scope;
      options.warnings = next.warnings;
      ({ enrich, classes } = createGraphEnricher(vscode, graph));
      await enrich();
      if (!options.app) panel.title = graph.nodes.size ? root.name : 'Source map';
      send();
    } catch {
      send(
        'Source changed, but the map is stale. Use Refresh map after language support is ready.',
      );
      throw new Error('Map refresh failed.');
    } finally {
      busy = false;
    }
  };
  const editing = createEditing(vscode, state, refresh, post);
  const sourceListener = observeMapSources(vscode, state, editing, refresh);
  const liveListener = live.subscribe(() => {
    if (!disposed) {
      post(liveSnapshot(graph, live.state));
    }
  });
  const diagnosticsListener = vscode.languages.onDidChangeDiagnostics(() => {
    if (!disposed)
      post(diagnosticSnapshot(graph, (uri) => vscode.languages.getDiagnostics(uri), classes));
  });
  const initialize = async () => {
    if (busy) return;
    busy = true;
    const token = { isCancellationRequested: false };
    loadToken = token;
    const progress = {
      report: ({ message }) => {
        if (!token.isCancellationRequested) post({ type: 'loading', message });
      },
    };
    progress.report({ message: 'Preparing code map…' });
    try {
      if (options.load) {
        const next = await options.load(token, progress);
        if (disposed || token.isCancellationRequested) return;
        graph = next.graph;
        root = next.root;
        options.warnings = next.warnings;
        ({ enrich, classes } = createGraphEnricher(vscode, graph));
      }
      progress.report({ message: 'Loading function details…' });
      if (vscode.workspace.isTrusted) {
        try {
          await editing.catalog();
        } catch {
          options.warnings = [
            ...(options.warnings || []),
            'Authoring hierarchy unavailable. Check workspace permissions.',
          ];
        }
      }
      await enrich();
      if (disposed || token.isCancellationRequested) return;
      send();
      post({ type: 'loading', status: 'ready' });
    } catch {
      if (!token.isCancellationRequested)
        post({
          type: 'loading',
          status: 'error',
          message:
            'Could not load the map yet. Wait for JavaScript/TypeScript or Python/Pylance language support, then retry.',
        });
    } finally {
      if (loadToken === token) busy = false;
    }
  };
  const expand = async (id) => {
    busy = true;
    try {
      await graph.expand(id);
      await enrich();
      send();
    } finally {
      busy = false;
    }
  };
  const listener = mapMessages(vscode, panel, live, editing, state, {
    initialize,
    cancelLoad: () => {
      if (loadToken) loadToken.isCancellationRequested = true;
      busy = false;
      post({ type: 'loading', status: 'cancelled', message: 'Loading cancelled.' });
    },
    expand,
    refresh,
    send,
    reveal: () => {
      if (!disposed) panel.reveal(panel.viewColumn, false);
    },
  });
  panel.onDidDispose(() => {
    disposed = true;
    if (loadToken) loadToken.isCancellationRequested = true;
    for (const item of [listener, liveListener, diagnosticsListener, sourceListener])
      item.dispose();
  });
  panel.webview.html = render(panel.webview, context.extensionUri);
}

module.exports = { showMap };
