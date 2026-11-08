const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chooseMapRoot } = require('../src/map-root');
const { CallGraph } = require('../src/graph');
const { layout } = require('../webview/layout');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

function item(name, line, kind = 11, file = 'main.py') {
  return {
    name,
    kind,
    uri: { toString: () => `file:///${file}` },
    selectionRange: { start: { line, character: 4 } },
  };
}

test('Python file maps choose main after class methods and place the final callee below main and tick', () => {
  const graph = new CallGraph(
    async () => [],
    (uri) => uri.toString(),
  );
  const calculate = graph.add(item('calculate', 8, 5));
  const tick = graph.add(item('tick', 12, 5));
  const constructor = graph.add(item('Calculators', 5, 8));
  const main = graph.add(item('main', 20));
  const root = chooseMapRoot(graph);
  assert.equal(root.name, 'main');
  graph.edges = [
    [main.id, constructor.id],
    [main.id, tick.id],
    [tick.id, calculate.id],
  ].map(([from, to]) => ({ from, to, lines: [1] }));
  const view = layout({ ...graph.snapshot(), root: main.id });
  const positions = new Map(view.nodes.map((node) => [node.data.name, node.position]));
  assert(positions.get('tick').y > positions.get('main').y);
  assert(positions.get('calculate').y > positions.get('tick').y);
  assert.equal(view.nodes.find((node) => node.data.root).data.name, 'main');
});

test('entry files take priority and methods named main do not override a top-level entry', () => {
  const method = item('main', 0, 5, 'helper.py');
  const helper = item('main', 10, 11, 'helper.py');
  const entry = item('main', 5, 11, 'entry.py');
  const graph = {
    items: new Map([
      ['method', method],
      ['helper', helper],
      ['entry', entry],
    ]),
  };
  assert.equal(chooseMapRoot(graph, [entry.uri]), entry);
  graph.items.delete('helper');
  graph.items.delete('entry');
  const run = item('run', 10);
  graph.items.set('run', run);
  assert.equal(chooseMapRoot(graph), run);
  assert.equal(chooseMapRoot({ items: new Map() }), undefined);
});

test('opening a Python file through the explorer selects main while explicit cursor traces keep their chosen method', async () => {
  const commands = new Map();
  const shown = [];
  let openApp;
  const calculate = item('calculate', 8, 5);
  const main = item('main', 20);
  const vscode = {
    Uri: { joinPath: (_, file) => ({ toString: () => `file:///${file}` }) },
    commands: {
      registerCommand: (id, handler) => {
        commands.set(id, handler);
        return {};
      },
    },
    workspace: { asRelativePath: (uri) => uri.toString() },
    window: {
      withProgress: (_, run) => run({}, { isCancellationRequested: false }),
      showErrorMessage: (message) => {
        throw new Error(message);
      },
    },
    ProgressLocation: { Notification: 1 },
  };
  const sandbox = {
    module: { exports: {} },
    require: (name) => {
      if (name === 'vscode') return vscode;
      if (name === './live') return { createLive: () => ({}) };
      if (name === './start') return { chooseStart: async () => calculate };
      if (name === './map')
        return {
          showMap: (_, __, graph, root, options) => {
            shown.push({ graph, root });
            if (options?.load)
              return options
                .load({ isCancellationRequested: false }, { report() {} })
                .then((next) => Object.assign(shown[0], next));
          },
        };
      if (name === './apps-view')
        return {
          registerAppsView: (_, __, callback) => {
            openApp = callback;
          },
        };
      if (name === './app-scan')
        return {
          scanApp: async (_, __, graph) => {
            graph.add(calculate);
            graph.add(main);
            return { warnings: [] };
          },
        };
      return require(`../src/${name.slice(2)}`);
    },
  };
  runInNewContext(readFileSync(require.resolve('../src/extension'), 'utf8'), sandbox);
  sandbox.module.exports.activate({ subscriptions: [] });
  await openApp(
    { files: ['main.py'], entries: ['main.py'], folder: { uri: {} }, framework: 'Python' },
    'main.py',
  );
  assert.equal(shown[0].root, main);
  await commands.get('visualizeCode.fromCursor')();
  assert.equal(shown[1].root, calculate);
});
