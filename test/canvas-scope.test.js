const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { authoringHost } = require('../test-support/authoring-host');
const { CallGraph } = require('../src/graph');
const { refreshMap } = require('../src/refresh-map');
const { createEditing } = require('../src/editing');
const { resolveCanvasScope, canvasEntries, canvasClasses } = require('../src/canvas-scope');

function providers(host, outgoing) {
  const original = host.vscode.commands.executeCommand;
  host.vscode.commands.executeCommand = async (command, item, position) => {
    if (command === 'vscode.prepareCallHierarchy')
      return (host.symbols.get(item.toString()) || [])
        .filter(
          (symbol) =>
            symbol.selectionRange.start.line === position.line &&
            symbol.selectionRange.start.character === position.character,
        )
        .map((symbol) => ({ ...symbol, uri: item }));
    if (command === 'vscode.provideOutgoingCalls')
      return outgoing(item).map((to) => ({
        to,
        fromRanges: [{ start: item.selectionRange.start }],
      }));
    return original(command, item, position);
  };
}

test('creating an unrelated file saves it and keeps it in the hierarchy without adding it to a function canvas', async (t) => {
  const host = await authoringHost(t, { 'main.js': 'function run() {}' });
  const root = await host.symbol('main.js', 'run');
  let connected = false;
  let created;
  providers(host, (item) => (connected && item.name === 'run' ? [created] : []));
  let graph = new CallGraph(
    async () => [],
    (uri) => host.vscode.workspace.asRelativePath(uri),
  );
  graph.add(root);
  const replies = [];
  const options = {};
  const editing = createEditing(
    host.vscode,
    () => ({ graph, root, options, classes: { locations: new Map() } }),
    async (extras) => {
      created = await host.symbol('unrelated.js', 'new_work');
      const next = await refreshMap(host.vscode, graph, root, options, extras);
      graph = next.graph;
    },
    (reply) => replies.push(reply),
  );
  await editing.handle({
    type: 'editorRequest',
    requestId: 'catalog',
    mode: 'functions',
    action: 'catalog',
  });
  await editing.handle({
    type: 'editorRequest',
    requestId: 'create',
    mode: 'functions',
    action: 'create',
    kind: 'file',
    name: 'unrelated.js',
    body: 'function new_work() {}',
    target: host.uri().toString(),
  });
  assert.equal(replies.at(-1).result.saved, true);
  assert.equal(
    await fs.readFile(host.uri('unrelated.js').fsPath, 'utf8'),
    'function new_work() {}',
  );
  assert.deepEqual(
    [...graph.nodes.values()].map((node) => node.name),
    ['run'],
  );
  assert(!editing.resources().some((entry) => entry.file === 'unrelated.js'));
  await editing.handle({
    type: 'editorRequest',
    requestId: 'again',
    mode: 'functions',
    action: 'catalog',
  });
  assert(replies.at(-1).result.entries.some((entry) => entry.path === 'unrelated.js'));
  connected = true;
  const next = await refreshMap(host.vscode, graph, root, options);
  assert.deepEqual(
    [...next.graph.nodes.values()].map((node) => node.name),
    ['run', 'new_work'],
  );
  assert.equal(next.graph.edges.length, 1);
});

test('a function trace excludes unrelated functions in its own source file after creation', async (t) => {
  const host = await authoringHost(t, { 'main.js': 'function run() {}\nfunction unrelated() {}' });
  const root = await host.symbol('main.js', 'run');
  const other = await host.symbol('main.js', 'unrelated');
  host.symbols.set(root.uri.toString(), [root, other]);
  providers(host, () => []);
  const previous = new CallGraph(
    async () => [],
    (uri) => uri.toString(),
  );
  previous.add(root);
  const result = await refreshMap(host.vscode, previous, root, {}, [root.uri]);
  assert.deepEqual(
    [...result.graph.nodes.values()].map((node) => node.name),
    ['run'],
  );
});

