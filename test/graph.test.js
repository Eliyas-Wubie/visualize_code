const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CallGraph } = require('../src/graph');

function item(name, line = 0, uri = 'file:///project/main.js') {
  return { name, uri: { toString: () => uri }, selectionRange: { start: { line, character: 0 } } };
}
const call = (to) => ({ to, fromRanges: [{ start: { line: 4 } }] });
const label = (uri) => uri.toString();

test('expansion follows cross-file calls and preserves call sites', async () => {
  const target = item('work', 2, 'file:///project/work.js');
  const graph = new CallGraph(async () => [call(target)], label);
  const root = graph.add(item('main'));
  await graph.expand(root.id);
  assert.equal(graph.nodes.size, 2);
  assert.equal(graph.edges[0].to, graph.add(target).id);
  assert.deepEqual(graph.edges[0].lines, [5]);
  assert.equal(graph.nodes.get(root.id).loaded, true);
});

test('cycles and repeated expansion do not duplicate nodes or edges', async () => {
  const rootItem = item('main');
  let requests = 0;
  const graph = new CallGraph(async () => {
    requests++;
    return [call(rootItem), call(rootItem)];
  }, label);
  const root = graph.add(rootItem);
  await graph.expand(root.id);
  await graph.expand(root.id);
  assert.equal(requests, 1);
  assert.equal(graph.nodes.size, 1);
  assert.equal(graph.edges.length, 1);
});

test('provider failures remain retryable and unknown IDs are rejected', async () => {
  let fail = true;
  const graph = new CallGraph(async () => {
    if (fail) throw new Error('provider offline');
    return [];
  }, label);
  const root = graph.add(item('main'));
  await assert.rejects(graph.expand(root.id), { message: 'provider offline' });
  assert.equal(root.loaded, false);
  fail = false;
  await graph.expand(root.id);
  assert.equal(root.loaded, true);
  await assert.rejects(graph.expand('untrusted'), { message: 'Unknown graph node' });
});

test('graph limit is visible and does not create dangling edges', async () => {
  const graph = new CallGraph(async () => [call(item('a', 1)), call(item('b', 2))], label, 2);
  const root = graph.add(item('main'));
  await graph.expand(root.id);
  assert.equal(graph.nodes.size, 2);
  assert.equal(root.omitted, 1);
  assert.equal(graph.edges.length, 1);
});

test('missing provider output is not misrepresented as a leaf', async () => {
  const graph = new CallGraph(async () => undefined, label);
  const root = graph.add(item('main'));
  await assert.rejects(graph.expand(root.id), {
    message: 'The language provider did not return call information.',
  });
  assert.equal(root.loaded, false);
});

test('multiple call sites to the same function retain every source line', async () => {
  const target = item('work', 2);
  const graph = new CallGraph(
    async () => [call(target), { to: target, fromRanges: [{ start: { line: 8 } }] }],
    label,
  );
  const root = graph.add(item('main'));
  await graph.expand(root.id);
  assert.equal(graph.edges.length, 1);
  assert.deepEqual(graph.edges[0].lines, [5, 9]);
});
