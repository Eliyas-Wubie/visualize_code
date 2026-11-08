const { test } = require('node:test');
const assert = require('node:assert/strict');
const { architectureRole } = require('../webview/architectureRoles');
const { projectGraph } = require('../webview/map-model');
const { withHover } = require('../webview/hoverGraph');

/** Build a synthetic provider graph without reading or running workspace code. */
function fixture(files, pairs = [], framework) {
  return {
    root: '0',
    app: framework ? { framework } : undefined,
    nodes: files.map((file, id) => ({
      id: String(id),
      name: `fn${id}`,
      file,
      line: 1,
      loaded: true,
    })),
    edges: pairs.map(([from, to]) => ({ from: String(from), to: String(to), lines: [2] })),
  };
}

test('architecture conventions classify only recognized evidence, including Python, Next API and Windows paths', () => {
  assert.equal(architectureRole('src\\services\\billing.ts').role, 'service');
  assert.equal(architectureRole('src/user.repository.ts').role, 'data');
  assert.equal(architectureRole('app/api/users/route.ts', 'Next.js').role, 'entry');
  assert.equal(architectureRole('app/views.py', 'Django / Python').role, 'entry');
  assert.equal(architectureRole('domain/models.py').role, 'model');
  assert.equal(architectureRole('src/controllers/users.test.ts').role, 'tests');
  assert.equal(architectureRole('src/main.py').role, 'unclassified');
});

test('layered estimate requires actual observed links; graph retains direction, loops and source actions', () => {
  const graph = fixture(
    [
      'src/controllers/api.js',
      'src/services/orders.js',
      'src/repositories/orders.js',
      'src/main.js',
    ],
    [
      [0, 1],
      [1, 2],
      [2, 1],
      [1, 1],
    ],
  );
  const live = {
    metrics: { 1: { calls: 3, cpuMs: 2 } },
    logs: { 1: [{ level: 'error', text: 'failure' }] },
  };
  const view = projectGraph(graph, live, {}, 'architecture');
  assert.equal(view.architecture.pattern, 'Layered-style architecture (estimate)');
  assert.equal(view.nodes.length, 4);
  assert.equal(view.edges.length, 4);
  const service = view.nodes.find((node) => node.data.role === 'service');
  const entry = view.nodes.find((node) => node.data.role === 'entry');
  assert(entry.position.y < service.position.y);
  assert.equal(service.data.sourceId, '1');
  assert.equal(service.data.severity, 'error');
  assert.equal(service.data.live.calls, 3);
  assert(service.data.evidence[0].includes('services'));
  assert(view.edges.some((edge) => edge.source === edge.target));
  assert(view.nodes.every((node) => node.type === 'architecture'));
  const link = view.edges[0];
  const hovered = withHover(view.nodes, view.edges, {
    kind: 'edge',
    id: link.id,
    source: link.source,
  });
  assert.equal(hovered.edges[0].label, 'Controllers / API → Services / application logic');
  assert.equal(
    projectGraph({ ...graph, edges: [] }, {}, {}, 'architecture').architecture.pattern,
    'Architecture undetermined',
  );
});

test('MVC and frontend suggestions remain qualified and unknown/empty projects remain explicit', () => {
  const mvc = projectGraph(
    fixture(['views/main.py', 'controllers/main.py', 'models/main.py']),
    {},
    {},
    'architecture',
  );
  assert.equal(mvc.architecture.pattern, 'MVC-style organization (naming estimate)');
  assert(mvc.architecture.evidence.includes('not verified'));
  const react = projectGraph(fixture(['components/App.tsx'], [], 'React'), {}, {}, 'architecture');
  assert.equal(react.architecture.pattern, 'Component-oriented frontend (estimate)');
  const flat = projectGraph(fixture(['main.js', 'worker.js'], [[0, 1]]), {}, {}, 'architecture');
  assert.equal(flat.architecture.pattern, 'Architecture undetermined');
  assert.equal(flat.nodes[0].data.files.length, 2);
  assert.equal(flat.nodes[0].data.role, 'unclassified');
  const empty = projectGraph({ nodes: [], edges: [] }, {}, {}, 'architecture');
  assert.equal(empty.nodes.length, 0);
  assert.equal(empty.architecture.pattern, 'Architecture undetermined');
});
