const { test } = require('node:test');
const assert = require('node:assert/strict');
const { projectGraph } = require('../webview/map-model');

test('map projection preserves function and class connections while applying live health data', () => {
  const owner = { id: 'service', name: 'Service', file: 'service.js', line: 1 };
  const graph = {
    root: 'run',
    nodes: [
      { id: 'run', name: 'run', classInfo: owner, file: 'service.js', line: 2 },
      { id: 'work', name: 'work', classInfo: owner, file: 'service.js', line: 3 },
    ],
    edges: [{ from: 'run', to: 'work', lines: [4] }],
  };
  const live = {
    active: ['work'],
    edges: [{ from: 'run', to: 'work' }],
    logs: { work: [{ level: 'error', text: 'Synthetic failure' }] },
    metrics: {},
  };
  const functions = projectGraph(graph, live, {}, 'functions');
  assert.equal(functions.nodes[1].data.displayName, 'Service.work');
  assert.equal(functions.nodes[1].data.severity, 'error');
  assert.equal(functions.edges[0].target, functions.nodes[1].id);
  const classes = projectGraph(graph, live, {}, 'oop');
  assert.equal(classes.nodes.length, 1);
  assert.equal(classes.nodes[0].data.severity, 'error');
  assert.equal(classes.edges[0].source, classes.edges[0].target);
});
