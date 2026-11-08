const { severity, mergeDiagnostics } = require('./nodeInfo');

/** Group known functions using a descriptor; aggregate health and directed relationships without inferring edges. */
function aggregateGraph(graph, describe) {
  const groups = new Map();
  const owners = new Map();
  for (const node of graph.nodes) {
    if (!node.file) continue;
    const descriptor = describe(node);
    const { id } = descriptor;
    owners.set(node.id, id);
    if (!groups.has(id))
      groups.set(id, {
        id,
        ...descriptor,
        methods: [],
        sourceId: node.id,
        line: node.line,
        loaded: true,
        omitted: 0,
        logs: [],
        diagnostics: [],
      });
    const group = groups.get(id);
    group.methods.push({ ...node });
    group.loaded &&= node.loaded;
    group.omitted += node.omitted || 0;
    group.active ||= node.active;
    group.current ||= node.current;
    group.visited ||= node.visited;
    group.recent ||= node.recent;
    group.logs.push(...(node.logs || []));
    group.diagnostics = mergeDiagnostics([
      ...group.diagnostics,
      ...(node.diagnostics || []),
      ...(node.classDiagnostics || []),
    ]);
    group.severity = severity(group.diagnostics, group.logs);
    if (node.live) {
      group.live ||= { calls: 0, cpuMs: 0 };
      group.live.calls += node.live.calls;
      group.live.cpuMs += node.live.cpuMs;
      group.live.timing = node.live.timing;
      group.live.countLabel = node.live.countLabel;
    }
  }
  const connections = new Map();
  for (const edge of graph.edges) {
    const from = owners.get(edge.from);
    const to = owners.get(edge.to);
    if (!from || !to) continue;
    const key = JSON.stringify([from, to, edge.kind || 'call']);
    if (!connections.has(key))
      connections.set(key, { from, to, kind: edge.kind, lines: [], count: 0 });
    const connection = connections.get(key);
    connection.lines = [...new Set([...connection.lines, ...edge.lines])];
    connection.count++;
    connection.active ||= edge.active;
  }
  return {
    ...graph,
    root: owners.get(graph.root),
    nodes: [...groups.values()],
    edges: [...connections.values()],
  };
}

module.exports = { aggregateGraph };
