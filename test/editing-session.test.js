const { test } = require('node:test');
const assert = require('node:assert/strict');
const { authoringHost } = require('../test-support/authoring-host');
const { createEditing } = require('../src/editing');
const { refreshMap } = require('../src/refresh-map');
const { CallGraph } = require('../src/graph');

test('authoring service rejects architecture/forged targets and reports applied edits even if refresh fails', async (t) => {
  const host = await authoringHost(t, { 'main.js': 'function run() {}' });
  const item = await host.symbol('main.js', 'run');
  const graph = new CallGraph(
    async () => [],
    (uri) => host.vscode.workspace.asRelativePath(uri),
  );
  const node = graph.add(item);
  const messages = [];
  const editing = createEditing(
    host.vscode,
    () => ({ graph, root: item, classes: { locations: new Map() }, options: {} }),
    async () => {
      throw new Error('provider unavailable');
    },
    (message) => messages.push(message),
  );
  let request = 0;
  const send = (values) =>
    editing.handle({
      type: 'editorRequest',
      requestId: String(++request),
      mode: 'functions',
      ...values,
    });
  await send({ action: 'catalog', mode: 'architecture' });
  assert(messages.at(-1).error.includes('non-architecture'));
  await send({ action: 'catalog' });
  assert(messages.at(-1).result.entries.some((entry) => entry.path === 'main.js'));
  await send({ action: 'create', kind: 'file', name: 'bad.js', target: 'file:///outside' });
  assert(messages.at(-1).error.includes('current hierarchy'));
  await send({ action: 'load', id: node.id });
  const token = messages.at(-1).result.token;
  assert.equal(messages.at(-1).result.language, 'javascript');
  await send({ action: 'save', token, source: 'function run() { return 7; }' });
  assert.equal(messages.at(-1).result.applied, true);
  assert.equal(messages.at(-1).result.saved, true);
  assert(messages.at(-1).result.warning.includes('refresh failed'));
  assert((await host.vscode.workspace.openTextDocument(item.uri)).text.includes('return 7'));
  host.vscode.debug.activeDebugSession = {};
  await send({ action: 'catalog' });
  assert(messages.at(-1).error.includes('Stop the active debug'));
});

test('partial save warnings survive a failed graph refresh without reporting the mutation as rejected', async (t) => {
  const host = await authoringHost(t, { 'main.js': 'function run() {}' });
  const item = await host.symbol('main.js', 'run');
  const document = await host.vscode.workspace.openTextDocument(item.uri);
  document.save = async () => false;
  const graph = new CallGraph(
    async () => [],
    (uri) => uri.toString(),
  );
  const node = graph.add(item);
  const replies = [];
  const editing = createEditing(
    host.vscode,
    () => ({ graph, root: item, classes: { locations: new Map() }, options: {} }),
    async () => {
      throw new Error('provider failure');
    },
    (reply) => replies.push(reply),
  );
  await editing.handle({
    type: 'editorRequest',
    requestId: 'load',
    mode: 'functions',
    action: 'load',
    id: node.id,
  });
  await editing.handle({
    type: 'editorRequest',
    requestId: 'save',
    mode: 'functions',
    action: 'save',
    token: replies.at(-1).result.token,
    source: 'function run() { return 1; }',
  });
  const result = replies.at(-1).result;
  assert.equal(result.applied, true);
  assert.equal(result.saved, false);
  assert(result.warning.includes('could not save: main.js'));
  assert(result.warning.includes('map refresh failed'));
});

test('refresh rebuilds renamed identities without adding unrelated newly created source scope', async (t) => {
  const host = await authoringHost(t, {
    'main.js': 'function run() {}',
    'created.py': 'def new_work():\n    pass\n',
  });
  const item = await host.symbol('main.js', 'run');
  const previous = new CallGraph(
    async () => [],
    (uri) => host.vscode.workspace.asRelativePath(uri),
  );
  const old = previous.add(item);
  const document = await host.vscode.workspace.openTextDocument(item.uri);
  document.text = 'function renamed() {}';
  document.version++;
  await host.symbol('main.js', 'renamed');
  await host.symbol('created.py', 'new_work');
  const result = await refreshMap(host.vscode, previous, item, {}, [host.uri('created.py')]);
  assert(!result.graph.nodes.has(old.id));
  assert.deepEqual(
    [...result.graph.nodes.values()].map((node) => node.name),
    ['renamed'],
  );
  assert.equal(result.root.name, 'renamed');
});

test('a concurrent rejected request cannot release an active mutation lock', async (t) => {
  const host = await authoringHost(t, { 'main.js': 'function run() {}' });
  const item = await host.symbol('main.js', 'run');
  const graph = new CallGraph(
    async () => [],
    (uri) => uri.toString(),
  );
  const node = graph.add(item);
  let release;
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const messages = [];
  const editing = createEditing(
    host.vscode,
    () => ({ graph, root: item, classes: { locations: new Map() }, options: {} }),
    async () => {},
    (message) => messages.push(message),
  );
  await editing.handle({
    type: 'editorRequest',
    requestId: 'load',
    mode: 'functions',
    action: 'load',
    id: node.id,
  });
  const token = messages.at(-1).result.token;
  host.vscode.commands.executeCommand = async () => {
    started();
    return new Promise((resolve) => {
      release = resolve;
    });
  };
  const mutation = editing.handle({
    type: 'editorRequest',
    requestId: 'rename',
    mode: 'functions',
    action: 'rename',
    token,
    name: 'next',
  });
  await ready;
  await editing.handle({
    type: 'editorRequest',
    requestId: 'other',
    mode: 'files',
    action: 'catalog',
  });
  assert(messages.at(-1).error.includes('already running'));
  assert.equal(editing.applying, true);
  release(undefined);
  await mutation;
  assert.equal(editing.applying, false);
});
