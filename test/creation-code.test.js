const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Script } = require('node:vm');
const { spawnSync } = require('node:child_process');
const { authoringHost } = require('../test-support/authoring-host');
const { editCatalog, classTargets } = require('../src/edit-catalog');
const { createEntity } = require('../src/create-entity');
const { hierarchyModel } = require('../webview/hierarchy-model');

test('hierarchy retains real target IDs and represents missing parents without granting selectable IDs', () => {
  const entries = [
    { id: 'file-id', kind: 'file', path: 'src/features/work.py' },
    { id: 'root', kind: 'folder', path: '' },
  ];
  const tree = hierarchyModel(entries);
  assert.equal(tree.id, 'root');
  const src = tree.children.get('src');
  assert.equal(src.id, undefined);
  assert.equal(src.children.get('features').children.get('work.py').id, 'file-id');
  assert.equal(entries[0].children, undefined);
});

test('custom method bodies preserve nested indentation within tab-indented Python classes', async (t) => {
  const host = await authoringHost(t, { 'tabs.py': 'class Tabs:\n\tpass\n' });
  await host.symbol('tabs.py', 'Tabs', host.vscode.SymbolKind.Class);
  const targets = await classTargets(host.vscode, host.uri('tabs.py'));
  const entry = { id: host.uri('tabs.py').toString(), uri: host.uri('tabs.py'), kind: 'file' };
  await createEntity(
    host.vscode,
    new Map([[entry.id, entry]]),
    new Map(targets.map((target) => [target.id, target])),
    {
      kind: 'function',
      name: 'work',
      target: entry.id,
      parent: targets[0].id,
      body: 'if True:\n  return 42',
    },
  );
  const code = (await host.vscode.workspace.openTextDocument(entry.uri)).text;
  assert(code.includes('\tdef work(self):'));
  const parsed = spawnSync('python', ['-B', '-c', 'import ast,sys; ast.parse(sys.stdin.read())'], {
    input: code,
    encoding: 'utf8',
  });
  assert.equal(parsed.status, 0, parsed.stderr);
});

test('file creation includes custom contents and declaration creation includes custom code bodies', async (t) => {
  const host = await authoringHost(t, { 'work.js': '', 'worker.py': '' });
  const catalog = await editCatalog(host.vscode, host.uri());
  const entries = new Map(catalog.entries.map((entry) => [entry.id, entry]));
  const contents = 'export const answer = 42;\n';
  await createEntity(host.vscode, entries, new Map(), {
    kind: 'file',
    name: 'created.js',
    target: host.uri().toString(),
    body: contents,
  });
  assert.equal(
    (await host.vscode.workspace.openTextDocument(host.uri('created.js'))).text,
    contents,
  );
  await createEntity(host.vscode, entries, new Map(), {
    kind: 'function',
    name: 'work',
    target: host.uri('work.js').toString(),
    body: 'const value = 41;\nreturn value + 1;',
  });
  const javascript = (await host.vscode.workspace.openTextDocument(host.uri('work.js'))).text;
  assert(javascript.includes('return value + 1;'));
  assert.doesNotThrow(() => new Script(javascript));
  await createEntity(host.vscode, entries, new Map(), {
    kind: 'class',
    name: 'Worker',
    target: host.uri('worker.py').toString(),
    body: 'def work(self):\n  return 42',
  });
  const python = (await host.vscode.workspace.openTextDocument(host.uri('worker.py'))).text;
  assert(python.includes('      return 42'));
  const parsed = spawnSync('python', ['-B', '-c', 'import ast,sys; ast.parse(sys.stdin.read())'], {
    input: python,
    encoding: 'utf8',
  });
  assert.equal(parsed.status, 0, parsed.stderr);
  await assert.rejects(
    createEntity(host.vscode, entries, new Map(), {
      kind: 'folder',
      target: host.uri().toString(),
      name: 'invalid',
      body: 'code',
    }),
    (error) => error.message.includes('Folders cannot'),
  );
});
