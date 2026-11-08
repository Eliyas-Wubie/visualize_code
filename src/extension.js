const vscode = require('vscode');
const { CallGraph } = require('./graph');
const { chooseStart } = require('./start');
const { createLive } = require('./live');
const { showMap } = require('./map');
const { registerAppsView } = require('./apps-view');
const { scanApp } = require('./app-scan');
const { addReactLinks } = require('./react-links');
const { chooseMapRoot } = require('./map-root');

/** Register the workspace explorer, static flow commands, and opt-in runtime tracing. */
function activate(context) {
  const live = createLive(vscode, context);
  context.subscriptions.push(live);
  const makeGraph = (allowed) =>
    new CallGraph(
      async (item) => {
        const calls = await vscode.commands.executeCommand('vscode.provideOutgoingCalls', item);
        return allowed && Array.isArray(calls)
          ? calls.filter((call) => allowed.has(call.to.uri.toString()))
          : calls;
      },
      (uri) => vscode.workspace.asRelativePath(uri),
    );
  const trace = async (pick) => {
    try {
      const root = await chooseStart(pick);
      if (!root) return;
      const graph = makeGraph();
      graph.add(root);
      showMap(context, live, graph, root);
    } catch {
      vscode.window.showErrorMessage(
        'Could not prepare the execution flow. Check language support and try again.',
      );
    }
  };
  const openApp = async (app, file) => {
    try {
      const allowed = new Set(
        app.files.map((path) => vscode.Uri.joinPath(app.folder.uri, path).toString()),
      );
      const placeholder = {
        name: file || app.name,
        uri: vscode.Uri.joinPath(app.folder.uri, file || app.entries?.[0] || app.files[0]),
        selectionRange: { start: { line: 0, character: 0 } },
      };
      await showMap(context, live, makeGraph(allowed), placeholder, {
        app: { ...app, selectedFile: file },
        load: async (token, progress) => {
          const graph = makeGraph(allowed);
          const selected = file ? { ...app, files: [file], entries: [file] } : app;
          const result = await scanApp(vscode, selected, graph, token, progress, true);
          if (['React', 'Next.js'].includes(app.framework))
            result.warnings.push(...(await addReactLinks(vscode, graph, token)));
          const root =
            chooseMapRoot(
              graph,
              (file ? [file] : app.entries || []).map((path) =>
                vscode.Uri.joinPath(app.folder.uri, path),
              ),
            ) || placeholder;
          return { graph, root, warnings: result.warnings };
        },
      });
    } catch {
      vscode.window.showErrorMessage(
        'Could not scan this app. Refresh applications and check language support.',
      );
    }
  };
  registerAppsView(vscode, context, openApp);
  context.subscriptions.push(
    vscode.commands.registerCommand('visualizeCode.fromCursor', () => trace(false)),
    vscode.commands.registerCommand('visualizeCode.pickStart', () => trace(true)),
    vscode.commands.registerCommand('visualizeCode.runLive', () =>
      live.start(vscode.window.activeTextEditor?.document.uri),
    ),
  );
}

module.exports = { activate };
