const { estimateComplexity } = require('./complexity-estimate');

/** Cache local-work estimates for supported source files; label other languages unavailable. */
async function enrichComplexity(graph, openDocument) {
  for (const edge of graph.edges) {
    if (edge.from === edge.to)
      graph.nodes.get(edge.from).complexity = {
        notation: 'Unknown',
        reason: 'Recursion requires recurrence analysis.',
      };
  }
  await Promise.all(
    [...graph.nodes.values()]
      .filter((node) => node.complexity === undefined)
      .map(async (node) => {
        const item = graph.items.get(node.id);
        try {
          const document = await openDocument(item.uri);
          if (
            !['javascript', 'javascriptreact', 'typescript', 'typescriptreact'].includes(
              document.languageId,
            )
          ) {
            node.complexity = {
              notation: 'Unknown',
              reason: 'Estimation currently supports JavaScript and TypeScript.',
            };
            return;
          }
          const recursive = graph.edges.some(
            (edge) => edge.from === node.id && edge.to === node.id,
          );
          node.complexity = estimateComplexity(document.getText(item.range), recursive);
        } catch {
          node.complexity = { notation: 'Unknown', reason: 'Source unavailable.' };
        }
      }),
  );
}

module.exports = { estimateComplexity, enrichComplexity };
