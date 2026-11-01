const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { openRuntimePipe } = require('../src/runtime-pipe');
const { ingest } = require('../src/runtime-data');

test(
  'real Node.js preload streams repeated updates and final counts without keeping the process alive',
  { timeout: 15000 },
  async () => {
    const messages = [];
    const state = { records: new Map() };
    const pipe = await openRuntimePipe((message) => {
      messages.push(message);
      ingest(state, message);
    });
    try {
      const child = spawn(process.execPath, [resolve('sample/live.js')], {
        env: {
          ...process.env,
          VISUALIZE_ENDPOINT: pipe.endpoint,
          VISUALIZE_TOKEN: pipe.token,
          NODE_OPTIONS:
            `${process.env.NODE_OPTIONS || ''} --import=${require('node:url').pathToFileURL(resolve('runtime/bootstrap.mjs')).href}`.trim(),
          VISUALIZE_ROOT: process.cwd(),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      const killTimer = setTimeout(() => child.kill(), 10000);
      let code;
      try {
        code = await new Promise((resolve, reject) => {
          child.once('error', reject);
          child.once('close', resolve);
        });
      } finally {
        clearTimeout(killTimer);
      }
      assert.equal(code, 0, stderr);
      assert.ok(messages.filter((message) => message.type === 'metrics').length >= 2);
      assert.equal(
        messages.some((message) => message.type === 'error'),
        false,
      );
      const rows = [...state.records.values()].filter((row) => row.uri.endsWith('/sample/live.js'));
      assert.ok(
        rows.some((row) => row.calls === 10),
        'the ten-tick function count must be retained',
      );
      assert.ok(rows.every((row) => row.cpuMs >= 0));
    } finally {
      pipe.dispose();
    }
  },
);

test('metric ingestion rejects malformed data and accumulates valid deltas', () => {
  const state = { records: new Map() };
  const row = { uri: 'file:///sample.js', position: { line: 1, character: 0 }, calls: 3, cpuMs: 2 };
  ingest(state, {
    type: 'metrics',
    records: [row, { ...row, calls: -1 }, { ...row, uri: 'https://example.com' }],
  });
  ingest(state, { type: 'metrics', records: [row] });
  assert.equal(state.records.size, 1);
  assert.equal([...state.records.values()][0].calls, 6);
  assert.equal([...state.records.values()][0].cpuMs, 4);
});
