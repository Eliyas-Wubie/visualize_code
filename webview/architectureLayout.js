const { layout } = require('./layout');

/** Arrange estimated responsibilities in top-to-bottom rows while preserving observed edge direction and feedback loops. */
function architectureLayout(graph) {
  const ranks = {
    ui: 0,
    entry: 1,
    service: 2,
    model: 3,
    data: 3,
    shared: 4,
    tests: 4,
    unclassified: 5,
  };
  const columns = new Map();
  const projected = layout(graph);
  return {
    ...projected,
    architecture: graph.architecture,
    nodes: projected.nodes.map((node) => {
      const rank = ranks[node.data.role];
      const column = columns.get(rank) || 0;
      columns.set(rank, column + 1);
      return { ...node, type: 'architecture', position: { x: column * 390, y: rank * 290 } };
    }),
    edges: projected.edges.map((edge, index) => ({
      ...edge,
      label: `${graph.edges[index].count} ${graph.edges[index].kind === 'render' ? 'render' : 'call'} links`,
    })),
  };
}

module.exports = { architectureLayout };
