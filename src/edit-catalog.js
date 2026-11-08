const { AuthoringError } = require('./authoring-error');
const { editablePath } = require('./edit-safety');

const EXCLUDED = new Set([
  '.git',
  '.codex',
  '.agents',
  'node_modules',
  '.next',
  '.venv',
  'venv',
  '__pycache__',
  'dist',
  'build',
  'coverage',
]);

/** List bounded host-owned hierarchy choices without following directory symlinks or loading project code. */
async function editCatalog(vscode, root) {
  await editablePath(vscode, root);
  const entries = [];
  const queue = [{ uri: root, path: '' }];
  let limited = false;
  while (queue.length && entries.length < 600) {
    const { uri, path } = queue.shift();
    entries.push({ id: uri.toString(), uri, path, kind: 'folder' });
    if (entries.length >= 600) {
      limited = true;
      break;
    }
    for (const [name, type] of (await vscode.workspace.fs.readDirectory(uri)).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      if (EXCLUDED.has(name) || type & vscode.FileType.SymbolicLink) continue;
      const child = { uri: vscode.Uri.joinPath(uri, name), path: path ? `${path}/${name}` : name };
      if (type & vscode.FileType.Directory) queue.push(child);
      else if (type & vscode.FileType.File)
        entries.push({ ...child, id: child.uri.toString(), kind: 'file' });
      if (entries.length >= 600) {
        limited = true;
        break;
      }
    }
  }
  return { entries, limited: limited || queue.length > 0 };
}

/** Read class targets from fresh document symbols, retaining authoritative ranges and document versions in the host. */
async function classTargets(vscode, uri) {
  await editablePath(vscode, uri);
  const document = await vscode.workspace.openTextDocument(uri);
  const version = document.version;
  const symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri);
  if (document.version !== version)
    throw new AuthoringError('Source changed while loading classes. Choose the file again.');
  const result = [];
  const visit = (items, parents = []) => {
    for (const symbol of items || []) {
      const path = [...parents, symbol.name];
      if (symbol.kind === vscode.SymbolKind.Class && symbol.range)
        result.push({
          id: `${uri.toString()}#class:${document.offsetAt(symbol.range.start)}`,
          label: path.join('.'),
          uri,
          symbol,
          version: document.version,
        });
      visit(symbol.children, path);
    }
  };
  visit(symbols);
  return result;
}

module.exports = { editCatalog, classTargets };
