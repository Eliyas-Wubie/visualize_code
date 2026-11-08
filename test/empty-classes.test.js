const { test } = require('node:test');
const assert = require('node:assert/strict');
const { authoringHost } = require('../test-support/authoring-host');
const { CallGraph } = require('../src/graph');
const { createClassResolver } = require('../src/classes');
const { diagnosticSnapshot } = require('../src/diagnostics');
const { projectGraph } = require('../webview/map-model');

test('empty classes remain visible and editable after source changes, with file-scoped diagnostics', async (t) => {
  const host = await authoringHost(t, { 'one.js': 'class One {}', 'two.js': 'class Two {}' });
  await host.symbol('one.js', 'One', host.vscode.SymbolKind.Class);
  await host.symbol('two.js', 'Two', host.vscode.SymbolKind.Class);
  const graph = new CallGraph(
    async () => [],
    (uri) => host.vscode.workspace.asRelativePath(uri),
  );
  graph.sourceUris = [host.uri('one.js'), host.uri('two.js')];
  const resolver = createClassResolver(
    (uri) => host.vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri),
    graph.label,
  );
  await resolver.enrich(graph);
  assert.equal(resolver.declarations.size, 2);
  const one = [...resolver.declarations.values()].find((info) => info.name === 'One');
  const two = [...resolver.declarations.values()].find((info) => info.name === 'Two');
  assert.equal(resolver.locations.get(one.id).uri.toString(), host.uri('one.js').toString());
  const diagnostics = diagnosticSnapshot(
    graph,
    (uri) =>
      uri.toString() === host.uri('one.js').toString()
        ? [
            {
              severity: 1,
              message: 'One only',
              range: { start: { line: 0, character: 7 }, end: { line: 0, character: 8 } },
            },
          ]
        : [],
    resolver,
  );
  assert.equal(diagnostics.classes[one.id].length, 1);
  assert.equal(diagnostics.classes[two.id], undefined);
  const view = projectGraph(
    { ...graph.snapshot(), classEntries: [...resolver.declarations.values()] },
    {},
    diagnostics,
    'oop',
  );
  assert.equal(view.nodes.length, 2);
  assert.equal(view.nodes.find((node) => node.data.name === 'One').data.severity, 'warning');
  assert.equal(view.nodes[0].data.methods.length, 0);
  assert.equal(view.edges.length, 0);
  const files = projectGraph(
    { ...graph.snapshot(), classEntries: [...resolver.declarations.values()] },
    {},
    diagnostics,
    'files',
  );
  assert.equal(files.nodes.find((node) => node.data.file === 'one.js').data.severity, 'warning');
});
