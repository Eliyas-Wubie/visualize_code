const { layout } = require('./layout');
const { classGraph } = require('./classGraph');
const { withLive } = require('./liveGraph');
const { withNodeInfo } = require('./nodeInfo');
const { fileGraph } = require('./fileGraph');
const { folderLayout } = require('./folderLayout');
const { architectureGraph } = require('./architectureGraph');
const { architectureLayout } = require('./architectureLayout');

/** Project graph, runtime, and diagnostic state into mode-specific nodes and connected edge IDs. */
function projectGraph(graph, live, diagnostics, mode, dimensions) {
  const observed = withNodeInfo(withLive(graph, live), live, diagnostics);
  const result =
    mode === 'architecture'
      ? architectureLayout(architectureGraph(observed))
      : mode === 'files'
        ? folderLayout(fileGraph(observed))
        : layout(mode === 'oop' ? classGraph(observed) : observed, dimensions);
  return {
    ...result,
    nodes: result.nodes.map((node) => ({
      ...node,
      id: `${mode}-${node.id}`,
      parentId: node.parentId ? `${mode}-${node.parentId}` : undefined,
      type: ['files', 'architecture'].includes(mode)
        ? node.type
        : mode === 'oop'
          ? 'class'
          : 'function',
    })),
    edges: result.edges.map((edge) => ({
      ...edge,
      source: `${mode}-${edge.source}`,
      target: `${mode}-${edge.target}`,
    })),
  };
}

module.exports = { projectGraph };
