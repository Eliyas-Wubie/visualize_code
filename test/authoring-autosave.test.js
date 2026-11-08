const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { authoringHost } = require('../test-support/authoring-host');
const { loadSymbol, saveSymbol, renameSymbol } = require('../src/edit-symbol');
const { saveFile } = require('../src/edit-file');
const { createEntity } = require('../src/create-entity');
const { editCatalog } = require('../src/edit-catalog');

test('editing source and creating declarations/files saves their actual disk contents', async (t) => {
  const host = await authoringHost(t, { 'main.js': 'function run() {}', 'data.txt': 'old' });
  const item = await host.symbol('main.js', 'run');
  const snapshot = await loadSymbol(host.vscode, item);
  assert.equal(
    (await saveSymbol(host.vscode, snapshot, 'function run() { return 1; }')).saved,
    true,
  );
  assert.equal(await fs.readFile(item.uri.fsPath, 'utf8'), 'function run() { return 1; }');
  const document = await host.vscode.workspace.openTextDocument(host.uri('data.txt'));
  await saveFile(host.vscode, { uri: document.uri, version: document.version }, 'new');
  assert.equal(await fs.readFile(document.uri.fsPath, 'utf8'), 'new');
  const catalog = await editCatalog(host.vscode, host.uri());
  const entries = new Map(catalog.entries.map((entry) => [entry.id, entry]));
  await createEntity(host.vscode, entries, new Map(), {
    kind: 'file',
    name: 'created.js',
    target: host.uri().toString(),
    body: 'const value = 42;',
  });
  assert.equal(await fs.readFile(host.uri('created.js').fsPath, 'utf8'), 'const value = 42;');
  await createEntity(host.vscode, entries, new Map(), {
    kind: 'function',
    name: 'second',
    target: host.uri('main.js').toString(),
  });
  assert((await fs.readFile(item.uri.fsPath, 'utf8')).includes('function second()'));
});

test('rename saves declaration and reference files while leaving unrelated dirty documents unsaved', async (t) => {
  const host = await authoringHost(t, {
    'main.js': 'function run() {}',
    'caller.js': 'run();',
    'unrelated.js': 'original',
  });
  const item = await host.symbol('main.js', 'run');
  const snapshot = await loadSymbol(host.vscode, item);
  const unrelated = await host.vscode.workspace.openTextDocument(host.uri('unrelated.js'));
  unrelated.text = 'unsaved unrelated work';
  const edit = new host.vscode.WorkspaceEdit();
  edit.replace(item.uri, snapshot.selection, 'execute');
  edit.replace(
    host.uri('caller.js'),
    { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
    'execute',
  );
  host.vscode.commands.executeCommand = async () => edit;
  const result = await renameSymbol(host.vscode, snapshot, 'execute');
  assert.equal(result.saved, true);
  assert.equal(await fs.readFile(item.uri.fsPath, 'utf8'), 'function execute() {}');
  assert.equal(await fs.readFile(host.uri('caller.js').fsPath, 'utf8'), 'execute();');
  assert.equal(await fs.readFile(unrelated.uri.fsPath, 'utf8'), 'original');
  assert.equal(host.saved.length, 2);
});

test('save failures keep applied edits in memory and report partial success without hiding failed files', async (t) => {
  const host = await authoringHost(t, { 'main.js': 'function run() {}', 'caller.js': 'run();' });
  const item = await host.symbol('main.js', 'run');
  const snapshot = await loadSymbol(host.vscode, item);
  const caller = await host.vscode.workspace.openTextDocument(host.uri('caller.js'));
  caller.save = async () => false;
  const edit = new host.vscode.WorkspaceEdit();
  edit.replace(item.uri, snapshot.selection, 'execute');
  edit.replace(
    caller.uri,
    { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
    'execute',
  );
  host.vscode.commands.executeCommand = async () => edit;
  const result = await renameSymbol(host.vscode, snapshot, 'execute');
  assert.equal(result.saved, false);
  assert(result.warning.includes('could not save: caller.js'));
  assert.equal(caller.text, 'execute();');
  assert.equal(await fs.readFile(caller.uri.fsPath, 'utf8'), 'run();');
  assert.equal(await fs.readFile(item.uri.fsPath, 'utf8'), 'function execute() {}');
});
