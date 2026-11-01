const { matchFunction } = require('./live-match');

/** Add JSX render relationships resolved by language references; keep them distinct from calls. */
async function addReactLinks(vscode, graph, token) {
  const warnings = [];
  for (const [id, item] of graph.items) {
    if (token.isCancellationRequested) break;
    try {
      if (
        !['javascript', 'javascriptreact', 'typescript', 'typescriptreact'].includes(
          (await vscode.workspace.openTextDocument(item.uri)).languageId,
        )
      )
        continue;
      const references = await vscode.commands.executeCommand(
        'vscode.executeReferenceProvider',
        item.uri,
        item.selectionRange.start,
      );
      for (const reference of (references || []).slice(0, 1000)) {
        const document = await vscode.workspace.openTextDocument(reference.uri);
        const offset = document.offsetAt(reference.range.start);
        if (
          !document
            .getText()
            .slice(Math.max(0, offset - 10), offset)
            .trimEnd()
            .endsWith('<')
        )
          continue;
        const from = matchFunction(graph, reference.uri.toString(), reference.range.start);
        if (
          !from ||
          from === id ||
          graph.edges.some((edge) => edge.from === from && edge.to === id)
        )
          continue;
        graph.edges.push({ from, to: id, lines: [reference.range.start.line + 1], kind: 'render' });
      }
    } catch {
      warnings.push(`JSX references unavailable for ${item.name}`);
    }
  }
  return warnings;
}

module.exports = { addReactLinks };
