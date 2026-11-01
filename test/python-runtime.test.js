const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { openRuntimePipe } = require('../src/runtime-pipe');
const { ingest } = require('../src/runtime-data');

test(
  'Python runs with counts, elapsed metrics, logs, and unchanged warning output',
  { timeout: 15000 },
  async () => {
    const state = { records: new Map(), logs: [] };
    const pipe = await openRuntimePipe((message) => ingest(state, message));
    try {
      const child = spawn(
        'python',
        [
          '-B',
          resolve('runtime/python/run.py'),
          '--program',
          resolve('sample/python/main.py'),
          '--',
        ],
        {
          env: {
            ...process.env,
            VISUALIZE_ENDPOINT: pipe.endpoint,
            VISUALIZE_TOKEN: pipe.token,
            VISUALIZE_ROOT: process.cwd(),
            PYTHONDONTWRITEBYTECODE: '1',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      let stderr = '';
      let stdout = '';
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      const timer = setTimeout(() => child.kill(), 10000);
      try {
        const code = await new Promise((resolve, reject) => {
          child.once('error', reject);
          child.once('close', resolve);
        });
        assert.equal(code, 0, stderr);
      } finally {
        clearTimeout(timer);
      }
      const records = [...state.records.values()].filter((record) =>
        record.uri.endsWith('/sample/python/main.py'),
      );
      assert.ok(records.some((record) => record.calls === 5));
      assert.ok(records.some((record) => record.cpuMs > 0));
      assert.equal(state.logs.filter((entry) => entry.text === 'Python tick completed').length, 5);
      assert.ok(state.logs.some((entry) => entry.level === 'warning'));
      assert.ok(stderr.includes('Synthetic Python demonstration warning'));
      assert.ok(stdout.includes('Python tick completed'));
    } finally {
      pipe.dispose();
    }
  },
);
