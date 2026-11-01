const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

test('extension activation registers Activity Bar exploration alongside existing flow commands', () => {
  const commands = new Map();
  let explorer = false;
  const vscode = {
    commands: {
      registerCommand: (name, fn) => {
        commands.set(name, fn);
        return {};
      },
    },
  };
  const sandbox = {
    module: { exports: {} },
    require: (name) => {
      if (name === 'vscode') return vscode;
      if (name === './start') return { chooseStart: async () => undefined };
      if (name === './live') return { createLive: () => ({ dispose() {} }) };
      if (name === './apps-view')
        return {
          registerAppsView: (_, context, callback) => {
            explorer = typeof callback === 'function' && Array.isArray(context.subscriptions);
          },
        };
      return require(`../src/${name.slice(2)}`);
    },
  };
  // Map rendering depends on VS Code; activation should register it without opening any webview.
  const originalRequire = sandbox.require;
  sandbox.require = (name) => (name === './map' ? { showMap() {} } : originalRequire(name));
  runInNewContext(readFileSync(require.resolve('../src/extension'), 'utf8'), sandbox);
  sandbox.module.exports.activate({ subscriptions: [] });
  assert.equal(explorer, true);
  assert.ok(commands.has('visualizeCode.fromCursor'));
  assert.ok(commands.has('visualizeCode.pickStart'));
  assert.ok(commands.has('visualizeCode.runLive'));
});
