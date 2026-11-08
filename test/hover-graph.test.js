const { test } = require('node:test');
const assert = require('node:assert/strict');
const { withHover } = require('../webview/hoverGraph');

const nodes = ['a', 'b', 'c', 'd', 'alone'].map((id) => ({
  id,
  position: { x: 12, y: 30 },
  data: { displayName: `Service.${id}`, severity: 'error' },
}));
const edges = [
  { id: 'ab', source: 'a', target: 'b', style: { stroke: 'orange' }, animated: true },
  { id: 'bc', source: 'b', target: 'c', label: 'renders' },
  { id: 'cd', source: 'c', target: 'd' },
  { id: 'bb', source: 'b', target: 'b' },
];

test('node hover highlights direct callers, callees, and recursion without changing health or layout', () => {
  const result = withHover(nodes, edges, { kind: 'node', id: 'b' });
  assert.deepEqual(
    result.nodes
      .filter((node) => node.className.includes('hover-connected'))
      .map((node) => node.id),
    ['a', 'b', 'c'],
  );
  assert(result.nodes[1].className.includes('hover-origin'));
  assert.equal(result.edges[1].label, 'renders');
  assert.equal(result.edges[0].animated, true);
  assert.equal(result.edges[0].style.stroke, '#c4a0ff');
  assert.equal(result.edges[2], edges[2]);
  assert.equal(result.nodes[1].data, nodes[1].data);
  assert.equal(result.nodes[1].position, nodes[1].position);
  assert.equal(edges[0].style.stroke, 'orange');
  assert.equal(nodes[1].className, undefined);
});

test('edge hover labels only its two endpoints and restores live styles when cleared', () => {
  const result = withHover(nodes, edges, { kind: 'edge', id: 'ab', source: 'a' });
  assert.equal(result.edges[0].label, 'Service.a → Service.b');
  assert.deepEqual(
    result.nodes.filter((node) => node.className).map((node) => node.id),
    ['a', 'b'],
  );
  const cleared = withHover(nodes, edges);
  assert(cleared.nodes.every((node) => !node.className));
  assert.equal(cleared.edges[0].style.stroke, 'orange');
  assert.equal(cleared.edges[0].label, undefined);
});

test('isolated and stale hover targets are safe, and class names serve as label fallback', () => {
  const isolated = withHover(nodes, edges, { kind: 'node', id: 'alone' });
  assert(isolated.nodes[4].className.includes('hover-origin'));
  assert.deepEqual(isolated.edges, edges);
  const stale = withHover(nodes, edges, { kind: 'edge', id: 'ab', source: 'previous-mode' });
  assert(stale.nodes.every((node) => !node.className));
  const classes = withHover(
    [{ id: 'x', data: { name: 'Worker' } }],
    [{ id: 'xx', source: 'x', target: 'x' }],
    { kind: 'edge', id: 'xx', source: 'x' },
  );
  assert.equal(classes.edges[0].label, 'Worker → Worker');
});
