const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { authoringHost } = require('../test-support/authoring-host');
const { editCatalog, classTargets } = require('../src/edit-catalog');
const { createEntity } = require('../src/create-entity');
const { loadSymbol, saveSymbol, renameSymbol } = require('../src/edit-symbol');
const { validEntityName, editablePath } = require('../src/edit-safety');

test('hierarchy excludes dependencies, creation rejects overwrites/traversal, empty files/folders are real resources', async (t) => {
  const host = await authoringHost(t, {
    'src/main.js': 'function run() {}',
    'node_modules/private.js': '',
  });
  const catalog = await editCatalog(host.vscode, host.uri());
  assert(!catalog.entries.some((entry) => entry.path.includes('node_modules')));
  const entries = new Map(catalog.entries.map((entry) => [entry.id, entry]));
  const target = host.uri('src').toString();
  await createEntity(host.vscode, entries, new Map(), { kind: 'folder', target, name: 'new' });
  await createEntity(host.vscode, entries, new Map(), { kind: 'file', target, name: 'empty.py' });
  assert((await fs.stat(host.uri('src/new').fsPath)).isDirectory());
  assert.equal(await fs.readFile(host.uri('src/empty.py').fsPath, 'utf8'), '');
  await assert.rejects(
    createEntity(host.vscode, entries, new Map(), { kind: 'file', target, name: 'main.js' }),
    (error) => error.message.includes('already exists'),
  );
  await assert.rejects(
    createEntity(host.vscode, entries, new Map(), { kind: 'file', target, name: '../outside.js' }),
    (error) => error.message.includes('valid single'),
  );
  for (const name of ['..', '.git', 'CON.txt', 'bad/name', 'bad\0name'])
    assert(!validEntityName(name));
  host.vscode.workspace.isTrusted = false;
  await assert.rejects(editablePath(host.vscode, host.uri('src/main.js')), (error) =>
    error.message.includes('trusted'),
  );
});

test('source save rejects stale versions and direct identifier changes, but applies body edits through WorkspaceEdit', async (t) => {
  const host = await authoringHost(t, { 'main.js': 'function run() { return 1; }' });
  const item = await host.symbol('main.js', 'run');
  const snapshot = await loadSymbol(host.vscode, item);
  await assert.rejects(saveSymbol(host.vscode, snapshot, 'function other() {}'), (error) =>
    error.message.includes('Rename references'),
  );
  await assert.rejects(saveSymbol(host.vscode, snapshot, 'function runner() {}'), (error) =>
    error.message.includes('Rename references'),
  );
  await saveSymbol(host.vscode, snapshot, snapshot.source.replace('return 1', 'return 2'));
  assert((await host.vscode.workspace.openTextDocument(item.uri)).text.includes('return 2'));
  await assert.rejects(saveSymbol(host.vscode, snapshot, snapshot.source), (error) =>
    error.message.includes('Source changed'),
  );
});

test('semantic rename applies provider edits to declaration and callers, and never uses a text fallback', async (t) => {
  const host = await authoringHost(t, { 'main.js': 'function run() {}', 'caller.js': 'run();' });
  const item = await host.symbol('main.js', 'run');
  const snapshot = await loadSymbol(host.vscode, item);
  const edit = new host.vscode.WorkspaceEdit();
  edit.replace(item.uri, snapshot.selection, 'execute');
  edit.replace(
    host.uri('caller.js'),
    { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
    'execute',
  );
  host.vscode.commands.executeCommand = async (command) =>
    command === 'vscode.executeDocumentRenameProvider' ? edit : [];
  await renameSymbol(host.vscode, snapshot, 'execute');
  assert.equal(
    (await host.vscode.workspace.openTextDocument(host.uri('caller.js'))).text,
    'execute();',
  );
  assert.equal(
    (await host.vscode.workspace.openTextDocument(item.uri)).text,
    'function execute() {}',
  );
  const fresh = { ...snapshot, version: snapshot.document.version, name: 'execute' };
  host.vscode.commands.executeCommand = async () => undefined;
  await assert.rejects(renameSymbol(host.vscode, fresh, 'again'), (error) =>
    error.message.includes('No rename edits'),
  );
});

test('class hierarchy supports method insertion in JavaScript and Python with valid indentation', async (t) => {
  for (const [path, text, name] of [
    ['main.js', 'class Worker {}', 'Worker'],
    ['main.py', 'class Worker:\n    pass', 'Worker'],
    ['tabs.py', 'class Worker:\n\tpass', 'Worker'],
  ]) {
    const host = await authoringHost(t, { [path]: text });
    await host.symbol(path, name, host.vscode.SymbolKind.Class);
    const targets = await classTargets(host.vscode, host.uri(path));
    const file = { id: host.uri(path).toString(), kind: 'file', uri: host.uri(path) };
    await createEntity(
      host.vscode,
      new Map([[file.id, file]]),
      new Map(targets.map((target) => [target.id, target])),
      { kind: 'function', name: 'work', target: file.id, parent: targets[0].id },
    );
    const source = (await host.vscode.workspace.openTextDocument(file.uri)).text;
    assert(
      source.includes(
        path === 'tabs.py'
          ? '\tdef work(self):'
          : path.endsWith('.py')
            ? '    def work(self):'
            : '  work()',
      ),
    );
    if (path.endsWith('.js')) assert.doesNotThrow(() => new (require('node:vm').Script)(source));
    else {
      const result = require('node:child_process').spawnSync(
        'python',
        ['-B', '-c', 'import ast,sys; ast.parse(sys.stdin.read())'],
        { input: source, encoding: 'utf8' },
      );
      assert.equal(result.status, 0, result.stderr);
    }
  }
});
