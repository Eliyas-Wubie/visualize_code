const { discoverWorkspace, MARKERS } = require('./workspace-apps');

/** Register the Activity Bar app explorer, refresh command, and app-wide map action. */
function registerAppsView(vscode, context, openApp) {
  const changed = new vscode.EventEmitter();
  let result;
  let scanning;
  const load = () =>
    (scanning ||= discoverWorkspace(vscode)
      .then((value) => {
        result = value;
        return value;
      })
      .catch(() => {
        result = { apps: [], issues: ['Could not discover workspace apps. Refresh to retry.'] };
        return result;
      })
      .finally(() => {
        scanning = undefined;
      }));
  const provider = {
    onDidChangeTreeData: changed.event,
    getTreeItem: (item) => item,
    getChildren: async (parent) => {
      if (parent?.app)
        return [
          {
            label: 'Open entire app map',
            command: {
              command: 'visualizeCode.scanApp',
              title: 'Scan app',
              arguments: [parent.app.id],
            },
          },
          ...parent.app.entries.slice(0, 100).map((file) => ({
            label: file,
            command: {
              command: 'visualizeCode.scanFile',
              title: 'Visualize file',
              arguments: [parent.app.id, file],
            },
          })),
        ];
      const data = result || (await load());
      return [
        ...data.apps.map((app) => ({
          label: app.name,
          description: app.framework,
          tooltip: `${app.folder.name}/${app.root} — ${app.files.length} source files; ${app.entries.length} entry candidates`,
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
          contextValue: 'visualizeApp',
          app,
          iconPath: new vscode.ThemeIcon(app.language === 'py' ? 'symbol-namespace' : 'project'),
          command: { command: 'visualizeCode.scanApp', title: 'Open app map', arguments: [app.id] },
        })),
        ...data.issues.map((label) => ({ label, iconPath: new vscode.ThemeIcon('warning') })),
        ...(data.apps.length ? [] : [{ label: 'Open a project folder, then refresh.' }]),
      ];
    },
  };
  const refresh = async () => {
    await load();
    changed.fire();
  };
  const watcher = vscode.workspace.createFileSystemWatcher(MARKERS);
  const invalidate = () => {
    result = undefined;
    changed.fire();
  };
  context.subscriptions.push(
    changed,
    watcher,
    watcher.onDidCreate(invalidate),
    watcher.onDidDelete(invalidate),
    watcher.onDidChange(invalidate),
    vscode.window.registerTreeDataProvider('visualizeCode.apps', provider),
    vscode.commands.registerCommand('visualizeCode.refreshApps', refresh),
    vscode.commands.registerCommand('visualizeCode.scanFile', async (id, file) => {
      const data = result || (await load());
      const app = data.apps.find((candidate) => candidate.id === id);
      if (app && app.files.includes(file)) await openApp(app, file);
    }),
    vscode.commands.registerCommand('visualizeCode.scanApp', async (id) => {
      const data = result || (await load());
      if (!id) {
        const picked = await vscode.window.showQuickPick(
          data.apps.map((app) => ({
            label: app.name,
            description: `${app.framework} / ${app.root}`,
            id: app.id,
          })),
          { placeHolder: 'Choose an application to map' },
        );
        id = picked?.id;
      }
      const app = data.apps.find((candidate) => candidate.id === id);
      if (app) await openApp(app);
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      result = undefined;
      changed.fire();
    }),
  );
}

module.exports = { registerAppsView };
