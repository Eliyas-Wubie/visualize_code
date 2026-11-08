/** Collect actual class symbols, including empty classes, with stable host locations and source-backed metadata. */
function classDeclarations(symbols, uri, label, classKind) {
  const result = [];
  const visit = (entries, parents = []) => {
    for (const symbol of entries || []) {
      const path = [...parents, symbol.name];
      const selection = symbol.selectionRange || symbol.location?.range || symbol.range;
      if (symbol.kind === classKind && selection) {
        const id = JSON.stringify([
          'class',
          uri.toString(),
          selection.start.line,
          selection.start.character,
        ]);
        result.push({
          selection,
          info: {
            id,
            name: symbol.name,
            qualifiedName: path.join('.'),
            file: label(uri),
            line: selection.start.line + 1,
            range: symbol.range || symbol.location?.range,
          },
        });
      }
      visit(symbol.children, path);
    }
  };
  visit(symbols);
  return result;
}

module.exports = { classDeclarations };
