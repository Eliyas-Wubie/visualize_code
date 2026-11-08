/** Place feedback/peer links in exterior lanes using the actual visible node positions, including folder-relative positions. */
function returnRoutes(nodes, edges) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const boxes = new Map(
    nodes.map((node) => {
      const position = { ...node.position };
      const seen = new Set([node.id]);
      let parent = byId.get(node.parentId);
      while (parent && !seen.has(parent.id)) {
        position.x += parent.position.x;
        position.y += parent.position.y;
        seen.add(parent.id);
        parent = byId.get(parent.parentId);
      }
      return [
        node.id,
        {
          ...position,
          width: node.measured?.width || node.style?.width || 280,
          height: node.measured?.height || node.style?.height || 300,
          folder: node.type === 'folder',
        },
      ];
    }),
  );
  const feedback = edges
    .filter(
      (edge) =>
        edge.source !== edge.target &&
        boxes.has(edge.source) &&
        boxes.has(edge.target) &&
        boxes.get(edge.target).y <= boxes.get(edge.source).y,
    )
    .sort((a, b) => {
      const first = JSON.stringify([a.source, a.target, a.data?.kind]);
      const second = JSON.stringify([b.source, b.target, b.data?.kind]);
      return first < second ? -1 : first > second ? 1 : 0;
    });
  const routes = new Map();
  const left = Math.min(...[...boxes.values()].map((box) => box.x));
  feedback.forEach((edge, index) => {
    const source = boxes.get(edge.source);
    const target = boxes.get(edge.target);
    const row = [...boxes.values()].filter((box) => !box.folder && Math.abs(box.y - source.y) < 1);
    routes.set(edge.id, {
      x: left - 90 - index * 28,
      bottom:
        Math.max(source.y + source.height, ...row.map((box) => box.y + box.height)) +
        40 +
        index * 12,
      top: target.y - 40 - index * 12,
    });
  });
  return edges.map((edge) => ({
    ...edge,
    data: { ...edge.data, returnRoute: routes.get(edge.id) },
  }));
}

/** Round a feedback path through its exterior lane; keep the label beside the vertical return segment. */
function returnPath(sourceX, sourceY, targetX, targetY, route) {
  const bottom = Math.max(route.bottom, sourceY + 24);
  const top = Math.min(route.top, targetY - 24);
  const x = Math.min(route.x, sourceX - 40, targetX - 40);
  return [
    `M ${sourceX} ${sourceY} L ${sourceX} ${bottom - 12} Q ${sourceX} ${bottom} ${sourceX - 12} ${bottom} L ${x + 12} ${bottom} Q ${x} ${bottom} ${x} ${bottom - 12} L ${x} ${top + 12} Q ${x} ${top} ${x + 12} ${top} L ${targetX - 12} ${top} Q ${targetX} ${top} ${targetX} ${top + 12} L ${targetX} ${targetY}`,
    x,
    (top + bottom) / 2,
  ];
}

module.exports = { returnRoutes, returnPath };
