const { AuthoringError } = require('./authoring-error');
const { editablePath, validEntityName } = require('./edit-safety');
const { entitySource, declarationInsertion } = require('./entity-source');
const { applyAndSave } = require('./apply-and-save');

/** Create a host-owned target without overwriting; declarations use undoable workspace edits and folders use the workspace filesystem. */
async function createEntity(vscode, entries, classes, request) {
  const target = entries.get(request.target);
  if (!target) throw new AuthoringError('Choose a current hierarchy location.');
  if (
    request.body !== undefined &&
    (typeof request.body !== 'string' ||
      Buffer.byteLength(request.body, 'utf8') > 200000 ||
      request.body.includes('\0'))
  )
    throw new AuthoringError('Creation code must be text smaller than 200 KB.');
  if (request.kind === 'folder' && request.body)
    throw new AuthoringError('Folders cannot contain a code body.');
  await editablePath(vscode, target.uri);
  if (['file', 'folder'].includes(request.kind)) {
    if (target.kind !== 'folder' || !validEntityName(request.name))
      throw new AuthoringError('Choose a folder and a valid single file/folder name.');
    const uri = vscode.Uri.joinPath(target.uri, request.name);
    await editablePath(vscode, uri, true);
    let exists = false;
    try {
      await vscode.workspace.fs.stat(uri);
      exists = true;
    } catch (error) {
      if (error.code !== 'FileNotFound' && error.code !== 'ENOENT') throw error;
    }
    if (exists) throw new AuthoringError('That file or folder already exists.');
    if (!vscode.workspace.isTrusted)
      throw new AuthoringError('Workspace trust is required for authoring.');
    if (request.kind === 'folder') await vscode.workspace.fs.createDirectory(uri);
    else {
      const edit = new vscode.WorkspaceEdit();
      edit.createFile(uri, { overwrite: false, ignoreIfExists: false });
      if (request.body) edit.insert(uri, new vscode.Position(0, 0), request.body);
      const result = await applyAndSave(vscode, edit, 'VS Code rejected file creation.', [uri]);
      return { uri, kind: request.kind, ...result };
    }
    return { uri, kind: request.kind, saved: true };
  }
  if (!['function', 'class'].includes(request.kind) || target.kind !== 'file')
    throw new AuthoringError('Choose a source file for the declaration.');
  if (target.uri.path.endsWith('.d.ts'))
    throw new AuthoringError(
      'Create executable declarations in a source file, not a .d.ts declaration file.',
    );
  const document = await vscode.workspace.openTextDocument(target.uri);
  const version = document.version;
  const parent = request.parent ? classes.get(request.parent) : undefined;
  if (
    request.parent &&
    (!parent || parent.uri.toString() !== target.uri.toString() || request.kind !== 'function')
  )
    throw new AuthoringError('Choose a current class in the selected file for a method.');
  const symbols = await vscode.commands.executeCommand(
    'vscode.executeDocumentSymbolProvider',
    target.uri,
  );
  const siblings = parent ? parent.symbol.children : symbols;
  if (siblings?.some((symbol) => symbol.name === request.name))
    throw new AuthoringError('That declaration name already exists at this location.');
  const source = entitySource(
    request.kind,
    request.name,
    document.languageId,
    Boolean(parent),
    request.body,
  );
  const insertion = declarationInsertion(document, parent, source);
  const edit = new vscode.WorkspaceEdit();
  edit.insert(target.uri, insertion.position, insertion.text);
  if (document.version !== version)
    throw new AuthoringError('Source changed. Choose the location again.');
  if (!vscode.workspace.isTrusted)
    throw new AuthoringError('Workspace trust is required for authoring.');
  const result = await applyAndSave(vscode, edit, 'VS Code rejected declaration creation.', [
    target.uri,
  ]);
  return { uri: target.uri, kind: 'file', ...result };
}

module.exports = { createEntity };
