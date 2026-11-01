const { matchFunction } = require('./live-match');

/** Associate current VS Code diagnostics with functions or containing classes, without guessing file-wide ownership. */
function diagnosticSnapshot(graph, getDiagnostics) {
  const functions = {};
  const classes = {};
  const files = new Map();
  for (const item of graph.items.values()) files.set(item.uri.toString(), item.uri);
  for (const [uri, source] of files) {
    for (const entry of getDiagnostics(source)) {
      const diagnostic = {
        level: entry.severity === 0 ? 'error' : entry.severity === 1 ? 'warning' : 'info',
        text: entry.message,
        line: entry.range.start.line + 1,
        source: entry.source || 'VS Code',
        code: String(entry.code?.value ?? entry.code ?? ''),
      };
      const id = matchFunction(graph, uri, entry.range.start);
      if (id) (functions[id] ||= []).push(diagnostic);
      for (const node of graph.nodes.values()) {
        const info = node.classInfo;
        if (!info || classes[info.id]?.some((existing) => existing === diagnostic)) continue;
        const range = info.range;
        const point = entry.range.start;
        const inside =
          range &&
          (point.line > range.start.line ||
            (point.line === range.start.line && point.character >= range.start.character)) &&
          (point.line < range.end.line ||
            (point.line === range.end.line && point.character <= range.end.character));
        if (inside) (classes[info.id] ||= []).push(diagnostic);
      }
    }
  }
  return { type: 'diagnostics', functions, classes };
}

module.exports = { diagnosticSnapshot };
