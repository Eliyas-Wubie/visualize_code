const { SYMBOL_KINDS } = require('./symbol-kinds');

/** Pick a conventional function entry for app/file maps, rather than the provider's first class method; explicit traces bypass this heuristic. */
function chooseMapRoot(graph, preferredUris = []) {
  const items = [...graph.items.values()];
  const preferred = new Set(preferredUris.map((uri) => uri.toString()));
  const scoped = items.filter((item) => preferred.has(item.uri.toString()));
  const candidates = scoped.length ? scoped : items;
  const isMain = (item) => item.kind === SYMBOL_KINDS.Function && item.name === 'main';
  return (
    candidates.find(isMain) ||
    items.find(isMain) ||
    candidates.find((item) => item.kind === SYMBOL_KINDS.Function) ||
    candidates[0]
  );
}

module.exports = { chooseMapRoot };
