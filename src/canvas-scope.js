const { discoverWorkspace } = require('./workspace-apps');

/** Test URI ancestry using path boundaries so sibling apps cannot share a prefix accidentally. */
function within(uri, base) {
  return uri === base || uri.startsWith(base.endsWith('/') ? base : `${base}/`);
}

/** Resolve current manifest ownership without turning changed/created files into new canvas roots. */
async function resolveCanvasScope(vscode, root, options) {
  const app = options.app;
  if (!app) return { kind: 'trace', seedUris: [root.uri], warnings: [] };
  const { apps, issues } = await discoverWorkspace(vscode);
  const sameFolder = (entry) => entry.folder.uri.toString() === app.folder.uri.toString();
  const current = apps.find((entry) => sameFolder(entry) && entry.root === app.root);
  if (!current)
    throw new Error('The selected app no longer exists. Refresh applications and reopen its map.');
  const base = vscode.Uri.joinPath(app.folder.uri, app.root || '.').toString();
  const excluded = apps
    .filter((entry) => sameFolder(entry) && entry.root !== app.root)
    .map((entry) => vscode.Uri.joinPath(entry.folder.uri, entry.root || '.').toString())
    .filter((uri) => within(uri, base));
  const files = current.files.map((file) => vscode.Uri.joinPath(app.folder.uri, file));
  if (app.selectedFile && !current.files.includes(app.selectedFile))
    throw new Error('The selected file is no longer owned by this app. Reopen its map.');
  return {
    kind: app.selectedFile ? 'file' : 'app',
    base,
    excluded,
    seedUris: app.selectedFile ? [vscode.Uri.joinPath(app.folder.uri, app.selectedFile)] : files,
    allowed: new Set(files.map((uri) => uri.toString())),
    warnings: issues,
  };
}

/** Keep hierarchy choices independent of visible resources: traces/files show only participating files and ancestors. */
function canvasEntries(entries, state) {
  const scope = state.options.canvasScope;
  if (scope?.kind === 'app')
    return entries.filter(({ uri }) => {
      const value = uri.toString();
      return within(value, scope.base) && !scope.excluded.some((base) => within(value, base));
    });
  const files = new Set([
    state.root.uri.toString(),
    ...[...state.graph.items.values()].map((item) => item.uri.toString()),
  ]);
  return entries.filter(({ uri, kind }) =>
    kind === 'file'
      ? files.has(uri.toString())
      : [...files].some((file) => within(file, uri.toString())),
  );
}

/** Whole app/file views retain scoped empty classes; function traces retain only owners of participating methods. */
function canvasClasses(state) {
  const owners = new Set([...state.graph.nodes.values()].map((node) => node.classInfo?.id));
  const scope = state.options.canvasScope || {
    kind: state.options.app ? 'file' : 'trace',
    seedUris: state.graph.sourceUris || [state.root.uri],
  };
  const seeds = new Set(scope.seedUris.map((uri) => uri.toString()));
  return [...state.classes.declarations.values()].filter((info) => {
    const uri = state.classes.locations.get(info.id)?.uri.toString();
    return owners.has(info.id) || (scope?.kind !== 'trace' && scope && seeds.has(uri));
  });
}

module.exports = { resolveCanvasScope, canvasEntries, canvasClasses };
