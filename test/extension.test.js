const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMapHost } = require('../test-support/map-host');

test('visualizer tabs identify their selected function, file, or app', () => {
  const host = createMapHost();
  host.openMap();
  assert.equal(host.title(), 'main');
  host.openMap({ app: { name: 'Web', selectedFile: 'src/App.jsx' } });
  assert.equal(host.title(), 'src/App.jsx');
  host.openMap({ app: { name: 'Web' } });
  assert.equal(host.title(), 'Web');
});

test('app maps send their app launch metadata to Run live instead of disabling the action', async () => {
  const host = createMapHost();
  const app = { name: 'Frontend', framework: 'Next.js' };
  host.openMap({ app });
  await host.receive({ type: 'startLive' });
  assert.equal(host.liveRequests[0].app, app);
  assert.equal(host.liveRequests[0].uri, host.root.uri);
});

test('command, webview handshake, expansion, and source navigation work together', async () => {
  const host = createMapHost();
  await host.commands.get('visualizeCode.fromCursor')();
  await host.receive({ type: 'ready' });
  assert.equal(host.messages.find((message) => message.type === 'graph').capabilities.live, true);
  const id = host.messages.find((message) => message.type === 'graph').root;
  await host.receive({ type: 'expand', id });
  assert.equal(
    host.messages.filter((message) => message.type === 'graph').at(-1).nodes[0].loaded,
    true,
  );
  await host.receive({ type: 'open', id });
  assert.equal(host.opened[0][0], host.root.uri);
  assert.equal(host.opened[0][1].selection, host.root.selectionRange);
  host.close();
  assert.equal(host.disposed(), true);
});

test('webview cannot open arbitrary URIs or expand unknown items', async () => {
  const host = createMapHost();
  await host.commands.get('visualizeCode.pickStart')();
  await host.receive({ type: 'open', id: 'file:///private.txt' });
  await host.receive({ type: 'expand', id: 'unknown' });
  await host.receive(null);
  assert.equal(host.opened.length, 0);
  assert.equal(host.messages.length, 0);
});

test('provider errors reach the view and expansion can be retried', async () => {
  const host = createMapHost();
  await host.commands.get('visualizeCode.fromCursor')();
  await host.receive({ type: 'ready' });
  const id = host.messages.find((message) => message.type === 'graph').root;
  host.vscode.commands.executeCommand = async () => {
    throw new Error('sensitive details');
  };
  await host.receive({ type: 'expand', id });
  const failed = host.messages.filter((message) => message.type === 'graph').at(-1);
  assert.equal(failed.error, 'Could not load calls. Check language support, then retry.');
  assert.equal(failed.nodes[0].loaded, false);
  host.vscode.commands.executeCommand = async () => [];
  await host.receive({ type: 'expand', id });
  assert.equal(
    host.messages.filter((message) => message.type === 'graph').at(-1).nodes[0].loaded,
    true,
  );
});
