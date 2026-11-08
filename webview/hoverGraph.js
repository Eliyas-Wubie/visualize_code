const HOVER_COLOR = '#c4a0ff';

/** Decorate a view with immediate hover neighbors and endpoint labels without changing graph data or positions. */
function withHover(nodes, edges, hover) {
  const hoveredEdges = edges.filter((edge) =>
    hover?.kind === 'node'
      ? edge.source === hover.id || edge.target === hover.id
      : hover?.kind === 'edge' && edge.id === hover.id && edge.source === hover.source,
  );
  const edgeIds = new Set(hoveredEdges.map((edge) => edge.id));
  const nodeIds = new Set(hoveredEdges.flatMap((edge) => [edge.source, edge.target]));
  if (hover?.kind === 'node') nodeIds.add(hover.id);
  const names = new Map(nodes.map((node) => [node.id, node.data.displayName || node.data.name]));
  return {
    nodes: nodes.map((node) => ({
      ...node,
      className: [
        node.className,
        nodeIds.has(node.id) && 'hover-connected',
        hover?.kind === 'node' && hover.id === node.id && 'hover-origin',
      ]
        .filter(Boolean)
        .join(' '),
    })),
    edges: edges.map((edge) => {
      if (!edgeIds.has(edge.id)) return edge;
      return {
        ...edge,
        zIndex: 1001,
        style: { ...edge.style, stroke: HOVER_COLOR, strokeWidth: 3.5 },
        markerEnd: edge.markerEnd ? { ...edge.markerEnd, color: HOVER_COLOR } : undefined,
        label:
          hover.kind === 'edge'
            ? `${names.get(edge.source)} → ${names.get(edge.target)}`
            : edge.label,
      };
    }),
  };
}

module.exports = { withHover };
