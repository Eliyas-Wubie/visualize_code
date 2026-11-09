const { SYMBOL_KINDS: SymbolKind } = require('./symbol-kinds');
const { readySymbols } = require('./provider-ready');

/** Seed graph functions from app files; return warnings for missing providers, cancellation, or limits. */
async function scanApp(vscode, app, graph, token, progress, waitForProvider = false) {
  const warnings = [];
  let unavailable = 0;
  let filesScanned = 0;
  let failed = 0;
  const ordered = [...new Set([...(app.entries || []), ...app.files])];
  for (const file of ordered.slice(0, 300)) {
    if (token.isCancellationRequested) break;
    const uri = vscode.Uri.joinPath(app.folder.uri, file);
    graph.sourceUris ||= [];
    if (!graph.sourceUris.some((source) => source.toString() === uri.toString()))
      graph.sourceUris.push(uri);
    progress.report({ message: file });
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const symbols = waitForProvider
        ? await readySymbols(vscode, uri, document, token, progress)
        : await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri);
      if (!symbols?.length) {
        if (Array.isArray(symbols)) filesScanned++;
        else unavailable++;
        continue;
      }
      const candidates = [];
      const visit = (entries) => {
        for (const symbol of entries || []) {
          if (
            [
              SymbolKind.Method,
              SymbolKind.Property,
              SymbolKind.Constructor,
              SymbolKind.Function,
              SymbolKind.Variable,
              SymbolKind.Constant,
            ].includes(symbol.kind)
          )
            candidates.push(symbol);
          visit(symbol.children);
        }
      };
      visit(symbols);
      for (const symbol of candidates) {
        if (token.isCancellationRequested || graph.nodes.size >= graph.limit) break;
        const range = symbol.range || symbol.location?.range;
        const selectionRange = symbol.selectionRange || range;
        const items = await vscode.commands.executeCommand(
          'vscode.prepareCallHierarchy',
          uri,
          selectionRange.start,
        );
        if (items?.length) {
          for (const item of items) graph.add(item);
        } else if (
          [SymbolKind.Method, SymbolKind.Constructor, SymbolKind.Function].includes(symbol.kind)
        ) {
          const node = graph.add({
            name: symbol.name,
            kind: symbol.kind,
            uri,
            range,
            selectionRange,
          });
          if (node) {
            node.loaded = true;
            node.callSupport = 'No call hierarchy provided; connections unavailable.';
          }
        }
      }
      filesScanned++;
    } catch {
      if (token.isCancellationRequested) break;
      failed++;
      warnings.push(
        `Could not analyze ${file}. This file may be incomplete; check language support and refresh to retry.`,
      );
    }
    if (graph.nodes.size >= graph.limit) break;
  }
  if (app.files.length > 300) warnings.push('Only the first 300 source files were scanned.');
  if (graph.nodes.size >= graph.limit)
    warnings.push(`Function limit reached (${graph.limit}); map is partial.`);
  if (unavailable)
    warnings.push(
      `${unavailable} files returned no symbols. Python requires an enabled Python language provider such as Pylance.`,
    );
  if (token.isCancellationRequested) warnings.push('Scan cancelled; showing partial results.');
  if (
    waitForProvider &&
    failed &&
    !filesScanned &&
    !graph.nodes.size &&
    !token.isCancellationRequested
  )
    throw new Error('No source files could be analyzed.');
  return { warnings, filesScanned };
}

module.exports = { scanApp };
