const { test } = require('node:test');
const assert = require('node:assert/strict');
const { matchFunction, liveSnapshot } = require('../src/live-match');
const { withLive } = require('../webview/liveGraph');
const { classGraph } = require('../webview/classGraph');

function graph() {
  const uri = { toString: () => 'file:///sample.js' };
  const range = (a, b) => ({ start: { line: a, character: 0 }, end: { line: b, character: 99 } });
  return {
    items: new Map([
      ['outer', { uri, range: range(0, 10) }],
      ['inner', { uri, range: range(2, 4) }],
    ]),
  };
}

test('runtime positions map to the innermost function and ignore unknown files', () => {
  assert.equal(matchFunction(graph(), 'file:///sample.js', { line: 3, character: 0 }), 'inner');
  assert.equal(matchFunction(graph(), 'file:///other.js', { line: 3, character: 0 }), undefined);
});

test('runtime counters do not attribute unknown nested functions to their containing function', () => {
  const known = graph();
  known.items.get('outer').selectionRange = { end: { line: 0, character: 15 } };
  known.items.get('inner').selectionRange = { end: { line: 2, character: 15 } };
  assert.equal(matchFunction(known, 'file:///sample.js', { line: 0, character: 0 }, true), 'outer');
  assert.equal(
    matchFunction(known, 'file:///sample.js', { line: 3, character: 0 }, true),
    undefined,
  );
});

test('paused stacks show actual adjacent call connections and preserve unknown frame gaps', () => {
  const state = {
    status: 'Paused',
    records: new Map(),
    frames: [
      { uri: 'file:///sample.js', position: { line: 3, character: 1 } },
      { uri: 'file:///sample.js', position: { line: 8, character: 1 } },
    ],
  };
  const live = liveSnapshot(graph(), state);
  assert.equal(live.current, 'inner');
  assert.deepEqual(live.edges, [{ from: 'outer', to: 'inner' }]);
  state.frames.splice(1, 0, { uri: 'file:///unknown.js', position: { line: 0, character: 0 } });
  assert.equal(liveSnapshot(graph(), state).edges.length, 0);
});

test('live metrics survive function-to-class projection without inventing call edges', () => {
  const owner = { id: 'class', name: 'Example' };
  const mapped = withLive(
    {
      root: 'a',
      nodes: [
        { id: 'a', classInfo: owner },
        { id: 'b', classInfo: owner },
      ],
      edges: [{ from: 'a', to: 'b', lines: [1] }],
    },
    {
      active: ['b'],
      current: 'b',
      edges: [],
      metrics: { a: { calls: 2, cpuMs: 1 }, b: { calls: 3, cpuMs: 2 } },
    },
  );
  const projected = classGraph(mapped);
  assert.equal(projected.nodes[0].active, true);
  assert.equal(projected.nodes[0].live.calls, 5);
  assert.equal(projected.nodes[0].live.cpuMs, 3);
  assert.equal(projected.edges[0].active, false);
});
