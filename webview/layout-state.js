/** Detect structural changes independently of metadata, array order, runtime counts and diagnostics. */
function layoutKey(view, root, mode) {
  return JSON.stringify([
    mode,
    root,
    view.nodes.map((node) => node.id).sort(),
    view.edges
      .map((edge) => JSON.stringify([edge.source, edge.target, edge.data?.kind || 'call']))
      .sort(),
  ]);
}

/** Retain user positions and measured card sizes for state-only updates; structural changes receive fresh branch lanes. */
function reconcileLayout(previous, mapped, relayout) {
  const existing = new Map(previous.map((node) => [node.id, node]));
  return mapped.map((node) => {
    const prior = existing.get(node.id);
    return {
      ...node,
      measured: prior?.measured,
      selected: prior?.selected,
      position: !relayout && prior ? prior.position : node.position,
    };
  });
}

module.exports = { layoutKey, reconcileLayout };
