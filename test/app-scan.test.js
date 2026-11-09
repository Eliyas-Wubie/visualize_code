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

test('app scans retain good files and identify a failed file instead of aborting the map', async () => {
  const vscode = host();
  vscode.workspace.openTextDocument = async (uri) => {
    if (uri.toString().includes('bad')) throw new Error('private provider details');
  };
  const graph = new CallGraph(
    async () => [],
    (uri) => uri.toString(),
  );
  const result = await scanApp(
    vscode,
    { files: ['bad.py', 'good.py'], folder: {} },
    graph,
    {},
    { report() {} },
    true,
  );
  assert.equal(graph.nodes.size, 1);
  assert.equal(result.filesScanned, 1);
  assert.match(result.warnings[0], /bad.py/);
  assert(!result.warnings[0].includes('private'));
  await assert.rejects(
    scanApp(
      vscode,
      { files: ['bad.py'], folder: {} },
      new CallGraph(async () => [], String),
      {},
      { report() {} },
      true,
    ),
    /No source files/,
  );
});

test('valid empty files do not report missing language support or abort the app scan', async () => {
  const vscode = host();
  vscode.commands.executeCommand = async () => [];
  const result = await scanApp(
    vscode,
    { files: ['empty.py'], folder: {} },
    new CallGraph(async () => [], String),
    {},
    { report() {} },
    true,
  );
  assert.equal(result.filesScanned, 1);
  assert.deepEqual(result.warnings, []);
});
