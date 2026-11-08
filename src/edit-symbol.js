const { AuthoringError } = require('./authoring-error');
const { editablePath, validIdentifier } = require('./edit-safety');
const { applyAndSave } = require('./apply-and-save');

/** Load an exact current provider declaration; stale map locations must be refreshed rather than guessed. */
async function loadSymbol(vscode, item) {
  await editablePath(vscode, item.uri);
  const document = await vscode.workspace.openTextDocument(item.uri);
  const version = document.version;
  const symbols = await vscode.commands.executeCommand(
    'vscode.executeDocumentSymbolProvider',
    item.uri,
  );
  let found;
  if (document.version !== version)
    throw new AuthoringError('Source changed while loading. Reload the node.');
  const visit = (items) => {
    for (const symbol of items || []) {
      const start = symbol.selectionRange?.start;
      if (
        start?.line === item.selectionRange.start.line &&
        start.character === item.selectionRange.start.character
      )
        found = symbol;
      visit(symbol.children);
    }
  };
  visit(symbols);
  if (!found?.range)
    throw new AuthoringError(
      'Declaration moved or symbols unavailable. Refresh the map before editing.',
    );
  const range = found.range;
  const selection = found.selectionRange;
  const name = document.getText(selection);
  return {
    uri: item.uri,
    document,
    range,
    selection,
    name,
    version: document.version,
    source: document.getText(range),
    nameOffset: document.offsetAt(selection.start) - document.offsetAt(range.start),
    python: document.languageId === 'python',
    language: document.languageId,
  };
}

/** Apply and save declaration source only when revision/identity match; edits remain undoable and save failures return warnings. */
async function saveSymbol(vscode, snapshot, source) {
  const document = await vscode.workspace.openTextDocument(snapshot.uri);
  if (document.version !== snapshot.version)
    throw new AuthoringError('Source changed. Reload the node before saving.');
  if (typeof source !== 'string' || !source.trim() || Buffer.byteLength(source, 'utf8') > 200000)
    throw new AuthoringError('Provide nonempty declaration source smaller than 200 KB.');
  const end = snapshot.nameOffset + snapshot.name.length;
  // Unicode ID_Continue plus JS dollar/zero-width identifier characters detect an appended name suffix, including non-ASCII suffixes.
  const continuesIdentifier = /^[\p{ID_Continue}$\u200c\u200d]/u;
  if (
    source.slice(snapshot.nameOffset, end) !== snapshot.name ||
    continuesIdentifier.test(source.slice(end))
  )
    throw new AuthoringError(
      'Keep the declaration name in place in source. Use Rename references to change its name.',
    );
  await editablePath(vscode, snapshot.uri);
  if (document.version !== snapshot.version)
    throw new AuthoringError('Source changed. Reload the node before saving.');
  const edit = new vscode.WorkspaceEdit();
  edit.replace(snapshot.uri, snapshot.range, source);
  return applyAndSave(vscode, edit, 'VS Code rejected the source edit.', [snapshot.uri]);
}

/** Rename with the language provider and save all affected reference files; return warnings for save failures without textual fallbacks. */
async function renameSymbol(vscode, snapshot, name) {
  if (!validIdentifier(name, snapshot.python))
    throw new AuthoringError(
      'Enter a nonreserved identifier using letters, digits and underscores.',
    );
  const document = await vscode.workspace.openTextDocument(snapshot.uri);
  if (document.version !== snapshot.version)
    throw new AuthoringError('Source changed. Reload the node before renaming.');
  const versions = new Map(
    (vscode.workspace.textDocuments || []).map((doc) => [doc.uri.toString(), doc.version]),
  );
  const edit = await vscode.commands.executeCommand(
    'vscode.executeDocumentRenameProvider',
    snapshot.uri,
    snapshot.selection.start,
    name,
  );
  if (!edit?.size)
    throw new AuthoringError(
      'No rename edits returned. Enable a language provider that supports Rename Symbol.',
    );
  for (const [uri] of edit.entries()) {
    await editablePath(vscode, uri);
    const current = await vscode.workspace.openTextDocument(uri);
    if (versions.has(uri.toString()) && current.version !== versions.get(uri.toString()))
      throw new AuthoringError('A reference document changed during rename. Reload and retry.');
  }
  if (document.version !== snapshot.version)
    throw new AuthoringError('Source changed. Reload the node before renaming.');
  return applyAndSave(vscode, edit, 'VS Code rejected the rename refactor.', [snapshot.uri]);
}

module.exports = { loadSymbol, saveSymbol, renameSymbol };
