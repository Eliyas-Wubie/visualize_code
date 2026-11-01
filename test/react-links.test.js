const { test } = require('node:test');
const assert = require('node:assert/strict');
const { addReactLinks } = require('../src/react-links');

test('JSX component references add resolved render links without treating plain references as renders', async () => {
  const source = 'function App(){ const saved = Header; return <Header/>; }';
  const uri = (name) => ({ toString: () => `file:///${name}.jsx` });
  const app = uri('App');
  const header = uri('Header');
  const range = { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } };
  const item = (location) => ({
    uri: location,
    name: location.toString(),
    range,
    selectionRange: range,
  });
  const graph = {
    items: new Map([
      ['app', item(app)],
      ['header', item(header)],
    ]),
    edges: [],
  };
  const vscode = {
    workspace: {
      openTextDocument: async () => ({
        languageId: 'javascriptreact',
        offsetAt: (position) => position.character,
        getText: () => source,
      }),
    },
    commands: {
      executeCommand: async (_, target) =>
        target === header
          ? [source.indexOf('Header'), source.lastIndexOf('Header')].map((character) => ({
              uri: app,
              range: { start: { line: 0, character } },
            }))
          : [],
    },
  };
  const warnings = await addReactLinks(vscode, graph, { isCancellationRequested: false });
  assert.equal(warnings.length, 0);
  assert.deepEqual(graph.edges, [{ from: 'app', to: 'header', lines: [1], kind: 'render' }]);
});
