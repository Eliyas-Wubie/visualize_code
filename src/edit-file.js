const { AuthoringError } = require('./authoring-error');
const { editablePath } = require('./edit-safety');
const { applyAndSave } = require('./apply-and-save');

/** Replace and save bounded file source from a current snapshot; return save warnings while preserving undoable edits. */
async function saveFile(vscode, snapshot, source) {
  if (typeof source !== 'string' || Buffer.byteLength(source, 'utf8') > 200000)
    throw new AuthoringError('File source must be smaller than 200 KB.');
  const document = await vscode.workspace.openTextDocument(snapshot.uri);
  await editablePath(vscode, snapshot.uri);
  if (document.version !== snapshot.version)
    throw new AuthoringError('Source changed. Reload the file before saving.');
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    snapshot.uri,
    new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
    source,
  );
  return applyAndSave(vscode, edit, 'VS Code rejected the file edit.', [snapshot.uri]);
}

module.exports = { saveFile };
