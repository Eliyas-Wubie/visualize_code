const { AuthoringError } = require('./authoring-error');
const { editablePath } = require('./edit-safety');

/** Apply an undoable workspace edit, then save only its affected documents; report partial save failures without reapplying or discarding edits. */
async function applyAndSave(vscode, edit, rejection, extras = []) {
  const targets = new Map(
    [...edit.entries().map(([uri]) => uri), ...extras].map((uri) => [uri.toString(), uri]),
  );
  if (!(await vscode.workspace.applyEdit(edit))) throw new AuthoringError(rejection);
  const unsaved = [];
  for (const uri of targets.values()) {
    try {
      await editablePath(vscode, uri);
      const document = await vscode.workspace.openTextDocument(uri);
      if (!(await document.save())) unsaved.push(uri);
    } catch {
      unsaved.push(uri);
    }
  }
  return {
    saved: unsaved.length === 0,
    warning: unsaved.length
      ? `Changes applied, but could not save: ${unsaved.map((uri) => vscode.workspace.asRelativePath(uri)).join(', ')}. Save these files in VS Code and check permissions.`
      : undefined,
  };
}

module.exports = { applyAndSave };
