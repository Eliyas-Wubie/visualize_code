const { aggregateGraph } = require('./aggregateGraph');
const { mergeDiagnostics, severity } = require('./nodeInfo');

/** Aggregate discovered functions into normalized source files, preserving observed directed relationships and health. */
function fileGraph(graph) {
  const grouped = aggregateGraph(graph, (node) => {
    const file = node.file.split('\\').join('/');
    return { id: 'file:' + file, file, name: file.slice(file.lastIndexOf('/') + 1), kind: 'file' };
  });
  for (const resource of graph.resources || []) {
    if (resource.kind !== 'file') continue;
    const existing = grouped.nodes.find((node) => node.file === resource.file);
    if (existing) {
      existing.editId = resource.id;
      continue;
    }
    grouped.nodes.push({
      id: resource.id,
      file: resource.file,
      name: resource.file.split('/').pop(),
      kind: 'file',
      methods: [],
      loaded: true,
      editId: resource.id,
      sourceId: resource.id,
    });
  }
  for (const info of graph.classEntries || []) {
    const file = info.file.split('\\').join('/');
    let node = grouped.nodes.find((node) => node.file === file);
    if (!node) {
      node = {
        id: `file:${file}`,
        file,
        name: file.split('/').pop(),
        kind: 'file',
        methods: [],
        loaded: true,
        sourceId: info.id,
      };
      grouped.nodes.push(node);
    }
    node.diagnostics = mergeDiagnostics([...(node.diagnostics || []), ...(info.diagnostics || [])]);
    node.severity = severity(node.diagnostics, node.logs);
  }
  return grouped;
}

module.exports = { fileGraph };
