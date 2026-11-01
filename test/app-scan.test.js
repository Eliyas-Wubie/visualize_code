const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scanApp } = require('../src/app-scan');
const { CallGraph } = require('../src/graph');

const range = { start: { line: 0, character: 0 }, end: { line: 5, character: 0 } };
function host(supported = true) {
  return {
    Uri: { joinPath: (_, file) => ({ toString: () => `file:///${file}` }) },
    workspace: { openTextDocument: async () => {} },
    commands: {
      executeCommand: async (command, uri) => {
        if (command === 'vscode.executeDocumentSymbolProvider')
          return [{ name: 'run', kind: 11, range, selectionRange: range }];
        return supported ? [{ name: 'run', uri, range, selectionRange: range }] : [];
      },
    },
  };
}

test('whole-app scanning seeds functions from multiple files without a selected cursor', async () => {
  const graph = new CallGraph(
    async () => [],
    (uri) => uri.toString(),
  );
  const result = await scanApp(
    host(),
    { files: ['first.tsx', 'second.py'], folder: {} },
    graph,
    { isCancellationRequested: false },
    { report() {} },
  );
  assert.equal(graph.nodes.size, 2);
  assert.equal(result.filesScanned, 2);
});

test('symbols remain visible with explicit missing-call support, and cancellation stops scanning', async () => {
  const graph = new CallGraph(
    async () => [],
    (uri) => uri.toString(),
  );
  await scanApp(
    host(false),
    { files: ['main.py'], folder: {} },
    graph,
    { isCancellationRequested: false },
    { report() {} },
  );
  const node = [...graph.nodes.values()][0];
  assert.equal(node.loaded, true);
  assert.equal(node.callSupport, 'No call hierarchy provided; connections unavailable.');
  const cancelled = await scanApp(
    host(),
    { files: ['other.py'], folder: {} },
    graph,
    { isCancellationRequested: true },
    { report() {} },
  );
  assert.equal(graph.nodes.size, 1);
  assert.ok(cancelled.warnings.includes('Scan cancelled; showing partial results.'));
});
