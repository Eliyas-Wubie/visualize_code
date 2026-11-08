/** Temporarily prevent debugger stops from focusing source editors; restore only the unchanged workspace override. */
async function keepStepFocus(vscode, resource) {
  const configuration = vscode.workspace.getConfiguration('debug', resource);
  const key = 'focusEditorOnBreak';
  const scoped = configuration.inspect(key);
  const field =
    scoped?.workspaceFolderValue !== undefined ? 'workspaceFolderValue' : 'workspaceValue';
  const before = scoped?.[field];
  const target =
    field === 'workspaceFolderValue'
      ? vscode.ConfigurationTarget.WorkspaceFolder
      : vscode.ConfigurationTarget.Workspace;
  if (configuration.get(key) === false) return { dispose: async () => {} };
  await configuration.update(key, false, target);
  let disposed = false;
  return {
    async dispose() {
      if (disposed) return;
      disposed = true;
      if (configuration.inspect(key)?.[field] === false)
        await configuration.update(key, before, target);
    },
  };
}

module.exports = { keepStepFocus };
