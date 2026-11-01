const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

function setup(trusted = true) {
  const launches = [];
  const notices = [];
  let began;
  let ended;
  let closed = false;
  const vscode = {
    workspace: { isTrusted: trusted, getWorkspaceFolder: () => ({ uri: { fsPath: '/project' } }) },
    window: {
      showInformationMessage: (message) => notices.push(message),
      showErrorMessage: (message) => notices.push(message),
    },
    Uri: { joinPath: (...parts) => ({ fsPath: parts.join('/') }) },
    debug: {
      onDidStartDebugSession: (callback) => {
        began = callback;
        return { dispose() {} };
      },
      onDidTerminateDebugSession: (callback) => {
        ended = callback;
        return { dispose() {} };
      },
      startDebugging: async (_, configuration) => {
        launches.push(configuration);
        began({ id: 'test', configuration });
        return true;
      },
    },
  };
  const sandbox = {
    module: { exports: {} },
    require: (name) => {
      if (name === './debug-live') return { observeDebugger: () => ({ dispose() {} }) };
      if (name === './runtime-pipe')
        return {
          openRuntimePipe: async () => ({
            endpoint: 'local',
            token: 'synthetic',
            flushCrash() {},
            dispose: () => {
              closed = true;
            },
          }),
        };
      return require(name.startsWith('./') ? `../src/${name.slice(2)}` : name);
    },
  };
  runInNewContext(readFileSync(require.resolve('../src/live'), 'utf8'), sandbox);
  const live = sandbox.module.exports.createLive(vscode, { extensionUri: '/extension' });
  return {
    live,
    launches,
    notices,
    vscode,
    end: () => ended({ id: 'test' }),
    closed: () => closed,
  };
}

test('live execution is opt-in, uses a local preload, and cleans up at session end', async () => {
  const host = setup();
  assert.equal(host.launches.length, 0);
  await host.live.start({ scheme: 'file', fsPath: '/project/main.js' });
  assert.equal(host.launches.length, 1);
  assert.equal(host.launches[0].program, '/project/main.js');
  assert.ok(host.launches[0].env.NODE_OPTIONS.includes('--import='));
  assert.equal(host.launches[0].env.VISUALIZE_ENDPOINT, 'local');
  await host.live.start({ scheme: 'file', fsPath: '/project/main.js' });
  assert.equal(host.launches.length, 1);
  host.end();
  assert.equal(host.closed(), true);
  assert.equal(host.live.state.status, 'Finished');
  host.live.dispose();
});

test('a browser debugger can be added to an active development server without discarding metrics', async () => {
  const host = setup();
  await host.live.start({ scheme: 'file', fsPath: '/project/main.js' });
  host.live.state.records.set('synthetic', { calls: 2 });
  host.vscode.window.showQuickPick = async (options) =>
    options.find((option) => option.action === 'browser');
  host.vscode.window.showInputBox = async () => 'http://localhost:5173';
  await host.live.start(
    { scheme: 'file', fsPath: '/project/src/App.jsx' },
    {
      framework: 'React',
      root: '.',
      folder: { uri: { fsPath: '/project' } },
      entries: [],
      files: [],
    },
  );
  assert.equal(host.launches.length, 2);
  assert.equal(host.launches[1].type, 'pwa-chrome');
  assert.equal(host.live.state.records.get('synthetic').calls, 2);
  assert.equal(host.closed(), false);
  host.live.dispose();
});

test('untrusted workspaces cannot launch and Python files use the Python profiler', async () => {
  const untrusted = setup(false);
  await untrusted.live.start({ scheme: 'file', fsPath: '/project/main.js' });
  assert.equal(untrusted.launches.length, 0);
  assert.equal(untrusted.live.state.status, 'Trust this workspace before executing code.');
  untrusted.live.dispose();
  const unsupported = setup();
  await unsupported.live.start({ scheme: 'file', fsPath: '/project/main.py' });
  assert.equal(unsupported.launches.length, 1);
  assert.equal(unsupported.launches[0].type, 'debugpy');
  assert.equal(unsupported.launches[0].args[0], '--program');
  unsupported.live.dispose();
});
