const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chooseLaunch } = require('../src/launch-targets');
const { profiledConfiguration } = require('../src/launch-profile');

function host(action, configurations = []) {
  const folder = { uri: { fsPath: '/repo' } };
  return {
    workspace: {
      getWorkspaceFolder: () => folder,
      getConfiguration: () => ({ get: () => configurations }),
    },
    Uri: { joinPath: (base, ...parts) => ({ fsPath: [base.fsPath || base, ...parts].join('/') }) },
    window: {
      showQuickPick: async (options) =>
        options.find((option) => option.action === action) || options[0],
      showInputBox: async () => 'http://localhost:3000',
    },
  };
}

test('Next.js and React maps can launch their package manager scripts or browser debugger', async () => {
  const app = {
    folder: { uri: { fsPath: '/repo' } },
    root: 'web',
    framework: 'Next.js',
    scripts: { dev: 'next dev' },
    packageManager: 'pnpm',
    files: [],
    entries: [],
  };
  const server = await chooseLaunch(host('server'), { fsPath: '/repo/web/app/page.tsx' }, app);
  assert.equal(server.configuration.runtimeExecutable, 'pnpm');
  assert.deepEqual(server.configuration.runtimeArgs, ['run', 'dev']);
  assert.equal(server.cwd, '/repo/web');
  const browser = await chooseLaunch(
    host('browser'),
    { fsPath: '/repo/web/app/page.tsx' },
    { ...app, framework: 'React' },
  );
  assert.equal(browser.configuration.type, 'pwa-chrome');
  assert.equal(browser.configuration.url, 'http://localhost:3000');
  assert.equal(browser.mode, 'debugger');
});

test('Python framework maps launch their actual development servers rather than only importing app definitions', async () => {
  const app = {
    folder: { uri: { fsPath: '/repo' } },
    root: 'api',
    framework: 'FastAPI / Python',
    files: ['api/main.py'],
    entries: ['api/main.py'],
  };
  const vscode = host('pythonServer');
  vscode.window.showInputBox = async () => 'main:app';
  const fastapi = await chooseLaunch(vscode, { fsPath: '/repo/api/main.py' }, app);
  assert.equal(fastapi.configuration.module, 'uvicorn');
  assert.deepEqual(fastapi.configuration.args, ['main:app', '--host', '127.0.0.1']);
  const django = await chooseLaunch(
    vscode,
    { fsPath: '/repo/api/manage.py' },
    {
      ...app,
      framework: 'Django / Python',
      files: ['api/manage.py'],
    },
  );
  assert.equal(django.configuration.django, true);
  assert.deepEqual(django.configuration.args, ['runserver', '--noreload']);
});

test('Python profiling preserves module arguments and existing environment; browser configs remain uninstrumented', () => {
  const vscode = host();
  const target = {
    mode: 'python',
    cwd: '/repo',
    configuration: {
      type: 'debugpy',
      module: 'uvicorn',
      args: ['main:app'],
      env: { APP_MODE: 'test' },
    },
  };
  const config = profiledConfiguration(vscode, { extensionUri: '/extension' }, target, {
    endpoint: 'pipe',
    token: 'synthetic',
  });
  assert.equal(config.module, undefined);
  assert.deepEqual(config.args, ['--module', 'uvicorn', '--', 'main:app']);
  assert.equal(config.env.APP_MODE, 'test');
  assert.ok(config.program.endsWith('/runtime/python/run.py'));
  const browser = profiledConfiguration(
    vscode,
    {},
    { mode: 'debugger', configuration: { type: 'pwa-chrome', url: 'http://localhost' } },
  );
  assert.equal(browser.type, 'pwa-chrome');
  assert.equal(browser.env, undefined);
});

test('selected JS and Python file maps bypass extension-host launch choices', async () => {
  const configuration = {
    name: 'Run Execution Visualizer',
    type: 'extensionHost',
    request: 'launch',
  };
  const vscode = host(undefined, [configuration]);
  vscode.window.showQuickPick = async () => {
    throw new Error('Unexpected launch picker');
  };
  for (const file of ['sample/live.js', 'sample/python/main.py']) {
    const app = {
      folder: { uri: { fsPath: '/repo' } },
      root: '.',
      framework: 'VS Code extension',
      selectedFile: file,
    };
    const target = await chooseLaunch(vscode, { fsPath: '/repo/' + file }, app);
    assert.equal(target.configuration.program, '/repo/' + file);
    assert.equal(target.configuration.type, file.endsWith('.py') ? 'debugpy' : 'node');
  }
});

test('whole extension app picker includes runnable files and explicitly labels extension-host launches', async () => {
  const { launchOptions } = require('../src/launch-options');
  const app = {
    framework: 'VS Code extension',
    entries: ['src/extension.js'],
    files: ['src/extension.js', 'sample/live.js'],
  };
  const options = launchOptions(app, [{ name: 'Run Execution Visualizer', type: 'extensionHost' }]);
  assert(options.some((option) => option.file === 'sample/live.js'));
  assert.match(options[0].description, /Extension Development Host/);
});
