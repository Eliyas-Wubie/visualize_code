/** Place each function once on a shared canvas; breadth-first rows keep cycles finite. */
function layout(graph) {
  const ids = new Map(graph.nodes.map((node, index) => [node.id, `fn-${index}`]));
  const children = new Map();
  for (const edge of graph.edges) {
    if (!children.has(edge.from)) children.set(edge.from, []);
    children.get(edge.from).push(edge.to);
  }
  const depths = new Map([[graph.root, 0]]);
  const queue = [graph.root];
  for (let index = 0; index < queue.length; index++) {
    for (const id of children.get(queue[index]) || []) {
      if (depths.has(id)) continue;
      depths.set(id, depths.get(queue[index]) + 1);
      queue.push(id);
    }
  }
  const rows = new Map();
  const nodes = graph.nodes.map((node) => {
    const depth = depths.get(node.id) || 0;
    const row = rows.get(depth) || 0;
    rows.set(depth, row + 1);
    const className = node.classInfo?.qualifiedName || node.classInfo?.name;
    const alreadyQualified =
      className &&
      (node.name.startsWith(`${className}.`) || node.name.startsWith(`${node.classInfo.name}.`));
    const displayName = className && !alreadyQualified ? `${className}.${node.name}` : node.name;
    return {
      id: ids.get(node.id),
      type: 'function',
      position: { x: row * 360, y: depth * 250 },
      data: { ...node, displayName, className, hostId: node.id, root: node.id === graph.root },
    };
  });
  const edges = graph.edges.map((edge, index) => ({
    id: `call-${index}`,
    source: ids.get(edge.from),
    target: ids.get(edge.to),
    type: 'call',
    markerEnd: { type: 'arrowclosed', color: '#849ac2' },
    data: { lines: edge.lines, kind: edge.kind },
    label: edge.kind === 'render' ? 'renders' : undefined,
    ariaLabel: `${edge.kind === 'render' ? 'Renders' : 'Call'} at lines ${edge.lines.join(', ')}`,
    animated: Boolean(edge.active),
    style: edge.active ? { stroke: '#ffc66d', strokeWidth: 3 } : undefined,
  }));
  return { nodes, edges };
}

module.exports = { layout };
