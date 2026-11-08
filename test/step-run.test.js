const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createStepRun } = require('../src/step-run');
const { liveSnapshot } = require('../src/live-match');
const { withLive } = require('../webview/liveGraph');

function setup() {
  const state = { frames: [], records: new Map(), logs: [] };
  const requests = [];
  const graph = {
    items: new Map(
      ['a', 'b'].map((id, index) => [
        id,
        {
          uri: { toString: () => 'file:///sample.js' },
          range: {
            start: { line: index * 10, character: 0 },
            end: { line: index * 10 + 8, character: 100 },
          },
        },
      ]),
    ),
  };
  const session = { customRequest: async (...args) => requests.push(args) };
  const control = createStepRun(state, () => {});
  control.prepare(graph);
  const frame = (line) => ({ uri: 'file:///sample.js', position: { line, character: 1 } });
  const stopped = (lines, reason = 'step') => {
    state.frames = lines.map(frame);
    return control.stopped(session, state.frames, { threadId: 7, reason });
  };
  return { state, requests, graph, session, control, stopped };
}

test('every breakpoint waits for Next, including consecutive calls at identical stack locations', async () => {
  const h = setup();
  await h.stopped([1]);
  assert.equal(h.state.step.canNext, true);
  assert.deepEqual(h.state.step.visited, ['a']);
  assert.equal(h.requests.length, 0);
  await Promise.all([h.control.next(), h.control.next()]);
  assert.deepEqual(h.requests, [['continue', { threadId: 7, singleThread: false }]]);
  await h.stopped([1]);
  assert.equal(h.state.step.count, 2);
  assert.equal(h.requests.length, 1);
  await h.control.next();
  await h.stopped([11, 1]);
  assert.equal(h.state.step.count, 3);
  assert.deepEqual(h.state.step.visited, ['a', 'b']);
});

test('recursion, exceptions, debugger failure and termination retain explicit safe states', async () => {
  const h = setup();
  await h.stopped([1]);
  await h.control.next();
  assert.equal(await h.stopped([1, 1]), false);
  assert.equal(h.state.step.count, 2);
  await h.control.next();
  assert.equal(await h.stopped([2, 1], 'exception'), false);
  assert(h.state.status.includes('exception'));
  h.session.customRequest = async () => {
    throw new Error('unavailable');
  };
  await h.control.next();
  assert.equal(h.state.step.canNext, true);
  assert(h.state.status.includes('could not advance'));
  h.control.reset();
  await h.control.next();
  assert.equal(h.state.step, undefined);
});

test('an asynchronous entry on a shorter stack is not mistaken for a return', async () => {
  const h = setup();
  await h.stopped([1, 99, 99]);
  await h.control.next();
  assert.equal(await h.stopped([11]), false);
  assert.deepEqual(h.state.step.visited, ['a', 'b']);
});

test('unmapped breakpoints wait for Next and projected current/visited state stays truthful', async () => {
  const h = setup();
  await h.stopped([99]);
  assert.equal(h.requests.length, 0);
  assert.equal(h.state.step.canNext, true);
  assert(h.state.status.includes('outside mapped'));
  await h.control.next();
  await h.stopped([1]);
  const snapshot = liveSnapshot(h.graph, h.state);
  const view = withLive({ nodes: [{ id: 'a' }, { id: 'b' }], edges: [] }, snapshot);
  assert.equal(snapshot.step.canNext, true);
  assert.equal(view.nodes[0].current, true);
  assert.equal(view.nodes[0].visited, true);
  assert.equal(view.nodes[1].visited, false);
});
