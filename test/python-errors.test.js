const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { openRuntimePipe } = require('../src/runtime-pipe');
const { ingest } = require('../src/runtime-data');

test(
  'Python profiling forwards entry arguments and captures exceptions without swallowing failure',
  { timeout: 10000 },
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
          resolve('sample/python/errors.py'),
          '--',
          'visible-argument',
        ],
        {
          env: {
            ...process.env,
            VISUALIZE_ENDPOINT: pipe.endpoint,
            VISUALIZE_TOKEN: pipe.token,
            VISUALIZE_ROOT: process.cwd(),
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (data) => {
        stdout += data;
      });
      child.stderr.on('data', (data) => {
        stderr += data;
      });
      const timer = setTimeout(() => child.kill(), 8000);
      try {
        const code = await new Promise((resolve, reject) => {
          child.once('error', reject);
          child.once('close', resolve);
        });
        assert.equal(code, 1);
      } finally {
        clearTimeout(timer);
      }
      assert.ok(stdout.includes('visible-argument'));
      assert.ok(stderr.includes('ValueError: Synthetic Python failure'));
      assert.ok(
        state.logs.some(
          (entry) => entry.level === 'error' && entry.uri.endsWith('/sample/python/errors.py'),
        ),
      );
    } finally {
      pipe.dispose();
    }
  },
);
