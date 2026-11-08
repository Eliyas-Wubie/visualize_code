const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { CallGraph } = require('../src/graph');

/** Build an isolated VS Code panel host for observable message and lifecycle tests. */
function createMapHost() {
  const commands = new Map();
  const messages = [];
  const opened = [];
  const root = {
    name: 'main',
    uri: { toString: () => 'file:///main.js' },
    selectionRange: { start: { line: 0, character: 0 } },
  };
  let receive;
  let close;
  let disposed = false;
  let title;
  const liveRequests = [];
  const panel = {
    webview: {
      postMessage: (message) => messages.push(message),
      onDidReceiveMessage: (callback) => {
        receive = callback;
        return {
          dispose: () => {
            disposed = true;
          },
        };
      },
    },
    onDidDispose: (callback) => {
      close = callback;
    },
  };
  const vscode = {
    languages: { getDiagnostics: () => [], onDidChangeDiagnostics: () => ({ dispose() {} }) },
    commands: {
      registerCommand: (name, callback) => {
        commands.set(name, callback);
        return {};
      },
      executeCommand: async () => [],
    },
    window: {
      createWebviewPanel: (_, value) => {
        title = value;
        return panel;
      },
      showTextDocument: async (...args) => opened.push(args),
      showErrorMessage: (message) => {
        throw new Error(message);
      },
    },
    workspace: { asRelativePath: (uri) => uri.toString() },
    Uri: { joinPath: (...parts) => parts.join('/') },
    ViewColumn: { One: 1, Beside: 2 },
  };
  const sandbox = {
    setTimeout,
    clearTimeout,
    module: { exports: {} },
    require: (name) => {
      if (name === 'vscode') return vscode;
      if (name === './graph') return { CallGraph };
      if (name === './start') return { chooseStart: async () => root };
      if (name === './panel') return { render: () => '<html></html>' };
      if (name === './enrich-graph') return require('../src/enrich-graph');
      if (name === './parameters') return require('../src/parameters');
      if (name === './classes') return require('../src/classes');
      if (name === './live-match') return require('../src/live-match');
      if (name === './diagnostics') return require('../src/diagnostics');
      if (name === './editing') return require('../src/editing');
      if (name === './refresh-map') return require('../src/refresh-map');
      if (name === './map-messages') return require('../src/map-messages');
      if (name === './map-sources') return require('../src/map-sources');
      if (name === './map-state') return require('../src/map-state');
      if (name === './documentation') return require('../src/documentation');
      if (name === './complexity') return require('../src/complexity');
      if (name === './live')
        return {
          createLive: () => ({
            state: { status: 'Not running', records: new Map(), frames: [] },
            subscribe: () => ({ dispose() {} }),
            start: async () => {},
            dispose() {},
          }),
        };
      throw new Error(`Unexpected module: ${name}`);
    },
  };
  runInNewContext(readFileSync(require.resolve('../src/map'), 'utf8'), sandbox);
  const openMap = (options = {}) => {
    const graph = new CallGraph(
      async () => vscode.commands.executeCommand('vscode.provideOutgoingCalls'),
      (uri) => uri.toString(),
    );
    graph.add(root);
    return sandbox.module.exports.showMap(
      { extensionUri: 'extension' },
      {
        state: { status: 'Not running', records: new Map(), frames: [] },
        subscribe: () => ({ dispose() {} }),
        start: async (uri, app) => liveRequests.push({ uri, app }),
      },
      graph,
      root,
      options,
    );
  };
  commands.set('visualizeCode.fromCursor', openMap);
  commands.set('visualizeCode.pickStart', openMap);
  return {
    commands,
    messages,
    opened,
    root,
    vscode,
    openMap,
    liveRequests,
    title: () => title,
    receive: (message) => receive(message),
    close: () => close(),
    disposed: () => disposed,
  };
}

module.exports = { createMapHost };
