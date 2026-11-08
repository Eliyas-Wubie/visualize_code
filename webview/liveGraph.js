/** Overlay observed counts and debugger frames without inventing runtime call edges. */
function withLive(graph, live) {
  const active = new Set(live.active || []);
  return {
    ...graph,
    liveStatus: live.status,
    nodes: graph.nodes.map((node) => ({
      ...node,
      live: live.metrics?.[node.id] && {
        ...live.metrics[node.id],
        timing: live.timing,
        countLabel: live.countLabel,
      },
      recent:
        live.status === 'Running' && Date.now() - (live.metrics?.[node.id]?.lastSeen || 0) < 1000,
      active: active.has(node.id),
      current: live.current === node.id,
      visited: live.step?.visited.includes(node.id),
    })),
    edges: graph.edges.map((edge) => ({
      ...edge,
      active: (live.edges || []).some(
        (observed) => observed.from === edge.from && observed.to === edge.to,
      ),
    })),
  };
}

module.exports = { withLive };
