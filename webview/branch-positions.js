/** Allocate downward subtree lanes once per node; shared targets/cycles remain connections, never duplicate placements. */
function branchPositions(graph, dimensions = new Map()) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const ordered = [...nodes.keys()].sort(compare);
  if (!ordered.length) return new Map();
  const outgoing = new Map(ordered.map((id) => [id, new Map()]));
  const incoming = new Set();
  for (const edge of graph.edges) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) continue;
    if (edge.from !== edge.to) incoming.add(edge.to);
    const previous = outgoing.get(edge.from).get(edge.to) ?? Infinity;
    outgoing.get(edge.from).set(edge.to, Math.min(previous, ...(edge.lines || [Infinity])));
  }
  const children = new Map(ordered.map((id) => [id, []]));
  const depths = new Map();
  const roots = [];
  const traversal = [];
  const preferred = nodes.has(graph.root)
    ? graph.root
    : ordered.find((id) => !incoming.has(id)) || ordered[0];
  for (const seed of [preferred, ...ordered.filter((id) => !incoming.has(id)), ...ordered]) {
    if (depths.has(seed)) continue;
    roots.push(seed);
    depths.set(seed, 0);
    const queue = [seed];
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      traversal.push(id);
      const targets = [...outgoing.get(id)].sort(
        ([a, lineA], [b, lineB]) => (lineA === lineB ? 0 : lineA < lineB ? -1 : 1) || compare(a, b),
      );
      for (const [target] of targets) {
        if (depths.has(target)) continue;
        depths.set(target, depths.get(id) + 1);
        children.get(id).push(target);
        queue.push(target);
      }
    }
  }
  const widths = new Map();
  for (const id of [...traversal].reverse())
    widths.set(
      id,
      Math.max(
        1,
        children.get(id).reduce((sum, child) => sum + widths.get(child), 0),
      ),
    );
  const lane = Math.max(280, ...ordered.map((id) => dimensions.get(id)?.width || 0)) + 100;
  const rowHeights = new Map();
  for (const id of traversal) {
    const depth = depths.get(id);
    rowHeights.set(depth, Math.max(rowHeights.get(depth) || 0, dimensions.get(id)?.height || 300));
  }
  const rows = [0];
  for (let i = 1; i <= Math.max(...depths.values()); i++)
    rows[i] = rows[i - 1] + rowHeights.get(i - 1) + 100;
  const positions = new Map();
  const pending = [];
  let left = 0;
  for (const id of roots) {
    pending.push({ id, left });
    left += widths.get(id) + 1;
  }
  const origin = (widths.get(preferred) * lane) / 2 - (dimensions.get(preferred)?.width || 280) / 2;
  for (let i = 0; i < pending.length; i++) {
    const { id, left } = pending[i];
    positions.set(id, {
      x: (left + widths.get(id) / 2) * lane - (dimensions.get(id)?.width || 280) / 2 - origin,
      y: rows[depths.get(id)],
    });
    let next = left;
    for (const child of children.get(id)) {
      pending.push({ id: child, left: next });
      next += widths.get(child);
    }
  }
  return positions;
}

module.exports = { branchPositions };
