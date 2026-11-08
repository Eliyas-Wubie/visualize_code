const { test } = require('node:test');
const assert = require('node:assert/strict');
const { branchPositions } = require('../webview/branch-positions');
const { layout } = require('../webview/layout');
const { layoutKey, reconcileLayout } = require('../webview/layout-state');
const { returnRoutes, returnPath } = require('../webview/return-routes');

function graph(connections, extra = []) {
  return {
    root: 'root',
    nodes: [...new Set(['root', ...connections.flat(), ...extra])].map((id) => ({ id, name: id })),
    edges: connections.map(([from, to], index) => ({ from, to, lines: [index + 1] })),
  };
}

test('parents center over downward subtrees and sibling branch envelopes do not overlap', () => {
  const input = graph([
    ['root', 'a'],
    ['root', 'b'],
    ['a', 'a1'],
    ['a', 'a2'],
    ['a', 'a3'],
    ['b', 'b1'],
    ['b', 'b2'],
  ]);
  const p = branchPositions(input);
  assert.equal(p.get('root').x, 0);
  for (const [parent, children] of [
    ['root', ['a', 'b']],
    ['a', ['a1', 'a2', 'a3']],
    ['b', ['b1', 'b2']],
  ]) {
    assert(children.every((child) => p.get(child).y > p.get(parent).y));
    assert(p.get(children[0]).x < p.get(parent).x);
    assert(p.get(children.at(-1)).x > p.get(parent).x);
  }
  assert.equal(p.get('a').x, (p.get('a1').x + p.get('a3').x) / 2);
  assert(p.get('a3').x + 280 + 100 <= p.get('b1').x);
  const rows = new Map();
  for (const position of p.values()) {
    if (!rows.has(position.y)) rows.set(position.y, []);
    rows.get(position.y).push(position.x);
  }
  for (const row of rows.values()) {
    row.sort((a, b) => a - b);
    for (let i = 1; i < row.length; i++) assert(row[i] - row[i - 1] >= 380);
  }
});

test('single-child chains stay aligned, shared nodes/cycles occur once and disconnected trees stay separate', () => {
  const input = graph(
    [
      ['root', 'a'],
      ['root', 'b'],
      ['a', 'shared'],
      ['b', 'shared'],
      ['shared', 'root'],
      ['shared', 'shared'],
      ['outside', 'leaf'],
    ],
    ['alone'],
  );
  const p = branchPositions(input);
  assert.equal(p.size, input.nodes.length);
  assert.equal(p.get('a').x, p.get('shared').x);
  assert.equal(p.get('outside').x, p.get('leaf').x);
  assert(p.get('leaf').y > p.get('outside').y);
  assert(p.get('outside').x > Math.max(p.get('a').x, p.get('b').x) + 380);
  assert.equal(layout(input).edges.length, input.edges.length);
});

test('discovery ordering does not change lane assignment and measured cards retain vertical/horizontal clearance', () => {
  const input = graph([
    ['root', 'a'],
    ['root', 'b'],
    ['a', 'leaf'],
  ]);
  const sizes = new Map([
    ['root', { width: 600, height: 540 }],
    ['a', { width: 400, height: 350 }],
    ['b', { width: 280, height: 200 }],
  ]);
  const p = branchPositions(input, sizes);
  const reordered = branchPositions(
    { ...input, nodes: [...input.nodes].reverse(), edges: [...input.edges].reverse() },
    sizes,
  );
  assert.deepEqual(Object.fromEntries(p), Object.fromEntries(reordered));
  assert(p.get('a').y >= 640);
  assert(p.get('leaf').y >= p.get('a').y + 450);
  assert(p.get('a').x + 400 + 100 <= p.get('b').x);
  assert.equal(branchPositions({ nodes: [], edges: [] }).size, 0);
  const missingRoot = branchPositions({
    root: 'missing',
    nodes: [{ id: 'a' }, { id: 'b' }],
    edges: [{ from: 'b', to: 'a', lines: [1] }],
  });
  assert(missingRoot.get('a').y > missingRoot.get('b').y);
});

test('topology growth opens fresh branch lanes while status changes and reordering preserve user positions and sizes', () => {
  const input = graph([
    ['root', 'a'],
    ['root', 'b'],
    ['b', 'existing'],
  ]);
  const before = layout(input);
  const prior = before.nodes.map((node) => ({
    ...node,
    position: { x: node.position.x + 50, y: node.position.y + 12 },
    measured: { width: 280, height: 225 },
  }));
  const metadata = {
    ...before,
    nodes: [...before.nodes]
      .reverse()
      .map((node) => ({ ...node, data: { ...node.data, current: true } })),
  };
  assert.equal(layoutKey(before, 'root', 'functions'), layoutKey(metadata, 'root', 'functions'));
  const preserved = reconcileLayout(prior, metadata.nodes, false);
  for (const node of preserved) {
    assert.deepEqual(node.position, prior.find((old) => old.id === node.id).position);
    assert.deepEqual(node.measured, { width: 280, height: 225 });
  }
  const expanded = layout(
    graph([
      ...input.edges.map((edge) => [edge.from, edge.to]),
      ['a', 'new1'],
      ['a', 'new2'],
      ['a', 'new3'],
    ]),
  );
  assert.notEqual(layoutKey(before, 'root', 'functions'), layoutKey(expanded, 'root', 'functions'));
  const fresh = reconcileLayout(prior, expanded.nodes, true);
  assert.equal(new Set(fresh.map((node) => JSON.stringify(node.position))).size, fresh.length);
});

test('feedback routes clear sibling cards and use distinct exterior lanes; downward and recursive edges keep their paths', () => {
  const nodes = [
    { id: 'root', position: { x: 0, y: 0 }, measured: { width: 280, height: 220 } },
    { id: 'a', position: { x: -190, y: 400 }, measured: { width: 280, height: 220 } },
    { id: 'b', position: { x: 190, y: 400 }, measured: { width: 280, height: 330 } },
  ];
  const edges = [
    ['root', 'a'],
    ['a', 'root'],
    ['b', 'a'],
    ['a', 'a'],
  ].map(([source, target], index) => ({ id: String(index), source, target, data: { lines: [1] } }));
  const routed = returnRoutes(nodes, edges);
  assert.equal(routed[0].data.returnRoute, undefined);
  assert.equal(routed[3].data.returnRoute, undefined);
  const first = routed[1].data.returnRoute;
  const second = routed[2].data.returnRoute;
  assert(first.x < -190);
  assert(first.bottom > 730);
  assert(first.top < 0);
  assert.notEqual(first.x, second.x);
  const [path, labelX] = returnPath(-50, 620, 140, 0, first);
  assert(path.includes('L 140 0'));
  assert.equal(labelX, first.x);
});
