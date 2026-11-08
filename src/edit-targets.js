const { AuthoringError } = require('./authoring-error');
const { editCatalog, classTargets } = require('./edit-catalog');
const { resolveCanvasScope, canvasEntries } = require('./canvas-scope');

/** Own bounded folder/file/class targets for one panel; resource IDs are resolved only against this host-side catalog. */
function createEditTargets(vscode, state) {
  let entries = new Map();
  let limited = false;
  const classes = new Map();
  const catalog = async () => {
    const { root, options } = state();
    const app = options.app;
    const folder = app?.folder || vscode.workspace.getWorkspaceFolder(root.uri);
    if (!folder) throw new AuthoringError('Open a workspace folder before authoring.');
    const base = app ? vscode.Uri.joinPath(folder.uri, app.root || '.') : folder.uri;
    const result = await editCatalog(vscode, base);
    options.canvasScope = await resolveCanvasScope(vscode, root, options);
    entries = new Map(result.entries.map((entry) => [entry.id, entry]));
    classes.clear();
    limited = result.limited;
    return {
      entries: [...entries.values()].map(({ id, path, kind }) => ({ id, path, kind })),
      limited,
    };
  };
  const classOptions = async (id) => {
    const file = entries.get(id);
    if (file?.kind !== 'file')
      throw new AuthoringError('Choose a file from the current hierarchy.');
    const all = await classTargets(vscode, file.uri);
    const targets = all.slice(0, 200);
    targets.forEach((target) => classes.set(target.id, target));
    return { classes: targets.map(({ id, label }) => ({ id, label })), limited: all.length > 200 };
  };
  return {
    catalog,
    classOptions,
    classes,
    get entries() {
      return entries;
    },
    get limited() {
      return limited;
    },
    resources: () =>
      canvasEntries([...entries.values()], state()).map(({ id, uri, kind }) => ({
        id,
        kind,
        file: (vscode.workspace.getWorkspaceFolder(uri)?.uri.toString() === uri.toString()
          ? '.'
          : vscode.workspace.asRelativePath(uri)
        )
          .split('\\')
          .join('/'),
      })),
  };
}

module.exports = { createEditTargets };
