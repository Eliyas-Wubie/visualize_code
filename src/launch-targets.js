const { extname, dirname } = require('node:path');
const { discoverWorkspace } = require('./workspace-apps');
const { modeFor } = require('./launch-options');
const { chooseAppTarget } = require('./launch-app');

/** Choose a framework-aware launch target without running files that require a framework server. */
async function chooseLaunch(vscode, uri, app) {
  if (!app && vscode.workspace.findFiles) {
    const discovered = await discoverWorkspace(vscode);
    const frameworkApp = discovered.apps.find(
      (candidate) =>
        ['React', 'Next.js', 'Vite / JavaScript'].includes(candidate.framework) &&
        candidate.files.some(
          (file) => vscode.Uri.joinPath(candidate.folder.uri, file).toString() === uri.toString(),
        ),
    );
    if (frameworkApp) app = { ...frameworkApp, selectedFile: uri.path };
  }
  const folder = app?.folder || vscode.workspace.getWorkspaceFolder(uri);
  const cwd = app
    ? vscode.Uri.joinPath(app.folder.uri, app.root === '.' ? '' : app.root).fsPath
    : folder?.uri.fsPath || dirname(uri.fsPath);
  const existing =
    vscode.workspace.getConfiguration?.('launch', folder?.uri).get('configurations', []) || [];
  const framework = app && ['React', 'Next.js', 'Vite / JavaScript'].includes(app.framework);
  const pythonFramework =
    app && ['FastAPI / Python', 'Flask / Python', 'Django / Python'].includes(app.framework);
  if (framework || pythonFramework || (app && !app.selectedFile)) {
    const selected = await chooseAppTarget(vscode, app, existing, folder, cwd);
    if (!selected) return;
    if (!selected.uri) return selected;
    uri = selected.uri;
  }
  const extension = extname(uri.fsPath);
  if (extension === '.py')
    return {
      folder,
      cwd,
      mode: 'python',
      configuration: {
        type: 'debugpy',
        request: 'launch',
        program: uri.fsPath,
        justMyCode: true,
      },
    };
  if (['.js', '.cjs', '.mjs'].includes(extension))
    return {
      folder,
      cwd,
      mode: 'node',
      configuration: {
        type: 'node',
        request: 'launch',
        program: uri.fsPath,
      },
    };
  if (existing.length) {
    const selected = await vscode.window.showQuickPick(
      existing.map((configuration) => ({ label: configuration.name, configuration })),
      { placeHolder: 'Select a debugger configuration for this file' },
    );
    if (selected)
      return {
        folder,
        cwd,
        mode: modeFor(selected.configuration),
        configuration: selected.configuration,
      };
    return;
  }
  throw new Error(
    'This file needs a framework or debugger launch configuration. Open its application map to choose a target.',
  );
}

module.exports = { chooseLaunch };
