const { branchPositions } = require('./branch-positions');

/** Project downward branch lanes and original directed calls into stable React Flow nodes. */
function layout(graph, dimensions) {
  const ids = new Map(graph.nodes.map((node) => [node.id, `fn-${encodeURIComponent(node.id)}`]));
  const positions = branchPositions(graph, dimensions);
  const nodes = graph.nodes.map((node) => {
    const className = node.classInfo?.qualifiedName || node.classInfo?.name;
    const alreadyQualified =
      className &&
      (node.name.startsWith(`${className}.`) || node.name.startsWith(`${node.classInfo.name}.`));
    const displayName = className && !alreadyQualified ? `${className}.${node.name}` : node.name;
    return {
      id: ids.get(node.id),
      type: 'function',
      position: positions.get(node.id),
      data: { ...node, displayName, className, hostId: node.id, root: node.id === graph.root },
    };
  });
  const edges = graph.edges.map((edge, index) => ({
    id: `call-${index}`,
    source: ids.get(edge.from),
    target: ids.get(edge.to),
    type: 'call',
    markerEnd: { type: 'arrowclosed', color: '#7c7e8d' },
    data: { lines: edge.lines, kind: edge.kind },
    label: edge.kind === 'render' ? 'renders' : undefined,
    ariaLabel: `${edge.kind === 'render' ? 'Renders' : 'Call'} at lines ${edge.lines.join(', ')}`,
    animated: Boolean(edge.active),
    style: edge.active ? { stroke: '#ffc66d', strokeWidth: 3 } : undefined,
  }));
  return { nodes, edges };
}

module.exports = { layout };
