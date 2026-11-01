const { test } = require('node:test');
const assert = require('node:assert/strict');
const { observeDebugger } = require('../src/debug-live');

test('debugger tracker reads stopped stacks, clears on continue, and reports failures', async () => {
  let factory;
  const events = [];
  const vscode = {
    debug: {
      registerDebugAdapterTrackerFactory: (_, value) => {
        factory = value;
        return {};
      },
    },
    Uri: { file: (path) => ({ toString: () => `file://${path}` }) },
  };
  observeDebugger(vscode, (_, status, frames) => events.push({ status, frames }));
  const session = {
    customRequest: async (command) =>
      command === 'threads'
        ? { threads: [{ id: 1 }] }
        : { stackFrames: [{ source: { path: '/sample.js' }, line: 4, column: 2 }] },
  };
  const tracker = factory.createDebugAdapterTracker(session);
  await tracker.onDidSendMessage({ type: 'event', event: 'stopped', body: {} });
  assert.equal(events[0].status, 'Paused');
  assert.deepEqual(events[0].frames[0].position, { line: 3, character: 1 });
  await tracker.onDidSendMessage({ type: 'event', event: 'continued' });
  assert.deepEqual(events[1], { status: 'Running', frames: [] });
  session.customRequest = async () => {
    throw new Error('adapter failed');
  };
  await tracker.onDidSendMessage({ type: 'event', event: 'stopped', body: { threadId: 1 } });
  assert.equal(events[2].status, 'Stack unavailable');
});
