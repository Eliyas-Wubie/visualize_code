const { test } = require('node:test');
const assert = require('node:assert/strict');
const { severity, withNodeInfo } = require('../webview/nodeInfo');
const { classGraph } = require('../webview/classGraph');
const { diagnosticSnapshot } = require('../src/diagnostics');

test('errors override warnings and informational logs do not mark nodes as unhealthy', () => {
  assert.equal(severity([], [{ level: 'info' }]), undefined);
  assert.equal(severity([{ level: 'warning' }], []), 'warning');
  assert.equal(severity([{ level: 'warning' }], [{ level: 'error' }]), 'error');
});

test('class health aggregates method logs and deduplicates class/method diagnostics', () => {
  const issue = { level: 'warning', text: 'Check input', line: 3, source: 'test' };
  const graph = { nodes: [{ id: 'run', classInfo: { id: 'class', name: 'Example' } }], edges: [] };
  const decorated = withNodeInfo(
    graph,
    { logs: { run: [{ level: 'error', text: 'Failed' }] } },
    { functions: { run: [{ ...issue }] }, classes: { class: [issue] } },
  );
  const group = classGraph(decorated).nodes[0];
  assert.equal(decorated.nodes[0].severity, 'error');
  assert.equal(group.severity, 'error');
  assert.equal(group.logs.length, 1);
  assert.equal(group.diagnostics.length, 1);
});

test('diagnostics attach to source functions and classes without leaking unrelated file issues', () => {
  const range = (start, end) => ({
    start: { line: start, character: 0 },
    end: { line: end, character: 99 },
  });
  const uri = { toString: () => 'file:///sample.js' };
  const graph = {
    items: new Map([['run', { uri, range: range(2, 5) }]]),
    nodes: new Map([['run', { classInfo: { id: 'class', range: range(0, 8) } }]]),
  };
  const result = diagnosticSnapshot(graph, () => [
    { severity: 0, message: 'Method error', range: range(3, 3) },
    { severity: 1, message: 'Class warning', range: range(1, 1) },
    { severity: 0, message: 'Unrelated', range: range(20, 20) },
  ]);
  assert.equal(result.functions.run.length, 1);
  assert.equal(result.classes.class.length, 2);
  assert.equal(result.functions.run[0].level, 'error');
});
