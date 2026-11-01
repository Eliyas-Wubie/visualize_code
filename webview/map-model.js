const { layout } = require('./layout');
const { classGraph } = require('./classGraph');
const { withLive } = require('./liveGraph');
const { withNodeInfo } = require('./nodeInfo');

/** Project graph, runtime, and diagnostic state into mode-specific nodes and connected edge IDs. */
function projectGraph(graph, live, diagnostics, mode) {
  const observed = withNodeInfo(withLive(graph, live), live, diagnostics);
  const result = layout(mode === 'oop' ? classGraph(observed) : observed);
  return {
    ...result,
    nodes: result.nodes.map((node) => ({
      ...node,
      id: `${mode}-${node.id}`,
      type: mode === 'oop' ? 'class' : 'function',
    })),
    edges: result.edges.map((edge) => ({
      ...edge,
      source: `${mode}-${edge.source}`,
      target: `${mode}-${edge.target}`,
    })),
  };
}

module.exports = { projectGraph };
