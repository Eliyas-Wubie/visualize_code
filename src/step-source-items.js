/** Resolve full declaration ranges from document symbols when call hierarchy supplies only the identifier range. */
async function stepSourceItem(vscode, item, cache) {
  if (!vscode.commands?.executeCommand) return item;
  const key = item.uri.toString();
  if (!cache.has(key))
    cache.set(
      key,
      vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', item.uri),
    );
  const symbols = await cache.get(key);
  const point = item.selectionRange.start;
  const candidates = [];
  const compare = (a, b) => a.line - b.line || a.character - b.character;
  const visit = (entries) => {
    for (const symbol of entries || []) {
      const range = symbol.range || symbol.location?.range;
      const sameFile = !symbol.location?.uri || symbol.location.uri.toString() === key;
      if (
        sameFile &&
        range &&
        symbol.name === item.name &&
        compare(range.start, point) <= 0 &&
        compare(point, range.end) < 0
      )
        candidates.push(range);
      visit(symbol.children);
    }
  };
  visit(symbols);
  candidates.sort((a, b) => compare(b.start, a.start) || compare(a.end, b.end));
  return candidates.length ? { ...item, range: candidates[0] } : item;
}

module.exports = { stepSourceItem };
