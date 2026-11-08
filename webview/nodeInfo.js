/** Rank node health from associated diagnostics and captured runtime messages; errors override warnings. */
function severity(diagnostics = [], logs = []) {
  const levels = [...diagnostics, ...logs].map((entry) => entry.level);
  return levels.includes('error') ? 'error' : levels.includes('warning') ? 'warning' : undefined;
}

/** Deduplicate diagnostics serialized through both method and class associations. */
function mergeDiagnostics(entries) {
  return [
    ...new Map(
      entries.map((entry) => [
        JSON.stringify([entry.source, entry.code, entry.line, entry.level, entry.text]),
        entry,
      ]),
    ).values(),
  ];
}

/** Attach source diagnostics and runtime logs to functions before class projection. */
function withNodeInfo(graph, live, diagnostics) {
  return {
    ...graph,
    classEntries: graph.classEntries?.map((info) => ({
      ...info,
      diagnostics: diagnostics.classes?.[info.id] || [],
      severity: severity(diagnostics.classes?.[info.id] || []),
    })),
    nodes: graph.nodes.map((node) => {
      const issues = diagnostics.functions?.[node.id] || [];
      const classIssues = diagnostics.classes?.[node.classInfo?.id] || [];
      const logs = live.logs?.[node.id] || [];
      return {
        ...node,
        diagnostics: issues,
        classDiagnostics: classIssues,
        logs,
        severity: severity(issues, logs),
      };
    }),
  };
}

module.exports = { severity, withNodeInfo, mergeDiagnostics };
