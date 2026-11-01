const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createClassResolver } = require('../src/classes');
const { CallGraph } = require('../src/graph');
const { classGraph } = require('../webview/classGraph');

const range = (start, end) => ({
  start: { line: start, character: 0 },
  end: { line: end, character: 99 },
});
const symbol = (name, start, end, children = []) => ({
  name,
  kind: 4,
  range: range(start, end),
  selectionRange: range(start, start),
  children,
});
const item = (name, line, file = 'file:///sample.js') => ({
  name,
  uri: { toString: () => file },
  selectionRange: range(line, line),
});

test('class ownership uses source ranges, nested classes, and per-file symbol caching', async () => {
  let requests = 0;
  const resolver = createClassResolver(
    async () => {
      requests++;
      return [symbol('Outer', 0, 20, [symbol('Inner', 10, 18)])];
    },
    (uri) => uri.toString(),
  );
  const graph = new CallGraph(
    async () => [],
    (uri) => uri.toString(),
  );
  const outer = graph.add(item('run', 3));
  const inner = graph.add(item('run', 12));
  const plain = graph.add(item('main', 25));
  await resolver.enrich(graph);
  assert.equal(outer.classInfo.name, 'Outer');
  assert.equal(inner.classInfo.name, 'Inner');
  assert.equal(inner.classInfo.qualifiedName, 'Outer.Inner');
  assert.equal(plain.classInfo, null);
  assert.equal(requests, 1);
  assert.equal(resolver.locations.get(inner.classInfo.id).selectionRange.start.line, 10);
});

test('OOP view groups methods, merges inter-class calls, and keeps internal calls', () => {
  const a = { id: 'class-a', name: 'Service', file: 'a.js', line: 1 };
  const b = { id: 'class-b', name: 'Service', file: 'b.js', line: 1 };
  const nodes = [
    { id: 'a1', classInfo: a },
    { id: 'a2', classInfo: a },
    { id: 'b1', classInfo: b },
    { id: 'main', classInfo: null },
  ];
  const edges = [
    ['a1', 'b1'],
    ['a2', 'b1'],
    ['a1', 'a2'],
    ['main', 'a1'],
  ].map(([from, to]) => ({ from, to, lines: [5] }));
  const result = classGraph({ root: 'main', nodes, edges });
  assert.equal(result.nodes.length, 2);
  assert.equal(result.nodes[0].methods.length, 2);
  assert.equal(result.edges.length, 2);
  assert.equal(result.edges[0].calls.length, 2);
  assert.equal(result.edges[1].from, result.edges[1].to);
  assert.equal(result.root, 'class-a');
  assert.equal(classGraph({ nodes: [], edges: [] }).nodes.length, 0);
});

test('symbol provider failure is explicit without interrupting function discovery', async () => {
  const resolver = createClassResolver(
    async () => {
      throw new Error('unavailable');
    },
    () => 'sample.js',
  );
  const graph = new CallGraph(
    async () => [],
    () => 'sample.js',
  );
  const node = graph.add(item('run', 3));
  await resolver.enrich(graph);
  assert.equal(node.classInfo, null);
  assert.equal(node.classError, 'Class information unavailable');
});