test('app ownership excludes sibling/nested apps; selected-file maps follow calls instead of seeding unrelated files', async (t) => {
  const files = {
    'apps/a/package.json': '{"name":"a"}',
    'apps/a/main.js': 'function main() {}',
    'apps/a/new.js': 'function added() {}',
    'apps/a/unused.js': 'function unused() {}',
    'apps/a/nested/package.json': '{"name":"nested"}',
    'apps/a/nested/other.js': 'function nested() {}',
    'apps/b/package.json': '{"name":"b"}',
    'apps/b/main.js': 'function sibling() {}',
  };
  const host = await authoringHost(t, files);
  host.vscode.RelativePattern = class {
    constructor(_, pattern) {
      this.pattern = pattern;
    }
  };
  host.vscode.workspace.findFiles = async (pattern) =>
    Object.keys(files)
      .filter((file) =>
        pattern.pattern.includes('package.json')
          ? file.endsWith('package.json')
          : file.endsWith('.js'),
      )
      .map(host.uri);
  host.vscode.workspace.fs.readFile = (uri) => fs.readFile(uri.fsPath);
  const root = await host.symbol('apps/a/main.js', 'main');
  const added = await host.symbol('apps/a/new.js', 'added');
  await host.symbol('apps/a/unused.js', 'unused');
  const nested = await host.symbol('apps/a/nested/other.js', 'nested');
  const sibling = await host.symbol('apps/b/main.js', 'sibling');
  providers(host, (item) => (item.name === 'main' ? [added, nested, sibling] : []));
  const previous = new CallGraph(
    async () => [],
    (uri) => host.vscode.workspace.asRelativePath(uri),
  );
  previous.add(root);
  const app = { folder: host.folder, root: 'apps/a', files: ['apps/a/main.js'] };
  const whole = await refreshMap(host.vscode, previous, root, { app }, [sibling.uri, nested.uri]);
  assert.deepEqual([...whole.graph.nodes.values()].map((node) => node.name).sort(), [
    'added',
    'main',
    'unused',
  ]);
  const file = await refreshMap(host.vscode, previous, root, {
    app: { ...app, selectedFile: 'apps/a/main.js' },
  });
  assert.deepEqual(
    [...file.graph.nodes.values()].map((node) => node.name),
    ['main', 'added'],
  );
  const scope = await resolveCanvasScope(host.vscode, root, { app });
  const entries = [
    'apps/a',
    'apps/a/new.js',
    'apps/a/nested',
    'apps/a/nested/other.js',
    'apps/b/main.js',
  ].map((path) => ({ uri: host.uri(path), kind: path.endsWith('.js') ? 'file' : 'folder' }));
  const visible = canvasEntries(entries, {
    graph: whole.graph,
    root,
    options: { canvasScope: scope },
  });
  assert.equal(visible.length, 2);
});

test('class and folder projections respect trace/file scope without restricting hierarchy destinations', () => {
  const uri = (path) => ({ toString: () => `file:///repo/${path}` });
  const root = { uri: uri('main.js') };
  const graph = {
    items: new Map([['run', root]]),
    nodes: new Map([['run', { classInfo: { id: 'owner' } }]]),
  };
  const classes = {
    declarations: new Map(['owner', 'empty', 'other'].map((id) => [id, { id }])),
    locations: new Map([
      ['owner', { uri: root.uri }],
      ['empty', { uri: root.uri }],
      ['other', { uri: uri('elsewhere/new.js') }],
    ]),
  };
  const state = { root, graph, classes, options: {} };
  assert.deepEqual(
    canvasClasses(state).map((info) => info.id),
    ['owner'],
  );
  const file = { ...state, options: { canvasScope: { kind: 'file', seedUris: [root.uri] } } };
  assert.deepEqual(
    canvasClasses(file).map((info) => info.id),
    ['owner', 'empty'],
  );
  assert.deepEqual(
    canvasEntries(
      [
        { uri: root.uri, kind: 'file' },
        { uri: uri('elsewhere'), kind: 'folder' },
      ],
      state,
    ).map((entry) => entry.kind),
    ['file'],
  );
});
