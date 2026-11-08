/** Build a nested directory model from bounded host entries; virtual parents have no selectable authority ID. */
function hierarchyModel(entries) {
  const root = { path: '', name: '(project root)', kind: 'folder', children: new Map() };
  for (const entry of entries) {
    let current = root;
    const parts = entry.path.split('/').filter(Boolean);
    parts.forEach((name, index) => {
      if (!current.children.has(name))
        current.children.set(name, {
          name,
          path: parts.slice(0, index + 1).join('/'),
          kind: 'folder',
          children: new Map(),
        });
      current = current.children.get(name);
    });
    Object.assign(current, entry);
  }
  return root;
}

/** Filter hierarchy paths while retaining real ancestors and descendants of matching folders; never invent target IDs. */
function filterHierarchy(entries, query) {
  const value = query.trim().toLowerCase();
  if (!value) return entries;
  const matches = entries.filter((entry) => entry.path.toLowerCase().includes(value));
  return entries.filter(
    (entry) =>
      entry.path === '' ||
      matches.some(
        (match) =>
          match.path === entry.path ||
          match.path.startsWith(`${entry.path}/`) ||
          (match.kind === 'folder' && entry.path.startsWith(`${match.path}/`)),
      ),
  );
}

module.exports = { hierarchyModel, filterHierarchy };
