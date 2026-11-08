const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMapHost } = require('../test-support/map-host');
const { authoringHost } = require('../test-support/authoring-host');

test('panel source load, provider rename, reference edits and fresh graph identities work together', async (t) => {
  const author = await authoringHost(t, { 'main.js': 'function run() {}', 'caller.js': 'run();' });
  const item = await author.symbol('main.js', 'run');
  const host = createMapHost();
  Object.assign(host.root, item);
  Object.assign(host.vscode.workspace, author.vscode.workspace);
  Object.assign(host.vscode, {
    Uri: {
      joinPath: (base, ...parts) =>
        typeof base === 'string'
          ? [base, ...parts].join('/')
          : author.vscode.Uri.joinPath(base, ...parts),
    },
    WorkspaceEdit: author.vscode.WorkspaceEdit,
    SymbolKind: author.vscode.SymbolKind,
    FileType: author.vscode.FileType,
    Range: author.vscode.Range,
    debug: {},
  });
  const execute = author.vscode.commands.executeCommand;
  host.vscode.commands.executeCommand = async (command, ...args) => {
    if (command !== 'vscode.executeDocumentRenameProvider') return execute(command, ...args);
    const edit = new author.vscode.WorkspaceEdit();
    edit.replace(item.uri, item.selectionRange, 'renamed');
    edit.replace(
      author.uri('caller.js'),
      { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
      'renamed',
    );
    return edit;
  };
  host.vscode.workspace.applyEdit = async (edit) => {
    const result = await author.vscode.workspace.applyEdit(edit);
    await author.symbol('main.js', 'renamed');
    return result;
  };
  host.openMap();
  await host.receive({ type: 'ready' });
  const before = host.messages.find((message) => message.type === 'graph');
  assert.equal(before.capabilities.authoring, true);
  await host.receive({
    type: 'editorRequest',
    action: 'load',
    mode: 'functions',
    requestId: 'load',
    id: before.root,
  });
  const loaded = host.messages.find((message) => message.requestId === 'load');
  await host.receive({
    type: 'editorRequest',
    action: 'rename',
    mode: 'functions',
    requestId: 'rename',
    token: loaded.result.token,
    name: 'renamed',
  });
  assert.equal(
    host.messages.find((message) => message.requestId === 'rename').result.applied,
    true,
  );
  const after = host.messages.filter((message) => message.type === 'graph').at(-1);
  assert.equal(after.nodes[0].name, 'renamed');
  assert.notEqual(after.root, before.root);
  assert.equal(
    (await author.vscode.workspace.openTextDocument(author.uri('caller.js'))).text,
    'renamed();',
  );
  host.close();
});
