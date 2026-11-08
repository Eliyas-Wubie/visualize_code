const { liveSnapshot } = require('./live-match');
const { diagnosticSnapshot } = require('./diagnostics');
const { canvasClasses } = require('./canvas-scope');

/** Publish graph metadata and matching health/runtime snapshots without exposing host-owned URI objects. */
function sendMapState(vscode, post, live, state, editing, error) {
  const { graph, options, root } = state;
  const declarations = canvasClasses(state);
  post({
    type: 'graph',
    root: [...graph.items].find(([, item]) => item === root)?.[0],
    ...graph.snapshot(),
    capabilities: {
      live: true,
      authoring: vscode.workspace.isTrusted === true && state.root.uri.scheme === 'file',
    },
    resources: editing.resources(),
    classEntries: declarations.slice(0, graph.limit),
    app: options.app && {
      name: options.app.name,
      framework: options.app.framework,
      selectedFile: options.app.selectedFile,
    },
    warnings: [
      ...(options.warnings || []),
      ...(editing.limited ? ['Authoring hierarchy limited to 600 entries.'] : []),
      ...(declarations.length > graph.limit
        ? [`Additional standalone classes omitted after ${graph.limit} declarations.`]
        : []),
    ],
    error,
  });
  post(liveSnapshot(graph, live.state));
  post(diagnosticSnapshot(graph, (uri) => vscode.languages.getDiagnostics(uri), state.classes));
}

module.exports = { sendMapState };
