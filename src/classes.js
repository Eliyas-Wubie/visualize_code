const { SYMBOL_KINDS } = require('./symbol-kinds');

/** Check whether a document symbol contains the callable's source position. */
function contains(range, position) {
  const before = (a, b) => a.line < b.line || (a.line === b.line && a.character <= b.character);
  return range && before(range.start, position) && before(position, range.end);
}

/** Resolve class ownership from language symbols, caching each file for this trace session. */
function createClassResolver(provideSymbols, label, classKind = SYMBOL_KINDS.Class) {
  const files = new Map();
  const locations = new Map();
  const enrich = async (graph) => {
    const pending = [...graph.nodes.values()].filter((node) => node.classInfo === undefined);
    await Promise.all(
      pending.map(async (node) => {
        const item = graph.items.get(node.id);
        const uri = item.uri.toString();
        if (!files.has(uri))
          files.set(
            uri,
            Promise.resolve().then(() => provideSymbols(item.uri)),
          );
        try {
          const symbols = await files.get(uri);
          let owner;
          const visit = (entries, parents = []) => {
            for (const symbol of entries || []) {
              const range = symbol.range || symbol.location?.range;
              if (!contains(range, item.selectionRange.start)) continue;
              const path = [...parents, symbol.name];
              if (symbol.kind === classKind) owner = { symbol, path };
              visit(symbol.children, path);
            }
          };
          visit(symbols);
          if (!owner) {
            node.classInfo = null;
            return;
          }
          const selection =
            owner.symbol.selectionRange || owner.symbol.location?.range || owner.symbol.range;
          const id = JSON.stringify([
            'class',
            uri,
            selection.start.line,
            selection.start.character,
          ]);
          locations.set(id, { uri: item.uri, selectionRange: selection });
          node.classInfo = {
            id,
            name: owner.symbol.name,
            qualifiedName: owner.path.join('.'),
            file: label(item.uri),
            line: selection.start.line + 1,
            range: owner.symbol.range || owner.symbol.location?.range,
          };
        } catch {
          node.classInfo = null;
          node.classError = 'Class information unavailable';
          files.delete(uri);
        }
      }),
    );
  };
  return { enrich, locations };
}

module.exports = { createClassResolver };
