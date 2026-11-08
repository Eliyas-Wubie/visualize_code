const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { authoringHost } = require('../test-support/authoring-host');
const { editablePath } = require('../src/edit-safety');
const { loadSymbol, renameSymbol } = require('../src/edit-symbol');
const { createEditing } = require('../src/editing');
const { CallGraph } = require('../src/graph');

test('symlink-escaped paths and rename references outside the workspace are rejected before edits', async (t) => {
  const host = await authoringHost(t, { 'main.js': 'function run() {}' });
  const outside = await authoringHost(t, { 'external.js': 'run();' });
  await fs.symlink(
    outside.directory,
    host.uri('escape').fsPath,
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await assert.rejects(editablePath(host.vscode, host.uri('escape/external.js')), (error) =>
    error.message.includes('outside the workspace'),
  );
  const item = await host.symbol('main.js', 'run');
  const snapshot = await loadSymbol(host.vscode, item);
  const edit = new host.vscode.WorkspaceEdit();
  edit.replace(outside.uri('external.js'), snapshot.selection, 'renamed');
  host.vscode.commands.executeCommand = async () => edit;
  await assert.rejects(renameSymbol(host.vscode, snapshot, 'renamed'), (error) =>
    error.message.includes('inside the open workspace'),
  );
  assert.equal(snapshot.document.text, 'function run() {}');
});

test('unexpected provider errors are sanitized in webview replies', async (t) => {
  const host = await authoringHost(t, { 'main.js': 'function run() {}' });
  const item = await host.symbol('main.js', 'run');
  const graph = new CallGraph(
    async () => [],
    (uri) => uri.toString(),
  );
  const node = graph.add(item);
  const replies = [];
  const editing = createEditing(
    host.vscode,
    () => ({ graph, root: item, options: {}, classes: { locations: new Map() } }),
    async () => {},
    (reply) => replies.push(reply),
  );
  host.vscode.commands.executeCommand = async () => {
    throw new Error('sensitive provider detail');
  };
  await editing.handle({
    type: 'editorRequest',
    mode: 'functions',
    action: 'load',
    id: node.id,
    requestId: 'request',
  });
  assert.equal(
    replies.at(-1).error,
    'Could not complete authoring. Check language support and workspace permissions.',
  );
});
