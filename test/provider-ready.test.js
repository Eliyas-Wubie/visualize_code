const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readySymbols } = require('../src/provider-ready');
const { createMapHost } = require('../test-support/map-host');

test('cold providers are retried until function symbols arrive', async () => {
  let calls = 0;
  const expected = [{ name: 'main' }];
  const vscode = { commands: { executeCommand: async () => (++calls < 3 ? [] : expected) } };
  const result = await readySymbols(
    vscode,
    {},
    { getText: () => 'def main(): pass' },
    {},
    { report() {} },
    2000,
  );
  assert.equal(result, expected);
  assert.equal(calls, 3);
});

test('empty source finishes promptly; hung requests time out and cancel explicitly', async () => {
  assert.deepEqual(
    await readySymbols(
      { commands: { executeCommand: async () => [] } },
      {},
      { getText: () => '' },
      {},
      { report() {} },
    ),
    [],
  );
  const vscode = { commands: { executeCommand: () => new Promise(() => {}) } };
  await assert.rejects(readySymbols(vscode, {}, {}, {}, { report() {} }, 10), /Language support/);
  const token = { isCancellationRequested: false };
  const result = readySymbols(vscode, {}, {}, token, { report() {} });
  token.isCancellationRequested = true;
  await assert.rejects(result, /cancelled/);
});

test('panel shows loading before discovery, supports retry, and ignores cancelled results', async () => {
  const host = createMapHost();
  let finish;
  host.openMap({
    load: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  const pending = host.receive({ type: 'ready' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(host.messages[0].type, 'loading');
  await host.receive({ type: 'cancelLoad' });
  finish({ graph: {}, root: {} });
  await pending;
  assert.equal(host.messages.at(-1).status, 'cancelled');
  assert.equal(
    host.messages.some((message) => message.type === 'graph'),
    false,
  );
  const retry = host.receive({ type: 'retryLoad' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(host.messages.at(-1).type, 'loading');
  host.close();
  finish({ graph: {}, root: {} });
  await retry;
  assert.equal(
    host.messages.some((message) => message.type === 'graph'),
    false,
  );
});

test('import-only files with parentheses return valid empty symbols instead of timing out', async () => {
  const result = await readySymbols(
    { commands: { executeCommand: async () => [] } },
    {},
    { getText: () => 'from settings import (HOST, PORT)' },
    {},
    { report() {} },
    2000,
  );
  assert.deepEqual(result, []);
});
