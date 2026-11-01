const { test } = require('node:test');
const assert = require('node:assert/strict');
const { layout } = require('../webview/layout');

test('shared callees, cycles and recursion remain single nodes with all connections', () => {
  const graph = {
    root: 'start',
    nodes: ['start', 'a', 'b', 'shared'].map((id) => ({ id, name: id })),
    edges: [
      ['start', 'a'],
      ['start', 'b'],
      ['a', 'shared'],
      ['b', 'shared'],
      ['shared', 'start'],
      ['shared', 'shared'],
    ].map(([from, to]) => ({ from, to, lines: [1] })),
  };
  const result = layout(graph);
  assert.equal(result.nodes.length, 4);
  assert.equal(result.edges.length, 6);
  assert.equal(new Set(result.nodes.map((node) => node.id)).size, 4);
  assert.equal(result.edges[2].target, result.edges[3].target);
  assert.equal(result.edges[5].source, result.edges[5].target);
  assert.equal(result.nodes[0].data.root, true);
  assert.ok(result.nodes[1].position.y > result.nodes[0].position.y);
  assert.equal(result.nodes[1].position.y, result.nodes[2].position.y);
  assert.ok(result.nodes[3].position.y > result.nodes[1].position.y);
  assert.equal(new Set(result.nodes.map((node) => JSON.stringify(node.position))).size, 4);
});

test('layout retains original host IDs without exposing them as React Flow IDs', () => {
  const id = '["file:///folder/a.js",0,0,"main"]';
  const result = layout({ root: id, nodes: [{ id }], edges: [] });
  assert.equal(result.nodes[0].id, 'fn-0');
  assert.equal(result.nodes[0].data.hostId, id);
});

test('function nodes qualify class methods and expose the owning class', () => {
  const nodes = [
    { id: 'a', name: 'borrow', classInfo: { name: 'Library', qualifiedName: 'Library' } },
    { id: 'b', name: 'Library.borrow', classInfo: { name: 'Library' } },
    { id: 'c', name: 'run', classInfo: { name: 'Inner', qualifiedName: 'Outer.Inner' } },
    { id: 'd', name: 'main', classInfo: null },
  ];
  const result = layout({ root: 'a', nodes, edges: [] }).nodes;
  assert.equal(result[0].data.displayName, 'Library.borrow');
  assert.equal(result[0].data.className, 'Library');
  assert.equal(result[1].data.displayName, 'Library.borrow');
  assert.equal(result[2].data.displayName, 'Outer.Inner.run');
  assert.equal(result[3].data.displayName, 'main');
  assert.equal(result[3].data.className, undefined);
  assert.equal(result[0].data.hostId, 'a');
});
