const { CallGraph } = require('./graph');
const { scanApp } = require('./app-scan');
const { addReactLinks } = require('./react-links');

const { resolveCanvasScope } = require('./canvas-scope');

/** Rebuild the original app/file/trace scope; changed URI hints never become additional graph roots. */
async function refreshMap(vscode, previous, root, options, _extras = []) {
  const scope = options.canvasScope || (await resolveCanvasScope(vscode, root, options));
  const graph = new CallGraph(
    async (item) => {
      const calls = await vscode.commands.executeCommand('vscode.provideOutgoingCalls', item);
      return scope.allowed && Array.isArray(calls)
        ? calls.filter((call) => scope.allowed.has(call.to.uri.toString()))
        : calls;
    },
    previous.label,
    previous.limit,
  );
  const token = { isCancellationRequested: false };
  const warnings = [...scope.warnings];
  const scanned =
    scope.kind === 'trace'
      ? new CallGraph(graph.provideCalls, previous.label, previous.limit)
      : graph;
  if (scope.seedUris.length > 300) warnings.push('Only the first 300 source files were scanned.');
  for (const uri of scope.seedUris.slice(0, 300)) {
    if (scanned.nodes.size >= scanned.limit) break;
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) continue;
    const file = uri.path.slice(folder.uri.path.length + 1);
    const result = await scanApp(vscode, { folder, files: [file] }, scanned, token, {
      report() {},
    });
    warnings.push(...result.warnings);
  }
  const candidates = [...scanned.items.values()].filter(
    (item) => item.uri.toString() === root.uri.toString(),
  );
  const nextRoot =
    candidates.find((item) => item.name === root.name) ||
    candidates.find(
      (item) =>
        item.selectionRange.start.line === root.selectionRange.start.line &&
        item.selectionRange.start.character === root.selectionRange.start.character,
    );
  if (scope.kind === 'trace') {
    graph.sourceUris = [root.uri];
    if (nextRoot) {
      const node = graph.add(nextRoot);
      const metadata = [...scanned.nodes.values()].find(
        (entry) => scanned.items.get(entry.id) === nextRoot,
      );
      Object.assign(node, metadata);
    } else warnings.push('Starting function was not found. Choose a new starting point.');
  }
  for (let index = 0; index < graph.nodes.size; index++) {
    const node = [...graph.nodes.values()][index];
    if (!node.loaded) {
      try {
        await graph.expand(node.id);
      } catch {
        warnings.push(
          `Calls unavailable for ${node.name}; refresh after language support is ready.`,
        );
      }
    }
  }
  if (['React', 'Next.js'].includes(options.app?.framework))
    warnings.push(...(await addReactLinks(vscode, graph, token)));
  return { graph, root: nextRoot || root, warnings, scope };
}

module.exports = { refreshMap };
