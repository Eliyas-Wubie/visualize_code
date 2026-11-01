const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { openRuntimePipe } = require('../src/runtime-pipe');
const { ingest } = require('../src/runtime-data');

async function trace(args) {
  const state = { records: new Map(), logs: [] };
  const pipe = await openRuntimePipe((message) => ingest(state, message));
  try {
    const child = spawn(
      process.execPath,
      [
        '--import',
        require('node:url').pathToFileURL(resolve('runtime/bootstrap.mjs')).href,
        ...args,
      ],
      {
        env: {
          ...process.env,
          VISUALIZE_ENDPOINT: pipe.endpoint,
          VISUALIZE_TOKEN: pipe.token,
          VISUALIZE_CRASH_FILE: pipe.crashFile,
          VISUALIZE_ROOT: process.cwd(),
        },
        stdio: 'ignore',
      },
    );
    const timer = setTimeout(() => child.kill(), 8000);
    try {
      const code = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', resolve);
      });
      pipe.flushCrash();
      return { code, logs: state.logs };
    } finally {
      clearTimeout(timer);
    }
  } finally {
    pipe.dispose();
  }
}

test(
  'live logging captures info, warnings, and handled Error objects at their original source',
  { timeout: 10000 },
  async () => {
    const { code, logs } = await trace([resolve('sample/logs.js')]);
    assert.equal(code, 0);
    assert.ok(
      logs.some((entry) => entry.level === 'info' && entry.text.includes('service started')),
    );
    assert.ok(
      logs.some((entry) => entry.level === 'warning' && entry.text.includes('demonstration data')),
    );
    const error = logs.find(
      (entry) => entry.level === 'error' && entry.text.includes('Sample failure'),
    );
    assert.ok(error);
    assert.equal(error.position.line, 5);
    assert.ok(error.uri.endsWith('/sample/logs.js'));
  },
);

test(
  'uncaught errors remain fatal while their originating function is captured',
  { timeout: 10000 },
  async () => {
    const { code, logs } = await trace([
      '-e',
      "new (require('./sample/logs').ExampleService)().run()",
    ]);
    assert.equal(code, 1);
    assert.ok(
      logs.some(
        (entry) =>
          entry.level === 'error' &&
          entry.text.includes('Sample failure') &&
          entry.position.line === 5,
      ),
    );
  },
);
