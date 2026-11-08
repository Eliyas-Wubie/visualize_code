const { severity, mergeDiagnostics } = require('./nodeInfo');

/** Group discovered callables by class; retain directed inter-class and internal call connections. */
function classGraph(graph) {
  const classes = new Map(
    (graph.classEntries || []).map((info) => [
      info.id,
      { ...info, methods: [], loaded: true, omitted: 0 },
    ]),
  );
  const owners = new Map();
  for (const node of graph.nodes) {
    if (!node.classInfo) continue;
    const info = node.classInfo;
    owners.set(node.id, info.id);
    if (!classes.has(info.id))
      classes.set(info.id, { ...info, methods: [], loaded: true, omitted: 0 });
    const group = classes.get(info.id);
    group.methods.push({
      id: node.id,
      name: node.name,
      parameters: node.parameters,
      line: node.line,
      documentation: node.documentation,
      complexity: node.complexity,
    });
    group.loaded = group.loaded && node.loaded;
    group.omitted += node.omitted || 0;
    group.active = group.active || node.active;
    group.current = group.current || node.current;
    group.visited = group.visited || node.visited;
    group.recent = group.recent || node.recent;
    group.logs = [...(group.logs || []), ...(node.logs || [])];
    group.diagnostics = mergeDiagnostics([
      ...(group.diagnostics || []),
      ...(node.classDiagnostics || []),
      ...(node.diagnostics || []),
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
    const key = JSON.stringify([from, to]);
    if (!connections.has(key)) connections.set(key, { from, to, lines: [], calls: [] });
    const connection = connections.get(key);
    connection.lines.push(...edge.lines);
    connection.calls.push({ from: edge.from, to: edge.to });
    connection.active = connection.active || edge.active;
  }
  return {
    ...graph,
    root: owners.get(graph.root) || classes.keys().next().value,
    nodes: [...classes.values()],
    edges: [...connections.values()],
  };
}

module.exports = { classGraph };
