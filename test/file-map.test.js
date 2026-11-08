const { test } = require('node:test');
const assert = require('node:assert/strict');
const { projectGraph } = require('../webview/map-model');
const { withHover } = require('../webview/hoverGraph');

const graph = {
  root: 'main',
  nodes: [
    { id: 'main', name: 'main', file: 'src\\app.js', line: 1, loaded: true },
    { id: 'helper', name: 'helper', file: 'src/app.js', line: 10, loaded: true },
    { id: 'save', name: 'save', file: 'src/data/store.js', line: 2, loaded: true },
    { id: 'test', name: 'test', file: 'test/app.js', line: 1, loaded: true },
    { id: 'root', name: 'root', file: 'index.js', line: 1, loaded: true },
  ],
  edges: [
    { from: 'main', to: 'save', lines: [3] },
    { from: 'helper', to: 'save', lines: [13] },
    { from: 'main', to: 'helper', lines: [4] },
    { from: 'main', to: 'save', kind: 'render', lines: [5] },
    { from: 'missing', to: 'save', lines: [] },
  ],
};

test('file view groups normalized paths into folder areas and merges directed links by kind', () => {
  const view = projectGraph(graph, {}, {}, 'files');
  const files = view.nodes.filter((node) => node.type === 'file');
  const folders = view.nodes.filter((node) => node.type === 'folder');
  assert.equal(files.length, 4);
  assert.equal(folders.length, 4);
  const app = files.find((node) => node.data.file === 'src/app.js');
  const store = files.find((node) => node.data.file === 'src/data/store.js');
  assert.equal(app.data.methods.length, 2);
  assert.equal(app.data.sourceId, 'main');
  assert.equal(view.edges.length, 3);
  const link = view.edges.find(
    (edge) => edge.source === app.id && edge.target === store.id && !edge.data.kind,
  );
  assert.equal(link.label, '2 call links');
  assert.deepEqual(link.data.lines, [3, 13]);
  assert(view.edges.some((edge) => edge.source === edge.target));
  assert(view.edges.some((edge) => edge.label === '1 render links'));
  for (const file of files) {
    const parent = folders.find((folder) => folder.id === file.parentId);
    assert(parent);
    assert(view.nodes.indexOf(parent) < view.nodes.indexOf(file));
    assert.equal(file.extent, 'parent');
    assert(file.position.y + 150 < parent.style.height);
  }
  for (let i = 1; i < folders.length; i++)
    assert(folders[i].position.y > folders[i - 1].position.y + folders[i - 1].style.height);
  const hover = withHover(view.nodes, view.edges, {
    kind: 'edge',
    id: link.id,
    source: link.source,
  });
  assert.equal(
    hover.edges.find((edge) => edge.id === link.id).label,
    'src/app.js → src/data/store.js',
  );
  assert.equal(graph.nodes[0].file, 'src\\app.js');
});

test('file details aggregate source health, logs and runtime counts without invented files', () => {
  const live = {
    active: ['save'],
    metrics: { main: { calls: 2, cpuMs: 3 }, helper: { calls: 4, cpuMs: 5 } },
    logs: { helper: [{ level: 'error', text: 'failure' }] },
    edges: [{ from: 'main', to: 'save' }],
  };
  const view = projectGraph(
    graph,
    live,
    { functions: { main: [{ level: 'warning', text: 'notice' }] } },
    'files',
  );
  const app = view.nodes.find((node) => node.data.file === 'src/app.js');
  assert.equal(app.data.severity, 'error');
  assert.equal(app.data.live.calls, 6);
  assert.equal(app.data.live.cpuMs, 8);
  assert.equal(app.data.logs[0].text, 'failure');
  assert(view.edges.some((edge) => edge.animated));
  assert.equal(projectGraph({ nodes: [], edges: [] }, {}, {}, 'files').nodes.length, 0);
});

test('host catalog keeps empty files and folders visible and maps file editing to authoritative IDs', () => {
  const resources = [
    { id: 'empty-file', file: 'created/empty.js', kind: 'file' },
    { id: 'existing', file: 'src/app.js', kind: 'file' },
    { id: 'empty-folder', file: 'created/empty-folder', kind: 'folder' },
  ];
  const view = projectGraph({ ...graph, resources }, {}, {}, 'files');
  const empty = view.nodes.find((node) => node.data.editId === 'empty-file');
  assert.equal(empty.data.methods.length, 0);
  assert.equal(empty.data.sourceId, 'empty-file');
  assert(
    view.nodes.some((node) => node.type === 'folder' && node.data.name === 'created/empty-folder'),
  );
  const existing = view.nodes.filter(
    (node) => node.type === 'file' && node.data.file === 'src/app.js',
  );
  assert.equal(existing.length, 1);
  assert.equal(existing[0].data.editId, 'existing');
  assert.equal(view.edges.length, 3);
});
