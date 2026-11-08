const { SYMBOL_KINDS } = require('./symbol-kinds');
const { classDeclarations } = require('./class-declarations');

/** Check whether a document symbol contains the callable's source position. */
function contains(range, position) {
  const before = (a, b) => a.line < b.line || (a.line === b.line && a.character <= b.character);
  return range && before(range.start, position) && before(position, range.end);
}

/** Resolve class ownership from language symbols, caching each file for this trace session. */
function createClassResolver(provideSymbols, label, classKind = SYMBOL_KINDS.Class) {
  const files = new Map();
  const locations = new Map();
  const declarations = new Map();
  const read = (uri) => {
    const key = uri.toString();
    if (!files.has(key))
      files.set(
        key,
        Promise.resolve()
          .then(() => provideSymbols(uri))
          .then((symbols) => {
            for (const { selection, info } of classDeclarations(symbols, uri, label, classKind)) {
              declarations.set(info.id, info);
              locations.set(info.id, { uri, selectionRange: selection });
            }
            return symbols;
          }),
      );
    return files.get(key);
  };
  const enrich = async (graph) => {
    await Promise.all(
      (graph.sourceUris || []).map((uri) =>
        read(uri).catch(() => {
          files.delete(uri.toString());
        }),
      ),
    );
    const pending = [...graph.nodes.values()].filter((node) => node.classInfo === undefined);
    await Promise.all(
      pending.map(async (node) => {
        const item = graph.items.get(node.id);
        const uri = item.uri.toString();
        try {
          const symbols = await read(item.uri);
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
          node.classInfo = declarations.get(id);
        } catch {
          node.classInfo = null;
          node.classError = 'Class information unavailable';
          files.delete(uri);
        }
      }),
    );
  };
  return { enrich, locations, declarations };
}

module.exports = { createClassResolver };
