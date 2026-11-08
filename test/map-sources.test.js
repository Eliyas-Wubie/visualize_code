const { test } = require('node:test');
const assert = require('node:assert/strict');
const { observeMapSources } = require('../src/map-sources');

test('changed sources invalidate other panels, retain pending changes during scans, and stop after disposal', () => {
  const listeners = [];
  const timers = new Map();
  let sequence = 0;
  const clock = {
    setTimeout(fn) {
      const id = ++sequence;
      timers.set(id, fn);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  const uri = { toString: () => 'file:///main.js' };
  const graph = { items: new Map([['node', { uri }]]) };
  const vscode = {
    workspace: {
      onDidChangeTextDocument(fn) {
        listeners.push(fn);
        return { dispose() {} };
      },
    },
  };
  const refreshed = [];
  let busy = true;
  const own = observeMapSources(
    vscode,
    () => ({ graph, busy: false }),
    { applying: true, resolve: () => undefined },
    async () => refreshed.push('own'),
    clock,
  );
  const other = observeMapSources(
    vscode,
    () => ({ graph, busy }),
    { applying: false, resolve: () => undefined },
    async (uris) => refreshed.push(uris),
    clock,
  );
  // VS Code may announce dirty/save/encoding state without changing any source text.
  listeners.forEach((listener) => listener({ document: { uri }, contentChanges: [] }));
  assert.equal(timers.size, 0);
  listeners.forEach((listener) => listener({ document: { uri } }));
  const flush = () => {
    const current = [...timers.values()];
    timers.clear();
    current.forEach((fn) => fn());
  };
  flush();
  assert.equal(refreshed.length, 0);
  busy = false;
  flush();
  assert.equal(refreshed.length, 1);
  assert.equal(refreshed[0][0], uri);
  own.dispose();
  other.dispose();
  listeners.forEach((listener) => listener({ document: { uri } }));
  flush();
  assert.equal(refreshed.length, 1);
});
