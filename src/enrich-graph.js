const { enrichParameters } = require('./parameters');
const { createClassResolver } = require('./classes');
const { enrichComplexity } = require('./complexity');
const { enrichDocumentation } = require('./documentation');

/** Create cached metadata adapters for one graph; provider gaps remain explicit on each node. */
function createGraphEnricher(vscode, graph) {
  const classes = createClassResolver(
    (uri) => vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri),
    (uri) => vscode.workspace.asRelativePath(uri),
  );
  const enrich = async () => {
    await enrichParameters(graph, (uri) => vscode.workspace.openTextDocument(uri));
    await classes.enrich(graph);
    await enrichComplexity(graph, (uri) => vscode.workspace.openTextDocument(uri));
    await enrichDocumentation(graph, (uri, position) =>
      vscode.commands.executeCommand('vscode.executeHoverProvider', uri, position),
    );
  };
  return { enrich, classes };
}

module.exports = { createGraphEnricher };
