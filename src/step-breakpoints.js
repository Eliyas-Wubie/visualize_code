const { functionEntry } = require('./function-entry');
const { StepSetupError } = require('./step-error');
const { stepSourceItem } = require('./step-source-items');

/** Install temporary callable-body breakpoints before launch; remove only owned breakpoints on cleanup. */
async function installStepBreakpoints(vscode, graph) {
  const positions = new Map();
  const skipped = [];
  const items = new Map(graph.items);
  const symbols = new Map();
  for (const [id, original] of graph.items) {
    let item = original;
    let reason = 'source document unavailable';
    try {
      const document = await vscode.workspace.openTextDocument(item.uri);
      reason = 'function declaration/body could not be resolved';
      item = await stepSourceItem(vscode, item, symbols);
      const position = functionEntry(document, item);
      items.set(id, item);
      reason = 'source location could not be constructed';
      const key = JSON.stringify([item.uri.toString(), position.line, position.character]);
      positions.set(key, new vscode.Location(item.uri, position));
    } catch {
      skipped.push(`${String(item.name).slice(0, 80)} (${reason})`);
    }
  }
  if (!positions.size)
    throw new StepSetupError(
      `No automatic breakpoints could be created: ${skipped.slice(0, 5).join('; ')}. Refresh the map and retry.`,
    );
  const owned = [...positions.values()]
    .filter(
      (location) =>
        !(vscode.debug.breakpoints || []).some(
          (entry) =>
            entry.enabled &&
            !entry.condition &&
            !entry.hitCondition &&
            !entry.logMessage &&
            entry.location?.uri.toString() === location.uri.toString() &&
            entry.location.range.start.line === location.range.start.line &&
            entry.location.range.start.character === location.range.start.character,
        ),
    )
    .map((location) => new vscode.SourceBreakpoint(location));
  try {
    vscode.debug.addBreakpoints(owned);
  } catch {
    throw new StepSetupError(
      'VS Code rejected the automatic source breakpoints. Stop existing debug sessions, refresh the map, and retry.',
    );
  }
  return {
    count: positions.size,
    skipped,
    items,
    dispose: () => vscode.debug.removeBreakpoints(owned),
  };
}

module.exports = { installStepBreakpoints };
