const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registerAppsView } = require('../src/apps-view');

test('Activity Bar explorer discovers an app, exposes entry candidates, and dispatches its full map', async () => {
  const commands = new Map();
  let provider;
  let opened;
  let selectedFile;
  const uri = (path) => ({ path, toString: () => `file://${path}` });
  const folder = { name: 'repo', uri: uri('/repo') };
  const marker = uri('/repo/web/package.json');
  const source = uri('/repo/web/src/App.jsx');
  const disposable = () => ({ dispose() {} });
  const vscode = {
    EventEmitter: class {
      event = () => {};
      fire() {}
      dispose() {}
    },
    ThemeIcon: class {
      constructor(name) {
        this.name = name;
      }
    },
    RelativePattern: class {
      constructor(_, pattern) {
        this.pattern = pattern;
      }
    },
    TreeItemCollapsibleState: { Collapsed: 1 },
    Uri: { joinPath: (base, part) => uri(`${base.path}/${part}`) },
    commands: {
      registerCommand: (name, fn) => {
        commands.set(name, fn);
        return disposable();
      },
    },
    window: {
      registerTreeDataProvider: (_, value) => {
        provider = value;
        return disposable();
      },
    },
    workspace: {
      workspaceFolders: [folder],
      findFiles: async (pattern) =>
        pattern.pattern.includes('package.json') ? [marker] : [source],
      fs: {
        stat: async () => ({ size: 50 }),
        readFile: async () => Buffer.from('{"name":"web","dependencies":{"react":"1"}}'),
      },
      onDidChangeWorkspaceFolders: disposable,
      createFileSystemWatcher: () => ({
        dispose() {},
        onDidCreate: disposable,
        onDidDelete: disposable,
        onDidChange: disposable,
      }),
    },
  };
  registerAppsView(vscode, { subscriptions: [] }, async (app, file) => {
    opened = app;
    selectedFile = file;
  });
  const roots = await provider.getChildren();
  assert.equal(roots[0].label, 'web');
  assert.equal(roots[0].description, 'React');
  const children = await provider.getChildren(roots[0]);
  assert.equal(children[0].label, 'Open entire app map');
  assert.equal(children[1].label, 'web/src/App.jsx');
  assert.equal(children[1].command.command, 'visualizeCode.scanFile');
  await commands.get(children[1].command.command)(...children[1].command.arguments);
  assert.equal(selectedFile, 'web/src/App.jsx');
  selectedFile = undefined;
  await commands.get('visualizeCode.scanFile')(roots[0].app.id, '../outside.js');
  assert.equal(selectedFile, undefined);
  await commands.get('visualizeCode.scanApp')(roots[0].app.id);
  assert.equal(opened.framework, 'React');
});
