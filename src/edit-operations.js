const { AuthoringError } = require('./authoring-error');
const { loadSymbol, saveSymbol, renameSymbol } = require('./edit-symbol');
const { createEntity } = require('./create-entity');
const { editablePath } = require('./edit-safety');
const { saveFile } = require('./edit-file');

/** Own a versioned source snapshot and apply only explicit create/save/semantic-rename actions against known targets. */
function createEditOperations(vscode, state, targets) {
  let sequence = 0;
  let current;
  const load = async (id) => {
    const { graph, classes } = state();
    const item = graph.items.get(id) || classes.locations.get(id);
    const resource = targets.entries.get(id);
    let snapshot;
    if (item) snapshot = await loadSymbol(vscode, item);
    else if (resource?.kind === 'file') {
      await editablePath(vscode, resource.uri);
      const document = await vscode.workspace.openTextDocument(resource.uri);
      snapshot = {
        uri: resource.uri,
        source: document.getText(),
        version: document.version,
        file: true,
        name: resource.path,
        language: document.languageId,
      };
    } else throw new AuthoringError('This node has no editable source location.');
    if (Buffer.byteLength(snapshot.source, 'utf8') > 200000 || snapshot.source.includes('\0'))
      throw new AuthoringError('Node editing supports text source smaller than 200 KB.');
    const token = `snapshot:${++sequence}`;
    current = { token, snapshot };
    return {
      token,
      source: snapshot.source,
      name: snapshot.name,
      file: Boolean(snapshot.file),
      language: snapshot.language,
    };
  };
  const apply = async (message) => {
    if (message.action === 'create')
      return createEntity(vscode, targets.entries, targets.classes, message);
    if (!['save', 'rename'].includes(message.action))
      throw new AuthoringError('Unknown authoring action.');
    if (!current || current.token !== message.token)
      throw new AuthoringError('Reload the node before editing.');
    const { snapshot } = current;
    let result;
    if (snapshot.file) {
      if (message.action === 'rename')
        throw new AuthoringError('Use symbol nodes to rename declarations and references.');
      result = await saveFile(vscode, snapshot, message.source);
    } else if (message.action === 'rename')
      result = await renameSymbol(vscode, snapshot, message.name);
    else result = await saveSymbol(vscode, snapshot, message.source);
    current = undefined;
    return { uri: snapshot.uri, kind: 'file', ...result };
  };
  return { load, apply };
}

module.exports = { createEditOperations };
